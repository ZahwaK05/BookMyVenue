// Run from the backend folder:  node test-db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

const HALL = '17775693-05c7-47d9-8001-c4811b8100fd';
const CLASSROOM = 'c907525c-dc0c-42e1-9bee-f6f5514ce469';
const BLOCK = 'd910796c-1c67-406b-a10b-499dfaf80521';
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

let passed = 0;
let failed = 0;

async function check(label, sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    passed++;
    console.log(`\nPASS  ${label}  (${r.rowCount} rows)`);
    if (r.rowCount) console.log('      first row:', JSON.stringify(r.rows[0]).slice(0, 300));
  } catch (e) {
    failed++;
    console.log(`\nFAIL  ${label}\n      ${e.message}`);
  }
}

(async () => {
  console.log('Test date used for What-If:', tomorrow);

  await check('current database', 'select current_database() as db');
  await check('hall exists', 'select * from venues where id = $1::uuid', [HALL]);
  await check('classroom exists', 'select * from venues where id = $1::uuid', [CLASSROOM]);
  await check('block exists', 'select * from blocks where id = $1::uuid', [BLOCK]);
  await check('twin view', 'select * from v_campus_twin');
  await check('users table', 'select count(*) from users');
  await check('bookings table', 'select count(*) from bookings');
  await check('booking_approvals table', 'select count(*) from booking_approvals');
  await check('class_timetable table', 'select count(*) from class_timetable');
  await check('what-if venue closure summary (hall)',
    'select * from whatif_venue_closure_summary($1::uuid, $2::date)', [HALL, tomorrow]);
  await check('what-if venue closure details (hall)',
    'select * from whatif_venue_closure($1::uuid, $2::date)', [HALL, tomorrow]);
  await check('what-if block closure summary',
    'select * from whatif_block_closure_summary($1::uuid, $2::date)', [BLOCK, tomorrow]);
  await check('what-if block closure details',
    'select * from whatif_block_closure($1::uuid, $2::date)', [BLOCK, tomorrow]);

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
  await pool.end();
})();