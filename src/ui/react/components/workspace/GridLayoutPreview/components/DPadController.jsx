/**
 * DPadController Component
 *
 * Floating navigation controller for grid preview.
 * Transparent by default, shows outline on hover.
 * Disables direction buttons at grid boundaries.
 *
 * @param {function} onNavigate - Callback for direction navigation (up, down, left, right)
 * @param {function} onHome - Callback for home button
 * @param {Object} viewport - Current viewport { row, col }
 * @param {Object} gridSize - Grid dimensions { rows, cols }
 * @param {string} className - Additional CSS class
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import './DPadController.scss';

export const DPadController = memo(function DPadController({
    onNavigate,
    onHome,
    viewport = { row: 0, col: 0 },
    gridSize = { rows: 4, cols: 4 },
    className = '',
}) {
    const [isHovered, setIsHovered] = useState(false);

    // Calculate boundary states
    const boundaries = useMemo(() => ({
        atTop: viewport.row <= 0,
        atBottom: viewport.row >= gridSize.rows - 1,
        atLeft: viewport.col <= 0,
        atRight: viewport.col >= gridSize.cols - 1,
    }), [viewport.row, viewport.col, gridSize.rows, gridSize.cols]);

    const handleNavigate = useCallback((direction) => {
        // Prevent navigation at boundaries
        if (direction === 'up' && boundaries.atTop) return;
        if (direction === 'down' && boundaries.atBottom) return;
        if (direction === 'left' && boundaries.atLeft) return;
        if (direction === 'right' && boundaries.atRight) return;

        onNavigate?.(direction);
    }, [onNavigate, boundaries]);

    return (
        <div
            className={`dpad-controller ${isHovered ? 'dpad-controller--hovered' : ''} ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Up */}
            <button
                className={`dpad-controller__btn dpad-controller__btn--up ${boundaries.atTop ? 'dpad-controller__btn--disabled' : ''}`}
                onClick={() => handleNavigate('up')}
                disabled={boundaries.atTop}
                aria-label="Navigate up"
            >
                <Icon name="chevronUp" size={14} />
            </button>

            {/* Left */}
            <button
                className={`dpad-controller__btn dpad-controller__btn--left ${boundaries.atLeft ? 'dpad-controller__btn--disabled' : ''}`}
                onClick={() => handleNavigate('left')}
                disabled={boundaries.atLeft}
                aria-label="Navigate left"
            >
                <Icon name="chevronLeft" size={14} />
            </button>

            {/* Center/Home */}
            <button
                className="dpad-controller__btn dpad-controller__btn--center"
                onClick={onHome}
                aria-label="Go to home"
            >
                <Icon name="home" size={12} />
            </button>

            {/* Right */}
            <button
                className={`dpad-controller__btn dpad-controller__btn--right ${boundaries.atRight ? 'dpad-controller__btn--disabled' : ''}`}
                onClick={() => handleNavigate('right')}
                disabled={boundaries.atRight}
                aria-label="Navigate right"
            >
                <Icon name="chevronRight" size={14} />
            </button>

            {/* Down */}
            <button
                className={`dpad-controller__btn dpad-controller__btn--down ${boundaries.atBottom ? 'dpad-controller__btn--disabled' : ''}`}
                onClick={() => handleNavigate('down')}
                disabled={boundaries.atBottom}
                aria-label="Navigate down"
            >
                <Icon name="chevronDown" size={14} />
            </button>
        </div>
    );
});

export default DPadController;