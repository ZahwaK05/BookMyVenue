// routes/blocks.js  (mounted at /blocks)
//   GET /blocks              all blocks with a venue count
//   GET /blocks/:id/floors   floors of one block with a venue count
// Then use GET /venues?floor_id=... for the venues on a floor.

const express = require('express');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT bl.id, bl.name, COUNT(v.id)::int AS venue_count
         FROM blocks bl
         LEFT JOIN floors f ON f.block_id = bl.id
         LEFT JOIN venues v ON v.floor_id = f.id
        GROUP BY bl.id, bl.name
        ORDER BY bl.name`
    );
    res.json(rows);
  })
);

router.get(
  '/:id/floors',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid block id' });

    const block = await pool.query('SELECT id, name FROM blocks WHERE id = $1', [req.params.id]);
    if (!block.rows[0]) return res.status(404).json({ error: 'Block not found' });

    const { rows } = await pool.query(
      `SELECT f.id, f.floor_number, COUNT(v.id)::int AS venue_count
         FROM floors f
         LEFT JOIN venues v ON v.floor_id = f.id
        WHERE f.block_id = $1
        GROUP BY f.id, f.floor_number
        ORDER BY f.floor_number`,
      [req.params.id]
    );
    res.json({ block: block.rows[0], floors: rows });
  })
);

module.exports = router;
