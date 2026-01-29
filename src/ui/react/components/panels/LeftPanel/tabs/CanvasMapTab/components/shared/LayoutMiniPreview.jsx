/**
 * @file LayoutMiniPreview.jsx
 * @description Tiny pixel-art layout preview for ViewGroups (max 18x18px)
 *
 * Renders a miniature representation of a VG's internal layout:
 * - Filled cells = views present
 * - Empty cells = available slots
 * - Supports merged layouts (1+2, 2+1)
 */

import React, { memo, useMemo } from 'react';
import { LAYOUTS } from '../../CanvasMapTab.logic';
import './LayoutMiniPreview.scss';

/**
 * LayoutMiniPreview - Pixel art layout representation
 *
 * @param {Object} props
 * @param {string} props.layoutId - Layout identifier ('single', '2x2', '1+2', etc.)
 * @param {string} props.color - VG color for filled cells
 * @param {number} props.viewCount - Number of views to show as filled
 * @param {number} [props.size=16] - Total size in pixels
 */
export const LayoutMiniPreview = memo(function LayoutMiniPreview({
  layoutId,
  color,
  viewCount,
  size = 16,
}) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.single;
  const gap = 1;

  /**
   * Calculate cell positions based on layout type
   */
  const cells = useMemo(() => {
    const result = [];
    const { rows, cols, merged, cells: totalCells } = layout;

    // Calculate cell dimensions
    const cellWidth = (size - (cols - 1) * gap) / cols;
    const cellHeight = (size - (rows - 1) * gap) / rows;

    // Handle merged layouts specially
    if (merged === 'top') {
      // 1+2 layout: top spans both columns, bottom has two cells
      // Top cell (spans full width)
      result.push({
        x: 0,
        y: 0,
        width: size,
        height: cellHeight,
        filled: viewCount > 0,
      });
      // Bottom left
      result.push({
        x: 0,
        y: cellHeight + gap,
        width: cellWidth,
        height: cellHeight,
        filled: viewCount > 1,
      });
      // Bottom right
      result.push({
        x: cellWidth + gap,
        y: cellHeight + gap,
        width: cellWidth,
        height: cellHeight,
        filled: viewCount > 2,
      });
    } else if (merged === 'right') {
      // 2+1 layout: left has two cells, right spans both rows
      // Left top
      result.push({
        x: 0,
        y: 0,
        width: cellWidth,
        height: cellHeight,
        filled: viewCount > 0,
      });
      // Left bottom
      result.push({
        x: 0,
        y: cellHeight + gap,
        width: cellWidth,
        height: cellHeight,
        filled: viewCount > 1,
      });
      // Right (spans full height)
      result.push({
        x: cellWidth + gap,
        y: 0,
        width: cellWidth,
        height: size,
        filled: viewCount > 2,
      });
    } else {
      // Standard grid layout
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellIndex = r * cols + c;
          if (cellIndex < totalCells) {
            result.push({
              x: c * (cellWidth + gap),
              y: r * (cellHeight + gap),
              width: cellWidth,
              height: cellHeight,
              filled: cellIndex < viewCount,
            });
          }
        }
      }
    }

    return result;
  }, [layout, size, viewCount, gap]);

  return (
    <div
      className="layout-mini-preview"
      style={{
        width: size,
        height: size,
        '--preview-color': color,
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`layout-mini-preview__cell ${cell.filled ? 'layout-mini-preview__cell--filled' : ''}`}
          style={{
            left: cell.x,
            top: cell.y,
            width: cell.width,
            height: cell.height,
          }}
        />
      ))}
    </div>
  );
});

export default LayoutMiniPreview;
