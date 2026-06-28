// server/src/routes/views.js
// View configuration management for v2.0 server-authority architecture
// Views are persistent snapshots of visualization state

const express = require("express");
const router = express.Router();
const { getUser } = require("../middleware/auth");
const thumbnailService = require("../services/thumbnailService");
const { createLogger } = require("../utils/logger");
const { writeSyncEvent, buildSnapshot } = require("../services/syncEventService");
const { diffObjects } = require("../utils/jsonDiff");

const log = createLogger("views");

// DR2: Derive datasetRefs from the datasets JOIN columns present on a view row.
// Built-in datasets have dataset_id = NULL on the server → returns [].
function buildDatasetRefs(row) {
  if (!row.dataset_id) return [];
  return [{
    datasetId:   row.dataset_id,
    contentHash: row.dataset_hash       || null,
    format:      row.dataset_file_type  || null,
    sizeBytes:   row.dataset_file_size  ? Number(row.dataset_file_size) : null,
    role:        'primary',
  }];
}

// ============================================================================
// VIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/views
 * List views with filters
 */
router.get("/", async (req, res, next) => {
  try {
    const user = getUser(req);
    const { pool } = req.app.locals;
    const {
      fileId,
      projectId,
      branchId,
      visibility,
      shared,
      status = "active",
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT v.*,
             u.email as owner_email,
             d.filename as file_name,
             d.hash as dataset_hash,
             d.file_type as dataset_file_type,
             d.file_size as dataset_file_size
      FROM view_configurations v
      LEFT JOIN users u ON v.owner_user_id::uuid = u.id
      LEFT JOIN datasets d ON v.dataset_id = d.id
      WHERE v.status = $1
    `;
    const values = [status];
    let paramIndex = 2;

    // Filter by file
    if (fileId) {
      query += ` AND v.dataset_id = $${paramIndex++}`;
      values.push(fileId);
    }

    // Filter by branch
    if (branchId) {
      query += ` AND v.branch_id = $${paramIndex++}`;
      values.push(branchId);
    }

    // Filter shared views
    if (shared === "true") {
      query += ` AND v.is_shared = true`;
    }

    // Visibility filter
    if (visibility) {
      query += ` AND v.visibility = $${paramIndex++}`;
      values.push(visibility);
    } else {
      // Default: show user's views + public/project visible
      query += ` AND (
        v.owner_user_id = $${paramIndex++} OR
        v.visibility IN ('public', 'project')
      )`;
      values.push(user.id);
    }

    query += ` ORDER BY v.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json({
      views: result.rows.map(row => ({ ...row, datasetRefs: buildDatasetRefs(row) })),
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/views/:id
 * Get single view details
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT v.*,
             u.email as owner_email,
             d.filename as file_name,
             d.hash as dataset_hash,
             d.file_type as dataset_file_type,
             d.file_size as dataset_file_size,
             fv.version_number as file_version
      FROM view_configurations v
      LEFT JOIN users u ON v.owner_user_id::uuid = u.id
      LEFT JOIN datasets d ON v.dataset_id = d.id
      LEFT JOIN file_versions fv ON v.file_version_id = fv.id
      WHERE v.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];
    res.json({ view: { ...view, datasetRefs: buildDatasetRefs(view) } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views
 * Create a new view configuration
 */
router.post("/", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const user = getUser(req);
    const {
      fileId,
      projectId,
      branchId,
      name = "Untitled View",
      description,
      camera,
      filters,
      widgets,
      colorMaps,
      annotationsVisible = true,
      visibility = "private",
      isShared = false,
      forkedFrom,
    } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    // Built-in client-side datasets (id starts with "builtin-") are not stored
    // in the database — they are served as static files from public/vtp_files/.
    // Skip the DB existence check for them and store null as dataset_id so the
    // FK constraint is not violated. The client restores the builtin id from its
    // own state after receiving the server response.
    const isBuiltinDataset = fileId.startsWith("builtin-");
    let fileVersionId = null;

    if (!isBuiltinDataset) {
      // Verify file exists in database
      const fileCheck = await pool.query(
        "SELECT id, current_version_id FROM datasets WHERE id = $1 AND status = 'active'",
        [fileId]
      );

      if (fileCheck.rows.length === 0) {
        return res.status(404).json({ error: "File not found" });
      }

      fileVersionId = fileCheck.rows[0].current_version_id;
    }

    // Insert view
    const result = await pool.query(
      `
      INSERT INTO view_configurations (
        dataset_id, file_version_id, branch_id,
        name, description,
        camera, filters, widgets, color_maps,
        annotations_visible, visibility, is_shared,
        owner_user_id, saved_by_user, forked_from
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)
      RETURNING *
    `,
      [
        isBuiltinDataset ? null : fileId,
        fileVersionId,
        branchId || null,
        name,
        description || null,
        camera ? JSON.stringify(camera) : null,
        filters ? JSON.stringify(filters) : null,
        widgets ? JSON.stringify(widgets) : null,
        colorMaps ? JSON.stringify(colorMaps) : null,
        annotationsVisible,
        visibility,
        isShared,
        user.id,
        forkedFrom ? JSON.stringify(forkedFrom) : null,
      ]
    );

    const view = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:create",
        projectId,
        entityType: "view",
        entityId: view.id,
        after: { name, visibility, fileId },
      });
    }

    // Broadcast view creation to all clients in project
    // (for multi-client sync, not just shared views)
    if (wsManager) {
      if (projectId) {
        wsManager.viewCreated(projectId, view);
      } else {
        // Find project from file access
        const projects = await pool.query(
          "SELECT project_id FROM file_project_access WHERE file_id = $1",
          [fileId]
        );
        for (const row of projects.rows) {
          wsManager.viewCreated(row.project_id, view);
        }
      }
    }

    // Queue server-side thumbnail generation for the new view
    // IMPORTANT: Delay initial thumbnail generation by 5 seconds to allow
    // the client time to set up initial camera state. Without this delay,
    // the thumbnail is captured before the user has panned/zoomed, resulting
    // in the default view instead of their actual view state.
    //
    // Using queueThumbnailJobDebounced ensures that if the user updates
    // the view's camera before this runs, the debounce mechanism will
    // prevent duplicate jobs.
    setTimeout(() => {
      thumbnailService
        .queueThumbnailJobDebounced({
          fileId,
          pool, // IMPORTANT: Pass pool so handler_type can be looked up
          viewId: view.id,
          projectId: projectId || null,
          priority: 4, // Slightly lower priority than immediate requests
        })
        .then((job) => {
          if (job) {
            log.debug(`Initial thumbnail queued for view ${view.id}`);
          } else {
            log.debug(
              `Initial thumbnail for view ${view.id} debounced (camera update already queued)`
            );
          }
        })
        .catch((err) => {
          log.warn(
            `Failed to queue thumbnail job for view ${view.id}: ${err.message}`
          );
        });
    }, 5000); // 5 second delay

    res.status(201).json({
      success: true,
      view,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/views/:id
 * Update a view configuration.
 *
 * Supports optimistic concurrency control (OCC) via the optional
 * `base_revision` body field.  When provided the server rejects stale
 * writes with 409 Conflict and returns the current server state so the
 * client can resolve.  When omitted the write proceeds as last-write-wins
 * (backward-compatible behaviour).
 *
 * Set `force_overwrite: true` to skip the revision check after an explicit
 * conflict-resolution decision by the user.
 */
router.put("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const actorUserId = user?.id || req.headers["x-user-id"] || null;
    const { base_revision, force_overwrite, ...updates } = req.body;
    const correlationId = req.headers["x-correlation-id"] || null;

    // Build dynamic update query
    const allowedFields = [
      "name",
      "description",
      "camera",
      "filters",
      "widgets",
      "color_maps",
      "cursor_config",
      "annotation_display",
      "annotations_visible",
      "visibility",
      "is_shared",
      "status",
      "active_instance_count",
      "links",
      "broadcast",
      "following",
      "snapshots",
      "applied_presets",
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase();
      const bodyField = field;

      if (updates[bodyField] !== undefined) {
        let value = updates[bodyField];
        const jsonFields = [
          "camera",
          "filters",
          "widgets",
          "colorMaps",
          "color_maps",
          "cursor_config",
          "annotation_display",
          "links",
          "broadcast",
          "following",
          "snapshots",
          "applied_presets",
        ];
        if (jsonFields.includes(bodyField) && typeof value === "object") {
          value = JSON.stringify(value);
        }
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Always increment revision and track who updated
    setClauses.push(`revision = revision + 1`);
    setClauses.push(`updated_at = NOW()`);

    // OCC: check base_revision unless force_overwrite is set
    const hasRevisionCheck = base_revision != null && !force_overwrite;

    // Build WHERE clause
    let whereClause = `id = $${paramIndex++}`;
    values.push(id);
    if (hasRevisionCheck) {
      whereClause += ` AND revision = $${paramIndex++}`;
      values.push(Number(base_revision));
    }

    // Run update inside a transaction so the sync_event write is atomic
    const client = await pool.connect();
    let view;
    let syncEvent;
    let oldStateForPatch = null;

    try {
      await client.query("BEGIN");

      // Fetch old state for patch computation.
      // OCC writes: guaranteed correct base (revision-locked by WHERE clause).
      // LWW writes: best-effort — fetched within the same transaction but without
      //   revision locking. If a concurrent LWW write intervenes between SELECT and
      //   UPDATE, the patch may reflect the wrong base; clients fall back to snapshot.
      const oldResult = await client.query(
        "SELECT * FROM view_configurations WHERE id = $1",
        [id]
      );
      oldStateForPatch = oldResult.rows[0] || null;

      const result = await client.query(
        `UPDATE view_configurations SET ${setClauses.join(", ")} WHERE ${whereClause} RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        client.release();

        if (hasRevisionCheck) {
          // Conflict: fetch current state for the client
          const current = await pool.query(
            "SELECT * FROM view_configurations WHERE id = $1",
            [id]
          );
          if (current.rows.length === 0) {
            return res.status(404).json({ error: "View not found" });
          }
          const cur = current.rows[0];
          return res.status(409).json({
            error: "conflict",
            entityType: "view_configuration",
            entityId: id,
            clientBaseRevision: Number(base_revision),
            serverRevision: Number(cur.revision),
            serverObject: cur,
            updatedBy: cur.updated_by || null,
            updatedAt: cur.updated_at,
          });
        }

        return res.status(404).json({ error: "View not found" });
      }

      view = result.rows[0];

      // Determine workspace_id for sync_events (look up via project)
      let workspaceId = null;
      try {
        const ws = await client.query(
          "SELECT id FROM workspaces WHERE project_id = $1 LIMIT 1",
          [view.project_id]
        );
        workspaceId = ws.rows[0]?.id || null;
      } catch (_) { /* non-fatal */ }

      // Compute patch when we have both old and new state (OCC path only)
      const snapshotData = buildSnapshot(view);
      let patchData = null;
      if (oldStateForPatch) {
        const ops = diffObjects(buildSnapshot(oldStateForPatch), snapshotData);
        patchData = ops.length > 0 ? ops : null;
      }

      const operation = force_overwrite ? "conflict_resolved" : "update";
      syncEvent = await writeSyncEvent(client, {
        workspaceId,
        entityType: "view_configuration",
        entityId: id,
        operation,
        baseRevision: base_revision != null ? Number(base_revision) : null,
        nextRevision: Number(view.revision),
        snapshot: snapshotData,
        patch: patchData,
        actorUserId,
        correlationId,
      });

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      client.release();
      throw err;
    }

    client.release();

    const beforeState = { id };

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:update",
        entityType: "view",
        entityId: id,
        before: { name: beforeState.name },
        after: { name: view.name },
      });
    }

    // Broadcast update to all clients in the project (enriched payload)
    if (wsManager && view.project_id) {
      wsManager.viewUpdated(view.project_id, view, syncEvent?.id, actorUserId);
    } else if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );
      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, view, syncEvent?.id, actorUserId);
      }
    }

    // Queue thumbnail regeneration if visual state changed
    // These fields affect how the visualization looks in the thumbnail
    const visualFields = [
      "camera",
      "filters",
      "widgets",
      "colorMaps",
      "color_maps",
    ];
    const visualStateChanged = visualFields.some(
      (field) => updates[field] !== undefined
    );

    if (visualStateChanged && view.dataset_id) {
      // Use debounced queuing to avoid excessive regeneration during rapid edits
      thumbnailService
        .queueThumbnailJobDebounced({
          fileId: view.dataset_id,
          pool,
          viewId: id,
          priority: 3, // Lower priority than user-initiated requests
        })
        .then((job) => {
          if (job) {
            log.debug(
              `Queued thumbnail regeneration for view ${id} after state change`
            );
          } else {
            log.debug(`Thumbnail regeneration for view ${id} debounced`);
          }
        })
        .catch((err) => {
          log.warn(
            `Failed to queue thumbnail regeneration for view ${id}: ${err.message}`
          );
        });
    }

    res.json({
      success: true,
      view,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/views/:id
 * Delete a view (soft delete)
 */
router.delete("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get view info
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Soft delete
    await pool.query(
      "UPDATE view_configurations SET status = 'archived', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:delete",
        entityType: "view",
        entityId: id,
        before: { name: view.name, status: view.status },
        after: { status: "archived" },
      });
    }

    // Broadcast deletion
    if (view.is_shared && wsManager) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewDeleted(row.project_id, id);
      }
    }

    res.json({ success: true, message: "View deleted" });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/duplicate
 * Create a copy of a view
 */
router.post("/:id/duplicate", async (req, res, next) => {
  const { pool } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const { name } = req.body;

    // Get original view
    const original = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const source = original.rows[0];

    // Create duplicate
    const result = await pool.query(
      `
      INSERT INTO view_configurations (
        dataset_id, file_version_id, branch_id,
        name, description,
        camera, filters, widgets, color_maps,
        annotations_visible, visibility, is_shared,
        owner_user_id, saved_by_user
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'private', false, $11, true)
      RETURNING *
    `,
      [
        source.dataset_id,
        source.file_version_id,
        source.branch_id,
        name || `${source.name} (Copy)`,
        source.description,
        source.camera,
        source.filters,
        source.widgets,
        source.color_maps,
        source.annotations_visible,
        user.id,
      ]
    );

    res.status(201).json({
      success: true,
      view: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/share
 * Share a view with project or make public
 */
router.post("/:id/share", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const { visibility = "project", projectId } = req.body;

    // Update view
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET visibility = $1, is_shared = true, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      [visibility, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:share",
        projectId,
        entityType: "view",
        entityId: id,
        details: { visibility },
      });
    }

    // Broadcast that view was shared
    if (projectId && wsManager) {
      wsManager.viewCreated(projectId, view); // Appears as "new" to other users
    }

    res.json({
      success: true,
      view,
      message: `View shared with visibility: ${visibility}`,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GRANULAR SHARING ENDPOINTS
// ============================================================================

/**
 * GET /api/views/:id/shares
 * Get list of users this view is shared with
 */
router.get("/:id/shares", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const user = getUser(req);

    // Get view with sharing info
    const result = await pool.query(
      `
      SELECT v.id, v.name, v.owner_user_id, v.shared_with
      FROM view_configurations v
      WHERE v.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];

    // Check permission (owner or has share access)
    const sharedWith = view.shared_with || [];
    const hasAccess =
      view.owner_user_id === user.id ||
      sharedWith.some((share) => share.userId === user.id);

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "You don't have access to this view" });
    }

    res.json({
      shares: sharedWith,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/shares
 * Add or update shares for a view
 */
router.post("/:id/shares", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const { added = [], updated = [], removed = [] } = req.body;

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Check permission (owner only for now)
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can modify sharing settings" });
    }

    // Get current shares
    let sharedWith = view.shared_with || [];

    // Process removals
    for (const userId of removed) {
      sharedWith = sharedWith.filter((share) => share.userId !== userId);
    }

    // Process additions
    for (const newShare of added) {
      // Remove if already exists (will be re-added with new settings)
      sharedWith = sharedWith.filter(
        (share) => share.userId !== newShare.userId
      );
      // Add new share
      sharedWith.push({
        userId: newShare.userId,
        permission: newShare.permission || "viewer",
        addedAt: new Date().toISOString(),
        addedBy: user.id,
      });
    }

    // Process updates
    for (const updatedShare of updated) {
      const index = sharedWith.findIndex(
        (share) => share.userId === updatedShare.userId
      );
      if (index !== -1) {
        sharedWith[index] = {
          ...sharedWith[index],
          permission: updatedShare.permission || sharedWith[index].permission,
        };
      }
    }

    // Update database
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET shared_with = $1, is_shared = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
      [JSON.stringify(sharedWith), sharedWith.length > 0, id]
    );

    const updatedView = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:update_shares",
        entityType: "view",
        entityId: id,
        details: {
          added: added.length,
          updated: updated.length,
          removed: removed.length,
        },
      });
    }

    // Broadcast update to all clients in the project
    if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, updatedView);
      }
    }

    res.json({
      success: true,
      shares: sharedWith,
      view: updatedView,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/views/:id/shares/:userId
 * Remove a specific user's access to a view
 */
router.delete("/:id/shares/:userId", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id, userId } = req.params;
    const user = getUser(req);

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Check permission (owner only)
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can modify sharing settings" });
    }

    // Remove user from shared_with
    let sharedWith = view.shared_with || [];
    sharedWith = sharedWith.filter((share) => share.userId !== userId);

    // Update database
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET shared_with = $1, is_shared = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
      [JSON.stringify(sharedWith), sharedWith.length > 0, id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:remove_share",
        entityType: "view",
        entityId: id,
        details: { removedUserId: userId },
      });
    }

    // Broadcast update
    if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, result.rows[0]);
      }
    }

    res.json({
      success: true,
      message: "Share removed",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/stop-sharing
 * Remove all shares and make view private
 */
router.post("/:id/stop-sharing", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = existing.rows[0];

    // Check permission (owner only)
    if (view.owner_user_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can stop sharing" });
    }

    // Clear all shares and set to private
    const result = await pool.query(
      `
      UPDATE view_configurations
      SET shared_with = '[]'::jsonb,
          is_shared = false,
          visibility = 'private',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
      [id]
    );

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:stop_sharing",
        entityType: "view",
        entityId: id,
      });
    }

    // Broadcast update
    if (wsManager && view.dataset_id) {
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, result.rows[0]);
      }
    }

    res.json({
      success: true,
      message: "Sharing stopped, view is now private",
      view: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/views/:id/share-link
 * Generate a shareable link for the view
 */
router.post("/:id/share-link", async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = getUser(req);
    const { pool } = req.app.locals;

    // Get view
    const result = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const view = result.rows[0];

    // Check permission (owner or has can-share permission)
    const sharedWith = view.shared_with || [];
    const userShare = sharedWith.find((share) => share.userId === user.id);
    const canShare =
      view.owner_user_id === user.id ||
      (userShare && userShare.permission === "can-share");

    if (!canShare) {
      return res
        .status(403)
        .json({ error: "You don't have permission to share this view" });
    }

    // Generate shareable link
    const baseUrl =
      req.headers.origin || `${req.protocol}://${req.get("host")}`;
    const shareLink = `${baseUrl}/view/${id}`;

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "view:generate_share_link",
        entityType: "view",
        entityId: id,
      });
    }

    res.json({
      success: true,
      shareLink,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
