// server/src/routes/sync.js
// Provides sync status and delta hydration for client reconciliation

const express = require("express");
const router = express.Router();
const { createLogger } = require("../utils/logger");
const { getUser } = require("../middleware/auth");
const { getMinimumAvailableEventId } = require("../services/syncEventPruning");

const log = createLogger("sync");

// Maximum events returned per delta request (prevents oversized responses)
const DELTA_PAGE_LIMIT = 500;

/**
 * GET /api/sync/status
 * Returns server state information for client reconciliation.
 * Includes minimumAvailableEventId so clients can detect whether their
 * saved watermark has been pruned before issuing a delta request.
 */
router.get("/status", async (req, res) => {
  try {
    const { pool } = req.app.locals;

    const instanceResult = await pool.query(`
      SELECT instance_id, created_at, schema_version
      FROM server_instance
      LIMIT 1
    `);

    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM datasets) as dataset_count,
        (SELECT COUNT(*) FROM view_configurations) as view_count
    `);

    const instance = instanceResult.rows[0];
    const stats = statsResult.rows[0];

    if (!instance) {
      log.error("server_instance table is empty");
      return res.status(500).json({ error: "Server instance not initialized" });
    }

    const minimumAvailableEventId = await getMinimumAvailableEventId(pool);

    res.json({
      serverInstanceId: instance.instance_id,
      serverCreatedAt: instance.created_at,
      schemaVersion: instance.schema_version,
      datasetCount: parseInt(stats.dataset_count, 10),
      viewCount: parseInt(stats.view_count, 10),
      minimumAvailableEventId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Failed to get sync status:", error);
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

/**
 * GET /api/sync/delta
 * Delta hydration endpoint for efficient reconnect / startup hydration.
 *
 * Query params:
 *   workspaceId  UUID   – workspace to fetch events for (required)
 *   since        bigint – last known sync_events.id (watermark). 0 or absent → full resync.
 *
 * Response:
 *   {
 *     workspaceId,
 *     fromWatermark,            // the `since` value supplied
 *     toWatermark,              // id of the last event returned
 *     events,                   // ordered sync_events rows
 *     minimumAvailableEventId,  // oldest available event id (for client awareness)
 *     requiresFullResync,       // true → client must fall back to full REST hydration
 *     reason,                   // "no_watermark" | "WATERMARK_EXPIRED" | "watermark_compacted"
 *   }
 *
 * requiresFullResync reasons:
 *   no_watermark        — client has no saved watermark; needs initial full hydration
 *   WATERMARK_EXPIRED   — client's watermark predates the oldest retained event (pruned)
 *   watermark_compacted — gap detected; events between sinceId and oldest event are missing
 *
 * Auth: same authenticate middleware applied at router mount point.
 * Workspace isolation: caller must be a workspace member or project member.
 */
router.get("/delta", async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const user = getUser(req);
    const { workspaceId, since } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    // Verify workspace membership
    const memberCheck = await pool.query(
      `SELECT 1 FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2
       LIMIT 1`,
      [workspaceId, user.id]
    );

    if (memberCheck.rows.length === 0) {
      // Also allow project members who own the workspace
      const projectCheck = await pool.query(
        `SELECT 1 FROM project_members pm
         JOIN workspaces w ON w.project_id = pm.project_id
         WHERE w.id = $1 AND pm.user_id = $2
         LIMIT 1`,
        [workspaceId, user.id]
      );
      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }

    const sinceId = since ? parseInt(since, 10) : 0;
    const minimumAvailableEventId = await getMinimumAvailableEventId(pool);

    // No watermark supplied → client needs full hydration first
    if (!since || sinceId <= 0) {
      return res.json({
        workspaceId,
        fromWatermark: 0,
        toWatermark: 0,
        events: [],
        minimumAvailableEventId,
        requiresFullResync: true,
        reason: "no_watermark",
      });
    }

    // Expired watermark: client's since is older than the oldest retained event
    if (minimumAvailableEventId != null && sinceId < minimumAvailableEventId - 1) {
      log.info(`Watermark ${sinceId} expired (minimum available: ${minimumAvailableEventId})`);
      return res.json({
        workspaceId,
        fromWatermark: sinceId,
        toWatermark: sinceId,
        events: [],
        minimumAvailableEventId,
        requiresFullResync: true,
        reason: "WATERMARK_EXPIRED",
      });
    }

    // Fetch events after the watermark, ordered by id
    const eventsResult = await pool.query(
      `SELECT * FROM sync_events
       WHERE workspace_id = $1 AND id > $2
       ORDER BY id ASC
       LIMIT $3`,
      [workspaceId, sinceId, DELTA_PAGE_LIMIT]
    );

    const events = eventsResult.rows;

    // No new events since the client's watermark
    if (events.length === 0) {
      return res.json({
        workspaceId,
        fromWatermark: sinceId,
        toWatermark: sinceId,
        events: [],
        minimumAvailableEventId,
        requiresFullResync: false,
      });
    }

    // Gap detection: if the oldest event in the table is newer than sinceId + 1,
    // events between sinceId and that point were removed (compacted or pruned).
    const oldestResult = await pool.query(
      `SELECT id FROM sync_events WHERE workspace_id = $1 ORDER BY id ASC LIMIT 1`,
      [workspaceId]
    );
    const oldestId = oldestResult.rows[0]?.id ? parseInt(oldestResult.rows[0].id, 10) : 0;

    if (oldestId > sinceId + 1) {
      return res.json({
        workspaceId,
        fromWatermark: sinceId,
        toWatermark: sinceId,
        events: [],
        minimumAvailableEventId,
        requiresFullResync: true,
        reason: "watermark_compacted",
      });
    }

    const toWatermark = parseInt(events[events.length - 1].id, 10);

    // Transform events based on requested mode.
    // mode=snapshot (default): return all events with full snapshot + payload_type label
    // mode=patch|auto:          strip snapshot from events that have a patch; tombstone for deletes
    const mode = req.query.mode || 'snapshot';
    const transformedEvents = events.map((event) => {
      const payloadType =
        event.operation === 'delete' ? 'tombstone' :
        (mode !== 'snapshot' && event.patch != null) ? 'patch' : 'snapshot';

      if (payloadType === 'tombstone') {
        // Minimal payload for delete/restore events
        return {
          id: event.id,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          operation: event.operation,
          next_revision: event.next_revision,
          actor_user_id: event.actor_user_id,
          created_at: event.created_at,
          payload_type: 'tombstone',
        };
      }

      if (payloadType === 'patch') {
        // Omit snapshot to reduce payload size
        const { snapshot: _omit, ...rest } = event;
        return { ...rest, payload_type: 'patch' };
      }

      // snapshot mode (default) — include everything
      return { ...event, payload_type: 'snapshot' };
    });

    return res.json({
      workspaceId,
      fromWatermark: sinceId,
      toWatermark,
      events: transformedEvents,
      minimumAvailableEventId,
      requiresFullResync: false,
      mode,
    });
  } catch (error) {
    log.error("Failed to get sync delta:", error);
    res.status(500).json({ error: "Failed to get sync delta" });
  }
});

module.exports = router;
