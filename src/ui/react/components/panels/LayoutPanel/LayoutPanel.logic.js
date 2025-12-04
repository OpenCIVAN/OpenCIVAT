/**
 * LayoutPanel Logic Hook
 *
 * Headless logic for the Layout Panel component.
 * Manages canvas state, view management, navigation, and tool state.
 *
 * State managed:
 * - Panel subtab (canvas/views)
 * - Navigator docked/floating state
 * - Canvas size and viewport
 * - Layout mode and flow direction
 * - Tool selection and edit mode
 * - View filtering and grouping
 * - Spawn size settings
 */

import { useState, useCallback, useMemo, useRef } from "react";

// Layout modes
export const LAYOUT_MODES = {
  GRID: "grid",
  FLOW: "flow",
};

// Flow directions
export const FLOW_DIRECTIONS = {
  ROW: "row",
  COLUMN: "column",
};

// Tool types
export const TOOLS = {
  SELECT: "select",
  PAN: "pan",
  MERGE: "merge",
};

// Drop modes
export const DROP_MODES = {
  ADD: "add",
  REPLACE: "replace",
};

// View modes
export const VIEW_MODES = {
  NORMAL: "normal",
  ISOLATION: "isolation",
  SUBSET: "subset",
};

// Default spawn sizes
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

/**
 * Main logic hook for LayoutPanel
 */
export function useLayoutPanel({
  initialCells = [],
  initialCanvasSize = { rows: 4, cols: 5 },
  initialViewport = { row: 0, col: 0, rows: 2, cols: 3 },
  onCellsChange,
  onCanvasSizeChange,
  onViewportChange,
}) {
  // ==========================================================================
  // Panel State
  // ==========================================================================

  // Active subtab: 'canvas' or 'views'
  const [panelSubtab, setPanelSubtab] = useState("canvas");

  // Navigator docked state
  const [navigatorDocked, setNavigatorDocked] = useState(true);

  // ==========================================================================
  // Canvas State
  // ==========================================================================

  const [canvasSize, setCanvasSize] = useState(initialCanvasSize);
  const [viewport, setViewport] = useState(initialViewport);
  const [cells, setCells] = useState(initialCells);

  // Layout mode and flow direction
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.GRID);
  const [flowDirection, setFlowDirection] = useState(FLOW_DIRECTIONS.ROW);

  // Spawn size for new views
  const [spawnSize, setSpawnSize] = useState("1x1");

  // Homepoint position
  const [homepoint, setHomepoint] = useState({ row: 0, col: 0 });

  // Zoom level
  const [zoom, setZoom] = useState(1);

  // ==========================================================================
  // Tools State
  // ==========================================================================

  const [tool, setTool] = useState(TOOLS.SELECT);
  const [editMode, setEditMode] = useState(false);
  const [dropMode, setDropMode] = useState(DROP_MODES.ADD);
  const [viewMode, setViewMode] = useState(VIEW_MODES.NORMAL);

  // Undo/redo history (placeholder - can be enhanced)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ==========================================================================
  // Views State (Views subtab)
  // ==========================================================================

  const [expandedViewId, setExpandedViewId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [groupByDataset, setGroupByDataset] = useState(false);

  // ==========================================================================
  // Canvas Size Protection
  // ==========================================================================

  /**
   * Check if canvas size can be reduced without cutting off views
   * @param {'cols'|'rows'} dimension - Which dimension to check
   * @param {number} [targetValue] - Target value (defaults to current - 1)
   * @returns {boolean} - Whether reduction is allowed
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

  // ==========================================================================
  // Canvas Size Controls
  // ==========================================================================

  const updateCanvasSize = useCallback(
    (updater) => {
      setCanvasSize((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        onCanvasSizeChange?.(next);
        return next;
      });
    },
    [onCanvasSizeChange]
  );

  const incrementCols = useCallback(() => {
    updateCanvasSize((prev) => ({ ...prev, cols: prev.cols + 1 }));
  }, [updateCanvasSize]);

  const decrementCols = useCallback(() => {
    if (checkCanReduceSize("cols")) {
      updateCanvasSize((prev) => ({
        ...prev,
        cols: Math.max(1, prev.cols - 1),
      }));
    }
  }, [checkCanReduceSize, updateCanvasSize]);

  const incrementRows = useCallback(() => {
    updateCanvasSize((prev) => ({ ...prev, rows: prev.rows + 1 }));
  }, [updateCanvasSize]);

  const decrementRows = useCallback(() => {
    if (checkCanReduceSize("rows")) {
      updateCanvasSize((prev) => ({
        ...prev,
        rows: Math.max(1, prev.rows - 1),
      }));
    }
  }, [checkCanReduceSize, updateCanvasSize]);

  const setCanvasCols = useCallback(
    (cols) => {
      const value = Math.max(1, cols);
      if (value < canvasSize.cols && !checkCanReduceSize("cols", value)) {
        return;
      }
      updateCanvasSize((prev) => ({ ...prev, cols: value }));
    },
    [canvasSize.cols, checkCanReduceSize, updateCanvasSize]
  );

  const setCanvasRows = useCallback(
    (rows) => {
      const value = Math.max(1, rows);
      if (value < canvasSize.rows && !checkCanReduceSize("rows", value)) {
        return;
      }
      updateCanvasSize((prev) => ({ ...prev, rows: value }));
    },
    [canvasSize.rows, checkCanReduceSize, updateCanvasSize]
  );

  // ==========================================================================
  // Viewport Navigation
  // ==========================================================================

  const updateViewport = useCallback(
    (updater) => {
      setViewport((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        onViewportChange?.(next);
        return next;
      });
    },
    [onViewportChange]
  );

  const moveViewport = useCallback(
    (direction) => {
      updateViewport((prev) => {
        switch (direction) {
          case "up":
            return { ...prev, row: Math.max(0, prev.row - 1) };
          case "down":
            return {
              ...prev,
              row: Math.min(canvasSize.rows - prev.rows, prev.row + 1),
            };
          case "left":
            return { ...prev, col: Math.max(0, prev.col - 1) };
          case "right":
            return {
              ...prev,
              col: Math.min(canvasSize.cols - prev.cols, prev.col + 1),
            };
          case "reset":
            return { ...prev, row: homepoint.row, col: homepoint.col };
          default:
            return prev;
        }
      });
    },
    [canvasSize, homepoint, updateViewport]
  );

  const navigateToCell = useCallback(
    (row, col) => {
      updateViewport((prev) => ({
        ...prev,
        row: Math.min(row, Math.max(0, canvasSize.rows - prev.rows)),
        col: Math.min(col, Math.max(0, canvasSize.cols - prev.cols)),
      }));
    },
    [canvasSize, updateViewport]
  );

  const isAtHome = useMemo(() => {
    return viewport.row === homepoint.row && viewport.col === homepoint.col;
  }, [viewport, homepoint]);

  // ==========================================================================
  // Zoom Controls
  // ==========================================================================

  const setZoomLevel = useCallback((level) => {
    setZoom(Math.max(0.5, Math.min(2, level)));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel(zoom + 0.25);
  }, [zoom, setZoomLevel]);

  const zoomOut = useCallback(() => {
    setZoomLevel(zoom - 0.25);
  }, [zoom, setZoomLevel]);

  // ==========================================================================
  // Cell Helpers
  // ==========================================================================

  /**
   * Get cell at a specific position
   */
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

  /**
   * Check if position is within viewport
   */
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

  // ==========================================================================
  // Cell Management
  // ==========================================================================

  const updateCells = useCallback(
    (updater) => {
      setCells((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        onCellsChange?.(next);
        return next;
      });
    },
    [onCellsChange]
  );

  const closeView = useCallback(
    (viewId) => {
      updateCells((prev) => prev.filter((c) => c.id !== viewId));
      if (expandedViewId === viewId) {
        setExpandedViewId(null);
      }
    },
    [expandedViewId, updateCells]
  );

  const resizeView = useCallback(
    (viewId, colSpan, rowSpan) => {
      updateCells((prev) =>
        prev.map((c) => (c.id === viewId ? { ...c, colSpan, rowSpan } : c))
      );
    },
    [updateCells]
  );

  // ==========================================================================
  // Views Filtering
  // ==========================================================================

  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
    setSearchQuery("");
  }, []);

  /**
   * Filter and optionally group cells for the Views subtab
   */
  const filteredCells = useMemo(() => {
    let result = cells;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.dataset?.toLowerCase().includes(query)
      );
    }

    // Apply status filters
    if (activeFilters.includes("shared")) {
      result = result.filter((c) => c.isShared);
    }
    if (activeFilters.includes("linked")) {
      result = result.filter((c) => c.isLinked);
    }

    return result;
  }, [cells, searchQuery, activeFilters]);

  /**
   * Group filtered cells by dataset
   */
  const groupedCells = useMemo(() => {
    if (!groupByDataset) {
      return { ungrouped: filteredCells };
    }
    return filteredCells.reduce((acc, cell) => {
      const key = cell.dataset || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(cell);
      return acc;
    }, {});
  }, [filteredCells, groupByDataset]);

  // ==========================================================================
  // Edit Mode and Tools
  // ==========================================================================

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  // ==========================================================================
  // Undo/Redo (Placeholder)
  // ==========================================================================

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    // TODO: Implement undo
    console.log("Undo");
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    // TODO: Implement redo
    console.log("Redo");
  }, [canRedo]);

  // ==========================================================================
  // Navigator Docking
  // ==========================================================================

  const toggleNavigatorDocked = useCallback(() => {
    setNavigatorDocked((prev) => !prev);
  }, []);

  const dockNavigator = useCallback(() => {
    setNavigatorDocked(true);
  }, []);

  const undockNavigator = useCallback(() => {
    setNavigatorDocked(false);
  }, []);

  // ==========================================================================
  // View Item Expansion
  // ==========================================================================

  const toggleViewExpanded = useCallback((viewId) => {
    setExpandedViewId((prev) => (prev === viewId ? null : viewId));
  }, []);

  const collapseAllViews = useCallback(() => {
    setExpandedViewId(null);
  }, []);

  // ==========================================================================
  // Return API
  // ==========================================================================

  return {
    // Panel state
    panelSubtab,
    setPanelSubtab,

    // Navigator state
    navigatorDocked,
    toggleNavigatorDocked,
    dockNavigator,
    undockNavigator,

    // Canvas state
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
    zoom,
    setZoom: setZoomLevel,
    zoomIn,
    zoomOut,

    // Cell helpers
    getCellAt,
    isInViewport,

    // Cell management
    updateCells,
    closeView,
    resizeView,

    // Layout mode
    layoutMode,
    setLayoutMode,
    flowDirection,
    setFlowDirection,

    // Spawn size
    spawnSize,
    setSpawnSize,

    // Tools state
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
