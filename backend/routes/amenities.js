const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

// POST /amenities (admin only)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'name is required',
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO amenities (name)
         VALUES ($1)
         RETURNING *`,
        [name]
      );

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          error: 'An amenity with this name already exists',
        });
      }

      throw err;
    }
  })
);

// GET /amenities
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      'SELECT * FROM amenities ORDER BY name ASC'
    );

    return res.json(result.rows);
  })
);

// GET /amenities/:id
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM amenities WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Amenity not found',
      });
    }

    return res.json(result.rows[0]);
  })
);

// PUT /amenities/:id (admin only)
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'name is required',
      });
    }

    try {
      const result = await pool.query(
        `UPDATE amenities
         SET name = $1
         WHERE id = $2
         RETURNING *`,
        [name, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Amenity not found',
        });
      }

      return res.json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          error: 'An amenity with this name already exists',
        });
      }

      throw err;
    }
  })
);

// DELETE /amenities/:id (admin only)
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM amenities WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Amenity not found',
      });
    }

    return res.status(204).send();
  })
);

module.exports = router;