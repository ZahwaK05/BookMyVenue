const { app } = require('@azure/functions');
const { Pool } = require('pg');
const { recommend } = require('../recommendService');

// One pool for the life of the function app.
// DATABASE_URL must NOT contain "sslmode"; SSL is switched on here.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'off' ? false : { rejectUnauthorized: false },
  max: 3,
});

app.http('recommend', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'recommend',
  handler: async (request, context) => {
    try {
      let input = {};
      if (request.method === 'POST') {
        input = await request.json().catch(() => ({}));
      } else {
        input = { query: request.query.get('q') };
      }
      if (!input || (!input.query && !input.date)) {
        return { status: 400, jsonBody: { error: 'Send {"query": "hall for 150 with a projector tomorrow 2-5 pm"}' } };
      }
      const result = await recommend(pool, input);
      return { status: result.status, jsonBody: result.body };
    } catch (err) {
      context.error('recommend failed', err);
      return { status: 500, jsonBody: { error: 'Recommendation failed. Please try again.' } };
    }
  },
});
