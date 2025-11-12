// src/collaboration/yjs/yjsObservers.js
// Y.js observers that watch for remote changes and update local state

import {
  yDatasets,
  yInstances,
  yAnnotations,
} from "@Collaboration/yjs/yjsSetup.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { useInstanceStore } from "@UI/react/store/instanceStore.js";
import { datasetManager } from "@Init/appInitializer.js";

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
  const myId = getUserId();
  console.log("📥 Processing remote dataset:", metadata.name);
  console.log(`   Uploaded by: ${metadata.uploadedBy}`);
  console.log(`   My ID: ${myId}`);
  console.log(`   Am I the uploader? ${metadata.uploadedBy === myId}`);

  // Add to Zustand store (metadata only)
  useDatasetStore.getState().addDataset(datasetId, metadata);

  // Check if we already have polydata in memory
  const inMemory = datasetManager.datasets.get(datasetId);
  if (inMemory?.polydata) {
    console.log("📥 ✅ Already have polydata in memory, skipping load");
    return;
  }

  // Check if we have the file in IndexedDB cache
  const hasFile = await dataCache.hasDataset(metadata.hash);
  console.log(`📥 File in cache: ${hasFile}`);

  if (hasFile) {
    // We have it cached - load from cache
    console.log("📥 Loading polydata from our cache...");
    await datasetManager.loadPolydataFromCache(datasetId);
    console.log("📥 ✅ Loaded from cache successfully");
    return;
  }

  // Not in cache - try to fetch if it's a public file
  if (metadata.publicPath) {
    console.log(`📥 📄 Auto-fetching public file: ${metadata.publicPath}`);
    try {
      const response = await fetch(metadata.publicPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], metadata.name, {
        type: "application/octet-stream",
      });

      console.log("📥 Storing fetched file in cache...");
      await dataCache.storeDataset(file);
      console.log("📥 ✅ Public file cached successfully");

      await datasetManager.loadPolydataFromCache(datasetId);
    } catch (error) {
      console.error(`📥 ❌ Failed to fetch public file:`, error);
    }
  } else {
    // Not a public file and not in our cache
    // This is where we would show an upload prompt (but only if we don't recognize it)
    console.log(`📥 Hash: ${metadata.hash?.substring(0, 16)}...`);
    console.log(`📥 File is user-uploaded, not in our cache`);

    // Only show prompt if this is NOT our own upload from a previous session
    // (If it is ours, it should be in cache, so something went wrong)
    if (metadata.uploadedBy === myId) {
      console.warn(
        "📥 ⚠️ This is our own upload but not in cache - data may have been cleared"
      );
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
export function initializeDatasetObserver() {
  console.log("🔍 Setting up dataset observer");
  yDatasets.observe((event) => {
    console.log(
      "🔍 Dataset observer fired",
      event.changes.keys.size,
      "changes"
    );
    const changes = [];
    event.changes.keys.forEach((change, key) => {
      changes.push({
        action: change.action,
        datasetId: key,
        data: yDatasets.get(key),
      });
    });

    // Process changes asynchronously
    setTimeout(async () => {
      for (const { action, datasetId, data } of changes) {
        if (action === "add" || action === "update") {
          const remoteDataset = data;

          if (!remoteDataset) {
            console.warn("⚠️  Received null dataset data");
            continue;
          }

          // Call handleRemoteDataset instead of processing directly
          console.log("📥 Remote dataset received:", remoteDataset.name);
          await handleRemoteDataset(datasetId, remoteDataset);
        }

        if (action === "delete") {
          console.log(`📥 Remote dataset removed: ${datasetId}`);
          useDatasetStore.getState().removeDataset(datasetId);
        }
      }

      console.log("📥 Observer processing complete");
    }, 0);
  });

  console.log("✅ Dataset observer initialized");
}

// ----------------------------------------------------------------------------
// Instance Observer
// Watches for remote instance changes
// ----------------------------------------------------------------------------
export function initializeInstanceObserver() {
  console.log("🔍 Setting up instance observer");
  yInstances.observe((event) => {
    console.log(
      "🔍 Instance observer fired",
      event.changes.keys.size,
      "changes"
    );
    const changes = [];
    event.changes.keys.forEach((change, key) => {
      changes.push({
        action: change.action,
        instanceId: key,
        data: yInstances.get(key),
      });
    });

    setTimeout(async () => {
      const currentUserId = getUserId();

      for (const { action, instanceId, data } of changes) {
        if (action === "add" || action === "update") {
          const remoteInstance = data;

          console.log(
            `📥 Remote instance received: ${instanceId} (${remoteInstance.type})`
          );

          // Don't sync private instances from other users
          if (remoteInstance.visibility === "private") {
            if (remoteInstance.userId !== currentUserId) {
              console.log(`   Skipping private instance from another user`);
              continue;
            }
          }

          // Update or create instance
          useInstanceStore
            .getState()
            .updateInstance(instanceId, remoteInstance);
        }

        if (action === "delete") {
          console.log(`📥 Remote instance removed: ${instanceId}`);
          useInstanceStore.getState().removeInstance(instanceId);
        }
      }
    }, 0);
  });

  console.log("✅ Instance observer initialized");
}

// ----------------------------------------------------------------------------
// Annotation Observer
// Watches for remote annotation changes
// ----------------------------------------------------------------------------
export function initializeAnnotationObserver() {
  yAnnotations.observe((event) => {
    console.log("🔍 Setting up annotation observer");
    // Capture changes IMMEDIATELY while event is still valid
    console.log(
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

// ----------------------------------------------------------------------------
// Initialize All Observers
// ----------------------------------------------------------------------------
export function initializeAllObservers() {
  console.log("🔗 Setting up Y.js observers");

  initializeDatasetObserver();
  initializeInstanceObserver();
  initializeAnnotationObserver();

  console.log("✅ All Y.js observers initialized");
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
