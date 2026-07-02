// server/src/services/workspaceCleanupService.js
// Soft-archives expired breakout workspaces on a configurable schedule.
//
// CONFIGURATION (environment variables):
//   WORKSPACE_CLEANUP_ENABLED       = "true"   to activate  (default: disabled)
//   WORKSPACE_CLEANUP_INTERVAL_MS   = integer  ms between runs  (default: 3600000 = 1h)
//   WORKSPACE_CLEANUP_BATCH_SIZE    = integer  workspaces per run  (default: 50)
//
// SAFETY GUARANTEES:
//   - Only targets type='breakout' workspaces with expires_at < NOW().
//   - Personal and project workspaces are never touched.
//   - Uses soft-delete (is_archived = true) — no data is permanently lost.
//   - Disabled by default; safe for local development.

'use strict';

const { createLogger } = require('../utils/logger');
const log = createLogger('workspaceCleanup');

// ============================================================================
// CONFIG
// ============================================================================

const CLEANUP_ENABLED = process.env.WORKSPACE_CLEANUP_ENABLED === 'true';
const INTERVAL_MS = Math.max(
  60_000, // minimum 1 minute
  parseInt(process.env.WORKSPACE_CLEANUP_INTERVAL_MS || String(60 * 60 * 1000), 10)
);
const BATCH_SIZE = Math.max(
  1,
  parseInt(process.env.WORKSPACE_CLEANUP_BATCH_SIZE || '50', 10)
);

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Archive expired breakout workspaces in a single bounded batch.
 * Only targets type='breakout' with expires_at < NOW() and is_archived=false.
 *
 * @param {import('pg').Pool} pool
 * @param {{ batchSize?: number }} [opts]
 * @returns {Promise<Array<{ id: string, name: string, project_id: string }>>}
 *          List of workspaces that were archived.
 */
async function archiveExpiredWorkspaces(pool, { batchSize = BATCH_SIZE } = {}) {
  const result = await pool.query(
    `UPDATE workspaces
     SET is_archived   = true,
         archived_at   = NOW(),
         archived_by   = NULL,          -- NULL = system/automated cleanup
         archive_reason = 'expired'
     WHERE id IN (
       SELECT id FROM workspaces
       WHERE type        = 'breakout'
         AND is_archived = false
         AND expires_at  IS NOT NULL
         AND expires_at  < NOW()
       LIMIT $1
     )
     RETURNING id, name, project_id`,
    [batchSize]
  );
  return result.rows;
}

/**
 * Start the background cleanup interval.
 * No-op when WORKSPACE_CLEANUP_ENABLED is not 'true'.
 *
 * @param {import('pg').Pool} pool
 * @returns {NodeJS.Timeout|null}  The interval handle (or null if disabled).
 */
function startCleanupSchedule(pool) {
  if (!CLEANUP_ENABLED) {
    log.debug('Workspace cleanup is disabled (set WORKSPACE_CLEANUP_ENABLED=true to enable)');
    return null;
  }

  log.info(
    `Workspace cleanup schedule started — interval: ${INTERVAL_MS}ms, batch: ${BATCH_SIZE}`
  );

  const handle = setInterval(async () => {
    try {
      const archived = await archiveExpiredWorkspaces(pool);
      if (archived.length > 0) {
        log.info(`Archived ${archived.length} expired breakout workspace(s)`, {
          ids: archived.map((w) => w.id),
        });
      } else {
        log.debug('No expired breakout workspaces found');
      }
    } catch (err) {
      log.error('Workspace cleanup run failed:', err.message);
    }
  }, INTERVAL_MS);

  // Unref so this interval doesn't prevent process exit during tests
  if (handle.unref) handle.unref();

  return handle;
}

module.exports = {
  archiveExpiredWorkspaces,
  startCleanupSchedule,
  CLEANUP_ENABLED,
  INTERVAL_MS,
  BATCH_SIZE,
};
