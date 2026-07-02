-- 015_dr6_dm_room_type.sql
-- DR6: Add 'dm' to rooms.room_type CHECK constraint.
-- The backend route already validates 'dm' as a valid room_type, but the
-- database-level constraint was missing it, causing INSERT failures.
--
-- Run:
--   psql $DATABASE_URL < server/database/migrations/015_dr6_dm_room_type.sql

BEGIN;

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_room_type_check;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_room_type_check
    CHECK (room_type IN ('main', 'breakout', 'dm'));

COMMIT;
