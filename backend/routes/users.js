// routes/users.js  (mounted at /users)
// Signup and login now live in routes/auth.js (/auth/signup, /auth/login).
//   GET   /users                    admin: list all users
//   PATCH /users/:id/block-head     admin: { is_block_head: true, block_id } or { is_block_head: false }

const express = require('express');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_block_head, u.block_id, bl.name AS block_name
         FROM users u
         LEFT JOIN blocks bl ON bl.id = u.block_id
        ORDER BY u.role, u.name`
    );
    res.json(rows);
  })
);

router.patch(
  '/:id/block-head',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_block_head, block_id } = req.body || {};

    if (!UUID_RE.test(id)) throw httpError(400, 'Invalid user id');
    if (typeof is_block_head !== 'boolean') throw httpError(400, 'is_block_head must be true or false');

    const target = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!target.rows[0]) throw httpError(404, 'User not found');

    let newBlockId = null;
    if (is_block_head) {
      // Block head is an attribute of a faculty member, not a separate role.
      if (target.rows[0].role !== 'faculty') throw httpError(400, 'Only faculty can be made block head');
      if (!UUID_RE.test(block_id || '')) throw httpError(400, 'block_id is required and must be a valid UUID');
      newBlockId = block_id;
    }

    try {
      await pool.query('UPDATE users SET is_block_head = $2, block_id = $3 WHERE id = $1', [
        id,
        is_block_head,
        newBlockId,
      ]);
    } catch (err) {
      if (err.code === '23503') throw httpError(400, 'block_id does not exist');
      throw err;
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_block_head, u.block_id, bl.name AS block_name
         FROM users u LEFT JOIN blocks bl ON bl.id = u.block_id
        WHERE u.id = $1`,
      [id]
    );
    res.json(rows[0]);
  })
);

module.exports = router;
