// src/core/instances/workspaceManager.js
// Type-agnostic workspace manager using the plugin architecture
// Manages multiple visualization instances without knowing their specific implementations

import { generateInstanceId } from "@Utils/idGenerator.js";
import { getHandlerForType } from "@Core/instances/types/instanceTypesInit.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { yInstances } from "@Collaboration/yjs/yjsSetup.js";

/**
 * WorkspaceManager
 *
 * TRANSFORMED FROM VTK-SPECIFIC TO TYPE-AGNOSTIC
 *
 * This manager no longer knows about VTK or any specific
 * visualization technology. Instead, it works through the handler interface
 * to create and manage instances of any registered type.
 *
 * Key changes from the old version:
 * 1. Accepts 'type' parameter in createInstance (defaults to 'vtk')
 * 2. Gets handler from registry instead of calling initializeScene
 * 3. Stores handler-returned instanceData instead of VTK sceneObjects
 * 4. Delegates cleanup to handler.cleanup()
 * 5. Delegates data loading to handler.loadData()
 *
 * The public API remains mostly compatible with the old version, so existing
 * components continue working without modification.
 */
class WorkspaceManager {
  constructor() {
    // Map of instanceId → instance metadata
    // Each instance stores both general metadata (id, created time, etc.)
    // and handler-specific data (whatever the handler returned from initialize)
    this.instances = new Map();

    // Track which instance is currently active
    this.activeInstanceId = null;

    // Initialization flag
    this._initialized = false;

    // Change listeners for React components
    this.listeners = new Set();

    console.log("🎨 WorkspaceManager created (type-agnostic)");
  }

  /**
   * Initialize the workspace manager
   */
  initialize() {
    if (this._initialized) {
      console.log("⚠️  WorkspaceManager already initialized");
      return;
    }

    this._initialized = true;
    console.log("✅ WorkspaceManager initialized");
  }

  /**
   * Create a new instance in the specified container
   *
   * THIS IS THE CRITICAL METHOD - it's where the plugin pattern is used.
   * Instead of calling VTK-specific code, it gets a handler from the registry
   * and delegates instance creation to that handler.
   *
   * @param {HTMLElement} containerElement - DOM element to render into
   * @param {Object} options - Instance configuration
   * @param {string} [options.instanceId] - Unique ID (generated if not provided)
   * @param {string} [options.type='vtk'] - Instance type identifier
   * @param {string} [options.datasetId] - Optional dataset to load immediately
   * @returns {string} The instance ID
   */
  async createInstance(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error("Container element is required for createInstance");
    }

    // Extract options with defaults
    const instanceId = options.instanceId || generateInstanceId();
    const type = options.type || "vtk"; // Default to VTK for backward compatibility
    const datasetId = options.datasetId || null;

    // Check if instance already exists
    if (this.instances.has(instanceId)) {
      console.warn(
        `⚠️  Instance ${instanceId} already exists, skipping creation`
      );
      return instanceId;
    }

    console.log(`🎨 Creating ${type} instance: ${instanceId}`);

    try {
      // THE KEY CHANGE: Get handler from registry instead of calling VTK directly
      const handler = getHandlerForType(type);

      // Delegate instance initialization to the handler
      // The handler knows how to create its specific rendering pipeline
      // (VTK creates renderers, Plotly creates charts, etc.)
      const instanceData = await handler.initialize(containerElement, {
        instanceId,
        datasetId,
      });

      // Create general metadata structure
      // This separates type-agnostic metadata from type-specific instance data
      const instance = {
        // General metadata (same for all instance types)
        instanceId,
        type, // NEW: track what type this instance is
        container: containerElement,
        datasetId,
        createdAt: Date.now(),
        lastActive: Date.now(),

        // Handler-specific data (structure depends on instance type)
        // For VTK: { sceneObjects, actors, widgets, etc. }
        // For Plotly: { plotlyDiv, traces, layout, etc. }
        instanceData,

        // Keep reference to handler for future operations
        handler,
      };

      // Store the instance
      this.instances.set(instanceId, instance);
      // 🆕 NEW: Subscribe to state changes from this instance's adapter
      // This ensures camera movements get synced to Y.js for other users to see
      if (instanceData.stateAdapter) {
        console.log(
          `📡 WorkspaceManager: Subscribing to state changes for ${instanceId}`
        );
        const unsubscribe = instanceData.stateAdapter.observe((stateUpdate) => {
          // Update Y.js with the new state so other users can see it
          const yInstance = yInstances.get(instanceId);
          if (yInstance && yInstance.userId === this._getCurrentUserId()) {
            yInstances.set(instanceId, {
              ...yInstance,
              typeSpecificState: stateUpdate.fullState,
              lastModified: Date.now(),
            });
            console.log(`📤 Published state update for ${instanceId}`);
          }
        });
        // Store the unsubscribe function for cleanup
        if (!this._stateSubscriptions) {
          this._stateSubscriptions = new Map();
        }
        this._stateSubscriptions.set(instanceId, unsubscribe);
      }

      console.log(`✅ WorkspaceManager: Instance ${instanceId} created`);

      // Set as active if it's the first instance
      if (!this.activeInstanceId) {
        this.activeInstanceId = instanceId;
        console.log(`✅ Set ${instanceId} as active instance`);
      }

      console.log(`✅ Instance created: ${instanceId} (${type})`);
      console.log(`   Total instances: ${this.instances.size}`);

      // Notify listeners (for React components)
      this._notifyListeners();

      return instanceId;
    } catch (error) {
      console.error(
        `❌ Failed to create ${type} instance ${instanceId}:`,
        error
      );
      throw error;
    }
  }

  _getCurrentUserId() {
    return window.CIA?.sessionManager?.userId || getUserId();
  }

  /**
   * Delete an instance and clean up its resources
   *
   * Now delegates cleanup to the handler instead of directly
   * deleting VTK objects. Each handler knows how to clean up its own resources.
   *
   * @param {string} instanceId - ID of instance to delete
   */
  async deleteInstance(instanceId) {
    const instance = this.instances.get(instanceId);

    if (!instance) {
      console.warn(`⚠️  Cannot delete non-existent instance: ${instanceId}`);
      return;
    }

    console.log(`🗑️  Deleting instance: ${instanceId} (${instance.type})`);

    try {
      // Unsubscribe from state updates
      if (
        this._stateSubscriptions &&
        this._stateSubscriptions.has(instanceId)
      ) {
        const unsubscribe = this._stateSubscriptions.get(instanceId);
        unsubscribe();
        this._stateSubscriptions.delete(instanceId);
        console.log(`✅ State subscription cleaned up for ${instanceId}`);
      }

      // Delegate cleanup to the handler
      // The handler knows how to properly dispose of its resources
      // VTK handler deletes VTK objects, Plotly handler cleans up Plotly, etc.
      await instance.handler.cleanup(instance.instanceData);

      // Remove from instances map
      this.instances.delete(instanceId);

      // Update active instance if needed
      if (this.activeInstanceId === instanceId) {
        // Set to first remaining instance or null
        const remainingIds = Array.from(this.instances.keys());
        this.activeInstanceId =
          remainingIds.length > 0 ? remainingIds[0] : null;

        if (this.activeInstanceId) {
          console.log(
            `✅ Active instance switched to: ${this.activeInstanceId}`
          );
        }
      }

      console.log(`✅ Instance deleted: ${instanceId}`);
      console.log(`   Remaining instances: ${this.instances.size}`);

      // Notify listeners
      this._notifyListeners();
    } catch (error) {
      console.error(`❌ Error deleting instance ${instanceId}:`, error);
    }
  }

  /**
   * Load a dataset into a specific instance
   *
   * UPDATED: Now delegates data loading to the handler instead of directly
   * manipulating VTK mappers and actors. Each handler knows how to render
   * data in its specific format.
   *
   * @param {string} instanceId - Instance to load into
   * @param {string} datasetId - Dataset ID
   * @param {Object} data - The data to load (format depends on instance type)
   */
  async loadDatasetIntoInstance(instanceId, datasetId, data) {
    const instance = this.getInstance(instanceId);

    if (!instance) {
      console.error(`❌ Cannot load dataset: instance ${instanceId} not found`);
      return;
    }

    console.log(
      `📊 Loading dataset ${datasetId} into ${instance.type} instance ${instanceId}`
    );

    try {
      // THE KEY CHANGE: Delegate to handler instead of VTK-specific code
      // The handler knows how to render this data type
      // VTK handler expects polydata, Plotly might expect JSON, etc.
      await instance.handler.loadData(
        instance.instanceData,
        { id: datasetId }, // Dataset metadata
        data // Actual data
      );

      // Update instance metadata
      instance.datasetId = datasetId;
      instance.lastActive = Date.now();

      console.log(`✅ Dataset loaded into instance ${instanceId}`);

      // Notify listeners
      this._notifyListeners();
    } catch (error) {
      console.error(
        `❌ Failed to load dataset into instance ${instanceId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get an instance by ID
   *
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} Instance data or null
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId) || null;
  }

  /**
   * Get the currently active instance
   *
   * @returns {Object|null} Active instance data or null
   */
  getActiveInstance() {
    if (!this.activeInstanceId) {
      return null;
    }
    return this.getInstance(this.activeInstanceId);
  }

  /**
   * Set the active instance
   *
   * @param {string} instanceId - Instance ID to make active
   */
  setActiveInstance(instanceId) {
    if (!this.instances.has(instanceId)) {
      console.warn(
        `⚠️  Cannot set non-existent instance as active: ${instanceId}`
      );
      return;
    }

    this.activeInstanceId = instanceId;
    const instance = this.instances.get(instanceId);
    instance.lastActive = Date.now();

    console.log(`✅ Active instance set to: ${instanceId}`);

    // Notify listeners
    this._notifyListeners();
  }

  /**
   * Get all instance IDs
   *
   * @returns {string[]} Array of instance IDs
   */
  getAllInstanceIds() {
    return Array.from(this.instances.keys());
  }

  /**
   * Get the total number of instances
   *
   * @returns {number} Number of instances
   */
  getInstanceCount() {
    return this.instances.size;
  }

  /**
   * Get instances by type
   *
   * NEW METHOD: Allows filtering instances by their type.
   * Useful for UI that wants to show only VTK instances, or only Plotly, etc.
   *
   * @param {string} type - Instance type identifier
   * @returns {Object[]} Array of instances of this type
   */
  getInstancesByType(type) {
    const instances = [];

    for (const [id, instance] of this.instances.entries()) {
      if (instance.type === type) {
        instances.push(instance);
      }
    }

    return instances;
  }

  /**
   * Get available tools for an instance
   *
   * NEW METHOD: Retrieves tools from the instance's handler.
   * This enables type-specific toolbars without the workspace manager
   * knowing what tools each type provides.
   *
   * @param {string} instanceId - Instance ID
   * @returns {Array<Object>} Tool configurations from handler
   */
  getInstanceTools(instanceId) {
    const instance = this.getInstance(instanceId);

    if (!instance) {
      console.warn(`⚠️  Cannot get tools: instance ${instanceId} not found`);
      return [];
    }

    return instance.handler.getTools(instance.instanceData);
  }

  /**
   * Get header information for an instance
   *
   * NEW METHOD: Retrieves header info from the instance's handler.
   * This enables type-specific viewport headers without hardcoding.
   *
   * @param {string} instanceId - Instance ID
   * @returns {Object} Header information from handler
   */
  getInstanceHeaderInfo(instanceId) {
    const instance = this.getInstance(instanceId);

    if (!instance) {
      console.warn(
        `⚠️  Cannot get header info: instance ${instanceId} not found`
      );
      return { stats: [], indicators: [] };
    }

    return instance.handler.getHeaderInfo(instance.instanceData);
  }

  /**
   * Check if manager is initialized
   *
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  // =========================================================================
  // LISTENER MANAGEMENT FOR REACT INTEGRATION
  // These methods enable React components to reactively update when instances change
  // =========================================================================

  /**
   * Add a change listener
   *
   * @param {Function} callback - Function to call when instances change
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove a change listener
   *
   * @param {Function} callback - Function to remove
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of a change
   *
   * @private
   */
  _notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("❌ Error in workspace listener:", error);
      }
    });
  }

  // =========================================================================
  // BACKWARD COMPATIBILITY METHODS
  // These provide compatibility with old code that expects VTK-specific behavior
  // =========================================================================

  /**
   * Duplicate an instance (copy camera, filters, dataset)
   *
   * @param {string} sourceInstanceId - Instance to duplicate
   * @returns {string|null} New instance ID or null on failure
   *
   * NOTE: This requires the container to be provided from React.
   * For now, we're leaving this as a stub to maintain API compatibility.
   */
  duplicateInstance(sourceInstanceId) {
    const sourceInstance = this.getInstance(sourceInstanceId);

    if (!sourceInstance) {
      console.error(
        `❌ Cannot duplicate: instance ${sourceInstanceId} not found`
      );
      return null;
    }

    console.log(`📋 Duplicating instance: ${sourceInstanceId}`);
    console.log(
      "⚠️  Instance duplication requires container from React - not fully implemented yet"
    );

    // TODO: This will be implemented when React components are updated
    // to handle instance duplication through the UI
    return null;
  }
}

// Create and export singleton instance
export const workspaceManager = new WorkspaceManager();

// Also export the class for testing
export { WorkspaceManager };
