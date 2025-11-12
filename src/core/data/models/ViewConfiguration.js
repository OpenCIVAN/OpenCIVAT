// src/core/data/models/ViewConfiguration.js

import { AnnotationDisplayConfig } from "@Core/data/models/Annotation.js";
import { generateViewId } from "@Utils/idGenerator.js";

/**
 * ViewConfiguration - Layer 2 of the architecture
 *
 * A ViewConfiguration is like a "document" or "saved state" for viewing a dataset.
 * It contains all the visualization state (filters, camera, widgets) but does NOT
 * own the raw data or annotations.
 *
 * Key architectural principle:
 * - Datasets (Layer 1) own raw data and annotations
 * - ViewConfigurations (Layer 2) reference datasets and configure how to view them
 * - InstanceWindows (Layer 3) render view configurations
 *
 * This separation allows:
 * - Multiple views of the same dataset with different configurations
 * - Destroying instance windows without losing work
 * - Saving and loading view configurations independently
 * - Sharing view configurations between users
 * - Resource management (active vs inactive views)
 */

export class ViewConfiguration {
  constructor(config = {}) {
    // Core identification
    this.id = config.id || this._generateId();
    this.datasetId = config.datasetId; // Required: which dataset this views
    this.name = config.name || "Untitled View";

    // Visualization state - this is what makes each view unique
    // These will be populated by the specific instance type handler
    this.filters = config.filters || [];
    this.camera = config.camera || this._getDefaultCamera();
    this.widgets = config.widgets || [];
    this.colorMaps = config.colorMaps || this._getDefaultColorMaps();

    // Annotation display configuration
    // NOTE: This does NOT contain the annotations themselves!
    // It only specifies which annotations to show and how to style them
    this.annotationDisplay =
      config.annotationDisplay instanceof AnnotationDisplayConfig
        ? config.annotationDisplay
        : new AnnotationDisplayConfig(config.annotationDisplay || {});

    // Resource management state
    this.status = config.status || "active"; // 'active' | 'inactive' | 'archived'
    this.lastActiveTimestamp = config.lastActiveTimestamp || Date.now();
    this.activeInstanceCount = config.activeInstanceCount || 0;

    // Persistence flags
    this.savedByUser = config.savedByUser || false; // Has user explicitly saved this?
    this.tags = config.tags || []; // User-defined tags for organization

    // Collaboration
    this.sharedWith = config.sharedWith || []; // Array of share configurations
    this.ownerUserId = config.ownerUserId; // User who created this view

    // Validation
    if (!this.datasetId) {
      throw new Error("ViewConfiguration requires a datasetId");
    }
  }

  _generateId() {
    return generateViewId();
  }

  _getDefaultCamera() {
    return {
      position: [0, 0, 100],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
      zoom: 1.0,
    };
  }

  _getDefaultColorMaps() {
    return {
      active: "rainbow",
      preset: null,
      range: [0, 1],
    };
  }

  // ==================== LIFECYCLE MANAGEMENT ====================

  /**
   * Mark this view as active (an instance is rendering it)
   * Called by InstanceManager when an instance starts rendering this view
   */
  activate() {
    this.status = "active";
    this.activeInstanceCount++;
    this.lastActiveTimestamp = Date.now();
  }

  /**
   * Decrement active instance count
   * Called by InstanceManager when an instance stops rendering this view
   * If count reaches zero, mark as inactive
   */
  deactivate() {
    this.activeInstanceCount = Math.max(0, this.activeInstanceCount - 1);
    this.lastActiveTimestamp = Date.now();

    if (this.activeInstanceCount === 0) {
      this.status = "inactive";
    }
  }

  /**
   * Check if this view is currently being rendered by any instance
   */
  isActive() {
    return this.status === "active" && this.activeInstanceCount > 0;
  }

  /**
   * Archive this view (move to long-term storage)
   * Called by ViewConfigurationManager during cleanup
   */
  archive() {
    this.status = "archived";
    this.activeInstanceCount = 0;
  }

  /**
   * Check if this view should be kept (not auto-cleaned up)
   * Views are kept if:
   * - User explicitly saved them
   * - They're currently active
   * - They've been active recently (within threshold)
   */
  shouldKeep(inactiveThresholdMs = 10 * 60 * 1000) {
    // Default 10 minutes
    if (this.savedByUser) return true;
    if (this.isActive()) return true;

    const timeSinceActive = Date.now() - this.lastActiveTimestamp;
    return timeSinceActive < inactiveThresholdMs;
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Update camera state
   * @param {object} cameraState - New camera parameters
   */
  updateCamera(cameraState) {
    this.camera = {
      ...this.camera,
      ...cameraState,
    };
    this.lastActiveTimestamp = Date.now();
  }

  /**
   * Add a filter to this view
   * @param {object} filter - Filter configuration
   */
  addFilter(filter) {
    this.filters.push(filter);
    this.lastActiveTimestamp = Date.now();
  }

  /**
   * Remove a filter by index
   * @param {number} index - Index of filter to remove
   */
  removeFilter(index) {
    if (index >= 0 && index < this.filters.length) {
      this.filters.splice(index, 1);
      this.lastActiveTimestamp = Date.now();
    }
  }

  /**
   * Update a filter
   * @param {number} index - Index of filter to update
   * @param {object} updates - Filter parameter updates
   */
  updateFilter(index, updates) {
    if (index >= 0 && index < this.filters.length) {
      this.filters[index] = {
        ...this.filters[index],
        ...updates,
      };
      this.lastActiveTimestamp = Date.now();
    }
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = [];
    this.lastActiveTimestamp = Date.now();
  }

  /**
   * Add a widget to this view
   * @param {object} widget - Widget configuration
   */
  addWidget(widget) {
    this.widgets.push(widget);
    this.lastActiveTimestamp = Date.now();
  }

  /**
   * Remove a widget by ID
   * @param {string} widgetId - ID of widget to remove
   */
  removeWidget(widgetId) {
    this.widgets = this.widgets.filter((w) => w.id !== widgetId);
    this.lastActiveTimestamp = Date.now();
  }

  /**
   * Update widget configuration
   * @param {string} widgetId - ID of widget to update
   * @param {object} updates - Widget parameter updates
   */
  updateWidget(widgetId, updates) {
    const widget = this.widgets.find((w) => w.id === widgetId);
    if (widget) {
      Object.assign(widget, updates);
      this.lastActiveTimestamp = Date.now();
    }
  }

  /**
   * Update annotation display configuration
   * This is how views control which annotations are visible
   * @param {object} displayConfig - Updates to annotation display config
   */
  updateAnnotationDisplay(displayConfig) {
    if (displayConfig.enabled !== undefined) {
      this.annotationDisplay.enabled = displayConfig.enabled;
    }
    if (displayConfig.filter) {
      this.annotationDisplay.filter = {
        ...this.annotationDisplay.filter,
        ...displayConfig.filter,
      };
    }
    if (displayConfig.style) {
      this.annotationDisplay.style = {
        ...this.annotationDisplay.style,
        ...displayConfig.style,
      };
    }
    this.lastActiveTimestamp = Date.now();
  }

  // ==================== COLLABORATION ====================

  /**
   * Share this view with another user
   * @param {string} userId - User to share with
   * @param {string} permission - 'view' or 'edit'
   */
  shareWith(userId, permission = "view") {
    const existing = this.sharedWith.find((s) => s.userId === userId);
    if (existing) {
      existing.permission = permission;
    } else {
      this.sharedWith.push({
        userId,
        permission,
        sharedAt: Date.now(),
      });
    }
  }

  /**
   * Unshare this view with a user
   * @param {string} userId - User to unshare with
   */
  unshareWith(userId) {
    this.sharedWith = this.sharedWith.filter((s) => s.userId !== userId);
  }

  /**
   * Check if a user can view this configuration
   * @param {string} userId - User to check
   */
  canView(userId) {
    if (userId === this.ownerUserId) return true;
    return this.sharedWith.some((s) => s.userId === userId);
  }

  /**
   * Check if a user can edit this configuration
   * @param {string} userId - User to check
   */
  canEdit(userId) {
    if (userId === this.ownerUserId) return true;
    return this.sharedWith.some(
      (s) => s.userId === userId && s.permission === "edit"
    );
  }

  // ==================== TEMPLATES ====================

  /**
   * Check if this view can be used as a template for a given dataset
   * For now, just checks if the file types match
   * You could expand this to check data structure, point count ranges, etc.
   *
   * @param {Dataset} targetDataset - Dataset to apply this template to
   * @returns {boolean} - Whether this view is compatible as a template
   */
  isCompatibleTemplate(targetDataset) {
    // Can't apply to the same dataset (that's just loading the view)
    if (targetDataset.id === this.datasetId) return false;

    // For now, just check file type compatibility
    // You could make this more sophisticated based on your needs
    return true; // Optimistic - allow user to try and handle errors
  }

  /**
   * Create a new view configuration based on this one as a template
   * Used for applying saved filter sets to new datasets
   *
   * @param {string} targetDatasetId - Dataset to apply template to
   * @param {string} userId - User creating the new view
   * @returns {ViewConfiguration} - New view configuration
   */
  applyAsTemplate(targetDatasetId, userId) {
    return new ViewConfiguration({
      datasetId: targetDatasetId,
      name: `${this.name} (applied)`,
      filters: JSON.parse(JSON.stringify(this.filters)), // Deep copy
      camera: this._getDefaultCamera(), // Don't copy camera
      widgets: JSON.parse(JSON.stringify(this.widgets)), // Deep copy
      colorMaps: JSON.parse(JSON.stringify(this.colorMaps)), // Deep copy
      annotationDisplay: new AnnotationDisplayConfig(
        JSON.parse(JSON.stringify(this.annotationDisplay.toJSON()))
      ),
      ownerUserId: userId,
      tags: [...this.tags, "from-template"],
    });
  }

  // ==================== SERIALIZATION ====================

  /**
   * Serialize for storage or network transmission
   */
  toJSON() {
    return {
      id: this.id,
      datasetId: this.datasetId,
      name: this.name,
      filters: this.filters,
      camera: this.camera,
      widgets: this.widgets,
      colorMaps: this.colorMaps,
      annotationDisplay: this.annotationDisplay.toJSON(),
      status: this.status,
      lastActiveTimestamp: this.lastActiveTimestamp,
      activeInstanceCount: this.activeInstanceCount,
      savedByUser: this.savedByUser,
      tags: this.tags,
      sharedWith: this.sharedWith,
      ownerUserId: this.ownerUserId,
    };
  }

  /**
   * Create a ViewConfiguration from stored JSON
   */
  static fromJSON(json) {
    return new ViewConfiguration({
      ...json,
      annotationDisplay: AnnotationDisplayConfig.fromJSON(
        json.annotationDisplay || {}
      ),
    });
  }
}

/**
 * USAGE EXAMPLES:
 *
 * // Create a default view when a dataset is first loaded
 * const view = new ViewConfiguration({
 *   datasetId: dataset.id,
 *   name: 'Default View',
 *   ownerUserId: currentUser.id
 * });
 *
 * // User applies a threshold filter
 * view.addFilter({
 *   type: 'threshold',
 *   parameter: 'density',
 *   min: 50,
 *   max: 100
 * });
 *
 * // User changes camera
 * view.updateCamera({
 *   position: [100, 100, 100],
 *   focalPoint: [0, 0, 0]
 * });
 *
 * // User wants to only see their own annotations
 * view.updateAnnotationDisplay({
 *   filter: {
 *     userIds: [currentUser.id]
 *   }
 * });
 *
 * // When rendering, get filtered annotations:
 * // Note: The view doesn't own annotations, it just filters them!
 * const annotationsToRender = view.annotationDisplay.filterAnnotations(
 *   dataset.annotations,  // Get all annotations from the dataset
 *   currentUser.id        // Apply permission checks
 * );
 *
 * // User closes the instance window
 * view.deactivate(); // Marks view as inactive if no other instances
 *
 * // User explicitly saves this view for later
 * view.savedByUser = true;
 *
 * // Later, use this view as a template for a new dataset
 * if (view.isCompatibleTemplate(newDataset)) {
 *   const newView = view.applyAsTemplate(newDataset.id, currentUser.id);
 * }
 */
