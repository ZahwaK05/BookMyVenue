// routes/venues.js  (mounted at /venues)
//   GET   /venues?block_id=&floor_id=&type=&min_capacity=   any logged-in user
//   GET   /venues/:id                                       any logged-in user
//   POST  /venues                                           admin
//   PATCH /venues/:id                                       admin
//
// requires_dean_approval is a generated column (true for hall/conference_hall),
// so it is never written here.

const express = require('express');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = ['classroom', 'hall', 'conference_hall'];

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const VENUE_SELECT = `
  SELECT v.id, v.name, v.type, v.capacity, v.image_url, v.requires_dean_approval,
         v.floor_id, f.floor_number, f.block_id, bl.name AS block_name,
         COALESCE((
           SELECT json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name)
             FROM venue_amenities va
             JOIN amenities a ON a.id = va.amenity_id
            WHERE va.venue_id = v.id
         ), '[]'::json) AS amenities,
         (SELECT COUNT(*)::int FROM venue_issue_reports r
           WHERE r.venue_id = v.id AND r.status = 'open') AS open_issues
    FROM venues v
    JOIN floors f ON f.id = v.floor_id
    JOIN blocks bl ON bl.id = f.block_id`;

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { block_id, floor_id, type, min_capacity } = req.query;

    if (block_id && !UUID_RE.test(block_id)) throw httpError(400, 'block_id must be a valid UUID');
    if (floor_id && !UUID_RE.test(floor_id)) throw httpError(400, 'floor_id must be a valid UUID');
    if (type && !TYPES.includes(type)) throw httpError(400, `type must be one of: ${TYPES.join(', ')}`);

    let cap = null;
    if (min_capacity !== undefined && min_capacity !== '') {
      cap = Number.parseInt(min_capacity, 10);
      if (!Number.isInteger(cap) || cap < 0) throw httpError(400, 'min_capacity must be a non-negative integer');
    }

    const { rows } = await pool.query(
      `${VENUE_SELECT}
        WHERE ($1::uuid IS NULL OR f.block_id = $1::uuid)
          AND ($2::uuid IS NULL OR v.floor_id = $2::uuid)
          AND ($3::text IS NULL OR v.type = $3::text)
          AND ($4::int  IS NULL OR v.capacity >= $4::int)
        ORDER BY bl.name, f.floor_number, v.name`,
      [block_id || null, floor_id || null, type || null, cap]
    );
    res.json(rows);
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw httpError(400, 'Invalid venue id');
    const { rows } = await pool.query(`${VENUE_SELECT} WHERE v.id = $1`, [req.params.id]);
    if (!rows[0]) throw httpError(404, 'Venue not found');
    res.json(rows[0]);
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { floor_id, name, type, capacity, image_url } = req.body || {};

    if (!UUID_RE.test(floor_id || '')) throw httpError(400, 'floor_id must be a valid UUID');
    if (!name || !name.trim()) throw httpError(400, 'name is required');
    if (!TYPES.includes(type)) throw httpError(400, `type must be one of: ${TYPES.join(', ')}`);
    if (!Number.isInteger(capacity) || capacity <= 0) throw httpError(400, 'capacity must be a positive integer');

    let id;
    try {
      const ins = await pool.query(
        `INSERT INTO venues (floor_id, name, type, capacity, image_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [floor_id, name.trim(), type, capacity, image_url || null]
      );
      id = ins.rows[0].id;
    } catch (err) {
      if (err.code === '23503') throw httpError(400, 'floor_id does not exist');
      if (err.code === '23505') throw httpError(409, 'A venue with that name already exists');
      throw err;
    }

    const { rows } = await pool.query(`${VENUE_SELECT} WHERE v.id = $1`, [id]);
    res.status(201).json(rows[0]);
  })
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid venue id');

    const { name, type, capacity, image_url, floor_id } = req.body || {};
    if ([name, type, capacity, image_url, floor_id].every((v) => v === undefined)) {
      throw httpError(400, 'Provide at least one of: name, type, capacity, image_url, floor_id');
    }
    if (type !== undefined && !TYPES.includes(type)) throw httpError(400, `type must be one of: ${TYPES.join(', ')}`);
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity <= 0)) {
      throw httpError(400, 'capacity must be a positive integer');
    }
    if (floor_id !== undefined && !UUID_RE.test(floor_id)) throw httpError(400, 'floor_id must be a valid UUID');

    let result;
    try {
      result = await pool.query(
        `UPDATE venues
            SET name      = COALESCE($1, name),
                type      = COALESCE($2, type),
                capacity  = COALESCE($3, capacity),
                image_url = COALESCE($4, image_url),
                floor_id  = COALESCE($5::uuid, floor_id)
          WHERE id = $6
          RETURNING id`,
        [name ? name.trim() : null, type ?? null, capacity ?? null, image_url ?? null, floor_id ?? null, id]
      );
    } catch (err) {
      if (err.code === '23503') throw httpError(400, 'floor_id does not exist');
      if (err.code === '23505') throw httpError(409, 'A venue with that name already exists');
      throw err;
    }
    if (!result.rows[0]) throw httpError(404, 'Venue not found');

    const { rows } = await pool.query(`${VENUE_SELECT} WHERE v.id = $1`, [id]);
    res.json(rows[0]);
  })
);

module.exports = router;
