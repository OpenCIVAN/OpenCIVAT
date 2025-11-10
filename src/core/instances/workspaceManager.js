// src/core/instances/workspaceManager.js
// Manages multiple VTK viewport instances for multi-window visualization

import { initializeScene } from "@Core/scene/sceneManager.js";
import { generateId } from "@Utils/idGenerator.js";

/**
 * WorkspaceManager
 *
 * Manages multiple VTK renderer instances, each in their own container.
 * Each instance has independent camera, filters, and widgets but can share
 * datasets and annotations.
 *
 * Instance Structure:
 * {
 *   instanceId: string,
 *   container: HTMLElement,
 *   sceneObjects: {
 *     renderer, renderWindow, openGLRenderWindow, camera,
 *     interactor, interactorStyle, XRHelper, vtpReader, mapper, actor
 *   },
 *   datasetId: string | null,
 *   filters: Map<string, any>,
 *   widgets: Map<string, any>,
 *   visibility: Map<string, boolean>
 * }
 */

class WorkspaceManager {
  constructor() {
    this.instances = new Map(); // instanceId → instance data
    this.activeInstanceId = null;
    this._initialized = false;

    console.log("🎨 WorkspaceManager created");
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
   * Create a new VTK instance in the specified container
   *
   * @param {HTMLElement} containerElement - DOM element to render into
   * @param {Object} options - Instance configuration
   * @param {string} options.instanceId - Unique ID for this instance
   * @param {string} options.datasetId - Optional dataset to load
   * @returns {string} The instance ID
   */
  createInstance(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error("Container element is required for createInstance");
    }

    const instanceId = options.instanceId || generateId();

    // Check if instance already exists
    if (this.instances.has(instanceId)) {
      console.warn(
        `⚠️  Instance ${instanceId} already exists, skipping creation`
      );
      return instanceId;
    }

    console.log(`🎨 Creating VTK instance: ${instanceId}`);

    try {
      // Initialize VTK scene in this container
      const sceneObjects = initializeScene(containerElement);

      if (!sceneObjects) {
        throw new Error("Failed to initialize VTK scene");
      }

      // Create instance data structure
      const instance = {
        instanceId,
        container: containerElement,
        sceneObjects,
        datasetId: options.datasetId || null,
        filters: new Map(),
        widgets: new Map(),
        visibility: new Map(),
        createdAt: Date.now(),
        lastActive: Date.now(),
      };

      // Store the instance
      this.instances.set(instanceId, instance);

      // Set as active if it's the first instance
      if (!this.activeInstanceId) {
        this.activeInstanceId = instanceId;
        console.log(`✅ Set ${instanceId} as active instance`);
      }

      console.log(`✅ Instance created: ${instanceId}`);
      console.log(`   Total instances: ${this.instances.size}`);

      return instanceId;
    } catch (error) {
      console.error(`❌ Failed to create instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an instance and clean up its resources
   *
   * @param {string} instanceId - ID of instance to delete
   */
  deleteInstance(instanceId) {
    const instance = this.instances.get(instanceId);

    if (!instance) {
      console.warn(`⚠️  Cannot delete non-existent instance: ${instanceId}`);
      return;
    }

    console.log(`🗑️  Deleting instance: ${instanceId}`);

    try {
      // Clean up VTK objects
      const { sceneObjects } = instance;

      if (sceneObjects.openGLRenderWindow) {
        sceneObjects.openGLRenderWindow.delete();
      }

      if (sceneObjects.renderWindow) {
        sceneObjects.renderWindow.delete();
      }

      if (sceneObjects.renderer) {
        sceneObjects.renderer.delete();
      }

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
    } catch (error) {
      console.error(`❌ Error deleting instance ${instanceId}:`, error);
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
   * Load a dataset into a specific instance
   *
   * @param {string} instanceId - Instance to load into
   * @param {string} datasetId - Dataset ID
   * @param {Object} polydata - VTK polydata object
   */
  loadDatasetIntoInstance(instanceId, datasetId, polydata) {
    const instance = this.getInstance(instanceId);

    if (!instance) {
      console.error(`❌ Cannot load dataset: instance ${instanceId} not found`);
      return;
    }

    console.log(`📊 Loading dataset ${datasetId} into instance ${instanceId}`);

    const { sceneObjects } = instance;
    const { mapper, actor, renderer, renderWindow, camera } = sceneObjects;

    // Set the polydata
    mapper.setInputData(polydata);

    // Add actor if not already in scene
    if (!renderer.getActors().includes(actor)) {
      renderer.addActor(actor);
    }

    // Reset camera to fit data
    renderer.resetCamera();
    renderWindow.render();

    // Update instance metadata
    instance.datasetId = datasetId;
    instance.lastActive = Date.now();

    console.log(`✅ Dataset loaded into instance ${instanceId}`);
  }

  /**
   * Duplicate an instance (copy camera, filters, dataset)
   *
   * @param {string} sourceInstanceId - Instance to duplicate
   * @returns {string|null} New instance ID or null on failure
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

    // For now, just return the ID - actual duplication will be implemented later
    // This requires creating a new container element from React
    console.log("⚠️  Instance duplication not fully implemented yet");
    return null;
  }

  /**
   * Check if manager is initialized
   *
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
}

// Create and export singleton instance
export const workspaceManager = new WorkspaceManager();

// Also export the class for testing
export { WorkspaceManager };
