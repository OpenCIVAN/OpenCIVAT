/**
 * Thumbnail Worker
 *
 * Server-side thumbnail generation using Playwright.
 * Listens to BullMQ queue and renders visualizations in a headless browser.
 *
 * Security: Thumbnails are generated server-side to ensure authenticity.
 * The client cannot inject fake or misleading thumbnails.
 */

const { Worker } = require("bullmq");
const { chromium } = require("playwright");
const { Client: MinioClient } = require("minio");
const sharp = require("sharp");

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    useSSL: process.env.MINIO_SECURE === "true",
    bucket: process.env.MINIO_BUCKET || "cia-files",
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
    apiUrl: process.env.API_URL || "http://localhost:3001",
  },
  thumbnail: {
    width: 400,
    height: 300,
    quality: 80,
    timeout: 30000, // 30 seconds to render
    waitForSelector: '[data-testid="visualization-ready"]',
  },
  queue: {
    name: "thumbnail",
    concurrency: 2, // Process 2 thumbnails at a time
  },
};

// =============================================================================
// LOGGING
// =============================================================================

const log = {
  info: (msg, ...args) =>
    console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args),
  error: (msg, ...args) =>
    console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args),
  debug: (msg, ...args) =>
    console.log(`[${new Date().toISOString()}] [DEBUG] ${msg}`, ...args),
};

// =============================================================================
// MINIO CLIENT
// =============================================================================

const minioClient = new MinioClient({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

// =============================================================================
// BROWSER MANAGEMENT
// =============================================================================

let browser = null;

async function getBrowser() {
  if (!browser) {
    log.info("Launching headless browser...");
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    log.info("Browser launched");
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    log.info("Browser closed");
  }
}

// =============================================================================
// THUMBNAIL CAPTURE
// =============================================================================

/**
 * Capture a thumbnail for a file/view
 *
 * @param {object} job - Job data
 * @param {string} job.fileId - File ID to render
 * @param {string} job.viewId - View configuration ID (optional)
 * @returns {object} - { success, thumbnailKey, format, width, height }
 */
async function captureThumbnail(job) {
  const { fileId, viewId, projectId } = job;

  log.info(`Capturing thumbnail for file=${fileId}, view=${viewId}`);

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: {
      width: config.thumbnail.width * 2, // 2x for retina
      height: config.thumbnail.height * 2,
    },
    deviceScaleFactor: 2,
    // Accept self-signed SSL certificates from webpack dev server
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  try {
    // Build URL to the visualization embed page
    // Include handlerType so embed page knows which handler to use
    // The handlerType is server-determined and passed via job data
    const params = new URLSearchParams({
      mode: viewId ? "view" : "file",
      id: viewId || fileId,
      width: config.thumbnail.width.toString(),
      height: config.thumbnail.height.toString(),
    });

    // Add handlerType if provided (server-authoritative)
    if (job.handlerType) {
      params.set("handlerType", job.handlerType);
    }

    const url = `${config.app.baseUrl}/embed.html?${params.toString()}`;

    log.info(`Navigating to: ${url}`);

    // Navigate and wait for visualization to render
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: config.thumbnail.timeout,
    });

    // Wait for visualization to be ready (custom attribute set by app)
    try {
      await page.waitForSelector(config.thumbnail.waitForSelector, {
        timeout: config.thumbnail.timeout,
      });
    } catch (e) {
      // If selector not found, wait a bit and hope for the best
      log.debug("Visualization ready selector not found, waiting 3s...");
      await page.waitForTimeout(3000);
    }

    // Give extra time for WebGL to finish rendering
    await page.waitForTimeout(500);

    // Find the canvas element specifically - we only want the 3D render, not any UI chrome
    const canvas = await page.$("canvas");

    if (!canvas) {
      throw new Error("No canvas element found on page");
    }

    // Screenshot ONLY the canvas element
    // This captures just the WebGL visualization, not headers/toolbars/etc.
    const screenshot = await canvas.screenshot({
      type: "png",
    });

    log.info("Captured canvas element screenshot");

    // Optimize with sharp
    const optimized = await sharp(screenshot)
      .resize(config.thumbnail.width, config.thumbnail.height)
      .webp({ quality: config.thumbnail.quality })
      .toBuffer();

    // Upload to MinIO
    const storageKey = `thumbnails/${viewId || fileId}/thumbnail.webp`;
    await minioClient.putObject(
      config.minio.bucket,
      storageKey,
      optimized,
      optimized.length,
      { "Content-Type": "image/webp" }
    );

    log.info(`Thumbnail uploaded: ${storageKey}`);

    return {
      success: true,
      storageKey,
      format: "webp",
      width: config.thumbnail.width,
      height: config.thumbnail.height,
      size: optimized.length,
    };
  } catch (error) {
    log.error(`Failed to capture thumbnail: ${error.message}`);
    throw error;
  } finally {
    await context.close();
  }
}

// =============================================================================
// CALLBACK TO API
// =============================================================================

/**
 * Report job completion back to API server
 */
async function reportCompletion(callbackUrl, jobId, result) {
  try {
    log.debug(`Reporting completion to: ${callbackUrl}`);

    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        success: result.success,
        storageKey: result.storageKey,
        format: result.format,
        width: result.width,
        height: result.height,
        error: result.error,
      }),
    });

    if (!response.ok) {
      log.error(`Failed to report completion: ${response.status}`);
    }
  } catch (error) {
    log.error(`Error reporting completion: ${error.message}`);
  }
}

// =============================================================================
// WORKER
// =============================================================================

async function startWorker() {
  log.info("Starting thumbnail worker...");
  log.info(`Redis: ${config.redis.host}:${config.redis.port}`);
  log.info(`App URL: ${config.app.baseUrl}`);
  log.info(`Queue: ${config.queue.name}`);

  const worker = new Worker(
    config.queue.name,
    async (job) => {
      log.info(`Processing job ${job.id}: ${job.name}`);

      try {
        const result = await captureThumbnail(job.data);

        // Report back to API
        if (job.data.callbackUrl) {
          await reportCompletion(job.data.callbackUrl, job.id, result);
        }

        return result;
      } catch (error) {
        log.error(`Job ${job.id} failed: ${error.message}`);

        // Report failure
        if (job.data.callbackUrl) {
          await reportCompletion(job.data.callbackUrl, job.id, {
            success: false,
            error: error.message,
          });
        }

        throw error;
      }
    },
    {
      connection: config.redis,
      concurrency: config.queue.concurrency,
    }
  );

  worker.on("completed", (job, result) => {
    log.info(`Job ${job.id} completed: ${result.storageKey}`);
  });

  worker.on("failed", (job, err) => {
    log.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on("error", (err) => {
    log.error(`Worker error: ${err.message}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    log.info("Received SIGTERM, shutting down...");
    await worker.close();
    await closeBrowser();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    log.info("Received SIGINT, shutting down...");
    await worker.close();
    await closeBrowser();
    process.exit(0);
  });

  log.info("Thumbnail worker started");
}

// Start
startWorker().catch((err) => {
  log.error(`Failed to start worker: ${err.message}`);
  process.exit(1);
});
