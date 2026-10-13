const { app } = require('@azure/functions');
const { Pool } = require('pg');
const { runScan, listFlags, reviewFlag } = require('../securityService');

// One pool for the life of the function app. The connection details come
// from the PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD settings.
const pool = new Pool({
  ssl: process.env.DB_SSL === 'off' ? false : { rejectUnauthorized: false },
  max: 3,
});

const fail = (context, err) => {
  context.error('security agent failed', err);
  return { status: 500, jsonBody: { error: 'Security agent failed. Please try again.' } };
};

// Run the rules now
app.http('securityScan', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'security/scan',
  handler: async (request, context) => {
    try {
      const newFlags = await runScan(pool);
      const open = await listFlags(pool, { status: 'open', limit: 20 });
      return { status: 200, jsonBody: { new_flags: newFlags, open_flags: open.body.flags } };
    } catch (err) {
      return fail(context, err);
    }
  },
});

// List flags for the admin XAI dashboard
app.http('securityFlags', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'security/flags',
  handler: async (request, context) => {
    try {
      const r = await listFlags(pool, {
        status: request.query.get('status'),
        severity: request.query.get('severity'),
        limit: request.query.get('limit'),
      });
      return { status: r.status, jsonBody: r.body };
    } catch (err) {
      return fail(context, err);
    }
  },
});

// Mark a flag reviewed or dismissed
app.http('securityFlagReview', {
  methods: ['PATCH', 'POST'],
  authLevel: 'function',
  route: 'security/flags/{id}',
  handler: async (request, context) => {
    try {
      const body = await request.json().catch(() => ({}));
      const r = await reviewFlag(pool, request.params.id, body);
      return { status: r.status, jsonBody: r.body };
    } catch (err) {
      return fail(context, err);
    }
  },
});

// Run the rules automatically every 10 minutes
app.timer('securityScanTimer', {
  schedule: '0 */10 * * * *',
  handler: async (timer, context) => {
    try {
      const n = await runScan(pool);
      context.log(`security scan finished: ${n} new flag(s)`);
    } catch (err) {
      context.error('scheduled security scan failed', err);
    }
  },
});
