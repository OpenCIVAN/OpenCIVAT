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
import { Dataset } from "@Core/data/models/Dataset.js";

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
 * Now uses DatasetManager's centralized method to prevent duplicates
 */
async function processRemoteDataset(datasetId, metadata) {
  const myId = getUserId();

  console.log("📥 Remote dataset received:", metadata.filename);
  console.log(
    `   Uploaded by: ${metadata.userId || metadata.metadata?.uploadedBy}`
  );
  console.log(`   My ID: ${myId}`);

  // Skip own datasets
  if (metadata.userId === myId) {
    console.log(`   ⏭️ Skipping own dataset`);
    return;
  }

  // Use centralized method that checks for duplicates by ID AND hash
  const dataset = await datasetManager._addDatasetFromYjs({
    id: datasetId,
    serverId: metadata.serverId, // Preserve server ID
    ...metadata,
  });

  if (!dataset) {
    console.log(`   ⏭️ Dataset already exists, skipping`);
    return;
  }

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
      dataset.setFileStatus("available", file);

      console.log(`   ✅ File fetched and cached`);
    } catch (error) {
      console.error(`   ❌ Failed to fetch:`, error);
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
  // ← No parameter!
  console.log("🔍 Setting up dataset observer");
  // CRITICAL FIX: Check for existing datasets in Y.js before setting up observer
  // Y.js observers only fire for NEW changes, not existing data
  console.log("🔍 Checking for existing datasets in Y.js...");
  const existingDatasets = Array.from(yDatasets.keys());
  console.log(`   Found ${existingDatasets.length} existing dataset(s)`);

  for (const datasetId of existingDatasets) {
    const remoteDataset = yDatasets.get(datasetId);

    if (!remoteDataset) {
      console.log(`   ⚠️ Dataset ${datasetId} not found in Y.js map`);
      continue;
    }

    // Get current user ID
    const currentUserId = window.CIA?.sessionManager?.userId;

    // Skip own datasets
    if (remoteDataset.userId === currentUserId) {
      console.log(`   ⏭️ Skipping own dataset: ${remoteDataset.filename}`);
      continue;
    }

    // Use centralized method that checks for duplicates
    const dataset = await datasetManager._addDatasetFromYjs({
      id: datasetId,
      ...remoteDataset,
    });

    if (dataset) {
      console.log(`   ✅ Added dataset from Y.js: ${remoteDataset.filename}`);
    } else {
      console.log(
        `   ✓ Already have dataset ${remoteDataset.filename}, skipping`
      );
    }
  }

  // Now set up the observer for FUTURE changes
  yDatasets.observe((event) => {
    console.log(`🔍 Dataset observer fired ${event.changes.keys.size} changes`);

    event.changes.keys.forEach(async (change, datasetId) => {
      if (change.action === "add") {
        const remoteDataset = yDatasets.get(datasetId);

        if (!remoteDataset) {
          console.log(`   ⚠️ Dataset ${datasetId} not found in Y.js map`);
          return;
        }

        console.log(`📥 Remote dataset received: ${remoteDataset.filename}`);
        console.log(
          `   Uploaded by: ${remoteDataset.metadata?.uploadedBy || "unknown"}`
        );

        // Get current user ID - this is a VALUE not a function
        const currentUserId = window.CIA?.sessionManager?.userId;
        console.log(`   My ID: ${currentUserId}`);
        // FIX: Use userId field (top-level) instead of uploadedBy (nested in metadata)
        console.log(
          `   Am I the uploader? ${remoteDataset.userId === currentUserId}`
        );

        // FIX 1: Remove the parentheses - currentUserId is a value, not a function!
        // FIX: Compare userId instead of uploadedBy
        if (remoteDataset.userId === currentUserId) {
          console.log(`   ⏭️ Skipping own dataset`);
          return;
        }

        // FIX 2: Use the imported datasetManager (no parameter shadowing)
        const existing = datasetManager.getDataset(datasetId);
        if (existing) {
          console.log(`   ✓ Already have dataset in DatasetManager, skipping`);
          return;
        }

        console.log(`   📥 Adding dataset from Y.js...`);

        const dataset = await datasetManager._addDatasetFromYjs({
          id: datasetId,
          ...remoteDataset,
        });

        if (dataset) {
          console.log(`   ✅ Dataset added: ${remoteDataset.filename}`);
        } else {
          console.log(`   ⏭️ Dataset already exists, skipped`);
        }
      } else if (change.action === "update") {
        console.log(`📝 Remote dataset updated: ${datasetId}`);

        // Use the imported datasetManager
        const dataset = datasetManager.getDataset(datasetId);
        if (dataset) {
          const remoteDataset = yDatasets.get(datasetId);

          if (remoteDataset && remoteDataset.metadata) {
            dataset.metadata = {
              ...dataset.metadata,
              ...remoteDataset.metadata,
            };
          }

          datasetManager._emit("datasetUpdated", dataset);
        }
      } else if (change.action === "delete") {
        console.log(`📥 Remote dataset removed: ${datasetId}`);

        // Use the imported datasetManager
        const dataset = datasetManager._datasets.get(datasetId);
        if (dataset) {
          datasetManager._datasets.delete(datasetId);
          datasetManager._emit("datasetRemoved", datasetId);
        }
      }
    });

    console.log(`📥 Observer processing complete`);
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
