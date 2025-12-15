// server/src/routes/views.js
// View configuration management for v2.0 server-authority architecture
// Views are persistent snapshots of visualization state

const express = require("express");
const router = express.Router();
const { getUser } = require("../middleware/auth");
const thumbnailService = require("../services/thumbnailService");
const { createLogger } = require("../utils/logger");

const log = createLogger("views");

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
             d.filename as file_name
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
      views: result.rows,
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

    res.json({ view: result.rows[0] });
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

    // Verify file exists
    const fileCheck = await pool.query(
      "SELECT id, current_version_id FROM datasets WHERE id = $1 AND status = 'active'",
      [fileId]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileVersionId = fileCheck.rows[0].current_version_id;

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
        fileId,
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
    // This runs async and doesn't block the response
    thumbnailService
      .queueThumbnailJob({
        fileId,
        pool, // IMPORTANT: Pass pool so handler_type can be looked up
        viewId: view.id,
        projectId: projectId || null,
        priority: 5,
      })
      .catch((err) => {
        log.warn(
          `Failed to queue thumbnail job for view ${view.id}: ${err.message}`
        );
      });

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
 * Update a view configuration
 */
router.put("/:id", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);
    const updates = req.body;

    // Get existing view
    const existing = await pool.query(
      "SELECT * FROM view_configurations WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "View not found" });
    }

    const beforeState = existing.rows[0];

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
      // Map camelCase to snake_case
      const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase();
      const bodyField = field;

      if (updates[bodyField] !== undefined) {
        let value = updates[bodyField];
        // JSON fields need stringification
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

    // Add tracking fields
    setClauses.push(`updated_at = NOW()`);

    // Add WHERE clause
    values.push(id);

    const result = await pool.query(
      `
      UPDATE view_configurations
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );

    const view = result.rows[0];

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

    // Broadcast update to all clients in the project
    // Even private views need sync for the owner across devices
    if (wsManager && view.project_id) {
      wsManager.viewUpdated(view.project_id, view);
    } else if (wsManager && view.dataset_id) {
      // Fallback: find project from file access table
      const projects = await pool.query(
        "SELECT project_id FROM file_project_access WHERE file_id = $1",
        [view.dataset_id]
      );

      for (const row of projects.rows) {
        wsManager.viewUpdated(row.project_id, view);
      }
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

module.exports = router;
