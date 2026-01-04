/**
 * @file ViewportSizeDisplay.jsx
 * @description Shows viewport dimensions (visible grid cells), click to resize.
 * Viewport is constrained to canvas dimensions (or max 10 if canvas not provided).
 */

import React from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { Dropdown } from '@UI/react/components/atoms/Dropdown';

import './ViewportSizeDisplay.scss';

/**
 * Viewport size display and control component.
 * Viewport determines how many cells are visible at once.
 * Constrained to canvas dimensions when provided, otherwise max 10.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.size] - Viewport size {cols, rows}
 * @param {Object} [props.maxSize] - Maximum size {cols, rows} - typically canvas dimensions
 * @param {Function} [props.onChange] - Callback when size changes
 */
export function ViewportSizeDisplay({ size = { cols: 3, rows: 3 }, maxSize = { rows: 10, cols: 10 }, onChange }) {
    // Ensure we have valid numbers (protect against NaN)
    const safeRows = typeof size?.rows === 'number' && !isNaN(size.rows) ? size.rows : 3;
    const safeCols = typeof size?.cols === 'number' && !isNaN(size.cols) ? size.cols : 3;
    const safeMaxRows = typeof maxSize?.rows === 'number' && !isNaN(maxSize.rows) ? maxSize.rows : 10;
    const safeMaxCols = typeof maxSize?.cols === 'number' && !isNaN(maxSize.cols) ? maxSize.cols : 10;

    const handleChange = (dimension, delta) => {
        const currentValue = dimension === 'rows' ? safeRows : safeCols;
        const max = dimension === 'rows' ? safeMaxRows : safeMaxCols;
        const newValue = Math.max(1, Math.min(max, currentValue + delta));
        onChange?.({
            rows: dimension === 'rows' ? newValue : safeRows,
            cols: dimension === 'cols' ? newValue : safeCols,
        });
    };

    return (
        <Dropdown
            trigger={
                <LabeledButton
                    icon="aspectRatio"
                    label={`${safeRows} × ${safeCols}`}
                    size="sm"
                    variant="ghost"
                    className="viewport-size-display"
                />
            }
            placement="top"
        >
            <div className="viewport-size-display__popover">
                <div className="viewport-size-display__header">Viewport Size</div>
                <div className="viewport-size-display__row">
                    <span>Rows</span>
                    <div className="viewport-size-display__controls">
                        <IconButton
                            icon="remove"
                            onClick={() => handleChange('rows', -1)}
                            disabled={safeRows <= 1}
                            tooltip="Decrease rows"
                            size="xs"
                            variant="ghost"
                        />
                        <span>{safeRows}</span>
                        <IconButton
                            icon="add"
                            onClick={() => handleChange('rows', 1)}
                            disabled={safeRows >= safeMaxRows}
                            tooltip="Increase rows"
                            size="xs"
                            variant="ghost"
                        />
                    </div>
                </div>
                <div className="viewport-size-display__row">
                    <span>Columns</span>
                    <div className="viewport-size-display__controls">
                        <IconButton
                            icon="remove"
                            onClick={() => handleChange('cols', -1)}
                            disabled={safeCols <= 1}
                            tooltip="Decrease columns"
                            size="xs"
                            variant="ghost"
                        />
                        <span>{safeCols}</span>
                        <IconButton
                            icon="add"
                            onClick={() => handleChange('cols', 1)}
                            disabled={safeCols >= safeMaxCols}
                            tooltip="Increase columns"
                            size="xs"
                            variant="ghost"
                        />
                    </div>
                </div>
            </div>
        </Dropdown>
    );
}

export default ViewportSizeDisplay;
