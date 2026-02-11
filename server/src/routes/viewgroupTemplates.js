// server/src/routes/viewgroupTemplates.js
// API routes for ViewGroup templates (server-side persistence)
//
// Scopes:
// - personal: visible only to owner
// - project: visible to all project members
//
// Endpoints:
// GET    /api/projects/:projectId/viewgroup-templates
// GET    /api/workspaces/:workspaceId/viewgroup-templates
// POST   /api/projects/:projectId/viewgroup-templates
// POST   /api/workspaces/:workspaceId/viewgroup-templates
// PUT    /api/projects/:projectId/viewgroup-templates/:id
// PUT    /api/workspaces/:workspaceId/viewgroup-templates/:id
// DELETE /api/projects/:projectId/viewgroup-templates/:id
// DELETE /api/workspaces/:workspaceId/viewgroup-templates/:id

const express = require("express");
const router = express.Router({ mergeParams: true });
const { createLogger } = require("../utils/logger");
const { getUser, checkProjectAccess } = require("../middleware/auth");

const log = createLogger("viewgroup-templates");

async function resolveProjectId(pool, { projectId, workspaceId }) {
  if (projectId) return projectId;
  if (!workspaceId) return null;
  const result = await pool.query(
    "SELECT project_id FROM workspaces WHERE id = $1",
    [workspaceId]
  );
  return result.rows[0]?.project_id || null;
}

function normalizeTemplate(row, userId) {
  return {
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    layoutId: row.layout_id,
    color: row.color,
    viewSlots: row.view_slots,
    scope: row.scope,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOwn: row.owner_id === userId,
  };
}

// ============================================================================
// LIST TEMPLATES
// ============================================================================

router.get("/", async (req, res, next) => {
  try {
    const { projectId: rawProjectId, workspaceId } = req.params;
    const { scope = "all" } = req.query;
    const user = getUser(req);
    const { pool } = req.app.locals;

    const projectId = await resolveProjectId(pool, {
      projectId: rawProjectId,
      workspaceId,
    });
    if (!projectId) {
      return res.status(400).json({ error: "projectId or workspaceId required" });
    }

    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const queryParams = [projectId, user.id];
    let paramIndex = 3;
    let scopeFilter = "";

    if (scope === "personal") {
      scopeFilter = "AND vgt.scope = 'personal' AND vgt.owner_id = $2";
    } else if (scope === "project") {
      scopeFilter = "AND vgt.scope = 'project'";
    } else {
      scopeFilter = "AND ((vgt.scope = 'personal' AND vgt.owner_id = $2) OR vgt.scope = 'project')";
    }

    let workspaceFilter = "";
    if (workspaceId) {
      workspaceFilter = `AND (vgt.workspace_id IS NULL OR vgt.workspace_id = $${paramIndex})`;
      queryParams.push(workspaceId);
      paramIndex += 1;
    }

    const result = await pool.query(
      `SELECT vgt.*
       FROM viewgroup_templates vgt
       WHERE vgt.project_id = $1
       ${scopeFilter}
       ${workspaceFilter}
       ORDER BY vgt.updated_at DESC`,
      queryParams
    );

    const templates = result.rows.map((row) => normalizeTemplate(row, user.id));
    res.json({ templates, count: templates.length, scope });
  } catch (error) {
    log.error("Failed to list viewgroup templates:", error);
    next(error);
  }
});

// ============================================================================
// CREATE TEMPLATE
// ============================================================================

router.post("/", async (req, res, next) => {
  try {
    const { projectId: rawProjectId, workspaceId: workspaceFromParams } = req.params;
    const {
      name,
      description = "",
      layoutId = "single",
      color = "#a855f7",
      viewSlots = 1,
      scope = "personal",
      workspaceId: workspaceFromBody,
    } = req.body || {};
    const user = getUser(req);
    const { pool } = req.app.locals;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required" });
    }
    if (name.length > 255) {
      return res.status(400).json({ error: "name too long (max 255)" });
    }
    if (!["personal", "project"].includes(scope)) {
      return res.status(400).json({ error: "scope must be 'personal' or 'project'" });
    }

    const workspaceId = workspaceFromParams || workspaceFromBody || null;
    const projectId = await resolveProjectId(pool, {
      projectId: rawProjectId,
      workspaceId,
    });
    if (!projectId) {
      return res.status(400).json({ error: "projectId or workspaceId required" });
    }

    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const ownerId = scope === "personal" ? user.id : user.id;

    const result = await pool.query(
      `INSERT INTO viewgroup_templates
        (project_id, workspace_id, owner_id, name, description, layout_id, color, view_slots, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        projectId,
        workspaceId,
        ownerId,
        name.trim(),
        description,
        layoutId,
        color,
        viewSlots,
        scope,
      ]
    );

    const template = normalizeTemplate(result.rows[0], user.id);
    res.status(201).json({ template });
  } catch (error) {
    log.error("Failed to create viewgroup template:", error);
    next(error);
  }
});

// ============================================================================
// UPDATE TEMPLATE
// ============================================================================

router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { projectId: rawProjectId, workspaceId } = req.params;
    const {
      name,
      description,
      layoutId,
      color,
      viewSlots,
      scope,
    } = req.body || {};
    const user = getUser(req);
    const { pool } = req.app.locals;

    const projectId = await resolveProjectId(pool, {
      projectId: rawProjectId,
      workspaceId,
    });
    if (!projectId) {
      return res.status(400).json({ error: "projectId or workspaceId required" });
    }

    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await pool.query(
      "SELECT * FROM viewgroup_templates WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const current = existing.rows[0];
    if (current.scope === "personal" && current.owner_id !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (scope && !["personal", "project"].includes(scope)) {
      return res.status(400).json({ error: "scope must be 'personal' or 'project'" });
    }

    const updated = await pool.query(
      `UPDATE viewgroup_templates
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           layout_id = COALESCE($3, layout_id),
           color = COALESCE($4, color),
           view_slots = COALESCE($5, view_slots),
           scope = COALESCE($6, scope),
           owner_id = CASE
             WHEN $6 = 'personal' AND owner_id IS NULL THEN $7
             ELSE owner_id
           END
       WHERE id = $8 AND project_id = $9
       RETURNING *`,
      [
        name,
        description,
        layoutId,
        color,
        viewSlots,
        scope,
        user.id,
        id,
        projectId,
      ]
    );

    res.json({ template: normalizeTemplate(updated.rows[0], user.id) });
  } catch (error) {
    log.error("Failed to update viewgroup template:", error);
    next(error);
  }
});

// ============================================================================
// DELETE TEMPLATE
// ============================================================================

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { projectId: rawProjectId, workspaceId } = req.params;
    const user = getUser(req);
    const { pool } = req.app.locals;

    const projectId = await resolveProjectId(pool, {
      projectId: rawProjectId,
      workspaceId,
    });
    if (!projectId) {
      return res.status(400).json({ error: "projectId or workspaceId required" });
    }

    const access = await checkProjectAccess(pool, projectId, user.id);
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    const existing = await pool.query(
      "SELECT * FROM viewgroup_templates WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const current = existing.rows[0];
    if (current.scope === "personal" && current.owner_id !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query(
      "DELETE FROM viewgroup_templates WHERE id = $1 AND project_id = $2",
      [id, projectId]
    );

    res.json({ success: true });
  } catch (error) {
    log.error("Failed to delete viewgroup template:", error);
    next(error);
  }
});

module.exports = router;
