// src/services/dataCleanup.js
// Utility to clean up orphaned datasets and stale data

import { yDatasets } from "@Collaboration/yjs/yjsSetup.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";
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

    console.log(`🗑️  Removing ${orphaned.length} orphaned datasets...`);

    for (const dataset of orphaned) {
      console.log(`  - ${dataset.name} (${dataset.reason})`);
      datasetManager.removeDataset(dataset.id);
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

    console.log(`🗑️  Removing ${dangling.length} dangling Y.js datasets...`);

    for (const dataset of dangling) {
      console.log(`  - ${dataset.name}`);
      yDatasets.delete(dataset.id);
    }

    return dangling.length;
  }

  /**
   * Full cleanup routine
   */
  async performFullCleanup() {
    console.log("🧹 Starting full cleanup...");

    const orphaned = await this.removeOrphanedDatasets();
    const dangling = this.removeDanglingYjsDatasets();

    console.log(`✅ Cleanup complete:`);
    console.log(`  - Orphaned datasets removed: ${orphaned}`);
    console.log(`  - Dangling Y.js entries removed: ${dangling}`);

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

    console.log("📊 Data Cleanup Report:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Zustand Store: ${stats.zustandCount} datasets`);
    console.log(`Y.js Shared: ${stats.yjsCount} datasets`);
    console.log(
      `IndexedDB Cache: ${stats.cacheCount} files (${(
        stats.cacheSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );
    console.log("");

    if (stats.orphaned > 0) {
      console.log(`⚠️  Found ${stats.orphaned} orphaned datasets:`);
      stats.orphanedList.forEach((d) => {
        console.log(`  - ${d.name} (${d.reason})`);
      });
      console.log("");
    }

    if (stats.dangling > 0) {
      console.log(`⚠️  Found ${stats.dangling} dangling Y.js entries:`);
      stats.danglingList.forEach((d) => {
        console.log(`  - ${d.name}`);
      });
      console.log("");
    }

    if (stats.orphaned === 0 && stats.dangling === 0) {
      console.log("✅ No issues found - all data is clean!");
    } else {
      console.log(
        "💡 Run dataCleanup.performFullCleanup() to fix these issues"
      );
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return stats;
  }
}

export const dataCleanup = new DataCleanup();

// Make available globally for debugging
if (typeof window !== "undefined") {
  window.dataCleanup = dataCleanup;
}
