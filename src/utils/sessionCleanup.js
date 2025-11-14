// src/utils/sessionCleanup.js
// Utilities for cleaning up orphaned data from old sessions

import {
  yDatasets,
  yInstances,
  yAnnotations,
} from "@Collaboration/yjs/yjsSetup.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";

/**
 * Validate that datasets in Y.js have corresponding files in IndexedDB
 * Remove orphaned datasets that can't be loaded
 */
export async function validateDatasetsInCache() {
  console.log("🔍 Validating datasets against cache...");

  const orphaned = [];
  const promises = [];

  yDatasets.forEach((metadata, datasetId) => {
    if (!metadata.hash) {
      console.warn(`⚠️  Dataset ${datasetId} has no hash, marking as orphaned`);
      orphaned.push({ id: datasetId, reason: "no_hash", name: metadata.name });
      return;
    }

    // Check if file exists in cache
    const promise = dataCache.hasDataset(metadata.hash).then((exists) => {
      if (!exists) {
        console.warn(`⚠️  Dataset ${datasetId} file not in cache`);
        orphaned.push({
          id: datasetId,
          reason: "missing_file",
          name: metadata.name,
          hash: metadata.hash,
        });
      }
    });

    promises.push(promise);
  });

  await Promise.all(promises);

  console.log(
    `✅ Validation complete. Found ${orphaned.length} orphaned datasets.`
  );
  return orphaned;
}

/**
 * Remove orphaned datasets from Y.js
 * Call this after validateDatasetsInCache()
 */
export function removeOrphanedDatasets(orphanedList) {
  console.log(`🗑️  Removing ${orphanedList.length} orphaned datasets...`);

  orphanedList.forEach(({ id, reason, name }) => {
    console.log(`  Removing ${name} (${reason})`);
    yDatasets.delete(id);
    yAnnotations.delete(id); // Remove annotations too
  });

  console.log("✅ Orphaned datasets removed");
}

/**
 * Clean up instances from users who are no longer online
 * and instances for datasets that no longer exist
 */
export function cleanupStaleInstances() {
  console.log("🔍 Cleaning up stale instances...");

  const validDatasets = new Set();
  yDatasets.forEach((_, id) => validDatasets.add(id));

  const toRemove = [];

  yInstances.forEach((instance, instanceId) => {
    // Remove instances for deleted datasets
    if (!validDatasets.has(instance.datasetId)) {
      console.warn(`⚠️  Instance ${instanceId} references deleted dataset`);
      toRemove.push(instanceId);
      return;
    }

    // Remove very old instances (older than 24 hours)
    const age = Date.now() - (instance.lastActive || instance.createdAt || 0);
    if (age > 24 * 60 * 60 * 1000) {
      console.warn(
        `⚠️  Instance ${instanceId} is very old (${Math.floor(age / 3600000)}h)`
      );
      toRemove.push(instanceId);
    }
  });

  toRemove.forEach((id) => {
    yInstances.delete(id);
  });

  console.log(`✅ Removed ${toRemove.length} stale instances`);
}

/**
 * Clear ALL data (nuclear option for testing)
 * WARNING: This deletes everything!
 */
export async function clearAllData() {
  console.log("💣 CLEARING ALL DATA...");

  // Clear Y.js maps
  yDatasets.clear();
  yInstances.clear();
  yAnnotations.clear();
  console.log("  ✅ Y.js maps cleared");

  // Clear Zustand stores
  useDatasetStore.getState().clearAll();
  console.log("  ✅ Zustand stores cleared");

  // Clear IndexedDB
  await dataCache.clearAll();
  console.log("  ✅ IndexedDB cleared");

  console.log("✅ All data cleared!");
}

/**
 * Get statistics about current data
 */
export async function getDataStats() {
  const stats = {
    datasets: {
      inYjs: yDatasets.size,
      inZustand: useDatasetStore.getState().getDatasetCount(),
      inCache: 0,
    },
    annotations: yAnnotations.size,
  };

  // Count cached files
  const cachedFiles = await dataCache.listDatasets();
  stats.datasets.inCache = cachedFiles.length;

  return stats;
}

/**
 * Initialize cleanup on app startup
 * Call this once when the app loads
 */
export async function initializeSessionCleanup() {
  console.log("🧹 Initializing session cleanup...");

  // Wait a bit for Y.js to sync
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    // Check for orphaned datasets
    const orphaned = await validateDatasetsInCache();

    if (orphaned.length > 0) {
      console.log(`⚠️  Found ${orphaned.length} orphaned datasets`);

      // Auto-remove them (or you could prompt user)
      removeOrphanedDatasets(orphaned);
    }

    // Clean up stale instances
    cleanupStaleInstances();

    // Show stats
    const stats = await getDataStats();
    console.log("📊 Data stats:", stats);

    console.log("✅ Session cleanup complete");
  } catch (error) {
    console.error("❌ Error during session cleanup:", error);
  }
}
