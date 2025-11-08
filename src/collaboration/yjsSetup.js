// ----------------------------------------------------------------------------
// Yjs Setup - Collaborative data structures
//
// ARCHITECTURE UPDATE:
// Now integrated with Zustand stores for dataset/instance management.
// Bidirectional sync: Zustand ↔ Y.js
//
// EXTENSIBILITY NOTES:
// - Currently uses in-memory Y.js (no persistence)
// - To add backend persistence: See TODO markers below
// - For production: Add y-indexeddb provider for client-side cache
// - For enterprise: Integrate with PostgreSQL/MongoDB backend
// ----------------------------------------------------------------------------

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { NETWORK_CONFIG } from "../config/constants.js";
import { useDatasetStore } from "../ui/react/store/datasetStore.js";
import { useInstanceStore } from "../ui/react/store/instanceStore.js";
import { hasUserName } from "./userManagement.js";

// ----------------------------------------------------------------------------
// Core Y.js Document
// ----------------------------------------------------------------------------

export const ydoc = new Y.Doc();

// WebSocket provider for real-time collaboration
export const provider = new WebsocketProvider(
  NETWORK_CONFIG.WEBSOCKET_URL,
  NETWORK_CONFIG.ROOM_NAME,
  ydoc
);

// TODO (Backend Integration): When adding persistence layer:
// import { IndexeddbPersistence } from 'y-indexeddb';
// const indexeddbProvider = new IndexeddbPersistence(ROOM_NAME, ydoc);
// This provides client-side caching while offline

// ----------------------------------------------------------------------------
// Shared State Maps
//
// ARCHITECTURE NOTE:
// Each map represents a different data domain. Keep these separate for:
// - Performance (updates only trigger observers of specific maps)
// - Extensibility (easy to add new domains)
// - Security (future: scope access control per map)
// ----------------------------------------------------------------------------

// DATASET STATE
// Datasets available to entire project (metadata only, not binary data)
export const yDatasets = ydoc.getMap("datasets");
// Structure: datasetId -> { id, name, hash, bounds, pointCount, ... }
// NOTE: Binary data stays in IndexedDB, only metadata syncs via Y.js
// TODO (Server): When files are server-hosted, add fetchUrl field

// INSTANCE STATE (Viewport configurations)
// Individual views of datasets with camera, filters, widgets
export const yInstances = ydoc.getMap("instances");
// Structure: instanceId -> { id, datasetId, userId, type, camera, filters, ... }
// Replaces yVisualizations for better clarity

// LEGACY: Keep yVisualizations for backward compatibility during migration
// export const yVisualizations = ydoc.getMap("visualizations");
// TODO (Refactor): Migrate existing visualizations to instances

// ANNOTATION STATE
// Annotations tied to datasets (not instances)
export const yAnnotations = ydoc.getMap("annotations");
// Structure: datasetId -> Array of annotations
// Annotations belong to the dataset, visible to all instances viewing it
// TODO (Scoping): Structure for scoped annotations:
// {
//   dataset: { datasetId -> Array of annotations },
//   project: Array of project-level annotations,
//   group: { groupId -> Array of group annotations }  // Future
// }

// COLLABORATION STATE
export const yCursors = ydoc.getMap("cursors"); // User presence + cursor positions
export const yText = ydoc.getArray("chatMessages"); // Text chat
// TODO (Groups): When adding breakout groups:
// - Chat should be nested: groupId -> Array of messages
// - Cursors should include instanceId for scoping

export const yFile = ydoc.getMap("file");

// VR COLLABORATION (Future)
export const yAvatars = ydoc.getMap("avatars");
export const yVRControllers = ydoc.getMap("vrControllers");
// TODO (VR): Implement avatar system when VR features are ready

// 3D VISUALIZATION STATE (Legacy - consider refactoring)
export const yActor = ydoc.getMap("actor");
// export const yFile = ydoc.getMap("fileData");
export const yReduction = ydoc.getMap("reduction");
// TODO (Refactor): Merge these into yInstances for consistency

// ----------------------------------------------------------------------------
// NEW: Readiness flag to prevent premature dataset processing
// ----------------------------------------------------------------------------
let isSystemReady = false;
let pendingDatasets = new Map(); // Store datasets received before we're ready

/**
 * Call this AFTER the username modal is dismissed
 * This signals that we're ready to process remote datasets
 */
export function markSystemReady() {
  console.log("🚀 System marked as ready - processing pending datasets");
  isSystemReady = true;

  // Process any datasets that arrived while we were waiting
  processPendingDatasets();
}

/**
 * Process datasets that arrived before system was ready
 */
async function processPendingDatasets() {
  if (pendingDatasets.size === 0) {
    console.log("   No pending datasets to process");
    return;
  }

  console.log(`   Processing ${pendingDatasets.size} pending datasets...`);

  for (const [datasetId, metadata] of pendingDatasets.entries()) {
    await processRemoteDataset(datasetId, metadata);
  }

  pendingDatasets.clear();
  console.log("✅ All pending datasets processed");
}

/**
 * Handle a remote dataset (either immediately or queue it)
 */
async function handleRemoteDataset(datasetId, metadata) {
  // If system isn't ready yet, queue it
  if (!isSystemReady) {
    console.log(`📦 Queueing dataset ${datasetId} (system not ready yet)`);
    pendingDatasets.set(datasetId, metadata);
    return;
  }

  // System is ready, process immediately
  await processRemoteDataset(datasetId, metadata);
}

/**
 * Actually process a remote dataset
 */
async function processRemoteDataset(datasetId, metadata) {
  console.log("📥 Processing remote dataset:", metadata.name);

  // Add to Zustand store (metadata only)
  useDatasetStore.getState().addDataset(datasetId, metadata);

  // Check if we have the file in cache
  const hasFile = await dataCache.hasDataset(metadata.hash);

  if (!hasFile) {
    console.log("📥 ⚠️  File not in cache");

    // 🔥 Auto-fetch if it's a public file (sample dataset)
    if (metadata.publicPath) {
      console.log(`📥 🔄 Auto-fetching public file: ${metadata.publicPath}`);

      try {
        const response = await fetch(metadata.publicPath);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const file = new File([blob], metadata.name, {
          type: "application/octet-stream",
        });

        // Store in cache
        console.log("📥 Storing fetched file in cache...");
        await dataCache.storeDataset(file);
        console.log("📥 ✅ Public file cached successfully");

        // Now load the polydata
        console.log("📥 Loading polydata from cache...");
        const { datasetManager } = await import("../core/datasetManager.js");
        await datasetManager.loadPolydataFromCache(datasetId);
      } catch (error) {
        console.error(`📥 ❌ Failed to fetch public file:`, error);
      }
    } else {
      // Not a public file - user would need to upload
      // But DON'T show any prompts here - just log it
      console.log(`📥    Hash: ${metadata.hash?.substring(0, 16)}...`);
      console.log(`📥    File is user-uploaded, not in our cache`);
    }
  } else {
    console.log("📥 ✅ File found in cache, loading polydata...");
    const { datasetManager } = await import("../core/datasetManager.js");
    await datasetManager.loadPolydataFromCache(datasetId);
  }
}

// ----------------------------------------------------------------------------
// Sync Helper Functions: Zustand → Y.js
// These push local changes to the distributed state
// ----------------------------------------------------------------------------

/**
 * Sync dataset metadata to Y.js
 * Called after adding/updating a dataset in Zustand
 *
 * @param {string} datasetId - Dataset ID
 * @param {Object} metadata - Dataset metadata (NO binary data)
 */
export function syncDatasetToYjs(datasetId, metadata) {
  try {
    // Only sync metadata, never binary data!
    const syncData = {
      id: metadata.id || datasetId,
      name: metadata.name,
      hash: metadata.hash, // ← Key for IndexedDB lookup
      bounds: metadata.bounds,
      pointCount: metadata.pointCount,
      cellCount: metadata.cellCount,
      sizeBytes: metadata.sizeBytes,
      uploadedBy: metadata.uploadedBy,
      uploadedAt: metadata.uploadedAt,
      // Annotations are synced separately via yAnnotations
    };

    yDatasets.set(datasetId, syncData);
    console.log(`📤 Dataset synced to Y.js: ${metadata.name}`);

    // TODO (Server): When files are server-hosted:
    // syncData.fetchUrl = `/api/datasets/${metadata.hash}`;
    // This allows remote users to download instead of upload
  } catch (error) {
    console.error("❌ Failed to sync dataset to Y.js:", error);
  }
}

/**
 * Sync instance configuration to Y.js
 * Called after creating/updating an instance in Zustand
 *
 * @param {string} instanceId - Instance ID
 * @param {Object} instance - Instance configuration
 */
export function syncInstanceToYjs(instanceId, instance) {
  try {
    const syncData = {
      id: instance.id || instanceId,
      datasetId: instance.datasetId,
      userId: instance.userId,
      userName: instance.userName,
      type: instance.type, // 'desktop' or 'vr'
      visibility: instance.visibility, // 'private' or 'shared'
      camera: instance.camera,
      filters: instance.filters || [],
      widgets: instance.widgets || [],
      linkedTo: instance.linkedTo || [],
      linkMode: instance.linkMode,
      cursor: instance.cursor || { position: null, visible: false },
      lastActive: Date.now(),
    };

    yInstances.set(instanceId, syncData);
    console.log(`📤 Instance synced to Y.js: ${instanceId}`);
  } catch (error) {
    console.error("❌ Failed to sync instance to Y.js:", error);
  }
}

/**
 * Sync dataset annotations to Y.js
 * Called after adding/updating annotations
 *
 * @param {string} datasetId - Dataset ID
 * @param {Array} annotations - Array of annotation objects
 */
export function syncAnnotationsToYjs(datasetId, annotations) {
  try {
    // Store as Y.Array for better CRDT behavior
    const yAnnotationsArray = new Y.Array();
    yAnnotationsArray.push(annotations);

    yAnnotations.set(datasetId, annotations);
    console.log(
      `📤 Annotations synced to Y.js: ${annotations.length} annotations`
    );
  } catch (error) {
    console.error("❌ Failed to sync annotations to Y.js:", error);
  }
}

/**
 * Remove dataset from Y.js
 *
 * @param {string} datasetId - Dataset ID to remove
 */
export function removeDatasetFromYjs(datasetId) {
  yDatasets.delete(datasetId);
  yAnnotations.delete(datasetId); // Also remove annotations
  console.log(`📤 Dataset removed from Y.js: ${datasetId}`);
}

/**
 * Remove instance from Y.js
 *
 * @param {string} instanceId - Instance ID to remove
 */
export function removeInstanceFromYjs(instanceId) {
  yInstances.delete(instanceId);
  console.log(`📤 Instance removed from Y.js: ${instanceId}`);
}

// ----------------------------------------------------------------------------
// Observer Setup Functions: Y.js → Zustand
// These receive remote changes and update local state
// Import stores dynamically to avoid circular dependencies
// ----------------------------------------------------------------------------

/**
 * Initialize dataset observer
 * Watches for remote dataset changes and updates Zustand
 *
 * Call this once during app initialization
 */
export function initializeDatasetObserver() {
  yDatasets.observe((event) => {
    // Capture changes IMMEDIATELY
    const changes = [];
    event.changes.keys.forEach((change, key) => {
      changes.push({
        action: change.action,
        datasetId: key,
        data: yDatasets.get(key),
      });
    });

    // Process changes
    setTimeout(async () => {
      const { getUserId } = await import("./userManagement.js");
      const myId = getUserId();

      for (const { action, datasetId, data } of changes) {
        if (action === "add" || action === "update") {
          const remoteDataset = data;

          if (!remoteDataset) {
            console.warn("⚠️  Received null dataset data");
            continue;
          }

          // Skip if this dataset came from us
          if (remoteDataset.uploadedBy === myId) {
            console.log(`📥 Ignoring dataset from self: ${remoteDataset.name}`);
            continue;
          }

          console.log("📥 Remote dataset received:", remoteDataset.name);

          // 🔥 THIS IS THE KEY CHANGE - Call handleRemoteDataset instead of processing directly
          await handleRemoteDataset(datasetId, remoteDataset);
        }

        if (action === "delete") {
          console.log(`📥 Remote dataset removed: ${datasetId}`);
          const { useDatasetStore } = await import("../ui/react/store/datasetStore.js");
          useDatasetStore.getState().removeDataset(datasetId);
        }
      }

      console.log("📥 Observer processing complete");
    }, 0);
  });

  console.log("✅ Dataset observer initialized");
}

/**
 * Initialize instance observer
 * Watches for remote instance changes and updates Zustand
 *
 * Call this once during app initialization
 */
export function initializeInstanceObserver() {
  yInstances.observe((event) => {
    const changes = [];
    event.changes.keys.forEach((change, key) => {
      changes.push({
        action: change.action,
        instanceId: key,
        data: yInstances.get(key),
      });
    });
    setTimeout(async () => {
      const { useInstanceStore } = await import(
        "../ui/react/store/instanceStore.js"
      );

      event.changes.keys.forEach((change, key) => {
        const instanceId = key;

        if (change.action === "add" || change.action === "update") {
          const remoteInstance = yInstances.get(instanceId);

          console.log(
            `📥 Remote instance received: ${instanceId} (${remoteInstance.type})`
          );

          // Don't sync private instances from other users
          if (remoteInstance.visibility === "private") {
            const currentUserId = getCurrentUserId(); // You'll need to implement this
            if (remoteInstance.userId !== currentUserId) {
              return; // Skip private instances from other users
            }
          }

          // Update or create instance
          useInstanceStore
            .getState()
            .updateInstance(instanceId, remoteInstance);
        }

        if (change.action === "delete") {
          console.log(`📥 Remote instance removed: ${instanceId}`);
          useInstanceStore.getState().removeInstance(instanceId);
        }
      });
    }, 0);
  });

  console.log("✅ Instance observer initialized");
}

/**
 * Initialize annotation observer
 * Watches for remote annotation changes
 */
export function initializeAnnotationObserver() {
  yAnnotations.observe((event) => {
    // CRITICAL: Capture changes IMMEDIATELY while event is still valid
    const changes = [];
    event.changes.keys.forEach((change, key) => {
      changes.push({
        action: change.action,
        datasetId: key,
        data: yAnnotations.get(key), // Get data NOW
      });
    });

    // NOW we can defer processing with captured data
    setTimeout(async () => {
      const { useDatasetStore } = await import(
        "../ui/react/store/datasetStore.js"
      );

      changes.forEach(({ action, datasetId, data }) => {
        if (action === "add" || action === "update") {
          const remoteAnnotations = data;

          if (!remoteAnnotations) return; // Safety check

          console.log(
            `📥 Remote annotations received: ${datasetId} (${remoteAnnotations.length} annotations)`
          );

          useDatasetStore
            .getState()
            .updateAnnotations(datasetId, remoteAnnotations);
        }
      });
    }, 0);
  });

  console.log("✅ Annotation observer initialized");
}

/**
 * Initialize all observers
 * Call this once during app startup
 */
export function initializeAllObservers() {
  console.log("🔗 Setting up Y.js observers");

  initializeDatasetObserver();
  initializeInstanceObserver();
  initializeAnnotationObserver();

  console.log("✅ All Y.js observers initialized");
}

// TODO: Helper to get current user ID (implement in userManagement.js)
function getCurrentUserId() {
  // Placeholder - implement this properly
  return "current-user-id";
}

// ----------------------------------------------------------------------------
// Connection Events
// ----------------------------------------------------------------------------

provider.on("status", (event) => {
  console.log(`📡 Yjs connection status: ${event.status}`);
  // TODO (Backend): Add reconnection logic with exponential backoff
});

provider.on("sync", (synced) => {
  if (synced) {
    console.log("✅ Yjs synchronized with server");

    // Initialize observers on first sync
    initializeAllObservers();

    // TODO (Backend): Trigger loading of persisted state from database
    // TODO (Offline): Sync local changes made while offline
  }
});

// TODO (Error Handling): Add connection error handlers
// provider.on('connection-error', (error) => { ... });

console.log("✅ Yjs document initialized");
console.log(
  `📡 Connecting to: ${NETWORK_CONFIG.WEBSOCKET_URL}/${NETWORK_CONFIG.ROOM_NAME}`
);

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
// import { persistenceManager } from './backend/persistence.js';
// provider.on('sync', async () => {
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
