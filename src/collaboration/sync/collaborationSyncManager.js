// src/collaboration/sync/collaborationSyncManager.js
// Handles dataset, annotation, and cursor layer synchronization
// Instance sync is handled by instanceManager - this deals with data layers

import { ydoc, yDatasets, yAnnotations } from "@Collaboration/yjs/yjsSetup.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";

class CollaborationSyncManager {
  constructor() {
    this._initialized = false;
    this.pendingDatasets = new Map();
    this.loadingDatasets = new Set();
  }

  /**
   * Initialize the sync manager
   */
  initialize() {
    if (this._initialized) {
      console.warn("⚠️ CollaborationSyncManager already initialized");
      return;
    }

    console.log("🔄 Initializing CollaborationSyncManager...");

    // Only dataset and annotation sync - no instance sync
    this.setupDatasetSync();
    this.setupAnnotationSync();

    // Future: this.setupCursorSync();

    // Handle initial sync when connecting
    this.handleInitialSync();

    this._initialized = true;
    console.log("✅ CollaborationSyncManager initialized");
  }

  /**
   * Setup dataset synchronization
   */
  setupDatasetSync() {
    // Listen for remote dataset changes from Y.js
    yDatasets.observe((event) => {
      console.log("📥 Dataset sync event received");

      event.changes.keys.forEach(async (change, datasetId) => {
        if (change.action === "add" || change.action === "update") {
          const remoteDataset = yDatasets.get(datasetId);

          if (!remoteDataset) return;

          console.log(`📥 Remote dataset received: ${remoteDataset.name}`);

          // Skip if this is our own dataset
          if (remoteDataset.userId === getUserId()) {
            console.log("   (Skipping own dataset)");
            return;
          }

          // Handle the remote dataset
          await this.handleRemoteDataset(datasetId, remoteDataset);
        } else if (change.action === "delete") {
          console.log(`🗑️ Remote dataset deleted: ${datasetId}`);
          useDatasetStore.getState().removeDataset(datasetId);
        }
      });
    });

    // Listen for local dataset changes from Zustand store
    useDatasetStore.subscribe((state) => {
      const datasets = state.datasets;

      Object.values(datasets).forEach((dataset) => {
        // Only sync if we have data and it's our dataset
        if (dataset && !dataset.isRemote) {
          // Check if already synced
          const existing = yDatasets.get(dataset.id);
          if (
            !existing ||
            existing.lastModified < (dataset.lastModified || 0)
          ) {
            this.syncLocalDataset(dataset);
          }
        }
      });
    });
  }

  /**
   * Setup annotation synchronization
   */
  setupAnnotationSync() {
    yAnnotations.observe((event) => {
      console.log("📥 Annotation sync event received");

      event.changes.keys.forEach((change, datasetId) => {
        if (change.action === "add" || change.action === "update") {
          const annotations = yAnnotations.get(datasetId);

          if (!annotations) return;

          console.log(`📥 Annotations received for dataset: ${datasetId}`);

          // Update the dataset store with annotations
          const updateAnnotations =
            useDatasetStore.getState().updateAnnotations;
          if (updateAnnotations) {
            updateAnnotations(datasetId, annotations);
          }

          // Notify all instances showing this dataset that annotations changed
          this.notifyAnnotationChange(datasetId, annotations);
        }
      });
    });
  }

  /**
   * Handle initial synchronization
   */
  async handleInitialSync() {
    console.log("🔄 Performing initial sync...");

    try {
      // Sync all remote datasets
      const remoteDatasetIds = Array.from(yDatasets.keys());
      console.log(`   Found ${remoteDatasetIds.length} remote datasets`);

      for (const datasetId of remoteDatasetIds) {
        const remoteDataset = yDatasets.get(datasetId);
        if (remoteDataset && remoteDataset.userId !== getUserId()) {
          await this.handleRemoteDataset(datasetId, remoteDataset);
        }
      }

      console.log("✅ Initial sync complete");
    } catch (error) {
      console.error("⚠️ Initial sync error:", error);
      // Don't throw - let the app continue
    }
  }

  /**
   * Handle a remote dataset
   */
  async handleRemoteDataset(datasetId, remoteDataset) {
    // Prevent infinite loops
    if (this.loadingDatasets.has(datasetId)) {
      console.log(`   Already loading dataset: ${datasetId}`);
      return;
    }

    // Check if we already have this dataset
    const datasetManager = window.CIA?.datasetManager;
    if (datasetManager && datasetManager.getDatasetSync) {
      const localDataset = datasetManager.getDatasetSync(datasetId);

      if (localDataset?.polydata) {
        console.log(`   Dataset already loaded locally: ${remoteDataset.name}`);
        return;
      }
    }

    // Check if we're already loading this dataset
    if (this.pendingDatasets.has(datasetId)) {
      console.log(`   Dataset already being loaded: ${remoteDataset.name}`);
      return;
    }

    console.log(`   Processing remote dataset: ${remoteDataset.name}`);
    this.pendingDatasets.set(datasetId, true);
    this.loadingDatasets.add(datasetId);

    try {
      // If it has a public path, fetch from server
      if (
        remoteDataset.publicPath &&
        datasetManager &&
        datasetManager.loadDataset
      ) {
        const response = await fetch(remoteDataset.publicPath);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], remoteDataset.name, {
            type: "application/octet-stream",
          });

          // Load through dataset manager
          await datasetManager.loadDataset(file, remoteDataset.publicPath);
          console.log(`✅ Remote dataset loaded: ${remoteDataset.name}`);
        }
      } else {
        // Add placeholder for user-uploaded files
        console.log(
          `⚠️ Cannot load user-uploaded file without binary data: ${remoteDataset.name}`
        );

        // Add a placeholder in the dataset store
        useDatasetStore.getState().addDataset({
          id: datasetId,
          name: remoteDataset.name,
          uploadedBy: remoteDataset.userId,
          uploadedByName: remoteDataset.userName,
          pointCount: remoteDataset.pointCount || 0,
          bounds: remoteDataset.bounds || {},
          unavailable: true,
          isRemote: true,
        });
      }
    } catch (error) {
      console.error(`❌ Failed to load remote dataset:`, error);
    } finally {
      this.pendingDatasets.delete(datasetId);
      this.loadingDatasets.delete(datasetId);
    }
  }

  /**
   * Sync local dataset to Y.js
   */
  syncLocalDataset(dataset) {
    if (!dataset || !dataset.id) return;

    const syncData = {
      id: dataset.id,
      name: dataset.name || dataset.filename,
      userId: getUserId(),
      userName: getUserName(),
      publicPath: dataset.publicPath || null,
      hash: dataset.hash || null,
      pointCount: dataset.metadata?.pointCount || dataset.pointCount || 0,
      bounds: dataset.metadata?.bounds || dataset.bounds || {},
      lastModified: dataset.lastModified || Date.now(),
    };

    yDatasets.set(dataset.id, syncData);
    console.log(`📤 Dataset synced: ${dataset.id}`);
  }

  /**
   * Notify all instances viewing this dataset about annotation changes
   *
   * This walks through all instances and tells those showing this dataset
   * to update their annotation rendering. Each instance handler decides
   * how to display annotations for its visualization type.
   */
  notifyAnnotationChange(datasetId, annotations) {
    const workspaceManager = window.CIA?.workspaceManager;
    if (!workspaceManager) return;

    // Get all instances in the workspace
    const allInstanceIds = workspaceManager.getAllInstanceIds();

    allInstanceIds.forEach((instanceId) => {
      const instance = workspaceManager.getInstance(instanceId);

      // Check if this instance is showing the dataset with changed annotations
      if (instance && instance.datasetId === datasetId) {
        console.log(
          `   Notifying instance ${instanceId} about annotation changes`
        );

        // Ask the handler to update annotation display
        // This is type-agnostic - VTK will project annotations into 3D,
        // a 2D chart might show them as markers, etc.
        if (instance.handler && instance.handler.setAnnotationVisibility) {
          instance.handler.setAnnotationVisibility(
            instance.instanceData,
            true,
            annotations
          );
        }
      }
    });
  }

  /**
   * Get sync status for debugging
   */
  getSyncStatus() {
    const datasetStore = useDatasetStore.getState();

    return {
      initialized: this._initialized,
      pendingDatasets: this.pendingDatasets.size,
      loadingDatasets: this.loadingDatasets.size,
      remoteDatasets: Array.from(yDatasets.keys()).length,
      localDatasets: Object.keys(datasetStore.datasets || {}).length,
    };
  }

  /**
   * Clear all remote data (for testing or cleanup)
   */
  clearRemoteData() {
    console.log("🗑️ Clearing remote data...");

    // Clear remote datasets
    const datasetStore = useDatasetStore.getState();
    const datasets = Object.values(datasetStore.datasets || {});

    datasets.forEach((dataset) => {
      if (
        dataset.isRemote &&
        dataset.unavailable &&
        datasetStore.removeDataset
      ) {
        datasetStore.removeDataset(dataset.id);
      }
    });

    console.log("✅ Remote data cleared");
  }
}

// Create singleton instance
export const collaborationSyncManager = new CollaborationSyncManager();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.collaborationSyncManager = collaborationSyncManager;
}
