// server/src/routes/datasets.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { pool } = require("../index");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

// Uploads directory path
const UPLOAD_DIR = path.join(__dirname, "../../uploads");

/**
 * Extract file type (extension) from filename
 * @param {string} filename - The filename to parse
 * @returns {string} - The lowercase file extension without the dot
 */
function extractFileType(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unknown';
  }
  const parts = filename.split('.');
  if (parts.length < 2) {
    return 'unknown';
  }
  return parts[parts.length - 1].toLowerCase();
}

/**
 * POST /api/datasets/upload
 * Upload a new dataset file
 * This matches what your ServerStorageProvider expects
 */
router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const { originalname, buffer, mimetype, size } = req.file;
    const { uploadedBy } = req.body;

    // Calculate hash of the uploaded file for deduplication
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    console.log(
      `📁 Received upload: ${originalname} (hash: ${hash.substring(0, 16)}...)`
    );

    // Use the fixed session ID for development
    const defaultSessionId = "00000000-0000-0000-0000-000000000001";

    // Check if this file already exists in this session
    const existingDataset = await pool.query(
      `SELECT * FROM datasets 
       WHERE session_id = $1 AND metadata->>'hash' = $2`,
      [defaultSessionId, hash]
    );

    if (existingDataset.rows.length > 0) {
      const existing = existingDataset.rows[0];
      console.log(`✓ File already exists: ${existing.id} (deduplicating)`);

      // Return the existing dataset instead of creating a new one
      return res.status(200).json({
        dataset: existing,
        deduplicated: true,
      });
    }

    // File doesn't exist yet, create new dataset
    const datasetId = uuidv4();
    const storageKey = `${datasetId}-${originalname}`;
    const filePath = path.join(UPLOAD_DIR, storageKey);

    // Extract file type from filename
    const fileType = extractFileType(originalname);

    // Ensure uploads directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Save file to disk
    await fs.writeFile(filePath, buffer);

    // Create session if it doesn't exist
    await pool.query(
      `INSERT INTO sessions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [defaultSessionId, "Default Development Session"]
    );

    // Insert database record with hash in metadata
    const result = await pool.query(
      `INSERT INTO datasets
       (id, session_id, filename, file_size, file_type, mime_type, storage_key, uploaded_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        datasetId,
        defaultSessionId,
        originalname,
        size,
        fileType,
        mimetype,
        storageKey,
        uploadedBy || "anonymous",
        JSON.stringify({ hash }), // Store hash for deduplication
      ]
    );

    console.log("✅ Dataset uploaded:", datasetId, originalname);

    res.status(201).json({ dataset: result.rows[0] });
  } catch (error) {
    console.error("Upload error:", error);
    next(error);
  }
});

/**
 * GET /api/datasets/:datasetId
 * Get dataset metadata
 */
router.get("/:datasetId", async (req, res, next) => {
  try {
    const { datasetId } = req.params;

    const result = await pool.query("SELECT * FROM datasets WHERE id = $1", [
      datasetId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    res.json({ dataset: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/datasets/:datasetId/download
 * For local development, this returns the file directly
 * Later, when you move to S3, this will return a presigned URL
 */
router.get("/:datasetId/download", async (req, res, next) => {
  try {
    const { datasetId } = req.params;

    // Get file information
    const result = await pool.query(
      "SELECT filename, storage_key, mime_type FROM datasets WHERE id = $1",
      [datasetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const { filename, storage_key, mime_type } = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, storage_key);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // For local development, send the file directly
    // Your ServerStorageProvider expects a downloadUrl in the response,
    // but for local development we can send the file directly
    // We'll adjust the ServerStorageProvider to handle both patterns

    res.setHeader("Content-Type", mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/datasets/session/:sessionId
 * List all datasets for a session
 */
router.get("/session/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `SELECT id, filename, file_size, file_type, mime_type, metadata, uploaded_at, uploaded_by
       FROM datasets
       WHERE session_id = $1
       ORDER BY uploaded_at DESC`,
      [sessionId]
    );

    res.json({ datasets: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
