// src/ui/react/components/workspace/Canvas/CanvasMinimap/CanvasMinimap.jsx
// Minimap showing the full canvas grid with viewport indicator
//
// Features:
// - Shows entire canvas grid structure
// - Highlights current viewport position
// - Click to navigate to any area
// - Shows occupied vs empty cells

import React, { useCallback, useMemo } from 'react';
import { useCanvas } from '@UI/react/hooks/useCanvas.js';
import { Map, Maximize2, Minimize2 } from 'lucide-react';
import './CanvasMinimap.scss';

/**
 * CanvasMinimap - Overview map of the canvas
 */
export function CanvasMinimap({
    canvasId,
    expanded = false,
    onToggleExpand,
}) {
    const {
        canvas,
        viewport,
        setViewportPosition,
    } = useCanvas(canvasId);

    // Get all placements to show occupied cells
    const placements = useMemo(() => {
        if (!canvas) return [];
        return canvas.placements || [];
    }, [canvas]);

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
                <Map size={14} />
            </button>
        );
    }

    return (
        <div className="canvas-minimap canvas-minimap--expanded">
            {/* Header */}
            <div className="canvas-minimap__header">
                <div className="canvas-minimap__title">
                    <Map size={12} />
                    <span>Canvas Map</span>
                </div>
                <button
                    className="canvas-minimap__toggle"
                    onClick={onToggleExpand}
                    title="Collapse"
                >
                    <Minimize2 size={12} />
                </button>
            </div>

            {/* Grid */}
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

                    // Check if cell is in viewport
                    const inViewport = (
                        row >= viewport.row &&
                        row < viewport.row + viewport.rows &&
                        col >= viewport.col &&
                        col < viewport.col + viewport.cols
                    );

                    return (
                        <div
                            key={key}
                            className={`canvas-minimap__cell ${isOccupied ? 'canvas-minimap__cell--occupied' : ''} ${inViewport ? 'canvas-minimap__cell--in-viewport' : ''}`}
                            onClick={() => handleCellClick(row, col)}
                            title={`Cell (${col}, ${row})${isOccupied ? ' - Occupied' : ' - Empty'}`}
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
            </div>

            {/* Footer info */}
            <div className="canvas-minimap__footer">
                <span className="canvas-minimap__stat">
                    {placements.length} view{placements.length !== 1 ? 's' : ''}
                </span>
                <span className="canvas-minimap__stat">
                    {rows * cols - occupiedCells.size} empty
                </span>
            </div>
        </div>
    );
}

export default CanvasMinimap;