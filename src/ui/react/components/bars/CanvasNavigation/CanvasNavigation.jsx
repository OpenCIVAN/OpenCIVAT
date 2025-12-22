/**
 * @file CanvasNavigation.jsx
 * @description Canvas viewport navigation controls.
 */

import React from 'react';
import { IconHome, IconBookmark, IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight } from '@UI/react/components/common/Icon';
import { Tooltip } from '@UI/react/components/common/Tooltip';

import './CanvasNavigation.scss';

/**
 * Canvas navigation component with home, bookmark, and d-pad controls.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.position] - Current position {col, row}
 * @param {boolean} [props.isAtOrigin] - Whether at origin position
 * @param {Function} [props.onHome] - Callback to navigate home
 * @param {Function} [props.onMove] - Callback to move direction ('up', 'down', 'left', 'right')
 * @param {Function} [props.onBookmark] - Callback to open bookmarks
 */
export function CanvasNavigation({
    position = { col: 0, row: 0 },
    isAtOrigin = true,
    onHome,
    onMove,
    onBookmark,
}) {
    return (
        <div className="canvas-navigation" role="group" aria-label="Canvas navigation">
            {/* Home button */}
            <Tooltip content="Go to origin (0,0)">
                <button
                    className={`canvas-navigation__btn ${isAtOrigin ? 'at-origin' : ''
                        }`}
                    onClick={onHome}
                    data-color={isAtOrigin ? 'amber' : undefined}
                    type="button"
                    aria-label="Go to origin"
                >
                    <IconHome sx={{ fontSize: 16 }} />
                </button>
            </Tooltip>

            {/* Bookmark button */}
            <Tooltip content="Saved positions">
                <button
                    className="canvas-navigation__btn"
                    onClick={onBookmark}
                    type="button"
                    aria-label="Saved positions"
                >
                    <IconBookmark sx={{ fontSize: 16 }} />
                </button>
            </Tooltip>

            {/* D-pad */}
            <div className="canvas-navigation__dpad">
                <button
                    className="canvas-navigation__dpad-btn canvas-navigation__dpad-btn--up"
                    onClick={() => onMove?.('up')}
                    title="Move up"
                    type="button"
                    aria-label="Move up"
                >
                    <IconChevronUp sx={{ fontSize: 12 }} />
                </button>
                <div className="canvas-navigation__dpad-row">
                    <button
                        className="canvas-navigation__dpad-btn"
                        onClick={() => onMove?.('left')}
                        title="Move left"
                        type="button"
                        aria-label="Move left"
                    >
                        <IconChevronLeft sx={{ fontSize: 12 }} />
                    </button>
                    <button
                        className="canvas-navigation__dpad-btn"
                        onClick={() => onMove?.('right')}
                        title="Move right"
                        type="button"
                        aria-label="Move right"
                    >
                        <IconChevronRight sx={{ fontSize: 12 }} />
                    </button>
                </div>
                <button
                    className="canvas-navigation__dpad-btn canvas-navigation__dpad-btn--down"
                    onClick={() => onMove?.('down')}
                    title="Move down"
                    type="button"
                    aria-label="Move down"
                >
                    <IconChevronDown sx={{ fontSize: 12 }} />
                </button>
            </div>

            {/* Position display */}
            <span className="canvas-navigation__position">
                {position.col}, {position.row}
            </span>
        </div>
    );
}

export default CanvasNavigation;