// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.logic.js
// Canvas Navigator Logic Hook
//
// Headless logic for the Canvas Navigator component.
// Supports:
// - Navigate mode: viewport panning
// - Edit mode: selection, drag-drop, merge/unmerge, delete
// - Display modes: names, numbers, colors
// - Dock positions with localStorage persistence
// - Homepoint management

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { workspace as log } from "@Utils/logger.js";

// =============================================================================
// PRESS-AND-HOLD HOOK
// =============================================================================

/**
 * Hook for press-and-hold button behavior
 * Fires action immediately, then repeatedly after delay
 *
 * @param {Function} action - Action to perform
 * @param {Object} options - { delay: ms before repeat, interval: ms between repeats }
 * @returns {{ start: Function, stop: Function }}
 */
export function usePressAndHold(action, { delay = 400, interval = 100 } = {}) {
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    action();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, interval);
    }, delay);
  }, [action, delay, interval]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop };
}

// =============================================================================
// VIEWPORT DRAG HOOK
// =============================================================================

/**
 * Hook for dragging the viewport rectangle on the minimap
 *
 * @param {Function} onMove - Callback when viewport is dragged to new position (row, col)
 * @returns {Object} - { isDragging, handleMouseDown, handleMouseMove, handleMouseUp }
 */
export function useViewportDrag(onMove) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);

  const handleMouseDown = useCallback((e, cellWidth, cellHeight, gap) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cellWidth,
      cellHeight,
      gap,
    };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !dragStartRef.current) return;

      const { startX, startY, cellWidth, cellHeight, gap } =
        dragStartRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const cellDeltaX = Math.round(deltaX / (cellWidth + gap));
      const cellDeltaY = Math.round(deltaY / (cellHeight + gap));

      if (cellDeltaX !== 0 || cellDeltaY !== 0) {
        onMove?.(cellDeltaY, cellDeltaX);
        dragStartRef.current.startX = e.clientX;
        dragStartRef.current.startY = e.clientY;
      }
    },
    [isDragging, onMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}

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

export const DOCK_POSITIONS = {
  LEFT_PANEL: "left-panel",
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  FLOAT: "float",
  MINIMIZED: "minimized",
};

// Instance colors for view color coding (matches _colors.scss)
export const INSTANCE_COLORS = [
  "#60a5fa", // blue - $color-instance-1
  "#34d399", // green - $color-instance-2
  "#7dd3fc", // teal - $color-instance-3
  "#fb7185", // pink - $color-instance-4
  "#c084fc", // purple - $color-instance-5
  "#fbbf24", // amber - $color-instance-6
];

// LocalStorage keys
const STORAGE_KEYS = {
  DOCK_POSITION: "cia-navigator-dock-position",
  FLOAT_POSITION: "cia-navigator-float-position",
  DISPLAY_MODE: "cia-navigator-display-mode",
  MINIMAP_ZOOM: "cia-navigator-zoom",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Load value from localStorage with fallback
 */
function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    log.warn(`Failed to load ${key} from localStorage:`, e);
  }
  return fallback;
}

/**
 * Save value to localStorage
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    log.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCanvasNavigator - Main logic hook for Canvas Navigator
 *
 * @param {Object} logic - Parent logic from useLayoutPanel
 */
export function useCanvasNavigator(logic) {
  const {
    // From useLayoutPanel
    canvasSize = { rows: 3, cols: 3 },
    viewport = { row: 0, col: 0 },
    viewportSize: parentViewportSize,
    cells = [],
    homepoint: parentHomepoint,
    zoom: parentZoom,
    isConnected = true,
    loading = false,
    // Actions from parent
    moveViewport: parentMoveViewport,
    navigateToCell: parentNavigateToCell,
    setViewportPosition,
    setCanvasRows: parentSetCanvasRows,
    setCanvasCols: parentSetCanvasCols,
    setViewportSizeRows: parentSetViewportSizeRows,
    setViewportSizeCols: parentSetViewportSizeCols,
    setHomepoint: parentSetHomepoint,
    // Cell operations
    removePlacement,
    mergeCells: parentMergeCells,
    unmergeCells: parentUnmergeCells,
    movePlacement,
  } = logic || {};

  // =========================================================================
  // LOCAL STATE
  // =========================================================================

  // Navigator mode
  const [mode, setMode] = useState(NAV_MODES.NAVIGATE);

  // Display mode (with persistence)
  const [displayMode, setDisplayModeState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.DISPLAY_MODE, DISPLAY_MODES.NAMES)
  );

  // Dock position (with persistence)
  const [dockPosition, setDockPositionState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.DOCK_POSITION, DOCK_POSITIONS.FLOAT)
  );

  // Float position (with persistence)
  const [floatPosition, setFloatPositionState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FLOAT_POSITION, { x: 100, y: 100 })
  );

  // Minimap zoom (with persistence)
  const [minimapZoom, setMinimapZoomState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.MINIMAP_ZOOM, 1)
  );

  // Local viewport size (fallback if parent doesn't provide)
  const [localViewportSize, setLocalViewportSize] = useState({
    rows: 2,
    cols: 3,
  });
  const viewportSize = parentViewportSize || localViewportSize;

  // Local homepoint (fallback if parent doesn't provide)
  const [localHomepoint, setLocalHomepoint] = useState(null);
  const homepoint =
    parentHomepoint !== undefined ? parentHomepoint : localHomepoint;

  // Edit mode state
  const [selectedCells, setSelectedCells] = useState([]);
  const [settingHomepoint, setSettingHomepoint] = useState(false);

  // Drag state
  const [draggedCell, setDraggedCell] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // =========================================================================
  // PERSISTENCE EFFECTS
  // =========================================================================

  // Persist display mode
  const setDisplayMode = useCallback((mode) => {
    setDisplayModeState(mode);
    saveToStorage(STORAGE_KEYS.DISPLAY_MODE, mode);
  }, []);

  // Persist dock position
  const setDockPosition = useCallback((position) => {
    setDockPositionState(position);
    saveToStorage(STORAGE_KEYS.DOCK_POSITION, position);
  }, []);

  // Persist float position
  const setFloatPosition = useCallback((position) => {
    setFloatPositionState(position);
    saveToStorage(STORAGE_KEYS.FLOAT_POSITION, position);
  }, []);

  // Persist minimap zoom
  const setMinimapZoom = useCallback((zoom) => {
    const clamped = Math.max(0.5, Math.min(2, zoom));
    setMinimapZoomState(clamped);
    saveToStorage(STORAGE_KEYS.MINIMAP_ZOOM, clamped);
  }, []);

  // =========================================================================
  // VIEWPORT SIZE CONTROLS
  // =========================================================================

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

  // =========================================================================
  // CANVAS SIZE CONTROLS
  // =========================================================================

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

  // =========================================================================
  // HOMEPOINT CONTROLS
  // =========================================================================

  const setHomepoint = useCallback(
    (row, col) => {
      setSettingHomepoint(false);
      if (parentSetHomepoint) {
        parentSetHomepoint({ row, col });
      } else {
        setLocalHomepoint({ row, col });
      }
      log.debug(`Homepoint set to (${row}, ${col})`);
    },
    [parentSetHomepoint]
  );

  const clearHomepoint = useCallback(() => {
    if (parentSetHomepoint) {
      parentSetHomepoint(null);
    } else {
      setLocalHomepoint(null);
    }
  }, [parentSetHomepoint]);

  // =========================================================================
  // VIEWPORT NAVIGATION
  // =========================================================================

  // Check if at home position
  const isAtHome = useMemo(() => {
    if (!homepoint) return false;
    return viewport.row === homepoint.row && viewport.col === homepoint.col;
  }, [viewport, homepoint]);

  // Move viewport by direction or delta
  const moveViewport = useCallback(
    (directionOrDeltaRow, deltaCol) => {
      let dRow = 0;
      let dCol = 0;

      if (typeof directionOrDeltaRow === "string") {
        switch (directionOrDeltaRow) {
          case "up":
            dRow = -1;
            break;
          case "down":
            dRow = 1;
            break;
          case "left":
            dCol = -1;
            break;
          case "right":
            dCol = 1;
            break;
          case "home":
          case "reset":
            if (homepoint) {
              parentNavigateToCell?.(homepoint.row, homepoint.col);
              setViewportPosition?.(homepoint.row, homepoint.col);
            }
            return;
          default:
            log.warn(`Unknown viewport direction: ${directionOrDeltaRow}`);
            return;
        }
      } else {
        dRow = directionOrDeltaRow || 0;
        dCol = deltaCol || 0;
      }

      if (parentMoveViewport) {
        parentMoveViewport(dRow, dCol);
      }
    },
    [parentMoveViewport, parentNavigateToCell, setViewportPosition, homepoint]
  );

  // Navigate to specific cell
  const navigateToCell = useCallback(
    (row, col) => {
      const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
      const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);
      const targetRow = Math.max(0, Math.min(maxRow, row));
      const targetCol = Math.max(0, Math.min(maxCol, col));

      if (parentNavigateToCell) {
        parentNavigateToCell(targetRow, targetCol);
      }
      setViewportPosition?.(targetRow, targetCol);
    },
    [parentNavigateToCell, setViewportPosition, canvasSize, viewportSize]
  );

  // =========================================================================
  // CELL HELPERS
  // =========================================================================

  // Get cell at position (including spanned cells)
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

  // Check if position is in viewport
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

  // Get cell color - handles multiple possible data formats
  const getCellColor = useCallback((cell) => {
    if (!cell) return null;

    // If instanceColor is a hex string, use it directly
    if (
      typeof cell.instanceColor === "string" &&
      cell.instanceColor.startsWith("#")
    ) {
      return cell.instanceColor;
    }

    // If viewColor is a hex string, use it
    if (typeof cell.viewColor === "string" && cell.viewColor.startsWith("#")) {
      return cell.viewColor;
    }

    // If instanceColor is a number, use as index
    if (typeof cell.instanceColor === "number") {
      return INSTANCE_COLORS[cell.instanceColor % INSTANCE_COLORS.length];
    }

    // If color is a number, use as index into INSTANCE_COLORS
    if (typeof cell.color === "number") {
      return INSTANCE_COLORS[cell.color % INSTANCE_COLORS.length];
    }
    if (typeof cell.colorIndex === "number") {
      return INSTANCE_COLORS[cell.colorIndex % INSTANCE_COLORS.length];
    }

    // If color is already a string (hex color), use it
    if (typeof cell.color === "string" && cell.color.startsWith("#")) {
      return cell.color;
    }

    // Fallback: use id hash to generate consistent color
    if (cell.id) {
      const hash = cell.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return INSTANCE_COLORS[hash % INSTANCE_COLORS.length];
    }

    return INSTANCE_COLORS[0]; // Default blue
  }, []);

  // Get display text for cell based on display mode
  const getCellDisplay = useCallback(
    (cell, index) => {
      if (!cell) return null;

      switch (displayMode) {
        case DISPLAY_MODES.NUMBERS:
          return index + 1;
        case DISPLAY_MODES.NAMES: {
          // Try different possible name properties
          const name =
            cell.name ||
            cell.viewName ||
            cell.title ||
            cell.label ||
            `View ${index + 1}`;
          const cellWidth = (cell.colSpan || 1) * 26; // Approximate cell width
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

  // =========================================================================
  // EDIT MODE - SELECTION
  // =========================================================================

  // Select a cell (with optional multi-select via shift)
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

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCells([]);
  }, []);

  // Select all cells
  const selectAll = useCallback(() => {
    const allKeys = [];
    for (let row = 0; row < canvasSize.rows; row++) {
      for (let col = 0; col < canvasSize.cols; col++) {
        allKeys.push(`${row}-${col}`);
      }
    }
    setSelectedCells(allKeys);
  }, [canvasSize]);

  // =========================================================================
  // EDIT MODE - MERGE/UNMERGE
  // =========================================================================

  // Check if merge is possible (need 2+ cells selected)
  const canMerge = useMemo(() => {
    return selectedCells.length >= 2;
  }, [selectedCells]);

  // Check if unmerge is possible (single merged cell selected)
  const canUnmerge = useMemo(() => {
    if (selectedCells.length !== 1) return false;
    const [row, col] = selectedCells[0].split("-").map(Number);
    const cell = getCellAt(row, col);
    return cell && ((cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1);
  }, [selectedCells, getCellAt]);

  // Handle merge - works on both empty cells and cells with views
  const handleMerge = useCallback(async () => {
    if (!canMerge) return;

    // Parse selected cells to get bounds
    const coords = selectedCells.map((k) => {
      const [row, col] = k.split("-").map(Number);
      return { row, col };
    });

    const minRow = Math.min(...coords.map((c) => c.row));
    const maxRow = Math.max(...coords.map((c) => c.row));
    const minCol = Math.min(...coords.map((c) => c.col));
    const maxCol = Math.max(...coords.map((c) => c.col));

    const mergeData = {
      row: minRow,
      col: minCol,
      rowSpan: maxRow - minRow + 1,
      colSpan: maxCol - minCol + 1,
    };

    log.debug(`Merging cells:`, mergeData);

    if (parentMergeCells) {
      await parentMergeCells(mergeData);
    }

    clearSelection();
  }, [canMerge, selectedCells, parentMergeCells, clearSelection]);

  // Handle unmerge
  const handleUnmerge = useCallback(async () => {
    if (!canUnmerge) return;

    const [row, col] = selectedCells[0].split("-").map(Number);
    const cell = getCellAt(row, col);

    if (cell && parentUnmergeCells) {
      log.debug(`Unmerging cell at (${row}, ${col})`);
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

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (selectedCells.length === 0) return;

    for (const key of selectedCells) {
      const [row, col] = key.split("-").map(Number);
      const cell = getCellAt(row, col);
      if (cell && removePlacement) {
        log.debug(`Deleting cell at (${row}, ${col})`);
        await removePlacement(cell.id);
      }
    }

    clearSelection();
  }, [selectedCells, getCellAt, removePlacement, clearSelection]);

  // =========================================================================
  // EDIT MODE - DRAG AND DROP
  // =========================================================================

  const handleDragStart = useCallback((cell, e) => {
    if (!cell) return;
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
        // Don't move to same position
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

  // =========================================================================
  // COMPUTED STATE
  // =========================================================================

  const isDisabled = loading || !isConnected;

  // =========================================================================
  // RETURN API
  // =========================================================================

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

    // Viewport size (Rows × Cols)
    setViewportSizeRows,
    setViewportSizeCols,

    // Canvas size (Rows × Cols)
    setCanvasRows,
    setCanvasCols,

    // Edit mode - selection
    selectCell,
    clearSelection,
    selectAll,

    // Edit mode - merge/unmerge/delete
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
