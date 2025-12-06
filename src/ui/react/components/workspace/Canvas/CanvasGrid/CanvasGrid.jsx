// src/ui/react/components/workspace/CanvasGrid.jsx
// Main canvas grid component - renders visible placements
//
// ARCHITECTURE:
// - Only renders placements within the viewport (GPU optimization)
// - Supports spanning (1-3 rows/cols per placement)
// - Handles keyboard navigation
// - Integrates with selection mode for subset creation
// - Edit mode for grid manipulation (add rows/cols, merge cells)
// - Minimap for canvas overview and navigation
// - Supports Grid and Flow layout modes

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { CanvasCell } from '@UI/react/components/workspace';
import { GridEditOverlay } from '../GridEditOverlay';
import { CanvasMinimap } from '../CanvasMinimap';
import { ConnectionOverlay } from '../ConnectionOverlay';
import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { useViewportSize } from '@UI/react/hooks';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { viewConfigurationManager, datasetManager } from '@Init/appInitializer.js';
import { LAYOUT_MODES, FLOW_DIRECTIONS } from '@Core/data/models/WorkspaceCanvas.js';
import { workspace as log } from '@Utils/logger.js';
import './CanvasGrid.scss';

/**
 * CanvasGrid - The main workspace grid
 *
 * Renders a viewport-sized grid with placements positioned according
 * to their row/col coordinates. Only placements visible in the viewport
 * are rendered.
 *
 * Supports two layout modes:
 * - Grid: Manual placement with cell merging
 * - Flow: Auto-arrange with reflow on add/remove
 */
export function CanvasGrid({
    canvasId,
    onCellClick,
    onCellDoubleClick,
    onAddContent,
    onRemovePlacement,
    onAddRow,
    onAddColumn,
    highlightedPlacementId,
    layoutMode: propLayoutMode,
    flowDirection: propFlowDirection,
    onLayoutModeChange,
    onFlowDirectionChange,
}) {
    const gridRef = useRef(null);
    const containerRef = useRef(null);

    // Edit mode state
    const [editMode, setEditMode] = useState(false);
    const [selectedCells, setSelectedCells] = useState([]);
    const [minimapExpanded, setMinimapExpanded] = useState(false);
    const [activeTool, setActiveTool] = useState('select'); // 'select', 'pan', 'merge'

    const {
        canvas,
        loading,
        error,
        viewport,
        visiblePlacements,
        moveViewport,
        addPlacement,
        setLayoutMode,
        setFlowDirection,
        connectionState,
        isConnected,
    } = useCanvas(canvasId);

    // Viewport size controls - how many cells are visible at once
    const {
        viewportSize,
        isMinSize,
        isMaxSize,
        incrementViewportSize,
        decrementViewportSize,
        resetViewportSize,
    } = useViewportSize(canvas?.dimensions);

    // Effective viewport combines position from useCanvas with size from useViewportSize
    const effectiveViewport = useMemo(() => ({
        row: viewport.row,
        col: viewport.col,
        rows: viewportSize.rows,
        cols: viewportSize.cols,
    }), [viewport.row, viewport.col, viewportSize.rows, viewportSize.cols]);

    // Retry connection
    const handleRetryConnection = useCallback(() => {
        // Trigger a refresh by reloading the canvas
        if (canvasId) {
            canvasManager.handleReconnecting();
            canvasManager.loadCanvas(canvasId).catch(() => {
                // Error will be handled by connection state
            });
        }
    }, [canvasId]);

    // Use prop layout mode if provided, otherwise use canvas state
    const layoutMode = propLayoutMode || canvas?.layoutMode || LAYOUT_MODES.FLOW;
    const flowDirection = propFlowDirection || canvas?.flowDirection || FLOW_DIRECTIONS.ROW;
    const isFlowMode = layoutMode === LAYOUT_MODES.FLOW;
    const isGridMode = layoutMode === LAYOUT_MODES.GRID;

    const {
        selectionMode,
        selectedIds,
        toggleSelection,
        inFocusMode,
        activeSubset,
    } = useSubsets(canvasId);

    // Keyboard navigation and viewport size shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle if grid is focused or no input is focused
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return;
            }

            switch (e.key) {
                // Navigation
                case 'ArrowUp':
                    e.preventDefault();
                    moveViewport(-1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moveViewport(1, 0);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    moveViewport(0, -1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    moveViewport(0, 1);
                    break;

                // Viewport size controls
                case '+':
                case '=':
                    e.preventDefault();
                    if (!isMaxSize) {
                        incrementViewportSize();
                    }
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    if (!isMinSize) {
                        decrementViewportSize();
                    }
                    break;
                case '0':
                    e.preventDefault();
                    resetViewportSize();
                    break;

                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveViewport, incrementViewportSize, decrementViewportSize, resetViewportSize, isMinSize, isMaxSize]);

    // Handle cell click
    const handleCellClick = useCallback(
        (placement, row, col) => {
            // Edit mode: select cells for merging
            if (editMode && !placement) {
                const cellId = `${row}-${col}`;
                setSelectedCells(prev => {
                    if (prev.includes(cellId)) {
                        return prev.filter(id => id !== cellId);
                    }
                    return [...prev, cellId];
                });
                return;
            }

            if (selectionMode && placement) {
                toggleSelection(placement.id);
            } else if (onCellClick) {
                onCellClick(placement, row, col);
            }
        },
        [editMode, selectionMode, toggleSelection, onCellClick]
    );

    // Handle cell double click
    const handleCellDoubleClick = useCallback(
        (placement, row, col) => {
            if (onCellDoubleClick) {
                onCellDoubleClick(placement, row, col);
            }
        },
        [onCellDoubleClick]
    );

    // Handle dropping content onto a cell
    const handleCellDrop = useCallback(
        async (row, col, data) => {
            if (!canvasId) return;

            try {
                let viewConfigId = data.viewConfigId;

                // If we have a viewConfigId, use it directly
                // Otherwise, this is a dataset drop - create a view first
                if (!viewConfigId) {
                    const datasetId = data.datasetId || data.id;
                    if (!datasetId) {
                        log.error('Drop data missing both viewConfigId and datasetId');
                        return;
                    }

                    // Get the dataset to get its name
                    const dataset = datasetManager.getDataset(datasetId);
                    const datasetName = dataset?.filename || dataset?.fileName || 'Unknown';

                    log.debug(`Creating view for dropped dataset ${datasetId}`);
                    const newView = await viewConfigurationManager.createView(datasetId, {
                        name: `View of ${datasetName}`,
                        instanceType: dataset?.metadata?.defaultInstanceType || 'vtk'
                    });

                    if (!newView) {
                        log.error('Failed to create view for dropped dataset');
                        return;
                    }
                    viewConfigId = newView.id;
                }

                // Create placement with the view
                await addPlacement({
                    row,
                    col,
                    rowSpan: 1,
                    colSpan: 1,
                    content: {
                        type: 'view',
                        viewConfigurationId: viewConfigId,
                    },
                });
            } catch (err) {
                log.error('Failed to add placement:', err);
            }
        },
        [canvasId, addPlacement]
    );

    // Handle adding content to a cell
    const handleAddContent = useCallback(
        (row, col, type) => {
            if (onAddContent) {
                onAddContent(row, col, type);
            }
        },
        [onAddContent]
    );

    // Toggle edit mode
    const handleToggleEditMode = useCallback(() => {
        setEditMode(prev => {
            if (prev) {
                // Exiting edit mode - clear selection
                setSelectedCells([]);
            }
            return !prev;
        });
    }, []);

    // Merge selected cells
    const handleMergeCells = useCallback((cells) => {
        // TODO: Implement cell merging via canvas manager
        console.log('Merge cells:', cells);
        setSelectedCells([]);
    }, []);

    // Clear cell selection
    const handleClearSelection = useCallback(() => {
        setSelectedCells([]);
    }, []);

    // Filter placements to only those visible in the effective viewport
    const viewportPlacements = useMemo(() => {
        if (!canvas?.placements) return [];

        return canvas.placements.filter((placement) => {
            // Check if placement overlaps with viewport window
            const pEndRow = placement.row + (placement.rowSpan || 1);
            const pEndCol = placement.col + (placement.colSpan || 1);
            const vEndRow = effectiveViewport.row + effectiveViewport.rows;
            const vEndCol = effectiveViewport.col + effectiveViewport.cols;

            return (
                placement.row < vEndRow &&
                pEndRow > effectiveViewport.row &&
                placement.col < vEndCol &&
                pEndCol > effectiveViewport.col
            );
        });
    }, [canvas?.placements, effectiveViewport]);

    // Build grid cells
    const renderCells = () => {
        const cells = [];
        const placementMap = new Map();

        // Map placements to their positions
        viewportPlacements.forEach((placement) => {
            const key = `${placement.row}-${placement.col}`;
            placementMap.set(key, placement);
        });

        // Track which cells are covered by spanning placements
        const coveredCells = new Set();
        viewportPlacements.forEach((placement) => {
            for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
                for (let c = placement.col; c < placement.col + placement.colSpan; c++) {
                    if (r !== placement.row || c !== placement.col) {
                        coveredCells.add(`${r}-${c}`);
                    }
                }
            }
        });

        // Generate cells for the effective viewport
        for (let row = effectiveViewport.row; row < effectiveViewport.row + effectiveViewport.rows; row++) {
            for (let col = effectiveViewport.col; col < effectiveViewport.col + effectiveViewport.cols; col++) {
                const key = `${row}-${col}`;

                // Skip cells covered by spanning placements
                if (coveredCells.has(key)) {
                    continue;
                }

                const placement = placementMap.get(key);
                const isSelected = placement && selectedIds.includes(placement.id);
                const isHighlighted = placement && highlightedPlacementId === placement.id;

                // Calculate grid position (relative to viewport)
                const gridRow = row - effectiveViewport.row + 1;
                const gridCol = col - effectiveViewport.col + 1;

                // Check if cell is selected in edit mode
                const isCellSelected = editMode && selectedCells.includes(key);

                cells.push(
                    <CanvasCell
                        key={key}
                        placement={placement}
                        row={row}
                        col={col}
                        gridRow={gridRow}
                        gridCol={gridCol}
                        rowSpan={placement?.rowSpan || 1}
                        colSpan={placement?.colSpan || 1}
                        isSelected={isSelected || isCellSelected}
                        isHighlighted={isHighlighted}
                        selectionMode={selectionMode}
                        editMode={editMode}
                        onClick={() => handleCellClick(placement, row, col)}
                        onDoubleClick={() => handleCellDoubleClick(placement, row, col)}
                        onDrop={handleCellDrop}
                        onAddContent={handleAddContent}
                        onRemovePlacement={onRemovePlacement}
                    />
                );
            }
        }

        return cells;
    };

    // Loading state
    if (loading) {
        return (
            <div className="canvas-grid canvas-grid--loading">
                <div className="canvas-grid__loader">Loading canvas...</div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="canvas-grid canvas-grid--error">
                <div className="canvas-grid__error">
                    <p>Failed to load canvas</p>
                    <small>{error.message}</small>
                </div>
            </div>
        );
    }

    // No canvas state
    if (!canvas) {
        return (
            <div className="canvas-grid canvas-grid--empty">
                <div className="canvas-grid__empty">
                    <p>No canvas selected</p>
                </div>
            </div>
        );
    }

    // Build class names
    const gridClassNames = [
        'canvas-grid',
        selectionMode && 'canvas-grid--selection-mode',
        inFocusMode && 'canvas-grid--focus-mode',
        editMode && 'canvas-grid--edit-mode',
        isFlowMode && 'canvas-grid--flow-mode',
        isGridMode && 'canvas-grid--grid-mode',
        activeTool === 'pan' && 'canvas-grid--pan-tool',
        activeTool === 'merge' && 'canvas-grid--merge-tool',
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={gridClassNames}
            tabIndex={0}
            role="grid"
            aria-label="Workspace canvas"
        >
            {/* Focus mode indicator */}
            {inFocusMode && activeSubset && (
                <div className="canvas-grid__focus-banner">
                    <span>Focus: {activeSubset.name}</span>
                </div>
            )}

            {/* Selection mode indicator */}
            {selectionMode && (
                <div className="canvas-grid__selection-banner">
                    <span>Selection Mode - Click views to select</span>
                    <span className="canvas-grid__selection-count">
                        {selectedIds.length} selected
                    </span>
                </div>
            )}

            {/* Edit mode indicator */}
            {editMode && (
                <div className="canvas-grid__edit-banner">
                    <span>
                        {isFlowMode
                            ? 'Flow Mode - Views auto-arrange. Switch to Grid for manual placement.'
                            : 'Grid Mode - Select cells to merge, or use + to add content'}
                    </span>
                </div>
            )}

            {/* Grid container - fills available space */}
            <div
                ref={gridRef}
                className="canvas-grid__container"
                style={{
                    '--viewport-rows': effectiveViewport.rows,
                    '--viewport-cols': effectiveViewport.cols,
                }}
            >
                <div
                    className="canvas-grid__cells"
                    style={{
                        gridTemplateRows: `repeat(${effectiveViewport.rows}, 1fr)`,
                        gridTemplateColumns: `repeat(${effectiveViewport.cols}, 1fr)`,
                    }}
                >
                    {renderCells()}
                </div>
            </div>

            {/* Grid Edit Overlay */}
            <GridEditOverlay
                canvasId={canvasId}
                editMode={editMode}
                onToggleEditMode={handleToggleEditMode}
                selectedCells={selectedCells}
                onMergeCells={handleMergeCells}
                onClearSelection={handleClearSelection}
                onAddRow={onAddRow}
                onAddColumn={onAddColumn}
                layoutMode={layoutMode}
                activeTool={activeTool}
                onToolChange={setActiveTool}
            />

            {/* Canvas Minimap */}
            <CanvasMinimap
                canvasId={canvasId}
                expanded={minimapExpanded}
                onToggleExpand={() => setMinimapExpanded(prev => !prev)}
                viewportSize={viewportSize}
            />

            {/* Connection Overlay - shown when disconnected */}
            <ConnectionOverlay
                connectionState={connectionState}
                error={canvasManager.getLastError()}
                onRetry={handleRetryConnection}
            />
        </div>
    );
}

export default CanvasGrid;