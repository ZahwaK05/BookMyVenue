-- =====================================================================
-- BookMyVenue: AI Security Agent, data layer (fixed rules, explainable)
-- Run AFTER 03_digital_twin.sql.  Safe to run twice.
--
-- Adds
--   xai_logs        one row per flag raised, with a plain-English
--                   explanation, the evidence, and the digital-twin state
--                   of the venues involved (the "XAI log")
--   security_scan() applies three fixed rules and writes new flags
--   v_xai_logs      flags joined with the user's name/email for dashboards
--
-- The three rules (thresholds are parameters, defaults shown):
--   RAPID_BOOK_CANCEL     3+ bookings cancelled within 60 minutes of being
--                         created, in the last 24 hours            -> high
--   HIGH_BOOKING_VOLUME   10+ bookings created by one user in the
--                         last 24 hours (20+ = high)               -> medium
--   SLOT_HOARDING         the SAME time slot booked in 3+ different
--                         venues by one user, in the last 24 hours -> high
--
-- security_scan() returns how many NEW flags it wrote. Running it again
-- the same day writes nothing new (dedup_key is unique per rule, user, day).
-- Reads bookings + twin_events + the twin state; changes only xai_logs.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS xai_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code    VARCHAR(30) NOT NULL
        CHECK (rule_code IN ('RAPID_BOOK_CANCEL', 'HIGH_BOOKING_VOLUME', 'SLOT_HOARDING')),
    severity     VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    explanation  TEXT  NOT NULL,
    evidence     JSONB NOT NULL DEFAULT '{}'::jsonb,
    twin_context JSONB NOT NULL DEFAULT '[]'::jsonb,
    dedup_key    TEXT  NOT NULL UNIQUE,
    status       VARCHAR(12) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'reviewed', 'dismissed')),
    reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xai_logs_status_time ON xai_logs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xai_logs_user ON xai_logs (user_id);

CREATE OR REPLACE FUNCTION security_scan(
    p_window         INTERVAL DEFAULT '24 hours',
    p_cancel_count   INT      DEFAULT 3,
    p_cancel_minutes INT      DEFAULT 60,
    p_volume         INT      DEFAULT 10,
    p_hoard_venues   INT      DEFAULT 3
) RETURNS INT AS $$
DECLARE
    n1 INT := 0;
    n2 INT := 0;
    n3 INT := 0;
    hours TEXT := round(extract(epoch FROM p_window) / 3600)::text;
BEGIN
    -- Rule 1: book then cancel quickly, repeatedly -----------------------------
    WITH hits AS (
        SELECT b.user_id, b.id AS booking_id, b.venue_id
        FROM bookings b
        JOIN twin_events e
          ON e.source_id = b.id
         AND e.event_type = 'booking_status_changed'
         AND e.new_state ->> 'status' IN ('cancelled', 'pending_cancellation')
        WHERE b.created_at >= now() - p_window
          AND e.created_at - b.created_at <= make_interval(mins => p_cancel_minutes)
    ), grp AS (
        SELECT user_id,
               count(DISTINCT booking_id)    AS n,
               array_agg(DISTINCT venue_id)  AS venues,
               jsonb_agg(DISTINCT booking_id) AS booking_ids
        FROM hits
        GROUP BY user_id
        HAVING count(DISTINCT booking_id) >= p_cancel_count
    )
    INSERT INTO xai_logs (rule_code, severity, user_id, explanation, evidence, twin_context, dedup_key)
    SELECT 'RAPID_BOOK_CANCEL', 'high', g.user_id,
           format('This user created %s bookings and cancelled each one within %s minutes, in the last %s hours (rule: %s or more). Quick book-then-cancel cycles can hold slots away from other users without any real use.',
                  g.n, p_cancel_minutes, hours, p_cancel_count),
           jsonb_build_object('cancelled_quickly', g.n, 'booking_ids', g.booking_ids,
                              'threshold', p_cancel_count, 'within_minutes', p_cancel_minutes),
           (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'venue', v.name,
                       'availability', t.availability_state,
                       'operational', t.operational_state)), '[]'::jsonb)
              FROM venues v JOIN venue_twin_state t ON t.venue_id = v.id
             WHERE v.id = ANY (g.venues)),
           'RAPID_BOOK_CANCEL|' || g.user_id || '|' || current_date
    FROM grp g
    ON CONFLICT (dedup_key) DO NOTHING;
    GET DIAGNOSTICS n1 = ROW_COUNT;

    -- Rule 2: unusually many bookings ----------------------------------------------
    WITH grp AS (
        SELECT user_id,
               count(*)                    AS n,
               count(DISTINCT venue_id)    AS venue_count,
               array_agg(DISTINCT venue_id) AS venues
        FROM bookings
        WHERE created_at >= now() - p_window
        GROUP BY user_id
        HAVING count(*) >= p_volume
    )
    INSERT INTO xai_logs (rule_code, severity, user_id, explanation, evidence, twin_context, dedup_key)
    SELECT 'HIGH_BOOKING_VOLUME',
           CASE WHEN g.n >= 2 * p_volume THEN 'high' ELSE 'medium' END,
           g.user_id,
           format('This user created %s bookings across %s venues in the last %s hours (rule: %s or more). This is far above normal use and may be an attempt to reserve a large share of the campus venues.',
                  g.n, g.venue_count, hours, p_volume),
           jsonb_build_object('bookings_created', g.n, 'venues_used', g.venue_count, 'threshold', p_volume),
           (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'venue', v.name,
                       'availability', t.availability_state,
                       'operational', t.operational_state)), '[]'::jsonb)
              FROM venues v JOIN venue_twin_state t ON t.venue_id = v.id
             WHERE v.id = ANY (g.venues)),
           'HIGH_BOOKING_VOLUME|' || g.user_id || '|' || current_date
    FROM grp g
    ON CONFLICT (dedup_key) DO NOTHING;
    GET DIAGNOSTICS n2 = ROW_COUNT;

    -- Rule 3: the same slot booked in many different venues ----------------------------
    WITH grp AS (
        SELECT user_id,
               booking_range,
               count(DISTINCT venue_id)     AS venue_count,
               array_agg(DISTINCT venue_id) AS venues
        FROM bookings
        WHERE created_at >= now() - p_window
          AND status <> 'rejected'
        GROUP BY user_id, booking_range
        HAVING count(DISTINCT venue_id) >= p_hoard_venues
    )
    INSERT INTO xai_logs (rule_code, severity, user_id, explanation, evidence, twin_context, dedup_key)
    SELECT 'SLOT_HOARDING', 'high', g.user_id,
           format('This user booked the same time slot (%s) in %s different venues in the last %s hours (rule: %s or more). One group cannot use several venues at once, so this looks like slot hoarding.',
                  g.booking_range::text, g.venue_count, hours, p_hoard_venues),
           jsonb_build_object('slot', g.booking_range::text, 'venues_booked', g.venue_count,
                              'threshold', p_hoard_venues),
           (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'venue', v.name,
                       'availability', t.availability_state,
                       'operational', t.operational_state)), '[]'::jsonb)
              FROM venues v JOIN venue_twin_state t ON t.venue_id = v.id
             WHERE v.id = ANY (g.venues)),
           'SLOT_HOARDING|' || g.user_id || '|' || lower(g.booking_range)::text
    FROM grp g
    ON CONFLICT (dedup_key) DO NOTHING;
    GET DIAGNOSTICS n3 = ROW_COUNT;

    RETURN n1 + n2 + n3;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW v_xai_logs AS
SELECT l.id,
       l.created_at,
       l.rule_code,
       l.severity,
       l.status,
       l.user_id,
       u.name  AS user_name,
       u.email AS user_email,
       l.explanation,
       l.evidence,
       l.twin_context,
       l.reviewed_by,
       l.reviewed_at
FROM xai_logs l
LEFT JOIN users u ON u.id = l.user_id;

COMMIT;
