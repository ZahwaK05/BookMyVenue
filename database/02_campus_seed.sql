-- =====================================================================
-- BookMyVenue: seed data for the campus schema
-- Run AFTER 01_campus_migration.sql.  Safe to run more than once.
-- The last query prints the three IDs that test-flow.ps1 asks for.
-- =====================================================================
BEGIN;

-- 4 blocks, 3 floors each ------------------------------------------------
INSERT INTO blocks (name) VALUES ('Block A'), ('Block B'), ('Block C'), ('Block D')
ON CONFLICT (name) DO NOTHING;

INSERT INTO floors (block_id, floor_number)
SELECT b.id, f.n FROM blocks b CROSS JOIN generate_series(1, 3) AS f(n)
ON CONFLICT (block_id, floor_number) DO NOTHING;

-- Amenities master list --------------------------------------------------
INSERT INTO amenities (name) VALUES
    ('Projector'), ('Mic'), ('Speaker'), ('Podium'),
    ('Whiteboard'), ('AC'), ('Stage Lighting')
ON CONFLICT (name) DO NOTHING;

-- Venues -----------------------------------------------------------------
INSERT INTO venues (floor_id, name, type, capacity)
SELECT fl.id, s.venue, s.vtype, s.capacity
FROM (VALUES
    ('Block A', 1, 'A101',                 'classroom',       60),
    ('Block A', 1, 'A102',                 'classroom',       60),
    ('Block A', 2, 'A201 Seminar Hall',    'hall',           150),
    ('Block A', 3, 'A301 Conference Room', 'conference_hall',  40),
    ('Block B', 1, 'B101',                 'classroom',       60),
    ('Block B', 2, 'B201',                 'classroom',       80),
    ('Block B', 2, 'B204 Hall',            'hall',           180),
    ('Block B', 3, 'B301 Conference Room', 'conference_hall',  50),
    ('Block C', 1, 'C101',                 'classroom',       60),
    ('Block C', 2, 'C201 Lecture Hall',    'hall',           120),
    ('Block D', 1, 'D101',                 'classroom',       60),
    ('Block D', 2, 'D201',                 'classroom',       60),
    ('Block D', 3, 'D301 Board Room',      'conference_hall',  30)
) AS s(block, floor_number, venue, vtype, capacity)
JOIN blocks b  ON b.name = s.block
JOIN floors fl ON fl.block_id = b.id AND fl.floor_number = s.floor_number
WHERE NOT EXISTS (SELECT 1 FROM venues v WHERE v.floor_id = fl.id AND v.name = s.venue);

-- Amenities per venue type ------------------------------------------------
INSERT INTO venue_amenities (venue_id, amenity_id)
SELECT v.id, a.id
FROM venues v
JOIN amenities a ON
       (v.type = 'classroom'       AND a.name IN ('Projector', 'Whiteboard', 'AC'))
    OR (v.type = 'hall'            AND a.name IN ('Projector', 'Mic', 'Speaker', 'Podium', 'AC', 'Stage Lighting'))
    OR (v.type = 'conference_hall' AND a.name IN ('Projector', 'Mic', 'AC', 'Whiteboard'))
ON CONFLICT DO NOTHING;

-- Test users (placeholder password_hash: they cannot log in through real login) --
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Test Student', 'student@campus.test', '!seed-no-login', 'student'),
    ('Test Faculty', 'faculty@campus.test', '!seed-no-login', 'faculty'),
    ('Test Admin',   'admin@campus.test',   '!seed-no-login', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Faculty block head of Block B (the block that has the test hall B204) -----
INSERT INTO users (name, email, password_hash, role, is_block_head, block_id)
SELECT 'Test Block Head', 'blockhead@campus.test', '!seed-no-login', 'faculty', true, b.id
FROM blocks b WHERE b.name = 'Block B'
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- The three values test-flow.ps1 needs:
--   .\test-flow.ps1 -HallId <HallId> -ClassroomId <ClassroomId> -BlockId <BlockId>
SELECT 'HallId' AS param, v.id::text AS value FROM venues v WHERE v.name = 'B204 Hall'
UNION ALL
SELECT 'ClassroomId', v.id::text FROM venues v WHERE v.name = 'A101'
UNION ALL
SELECT 'BlockId', b.id::text FROM blocks b WHERE b.name = 'Block B';

-- To make a REAL signed-up account a block head / admin later:
-- UPDATE users SET is_block_head = true,
--        block_id = (SELECT id FROM blocks WHERE name = 'Block B')
-- WHERE email = 'someone@example.com';
-- UPDATE users SET role = 'admin' WHERE email = 'someone@example.com';
