// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.logic.js
// Canvas Navigator logic hook
//
// This hook consumes the parent logic from useLayoutPanel and adds
// navigator-specific state (display mode, zoom, etc.)
//
// IMPORTANT: DOCK_POSITIONS is managed by LayoutPanelContext.
// This hook receives dockPosition and setDockPosition from parent logic.

import { useState, useCallback, useMemo, useEffect } from "react";
import { ui as log } from "@Utils/logger.js";

// Import DOCK_POSITIONS from context for reference
// (not for state management - that's done in LayoutPanelContext)
import { DOCK_POSITIONS } from "../../LayoutPanelContext";

// Import viewport sync for dispatching navigation events
import {
  dispatchNavigateTo,
  dispatchMoveViewport,
} from "@UI/react/hooks/useViewportSync.js";
import { EVENT_NAME as VIEWPORT_SIZE_EVENT } from "@UI/react/hooks/useViewportSize.js";

// Re-export for backward compatibility
export { DOCK_POSITIONS };

// =============================================================================
// CONSTANTS
// =============================================================================

export const DISPLAY_MODES = {
  NAMES: "names",
  NUMBERS: "numbers",
  COLORS: "colors",
};

export const NAV_MODES = {
  NAVIGATE: "navigate",
  EDIT: "edit",
};

// Instance colors - matching the ones in LayoutPanel.logic.js
export const INSTANCE_COLORS = [
  "#60a5fa", // blue
  "#34d399", // green
  "#7dd3fc", // cyan
  "#fb7185", // pink
  "#c084fc", // purple
  "#fbbf24", // amber
];

// LocalStorage keys
const STORAGE_KEYS = {
  DOCK_POSITION: "cia-navigator-dock-position",
  FLOAT_POSITION: "cia-navigator-float-position",
  DISPLAY_MODE: "cia-navigator-display-mode",
  MINIMAP_ZOOM: "cia-navigator-zoom",
};

// =============================================================================
// HELPERS
// =============================================================================

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    log.warn(`Failed to load ${key}:`, e);
  }
  return fallback;
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    log.warn(`Failed to save ${key}:`, e);
  }
}

// =============================================================================
// PRESS AND HOLD HOOK
// =============================================================================

export function usePressAndHold(callback, interval = 150) {
  const [intervalId, setIntervalId] = useState(null);

  const start = useCallback(() => {
    callback(); // Immediate call
    const id = setInterval(callback, interval);
    setIntervalId(id);
  }, [callback, interval]);

  const stop = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [intervalId]);

  return { start, stop };
}

// =============================================================================
// VIEWPORT DRAG HOOK
// =============================================================================

export function useViewportDrag(onDrag) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(null);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !startPos) return;
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      onDrag?.(dx, dy);
    },
    [isDragging, startPos, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setStartPos(null);
  }, []);

  return {
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCanvasNavigator - Main logic hook for Canvas Navigator
 *
 * @param {Object} logic - Parent logic from useLayoutPanel (via context)
 */
export function useCanvasNavigator(logic) {
  // ===========================================================================
  // EXTRACT FROM PARENT LOGIC
  // ===========================================================================

  const {
    // Canvas data
    canvasSize = { rows: 4, cols: 5 },
    viewport = { row: 0, col: 0 },
    viewportSize: parentViewportSize,
    cells = [],

    // Connection state
    isConnected = true,
    loading = false,

    // Homepoint from parent
    homepoint: parentHomepoint,
    setHomepoint: parentSetHomepoint,
    clearHomepoint: parentClearHomepoint,

    // Navigation from parent
    moveViewport: parentMoveViewport,
    navigateToCell: parentNavigateToCell,
    setViewportPosition,

    // Viewport size from parent
    setViewportSizeRows: parentSetViewportSizeRows,
    setViewportSizeCols: parentSetViewportSizeCols,

    // Canvas size from parent
    setCanvasRows: parentSetCanvasRows,
    setCanvasCols: parentSetCanvasCols,

    // Cell operations from parent
    removePlacement,
    movePlacement,
    resizePlacement,
    mergeCells: parentMergeCells,
    unmergeCells: parentUnmergeCells,
  } = logic || {};

  // ===========================================================================
  // LOCAL STATE (navigator-specific)
  // ===========================================================================

  // Navigator mode (navigate vs edit)
  const [mode, setMode] = useState(NAV_MODES.NAVIGATE);

  // Display mode (names, numbers, colors)
  const [displayMode, setDisplayModeState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODES.NAMES)
  );

  // NOTE: dockPosition is managed by LayoutPanelContext, not here
  // We receive it from parent logic

  // Float position (with persistence) - for when in FLOAT mode
  const [floatPosition, setFloatPositionState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FLOAT_POSITION, { x: 100, y: 100 })
  );

  // Minimap zoom (with persistence)
  const [minimapZoom, setMinimapZoomState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.MINIMAP_ZOOM, 1)
  );

  // Get dockPosition from parent logic (comes from LayoutPanelContext)
  const parentDockPosition = logic?.dockPosition;
  const parentSetDockPosition = logic?.setDockPosition;

  // Use parent dockPosition or default to FLOAT
  const dockPosition = parentDockPosition || DOCK_POSITIONS.FLOAT;

  // Wrapper for setDockPosition that uses parent if available
  const setDockPosition = useCallback(
    (position) => {
      if (parentSetDockPosition) {
        parentSetDockPosition(position);
      } else {
        console.warn(
          "[CanvasNavigator.logic] No parent setDockPosition available"
        );
      }
    },
    [parentSetDockPosition]
  );

  // Local viewport size fallback
  const [localViewportSize, setLocalViewportSize] = useState({
    rows: 2,
    cols: 3,
  });
  const viewportSize = parentViewportSize || localViewportSize;

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

  // Local homepoint fallback
  const [localHomepoint, setLocalHomepoint] = useState(null);
  const homepoint =
    parentHomepoint !== undefined ? parentHomepoint : localHomepoint;

  // Edit mode state
  const [selectedCells, setSelectedCells] = useState([]);
  const [settingHomepoint, setSettingHomepoint] = useState(false);

  // Drag state
  const [draggedCell, setDraggedCell] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  const setDisplayMode = useCallback((mode) => {
    setDisplayModeState(mode);
    saveToStorage(STORAGE_KEYS.DISPLAY_MODE, mode);
  }, []);

  // NOTE: setDockPosition is defined above, using parent from context

  const setFloatPosition = useCallback((position) => {
    setFloatPositionState(position);
    saveToStorage(STORAGE_KEYS.FLOAT_POSITION, position);
  }, []);

  const setMinimapZoom = useCallback((zoom) => {
    const clamped = Math.max(0.5, Math.min(2, zoom));
    setMinimapZoomState(clamped);
    saveToStorage(STORAGE_KEYS.MINIMAP_ZOOM, clamped);
  }, []);

  // ===========================================================================
  // VIEWPORT SIZE CONTROLS
  // ===========================================================================

  const setViewportSizeRows = useCallback(
    (rows) => {
      const value = Math.max(1, Math.min(10, rows));
      if (parentSetViewportSizeRows) {
        parentSetViewportSizeRows(value);
      } else {
        setLocalViewportSize((prev) => ({ ...prev, rows: value }));
      }
    },
    [parentSetViewportSizeRows]
  );

  const setViewportSizeCols = useCallback(
    (cols) => {
      const value = Math.max(1, Math.min(10, cols));
      if (parentSetViewportSizeCols) {
        parentSetViewportSizeCols(value);
      } else {
        setLocalViewportSize((prev) => ({ ...prev, cols: value }));
      }
    },
    [parentSetViewportSizeCols]
  );

  // ===========================================================================
  // CANVAS SIZE CONTROLS
  // ===========================================================================

  const setCanvasRows = useCallback(
    (rows) => {
      parentSetCanvasRows?.(Math.max(1, Math.min(50, rows)));
    },
    [parentSetCanvasRows]
  );

  const setCanvasCols = useCallback(
    (cols) => {
      parentSetCanvasCols?.(Math.max(1, Math.min(50, cols)));
    },
    [parentSetCanvasCols]
  );

  // ===========================================================================
  // HOMEPOINT
  // ===========================================================================

  const setHomepoint = useCallback(
    (row, col) => {
      if (parentSetHomepoint) {
        parentSetHomepoint(row, col);
      } else {
        setLocalHomepoint({ row, col });
      }
      setSettingHomepoint(false);
    },
    [parentSetHomepoint]
  );

  const clearHomepoint = useCallback(() => {
    if (parentClearHomepoint) {
      parentClearHomepoint();
    } else {
      setLocalHomepoint(null);
    }
  }, [parentClearHomepoint]);

  // Check if at homepoint
  const isAtHome = useMemo(
    () =>
      homepoint &&
      viewport.row === homepoint.row &&
      viewport.col === homepoint.col,
    [homepoint, viewport]
  );

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  const moveViewport = useCallback(
    (direction) => {
      if (parentMoveViewport) {
        parentMoveViewport(direction);
      }
      // Also dispatch viewport sync event so CanvasGrid follows
      switch (direction) {
        case "up":
          dispatchMoveViewport(-1, 0);
          break;
        case "down":
          dispatchMoveViewport(1, 0);
          break;
        case "left":
          dispatchMoveViewport(0, -1);
          break;
        case "right":
          dispatchMoveViewport(0, 1);
          break;
        case "home":
          dispatchNavigateTo(0, 0);
          break;
        default:
          break;
      }
    },
    [parentMoveViewport]
  );

  const navigateToCell = useCallback(
    (row, col) => {
      // Validate inputs
      const targetRow = typeof row === "number" && !isNaN(row) ? row : 0;
      const targetCol = typeof col === "number" && !isNaN(col) ? col : 0;

      if (parentNavigateToCell) {
        parentNavigateToCell(targetRow, targetCol);
      } else if (setViewportPosition) {
        setViewportPosition(targetRow, targetCol);
      }
      // Also dispatch viewport sync event so CanvasGrid follows
      dispatchNavigateTo(targetRow, targetCol);
    },
    [parentNavigateToCell, setViewportPosition]
  );

  // ===========================================================================
  // CELL HELPERS
  // ===========================================================================

  const getCellAt = useCallback(
    (row, col) => {
      return cells.find(
        (c) =>
          c &&
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
        row < viewport.row + viewportSize.rows &&
        col >= viewport.col &&
        col < viewport.col + viewportSize.cols
      );
    },
    [viewport, viewportSize]
  );

  /**
   * Get cell color - handles multiple data formats
   */
  const getCellColor = useCallback((cell) => {
    if (!cell) return null;

    // If viewColor is a hex string (from LayoutPanel.logic enrichment)
    if (typeof cell.viewColor === "string" && cell.viewColor.startsWith("#")) {
      return cell.viewColor;
    }

    // If instanceColor is a hex string
    if (
      typeof cell.instanceColor === "string" &&
      cell.instanceColor.startsWith("#")
    ) {
      return cell.instanceColor;
    }

    // If instanceColor is a number, use as index
    if (typeof cell.instanceColor === "number") {
      return INSTANCE_COLORS[cell.instanceColor % INSTANCE_COLORS.length];
    }

    // If color is a number, use as index
    if (typeof cell.color === "number") {
      return INSTANCE_COLORS[cell.color % INSTANCE_COLORS.length];
    }

    // If color is already a hex string
    if (typeof cell.color === "string" && cell.color.startsWith("#")) {
      return cell.color;
    }

    // Fallback: hash the id
    if (cell.id) {
      const hash = cell.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return INSTANCE_COLORS[hash % INSTANCE_COLORS.length];
    }

    return INSTANCE_COLORS[0];
  }, []);

  /**
   * Get display text for cell
   */
  const getCellDisplay = useCallback(
    (cell, index) => {
      if (!cell) return null;

      switch (displayMode) {
        case DISPLAY_MODES.NUMBERS:
          return index + 1;
        case DISPLAY_MODES.NAMES: {
          const name =
            cell.name || cell.viewName || cell.title || `View ${index + 1}`;
          const cellWidth = (cell.colSpan || 1) * 26;
          const maxLen = Math.max(3, Math.floor(cellWidth / 7));
          return name.length <= maxLen
            ? name
            : name.substring(0, maxLen - 1) + "…";
        }
        case DISPLAY_MODES.COLORS:
          return null;
        default:
          return null;
      }
    },
    [displayMode]
  );

  // ===========================================================================
  // EDIT MODE - SELECTION
  // ===========================================================================

  const selectCell = useCallback((row, col, isMultiSelect = false) => {
    const key = `${row}-${col}`;
    if (isMultiSelect) {
      setSelectedCells((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    } else {
      setSelectedCells([key]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCells([]);
  }, []);

  const selectAll = useCallback(() => {
    const allKeys = cells.map((c) => `${c.row}-${c.col}`);
    setSelectedCells(allKeys);
  }, [cells]);

  // ===========================================================================
  // EDIT MODE - MERGE/UNMERGE/DELETE
  // ===========================================================================

  const canMerge = useMemo(() => {
    if (selectedCells.length < 2) return false;
    // Check if cells form a rectangle
    const selected = selectedCells.map((key) => {
      const [row, col] = key.split("-").map(Number);
      return { row, col };
    });
    const minRow = Math.min(...selected.map((s) => s.row));
    const maxRow = Math.max(...selected.map((s) => s.row));
    const minCol = Math.min(...selected.map((s) => s.col));
    const maxCol = Math.max(...selected.map((s) => s.col));
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return selectedCells.length === expectedCount;
  }, [selectedCells]);

  const canUnmerge = useMemo(() => {
    if (selectedCells.length !== 1) return false;
    const [row, col] = selectedCells[0].split("-").map(Number);
    const cell = getCellAt(row, col);
    return cell && ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1);
  }, [selectedCells, getCellAt]);

  const handleMerge = useCallback(async () => {
    if (!canMerge) return;
    const cellIds = selectedCells
      .map((key) => {
        const [row, col] = key.split("-").map(Number);
        return getCellAt(row, col)?.id;
      })
      .filter(Boolean);

    if (parentMergeCells) {
      await parentMergeCells(cellIds);
    }
    clearSelection();
  }, [canMerge, selectedCells, getCellAt, parentMergeCells, clearSelection]);

  const handleUnmerge = useCallback(async () => {
    if (!canUnmerge) return;
    const [row, col] = selectedCells[0].split("-").map(Number);
    const cell = getCellAt(row, col);

    if (cell && parentUnmergeCells) {
      await parentUnmergeCells(cell.id);
    }
    clearSelection();
  }, [
    canUnmerge,
    selectedCells,
    getCellAt,
    parentUnmergeCells,
    clearSelection,
  ]);

  const handleDelete = useCallback(async () => {
    if (selectedCells.length === 0) return;

    for (const key of selectedCells) {
      const [row, col] = key.split("-").map(Number);
      const cell = getCellAt(row, col);
      if (cell && removePlacement) {
        await removePlacement(cell.id);
      }
    }
    clearSelection();
  }, [selectedCells, getCellAt, removePlacement, clearSelection]);

  // ===========================================================================
  // DRAG AND DROP
  // ===========================================================================

  const handleDragStart = useCallback((cell, e) => {
    setDraggedCell(cell);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cell.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCell(null);
    setDragOverCell(null);
  }, []);

  const handleDragOver = useCallback((row, col, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell({ row, col });
  }, []);

  const handleDrop = useCallback(
    async (row, col, e) => {
      e.preventDefault();

      if (draggedCell && movePlacement) {
        if (draggedCell.row === row && draggedCell.col === col) {
          handleDragEnd();
          return;
        }

        log.debug(
          `Moving cell from (${draggedCell.row}, ${draggedCell.col}) to (${row}, ${col})`
        );
        await movePlacement(draggedCell.id, row, col);
      }

      handleDragEnd();
    },
    [draggedCell, movePlacement, handleDragEnd]
  );

  // ===========================================================================
  // COMPUTED STATE
  // ===========================================================================

  const isDisabled = loading || !isConnected;

  // ===========================================================================
  // RETURN API
  // ===========================================================================

  return {
    // State
    canvasSize,
    viewport,
    viewportSize,
    cells,
    homepoint,
    minimapZoom,
    dockPosition,
    floatPosition,
    mode,
    displayMode,
    selectedCells,
    settingHomepoint,
    isAtHome,
    isDisabled,
    loading,
    isConnected,

    // Mode setters
    setMode,
    setDisplayMode,
    setSettingHomepoint,
    setDockPosition,
    setFloatPosition,
    setMinimapZoom,

    // Navigation
    moveViewport,
    navigateToCell,

    // Homepoint
    setHomepoint,
    clearHomepoint,

    // Viewport size
    setViewportSizeRows,
    setViewportSizeCols,

    // Canvas size
    setCanvasRows,
    setCanvasCols,

    // Edit mode - selection
    selectCell,
    clearSelection,
    selectAll,

    // Edit mode - operations
    handleMerge,
    handleUnmerge,
    handleDelete,
    canMerge,
    canUnmerge,

    // Cell helpers
    getCellAt,
    isInViewport,
    getCellDisplay,
    getCellColor,

    // Drag and drop
    draggedCell,
    dragOverCell,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  };
}

export default useCanvasNavigator;
