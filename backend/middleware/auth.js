// middleware/auth.js
//
// Real JWT auth. The token only carries the user id; role, is_block_head and
// block_id are re-read from the database on every request, so an admin
// changing someone into a block head takes effect immediately.

const jwt = require('jsonwebtoken');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = header.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, role, is_block_head, block_id
         FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User no longer exists' });

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// requireRole('admin')  or  requireRole('faculty', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}

// Block head = a faculty member with is_block_head set and a block assigned.
function requireBlockHead(req, res, next) {
  const u = req.user;
  if (u && u.role === 'faculty' && u.is_block_head && u.block_id) return next();
  return res.status(403).json({ error: 'Block head access only' });
}

module.exports = { requireAuth, requireRole, requireBlockHead };