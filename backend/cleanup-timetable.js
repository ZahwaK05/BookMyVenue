const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const LABELS = ['CS101 Intro to Programming', 'CS102 Data Structures', 'CS103 Algorithms'];

async function api(method, p, body, token) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

(async () => {
  // log in with an existing admin account (set these in your shell, not in the file)
  const login = await api('POST', '/auth/login', {
    email: process.env.CLEAN_EMAIL, password: process.env.CLEAN_PASSWORD,
  });
  const token = login.data?.token;
  if (!token) return console.error('Login failed', login.status);

  const venues = (await api('GET', '/venues', null, token)).data;
  let removed = 0;
  for (const v of venues) {
    const slots = (await api('GET', `/timetable?venue_id=${v.id}`, null, token)).data || [];
    for (const s of slots.filter((s) => LABELS.includes(s.label))) {
      const r = await api('DELETE', `/timetable/${s.id}`, null, token);
      if (r.status === 204) removed++;
    }
  }
  console.log(`Removed ${removed} leftover test slots`);
})();