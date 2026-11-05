BEGIN;
SELECT pg_advisory_xact_lock(7071190);
DO $guard$
BEGIN
    IF current_database() !~ '^andrade_preview_restore_[a-z0-9_]+$' THEN
        RAISE EXCEPTION 'Use somente o banco isolado do Neon Preview';
    END IF;
END
$guard$;
CREATE SCHEMA IF NOT EXISTS reserve_control;
REVOKE ALL ON SCHEMA reserve_control FROM PUBLIC, anonymous, authenticated;
CREATE TABLE IF NOT EXISTS reserve_control.snapshot_state (
    id integer PRIMARY KEY CHECK (id=1),
    mode text NOT NULL CHECK (mode IN ('standby','active','review')),
    captured_at timestamptz,
    completed_at timestamptz,
    fingerprint text,
    table_count integer,
    row_count bigint
);
ALTER TABLE reserve_control.snapshot_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reserve_control.snapshot_state FROM PUBLIC, anonymous, authenticated;
INSERT INTO reserve_control.snapshot_state (id,mode) VALUES (1,'standby') ON CONFLICT DO NOTHING;
COMMIT;
