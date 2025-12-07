// server/src/routes/rooms.js
// Room management endpoints for Space Navigation system
// Server-authoritative: all room IDs and membership stored in PostgreSQL

const express = require("express");
const router = express.Router({ mergeParams: true }); // For :projectId from parent route
const { createLogger } = require("../utils/logger");
const { getUserId } = require("../middleware/auth");

const log = createLogger("rooms");

// ============================================================================
// ROOM ENDPOINTS
// ============================================================================

/**
 * GET /api/projects/:projectId/rooms
 * List all rooms in a project (with membership info and online counts)
 */
router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT
        r.*,
        (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count,
        EXISTS(SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $2) as is_member,
        (SELECT rm.role FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $2) as my_role,
        u.display_name as created_by_name
      FROM rooms r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.project_id = $1
      ORDER BY r.room_type = 'main' DESC, r.created_at ASC
    `,
      [projectId, userId]
    );

    res.json({
      rooms: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    log.error("Error listing rooms:", error);
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/rooms/:roomId
 * Get a single room's details
 */
router.get("/:roomId", async (req, res, next) => {
  try {
    const { projectId, roomId } = req.params;
    const userId = getUserId(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT
        r.*,
        (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count,
        EXISTS(SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $2) as is_member,
        (SELECT rm.role FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = $2) as my_role
      FROM rooms r
      WHERE r.id = $1 AND r.project_id = $3
    `,
      [roomId, userId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    log.error("Error getting room:", error);
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/rooms
 * Create a new breakout room
 */
router.post("/", async (req, res, next) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const { wsManager } = req.app.locals;
    const { name, description, isPublic = true, maxMembers = null } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Room name is required" });
    }

    await client.query("BEGIN");

    // Verify user has access to project
    const projectCheck = await client.query(
      `
      SELECT 1 FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1 AND (p.visibility = 'public' OR pm.user_id = $2)
    `,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Access denied" });
    }

    // Create the breakout room
    const result = await client.query(
      `
      INSERT INTO rooms (project_id, name, description, is_public, room_type, max_members, created_by)
      VALUES ($1, $2, $3, $4, 'breakout', $5, $6)
      RETURNING *
    `,
      [
        projectId,
        name.trim(),
        description || null,
        isPublic,
        maxMembers,
        userId,
      ]
    );

    const room = result.rows[0];

    // Auto-add creator as admin
    await client.query(
      `
      INSERT INTO room_members (room_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `,
      [room.id, userId]
    );

    await client.query("COMMIT");

    log.info("Room created:", { roomId: room.id, name: room.name, projectId });

    // Broadcast to project members
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "room:created",
        room: { ...room, member_count: 1, is_member: true, my_role: "admin" },
        userId,
      });
    }

    res.status(201).json({
      ...room,
      member_count: 1,
      is_member: true,
      my_role: "admin",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    log.error("Error creating room:", error);
    next(error);
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/projects/:projectId/rooms/:roomId
 * Update room settings (name, description, etc.)
 */
router.patch("/:roomId", async (req, res, next) => {
  try {
    const { projectId, roomId } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;
    const { name, description, isPublic, maxMembers } = req.body;

    // Check if user is admin of this room
    const memberCheck = await pool.query(
      `
      SELECT rm.role FROM room_members rm
      JOIN rooms r ON rm.room_id = r.id
      WHERE rm.room_id = $1 AND rm.user_id = $2 AND r.project_id = $3
    `,
      [roomId, userId, projectId]
    );

    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only room admins can update room settings" });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(isPublic);
    }
    if (maxMembers !== undefined) {
      updates.push(`max_members = $${paramIndex++}`);
      values.push(maxMembers);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(roomId);

    const result = await pool.query(
      `
      UPDATE rooms SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = result.rows[0];

    // Broadcast update
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "room:updated",
        room,
        userId,
      });
    }

    res.json(room);
  } catch (error) {
    log.error("Error updating room:", error);
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/rooms/:roomId
 * Delete a breakout room (cannot delete main room)
 */
router.delete("/:roomId", async (req, res, next) => {
  const client = await req.app.locals.pool.connect();

  try {
    const { projectId, roomId } = req.params;
    const userId = getUserId(req);
    const { wsManager } = req.app.locals;

    await client.query("BEGIN");

    // Check room exists and get its type
    const roomCheck = await client.query(
      `
      SELECT r.*, rm.role as user_role
      FROM rooms r
      LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = $2
      WHERE r.id = $1 AND r.project_id = $3
    `,
      [roomId, userId, projectId]
    );

    if (roomCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomCheck.rows[0];

    // Cannot delete main room
    if (room.room_type === "main") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cannot delete the main room" });
    }

    // Only room admin or project admin can delete
    if (room.user_role !== "admin") {
      // TODO: Also check project admin status
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "Only room admins can delete rooms" });
    }

    // Delete room (cascades to room_members)
    await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);

    await client.query("COMMIT");

    log.info("Room deleted:", { roomId, name: room.name, projectId });

    // Broadcast deletion
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "room:deleted",
        roomId,
        userId,
      });
    }

    res.json({ success: true, roomId });
  } catch (error) {
    await client.query("ROLLBACK");
    log.error("Error deleting room:", error);
    next(error);
  } finally {
    client.release();
  }
});

// ============================================================================
// ROOM MEMBERSHIP ENDPOINTS
// ============================================================================

/**
 * POST /api/projects/:projectId/rooms/:roomId/join
 * Join a room
 */
router.post("/:roomId/join", async (req, res, next) => {
  try {
    const { projectId, roomId } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    // Check room exists and is in this project
    const roomCheck = await pool.query(
      `
      SELECT r.*,
        (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as current_members
      FROM rooms r
      WHERE r.id = $1 AND r.project_id = $2
    `,
      [roomId, projectId]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomCheck.rows[0];

    // Check if room is full
    if (room.max_members && room.current_members >= room.max_members) {
      return res.status(400).json({ error: "Room is full" });
    }

    // Check if room is public or user has invite
    if (!room.is_public) {
      // TODO: Check for invite
      return res
        .status(403)
        .json({ error: "This room requires an invitation" });
    }

    // Add user to room (ON CONFLICT handles duplicate joins)
    await pool.query(
      `
      INSERT INTO room_members (room_id, user_id, role)
      VALUES ($1, $2, 'member')
      ON CONFLICT (room_id, user_id) DO NOTHING
    `,
      [roomId, userId]
    );

    log.info("User joined room:", { userId, roomId, roomName: room.name });

    // Broadcast join
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "room:member_joined",
        roomId,
        userId,
      });
    }

    res.json({ success: true, roomId, roomName: room.name });
  } catch (error) {
    log.error("Error joining room:", error);
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/rooms/:roomId/leave
 * Leave a room (cannot leave main room)
 */
router.post("/:roomId/leave", async (req, res, next) => {
  try {
    const { projectId, roomId } = req.params;
    const userId = getUserId(req);
    const { pool, wsManager } = req.app.locals;

    // Check room type
    const roomCheck = await pool.query(
      `
      SELECT room_type, name FROM rooms WHERE id = $1 AND project_id = $2
    `,
      [roomId, projectId]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomCheck.rows[0];

    // Cannot leave main room
    if (room.room_type === "main") {
      return res.status(400).json({ error: "Cannot leave the main room" });
    }

    // Remove membership
    await pool.query(
      `
      DELETE FROM room_members WHERE room_id = $1 AND user_id = $2
    `,
      [roomId, userId]
    );

    log.info("User left room:", { userId, roomId, roomName: room.name });

    // Broadcast leave
    if (wsManager) {
      wsManager.broadcastToProject(projectId, {
        type: "room:member_left",
        roomId,
        userId,
      });
    }

    res.json({ success: true, roomId });
  } catch (error) {
    log.error("Error leaving room:", error);
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/rooms/:roomId/members
 * List members of a room
 */
router.get("/:roomId/members", async (req, res, next) => {
  try {
    const { projectId, roomId } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT
        u.id, u.display_name, u.email, u.avatar_url,
        rm.role, rm.joined_at
      FROM room_members rm
      JOIN users u ON rm.user_id = u.id
      JOIN rooms r ON rm.room_id = r.id
      WHERE rm.room_id = $1 AND r.project_id = $2
      ORDER BY rm.role = 'admin' DESC, rm.joined_at ASC
    `,
      [roomId, projectId]
    );

    res.json({
      members: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    log.error("Error listing room members:", error);
    next(error);
  }
});

// ============================================================================
// HELPER: Create main room for a project
// ============================================================================

/**
 * Creates the main room for a project
 * Called when a project is created
 */
async function createMainRoom(client, projectId, createdBy) {
  const result = await client.query(
    `
    INSERT INTO rooms (project_id, name, room_type, is_public, created_by)
    VALUES ($1, 'Main Room', 'main', true, $2)
    RETURNING *
  `,
    [projectId, createdBy]
  );

  const room = result.rows[0];

  // Add creator as admin
  await client.query(
    `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, 'admin')
  `,
    [room.id, createdBy]
  );

  log.info("Main room created for project:", { projectId, roomId: room.id });

  return room;
}

// Export both router and helper
module.exports = router;
module.exports.createMainRoom = createMainRoom;
