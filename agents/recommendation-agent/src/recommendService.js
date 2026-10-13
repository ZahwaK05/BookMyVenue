// Core logic of the Recommendation Agent, kept separate from the Azure
// trigger so it can be tested without Azure.
const { parseRequest } = require('./parser');

const SQL = `
  SELECT venue_id, venue_name, block_name, floor_number, venue_type,
         capacity, requires_dean_approval, score, reason
  FROM recommend_venues($1::int, $2::text[], $3::text, $4::timestamp, $5::timestamp, $6::int)`;

function describe(parsed) {
  const bits = [];
  if (parsed.type) bits.push(parsed.type.replace('_', ' '));
  else bits.push('venue');
  if (parsed.capacity) bits.push(`for ${parsed.capacity} people`);
  if (parsed.amenities.length) bits.push(`with ${parsed.amenities.join(', ')}`);
  bits.push(`on ${parsed.start.slice(0, 10)} from ${parsed.start.slice(11)} to ${parsed.end.slice(11)}`);
  return bits.join(' ');
}

// input: { query: "sentence" }  or an already-structured
//        { capacity, amenities, type, date, startTime, endTime }
async function recommend(pool, input, now = new Date(), limit = 5) {
  let parsed;
  if (input.query) {
    parsed = parseRequest(input.query, now);
  } else {
    const missing = [];
    if (!input.date) missing.push('date');
    if (!input.startTime || !input.endTime) missing.push('time');
    parsed = {
      capacity: input.capacity ?? null,
      type: input.type ?? null,
      amenities: input.amenities ?? [],
      date: input.date ?? null,
      start: missing.length ? null : `${input.date} ${input.startTime}`,
      end: missing.length ? null : `${input.date} ${input.endTime}`,
      missing,
    };
  }

  if (parsed.missing.length) {
    return {
      status: 400,
      body: {
        error: `Please include the ${parsed.missing.join(' and ')} (for example "hall for 150 with a projector tomorrow 2-5 pm").`,
        understood: parsed,
      },
    };
  }

  const { rows } = await pool.query(SQL, [
    parsed.capacity, parsed.amenities, parsed.type, parsed.start, parsed.end, limit,
  ]);

  const request = describe(parsed);
  const explanation = rows.length
    ? `Found ${rows.length} match${rows.length > 1 ? 'es' : ''} for a ${request}. Top pick: ${rows[0].venue_name} (${rows[0].block_name}, floor ${rows[0].floor_number}). ${rows[0].reason}.` +
      (rows[0].requires_dean_approval ? ' Note: this venue needs dean approval for student bookings.' : '')
    : `No venue is free for a ${request}. Try a different time, a smaller group, or fewer amenities.`;

  const ignored = (parsed.unsupported || []).length
    ? ` Note: "${parsed.unsupported.join(', ')}" is not tracked by the system, so it was not used in the search.`
    : '';

  return {
    status: 200,
    body: { understood: parsed, count: rows.length, explanation: explanation + ignored, recommendations: rows },
  };
}

module.exports = { recommend };
