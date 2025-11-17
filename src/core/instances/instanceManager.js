// src/core/instances/instanceManager.js
// Complete orchestration of instance operations with full sync support

import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { yInstances } from "@Collaboration/yjs/yjsSetup.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";

class InstanceManager {
  constructor() {
    this._observerAttached = false;
    this._syncCallbacks = [];
    this._localInstanceIds = new Set();
    this._initializationComplete = false; // NEW: Track if we've started observing
    this._stateSubscriptions = new Map();
  }

  /**
   * Register a callback for remote instance changes
   *
   * This should be called BEFORE initialize() so callbacks are ready
   * when Y.js events start firing
   */
  onRemoteInstanceChange(callback) {
    console.log(
      `📝 InstanceManager: Registering callback (total: ${
        this._syncCallbacks.length + 1
      })`
    );
    this._syncCallbacks.push(callback);

    // If we're already observing Y.js, we need to check for existing instances
    // This handles the case where a component registers late
    if (this._initializationComplete) {
      console.log(
        `   ⚠️ Late registration - checking for existing remote instances`
      );
      this._checkForExistingRemoteInstances(callback);
    }

    return () => {
      this._syncCallbacks = this._syncCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Initialize - set up Y.js observation
   *
   * This should be called AFTER components have registered their callbacks
   */
  initialize() {
    if (this._observerAttached) {
      console.log("⚠️ InstanceManager already initialized");
      return;
    }

    console.log("🎨 InstanceManager: Initializing...");
    console.log(
      `   ${this._syncCallbacks.length} callback(s) already registered`
    );
    console.log("   Setting up Y.js instance observer...");

    // Observe Y.js for remote instance changes
    yInstances.observe((event) => {
      console.log(
        `🔔 InstanceManager observer triggered: ${event.changes.keys.size} changes`
      );

      event.changes.keys.forEach((change, instanceId) => {
        const instance = yInstances.get(instanceId);

        if (!instance) {
          // If this is a delete event, that's expected behavior
          if (change.action === "delete") {
            console.log(`   ✓ Delete event for ${instanceId}`);
            this._notifySyncCallbacks({
              action: "delete",
              instanceId,
            });
          } else {
            console.log(`   ⚠️ Instance ${instanceId} not found in Y.js map`);
          }
          return;
        }

        const currentUserId = getUserId();
        console.log(`   Change: ${change.action} for ${instanceId}`);
        console.log(`   Owner: ${instance.userName} (${instance.userId})`);
        console.log(`   Current user: ${currentUserId}`);
        console.log(`   Is mine: ${instance.userId === currentUserId}`);

        // Skip our own instances - we already created them locally
        if (instance.userId === currentUserId) {
          console.log(`   ⏭️ Skipping own instance`);
          return;
        }

        if (change.action === "add") {
          console.log(`🌐 Remote instance added: ${instanceId}`);
          console.log(`   From: ${instance.userName || instance.userId}`);
          console.log(`   Dataset: ${instance.datasetId || "none"}`);
          console.log(
            `   📢 Notifying ${this._syncCallbacks.length} callback(s)`
          );

          this._notifySyncCallbacks({
            action: "add",
            instanceId,
            instance,
          });

          console.log(`   ✅ Callbacks notified`);
        } else if (change.action === "update") {
          console.log(`📄 Remote instance updated: ${instanceId}`);

          // EXISTING: Notify UI callbacks about the update
          this._notifySyncCallbacks({
            action: "update",
            instanceId,
            instance,
          });

          // NEW: Apply state changes if this is a remote instance we're rendering
          const localInstance = workspaceManager.getInstance(instanceId);

          // Only proceed if we have a local rendering of this instance
          if (
            localInstance &&
            localInstance.instanceData &&
            instance.typeSpecificState
          ) {
            // Check if this is our own recently-sent update (echo back prevention)
            // Check lastModifiedBy if available, otherwise fall back to instance owner check
            const isOurRecentUpdate =
              instance.typeSpecificState.updatedBy === "local" &&
              (instance.lastModifiedBy
                ? instance.lastModifiedBy === getUserId()
                : instance.userId === getUserId()) &&
              Date.now() - instance.typeSpecificState.lastUpdated < 100;

            if (!isOurRecentUpdate && localInstance.instanceData.stateAdapter) {
              // Apply the remote state through the adapter
              localInstance.instanceData.stateAdapter.applyRemoteState(
                instance.typeSpecificState,
                (remoteState) =>
                  localInstance.handler.applySharedState(
                    localInstance.instanceData,
                    remoteState,
                    instance.userId
                  )
              );

              console.log(`📥 Applied remote state to ${instanceId}`);
            }
          }
        } else if (change.action === "delete") {
          console.log(`🗑️ Remote instance deleted: ${instanceId}`);

          if (this._localInstanceIds.has(instanceId)) {
            this._deleteLocalInstance(instanceId);
          }

          this._notifySyncCallbacks({
            action: "delete",
            instanceId,
          });
        }
      });
    });

    this._observerAttached = true;
    this._initializationComplete = true;

    // After setting up the observer, check for any instances that already exist
    // These might have been created before we started observing
    this._checkForExistingRemoteInstances();

    console.log("✅ InstanceManager initialized with Y.js observer attached");
  }

  /**
   * Check Y.js for remote instances that already exist
   * Called after observer setup to catch instances created before we were watching
   */
  _checkForExistingRemoteInstances(specificCallback = null) {
    const currentUserId = getUserId();
    const existingRemote = [];

    yInstances.forEach((instance, instanceId) => {
      // Skip our own instances
      if (instance.userId === currentUserId) {
        return;
      }

      // Skip private instances from other users
      if (instance.visibility === "private") {
        return;
      }

      // Check if we've already processed this instance
      // (Don't want to notify about the same instance twice)
      if (this._localInstanceIds.has(instanceId)) {
        return;
      }

      existingRemote.push({
        instanceId,
        instance,
      });
    });

    if (existingRemote.length > 0) {
      console.log(
        `📦 Found ${existingRemote.length} existing remote instance(s)`
      );

      existingRemote.forEach(({ instanceId, instance }) => {
        console.log(`   - ${instanceId} from ${instance.userName}`);

        // Notify either the specific callback or all callbacks
        if (specificCallback) {
          specificCallback({
            action: "add",
            instanceId,
            instance,
          });
        } else {
          this._notifySyncCallbacks({
            action: "add",
            instanceId,
            instance,
          });
        }
      });
    } else {
      console.log(`   No existing remote instances found`);
    }
  }

  /**
   * Create an instance locally and sync to Y.js
   *
   * This is the PRIMARY method for creating instances.
   * Call this from the UI when a user wants a new viewport.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {string} datasetId - Optional dataset to load immediately
   * @returns {string} The instance ID
   */
  async createInstance(container, datasetId = null) {
    const instanceId = `instance-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log(`🆕 Creating instance: ${instanceId}`);
    if (datasetId) {
      console.log(`   Dataset: ${datasetId}`);
    }

    // Mark this as a local instance so we don't recreate it when Y.js echoes back
    this._localInstanceIds.add(instanceId);

    // CRITICAL FIX: Sync to Y.js BEFORE creating the instance so the Y.js entry
    // exists when the stateAdapter observer is set up. This prevents the race
    // condition where the observer fires but can't find the instance in Y.js.
    this._syncToYjs(instanceId, datasetId);

    // Create through workspace manager
    // The observer set up here will now find the instance in Y.js
    await workspaceManager.createInstance(container, {
      instanceId,
      type: "vtk",
      datasetId,
    });

    return instanceId;
  }

  /**
   * Create a local instance from remote Y.js data
   *
   * This is called when another user creates an instance and we want to
   * mirror it locally. The instance already exists in Y.js, we're just
   * creating the local rendering of it.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {string} instanceId - The instance ID from Y.js
   * @param {string} datasetId - Dataset to load
   * @returns {string} The instance ID
   */
  async createRemoteInstance(container, instanceId, datasetId = null) {
    console.log(
      `🌐 Creating local rendering of remote instance: ${instanceId}`
    );
    if (datasetId) {
      console.log(`   Dataset: ${datasetId}`);
    }

    // Mark as local so we don't try to create it again
    this._localInstanceIds.add(instanceId);

    // Create through workspace manager with the exact ID from Y.js
    await workspaceManager.createInstance(container, {
      instanceId, // Use the remote instance ID, not a new one
      type: "vtk",
      datasetId,
    });

    // Note: We do NOT sync to Y.js here because this instance already
    // exists in Y.js. We're just creating the local rendering.

    return instanceId;
  }

  /**
   * Load dataset into instance and sync
   */
  async loadDatasetIntoInstance(instanceId, datasetId, polydata) {
    console.log(`📊 Loading dataset ${datasetId} into instance ${instanceId}`);

    // Load through workspace manager
    await workspaceManager.loadDatasetIntoInstance(
      instanceId,
      datasetId,
      polydata
    );

    // Update Y.js with new dataset
    // This is important - when you change what dataset an instance is showing,
    // other users should see that change
    const existing = yInstances.get(instanceId);
    if (existing && existing.userId === getUserId()) {
      this._syncToYjs(instanceId, datasetId);
    }
  }

  /**
   * Delete instance and remove from Y.js
   */
  deleteInstance(instanceId) {
    console.log(`🗑️ Deleting instance: ${instanceId}`);

    // NEW: Unsubscribe from state updates
    if (this._stateSubscriptions && this._stateSubscriptions.has(instanceId)) {
      const unsubscribe = this._stateSubscriptions.get(instanceId);
      unsubscribe();
      this._stateSubscriptions.delete(instanceId);
    }

    this._deleteLocalInstance(instanceId);

    // Remove from Y.js if it's our instance
    const instance = yInstances.get(instanceId);
    if (instance && instance.userId === getUserId()) {
      yInstances.delete(instanceId);
    }
  }

  /**
   * Fetch a dataset and prepare it for a remote instance
   * This is called when a user wants to view a dataset from a remote instance
   * that they don't have locally yet.
   */
  async fetchDatasetForRemoteInstance(fetchInfo) {
    const { datasetId, publicPath, storageKey, filename, fileType } = fetchInfo;

    console.log(`📥 Fetching dataset for remote instance: ${filename}`);

    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager) {
      throw new Error("DatasetManager not available");
    }

    // Check if we already have it (user might have clicked twice)
    const existing = datasetManager.getDataset(datasetId);
    if (existing) {
      console.log(`  ✓ Dataset already exists`);
      return existing;
    }

    try {
      let dataset;

      if (publicPath) {
        // Fetch from public path (sample files)
        console.log(`  🌐 Fetching from: ${publicPath}`);

        const response = await fetch(publicPath);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch: ${response.status} ${response.statusText}`
          );
        }

        const blob = await response.blob();
        const file = new File([blob], filename, {
          type: "application/octet-stream",
        });

        // Load through DatasetManager - this creates the dataset and syncs metadata
        // Note: We pass null for userId to use the current user
        dataset = await datasetManager.loadDataset(file, publicPath, null);

        console.log(`  ✅ Dataset fetched and loaded: ${dataset.filename}`);
      } else if (storageKey) {
        // Fetch from server storage
        console.log(`  📡 Fetching from server with key: ${storageKey}`);

        // TODO: Implement server fetching when server storage is ready
        throw new Error("Server storage fetching not yet implemented");
      } else {
        throw new Error(
          "Dataset has no fetchable path (no publicPath or storageKey)"
        );
      }

      return dataset;
    } catch (error) {
      console.error(`❌ Failed to fetch dataset:`, error);
      throw error; // Propagate to caller so UI can show error
    }
  }

  /**
   * Request state sync for an instance
   * Call this after user interactions (camera move, widget change, etc.)
   */
  async requestSync(instanceId) {
    const instance = workspaceManager.getInstance(instanceId);
    if (!instance) {
      console.warn(`⚠️ Cannot sync: instance ${instanceId} not found`);
      return;
    }

    // Get shared state from the handler
    const state = await instance.handler.getSharedState(instance.instanceData);

    if (!state) {
      // Handler returned null (might be applying remote state)
      return;
    }

    // Update the type-specific state in Y.js
    const yInstance = yInstances.get(instanceId);
    if (yInstance && yInstance.userId === getUserId()) {
      yInstances.set(instanceId, {
        ...yInstance,
        typeSpecificState: state,
        lastModified: Date.now(),
      });

      console.log(`📡 Synced state for instance ${instanceId}`);
    }
  }

  /**
   * Get count of instances viewing a specific dataset
   */
  getInstanceCountForDataset(datasetId) {
    let count = 0;

    // Count local instances
    const allInstanceIds = workspaceManager.getAllInstanceIds();
    allInstanceIds.forEach((instanceId) => {
      const instance = workspaceManager.getInstance(instanceId);
      if (instance && instance.datasetId === datasetId) {
        count++;
      }
    });

    // Count remote instances
    const currentUserId = getUserId();
    yInstances.forEach((instance) => {
      if (instance.userId === currentUserId) {
        return; // Skip our own instances
      }

      if (
        instance.datasetId === datasetId &&
        instance.visibility === "shared"
      ) {
        count++;
      }
    });

    return count;
  }

  /**
   * INTERNAL: Delete an instance locally only
   */
  _deleteLocalInstance(instanceId) {
    // Delete through workspace manager
    workspaceManager.deleteInstance(instanceId);

    // Remove from our tracking
    this._localInstanceIds.delete(instanceId);
  }

  /**
   * INTERNAL: Sync instance metadata to Y.js
   */
  _syncToYjs(instanceId, datasetId) {
    if (!yInstances) {
      console.error("❌ Cannot sync instance: Y.js not initialized yet");
      console.error("   This should not happen if Phase 1 completed correctly");
      return;
    }
    try {
      yInstances.set(instanceId, {
        id: instanceId,
        userId: getUserId(),
        userName: getUserName(),
        datasetId: datasetId || null,
        type: "vtk", // TODO: Check if this should be here
        visibility: "shared",
        createdAt: Date.now(),
        lastModified: Date.now(),
        typeSpecificState: null, // Will be populated by requestSync()
      });

      console.log(`📤 Instance synced to Y.js: ${instanceId}`);
      console.log(`   Owner: ${getUserName()} (${getUserId()})`);
      console.log(`   Dataset: ${datasetId || "none"}`);
    } catch (error) {
      console.error("❌ Failed to sync instance to Y.js:", error);
      console.error("   Instance ID:", instanceId);
      console.error("   Dataset ID:", datasetId);
    }
  }

  /**
   * INTERNAL: Notify callbacks about remote changes
   */
  _notifySyncCallbacks(event) {
    this._syncCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in sync callback:", error);
      }
    });
  }
  // These support the dataset deletion workflow by finding and managing
  // instances that are viewing a particular dataset

  // Add these methods to src/core/instances/instanceManager.js
  // FIXED VERSION with proper defensive checks

  /**
   * Get all instance IDs that are currently viewing a specific dataset
   *
   * This is crucial for the delete workflow - before we delete a dataset,
   * we need to know which instances are using it so we can either warn
   * the user or close those instances automatically.
   *
   * DEFENSIVE: Checks if Maps exist before iterating
   *
   * @param {string} datasetId - The dataset ID to search for
   * @returns {string[]} - Array of instance IDs viewing this dataset
   */
  getInstancesForDataset(datasetId) {
    const instanceIds = [];

    // Get all local instances from workspaceManager (the source of truth)
    const allInstanceIds = workspaceManager.getAllInstanceIds();

    allInstanceIds.forEach((instanceId) => {
      const instance = workspaceManager.getInstance(instanceId);
      if (instance && instance.datasetId === datasetId) {
        instanceIds.push(instanceId);
      }
    });

    // Also check Y.js for remote instances that exist but aren't rendered locally
    // This can happen if a remote user is viewing a dataset we haven't opened yet
    const currentUserId = getUserId();

    if (typeof yInstances !== "undefined") {
      yInstances.forEach((yInstance, instanceId) => {
        // Skip our own instances (already counted from workspaceManager)
        if (yInstance.userId === currentUserId) {
          return;
        }

        // Skip if already in our list
        if (instanceIds.includes(instanceId)) {
          return;
        }

        // Count shared remote instances viewing this dataset
        if (
          yInstance.datasetId === datasetId &&
          yInstance.visibility === "shared"
        ) {
          instanceIds.push(instanceId);
        }
      });
    }

    console.log(
      `📊 Found ${instanceIds.length} instance(s) viewing dataset ${datasetId}`
    );
    return instanceIds;
  }

  /**
   * Delete all instances viewing a specific dataset
   *
   * This is called when deleting a dataset that has active instances.
   * We clean up all the viewports before removing the underlying data.
   *
   * @param {string} datasetId - The dataset whose instances should be deleted
   * @returns {number} - Count of instances that were deleted
   */
  deleteInstancesForDataset(datasetId) {
    const instanceIds = this.getInstancesForDataset(datasetId);

    console.log(
      `🗑️ Deleting ${instanceIds.length} instance(s) for dataset ${datasetId}`
    );

    let deletedCount = 0;

    for (const instanceId of instanceIds) {
      try {
        // Only delete local instances (ones we're rendering)
        // Remote instances will be handled by their owners
        if (this._localInstanceIds.has(instanceId)) {
          this.deleteInstance(instanceId);
          deletedCount++;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to delete instance ${instanceId}:`, error);
      }
    }

    console.log(`✅ Deleted ${deletedCount} local instance(s)`);
    return deletedCount;
  }
}

export const instanceManager = new InstanceManager();

// Make available for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.instanceManager = instanceManager;
}
