// Centralized synchronization manager for cross-browser collaboration

import {
  ydoc,
  yDatasets,
  yInstances,
  yAnnotations,
  syncDatasetToYjs,
  syncInstanceToYjs,
} from "@Collaboration/yjs/yjsSetup.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { useInstanceStore } from "@UI/react/store/instanceStore.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";
import { datasetManager } from "@Init/appInitializer.js";

class SyncManager {
  constructor() {
    this._initialized = false;
    this.syncHandlers = new Map();
    this.pendingDatasets = new Map(); // Track datasets being loaded
  }

  /**
   * Initialize the sync manager and set up all observers
   */
  initialize() {
    if (this._initialized) {
      console.warn("⚠️ SyncManager already initialized");
      return;
    }

    console.log("🔄 Initializing SyncManager...");

    // Set up dataset synchronization
    this.setupDatasetSync();

    // Set up instance synchronization
    this.setupInstanceSync();

    // Set up annotation synchronization
    this.setupAnnotationSync();

    // Handle initial sync when connecting
    this.handleInitialSync();

    this._initialized = true;
    console.log("✅ SyncManager initialized");
  }

  /**
   * Setup dataset synchronization
   */
  setupDatasetSync() {
    // Listen for remote dataset changes
    yDatasets.observe((event) => {
      console.log("📥 Dataset sync event received");

      event.changes.keys.forEach((change, datasetId) => {
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
          this.handleRemoteDataset(datasetId, remoteDataset);
        } else if (change.action === "delete") {
          console.log(`🗑️ Remote dataset deleted: ${datasetId}`);
          // Optionally handle dataset deletion
        }
      });
    });

    // Listen for local dataset changes to sync them
    datasetManager.subscribe(() => {
      const datasets = datasetManager.getAllDatasets();

      datasets.forEach((dataset) => {
        // Only sync if we have the polydata loaded
        if (dataset.polydata) {
          // Check if already synced
          const existing = yDatasets.get(dataset.id);
          if (!existing || existing.lastModified < dataset.lastModified) {
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
          if (instanceStore.instances.find((i) => i.id === instanceId)) {
            instanceStore.removeInstance(instanceId);
          }
        }
      });
    });

    // Listen for local instance changes to sync them
    useInstanceStore.subscribe((state) => {
      state.instances.forEach((instance) => {
        // Sync to Y.js
        const syncData = {
          id: instance.id,
          name: instance.name,
          datasetId: instance.datasetId,
          userId: getUserId(),
          userName: getUserName(),
          type: instance.type || "desktop",
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
          console.log(`📤 Instance synced: ${instance.id}`);
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
          useDatasetStore.getState().updateAnnotations(datasetId, annotations);

          // Render annotations in active instances showing this dataset
          this.renderAnnotationsInInstances(datasetId, annotations);
        }
      });
    });
  }

  /**
   * Handle initial synchronization when connecting
   */
  async handleInitialSync() {
    console.log("🔄 Performing initial sync...");

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
  }

  /**
   * Handle a remote dataset
   */
  async handleRemoteDataset(datasetId, remoteDataset) {
    // Check if we already have this dataset
    const localDataset = datasetManager.getDatasetSync(datasetId);

    if (localDataset?.polydata) {
      console.log(`   Dataset already loaded locally: ${remoteDataset.name}`);
      return;
    }

    // Check if we're already loading this dataset
    if (this.pendingDatasets.has(datasetId)) {
      console.log(`   Dataset already being loaded: ${remoteDataset.name}`);
      return;
    }

    console.log(`   Loading remote dataset: ${remoteDataset.name}`);
    this.pendingDatasets.set(datasetId, true);

    try {
      // If it has a public path, fetch from server
      if (remoteDataset.publicPath) {
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
        // For user-uploaded files, we need the file data from cache
        // This requires the file to be shared via Y.js binary data
        console.log(
          `⚠️ Cannot load user-uploaded file without binary data: ${remoteDataset.name}`
        );

        // Add a placeholder in the dataset store
        useDatasetStore.getState().addDataset({
          id: datasetId,
          name: remoteDataset.name,
          uploadedBy: remoteDataset.userId,
          uploadedByName: remoteDataset.userName,
          hash: remoteDataset.hash,
          pointCount: remoteDataset.pointCount,
          hasPolydata: false,
          isRemote: true,
          unavailable: true,
        });
      }
    } catch (error) {
      console.error(`❌ Failed to load remote dataset: ${error.message}`);
    } finally {
      this.pendingDatasets.delete(datasetId);
    }
  }

  /**
   * Handle a remote instance
   */
  handleRemoteInstance(instanceId, remoteInstance) {
    const instanceStore = useInstanceStore.getState();

    // Check if instance already exists
    const existing = instanceStore.instances.find((i) => i.id === instanceId);

    if (existing) {
      // Update existing instance
      instanceStore.updateInstance(instanceId, {
        ...remoteInstance,
        isRemote: true,
      });
    } else {
      // Add new remote instance
      instanceStore.createInstance({
        ...remoteInstance,
        isRemote: true,
        isActive: false, // Remote instances are not active locally
      });
    }

    console.log(`✅ Remote instance synchronized: ${instanceId}`);
  }

  /**
   * Sync a local dataset to Y.js
   */
  syncLocalDataset(dataset) {
    const syncData = {
      id: dataset.id,
      name: dataset.name,
      hash: dataset.hash,
      publicPath: dataset.publicPath || null,
      pointCount: dataset.pointCount,
      userId: getUserId(),
      userName: getUserName(),
      uploadedAt: dataset.uploadedAt || Date.now(),
      lastModified: Date.now(),
    };

    syncDatasetToYjs(dataset.id, syncData);
    console.log(`📤 Local dataset synced: ${dataset.name}`);
  }

  /**
   * Render annotations in instances showing a specific dataset
   */
  renderAnnotationsInInstances(datasetId, annotations) {
    // Get all instances
    const instanceIds = workspaceManager.getAllInstanceIds();

    instanceIds.forEach((instanceId) => {
      const instance = workspaceManager.getInstance(instanceId);

      // Check if this instance is showing the dataset
      if (instance && instance.datasetId === datasetId) {
        // Render annotations in this instance
        // This will be implemented when we fix the annotation system
        console.log(
          `   Would render ${annotations.length} annotations in instance ${instanceId}`
        );
      }
    });
  }

  /**
   * Force sync all local data
   */
  forceSyncAll() {
    console.log("🔄 Force syncing all local data...");

    // Sync all datasets
    const datasets = datasetManager.getAllDatasets();
    datasets.forEach((dataset) => {
      if (dataset.polydata) {
        this.syncLocalDataset(dataset);
      }
    });

    // Sync all instances
    const instanceStore = useInstanceStore.getState();
    instanceStore.instances.forEach((instance) => {
      if (!instance.isRemote) {
        syncInstanceToYjs(instance.id, instance);
      }
    });

    console.log("✅ Force sync complete");
  }

  /**
   * Clear all remote data
   */
  clearRemoteData() {
    console.log("🗑️ Clearing remote data...");

    // Clear remote instances
    const instanceStore = useInstanceStore.getState();
    const remoteInstances = instanceStore.instances.filter((i) => i.isRemote);
    remoteInstances.forEach((instance) => {
      instanceStore.removeInstance(instance.id);
    });

    // Clear remote datasets (marked as unavailable)
    const datasetStore = useDatasetStore.getState();
    const datasets = datasetStore.getAllDatasets();
    datasets.forEach((dataset) => {
      if (dataset.isRemote && dataset.unavailable) {
        datasetStore.removeDataset(dataset.id);
      }
    });

    console.log("✅ Remote data cleared");
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      initialized: this._initialized,
      pendingDatasets: this.pendingDatasets.size,
      remoteDatasets: Array.from(yDatasets.keys()).length,
      remoteInstances: Array.from(yInstances.keys()).length,
      localDatasets: datasetManager.getAllDatasets().length,
      localInstances: workspaceManager.getAllInstanceIds().length,
    };
  }
}

// Create singleton instance
export const syncManager = new SyncManager();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.syncManager = syncManager;
}
