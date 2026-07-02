// server/src/services/syncEventService.js
// Writes a row to the sync_events table within a caller-managed transaction.
//
// Usage: call writeSyncEvent(client, {...}) AFTER the resource UPDATE and BEFORE
// client.query('COMMIT'). Both writes land in the same transaction so they are
// atomic: either both succeed or both roll back.

const { createLogger } = require('../utils/logger');
const log = createLogger('syncEvent');

/**
 * Insert a sync_events row.
 *
 * @param {import('pg').PoolClient} client  An in-progress pg transaction client.
 * @param {object} opts
 * @param {string|null} opts.workspaceId    UUID of the owning workspace (nullable).
 * @param {string}      opts.entityType     e.g. 'view_configuration', 'annotation'.
 * @param {string}      opts.entityId       UUID of the mutated entity.
 * @param {string}      opts.operation      'create' | 'update' | 'delete' | 'restore' | 'conflict_resolved'.
 * @param {number|null} opts.baseRevision   The revision the client based its edit on (null for creates).
 * @param {number}      opts.nextRevision   The new revision after the mutation.
 * @param {object|null} opts.snapshot       A compact snapshot of the entity (JSONB). Omit large blobs.
 * @param {object|null} opts.patch          Optional JSON patch (future use).
 * @param {string|null} opts.actorUserId    UUID of the user making the change.
 * @param {string|null} opts.correlationId  x-correlation-id from request header.
 * @returns {Promise<{id: bigint}>}         The new sync_events row id (the watermark).
 */
async function writeSyncEvent(client, {
  workspaceId = null,
  entityType,
  entityId,
  operation,
  baseRevision = null,
  nextRevision,
  snapshot = null,
  patch = null,
  actorUserId = null,
  correlationId = null,
}) {
  if (!entityType || !entityId || !operation || nextRevision == null) {
    throw new Error('writeSyncEvent: entityType, entityId, operation, nextRevision are required');
  }

  const result = await client.query(
    `INSERT INTO sync_events
       (workspace_id, entity_type, entity_id, operation,
        base_revision, next_revision, patch, snapshot,
        actor_user_id, correlation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      workspaceId || null,
      entityType,
      entityId,
      operation,
      baseRevision != null ? Number(baseRevision) : null,
      Number(nextRevision),
      patch ? JSON.stringify(patch) : null,
      snapshot ? JSON.stringify(snapshot) : null,
      actorUserId || null,
      correlationId || null,
    ]
  );

  const id = result.rows[0].id;
  log.debug(`sync_event #${id}: ${operation} ${entityType}:${entityId} rev ${baseRevision}→${nextRevision}`);
  return { id };
}

/**
 * Build a compact snapshot suitable for JSONB storage in sync_events.
 * Strips large binary-ish fields that should not live in the change log.
 *
 * @param {object} row  A raw PostgreSQL row object.
 * @param {string[]} [omitFields]  Additional field names to drop.
 * @returns {object}
 */
function buildSnapshot(row, omitFields = []) {
  const HEAVY_FIELDS = ['document_state', 'update_data', 'snapshot_data'];
  const drop = new Set([...HEAVY_FIELDS, ...omitFields]);
  const snapshot = {};
  for (const [k, v] of Object.entries(row)) {
    if (!drop.has(k)) snapshot[k] = v;
  }
  return snapshot;
}

module.exports = { writeSyncEvent, buildSnapshot };
