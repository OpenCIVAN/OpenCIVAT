-- 018_dedupe_personal_workspaces.sql
-- Dev/staging databases accumulated a runaway number of empty personal
-- workspaces (observed: 200,196 rows, all type='personal', name='My Workspace',
-- owner 00000000-0000-0000-0000-000000000002, no canvases). Root cause was a
-- client auto-create loop combined with a non-deterministic server
-- "get-or-create personal workspace" endpoint. On boot the client fetched ALL
-- workspaces and then issued one GET /canvases?workspace_id=... per workspace
-- (~200k requests), saturating the browser so nothing rendered.
--
-- This migration:
--   1. Deletes the orphaned duplicate personal workspaces — only those that are
--      genuinely empty (no active canvas, no canvases, and — defensively — not
--      referenced by workspace_members). Workspaces holding real content are
--      never touched.
--   2. Adds a partial UNIQUE index so at most one non-archived personal
--      workspace can exist per (owner_id, project_id), preventing recurrence.
--      NULL project_id is normalized with COALESCE so the constraint applies to
--      the "no project" case too.
--
-- Idempotent: the DELETE only matches empty duplicates, and the index uses
-- IF NOT EXISTS, so re-running is a no-op.
--
-- Run:
--   psql $DATABASE_URL < server/database/migrations/018_dedupe_personal_workspaces.sql

BEGIN;

-- 1. Remove orphaned duplicate personal workspaces.
--    NOT EXISTS (rather than NOT IN) so a NULL workspace_id in a referenced
--    table can never swallow the whole predicate and skip the delete.
DELETE FROM workspaces w
WHERE w.type = 'personal'
  AND w.name = 'My Workspace'
  AND w.active_canvas_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM canvases c WHERE c.workspace_id = w.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id
  );

-- 2. Prevent recurrence: one non-archived personal workspace per owner/project.
--    COALESCE normalizes the null-project case to a fixed sentinel UUID so those
--    rows still collide with each other under the unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_one_personal_per_owner_project
  ON workspaces (
    owner_id,
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE type = 'personal' AND is_archived = false;

COMMIT;
