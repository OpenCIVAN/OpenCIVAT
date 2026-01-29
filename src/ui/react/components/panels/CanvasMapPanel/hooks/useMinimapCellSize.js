/**
 * @file useMinimapCellSize.js
 * @description Hook for responsive minimap cell size calculation
 *
 * Calculates optimal cell size based on:
 * - Container dimensions
 * - Canvas grid size
 * - Zoom level
 * - Whether showing grid labels
 */

import { useMemo } from 'react';
import { MINIMAP_CONSTANTS } from '../utils/constants';

/**
 * useMinimapCellSize - Calculate responsive cell size
 *
 * @param {Object} options
 * @param {number} options.containerWidth - Available width in pixels
 * @param {number} options.containerHeight - Available height in pixels
 * @param {number} options.rows - Number of grid rows
 * @param {number} options.cols - Number of grid columns
 * @param {number} options.zoom - Zoom percentage (50-200)
 * @param {boolean} options.showLabels - Whether grid labels are shown
 * @param {boolean} options.isFocused - Whether a VG is focused (larger cells)
 * @returns {Object} Cell sizing information
 */
export function useMinimapCellSize({
  containerWidth = 300,
  containerHeight = 300,
  rows = 4,
  cols = 4,
  zoom = 100,
  showLabels = true,
  isFocused = false,
} = {}) {
  return useMemo(() => {
    const { GRID_GAP, HEADER_SIZE, BASE_CELL_SIZE, FOCUSED_CELL_SIZE } = MINIMAP_CONSTANTS;

    // Account for labels if shown
    const labelOffset = showLabels ? HEADER_SIZE : 0;
    const availableWidth = containerWidth - labelOffset - 32; // 32 for padding
    const availableHeight = containerHeight - labelOffset - 32;

    // Calculate cell size that would fit all cells
    const maxCellWidth = (availableWidth - (cols - 1) * GRID_GAP) / cols;
    const maxCellHeight = (availableHeight - (rows - 1) * GRID_GAP) / rows;
    const fitCellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));

    // Base cell size depends on focus state
    const baseSize = isFocused ? FOCUSED_CELL_SIZE : BASE_CELL_SIZE;

    // Apply zoom to base size
    const zoomedSize = Math.floor(baseSize * (zoom / 100));

    // Use the zoomed size, but ensure minimum of 20px
    const cellSize = Math.max(20, zoomedSize);

    // Calculate total content dimensions
    const contentWidth = cols * cellSize + (cols - 1) * GRID_GAP;
    const contentHeight = rows * cellSize + (rows - 1) * GRID_GAP;

    // Determine if content overflows (needs panning)
    const overflowsWidth = contentWidth > availableWidth;
    const overflowsHeight = contentHeight > availableHeight;
    const needsPanning = overflowsWidth || overflowsHeight;

    // Calculate how much the content is scaled relative to fitting
    const scaleFactor = cellSize / fitCellSize;

    return {
      // Cell dimensions
      cellSize,
      gap: GRID_GAP,
      headerSize: HEADER_SIZE,

      // Content dimensions
      contentWidth,
      contentHeight,
      totalWidth: contentWidth + labelOffset,
      totalHeight: contentHeight + labelOffset,

      // Available space
      availableWidth,
      availableHeight,

      // Overflow state
      overflowsWidth,
      overflowsHeight,
      needsPanning,

      // Fit calculations
      fitCellSize,
      scaleFactor,

      // Whether content fits without scrolling
      fitsInView: !needsPanning,
    };
  }, [containerWidth, containerHeight, rows, cols, zoom, showLabels, isFocused]);
}

export default useMinimapCellSize;
