// src/services/dataCleanup.js
// Utility to clean up orphaned datasets and stale data

import { files as log } from "@Utils/logger.js";
import { yDatasets } from "@Collaboration/yjs/yjsSetup.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";

class DataCleanup {
  /**
   * Find orphaned datasets (metadata exists but no file in cache)
   */
  async findOrphanedDatasets() {
    const datasets = useDatasetStore.getState().getAllDatasets();
    const orphaned = [];

    for (const metadata of datasets) {
      if (!metadata.hash) {
        orphaned.push({
          id: metadata.id,
          name: metadata.name,
          reason: "missing_hash",
        });
        continue;
      }

      const hasFile = await dataCache.hasDataset(metadata.hash);
      if (!hasFile) {
        orphaned.push({
          id: metadata.id,
          name: metadata.name,
          reason: "missing_file",
          hash: metadata.hash,
        });
      }
    }

    return orphaned;
  }

  /**
   * Remove orphaned datasets
   */
  async removeOrphanedDatasets() {
    const orphaned = await this.findOrphanedDatasets();

    log.info(`Removing ${orphaned.length} orphaned datasets...`);

    for (const dataset of orphaned) {
      log.debug(`  - ${dataset.name} (${dataset.reason})`);
      window.CIA.datasetManager.removeDataset(dataset.id);
    }

    return orphaned.length;
  }

  /**
   * Find datasets in Y.js but not in Zustand
   */
  findDanglingYjsDatasets() {
    const dangling = [];
    const zustandDatasets = useDatasetStore.getState().getAllDatasets();
    const zustandIds = new Set(zustandDatasets.map((d) => d.id));

    yDatasets.forEach((metadata, id) => {
      if (!zustandIds.has(id)) {
        dangling.push({ id, name: metadata.name || "Unknown" });
      }
    });

    return dangling;
  }

  /**
   * Remove datasets from Y.js that aren't in Zustand
   */
  removeDanglingYjsDatasets() {
    const dangling = this.findDanglingYjsDatasets();

    log.info(`Removing ${dangling.length} dangling Y.js datasets...`);

    for (const dataset of dangling) {
      log.debug(`  - ${dataset.name}`);
      yDatasets.delete(dataset.id);
    }

    return dangling.length;
  }

  /**
   * Full cleanup routine
   */
  async performFullCleanup() {
    log.info("Starting full cleanup...");

    const orphaned = await this.removeOrphanedDatasets();
    const dangling = this.removeDanglingYjsDatasets();

    log.info(`Cleanup complete: orphaned=${orphaned}, dangling=${dangling}`);

    return { orphaned, dangling };
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    const orphaned = await this.findOrphanedDatasets();
    const dangling = this.findDanglingYjsDatasets();
    const zustandCount = useDatasetStore.getState().getAllDatasets().length;
    const yjsCount = yDatasets.size;
    const cacheStats = await dataCache.getStats();

    return {
      orphaned: orphaned.length,
      orphanedList: orphaned,
      dangling: dangling.length,
      danglingList: dangling,
      zustandCount,
      yjsCount,
      cacheCount: cacheStats.count,
      cacheSize: cacheStats.totalSize,
    };
  }

  /**
   * Print cleanup report
   */
  async printCleanupReport() {
    const stats = await this.getCleanupStats();

    log.info("Data Cleanup Report:");
    log.info(`Zustand Store: ${stats.zustandCount} datasets`);
    log.info(`Y.js Shared: ${stats.yjsCount} datasets`);
    log.info(
      `IndexedDB Cache: ${stats.cacheCount} files (${(
        stats.cacheSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );

    if (stats.orphaned > 0) {
      log.warn(`Found ${stats.orphaned} orphaned datasets:`);
      stats.orphanedList.forEach((d) => {
        log.debug(`  - ${d.name} (${d.reason})`);
      });
    }

    if (stats.dangling > 0) {
      log.warn(`Found ${stats.dangling} dangling Y.js entries:`);
      stats.danglingList.forEach((d) => {
        log.debug(`  - ${d.name}`);
      });
    }

    if (stats.orphaned === 0 && stats.dangling === 0) {
      log.info("No issues found - all data is clean!");
    } else {
      log.info("Run dataCleanup.performFullCleanup() to fix these issues");
    }

    return stats;
  }
}

export const dataCleanup = new DataCleanup();

// Make available globally for debugging
if (typeof window !== "undefined") {
  window.dataCleanup = dataCleanup;
}
