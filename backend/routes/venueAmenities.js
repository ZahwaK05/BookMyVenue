const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

// GET /venues/:venueId/amenities
router.get(
  '/venues/:venueId/amenities',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { venueId } = req.params;

    const result = await pool.query(
      `SELECT a.*
       FROM amenities a
       JOIN venue_amenities va
         ON va.amenity_id = a.id
       WHERE va.venue_id = $1
       ORDER BY a.name ASC`,
      [venueId]
    );

    return res.json(result.rows);
  })
);

// POST /venues/:venueId/amenities/:amenityId (admin only)
router.post(
  '/venues/:venueId/amenities/:amenityId',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { venueId, amenityId } = req.params;

    try {
      const result = await pool.query(
        `INSERT INTO venue_amenities (venue_id, amenity_id)
         VALUES ($1, $2)
         RETURNING venue_id, amenity_id`,
        [venueId, amenityId]
      );

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      // Composite primary key violation
      if (err.code === '23505') {
        return res.status(409).json({
          error: 'This amenity is already assigned to this venue',
        });
      }

      // Foreign key violation
      if (err.code === '23503') {
        return res.status(400).json({
          error: 'Invalid venue_id or amenity_id',
        });
      }

      throw err;
    }
  })
);

// DELETE /venues/:venueId/amenities/:amenityId (admin only)
router.delete(
  '/venues/:venueId/amenities/:amenityId',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { venueId, amenityId } = req.params;

    const result = await pool.query(
      `DELETE FROM venue_amenities
       WHERE venue_id = $1 AND amenity_id = $2
       RETURNING venue_id, amenity_id`,
      [venueId, amenityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Venue-amenity relationship not found',
      });
    }

    return res.status(204).send();
  })
);

module.exports = router;