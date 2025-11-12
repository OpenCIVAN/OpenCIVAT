// src/collaboration/sync/collaborationSyncManager.js
// Minimal working sync manager - no breaking changes

import {
  ydoc,
  yDatasets,
  yInstances,
  yAnnotations,
  syncDatasetToYjs,
  syncInstanceToYjs,
} from "@Collaboration/yjs/yjsSetup.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { useInstanceStore } from "@UI/react/store/instanceStore.js";
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

    // Set up dataset synchronization
    this.setupDatasetSync();

    // Set up instance synchronization
    this.setupInstanceSync();

    // Set up annotation synchronization
    this.setupAnnotationSync();

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
    // DatasetManager doesn't have subscribe, but the Zustand store does
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
   * Setup instance synchronization
   */
  setupInstanceSync() {
    // Listen for remote instance changes
    yInstances.observe((event) => {
      console.log("📥 Instance sync event received");

      event.changes.keys.forEach((change, instanceId) => {
        if (change.action === "add" || change.action === "update") {
          const remoteInstance = yInstances.get(instanceId);

          if (!remoteInstance) return;

          console.log(`📥 Remote instance received: ${instanceId}`);
          console.log(`   Type: ${remoteInstance.type}`);

          // Skip if this is our own instance
          if (remoteInstance.userId === getUserId()) {
            console.log("   (Skipping own instance)");
            return;
          }

          // Update the instance store
          this.handleRemoteInstance(instanceId, remoteInstance);
        } else if (change.action === "delete") {
          console.log(`🗑️ Remote instance deleted: ${instanceId}`);

          // Remove from local store if it exists
          const instanceStore = useInstanceStore.getState();
          const instances = instanceStore.instances || [];
          if (instances.find((i) => i.id === instanceId)) {
            instanceStore.removeInstance(instanceId);
          }
        }
      });
    });

    // Listen for local instance changes to sync them
    useInstanceStore.subscribe((state) => {
      const instances = state.instances || [];

      instances.forEach((instance) => {
        // Skip remote instances
        if (instance.isRemote) return;

        // Sync to Y.js
        const syncData = {
          id: instance.id,
          name: instance.name,
          type: instance.type || "vtk",
          datasetId: instance.datasetId,
          userId: getUserId(),
          userName: getUserName(),
          visibility: instance.visibility || "shared",
          camera: instance.camera,
          filters: instance.filters || [],
          widgets: instance.widgets || [],
          lastActive: Date.now(),
        };

        // Only sync if changed
        const existing = yInstances.get(instance.id);
        if (
          !existing ||
          JSON.stringify(existing) !== JSON.stringify(syncData)
        ) {
          yInstances.set(instance.id, syncData);
          console.log(
            `📤 Instance synced: ${instance.id} (type: ${instance.type})`
          );
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

          // Notify instances about annotation changes
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

      // Sync all remote instances
      const remoteInstanceIds = Array.from(yInstances.keys());
      console.log(`   Found ${remoteInstanceIds.length} remote instances`);

      for (const instanceId of remoteInstanceIds) {
        const remoteInstance = yInstances.get(instanceId);
        if (remoteInstance && remoteInstance.userId !== getUserId()) {
          this.handleRemoteInstance(instanceId, remoteInstance);
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
   * Handle a remote instance
   */
  handleRemoteInstance(instanceId, remoteInstance) {
    console.log(`   Processing remote instance: ${instanceId}`);

    // Add to instance store
    const addInstance = useInstanceStore.getState().addInstance;
    if (addInstance) {
      addInstance({
        id: instanceId,
        name: remoteInstance.name,
        type: remoteInstance.type || "vtk",
        datasetId: remoteInstance.datasetId,
        userId: remoteInstance.userId,
        userName: remoteInstance.userName,
        visibility: remoteInstance.visibility,
        camera: remoteInstance.camera,
        filters: remoteInstance.filters,
        widgets: remoteInstance.widgets,
        lastActive: remoteInstance.lastActive,
        isRemote: true,
      });
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
   * Notify about annotation changes
   */
  notifyAnnotationChange(datasetId, annotations) {
    // Get workspace manager if available
    const workspaceManager = window.CIA?.workspaceManager;
    if (!workspaceManager) return;

    // Get all instances showing this dataset
    const instances = workspaceManager.getInstancesByDataset?.(datasetId) || [];

    instances.forEach((instance) => {
      console.log(
        `   Notifying instance ${instance.instanceId} about annotations`
      );
    });
  }

  /**
   * Force sync all local data
   */
  forceSyncAll() {
    console.log("🔄 Force syncing all local data...");

    // Sync all datasets from store
    const datasets = useDatasetStore.getState().datasets;
    Object.values(datasets).forEach((dataset) => {
      if (dataset && !dataset.isRemote) {
        this.syncLocalDataset(dataset);
      }
    });

    // Sync all instances from store
    const instances = useInstanceStore.getState().instances || [];
    instances.forEach((instance) => {
      if (!instance.isRemote) {
        syncInstanceToYjs(instance.id, instance);
      }
    });

    console.log("✅ Force sync complete");
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const datasetStore = useDatasetStore.getState();
    const instanceStore = useInstanceStore.getState();

    return {
      initialized: this._initialized,
      pendingDatasets: this.pendingDatasets.size,
      loadingDatasets: this.loadingDatasets.size,
      remoteDatasets: Array.from(yDatasets.keys()).length,
      remoteInstances: Array.from(yInstances.keys()).length,
      localDatasets: Object.keys(datasetStore.datasets || {}).length,
      localInstances: (instanceStore.instances || []).length,
    };
  }

  /**
   * Clear all remote data
   */
  clearRemoteData() {
    console.log("🗑️ Clearing remote data...");

    // Clear remote instances
    const instanceStore = useInstanceStore.getState();
    const instances = instanceStore.instances || [];
    const remoteInstances = instances.filter((i) => i.isRemote);

    remoteInstances.forEach((instance) => {
      if (instanceStore.removeInstance) {
        instanceStore.removeInstance(instance.id);
      }
    });

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
