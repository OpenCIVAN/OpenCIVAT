// server/src/services/websocket.js
// WebSocket manager for real-time event broadcasting
// Server-authoritative: all state changes are broadcast from server to clients

const WebSocket = require("ws");

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.rooms = new Map(); // Map<projectId, Set<WebSocket>>
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: "/ws" });

    this.wss.on("connection", (ws, req) => {
      console.log("🔌 WebSocket client connected");

      // Parse token from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      // Store connection metadata
      ws.isAlive = true;
      ws.userId = null;
      ws.projectId = null;

      // Handle pong responses
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on("message", (data) => {
        this._handleMessage(ws, data);
      });

      // Handle disconnection
      ws.on("close", () => {
        this._handleDisconnect(ws);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      // Send welcome message
      this._send(ws, {
        type: "connected",
        serverTime: new Date().toISOString(),
      });
    });

    // Heartbeat interval to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log("💔 Terminating dead WebSocket connection");
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log("✅ WebSocket server initialized");
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "ping":
          this._send(ws, {
            type: "pong",
            serverTime: new Date().toISOString(),
          });
          break;

        case "auth":
          this._handleAuth(ws, message);
          break;

        case "join:project":
          this._handleJoinProject(ws, message.projectId);
          break;

        case "leave:project":
          this._handleLeaveProject(ws);
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle authentication
   */
  _handleAuth(ws, message) {
    // TODO: Validate JWT token with Keycloak
    // For now, trust the userId in the message
    ws.userId = message.userId;

    // Add to clients map
    if (!this.clients.has(ws.userId)) {
      this.clients.set(ws.userId, new Set());
    }
    this.clients.get(ws.userId).add(ws);

    this._send(ws, {
      type: "auth:success",
      userId: ws.userId,
    });

    console.log(`👤 User ${ws.userId} authenticated via WebSocket`);
  }

  /**
   * Handle joining a project room
   */
  _handleJoinProject(ws, projectId) {
    // Leave previous room if any
    if (ws.projectId) {
      this._handleLeaveProject(ws);
    }

    ws.projectId = projectId;

    // Add to room
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, new Set());
    }
    this.rooms.get(projectId).add(ws);

    console.log(`📁 User ${ws.userId} joined project ${projectId}`);

    // Notify room members
    this.broadcastToProject(
      projectId,
      {
        type: "member:joined",
        projectId,
        userId: ws.userId,
        timestamp: new Date().toISOString(),
      },
      ws
    );

    // Send confirmation
    this._send(ws, {
      type: "project:joined",
      projectId,
    });
  }

  /**
   * Handle leaving a project room
   */
  _handleLeaveProject(ws) {
    if (!ws.projectId) return;

    const projectId = ws.projectId;
    const room = this.rooms.get(projectId);

    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(projectId);
      }
    }

    // Notify room members
    this.broadcastToProject(projectId, {
      type: "member:left",
      projectId,
      userId: ws.userId,
      timestamp: new Date().toISOString(),
    });

    ws.projectId = null;
    console.log(`📁 User ${ws.userId} left project ${projectId}`);
  }

  /**
   * Handle client disconnection
   */
  _handleDisconnect(ws) {
    // Leave project room
    this._handleLeaveProject(ws);

    // Remove from clients map
    if (ws.userId && this.clients.has(ws.userId)) {
      this.clients.get(ws.userId).delete(ws);
      if (this.clients.get(ws.userId).size === 0) {
        this.clients.delete(ws.userId);
      }
    }

    console.log("🔌 WebSocket client disconnected");
  }

  /**
   * Send message to a single client
   */
  _send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients in a project
   * @param {string} projectId - Project ID
   * @param {object} message - Message to broadcast
   * @param {WebSocket} exclude - Optional client to exclude
   */
  broadcastToProject(projectId, message, exclude = null) {
    const room = this.rooms.get(projectId);
    if (!room) return;

    const payload = JSON.stringify(message);
    room.forEach((ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Broadcast message to a specific user (all their connections)
   * @param {string} userId - User ID
   * @param {object} message - Message to broadcast
   */
  broadcastToUser(userId, message) {
    const userSockets = this.clients.get(userId);
    if (!userSockets) return;

    const payload = JSON.stringify(message);
    userSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {object} message - Message to broadcast
   */
  broadcastAll(message) {
    if (!this.wss) return;

    const payload = JSON.stringify(message);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  // ============================================================================
  // EVENT HELPERS - Call these from route handlers after mutations
  // ============================================================================

  /**
   * Broadcast file added event
   */
  fileAdded(projectId, file) {
    const room = this.rooms.get(projectId);
    console.log(
      `📢 Broadcasting file:added for ${file.filename} to project ${projectId}`
    );
    console.log(
      `   Room exists: ${!!room}, clients in room: ${room ? room.size : 0}`
    );

    this.broadcastToProject(projectId, {
      type: "file:added",
      projectId,
      file,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast file removed event
   */
  fileRemoved(projectId, fileId) {
    this.broadcastToProject(projectId, {
      type: "file:removed",
      projectId,
      fileId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast file version added event
   */
  fileVersionAdded(projectId, fileId, version) {
    this.broadcastToProject(projectId, {
      type: "file:version-added",
      projectId,
      fileId,
      version,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast annotation created event
   */
  annotationCreated(projectId, fileId, annotation) {
    this.broadcastToProject(projectId, {
      type: "annotation:created",
      projectId,
      fileId,
      annotation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast annotation updated event
   */
  annotationUpdated(projectId, fileId, annotation) {
    this.broadcastToProject(projectId, {
      type: "annotation:updated",
      projectId,
      fileId,
      annotation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast annotation deleted event
   */
  annotationDeleted(projectId, fileId, annotationId) {
    this.broadcastToProject(projectId, {
      type: "annotation:deleted",
      projectId,
      fileId,
      annotationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast view created event
   */
  viewCreated(projectId, view) {
    this.broadcastToProject(projectId, {
      type: "view:created",
      projectId,
      view,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast view updated event
   */
  viewUpdated(projectId, view) {
    this.broadcastToProject(projectId, {
      type: "view:updated",
      projectId,
      view,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast view deleted event
   */
  viewDeleted(projectId, viewId) {
    this.broadcastToProject(projectId, {
      type: "view:deleted",
      projectId,
      viewId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast computation progress
   */
  computeProgress(userId, jobId, progress, message = null) {
    this.broadcastToUser(userId, {
      type: "compute:progress",
      jobId,
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast computation complete
   */
  computeComplete(userId, jobId, result) {
    this.broadcastToUser(userId, {
      type: "compute:complete",
      jobId,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast computation failed
   */
  computeFailed(userId, jobId, error) {
    this.broadcastToUser(userId, {
      type: "compute:failed",
      jobId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get count of connected clients
   */
  getClientCount() {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Get count of clients in a project room
   */
  getProjectClientCount(projectId) {
    const room = this.rooms.get(projectId);
    return room ? room.size : 0;
  }

  /**
   * Cleanup on server shutdown
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

module.exports = wsManager;
