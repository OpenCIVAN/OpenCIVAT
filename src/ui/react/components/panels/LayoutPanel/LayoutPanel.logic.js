/**
 * LayoutPanel Logic Hook
 *
 * Headless logic for the Layout Panel component.
 * NOW WIRED TO REAL DATA via useCanvas hook.
 *
 * OPTION C IMPLEMENTATION:
 * - Accepts optional canvasId to target specific canvas
 * - Uses useCanvas() internally for real data
 * - UI-specific state (tools, filters, etc.) remains local
 * - Supports __testing prop for unit tests
 *
 * State sources:
 * - FROM useCanvas: canvas dimensions, placements, viewport, operations
 * - LOCAL: panel subtab, navigator docked, tools, filters, zoom, homepoint
 */

import { useState, useCallback, useMemo } from "react";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";

// =============================================================================
// CONSTANTS
// =============================================================================

export const LAYOUT_MODES = {
  GRID: "grid",
  FLOW: "flow",
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
  ADD: "add",
  REPLACE: "replace",
};

export const VIEW_MODES = {
  NORMAL: "normal",
  ISOLATION: "isolation",
  SUBSET: "subset",
};

export const SPAWN_SIZES = ["1x1", "2x1", "1x2", "2x2"];

/**
 * Parse spawn size string to object
 * @param {string|object} size - Size string like "2x1" or object {cols, rows}
 * @returns {{cols: number, rows: number}}
 */
export function parseSpawnSize(size) {
  if (typeof size === "object") return size;
  const [cols, rows] = size.split("x").map(Number);
  return { cols, rows };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main logic hook for LayoutPanel
 *
 * @param {Object} options
 * @param {string} [options.canvasId] - Target canvas ID (uses active canvas if not provided)
 * @param {Object} [options.__testing] - Mock data for unit tests (bypasses useCanvas)
 */
export function useLayoutPanel({ canvasId, __testing } = {}) {
  // ===========================================================================
  // DATA SOURCE: useCanvas or __testing mock
  // ===========================================================================

  const realCanvasData = useCanvas(canvasId);

  // Allow tests to inject mock data
  const {
    canvas,
    viewport: canvasViewport,
    loading,
    error,
    isConnected,
    // Operations from useCanvas
    moveViewport: canvasMoveViewport,
    setViewportPosition,
    addRow: canvasAddRow,
    addColumn: canvasAddColumn,
    removePlacement,
    resizePlacement,
    setLayoutMode: canvasSetLayoutMode,
    setFlowDirection: canvasSetFlowDirection,
  } = __testing || realCanvasData;

  // ===========================================================================
  // DERIVED STATE FROM CANVAS
  // ===========================================================================

  // Canvas dimensions (with fallback for loading state)
  const canvasSize = useMemo(
    () => canvas?.dimensions || { rows: 4, cols: 5 },
    [canvas]
  );

  // Placements are our "cells"
  const cells = useMemo(() => canvas?.placements || [], [canvas]);

  // Layout mode from canvas (server-authoritative)
  const serverLayoutMode = canvas?.layoutMode || LAYOUT_MODES.GRID;
  const serverFlowDirection = canvas?.flowDirection || FLOW_DIRECTIONS.ROW;

  // ===========================================================================
  // LOCAL UI STATE (not persisted to server)
  // ===========================================================================

  // Panel subtab: 'canvas' or 'views'
  const [panelSubtab, setPanelSubtab] = useState("canvas");

  // Navigator docked state
  const [navigatorDocked, setNavigatorDocked] = useState(true);

  // Homepoint (local - could be persisted later)
  const [homepoint, setHomepoint] = useState({ row: 0, col: 0 });

  // Zoom level (view-only, affects minimap cell size)
  const [zoom, setZoom] = useState(1);

  // Tool selection
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [editMode, setEditMode] = useState(false);
  const [dropMode, setDropMode] = useState(DROP_MODES.ADD);
  const [viewMode, setViewMode] = useState(VIEW_MODES.NORMAL);

  // Spawn size for new views
  const [spawnSize, setSpawnSize] = useState("1x1");

  // Views subtab state
  const [expandedViewId, setExpandedViewId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [groupByDataset, setGroupByDataset] = useState(false);

  // Undo/redo (placeholder - future enhancement)
  const [canUndo] = useState(false);
  const [canRedo] = useState(false);

  // ===========================================================================
  // VIEWPORT STATE
  // Local viewport that syncs with canvas viewport
  // ===========================================================================

  const viewport = canvasViewport || { row: 0, col: 0, rows: 2, cols: 3 };

  // ===========================================================================
  // NAVIGATOR CONTROLS
  // ===========================================================================

  const toggleNavigatorDocked = useCallback(() => {
    setNavigatorDocked((prev) => !prev);
  }, []);

  const dockNavigator = useCallback(() => {
    setNavigatorDocked(true);
  }, []);

  const undockNavigator = useCallback(() => {
    setNavigatorDocked(false);
  }, []);

  // ===========================================================================
  // CANVAS SIZE PROTECTION
  // ===========================================================================

  /**
   * Check if canvas size can be reduced without cutting off views
   * @param {'cols'|'rows'} dimension
   * @param {number} [targetValue]
   * @returns {boolean}
   */
  const checkCanReduceSize = useCallback(
    (dimension, targetValue) => {
      const maxOccupied = cells.reduce((max, cell) => {
        if (dimension === "cols") {
          return Math.max(max, cell.col + (cell.colSpan || 1));
        }
        return Math.max(max, cell.row + (cell.rowSpan || 1));
      }, 0);

      const target =
        targetValue !== undefined
          ? targetValue
          : dimension === "cols"
          ? canvasSize.cols - 1
          : canvasSize.rows - 1;

      if (target < maxOccupied) {
        console.warn(
          `Cannot reduce ${dimension}: cells occupy up to ${maxOccupied}`
        );
        return false;
      }
      return true;
    },
    [cells, canvasSize]
  );

  // ===========================================================================
  // CANVAS SIZE CONTROLS (Server-authoritative)
  // ===========================================================================

  const incrementCols = useCallback(async () => {
    if (!canvas) return;
    await canvasManager.updateCanvas(canvas.id, {
      dimensions: { ...canvas.dimensions, cols: canvas.dimensions.cols + 1 },
    });
  }, [canvas]);

  const decrementCols = useCallback(async () => {
    if (!canvas) return;
    if (!checkCanReduceSize("cols")) return;
    await canvasManager.updateCanvas(canvas.id, {
      dimensions: {
        ...canvas.dimensions,
        cols: Math.max(1, canvas.dimensions.cols - 1),
      },
    });
  }, [canvas, checkCanReduceSize]);

  const incrementRows = useCallback(async () => {
    if (!canvas) return;
    await canvasManager.updateCanvas(canvas.id, {
      dimensions: { ...canvas.dimensions, rows: canvas.dimensions.rows + 1 },
    });
  }, [canvas]);

  const decrementRows = useCallback(async () => {
    if (!canvas) return;
    if (!checkCanReduceSize("rows")) return;
    await canvasManager.updateCanvas(canvas.id, {
      dimensions: {
        ...canvas.dimensions,
        rows: Math.max(1, canvas.dimensions.rows - 1),
      },
    });
  }, [canvas, checkCanReduceSize]);

  const setCanvasCols = useCallback(
    async (cols) => {
      if (!canvas) return;
      const value = Math.max(1, cols);
      if (value < canvasSize.cols && !checkCanReduceSize("cols", value)) {
        return;
      }
      await canvasManager.updateCanvas(canvas.id, {
        dimensions: { ...canvas.dimensions, cols: value },
      });
    },
    [canvas, canvasSize.cols, checkCanReduceSize]
  );

  const setCanvasRows = useCallback(
    async (rows) => {
      if (!canvas) return;
      const value = Math.max(1, rows);
      if (value < canvasSize.rows && !checkCanReduceSize("rows", value)) {
        return;
      }
      await canvasManager.updateCanvas(canvas.id, {
        dimensions: { ...canvas.dimensions, rows: value },
      });
    },
    [canvas, canvasSize.rows, checkCanReduceSize]
  );

  // ===========================================================================
  // VIEWPORT NAVIGATION
  // ===========================================================================

  const moveViewport = useCallback(
    (direction) => {
      switch (direction) {
        case "up":
          canvasMoveViewport(-1, 0);
          break;
        case "down":
          canvasMoveViewport(1, 0);
          break;
        case "left":
          canvasMoveViewport(0, -1);
          break;
        case "right":
          canvasMoveViewport(0, 1);
          break;
        case "reset":
          setViewportPosition(homepoint.row, homepoint.col);
          break;
        default:
          break;
      }
    },
    [canvasMoveViewport, setViewportPosition, homepoint]
  );

  const navigateToCell = useCallback(
    (row, col) => {
      // Clamp to valid viewport position
      const maxRow = Math.max(0, canvasSize.rows - viewport.rows);
      const maxCol = Math.max(0, canvasSize.cols - viewport.cols);
      setViewportPosition(Math.min(row, maxRow), Math.min(col, maxCol));
    },
    [canvasSize, viewport, setViewportPosition]
  );

  const isAtHome = useMemo(() => {
    return viewport.row === homepoint.row && viewport.col === homepoint.col;
  }, [viewport, homepoint]);

  // ===========================================================================
  // ZOOM CONTROLS
  // ===========================================================================

  const setZoomLevel = useCallback((level) => {
    setZoom(Math.max(0.5, Math.min(2, level)));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel(zoom + 0.25);
  }, [zoom, setZoomLevel]);

  const zoomOut = useCallback(() => {
    setZoomLevel(zoom - 0.25);
  }, [zoom, setZoomLevel]);

  // ===========================================================================
  // CELL HELPERS
  // ===========================================================================

  const getCellAt = useCallback(
    (row, col) => {
      return cells.find(
        (c) =>
          row >= c.row &&
          row < c.row + (c.rowSpan || 1) &&
          col >= c.col &&
          col < c.col + (c.colSpan || 1)
      );
    },
    [cells]
  );

  const isInViewport = useCallback(
    (row, col) => {
      return (
        row >= viewport.row &&
        row < viewport.row + viewport.rows &&
        col >= viewport.col &&
        col < viewport.col + viewport.cols
      );
    },
    [viewport]
  );

  // ===========================================================================
  // CELL MANAGEMENT (Server-authoritative)
  // ===========================================================================

  const closeView = useCallback(
    async (viewId) => {
      await removePlacement(viewId);
      if (expandedViewId === viewId) {
        setExpandedViewId(null);
      }
    },
    [removePlacement, expandedViewId]
  );

  const resizeView = useCallback(
    async (viewId, colSpan, rowSpan) => {
      await resizePlacement(viewId, rowSpan, colSpan);
    },
    [resizePlacement]
  );

  // ===========================================================================
  // LAYOUT MODE (Server-authoritative)
  // ===========================================================================

  const setLayoutMode = useCallback(
    async (mode) => {
      await canvasSetLayoutMode(mode);
    },
    [canvasSetLayoutMode]
  );

  const setFlowDirection = useCallback(
    async (direction) => {
      await canvasSetFlowDirection(direction);
    },
    [canvasSetFlowDirection]
  );

  // ===========================================================================
  // TOOLS STATE
  // ===========================================================================

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  // ===========================================================================
  // VIEWS FILTERING
  // ===========================================================================

  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  // Filter cells based on search and active filters
  const filteredCells = useMemo(() => {
    let result = cells;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cell) =>
          cell.title?.toLowerCase().includes(query) ||
          cell.datasetName?.toLowerCase().includes(query)
      );
    }

    // Apply active filters
    if (activeFilters.includes("shared")) {
      result = result.filter((cell) => cell.isShared);
    }
    if (activeFilters.includes("linked")) {
      result = result.filter((cell) => cell.isLinked);
    }

    return result;
  }, [cells, searchQuery, activeFilters]);

  // Group cells by dataset
  const groupedCells = useMemo(() => {
    if (!groupByDataset) return null;

    const groups = {};
    filteredCells.forEach((cell) => {
      const datasetId = cell.datasetId || "unknown";
      if (!groups[datasetId]) {
        groups[datasetId] = {
          datasetId,
          datasetName: cell.datasetName || "Unknown Dataset",
          cells: [],
        };
      }
      groups[datasetId].cells.push(cell);
    });

    return Object.values(groups);
  }, [filteredCells, groupByDataset]);

  // ===========================================================================
  // VIEW EXPANSION
  // ===========================================================================

  const toggleViewExpanded = useCallback((viewId) => {
    setExpandedViewId((prev) => (prev === viewId ? null : viewId));
  }, []);

  const collapseAllViews = useCallback(() => {
    setExpandedViewId(null);
  }, []);

  // ===========================================================================
  // UNDO/REDO (Placeholder)
  // ===========================================================================

  const undo = useCallback(() => {
    console.log("Undo not yet implemented");
  }, []);

  const redo = useCallback(() => {
    console.log("Redo not yet implemented");
  }, []);

  // ===========================================================================
  // RETURN API
  // ===========================================================================

  return {
    // Loading/error state
    loading,
    error,
    isConnected,

    // Panel state
    panelSubtab,
    setPanelSubtab,

    // Navigator state
    navigatorDocked,
    toggleNavigatorDocked,
    dockNavigator,
    undockNavigator,

    // Canvas state (from server)
    canvas,
    canvasSize,
    viewport,
    cells,
    homepoint,
    zoom,
    isAtHome,

    // Canvas size controls
    setCanvasCols,
    setCanvasRows,
    incrementCols,
    decrementCols,
    incrementRows,
    decrementRows,
    checkCanReduceSize,

    // Viewport navigation
    moveViewport,
    navigateToCell,
    setHomepoint,

    // Zoom
    setZoom: setZoomLevel,
    zoomIn,
    zoomOut,

    // Cell helpers
    getCellAt,
    isInViewport,

    // Cell management (server-authoritative)
    closeView,
    resizeView,

    // Layout mode (server-authoritative)
    layoutMode: serverLayoutMode,
    setLayoutMode,
    flowDirection: serverFlowDirection,
    setFlowDirection,

    // Spawn size (local)
    spawnSize,
    setSpawnSize,

    // Tools state (local)
    tool,
    setTool,
    editMode,
    setEditMode,
    toggleEditMode,
    exitEditMode,
    dropMode,
    setDropMode,
    viewMode,
    setViewMode,

    // Undo/redo
    canUndo,
    canRedo,
    undo,
    redo,

    // Views state
    expandedViewId,
    toggleViewExpanded,
    collapseAllViews,
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    clearFilters,
    groupByDataset,
    setGroupByDataset,
    filteredCells,
    groupedCells,
  };
}

export default useLayoutPanel;
