/**
 * CanvasNavigator Logic Hook
 *
 * Provides press-and-hold behavior for increment/decrement buttons
 * and other navigator-specific logic.
 */

import { useRef, useCallback } from "react";

/**
 * Hook for press-and-hold button behavior
 * Starts action immediately, then repeats at interval
 */
export function usePressAndHold(action, interval = 150) {
  const intervalRef = useRef(null);

  const startHold = useCallback(() => {
    // Execute immediately
    action();
    // Then start interval
    intervalRef.current = setInterval(action, interval);
  }, [action, interval]);

  const stopHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    onMouseDown: startHold,
    onMouseUp: stopHold,
    onMouseLeave: stopHold,
  };
}

/**
 * Hook for CanvasNavigator component
 * Wraps parent logic with navigator-specific utilities
 */
export function useCanvasNavigator(logic) {
  const {
    canvasSize,
    viewport,
    cells,
    zoom,
    homepoint,
    isAtHome,
    incrementCols,
    decrementCols,
    incrementRows,
    decrementRows,
    setCanvasCols,
    setCanvasRows,
    moveViewport,
    navigateToCell,
    setZoom,
    zoomIn,
    zoomOut,
    checkCanReduceSize,
    tool,
    setTool,
    editMode,
    setEditMode,
    toggleEditMode,
    dropMode,
    setDropMode,
    toggleNavigatorDocked,
    navigatorDocked,
    canUndo,
    canRedo,
    undo,
    redo,
  } = logic;

  // Press-and-hold handlers for size controls
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

  // Get cell at position
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

  // Check if position is in viewport
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

  // Handle minimap cell click - navigate viewport to that area
  const handleMinimapClick = useCallback(
    (row, col) => {
      navigateToCell(row, col);
    },
    [navigateToCell]
  );

  return {
    // State
    canvasSize,
    viewport,
    cells,
    zoom,
    homepoint,
    isAtHome,
    navigatorDocked,

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

    // Zoom
    setZoom,
    zoomIn,
    zoomOut,

    // Cell helpers
    getCellAt,
    isInViewport,

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
