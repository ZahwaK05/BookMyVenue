-- =====================================================================
-- BookMyVenue: What-If Simulation Engine, part 1 (venue closure)
-- Run AFTER 03_digital_twin.sql.  Safe to run twice (CREATE OR REPLACE).
-- Nothing here changes any data: both functions only READ and report.
--
-- whatif_venue_closure(venue, date)
--     lists every active booking that would be hit if that venue were
--     closed on that date, and for each one how many alternative venues
--     could take it and which one is suggested.
-- whatif_venue_closure_summary(venue, date)
--     one row: "N affected, M reassignable, K need admin action".
--
-- A venue counts as an ALTERNATIVE for a booking when ALL of these hold:
--   * it is a different venue of the SAME type
--   * its capacity is at least 80% of the closed venue's capacity
--   * it has every amenity the closed venue has
--   * the digital twin says it is not in maintenance / unavailable
--   * it has no active booking overlapping the same time slot
--   * it has no scheduled class (class_timetable) in that slot
-- The suggested venue is the smallest one that fits.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION whatif_venue_closure(p_venue UUID, p_date DATE)
RETURNS TABLE (
    booking_id         UUID,
    booking_range      TSRANGE,
    booking_status     VARCHAR,
    purpose            TEXT,
    requester_email    VARCHAR,
    alternatives_found INT,
    suggested_venue    VARCHAR
) AS $$
    SELECT b.id,
           b.booking_range,
           b.status,
           b.purpose,
           u.email,
           COALESCE(alt.n, 0)::int,
           alt.best
    FROM bookings b
    JOIN users  u  ON u.id  = b.user_id
    JOIN venues ov ON ov.id = b.venue_id
    LEFT JOIN LATERAL (
        SELECT count(*) AS n,
               (array_agg(av.name ORDER BY av.capacity, av.name))[1] AS best
        FROM venues av
        JOIN venue_twin_state t ON t.venue_id = av.id
        WHERE av.id <> b.venue_id
          AND av.type = ov.type
          AND av.capacity >= ov.capacity * 0.8
          AND t.availability_state <> 'maintenance'
          AND t.operational_state  <> 'unavailable'
          -- no overlapping active booking
          AND NOT EXISTS (
                SELECT 1 FROM bookings x
                WHERE x.venue_id = av.id
                  AND x.status IN ('approved', 'pending_block_head',
                                   'pending_dean', 'pending_cancellation')
                  AND x.booking_range && b.booking_range)
          -- no scheduled class in that slot
          AND NOT EXISTS (
                SELECT 1 FROM class_timetable c
                WHERE c.venue_id = av.id
                  AND c.day_of_week = EXTRACT(DOW FROM lower(b.booking_range))::int
                  AND c.start_time < upper(b.booking_range)::time
                  AND c.end_time   > lower(b.booking_range)::time)
          -- has every amenity the closed venue has
          AND NOT EXISTS (
                SELECT 1 FROM venue_amenities oa
                WHERE oa.venue_id = ov.id
                  AND NOT EXISTS (
                        SELECT 1 FROM venue_amenities aa
                        WHERE aa.venue_id = av.id AND aa.amenity_id = oa.amenity_id))
    ) alt ON true
    WHERE b.venue_id = p_venue
      AND b.status IN ('approved', 'pending_block_head', 'pending_dean')
      AND b.booking_range && tsrange(p_date::timestamp, (p_date + 1)::timestamp)
    ORDER BY lower(b.booking_range);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION whatif_venue_closure_summary(p_venue UUID, p_date DATE)
RETURNS TABLE (
    affected_bookings  INT,
    reassignable       INT,
    needs_admin_action INT
) AS $$
    SELECT count(*)::int,
           (count(*) FILTER (WHERE alternatives_found > 0))::int,
           (count(*) FILTER (WHERE alternatives_found = 0))::int
    FROM whatif_venue_closure(p_venue, p_date);
$$ LANGUAGE sql STABLE;

COMMIT;
