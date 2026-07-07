-- 017_view_visualization_state.sql
-- Persist shared per-view visualization state (opacity, representation,
-- transform, colormap, slice, window/level, pointSize/lineWidth) so the
-- InstanceToolsPanel's shared controls survive reload / late-joiner hydration,
-- not just live Y.js propagation. Also closes a pre-existing gap where the
-- DR2.5 time-series state (ViewConfiguration.time) was already being sent by
-- the client on every update but silently dropped by the server because
-- "time" was never in views.js's allowedFields list or in this table.
--
-- Run:
--   psql $DATABASE_URL < server/database/migrations/017_view_visualization_state.sql

BEGIN;

ALTER TABLE view_configurations
  ADD COLUMN IF NOT EXISTS visualization JSONB;

ALTER TABLE view_configurations
  ADD COLUMN IF NOT EXISTS time JSONB;

COMMIT;
