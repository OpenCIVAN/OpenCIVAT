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

// src/collaboration/yjs/yjsObservers.js

/**
 * Actually process a remote dataset
 *
 * This is called when Y.js notifies us that a dataset exists. This can happen in
 * several scenarios:
 *
 * 1. Initial page load - datasets sync from Y.js to us
 * 2. Another user loads a dataset - we see it appear in Y.js
 * 3. Our own dataset from another tab - we created it elsewhere
 * 4. Our own dataset we just created - we added it to Y.js and the observer fired
 *
 * The key insight: We only need to process datasets that DatasetManager doesn't
 * already have. If DatasetManager has it, we can skip because the local state
 * is already correct.
 */
async function processRemoteDataset(datasetId, metadata) {
  const myId = getUserId();

  console.log("📥 Remote dataset received:", metadata.filename);
  console.log(`   Uploaded by: ${metadata.uploadedBy}`);
  console.log(`   My ID: ${myId}`);
  console.log(`   Am I the uploader? ${metadata.uploadedBy === myId}`);

  // CRITICAL CHECK: Does DatasetManager already have this dataset?
  const existingDataset = datasetManager.getDataset(datasetId);

  if (existingDataset) {
    console.log(`   ✓ Already have dataset in DatasetManager, skipping`);

    // Emit event so React updates (datasetStore listens to this)
    datasetManager._emit("datasetAdded", existingDataset);

    return;
  }

  console.log(`   ℹ️ New dataset, adding to DatasetManager...`);

  // Import Dataset class
  const { Dataset } = await import("@Core/data/models/Dataset.js");

  // Create dataset from Y.js metadata
  const dataset = Dataset.fromJSON({
    id: datasetId,
    filename: metadata.filename,
    name: metadata.name || metadata.filename,
    fileType: metadata.fileType,
    hash: metadata.hash,
    publicPath: metadata.publicPath,
    storageKey: metadata.storageKey,
    userId: metadata.userId,
    metadata: metadata.metadata || {},
  });

  // Add to DatasetManager's internal map
  datasetManager._datasets.set(datasetId, dataset);

  // Persist to IndexedDB
  await datasetManager._persistDataset(dataset);

  // Emit event - datasetStore listens and triggers React re-render
  datasetManager._emit("datasetAdded", dataset);

  console.log(`   ✅ Dataset added to DatasetManager`);

  // Handle file fetching if needed
  const hasFile = await dataCache.hasDataset(metadata.hash);

  if (hasFile) {
    console.log(`   ✓ File already cached`);
    return;
  }

  if (metadata.publicPath) {
    console.log(`   🌐 Fetching from: ${metadata.publicPath}`);

    try {
      const response = await fetch(metadata.publicPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const file = new File([blob], metadata.filename, {
        type: "application/octet-stream",
      });

      await dataCache.storeDataset(file);
      dataset.rawFile = file;

      console.log(`   ✅ File fetched and cached`);
    } catch (error) {
      console.error(`   ❌ Failed to fetch:`, error);
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

  // REMOVED: The instance observer is now handled by instanceManager.js
  // This eliminates duplicate observers and ensures callbacks fire correctly

  // The instanceManager sets up its own Y.js observer when initialized
  // and provides a proper callback system via onRemoteInstanceChange()

  console.log(
    "✅ Instance observer initialization deferred to InstanceManager"
  );
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
