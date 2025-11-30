// server.js - Simple but reliable Yjs relay
const WebSocket = require("ws");
const http = require("http");
const { createLogger } = require("./server/src/utils/logger");

const wsLog = createLogger("ws");
const serverLog = createLogger("server");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store connected clients by room
const rooms = new Map();

wss.on("connection", (socket, req) => {
  // Extract room name from URL (e.g., /vtk-room)
  const roomName = req.url.slice(1) || "vtk-room";
  wsLog.info("Client connected to room:", roomName);

  // Create room if it doesn't exist
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }

  const room = rooms.get(roomName);
  room.add(socket);
  wsLog.debug("Total clients in room:", roomName, room.size);

  // Relay all messages to other clients in the same room
  socket.on("message", (message) => {
    // Broadcast to all other clients in this room
    room.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          wsLog.error("Failed to relay message:", error.message);
        }
      }
    });
  });

  // Handle disconnection
  socket.on("close", () => {
    room.delete(socket);
    wsLog.info("Client disconnected from:", roomName);
    wsLog.debug("Remaining clients:", room.size);

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomName);
      wsLog.debug("Room deleted (empty):", roomName);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    wsLog.error("WebSocket error:", error.message);
  });
});

const PORT = process.env.PORT || 9001;
server.listen(PORT, () => {
  serverLog.info("Yjs relay server running on port:", PORT);
  serverLog.debug("Ready to relay messages between clients");
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
process.on("SIGINT", () => {
  serverLog.info("Shutting down server gracefully...");

  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    serverLog.info("Server closed");
    process.exit(0);
  });
});

serverLog.info("Starting Yjs relay server...");
