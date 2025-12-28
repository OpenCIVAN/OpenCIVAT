/**
 * @file CanvasSizeDisplay.jsx
 * @description Shows canvas dimensions, click to resize.
 * Prevents shrinking if it would affect existing placements.
 */

import React, { useMemo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { Dropdown } from '@UI/react/components/common/Dropdown';

import './CanvasSizeDisplay.scss';

/**
 * Calculate the minimum canvas size based on existing placements.
 * The minimum is determined by the furthest placement (row + rowSpan, col + colSpan).
 * @param {Array} placements - Array of placement objects with row, col, rowSpan, colSpan
 * @returns {{ minRows: number, minCols: number, affectedPlacements: Array }}
 */
function calculateMinCanvasSize(placements = []) {
    if (!placements || placements.length === 0) {
        return { minRows: 1, minCols: 1, affectedPlacements: [] };
    }

    let minRows = 1;
    let minCols = 1;

    for (const placement of placements) {
        const placementEndRow = placement.row + (placement.rowSpan || 1);
        const placementEndCol = placement.col + (placement.colSpan || 1);
        minRows = Math.max(minRows, placementEndRow);
        minCols = Math.max(minCols, placementEndCol);
    }

    return { minRows, minCols };
}

/**
 * Get placements that would be affected by shrinking to a new size.
 * @param {Array} placements - Current placements
 * @param {number} newRows - Proposed new row count
 * @param {number} newCols - Proposed new column count
 * @returns {Array} Placements that would be outside the new bounds
 */
function getAffectedPlacements(placements = [], newRows, newCols) {
    return placements.filter(placement => {
        const placementEndRow = placement.row + (placement.rowSpan || 1);
        const placementEndCol = placement.col + (placement.colSpan || 1);
        return placementEndRow > newRows || placementEndCol > newCols;
    });
}

/**
 * Canvas size display and control component.
 * Canvas can be any size (no upper limit) - viewport constrains what's visible.
 * Prevents shrinking that would affect existing placements.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.size] - Canvas size {cols, rows}
 * @param {Array} [props.placements] - Array of canvas placements to check against
 * @param {Function} [props.onChange] - Callback when size changes
 * @param {Function} [props.onShrinkBlocked] - Called when shrink is blocked due to placements
 */
export function CanvasSizeDisplay({
    size = { cols: 3, rows: 3 },
    placements = [],
    onChange,
    onShrinkBlocked,
}) {
    // Ensure we have valid numbers (protect against NaN)
    const safeRows = typeof size?.rows === 'number' && !isNaN(size.rows) ? size.rows : 3;
    const safeCols = typeof size?.cols === 'number' && !isNaN(size.cols) ? size.cols : 3;

    // Calculate minimum size based on placements
    const { minRows, minCols } = useMemo(
        () => calculateMinCanvasSize(placements),
        [placements]
    );

    // Determine if shrink buttons should be disabled
    const canShrinkRows = safeRows > minRows;
    const canShrinkCols = safeCols > minCols;

    // Count placements that would be affected if we try to shrink
    const rowShrinkAffected = useMemo(
        () => getAffectedPlacements(placements, safeRows - 1, safeCols),
        [placements, safeRows, safeCols]
    );
    const colShrinkAffected = useMemo(
        () => getAffectedPlacements(placements, safeRows, safeCols - 1),
        [placements, safeRows, safeCols]
    );

    const handleChange = (dimension, delta) => {
        const currentValue = dimension === 'rows' ? safeRows : safeCols;
        const newValue = Math.max(1, currentValue + delta);

        // Check if shrinking would affect placements
        if (delta < 0) {
            const affectedPlacements = dimension === 'rows'
                ? rowShrinkAffected
                : colShrinkAffected;

            if (affectedPlacements.length > 0) {
                // Notify about blocked shrink with affected placement info
                onShrinkBlocked?.({
                    dimension,
                    currentValue,
                    requestedValue: newValue,
                    affectedPlacements,
                    minAllowed: dimension === 'rows' ? minRows : minCols,
                });
                return; // Don't apply the change
            }
        }

        // No upper limit - canvas can be as large as needed
        onChange?.({
            rows: dimension === 'rows' ? newValue : safeRows,
            cols: dimension === 'cols' ? newValue : safeCols,
        });
    };

    return (
        <Dropdown
            trigger={
                <button className="canvas-size-display" type="button" title="Canvas size (total grid)">
                    <Icon name="dashboard" size={14} />
                    <span>
                        {safeRows} × {safeCols}
                    </span>
                </button>
            }
            placement="top"
        >
            <div className="canvas-size-display__popover">
                <div className="canvas-size-display__header">Canvas Size</div>
                <div className="canvas-size-display__row">
                    <span>Rows</span>
                    <div className="canvas-size-display__controls">
                        <button
                            onClick={() => handleChange('rows', -1)}
                            disabled={safeRows <= 1 || !canShrinkRows}
                            type="button"
                            aria-label="Decrease rows"
                            title={!canShrinkRows && safeRows > 1
                                ? `Cannot shrink: ${rowShrinkAffected.length} view(s) in row ${safeRows}`
                                : 'Decrease rows'
                            }
                        >
                            <Icon name="remove" size={14} />
                        </button>
                        <span>{safeRows}</span>
                        <button
                            onClick={() => handleChange('rows', 1)}
                            type="button"
                            aria-label="Increase rows"
                        >
                            <Icon name="add" size={14} />
                        </button>
                    </div>
                </div>
                <div className="canvas-size-display__row">
                    <span>Columns</span>
                    <div className="canvas-size-display__controls">
                        <button
                            onClick={() => handleChange('cols', -1)}
                            disabled={safeCols <= 1 || !canShrinkCols}
                            type="button"
                            aria-label="Decrease columns"
                            title={!canShrinkCols && safeCols > 1
                                ? `Cannot shrink: ${colShrinkAffected.length} view(s) in column ${safeCols}`
                                : 'Decrease columns'
                            }
                        >
                            <Icon name="remove" size={14} />
                        </button>
                        <span>{safeCols}</span>
                        <button
                            onClick={() => handleChange('cols', 1)}
                            type="button"
                            aria-label="Increase columns"
                        >
                            <Icon name="add" size={14} />
                        </button>
                    </div>
                </div>
                {/* Show hint when shrink is blocked */}
                {(!canShrinkRows || !canShrinkCols) && placements.length > 0 && (
                    <div className="canvas-size-display__hint">
                        <Icon name="info" size={12} />
                        <span>Close or move views to shrink further</span>
                    </div>
                )}
            </div>
        </Dropdown>
    );
}

export default CanvasSizeDisplay;