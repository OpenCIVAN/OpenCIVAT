// src/ui/react/hooks/useCanvas.js
// React hook for canvas state management
//
// Provides reactive access to canvas data and viewport state.
// Connects React components to CanvasManager and SubsetManager.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { subsetManager } from '@Core/data/managers/SubsetManager.js';

/**
 * Default viewport configuration
 */
const DEFAULT_VIEWPORT = {
  row: 0,
  col: 0,
  rows: 3,
  cols: 3,
};

/**
 * useCanvas - Hook for canvas and viewport state
 *
 * @param {string} canvasId - Canvas to manage (optional, uses active canvas if not provided)
 * @returns {Object} Canvas state and controls
 */
export function useCanvas(canvasId = null) {
  // Canvas state
  const [canvas, setCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Viewport state (local, not persisted)
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);

  // Resolve canvas ID
  const resolvedCanvasId = canvasId || canvasManager.getActiveCanvasId();

  // Load canvas
  useEffect(() => {
    if (!resolvedCanvasId) {
      setCanvas(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    canvasManager
      .loadCanvas(resolvedCanvasId)
      .then((loadedCanvas) => {
        setCanvas(loadedCanvas);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [resolvedCanvasId]);

  // Subscribe to canvas updates
  useEffect(() => {
    const handleCanvasUpdated = ({ canvas: updatedCanvas }) => {
      if (updatedCanvas.id === resolvedCanvasId) {
        setCanvas(new (canvas?.constructor || Object)(updatedCanvas));
      }
    };

    const handlePlacementAdded = ({ canvasId: cId }) => {
      if (cId === resolvedCanvasId) {
        const updated = canvasManager.getCanvas(cId);
        if (updated) setCanvas({ ...updated });
      }
    };

    const handlePlacementUpdated = handlePlacementAdded;
    const handlePlacementRemoved = handlePlacementAdded;

    const unsubs = [
      canvasManager.on('canvasUpdated', handleCanvasUpdated),
      canvasManager.on('placementAdded', handlePlacementAdded),
      canvasManager.on('placementUpdated', handlePlacementUpdated),
      canvasManager.on('placementRemoved', handlePlacementRemoved),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [resolvedCanvasId]);

  // Get visible placements
  const visiblePlacements = useMemo(() => {
    if (!canvas) return [];
    return canvas.getPlacementsInViewport(viewport);
  }, [canvas, viewport]);

  // Viewport navigation
  const moveViewport = useCallback(
    (deltaRow, deltaCol) => {
      setViewport((prev) => {
        const newRow = Math.max(0, prev.row + deltaRow);
        const newCol = Math.max(0, prev.col + deltaCol);

        // Clamp to canvas bounds if canvas exists
        if (canvas) {
          const maxRow = Math.max(0, canvas.dimensions.rows - prev.rows);
          const maxCol = Math.max(0, canvas.dimensions.cols - prev.cols);
          return {
            ...prev,
            row: Math.min(newRow, maxRow),
            col: Math.min(newCol, maxCol),
          };
        }

        return { ...prev, row: newRow, col: newCol };
      });
    },
    [canvas]
  );

  const setViewportPosition = useCallback(
    (row, col) => {
      setViewport((prev) => {
        if (canvas) {
          const maxRow = Math.max(0, canvas.dimensions.rows - prev.rows);
          const maxCol = Math.max(0, canvas.dimensions.cols - prev.cols);
          return {
            ...prev,
            row: Math.min(Math.max(0, row), maxRow),
            col: Math.min(Math.max(0, col), maxCol),
          };
        }
        return { ...prev, row: Math.max(0, row), col: Math.max(0, col) };
      });
    },
    [canvas]
  );

  const setViewportSize = useCallback(
    (rows, cols) => {
      setViewport((prev) => ({
        ...prev,
        rows: Math.max(1, Math.min(4, rows)),
        cols: Math.max(1, Math.min(4, cols)),
      }));
    },
    []
  );

  // Placement operations
  const addPlacement = useCallback(
    async (placementData) => {
      if (!resolvedCanvasId) throw new Error('No canvas selected');
      return canvasManager.addPlacement(resolvedCanvasId, placementData);
    },
    [resolvedCanvasId]
  );

  const updatePlacement = useCallback(async (placementId, updates) => {
    return canvasManager.updatePlacement(placementId, updates);
  }, []);

  const removePlacement = useCallback(async (placementId) => {
    return canvasManager.removePlacement(placementId);
  }, []);

  const movePlacement = useCallback(async (placementId, newRow, newCol) => {
    return canvasManager.movePlacement(placementId, newRow, newCol);
  }, []);

  const resizePlacement = useCallback(async (placementId, rowSpan, colSpan) => {
    return canvasManager.resizePlacement(placementId, rowSpan, colSpan);
  }, []);

  // Canvas dimension operations
  const addRow = useCallback(async () => {
    if (!canvas) return;
    const newRows = canvas.dimensions.rows + 1;
    return canvasManager.updateCanvas(canvas.id, {
      dimensions: { ...canvas.dimensions, rows: newRows },
    });
  }, [canvas]);

  const addColumn = useCallback(async () => {
    if (!canvas) return;
    const newCols = canvas.dimensions.cols + 1;
    return canvasManager.updateCanvas(canvas.id, {
      dimensions: { ...canvas.dimensions, cols: newCols },
    });
  }, [canvas]);

  return {
    // State
    canvas,
    loading,
    error,
    viewport,
    visiblePlacements,

    // Viewport controls
    moveViewport,
    setViewportPosition,
    setViewportSize,

    // Placement operations
    addPlacement,
    updatePlacement,
    removePlacement,
    movePlacement,
    resizePlacement,

    // Canvas operations
    addRow,
    addColumn,
  };
}

/**
 * useViewport - Simplified hook for just viewport state
 */
export function useViewport(initialViewport = DEFAULT_VIEWPORT) {
  const [viewport, setViewport] = useState(initialViewport);

  const moveUp = useCallback(() => {
    setViewport((prev) => ({ ...prev, row: Math.max(0, prev.row - 1) }));
  }, []);

  const moveDown = useCallback((maxRows = Infinity) => {
    setViewport((prev) => ({
      ...prev,
      row: Math.min(maxRows - prev.rows, prev.row + 1),
    }));
  }, []);

  const moveLeft = useCallback(() => {
    setViewport((prev) => ({ ...prev, col: Math.max(0, prev.col - 1) }));
  }, []);

  const moveRight = useCallback((maxCols = Infinity) => {
    setViewport((prev) => ({
      ...prev,
      col: Math.min(maxCols - prev.cols, prev.col + 1),
    }));
  }, []);

  return {
    viewport,
    setViewport,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
  };
}

/**
 * useSubsets - Hook for subset management
 */
export function useSubsets(canvasId) {
  const [subsets, setSubsets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inFocusMode, setInFocusMode] = useState(false);
  const [activeSubset, setActiveSubset] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Load subsets
  useEffect(() => {
    if (!canvasId) {
      setSubsets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    subsetManager
      .loadSubsetsForCanvas(canvasId)
      .then((loaded) => {
        setSubsets(loaded);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [canvasId]);

  // Subscribe to subset updates
  useEffect(() => {
    const handleCreated = ({ subset }) => {
      if (subset.canvasId === canvasId) {
        setSubsets((prev) => [...prev, subset]);
      }
    };

    const handleUpdated = ({ subset }) => {
      setSubsets((prev) =>
        prev.map((s) => (s.id === subset.id ? subset : s))
      );
    };

    const handleDeleted = ({ subsetId }) => {
      setSubsets((prev) => prev.filter((s) => s.id !== subsetId));
    };

    const handleFocusEntered = ({ subset }) => {
      setInFocusMode(true);
      setActiveSubset(subset);
    };

    const handleFocusExited = () => {
      setInFocusMode(false);
      setActiveSubset(null);
    };

    const handleSelectionChanged = ({ selected }) => {
      setSelectedIds(selected);
      setSelectionMode(subsetManager.isInSelectionMode());
    };

    const unsubs = [
      subsetManager.on('subsetCreated', handleCreated),
      subsetManager.on('subsetUpdated', handleUpdated),
      subsetManager.on('subsetDeleted', handleDeleted),
      subsetManager.on('focusModeEntered', handleFocusEntered),
      subsetManager.on('focusModeExited', handleFocusExited),
      subsetManager.on('selectionChanged', handleSelectionChanged),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [canvasId]);

  // Actions
  const createSubset = useCallback(
    async (options) => {
      return subsetManager.createSubset(canvasId, options);
    },
    [canvasId]
  );

  const enterFocusMode = useCallback((subsetId, currentViewport) => {
    subsetManager.enterFocusMode(subsetId, currentViewport);
  }, []);

  const exitFocusMode = useCallback(() => {
    return subsetManager.exitFocusMode();
  }, []);

  const enterSelectionMode = useCallback(() => {
    subsetManager.enterSelectionMode();
  }, []);

  const exitSelectionMode = useCallback((clear = true) => {
    subsetManager.exitSelectionMode(clear);
  }, []);

  const toggleSelection = useCallback((placementId) => {
    subsetManager.toggleSelection(placementId);
  }, []);

  return {
    subsets,
    loading,
    inFocusMode,
    activeSubset,
    selectionMode,
    selectedIds,

    createSubset,
    enterFocusMode,
    exitFocusMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
  };
}
