// backend/routes/signupOtp.js
// Email-OTP signup. Mounted BEFORE the existing auth router, so it adds
// /auth/signup/request, /auth/signup/verify, /auth/signup/resend and guards
// the old one-step /auth/signup. It does not modify routes/auth.js.

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { issueOtp, verifyOtp } = require('../services/otp');
const { sendOtpEmail } = require('../services/mailer');

let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch {
  bcrypt = require('bcryptjs');
}

const router = express.Router();

const ROLES = ['student', 'faculty', 'admin'];
const PW_COLUMNS = ['password_hash', 'password', 'hashed_password', 'pass_hash'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Find which column of "users" stores the password hash (cached after first use)
let pwColumn = null;
async function getPasswordColumn() {
  if (pwColumn) return pwColumn;
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = ANY($1)`,
    [PW_COLUMNS]
  );
  const found = PW_COLUMNS.find((c) => rows.some((r) => r.column_name === c));
  if (!found) throw httpError(500, 'Could not find the password column on the users table');
  pwColumn = found;
  return pwColumn;
}

async function emailTaken(email) {
  const { rows } = await pool.query(
    'SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [email]
  );
  return rows.length > 0;
}

// Old one-step signup stays available only when OTP_REQUIRED=false (test suite)
router.post('/signup', (req, res, next) => {
  if (process.env.OTP_REQUIRED === 'false') return next();
  return res.status(400).json({
    error: 'Email verification is required. Use /auth/signup/request and /auth/signup/verify.',
  });
});

// Step 1: validate, then email a code. The account is NOT created yet.
router.post('/signup/request', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || '').trim();
    const adminCode = String(req.body.adminCode || '');

    if (!name) throw httpError(400, 'Name is required');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Enter a valid email');
    if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
    if (!ROLES.includes(role)) throw httpError(400, 'Invalid role');

    if (role === 'admin') {
      const expected = process.env.ADMIN_SIGNUP_CODE;
      if (!expected || adminCode !== expected) {
        throw httpError(403, 'Invalid admin registration code');
      }
    }

    if (await emailTaken(email)) throw httpError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const code = issueOtp(email, { name, email, role, passwordHash });
    await sendOtpEmail(email, code);

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    next(err);
  }
});

// Step 2: check the code, then create the account and log the user in.
router.post('/signup/verify', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    if (!email || !otp) throw httpError(400, 'Email and code are required');

    const pending = verifyOtp(email, otp);

    if (await emailTaken(pending.email)) {
      throw httpError(409, 'An account with this email already exists');
    }

    const col = await getPasswordColumn();
    let user;
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, ${col}, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, is_block_head, block_id`,
        [pending.name, pending.email, pending.passwordHash, pending.role]
      );
      user = rows[0];
    } catch (err) {
      if (err.code === '23505') throw httpError(409, 'An account with this email already exists');
      throw err;
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Resend: new code for the same pending signup (30 s cooldown enforced in otp.js)
router.post('/signup/resend', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) throw httpError(400, 'Email is required');

    const code = issueOtp(email); // reuses the pending signup data
    await sendOtpEmail(email, code);

    res.json({ message: 'A new code has been sent' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;