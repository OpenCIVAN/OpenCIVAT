/**
 * CanvasNavigator Logic Hook
 *
 * Headless logic for the canvas navigator component.
 * Wraps parent LayoutPanel logic and adds navigator-specific functionality.
 *
 * Features:
 * - Press-and-hold for canvas size controls
 * - Minimap click-to-navigate
 * - Viewport dragging
 * - DROP HANDLERS for view repositioning from ViewsSubtab
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";

// =============================================================================
// PRESS-AND-HOLD HOOK
// =============================================================================

/**
 * Hook for press-and-hold button behavior
 * Fires action immediately, then repeatedly after delay
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
        onMove(cellDeltaY, cellDeltaX);
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
  };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCanvasNavigator - Navigator-specific logic
 *
 * @param {Object} parentLogic - Logic object from useLayoutPanel
 */
export function useCanvasNavigator(parentLogic) {
  const {
    canvas,
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
    // Size controls
    incrementCols,
    decrementCols,
    incrementRows,
    decrementRows,
    setCanvasCols,
    setCanvasRows,
    checkCanReduceSize,
    // Navigation
    moveViewport,
    navigateToCell,
    setHomepoint,
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
  } = parentLogic;

  // ===========================================================================
  // DROP STATE
  // ===========================================================================

  const [dropTargetCell, setDropTargetCell] = useState(null);
  const [isValidDrop, setIsValidDrop] = useState(false);

  // ===========================================================================
  // PRESS-AND-HOLD CONTROLS
  // ===========================================================================

  const incrementColsHold = usePressAndHold(incrementCols);
  const decrementColsHold = usePressAndHold(decrementCols);
  const incrementRowsHold = usePressAndHold(incrementRows);
  const decrementRowsHold = usePressAndHold(decrementRows);

  // ===========================================================================
  // MINIMAP INTERACTIONS
  // ===========================================================================

  const handleMinimapClick = useCallback(
    (row, col) => {
      navigateToCell(row, col);
    },
    [navigateToCell]
  );

  const viewportDrag = useViewportDrag((newRow, newCol) => {
    navigateToCell(newRow, newCol);
  });

  // ===========================================================================
  // DROP HANDLERS
  // ===========================================================================

  /**
   * Check if a cell can accept a drop
   * Valid if: empty, or same placement (no-op), or in replace mode
   */
  const canDropAt = useCallback(
    (row, col, dragData) => {
      const existingCell = getCellAt(row, col);

      // Empty cell - always valid
      if (!existingCell) return true;

      // Same placement - no-op but valid
      if (existingCell.id === dragData.placementId) return true;

      // Different placement - only valid in replace mode
      return dropMode === "replace";
    },
    [getCellAt, dropMode]
  );

  /**
   * Handle drag over a minimap cell
   */
  const handleCellDragOver = useCallback((e, row, col) => {
    e.preventDefault();

    // Parse drag data to check validity
    try {
      const jsonData = e.dataTransfer.types.includes("application/json");
      if (jsonData) {
        e.dataTransfer.dropEffect = "move";
        setDropTargetCell({ row, col });
        // We can't read data during dragOver, so assume valid for now
        // Actual validation happens on drop
        setIsValidDrop(true);
      }
    } catch (err) {
      console.warn("Drag over error:", err);
    }
  }, []);

  /**
   * Handle drag leave from minimap cell
   */
  const handleCellDragLeave = useCallback(() => {
    setDropTargetCell(null);
    setIsValidDrop(false);
  }, []);

  /**
   * Handle drop on a minimap cell
   * Supports three drop types:
   * 1. view-item with move mode - repositions existing view
   * 2. view-item with linked mode - creates linked copy
   * 3. dataset - creates new independent view
   */
  const handleCellDrop = useCallback(
    async (e, row, col) => {
      e.preventDefault();
      setDropTargetCell(null);
      setIsValidDrop(false);

      try {
        const jsonData = e.dataTransfer.getData("application/json");
        if (!jsonData) return;

        const dragData = JSON.parse(jsonData);

        // Handle dataset drop - create new independent view
        if (dragData.type === "dataset") {
          console.log(
            `Creating new view for dataset ${dragData.datasetId} at (${row}, ${col})`
          );

          // Check if target cell is empty
          const existingCell = getCellAt(row, col);
          if (existingCell && dropMode !== "replace") {
            console.log("Cannot drop dataset on occupied cell");
            return;
          }

          // Remove existing if in replace mode
          if (existingCell && dropMode === "replace") {
            await canvasManager.removePlacement(canvas.id, existingCell.id);
          }

          // Dispatch event to create view at specific position
          window.dispatchEvent(
            new CustomEvent("cia:request-instance", {
              detail: {
                datasetId: dragData.datasetId,
                spawnNew: true,
                targetRow: row,
                targetCol: col,
                canvasId: canvas.id,
              },
            })
          );
          return;
        }

        // Handle view-item drop
        if (dragData.type === "view-item") {
          // Check if this is a linked copy creation or a move
          const createMode = dragData.createMode || "move";

          if (createMode === "linked") {
            // Create linked copy at target position
            console.log(
              `Creating linked copy of view ${dragData.viewId} at (${row}, ${col})`
            );

            // Check if target cell is empty
            const existingCell = getCellAt(row, col);
            if (existingCell && dropMode !== "replace") {
              console.log("Cannot create linked copy on occupied cell");
              return;
            }

            // Remove existing if in replace mode
            if (existingCell && dropMode === "replace") {
              await canvasManager.removePlacement(canvas.id, existingCell.id);
            }

            // Dispatch event to create linked view
            window.dispatchEvent(
              new CustomEvent("cia:create-linked-view", {
                detail: {
                  sourceViewId: dragData.viewConfigurationId || dragData.viewId,
                  targetRow: row,
                  targetCol: col,
                  canvasId: canvas.id,
                },
              })
            );
            return;
          }

          // Default: Move existing placement
          // Check if drop is valid
          if (!canDropAt(row, col, dragData)) {
            console.log("Invalid drop target");
            return;
          }

          // Same position - no-op
          if (dragData.sourceRow === row && dragData.sourceCol === col) {
            return;
          }

          // Check for existing placement at target
          const existingCell = getCellAt(row, col);

          if (existingCell && existingCell.id !== dragData.placementId) {
            // Replace mode - remove existing placement first
            if (dropMode === "replace") {
              await canvasManager.removePlacement(canvas.id, existingCell.id);
            } else {
              // Should not reach here due to canDropAt check
              return;
            }
          }

          // Update the placement position
          await canvasManager.updatePlacement(canvas.id, dragData.placementId, {
            row,
            col,
          });

          console.log(
            `Moved view ${dragData.placementId} from (${dragData.sourceRow}, ${dragData.sourceCol}) to (${row}, ${col})`
          );
          return;
        }

        console.warn("Unknown drag type:", dragData.type);
      } catch (err) {
        console.error("Drop failed:", err);
      }
    },
    [canvas, getCellAt, canDropAt, dropMode]
  );

  // ===========================================================================
  // CELL HELPERS
  // ===========================================================================

  /**
   * Get cell color for minimap display
   */
  const getCellColor = useCallback((cell) => {
    if (!cell) return null;
    // Use instance color or default to index-based color
    return cell.color || cell.instanceColor || 0;
  }, []);

  // ===========================================================================
  // MINIMAP CALCULATIONS
  // ===========================================================================

  const MINIMAP_CELL_WIDTH = 28;
  const MINIMAP_CELL_HEIGHT = 20;
  const MINIMAP_GAP = 2;

  const minimapDimensions = useMemo(
    () => ({
      width:
        canvasSize.cols * MINIMAP_CELL_WIDTH +
        (canvasSize.cols - 1) * MINIMAP_GAP,
      height:
        canvasSize.rows * MINIMAP_CELL_HEIGHT +
        (canvasSize.rows - 1) * MINIMAP_GAP,
      cellWidth: MINIMAP_CELL_WIDTH,
      cellHeight: MINIMAP_CELL_HEIGHT,
      gap: MINIMAP_GAP,
    }),
    [canvasSize]
  );

  const viewportRect = useMemo(
    () => ({
      x: viewport.col * (MINIMAP_CELL_WIDTH + MINIMAP_GAP),
      y: viewport.row * (MINIMAP_CELL_HEIGHT + MINIMAP_GAP),
      width:
        viewport.cols * MINIMAP_CELL_WIDTH + (viewport.cols - 1) * MINIMAP_GAP,
      height:
        viewport.rows * MINIMAP_CELL_HEIGHT + (viewport.rows - 1) * MINIMAP_GAP,
    }),
    [viewport]
  );

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

    // Drop handling
    dropTargetCell,
    isValidDrop,
    handleCellDragOver,
    handleCellDragLeave,
    handleCellDrop,
    canDropAt,

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
