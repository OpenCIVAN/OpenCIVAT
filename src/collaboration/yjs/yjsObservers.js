// src/collaboration/yjs/yjsObservers.js
// Y.js observers that watch for remote changes and update local state
//
// v2.0 ARCHITECTURE: Most observers are now DEPRECATED
// ============================================================================
// In v2.0, persistent state comes from SERVER via REST API + WebSocket:
// - Datasets → fetched from /api/files, updates via WebSocket
// - Annotations → fetched from /api/annotations, updates via WebSocket
// - Views → fetched from /api/views, updates via WebSocket
//
// Y.js observers are only used for PRESENCE:
// - Cursor positions (initializeCursorObserver)
// - VR avatars (initializeAvatarObserver)
// - View presence (who's viewing what)
//
// The legacy state observers below are kept for backward compatibility
// but are marked as deprecated and will be removed in a future version.
// ============================================================================

import {
  yDatasets,
  yInstances,
  yAnnotations,
  yCursors,
  yAvatars,
  yViewPresence,
} from "@Collaboration/yjs/yjsSetup.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { datasetManager } from "@Init/appInitializer.js";
import { Dataset } from "@Core/data/models/Dataset.js";
import { sync as log } from "@Utils/logger.js";

// ----------------------------------------------------------------------------
// System Readiness
// Prevents processing remote datasets before username is set
// ----------------------------------------------------------------------------

let isSystemReady = false;
let pendingDatasets = new Map(); // Store datasets received before we're ready

/**
 * Call this AFTER the username modal is dismissed
 * This signals that we're ready to process remote datasets
 */
export function markSystemReady() {
  log.info("System marked as ready - processing pending datasets");
  isSystemReady = true;
  // Process any datasets that arrived while we were waiting
  processPendingDatasets();
}

/**
 * Process datasets that arrived before system was ready
 */
async function processPendingDatasets() {
  if (pendingDatasets.size === 0) {
    log.debug("No pending datasets to process");
    return;
  }

  log.debug("Processing pending datasets:", pendingDatasets.size);

  for (const [datasetId, metadata] of pendingDatasets.entries()) {
    await processRemoteDataset(datasetId, metadata);
  }

  pendingDatasets.clear();
  log.info("All pending datasets processed");
}

/**
 * Handle a remote dataset (either immediately or queue it)
 */
async function handleRemoteDataset(datasetId, metadata) {
  // If system isn't ready yet, queue it
  if (!isSystemReady) {
    log.info(`Queueing dataset ${datasetId} (system not ready yet)`);
    pendingDatasets.set(datasetId, metadata);
    return;
  }

  // System is ready, process immediately
  await processRemoteDataset(datasetId, metadata);
}

// src/collaboration/yjs/yjsObservers.js

/**
 * Validate that a serverId exists on the server
 * Returns true if valid, false if the server returns 404
 */
async function validateServerIdExists(serverId, publicPath) {
  if (!serverId && !publicPath) return false;

  const checkUrl =
    publicPath ||
    `${window.CIA?.config?.apiBaseUrl || ""}/api/files/${serverId}/download`;

  try {
    // Use HEAD request to check existence without downloading
    const response = await fetch(checkUrl, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    log.warn(`   ⚠️ Server validation failed:`, error.message);
    return false;
  }
}

/**
 * Remove a stale dataset entry from Y.js
 * This cleans up datasets that reference non-existent server resources
 */
function removeStaleYjsDataset(datasetId) {
  log.info(`🗑️ Removing stale Y.js dataset: ${datasetId}`);
  try {
    yDatasets.delete(datasetId);
    log.debug("Removing stale entry from Y.js");
  } catch (error) {
    log.error(`Failed to remove stale dataset:`, error);
  }
}

/**
 * Clear all datasets from Y.js (manual cleanup utility)
 * Access via: window.CIA.clearYjsDatasets()
 */
export function clearAllYjsDatasets() {
  log.info("🗑️ Clearing all Y.js datasets...");
  const keys = Array.from(yDatasets.keys());
  log.debug(`Found ${keys.length} dataset(s) to clear`);

  keys.forEach((key) => {
    yDatasets.delete(key);
  });

  log.info("All Y.js datasets cleared");
  return keys.length;
}

/**
 * Actually process a remote dataset
 * Now uses DatasetManager's centralized method to prevent duplicates
 * UPDATED: Validates server resources exist before adding
 */
async function processRemoteDataset(datasetId, metadata) {
  const myId = getUserId();

  log.debug("Remote dataset received:", metadata.filename);
  log.debug(
    "   Uploaded by:",
    metadata.userId || metadata.metadata?.uploadedBy
  );
  log.debug("   My ID:", myId);

  // Skip own datasets
  if (metadata.userId === myId) {
    log.trace("Dataset already exists, skipping:", metadata.filename);
    return;
  }

  // VALIDATION: Check if the server resource exists before adding
  // This prevents adding datasets with stale/invalid serverIds
  if (metadata.serverId || metadata.publicPath) {
    const isValid = await validateServerIdExists(
      metadata.serverId,
      metadata.publicPath
    );
    if (!isValid) {
      log.warn(
        "Dataset references invalid server resource:",
        remoteDataset.filename
      );
      log.debug("Removing stale entry from Y.js");
      removeStaleYjsDataset(datasetId);
      return;
    }
  }

  // Use centralized method that checks for duplicates by ID AND hash
  const dataset = await datasetManager._addDatasetFromYjs({
    id: datasetId,
    serverId: metadata.serverId, // Preserve server ID
    ...metadata,
  });

  if (!dataset) {
    log.trace("Dataset already exists, skipping:", metadata.filename);
    return;
  }

  // Handle file fetching if needed
  const hasFile = await dataCache.hasDataset(metadata.hash);

  if (hasFile) {
    log.info(`File already cached`);
    return;
  }

  if (metadata.publicPath) {
    log.info(`Fetching from: ${metadata.publicPath}`);

    try {
      const response = await fetch(metadata.publicPath);
      if (!response.ok) {
        // If 404, the server resource was deleted - clean up Y.js
        if (response.status === 404) {
          log.warn(`   ⚠️ Server resource not found (404), cleaning up...`);
          removeStaleYjsDataset(datasetId);
          // Also remove from local DatasetManager
          datasetManager._datasets.delete(datasetId);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], metadata.filename, {
        type: "application/octet-stream",
      });

      await dataCache.storeDataset(file);
      dataset.rawFile = file;
      dataset.setFileStatus("available", file);

      log.info(`File fetched and cached`);
    } catch (error) {
      log.error(`Failed to fetch:`, error);
      dataset.setFileStatus("fetch-failed");
    }
  }
}

// ----------------------------------------------------------------------------
// Observer Setup Functions: Y.js → Zustand
// These receive remote changes and update local state
// Import stores dynamically to avoid circular dependencies
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Dataset Observer
// Watches for remote dataset changes
// ----------------------------------------------------------------------------
export async function initializeDatasetObserver() {
  log.info("Setting up dataset observer (v2.0 hybrid mode)");

  // Check for existing datasets
  log.debug("Checking for existing datasets in Y.js");
  const existingDatasets = Array.from(yDatasets.keys());
  log.debug("Found existing datasets:", existingDatasets.length);

  for (const datasetId of existingDatasets) {
    const remoteDataset = yDatasets.get(datasetId);

    if (!remoteDataset) {
      log.warn("Dataset not found in Y.js map:", datasetId);
      continue;
    }

    const currentUserId = window.CIA?.sessionManager?.userId;

    if (remoteDataset.userId === currentUserId) {
      log.trace("Skipping own dataset:", remoteDataset.filename);
      continue;
    }

    // Validate server resource
    if (remoteDataset.serverId || remoteDataset.publicPath) {
      const isValid = await validateServerIdExists(
        remoteDataset.serverId,
        remoteDataset.publicPath
      );
      if (!isValid) {
        log.warn(
          "Dataset references invalid server resource:",
          remoteDataset.filename
        );
        log.debug("Removing stale entry from Y.js:", datasetId);
        removeStaleYjsDataset(datasetId);
        continue;
      }
    }

    const dataset = await datasetManager._addDatasetFromYjs({
      id: datasetId,
      ...remoteDataset,
    });

    if (dataset) {
      log.debug("Added dataset from Y.js:", remoteDataset.filename);
    } else {
      log.trace("Dataset already exists, skipping:", remoteDataset.filename);
    }
  }

  // Set up observer for future changes
  yDatasets.observe((event) => {
    log.debug("Dataset observer fired changes:", event.changes.keys.size);

    event.changes.keys.forEach(async (change, datasetId) => {
      if (change.action === "add") {
        const remoteDataset = yDatasets.get(datasetId);
        if (!remoteDataset) {
          log.warn("Dataset not found in Y.js map:", datasetId);
          return;
        }

        log.debug("Remote dataset received:", remoteDataset.filename);
        // ... rest of add handling
      } else if (change.action === "update") {
        log.trace("Remote dataset updated:", datasetId);
        // ... update handling
      } else if (change.action === "delete") {
        // v2.0: Server is source of truth, don't delete from DatasetManager
        log.debug(
          "Y.js dataset entry removed (not affecting DatasetManager):",
          datasetId
        );
      }
    });
  });

  log.info("Dataset observer initialized");
}

// ----------------------------------------------------------------------------
// Instance Observer
// Watches for remote instance changes
// ----------------------------------------------------------------------------
export function initializeInstanceObserver() {
  log.info("Setting up instance observer");

  // REMOVED: The instance observer is now handled by instanceManager.js
  // This eliminates duplicate observers and ensures callbacks fire correctly

  // The instanceManager sets up its own Y.js observer when initialized
  // and provides a proper callback system via onRemoteInstanceChange()
  log.info("Instance observer initialization deferred to InstanceManager");
}

// ----------------------------------------------------------------------------
// Annotation Observer
// Watches for remote annotation changes
// ----------------------------------------------------------------------------
export function initializeAnnotationObserver() {
  yAnnotations.observe((event) => {
    log.info("🔍 Setting up annotation observer");
    // Capture changes IMMEDIATELY while event is still valid
    log.info(
      "🔍 Annotation observer fired",
      event.changes.keys.size,
      "changes"
    );
    const changes = [];
    event.changes.keys.forEach((change, key) => {
      changes.push({
        action: change.action,
        datasetId: key,
        data: yAnnotations.get(key),
      });
    });

    // Process changes asynchronously
    setTimeout(async () => {
      changes.forEach(({ action, datasetId, data }) => {
        if (action === "add" || action === "update") {
          const remoteAnnotations = data;

          if (!remoteAnnotations) return; // Safety check

          log.info(
            `Remote annotations received: ${datasetId} (${remoteAnnotations.length} annotations)`
          );

          useDatasetStore
            .getState()
            .updateAnnotations(datasetId, remoteAnnotations);
        }
      });
    }, 0);
  });

  log.info("✅ Annotation observer initialized");
}

// ============================================================================
// v2.0 PRESENCE OBSERVERS (Active)
// These are the only observers that should be actively used
// ============================================================================

/**
 * Initialize cursor presence observer
 * Watches for remote cursor updates and notifies listeners
 */
let cursorChangeCallbacks = [];
export function onCursorChange(callback) {
  cursorChangeCallbacks.push(callback);
  return () => {
    cursorChangeCallbacks = cursorChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeCursorObserver() {
  log.info("🔍 Setting up cursor presence observer");

  yCursors.observe((event) => {
    const myId = getUserId();

    event.changes.keys.forEach((change, cursorUserId) => {
      // Skip own cursor
      if (cursorUserId === myId) return;

      const cursorData = yCursors.get(cursorUserId);
      cursorChangeCallbacks.forEach((cb) => {
        try {
          cb({ action: change.action, userId: cursorUserId, data: cursorData });
        } catch (error) {
          log.error("Cursor observer callback error:", error);
        }
      });
    });
  });

  log.info("Cursor observer initialized");
}

/**
 * Initialize VR avatar presence observer
 * Watches for remote avatar updates
 */
let avatarChangeCallbacks = [];
export function onAvatarChange(callback) {
  avatarChangeCallbacks.push(callback);
  return () => {
    avatarChangeCallbacks = avatarChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeAvatarObserver() {
  log.info("Setting up avatar presence observer");

  yAvatars.observe((event) => {
    const myId = getUserId();

    event.changes.keys.forEach((change, avatarUserId) => {
      // Skip own avatar
      if (avatarUserId === myId) return;

      const avatarData = yAvatars.get(avatarUserId);
      avatarChangeCallbacks.forEach((cb) => {
        try {
          cb({ action: change.action, userId: avatarUserId, data: avatarData });
        } catch (error) {
          log.error("Avatar observer callback error:", error);
        }
      });
    });
  });

  log.info("Avatar observer initialized");
}

/**
 * Initialize view presence observer
 * Tracks who is viewing which view configuration
 */
let viewPresenceChangeCallbacks = [];
export function onViewPresenceChange(callback) {
  viewPresenceChangeCallbacks.push(callback);
  return () => {
    viewPresenceChangeCallbacks = viewPresenceChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  };
}

export function initializeViewPresenceObserver() {
  log.info("Setting up view presence observer");

  yViewPresence.observe((event) => {
    event.changes.keys.forEach((change, viewId) => {
      const presenceData = yViewPresence.get(viewId);
      viewPresenceChangeCallbacks.forEach((cb) => {
        try {
          cb({ action: change.action, viewId, data: presenceData });
        } catch (error) {
          log.error("View presence observer callback error:", error);
        }
      });
    });
  });

  log.info("View presence observer initialized");
}

// ============================================================================
// Initialize All Observers
// ============================================================================
export function initializeAllObservers() {
  log.info("Setting up Y.js observers (v2.0 - presence focused)");

  // v2.0 Active observers (presence only)
  initializeCursorObserver();
  initializeAvatarObserver();
  initializeViewPresenceObserver();

  // DEPRECATED: State observers - kept for backward compatibility only
  // In v2.0, state comes from server via WebSocket broadcast
  // These will be removed once server sync is fully implemented
  log.info(
    "Initializing deprecated state observers for backward compatibility..."
  );
  initializeDatasetObserver();
  initializeInstanceObserver();
  initializeAnnotationObserver();

  log.info("✅ All Y.js observers initialized");
}

// ----------------------------------------------------------------------------
// EXTENSION POINT: Backend Integration
//
// To add backend persistence:
// 1. Create server/persistence.js (see architecture docs)
// 2. On server: Listen to Y.js updates, save to database
// 3. On connect: Load persisted state into Y.js doc
// 4. Implement snapshot/restore API
//
// Example:
// import { persistenceManager } from "./backend/persistence.js";
// provider.on("sync", async () => {
//   await persistenceManager.loadProjectState(projectId, ydoc);
// });
//
// To add server-based file storage:
// 1. Add fetchUrl field to dataset metadata
// 2. In dataset observer, auto-fetch from server if not in cache:
//    if (!hasFile) {
//      await fetch(remoteDataset.fetchUrl);
//      await dataCache.storeDataset(fetchedFile);
//    }
// 3. Implement chunked streaming for large files
// ----------------------------------------------------------------------------
