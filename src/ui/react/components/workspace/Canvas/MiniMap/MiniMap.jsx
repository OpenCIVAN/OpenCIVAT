// src/ui/react/components/workspace/MiniMap.jsx
// Canvas overview with viewport indicator
//
// Shows a miniature view of the entire canvas with:
// - All placements as small boxes
// - Current viewport as a highlighted rectangle
// - Click to navigate, drag viewport to pan

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useCanvas } from '@UI/react/hooks/useCanvas.js';
import './MiniMap.scss';

/**
 * MiniMap - Canvas overview with viewport navigation
 *
 * Features:
 * - Shows entire canvas at reduced scale
 * - Viewport indicator that can be dragged
 * - Click anywhere to jump to that location
 * - Highlights placements with different colors by type
 */
export function MiniMap({ canvasId, width = 200, height = 150 }) {
    const mapRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const {
        canvas,
        viewport,
        setViewportPosition,
        visiblePlacements,
    } = useCanvas(canvasId);

    // Calculate scale factors
    const canvasRows = canvas?.dimensions?.rows || 3;
    const canvasCols = canvas?.dimensions?.cols || 3;

    const cellWidth = width / canvasCols;
    const cellHeight = height / canvasRows;

    // Convert screen position to canvas position
    const screenToCanvas = useCallback(
        (screenX, screenY) => {
            if (!mapRef.current) return { row: 0, col: 0 };

            const rect = mapRef.current.getBoundingClientRect();
            const x = screenX - rect.left;
            const y = screenY - rect.top;

            // Calculate canvas position, centering viewport
            const col = Math.floor(x / cellWidth) - Math.floor(viewport.cols / 2);
            const row = Math.floor(y / cellHeight) - Math.floor(viewport.rows / 2);

            // Clamp to valid range
            const maxRow = Math.max(0, canvasRows - viewport.rows);
            const maxCol = Math.max(0, canvasCols - viewport.cols);

            return {
                row: Math.max(0, Math.min(maxRow, row)),
                col: Math.max(0, Math.min(maxCol, col)),
            };
        },
        [cellWidth, cellHeight, canvasRows, canvasCols, viewport.rows, viewport.cols]
    );

    // Handle click to navigate
    const handleClick = useCallback(
        (e) => {
            if (isDragging) return;
            const { row, col } = screenToCanvas(e.clientX, e.clientY);
            setViewportPosition(row, col);
        },
        [isDragging, screenToCanvas, setViewportPosition]
    );

    // Handle viewport drag
    const handleMouseDown = useCallback((e) => {
        // Only start drag if clicking on viewport indicator
        if (e.target.classList.contains('mini-map__viewport')) {
            setIsDragging(true);
            e.preventDefault();
        }
    }, []);

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDragging) return;
            const { row, col } = screenToCanvas(e.clientX, e.clientY);
            setViewportPosition(row, col);
        },
        [isDragging, screenToCanvas, setViewportPosition]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Get color for placement type
    const getPlacementColor = (placement) => {
        if (!placement) return 'transparent';
        switch (placement.content.type) {
            case 'view':
                return 'var(--color-accent-blue, #3b82f6)';
            case 'notes':
                return 'var(--color-accent-yellow, #eab308)';
            case 'image':
                return 'var(--color-accent-green, #22c55e)';
            default:
                return 'var(--color-bg-tertiary, #374151)';
        }
    };

    if (!canvas) {
        return (
            <div className="mini-map mini-map--empty" style={{ width, height }}>
                <span>No canvas</span>
            </div>
        );
    }

    // All placements (not just visible)
    const allPlacements = canvas.placements || [];

    return (
        <div
            ref={mapRef}
            className={`mini-map ${isDragging ? 'mini-map--dragging' : ''}`}
            style={{ width, height }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            role="img"
            aria-label="Canvas mini-map"
        >
            {/* Grid background */}
            <svg
                className="mini-map__grid"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                {/* Grid lines */}
                {Array.from({ length: canvasCols + 1 }, (_, i) => (
                    <line
                        key={`v${i}`}
                        x1={i * cellWidth}
                        y1={0}
                        x2={i * cellWidth}
                        y2={height}
                        stroke="var(--color-border, #374151)"
                        strokeWidth="0.5"
                    />
                ))}
                {Array.from({ length: canvasRows + 1 }, (_, i) => (
                    <line
                        key={`h${i}`}
                        x1={0}
                        y1={i * cellHeight}
                        x2={width}
                        y2={i * cellHeight}
                        stroke="var(--color-border, #374151)"
                        strokeWidth="0.5"
                    />
                ))}

                {/* Placements */}
                {allPlacements.map((placement) => (
                    <rect
                        key={placement.id}
                        x={placement.col * cellWidth + 1}
                        y={placement.row * cellHeight + 1}
                        width={placement.colSpan * cellWidth - 2}
                        height={placement.rowSpan * cellHeight - 2}
                        fill={getPlacementColor(placement)}
                        opacity={0.7}
                        rx={2}
                    />
                ))}

                {/* Viewport indicator */}
                <rect
                    className="mini-map__viewport"
                    x={viewport.col * cellWidth}
                    y={viewport.row * cellHeight}
                    width={viewport.cols * cellWidth}
                    height={viewport.rows * cellHeight}
                    fill="var(--color-accent-primary, #8b5cf6)"
                    fillOpacity={0.2}
                    stroke="var(--color-accent-primary, #8b5cf6)"
                    strokeWidth={2}
                    rx={2}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                />
            </svg>

            {/* Position label */}
            <div className="mini-map__label">
                ({viewport.row}, {viewport.col}) / {canvasRows}×{canvasCols}
            </div>
        </div>
    );
}

export default MiniMap;