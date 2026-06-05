/**
 * @file LayoutThumbnail.jsx
 * @description Mini grid preview of a layout definition.
 * Renders a CSS grid with cells matching the layout's rows/cols/merged pattern.
 */

import React, { memo } from 'react';
import './LayoutThumbnail.scss';

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 48,
};

/**
 * Build the array of cell descriptors for a layout definition.
 * Each cell has { key, gridColumn?, gridRow? } for span overrides.
 */
function buildCells(layout) {
  if (!layout) return [];
  const { rows, cols, merged } = layout;
  const cells = [];

  if (merged === 'left') {
    // First cell spans 2 rows (left column)
    cells.push({ key: 'merged-left', gridRow: 'span 2' });
    // Remaining cells fill the right column
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        cells.push({ key: `${r}-${c}` });
      }
    }
  } else if (merged === 'right') {
    // Right column last cell spans 2 rows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        cells.push({ key: `${r}-${c}` });
      }
      if (r === 0) {
        cells.push({ key: 'merged-right', gridRow: 'span 2' });
      }
    }
  } else if (merged === 'top') {
    // First cell spans 2 columns (top row)
    cells.push({ key: 'merged-top', gridColumn: 'span 2' });
    // Remaining cells fill below
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ key: `${r}-${c}` });
      }
    }
  } else if (merged === 'bottom') {
    // Bottom row merged across all columns
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ key: `${r}-${c}` });
      }
    }
    cells.push({ key: 'merged-bottom', gridColumn: 'span 2' });
  } else {
    // Standard grid: rows × cols
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ key: `${r}-${c}` });
      }
    }
  }

  return cells;
}

/**
 * LayoutThumbnail - mini grid preview of a layout
 *
 * @param {Object} props
 * @param {Object} props.layout - LAYOUTS entry (rows, cols, cells, merged?)
 * @param {'sm'|'md'|'lg'} [props.size='sm'] - Thumbnail size
 * @param {boolean} [props.highlighted=false] - Whether this layout is active/current
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS class
 */
export const LayoutThumbnail = memo(function LayoutThumbnail({
  layout,
  size = 'sm',
  highlighted = false,
  onClick,
  className = '',
}) {
  if (!layout) return null;

  const px = SIZE_MAP[size] || SIZE_MAP.sm;
  const cellDescriptors = buildCells(layout);

  return (
    <button
      type="button"
      className={`layout-thumbnail layout-thumbnail--${size} ${highlighted ? 'layout-thumbnail--highlighted' : ''} ${className}`}
      style={{
        width: px,
        height: px,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
      }}
      onClick={onClick}
      tabIndex={onClick ? 0 : -1}
    >
      {cellDescriptors.map((cell) => (
        <div
          key={cell.key}
          className="layout-thumbnail__cell"
          style={{
            ...(cell.gridColumn && { gridColumn: cell.gridColumn }),
            ...(cell.gridRow && { gridRow: cell.gridRow }),
          }}
        />
      ))}
    </button>
  );
});

export default LayoutThumbnail;
