// routes/timetable.js  (mounted at /timetable)
//   GET    /timetable?venue_id=...   list timetable slots (any logged-in user)
//   POST   /timetable                create a single timetable slot (admin)
//   DELETE /timetable/:id            delete a timetable slot (admin)
//   POST   /timetable/bulk           bulk upload timetable rows (admin)

const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function normalizeTime(t) {
  if (!t || typeof t !== 'string') return null;
  const m = TIME_RE.exec(t.trim());
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

const TIMETABLE_SELECT = `
  SELECT c.id, c.venue_id, v.name AS venue_name,
         c.day_of_week,
         to_char(c.start_time, 'HH24:MI') AS start_time,
         to_char(c.end_time, 'HH24:MI') AS end_time,
         c.label, c.created_at, u.name AS created_by_name
    FROM class_timetable c
    JOIN venues v ON v.id = c.venue_id
    LEFT JOIN users u ON u.id = c.created_by`;

// GET /timetable?venue_id=...
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { venue_id } = req.query;
    if (venue_id && !UUID_RE.test(venue_id)) {
      throw httpError(400, 'venue_id must be a valid UUID');
    }

    const { rows } = await pool.query(
      `${TIMETABLE_SELECT}
        WHERE ($1::uuid IS NULL OR c.venue_id = $1::uuid)
        ORDER BY c.day_of_week, c.start_time`,
      [venue_id || null]
    );

    res.json(rows);
  })
);

// POST /timetable (single slot, admin)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { venue_id, day_of_week, start_time, end_time, label } = req.body || {};

    if (!UUID_RE.test(venue_id || '')) throw httpError(400, 'venue_id must be a valid UUID');

    const dow = Number(day_of_week);
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      throw httpError(400, 'day_of_week must be an integer between 0 and 6 (0 = Sunday)');
    }

    const st = normalizeTime(start_time);
    const et = normalizeTime(end_time);
    if (!st || !et) throw httpError(400, 'start_time and end_time must be HH:MM format');
    if (et <= st) throw httpError(400, 'end_time must be greater than start_time');

    let insertedId;
    try {
      const ins = await pool.query(
        `INSERT INTO class_timetable (venue_id, day_of_week, start_time, end_time, label, created_by)
         VALUES ($1, $2, $3::time, $4::time, $5, $6)
         RETURNING id`,
        [venue_id, dow, st, et, label ? label.trim() : null, req.user.id]
      );
      insertedId = ins.rows[0].id;
    } catch (err) {
      if (err.code === '23503') throw httpError(404, 'Venue not found');
      throw err;
    }

    const { rows } = await pool.query(`${TIMETABLE_SELECT} WHERE c.id = $1`, [insertedId]);
    res.status(201).json(rows[0]);
  })
);

// DELETE /timetable/:id (admin)
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid timetable id');

    const result = await pool.query('DELETE FROM class_timetable WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) throw httpError(404, 'Timetable entry not found');

    res.status(204).send();
  })
);

// POST /timetable/bulk (admin only)
router.post(
  '/bulk',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rows: inputRows } = req.body || {};
    if (!Array.isArray(inputRows) || inputRows.length === 0) {
      throw httpError(400, 'rows must be a non-empty array of timetable entries');
    }

    // Cache venue names for fast name -> id resolution
    const venuesRes = await pool.query('SELECT id, lower(name) AS lname FROM venues');
    const venueMap = new Map();
    for (const v of venuesRes.rows) {
      venueMap.set(v.lname, v.id);
    }

    const validated = [];
    for (let i = 0; i < inputRows.length; i++) {
      const row = inputRows[i];
      let vId = row.venue_id;

      if (!vId && row.venue_name) {
        vId = venueMap.get(String(row.venue_name).trim().toLowerCase());
        if (!vId) {
          throw httpError(400, `Row ${i + 1}: Venue "${row.venue_name}" not found`);
        }
      }

      if (!UUID_RE.test(vId || '')) {
        throw httpError(400, `Row ${i + 1}: valid venue_id or venue_name is required`);
      }

      const dow = Number(row.day_of_week);
      if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
        throw httpError(400, `Row ${i + 1}: day_of_week must be an integer between 0 and 6`);
      }

      const st = normalizeTime(row.start_time);
      const et = normalizeTime(row.end_time);
      if (!st || !et) {
        throw httpError(400, `Row ${i + 1}: start_time and end_time must be HH:MM format`);
      }
      if (et <= st) {
        throw httpError(400, `Row ${i + 1}: end_time must be greater than start_time`);
      }

      validated.push({
        venue_id: vId,
        day_of_week: dow,
        start_time: st,
        end_time: et,
        label: row.label ? String(row.label).trim() : null,
      });
    }

    // Execute in a single transaction
    const client = await pool.connect();
    const insertedIds = [];
    try {
      await client.query('BEGIN');
      for (const item of validated) {
        const ins = await client.query(
          `INSERT INTO class_timetable (venue_id, day_of_week, start_time, end_time, label, created_by)
           VALUES ($1, $2, $3::time, $4::time, $5, $6)
           RETURNING id`,
          [item.venue_id, item.day_of_week, item.start_time, item.end_time, item.label, req.user.id]
        );
        insertedIds.push(ins.rows[0].id);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code === '23503') throw httpError(404, 'One or more venues do not exist');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await pool.query(
      `${TIMETABLE_SELECT} WHERE c.id = ANY($1) ORDER BY c.day_of_week, c.start_time`,
      [insertedIds]
    );

    res.status(201).json({ count: rows.length, rows });
  })
);

module.exports = router;

