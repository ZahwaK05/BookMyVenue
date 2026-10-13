// routes/bookings.js  (mounted at /bookings)
//
//   POST /bookings                 create a booking (faculty/admin auto-approve)
//   GET  /bookings/mine            my bookings
//   GET  /bookings/queue           block head: pending_block_head + pending_cancellation
//                                  in their block; admin: pending_dean
//   POST /bookings/:id/decision    { decision: 'approve'|'reject', comment? }
//   POST /bookings/:id/cancel      owner cancels (approved -> needs block head approval)
//   GET  /bookings/:id/history     booking_approvals audit trail
//
// Times are sent and returned as local campus time WITHOUT a timezone,
// e.g. "2026-10-14T14:00". Do not add a Z or an offset.

const express = require('express');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DT_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function parseSlot(start, end) {
  const s = DT_RE.exec(String(start || ''));
  const e = DT_RE.exec(String(end || ''));
  if (!s || !e) throw httpError(400, 'start and end must look like 2026-10-14T14:00');
  if (s[1] !== e[1]) {
    throw httpError(400, 'A booking must stay within a single day; make one booking per day');
  }
  if (e[2] <= s[2]) throw httpError(400, 'end must be after start');
  return { start: `${s[1]} ${s[2]}`, end: `${e[1]} ${e[2]}` };
}

// Translate known Postgres errors into clean HTTP errors.
function mapDbError(err) {
  if (err.status) return err;
  if (err.code === '23P01') return httpError(409, 'That slot is already booked or awaiting approval');
  if (err.code === '23514' && err.constraint === 'bookings_single_day') {
    return httpError(400, 'A booking must stay within a single day');
  }
  if (err.code === '22007' || err.code === '22008') return httpError(400, 'Invalid date or time');
  return err;
}

const BOOKING_SELECT = `
  SELECT b.id, b.venue_id, v.name AS venue_name, v.type AS venue_type,
         to_char(lower(b.booking_range), 'YYYY-MM-DD"T"HH24:MI') AS "start",
         to_char(upper(b.booking_range), 'YYYY-MM-DD"T"HH24:MI') AS "end",
         b.purpose, b.status
    FROM bookings b
    JOIN venues v ON v.id = b.venue_id`;

/* ------------------------------ create ---------------------------------- */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { venue_id, start, end, purpose } = req.body || {};
    if (!UUID_RE.test(venue_id || '')) throw httpError(400, 'venue_id must be a valid UUID');
    const slot = parseSlot(start, end);

    const venueRes = await pool.query('SELECT id FROM venues WHERE id = $1', [venue_id]);
    if (!venueRes.rows[0]) throw httpError(404, 'Venue not found');

    // App-level check: does the slot overlap a scheduled class? (0 = Sunday)
    let clash;
    try {
      clash = await pool.query(
        `SELECT label,
                to_char(start_time, 'HH24:MI') AS start_time,
                to_char(end_time,   'HH24:MI') AS end_time
           FROM class_timetable
          WHERE venue_id = $1
            AND day_of_week = EXTRACT(DOW FROM $2::timestamp)::int
            AND start_time < $3::timestamp::time
            AND end_time   > $2::timestamp::time
          LIMIT 1`,
        [venue_id, slot.start, slot.end]
      );
    } catch (err) {
      throw mapDbError(err);
    }
    if (clash.rows[0]) {
      const c = clash.rows[0];
      throw httpError(
        409,
        `Venue is in use for a scheduled class${c.label ? ` (${c.label})` : ''} ${c.start_time}-${c.end_time}`
      );
    }

    const autoApprove = req.user.role === 'faculty' || req.user.role === 'admin';
    const status = autoApprove ? 'approved' : 'pending_block_head';

    const client = await pool.connect();
    let bookingId;
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO bookings (venue_id, user_id, booking_range, purpose, status)
         VALUES ($1, $2, tsrange($3::timestamp, $4::timestamp), $5, $6)
         RETURNING id`,
        [venue_id, req.user.id, slot.start, slot.end, purpose || null, status]
      );
      bookingId = ins.rows[0].id;

      if (autoApprove) {
        await client.query(
          `INSERT INTO booking_approvals (booking_id, approver_id, tier, decision, comment)
           VALUES ($1, NULL, 'auto', 'approved', $2)`,
          [bookingId, `Auto-approved (${req.user.role})`]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw mapDbError(err);
    } finally {
      client.release();
    }

    const { rows } = await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [bookingId]);
    res.status(201).json(rows[0]);
  })
);

/* ------------------------------- lists ---------------------------------- */
router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `${BOOKING_SELECT} WHERE b.user_id = $1 ORDER BY lower(b.booking_range) DESC`,
      [req.user.id]
    );
    res.json(rows);
  })
);

router.get(
  '/queue',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = req.user;
    let statuses;
    let blockId = null;

    if (u.role === 'admin') {
      statuses = ['pending_dean'];
    } else if (u.role === 'faculty' && u.is_block_head && u.block_id) {
      statuses = ['pending_block_head', 'pending_cancellation'];
      blockId = u.block_id;
    } else {
      throw httpError(403, 'Only block heads and admins have an approval queue');
    }

    const { rows } = await pool.query(
      `SELECT b.id, b.venue_id, v.name AS venue_name, v.type AS venue_type, bl.name AS block_name,
              to_char(lower(b.booking_range), 'YYYY-MM-DD"T"HH24:MI') AS "start",
              to_char(upper(b.booking_range), 'YYYY-MM-DD"T"HH24:MI') AS "end",
              b.purpose, b.status,
              r.name AS requester_name, r.email AS requester_email, r.role AS requester_role
         FROM bookings b
         JOIN venues v ON v.id = b.venue_id
         JOIN floors f ON f.id = v.floor_id
         JOIN blocks bl ON bl.id = f.block_id
         JOIN users r ON r.id = b.user_id
        WHERE b.status = ANY($1)
          AND ($2::uuid IS NULL OR f.block_id = $2::uuid)
        ORDER BY lower(b.booking_range)`,
      [statuses, blockId]
    );
    res.json(rows);
  })
);

/* ------------------------------ decision -------------------------------- */
router.post(
  '/:id/decision',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { decision, comment } = req.body || {};
    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid booking id');
    if (!['approve', 'reject'].includes(decision)) {
      throw httpError(400, "decision must be 'approve' or 'reject'");
    }

    const u = req.user;
    const approve = decision === 'approve';
    let newStatus;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `SELECT b.id, b.status, v.requires_dean_approval, f.block_id
           FROM bookings b
           JOIN venues v ON v.id = b.venue_id
           JOIN floors f ON f.id = v.floor_id
          WHERE b.id = $1
            FOR UPDATE OF b`,
        [id]
      );
      const b = rows[0];
      if (!b) throw httpError(404, 'Booking not found');

      const isBlockHeadHere =
        u.role === 'faculty' && u.is_block_head && u.block_id && u.block_id === b.block_id;

      let tier;
      let defaultComment = null;

      if (b.status === 'pending_block_head') {
        if (!isBlockHeadHere) throw httpError(403, "Only this venue's block head can decide this booking");
        tier = 'block_head';
        newStatus = !approve ? 'rejected' : b.requires_dean_approval ? 'pending_dean' : 'approved';
      } else if (b.status === 'pending_dean') {
        if (u.role !== 'admin') throw httpError(403, 'Only an admin (dean office) can decide this booking');
        tier = 'dean';
        newStatus = approve ? 'approved' : 'rejected';
      } else if (b.status === 'pending_cancellation') {
        if (!isBlockHeadHere) throw httpError(403, "Only this venue's block head can decide a cancellation");
        tier = 'block_head';
        newStatus = approve ? 'cancelled' : 'approved';
        defaultComment = approve ? 'Cancellation approved' : 'Cancellation rejected, booking stays approved';
      } else {
        throw httpError(409, `Booking is ${b.status} and is not awaiting a decision`);
      }

      await client.query('UPDATE bookings SET status = $2 WHERE id = $1', [id, newStatus]);
      await client.query(
        `INSERT INTO booking_approvals (booking_id, approver_id, tier, decision, comment)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, u.id, tier, approve ? 'approved' : 'rejected', comment || defaultComment]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw mapDbError(err);
    } finally {
      client.release();
    }

    res.json({ id, status: newStatus });
  })
);

/* ------------------------------- cancel --------------------------------- */
router.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body || {};
    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid booking id');

    const u = req.user;
    let newStatus;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT id, user_id, status FROM bookings WHERE id = $1 FOR UPDATE',
        [id]
      );
      const b = rows[0];
      if (!b) throw httpError(404, 'Booking not found');
      if (b.user_id !== u.id) throw httpError(403, 'You can only cancel your own bookings');

      if (b.status === 'pending_block_head' || b.status === 'pending_dean') {
        // Never approved yet, so it can simply be withdrawn.
        newStatus = 'cancelled';
        await client.query('UPDATE bookings SET status = $2 WHERE id = $1', [id, newStatus]);
      } else if (b.status === 'approved') {
        // Approved bookings need the block head to sign off the cancellation.
        newStatus = 'pending_cancellation';
        await client.query('UPDATE bookings SET status = $2 WHERE id = $1', [id, newStatus]);
        await client.query(
          `INSERT INTO booking_approvals (booking_id, approver_id, tier, decision, comment)
           VALUES ($1, $2, 'requester', 'cancel_requested', $3)`,
          [id, u.id, comment || null]
        );
      } else {
        throw httpError(409, `A ${b.status} booking cannot be cancelled`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw mapDbError(err);
    } finally {
      client.release();
    }

    res.json({ id, status: newStatus });
  })
);

/* ------------------------------- history -------------------------------- */
router.get(
  '/:id/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid booking id');

    const head = await pool.query(
      `SELECT b.user_id, f.block_id
         FROM bookings b
         JOIN venues v ON v.id = b.venue_id
         JOIN floors f ON f.id = v.floor_id
        WHERE b.id = $1`,
      [id]
    );
    const b = head.rows[0];
    if (!b) throw httpError(404, 'Booking not found');

    const u = req.user;
    const allowed =
      b.user_id === u.id ||
      u.role === 'admin' ||
      (u.role === 'faculty' && u.is_block_head && u.block_id === b.block_id);
    if (!allowed) throw httpError(403, 'You cannot view this booking history');

    const { rows } = await pool.query(
      `SELECT ba.tier, ba.decision, ba.comment, ba.created_at, a.name AS approver_name
         FROM booking_approvals ba
         LEFT JOIN users a ON a.id = ba.approver_id
        WHERE ba.booking_id = $1
        ORDER BY ba.created_at`,
      [id]
    );
    res.json(rows);
  })
);

module.exports = router;