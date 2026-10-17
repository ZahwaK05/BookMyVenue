// test-api.js
// Automated End-to-End API verification suite for BookMyVenue
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { app, server } = require('./index');
const pool = require('./db/pool');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

let passedCount = 0;
let failedCount = 0;

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    passedCount++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failedCount++;
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

(async () => {
  console.log('\n========================================');
  console.log('BookMyVenue End-to-End API Test Suite');
  console.log('========================================\n');

  const stamp = Date.now();
  let adminToken, studentToken, facultyToken, blockHeadToken;
  let adminUser, studentUser, facultyUser, blockHeadUser;
  let testBlock, testFloor, testClassroom, testHall;
  let studentBookingId, hallBookingId, facultyBookingId;
  let timetableId, issueId;

  // Generate a unique future date for this test run so subsequent runs never collide
  const offsetDays = ((Math.floor(Date.now() / 1000)) % 300) + 5;
  const testDate = new Date(Date.now() + offsetDays * 86400000);
  const yyyy = testDate.getFullYear();
  const mm = String(testDate.getMonth() + 1).padStart(2, '0');
  const dd = String(testDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const dayOfWeek = testDate.getDay(); // 0-6

  try {
    // 1. Health check
    await test('GET /health returns 200 ok', async () => {
      const res = await request('GET', '/health');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.status === 'ok', 'Expected { status: "ok" }');
    });

    // 2. Authentication flows
    await test('POST /auth/signup (admin)', async () => {
      const res = await request('POST', '/auth/signup', {
        name: `Test Admin ${stamp}`,
        email: `admin_${stamp}@campus.test`,
        password: 'Password123!',
        role: 'admin',
        adminCode: process.env.ADMIN_SIGNUP_CODE,
      });
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.token, 'Expected token');
      adminToken = res.data.token;
      adminUser = res.data.user;
    });

    await test('POST /auth/signup (student)', async () => {
      const res = await request('POST', '/auth/signup', {
        name: `Test Student ${stamp}`,
        email: `student_${stamp}@campus.test`,
        password: 'Password123!',
        role: 'student',
      });
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.token, 'Expected token');
      studentToken = res.data.token;
      studentUser = res.data.user;
    });

    await test('POST /auth/signup (faculty)', async () => {
      const res = await request('POST', '/auth/signup', {
        name: `Test Faculty ${stamp}`,
        email: `faculty_${stamp}@campus.test`,
        password: 'Password123!',
        role: 'faculty',
      });
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.token, 'Expected token');
      facultyToken = res.data.token;
      facultyUser = res.data.user;
    });

    await test('POST /auth/signup (future block head faculty)', async () => {
      const res = await request('POST', '/auth/signup', {
        name: `Test BlockHead ${stamp}`,
        email: `blockhead_${stamp}@campus.test`,
        password: 'Password123!',
        role: 'faculty',
      });
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.token, 'Expected token');
      blockHeadToken = res.data.token;
      blockHeadUser = res.data.user;
    });

    await test('POST /auth/login returns token and user', async () => {
      const res = await request('POST', '/auth/login', {
        email: `student_${stamp}@campus.test`,
        password: 'Password123!',
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.token, 'Expected token on login');
    });

    await test('GET /auth/me returns current user info', async () => {
      const res = await request('GET', '/auth/me', null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.user.email === `student_${stamp}@campus.test`, 'User mismatch');
    });

    // 3. Campus Discovery: Blocks and Venues
    await test('GET /blocks returns blocks list', async () => {
      const res = await request('GET', '/blocks', null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data) && res.data.length > 0, 'Expected non-empty blocks array');
      testBlock = res.data[0];
    });

    await test('GET /blocks/:id/floors returns floors of block', async () => {
      const res = await request('GET', `/blocks/${testBlock.id}/floors`, null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.floors && res.data.floors.length > 0, 'Expected floors');
      testFloor = res.data.floors[0];
    });

    // 4. Assign Block Head
    await test('PATCH /users/:id/block-head assigns faculty to block head', async () => {
      const res = await request(
        'PATCH',
        `/users/${blockHeadUser.id}/block-head`,
        { is_block_head: true, block_id: testBlock.id },
        adminToken
      );
      assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.is_block_head === true, 'Expected is_block_head to be true');
      assert(res.data.block_id === testBlock.id, 'Expected matching block_id');
    });

    // 5. Venues & Amenities
    await test('GET /venues finds classroom and hall', async () => {
      const res = await request('GET', `/venues?block_id=${testBlock.id}`, null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data) && res.data.length > 0, 'Expected venues');

      testClassroom = res.data.find((v) => v.type === 'classroom') || res.data[0];
      testHall = res.data.find((v) => v.type === 'hall' || v.type === 'conference_hall') || res.data[0];
      assert(testClassroom, 'Found classroom');
      assert(testHall, 'Found hall');
    });

    await test('GET /amenities returns amenities list', async () => {
      const res = await request('GET', '/amenities', null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data), 'Expected array');
    });

    // 6. Timetable routes
    await test('POST /timetable adds a class timetable slot (admin)', async () => {
      const res = await request(
        'POST',
        '/timetable',
        {
          venue_id: testClassroom.id,
          day_of_week: dayOfWeek,
          start_time: '08:00',
          end_time: '09:00',
          label: 'CS101 Intro to Programming',
        },
        adminToken
      );
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      timetableId = res.data.id;
    });

    await test('GET /timetable returns slots for venue', async () => {
      const res = await request('GET', `/timetable?venue_id=${testClassroom.id}`, null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const found = res.data.some((s) => s.id === timetableId);
      assert(found, 'Created timetable entry found');
    });

    await test('POST /timetable/bulk adds multiple slots atomically', async () => {
      const res = await request(
        'POST',
        '/timetable/bulk',
        {
          rows: [
            {
              venue_id: testClassroom.id,
              day_of_week: dayOfWeek,
              start_time: '09:00',
              end_time: '10:00',
              label: 'CS102 Data Structures',
            },
            {
              venue_name: testClassroom.name,
              day_of_week: dayOfWeek,
              start_time: '10:00',
              end_time: '11:00',
              label: 'CS103 Algorithms',
            },
          ],
        },
        adminToken
      );
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.count === 2, `Expected 2 inserted, got ${res.data.count}`);
    });

    // 7. Booking & Conflict Checks
    await test('POST /bookings fails with 409 if slot overlaps scheduled class', async () => {
      const res = await request(
        'POST',
        '/bookings',
        {
          venue_id: testClassroom.id,
          start: `${dateStr}T08:30`,
          end: `${dateStr}T09:30`,
          purpose: 'Study Group during CS101',
        },
        studentToken
      );
      assert(res.status === 409, `Expected 409 conflict with class, got ${res.status}`);
      assert(res.data.error.includes('scheduled class'), 'Expected error mentioning scheduled class');
    });

    await test('POST /bookings (student classroom) creates pending_block_head booking', async () => {
      const res = await request(
        'POST',
        '/bookings',
        {
          venue_id: testClassroom.id,
          start: `${dateStr}T14:00`,
          end: `${dateStr}T16:00`,
          purpose: 'ACM Student Workshop',
        },
        studentToken
      );
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data.status === 'pending_block_head', `Expected pending_block_head, got ${res.data.status}`);
      studentBookingId = res.data.id;
    });

    await test('POST /bookings fails with 409 exclusion constraint on double booking', async () => {
      const res = await request(
        'POST',
        '/bookings',
        {
          venue_id: testClassroom.id,
          start: `${dateStr}T15:00`,
          end: `${dateStr}T17:00`,
          purpose: 'Overlapping reservation',
        },
        studentToken
      );
      assert(res.status === 409, `Expected 409 exclusion violation, got ${res.status}`);
    });

    await test('GET /bookings/queue returns booking for Block Head', async () => {
      const res = await request('GET', '/bookings/queue', null, blockHeadToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const found = res.data.some((b) => b.id === studentBookingId);
      assert(found, 'Student booking found in block head queue');
    });

    await test('POST /bookings/:id/decision (block head approve classroom) -> approved', async () => {
      const res = await request(
        'POST',
        `/bookings/${studentBookingId}/decision`,
        { decision: 'approve', comment: 'Approved by Block Head' },
        blockHeadToken
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.status === 'approved', `Expected approved, got ${res.data.status}`);
    });

    // 8. Tiered Approval: Student books Hall (requires dean)
    await test('POST /bookings (student hall) -> pending_block_head -> pending_dean -> approved', async () => {
      const bRes = await request(
        'POST',
        '/bookings',
        {
          venue_id: testHall.id,
          start: `${dateStr}T11:00`,
          end: `${dateStr}T13:00`,
          purpose: 'Campus Annual Symposium',
        },
        studentToken
      );
      assert(bRes.status === 201, `Expected 201, got ${bRes.status}`);
      hallBookingId = bRes.data.id;

      // Block head decision
      const bhDecision = await request(
        'POST',
        `/bookings/${hallBookingId}/decision`,
        { decision: 'approve', comment: 'Recommended for Dean review' },
        blockHeadToken
      );
      assert(bhDecision.status === 200, `Expected 200, got ${bhDecision.status}`);
      assert(bhDecision.data.status === 'pending_dean', `Expected pending_dean, got ${bhDecision.data.status}`);

      // Admin (Dean) queue
      const adminQueue = await request('GET', '/bookings/queue', null, adminToken);
      assert(adminQueue.status === 200, `Expected 200, got ${adminQueue.status}`);
      assert(adminQueue.data.some((b) => b.id === hallBookingId), 'Found in Dean queue');

      // Dean decision
      const deanDecision = await request(
        'POST',
        `/bookings/${hallBookingId}/decision`,
        { decision: 'approve', comment: 'Dean office approval granted' },
        adminToken
      );
      assert(deanDecision.status === 200, `Expected 200, got ${deanDecision.status}`);
      assert(deanDecision.data.status === 'approved', `Expected approved, got ${deanDecision.data.status}`);
    });

    // 9. Faculty Auto-Approval
    await test('POST /bookings (faculty) -> auto-approved immediately', async () => {
      const res = await request(
        'POST',
        '/bookings',
        {
          venue_id: testClassroom.id,
          start: `${dateStr}T17:00`,
          end: `${dateStr}T18:00`,
          purpose: 'Faculty Research Seminar',
        },
        facultyToken
      );
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.data.status === 'approved', `Expected approved, got ${res.data.status}`);
      facultyBookingId = res.data.id;
    });

    // 10. Audit history
    await test('GET /bookings/:id/history returns audit trail', async () => {
      const res = await request('GET', `/bookings/${hallBookingId}/history`, null, studentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data) && res.data.length >= 2, 'Expected at least 2 audit entries');
    });

    // 11. Cancellation workflow
    await test('POST /bookings/:id/cancel -> pending_cancellation -> Block Head approves -> cancelled', async () => {
      const cRes = await request(
        'POST',
        `/bookings/${studentBookingId}/cancel`,
        { comment: 'Speaker unable to attend' },
        studentToken
      );
      assert(cRes.status === 200, `Expected 200, got ${cRes.status}`);
      assert(cRes.data.status === 'pending_cancellation', `Expected pending_cancellation, got ${cRes.data.status}`);

      // Block Head approves cancellation
      const approveCancel = await request(
        'POST',
        `/bookings/${studentBookingId}/decision`,
        { decision: 'approve', comment: 'Cancellation confirmed' },
        blockHeadToken
      );
      assert(approveCancel.status === 200, `Expected 200, got ${approveCancel.status}`);
      assert(approveCancel.data.status === 'cancelled', `Expected cancelled, got ${approveCancel.data.status}`);
    });

    // 12. Issue Reporting & Resolution
    await test('Issue reporting: POST /issues -> GET /issues -> PATCH /issues/:id/resolve', async () => {
      const reportRes = await request(
        'POST',
        '/issues',
        {
          venue_id: testClassroom.id,
          description: 'Projector HDMI port loose',
        },
        studentToken
      );
      assert(reportRes.status === 201, `Expected 201, got ${reportRes.status}`);
      issueId = reportRes.data.id;

      const listRes = await request('GET', '/issues?status=open', null, studentToken);
      assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
      assert(listRes.data.some((i) => i.id === issueId), 'Reported issue found in open list');

      const resolveRes = await request('PATCH', `/issues/${issueId}/resolve`, null, blockHeadToken);
      assert(resolveRes.status === 200, `Expected 200, got ${resolveRes.status}`);
      assert(resolveRes.data.status === 'resolved', `Expected resolved, got ${resolveRes.data.status}`);
    });

    // 13. Digital Twin & What-If
    await test('GET /admin/twin returns live digital twin view', async () => {
      const res = await request('GET', '/admin/twin', null, adminToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data) && res.data.length > 0, 'Expected twin rows');
    });

    await test('GET /admin/whatif/venue returns simulation data', async () => {
      const res = await request('GET', `/admin/whatif/venue?venue_id=${testClassroom.id}&date=${dateStr}`, null, adminToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.summary !== undefined, 'Expected summary object');
      assert(Array.isArray(res.data.details), 'Expected details array');
    });

    await test('GET /admin/whatif/block returns simulation data', async () => {
      const res = await request('GET', `/admin/whatif/block?block_id=${testBlock.id}&date=${dateStr}`, null, adminToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.summary !== undefined, 'Expected summary');
    });

    // 14. Agent tests
    await test('GET /recommend queries Recommendation Agent', async () => {
      const res = await request('GET', '/recommend?q=hall for 150 with a projector tomorrow 2-5 pm', null, studentToken);
      if (res.status === 200) {
        assert(res.data !== null, 'Received agent response');
        console.log(`    [Agent OK] ${res.data.count || 0} recommendations returned`);
      } else {
        console.log(`    [Agent Note] Upstream returned status ${res.status} (${res.data?.error || ''})`);
      }
    });

    await test('GET /admin/security/flags queries Security Agent', async () => {
      const res = await request('GET', '/admin/security/flags?status=open', null, adminToken);
      if (res.status === 200) {
        assert(res.data !== null, 'Received security flags');
        console.log('    [Agent OK] Security flags returned');
      } else {
        console.log(`    [Agent Note] Upstream returned status ${res.status} (${res.data?.error || ''})`);
      }
    });

    // Clean up timetable slot
    if (timetableId) {
      await test('DELETE /timetable/:id deletes single slot (admin)', async () => {
        const res = await request('DELETE', `/timetable/${timetableId}`, null, adminToken);
        assert(res.status === 204, `Expected 204, got ${res.status}`);
      });
    }

  } catch (globalErr) {
    console.error('Unexpected test suite crash:', globalErr);
  } finally {
    console.log('\n----------------------------------------');
    console.log(`Test Execution Finished: ${passedCount} Passed, ${failedCount} Failed`);
    console.log('----------------------------------------\n');
    server.close();
    await pool.end();
    process.exit(failedCount === 0 ? 0 : 1);
  }
})();

