// src/ui/react/components/panels/LayoutPanel/LayoutPanel.logic.js
// Headless logic hook for LayoutPanel
//
// This hook wraps useCanvas and exposes all the functions needed by:
// - LayoutPanel subtabs (Canvas, Views)
// - CanvasNavigator (via useCanvasNavigator)
//
// IMPORTANT: This is the bridge between useCanvas and the UI components.

import { useState, useCallback, useMemo, useEffect } from "react";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import {
  getDatasetManager,
  getViewConfigurationManager,
} from "@Init/appInitializer";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { ui as log } from "@Utils/logger.js";
import {
  dispatchNavigateTo,
  dispatchMoveViewport,
} from "@UI/react/hooks/useViewportSync.js";
import {
  VIEWPORT_SIZE_EVENT,
  getInitialViewportSize,
  DEFAULT_VIEWPORT_SIZE,
} from "@UI/react/hooks/viewportState.js";

// Must match the key used in useViewportSize.js
const VIEWPORT_STORAGE_KEY = "cia-viewport-size";

/**
 * Load saved viewport size from localStorage
 * This must match the logic in useViewportSize.js to ensure consistency
 */
function loadSavedViewportSize() {
  try {
    const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.rows === "number" &&
        typeof parsed.cols === "number" &&
        parsed.rows >= 1 &&
        parsed.rows <= 10 &&
        parsed.cols >= 1 &&
        parsed.cols <= 10
      ) {
        return { rows: parsed.rows, cols: parsed.cols };
      }
    }
  } catch (e) {
    console.warn("[LayoutPanel.logic] Failed to load saved viewport size:", e);
  }
  // Default fallback - matches DEFAULT_VIEWPORT_SIZE in useViewportSize.js
  return { rows: 2, cols: 3 };
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const LAYOUT_MODES = {
  FREE: "free",
  FLOW: "flow",
  GRID: "grid",
};

export const FLOW_DIRECTIONS = {
  ROW: "row",
  COLUMN: "column",
};

export const TOOLS = {
  SELECT: "select",
  PAN: "pan",
  MERGE: "merge",
};

export const DROP_MODES = {
  REPLACE: "replace",
  SWAP: "swap",
  INSERT: "insert",
};

export const VIEW_MODES = {
  DETAILED: "detailed",
  COMPACT: "compact",
  MINIMAL: "minimal",
};

export const SPAWN_SIZES = {
  "1x1": { rows: 1, cols: 1 },
  "1x2": { rows: 1, cols: 2 },
  "2x1": { rows: 2, cols: 1 },
  "2x2": { rows: 2, cols: 2 },
  "2x3": { rows: 2, cols: 3 },
  "3x2": { rows: 3, cols: 2 },
  "3x3": { rows: 3, cols: 3 },
};

export const DOCK_POSITIONS = {
  LEFT_PANEL: "left-panel",
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  FLOAT: "float",
  MINIMIZED: "minimized",
};

export function parseSpawnSize(sizeStr) {
  return SPAWN_SIZES[sizeStr] || SPAWN_SIZES["1x1"];
}

// Instance colors for views
export const INSTANCE_COLORS = [
  "#60a5fa", // blue
  "#34d399", // green
  "#7dd3fc", // cyan
  "#fb7185", // pink
  "#c084fc", // purple
  "#fbbf24", // amber
];

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useLayoutPanel - Headless hook for layout panel state and actions
 *
 * @param {Object} options
 * @param {string} [options.canvasId] - Target canvas ID (uses active canvas if not provided)
 * @param {Object} [options.__testing] - Mock data for testing
 * @returns {Object} Panel state and actions
 */
export function useLayoutPanel({ canvasId, __testing } = {}) {
  // ===========================================================================
  // DATA SOURCE: useCanvas
  // ===========================================================================

  const canvasData = useCanvas(canvasId);

  const {
    canvas,
    viewport: canvasViewport,
    loading,
    error,
    isConnected,
    // Canvas operations
    moveViewport: canvasMoveViewport,
    setViewportPosition: canvasSetViewportPosition,
    setViewportSize: canvasSetViewportSize,
    addPlacement,
    updatePlacement,
    removePlacement,
    movePlacement,
    resizePlacement,
    addRow: canvasAddRow,
    addColumn: canvasAddColumn,
  } = __testing || canvasData;

  // ===========================================================================
  // CANVAS DIMENSIONS
  // ===========================================================================

  const canvasSize = useMemo(
    () => canvas?.dimensions || { rows: 4, cols: 5 },
    [canvas]
  );

  // ===========================================================================
  // VIEWPORT STATE
  // ===========================================================================

  // Initialize from useCanvas viewport if available
  const [localViewportSize, setLocalViewportSize] = useState(
    getInitialViewportSize
  );

  // Sync when canvasViewport changes externally
  useEffect(() => {
    if (canvasViewport?.rows && canvasViewport?.cols) {
      setLocalViewportSize({
        rows: canvasViewport.rows,
        cols: canvasViewport.cols,
      });
    }
  }, [canvasViewport?.rows, canvasViewport?.cols]);

  const [enrichmentRefreshKey, setEnrichmentRefreshKey] = useState(0);

  // Listen for view/dataset updates to trigger re-enrichment
  useEffect(() => {
    const handleViewsUpdated = () => {
      setEnrichmentRefreshKey((k) => k + 1);
    };

    const handleDatasetsUpdated = () => {
      setEnrichmentRefreshKey((k) => k + 1);
    };

    window.addEventListener("cia:views-loaded", handleViewsUpdated);
    window.addEventListener("cia:view-added", handleViewsUpdated);
    window.addEventListener("cia:view-updated", handleViewsUpdated);
    window.addEventListener("cia:datasets-loaded", handleDatasetsUpdated);
    window.addEventListener("cia:dataset-added", handleDatasetsUpdated);

    return () => {
      window.removeEventListener("cia:views-loaded", handleViewsUpdated);
      window.removeEventListener("cia:view-added", handleViewsUpdated);
      window.removeEventListener("cia:view-updated", handleViewsUpdated);
      window.removeEventListener("cia:datasets-loaded", handleDatasetsUpdated);
      window.removeEventListener("cia:dataset-added", handleDatasetsUpdated);
    };
  }, []);

  // Listen for viewport size changes from CanvasGrid (via useViewportSize events)
  useEffect(() => {
    const handleViewportSizeChanged = (e) => {
      const { size } = e.detail;
      if (size?.rows && size?.cols) {
        setLocalViewportSize({
          rows: Math.max(1, Math.min(10, size.rows)),
          cols: Math.max(1, Math.min(10, size.cols)),
        });
      }
    };

    window.addEventListener(VIEWPORT_SIZE_EVENT, handleViewportSizeChanged);
    return () =>
      window.removeEventListener(
        VIEWPORT_SIZE_EVENT,
        handleViewportSizeChanged
      );
  }, []);

  const viewport = useMemo(
    () => ({
      row: canvasViewport?.row ?? 0,
      col: canvasViewport?.col ?? 0,
    }),
    [canvasViewport]
  );

  const viewportSize = useMemo(
    () => ({
      rows:
        canvasViewport?.rows ??
        localViewportSize.rows ??
        DEFAULT_VIEWPORT_SIZE.rows,
      cols:
        canvasViewport?.cols ??
        localViewportSize.cols ??
        DEFAULT_VIEWPORT_SIZE.cols,
    }),
    [canvasViewport, localViewportSize]
  );

  // ===========================================================================
  // VIEWPORT NAVIGATION
  // ===========================================================================

  /**
   * Move viewport by delta or direction string
   * Also dispatches sync events so CanvasGrid can follow
   */
  const moveViewport = useCallback(
    (deltaRowOrDirection, deltaCol) => {
      if (typeof deltaRowOrDirection === "string") {
        const direction = deltaRowOrDirection;
        switch (direction) {
          case "up":
            canvasMoveViewport?.(-1, 0);
            dispatchMoveViewport(-1, 0);
            break;
          case "down":
            canvasMoveViewport?.(1, 0);
            dispatchMoveViewport(1, 0);
            break;
          case "left":
            canvasMoveViewport?.(0, -1);
            dispatchMoveViewport(0, -1);
            break;
          case "right":
            canvasMoveViewport?.(0, 1);
            dispatchMoveViewport(0, 1);
            break;
          case "home":
            canvasSetViewportPosition?.(0, 0);
            dispatchNavigateTo(0, 0);
            break;
          default:
            log.warn(`Unknown direction: ${direction}`);
        }
        return;
      }

      const deltaRow =
        typeof deltaRowOrDirection === "number" ? deltaRowOrDirection : 0;
      const dCol = typeof deltaCol === "number" ? deltaCol : 0;
      canvasMoveViewport?.(deltaRow, dCol);
      dispatchMoveViewport(deltaRow, dCol);
    },
    [canvasMoveViewport, canvasSetViewportPosition]
  );

  /**
   * Set viewport position directly
   * Also dispatches sync events so CanvasGrid can follow
   */
  const setViewportPosition = useCallback(
    (row, col) => {
      const targetRow = typeof row === "number" && !isNaN(row) ? row : 0;
      const targetCol = typeof col === "number" && !isNaN(col) ? col : 0;

      // Clamp to canvas bounds
      const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
      const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);
      const clampedRow = Math.max(0, Math.min(targetRow, maxRow));
      const clampedCol = Math.max(0, Math.min(targetCol, maxCol));

      canvasSetViewportPosition?.(clampedRow, clampedCol);
      dispatchNavigateTo(clampedRow, clampedCol);
    },
    [canvasSetViewportPosition, canvasSize, viewportSize]
  );

  /**
   * Navigate to specific cell
   * Also dispatches sync events so CanvasGrid can follow
   */
  const navigateToCell = useCallback(
    (row, col) => {
      setViewportPosition(row, col);
    },
    [setViewportPosition]
  );

  // ===========================================================================
  // VIEWPORT SIZE CONTROLS
  // ===========================================================================
  const setViewportSizeRows = useCallback(
    (rows) => {
      const value = Math.max(1, Math.min(10, rows));
      const previousSize = {
        rows: localViewportSize.rows,
        cols: localViewportSize.cols,
      };
      const newSize = { rows: value, cols: localViewportSize.cols };

      // Update local state
      setLocalViewportSize((prev) => ({ ...prev, rows: value }));

      // Update useCanvas state
      canvasSetViewportSize?.(value, localViewportSize.cols);

      // CRITICAL: Dispatch event so CanvasGrid's useViewportSize receives update
      window.dispatchEvent(
        new CustomEvent(VIEWPORT_SIZE_EVENT, {
          detail: {
            size: newSize,
            previousSize: previousSize,
            cellCount: newSize.rows * newSize.cols,
            previousCellCount: previousSize.rows * previousSize.cols,
          },
          bubbles: true,
        })
      );

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[LayoutPanel.logic] Viewport size rows changed:",
          previousSize.rows,
          "→",
          value
        );
      }
    },
    [canvasSetViewportSize, localViewportSize]
  );

  const setViewportSizeCols = useCallback(
    (cols) => {
      const value = Math.max(1, Math.min(10, cols));
      const previousSize = {
        rows: localViewportSize.rows,
        cols: localViewportSize.cols,
      };
      const newSize = { rows: localViewportSize.rows, cols: value };

      // Update local state
      setLocalViewportSize((prev) => ({ ...prev, cols: value }));

      // Update useCanvas state
      canvasSetViewportSize?.(localViewportSize.rows, value);

      // CRITICAL: Dispatch event so CanvasGrid's useViewportSize receives update
      window.dispatchEvent(
        new CustomEvent(VIEWPORT_SIZE_EVENT, {
          detail: {
            size: newSize,
            previousSize: previousSize,
            cellCount: newSize.rows * newSize.cols,
            previousCellCount: previousSize.rows * previousSize.cols,
          },
          bubbles: true,
        })
      );

      if (process.env.NODE_ENV === "development") {
        console.log(
          "[LayoutPanel.logic] Viewport size cols changed:",
          previousSize.cols,
          "→",
          value
        );
      }
    },
    [canvasSetViewportSize, localViewportSize]
  );

  // ===========================================================================
  // CANVAS SIZE CONTROLS
  // ===========================================================================

  const setCanvasRows = useCallback(
    async (rows) => {
      if (!canvas?.id) return;
      const value = Math.max(1, Math.min(50, rows));

      // Check if reduction would orphan views
      const maxOccupiedRow = (canvas.placements || []).reduce(
        (max, p) => Math.max(max, p.row + (p.rowSpan || 1)),
        0
      );

      if (value < maxOccupiedRow) {
        log.warn(
          `Cannot reduce rows to ${value}: views occupy up to row ${maxOccupiedRow}`
        );
        return;
      }

      await canvasManager.updateCanvas(canvas.id, {
        dimensions: { ...canvas.dimensions, rows: value },
      });
    },
    [canvas]
  );

  const setCanvasCols = useCallback(
    async (cols) => {
      if (!canvas?.id) return;
      const value = Math.max(1, Math.min(50, cols));

      // Check if reduction would orphan views
      const maxOccupiedCol = (canvas.placements || []).reduce(
        (max, p) => Math.max(max, p.col + (p.colSpan || 1)),
        0
      );

      if (value < maxOccupiedCol) {
        log.warn(
          `Cannot reduce cols to ${value}: views occupy up to col ${maxOccupiedCol}`
        );
        return;
      }

      await canvasManager.updateCanvas(canvas.id, {
        dimensions: { ...canvas.dimensions, cols: value },
      });
    },
    [canvas]
  );

  // Legacy addRow/addColumn
  const addRow = useCallback(async () => {
    await setCanvasRows(canvasSize.rows + 1);
  }, [setCanvasRows, canvasSize.rows]);

  const addColumn = useCallback(async () => {
    await setCanvasCols(canvasSize.cols + 1);
  }, [setCanvasCols, canvasSize.cols]);

  // ===========================================================================
  // HOMEPOINT
  // ===========================================================================

  const [homepoint, setHomepointState] = useState(null);

  const setHomepoint = useCallback((row, col) => {
    setHomepointState({ row, col });
  }, []);

  const clearHomepoint = useCallback(() => {
    setHomepointState(null);
  }, []);

  // ===========================================================================
  // PLACEMENTS → CELLS (enriched with ViewConfiguration data)
  // ===========================================================================

  // ===========================================================================
  // PLACEMENTS → CELLS (enriched with ViewConfiguration data)
  // ===========================================================================

  const rawPlacements = useMemo(() => canvas?.placements || [], [canvas]);

  const cells = useMemo(() => {
    if (!rawPlacements || rawPlacements.length === 0) return [];

    // Get manager references at call time (not import time!)
    const vcManager = getViewConfigurationManager();
    const dsManager = getDatasetManager();

    return rawPlacements.map((placement, index) => {
      // Get viewConfigurationId from placement (multiple fallback paths)
      const viewId =
        placement.getViewId?.() ||
        placement.content?.viewConfigurationId ||
        placement.viewConfigurationId ||
        null;

      // Look up ViewConfiguration for metadata
      const viewConfig = viewId ? vcManager.getView(viewId) : null;

      // =====================================================================
      // Get dataset info - MUST define these variables before using them
      // =====================================================================
      const dataset = viewConfig?.datasetId
        ? dsManager.getDataset(viewConfig.datasetId)
        : null;

      // Extract filename from dataset
      const datasetFilename = dataset?.filename || dataset?.fileName || null;

      // Build datasetName with fallbacks
      const datasetName =
        datasetFilename ||
        viewConfig?.datasetName ||
        (viewConfig?.datasetId
          ? `Dataset ${viewConfig.datasetId.slice(0, 8)}`
          : null);

      // Extract filename from view name if it follows "View of X.vtp" pattern
      const extractedFilename = viewConfig?.name?.match(/View of (.+)/)?.[1];

      // Build display name with priority: datasetFilename > extracted > viewConfig name > fallback
      const displayName =
        datasetFilename ||
        extractedFilename ||
        viewConfig?.name ||
        placement.content?.name ||
        placement.name ||
        `View ${index + 1}`;

      // =====================================================================
      // Get instance color from workspaceManager (matches canvas display)
      // =====================================================================
      const instanceColorFromManager = viewId
        ? workspaceManager?.getViewColor?.(viewId)
        : null;
      const colorHex =
        instanceColorFromManager?.hex ||
        viewConfig?.camera?.color ||
        INSTANCE_COLORS[index % INSTANCE_COLORS.length];

      // =====================================================================
      // Return enriched cell object
      // =====================================================================
      return {
        // Placement position data
        id: placement.id,
        row: placement.row,
        col: placement.col,
        rowSpan: placement.rowSpan || 1,
        colSpan: placement.colSpan || 1,
        content: placement.content,

        // ViewConfiguration metadata
        viewConfigurationId: viewId,

        // Display name - use the computed displayName
        name: displayName,
        title: displayName,

        // Additional metadata
        description: viewConfig?.description || "",
        datasetId: viewConfig?.datasetId,
        datasetName: datasetName, // Now properly defined above

        // Color - use workspaceManager color for consistency with canvas
        color: colorHex,
        instanceColor: colorHex,
        viewColor: colorHex,

        // Status flags
        isShared: viewConfig?.visibility !== "private",
        isLinked: false, // TODO: check links
        visibility: viewConfig?.visibility || "private",
        status: viewConfig?.status || "active",
      };
    });
  }, [rawPlacements, enrichmentRefreshKey]);

  // ===========================================================================
  // PANEL UI STATE
  // ===========================================================================

  const [panelSubtab, setPanelSubtab] = useState("views");
  const [viewMode, setViewMode] = useState(VIEW_MODES.DETAILED);
  const [activeFilters, setActiveFilters] = useState(["active"]);
  const [groupBy, setGroupBy] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [spawnSize, setSpawnSize] = useState("1x1");
  const [editMode, setEditMode] = useState(false);
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [dropMode, setDropMode] = useState(DROP_MODES.REPLACE);
  const [expandedViewId, setExpandedViewId] = useState(null);

  // ===========================================================================
  // FILTERS
  // ===========================================================================

  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const filteredCells = useMemo(() => {
    let result = [...cells];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cell) =>
          cell.name?.toLowerCase().includes(query) ||
          cell.datasetName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [cells, searchQuery]);

  // ===========================================================================
  // VIEW ACTIONS
  // ===========================================================================

  const closeView = useCallback(
    async (viewId) => {
      const cell = cells.find(
        (c) => c.viewConfigurationId === viewId || c.id === viewId
      );
      if (cell) {
        await removePlacement(cell.id);
      }
    },
    [cells, removePlacement]
  );

  const deleteView = useCallback(
    async (viewId) => {
      await closeView(viewId);
      await getViewConfigurationManager()?.deleteView(viewId);
    },
    [closeView]
  );

  // ===========================================================================
  // EDIT MODE
  // ===========================================================================

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  // ===========================================================================
  // MERGE / UNMERGE / DELETE OPERATIONS
  // ===========================================================================

  /**
   * Merge multiple placements into one spanning placement
   * Takes the first placement's position and expands to cover all selected
   */
  const mergeCells = useCallback(
    async (placementIds) => {
      if (!canvas?.id || placementIds.length < 2) return;

      // Get all placements
      const placements = placementIds
        .map((id) => rawPlacements.find((p) => p.id === id))
        .filter(Boolean);

      if (placements.length < 2) return;

      // Calculate bounding box
      let minRow = Infinity,
        minCol = Infinity;
      let maxRow = -Infinity,
        maxCol = -Infinity;

      placements.forEach((p) => {
        minRow = Math.min(minRow, p.row);
        minCol = Math.min(minCol, p.col);
        maxRow = Math.max(maxRow, p.row + (p.rowSpan || 1));
        maxCol = Math.max(maxCol, p.col + (p.colSpan || 1));
      });

      const rowSpan = maxRow - minRow;
      const colSpan = maxCol - minCol;

      // Keep the first placement, resize it to span all
      const keepPlacement = placements[0];
      const removePlacements = placements.slice(1);

      try {
        // Remove other placements first
        await Promise.all(removePlacements.map((p) => removePlacement(p.id)));

        // Resize the kept placement
        await resizePlacement(keepPlacement.id, rowSpan, colSpan);

        // Move to top-left if needed
        if (keepPlacement.row !== minRow || keepPlacement.col !== minCol) {
          await movePlacement(keepPlacement.id, minRow, minCol);
        }

        log.info(`Merged ${placements.length} cells into one`);
      } catch (error) {
        log.error("Failed to merge cells:", error);
      }
    },
    [canvas, rawPlacements, removePlacement, resizePlacement, movePlacement]
  );

  /**
   * Unmerge a spanning placement back to 1x1
   */
  const unmergeCells = useCallback(
    async (placementId) => {
      const placement = rawPlacements.find((p) => p.id === placementId);
      if (!placement) return;

      const { rowSpan = 1, colSpan = 1 } = placement;
      if (rowSpan === 1 && colSpan === 1) {
        log.warn("Cell is not merged");
        return;
      }

      try {
        // Just resize back to 1x1
        await resizePlacement(placementId, 1, 1);
        log.info(`Unmerged cell ${placementId}`);
      } catch (error) {
        log.error("Failed to unmerge cell:", error);
      }
    },
    [rawPlacements, resizePlacement]
  );

  /**
   * Delete a placement (remove from canvas)
   */
  const deleteCells = useCallback(
    async (placementId) => {
      try {
        await removePlacement(placementId);
        log.info(`Deleted placement ${placementId}`);
      } catch (error) {
        log.error("Failed to delete placement:", error);
      }
    },
    [removePlacement]
  );

  // ===========================================================================
  // RETURN API
  // ===========================================================================

  return {
    // Canvas data
    canvas,
    canvasSize,
    cells,
    filteredCells,
    rawPlacements,

    // Viewport state
    viewport,
    viewportSize,

    // Loading/error state
    loading,
    error,
    isConnected,

    // Viewport navigation
    moveViewport,
    navigateToCell,
    setViewportPosition,

    // Viewport size controls (FOR CANVAS NAVIGATOR)
    setViewportSizeRows,
    setViewportSizeCols,

    // Canvas size controls (FOR CANVAS NAVIGATOR)
    setCanvasRows,
    setCanvasCols,
    addRow,
    addColumn,

    // Homepoint (FOR CANVAS NAVIGATOR)
    homepoint,
    setHomepoint,
    clearHomepoint,

    // Cell operations (FOR CANVAS NAVIGATOR)
    removePlacement,
    movePlacement,
    resizePlacement,
    mergeCells,
    unmergeCells,

    // Panel UI state
    panelSubtab,
    setPanelSubtab,
    viewMode,
    setViewMode,
    activeFilters,
    toggleFilter,
    setActiveFilters,
    groupBy,
    setGroupBy,
    searchQuery,
    setSearchQuery,
    spawnSize,
    setSpawnSize,
    expandedViewId,
    setExpandedViewId,

    // Edit mode
    editMode,
    setEditMode,
    toggleEditMode,
    exitEditMode,
    tool,
    setTool,
    dropMode,
    setDropMode,

    // View actions
    closeView,
    deleteView,

    // Merge/Unmerge/Delete operations (FOR CANVAS NAVIGATOR)
    mergeCells,
    unmergeCells,
    deleteCells,
  };
}

export default useLayoutPanel;
