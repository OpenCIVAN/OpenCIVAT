// src/ui/react/hooks/useViewportSize.js
// React hook for managing viewport size (visible grid cells)
//
// Controls how many grid cells are visible at once, enabling users to:
// - Focus on a single cell (1x1) for detailed analysis
// - Use default view (2x3) for normal work
// - Expand view (e.g., 3x4) for overview/comparison
//
// USAGE EXAMPLE:
// ```jsx
// import { useViewportSize } from '@UI/react/hooks';
//
// function ViewportControls({ canvasDimensions }) {
//   const {
//     viewportSize,
//     setViewportSize,
//     incrementViewportSize,
//     decrementViewportSize,
//     resetViewportSize,
//   } = useViewportSize(canvasDimensions);
//
//   return (
//     <div className="viewport-controls">
//       <button onClick={decrementViewportSize}>Focus (−)</button>
//       <span>{viewportSize.rows}×{viewportSize.cols}</span>
//       <button onClick={incrementViewportSize}>Overview (+)</button>
//       <button onClick={resetViewportSize}>Reset</button>
//       <button onClick={() => setViewportSize(1, 1)}>Single Cell</button>
//     </div>
//   );
// }
// ```

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// Constants
const STORAGE_KEY = "cia-viewport-size";
const EVENT_NAME = "cia:viewport-size-changed";

const DEFAULT_VIEWPORT_SIZE = {
  rows: 2,
  cols: 3,
};

const MIN_SIZE = {
  rows: 1,
  cols: 1,
};

// Preset size progression for increment/decrement
// Follows common aspect ratios and useful configurations
const SIZE_PRESETS = [
  { rows: 1, cols: 1 }, // Focus mode
  { rows: 1, cols: 2 }, // Side-by-side
  { rows: 2, cols: 2 }, // 2x2 grid
  { rows: 2, cols: 3 }, // Default (6 cells)
  { rows: 3, cols: 3 }, // 9 cells
  { rows: 3, cols: 4 }, // 12 cells
  { rows: 4, cols: 4 }, // 16 cells
];

/**
 * Load saved viewport size from localStorage
 * @returns {{ rows: number, cols: number } | null}
 */
function loadSavedSize() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.rows === "number" &&
        typeof parsed.cols === "number" &&
        parsed.rows >= MIN_SIZE.rows &&
        parsed.cols >= MIN_SIZE.cols
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[useViewportSize] Failed to load saved size:", e);
  }
  return null;
}

/**
 * Save viewport size to localStorage
 * @param {{ rows: number, cols: number }} size
 */
function saveSize(size) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
  } catch (e) {
    console.warn("[useViewportSize] Failed to save size:", e);
  }
}

/**
 * Emit custom event for viewport size changes
 * @param {{ rows: number, cols: number }} size
 * @param {{ rows: number, cols: number }} previousSize
 */
function emitSizeChanged(size, previousSize) {
  const event = new CustomEvent(EVENT_NAME, {
    detail: {
      size,
      previousSize,
      cellCount: size.rows * size.cols,
      previousCellCount: previousSize.rows * previousSize.cols,
    },
    bubbles: true,
  });
  window.dispatchEvent(event);
}

/**
 * Clamp size to valid range
 * @param {number} rows
 * @param {number} cols
 * @param {{ rows: number, cols: number }} maxSize
 * @returns {{ rows: number, cols: number }}
 */
function clampSize(rows, cols, maxSize) {
  return {
    rows: Math.max(MIN_SIZE.rows, Math.min(maxSize.rows, Math.floor(rows))),
    cols: Math.max(MIN_SIZE.cols, Math.min(maxSize.cols, Math.floor(cols))),
  };
}

/**
 * Find the current preset index based on cell count
 * @param {{ rows: number, cols: number }} size
 * @returns {number}
 */
function findPresetIndex(size) {
  const cellCount = size.rows * size.cols;

  // Find the closest preset by cell count
  let closestIndex = 0;
  let closestDiff = Infinity;

  SIZE_PRESETS.forEach((preset, index) => {
    const presetCount = preset.rows * preset.cols;
    const diff = Math.abs(presetCount - cellCount);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * useViewportSize - Hook for managing viewport size with persistence
 *
 * @param {{ rows: number, cols: number }} canvasDimensions - Maximum canvas dimensions for clamping
 * @param {{ rows: number, cols: number }} [initialSize] - Initial size (overrides localStorage)
 * @returns {Object} Viewport size state and controls
 */
export function useViewportSize(
  canvasDimensions = { rows: 10, cols: 10 },
  initialSize = null
) {
  // Memoize max dimensions to avoid dependency issues with object references
  const maxRows = canvasDimensions?.rows ?? 10;
  const maxCols = canvasDimensions?.cols ?? 10;
  const maxSize = useMemo(
    () => ({ rows: maxRows, cols: maxCols }),
    [maxRows, maxCols]
  );

  // Initialize from saved preference, initial override, or default
  const [viewportSize, setViewportSizeState] = useState(() => {
    if (initialSize) {
      return clampSize(initialSize.rows, initialSize.cols, {
        rows: maxRows,
        cols: maxCols,
      });
    }
    const saved = loadSavedSize();
    if (saved) {
      return clampSize(saved.rows, saved.cols, {
        rows: maxRows,
        cols: maxCols,
      });
    }
    return clampSize(DEFAULT_VIEWPORT_SIZE.rows, DEFAULT_VIEWPORT_SIZE.cols, {
      rows: maxRows,
      cols: maxCols,
    });
  });

  // Track previous size for event emission
  const previousSizeRef = useRef(viewportSize);

  // Re-clamp when canvas dimensions change
  useEffect(() => {
    setViewportSizeState((current) => {
      const clamped = clampSize(current.rows, current.cols, maxSize);
      if (clamped.rows !== current.rows || clamped.cols !== current.cols) {
        return clamped;
      }
      return current;
    });
  }, [maxSize]);

  // Persist and emit events on size change
  useEffect(() => {
    const prev = previousSizeRef.current;
    if (prev.rows !== viewportSize.rows || prev.cols !== viewportSize.cols) {
      saveSize(viewportSize);
      emitSizeChanged(viewportSize, prev);
      previousSizeRef.current = viewportSize;
    }
  }, [viewportSize]);

  /**
   * Set exact viewport size
   * @param {number} rows
   * @param {number} cols
   */
  const setViewportSize = useCallback(
    (rows, cols) => {
      const clamped = clampSize(rows, cols, maxSize);
      setViewportSizeState(clamped);
    },
    [maxSize]
  );

  /**
   * Increment viewport size (show more cells / zoom out)
   * Moves to the next larger preset
   */
  const incrementViewportSize = useCallback(() => {
    setViewportSizeState((current) => {
      const currentIndex = findPresetIndex(current);
      const nextIndex = Math.min(currentIndex + 1, SIZE_PRESETS.length - 1);
      const nextPreset = SIZE_PRESETS[nextIndex];

      // Clamp to canvas dimensions
      return clampSize(nextPreset.rows, nextPreset.cols, maxSize);
    });
  }, [maxSize]);

  /**
   * Decrement viewport size (show fewer cells / zoom in / focus)
   * Moves to the next smaller preset
   */
  const decrementViewportSize = useCallback(() => {
    setViewportSizeState((current) => {
      const currentIndex = findPresetIndex(current);
      const prevIndex = Math.max(currentIndex - 1, 0);
      const prevPreset = SIZE_PRESETS[prevIndex];

      return clampSize(prevPreset.rows, prevPreset.cols, maxSize);
    });
  }, [maxSize]);

  /**
   * Reset viewport size to default (2x3)
   */
  const resetViewportSize = useCallback(() => {
    const clamped = clampSize(
      DEFAULT_VIEWPORT_SIZE.rows,
      DEFAULT_VIEWPORT_SIZE.cols,
      maxSize
    );
    setViewportSizeState(clamped);
  }, [maxSize]);

  // Computed values
  const cellCount = viewportSize.rows * viewportSize.cols;
  const isMinSize =
    viewportSize.rows <= MIN_SIZE.rows && viewportSize.cols <= MIN_SIZE.cols;
  const isMaxSize =
    viewportSize.rows >= maxSize.rows && viewportSize.cols >= maxSize.cols;
  const isDefaultSize =
    viewportSize.rows === DEFAULT_VIEWPORT_SIZE.rows &&
    viewportSize.cols === DEFAULT_VIEWPORT_SIZE.cols;

  return {
    // State
    viewportSize,
    cellCount,

    // Status flags
    isMinSize,
    isMaxSize,
    isDefaultSize,

    // Actions
    setViewportSize,
    incrementViewportSize,
    decrementViewportSize,
    resetViewportSize,

    // Constants (for UI display)
    minSize: MIN_SIZE,
    maxSize,
    defaultSize: DEFAULT_VIEWPORT_SIZE,
    presets: SIZE_PRESETS,
  };
}

// Export constants for external use
export { STORAGE_KEY, EVENT_NAME, DEFAULT_VIEWPORT_SIZE, SIZE_PRESETS };

export default useViewportSize;
