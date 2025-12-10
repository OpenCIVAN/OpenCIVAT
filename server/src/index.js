// server/src/index.js
// Main API server for CIA Web v2.0
// Server-authoritative architecture with WebSocket broadcast

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Pool } = require("pg");
const Minio = require("minio");
const { authenticate, optionalAuth } = require("./middleware/auth");
const authRouter = require("./routes/auth");
const wsManager = require("./services/websocket");
const { auditLogger, auditMiddleware } = require("./services/audit");
const { server: log, db, http: httpLog } = require("./utils/logger");

const { createRecordingService } = require("./services/recordingService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "cia_analytics",
  user: process.env.DB_USER || "cia_admin",
  password: process.env.DB_PASSWORD || "cia_password",
});

pool.on("connect", () => {
  db.info("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  db.error("Unexpected error on PostgreSQL client", err);
  process.exit(-1);
});

// ============================================================================
// MINIO CONNECTION
// ============================================================================

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "cia-files";

// Ensure bucket exists
(async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
      log.info(`Created MinIO bucket: ${BUCKET_NAME}`);
    } else {
      log.info(`Connected to MinIO bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    log.error("MinIO initialization error:", error);
  }
})();

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

// Initialize WebSocket manager
wsManager.initialize(server);

// Initialize audit logger
auditLogger.initialize(pool);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration - must specify origin when credentials are used
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Allow localhost on any port for development
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }

    // Allow specific production origins if needed
    const allowedOrigins = (process.env.CORS_ORIGINS || "")
      .split(",")
      .filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // Allow cookies and auth headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    // Dev mode headers for user identification
    "x-user-id",
    "x-user-email",
    "x-user-name",
    "x-organization-id",
    "x-project-id",
  ],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Request logging (only in debug mode via http category)
app.use((req, res, next) => {
  httpLog.debug(`${req.method} ${req.path}`);
  next();
});

// Audit middleware - adds req.audit() helper
app.use(auditMiddleware);

// Make pool, minio, and services available to routes
app.locals.pool = pool;

// Initialize recording service
const recordingService = createRecordingService(pool);
app.locals.recordingService = recordingService;

app.locals.minioClient = minioClient;
app.locals.bucketName = BUCKET_NAME;
app.locals.wsManager = wsManager;
app.locals.auditLogger = auditLogger;

// Auth routes (no auth required for these)
app.use("/api/auth", authRouter);

// ============================================================================
// ROUTES
// ============================================================================

// Legacy routes (keeping for backward compatibility during migration)
const projectsRouter = require("./routes/projects");
app.use("/api/projects", optionalAuth, projectsRouter);

// v2.0 Routes - Server-authority architecture
const filesRouter = require("./routes/files");
const annotationsRouter = require("./routes/annotations");
const viewsRouter = require("./routes/views");
const computeRouter = require("./routes/compute");
const workspaceAnnotationsRouter = require("./routes/workspaceAnnotations");

// Canvas system routes
const canvasesRouter = require("./routes/canvases");
const workspacesRouter = require("./routes/workspaces");
const subsetsRouter = require("./routes/subsets");
const contentRouter = require("./routes/content");

const folderRoutes = require("./routes/folders");
const starRoutes = require("./routes/stars");

// Room management routes (Space Navigation system)
const roomsRouter = require("./routes/rooms");

// Chat routes (Phase 2E - Y.js persistence)
const chatRouter = require("./routes/chat");

// Sync routes (Phase 2E - reconciliation)
const syncRouter = require("./routes/sync");

const recordingsRouter = require("./routes/recordings");

// Saved filters and bookmarks routes
const filtersRouter = require("./routes/filters");
const bookmarksRouter = require("./routes/bookmarks");

// View thumbnails routes (progressive loading)
const thumbnailsRouter = require("./routes/thumbnails");

app.use("/api/files", optionalAuth, filesRouter);
app.use("/api/annotations", optionalAuth, annotationsRouter);
app.use("/api/views", optionalAuth, viewsRouter);
app.use("/api/views", optionalAuth, thumbnailsRouter); // Thumbnail routes nested under views
app.use("/api/compute", optionalAuth, computeRouter);
app.use("/api/workspace-annotations", optionalAuth, workspaceAnnotationsRouter);

// Canvas system endpoints
app.use("/api/canvases", optionalAuth, canvasesRouter);
app.use("/api/workspaces", optionalAuth, workspacesRouter);
app.use("/api/subsets", optionalAuth, subsetsRouter);
app.use("/api/content", optionalAuth, contentRouter);
app.use("/api/placements", optionalAuth, canvasesRouter);

// Note: /api/files/:id/download is now handled by filesRouter

// Folders and stars routes expect :projectId in the path
// The routes use mergeParams: true to access projectId from the mount path
app.use("/api/projects/:projectId/folders", optionalAuth, folderRoutes);
app.use("/api/projects/:projectId/stars", optionalAuth, starRoutes);

// Room management routes (Space Navigation system)
app.use("/api/projects/:projectId/rooms", optionalAuth, roomsRouter);

// Recording routes (nested under projects)
app.use("/api/projects/:projectId/recordings", optionalAuth, recordingsRouter);

// Saved filters and bookmarks routes (nested under projects)
app.use("/api/projects/:projectId/filters", optionalAuth, filtersRouter);
app.use("/api/projects/:projectId/bookmarks", optionalAuth, bookmarksRouter);

// Chat history routes (Phase 2E - Y.js persistence)
// Provides REST access to persisted chat messages for audit and history
app.use("/api", optionalAuth, chatRouter);

// Sync status routes (client reconciliation)
app.use("/api/sync", optionalAuth, syncRouter);

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      version: "2.0.0",
      architecture: "server-authority",
      services: {
        database: "connected",
        minio: "connected",
        websocket: {
          connected: true,
          clients: wsManager.getClientCount(),
        },
        recordings: {
          activeCount: recordingService.getActiveRecordings().length,
          active: recordingService.getActiveRecordings(),
        },
        audit: "active",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// Server status (more detailed)
app.get("/api/status", optionalAuth, async (req, res) => {
  try {
    const dbStatus = await pool.query(
      "SELECT NOW() as time, current_database() as db"
    );

    res.json({
      server: {
        version: "2.0.0",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
      database: {
        connected: true,
        time: dbStatus.rows[0].time,
        name: dbStatus.rows[0].db,
      },
      websocket: {
        totalClients: wsManager.getClientCount(),
        rooms: wsManager.rooms.size,
      },
      audit: {
        bufferSize: auditLogger.buffer.length,
        orgConfigsCached: auditLogger.orgConfigs.size,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get status",
      details: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  log.error("Unhandled error:", err.message);
  log.debug("Stack trace:", err.stack);

  // Log errors to audit (for forensic level)
  if (req.audit && err.status !== 404) {
    req
      .audit({
        action: "error:unhandled",
        entityType: "request",
        entityId: null,
        details: {
          path: req.path,
          method: req.method,
          error: err.message,
        },
      })
      .catch(() => {}); // Don't let audit errors break error handling
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(signal) {
  log.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    log.info("HTTP server closed");
  });

  // Shutdown WebSocket
  wsManager.shutdown();
  log.info("WebSocket server closed");

  // Flush and shutdown audit logger
  await auditLogger.shutdown();

  // Close database pool
  await pool.end();
  log.info("Database pool closed");

  log.info("Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  log.info(`CIA Web API server v2.0 running on port ${PORT}`);
  log.info(`Architecture: Server-Authority`);
  log.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  log.debug(
    `Database: ${process.env.DB_HOST || "localhost"}:${
      process.env.DB_PORT || 5432
    }`
  );
  log.debug(
    `MinIO: ${process.env.MINIO_ENDPOINT || "localhost"}:${
      process.env.MINIO_PORT || 9000
    }`
  );
  log.debug(`WebSocket: ws://localhost:${PORT}/ws`);
  log.debug(
    `Log level: ${
      process.env.LOG_LEVEL || "debug"
    }, Categories: LOG_CATEGORIES env to filter`
  );
});

module.exports = { app, server, pool };
