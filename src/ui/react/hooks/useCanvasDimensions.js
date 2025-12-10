// src/ui/react/hooks/useCanvasDimensions.js
// React hook for robust canvas container measurement
//
// ARCHITECTURE:
// This hook solves the canvas measurement problem comprehensively:
// 1. Shows loading state until dimensions are valid
// 2. Watches all relevant containers for resize (including ancestor changes)
// 3. Handles edge cases: dev console toggle, panel resize, window resize
// 4. Calculates cell sizes based on viewport settings (true zoom behavior)
// 5. Determines render mode for progressive UI degradation
//
// USAGE:
// ```jsx
// const {
//   isReady,
//   containerSize,
//   cellSize,
//   renderMode,
//   measureRef
// } = useCanvasDimensions({
//   viewportCols: 3,
//   viewportRows: 2,
//   gap: 12,
//   padding: { top: 8, right: 16, bottom: 16, left: 8 }
// });
// ```

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { canvas as log } from "@Utils/logger.js";

// =============================================================================
// RENDER MODE CONSTANTS
// =============================================================================

/**
 * Render modes based on cell size (progressive UI degradation)
 *
 * As viewport increases (more cells visible), individual cells get smaller.
 * UI adapts by showing less detail:
 * - FULL: Complete 3D render + full toolbar with all tools
 * - COMPACT: 3D render + reduced toolbar (wrench icon for overflow)
 * - THUMBNAIL: SVG thumbnail + minimal header only
 * - SNAPSHOT: Static image + name tooltip on hover
 */
export const RENDER_MODES = {
  FULL: "full",
  COMPACT: "compact",
  THUMBNAIL: "thumbnail",
  SNAPSHOT: "snapshot",
};

/**
 * Size thresholds for render mode selection (minimum dimension in pixels)
 * These values are tuned based on typical UI element sizes:
 * - Toolbar buttons ~28px, need ~3 to be useful = ~100px min width
 * - Header height ~32px, content needs ~120px to be meaningful
 */
export const RENDER_MODE_THRESHOLDS = {
  FULL: 200, // Full render: smallest dimension >= 200px
  COMPACT: 120, // Compact render: smallest dimension >= 120px
  THUMBNAIL: 60, // Thumbnail: smallest dimension >= 60px
  // Below 60px: snapshot mode
};

/**
 * Determine render mode based on cell dimensions
 * @param {number} width - Cell width in pixels
 * @param {number} height - Cell height in pixels
 * @returns {string} One of RENDER_MODES values
 */
export function calculateRenderMode(width, height) {
  const minDimension = Math.min(width, height);

  if (minDimension >= RENDER_MODE_THRESHOLDS.FULL) {
    return RENDER_MODES.FULL;
  }
  if (minDimension >= RENDER_MODE_THRESHOLDS.COMPACT) {
    return RENDER_MODES.COMPACT;
  }
  if (minDimension >= RENDER_MODE_THRESHOLDS.THUMBNAIL) {
    return RENDER_MODES.THUMBNAIL;
  }
  return RENDER_MODES.SNAPSHOT;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  viewportCols: 3,
  viewportRows: 2,
  gap: 12,
  padding: {
    top: 8,
    right: 16, // Extra for scrollbar
    bottom: 16, // Extra for scrollbar
    left: 8,
  },
  // How long to wait before giving up on measurements (ms)
  measurementTimeout: 5000,
  // How often to retry measurement if container has no size (ms)
  retryInterval: 50,
  // Debounce resize events (ms) - prevents excessive recalculation
  resizeDebounce: 16,
};

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCanvasDimensions - Robust container measurement for canvas grid
 *
 * @param {Object} config - Configuration options
 * @param {number} config.viewportCols - Number of columns to display
 * @param {number} config.viewportRows - Number of rows to display
 * @param {number} config.gap - Gap between cells in pixels
 * @param {Object} config.padding - Padding around grid { top, right, bottom, left }
 * @param {number} config.measurementTimeout - Max time to wait for valid dimensions
 * @param {number} config.retryInterval - Retry interval for measurement attempts
 * @param {number} config.resizeDebounce - Debounce time for resize events
 *
 * @returns {Object} Measurement state and utilities
 */
export function useCanvasDimensions(config = {}) {
  log.debug("[useCanvasDimensions] Called with config:", config);
  // Merge config with defaults
  const {
    viewportCols,
    viewportRows,
    gap,
    padding,
    measurementTimeout,
    retryInterval,
    resizeDebounce,
  } = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...config,
      padding: { ...DEFAULT_CONFIG.padding, ...config.padding },
    }),
    [
      config.viewportCols,
      config.viewportRows,
      config.gap,
      config.padding?.top,
      config.padding?.right,
      config.padding?.bottom,
      config.padding?.left,
      config.measurementTimeout,
      config.retryInterval,
      config.resizeDebounce,
    ]
  );

  // Ref for the measurement container
  const measureRef = useRef(null);
  const [refReady, setRefReady] = useState(false);

  const setMeasureRef = useCallback((node) => {
    if (node !== null) {
      measureRef.current = node;
      setRefReady(true);
    }
  }, []);

  // Track if we have valid measurements
  const [isReady, setIsReady] = useState(false);

  // Container size in pixels
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Calculated cell size
  const [cellSize, setCellSize] = useState({ width: 300, height: 200 });

  // Current render mode
  const [renderMode, setRenderMode] = useState(RENDER_MODES.FULL);

  // Error state for timeout
  const [measurementError, setMeasurementError] = useState(null);

  // Refs for cleanup
  const resizeObserverRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const measurementTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  /**
   * Calculate cell sizes and render mode from container dimensions
   */
  const calculateSizes = useCallback(
    (containerWidth, containerHeight) => {
      // Available space after padding
      const availableWidth = containerWidth - padding.left - padding.right;
      const availableHeight = containerHeight - padding.top - padding.bottom;

      if (availableWidth <= 0 || availableHeight <= 0) {
        return null;
      }

      // Calculate cell size to fit exactly viewport cells
      // Formula: availableSpace = (cellSize * numCells) + (gap * (numCells - 1))
      // Solving: cellSize = (availableSpace - gap * (numCells - 1)) / numCells
      const cellWidth =
        (availableWidth - gap * (viewportCols - 1)) / viewportCols;
      const cellHeight =
        (availableHeight - gap * (viewportRows - 1)) / viewportRows;

      // No minimums - true zoom behavior
      // UI adapts via render mode
      const mode = calculateRenderMode(cellWidth, cellHeight);

      return {
        cellSize: { width: cellWidth, height: cellHeight },
        renderMode: mode,
      };
    },
    [viewportCols, viewportRows, gap, padding]
  );

  /**
   * Attempt to measure the container
   */
  const attemptMeasurement = useCallback(() => {
    const container = measureRef.current;
    log.debug(
      "[useCanvasDimensions] attemptMeasurement called, ref:",
      measureRef.current
    );

    if (!container) {
      log.debug("[useCanvasDimensions] No container ref, returning early");
      return false;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Check if dimensions are valid
    if (width <= 0 || height <= 0) {
      return false;
    }

    // Calculate sizes
    const result = calculateSizes(width, height);

    if (!result) {
      return false;
    }

    // Update state
    setContainerSize({ width, height });
    setCellSize(result.cellSize);
    setRenderMode(result.renderMode);
    setIsReady(true);
    setMeasurementError(null);

    // Log success (can be removed in production)
    if (process.env.NODE_ENV === "development") {
      log.debug("✓ Canvas dimensions measured:", {
        container: { width, height },
        cellSize: result.cellSize,
        renderMode: result.renderMode,
        viewport: { cols: viewportCols, rows: viewportRows },
      });
    }

    return true;
  }, [calculateSizes, viewportCols, viewportRows]);

  /**
   * Handle resize events with debouncing
   */
  const handleResize = useCallback(() => {
    // Cancel any pending debounced calculation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce to prevent excessive recalculation during resize drag
    debounceTimeoutRef.current = setTimeout(() => {
      attemptMeasurement();
    }, resizeDebounce);
  }, [attemptMeasurement, resizeDebounce]);

  /**
   * Set up measurement and resize observation
   */
  useEffect(() => {
    const container = measureRef.current;

    if (!container) {
      return;
    }

    // Clear any existing state
    setIsReady(false);
    setMeasurementError(null);

    // Track retry attempts
    let retryCount = 0;
    const maxRetries = Math.ceil(measurementTimeout / retryInterval);

    // Function to retry measurement
    const retryMeasurement = () => {
      if (attemptMeasurement()) {
        // Success! Clear the timeout
        if (measurementTimeoutRef.current) {
          clearTimeout(measurementTimeoutRef.current);
        }
        return;
      }

      retryCount++;

      if (retryCount < maxRetries) {
        // Schedule another retry
        retryTimeoutRef.current = setTimeout(retryMeasurement, retryInterval);
      } else {
        // Give up
        setMeasurementError(
          new Error(
            `Failed to measure canvas container after ${measurementTimeout}ms. ` +
              "Container may have zero dimensions."
          )
        );
      }
    };

    // Start initial measurement attempts using rAF for layout stability
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        retryMeasurement();
      });
    });

    // Set up overall timeout
    measurementTimeoutRef.current = setTimeout(() => {
      if (!isReady) {
        setMeasurementError(
          new Error(
            `Canvas measurement timed out after ${measurementTimeout}ms`
          )
        );
      }
    }, measurementTimeout);

    // Create ResizeObserver for the container
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Only process if we have valid dimensions
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          handleResize();
        }
      }
    });

    // Observe the container
    resizeObserverRef.current.observe(container);

    // Also observe ancestors that might affect our size
    // This catches cases like dev console toggle, panel resize, etc.
    const observeAncestors = () => {
      let parent = container.parentElement;
      const observedAncestors = [];

      while (parent && parent !== document.body) {
        // Only observe elements that might affect layout
        const style = getComputedStyle(parent);
        if (
          style.display === "flex" ||
          style.display === "grid" ||
          style.overflow === "hidden" ||
          parent.classList.contains("workspace") ||
          parent.classList.contains("resizable") ||
          parent.classList.contains("panel")
        ) {
          resizeObserverRef.current.observe(parent);
          observedAncestors.push(parent);
        }
        parent = parent.parentElement;
      }

      return observedAncestors;
    };

    const ancestorsObserved = observeAncestors();

    // Window resize handler as fallback
    const handleWindowResize = () => {
      handleResize();
    };
    window.addEventListener("resize", handleWindowResize);

    // Cleanup
    return () => {
      // Clear all timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (measurementTimeoutRef.current) {
        clearTimeout(measurementTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Disconnect observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      // Remove window listener
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [
    attemptMeasurement,
    handleResize,
    measurementTimeout,
    retryInterval,
    refReady,
  ]);

  // Re-calculate when viewport settings change
  useEffect(() => {
    if (isReady && containerSize.width > 0 && containerSize.height > 0) {
      const result = calculateSizes(containerSize.width, containerSize.height);
      if (result) {
        setCellSize(result.cellSize);
        setRenderMode(result.renderMode);
      }
    }
  }, [viewportCols, viewportRows, gap, isReady, containerSize, calculateSizes]);

  /**
   * Force a re-measurement (useful after programmatic layout changes)
   */
  const remeasure = useCallback(() => {
    setIsReady(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        attemptMeasurement();
      });
    });
  }, [attemptMeasurement]);

  // Computed values
  const totalGapWidth = gap * (viewportCols - 1);
  const totalGapHeight = gap * (viewportRows - 1);
  const gridWidth = cellSize.width * viewportCols + totalGapWidth;
  const gridHeight = cellSize.height * viewportRows + totalGapHeight;

  return {
    // State
    isReady,
    measurementError,
    containerSize,
    cellSize,
    renderMode,

    // Computed
    gridWidth,
    gridHeight,
    totalGapWidth,
    totalGapHeight,

    // Ref to attach to measurement container
    measureRef: setMeasureRef,

    // Actions
    remeasure,

    // Constants (for consumers that need them)
    RENDER_MODES,
    RENDER_MODE_THRESHOLDS,

    // Config echo (for debugging)
    config: {
      viewportCols,
      viewportRows,
      gap,
      padding,
    },
  };
}

// Re-export constants
export { DEFAULT_CONFIG };

export default useCanvasDimensions;
