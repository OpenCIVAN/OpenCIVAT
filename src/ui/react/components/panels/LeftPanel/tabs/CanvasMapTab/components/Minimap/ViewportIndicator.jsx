/**
 * @file ViewportIndicator.jsx
 * @description Viewport overlay on minimap showing user's viewport area
 */

import React, { memo } from 'react';
import './ViewportIndicator.scss';

/**
 * ViewportIndicator - Viewport overlay on minimap
 *
 * @param {Object} props
 * @param {Object} props.viewport - Viewport data
 * @param {number} props.cellSize - Size of each cell in pixels
 * @param {boolean} props.isSelected - Whether this viewport is selected
 */
export const ViewportIndicator = memo(function ViewportIndicator({
  viewport,
  cellSize,
  isSelected,
}) {
  const { position, size, isPrimary } = viewport;
  const gap = 4;

  return (
    <div
      className={`viewport-indicator
        ${isSelected ? 'viewport-indicator--selected' : ''}
        ${isPrimary ? 'viewport-indicator--primary' : ''}`}
      style={{
        gridRow: `${position.row + 1} / span ${size.rows}`,
        gridColumn: `${position.col + 1} / span ${size.cols}`,
        '--vp-width': `${size.cols * cellSize + (size.cols - 1) * gap}px`,
        '--vp-height': `${size.rows * cellSize + (size.rows - 1) * gap}px`,
      }}
      title={`${viewport.name} viewport`}
    >
      <span className="viewport-indicator__label">{viewport.name}</span>
    </div>
  );
});

export default ViewportIndicator;
