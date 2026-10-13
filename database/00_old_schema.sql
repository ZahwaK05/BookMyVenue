
-- ============================================
-- BookMyVenue Schema (FINAL / LOCKED)
-- ============================================
-- Run CREATE EXTENSION statements first.
-- On Azure: btree_gist and pgcrypto must be allow-listed
-- via Server Parameters -> azure.extensions before running this.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone_number VARCHAR(15),
    venue_usage_purpose VARCHAR(100),  -- e.g. wedding, conference, birthday, corporate event
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'venue_owner', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VENUES
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(200) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    price_per_day NUMERIC(10,2) NOT NULL CHECK (price_per_day >= 0),
    avg_rating NUMERIC(3,2) DEFAULT 0,   -- denormalized, maintained by trigger
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AMENITIES
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL
);

-- VENUE_AMENITIES (junction table, resolves M:N)
CREATE TABLE venue_amenities (
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (venue_id, amenity_id)
);

-- BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_range DATERANGE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent overlapping confirmed bookings for the same venue
    EXCLUDE USING gist (
        venue_id WITH =,
        booking_range WITH &&
    ) WHERE (status = 'confirmed')
);

-- Composite index for availability lookups
CREATE INDEX idx_bookings_venue_date ON bookings (venue_id, booking_range);

-- REVIEWS
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One review per booking (added in Phase 1.2 patch)
    CONSTRAINT unique_review_per_booking UNIQUE (booking_id)
);

-- ============================================
-- Trigger: auto-update venues.avg_rating
-- Handles INSERT, UPDATE, and DELETE on reviews
-- (patched version — uses OLD on delete since NEW doesn't exist then)
-- ============================================
CREATE OR REPLACE FUNCTION update_venue_rating() RETURNS TRIGGER AS $$
DECLARE
    target_venue_id UUID;
BEGIN
    target_venue_id := COALESCE(NEW.venue_id, OLD.venue_id);
    UPDATE venues
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE venue_id = target_venue_id
    )
    WHERE id = target_venue_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_venue_rating();

CREATE TRIGGER trg_update_rating_delete
AFTER DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_venue_rating();
