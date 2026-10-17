const crypto = require('crypto');

const TTL_MS = 5 * 60 * 1000;      // code valid for 5 minutes
const RESEND_MS = 30 * 1000;       // 30 s between sends
const MAX_ATTEMPTS = 5;

// email -> { hash, expiresAt, attempts, resendAfter, pending }
const store = new Map();

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Create (or re-issue) a code for an email.
 * `pending` = the validated signup data (password already hashed).
 * On resend, pass nothing and the existing pending data is reused.
 */
function issueOtp(email, pending) {
  const key = email.toLowerCase();
  const existing = store.get(key);

  if (existing && Date.now() < existing.resendAfter) {
    const secs = Math.ceil((existing.resendAfter - Date.now()) / 1000);
    throw httpError(429, `Please wait ${secs}s before requesting another code`);
  }

  const data = pending || existing?.pending;
  if (!data) throw httpError(400, 'No pending signup for this email. Start again.');

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  store.set(key, {
    hash: hashCode(code),
    expiresAt: Date.now() + TTL_MS,
    attempts: 0,
    resendAfter: Date.now() + RESEND_MS,
    pending: data,
  });
  return code;
}

/** Returns the pending signup data if the code is right, otherwise throws. */
function verifyOtp(email, code) {
  const key = email.toLowerCase();
  const entry = store.get(key);

  if (!entry) throw httpError(400, 'No pending signup for this email. Start again.');
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    throw httpError(400, 'Code expired. Request a new one.');
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    throw httpError(429, 'Too many wrong attempts. Start again.');
  }

  entry.attempts += 1;
  const given = Buffer.from(hashCode(String(code).trim()), 'hex');
  const expected = Buffer.from(entry.hash, 'hex');
  const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) throw httpError(400, 'Incorrect code');

  store.delete(key);
  return entry.pending;
}

// purge expired entries every minute; unref so it never keeps Node alive
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (now > v.expiresAt) store.delete(k);
}, 60 * 1000).unref();

module.exports = { issueOtp, verifyOtp };