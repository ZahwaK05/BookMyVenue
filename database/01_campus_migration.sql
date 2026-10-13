-- =====================================================================
-- BookMyVenue: campus-pivot schema migration
-- Implements schema-contract-for-manas.md (Zahwa).  Target database: bookyvenue
--
-- What it does to existing data:
--   * users      -> KEPT (customer -> student, venue_owner -> faculty)
--   * venues     -> old marketplace venues are DELETED (they have no floor/type)
--   * bookings   -> old DATERANGE bookings are DELETED (cannot satisfy the new rules)
--   * reviews    -> table DROPPED (replaced by venue_issue_reports)
--   * amenities  -> KEPT
--
-- Safe to run twice: the destructive steps only run while the OLD layout is
-- still in place, so a second run will not wipe real bookings.
-- Everything is in one transaction: if anything fails, nothing is changed.
-- Tip: stop the Node backend first so nothing holds a lock on these tables.
-- =====================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- must exist before bookings' EXCLUDE

-- 1. Remove the old star-rating system --------------------------------------
DROP TABLE IF EXISTS reviews CASCADE;
DROP FUNCTION IF EXISTS update_venue_rating();

-- 2. blocks and floors -----------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS floors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id     UUID NOT NULL REFERENCES blocks(id),
    floor_number INT  NOT NULL,
    UNIQUE (block_id, floor_number)
);

-- 3. venues ----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'venues'
                     AND column_name = 'floor_id') THEN
        DELETE FROM venues;   -- cascades to venue_amenities and bookings
    END IF;
END $$;

ALTER TABLE venues
    DROP COLUMN IF EXISTS owner_id,
    DROP COLUMN IF EXISTS location,
    DROP COLUMN IF EXISTS price_per_day,
    DROP COLUMN IF EXISTS avg_rating;

ALTER TABLE venues ADD COLUMN IF NOT EXISTS floor_id  UUID NOT NULL REFERENCES floors(id);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS type      VARCHAR(20) NOT NULL;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_type_check;
ALTER TABLE venues ADD CONSTRAINT venues_type_check
    CHECK (type IN ('classroom', 'hall', 'conference_hall'));

-- Always in sync with type: halls and conference halls need dean approval.
ALTER TABLE venues ADD COLUMN IF NOT EXISTS requires_dean_approval BOOLEAN
    GENERATED ALWAYS AS (type IN ('hall', 'conference_hall')) STORED;

-- 4. users -----------------------------------------------------------------
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'users'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) ILIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

UPDATE users SET role = 'student' WHERE role = 'customer';
UPDATE users SET role = 'faculty' WHERE role = 'venue_owner';

ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('student', 'faculty', 'admin'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_block_head BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES blocks(id);

-- 5. bookings --------------------------------------------------------------
-- DATERANGE -> TSRANGE. Dropping the column also drops the old EXCLUDE and index.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'bookings'
                 AND column_name = 'booking_range' AND udt_name = 'daterange') THEN
        DELETE FROM bookings;
        ALTER TABLE bookings DROP COLUMN booking_range;
        ALTER TABLE bookings ADD COLUMN booking_range tsrange NOT NULL;
    END IF;
END $$;

DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = 'bookings'::regclass AND contype = 'c'
               AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending_block_head';
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending_block_head', 'pending_dean', 'approved',
                      'rejected', 'pending_cancellation', 'cancelled'));

-- One booking must stay inside a single calendar day.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_single_day;
ALTER TABLE bookings ADD CONSTRAINT bookings_single_day
    CHECK (lower(booking_range)::date = upper(booking_range)::date);

-- No double booking. PARTIAL on purpose: rejected/cancelled bookings must not
-- block the slot. Same name PostgreSQL generated before, so error handling
-- that relies on the old name keeps working.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_venue_id_booking_range_excl;
ALTER TABLE bookings ADD CONSTRAINT bookings_venue_id_booking_range_excl
    EXCLUDE USING GIST (venue_id WITH =, booking_range WITH &&)
    WHERE (status IN ('approved', 'pending_block_head', 'pending_dean', 'pending_cancellation'));

CREATE INDEX IF NOT EXISTS idx_bookings_venue_date ON bookings (venue_id, booking_range);

-- 6. booking_approvals (audit trail) ------------------------------------------
CREATE TABLE IF NOT EXISTS booking_approvals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),          -- nullable: auto-approvals
    tier        VARCHAR(20) NOT NULL
                CHECK (tier IN ('auto', 'block_head', 'dean', 'requester')),
    decision    VARCHAR(20) NOT NULL
                CHECK (decision IN ('approved', 'rejected', 'cancel_requested')),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_approvals_booking ON booking_approvals (booking_id);

-- 7. venue_issue_reports ------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_issue_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    amenity_id  UUID REFERENCES amenities(id) ON DELETE SET NULL,   -- nullable
    reported_by UUID NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. class_timetable ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_timetable (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    label       TEXT,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_class_timetable_venue_day ON class_timetable (venue_id, day_of_week);

COMMIT;

-- Optional check after COMMIT: shows every CHECK/EXCLUDE rule on the key tables.
-- SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS rule
-- FROM pg_constraint
-- WHERE conrelid IN ('bookings'::regclass, 'users'::regclass, 'venues'::regclass)
--   AND contype IN ('c', 'x')
-- ORDER BY 1, 2;
