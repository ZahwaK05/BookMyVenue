const { parseRequest } = require('../src/parser');
// "now" is fixed so the tests give the same answer every day:
// Saturday 10 October 2026, 11:00 IST
const NOW = new Date('2026-10-10T05:30:00Z');

const cases = [
  ['hall for 150 with a projector tomorrow 2-5 pm',
    { capacity: 150, type: 'hall', amenities: ['Projector'], start: '2026-10-11 14:00', end: '2026-10-11 17:00' }],
  ['Need a classroom for 60 students today 10 am to 12 pm with whiteboard and AC',
    { capacity: 60, type: 'classroom', amenities: ['Whiteboard', 'AC'], start: '2026-10-10 10:00', end: '2026-10-10 12:00' }],
  ['conference room for 30 people on 15 oct from 14:00 to 16:30 with a mic and projector',
    { capacity: 30, type: 'conference_hall', amenities: ['Projector', 'Mic'], start: '2026-10-15 14:00', end: '2026-10-15 16:30' }],
  ['seminar hall 200 seats next friday 9am-11am with speakers, podium and stage lighting',
    { capacity: 200, type: 'hall', amenities: ['Speaker', 'Podium', 'Stage Lighting'], start: '2026-10-16 09:00', end: '2026-10-16 11:00' }],
  ['hall for 100 on 2026-10-20 3 to 6',
    { capacity: 100, type: 'hall', amenities: [], start: '2026-10-20 15:00', end: '2026-10-20 18:00' }],
  ['something for 80 people tomorrow 11 am - 1 pm',
    { capacity: 80, type: null, amenities: [], start: '2026-10-11 11:00', end: '2026-10-11 13:00' }],
  ['hall for 150 with a projector',
    { capacity: 150, type: 'hall', amenities: ['Projector'], start: null, end: null, missing: ['date', 'time'] }],
  ['hall with wifi and a projector tomorrow 2-5 pm',
    { type: 'hall', amenities: ['Projector'], unsupported: ['wifi'], start: '2026-10-11 14:00' }],
  ['classroom 12/10/2026 10-11 am',
    { capacity: null, type: 'classroom', amenities: [], start: '2026-10-12 10:00', end: '2026-10-12 11:00' }],
];

let failed = 0;
for (const [text, want] of cases) {
  const got = parseRequest(text, NOW);
  const bad = Object.entries(want).filter(([k, v]) => JSON.stringify(got[k]) !== JSON.stringify(v));
  if (bad.length) {
    failed++;
    console.log('FAIL:', text);
    for (const [k, v] of bad) console.log('   ', k, 'expected', JSON.stringify(v), 'got', JSON.stringify(got[k]));
  } else console.log('ok  :', text);
}
console.log(failed ? `\n${failed} failed` : '\nAll passed');
process.exit(failed ? 1 : 0);
