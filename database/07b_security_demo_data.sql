-- =====================================================================
-- BookMyVenue: demo data for the Security Agent (LOCAL TESTING)
-- Run AFTER 07_security_agent.sql.  Run it ONCE.
--
-- Creates a test user "suspect@campus.test" who behaves suspiciously:
--   * books the same slot (12 Oct 2026, 10:00-11:00) in 4 different
--     classrooms, then cancels 3 of them straight away
--       -> triggers SLOT_HOARDING and RAPID_BOOK_CANCEL
--   * books D101 on 12 different days
--       -> pushes the total to 16 bookings: HIGH_BOOKING_VOLUME
--
-- To remove everything again afterwards:
--   DELETE FROM xai_logs WHERE user_id = (SELECT id FROM users WHERE email='suspect@campus.test');
--   DELETE FROM users WHERE email = 'suspect@campus.test';   -- also deletes the bookings
-- =====================================================================
BEGIN;

INSERT INTO users (name, email, password_hash, role)
VALUES ('Test Suspect', 'suspect@campus.test', '!seed-no-login', 'student')
ON CONFLICT (email) DO NOTHING;

-- Same slot, four different classrooms
INSERT INTO bookings (venue_id, user_id, booking_range, purpose)
SELECT v.id, u.id, tsrange('2026-10-12 10:00', '2026-10-12 11:00'), 'Demo: slot hoarding'
FROM venues v, users u
WHERE v.name IN ('A101', 'A102', 'B101', 'C101')
  AND u.email = 'suspect@campus.test';

-- Cancel three of them right away
UPDATE bookings
SET status = 'cancelled'
WHERE purpose = 'Demo: slot hoarding'
  AND venue_id IN (SELECT id FROM venues WHERE name IN ('A101', 'A102', 'B101'))
  AND user_id = (SELECT id FROM users WHERE email = 'suspect@campus.test');

-- Twelve more bookings on twelve different days at D101
INSERT INTO bookings (venue_id, user_id, booking_range, purpose)
SELECT v.id, u.id,
       tsrange(d::timestamp + time '14:00', d::timestamp + time '15:00'),
       'Demo: high volume'
FROM venues v, users u,
     generate_series(date '2026-11-01', date '2026-11-12', interval '1 day') AS d
WHERE v.name = 'D101'
  AND u.email = 'suspect@campus.test';

COMMIT;
