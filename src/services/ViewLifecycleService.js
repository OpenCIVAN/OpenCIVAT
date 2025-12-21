// src/services/ViewLifecycleService.js
// =============================================================================
// VIEW LIFECYCLE SERVICE
// =============================================================================
//
// Centralized service for ALL view lifecycle operations in CIA Web.
//
// WHY THIS EXISTS:
// - Single source of truth for view operations
// - Eliminates duplicated logic across components
// - Consistent event emission through EventBus
// - Clean API for UI components to call
// - Proper orchestration between ViewConfigurationManager and CanvasManager
//
// ARCHITECTURE:
// - Singleton service initialized after managers are ready
// - Listens to DOM events (cia:request-instance, etc.) for backward compatibility
// - Emits through EventBus for new subscribers
// - Calls managers internally - components should NOT call managers directly
//   for view lifecycle operations
//
// USAGE:
// import { viewLifecycleService } from '@Core/services/ViewLifecycleService';
//
// // Create and place a new view
// const view = await viewLifecycleService.createAndPlaceView(datasetId, { row: 0, col: 0 });
//
// // Duplicate an existing view
// const newView = await viewLifecycleService.duplicateAndPlaceView(sourceViewId);
//
// // Place existing view
// await viewLifecycleService.placeView(viewId, { row: 1, col: 1 });
//
// // Remove from canvas (view still exists)
// await viewLifecycleService.removeViewFromCanvas(viewId);
//
// // Trash view (soft delete)
// await viewLifecycleService.trashView(viewId);
//
// =============================================================================

import {
  getViewConfigurationManager,
  getDatasetManager,
} from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
import { DOM_EVENTS } from "@Core/events/eventConstants.js";
import { view as log } from "@Utils/logger.js";

// =============================================================================
// SERVICE CLASS
// =============================================================================

class ViewLifecycleService {
  constructor() {
    /** @type {boolean} Service initialized */
    this._initialized = false;

    /** @type {boolean} Currently processing a request (debounce) */
    this._processingRequest = false;

    /** @type {Function[]} Cleanup functions for event listeners */
    this._cleanupFunctions = [];
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /**
   * Initialize the service
   * Must be called after managers are initialized (in appInitializer)
   */
  initialize() {
    if (this._initialized) {
      log.warn("ViewLifecycleService already initialized");
      return;
    }

    log.info("Initializing ViewLifecycleService...");

    // Set up DOM event listeners for backward compatibility
    this._setupDOMEventListeners();

    this._initialized = true;
    log.info("ViewLifecycleService initialized");
  }

  /**
   * Set up listeners for existing DOM events
   * This provides backward compatibility during migration
   * @private
   */
  _setupDOMEventListeners() {
    // Handle cia:request-instance - the main entry point for view creation
    const handleRequestInstance = async (event) => {
      await this._handleInstanceRequest(event.detail);
    };

    // Handle cia:close-view - close/remove a view from canvas
    const handleCloseView = async (event) => {
      const { viewId } = event.detail || {};
      if (viewId) {
        await this.removeViewFromCanvas(viewId);
      }
    };

    // Handle cia:load-file-to-cell - load a file and create view at specific cell
    const handleLoadFileToCell = async (event) => {
      await this._handleLoadFileToCell(event.detail);
    };

    // Register listeners
    window.addEventListener(DOM_EVENTS.REQUEST_INSTANCE, handleRequestInstance);
    window.addEventListener("cia:create-instance", handleRequestInstance); // Alias
    window.addEventListener(DOM_EVENTS.CLOSE_VIEW, handleCloseView);
    window.addEventListener("cia:load-file-to-cell", handleLoadFileToCell);

    // Store cleanup functions
    this._cleanupFunctions.push(
      () =>
        window.removeEventListener(
          DOM_EVENTS.REQUEST_INSTANCE,
          handleRequestInstance
        ),
      () =>
        window.removeEventListener(
          "cia:create-instance",
          handleRequestInstance
        ),
      () => window.removeEventListener(DOM_EVENTS.CLOSE_VIEW, handleCloseView),
      () =>
        window.removeEventListener(
          "cia:load-file-to-cell",
          handleLoadFileToCell
        )
    );

    log.debug("DOM event listeners registered");
  }

  /**
   * Clean up service
   */
  dispose() {
    this._cleanupFunctions.forEach((cleanup) => cleanup());
    this._cleanupFunctions = [];
    this._initialized = false;
    log.info("ViewLifecycleService disposed");
  }

  // =========================================================================
  // INTERNAL EVENT HANDLERS
  // =========================================================================

  /**
   * Handle cia:request-instance event
   * @private
   */
  async _handleInstanceRequest(detail) {
    // Prevent duplicate handling
    if (this._processingRequest) {
      log.debug("Request already in progress, ignoring");
      return;
    }

    const {
      datasetId,
      viewConfigId,
      viewId,
      spawnNew,
      duplicateViewId,
      targetRow,
      targetCol,
      canvasId,
    } = detail || {};

    log.debug("Processing instance request:", {
      datasetId,
      viewConfigId,
      spawnNew,
      duplicateViewId,
    });

    try {
      this._processingRequest = true;

      // Resolve dataset ID
      const resolvedDatasetId = datasetId || detail?.fileId;
      if (!resolvedDatasetId) {
        log.error("No dataset ID provided");
        eventBus.emit(BUS_EVENTS.VIEW_ERROR, {
          error: "No dataset ID provided",
        });
        return;
      }

      // Build placement options
      const placementOptions = {
        row: targetRow,
        col: targetCol,
        canvasId,
      };

      // Case 1: Duplicate existing view
      if (duplicateViewId) {
        await this.duplicateAndPlaceView(duplicateViewId, placementOptions);
        return;
      }

      // Case 2: Place existing view (not a placeholder, not forcing new)
      const resolvedViewId = viewConfigId || viewId;
      const isPlaceholder = resolvedViewId?.startsWith("placeholder-");

      if (resolvedViewId && !isPlaceholder && !spawnNew) {
        // Check if view already on canvas
        const existingPlacement = this._findPlacementForView(
          resolvedViewId,
          canvasId
        );
        if (existingPlacement) {
          // Navigate to existing placement instead of creating duplicate
          log.debug(`View ${resolvedViewId} already on canvas, navigating`);
          this._navigateToPlacement(existingPlacement);
          eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId: resolvedViewId });
          return;
        }

        // Place the existing view
        await this.placeView(resolvedViewId, placementOptions);
        return;
      }

      // Case 3: Create new view
      await this.createAndPlaceView(resolvedDatasetId, placementOptions, {
        name: detail?.fileName,
        instanceType: detail?.fileType,
      });
    } catch (error) {
      log.error("Instance request failed:", error);
      eventBus.emit(BUS_EVENTS.VIEW_ERROR, { error: error.message });
    } finally {
      this._processingRequest = false;
    }
  }

  /**
   * Handle cia:load-file-to-cell event
   * @private
   */
  async _handleLoadFileToCell(detail) {
    const {
      file,
      targetRow,
      targetCol,
      canvasId: requestCanvasId,
    } = detail || {};

    if (!file) {
      log.error("No file provided for load-file-to-cell");
      return;
    }

    const activeCanvasId =
      requestCanvasId || canvasManager.getActiveCanvas()?.id;
    if (requestCanvasId && requestCanvasId !== activeCanvasId) {
      log.debug("File drop for different canvas, ignoring");
      return;
    }

    log.info(
      `Loading file "${file.name}" into cell [${targetRow}, ${targetCol}]`
    );

    try {
      // Get or load the dataset
      const datasetManager = getDatasetManager();
      let datasetId = file.datasetId || file.id;

      // If we have a file object but no dataset, we may need to load it
      if (!datasetId && file.name) {
        // File needs to be loaded as dataset first
        // This assumes the file has already been uploaded to server
        log.warn("File without dataset ID - checking if already loaded");
        const existing = datasetManager?.getDatasetByFilename?.(file.name);
        if (existing) {
          datasetId = existing.id;
        } else {
          log.error("Cannot load file without dataset ID");
          eventBus.emit(BUS_EVENTS.VIEW_ERROR, { error: "File not uploaded" });
          return;
        }
      }

      await this.createAndPlaceView(
        datasetId,
        {
          row: targetRow,
          col: targetCol,
          canvasId: activeCanvasId,
        },
        {
          name: `View of ${file.name}`,
          instanceType: file.fileType,
        }
      );
    } catch (error) {
      log.error("Failed to load file to cell:", error);
      eventBus.emit(BUS_EVENTS.VIEW_ERROR, { error: error.message });
    }
  }

  // =========================================================================
  // PUBLIC API - VIEW CREATION
  // =========================================================================

  /**
   * Create a new view for a dataset
   * Does NOT place it on canvas - use createAndPlaceView for that
   *
   * @param {string} datasetId - Dataset to create view for
   * @param {Object} [options] - View options
   * @param {string} [options.name] - View name
   * @param {string} [options.instanceType] - Instance type (e.g., 'vtk')
   * @returns {Promise<ViewConfiguration>} Created view
   */
  async createView(datasetId, options = {}) {
    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();

    if (!viewManager) {
      throw new Error("ViewConfigurationManager not initialized");
    }

    // Ensure dataset exists
    let dataset = datasetManager?.getDataset(datasetId);
    if (!dataset) {
      log.info(
        `Dataset ${datasetId} not found locally, syncing from server...`
      );
      await datasetManager?.syncDatasetsFromServer?.();
      dataset = datasetManager?.getDataset(datasetId);
    }

    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    // Create view with provided options
    const viewOptions = {
      name:
        options.name ||
        `View of ${dataset.filename || dataset.fileName || "Unknown"}`,
      instanceType:
        options.instanceType || dataset.metadata?.defaultInstanceType || "vtk",
      ...options,
    };

    log.debug(`Creating view for dataset ${datasetId}:`, viewOptions);

    const view = await viewManager.createView(datasetId, viewOptions);

    eventBus.emit(BUS_EVENTS.VIEW_CREATED, {
      viewId: view.id,
      datasetId,
      name: view.name,
    });

    return view;
  }

  /**
   * Create a new view AND place it on the canvas
   * This is the most common operation for new views
   *
   * @param {string} datasetId - Dataset to create view for
   * @param {Object} [placementOptions] - Where to place it
   * @param {number} [placementOptions.row] - Target row (auto if not specified)
   * @param {number} [placementOptions.col] - Target col (auto if not specified)
   * @param {string} [placementOptions.canvasId] - Canvas ID (uses active if not specified)
   * @param {number} [placementOptions.rowSpan=1] - Row span
   * @param {number} [placementOptions.colSpan=1] - Column span
   * @param {Object} [viewOptions] - View creation options
   * @returns {Promise<{ view: ViewConfiguration, placement: CanvasPlacement }>}
   */
  async createAndPlaceView(datasetId, placementOptions = {}, viewOptions = {}) {
    // Create the view
    const view = await this.createView(datasetId, viewOptions);

    // Place it on canvas
    const placement = await this.placeView(view.id, placementOptions);

    return { view, placement };
  }

  /**
   * Duplicate an existing view
   * Creates a new ViewConfiguration based on the source
   *
   * @param {string} sourceViewId - View to duplicate
   * @param {Object} [options] - Duplication options
   * @param {boolean} [options.linkToSource=true] - Link to source view
   * @returns {Promise<ViewConfiguration>} New duplicated view
   */
  async duplicateView(sourceViewId, options = {}) {
    const viewManager = getViewConfigurationManager();

    if (!viewManager) {
      throw new Error("ViewConfigurationManager not initialized");
    }

    const sourceView = viewManager.getView(sourceViewId);
    if (!sourceView) {
      throw new Error(`Source view not found: ${sourceViewId}`);
    }

    log.debug(`Duplicating view ${sourceViewId}`);

    const newView = await viewManager.duplicateView(sourceViewId);

    eventBus.emit(BUS_EVENTS.VIEW_DUPLICATED, {
      viewId: newView.id,
      sourceViewId,
      datasetId: newView.datasetId,
      name: newView.name,
    });

    return newView;
  }

  /**
   * Duplicate a view AND place it on the canvas
   *
   * @param {string} sourceViewId - View to duplicate
   * @param {Object} [placementOptions] - Where to place it
   * @returns {Promise<{ view: ViewConfiguration, placement: CanvasPlacement }>}
   */
  async duplicateAndPlaceView(sourceViewId, placementOptions = {}) {
    const newView = await this.duplicateView(sourceViewId);
    const placement = await this.placeView(newView.id, placementOptions);

    return { view: newView, placement };
  }

  // =========================================================================
  // PUBLIC API - PLACEMENT OPERATIONS
  // =========================================================================

  /**
   * Place an existing view on the canvas
   *
   * @param {string} viewId - View to place
   * @param {Object} [options] - Placement options
   * @param {number} [options.row] - Target row (auto-find if not specified)
   * @param {number} [options.col] - Target col (auto-find if not specified)
   * @param {string} [options.canvasId] - Canvas ID (uses active if not specified)
   * @param {number} [options.rowSpan=1] - Row span
   * @param {number} [options.colSpan=1] - Column span
   * @returns {Promise<CanvasPlacement>} Created placement
   */
  async placeView(viewId, options = {}) {
    const viewManager = getViewConfigurationManager();

    // Validate view exists
    const view = viewManager?.getView(viewId);
    if (!view) {
      throw new Error(`View not found: ${viewId}`);
    }

    // Resolve canvas
    const canvasId = options.canvasId || canvasManager.getActiveCanvas()?.id;
    if (!canvasId) {
      throw new Error("No canvas available");
    }

    const canvas = canvasManager.getCanvas(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    // Resolve position
    let { row, col } = options;
    if (row === undefined || col === undefined) {
      const nextCell = this._findNextEmptyCell(canvas);
      row = row ?? nextCell.row;
      col = col ?? nextCell.col;
    }

    const rowSpan = options.rowSpan || 1;
    const colSpan = options.colSpan || 1;

    log.debug(
      `Placing view ${viewId} at [${row}, ${col}] on canvas ${canvasId}`
    );

    // Add placement through canvas manager
    const placement = await canvasManager.addPlacement(canvasId, {
      row,
      col,
      rowSpan,
      colSpan,
      content: {
        type: "view",
        viewConfigurationId: viewId,
      },
    });

    // Mark view as active
    viewManager?.activateView?.(viewId);

    // Emit events
    eventBus.emit(BUS_EVENTS.VIEW_PLACED, {
      viewId,
      placementId: placement.id,
      canvasId,
      row,
      col,
    });

    eventBus.emit(BUS_EVENTS.PLACEMENT_ADDED, {
      placementId: placement.id,
      canvasId,
      viewId,
    });

    // Navigate viewport to show new placement
    this._navigateToPlacement({ row, col });

    return placement;
  }

  /**
   * Remove a view from the canvas
   * The view still exists, just not placed
   *
   * @param {string} viewId - View to remove
   * @returns {Promise<void>}
   */
  async removeViewFromCanvas(viewId) {
    log.debug(`Removing view ${viewId} from canvas`);

    const viewManager = getViewConfigurationManager();

    // Remove all placements with this view
    await canvasManager.removeViewPlacements(viewId);

    // Deactivate the view
    viewManager?.deactivateView?.(viewId);

    eventBus.emit(BUS_EVENTS.VIEW_REMOVED, { viewId });
  }

  // =========================================================================
  // PUBLIC API - VIEW LIFECYCLE
  // =========================================================================

  /**
   * Move view to trash (soft delete)
   *
   * @param {string} viewId - View to trash
   * @returns {Promise<void>}
   */
  async trashView(viewId) {
    log.debug(`Trashing view ${viewId}`);

    const viewManager = getViewConfigurationManager();

    // Remove from canvas first
    await canvasManager.removeViewPlacements(viewId);

    // Trash the view
    await viewManager?.trashView?.(viewId);

    eventBus.emit(BUS_EVENTS.VIEW_TRASHED, { viewId });
  }

  /**
   * Restore view from trash
   *
   * @param {string} viewId - View to restore
   * @returns {Promise<ViewConfiguration>}
   */
  async restoreView(viewId) {
    log.debug(`Restoring view ${viewId}`);

    const viewManager = getViewConfigurationManager();
    const view = await viewManager?.restoreView?.(viewId);

    if (view) {
      eventBus.emit(BUS_EVENTS.VIEW_RESTORED, { viewId, view });
    }

    return view;
  }

  /**
   * Permanently delete a view
   *
   * @param {string} viewId - View to delete
   * @returns {Promise<void>}
   */
  async deleteView(viewId) {
    log.debug(`Permanently deleting view ${viewId}`);

    const viewManager = getViewConfigurationManager();

    // Remove from canvas first
    await canvasManager.removeViewPlacements(viewId);

    // Delete the view
    await viewManager?.deleteView?.(viewId);

    eventBus.emit(BUS_EVENTS.VIEW_DELETED, { viewId });
  }

  /**
   * Rename a view
   *
   * @param {string} viewId - View to rename
   * @param {string} newName - New name
   * @returns {Promise<ViewConfiguration>}
   */
  async renameView(viewId, newName) {
    log.debug(`Renaming view ${viewId} to "${newName}"`);

    const viewManager = getViewConfigurationManager();
    const view = await viewManager?.renameView?.(viewId, newName);

    if (view) {
      eventBus.emit(BUS_EVENTS.VIEW_RENAMED, { viewId, newName });
    }

    return view;
  }

  /**
   * Focus a view (select it, navigate to it)
   *
   * @param {string} viewId - View to focus
   */
  focusView(viewId) {
    log.debug(`Focusing view ${viewId}`);

    // Find placement for this view
    const placement = this._findPlacementForView(viewId);
    if (placement) {
      this._navigateToPlacement(placement);
    }

    eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId });
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Find next empty cell on a canvas
   * @private
   */
  _findNextEmptyCell(canvas) {
    if (!canvas) return { row: 0, col: 0 };

    const position = canvas.findAvailablePosition?.(1, 1);
    if (position) {
      return position;
    }

    // Build occupied set manually if model method not available
    const occupiedCells = new Set();
    if (canvas.placements) {
      canvas.placements.forEach((p) => {
        for (let r = p.row; r < p.row + (p.rowSpan || 1); r++) {
          for (let c = p.col; c < p.col + (p.colSpan || 1); c++) {
            occupiedCells.add(`${r}-${c}`);
          }
        }
      });
    }

    const maxRows = canvas.dimensions?.rows || 10;
    const maxCols = canvas.dimensions?.cols || 10;

    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        if (!occupiedCells.has(`${r}-${c}`)) {
          return { row: r, col: c };
        }
      }
    }

    // All cells occupied - return next row
    return { row: maxRows, col: 0 };
  }

  /**
   * Find placement for a view
   * @private
   */
  _findPlacementForView(viewId, canvasId) {
    const canvas = canvasId
      ? canvasManager.getCanvas(canvasId)
      : canvasManager.getActiveCanvas();

    if (!canvas?.placements) return null;

    return canvas.placements.find(
      (p) =>
        p.content?.viewConfigurationId === viewId ||
        p.content?.viewId === viewId
    );
  }

  /**
   * Navigate viewport to show a placement
   * @private
   */
  _navigateToPlacement(placement) {
    if (!placement) return;

    const { row, col } = placement;

    // Dispatch navigation event
    window.dispatchEvent(
      new CustomEvent("cia:navigate-to-cell", {
        detail: { row: Math.max(0, row - 1), col: Math.max(0, col - 1) },
      })
    );

    eventBus.emit(BUS_EVENTS.NAVIGATE_TO_CELL, { row, col });
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  /**
   * Get all views for a dataset
   *
   * @param {string} datasetId - Dataset ID
   * @returns {ViewConfiguration[]}
   */
  getViewsForDataset(datasetId) {
    const viewManager = getViewConfigurationManager();
    return viewManager?.getViewsForDataset?.(datasetId) || [];
  }

  /**
   * Get a view by ID
   *
   * @param {string} viewId - View ID
   * @returns {ViewConfiguration|null}
   */
  getView(viewId) {
    const viewManager = getViewConfigurationManager();
    return viewManager?.getView?.(viewId) || null;
  }

  /**
   * Check if a view is placed on the canvas
   *
   * @param {string} viewId - View ID
   * @param {string} [canvasId] - Canvas ID (uses active if not specified)
   * @returns {boolean}
   */
  isViewOnCanvas(viewId, canvasId) {
    return !!this._findPlacementForView(viewId, canvasId);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const viewLifecycleService = new ViewLifecycleService();

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.CIA = window.CIA || {};
  window.CIA.viewLifecycleService = viewLifecycleService;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default viewLifecycleService;
