// server/src/routes/compute.js
// Computation job management for v2.0 server-authority architecture
// Handles job submission, status tracking, and result retrieval

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const {
  workerRegistry,
  WORKER_TYPES,
  OPERATION_WORKER_MAP,
  handleWorkerRegistration,
  handleWorkerHeartbeat,
  handleWorkerDeregistration,
} = require("../services/workerRegistry");
const { compute: log } = require("../utils/logger");

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get user info from request
 */
function getUser(req) {
  return {
    id: req.user?.id || "00000000-0000-0000-0000-000000000001",
    email: req.user?.email || "demo@cia-web.local",
  };
}

/**
 * Generate cache key from operation parameters
 */
function generateCacheKey(fileId, fileVersionId, operation, params) {
  const data = JSON.stringify({ fileId, fileVersionId, operation, params });
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ============================================================================
// JOB ENDPOINTS
// ============================================================================

/**
 * GET /api/compute/jobs
 * List computation jobs
 */
router.get("/jobs", async (req, res, next) => {
  try {
    const user = getUser(req);
    const { pool } = req.app.locals;
    const {
      status,
      operation,
      fileId,
      projectId,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT j.*,
             d.filename as file_name
      FROM computation_jobs j
      LEFT JOIN datasets d ON j.file_id = d.id
      WHERE j.requested_by = $1
    `;
    const values = [user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND j.status = $${paramIndex++}`;
      values.push(status);
    }

    if (operation) {
      query += ` AND j.operation = $${paramIndex++}`;
      values.push(operation);
    }

    if (fileId) {
      query += ` AND j.file_id = $${paramIndex++}`;
      values.push(fileId);
    }

    if (projectId) {
      query += ` AND j.project_id = $${paramIndex++}`;
      values.push(projectId);
    }

    query += ` ORDER BY j.queued_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json({
      jobs: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/compute/jobs/:id
 * Get job status and details
 */
router.get("/jobs/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      `
      SELECT j.*,
             d.filename as file_name,
             c.result_storage_key,
             c.result_metadata
      FROM computation_jobs j
      LEFT JOIN datasets d ON j.file_id = d.id
      LEFT JOIN computation_cache c ON j.cache_id = c.id
      WHERE j.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ job: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/compute/jobs
 * Submit a new computation job
 */
router.post("/jobs", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const user = getUser(req);
    const {
      fileId,
      projectId,
      operation,
      params = {},
      priority = "normal",
    } = req.body;

    if (!fileId || !operation) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["fileId", "operation"],
      });
    }

    // Verify file exists and get version
    const fileCheck = await pool.query(
      "SELECT id, current_version_id, organization_id FROM datasets WHERE id = $1 AND status = 'active'",
      [fileId]
    );

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileCheck.rows[0];
    const fileVersionId = file.current_version_id;

    // Generate cache key to check for existing result
    const cacheKey = generateCacheKey(fileId, fileVersionId, operation, params);

    // Check cache first
    const cacheCheck = await pool.query(
      "SELECT * FROM computation_cache WHERE cache_key = $1",
      [cacheKey]
    );

    if (cacheCheck.rows.length > 0) {
      // Update access tracking
      await pool.query(
        "UPDATE computation_cache SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE cache_key = $1",
        [cacheKey]
      );

      // Audit log
      if (req.audit) {
        await req.audit({
          action: "compute:cache_hit",
          orgId: file.organization_id,
          projectId,
          entityType: "computation",
          entityId: cacheCheck.rows[0].id,
          details: { operation, cacheKey },
        });
      }

      return res.json({
        success: true,
        cached: true,
        cacheId: cacheCheck.rows[0].id,
        result: cacheCheck.rows[0].result_metadata,
      });
    }

    // Check for existing in-progress job with same params
    const existingJob = await pool.query(
      `
      SELECT * FROM computation_jobs
      WHERE file_id = $1 AND file_version_id = $2 AND operation = $3
        AND params = $4 AND status IN ('queued', 'processing')
    `,
      [fileId, fileVersionId, operation, JSON.stringify(params)]
    );

    if (existingJob.rows.length > 0) {
      return res.json({
        success: true,
        existing: true,
        job: existingJob.rows[0],
        message: "Job already in progress",
      });
    }

    // Create new job
    const result = await pool.query(
      `
      INSERT INTO computation_jobs (
        file_id, file_version_id, project_id,
        operation, params, priority,
        requested_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        fileId,
        fileVersionId,
        projectId || null,
        operation,
        JSON.stringify(params),
        priority,
        user.id,
      ]
    );

    const job = result.rows[0];

    // Audit log
    if (req.audit) {
      await req.audit({
        action: "compute:request",
        orgId: file.organization_id,
        projectId,
        entityType: "computation",
        entityId: job.id,
        details: { operation, params, priority },
      });
    }

    // TODO: Publish job to worker queue (BullMQ/Redis)
    // await jobQueue.add(operation, { jobId: job.id, fileId, params });

    res.status(201).json({
      success: true,
      job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/compute/jobs/:id/cancel
 * Cancel a queued or processing job
 */
router.post("/jobs/:id/cancel", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { id } = req.params;
    const user = getUser(req);

    // Get job and verify ownership
    const jobCheck = await pool.query(
      "SELECT * FROM computation_jobs WHERE id = $1",
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobCheck.rows[0];

    if (job.requested_by !== user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to cancel this job" });
    }

    if (!["queued", "processing"].includes(job.status)) {
      return res.status(400).json({
        error: "Cannot cancel job",
        message: `Job is already ${job.status}`,
      });
    }

    // Cancel job
    await pool.query(
      "UPDATE computation_jobs SET status = 'cancelled', completed_at = NOW() WHERE id = $1",
      [id]
    );

    // Notify user via WebSocket
    if (wsManager) {
      wsManager.computeFailed(user.id, id, "Job cancelled by user");
    }

    res.json({ success: true, message: "Job cancelled" });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CACHE ENDPOINTS
// ============================================================================

/**
 * GET /api/compute/cache
 * List cached computation results
 */
router.get("/cache", async (req, res, next) => {
  try {
    const { pool } = req.app.locals;
    const { fileId, operation, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT c.*,
             d.filename as file_name
      FROM computation_cache c
      LEFT JOIN datasets d ON c.file_id = d.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (fileId) {
      query += ` AND c.file_id = $${paramIndex++}`;
      values.push(fileId);
    }

    if (operation) {
      query += ` AND c.operation = $${paramIndex++}`;
      values.push(operation);
    }

    query += ` ORDER BY c.last_accessed_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, values);

    res.json({
      cache: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/compute/cache/:id
 * Get cached result
 */
router.get("/cache/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;

    const result = await pool.query(
      "SELECT * FROM computation_cache WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cache entry not found" });
    }

    // Update access tracking
    await pool.query(
      "UPDATE computation_cache SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE id = $1",
      [id]
    );

    res.json({ cache: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/compute/cache/:id/download
 * Download cached result data
 */
router.get("/cache/:id/download", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pool, minioClient, bucketName } = req.app.locals;

    const result = await pool.query(
      "SELECT * FROM computation_cache WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cache entry not found" });
    }

    const cache = result.rows[0];

    if (!cache.result_storage_key) {
      return res.status(404).json({ error: "No downloadable result" });
    }

    // Update access tracking
    await pool.query(
      "UPDATE computation_cache SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE id = $1",
      [id]
    );

    // Fetch from MinIO
    const dataStream = await minioClient.getObject(
      bucketName,
      cache.result_storage_key
    );

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="result-${id}.bin"`
    );

    dataStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/compute/cache/:id
 * Invalidate a cache entry
 */
router.delete("/cache/:id", async (req, res, next) => {
  const { pool, minioClient, bucketName } = req.app.locals;

  try {
    const { id } = req.params;

    // Get cache entry
    const result = await pool.query(
      "SELECT * FROM computation_cache WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cache entry not found" });
    }

    const cache = result.rows[0];

    // Delete from MinIO if storage key exists
    if (cache.result_storage_key) {
      try {
        await minioClient.removeObject(bucketName, cache.result_storage_key);
      } catch (err) {
        log.warn("Failed to delete cache object from MinIO:", err.message);
      }
    }

    // Delete from database
    await pool.query("DELETE FROM computation_cache WHERE id = $1", [id]);

    res.json({ success: true, message: "Cache entry deleted" });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SUPPORTED OPERATIONS
// ============================================================================

/**
 * GET /api/compute/operations
 * List available computation operations
 */
router.get("/operations", (req, res) => {
  // Get supported operations from worker registry
  const supportedOps = workerRegistry.getSupportedOperations();

  // Static operation definitions (could be moved to worker registry)
  const operationDefs = [
    {
      name: "decimate-point-cloud",
      description: "Reduce point cloud point count",
      category: "point_cloud",
      params: {
        targetReduction: { type: "number", min: 0, max: 0.99, default: 0.5 },
      },
    },
    {
      name: "point-cloud-to-mesh",
      description: "Convert point cloud to mesh surface",
      category: "point_cloud",
      params: {
        method: {
          type: "string",
          enum: ["poisson", "ball-pivot"],
          default: "poisson",
        },
      },
    },
    {
      name: "extract-isosurface",
      description: "Extract isosurface from volume",
      category: "isosurface",
      params: {
        isovalue: { type: "number" },
        field: { type: "string" },
      },
    },
    {
      name: "decimate-mesh",
      description: "Reduce mesh polygon count",
      category: "decimation",
      params: {
        targetReduction: { type: "number", min: 0, max: 0.99, default: 0.5 },
      },
    },
    {
      name: "smooth-mesh",
      description: "Smooth mesh surface",
      category: "mesh",
      params: {
        iterations: { type: "integer", min: 1, max: 100, default: 20 },
        relaxationFactor: { type: "number", min: 0, max: 1, default: 0.1 },
      },
    },
    {
      name: "clip-mesh",
      description: "Clip mesh with plane",
      category: "mesh",
      params: {
        origin: { type: "array", items: "number", length: 3 },
        normal: { type: "array", items: "number", length: 3 },
      },
    },
    {
      name: "compute-bounds",
      description: "Calculate data bounding box",
      category: "general",
      params: {},
    },
    {
      name: "compute-histogram",
      description: "Calculate field histogram",
      category: "general",
      params: {
        field: { type: "string" },
        bins: { type: "integer", default: 100 },
      },
    },
  ];

  // Filter to only supported operations
  const operations = operationDefs.filter((op) =>
    supportedOps.includes(op.name)
  );

  res.json({
    operations,
    workerStatus: workerRegistry.getStatus(),
  });
});

// ============================================================================
// WORKER REGISTRY ENDPOINTS
// ============================================================================

/**
 * GET /api/compute/workers
 * Get status of all registered workers
 */
router.get("/workers", (req, res) => {
  const status = workerRegistry.getStatus();
  res.json(status);
});

/**
 * POST /api/compute/workers/register
 * Self-registration endpoint for workers
 */
router.post("/workers/register", (req, res) => {
  const { id, type, url, capabilities } = req.body;

  if (!id || !type || !url) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["id", "type", "url"],
    });
  }

  const result = handleWorkerRegistration({ id, type, url, capabilities });

  if (result.success) {
    log.info(`Worker self-registered: ${id}`);
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

/**
 * POST /api/compute/workers/:id/heartbeat
 * Heartbeat endpoint for workers
 */
router.post("/workers/:id/heartbeat", (req, res) => {
  const { id } = req.params;

  const result = handleWorkerHeartbeat(id);
  res.json(result);
});

/**
 * DELETE /api/compute/workers/:id
 * Deregistration endpoint for workers
 */
router.delete("/workers/:id", (req, res) => {
  const { id } = req.params;

  const result = handleWorkerDeregistration(id);
  res.json(result);
});

// ============================================================================
// WORKER CALLBACK ENDPOINTS (internal use)
// ============================================================================

/**
 * POST /api/compute/internal/job-progress
 * Update job progress (called by workers)
 */
router.post("/internal/job-progress", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { jobId, progress, message } = req.body;

    // Update job progress
    await pool.query(
      "UPDATE computation_jobs SET progress = $1 WHERE id = $2",
      [progress, jobId]
    );

    // Get job to find user
    const job = await pool.query(
      "SELECT requested_by FROM computation_jobs WHERE id = $1",
      [jobId]
    );

    if (job.rows.length > 0 && wsManager) {
      wsManager.computeProgress(
        job.rows[0].requested_by,
        jobId,
        progress,
        message
      );
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/compute/internal/job-complete
 * Mark job as complete (called by workers)
 */
router.post("/internal/job-complete", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;
  const client = await pool.connect();

  try {
    const {
      jobId,
      cacheKey,
      resultStorageKey,
      resultMetadata,
      computeTimeMs,
      resultSizeBytes,
    } = req.body;

    await client.query("BEGIN");

    // Create cache entry
    const cacheResult = await client.query(
      `
      INSERT INTO computation_cache (
        cache_key, file_id, file_version_id, operation, params,
        result_storage_key, result_metadata,
        compute_time_ms, result_size_bytes
      )
      SELECT $1, file_id, file_version_id, operation, params, $2, $3, $4, $5
      FROM computation_jobs WHERE id = $6
      RETURNING id
    `,
      [
        cacheKey,
        resultStorageKey,
        resultMetadata,
        computeTimeMs,
        resultSizeBytes,
        jobId,
      ]
    );

    const cacheId = cacheResult.rows[0]?.id;

    // Update job status
    await client.query(
      `
      UPDATE computation_jobs
      SET status = 'complete', progress = 100, completed_at = NOW(),
          cache_id = $1, result_metadata = $2
      WHERE id = $3
    `,
      [cacheId, resultMetadata, jobId]
    );

    await client.query("COMMIT");

    // Get job to notify user
    const job = await pool.query(
      "SELECT requested_by FROM computation_jobs WHERE id = $1",
      [jobId]
    );

    if (job.rows.length > 0 && wsManager) {
      wsManager.computeComplete(job.rows[0].requested_by, jobId, {
        cacheId,
        metadata: resultMetadata,
      });
    }

    res.json({ success: true, cacheId });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

/**
 * POST /api/compute/internal/job-failed
 * Mark job as failed (called by workers)
 */
router.post("/internal/job-failed", async (req, res, next) => {
  const { pool, wsManager } = req.app.locals;

  try {
    const { jobId, error } = req.body;

    // Update job status
    await pool.query(
      `
      UPDATE computation_jobs
      SET status = 'failed', completed_at = NOW(), error_message = $1
      WHERE id = $2
    `,
      [error, jobId]
    );

    // Get job to notify user
    const job = await pool.query(
      "SELECT requested_by FROM computation_jobs WHERE id = $1",
      [jobId]
    );

    if (job.rows.length > 0 && wsManager) {
      wsManager.computeFailed(job.rows[0].requested_by, jobId, error);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
