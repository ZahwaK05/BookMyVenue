-- =====================================================================
-- BookMyVenue: clock fix for the digital twin (Indian time)
-- Run AFTER 03_digital_twin.sql.  Safe to run twice.  Changes NO data
-- except re-calculating each venue's twin state once at the end.
--
-- Why: booking_range is a TSRANGE (no time zone) and users enter Indian
-- times, but the Azure database clock is UTC. 03 compared bookings with
-- localtimestamp (UTC), so "booked right now" was wrong by 5.5 hours.
-- This replaces localtimestamp with the current time in Asia/Kolkata in
--   * twin_refresh_venue()   ("is this venue booked right now?")
--   * v_campus_twin          (the "upcoming_bookings" column)
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION twin_refresh_venue(p_venue UUID) RETURNS VOID AS $$
DECLARE
    v_venue_issue BOOLEAN;
    v_faulty      BOOLEAN;
    v_booked_now  BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM venue_issue_reports r
                   WHERE r.venue_id = p_venue AND r.amenity_id IS NULL AND r.status = 'open')
      INTO v_venue_issue;

    SELECT EXISTS (SELECT 1 FROM amenity_twin_state a
                   WHERE a.venue_id = p_venue AND a.status <> 'working')
      INTO v_faulty;

    SELECT EXISTS (SELECT 1 FROM bookings b
                   WHERE b.venue_id = p_venue AND b.status = 'approved'
                     AND b.booking_range @> (now() AT TIME ZONE 'Asia/Kolkata'))
      INTO v_booked_now;

    INSERT INTO venue_twin_state (venue_id, availability_state, operational_state,
                                  maintenance_state, last_updated)
    VALUES (
        p_venue,
        CASE WHEN v_venue_issue THEN 'maintenance'
             WHEN v_booked_now  THEN 'booked'
             WHEN v_faulty      THEN 'partially_unavailable'
             ELSE 'available' END,
        CASE WHEN v_venue_issue THEN 'unavailable'
             WHEN v_faulty      THEN 'needs_attention'
             ELSE 'good' END,
        CASE WHEN v_venue_issue THEN 'in_progress' ELSE 'none' END,
        now())
    ON CONFLICT (venue_id) DO UPDATE SET
        availability_state = EXCLUDED.availability_state,
        operational_state  = EXCLUDED.operational_state,
        maintenance_state  = EXCLUDED.maintenance_state,
        last_updated       = now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW v_campus_twin AS
SELECT b.id   AS block_id,   b.name AS block_name,
       f.id   AS floor_id,   f.floor_number,
       v.id   AS venue_id,   v.name AS venue_name, v.type, v.capacity,
       t.availability_state, t.operational_state, t.maintenance_state,
       t.occupancy_count,    t.last_updated,
       (SELECT count(*) FROM venue_issue_reports r
         WHERE r.venue_id = v.id AND r.status = 'open')            AS open_issues,
       (SELECT count(*) FROM bookings bk
         WHERE bk.venue_id = v.id AND bk.status = 'approved'
           AND upper(bk.booking_range) > (now() AT TIME ZONE 'Asia/Kolkata'))            AS upcoming_bookings
FROM venues v
JOIN floors f ON f.id = v.floor_id
JOIN blocks b ON b.id = f.block_id
LEFT JOIN venue_twin_state t ON t.venue_id = v.id;

-- Re-calculate every venue once so stored states use the corrected clock.
DO $$
BEGIN
    PERFORM twin_refresh_venue(id) FROM venues;
END;
$$;

COMMIT;
