// src/core/instances/workspaceManager.js
// Type-agnostic workspace manager using the plugin architecture

import { generateInstanceId } from "@Utils/idGenerator.js";
import { getHandlerForType } from "@Core/instances/types/instanceTypesInit.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { datasetManager } from "@Init/appInitializer.js";
import { instance as log } from "@Utils/logger.js";

// ViewConfigurations (Layer 2) are the collaborative unit

// ============================================================================
// ARCHITECTURAL NOTE
// ============================================================================
//
// WorkspaceManager manages InstanceWindows (Layer 3) which are EPHEMERAL.
// They are local GPU renderers that:
// - Can be created and destroyed freely
// - Don't sync to other users
// - Read their visualization state from ViewConfigurations
//
// The Three-Layer Model:
//
//   Layer 1: Dataset (owns raw data + annotations)
//            ↓
//   Layer 2: ViewConfiguration (owns camera, filters, widgets)
//            ↓ syncs via Y.js
//   Layer 3: InstanceWindow (ephemeral renderer, NO sync)
//
// When an instance renders, it reads from its ViewConfiguration.
// When the camera moves, the ViewConfiguration updates (and syncs).
// The instance itself never syncs - it's just a "projector".
//
// ============================================================================

/**
 * WorkspaceManager
 *
 * Manages instance windows that can start TYPELESS and become typed when data loads.
 * This enables truly generic instances that adapt to their content.
 */
class WorkspaceManager {
  constructor() {
    this.instances = new Map();
    this.activeInstanceId = null;
    this._initialized = false;
    this.listeners = new Set();

    log.debug("WorkspaceManager created (type-agnostic)");
  }

  initialize() {
    if (this._initialized) {
      log.warn("WorkspaceManager already initialized");
      return;
    }

    this._initialized = true;
    log.info("WorkspaceManager initialized");
  }

  /**
   * Create a new instance in the specified container
   *
   * Type can be NULL - instance will determine type when data loads.
   *
   * @param {HTMLElement} containerElement - DOM element to render into
   * @param {string|null} type - Instance type ('vtk', 'plot', etc.) or null for typeless
   * @param {Object} options - Instance configuration
   * @returns {string} The instance ID
   */
  async createInstance(containerElement, type = null, options = {}) {
    if (!containerElement) {
      throw new Error("Container element is required for createInstance");
    }

    const instanceId = options.instanceId || generateInstanceId();
    const { viewConfigId, datasetId } = options;

    if (this.instances.has(instanceId)) {
      log.warn(`Instance ${instanceId} already exists, skipping creation`);
      return instanceId;
    }

    log.debug(`Creating ${type || "typeless"} instance: ${instanceId}`);

    try {
      // Create instance metadata (handler will be initialized later if needed)
      const instance = {
        instanceId,
        type: type, // Can be null - will be set when data loads
        container: containerElement,
        handler: null, // Will be set when type is determined
        instanceData: null, // Will be set when handler initializes
        datasetId: datasetId || null,
        viewConfigId: viewConfigId || null,
        createdAt: Date.now(),
        lastActive: Date.now(),
      };

      // If type is provided, initialize handler immediately
      if (type) {
        await this._initializeHandler(instance, type);
      }

      // Store instance
      this.instances.set(instanceId, instance);

      // Set as active
      this.activeInstanceId = instanceId;

      log.debug(
        `Instance created: ${instanceId} (${type || "typeless"}), total: ${
          this.instances.size
        }`
      );

      // Notify listeners
      this._notifyListeners();

      return instanceId;
    } catch (error) {
      log.error("Failed to create instance:", error);
      throw error;
    }
  }

  /**
   * Initialize handler for an instance
   * @private
   */
  async _initializeHandler(instance, type) {
    log.debug(
      `Initializing ${type} handler for instance ${instance.instanceId}`
    );

    const handler = getHandlerForType(type);
    const instanceData = await handler.initialize(instance.container, {
      instanceId: instance.instanceId,
      datasetId: instance.datasetId,
      viewConfigId: instance.viewConfigId,
    });

    instance.handler = handler;
    instance.instanceData = instanceData;
    instance.type = type;

    log.debug(`Handler initialized for instance ${instance.instanceId}`);
  }

  /**
   * Load data into an instance
   *
   * If instance doesn't have a type, this will determine it from the dataset.
   *
   * @param {string} instanceId - Instance to load data into
   * @param {string} datasetId - Dataset to load
   */
  async loadDataIntoInstance(instanceId, datasetId) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    try {
      log.debug(`Loading dataset ${datasetId} into instance ${instanceId}`);

      // Get the dataset
      const dataset = datasetManager.getDataset(datasetId);
      if (!dataset) {
        throw new Error(`Dataset ${datasetId} not found`);
      }

      // CRITICAL: If instance doesn't have a type yet, determine it from dataset
      if (!instance.type) {
        const inferredType = this._inferTypeFromDataset(dataset);
        log.debug(`Instance ${instanceId} type inferred: ${inferredType}`);

        // Initialize the handler now that we know the type
        await this._initializeHandler(instance, inferredType);
      }

      // Load the data through the handler
      // The handler will call datasetManager.loadFile() internally if needed
      await instance.handler.loadData(instance.instanceData, dataset);

      // Update instance metadata
      instance.datasetId = datasetId;
      instance.lastActive = Date.now();

      log.debug(`Dataset loaded into instance ${instanceId}`);

      // Emit event for workspace updates
      window.dispatchEvent(
        new CustomEvent("cia:tools-updated", {
          detail: { instanceId },
        })
      );

      // Notify listeners so UI updates (toolbar should appear now)
      this._notifyListeners();
    } catch (error) {
      log.error(`Failed to load dataset into instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Infer instance type from dataset
   * @private
   */
  _inferTypeFromDataset(dataset) {
    const typeMap = {
      vtp: "vtk",
      vti: "vtk",
      vtu: "vtk",
      csv: "plot",
      json: "plot",
      png: "image",
      jpg: "image",
      jpeg: "image",
    };

    const fileType = dataset.fileType.toLowerCase();
    return typeMap[fileType] || "vtk"; // Default to vtk if unknown
  }

  /**
   * Delete an instance
   */
  async deleteInstance(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      log.warn(`Instance ${instanceId} not found`);
      return;
    }

    log.debug(`Deleting instance: ${instanceId}`);

    try {
      // Clean up handler if it exists
      if (instance.handler && instance.instanceData) {
        await instance.handler.cleanup(instance.instanceData);
      }

      // Remove from map
      this.instances.delete(instanceId);

      // Clear active if this was active
      if (this.activeInstanceId === instanceId) {
        this.activeInstanceId = null;
      }

      log.debug(
        `Instance deleted: ${instanceId}, remaining: ${this.instances.size}`
      );

      // Notify listeners
      this._notifyListeners();
    } catch (error) {
      log.error(`Error deleting instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Get an instance by ID
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId) || null;
  }

  /**
   * Get all instance IDs
   */
  getAllInstanceIds() {
    return Array.from(this.instances.keys());
  }

  /**
   * Get the total number of instances
   */
  getInstanceCount() {
    return this.instances.size;
  }

  /**
   * Get instances by type
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
   * Returns empty array if instance has no type/handler yet
   */
  getInstanceTools(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance || !instance.handler || !instance.type) {
      return []; // No tools for typeless instances
    }

    return instance.handler.getTools(instance.instanceData);
  }

  /**
   * Get header information for an instance
   * Returns default info if instance has no type yet
   */
  getInstanceHeaderInfo(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      return { title: "Unknown", stats: {} };
    }

    if (!instance.handler || !instance.type) {
      return {
        title: "Empty Instance",
        stats: { status: "Waiting for data" },
      };
    }

    return instance.handler.getHeaderInfo(instance.instanceData);
  }

  /**
   * Set the active instance
   */
  setActiveInstance(instanceId) {
    if (!this.instances.has(instanceId)) {
      log.warn(`Cannot set non-existent instance as active: ${instanceId}`);
      return;
    }

    this.activeInstanceId = instanceId;
    const instance = this.instances.get(instanceId);
    instance.lastActive = Date.now();

    this._notifyListeners();
  }

  /**
   * Get the currently active instance
   */
  getActiveInstance() {
    if (!this.activeInstanceId) {
      return null;
    }
    return this.getInstance(this.activeInstanceId);
  }

  /**
   * Check if manager is initialized
   */
  isInitialized() {
    return this._initialized;
  }

  // =========================================================================
  // LISTENER MANAGEMENT FOR REACT INTEGRATION
  // =========================================================================

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  _notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        log.error("Error in workspace listener:", error);
      }
    });
  }
}

// Create and export singleton
export const workspaceManager = new WorkspaceManager();
export { WorkspaceManager };
