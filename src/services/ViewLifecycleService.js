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
import { viewGroupManager } from "@Core/data/managers/ViewGroupManager.js";
import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
import { DOM_EVENTS } from "@Core/events/eventConstants.js";
import { view as log } from "@Utils/logger.js";
import { canvasHistory } from "@UI/react/store/canvasHistoryStore.js";

// =============================================================================
// SERVICE CLASS
// =============================================================================

class ViewLifecycleService {
  constructor() {
    /** @type {boolean} Service initialized */
    this._initialized = false;

    /** @type {boolean} Currently processing an instance request */
    this._processingRequest = false;

    /** @type {Object[]} Pending instance requests */
    this._instanceRequestQueue = [];

    /** @type {Promise<void> | null} Active queue drain promise */
    this._instanceRequestDrainPromise = null;

    /** @type {number} Timeout for a single instance request (ms) */
    this._instanceRequestTimeoutMs = 15000;

    /** @type {string | null} Last instance-request signature for dedupe */
    this._lastInstanceRequestSignature = null;

    /** @type {number} Timestamp of last enqueued instance request */
    this._lastInstanceRequestAt = 0;

    /** @type {number} Deduplication window for identical requests (ms) */
    this._instanceRequestDedupeWindowMs = 120;

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
    if (detail) {
      const signature = JSON.stringify({
        datasetId: detail?.datasetId || detail?.fileId || null,
        viewConfigId: detail?.viewConfigId || detail?.viewId || null,
        duplicateViewId: detail?.duplicateViewId || null,
        spawnNew: detail?.spawnNew === true,
        moveExisting: detail?.moveExisting === true,
        targetRow: Number.isFinite(detail?.targetRow) ? detail.targetRow : null,
        targetCol: Number.isFinite(detail?.targetCol) ? detail.targetCol : null,
        rowSpan: Number.isFinite(detail?.rowSpan) ? detail.rowSpan : null,
        colSpan: Number.isFinite(detail?.colSpan) ? detail.colSpan : null,
        canvasId: detail?.canvasId || null,
        createLinked: detail?.createLinked === true,
      });
      const now = Date.now();
      if (
        this._lastInstanceRequestSignature === signature &&
        now - this._lastInstanceRequestAt < this._instanceRequestDedupeWindowMs
      ) {
        log.debug("Skipping duplicate instance request in dedupe window");
        return this._instanceRequestDrainPromise;
      }
      this._lastInstanceRequestSignature = signature;
      this._lastInstanceRequestAt = now;
      this._instanceRequestQueue.push({ ...detail });
    }

    this._startInstanceRequestDrain();
    return this._instanceRequestDrainPromise;
  }

  /**
   * Start draining queued instance requests if not already running.
   * @private
   */
  _startInstanceRequestDrain() {
    if (this._instanceRequestDrainPromise || this._instanceRequestQueue.length === 0) {
      return;
    }

    this._instanceRequestDrainPromise = this._drainInstanceRequestQueue()
      .catch((error) => {
        log.error("Instance request queue failed:", error);
      })
      .finally(() => {
        this._instanceRequestDrainPromise = null;
        // New requests may have arrived while finishing.
        if (this._instanceRequestQueue.length > 0) {
          this._startInstanceRequestDrain();
        }
      });
  }

  /**
   * Drain queued instance requests sequentially.
   * @private
   */
  async _drainInstanceRequestQueue() {
    while (this._instanceRequestQueue.length > 0) {
      const detail = this._instanceRequestQueue.shift();
      if (!detail) continue;
      try {
        await this._withTimeout(
          () => this._processInstanceRequest(detail),
          this._instanceRequestTimeoutMs,
          "instance request"
        );
      } catch (error) {
        log.error("Instance request stalled:", error);
        eventBus.emit(BUS_EVENTS.VIEW_ERROR, { error: error.message });
      }
    }
  }

  /**
   * Execute async work with a timeout and avoid queue deadlocks on stalled requests.
   * @private
   */
  async _withTimeout(task, timeoutMs, label) {
    let timeoutId = null;
    let settled = false;

    const operationPromise = Promise.resolve()
      .then(() => task())
      .then(
        (value) => {
          settled = true;
          return value;
        },
        (error) => {
          settled = true;
          throw error;
        }
      );

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        if (settled) return;
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operationPromise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (!settled) {
        operationPromise.catch((error) => {
          log.warn(`${label} completed after timeout:`, error);
        });
      }
    }
  }

  /**
   * Process a single cia:request-instance payload.
   * @private
   */
  async _processInstanceRequest(detail) {
    const {
      datasetId,
      viewConfigId,
      viewId,
      spawnNew,
      duplicateViewId,
      targetRow,
      targetCol,
      canvasId,
      createLinked, // If true, create fully linked view
      moveExisting,
    } = detail || {};

    log.debug("Processing instance request:", {
      datasetId,
      viewConfigId,
      viewId,
      spawnNew,
      duplicateViewId,
      moveExisting,
      targetRow,
      targetCol,
      rowSpan: detail?.rowSpan,
      colSpan: detail?.colSpan,
      canvasId,
    });

    try {
      this._processingRequest = true;

      // Build placement options
      const hasExplicitTarget =
        Number.isFinite(targetRow) && Number.isFinite(targetCol);
      const placementOptions = {
        row: targetRow,
        col: targetCol,
        canvasId,
        rowSpan: detail?.rowSpan,
        colSpan: detail?.colSpan,
        moveExisting: moveExisting ?? hasExplicitTarget,
      };

      // Case 1: Duplicate existing view (doesn't need datasetId - gets it from source)
      if (duplicateViewId) {
        log.debug(`Duplicating view ${duplicateViewId} to [${targetRow}, ${targetCol}], linked=${createLinked}`);
        const result = await this.duplicateAndPlaceView(duplicateViewId, placementOptions);

        // If createLinked is true, set up linking between source and new view
        if (createLinked && result?.view) {
          try {
            const { viewLinkingService } = await import("@Services");
            viewLinkingService.linkViewsFully(duplicateViewId, result.view.id, {
              mode: "bidirectional",
            });
            log.info(`Created linked view: ${result.view.id} linked to ${duplicateViewId}`);
          } catch (linkError) {
            log.warn("Failed to link views:", linkError);
          }
        }
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
        if (existingPlacement && !placementOptions.moveExisting) {
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

      // Resolve dataset ID - only required when creating a brand-new view
      const resolvedDatasetId = datasetId || detail?.fileId;
      if (!resolvedDatasetId) {
        log.error("No dataset ID provided");
        eventBus.emit(BUS_EVENTS.VIEW_ERROR, {
          error: "No dataset ID provided",
        });
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
      rowSpan,
      colSpan,
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
          rowSpan,
          colSpan,
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
        `Dataset ${datasetId} not found locally, fetching from server...`
      );
      // Fetch only this specific dataset, not all datasets
      dataset = await datasetManager?.fetchDatasetById?.(datasetId);
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

    const requestedCanvasId = options.canvasId || canvasManager.getActiveCanvas()?.id || null;
    const moveExisting = options.moveExisting === true;

    // Check if this view already has a placement anywhere
    const existingPlacement = this._findPlacementForView(viewId);
    if (existingPlacement) {
      if (moveExisting) {
        const sourceRef = canvasManager.findPlacement(existingPlacement.id);
        const sourceCanvasId = sourceRef?.canvas?.id || requestedCanvasId;
        const targetCanvasId = requestedCanvasId || sourceCanvasId;

        if (!targetCanvasId) {
          throw new Error("No canvas available");
        }

        const targetCanvas = canvasManager.getCanvas(targetCanvasId);
        if (!targetCanvas) {
          throw new Error(`Canvas not found: ${targetCanvasId}`);
        }

        let row = options.row ?? existingPlacement.row ?? 0;
        let col = options.col ?? existingPlacement.col ?? 0;
        let rowSpan = options.rowSpan || existingPlacement.rowSpan || 1;
        let colSpan = options.colSpan || existingPlacement.colSpan || 1;

        const targetVG = this._findViewGroupAtPosition(row, col);
        const targetSlotInfo = targetVG
          ? this._getSlotInfoForCell(targetVG, row, col)
          : null;
        if (targetSlotInfo?.mergeSpan) {
          rowSpan = targetSlotInfo.mergeSpan.rows || rowSpan;
          colSpan = targetSlotInfo.mergeSpan.cols || colSpan;
        }

        const canvasRows = targetCanvas.dimensions?.rows || 1;
        const canvasCols = targetCanvas.dimensions?.cols || 1;
        const nextRows = Math.max(canvasRows, row + rowSpan);
        const nextCols = Math.max(canvasCols, col + colSpan);
        if (nextRows !== canvasRows || nextCols !== canvasCols) {
          await canvasManager.updateCanvas(targetCanvasId, {
            dimensions: { rows: nextRows, cols: nextCols },
          });
        }

        await this._clearEmptyPlacementsInRange(
          targetCanvasId,
          row,
          col,
          rowSpan,
          colSpan,
          existingPlacement.id
        );

        const existingRowSpan = existingPlacement.rowSpan || 1;
        const existingColSpan = existingPlacement.colSpan || 1;
        const isNoopMove =
          sourceCanvasId === targetCanvasId &&
          existingPlacement.row === row &&
          existingPlacement.col === col &&
          existingRowSpan === rowSpan &&
          existingColSpan === colSpan;

        let placement = existingPlacement;
        if (!isNoopMove) {
          if (sourceCanvasId === targetCanvasId) {
            // Keep the same placement when moving within a canvas to avoid
            // transient teardown/recreate races in active vtk render pipelines.
            try {
              placement = await canvasManager.updatePlacement(existingPlacement.id, {
                row,
                col,
                rowSpan,
                colSpan,
              });
              const latestAfterUpdate =
                canvasManager.findPlacement(existingPlacement.id)?.placement || placement;
              if (!this._placementMatchesTarget(latestAfterUpdate, row, col, rowSpan, colSpan)) {
                throw new Error(
                  `Placement ${existingPlacement.id} did not update to target [${row}, ${col}]`
                );
              }
              placement = latestAfterUpdate;
            } catch (updateError) {
              // If something still blocks the target rect (view/empty), clear and retry once.
              await this._clearBlockingPlacementsInRange(
                targetCanvasId,
                row,
                col,
                rowSpan,
                colSpan,
                existingPlacement.id
              );
              placement = await canvasManager.updatePlacement(existingPlacement.id, {
                row,
                col,
                rowSpan,
                colSpan,
              });
              let latestAfterRetry =
                canvasManager.findPlacement(existingPlacement.id)?.placement || placement;
              if (!this._placementMatchesTarget(latestAfterRetry, row, col, rowSpan, colSpan)) {
                // Last-resort fallback for backends that no-op updates under collisions:
                // recreate the placement at the requested location.
                await canvasManager.removePlacement(existingPlacement.id);
                await this._clearBlockingPlacementsInRange(
                  targetCanvasId,
                  row,
                  col,
                  rowSpan,
                  colSpan
                );
                placement = await canvasManager.addPlacement(targetCanvasId, {
                  row,
                  col,
                  rowSpan,
                  colSpan,
                  content: {
                    type: "view",
                    viewConfigurationId: viewId,
                  },
                });
                latestAfterRetry = placement;
              }
              placement = latestAfterRetry;
            }
          } else {
            // Cross-canvas move still needs remove + add.
            await canvasManager.removePlacement(existingPlacement.id);
            try {
              placement = await canvasManager.addPlacement(targetCanvasId, {
                row,
                col,
                rowSpan,
                colSpan,
                content: {
                  type: "view",
                  viewConfigurationId: viewId,
                },
              });
            } catch (addError) {
              await this._clearBlockingPlacementsInRange(
                targetCanvasId,
                row,
                col,
                rowSpan,
                colSpan
              );
              placement = await canvasManager.addPlacement(targetCanvasId, {
                row,
                col,
                rowSpan,
                colSpan,
                content: {
                  type: "view",
                  viewConfigurationId: viewId,
                },
              });
            }
          }
        } else if (options.row === undefined || options.col === undefined) {
          log.debug(
            `Move requested for view ${viewId} without explicit target; retaining current position [${row}, ${col}]`
          );
        }

        viewManager?.activateView?.(viewId);
        await this._ensureImplicitViewGroup(viewId, view, { row, col });
        this._smartNavigateToPlacement({ row, col, rowSpan, colSpan });

        eventBus.emit(BUS_EVENTS.VIEW_PLACED, {
          viewId,
          placementId: placement.id,
          canvasId: targetCanvasId,
          row,
          col,
          moved: true,
        });
        eventBus.emit(BUS_EVENTS.PLACEMENT_ADDED, {
          placementId: placement.id,
          canvasId: targetCanvasId,
          viewId,
          moved: true,
        });

        return placement;
      }

      log.debug(`View ${viewId} already on canvas, duplicating instead`);
      const result = await this.duplicateAndPlaceView(viewId, {
        ...options,
        moveExisting: false,
      });
      return result.placement;
    }

    // Resolve canvas for new placement
    const canvasId = requestedCanvasId;
    if (!canvasId) {
      throw new Error("No canvas available");
    }

    const canvas = canvasManager.getCanvas(canvasId);
    if (!canvas) {
      throw new Error(`Canvas not found: ${canvasId}`);
    }

    // Resolve position using flow-aware search
    let { row, col } = options;
    let needsExpansion = false;

    if (row === undefined || col === undefined) {
      const nextCell = this._findNextEmptyCell(canvas);
      row = row ?? nextCell.row;
      col = col ?? nextCell.col;
      needsExpansion = nextCell.expanded || false;
    }

    let rowSpan = options.rowSpan || 1;
    let colSpan = options.colSpan || 1;

    const targetVG = this._findViewGroupAtPosition(row, col);
    const targetSlotInfo = targetVG
      ? this._getSlotInfoForCell(targetVG, row, col)
      : null;
    if (targetSlotInfo?.mergeSpan) {
      rowSpan = targetSlotInfo.mergeSpan.rows || rowSpan;
      colSpan = targetSlotInfo.mergeSpan.cols || colSpan;
    }

    // Auto-expand canvas if needed (flow expansion + explicit target extension)
    const flowDirection = canvas.flowDirection || "row";
    const isRowFirst = flowDirection === "row";
    let nextRows = canvas.dimensions.rows;
    let nextCols = canvas.dimensions.cols;

    if (needsExpansion) {
      nextRows = isRowFirst ? nextRows + 1 : nextRows;
      nextCols = isRowFirst ? nextCols : nextCols + 1;
    }

    nextRows = Math.max(nextRows, row + rowSpan);
    nextCols = Math.max(nextCols, col + colSpan);

    if (nextRows !== canvas.dimensions.rows || nextCols !== canvas.dimensions.cols) {
      log.debug(`Auto-expanding canvas to ${nextRows}x${nextCols}`);
      await canvasManager.updateCanvas(canvasId, {
        dimensions: {
          rows: nextRows,
          cols: nextCols,
        },
      });
    }

    await this._clearEmptyPlacementsInRange(canvasId, row, col, rowSpan, colSpan);

    log.debug(
      `Placing view ${viewId} at [${row}, ${col}] on canvas ${canvasId}`
    );

    // Add placement through canvas manager
    let placement;
    try {
      placement = await canvasManager.addPlacement(canvasId, {
        row,
        col,
        rowSpan,
        colSpan,
        content: {
          type: "view",
          viewConfigurationId: viewId,
        },
      });
    } catch (addError) {
      await this._clearBlockingPlacementsInRange(canvasId, row, col, rowSpan, colSpan);
      placement = await canvasManager.addPlacement(canvasId, {
        row,
        col,
        rowSpan,
        colSpan,
        content: {
          type: "view",
          viewConfigurationId: viewId,
        },
      });
    }

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

    // Auto-create implicit solo ViewGroup if the view doesn't already belong to one
    await this._ensureImplicitViewGroup(viewId, view, { row, col });

    // Smart viewport navigation - only moves if cell is outside current view
    this._smartNavigateToPlacement({ row, col, rowSpan, colSpan });

    let placementId = placement.id;
    const placementSnapshot = { canvasId, row, col, rowSpan, colSpan };
    const viewName = view?.name ? `"${view.name}"` : "view";

    canvasHistory.record({
      type: "ADD",
      description: `Place ${viewName}`,
      undo: async () => {
        await canvasManager.removePlacement(placementId);
        if (!canvasManager.isViewOnCanvas(viewId)) {
          viewManager?.deactivateView?.(viewId);
        }
      },
      redo: async () => {
        const restored = await canvasManager.addPlacement(
          placementSnapshot.canvasId,
          {
            row: placementSnapshot.row,
            col: placementSnapshot.col,
            rowSpan: placementSnapshot.rowSpan,
            colSpan: placementSnapshot.colSpan,
            content: {
              type: "view",
              viewConfigurationId: viewId,
            },
          }
        );
        placementId = restored?.id || placementId;
        viewManager?.activateView?.(viewId);
        await this._ensureImplicitViewGroup(viewId, view, {
          row: placementSnapshot.row,
          col: placementSnapshot.col,
        });
        this._smartNavigateToPlacement({
          row: placementSnapshot.row,
          col: placementSnapshot.col,
          rowSpan: placementSnapshot.rowSpan,
          colSpan: placementSnapshot.colSpan,
        });
      },
    });

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
    const view = viewManager?.getView?.(viewId);

    const placementsToRestore = canvasManager.getAllCanvases().flatMap((canvas) =>
      canvas.placements
        .filter((placement) => {
          if (typeof placement?.isView === "function") {
            return placement.isView() && placement.getViewId() === viewId;
          }
          return (
            placement?.content?.type === "view" &&
            (placement?.content?.viewConfigurationId || placement?.content?.viewId) === viewId
          );
        })
        .map((placement) => ({
          placementId: placement.id,
          canvasId: canvas.id,
          row: placement.row,
          col: placement.col,
          rowSpan: placement.rowSpan || 1,
          colSpan: placement.colSpan || 1,
        }))
    );

    // Remove all placements with this view
    await canvasManager.removeViewPlacements(viewId);

    // Clean up implicit VG if this was the last view
    const containingGroup = viewGroupManager.findGroupContainingView(viewId);
    if (containingGroup && !containingGroup.isExplicit) {
      const viewCount = containingGroup.getViewCount?.() || 0;
      if (viewCount <= 1) {
        try {
          await viewGroupManager.deleteViewGroup(containingGroup.id);
        } catch (err) {
          log.warn('Failed to clean up implicit ViewGroup:', err);
        }
      }
    }

    // Deactivate the view
    viewManager?.deactivateView?.(viewId);

    eventBus.emit(BUS_EVENTS.VIEW_REMOVED, { viewId });

    if (placementsToRestore.length === 0) {
      return;
    }

    const viewName = view?.name ? `"${view.name}"` : "view";

    canvasHistory.record({
      type: "DELETE",
      description: `Remove ${viewName}`,
      undo: async () => {
        for (const placement of placementsToRestore) {
          const restored = await canvasManager.addPlacement(placement.canvasId, {
            row: placement.row,
            col: placement.col,
            rowSpan: placement.rowSpan,
            colSpan: placement.colSpan,
            content: {
              type: "view",
              viewConfigurationId: viewId,
            },
          });
          placement.placementId = restored?.id || placement.placementId;
        }
        viewManager?.activateView?.(viewId);
        if (placementsToRestore[0]) {
          await this._ensureImplicitViewGroup(viewId, view, {
            row: placementsToRestore[0].row,
            col: placementsToRestore[0].col,
          });
        }
      },
      redo: async () => {
        for (const placement of placementsToRestore) {
          await canvasManager.removePlacement(placement.placementId);
        }
        viewManager?.deactivateView?.(viewId);
      },
    });
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
    const view = viewManager?.renameView?.(viewId, newName);

    if (view) {
      eventBus.emit(BUS_EVENTS.VIEW_RENAMED, { viewId, newName });
    }

    return view;
  }

  /**
   * Focus a view (select it, make it active, navigate to it if needed)
   *
   * This matches the behavior of the Active Instance Indicator (SecondaryHeader):
   * 1. Set the active instance via workspaceManager (source of truth)
   * 2. Navigate to the cell position
   * 3. Emit events for other components
   *
   * @param {string} viewId - View to focus
   * @param {Object} [options] - Focus options
   * @param {Function} [options.navigateToCell] - Navigation function (if available)
   */
  focusView(viewId, options = {}) {
    log.debug(`Focusing view ${viewId}`);

    // Import workspaceManager dynamically to avoid circular deps
    const { workspaceManager } = require("@Core/instances/workspaceManager.js");

    // 1. Find the instance by viewConfigId and set it as active
    // This is the KEY step that makes it the "active" instance
    const instance = workspaceManager?.getInstanceByViewConfigId?.(viewId);
    if (instance?.instanceId) {
      workspaceManager.setActiveInstance(instance.instanceId);
      log.debug(`Set active instance: ${instance.instanceId}`);
    } else {
      log.debug(`No instance found for viewId ${viewId}`);
    }

    // 2. Navigate to the view's position
    const placement = this._findPlacementForView(viewId);
    if (placement) {
      // If a navigateToCell function was provided, use it (has access to context)
      if (options.navigateToCell) {
        options.navigateToCell(placement.row, placement.col);
      } else {
        // Fallback: dispatch navigation event
        this._navigateToPlacement(placement);
      }
    }

    // 3. Emit events for other components (matches SecondaryHeader behavior)
    eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId });
    window.dispatchEvent(
      new CustomEvent("cia:instance-focused", {
        detail: { viewId, instanceId: instance?.instanceId },
      })
    );
  }

  /**
   * Toggle view visibility (hide/show on canvas)
   *
   * @param {string} viewId - View to toggle visibility
   */
  toggleViewVisibility(viewId) {
    log.debug(`Toggling visibility for view ${viewId}`);

    const viewManager = getViewConfigurationManager();
    const view = viewManager?.getView(viewId);

    if (view) {
      // Toggle the visible property
      const newVisible = view.visible === false ? true : false;
      view.visible = newVisible;

      // Emit update events
      viewManager._emit?.("viewUpdated", view);
      viewManager._dispatchViewUpdateEvent?.(view);
      viewManager._syncToServer?.(view);

      log.debug(`View ${viewId} visibility set to ${newVisible}`);
      eventBus.emit(BUS_EVENTS.VIEW_UPDATED, { viewId, visible: newVisible });
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Find a ViewGroup whose canvas footprint contains (row, col).
   * @private
   * @param {number} row
   * @param {number} col
   * @returns {ViewGroup|null}
   */
  _findViewGroupAtPosition(row, col) {
    const allVGs = viewGroupManager.getAllViewGroups();
    for (const vg of allVGs) {
      const pos = vg.getCanvasPosition?.() || vg.canvasPosition;
      if (!pos || pos.row === undefined) continue;
      const rowEnd = pos.row + (pos.rowSpan || 1);
      const colEnd = pos.col + (pos.colSpan || 1);
      if (row >= pos.row && row < rowEnd && col >= pos.col && col < colEnd) {
        return vg;
      }
    }
    return null;
  }

  /**
   * Determine which slot position in a VG corresponds to canvas cell (row, col).
   * Uses the VG's layout definition and canvas position to map grid cells → slot indices.
   * Also returns the merge span for that slot.
   * @private
   * @param {ViewGroup} vg
   * @param {number} row - Canvas grid row
   * @param {number} col - Canvas grid col
   * @returns {{ slotPosition: number, mergeSpan: { rows: number, cols: number } } | null}
   */
  _getSlotInfoForCell(vg, row, col) {
    const pos = vg.getCanvasPosition?.() || vg.canvasPosition;
    if (!pos || pos.row === undefined) return null;

    const relRow = row - pos.row;
    const relCol = col - pos.col;
    const layout = vg.getLayout?.() || { rows: 1, cols: 1 };
    const merged = layout.merged;

    // Build cell → slot mapping based on layout merge pattern
    // Each entry: { row, col, mergeSpan: { rows, cols } }
    const cells = [];
    if (merged === 'top') {
      // Slot 0: top row spans both columns
      cells.push({ row: 0, col: 0, mergeSpan: { rows: 1, cols: 2 } });
      cells.push({ row: 1, col: 0, mergeSpan: { rows: 1, cols: 1 } });
      cells.push({ row: 1, col: 1, mergeSpan: { rows: 1, cols: 1 } });
    } else if (merged === 'left') {
      // Slot 0: left column spans both rows
      cells.push({ row: 0, col: 0, mergeSpan: { rows: 2, cols: 1 } });
      cells.push({ row: 0, col: 1, mergeSpan: { rows: 1, cols: 1 } });
      cells.push({ row: 1, col: 1, mergeSpan: { rows: 1, cols: 1 } });
    } else if (merged === 'right') {
      // Slot 0 & 1: left column, Slot 2: right column spans both rows
      cells.push({ row: 0, col: 0, mergeSpan: { rows: 1, cols: 1 } });
      cells.push({ row: 1, col: 0, mergeSpan: { rows: 1, cols: 1 } });
      cells.push({ row: 0, col: 1, mergeSpan: { rows: 2, cols: 1 } });
    } else {
      // Standard grid
      const rows = layout.rows || 1;
      const cols = layout.cols || 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({ row: r, col: c, mergeSpan: { rows: 1, cols: 1 } });
        }
      }
    }

    // Find which slot contains (relRow, relCol)
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const cellRowEnd = cell.row + (cell.mergeSpan.rows || 1);
      const cellColEnd = cell.col + (cell.mergeSpan.cols || 1);
      if (relRow >= cell.row && relRow < cellRowEnd &&
          relCol >= cell.col && relCol < cellColEnd) {
        return { slotPosition: i, mergeSpan: cell.mergeSpan };
      }
    }

    return null;
  }

  /**
   * Ensure a view has an implicit solo ViewGroup.
   * If the view is placed at a position within an existing VG, adds the view to
   * that VG and fixes the placement spans to match the VG cell layout.
   * Otherwise creates a new implicit solo VG.
   * Non-critical: view still works without a ViewGroup.
   * @private
   */
  async _ensureImplicitViewGroup(viewId, view, position) {
    try {
      const viewName = view?.name || "View";
      const viewType = view?.instanceType || view?.type || "vtk";
      const datasetId = view?.datasetId || null;

      const removeFromGroup = async (group) => {
        if (!group) return;
        await viewGroupManager.removeViewFromGroup(group.id, viewId);
        const remaining = group.getViewCount?.() || 0;
        if (!group.isExplicit && remaining === 0) {
          try {
            await viewGroupManager.deleteViewGroup(group.id);
          } catch (err) {
            log.warn("Failed to clean up empty implicit ViewGroup:", err);
          }
        }
      };

      // If dropped on top of an existing VG footprint, assign to that VG slot.
      const targetVG = this._findViewGroupAtPosition(position.row, position.col);
      if (targetVG) {
        const slotInfo = this._getSlotInfoForCell(targetVG, position.row, position.col);
        if (slotInfo) {
          const existingGroup = viewGroupManager.findGroupContainingView(viewId);
          if (existingGroup && existingGroup.id !== targetVG.id) {
            await removeFromGroup(existingGroup);
          }

          if (existingGroup && existingGroup.id === targetVG.id) {
            const currentSlot = targetVG.findSlotByViewId?.(viewId);
            if (currentSlot && currentSlot.position !== slotInfo.slotPosition) {
              await viewGroupManager.removeViewFromGroup(targetVG.id, viewId);
            }
          }

          await viewGroupManager.setViewAtSlot(
            targetVG.id,
            slotInfo.slotPosition,
            viewId,
            viewName,
            viewType,
            datasetId
          );

          const rs = slotInfo.mergeSpan?.rows || 1;
          const cs = slotInfo.mergeSpan?.cols || 1;
          const placement = canvasManager.getPlacementForView(viewId);
          if (placement && ((placement.rowSpan || 1) !== rs || (placement.colSpan || 1) !== cs)) {
            const placementRef = canvasManager.findPlacement(placement.id);
            const placementCanvasId = placementRef?.canvas?.id || canvasManager.getActiveCanvas()?.id;
            await this._clearEmptyPlacementsInRange(
              placementCanvasId,
              placement.row,
              placement.col,
              rs,
              cs,
              placement.id
            );
            await canvasManager.updatePlacement(placement.id, { rowSpan: rs, colSpan: cs });
          }

          return {
            groupId: targetVG.id,
            mergeSpan: { rows: rs, cols: cs },
          };
        }
      }

      const existingGroup = viewGroupManager.findGroupContainingView(viewId);
      if (existingGroup) {
        // Keep and reposition implicit solo groups instead of deleting/recreating.
        if (!existingGroup.isExplicit && (existingGroup.getViewCount?.() || 0) <= 1) {
          await viewGroupManager.updateViewGroup(existingGroup.id, {
            canvasPosition: {
              row: position.row,
              col: position.col,
              rowSpan: 1,
              colSpan: 1,
            },
          });
          if (!existingGroup.hasView?.(viewId)) {
            await viewGroupManager.addViewToGroup(
              existingGroup.id,
              viewId,
              viewName,
              viewType,
              datasetId
            );
          }
          return {
            groupId: existingGroup.id,
            mergeSpan: { rows: 1, cols: 1 },
          };
        }

        await removeFromGroup(existingGroup);
      }

      // No covering VG, create an implicit solo VG at the new location.
      const viewGroup = await viewGroupManager.createViewGroup({
        name: view.name || null,
        layoutId: "single",
        canvasPosition: {
          row: position.row,
          col: position.col,
          rowSpan: 1,
          colSpan: 1,
        },
      });

      await viewGroupManager.addViewToGroup(
        viewGroup.id,
        viewId,
        viewName,
        viewType,
        datasetId
      );

      return {
        groupId: viewGroup.id,
        mergeSpan: { rows: 1, cols: 1 },
      };
    } catch (err) {
      log.warn("Failed to assign view to ViewGroup:", err);
      // Non-critical - view still works without a ViewGroup
      return null;
    }
  }

  /**
   * Find next empty cell on a canvas using flow-aware search.
   * 1. First searches within the visible viewport area
   * 2. Then searches the rest of the canvas in flow order
   * 3. If full, returns expansion position (auto-expands canvas)
   *
   * Row-first: search left→right within each row, then next row
   * Column-first: search top→bottom within each column, then next column
   *
   * @private
   * @param {WorkspaceCanvas} canvas - The canvas to search
   * @returns {{ row: number, col: number, expanded?: boolean }}
   */
  _findNextEmptyCell(canvas) {
    if (!canvas) return { row: 0, col: 0 };

    const canvasRows = canvas.dimensions?.rows || 3;
    const canvasCols = canvas.dimensions?.cols || 3;
    const flowDirection = canvas.flowDirection || "row";
    const isRowFirst = flowDirection === "row";

    // Get current viewport state
    let vpRow = 0;
    let vpCol = 0;
    let vpRows = 2;
    let vpCols = 3;

    try {
      const savedSize = localStorage.getItem("cia-viewport-size");
      if (savedSize) {
        const parsed = JSON.parse(savedSize);
        vpRows = parsed.rows || 2;
        vpCols = parsed.cols || 3;
      }
      const savedPos = localStorage.getItem("cia-viewport-position");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        vpRow = parsed.row || 0;
        vpCol = parsed.col || 0;
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Helper to check if position is available
    const isAvailable = (r, c) => {
      if (canvas.isPositionAvailable) {
        return canvas.isPositionAvailable(r, c, 1, 1);
      }
      // Fallback: check placements manually
      if (!canvas.placements) return true;
      return !canvas.placements.some((p) => {
        const pEndRow = p.row + (p.rowSpan || 1);
        const pEndCol = p.col + (p.colSpan || 1);
        return r >= p.row && r < pEndRow && c >= p.col && c < pEndCol;
      });
    };

    // Calculate viewport bounds
    const vpRowEnd = Math.min(vpRow + vpRows, canvasRows);
    const vpColEnd = Math.min(vpCol + vpCols, canvasCols);

    // PHASE 1: Search within visible viewport first
    if (isRowFirst) {
      for (let row = vpRow; row < vpRowEnd; row++) {
        for (let col = vpCol; col < vpColEnd; col++) {
          if (isAvailable(row, col)) {
            return { row, col };
          }
        }
      }
    } else {
      for (let col = vpCol; col < vpColEnd; col++) {
        for (let row = vpRow; row < vpRowEnd; row++) {
          if (isAvailable(row, col)) {
            return { row, col };
          }
        }
      }
    }

    // PHASE 2: Search rest of canvas in flow order
    if (isRowFirst) {
      for (let row = 0; row < canvasRows; row++) {
        for (let col = 0; col < canvasCols; col++) {
          // Skip viewport area (already checked)
          if (row >= vpRow && row < vpRowEnd && col >= vpCol && col < vpColEnd) continue;
          if (isAvailable(row, col)) {
            return { row, col };
          }
        }
      }
    } else {
      for (let col = 0; col < canvasCols; col++) {
        for (let row = 0; row < canvasRows; row++) {
          // Skip viewport area (already checked)
          if (row >= vpRow && row < vpRowEnd && col >= vpCol && col < vpColEnd) continue;
          if (isAvailable(row, col)) {
            return { row, col };
          }
        }
      }
    }

    // PHASE 3: Canvas is full - return position for expansion
    // Row-first: new row at bottom (canvasRows, 0)
    // Column-first: new column at right (0, canvasCols)
    if (isRowFirst) {
      return { row: canvasRows, col: 0, expanded: true };
    } else {
      return { row: 0, col: canvasCols, expanded: true };
    }
  }

  /**
   * Remove empty placeholder placements overlapping a target area.
   * This avoids placement conflicts when dropping/moving a view into VG cells.
   * @private
   */
  async _clearEmptyPlacementsInRange(
    canvasId,
    row,
    col,
    rowSpan = 1,
    colSpan = 1,
    excludePlacementId = null
  ) {
    if (!canvasId) return;
    const canvas = canvasManager.getCanvas(canvasId);
    if (!canvas?.placements?.length) return;

    const rowEnd = row + Math.max(1, rowSpan);
    const colEnd = col + Math.max(1, colSpan);
    const overlaps = (placement) => {
      const pRowEnd = placement.row + (placement.rowSpan || 1);
      const pColEnd = placement.col + (placement.colSpan || 1);
      return placement.row < rowEnd && pRowEnd > row && placement.col < colEnd && pColEnd > col;
    };

    const emptyPlacements = canvas.placements.filter((placement) => {
      if (!placement || placement.id === excludePlacementId) return false;
      if (!overlaps(placement)) return false;
      return placement.content?.type === "empty" || !placement.content?.type;
    });

    for (const placement of emptyPlacements) {
      try {
        await canvasManager.removePlacement(placement.id);
      } catch (err) {
        log.debug(`Failed clearing placeholder placement ${placement.id}:`, err);
      }
    }
  }

  /**
   * Remove any placements overlapping a target area except the provided excluded placement.
   * Used as a fallback when move/place hits collisions despite placeholder clearing.
   * @private
   */
  async _clearBlockingPlacementsInRange(
    canvasId,
    row,
    col,
    rowSpan = 1,
    colSpan = 1,
    excludePlacementId = null
  ) {
    if (!canvasId) return;
    const canvas = canvasManager.getCanvas(canvasId);
    if (!canvas?.placements?.length) return;

    const rowEnd = row + Math.max(1, rowSpan);
    const colEnd = col + Math.max(1, colSpan);
    const overlaps = (placement) => {
      const pRowEnd = placement.row + (placement.rowSpan || 1);
      const pColEnd = placement.col + (placement.colSpan || 1);
      return placement.row < rowEnd && pRowEnd > row && placement.col < colEnd && pColEnd > col;
    };

    const blockers = canvas.placements.filter((placement) => {
      if (!placement || placement.id === excludePlacementId) return false;
      return overlaps(placement);
    });

    for (const placement of blockers) {
      try {
        await canvasManager.removePlacement(placement.id);
      } catch (err) {
        log.debug(`Failed clearing blocking placement ${placement.id}:`, err);
      }
    }
  }

  /**
   * Check whether a placement matches a target geometry.
   * @private
   */
  _placementMatchesTarget(placement, row, col, rowSpan = 1, colSpan = 1) {
    if (!placement) return false;
    return (
      placement.row === row &&
      placement.col === col &&
      (placement.rowSpan || 1) === Math.max(1, rowSpan) &&
      (placement.colSpan || 1) === Math.max(1, colSpan)
    );
  }

  /**
   * Find placement for a view
   * @private
   */
  _findPlacementForView(viewId, canvasId) {
    if (!viewId) return null;
    const viewKey = String(viewId);
    const findInCanvas = (canvas) => {
      if (!canvas?.placements?.length) return null;
      return canvas.placements.find((placement) => {
        const placementViewId = placement?.content?.viewConfigurationId || placement?.content?.viewId;
        return placementViewId != null && String(placementViewId) === viewKey;
      }) || null;
    };

    if (canvasId) {
      const inRequestedCanvas = findInCanvas(canvasManager.getCanvas(canvasId));
      if (inRequestedCanvas) return inRequestedCanvas;
    }

    const inActiveCanvas = findInCanvas(canvasManager.getActiveCanvas());
    if (inActiveCanvas) return inActiveCanvas;

    const allCanvases = canvasManager.getAllCanvases?.() || [];
    for (const canvas of allCanvases) {
      const placement = findInCanvas(canvas);
      if (placement) return placement;
    }

    return null;
  }

  /**
   * Navigate viewport to show a placement (legacy - positions at top-left)
   * @private
   */
  _navigateToPlacement(placement) {
    if (!placement) return;

    const { row, col } = placement;

    // Dispatch navigation event
    window.dispatchEvent(
      new CustomEvent("cia:viewport-navigate-to", {
        detail: { row: Math.max(0, row - 1), col: Math.max(0, col - 1) },
      })
    );

    eventBus.emit(BUS_EVENTS.NAVIGATE_TO_CELL, { row, col });
  }

  /**
   * Smart viewport navigation - only moves viewport if cell is not visible
   * Uses minimum movement to bring the cell into view
   * @private
   */
  _smartNavigateToPlacement(placement) {
    if (!placement) return;

    const { row, col, rowSpan = 1, colSpan = 1 } = placement;

    // Get current viewport state from local storage (synced by LayoutPanel.logic)
    let vpRow = 0;
    let vpCol = 0;
    let vpRows = 2;
    let vpCols = 3;

    // Try to get viewport state from the DOM event system
    // This is a bit hacky but works for now
    try {
      const savedSize = localStorage.getItem("cia-viewport-size");
      if (savedSize) {
        const parsed = JSON.parse(savedSize);
        vpRows = parsed.rows || 2;
        vpCols = parsed.cols || 3;
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Get canvas for dimensions
    const canvas = canvasManager.getActiveCanvas();
    const canvasRows = canvas?.dimensions?.rows || 10;
    const canvasCols = canvas?.dimensions?.cols || 10;

    // Get current viewport position from canvasManager if available
    // This is typically set via useCanvas hook
    const currentViewport = canvas?.viewport;
    if (currentViewport) {
      vpRow = currentViewport.row || 0;
      vpCol = currentViewport.col || 0;
    }

    // Calculate if cell is already visible
    const cellEndRow = row + rowSpan;
    const cellEndCol = col + colSpan;
    const vpEndRow = vpRow + vpRows;
    const vpEndCol = vpCol + vpCols;

    const isVisible =
      row >= vpRow &&
      col >= vpCol &&
      cellEndRow <= vpEndRow &&
      cellEndCol <= vpEndCol;

    if (isVisible) {
      log.debug(`[smartNavigate] Cell already visible, not moving viewport`);
      return;
    }

    // Calculate minimum movement needed
    let newVpRow = vpRow;
    let newVpCol = vpCol;

    // Vertical adjustment
    if (row < vpRow) {
      // Cell is above viewport - move up
      newVpRow = row;
    } else if (cellEndRow > vpEndRow) {
      // Cell is below viewport - move down just enough
      newVpRow = cellEndRow - vpRows;
    }

    // Horizontal adjustment
    if (col < vpCol) {
      // Cell is left of viewport - move left
      newVpCol = col;
    } else if (cellEndCol > vpEndCol) {
      // Cell is right of viewport - move right just enough
      newVpCol = cellEndCol - vpCols;
    }

    // Clamp to canvas bounds
    const maxRow = Math.max(0, canvasRows - vpRows);
    const maxCol = Math.max(0, canvasCols - vpCols);
    newVpRow = Math.max(0, Math.min(newVpRow, maxRow));
    newVpCol = Math.max(0, Math.min(newVpCol, maxCol));

    log.debug(
      `[smartNavigate] Moving viewport from (${vpRow}, ${vpCol}) to (${newVpRow}, ${newVpCol})`
    );

    // Dispatch navigation event with the calculated position
    window.dispatchEvent(
      new CustomEvent("cia:navigate-to-cell", {
        detail: { row: newVpRow, col: newVpCol },
      })
    );

    eventBus.emit(BUS_EVENTS.NAVIGATE_TO_CELL, { row: newVpRow, col: newVpCol });
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
