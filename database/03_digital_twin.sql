-- =====================================================================
-- BookMyVenue: Digital Twin layer
-- Run AFTER 01_campus_migration.sql (and 02_campus_seed.sql if you want
-- the twin rows backfilled for the seeded venues).
--
-- What it adds:
--   venue_twin_state, amenity_twin_state   current state of every venue/amenity
--   twin_events                            history of every state change
--   simulation_scenarios / _results        storage for What-If runs
--   triggers that keep the twin in sync when bookings, approvals or issue
--   reports change
--   v_campus_twin                          one row per venue for dashboards
--
-- Safe to run twice (IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS).
-- One transaction: if anything fails, nothing is changed.
--
-- NOTE: "booked now" is judged with localtimestamp (the DB server's clock).
-- booking_range is a TSRANGE (no time zone), so if your Azure server runs in UTC
-- and users enter IST times, either set the server time zone or change
-- localtimestamp below to (now() AT TIME ZONE 'Asia/Kolkata').
-- =====================================================================
BEGIN;

-- 1. Tables ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_twin_state (
    venue_id           UUID PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
    availability_state VARCHAR(30) NOT NULL DEFAULT 'available'
        CHECK (availability_state IN ('available', 'booked', 'occupied',
                                      'maintenance', 'partially_unavailable')),
    occupancy_count    INT NOT NULL DEFAULT 0 CHECK (occupancy_count >= 0),
    operational_state  VARCHAR(30) NOT NULL DEFAULT 'good'
        CHECK (operational_state IN ('good', 'needs_attention', 'unavailable')),
    maintenance_state  VARCHAR(30) NOT NULL DEFAULT 'none'
        CHECK (maintenance_state IN ('none', 'scheduled', 'in_progress')),
    last_updated       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS amenity_twin_state (
    venue_id     UUID NOT NULL REFERENCES venues(id)    ON DELETE CASCADE,
    amenity_id   UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    status       VARCHAR(30) NOT NULL DEFAULT 'working'
        CHECK (status IN ('working', 'faulty', 'under_maintenance')),
    issue_state  VARCHAR(20) NOT NULL DEFAULT 'none'
        CHECK (issue_state IN ('none', 'open')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (venue_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS twin_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID REFERENCES venues(id) ON DELETE CASCADE,
    amenity_id  UUID REFERENCES amenities(id) ON DELETE SET NULL,
    event_type  VARCHAR(40) NOT NULL
        CHECK (event_type IN ('booking_created', 'booking_status_changed',
                              'approval_decision', 'issue_reported',
                              'issue_resolved', 'state_refreshed')),
    source_table VARCHAR(40),
    source_id    UUID,
    actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    old_state    JSONB,
    new_state    JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_twin_events_venue_time ON twin_events (venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twin_events_type_time  ON twin_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS simulation_scenarios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_type    VARCHAR(30) NOT NULL
        CHECK (scenario_type IN ('block_closure', 'venue_closure',
                                 'amenity_failure', 'demand_increase')),
    target_block_id  UUID REFERENCES blocks(id)    ON DELETE CASCADE,
    target_venue_id  UUID REFERENCES venues(id)    ON DELETE CASCADE,
    target_amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
    sim_date         DATE NOT NULL,
    parameters       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS simulation_results (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id        UUID NOT NULL REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
    affected_bookings  INT NOT NULL DEFAULT 0,
    auto_reassignable  INT NOT NULL DEFAULT 0,
    needs_admin_action INT NOT NULL DEFAULT 0,
    details            JSONB NOT NULL DEFAULT '{}'::jsonb,   -- per-booking alternatives
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Recompute one venue's twin state from the source tables --------------------
-- Source of truth stays in bookings / venue_issue_reports / amenity_twin_state;
-- this just derives the summary columns.
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
                     AND b.booking_range @> localtimestamp)
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

-- 3. Keep twin rows in step with venues / venue_amenities -------------------------
CREATE OR REPLACE FUNCTION trg_twin_venue_created() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO venue_twin_state (venue_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS twin_venue_created ON venues;
CREATE TRIGGER twin_venue_created AFTER INSERT ON venues
    FOR EACH ROW EXECUTE FUNCTION trg_twin_venue_created();

CREATE OR REPLACE FUNCTION trg_twin_venue_amenity_added() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO amenity_twin_state (venue_id, amenity_id)
    VALUES (NEW.venue_id, NEW.amenity_id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS twin_venue_amenity_added ON venue_amenities;
CREATE TRIGGER twin_venue_amenity_added AFTER INSERT ON venue_amenities
    FOR EACH ROW EXECUTE FUNCTION trg_twin_venue_amenity_added();

-- 4. Bookings -> twin_events + refresh ---------------------------------------------
CREATE OR REPLACE FUNCTION trg_twin_booking_changed() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO twin_events (venue_id, event_type, source_table, source_id, new_state)
        VALUES (NEW.venue_id, 'booking_created', 'bookings', NEW.id,
                jsonb_build_object('status', NEW.status,
                                   'booking_range', NEW.booking_range::text));
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO twin_events (venue_id, event_type, source_table, source_id,
                                 old_state, new_state)
        VALUES (NEW.venue_id, 'booking_status_changed', 'bookings', NEW.id,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status,
                                   'booking_range', NEW.booking_range::text));
    ELSE
        RETURN NEW;   -- nothing the twin cares about changed
    END IF;

    PERFORM twin_refresh_venue(NEW.venue_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS twin_booking_changed ON bookings;
CREATE TRIGGER twin_booking_changed AFTER INSERT OR UPDATE OF status ON bookings
    FOR EACH ROW EXECUTE FUNCTION trg_twin_booking_changed();

-- 5. Approvals (every decision, including auto-approvals) -> twin_events -----------
CREATE OR REPLACE FUNCTION trg_twin_approval_logged() RETURNS TRIGGER AS $$
DECLARE
    v_venue UUID;
BEGIN
    SELECT venue_id INTO v_venue FROM bookings WHERE id = NEW.booking_id;

    INSERT INTO twin_events (venue_id, event_type, source_table, source_id, actor_id, new_state)
    VALUES (v_venue, 'approval_decision', 'booking_approvals', NEW.id, NEW.approver_id,
            jsonb_build_object('booking_id', NEW.booking_id,
                               'tier', NEW.tier,
                               'decision', NEW.decision));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS twin_approval_logged ON booking_approvals;
CREATE TRIGGER twin_approval_logged AFTER INSERT ON booking_approvals
    FOR EACH ROW EXECUTE FUNCTION trg_twin_approval_logged();

-- 6. Issue reports -> amenity/venue state + twin_events ------------------------------
CREATE OR REPLACE FUNCTION trg_twin_issue_changed() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
        IF NEW.amenity_id IS NOT NULL THEN
            INSERT INTO amenity_twin_state (venue_id, amenity_id, status, issue_state, last_updated)
            VALUES (NEW.venue_id, NEW.amenity_id, 'faulty', 'open', now())
            ON CONFLICT (venue_id, amenity_id) DO UPDATE
                SET status = 'faulty', issue_state = 'open', last_updated = now();
        END IF;

        INSERT INTO twin_events (venue_id, amenity_id, event_type, source_table, source_id,
                                 actor_id, new_state)
        VALUES (NEW.venue_id, NEW.amenity_id, 'issue_reported', 'venue_issue_reports', NEW.id,
                NEW.reported_by,
                jsonb_build_object('description', NEW.description,
                                   'scope', CASE WHEN NEW.amenity_id IS NULL
                                                 THEN 'venue' ELSE 'amenity' END));

    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'resolved' THEN
        -- Amenity goes back to working only if no OTHER open issue exists for it.
        IF NEW.amenity_id IS NOT NULL AND NOT EXISTS (
               SELECT 1 FROM venue_issue_reports r
               WHERE r.venue_id = NEW.venue_id AND r.amenity_id = NEW.amenity_id
                 AND r.status = 'open' AND r.id <> NEW.id) THEN
            UPDATE amenity_twin_state
               SET status = 'working', issue_state = 'none', last_updated = now()
             WHERE venue_id = NEW.venue_id AND amenity_id = NEW.amenity_id;
        END IF;

        INSERT INTO twin_events (venue_id, amenity_id, event_type, source_table, source_id,
                                 actor_id, old_state, new_state)
        VALUES (NEW.venue_id, NEW.amenity_id, 'issue_resolved', 'venue_issue_reports', NEW.id,
                NEW.resolved_by,
                jsonb_build_object('status', 'open'),
                jsonb_build_object('status', 'resolved'));
    ELSE
        RETURN NEW;
    END IF;

    PERFORM twin_refresh_venue(NEW.venue_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS twin_issue_changed ON venue_issue_reports;
CREATE TRIGGER twin_issue_changed AFTER INSERT OR UPDATE OF status ON venue_issue_reports
    FOR EACH ROW EXECUTE FUNCTION trg_twin_issue_changed();

-- 7. Backfill for venues / amenities that already exist ------------------------------
INSERT INTO venue_twin_state (venue_id)
SELECT id FROM venues ON CONFLICT DO NOTHING;

INSERT INTO amenity_twin_state (venue_id, amenity_id)
SELECT venue_id, amenity_id FROM venue_amenities ON CONFLICT DO NOTHING;

-- 8. Dashboard view: one row per venue with its live state -----------------------------
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
           AND upper(bk.booking_range) > localtimestamp)            AS upcoming_bookings
FROM venues v
JOIN floors f ON f.id = v.floor_id
JOIN blocks b ON b.id = f.block_id
LEFT JOIN venue_twin_state t ON t.venue_id = v.id;

COMMIT;

-- ---------------------------------------------------------------------------------
-- Quick checks after COMMIT (run one at a time):
--
-- SELECT tgname FROM pg_trigger
-- WHERE tgrelid IN ('bookings'::regclass, 'booking_approvals'::regclass,
--                   'venue_issue_reports'::regclass, 'venues'::regclass,
--                   'venue_amenities'::regclass) AND NOT tgisinternal;
--
-- SELECT * FROM v_campus_twin ORDER BY block_name, floor_number, venue_name;
--
-- Demo: report a projector fault on B204, then watch the twin change.
-- INSERT INTO venue_issue_reports (venue_id, amenity_id, reported_by, description)
-- SELECT v.id, a.id, u.id, 'Projector not working'
-- FROM venues v, amenities a, users u
-- WHERE v.name = 'B204 Hall' AND a.name = 'Projector' AND u.email = 'faculty@campus.test';
-- SELECT venue_name, availability_state, operational_state FROM v_campus_twin WHERE venue_name = 'B204 Hall';
-- SELECT event_type, new_state, created_at FROM twin_events ORDER BY created_at DESC LIMIT 5;
--
-- What-If example (venue closure on a date): bookings that would be affected.
-- SELECT b.id, b.booking_range, b.status
-- FROM bookings b
-- WHERE b.venue_id = (SELECT id FROM venues WHERE name = 'B204 Hall')
--   AND b.booking_range && tsrange('2026-10-10 00:00', '2026-10-11 00:00')
--   AND b.status IN ('approved', 'pending_block_head', 'pending_dean');
