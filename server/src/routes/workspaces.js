// server/src/routes/workspaces.js
// Workspace management endpoints

const express = require("express");
const router = express.Router();
const {
  getUserId,
  checkProjectAccess,
  checkWorkspaceAccess,
  requireWorkspacePermission,
} = require("../middleware/auth");
const { PERMISSIONS, hasRemainingAdmin } = require("../utils/permissions");
const { writeSyncEvent } = require("../services/syncEventService");

// ============================================================================
// WORKSPACE ENDPOINTS
// ============================================================================

/**
 * GET /api/workspaces
 * List workspaces for user
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { type, project_id, room_id } = req.query;
    const { pool } = req.app.locals;

    let query = `
      SELECT DISTINCT w.*,
             (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
             (SELECT COUNT(*) FROM canvases WHERE workspace_id = w.id AND is_active = true) as canvas_count,
             (SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM canvases WHERE workspace_id = w.id AND is_active = true) as canvas_ids
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN project_members pm ON w.project_id = pm.project_id AND pm.user_id = $1
      WHERE w.is_archived = false 
        AND (
          w.owner_id = $1 
          OR wm.user_id = $1 
          OR (w.type = 'project' AND pm.user_id IS NOT NULL)
        )
    `;
    const params = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND w.type = $${paramIndex++}`;
      params.push(type);
    }

    if (project_id) {
      query += ` AND w.project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    if (room_id) {
      query += ` AND (w.room_id = $${paramIndex++} OR w.room_id IS NULL)`;
      params.push(room_id);
    }

    query += " ORDER BY w.type, w.updated_at DESC";

    const result = await pool.query(query, params);

    res.json({
      workspaces: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/personal
 * Get or create personal workspace for user
 */
router.get("/personal", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    // Check for existing personal workspace
    let result = await pool.query(
      `SELECT w.*,
              (SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM canvases WHERE workspace_id = w.id AND is_active = true) as canvas_ids
       FROM workspaces w
       WHERE w.type = 'personal' AND w.owner_id = $1 AND w.is_archived = false`,
      [userId]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Create personal workspace
    result = await pool.query(
      `INSERT INTO workspaces (name, type, owner_id, created_by)
       VALUES ('My Workspace', 'personal', $1, $1)
       RETURNING *`,
      [userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/:id/my-permission
 * Returns the calling user's effective role in this workspace.
 * Used by frontend permissionService.
 */
router.get("/:id/my-permission", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const { allowed, role } = await checkWorkspaceAccess(pool, id, userId);
    if (!allowed) {
      return res.status(403).json({ error: "No access to workspace" });
    }

    res.json({ workspaceId: id, role, userId });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/:id
 * Get workspace details
 */
router.get("/:id", requireWorkspacePermission(PERMISSIONS.WORKSPACE_READ), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `SELECT w.*,
              (SELECT json_agg(json_build_object('user_id', wm.user_id, 'permission', wm.permission))
               FROM workspace_members wm WHERE wm.workspace_id = w.id) as members,
              (SELECT COALESCE(array_agg(c.id), ARRAY[]::uuid[]) FROM canvases c WHERE c.workspace_id = w.id AND c.is_active = true) as canvas_ids
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post("/", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const { name, description, type, project_id, room_id, expires_at, auto_merge } =
      req.body;

    // If scoped to a project, verify caller is a member
    if (project_id) {
      const role = await checkProjectAccess(pool, project_id, userId);
      if (!role) {
        return res.status(403).json({ error: "Not a member of this project" });
      }
    }

    const result = await pool.query(
      `INSERT INTO workspaces (name, description, type, project_id, room_id, owner_id, created_by, expires_at, auto_merge)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
       RETURNING *`,
      [
        name || "Untitled Workspace",
        description || "",
        type || "project",
        project_id || null,
        room_id || null,
        userId,
        expires_at || null,
        auto_merge || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workspaces/:projectId/breakout
 * Create a breakout from project
 */
router.post("/:projectId/breakout", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const { name, expires_hours = 2 } = req.body;

    // Only project members may create breakout workspaces
    const role = await checkProjectAccess(pool, projectId, userId);
    if (!role) {
      return res.status(403).json({ error: "Not a member of this project" });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_hours);

    const result = await pool.query(
      `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, expires_at, auto_merge)
       VALUES ($1, 'breakout', $2, $3, $3, $4, true)
       RETURNING *`,
      [name || "Breakout Room", projectId, userId, expiresAt]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/workspaces/:id
 * Update workspace
 */
router.put("/:id", requireWorkspacePermission(PERMISSIONS.WORKSPACE_UPDATE), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { name, description, room_id, active_canvas_id } = req.body;

    // Block mutations on archived workspaces
    const archiveCheck = await pool.query(
      `SELECT is_archived FROM workspaces WHERE id = $1`,
      [id]
    );
    if (archiveCheck.rows[0]?.is_archived) {
      return res.status(409).json({ error: "WORKSPACE_ARCHIVED", reason: "Archived workspaces cannot be modified." });
    }

    const result = await pool.query(
      `UPDATE workspaces
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           room_id = COALESCE($3, room_id),
           active_canvas_id = COALESCE($4, active_canvas_id),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, room_id, active_canvas_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id
 * Archive workspace
 */
router.delete("/:id", requireWorkspacePermission(PERMISSIONS.WORKSPACE_DELETE), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `UPDATE workspaces
       SET is_archived = true, archived_at = NOW(), archived_by = $2, archive_reason = 'manual'
       WHERE id = $1 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MEMBER ENDPOINTS
// ============================================================================

/**
 * POST /api/workspaces/:id/members
 * Add member to workspace
 */
router.post("/:id/members", requireWorkspacePermission(PERMISSIONS.WORKSPACE_MANAGE_MEMBERS), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const { user_id, permission = "viewer" } = req.body;

    // Block mutations on archived workspaces
    const archiveCheck = await pool.query(`SELECT is_archived FROM workspaces WHERE id = $1`, [id]);
    if (archiveCheck.rows[0]?.is_archived) {
      return res.status(409).json({ error: "WORKSPACE_ARCHIVED", reason: "Archived workspaces cannot be modified." });
    }

    // Self-lockout guard: if downgrading a privileged member to viewer, ensure another admin remains
    if (permission === 'viewer') {
      const currentPerm = await pool.query(
        `SELECT permission FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [id, user_id]
      );
      const cur = currentPerm.rows[0]?.permission;
      if (cur === 'owner' || cur === 'editor') {
        const safe = await hasRemainingAdmin(pool, { workspaceId: id }, user_id);
        if (!safe) {
          return res.status(409).json({
            error: 'LAST_ADMIN_LOCKOUT',
            reason: 'Cannot downgrade the last admin. Assign another owner or editor first.',
            userId: user_id,
          });
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET permission = $3
       RETURNING *`,
      [id, user_id, permission]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id/members/:userId
 * Remove member from workspace
 */
router.delete("/:id/members/:userId", requireWorkspacePermission(PERMISSIONS.WORKSPACE_MANAGE_MEMBERS), async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { pool } = req.app.locals;

    // Block mutations on archived workspaces
    const archiveCheck = await pool.query(`SELECT is_archived FROM workspaces WHERE id = $1`, [id]);
    if (archiveCheck.rows[0]?.is_archived) {
      return res.status(409).json({ error: "WORKSPACE_ARCHIVED", reason: "Archived workspaces cannot be modified." });
    }

    // Self-lockout guard: prevent removing the last admin
    const safe = await hasRemainingAdmin(pool, { workspaceId: id }, userId);
    if (!safe) {
      return res.status(409).json({
        error: 'LAST_ADMIN_LOCKOUT',
        reason: 'Cannot remove the last admin from this workspace. Assign another owner or editor first.',
        userId,
      });
    }

    await pool.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BREAKOUT MERGE CONSENT
// ============================================================================

/**
 * POST /api/workspaces/:id/consent
 * Grant consent for this user's own private breakout entities to be included
 * in a merge. Only the authenticated user can grant their own consent.
 */
router.post("/:id/consent", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;
    const { entity_types = null } = req.body;

    // Verify workspace exists and is a breakout
    const wsCheck = await pool.query(
      `SELECT type, is_archived FROM workspaces WHERE id = $1`,
      [id]
    );
    if (!wsCheck.rows.length) return res.status(404).json({ error: "Workspace not found" });
    if (wsCheck.rows[0].type !== "breakout") {
      return res.status(400).json({ error: "Consent only applies to breakout workspaces" });
    }
    if (wsCheck.rows[0].is_archived) {
      return res.status(409).json({ error: "WORKSPACE_ARCHIVED", reason: "Cannot consent on an archived workspace" });
    }

    await pool.query(
      `INSERT INTO breakout_merge_consents (workspace_id, user_id, granted_at, revoked_at, entity_types)
       VALUES ($1, $2, NOW(), NULL, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE
         SET granted_at = NOW(), revoked_at = NULL, entity_types = $3`,
      [id, userId, entity_types]
    );

    res.json({ success: true, workspaceId: id, userId, consentActive: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workspaces/:id/consent
 * Revoke previously granted consent. Only the authenticated user can revoke theirs.
 */
router.delete("/:id/consent", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    await pool.query(
      `UPDATE breakout_merge_consents SET revoked_at = NOW()
       WHERE workspace_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [id, userId]
    );

    res.json({ success: true, workspaceId: id, userId, consentActive: false });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workspaces/:id/merge-eligibility
 * Returns who has granted consent for merge, along with their entity counts.
 * Accessible to the merge actor (requires BREAKOUT_MERGE permission).
 */
router.get(
  "/:id/merge-eligibility",
  requireWorkspacePermission(PERMISSIONS.BREAKOUT_MERGE),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { pool } = req.app.locals;

      // Active consents with entity counts
      const result = await pool.query(
        `SELECT
           bmc.user_id,
           u.display_name AS user_name,
           bmc.granted_at,
           bmc.entity_types,
           (SELECT COUNT(*) FROM workspace_annotations wa
            WHERE wa.project_id = w.project_id
              AND wa.created_by = bmc.user_id
              AND wa.visibility = 'private'
              AND wa.created_at >= w.created_at) AS annotation_count,
           (SELECT COUNT(*) FROM view_configurations vc
            WHERE vc.project_id = w.project_id
              AND vc.owner_user_id = bmc.user_id
              AND vc.visibility = 'private'
              AND vc.created_at >= w.created_at) AS view_config_count
         FROM breakout_merge_consents bmc
         JOIN workspaces w ON w.id = bmc.workspace_id
         JOIN users u ON u.id = bmc.user_id
         WHERE bmc.workspace_id = $1 AND bmc.revoked_at IS NULL`,
        [id]
      );

      res.json({ workspaceId: id, consents: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// BREAKOUT MERGE
// ============================================================================

/**
 * POST /api/workspaces/:id/merge
 * Merge a breakout workspace back into its parent.
 *
 * Entity promotion strategy (non-destructive):
 * - merge actor's own private entities are always promoted.
 * - other users' private entities are promoted only if they have granted
 *   active consent via POST /api/workspaces/:id/consent.
 * - Entities already at 'project' or 'public' visibility are skipped.
 * - No parent entity is overwritten.
 * - Each promoted entity receives a sync_event for client hydration.
 */
router.post(
  "/:id/merge",
  requireWorkspacePermission(PERMISSIONS.BREAKOUT_MERGE),
  async (req, res, next) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    const client = await pool.connect();
    try {
      // Verify breakout workspace exists and has a parent
      const wsResult = await client.query(
        `SELECT id, type, parent_id, project_id, name, created_at FROM workspaces WHERE id = $1`,
        [id]
      );
      if (!wsResult.rows.length) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      const breakout = wsResult.rows[0];
      if (breakout.type !== "breakout") {
        return res.status(400).json({ error: "Only breakout workspaces can be merged" });
      }
      if (!breakout.parent_id) {
        return res.status(400).json({
          error: "no_parent",
          reason: "This breakout workspace has no parent_id — cannot determine merge target",
        });
      }
      if (breakout.is_archived) {
        return res.status(409).json({ error: "WORKSPACE_ARCHIVED", reason: "Archived workspaces cannot be merged." });
      }

      await client.query("BEGIN");

      const syncEventIds = [];
      const mergeSnapshot = { mergedFrom: id, mergedBy: userId };

      // ── Helper: promote a user's private entities and write sync events ───────
      async function promoteForUser(promotedUserId, isConsentedUser = false) {
        const consentMeta = isConsentedUser ? { consentedBy: promotedUserId } : {};

        const annRows = await client.query(
          `UPDATE workspace_annotations
           SET visibility = 'project', revision = revision + 1, updated_at = NOW()
           WHERE project_id = $1 AND created_by = $2
             AND visibility = 'private' AND created_at >= $3
           RETURNING id, revision`,
          [breakout.project_id, promotedUserId, breakout.created_at]
        );
        for (const row of annRows.rows) {
          const ev = await writeSyncEvent(client, {
            workspaceId: breakout.parent_id,
            entityType: "workspace_annotation",
            entityId: row.id,
            operation: "update",
            baseRevision: row.revision - 1,
            nextRevision: row.revision,
            actorUserId: userId,
            snapshot: { ...mergeSnapshot, ...consentMeta, visibility: "project" },
          });
          syncEventIds.push(ev.id.toString());
        }

        const vcRows = await client.query(
          `UPDATE view_configurations
           SET visibility = 'project', revision = revision + 1, updated_at = NOW()
           WHERE project_id = $1 AND owner_user_id = $2
             AND visibility = 'private' AND created_at >= $3
           RETURNING id, revision`,
          [breakout.project_id, promotedUserId, breakout.created_at]
        );
        for (const row of vcRows.rows) {
          const ev = await writeSyncEvent(client, {
            workspaceId: breakout.parent_id,
            entityType: "view_configuration",
            entityId: row.id,
            operation: "update",
            baseRevision: row.revision - 1,
            nextRevision: row.revision,
            actorUserId: userId,
            snapshot: { ...mergeSnapshot, ...consentMeta, visibility: "project" },
          });
          syncEventIds.push(ev.id.toString());
        }

        return {
          annotations: annRows.rows.length,
          viewConfigs: vcRows.rows.length,
        };
      }

      // ── Promote merge actor's own entities (always allowed) ───────────────────
      const own = await promoteForUser(userId, false);

      // ── Promote consented users' entities ─────────────────────────────────────
      const consentsResult = await client.query(
        `SELECT user_id FROM breakout_merge_consents
         WHERE workspace_id = $1 AND user_id != $2 AND revoked_at IS NULL`,
        [id, userId]
      );

      let consentedAnnotations = 0;
      let consentedViewConfigs = 0;

      for (const { user_id: consentedUserId } of consentsResult.rows) {
        const promoted = await promoteForUser(consentedUserId, true);
        consentedAnnotations += promoted.annotations;
        consentedViewConfigs += promoted.viewConfigs;
      }

      // ── Count users with private entities but no consent (skipped) ────────────
      const skippedResult = await client.query(
        `SELECT COUNT(DISTINCT wa.created_by) AS cnt
         FROM workspace_annotations wa
         WHERE wa.project_id = $1
           AND wa.visibility = 'private'
           AND wa.created_at >= $2
           AND wa.created_by != $3
           AND wa.created_by NOT IN (
             SELECT user_id FROM breakout_merge_consents
             WHERE workspace_id = $4 AND revoked_at IS NULL
           )`,
        [breakout.project_id, breakout.created_at, userId, id]
      );

      const counts = {
        ownAnnotations:      own.annotations,
        ownViewConfigs:      own.viewConfigs,
        consentedAnnotations,
        consentedViewConfigs,
        skippedNoConsent:    parseInt(skippedResult.rows[0]?.cnt ?? '0', 10),
        conflicts:           0,
      };

      // ── Provenance record for the merge ───────────────────────────────────────
      await writeSyncEvent(client, {
        workspaceId:  breakout.parent_id,
        entityType:   "workspace",
        entityId:     id,
        operation:    "breakout_merge",
        baseRevision: null,
        nextRevision: 1,
        actorUserId:  userId,
        snapshot: {
          sourceWorkspaceId:   id,
          sourceWorkspaceName: breakout.name,
          targetWorkspaceId:   breakout.parent_id,
          counts,
          mergedAt:            new Date().toISOString(),
          mergedBy:            userId,
        },
      });

      await client.query("COMMIT");

      // ── Broadcast to project members ──────────────────────────────────────────
      if (wsManager && breakout.project_id) {
        wsManager.broadcastToProject(breakout.project_id, {
          type:               "workspace:merged",
          sourceWorkspaceId:  id,
          targetWorkspaceId:  breakout.parent_id,
          mergedBy:           userId,
          counts,
          syncEventIds,
          timestamp:          new Date().toISOString(),
        });
      }

      res.json({
        success:           true,
        sourceWorkspaceId: id,
        targetWorkspaceId: breakout.parent_id,
        counts,
        syncEventIds,
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
