// Turns a sentence like
//   "hall for 150 with a projector tomorrow 2-5 pm"
// into { capacity, type, amenities, date, start, end }.
// Simple pattern matching: no AI call, no cost, predictable results.
// Dates and times are treated as campus time (IST) with no time zone,
// the same way bookings.booking_range (TSRANGE) stores them.

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

const WEEKDAYS = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

// phrase people type  ->  amenity name stored in the amenities table
const AMENITY_WORDS = [
  [/\bprojectors?\b/, 'Projector'],
  [/\b(?:mics?|microphones?)\b/, 'Mic'],
  [/\b(?:speakers?|sound system)\b/, 'Speaker'],
  [/\bpodium\b/, 'Podium'],
  [/\bwhite\s?boards?\b/, 'Whiteboard'],
  [/\b(?:a\/c|ac|air[\s-]?condition(?:ed|ing|er)?)\b/, 'AC'],
  [/\bstage\s+light(?:ing|s)?\b/, 'Stage Lighting'],
];

// things people ask for that the amenities table does not track
const UNSUPPORTED_WORDS = /\b(wi-?fi|internet|cctv|camera|recording|parking|catering|laptops?)\b/g;

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// "today" in campus time (IST), as a UTC-midnight Date so day maths is safe
function todayIST(now) {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

function addDays(d, n) {
  return new Date(d.getTime() + n * 86400000);
}

function parseType(t) {
  if (/\b(?:conference|board\s?room|boardroom|meeting\s+room|meeting\s+hall)\b/.test(t)) return 'conference_hall';
  if (/\b(?:class\s?rooms?|lecture\s+room|tutorial\s+room)\b/.test(t)) return 'classroom';
  if (/\b(?:halls?|auditorium|seminar|lecture\s+hall)\b/.test(t)) return 'hall';
  return null;
}

// Find a time range. Returns { start:'HH:MM', end:'HH:MM', matched:'...' } or null.
function parseTimeRange(t) {
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|till|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/;
  const m = re.exec(t);
  if (!m) return null;
  let h1 = parseInt(m[1], 10), min1 = m[2] ? parseInt(m[2], 10) : 0, p1 = m[3];
  let h2 = parseInt(m[4], 10), min2 = m[5] ? parseInt(m[5], 10) : 0, p2 = m[6];
  if (h1 > 24 || h2 > 24 || min1 > 59 || min2 > 59) return null;

  // "2-5 pm": the single am/pm applies to both
  if (!p1 && p2) p1 = p2;
  if (p1 && !p2) p2 = p1;

  const to24 = (h, p) => {
    if (p === 'am') return h === 12 ? 0 : h;
    if (p === 'pm') return h === 12 ? 12 : h + 12;
    return h;
  };
  let a = to24(h1, p1), b = to24(h2, p2);

  // No am/pm and 12-hour looking numbers ("2 to 5"): assume campus hours
  // 1-6 -> afternoon, 7-11 -> morning, 12 -> noon.
  if (!p1 && !p2) {
    const guess = (h) => (h >= 1 && h <= 6 ? h + 12 : h);
    if (h1 <= 12 && h2 <= 12) { a = guess(h1); b = guess(h2); }
  }
  if (b <= a && b + 12 <= 24 && b < 12 && !p2) b += 12; // "11 to 1" -> 11:00-13:00
  if (a < 0 || a > 23 || b < 0 || b > 24 || b <= a) return null;
  if (b === 24 && min2 > 0) return null;

  const hhmm = (h, mn) => `${pad(h)}:${pad(mn)}`;
  return { start: hhmm(a, min1), end: hhmm(b === 24 ? 23 : b, b === 24 ? 59 : min2), matched: m[0] };
}

function parseDate(t, today) {
  let m;
  const hit = (date, matched) => ({ date, matched });

  if ((m = /\bday after tomorrow\b/.exec(t))) return hit(fmtDate(addDays(today, 2)), m[0]);
  if ((m = /\btomorrow\b|\btmrw\b|\btomo\b/.exec(t))) return hit(fmtDate(addDays(today, 1)), m[0]);
  if ((m = /\btoday\b/.exec(t))) return hit(fmtDate(today), m[0]);

  if ((m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(t))) return hit(`${m[1]}-${m[2]}-${m[3]}`, m[0]);

  if ((m = /\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/.exec(t))) {
    let y = m[3] ? parseInt(m[3], 10) : today.getUTCFullYear();
    if (y < 100) y += 2000;
    return hit(`${y}-${pad(parseInt(m[2], 10))}-${pad(parseInt(m[1], 10))}`, m[0]);
  }

  const monthNames = Object.keys(MONTHS).join('|');
  m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${monthNames})\\b(?:\\s*,?\\s*(\\d{4}))?`).exec(t);
  if (!m) {
    const r = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s*,?\\s*(\\d{4}))?`).exec(t);
    if (r) m = [r[0], r[2], r[1], r[3]];
  }
  if (m) {
    const y = m[3] ? parseInt(m[3], 10) : today.getUTCFullYear();
    return hit(`${y}-${pad(MONTHS[m[2]])}-${pad(parseInt(m[1], 10))}`, m[0]);
  }

  const wd = new RegExp(`\\b(?:next\\s+|this\\s+|on\\s+)?(${Object.keys(WEEKDAYS).join('|')})\\b`).exec(t);
  if (wd) {
    const target = WEEKDAYS[wd[1]];
    let diff = (target - today.getUTCDay() + 7) % 7;
    if (diff === 0) diff = 7; // "monday" said on a Monday means next Monday
    return hit(fmtDate(addDays(today, diff)), wd[0]);
  }
  return null;
}

function parseCapacity(t) {
  let m = /\b(\d{1,4})\s*(?:\+\s*)?(?:people|persons?|students?|seats?|seater|pax|attendees|members|participants|guests)\b/.exec(t);
  if (m) return parseInt(m[1], 10);
  m = /\b(?:for|of|capacity(?: of)?|around|about|approx(?:imately)?)\s+(\d{1,4})\b(?!\s*(?:am|pm|:|-|\/))/.exec(t);
  if (m) return parseInt(m[1], 10);
  return null;
}

function parseRequest(text, now = new Date()) {
  const original = String(text || '');
  const t = original.toLowerCase().replace(/\s+/g, ' ').trim();
  const today = todayIST(now);

  // Date first, then remove its text, so "2026-10-20" is never read as a time.
  const dateHit = parseDate(t, today);
  const tNoDate = dateHit ? t.replace(dateHit.matched, ' ') : t;
  const date = dateHit ? dateHit.date : null;

  // Time next, then remove it, so its digits are never read as a capacity.
  const time = parseTimeRange(tNoDate);
  const rest = time ? tNoDate.replace(time.matched, ' ') : tNoDate;

  const amenities = [];
  for (const [re, name] of AMENITY_WORDS) {
    if (re.test(rest) && !amenities.includes(name)) amenities.push(name);
  }

  const unsupported = [...new Set((rest.match(UNSUPPORTED_WORDS) || []))];

  const missing = [];
  if (!date) missing.push('date');
  if (!time) missing.push('time');

  return {
    capacity: parseCapacity(rest),
    type: parseType(rest),
    amenities,
    date,
    start: time && date ? `${date} ${time.start}` : null,
    end: time && date ? `${date} ${time.end}` : null,
    unsupported,
    missing,
  };
}

module.exports = { parseRequest };
