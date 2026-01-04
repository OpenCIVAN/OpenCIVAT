// src/ui/react/components/workspace/PositionGridPicker.jsx
// NEW FILE - Create this for positioning widgets

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * PositionGridPicker
 *
 * 2x2 grid for selecting corner positions.
 * Used for orientation widget, overlays, etc.
 *
 * Grid layout:
 * ┌──────────┬──────────┐
 * │ TOP_LEFT │ TOP_RIGHT│
 * ├──────────┼──────────┤
 * │BOTTOM_LEFT│BOTTOM_RIGHT│
 * └──────────┴──────────┘
 */
export function PositionGridPicker({
    positions = [],          // Array of position objects
    currentPosition = null,  // Currently selected position
    disabled = false,
    onPositionChange,        // Callback when position selected
}) {
    const [hoveredCell, setHoveredCell] = useState(null);

    // Map icon strings to icon names
    const iconMap = {
        'corner-up-left': 'cornerUpLeft',
        'corner-up-right': 'cornerUpRight',
        'corner-down-left': 'cornerDownLeft',
        'corner-down-right': 'cornerDownRight',
    };

    // Build map for easy lookup
    const positionsMap = positions.reduce((acc, pos) => {
        acc[pos.id] = pos;
        return acc;
    }, {});

    // Define 2x2 grid layout
    const grid = [
        [positionsMap.TOP_LEFT, positionsMap.TOP_RIGHT],       // Top row
        [positionsMap.BOTTOM_LEFT, positionsMap.BOTTOM_RIGHT], // Bottom row
    ];

    const handleCellClick = (position) => {
        if (disabled || !position) return;
        if (onPositionChange) {
            onPositionChange(position.id);
        }
    };

    return (
        <div className="position-grid-container">
            <div
                className="position-grid"
                style={{ opacity: disabled ? 0.4 : 1 }}
            >
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="position-grid-row">
                        {row.map((position, colIndex) => {
                            if (!position) {
                                return (
                                    <div
                                        key={`empty-${rowIndex}-${colIndex}`}
                                        className="position-grid-cell empty"
                                    />
                                );
                            }

                            // Get the icon name
                            const iconName = iconMap[position.icon] || 'cornerDownRight';
                            const isActive = currentPosition === position.id;
                            const isHovered = hoveredCell === position.id;

                            return (
                                <div
                                    key={position.id}
                                    className={`position-grid-cell ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                                    onClick={() => handleCellClick(position)}
                                    onMouseEnter={() => !disabled && setHoveredCell(position.id)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    title={position.label}
                                >
                                    <Icon name={iconName} size={16} className="position-grid-icon" />
                                    <span className="position-grid-label">{position.label}</span>

                                    {/* Check mark for active */}
                                    {isActive && (
                                        <div className="position-grid-check">
                                            <Icon name="check" size={14} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Show hint on hover */}
            {hoveredCell && (
                <div className="position-grid-hint">
                    {hoveredCell.toLowerCase().replace('_', ' ')}
                </div>
            )}
        </div>
    );
}