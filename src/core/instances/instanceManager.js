// src/core/instances/instanceManager.js
// High-level API for instance management
// Abstracts away the complexity of Y.js sync, stores, and workspace management

import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { yInstances } from "@Collaboration/yjs/yjsSetup.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";

/**
 * InstanceManager
 *
 * Provides a simple, high-level API for managing visualization instances.
 * Handles all the complexity of synchronization, state management, and collaboration.
 *
 * This is the ONLY API that components should use for instance operations.
 * It sits above workspaceManager, instanceStore, and Y.js, orchestrating them all.
 */
class InstanceManager {
  constructor() {
    this.localInstances = new Map(); // instanceId → metadata
    this.remoteInstanceCallbacks = [];
    this._observerAttached = false;
  }

  /**
   * Initialize the instance manager
   * Sets up Y.js observation for remote instances
   */
  initialize() {
    if (this._observerAttached) {
      console.log("⚠️ InstanceManager already initialized");
      return;
    }

    console.log("🎨 InstanceManager: Initializing...");

    // Set up Y.js observer for remote instances
    yInstances.observe((event) => {
      const currentUserId = getUserId();

      event.changes.keys.forEach((change, instanceId) => {
        if (change.action === "add" || change.action === "update") {
          const remoteInstance = yInstances.get(instanceId);

          if (!remoteInstance) return;

          // Skip our own instances (already handled locally)
          if (remoteInstance.userId === currentUserId) {
            return;
          }

          // Skip private instances from other users
          if (remoteInstance.visibility !== "shared") {
            return;
          }

          // Notify listeners about this remote instance
          console.log(`🌐 Remote instance detected: ${instanceId}`);
          console.log(
            `   User: ${remoteInstance.userName || remoteInstance.userId}`
          );
          console.log(`   Dataset: ${remoteInstance.datasetId || "none"}`);

          this._notifyRemoteInstanceCallbacks({
            action: "add",
            instanceId,
            instance: remoteInstance,
          });
        }

        if (change.action === "delete") {
          console.log(`🗑️ Remote instance removed: ${instanceId}`);

          this._notifyRemoteInstanceCallbacks({
            action: "delete",
            instanceId,
          });
        }
      });
    });

    this._observerAttached = true;
    console.log("✅ InstanceManager initialized");
  }

  /**
   * Spawn a new instance
   *
   * This is the PRIMARY method for creating instances.
   * It handles all the synchronization automatically.
   *
   * @param {Object} options - Instance configuration
   * @param {string} options.datasetId - Dataset to load (optional)
   * @param {HTMLElement} options.container - Container element for VTK scene
   * @param {string} options.visibility - "shared" or "private" (default: shared)
   * @returns {string} The instance ID
   */
  spawnInstance({ datasetId = null, container, visibility = "shared" }) {
    const instanceId = `instance-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const currentUserId = getUserId();
    const currentUserName = getUserName();

    console.log(`🆕 Spawning new instance: ${instanceId}`);
    if (datasetId) {
      console.log(`   Dataset: ${datasetId}`);
    }
    console.log(`   Visibility: ${visibility}`);

    // Create the metadata
    const instanceMetadata = {
      id: instanceId,
      userId: currentUserId,
      userName: currentUserName,
      datasetId: datasetId,
      visibility: visibility,
      type: "desktop", // future: could be "vr"
      camera: null, // will be set by VTK scene
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    // Store locally
    this.localInstances.set(instanceId, instanceMetadata);

    // Create the VTK scene
    if (container) {
      try {
        workspaceManager.createInstance(container, { instanceId });
        console.log(`✅ VTK scene created for instance: ${instanceId}`);
      } catch (error) {
        console.error(`❌ Failed to create VTK scene:`, error);
        this.localInstances.delete(instanceId);
        throw error;
      }
    }

    // Sync to Y.js if shared
    if (visibility === "shared") {
      this._syncInstanceToYjs(instanceId, instanceMetadata);
    }

    return instanceId;
  }

  /**
   * Load a dataset into an existing instance
   *
   * @param {string} instanceId - Instance to load into
   * @param {string} datasetId - Dataset to load
   * @param {Object} polydata - VTK polydata object
   */
  loadDatasetIntoInstance(instanceId, datasetId, polydata) {
    console.log(`📊 Loading dataset ${datasetId} into instance ${instanceId}`);

    // Update local metadata
    const instance = this.localInstances.get(instanceId);
    if (instance) {
      instance.datasetId = datasetId;
      instance.lastActive = Date.now();

      // Sync the update to Y.js
      if (instance.visibility === "shared") {
        this._syncInstanceToYjs(instanceId, instance);
      }
    }

    // Load into VTK
    try {
      workspaceManager.loadDatasetIntoInstance(instanceId, datasetId, polydata);
      console.log(`✅ Dataset loaded into instance`);
    } catch (error) {
      console.error(`❌ Failed to load dataset:`, error);
      throw error;
    }
  }

  /**
   * Delete an instance
   *
   * @param {string} instanceId - Instance to delete
   */
  deleteInstance(instanceId) {
    console.log(`🗑️ Deleting instance: ${instanceId}`);

    // Clean up VTK scene
    try {
      workspaceManager.deleteInstance(instanceId);
    } catch (error) {
      console.warn(`⚠️ Error cleaning up VTK:`, error);
    }

    // Remove from local storage
    this.localInstances.delete(instanceId);

    // Remove from Y.js
    if (yInstances.has(instanceId)) {
      yInstances.delete(instanceId);
      console.log(`📤 Removed from Y.js: ${instanceId}`);
    }
  }

  /**
   * Get all local instances (created by this user)
   *
   * @returns {Array} Array of instance metadata
   */
  getLocalInstances() {
    return Array.from(this.localInstances.values());
  }

  /**
   * Get all remote instances (from other users)
   *
   * @returns {Array} Array of remote instance metadata
   */
  getRemoteInstances() {
    const currentUserId = getUserId();
    const remoteInstances = [];

    yInstances.forEach((instance, instanceId) => {
      if (
        instance.userId !== currentUserId &&
        instance.visibility === "shared"
      ) {
        remoteInstances.push({
          ...instance,
          id: instanceId,
        });
      }
    });

    return remoteInstances;
  }

  /**
   * Get count of instances viewing a specific dataset
   *
   * @param {string} datasetId - Dataset ID
   * @returns {number} Number of instances
   */
  getInstanceCountForDataset(datasetId) {
    let count = 0;

    // Count local instances
    this.localInstances.forEach((instance) => {
      if (instance.datasetId === datasetId) {
        count++;
      }
    });

    // Count remote instances
    const currentUserId = getUserId();
    yInstances.forEach((instance) => {
      if (
        instance.userId !== currentUserId &&
        instance.datasetId === datasetId &&
        instance.visibility === "shared"
      ) {
        count++;
      }
    });

    return count;
  }

  /**
   * Listen for remote instance changes
   *
   * @param {Function} callback - Called when remote instances change
   * @returns {Function} Cleanup function
   */
  onRemoteInstanceChange(callback) {
    this.remoteInstanceCallbacks.push(callback);

    // Return cleanup function
    return () => {
      this.remoteInstanceCallbacks = this.remoteInstanceCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * INTERNAL: Sync instance to Y.js
   */
  _syncInstanceToYjs(instanceId, metadata) {
    try {
      yInstances.set(instanceId, {
        id: metadata.id,
        userId: metadata.userId,
        userName: metadata.userName,
        datasetId: metadata.datasetId,
        visibility: metadata.visibility,
        type: metadata.type,
        camera: metadata.camera,
        createdAt: metadata.createdAt,
        lastActive: metadata.lastActive,
      });

      console.log(`📤 Instance synced to Y.js: ${instanceId}`);
    } catch (error) {
      console.error(`❌ Failed to sync to Y.js:`, error);
    }
  }

  /**
   * INTERNAL: Notify callbacks about remote instance changes
   */
  _notifyRemoteInstanceCallbacks(event) {
    this.remoteInstanceCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in remote instance callback:", error);
      }
    });
  }
}

// Create and export singleton
export const instanceManager = new InstanceManager();

// Make available for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.instanceManager = instanceManager;
}
