// routes/issues.js  (mounted at /issues)
//   POST  /issues                  report an issue (any logged-in user)
//   GET   /issues?status=&venue_id=   list issues (any logged-in user, no emails shown)
//   PATCH /issues/:id/resolve      admin, or the block head of the venue's block
//
// The digital twin updates itself through database triggers when an issue
// is created or resolved, so nothing extra is needed here.

const express = require('express');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const ISSUE_SELECT = `
  SELECT r.id, r.venue_id, v.name AS venue_name, r.amenity_id, a.name AS amenity_name,
         r.description, r.status, r.created_at, r.resolved_at,
         rep.name AS reported_by_name, res.name AS resolved_by_name
    FROM venue_issue_reports r
    JOIN venues v ON v.id = r.venue_id
    LEFT JOIN amenities a ON a.id = r.amenity_id
    JOIN users rep ON rep.id = r.reported_by
    LEFT JOIN users res ON res.id = r.resolved_by`;

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { venue_id, amenity_id, description } = req.body || {};

    if (!UUID_RE.test(venue_id || '')) throw httpError(400, 'venue_id must be a valid UUID');
    if (amenity_id && !UUID_RE.test(amenity_id)) throw httpError(400, 'amenity_id must be a valid UUID');
    if (!description || !description.trim()) throw httpError(400, 'description is required');

    let id;
    try {
      const ins = await pool.query(
        `INSERT INTO venue_issue_reports (venue_id, amenity_id, reported_by, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [venue_id, amenity_id || null, req.user.id, description.trim()]
      );
      id = ins.rows[0].id;
    } catch (err) {
      if (err.code === '23503') throw httpError(404, 'Venue or amenity not found');
      throw err;
    }

    const { rows } = await pool.query(`${ISSUE_SELECT} WHERE r.id = $1`, [id]);
    res.status(201).json(rows[0]);
  })
);

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, venue_id } = req.query;
    if (status && !['open', 'resolved'].includes(status)) throw httpError(400, "status must be 'open' or 'resolved'");
    if (venue_id && !UUID_RE.test(venue_id)) throw httpError(400, 'venue_id must be a valid UUID');

    const { rows } = await pool.query(
      `${ISSUE_SELECT}
        WHERE ($1::text IS NULL OR r.status = $1::text)
          AND ($2::uuid IS NULL OR r.venue_id = $2::uuid)
        ORDER BY r.created_at DESC
        LIMIT 200`,
      [status || null, venue_id || null]
    );
    res.json(rows);
  })
);

router.patch(
  '/:id/resolve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid issue id');

    const found = await pool.query(
      `SELECT r.status, f.block_id
         FROM venue_issue_reports r
         JOIN venues v ON v.id = r.venue_id
         JOIN floors f ON f.id = v.floor_id
        WHERE r.id = $1`,
      [id]
    );
    const issue = found.rows[0];
    if (!issue) throw httpError(404, 'Issue not found');

    const u = req.user;
    const allowed =
      u.role === 'admin' ||
      (u.role === 'faculty' && u.is_block_head && u.block_id === issue.block_id);
    if (!allowed) throw httpError(403, "Only an admin or this venue's block head can resolve issues");

    if (issue.status !== 'open') throw httpError(409, 'Issue is already resolved');

    await pool.query(
      `UPDATE venue_issue_reports
          SET status = 'resolved', resolved_by = $2, resolved_at = now()
        WHERE id = $1`,
      [id, u.id]
    );

    const { rows } = await pool.query(`${ISSUE_SELECT} WHERE r.id = $1`, [id]);
    res.json(rows[0]);
  })
);

module.exports = router;
