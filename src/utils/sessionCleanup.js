// src/utils/sessionCleanup.js
// Utilities for cleaning up orphaned data from old sessions

import { files as log } from "@Utils/logger.js";
import {
  yDatasets,
  yViews,
  yAnnotations,
  yWorkspaceLayouts,
  // Deprecated but kept for cleanup of old data
  yInstances,
} from "@Collaboration/yjs/yjsSetup.js";
import { dataCache } from "@Services/storage/dataCache.js";

/**
 * Validate that datasets in Y.js have corresponding files in IndexedDB
 * Remove orphaned datasets that can't be loaded
 */
export async function validateDatasetsInCache() {
  log.debug("Validating datasets against cache...");

  const orphaned = [];
  const promises = [];

  yDatasets.forEach((metadata, datasetId) => {
    if (!metadata.hash) {
      log.warn(`Dataset ${datasetId} has no hash, marking as orphaned`);
      orphaned.push({ id: datasetId, reason: "no_hash", name: metadata.name });
      return;
    }

    // Check if file exists in cache
    const promise = dataCache.hasDataset(metadata.hash).then((exists) => {
      if (!exists) {
        log.warn(`Dataset ${datasetId} file not in cache`);
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

  log.info(`Validation complete. Found ${orphaned.length} orphaned datasets.`);
  return orphaned;
}

/**
 * Remove orphaned datasets from Y.js
 * Call this after validateDatasetsInCache()
 */
export function removeOrphanedDatasets(orphanedList) {
  log.info(`Removing ${orphanedList.length} orphaned datasets...`);

  orphanedList.forEach(({ id, reason, name }) => {
    log.debug(`Removing ${name} (${reason})`);
    yDatasets.delete(id);
    yAnnotations.delete(id);
  });

  log.info("Orphaned datasets removed");
}

/**
 * Clean up views from users who are no longer online
 * and views for datasets that no longer exist
 */
export function cleanupStaleViews() {
  log.debug("Cleaning up stale views...");

  const validDatasets = new Set();
  yDatasets.forEach((_, id) => validDatasets.add(id));

  const toRemove = [];

  yViews.forEach((view, viewId) => {
    // Remove views for deleted datasets
    if (!validDatasets.has(view.datasetId)) {
      log.warn(`View ${viewId} references deleted dataset`);
      toRemove.push(viewId);
      return;
    }

    // Remove views that are:
    // - Not saved by user
    // - Not shared with anyone
    // - Older than 24 hours
    // - Have no active instances
    const age = Date.now() - (view.lastActiveTimestamp || view.createdAt || 0);
    const isOld = age > 24 * 60 * 60 * 1000;
    const isUnsaved = !view.savedByUser;
    const isUnshared = !view.sharedWith || view.sharedWith.length === 0;
    const isInactive = view.status !== "active";

    if (isOld && isUnsaved && isUnshared && isInactive) {
      log.warn(
        `View ${viewId} is stale (${Math.floor(
          age / 3600000
        )}h old, unsaved, inactive)`
      );
      toRemove.push(viewId);
    }
  });

  toRemove.forEach((id) => {
    yViews.delete(id);
  });

  log.info(`Removed ${toRemove.length} stale views`);
  return toRemove;
}

/**
 * Clean up legacy yInstances data (migration helper)
 * This removes old instance data that should no longer be synced
 */
export function cleanupLegacyInstances() {
  log.debug("Cleaning up legacy instances...");

  const count = yInstances.size;

  if (count > 0) {
    log.debug(`Found ${count} legacy instances, removing...`);
    yInstances.clear();
    log.info("Legacy instances cleared");
  } else {
    log.debug("No legacy instances to clean up");
  }

  return count;
}

/**
 * Clean up workspace layouts that reference deleted users or projects
 */
export function cleanupStaleWorkspaceLayouts() {
  log.debug("Cleaning up stale workspace layouts...");

  const toRemove = [];

  yWorkspaceLayouts.forEach((layout, layoutId) => {
    // Remove very old layouts (older than 7 days)
    const age =
      Date.now() - (layout.lastActiveTimestamp || layout.createdAt || 0);
    if (age > 7 * 24 * 60 * 60 * 1000) {
      log.warn(`Workspace layout ${layoutId} is very old`);
      toRemove.push(layoutId);
    }
  });

  toRemove.forEach((id) => {
    yWorkspaceLayouts.delete(id);
  });

  log.info(`Removed ${toRemove.length} stale workspace layouts`);
  return toRemove;
}

/**
 * Run all cleanup tasks
 */
export async function runFullCleanup() {
  log.info("Running full session cleanup...");

  // 1. Validate and clean datasets
  const orphanedDatasets = await validateDatasetsInCache();
  if (orphanedDatasets.length > 0) {
    removeOrphanedDatasets(orphanedDatasets);
  }

  // 2. Clean stale views
  cleanupStaleViews();

  // 3. Clean legacy instances (migration)
  cleanupLegacyInstances();

  // 4. Clean stale workspace layouts
  cleanupStaleWorkspaceLayouts();

  log.info("Full cleanup complete");
}

/**
 * Clear ALL data (nuclear option for testing)
 * WARNING: This deletes everything!
 */
export async function clearAllData() {
  log.warn("CLEARING ALL DATA...");

  // Clear Y.js maps
  yDatasets.clear();
  yViews.clear();
  yAnnotations.clear();
  yWorkspaceLayouts.clear();
  yInstances.clear(); // Legacy cleanup
  log.debug("Y.js maps cleared");

  // Clear IndexedDB
  await dataCache.clearAll();
  log.debug("IndexedDB cleared");

  log.info("All data cleared!");
}

/**
 * Get cleanup statistics
 */
export function getCleanupStats() {
  const stats = {
    datasets: yDatasets.size,
    views: yViews.size,
    annotations: yAnnotations.size,
    workspaceLayouts: yWorkspaceLayouts.size,
    legacyInstances: yInstances.size,
  };

  // Count views by status
  let activeViews = 0;
  let inactiveViews = 0;
  let savedViews = 0;
  let sharedViews = 0;

  yViews.forEach((view) => {
    if (view.status === "active") activeViews++;
    else inactiveViews++;
    if (view.savedByUser) savedViews++;
    if (view.sharedWith && view.sharedWith.length > 0) sharedViews++;
  });

  stats.activeViews = activeViews;
  stats.inactiveViews = inactiveViews;
  stats.savedViews = savedViews;
  stats.sharedViews = sharedViews;

  return stats;
}
