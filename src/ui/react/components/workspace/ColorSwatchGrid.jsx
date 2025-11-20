// src/ui/react/components/workspace/ColorSwatchGrid.jsx
// Visual color swatch grid for colormap selection

import React, { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * ColorSwatchGrid
 * 
 * Visual grid of color swatches instead of text dropdown.
 * Much more intuitive - see the colors, not just names!
 * 
 * Grid layout:
 * ┌────────┬────────┬────────┐
 * │Rainbow │Viridis │ Plasma │
 * ├────────┼────────┼────────┤
 * │  Hot   │  Cool  │Grayscale│
 * ├────────┼────────┼────────┤
 * │ Turbo  │ Magma  │Inferno │
 * └────────┴────────┴────────┘
 */
export function ColorSwatchGrid({
    currentColormap = null,
    onColormapChange,
    disabled = false,
}) {
    const [hoveredSwatch, setHoveredSwatch] = useState(null);

    // Define colormaps with gradients
    const colormaps = [
        {
            id: 'rainbow',
            name: 'Rainbow',
            gradient: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)',
        },
        {
            id: 'viridis',
            name: 'Viridis',
            gradient: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde724)',
        },
        {
            id: 'plasma',
            name: 'Plasma',
            gradient: 'linear-gradient(90deg, #0d0887, #7e03a8, #cc4778, #f89540, #f0f921)',
        },
        {
            id: 'hot',
            name: 'Hot',
            gradient: 'linear-gradient(90deg, #000000, #ff0000, #ffff00, #ffffff)',
        },
        {
            id: 'cool',
            name: 'Cool',
            gradient: 'linear-gradient(90deg, #00ffff, #0000ff, #ff00ff)',
        },
        {
            id: 'grayscale',
            name: 'Grayscale',
            gradient: 'linear-gradient(90deg, #000000, #ffffff)',
        },
        {
            id: 'turbo',
            name: 'Turbo',
            gradient: 'linear-gradient(90deg, #30123b, #1ae4b6, #faba39, #7a0403)',
        },
        {
            id: 'magma',
            name: 'Magma',
            gradient: 'linear-gradient(90deg, #000004, #731f57, #f1605d, #fcfdbf)',
        },
        {
            id: 'inferno',
            name: 'Inferno',
            gradient: 'linear-gradient(90deg, #000004, #57106e, #f98e09, #fcffa4)',
        },
    ];

    const handleSwatchClick = (colormap) => {
        if (disabled) return;
        if (onColormapChange) {
            onColormapChange(colormap.id);
        }
    };

    return (
        <div className="color-swatch-grid-container">
            <div
                className="color-swatch-grid"
                style={{ opacity: disabled ? 0.4 : 1 }}
            >
                {colormaps.map((colormap) => {
                    const isActive = currentColormap === colormap.id;
                    const isHovered = hoveredSwatch === colormap.id;

                    return (
                        <div
                            key={colormap.id}
                            className={`color-swatch ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                            onClick={() => handleSwatchClick(colormap)}
                            onMouseEnter={() => !disabled && setHoveredSwatch(colormap.id)}
                            onMouseLeave={() => setHoveredSwatch(null)}
                            title={colormap.name}
                        >
                            {/* Gradient preview */}
                            <div
                                className="swatch-gradient"
                                style={{ background: colormap.gradient }}
                            />

                            {/* Name label */}
                            <div className="swatch-label">{colormap.name}</div>

                            {/* Check mark for active */}
                            {isActive && (
                                <div className="swatch-check">
                                    <Check size={14} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {hoveredSwatch && (
                <div className="color-swatch-hint">
                    Click to apply {colormaps.find(c => c.id === hoveredSwatch)?.name} colormap
                </div>
            )}
        </div>
    );
}


/* ============================================================================
   BENEFITS:
   
   1. **Visual Selection**: See the colors, not just names
   2. **Faster Decision**: Instant visual comparison
   3. **More Compact**: 3x3 grid vs long list
   4. **Industry Standard**: Matches Photoshop, Illustrator, etc.
   5. **Beautiful**: Gradients are eye-catching
   6. **Intuitive**: No need to remember colormap names
   
   COMPARISON:
   Old:  Colormap → Rainbow (read text, imagine colors, click)
   New:  Colormap → (see rainbow gradient, click)
   
   Users instantly recognize the visual pattern they want!
   ============================================================================ */