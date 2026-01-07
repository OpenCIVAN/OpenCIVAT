// src/core/instances/workspaceManager.js
// Type-agnostic workspace manager using the plugin architecture

import { generateInstanceId } from "@Utils/idGenerator.js";
import { getHandlerForType } from "@Core/instances/types/instanceTypesInit.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import {
  getDatasetManager,
  getViewConfigurationManager,
} from "@Init/appInitializer.js";
import { onCameraChange } from "@Collaboration/yjs/yjsObservers.js";
import {
  instance as log,
  logInfo,
  logSuccess,
  logError,
} from "@Utils/logger.js";

// ============================================================================
// INSTANCE COLORS - For visual differentiation of instances
// ============================================================================

const INSTANCE_COLORS = [
  { name: "blue", hex: "#60a5fa" },
  { name: "green", hex: "#34d399" },
  { name: "purple", hex: "#c084fc" },
  { name: "pink", hex: "#fb7185" },
  { name: "amber", hex: "#fbbf24" },
  { name: "teal", hex: "#7dd3fc" },
];

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
    this._colorIndex = 0; // Track color assignment

    log.debug("WorkspaceManager created (type-agnostic)");
  }

  initialize() {
    if (this._initialized) {
      log.warn("WorkspaceManager already initialized");
      return;
    }

    // Set up listener for remote view updates (camera sync, etc.)
    this._setupViewSyncListener();

    this._initialized = true;
    log.info("WorkspaceManager initialized");
  }

  /**
   * Set up listener for ViewConfiguration updates from server
   * This enables camera synchronization between instances viewing the same view
   * @private
   */
  _setupViewSyncListener() {
    // REAL-TIME: Listen for Y.js camera updates (instant, smooth sync)
    onCameraChange(({ viewId, camera, userId }) => {
      if (camera) {
        this._handleYjsCameraUpdate(viewId, camera, userId);
      }
    });
    log.debug("Y.js camera sync listener registered (real-time)");

    // PERSISTENCE: Listen for server view updates (fallback + durability)
    if (getViewConfigurationManager()) {
      getViewConfigurationManager()?.on("viewUpdated", (view) => {
        this._handleRemoteViewUpdate(view);
      });
      log.debug("Server view sync listener registered (persistence)");
    }
  }

  /**
   * Handle Y.js camera update - apply immediately for smooth real-time sync
   * @private
   */
  _handleYjsCameraUpdate(viewId, camera, sourceUserId) {
    // Find all instances viewing this view
    for (const [instanceId, instance] of this.instances) {
      if (instance.viewConfigId !== viewId) continue;
      if (!instance.handler || !instance.instanceData) continue;

      try {
        // Call handler's applySharedState for immediate camera update
        if (typeof instance.handler.applySharedState === "function") {
          instance.handler.applySharedState(
            instance.instanceData,
            { camera },
            sourceUserId || "remote"
          );
        }
      } catch (error) {
        log.error(
          `Failed to apply Y.js camera to instance ${instanceId}:`,
          error
        );
      }
    }
  }

  /**
   * Handle remote view update - apply camera/state changes to local instances
   * @private
   */
  _handleRemoteViewUpdate(view) {
    if (!view || !view.id) return;

    const viewId = view.id;

    // Find all instances viewing this view
    for (const [instanceId, instance] of this.instances) {
      if (instance.viewConfigId !== viewId) continue;
      if (!instance.handler || !instance.instanceData) continue;

      // Skip if this instance triggered the update (prevent loops)
      // The handler's _isApplyingRemoteState flag handles this internally too

      try {
        // Build state object from view
        const state = {};

        if (view.camera) {
          state.camera = view.camera;
        }

        if (view.colorMaps) {
          state.colorMaps = view.colorMaps;
        }

        // Only apply if there's state to apply
        if (Object.keys(state).length > 0) {
          log.debug(`Applying remote view state to instance ${instanceId}`);

          // Call handler's applySharedState
          if (typeof instance.handler.applySharedState === "function") {
            instance.handler.applySharedState(
              instance.instanceData,
              state,
              view.lastModifiedBy || "remote"
            );
          }
        }
      } catch (error) {
        log.error(
          `Failed to apply remote state to instance ${instanceId}:`,
          error
        );
      }
    }
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
      // Assign a color to this instance
      const color = this._getNextColor();

      // Create instance metadata (handler will be initialized later if needed)
      const instance = {
        instanceId,
        type: type, // Can be null - will be set when data loads
        container: containerElement,
        handler: null, // Will be set when type is determined
        instanceData: null, // Will be set when handler initializes
        datasetId: datasetId || null,
        viewConfigId: viewConfigId || null,
        color: color, // Assigned color for visual differentiation
        colorIndex: this._colorIndex - 1, // Store the index for reference
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
      logInfo(`View created: ${type || "typeless"} instance`);

      // Notify listeners
      this._notifyListeners();

      return instanceId;
    } catch (error) {
      log.error("Failed to create instance:", error);
      logError("Failed to create view instance");
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
      const dataset = getDatasetManager()?.getDataset(datasetId);
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
      // The handler will call getDatasetManager()?.loadFile() internally if needed
      await instance.handler.loadData(instance.instanceData, dataset);

      // Update instance metadata
      instance.datasetId = datasetId;
      instance.lastActive = Date.now();

      log.debug(`Dataset loaded into instance ${instanceId}`);
      logSuccess(`Data loaded: ${dataset.filename || "dataset"}`);

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
      logError(`Failed to load data into view`);
      throw error;
    }
  }

  /**
   * Get the next color in the rotation
   * @private
   */
  _getNextColor() {
    const color = INSTANCE_COLORS[this._colorIndex % INSTANCE_COLORS.length];
    this._colorIndex++;
    return color;
  }

  /**
   * Get the color assigned to an instance
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} Color object with name and hex, or null if not found
   */
  getInstanceColor(instanceId) {
    const instance = this.getInstance(instanceId);
    return instance ? instance.color : null;
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
   * Get instance by viewConfigId
   * @param {string} viewConfigId - View configuration ID
   * @returns {Object|null} Instance object or null if not found
   */
  getInstanceByViewConfigId(viewConfigId) {
    for (const [id, instance] of this.instances.entries()) {
      if (instance.viewConfigId === viewConfigId) {
        return instance;
      }
    }
    return null;
  }

  /**
   * Get the color for a view (via its active instance)
   * @param {string} viewConfigId - View configuration ID
   * @returns {Object|null} Color object with name and hex, or null if no active instance
   */
  getViewColor(viewConfigId) {
    const instance = this.getInstanceByViewConfigId(viewConfigId);
    return instance ? instance.color : null;
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
  // INSTANCE LIFECYCLE MANAGEMENT (pause/resume)
  // =========================================================================

  /**
   * Pause an instance - stops interactions and GPU work
   *
   * Paused instances keep their WebGL context but:
   * - Don't handle mouse/keyboard events
   * - Don't sync camera to Y.js
   * - Don't receive animation frame updates
   *
   * This is used for warm-caching recently used views.
   *
   * @param {string} instanceId - Instance to pause
   * @returns {boolean} True if paused successfully
   */
  pauseInstance(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      log.warn(`Cannot pause: instance ${instanceId} not found`);
      return false;
    }

    if (!instance.handler?.pauseInstance) {
      log.warn(`Handler for instance ${instanceId} doesn't support pause`);
      return false;
    }

    const result = instance.handler.pauseInstance(instance.instanceData);
    if (result) {
      instance.lifecycleState = "paused";
      log.debug(`Instance ${instanceId} paused`);
    }
    return result;
  }

  /**
   * Resume a paused instance - restores interactions and GPU work
   *
   * @param {string} instanceId - Instance to resume
   * @returns {boolean} True if resumed successfully
   */
  resumeInstance(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      log.warn(`Cannot resume: instance ${instanceId} not found`);
      return false;
    }

    if (!instance.handler?.resumeInstance) {
      log.warn(`Handler for instance ${instanceId} doesn't support resume`);
      return false;
    }

    const result = instance.handler.resumeInstance(instance.instanceData);
    if (result) {
      instance.lifecycleState = "live";
      instance.lastActive = Date.now();
      log.debug(`Instance ${instanceId} resumed`);
    }
    return result;
  }

  /**
   * Check if an instance is paused
   * @param {string} instanceId - Instance to check
   * @returns {boolean} True if paused
   */
  isInstancePaused(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance) return false;

    if (instance.handler?.isInstancePaused) {
      return instance.handler.isInstancePaused(instance.instanceData);
    }
    return instance.lifecycleState === "paused";
  }

  /**
   * Get lifecycle state of an instance
   * @param {string} instanceId - Instance to check
   * @returns {'live' | 'paused' | 'cold' | null} Lifecycle state
   */
  getInstanceLifecycleState(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance) return null;
    return instance.lifecycleState || "live";
  }

  // =========================================================================
  // CAMERA CONTROLS (Type-agnostic delegation to handlers)
  // =========================================================================

  /**
   * Reset camera to initial state (the state when view was opened/spawned)
   * For views spawned from another view, this restores to the spawn state.
   * For new views, this restores to the default fit-to-data state.
   * @param {string} instanceId - Instance to reset camera for
   */
  resetCamera(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.resetCamera) {
      log.warn(`Cannot reset camera: no handler for instance ${instanceId}`);
      return;
    }
    instance.handler.resetCamera(instance.instanceData);
  }

  /**
   * Fit view to data bounds (VTK default behavior)
   * This ignores the initial state and fits to current data bounds.
   * Use resetCamera() to go back to the initial/spawn state.
   * @param {string} instanceId - Instance to fit
   */
  fitView(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.fitToData) {
      // Fallback to resetCamera if fitToData not available
      this.resetCamera(instanceId);
      return;
    }
    instance.handler.fitToData(instance.instanceData);
  }

  /**
   * Set camera to a standard view (front, top, isometric, etc.)
   * @param {string} instanceId - Instance ID
   * @param {string} viewName - View name ('front', 'back', 'top', 'bottom', 'left', 'right', 'isometric')
   */
  setCameraView(instanceId, viewName) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.setCameraView) {
      log.warn(`Cannot set camera view: no handler for instance ${instanceId}`);
      return;
    }
    instance.handler.setCameraView(instance.instanceData, viewName);
  }

  /**
   * Apply zoom to camera (relative zoom by factor)
   * @param {string} instanceId - Instance ID
   * @param {number} factor - Zoom factor (> 1 = zoom in, < 1 = zoom out)
   */
  zoom(instanceId, factor) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.zoom) {
      log.warn(`Cannot zoom: no handler for instance ${instanceId}`);
      return;
    }
    instance.handler.zoom(instance.instanceData, factor);
  }

  /**
   * Set zoom level to a specific percentage (dataset-relative)
   * 100% = dataset fills viewport, transferable between views of same dataset
   * @param {string} instanceId - Instance ID
   * @param {number} zoomPercent - Target zoom percentage
   */
  setZoomLevel(instanceId, zoomPercent) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.setZoomLevel) {
      log.warn(`Cannot set zoom level: no handler for instance ${instanceId}`);
      return;
    }
    instance.handler.setZoomLevel(instance.instanceData, zoomPercent);
  }

  /**
   * Get current zoom level as percentage (dataset-relative)
   * @param {string} instanceId - Instance ID
   * @returns {number} Current zoom percentage (100 = dataset fills viewport)
   */
  getZoomLevel(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.getZoomLevel) {
      return 100;
    }
    return instance.handler.getZoomLevel(instance.instanceData);
  }

  /**
   * Get current camera state
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} Camera state object or null
   */
  getCameraState(instanceId) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.getCameraState) {
      return null;
    }
    return instance.handler.getCameraState(instance.instanceData);
  }

  /**
   * Register a callback for camera changes on an instance
   * Used to sync zoom percentage display with actual camera state
   * @param {string} instanceId - Instance ID
   * @param {Function} callback - Callback receiving { zoomLevel, parallelScale, distance }
   * @returns {Function} Unsubscribe function
   */
  onCameraChange(instanceId, callback) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.onCameraChange) {
      log.warn(
        `Cannot subscribe to camera changes: no handler for instance ${instanceId}`
      );
      return () => {};
    }
    return instance.handler.onCameraChange(instance.instanceData, callback);
  }

  // =========================================================================
  // ANNOTATION CONTROLS (Type-agnostic delegation to handlers)
  // =========================================================================

  /**
   * Update annotation visibility for an instance
   * @param {string} instanceId - Instance ID
   * @param {boolean} visible - Whether to show annotations
   * @param {Array} annotations - Annotations to display
   */
  async updateInstanceAnnotations(instanceId, visible, annotations = []) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.setAnnotationVisibility) {
      log.warn(
        `Cannot update annotations: no handler for instance ${instanceId}`
      );
      return;
    }

    try {
      await instance.handler.setAnnotationVisibility(
        instance.instanceData,
        visible,
        annotations
      );
      log.debug(
        `Annotations updated for instance ${instanceId}: ${annotations.length} annotations, visible=${visible}`
      );
    } catch (error) {
      log.error(
        `Failed to update annotations for instance ${instanceId}:`,
        error
      );
    }
  }

  /**
   * Get instances that are displaying a specific dataset
   * Useful for finding which instances need annotation updates
   * @param {string} datasetId - Dataset ID
   * @returns {Array} Instances displaying this dataset
   */
  getInstancesByDatasetId(datasetId) {
    const instances = [];
    for (const [id, instance] of this.instances.entries()) {
      if (instance.datasetId === datasetId) {
        instances.push(instance);
      }
    }
    return instances;
  }

  /**
   * Raycast from screen coordinates to get 3D world position
   * Delegates to the handler's type-specific raycasting implementation
   *
   * @param {string} instanceId - Instance to raycast in
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object|null} { hit, position: {x, y, z}, normal: {x, y, z} } or null
   */
  raycastAt(instanceId, screenX, screenY) {
    const instance = this.getInstance(instanceId);
    if (!instance?.handler?.raycastAt) {
      log.warn(
        `Cannot raycast: no handler with raycastAt for instance ${instanceId}`
      );
      return null;
    }

    return instance.handler.raycastAt(
      instance.instanceData,
      screenX,
      screenY,
      instance.container
    );
  }

  /**
   * Enable annotation mode for an instance
   * When enabled, clicking on the instance will emit annotation position events
   * The handler's click listener checks this flag and performs raycasting
   *
   * @param {string} instanceId - Instance ID
   * @param {boolean} enabled - Whether to enable annotation mode
   */
  setAnnotationMode(instanceId, enabled) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      log.warn(`Cannot set annotation mode: instance ${instanceId} not found`);
      return;
    }

    // Set flag on both instance and instanceData (handler checks instanceData)
    instance.annotationMode = enabled;
    if (instance.instanceData) {
      instance.instanceData.annotationMode = enabled;
    }

    log.debug(
      `Annotation mode ${
        enabled ? "enabled" : "disabled"
      } for instance ${instanceId}`
    );
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

  /**
   * Subscribe to workspace changes (React-friendly pattern)
   * Returns an unsubscribe function for easy cleanup in useEffect
   * @param {Function} callback - Change handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.addListener(callback);
    return () => this.removeListener(callback);
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
