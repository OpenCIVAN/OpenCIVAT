/**
 * @file CanvasSizeDisplay.jsx
 * @description Shows canvas dimensions, click to resize.
 */

import React from 'react';
import { IconCanvasSize, IconAdd, IconRemove } from '@UI/react/components/common/Icon';
import { Dropdown } from '@UI/react/components/common/Dropdown';

import './CanvasSizeDisplay.scss';

/**
 * Canvas size display and control component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.size] - Canvas size {cols, rows}
 * @param {Function} [props.onChange] - Callback when size changes
 */
export function CanvasSizeDisplay({ size = { cols: 2, rows: 2 }, onChange }) {
    const handleChange = (dimension, delta) => {
        const newSize = { ...size };
        newSize[dimension] = Math.max(1, Math.min(10, newSize[dimension] + delta));
        onChange?.(newSize);
    };

    return (
        <Dropdown
            trigger={
                <button className="canvas-size-display" type="button" title="Canvas size">
                    <IconCanvasSize sx={{ fontSize: 14 }} />
                    <span>
                        {size.cols} × {size.rows}
                    </span>
                </button>
            }
            placement="top"
        >
            <div className="canvas-size-display__popover">
                <div className="canvas-size-display__row">
                    <span>Columns</span>
                    <div className="canvas-size-display__controls">
                        <button
                            onClick={() => handleChange('cols', -1)}
                            disabled={size.cols <= 1}
                            type="button"
                            aria-label="Decrease columns"
                        >
                            <IconRemove sx={{ fontSize: 14 }} />
                        </button>
                        <span>{size.cols}</span>
                        <button
                            onClick={() => handleChange('cols', 1)}
                            disabled={size.cols >= 10}
                            type="button"
                            aria-label="Increase columns"
                        >
                            <IconAdd sx={{ fontSize: 14 }} />
                        </button>
                    </div>
                </div>
                <div className="canvas-size-display__row">
                    <span>Rows</span>
                    <div className="canvas-size-display__controls">
                        <button
                            onClick={() => handleChange('rows', -1)}
                            disabled={size.rows <= 1}
                            type="button"
                            aria-label="Decrease rows"
                        >
                            <IconRemove sx={{ fontSize: 14 }} />
                        </button>
                        <span>{size.rows}</span>
                        <button
                            onClick={() => handleChange('rows', 1)}
                            disabled={size.rows >= 10}
                            type="button"
                            aria-label="Increase rows"
                        >
                            <IconAdd sx={{ fontSize: 14 }} />
                        </button>
                    </div>
                </div>
            </div>
        </Dropdown>
    );
}

export default CanvasSizeDisplay;