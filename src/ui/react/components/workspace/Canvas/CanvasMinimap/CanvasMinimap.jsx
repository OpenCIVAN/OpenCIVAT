// src/ui/react/components/workspace/Canvas/CanvasMinimap/CanvasMinimap.jsx
// Minimap showing the full canvas grid with viewport indicator
//
// Features:
// - Shows entire canvas grid structure
// - Highlights current viewport position
// - Click to navigate to any area
// - Shows occupied vs empty cells
// - Homepoint set/return functionality
// - Navigation controls (D-pad)

import React, { useCallback, useMemo, useState } from 'react';
import { useCanvas } from '@UI/react/hooks/useCanvas.js';
import {
    Map as MapIcon, Maximize2, Minimize2, Home, ChevronUp, ChevronDown,
    ChevronLeft, ChevronRight, Crosshair, Navigation
} from 'lucide-react';
import './CanvasMinimap.scss';

/**
 * CanvasMinimap - Overview map of the canvas with navigation controls
 */
export function CanvasMinimap({
    canvasId,
    expanded = false,
    onToggleExpand,
    showControls = true,
    maxHeight = 120,
}) {
    const {
        canvas,
        viewport,
        setViewportPosition,
        moveViewport,
    } = useCanvas(canvasId);

    // Local state for homepoint (could also be persisted in canvas)
    const [homepoint, setHomepoint] = useState(null);

    // Get all placements to show occupied cells
    const placements = useMemo(() => {
        if (!canvas) return [];
        return canvas.placements || [];
    }, [canvas]);

    // Get colors for occupied cells based on view instance colors
    const cellColors = useMemo(() => {
        const colors = new Map();
        placements.forEach(p => {
            if (p.isView && p.isView()) {
                // Get color from view configuration or use default
                const color = p.instanceColor || '#60a5fa';
                for (let r = p.row; r < p.row + (p.rowSpan || 1); r++) {
                    for (let c = p.col; c < p.col + (p.colSpan || 1); c++) {
                        colors.set(`${r}-${c}`, color);
                    }
                }
            } else {
                for (let r = p.row; r < p.row + (p.rowSpan || 1); r++) {
                    for (let c = p.col; c < p.col + (p.colSpan || 1); c++) {
                        colors.set(`${r}-${c}`, '#60a5fa');
                    }
                }
            }
        });
        return colors;
    }, [placements]);

    // Build cell occupation map
    const occupiedCells = useMemo(() => {
        const occupied = new Set();
        placements.forEach(p => {
            for (let r = p.row; r < p.row + (p.rowSpan || 1); r++) {
                for (let c = p.col; c < p.col + (p.colSpan || 1); c++) {
                    occupied.add(`${r}-${c}`);
                }
            }
        });
        return occupied;
    }, [placements]);

    // Handle click on minimap to navigate
    const handleCellClick = useCallback((row, col) => {
        // Center the viewport on the clicked cell
        const newRow = Math.max(0, row - Math.floor(viewport.rows / 2));
        const newCol = Math.max(0, col - Math.floor(viewport.cols / 2));
        setViewportPosition(newRow, newCol);
    }, [viewport.rows, viewport.cols, setViewportPosition]);

    // Navigation handlers
    const handleNavigate = useCallback((direction) => {
        switch (direction) {
            case 'up':
                moveViewport(-1, 0);
                break;
            case 'down':
                moveViewport(1, 0);
                break;
            case 'left':
                moveViewport(0, -1);
                break;
            case 'right':
                moveViewport(0, 1);
                break;
            case 'reset':
                setViewportPosition(0, 0);
                break;
        }
    }, [moveViewport, setViewportPosition]);

    // Set homepoint at current viewport position
    const handleSetHomepoint = useCallback(() => {
        setHomepoint({ row: viewport.row, col: viewport.col });
    }, [viewport.row, viewport.col]);

    // Return to homepoint
    const handleReturnToHomepoint = useCallback(() => {
        if (homepoint) {
            setViewportPosition(homepoint.row, homepoint.col);
        }
    }, [homepoint, setViewportPosition]);

    if (!canvas) return null;

    const { rows, cols } = canvas.dimensions;

    // Calculate cell size based on canvas dimensions
    const maxDimension = Math.max(rows, cols);
    const cellSize = Math.max(8, Math.min(16, Math.floor(140 / maxDimension)));

    // When collapsed, just show a toggle button
    if (!expanded) {
        return (
            <button
                className="canvas-minimap canvas-minimap--collapsed"
                onClick={onToggleExpand}
                title="Show canvas map"
            >
                <MapIcon size={14} />
            </button>
        );
    }

    return (
        <div className="canvas-minimap canvas-minimap--expanded">
            {/* Header */}
            <div className="canvas-minimap__header">
                <div className="canvas-minimap__title">
                    <MapIcon size={12} />
                    <span>Canvas Map</span>
                </div>
                <div className="canvas-minimap__header-actions">
                    {/* Homepoint button */}
                    <button
                        className={`canvas-minimap__action-btn ${homepoint ? 'canvas-minimap__action-btn--active' : ''}`}
                        onClick={homepoint ? handleReturnToHomepoint : handleSetHomepoint}
                        title={homepoint ? 'Return to homepoint' : 'Set homepoint'}
                    >
                        <Home size={12} />
                    </button>
                    <button
                        className="canvas-minimap__toggle"
                        onClick={onToggleExpand}
                        title="Collapse"
                    >
                        <Minimize2 size={12} />
                    </button>
                </div>
            </div>

            {/* Grid container with scroll */}
            <div
                className="canvas-minimap__grid-container"
                style={{ maxHeight: `${maxHeight}px` }}
            >
                <div
                    className="canvas-minimap__grid"
                    style={{
                        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                    }}
                >
                    {/* Render all cells */}
                    {Array.from({ length: rows * cols }, (_, i) => {
                        const row = Math.floor(i / cols);
                        const col = i % cols;
                        const key = `${row}-${col}`;
                        const isOccupied = occupiedCells.has(key);
                        const cellColor = cellColors.get(key);

                        // Check if cell is in viewport
                        const inViewport = (
                            row >= viewport.row &&
                            row < viewport.row + viewport.rows &&
                            col >= viewport.col &&
                            col < viewport.col + viewport.cols
                        );

                        // Check if cell is homepoint
                        const isHomepoint = homepoint &&
                            row === homepoint.row &&
                            col === homepoint.col;

                        return (
                            <div
                                key={key}
                                className={`canvas-minimap__cell ${isOccupied ? 'canvas-minimap__cell--occupied' : ''} ${inViewport ? 'canvas-minimap__cell--in-viewport' : ''} ${isHomepoint ? 'canvas-minimap__cell--homepoint' : ''}`}
                                style={isOccupied && cellColor ? { '--cell-color': cellColor } : undefined}
                                onClick={() => handleCellClick(row, col)}
                                title={`Cell (${col}, ${row})${isOccupied ? ' - Occupied' : ' - Empty'}${isHomepoint ? ' - Homepoint' : ''}`}
                            />
                        );
                    })}

                    {/* Viewport indicator overlay */}
                    <div
                        className="canvas-minimap__viewport-indicator"
                        style={{
                            gridRow: `${viewport.row + 1} / span ${viewport.rows}`,
                            gridColumn: `${viewport.col + 1} / span ${viewport.cols}`,
                        }}
                    />

                    {/* Homepoint indicator */}
                    {homepoint && (
                        <div
                            className="canvas-minimap__homepoint-indicator"
                            style={{
                                gridRow: `${homepoint.row + 1}`,
                                gridColumn: `${homepoint.col + 1}`,
                            }}
                        >
                            <Home size={8} />
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation controls */}
            {showControls && (
                <div className="canvas-minimap__nav-controls">
                    <div className="canvas-minimap__dpad">
                        <div className="canvas-minimap__dpad-row">
                            <div />
                            <button
                                className="canvas-minimap__nav-btn"
                                onClick={() => handleNavigate('up')}
                                title="Pan up"
                            >
                                <ChevronUp size={12} />
                            </button>
                            <div />
                        </div>
                        <div className="canvas-minimap__dpad-row">
                            <button
                                className="canvas-minimap__nav-btn"
                                onClick={() => handleNavigate('left')}
                                title="Pan left"
                            >
                                <ChevronLeft size={12} />
                            </button>
                            <button
                                className="canvas-minimap__nav-btn canvas-minimap__nav-btn--center"
                                onClick={() => handleNavigate('reset')}
                                title="Reset to origin"
                            >
                                <Crosshair size={10} />
                            </button>
                            <button
                                className="canvas-minimap__nav-btn"
                                onClick={() => handleNavigate('right')}
                                title="Pan right"
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>
                        <div className="canvas-minimap__dpad-row">
                            <div />
                            <button
                                className="canvas-minimap__nav-btn"
                                onClick={() => handleNavigate('down')}
                                title="Pan down"
                            >
                                <ChevronDown size={12} />
                            </button>
                            <div />
                        </div>
                    </div>
                    <div className="canvas-minimap__position-info">
                        ({viewport.col}, {viewport.row})
                    </div>
                </div>
            )}

            {/* Footer info */}
            <div className="canvas-minimap__footer">
                <span className="canvas-minimap__stat">
                    {placements.length} view{placements.length !== 1 ? 's' : ''}
                </span>
                <span className="canvas-minimap__stat">
                    {rows}×{cols}
                </span>
            </div>
        </div>
    );
}

export default CanvasMinimap;