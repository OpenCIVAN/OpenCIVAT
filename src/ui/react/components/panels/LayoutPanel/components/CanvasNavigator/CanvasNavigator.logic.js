/**
 * CanvasNavigator Logic Hook
 *
 * Provides press-and-hold behavior for increment/decrement buttons
 * and other navigator-specific logic.
 *
 * UPDATED: Now works with async canvas operations from parent logic.
 * The parent (useLayoutPanel) provides server-authoritative operations,
 * this hook wraps them with press-and-hold behavior and local utilities.
 */

import { useRef, useCallback, useState } from "react";

/**
 * Hook for press-and-hold button behavior
 * Starts action immediately, then repeats at interval
 *
 * UPDATED: Handles async actions properly
 */
export function usePressAndHold(action, interval = 150) {
  const intervalRef = useRef(null);
  const isHoldingRef = useRef(false);

  const startHold = useCallback(() => {
    // Execute immediately
    action();
    isHoldingRef.current = true;

    // Then start interval
    intervalRef.current = setInterval(() => {
      if (isHoldingRef.current) {
        action();
      }
    }, interval);
  }, [action, interval]);

  const stopHold = useCallback(() => {
    isHoldingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    onMouseDown: startHold,
    onMouseUp: stopHold,
    onMouseLeave: stopHold,
    // Also support touch events
    onTouchStart: startHold,
    onTouchEnd: stopHold,
  };
}

/**
 * Hook for viewport rectangle dragging on minimap
 */
export function useViewportDrag(onDrag) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);

  const handleDragStart = useCallback((e, startRow, startCol) => {
    setIsDragging(true);
    dragStartRef.current = {
      startRow,
      startCol,
      startX: e.clientX,
      startY: e.clientY,
    };
  }, []);

  const handleDragMove = useCallback(
    (e, cellWidth, cellHeight) => {
      if (!isDragging || !dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;

      const deltaRows = Math.round(dy / cellHeight);
      const deltaCols = Math.round(dx / cellWidth);

      if (deltaRows !== 0 || deltaCols !== 0) {
        const newRow = dragStartRef.current.startRow + deltaRows;
        const newCol = dragStartRef.current.startCol + deltaCols;
        onDrag?.(newRow, newCol);
      }
    },
    [isDragging, onDrag]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  return {
    isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}

/**
 * Hook for CanvasNavigator component
 * Wraps parent logic with navigator-specific utilities
 *
 * @param {Object} logic - Logic object from useLayoutPanel
 */
export function useCanvasNavigator(logic) {
  const {
    // State from parent
    canvasSize,
    viewport,
    cells,
    zoom,
    homepoint,
    isAtHome,
    navigatorDocked,
    loading,
    error,
    isConnected,

    // Canvas size operations (async, server-authoritative)
    incrementCols,
    decrementCols,
    incrementRows,
    decrementRows,
    setCanvasCols,
    setCanvasRows,
    checkCanReduceSize,

    // Viewport navigation
    moveViewport,
    navigateToCell,
    setHomepoint,
    setZoom,
    zoomIn,
    zoomOut,

    // Tools
    tool,
    setTool,
    editMode,
    setEditMode,
    toggleEditMode,
    dropMode,
    setDropMode,

    // Navigator docking
    toggleNavigatorDocked,

    // Undo/redo
    canUndo,
    canRedo,
    undo,
    redo,
  } = logic;

  // ===========================================================================
  // PRESS-AND-HOLD HANDLERS FOR SIZE CONTROLS
  // ===========================================================================

  const incrementColsHold = usePressAndHold(incrementCols);

  const decrementColsHold = usePressAndHold(() => {
    if (checkCanReduceSize("cols")) {
      decrementCols();
    }
  });

  const incrementRowsHold = usePressAndHold(incrementRows);

  const decrementRowsHold = usePressAndHold(() => {
    if (checkCanReduceSize("rows")) {
      decrementRows();
    }
  });

  // ===========================================================================
  // CELL HELPERS
  // ===========================================================================

  /**
   * Get cell at a specific grid position
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
   * Check if position is within current viewport
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

  /**
   * Get color for a cell (based on its view configuration color)
   */
  const getCellColor = useCallback(
    (row, col) => {
      const cell = getCellAt(row, col);
      if (!cell) return null;
      // Return the instance color or a default
      return cell.instanceColor || cell.color || "#60a5fa";
    },
    [getCellAt]
  );

  // ===========================================================================
  // MINIMAP INTERACTIONS
  // ===========================================================================

  /**
   * Handle click on minimap cell - navigate viewport to that area
   */
  const handleMinimapClick = useCallback(
    (row, col) => {
      navigateToCell(row, col);
    },
    [navigateToCell]
  );

  /**
   * Viewport drag functionality for minimap
   */
  const viewportDrag = useViewportDrag((newRow, newCol) => {
    navigateToCell(newRow, newCol);
  });

  // ===========================================================================
  // MINIMAP CALCULATIONS
  // ===========================================================================

  // Fixed cell sizes for minimap
  const MINIMAP_CELL_WIDTH = 28;
  const MINIMAP_CELL_HEIGHT = 20;
  const MINIMAP_GAP = 2;

  /**
   * Calculate minimap dimensions
   */
  const minimapDimensions = {
    width:
      canvasSize.cols * MINIMAP_CELL_WIDTH +
      (canvasSize.cols - 1) * MINIMAP_GAP,
    height:
      canvasSize.rows * MINIMAP_CELL_HEIGHT +
      (canvasSize.rows - 1) * MINIMAP_GAP,
    cellWidth: MINIMAP_CELL_WIDTH,
    cellHeight: MINIMAP_CELL_HEIGHT,
    gap: MINIMAP_GAP,
  };

  /**
   * Get viewport rectangle position on minimap
   */
  const viewportRect = {
    x: viewport.col * (MINIMAP_CELL_WIDTH + MINIMAP_GAP),
    y: viewport.row * (MINIMAP_CELL_HEIGHT + MINIMAP_GAP),
    width:
      viewport.cols * MINIMAP_CELL_WIDTH + (viewport.cols - 1) * MINIMAP_GAP,
    height:
      viewport.rows * MINIMAP_CELL_HEIGHT + (viewport.rows - 1) * MINIMAP_GAP,
  };

  // ===========================================================================
  // CONNECTION STATE
  // ===========================================================================

  const isDisabled = loading || !isConnected;

  // ===========================================================================
  // RETURN API
  // ===========================================================================

  return {
    // State
    canvasSize,
    viewport,
    cells,
    zoom,
    homepoint,
    isAtHome,
    navigatorDocked,
    loading,
    error,
    isConnected,
    isDisabled,

    // Size controls with press-and-hold
    incrementColsHold,
    decrementColsHold,
    incrementRowsHold,
    decrementRowsHold,
    setCanvasCols,
    setCanvasRows,
    checkCanReduceSize,

    // Navigation
    moveViewport,
    navigateToCell,
    handleMinimapClick,
    setHomepoint,

    // Viewport dragging
    viewportDrag,

    // Zoom
    setZoom,
    zoomIn,
    zoomOut,

    // Cell helpers
    getCellAt,
    isInViewport,
    getCellColor,

    // Minimap calculations
    minimapDimensions,
    viewportRect,

    // Tools
    tool,
    setTool,
    editMode,
    setEditMode,
    toggleEditMode,
    dropMode,
    setDropMode,

    // Docking
    toggleNavigatorDocked,

    // Undo/redo
    canUndo,
    canRedo,
    undo,
    redo,
  };
}

export default useCanvasNavigator;
