-- 016_dr6_hardening.sql
-- DR6.5: Breakout merge consent, workspace archive audit trail.
--
-- Run:
--   psql $DATABASE_URL < server/database/migrations/016_dr6_hardening.sql

BEGIN;

-- ============================================================================
-- WORKSPACE ARCHIVE AUDIT
-- ============================================================================

-- Track which user triggered the soft-archive (NULL = system/auto cleanup)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Human-readable reason for archival (e.g. "expired", "manual", "admin cleanup")
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(255);

-- ============================================================================
-- BREAKOUT MERGE CONSENT
-- ============================================================================
-- Users explicitly grant permission for their private breakout-created entities
-- to be promoted to project visibility during a breakout workspace merge.
-- Each user must self-grant; consent cannot be granted on behalf of another user.

CREATE TABLE IF NOT EXISTS breakout_merge_consents (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at     TIMESTAMPTZ,            -- NULL = active consent; non-NULL = revoked
  entity_types   TEXT[],                  -- NULL = all supported entity types
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_consents_workspace
  ON breakout_merge_consents (workspace_id);

CREATE INDEX IF NOT EXISTS idx_merge_consents_user
  ON breakout_merge_consents (user_id);

COMMIT;
