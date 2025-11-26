// src/ui/react/components/workspace/PositionGridPicker.jsx
// NEW FILE - Create this for positioning widgets

import React, { useState } from 'react';
import {
    CornerDownLeft,
    CornerDownRight,
    CornerUpLeft,
    CornerUpRight,
    Check
} from 'lucide-react';

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

    // Map icon strings to Lucide components
    const iconMap = {
        'corner-up-left': CornerUpLeft,
        'corner-up-right': CornerUpRight,
        'corner-down-left': CornerDownLeft,
        'corner-down-right': CornerDownRight,
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

                            // Get the icon component
                            const IconComponent = iconMap[position.icon] || CornerDownRight;
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
                                    <IconComponent size={16} className="position-grid-icon" />
                                    <span className="position-grid-label">{position.label}</span>

                                    {/* Check mark for active */}
                                    {isActive && (
                                        <div className="position-grid-check">
                                            <Check size={14} />
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