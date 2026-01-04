/**
 * DPadController Component
 *
 * Floating navigation controller for grid preview.
 * Transparent by default, shows outline on hover.
 * Disables direction buttons at grid boundaries.
 *
 * Uses DirectionalButton molecule for consistent styling.
 *
 * @param {function} onNavigate - Callback for direction navigation (up, down, left, right)
 * @param {function} onHome - Callback for home button
 * @param {Object} viewport - Current viewport { row, col }
 * @param {Object} gridSize - Grid dimensions { rows, cols }
 * @param {string} className - Additional CSS class
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { DirectionalButton } from '@UI/react/components/molecules';
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
            <DirectionalButton
                direction="up"
                onClick={() => handleNavigate('up')}
                disabled={boundaries.atTop}
                size="sm"
                className="dpad-controller__btn dpad-controller__btn--up"
            />
            <DirectionalButton
                direction="left"
                onClick={() => handleNavigate('left')}
                disabled={boundaries.atLeft}
                size="sm"
                className="dpad-controller__btn dpad-controller__btn--left"
            />
            <DirectionalButton
                direction="center"
                onClick={onHome}
                size="sm"
                className="dpad-controller__btn dpad-controller__btn--center"
            />
            <DirectionalButton
                direction="right"
                onClick={() => handleNavigate('right')}
                disabled={boundaries.atRight}
                size="sm"
                className="dpad-controller__btn dpad-controller__btn--right"
            />
            <DirectionalButton
                direction="down"
                onClick={() => handleNavigate('down')}
                disabled={boundaries.atBottom}
                size="sm"
                className="dpad-controller__btn dpad-controller__btn--down"
            />
        </div>
    );
});

export default DPadController;