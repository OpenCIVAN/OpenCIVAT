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
import { viewConfigurationManager } from "@Core/data/managers/ViewConfigurationManager.js";
import { datasetManager } from "@Init/appInitializer";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { ui as log } from "@Utils/logger.js";
import {
  dispatchNavigateTo,
  dispatchMoveViewport,
} from "@UI/react/hooks/useViewportSync.js";
import { EVENT_NAME as VIEWPORT_SIZE_EVENT } from "@UI/react/hooks/useViewportSize.js";

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

  // Viewport position comes from useCanvas
  // Viewport SIZE we manage locally for more control
  const [localViewportSize, setLocalViewportSize] = useState({
    rows: 2,
    cols: 3,
  });

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
      rows: canvasViewport?.rows ?? localViewportSize.rows,
      cols: canvasViewport?.cols ?? localViewportSize.cols,
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

  const rawPlacements = useMemo(() => canvas?.placements || [], [canvas]);

  const cells = useMemo(() => {
    if (!rawPlacements || rawPlacements.length === 0) return [];

    return rawPlacements.map((placement, index) => {
      // Get viewConfigurationId from placement
      const viewId =
        placement.getViewId?.() ||
        placement.content?.viewConfigurationId ||
        placement.viewConfigurationId ||
        null;

      // Look up ViewConfiguration for metadata
      const viewConfig = viewId
        ? viewConfigurationManager.getView(viewId)
        : null;

      // ==== START OF FIX ====
      // Get dataset info - fetch from datasetManager like other components do
      const dataset = viewConfig?.datasetId
        ? datasetManager.getDataset(viewConfig.datasetId)
        : null;
      const datasetFilename = dataset?.filename || dataset?.fileName || null;
      const datasetName =
        datasetFilename ||
        viewConfig?.datasetName ||
        (viewConfig?.datasetId
          ? `Dataset ${viewConfig.datasetId.slice(0, 8)}`
          : null);
      // ==== END OF FIX ====

      // Get the instance color from workspaceManager (matches canvas display)
      // This ensures the navigator shows the same colors as the main canvas
      const instanceColorFromManager = viewId
        ? workspaceManager?.getViewColor?.(viewId)
        : null;
      const colorHex =
        instanceColorFromManager?.hex ||
        viewConfig?.camera?.color ||
        INSTANCE_COLORS[index % INSTANCE_COLORS.length];

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
        // ==== UPDATED: Use datasetFilename first ====
        name:
          datasetFilename ||
          viewConfig?.name ||
          placement.name ||
          `View ${index + 1}`,
        title:
          datasetFilename ||
          viewConfig?.name ||
          placement.name ||
          `View ${index + 1}`,
        description: viewConfig?.description || "",
        datasetId: viewConfig?.datasetId,
        datasetName: datasetName,

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
      await viewConfigurationManager.deleteView(viewId);
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
  // MERGE/UNMERGE CELLS
  // ===========================================================================

  const mergeCells = useCallback(
    async (cellIds) => {
      if (cellIds.length < 2) return;

      // Find bounds of selected cells
      const selectedCells = cells.filter((c) => cellIds.includes(c.id));
      const minRow = Math.min(...selectedCells.map((c) => c.row));
      const maxRow = Math.max(
        ...selectedCells.map((c) => c.row + (c.rowSpan || 1))
      );
      const minCol = Math.min(...selectedCells.map((c) => c.col));
      const maxCol = Math.max(
        ...selectedCells.map((c) => c.col + (c.colSpan || 1))
      );

      // Keep first cell, resize it, remove others
      const primaryCell = selectedCells[0];
      await resizePlacement(primaryCell.id, maxRow - minRow, maxCol - minCol);

      for (let i = 1; i < selectedCells.length; i++) {
        await removePlacement(selectedCells[i].id);
      }
    },
    [cells, resizePlacement, removePlacement]
  );

  const unmergeCells = useCallback(
    async (cellId) => {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell || (cell.rowSpan === 1 && cell.colSpan === 1)) return;

      await resizePlacement(cellId, 1, 1);
    },
    [cells, resizePlacement]
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
  };
}

export default useLayoutPanel;
