// routes/admin.js  (mounted at /admin)
// All endpoints require admin authentication:
//   GET   /admin/security/flags              list security flags from Security Agent
//   POST  /admin/security/scan               trigger manual security scan
//   PATCH /admin/security/flags/:id          review/dismiss a security flag
//   GET   /admin/twin                        live digital twin campus state
//   GET   /admin/whatif/venue                what-if simulation for venue closure
//   GET   /admin/whatif/block                what-if simulation for block closure
//   GET   /admin/whatif/amenity              what-if simulation for amenity failure

const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// All admin routes require auth + admin role
router.use(requireAuth, requireRole('admin'));

// Helper for APIM calls to Security Agent
async function callSecurityAgent(endpointPath, options = {}) {
  const apimBase = process.env.APIM_BASE_URL || 'https://bmv-apim-mz.azure-api.net';
  const apimKey = process.env.APIM_KEY;

  if (!apimKey) {
    console.error('[security-agent] APIM_KEY is not configured');
    throw httpError(502, 'Security service is temporarily unavailable');
  }

  const url = `${apimBase.replace(/\/+$/, '')}${endpointPath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Ocp-Apim-Subscription-Key': apimKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[security-agent] Upstream returned status ${res.status}`);
      throw httpError(502, 'Security agent service returned an error');
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    if (err.name === 'AbortError') {
      throw httpError(504, 'Security agent timed out after 15s');
    }
    if (err.status) throw err;
    console.error('[security-agent] Fetch error:', err.message);
    throw httpError(502, 'Failed to connect to security agent');
  } finally {
    clearTimeout(timeoutId);
  }
}

/* --------------------------- Security Agent --------------------------- */

// GET /admin/security/flags?status=open&severity=&limit=
router.get(
  '/security/flags',
  asyncHandler(async (req, res) => {
    const { status = 'open', severity, limit } = req.query;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    if (limit) params.append('limit', limit);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await callSecurityAgent(`/security/security/flags${queryString}`, { method: 'GET' });
    res.json(data);
  })
);

// POST /admin/security/scan
router.post(
  '/security/scan',
  asyncHandler(async (req, res) => {
    const data = await callSecurityAgent('/security/security/scan', { method: 'POST' });
    res.json(data);
  })
);

// PATCH /admin/security/flags/:id
router.patch(
  '/security/flags/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['reviewed', 'dismissed'].includes(status)) {
      throw httpError(400, "status must be 'reviewed' or 'dismissed'");
    }

    const data = await callSecurityAgent(`/security/security/flags/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    res.json(data);
  })
);

/* ---------------------------- Digital Twin ---------------------------- */

// GET /admin/twin
router.get(
  '/twin',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM v_campus_twin ORDER BY block_name, floor_number, venue_name`
    );
    res.json(rows);
  })
);

/* ------------------------- What-If Simulation ------------------------- */

// GET /admin/whatif/venue?venue_id=&date=
router.get(
  '/whatif/venue',
  asyncHandler(async (req, res) => {
    const { venue_id, date } = req.query;
    if (!UUID_RE.test(venue_id || '')) throw httpError(400, 'venue_id must be a valid UUID');
    if (!DATE_RE.test(date || '')) throw httpError(400, 'date must be in YYYY-MM-DD format');

    const [summaryRes, detailsRes] = await Promise.all([
      pool.query('SELECT * FROM whatif_venue_closure_summary($1::uuid, $2::date)', [venue_id, date]),
      pool.query('SELECT * FROM whatif_venue_closure($1::uuid, $2::date)', [venue_id, date]),
    ]);

    res.json({
      summary: summaryRes.rows[0] || { affected_bookings: 0, reassignable: 0, needs_admin_action: 0 },
      details: detailsRes.rows || [],
    });
  })
);

// GET /admin/whatif/block?block_id=&date=
router.get(
  '/whatif/block',
  asyncHandler(async (req, res) => {
    const { block_id, date } = req.query;
    if (!UUID_RE.test(block_id || '')) throw httpError(400, 'block_id must be a valid UUID');
    if (!DATE_RE.test(date || '')) throw httpError(400, 'date must be in YYYY-MM-DD format');

    const [summaryRes, detailsRes] = await Promise.all([
      pool.query('SELECT * FROM whatif_block_closure_summary($1::uuid, $2::date)', [block_id, date]),
      pool.query('SELECT * FROM whatif_block_closure($1::uuid, $2::date)', [block_id, date]),
    ]);

    res.json({
      summary: summaryRes.rows[0] || { affected_bookings: 0, reassignable: 0, needs_admin_action: 0 },
      details: detailsRes.rows || [],
    });
  })
);

// GET /admin/whatif/amenity?venue_id=&amenity_id=&date=
router.get(
  '/whatif/amenity',
  asyncHandler(async (req, res) => {
    const { venue_id, amenity_id, date } = req.query;
    if (!UUID_RE.test(venue_id || '')) throw httpError(400, 'venue_id must be a valid UUID');
    if (!UUID_RE.test(amenity_id || '')) throw httpError(400, 'amenity_id must be a valid UUID');
    if (!DATE_RE.test(date || '')) throw httpError(400, 'date must be in YYYY-MM-DD format');

    const [summaryRes, detailsRes] = await Promise.all([
      pool.query('SELECT * FROM whatif_amenity_failure_summary($1::uuid, $2::uuid, $3::date)', [venue_id, amenity_id, date]),
      pool.query('SELECT * FROM whatif_amenity_failure($1::uuid, $2::uuid, $3::date)', [venue_id, amenity_id, date]),
    ]);

    res.json({
      summary: summaryRes.rows[0] || { affected_bookings: 0, reassignable: 0, needs_admin_action: 0 },
      details: detailsRes.rows || [],
    });
  })
);

module.exports = router;

