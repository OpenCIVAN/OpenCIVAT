// server.js - Y.js WebSocket Server with PostgreSQL Persistence
//
// Phase 2E: Adds persistence for chat audit trail, session recording foundation,
// and state hydration on reconnect.
//
// Architecture:
// - Y.js handles presence data only (cursors, avatars, chat)
// - PostgreSQL stores snapshots (fast hydration), updates (recording), chat (audit)
// - Datasets, views, annotations use REST API (not Y.js)

const WebSocket = require("ws");
const http = require("http");
const Y = require("yjs");
const { encoding, decoding } = require("lib0");
const syncProtocol = require("y-protocols/sync");
const awarenessProtocol = require("y-protocols/awareness");
const { createLogger } = require("./server/src/utils/logger");
const {
  YjsPersistenceService,
} = require("./server/src/services/yjsPersistence");

const wsLog = createLogger("ws");
const serverLog = createLogger("server");
const syncLog = createLogger("sync");
const recordingLog = createLogger("recording");

// Message types (Y.js protocol)
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_AUTH = 2;
const MESSAGE_QUERY_AWARENESS = 3;

// Build database connection config from environment
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "cia_analytics",
  user: process.env.DB_USER || "ciauser",
  password: process.env.DB_PASSWORD || "ciadevpassword",
};

// Initialize persistence service
let persistence = null;
try {
  persistence = YjsPersistenceService.create(dbConfig);
  syncLog.info("Y.js persistence service initialized");
} catch (err) {
  syncLog.error("Failed to initialize persistence:", err.message);
  syncLog.warn("Running without persistence - data will not be saved");
}

/**
 * Active recording cache
 * Maps projectId -> { recordingId, startTime, eventCount }
 */
const activeRecordings = new Map();

/**
 * Cursor throttling state
 * Maps clientId -> { x, y, z, timestamp }
 */
const lastCursorPositions = new Map();

// Cursor recording settings
const CURSOR_THROTTLE_MS = 66;   // ~15 fps
const MIN_CURSOR_MOVEMENT = 0.005; // 0.5% viewport threshold

/**
 * Refresh active recordings cache from database
 */
async function refreshActiveRecordings() {
  if (!persistence?.pool) return;

  try {
    const result = await persistence.pool.query(`
      SELECT id, project_id, started_at
      FROM session_recordings
      WHERE status = 'recording'
    `);

    // Clear and rebuild cache
    activeRecordings.clear();

    for (const row of result.rows) {
      activeRecordings.set(row.project_id, {
        recordingId: row.id,
        startTime: new Date(row.started_at).getTime(),
        eventCount: 0,
      });
    }

    if (result.rows.length > 0) {
      recordingLog.debug(`Recording cache: ${result.rows.length} active`);
    }
  } catch (err) {
    recordingLog.error("Failed to refresh recordings cache:", err.message);
  }
}

/**
 * Check if cursor update should be recorded (throttle + delta filter)
 */
function shouldRecordCursor(clientId, cursor) {
  if (!cursor) return false;

  const now = Date.now();
  const last = lastCursorPositions.get(clientId);

  // Time throttle
  if (last && (now - last.timestamp) < CURSOR_THROTTLE_MS) {
    return false;
  }

  // Delta filter - skip if barely moved
  if (last) {
    const dx = Math.abs((cursor.x || 0) - (last.x || 0));
    const dy = Math.abs((cursor.y || 0) - (last.y || 0));
    const dz = Math.abs((cursor.z || 0) - (last.z || 0));

    if (dx < MIN_CURSOR_MOVEMENT && dy < MIN_CURSOR_MOVEMENT && dz < MIN_CURSOR_MOVEMENT) {
      return false;
    }
  }

  // Update last position
  lastCursorPositions.set(clientId, {
    x: cursor.x || 0,
    y: cursor.y || 0,
    z: cursor.z || 0,
    timestamp: now,
  });

  return true;
}

/**
 * Clean up cursor state when client disconnects
 */
function cleanupClientCursor(clientId) {
  lastCursorPositions.delete(clientId);
}

/**
 * Store an event to recording_events table
 * @param {string} projectId - Project UUID
 * @param {string} eventType - Type: 'yjs_update', 'chat', 'cursor', 'awareness'
 * @param {string} eventSource - More specific: 'chat:message', 'cursor:move', etc.
 * @param {object} eventData - Event payload
 * @param {string} userId - Optional user UUID
 * @param {number} clientId - Y.js awareness client ID
 */
async function recordEvent(projectId, eventType, eventSource, eventData, userId = null, clientId = null) {
  const recording = activeRecordings.get(projectId);
  if (!recording || !persistence?.pool) return;

  try {
    const timestampOffset = Date.now() - recording.startTime;

    await persistence.pool.query(
      `INSERT INTO recording_events
       (recording_id, timestamp_offset_ms, event_type, event_source, event_data, user_id, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recording.recordingId,
        timestampOffset,
        eventType,
        eventSource,
        JSON.stringify(eventData),
        userId,
        clientId ? String(clientId) : null,
      ]
    );

    recording.eventCount++;

    // Log every 100 events
    if (recording.eventCount % 100 === 0) {
      recordingLog.debug(
        `Recording ${recording.recordingId}: ${recording.eventCount} events`
      );
    }
  } catch (err) {
    recordingLog.error("Failed to record event:", err.message);
  }
}

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/**
 * Room state - holds Y.Doc and connected clients
 */
class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.clients = new Set();
    this.projectId = null;
    this.isLoaded = false;
    this.lastUpdateId = null;
    // Track which message IDs we've already persisted to avoid duplicates
    this.persistedMessageIds = new Set();

    // Track chat messages for persistence
    this.setupChatObserver();
  }

  /**
   * Set up observer to detect new chat messages
   */
  setupChatObserver() {
    const chatArray = this.doc.getArray("chatMessages");

    chatArray.observe((event) => {
      // Process chat message inserts from Y.js delta
      event.changes.delta.forEach((change) => {
        if (change.insert) {
          change.insert.forEach((message) => {
            // Skip if already persisted (by ID)
            if (
              message &&
              message.id &&
              !this.persistedMessageIds.has(message.id)
            ) {
              this.persistedMessageIds.add(message.id);
              this.persistChatMessage(message);
            }
          });
        }
      });
    });

    wsLog.debug("Chat observer set up for room:", this.roomId);
  }

  /**
   * Persist a chat message to the database
   * UPDATED: Also records to recording_events if recording is active
   */
  async persistChatMessage(message) {
    if (!persistence) return;

    try {
      const { userName, text, timestamp, messageType, metadata, id: messageId } = message;

      await persistence.storeChatMessage(
        this.roomId,
        this.projectId,
        null, // userId - null until proper auth is implemented
        userName || "Anonymous",
        text || "",
        null,
        {
          clientTimestamp: timestamp,
          messageType: messageType || "text",
          ...metadata,
        }
      );

      wsLog.debug("Chat persisted:", userName, "in", this.roomId);

      // Record chat message to recording_events
      if (this.projectId && activeRecordings.has(this.projectId)) {
        await recordEvent(
          this.projectId,
          "chat",
          "chat:message",
          {
            messageId,
            userName,
            text: text?.substring(0, 500), // Truncate for storage
            messageType: messageType || "text",
            timestamp,
          },
          null,
          null
        );
      }
    } catch (err) {
      wsLog.error("Failed to persist chat:", err.message);
    }
  }

  /**
   * Load document state from database
   */
  async loadFromDB() {
    if (!persistence || this.isLoaded) return;

    try {
      const docRecord = await persistence.getOrCreateDocument(
        this.roomId,
        this.projectId
      );

      if (docRecord.documentState && docRecord.documentState.length > 0) {
        Y.applyUpdate(this.doc, docRecord.documentState);
        syncLog.info(
          "Loaded Y.Doc state for room:",
          this.roomId,
          "version:",
          docRecord.snapshotVersion
        );
      }

      this.lastUpdateId = docRecord.lastUpdateId;
      this.isLoaded = true;

      // Schedule periodic snapshots
      persistence.scheduleSnapshots(this.roomId, () =>
        Y.encodeStateAsUpdate(this.doc)
      );
    } catch (err) {
      syncLog.error("Failed to load document:", this.roomId, err.message);
    }
  }

  /**
   * Store a Y.js update to the database
   * UPDATED: Also records to recording_events if recording is active
   */
  async storeUpdate(update, origin, userId, clientId) {
    if (!persistence) return;

    try {
      // Existing persistence logic
      const result = await persistence.storeUpdate(
        this.roomId,
        update,
        origin,
        userId,
        clientId
      );

      if (result) {
        this.lastUpdateId = result.id;
      }

      // NEW: Record to recording_events if active
      if (this.projectId && activeRecordings.has(this.projectId)) {
        // Skip noisy cursor/awareness updates unless you want them
        if (origin !== "cursor" && origin !== "presence" && origin !== "avatar") {
          await recordEvent(
            this.projectId,
            "yjs_update",
            origin ? `yjs:${origin}` : "yjs:unknown",
            {
              updateSize: update.length,
              origin,
              sequenceNum: result?.sequenceNum,
            },
            userId,
            clientId
          );
        }
      }
    } catch (err) {
      syncLog.error("Failed to store update:", err.message);
    }
  }

  /**
   * Final snapshot when room is closed
   */
  async close() {
    if (!persistence) return;

    try {
      const state = Y.encodeStateAsUpdate(this.doc);
      await persistence.finalSnapshot(this.roomId, state);
    } catch (err) {
      syncLog.error("Failed to save final snapshot:", err.message);
    }
  }
}

// Store rooms by name
const rooms = new Map();

/**
 * Get or create a room
 */
async function getOrCreateRoom(roomName) {
  if (!rooms.has(roomName)) {
    const room = new Room(roomName);
    rooms.set(roomName, room);

    // Load state from database
    await room.loadFromDB();
  }

  return rooms.get(roomName);
}

/**
 * Send sync step 1 to a new client
 */
function sendSyncStep1(socket, doc) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(socket, encoding.toUint8Array(encoder));
}

/**
 * Send awareness update to client
 */
function sendAwarenessUpdate(socket, awareness, changedClients) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
  );
  send(socket, encoding.toUint8Array(encoder));
}

/**
 * Broadcast to all clients in room except sender
 */
function broadcastToRoom(room, message, excludeSocket = null) {
  room.clients.forEach((client) => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        wsLog.error("Failed to broadcast:", error.message);
      }
    }
  });
}

/**
 * Safe send wrapper
 */
function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(message);
    } catch (error) {
      wsLog.error("Failed to send:", error.message);
    }
  }
}

/**
 * Handle incoming Y.js protocol messages
 */
async function handleMessage(socket, room, message) {
  try {
    const decoder = decoding.createDecoder(new Uint8Array(message));
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        handleSyncMessage(socket, room, decoder, message);
        break;

      case MESSAGE_AWARENESS:
        handleAwarenessMessage(socket, room, decoder, message);
        break;

      case MESSAGE_QUERY_AWARENESS:
        // Client requesting awareness state
        sendAwarenessUpdate(
          socket,
          room.awareness,
          Array.from(room.awareness.getStates().keys())
        );
        break;

      default:
        wsLog.warn("Unknown message type:", messageType);
    }
  } catch (error) {
    wsLog.error("Error handling message:", error.message);
  }
}

/**
 * Handle Y.js sync protocol messages
 */
function handleSyncMessage(socket, room, decoder, rawMessage) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);

  const syncMessageType = syncProtocol.readSyncMessage(
    decoder,
    encoder,
    room.doc,
    socket
  );

  // If we have a response to send back
  if (encoding.length(encoder) > 1) {
    send(socket, encoding.toUint8Array(encoder));
  }

  // Sync step 2 or update - relay to other clients
  if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
    // State received from client - could store snapshot here
    syncLog.trace("Received sync step 2 from client in room:", room.roomId);
  } else if (syncMessageType === syncProtocol.messageYjsUpdate) {
    // This is an update - relay to others
    broadcastToRoom(room, rawMessage, socket);

    // Store update for recording (excluding noisy cursor updates)
    // The update origin is determined by observing the doc changes
    const update = decoding.readVarUint8Array(
      decoding.createDecoder(new Uint8Array(rawMessage).slice(2))
    );

    // Try to determine update origin from content
    const origin = detectUpdateOrigin(room.doc, update);
    room.storeUpdate(
      update,
      origin,
      socket.userId || null,
      socket.clientId || null
    );
  }
}

/**
 * Handle awareness protocol messages
 */
function handleAwarenessMessage(socket, room, decoder, rawMessage) {
  const update = decoding.readVarUint8Array(decoder);
  awarenessProtocol.applyAwarenessUpdate(room.awareness, update, socket);

  // Relay to other clients
  broadcastToRoom(room, rawMessage, socket);

  // Record cursor if recording is active
  if (room.projectId && activeRecordings.has(room.projectId)) {
    try {
      const states = room.awareness.getStates();
      const localState = states.get(socket.clientId);

      if (localState?.cursor && shouldRecordCursor(socket.clientId, localState.cursor)) {
        // Don't await - fire and forget for performance
        recordEvent(
          room.projectId,
          "cursor",
          "cursor:move",
          {
            cursor: localState.cursor,
            user: localState.user ? {
              name: localState.user.name,
              color: localState.user.color,
            } : null,
          },
          socket.userId,
          socket.clientId
        );
      }
    } catch (err) {
      // Silent fail for cursor recording
    }
  }
}

/**
 * Detect update origin by examining what changed in the doc
 * This is heuristic - could be improved with client-side tagging
 */
function detectUpdateOrigin(doc, update) {
  // Check common Y.js shared types
  // Chat typically uses an array named "chatMessages"
  // Cursors use awareness or a map named "cursors"
  // This is a simplified heuristic

  try {
    // Create temp doc to see what the update affects
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, Y.encodeStateAsUpdate(doc));
    Y.applyUpdate(tempDoc, update);

    // Check what changed
    // (In a real implementation, you'd track this client-side)
    return "chat"; // Default to chat for now
  } catch {
    return null;
  }
}

/**
 * Handle new WebSocket connection
 */
wss.on("connection", async (socket, req) => {
  // Parse URL and query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomName = url.searchParams.get("room") || url.pathname.slice(1) || "default";

  // Extract projectId if present in room name or URL
  // Convention: room name format is "project:{projectId}" or just projectId
  let projectId = null;
  if (roomName.startsWith("project:")) {
    projectId = roomName.split(":")[1];
  } else if (roomName.match(/^[0-9a-f-]{36}$/i)) {
    // Looks like a UUID, treat as projectId
    projectId = roomName;
  }

  // Parse user info from query params
  socket.userId = url.searchParams.get("userId") || null;
  socket.username = url.searchParams.get("username") || "Anonymous";
  socket.clientId = null; // Will be set from awareness

  wsLog.info("Client connected to room:", roomName, "user:", socket.username);

  // Get or create room
  const room = await getOrCreateRoom(roomName);
  room.clients.add(socket);

  // Set projectId on room if we extracted it
  if (projectId && !room.projectId) {
    room.projectId = projectId;

    // Check if this project has an active recording
    await refreshActiveRecordings();
  }

  wsLog.debug("Total clients in room:", roomName, room.clients.size);

  // Send initial sync step 1 (request client state)
  sendSyncStep1(socket, room.doc);

  // Send current awareness state
  const awarenessStates = Array.from(room.awareness.getStates().keys());
  if (awarenessStates.length > 0) {
    sendAwarenessUpdate(socket, room.awareness, awarenessStates);
  }

  // Handle incoming messages
  socket.on("message", (message) => {
    handleMessage(socket, room, message);
  });

  // Handle disconnection
  socket.on("close", async () => {
    room.clients.delete(socket);

    // Clean up cursor state
    cleanupClientCursor(socket.clientId);

    // Remove from awareness
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [room.doc.clientID],
      "disconnect"
    );

    wsLog.info("Client disconnected from:", roomName);
    wsLog.debug("Remaining clients:", room.clients.size);

    // Clean up empty rooms
    if (room.clients.size === 0) {
      // Store final snapshot
      await room.close();

      rooms.delete(roomName);
      wsLog.debug("Room closed and saved:", roomName);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    wsLog.error("WebSocket error:", error.message);
  });
});

// Listen for awareness changes to broadcast
// This is done per-room when clients join

const PORT = process.env.PORT || 9001;

// Refresh active recordings cache on startup
refreshActiveRecordings();

// Refresh every 30 seconds to catch new recordings
setInterval(refreshActiveRecordings, 30000);

server.listen(PORT, () => {
  serverLog.info("Y.js WebSocket server running on port:", PORT);
  serverLog.info(
    "PostgreSQL persistence:",
    persistence ? "enabled" : "disabled"
  );
  serverLog.info(
    "Recording integration:",
    persistence?.pool ? "enabled" : "disabled"
  );
  serverLog.debug("Database host:", dbConfig.host);
  serverLog.debug("Ready for connections");
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    serverLog.error("Port already in use:", PORT);
    serverLog.error("Kill the process using port", PORT, "or change the port.");
    process.exit(1);
  } else {
    serverLog.error("Server error:", error);
  }
});

// Graceful shutdown
async function shutdown() {
  serverLog.info("Shutting down server gracefully...");

  // Close all rooms (saves final snapshots)
  for (const [roomName, room] of rooms) {
    serverLog.debug("Closing room:", roomName);
    await room.close();
  }

  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });

  // Shutdown persistence service
  if (persistence) {
    await persistence.shutdown();
  }

  server.close(() => {
    serverLog.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

serverLog.info("Starting Y.js WebSocket server with persistence...");