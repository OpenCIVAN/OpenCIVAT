// server/src/index.js
// Main API server for CIA Web

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Minio = require("minio");
const { authenticate, optionalAuth } = require("./middleware/auth");
const authRouter = require("./routes/auth");

const app = express();
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
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on PostgreSQL client", err);
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
      console.log(`✅ Created MinIO bucket: ${BUCKET_NAME}`);
    } else {
      console.log(`✅ Connected to MinIO bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error("❌ MinIO initialization error:", error);
  }
})();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Make pool and minio client available to routes
app.locals.pool = pool;
app.locals.minioClient = minioClient;
app.locals.bucketName = BUCKET_NAME;

// Auth routes (no auth required for these)
app.use("/api/auth", authRouter);

// ============================================================================
// ROUTES
// ============================================================================

const projectsRouter = require("./routes/projects");
// Projects routes - use optionalAuth for now (will require auth later)
app.use("/api/projects", optionalAuth, projectsRouter);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      database: "connected",
      minio: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 CIA Web API server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `   Database: ${process.env.DB_HOST || "localhost"}:${
      process.env.DB_PORT || 5432
    }`
  );
  console.log(
    `   MinIO: ${process.env.MINIO_ENDPOINT || "localhost"}:${
      process.env.MINIO_PORT || 9000
    }`
  );
});

module.exports = app;
