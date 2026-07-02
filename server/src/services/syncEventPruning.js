// server/src/services/syncEventPruning.js
// Safe sync_events retention/compaction service.
//
// CONFIGURATION (environment variables):
//   SYNC_EVENTS_PRUNING_ENABLED      = "true"  to activate   (default: disabled)
//   SYNC_EVENTS_RETENTION_DAYS       = integer  days to keep  (default: 90)
//   SYNC_EVENTS_PRUNING_BATCH_SIZE   = integer  rows per run  (default: 1000)
//   SYNC_EVENTS_PRUNING_SCHEDULE     = "daily"  auto-run      (default: manual only)
//
// SAFETY GUARANTEES:
//   - Pruning is always disabled in development unless explicitly enabled.
//   - The /api/sync/delta endpoint returns requiresFullResync: true with reason
//     WATERMARK_EXPIRED whenever a client's saved watermark predates the oldest
//     remaining event.  Clients automatically fall back to full REST hydration.
//   - Events are deleted in bounded batches to avoid long table locks.

const { createLogger } = require('../utils/logger');
const log = createLogger('syncPruning');

// ============================================================================
// CONFIG
// ============================================================================

const PRUNING_ENABLED = process.env.SYNC_EVENTS_PRUNING_ENABLED === 'true';
const RETENTION_DAYS = Math.max(1, parseInt(process.env.SYNC_EVENTS_RETENTION_DAYS || '90', 10));
const BATCH_SIZE = Math.max(1, parseInt(process.env.SYNC_EVENTS_PRUNING_BATCH_SIZE || '1000', 10));
const PRUNING_SCHEDULE = process.env.SYNC_EVENTS_PRUNING_SCHEDULE || null; // e.g. "daily"

const SCHEDULE_INTERVALS_MS = {
  daily: 24 * 60 * 60 * 1000,
  hourly: 60 * 60 * 1000,
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Delete expired sync_events rows in a single bounded batch.
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ deleted: number, skipped: boolean }>}
 */
async function pruneOldSyncEvents(pool) {
  if (!PRUNING_ENABLED) {
    log.debug('Sync event pruning is disabled (set SYNC_EVENTS_PRUNING_ENABLED=true to enable)');
    return { deleted: 0, skipped: true };
  }

  log.info(`Pruning sync_events older than ${RETENTION_DAYS} days (batch size: ${BATCH_SIZE})`);

  const result = await pool.query(
    `WITH expired AS (
       SELECT id FROM sync_events
       WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
       ORDER BY id ASC
       LIMIT $2
     )
     DELETE FROM sync_events WHERE id IN (SELECT id FROM expired)`,
    [String(RETENTION_DAYS), BATCH_SIZE]
  );

  const deleted = result.rowCount ?? 0;
  log.info(`Pruned ${deleted} expired sync_events`);
  return { deleted, skipped: false };
}

/**
 * Return the smallest sync_events.id currently in the table, or null if empty.
 * Used by the delta endpoint to detect expired watermarks before querying events.
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<number|null>}
 */
async function getMinimumAvailableEventId(pool) {
  try {
    const result = await pool.query(
      `SELECT MIN(id)::bigint AS min_id FROM sync_events`
    );
    const raw = result.rows[0]?.min_id;
    return raw != null ? Number(raw) : null;
  } catch (err) {
    log.warn('Failed to query minimum available event id:', err.message);
    return null;
  }
}

// ============================================================================
// SCHEDULED BACKGROUND JOB (optional)
// ============================================================================

let _pruningInterval = null;

/**
 * Start a background pruning interval if SYNC_EVENTS_PRUNING_SCHEDULE is set.
 * Runs are no-ops when PRUNING_ENABLED is false.
 * Safe to call multiple times — only the first call has effect.
 *
 * @param {import('pg').Pool} pool
 */
function startPruningSchedule(pool) {
  if (_pruningInterval) return; // already running

  const intervalMs = SYNC_EVENTS_SCHEDULE_MS();
  if (!intervalMs) {
    log.debug('No SYNC_EVENTS_PRUNING_SCHEDULE set — pruning runs manually only');
    return;
  }

  log.info(`Scheduling sync_events pruning: ${PRUNING_SCHEDULE} (every ${intervalMs}ms)`);

  _pruningInterval = setInterval(async () => {
    try {
      await pruneOldSyncEvents(pool);
    } catch (err) {
      log.error('Scheduled sync_events pruning failed:', err.message);
    }
  }, intervalMs);

  // Don't keep the process alive for pruning alone
  if (_pruningInterval.unref) _pruningInterval.unref();
}

/**
 * Stop the background pruning schedule (useful for graceful shutdown / tests).
 */
function stopPruningSchedule() {
  if (_pruningInterval) {
    clearInterval(_pruningInterval);
    _pruningInterval = null;
  }
}

function SYNC_EVENTS_SCHEDULE_MS() {
  if (!PRUNING_SCHEDULE) return null;
  return SCHEDULE_INTERVALS_MS[PRUNING_SCHEDULE] || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  pruneOldSyncEvents,
  getMinimumAvailableEventId,
  startPruningSchedule,
  stopPruningSchedule,
  // Config values (exported for testing and the manual script)
  PRUNING_ENABLED,
  RETENTION_DAYS,
  BATCH_SIZE,
};
