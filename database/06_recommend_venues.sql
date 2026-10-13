-- =====================================================================
-- BookMyVenue: Venue Recommendation, data layer
-- Run AFTER 03_digital_twin.sql.  Safe to run twice.  Only READS data.
--
-- recommend_venues(capacity, amenity names, venue type, start, end, limit)
--   returns the best-matching venues for a request such as
--   "hall for 150 with a projector, tomorrow 2-5 pm", ranked and with a
--   plain-English reason for each (so the agent can explain its choice).
--
-- A venue is a CANDIDATE only if ALL of these hold:
--   * capacity >= requested capacity
--   * type matches (when a type is given)
--   * it has EVERY requested amenity AND the digital twin says that
--     amenity is currently working
--   * the twin does not show it in maintenance / unavailable
--   * no active booking overlaps the requested slot
--   * no scheduled class (class_timetable) overlaps the slot
--
-- Score (0-100): 70 points for how snugly the room fits the group
-- (requested / capacity, so a 150-seat room beats a 400-seat room for 150
-- people) plus 30 points when the twin says the venue is in good order
-- (10 points when it needs attention).
--
-- The Azure Function turns the user's sentence into these parameters and
-- calls this function; the ranking logic lives here so it can be tested.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION recommend_venues(
    p_capacity  INT,
    p_amenities TEXT[],
    p_type      TEXT,
    p_start     TIMESTAMP,
    p_end       TIMESTAMP,
    p_limit     INT DEFAULT 5
) RETURNS TABLE (
    venue_id              UUID,
    venue_name            VARCHAR,
    block_name            VARCHAR,
    floor_number          INT,
    venue_type            VARCHAR,
    capacity              INT,
    requires_dean_approval BOOLEAN,
    score                 NUMERIC,
    reason                TEXT
) AS $$
    SELECT v.id,
           v.name,
           b.name,
           f.floor_number,
           v.type,
           v.capacity,
           v.requires_dean_approval,
           round(70 * LEAST(COALESCE(p_capacity, 0)::numeric / v.capacity, 1)
                 + CASE WHEN t.operational_state = 'good' THEN 30 ELSE 10 END, 1),
           format('%s; %s; free %s-%s',
                  CASE WHEN COALESCE(p_capacity, 0) = 0
                       THEN format('Seats %s', v.capacity)
                       ELSE format('Seats %s for %s people (%s%% full)',
                                   v.capacity, p_capacity,
                                   round(100 * LEAST(p_capacity::numeric / v.capacity, 1))) END,
                  CASE WHEN COALESCE(cardinality(p_amenities), 0) = 0
                       THEN 'no specific amenities requested'
                       ELSE 'requested amenities working' END,
                  to_char(p_start, 'HH24:MI'),
                  to_char(p_end,   'HH24:MI'))
    FROM venues v
    JOIN floors f ON f.id = v.floor_id
    JOIN blocks b ON b.id = f.block_id
    JOIN venue_twin_state t ON t.venue_id = v.id
    WHERE v.capacity >= COALESCE(p_capacity, 0)
      AND (p_type IS NULL OR v.type = p_type)
      AND t.availability_state <> 'maintenance'
      AND t.operational_state  <> 'unavailable'
      -- every requested amenity exists here and is working in the twin
      AND NOT EXISTS (
            SELECT 1 FROM unnest(p_amenities) AS want(name)
            WHERE NOT EXISTS (
                SELECT 1
                FROM venue_amenities va
                JOIN amenities a ON a.id = va.amenity_id
                JOIN amenity_twin_state s
                  ON s.venue_id = va.venue_id AND s.amenity_id = va.amenity_id
                WHERE va.venue_id = v.id
                  AND lower(a.name) = lower(want.name)
                  AND s.status = 'working'))
      -- free in the requested slot
      AND NOT EXISTS (
            SELECT 1 FROM bookings x
            WHERE x.venue_id = v.id
              AND x.status IN ('approved', 'pending_block_head',
                               'pending_dean', 'pending_cancellation')
              AND x.booking_range && tsrange(p_start, p_end))
      -- no scheduled class in the slot
      AND NOT EXISTS (
            SELECT 1 FROM class_timetable c
            WHERE c.venue_id = v.id
              AND c.day_of_week = EXTRACT(DOW FROM p_start)::int
              AND c.start_time < p_end::time
              AND c.end_time   > p_start::time)
    ORDER BY 8 DESC, v.capacity, v.name
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;

COMMIT;
