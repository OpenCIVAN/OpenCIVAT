/**
 * @file LayoutMiniPreview.jsx
 * @description Small grid visualization of VG layout structure
 *
 * Renders a miniature CSS grid showing the layout pattern:
 * - Filled cells colored with VG's color at 40% opacity
 * - Empty cells show subtle glass background
 * - Border matches VG color at 40% opacity
 * - Handles merged cells (spans) for complex layouts
 */

import React, { memo, useMemo } from 'react';

/**
 * Predefined layout patterns
 * Each pattern defines which cells are filled and how they span
 */
const LAYOUT_PATTERNS = {
  single: { rows: 1, cols: 1, cells: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }] },
  'side-by-side': {
    rows: 1,
    cols: 2,
    cells: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  stacked: {
    rows: 2,
    cols: 1,
    cells: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
    ],
  },
  '2x2': {
    rows: 2,
    cols: 2,
    cells: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  '1+2': {
    rows: 2,
    cols: 2,
    cells: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 2 }, // Top spans both columns
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  '2+1': {
    rows: 2,
    cols: 2,
    cells: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 2, colSpan: 1 }, // Right spans both rows
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
    ],
  },
  '3x3': {
    rows: 3,
    cols: 3,
    cells: Array.from({ length: 9 }, (_, i) => ({
      row: Math.floor(i / 3),
      col: i % 3,
      rowSpan: 1,
      colSpan: 1,
    })),
  },
};

/**
 * LayoutMiniPreview - Small grid visualization of layout structure
 *
 * @param {Object} props
 * @param {string} [props.layoutId] - Layout pattern identifier
 * @param {number} [props.rows] - Grid rows (if no layoutId)
 * @param {number} [props.cols] - Grid columns (if no layoutId)
 * @param {number} [props.viewCount] - Number of views in VG (determines filled cells)
 * @param {string} props.color - VG theme color
 * @param {number} [props.size=28] - Size of the preview in pixels
 * @param {Array} [props.cells] - Custom cell definitions (overrides layoutId)
 */
export const LayoutMiniPreview = memo(function LayoutMiniPreview({
  layoutId,
  rows: propRows,
  cols: propCols,
  viewCount = 0,
  color = 'var(--accent-blue)',
  size = 28,
  cells: propCells,
}) {
  // Determine layout from layoutId or props
  const layout = useMemo(() => {
    if (propCells) {
      return {
        rows: propRows || 1,
        cols: propCols || 1,
        cells: propCells,
      };
    }

    if (layoutId && LAYOUT_PATTERNS[layoutId]) {
      return LAYOUT_PATTERNS[layoutId];
    }

    // Generate a simple grid from rows/cols
    const rows = propRows || 1;
    const cols = propCols || 1;
    const totalCells = rows * cols;
    const filledCount = viewCount || totalCells;

    return {
      rows,
      cols,
      cells: Array.from({ length: Math.min(filledCount, totalCells) }, (_, i) => ({
        row: Math.floor(i / cols),
        col: i % cols,
        rowSpan: 1,
        colSpan: 1,
      })),
    };
  }, [layoutId, propRows, propCols, propCells, viewCount]);

  const { rows, cols, cells } = layout;
  const cellSize = Math.floor(size / Math.max(rows, cols));
  const gap = 1;

  return (
    <div
      className="layout-mini-preview"
      style={{
        '--preview-color': color,
        '--cell-size': `${cellSize}px`,
        '--gap': `${gap}px`,
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gap: `${gap}px`,
        width: cols * cellSize + (cols - 1) * gap,
        height: rows * cellSize + (rows - 1) * gap,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        borderRadius: '2px',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      aria-label={`${rows}×${cols} layout with ${cells.length} views`}
    >
      {cells.map((cell, index) => (
        <div
          key={`${cell.row}-${cell.col}-${index}`}
          className="layout-mini-preview__cell"
          style={{
            gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
            gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
            background: `color-mix(in srgb, ${color} 40%, transparent)`,
            borderRadius: '1px',
          }}
        />
      ))}
    </div>
  );
});

export default LayoutMiniPreview;
