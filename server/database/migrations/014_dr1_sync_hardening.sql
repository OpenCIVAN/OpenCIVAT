-- 014_dr1_sync_hardening.sql
-- DR1: Dual-Channel Real-Time Synchronization Hardening
--
-- Adds per-row revision counters to persistent collaborative entities
-- and an append-only sync_events log for delta hydration.
--
-- Apply with:
--   ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
--
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards.

-- ============================================================================
-- REVISION COLUMNS
-- ============================================================================

ALTER TABLE view_configurations
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

ALTER TABLE viewgroups
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

ALTER TABLE annotations
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

ALTER TABLE workspace_annotations
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

-- ============================================================================
-- SYNC EVENT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_events (
  id               BIGSERIAL    PRIMARY KEY,
  workspace_id     UUID         REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type      VARCHAR(50)  NOT NULL,   -- view_configuration | viewgroup | annotation | workspace_annotation
  entity_id        UUID         NOT NULL,
  operation        VARCHAR(30)  NOT NULL,   -- create | update | delete | restore | conflict_resolved
  base_revision    BIGINT,                  -- NULL for creates; the revision the client based its edit on
  next_revision    BIGINT       NOT NULL,   -- the new revision after this event
  patch            JSONB,                   -- optional JSON patch for large objects (future use)
  snapshot         JSONB,                   -- compact snapshot of the entity after mutation
  actor_user_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
  correlation_id   UUID,                    -- x-correlation-id from request header
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary delta query: all events for a workspace after a watermark
CREATE INDEX IF NOT EXISTS idx_sync_events_workspace
  ON sync_events (workspace_id, id);

-- Per-entity history lookup
CREATE INDEX IF NOT EXISTS idx_sync_events_entity
  ON sync_events (entity_type, entity_id, id);

-- Time-based pruning / compaction queries
CREATE INDEX IF NOT EXISTS idx_sync_events_created_at
  ON sync_events (created_at);
