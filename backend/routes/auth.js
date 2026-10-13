// routes/auth.js  (mounted at /auth)
//   POST /auth/signup   { name, email, password, role, adminCode? }
//   POST /auth/login    { email, password }
//   GET  /auth/me

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool'); // if your pool file exports { pool }, use: const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ROLES = ['student', 'faculty', 'admin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_block_head: u.is_block_head,
    block_id: u.block_id,
  };
}

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, adminCode } = req.body || {};

    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    }

    // Optional guard: if ADMIN_SIGNUP_CODE is set in .env, admin signup needs it.
    if (role === 'admin' && process.env.ADMIN_SIGNUP_CODE && adminCode !== process.env.ADMIN_SIGNUP_CODE) {
      return res.status(403).json({ error: 'Invalid admin signup code' });
    }

    const hash = await bcrypt.hash(password, 10);

    let user;
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, is_block_head, block_id`,
        [name.trim(), email.trim().toLowerCase(), hash, role]
      );
      user = rows[0];
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' });
      throw err;
    }

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const { rows } = await pool.query(
      `SELECT id, name, email, role, is_block_head, block_id, password_hash
         FROM users WHERE lower(email) = $1`,
      [email.trim().toLowerCase()]
    );
    const user = rows[0];

    let ok = false;
    if (user) {
      try {
        ok = await bcrypt.compare(password, user.password_hash);
      } catch {
        ok = false; // seeded users have a placeholder hash and can never log in
      }
    }
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;