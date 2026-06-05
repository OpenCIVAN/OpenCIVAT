/**
 * @file useInternalCellLayout.js
 * @description Pure function to compute internal cell positions for a VG layout.
 *
 * Extracted from VGBlock.jsx so the same positioning math can be shared between
 * the minimap VGBlock (non-interactive) and the future VGFocusedView (interactive).
 */

/**
 * Compute positioned cell rectangles for a VG layout definition.
 *
 * Handles standard grids and the three merged patterns (top, right, left)
 * defined in LAYOUTS constants.
 *
 * @param {Object} layout - Layout definition from LAYOUTS constant
 * @param {number} layout.rows - Number of rows in grid
 * @param {number} layout.cols - Number of columns in grid
 * @param {number} layout.cells - Total cell count
 * @param {string} [layout.merged] - Merge pattern: 'top' | 'right' | 'left' | 'bottom'
 * @param {number} containerWidth - Available width in pixels (after padding subtracted by caller)
 * @param {number} containerHeight - Available height in pixels (after padding subtracted by caller)
 * @param {number} filledCount - Number of cells that contain a view
 * @param {Object} [options]
 * @param {number} [options.padding=0] - Inner padding applied to x/y offsets
 * @param {number} [options.gap=2] - Gap between internal cells
 * @returns {Array<{row: number, col: number, x: number, y: number, width: number, height: number, filled: boolean, isMerged: boolean, mergeSpan: {rows: number, cols: number}}>}
 */
export function getInternalCells(layout, containerWidth, containerHeight, filledCount, { padding = 0, gap = 2 } = {}) {
  const cells = [];
  const { rows, cols, merged } = layout;
  const cellWidth = (containerWidth - (cols - 1) * gap) / cols;
  const cellHeight = (containerHeight - (rows - 1) * gap) / rows;

  if (merged === 'top') {
    // Top row merged: one wide cell spanning both columns on top, two cells below
    cells.push({
      row: 0, col: 0,
      x: padding,
      y: padding,
      width: containerWidth,
      height: cellHeight,
      filled: filledCount > 0,
      isMerged: true,
      mergeSpan: { rows: 1, cols: 2 },
    });
    cells.push({
      row: 1, col: 0,
      x: padding,
      y: padding + cellHeight + gap,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 1,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
    cells.push({
      row: 1, col: 1,
      x: padding + cellWidth + gap,
      y: padding + cellHeight + gap,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 2,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
  } else if (merged === 'right') {
    // Right column merged: two cells on left, one tall cell spanning both rows on right
    cells.push({
      row: 0, col: 0,
      x: padding,
      y: padding,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 0,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
    cells.push({
      row: 1, col: 0,
      x: padding,
      y: padding + cellHeight + gap,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 1,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
    cells.push({
      row: 0, col: 1,
      x: padding + cellWidth + gap,
      y: padding,
      width: cellWidth,
      height: containerHeight,
      filled: filledCount > 2,
      isMerged: true,
      mergeSpan: { rows: 2, cols: 1 },
    });
  } else if (merged === 'left') {
    // Left column merged: one tall cell spanning both rows on left, two cells on right
    cells.push({
      row: 0, col: 0,
      x: padding,
      y: padding,
      width: cellWidth,
      height: containerHeight,
      filled: filledCount > 0,
      isMerged: true,
      mergeSpan: { rows: 2, cols: 1 },
    });
    cells.push({
      row: 0, col: 1,
      x: padding + cellWidth + gap,
      y: padding,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 1,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
    cells.push({
      row: 1, col: 1,
      x: padding + cellWidth + gap,
      y: padding + cellHeight + gap,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 2,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
  } else if (merged === 'bottom') {
    // Bottom row merged: two cells on top, one wide cell spanning both columns below
    cells.push({
      row: 0, col: 0,
      x: padding,
      y: padding,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 0,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
    cells.push({
      row: 0, col: 1,
      x: padding + cellWidth + gap,
      y: padding,
      width: cellWidth,
      height: cellHeight,
      filled: filledCount > 1,
      isMerged: false,
      mergeSpan: { rows: 1, cols: 1 },
    });
    cells.push({
      row: 1, col: 0,
      x: padding,
      y: padding + cellHeight + gap,
      width: containerWidth,
      height: cellHeight,
      filled: filledCount > 2,
      isMerged: true,
      mergeSpan: { rows: 1, cols: 2 },
    });
  } else {
    // Standard grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx < layout.cells) {
          cells.push({
            row: r, col: c,
            x: padding + c * (cellWidth + gap),
            y: padding + r * (cellHeight + gap),
            width: cellWidth,
            height: cellHeight,
            filled: idx < filledCount,
            isMerged: false,
            mergeSpan: { rows: 1, cols: 1 },
          });
        }
      }
    }
  }

  return cells;
}
