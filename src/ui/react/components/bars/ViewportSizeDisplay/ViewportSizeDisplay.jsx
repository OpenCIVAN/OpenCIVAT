/**
 * @file ViewportSizeDisplay.jsx
 * @description Shows viewport dimensions (visible grid cells), click to resize.
 * Viewport is constrained to 1-10 in each dimension.
 */

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { Dropdown } from '@UI/react/components/common/Dropdown';

import './ViewportSizeDisplay.scss';

/**
 * Viewport size display and control component.
 * Viewport determines how many cells are visible at once (1-10 max).
 *
 * @param {Object} props - Component props
 * @param {Object} [props.size] - Viewport size {cols, rows}
 * @param {Function} [props.onChange] - Callback when size changes
 */
export function ViewportSizeDisplay({ size = { cols: 3, rows: 3 }, onChange }) {
    const handleChange = (dimension, delta) => {
        const newSize = { ...size };
        // Viewport is constrained to 1-10 cells visible
        newSize[dimension] = Math.max(1, Math.min(10, newSize[dimension] + delta));
        onChange?.(newSize);
    };

    return (
        <Dropdown
            trigger={
                <button className="viewport-size-display" type="button" title="Viewport size (visible cells)">
                    <Icon name="aspect_ratio" size={14} />
                    <span>
                        {size.rows} × {size.cols}
                    </span>
                </button>
            }
            placement="top"
        >
            <div className="viewport-size-display__popover">
                <div className="viewport-size-display__header">Viewport Size</div>
                <div className="viewport-size-display__row">
                    <span>Rows</span>
                    <div className="viewport-size-display__controls">
                        <button
                            onClick={() => handleChange('rows', -1)}
                            disabled={size.rows <= 1}
                            type="button"
                            aria-label="Decrease rows"
                        >
                            <Icon name="remove" size={14} />
                        </button>
                        <span>{size.rows}</span>
                        <button
                            onClick={() => handleChange('rows', 1)}
                            disabled={size.rows >= 10}
                            type="button"
                            aria-label="Increase rows"
                        >
                            <Icon name="add" size={14} />
                        </button>
                    </div>
                </div>
                <div className="viewport-size-display__row">
                    <span>Columns</span>
                    <div className="viewport-size-display__controls">
                        <button
                            onClick={() => handleChange('cols', -1)}
                            disabled={size.cols <= 1}
                            type="button"
                            aria-label="Decrease columns"
                        >
                            <Icon name="remove" size={14} />
                        </button>
                        <span>{size.cols}</span>
                        <button
                            onClick={() => handleChange('cols', 1)}
                            disabled={size.cols >= 10}
                            type="button"
                            aria-label="Increase columns"
                        >
                            <Icon name="add" size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </Dropdown>
    );
}

export default ViewportSizeDisplay;
