/**
 * ViewportIndicator Component
 *
 * Shows the current visible area in the grid preview.
 * The indicator size reflects how many cells are visible (viewportSize).
 *
 * @param {Object} viewport - { row, col, zoom } - current viewport position
 * @param {Object} gridSize - { rows, cols } - total canvas dimensions
 * @param {Object} viewportSize - { rows, cols } - how many cells are visible (optional, defaults to 1x1)
 */

import { memo, useMemo } from 'react';
import './ViewportIndicator.scss';

export const ViewportIndicator = memo(function ViewportIndicator({
    viewport,
    gridSize,
    viewportSize = { rows: 1, cols: 1 },
}) {
    // Calculate viewport rectangle position and size
    // Size is based on viewportSize (how many cells visible)
    const indicatorStyle = useMemo(() => {
        const cellWidth = 100 / gridSize.cols;
        const cellHeight = 100 / gridSize.rows;

        // Clamp viewportSize to not exceed grid bounds
        const visibleCols = Math.min(viewportSize.cols, gridSize.cols - viewport.col);
        const visibleRows = Math.min(viewportSize.rows, gridSize.rows - viewport.row);

        return {
            left: `${viewport.col * cellWidth}%`,
            top: `${viewport.row * cellHeight}%`,
            width: `${visibleCols * cellWidth}%`,
            height: `${visibleRows * cellHeight}%`,
        };
    }, [viewport, gridSize, viewportSize]);

    return (
        <div
            className="viewport-indicator"
            style={indicatorStyle}
            aria-hidden="true"
        >
            <div className="viewport-indicator__border" />
        </div>
    );
});

export default ViewportIndicator;