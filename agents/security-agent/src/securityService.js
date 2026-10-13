// Core logic of the Security Agent, separate from the Azure triggers so it
// can be tested without Azure. All rules live in the database function
// security_scan() (07_security_agent.sql); this file only calls it and
// reads/updates the xai_logs table.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['open', 'reviewed', 'dismissed'];
const SEVERITIES = ['low', 'medium', 'high'];

async function runScan(pool) {
  const { rows } = await pool.query('SELECT security_scan() AS new_flags');
  return rows[0].new_flags;
}

async function listFlags(pool, { status, severity, limit } = {}) {
  if (status && !STATUSES.includes(status)) {
    return { status: 400, body: { error: `status must be one of: ${STATUSES.join(', ')}` } };
  }
  if (severity && !SEVERITIES.includes(severity)) {
    return { status: 400, body: { error: `severity must be one of: ${SEVERITIES.join(', ')}` } };
  }
  let lim = parseInt(limit, 10);
  if (!Number.isFinite(lim) || lim < 1) lim = 50;
  if (lim > 200) lim = 200;

  const { rows } = await pool.query(
    `SELECT id, created_at, rule_code, severity, status, user_id, user_name, user_email,
            explanation, evidence, twin_context, reviewed_by, reviewed_at
       FROM v_xai_logs
      WHERE ($1::text IS NULL OR status = $1)
        AND ($2::text IS NULL OR severity = $2)
      ORDER BY (CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END), created_at DESC
      LIMIT $3`,
    [status || null, severity || null, lim]
  );
  return { status: 200, body: { count: rows.length, flags: rows } };
}

async function reviewFlag(pool, id, { status, reviewedBy } = {}) {
  if (!UUID_RE.test(id || '')) {
    return { status: 400, body: { error: 'Flag id must be a valid UUID.' } };
  }
  if (!['reviewed', 'dismissed'].includes(status)) {
    return { status: 400, body: { error: 'status must be "reviewed" or "dismissed".' } };
  }
  if (reviewedBy && !UUID_RE.test(reviewedBy)) {
    return { status: 400, body: { error: 'reviewedBy must be a valid user UUID.' } };
  }
  try {
    const { rows } = await pool.query(
      `UPDATE xai_logs
          SET status = $2, reviewed_by = $3, reviewed_at = now()
        WHERE id = $1
        RETURNING id, status, reviewed_by, reviewed_at`,
      [id, status, reviewedBy || null]
    );
    if (!rows.length) return { status: 404, body: { error: 'No flag with that id.' } };
    return { status: 200, body: rows[0] };
  } catch (err) {
    if (err.code === '23503') {
      return { status: 400, body: { error: 'reviewedBy is not an existing user.' } };
    }
    throw err;
  }
}

module.exports = { runScan, listFlags, reviewFlag };
