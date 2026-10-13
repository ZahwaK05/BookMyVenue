-- =====================================================================
-- BookMyVenue: What-If Simulation Engine, part 2
--   * block closure      (a whole block unavailable on a date)
--   * amenity failure    (e.g. the projector in one venue fails on a date)
-- Run AFTER 04_whatif_venue_closure.sql.  Safe to run twice.
-- Nothing here changes any data: every function only READS and reports.
--
-- Shared helper
--   whatif_find_alternatives(booking, excluded_venues, required_amenity)
--     returns "how many alternative venues exist" and "which one is
--     suggested" for one booking. Same rules as part 1:
--       same type, capacity >= 80% of the original venue, has every
--       amenity the original venue has, twin not in maintenance /
--       unavailable, no overlapping active booking, no scheduled class.
--     If required_amenity is given, the alternative must also have that
--     amenity currently WORKING in the twin (used for amenity failures).
--
-- Main functions
--   whatif_block_closure(block, date)            + _summary
--   whatif_amenity_failure(venue, amenity, date) + _summary
--
-- Assumption for amenity failure: a booking does not record which
-- amenities it needs, so EVERY active booking at that venue on that date
-- is treated as potentially affected.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION whatif_find_alternatives(
    p_booking  UUID,
    p_excluded UUID[],
    p_amenity  UUID DEFAULT NULL
) RETURNS TABLE (n INT, best VARCHAR) AS $$
    SELECT count(*)::int,
           (array_agg(av.name ORDER BY av.capacity, av.name))[1]
    FROM bookings b
    JOIN venues ov ON ov.id = b.venue_id
    JOIN venues av ON NOT (av.id = ANY (p_excluded))
    JOIN venue_twin_state t ON t.venue_id = av.id
    WHERE b.id = p_booking
      AND av.type = ov.type
      AND av.capacity >= ov.capacity * 0.8
      AND t.availability_state <> 'maintenance'
      AND t.operational_state  <> 'unavailable'
      AND NOT EXISTS (
            SELECT 1 FROM bookings x
            WHERE x.venue_id = av.id
              AND x.status IN ('approved', 'pending_block_head',
                               'pending_dean', 'pending_cancellation')
              AND x.booking_range && b.booking_range)
      AND NOT EXISTS (
            SELECT 1 FROM class_timetable c
            WHERE c.venue_id = av.id
              AND c.day_of_week = EXTRACT(DOW FROM lower(b.booking_range))::int
              AND c.start_time < upper(b.booking_range)::time
              AND c.end_time   > lower(b.booking_range)::time)
      AND NOT EXISTS (
            SELECT 1 FROM venue_amenities oa
            WHERE oa.venue_id = ov.id
              AND NOT EXISTS (
                    SELECT 1 FROM venue_amenities aa
                    WHERE aa.venue_id = av.id AND aa.amenity_id = oa.amenity_id))
      AND (p_amenity IS NULL OR EXISTS (
            SELECT 1 FROM amenity_twin_state s
            WHERE s.venue_id = av.id AND s.amenity_id = p_amenity
              AND s.status = 'working'));
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------
-- Block closure
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION whatif_block_closure(p_block UUID, p_date DATE)
RETURNS TABLE (
    booking_id         UUID,
    venue_name         VARCHAR,
    booking_range      TSRANGE,
    booking_status     VARCHAR,
    purpose            TEXT,
    requester_email    VARCHAR,
    alternatives_found INT,
    suggested_venue    VARCHAR
) AS $$
    SELECT b.id,
           v.name,
           b.booking_range,
           b.status,
           b.purpose,
           u.email,
           alt.n,
           alt.best
    FROM bookings b
    JOIN venues v ON v.id = b.venue_id
    JOIN floors f ON f.id = v.floor_id
    JOIN users  u ON u.id = b.user_id
    CROSS JOIN LATERAL whatif_find_alternatives(
        b.id,
        (SELECT array_agg(v2.id)
           FROM venues v2 JOIN floors f2 ON f2.id = v2.floor_id
          WHERE f2.block_id = p_block)
    ) alt
    WHERE f.block_id = p_block
      AND b.status IN ('approved', 'pending_block_head', 'pending_dean')
      AND b.booking_range && tsrange(p_date::timestamp, (p_date + 1)::timestamp)
    ORDER BY v.name, lower(b.booking_range);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION whatif_block_closure_summary(p_block UUID, p_date DATE)
RETURNS TABLE (
    affected_bookings  INT,
    reassignable       INT,
    needs_admin_action INT
) AS $$
    SELECT count(*)::int,
           (count(*) FILTER (WHERE alternatives_found > 0))::int,
           (count(*) FILTER (WHERE alternatives_found = 0))::int
    FROM whatif_block_closure(p_block, p_date);
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------
-- Amenity failure
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION whatif_amenity_failure(p_venue UUID, p_amenity UUID, p_date DATE)
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
           alt.n,
           alt.best
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    CROSS JOIN LATERAL whatif_find_alternatives(b.id, ARRAY[p_venue], p_amenity) alt
    WHERE b.venue_id = p_venue
      AND EXISTS (SELECT 1 FROM venue_amenities va
                  WHERE va.venue_id = p_venue AND va.amenity_id = p_amenity)
      AND b.status IN ('approved', 'pending_block_head', 'pending_dean')
      AND b.booking_range && tsrange(p_date::timestamp, (p_date + 1)::timestamp)
    ORDER BY lower(b.booking_range);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION whatif_amenity_failure_summary(p_venue UUID, p_amenity UUID, p_date DATE)
RETURNS TABLE (
    affected_bookings  INT,
    reassignable       INT,
    needs_admin_action INT
) AS $$
    SELECT count(*)::int,
           (count(*) FILTER (WHERE alternatives_found > 0))::int,
           (count(*) FILTER (WHERE alternatives_found = 0))::int
    FROM whatif_amenity_failure(p_venue, p_amenity, p_date);
$$ LANGUAGE sql STABLE;

COMMIT;
