// db/pool.js
// Shared PostgreSQL connection pool. Reads DATABASE_URL from .env
// (the same Azure connection string you already used to run schema.sql).

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db/pool] WARNING: DATABASE_URL is not set in .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Azure PostgreSQL Flexible Server
  },
});

pool.on('error', (err) => {
  console.error('[db/pool] Unexpected error on idle client', err);
});

module.exports = pool;