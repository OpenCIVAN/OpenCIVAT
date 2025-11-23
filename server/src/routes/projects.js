// server/src/routes/projects.js
// Projects API - War rooms / workspaces management
//
// Endpoints:
//   GET    /api/projects              - List user's projects
//   GET    /api/projects/:id          - Get project details
//   POST   /api/projects              - Create new project
//   PATCH  /api/projects/:id          - Update project
//   DELETE /api/projects/:id          - Archive project
//   GET    /api/projects/:id/files    - List files in project
//   POST   /api/projects/:id/files    - Upload file to project
//   POST   /api/projects/:id/files/:fileId/access - Add existing file to project

const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// File upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

// ============================================================================
// MIDDLEWARE: Extract user from request (placeholder for auth)
// ============================================================================

// TODO: Replace with real auth middleware
const extractUser = (req, res, next) => {
  // For development, use header or default
  req.userId = req.headers["x-user-id"] || "anonymous";
  req.userEmail = req.headers["x-user-email"] || "anonymous@local";
  req.organizationId =
    req.headers["x-organization-id"] || "00000000-0000-0000-0000-000000000002";
  next();
};

router.use(extractUser);

// ============================================================================
// HELPER: Audit logging
// ============================================================================

async function logAudit(
  client,
  {
    userId,
    userEmail,
    organizationId,
    projectId,
    action,
    entityType,
    entityId,
    details,
    req,
  }
) {
  try {
    await client.query(
      `
            INSERT INTO audit_log 
            (user_id, user_email, organization_id, project_id, action, entity_type, entity_id, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
      [
        userId !== "anonymous" ? userId : null,
        userEmail,
        organizationId,
        projectId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        req?.ip || null,
        req?.headers?.["user-agent"] || null,
      ]
    );
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Audit logging failed:", error);
  }
}

// ============================================================================
// GET /api/projects - List user's projects
// ============================================================================

router.get("/", async (req, res, next) => {
  try {
    const { organizationId } = req;
    const { status = "active", include_archived = false } = req.query;

    let query = `
            SELECT 
                p.id,
                p.name,
                p.slug,
                p.description,
                p.parent_project_id,
                p.visibility,
                p.status,
                p.settings,
                p.created_by,
                p.created_at,
                p.updated_at,
                (SELECT COUNT(*) FROM file_project_access WHERE project_id = p.id) as file_count,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            WHERE p.organization_id = $1
        `;

    const params = [organizationId];

    if (!include_archived) {
      query += ` AND p.status != 'archived'`;
    }

    if (status && status !== "all") {
      query += ` AND p.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY p.updated_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      projects: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/projects/:id - Get project details
// ============================================================================

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req;

    const result = await pool.query(
      `
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM file_project_access WHERE project_id = p.id) as file_count,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
                parent.name as parent_project_name
            FROM projects p
            LEFT JOIN projects parent ON p.parent_project_id = parent.id
            WHERE p.id = $1 AND p.organization_id = $2
        `,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/projects - Create new project
// ============================================================================

router.post("/", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { userId, userEmail, organizationId } = req;
    const {
      name,
      description,
      visibility = "private",
      parent_project_id,
      settings = {},
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    // Generate URL-friendly slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness, append number if needed
    let slug = baseSlug;
    let slugCounter = 1;
    while (true) {
      const existing = await client.query(
        "SELECT id FROM projects WHERE organization_id = $1 AND slug = $2",
        [organizationId, slug]
      );
      if (existing.rows.length === 0) break;
      slug = `${baseSlug}-${slugCounter++}`;
    }

    await client.query("BEGIN");

    // Create project
    const projectId = uuidv4();
    const result = await client.query(
      `
            INSERT INTO projects 
            (id, organization_id, name, slug, description, visibility, parent_project_id, settings, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `,
      [
        projectId,
        organizationId,
        name,
        slug,
        description,
        visibility,
        parent_project_id,
        JSON.stringify(settings),
        userId !== "anonymous" ? userId : null,
      ]
    );

    // Add creator as owner
    if (userId !== "anonymous") {
      await client.query(
        `
                INSERT INTO project_members (project_id, user_id, role, added_by)
                VALUES ($1, $2, 'owner', $2)
            `,
        [projectId, userId]
      );
    }

    // If this is a branch, inherit files from parent
    if (parent_project_id) {
      await client.query(
        `
                INSERT INTO file_project_access (file_id, project_id, access_level, visibility, added_by)
                SELECT file_id, $1, access_level, visibility, $2
                FROM file_project_access
                WHERE project_id = $3
            `,
        [projectId, userId !== "anonymous" ? userId : null, parent_project_id]
      );
    }

    // Audit log
    await logAudit(client, {
      userId,
      userEmail,
      organizationId,
      projectId,
      action: "project.created",
      entityType: "project",
      entityId: projectId,
      details: { name, slug, visibility, parent_project_id },
      req,
    });

    await client.query("COMMIT");

    res.status(201).json({ project: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// ============================================================================
// PATCH /api/projects/:id - Update project
// ============================================================================

router.patch("/:id", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { userId, userEmail, organizationId } = req;
    const { name, description, visibility, status, settings } = req.body;

    await client.query("BEGIN");

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (visibility !== undefined) {
      updates.push(`visibility = $${paramCount++}`);
      values.push(visibility);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
      if (status === "archived") {
        updates.push(`archived_at = CURRENT_TIMESTAMP`);
      }
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    values.push(id, organizationId);

    const result = await client.query(
      `
            UPDATE projects 
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount++} AND organization_id = $${paramCount}
            RETURNING *
        `,
      values
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Project not found" });
    }

    // Audit log
    await logAudit(client, {
      userId,
      userEmail,
      organizationId,
      projectId: id,
      action: "project.updated",
      entityType: "project",
      entityId: id,
      details: { name, description, visibility, status },
      req,
    });

    await client.query("COMMIT");

    res.json({ project: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/projects/:id/files - List files accessible in project
// ============================================================================

router.get("/:id/files", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, organizationId } = req;

    // For now, return all files in project (will add permission filtering)
    const result = await pool.query(
      `
            SELECT 
                d.id,
                d.filename,
                d.file_size,
                d.file_type,
                d.mime_type,
                d.storage_key,
                d.hash,
                d.metadata,
                d.uploaded_by,
                d.uploaded_at,
                fpa.access_level,
                fpa.visibility,
                fpa.added_at as added_to_project_at,
                (d.uploaded_by = $3) as is_own_upload
            FROM datasets d
            JOIN file_project_access fpa ON d.id = fpa.file_id
            WHERE fpa.project_id = $1
            ORDER BY d.uploaded_at DESC
        `,
      [id, organizationId, userId]
    );

    res.json({
      files: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/projects/:id/files - Upload new file to project
// ============================================================================

router.post("/:id/files", upload.single("file"), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id: projectId } = req.params;
    const { userId, userEmail, organizationId } = req;
    const { file } = req;
    const { visibility = "all_members", access_level = "read" } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    await client.query("BEGIN");

    // Verify project exists
    const projectCheck = await client.query(
      "SELECT id FROM projects WHERE id = $1 AND organization_id = $2",
      [projectId, organizationId]
    );
    if (projectCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Project not found" });
    }

    // Calculate file hash for deduplication
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // Check for duplicate
    const existingFile = await client.query(
      "SELECT id, filename FROM datasets WHERE hash = $1 AND organization_id = $2",
      [hash, organizationId]
    );

    let fileId;
    let wasDeduped = false;

    if (existingFile.rows.length > 0) {
      // File already exists, just add access
      fileId = existingFile.rows[0].id;
      wasDeduped = true;
      console.log(
        `📦 Deduplication: ${file.originalname} matches existing file ${existingFile.rows[0].filename}`
      );
    } else {
      // New file - save to disk and database
      fileId = uuidv4();
      const storageKey = `${fileId}${path.extname(file.originalname)}`;
      const filePath = path.join(UPLOAD_DIR, storageKey);

      // Ensure upload directory exists
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(filePath, file.buffer);

      // Determine file type
      const ext = path.extname(file.originalname).toLowerCase();
      const fileType =
        ext === ".vtp"
          ? "vtp"
          : ext === ".vtk"
          ? "vtk"
          : ext === ".csv"
          ? "csv"
          : "unknown";

      // Insert file record
      await client.query(
        `
                INSERT INTO datasets 
                (id, organization_id, filename, file_size, file_type, mime_type, storage_key, hash, uploaded_by, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
        [
          fileId,
          organizationId,
          file.originalname,
          file.size,
          fileType,
          file.mimetype,
          storageKey,
          hash,
          userId,
          JSON.stringify({}),
        ]
      );
    }

    // Add file access to project (skip if already exists)
    await client.query(
      `
            INSERT INTO file_project_access 
            (file_id, project_id, access_level, visibility, added_by)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (file_id, project_id) DO NOTHING
        `,
      [
        fileId,
        projectId,
        access_level,
        visibility,
        userId !== "anonymous" ? userId : null,
      ]
    );

    // Update organization storage usage (only for new files)
    if (!wasDeduped) {
      await client.query(
        `
                UPDATE organizations 
                SET storage_used_bytes = storage_used_bytes + $1
                WHERE id = $2
            `,
        [file.size, organizationId]
      );
    }

    // Audit log
    await logAudit(client, {
      userId,
      userEmail,
      organizationId,
      projectId,
      action: "file.uploaded",
      entityType: "file",
      entityId: fileId,
      details: {
        filename: file.originalname,
        size: file.size,
        hash,
        deduplicated: wasDeduped,
      },
      req,
    });

    await client.query("COMMIT");

    // Fetch the complete file record to return
    const fileResult = await pool.query(
      "SELECT * FROM datasets WHERE id = $1",
      [fileId]
    );

    res.status(201).json({
      file: fileResult.rows[0],
      deduplicated: wasDeduped,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// ============================================================================
// POST /api/projects/:id/files/:fileId/access - Add existing file to project
// ============================================================================

router.post("/:id/files/:fileId/access", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id: projectId, fileId } = req.params;
    const { userId, userEmail, organizationId } = req;
    const { access_level = "read", visibility = "all_members" } = req.body;

    await client.query("BEGIN");

    // Verify file exists and belongs to organization
    const fileCheck = await client.query(
      "SELECT id, filename FROM datasets WHERE id = $1 AND organization_id = $2",
      [fileId, organizationId]
    );
    if (fileCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "File not found" });
    }

    // Verify project exists
    const projectCheck = await client.query(
      "SELECT id FROM projects WHERE id = $1 AND organization_id = $2",
      [projectId, organizationId]
    );
    if (projectCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Project not found" });
    }

    // Add access
    const result = await client.query(
      `
            INSERT INTO file_project_access 
            (file_id, project_id, access_level, visibility, added_by)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (file_id, project_id) 
            DO UPDATE SET access_level = $3, visibility = $4
            RETURNING *
        `,
      [
        fileId,
        projectId,
        access_level,
        visibility,
        userId !== "anonymous" ? userId : null,
      ]
    );

    // Audit log
    await logAudit(client, {
      userId,
      userEmail,
      organizationId,
      projectId,
      action: "file.shared_to_project",
      entityType: "file",
      entityId: fileId,
      details: {
        filename: fileCheck.rows[0].filename,
        access_level,
        visibility,
      },
      req,
    });

    await client.query("COMMIT");

    res.json({ access: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
