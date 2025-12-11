// src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasGrid.jsx
// Main canvas grid component - renders visible placements
//
// ARCHITECTURE (Updated December 2025):
// - Separates Canvas Grid (data - can be huge) from Viewport (render - visible cells)
// - Uses useCanvasDimensions for robust measurement and resize handling
// - Progressive UI degradation based on cell size (full → compact → thumbnail → snapshot)
// - Isolation mode overlay for working with tiny cells
// - Virtual scrolling for large canvases
// - No minimum cell sizes - true zoom behavior
//
// Key components:
// - Canvas Grid: The actual data grid (can be 100×350 cells)
// - Viewport: How many cells are visible/rendered at once (e.g., 3×3)
// - Render Mode: UI complexity based on cell size

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { CanvasCell } from '@UI/react/components/workspace';
import { ConnectionOverlay } from '../ConnectionOverlay';
import { IsolationOverlay, useIsolationMode } from '@UI/react/components/workspace/Canvas/IsolationOverlay';
import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { useViewportSize } from '@UI/react/hooks';
import { useCanvasDimensions, RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { viewConfigurationManager, datasetManager } from '@Init/appInitializer.js';
import { LAYOUT_MODES, FLOW_DIRECTIONS } from '@Core/data/models/WorkspaceCanvas.js';
import { workspace as log } from '@Utils/logger.js';
import './CanvasGrid.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const GAP = 12; // Gap between cells in pixels
const PADDING = {
    top: 8,
    right: 16,    // Extra for scrollbar
    bottom: 16,   // Extra for scrollbar
    left: 8,
};

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState({ message = 'Preparing workspace...', error = null }) {
    return (
        <div className="canvas-grid__loader">
            {error ? (
                <>
                    <div className="canvas-grid__error-icon">⚠️</div>
                    <div className="canvas-grid__error-message">{error.message}</div>
                    <div className="canvas-grid__error-hint">
                        Try resizing the window or refreshing the page.
                    </div>
                </>
            ) : (
                <>
                    <div className="canvas-grid__spinner" />
                    <div>{message}</div>
                </>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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

    // Edit mode state
    const [editMode, setEditMode] = useState(false);
    const [selectedCells, setSelectedCells] = useState([]);
    const [minimapExpanded, setMinimapExpanded] = useState(false);
    const [activeTool, setActiveTool] = useState('select');

    // ==========================================================================
    // CANVAS DATA HOOK
    // ==========================================================================

    const {
        canvas,
        loading: canvasLoading,
        error: canvasError,
        viewport,
        visiblePlacements,
        moveViewport,
        addPlacement,
        setLayoutMode,
        setFlowDirection,
        connectionState,
        isConnected,
    } = useCanvas(canvasId);

    // ==========================================================================
    // VIEWPORT SIZE HOOK (how many cells visible)
    // ==========================================================================

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

    // ==========================================================================
    // CLAMP VIEWPORT POSITION WHEN SIZE CHANGES (NEW)
    // ==========================================================================
    // When viewport size increases (zoom out), positions at the edge may become
    // invalid. This effect clamps the position to keep cells accessible.

    useEffect(() => {
        if (!canvas?.dimensions) return;

        const maxRow = Math.max(0, canvas.dimensions.rows - viewportSize.rows);
        const maxCol = Math.max(0, canvas.dimensions.cols - viewportSize.cols);

        // Check if current position exceeds new bounds
        if (viewport.row > maxRow || viewport.col > maxCol) {
            const clampedRow = Math.min(viewport.row, maxRow);
            const clampedCol = Math.min(viewport.col, maxCol);

            // Calculate delta to move viewport to valid position
            const deltaRow = clampedRow - viewport.row;
            const deltaCol = clampedCol - viewport.col;

            if (deltaRow !== 0 || deltaCol !== 0) {
                moveViewport(deltaRow, deltaCol);
            }
        }
    }, [viewportSize.rows, viewportSize.cols, canvas?.dimensions, viewport.row, viewport.col, moveViewport]);

    // ==========================================================================
    // CONTAINER MEASUREMENT HOOK (robust resize handling)
    // ==========================================================================

    const {
        isReady: measurementsReady,
        measurementError,
        containerSize,
        cellSize,
        renderMode,
        measureRef,
        remeasure,
    } = useCanvasDimensions({
        viewportCols: effectiveViewport.cols,
        viewportRows: effectiveViewport.rows,
        gap: GAP,
        padding: {
            top: 12,      // Match the VIEWPORT_PADDING above
            right: 12,
            bottom: 12,
            left: 12,
        },
    });

    // ==========================================================================
    // ISOLATION MODE HOOK (for tiny cells)
    // ==========================================================================

    const {
        isolatedCell,
        isIsolationOpen,
        isolateCell,
        exitIsolation,
        shouldTriggerIsolation,
        renderSize: isolationRenderSize,
        setRenderSize: setIsolationRenderSize,
    } = useIsolationMode({ renderMode });

    // ==========================================================================
    // SUBSET SELECTION (for multi-select operations)
    // ==========================================================================

    const {
        selectionMode,
        selectedIds,
        toggleSelection,
        inFocusMode,
        activeSubset,
    } = useSubsets(canvasId);

    // ==========================================================================
    // DERIVED STATE
    // ==========================================================================

    // Use prop layout mode if provided, otherwise use canvas state
    const layoutMode = propLayoutMode || canvas?.layoutMode || LAYOUT_MODES.FLOW;
    const flowDirection = propFlowDirection || canvas?.flowDirection || FLOW_DIRECTIONS.ROW;
    const isFlowMode = layoutMode === LAYOUT_MODES.FLOW;
    const isGridMode = layoutMode === LAYOUT_MODES.GRID;

    // Canvas dimensions
    const canvasDimensions = useMemo(() => ({
        rows: canvas?.dimensions?.rows || 10,
        cols: canvas?.dimensions?.cols || 10,
    }), [canvas?.dimensions?.rows, canvas?.dimensions?.cols]);

    // ==========================================================================
    // RETRY CONNECTION
    // ==========================================================================

    const handleRetryConnection = useCallback(() => {
        if (canvasId) {
            canvasManager.handleReconnecting();
            canvasManager.loadCanvas(canvasId).catch(() => {
                // Error will be handled by connection state
            });
        }
    }, [canvasId]);

    // ==========================================================================
    // KEYBOARD NAVIGATION
    // ==========================================================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle if grid is focused
            if (!gridRef.current?.contains(document.activeElement)) return;

            // Arrow keys for viewport navigation
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveViewport(-1, 0);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveViewport(1, 0);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveViewport(0, -1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveViewport(0, 1);
            }

            // Viewport size shortcuts
            // + = zoom in (fewer cells, larger), - = zoom out (more cells, smaller)
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                decrementViewportSize(); // Zoom IN = show fewer, larger cells
                // FIX: Restore focus after React re-renders
                requestAnimationFrame(() => {
                    gridRef.current?.focus();
                });
            } else if (e.key === '-') {
                e.preventDefault();
                incrementViewportSize(); // Zoom OUT = show more, smaller cells
                // FIX: Restore focus after React re-renders
                requestAnimationFrame(() => {
                    gridRef.current?.focus();
                });
            } else if (e.key === '0') {
                e.preventDefault();
                resetViewportSize();
                // FIX: Restore focus after React re-renders
                requestAnimationFrame(() => {
                    gridRef.current?.focus();
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveViewport, incrementViewportSize, decrementViewportSize, resetViewportSize]);

    // ==========================================================================
    // CELL CLICK HANDLING
    // ==========================================================================

    const handleCellClick = useCallback((placement, e) => {
        // Check if this cell should trigger isolation mode
        if (shouldTriggerIsolation(renderMode)) {
            isolateCell({
                id: placement.id,
                viewId: placement.content?.viewConfigurationId,
                name: getPlacementName(placement),
                row: placement.row,
                col: placement.col,
            });
            return;
        }

        // Normal click handling
        if (onCellClick) {
            onCellClick(placement, e);
        }
    }, [renderMode, shouldTriggerIsolation, isolateCell, onCellClick]);

    // ==========================================================================
    // HELPER FUNCTIONS
    // ==========================================================================

    function getPlacementName(placement) {
        if (placement.content?.type === 'view') {
            try {
                const view = viewConfigurationManager.getView(placement.content.viewConfigurationId);
                if (view) {
                    const dataset = datasetManager.getDataset(view.datasetId);
                    return dataset?.filename || view.name || 'View';
                }
            } catch (e) {
                // Fall through to default
            }
        }
        return `Cell [${placement.row}, ${placement.col}]`;
    }

    // Filter placements to only those visible in the viewport
    const viewportPlacements = useMemo(() => {
        if (!canvas?.placements) return [];

        return canvas.placements.filter((placement) => {
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

    const handleCellDrop = useCallback(async (row, col, dropData) => {
        console.log('handleCellDrop', { row, col, dropData });

        try {
            // Case 1: ViewItem dropped (from datasets tab Views list)
            if (dropData.viewConfigId || dropData.id) {
                const viewId = dropData.viewConfigId || dropData.id;
                console.log(`Creating placement for view ${viewId} at [${row}, ${col}]`);

                await addPlacement({
                    row,
                    col,
                    rowSpan: dropData.rowSpan || 1,
                    colSpan: dropData.colSpan || 1,
                    content: {
                        type: 'view',
                        viewConfigurationId: viewId,
                    },
                });
                return;
            }

            // Case 2: Dataset dropped (create new view)
            if (dropData.datasetId) {
                console.log(`Creating new view for dataset ${dropData.datasetId} at [${row}, ${col}]`);

                window.dispatchEvent(new CustomEvent('cia:request-instance', {
                    detail: {
                        datasetId: dropData.datasetId,
                        spawnNew: true,
                        targetRow: row,
                        targetCol: col,
                        canvasId,
                    },
                }));
                return;
            }

            // Case 3: File dropped (from FilesTab - needs to load first)
            if (dropData.path || dropData.name) {
                console.log(`File dropped: ${dropData.name} at [${row}, ${col}]`);

                window.dispatchEvent(new CustomEvent('cia:load-file-to-cell', {
                    detail: {
                        file: dropData,
                        targetRow: row,
                        targetCol: col,
                        canvasId,
                    },
                }));
                return;
            }

            workspace.warn('Unknown drop data format:', dropData);
        } catch (error) {
            workspace.error('Drop failed:', error);
        }
    }, [addPlacement, canvasId]);


    // ==========================================================================
    // RENDER CELLS
    // ==========================================================================

    // Helper function to validate placement
    function isValidPlacement(placement) {
        if (!placement.content) return false;
        if (placement.content.type === 'view') {
            return !!placement.content.viewConfigurationId;
        }
        if (placement.content.type === 'notes') {
            return true; // Notes can exist without content initially
        }
        // Add other content type validations as needed
        return true;
    }

    const renderCells = useMemo(() => {
        const cells = [];

        // Get placements visible in current viewport
        const viewportPlacements = visiblePlacements || [];

        // Build occupiedCells map for multi-span placements
        const occupiedCells = new Set();
        viewportPlacements.forEach((placement) => {
            if (placement.colSpan > 1 || placement.rowSpan > 1) {
                for (let r = 0; r < placement.rowSpan; r++) {
                    for (let c = 0; c < placement.colSpan; c++) {
                        if (r !== 0 || c !== 0) {
                            occupiedCells.add(`${placement.row + r},${placement.col + c}`);
                        }
                    }
                }
            }
        });

        // Render cells for the viewport
        for (let viewRow = 0; viewRow < effectiveViewport.rows; viewRow++) {
            for (let viewCol = 0; viewCol < effectiveViewport.cols; viewCol++) {
                const canvasRow = effectiveViewport.row + viewRow;
                const canvasCol = effectiveViewport.col + viewCol;
                const key = `${canvasRow},${canvasCol}`;

                // Check if this cell is the origin of a placement
                // In renderCells useMemo, before rendering a placement:
                const placement = viewportPlacements.find(
                    p => p.row === canvasRow && p.col === canvasCol
                );

                // Validate placement has valid content
                if (placement && !isValidPlacement(placement)) {
                    console.warn(`Invalid placement at [${canvasRow}, ${canvasCol}]:`, placement);
                    // Could auto-clean here or render special "invalid" state
                }

                // Skip if cell is covered by a multi-span placement (but not origin)
                if (!placement && occupiedCells.has(key)) {
                    continue;
                }

                // ============================================
                // KEY FIX: Position relative to VIEWPORT, not canvas
                // This ensures cells always fill the visible container
                // ============================================
                // Add padding offset so cells don't touch edges
                const VIEWPORT_PADDING = { top: 12, left: 12 };
                const left = VIEWPORT_PADDING.left + viewCol * (cellSize.width + GAP);
                const top = VIEWPORT_PADDING.top + viewRow * (cellSize.height + GAP);

                // Calculate size (account for spanning)
                const colSpan = placement?.colSpan || 1;
                const rowSpan = placement?.rowSpan || 1;

                // Clip spans to viewport boundary (for cells that extend beyond)
                const visibleColSpan = Math.min(colSpan, effectiveViewport.cols - viewCol);
                const visibleRowSpan = Math.min(rowSpan, effectiveViewport.rows - viewRow);

                const width = visibleColSpan * cellSize.width + (visibleColSpan - 1) * GAP;
                const height = visibleRowSpan * cellSize.height + (visibleRowSpan - 1) * GAP;

                cells.push(
                    <div
                        key={placement?.id || key}
                        className="canvas-grid__cell-wrapper"
                        style={{
                            left,
                            top,
                            width,
                            height,
                        }}
                    >
                        <CanvasCell
                            placement={placement}
                            row={canvasRow}
                            col={canvasCol}
                            renderMode={renderMode}
                            cellSize={cellSize}
                            isHighlighted={placement?.id === highlightedPlacementId}
                            isSelected={selectedIds.includes(placement?.id)}
                            inEditMode={editMode}
                            onSelect={toggleSelection}
                            onClick={(e) => placement && handleCellClick(placement, e)}
                            onDoubleClick={(e) => placement && onCellDoubleClick?.(placement, e)}
                            onAddContent={(type) => onAddContent?.(canvasRow, canvasCol, type)}
                            onRemove={() => placement && onRemovePlacement?.(placement.id)}
                            onDrop={handleCellDrop}
                        />
                    </div>
                );
            }
        }

        return cells;
    }, [
        visiblePlacements,
        effectiveViewport,
        cellSize,
        renderMode,
        highlightedPlacementId,
        selectedIds,
        editMode,
        toggleSelection,
        handleCellClick,
        onCellDoubleClick,
        onAddContent,
        onRemovePlacement,
    ]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    // Show loading if canvas is still loading
    if (canvasLoading) {
        return (
            <div className="canvas-grid canvas-grid--loading">
                <LoadingState message="Loading canvas..." />
            </div>
        );
    }

    // Show error if canvas failed to load
    if (canvasError) {
        return (
            <div className="canvas-grid canvas-grid--error">
                <LoadingState error={canvasError} />
            </div>
        );
    }

    return (
        <div
            className={`canvas-grid canvas-grid--${layoutMode} ${inFocusMode ? 'canvas-grid--focus-mode' : ''}`}
            data-render-mode={renderMode}
        >
            {/* Mode banners */}
            {inFocusMode && activeSubset && (
                <div className="canvas-grid__focus-banner">
                    <span>Focus: {activeSubset.name}</span>
                </div>
            )}

            {selectionMode && (
                <div className="canvas-grid__selection-banner">
                    <span>Selection Mode - Click cells to add/remove from selection</span>
                </div>
            )}

            {editMode && (
                <div className="canvas-grid__edit-banner">
                    <span>
                        {isFlowMode
                            ? 'Flow Mode - Views auto-arrange. Switch to Grid for manual placement.'
                            : 'Grid Mode - Select cells to merge, or use + to add content'}
                    </span>
                </div>
            )}

            {/* Container - edge-to-edge wrapper */}
            <div className="canvas-grid__container">
                {/* Measurement container - fills available space */}
                <div
                    ref={measureRef}
                    className="canvas-grid__measure-container"
                >
                    {!measurementsReady ? (
                        <LoadingState
                            message="Preparing workspace..."
                            error={measurementError}
                        />
                    ) : (
                        <div
                            ref={gridRef}
                            className="canvas-grid__viewport"
                            tabIndex={0}
                        >
                            {renderCells}
                        </div>
                    )}
                </div>
            </div>

            {/* Viewport info bar */}
            {measurementsReady && (
                <div className="canvas-grid__viewport-info">
                    <span>
                        Viewport: {effectiveViewport.rows}×{effectiveViewport.cols}
                        {' | '}
                        Position: [{effectiveViewport.row}, {effectiveViewport.col}]
                        {' | '}
                        Mode: {renderMode}
                    </span>
                    <span>
                        Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px
                    </span>
                </div>
            )}

            {/* Isolation Mode Overlay */}
            <IsolationOverlay
                isOpen={isIsolationOpen}
                onClose={exitIsolation}
                cell={isolatedCell}
                renderSize={isolationRenderSize}
            >
                {isolatedCell && (
                    <CanvasCell
                        placement={viewportPlacements.find(p => p.id === isolatedCell.id)}
                        row={isolatedCell.row}
                        col={isolatedCell.col}
                        renderMode={RENDER_MODES.FULL}
                        cellSize={{ width: 800, height: 600 }}
                        isHighlighted={false}
                        isSelected={false}
                        inEditMode={false}
                    />
                )}
            </IsolationOverlay>

            {/* Connection Overlay */}
            <ConnectionOverlay
                connectionState={connectionState}
                error={canvasManager.getLastError()}
                onRetry={handleRetryConnection}
            />
        </div>
    );
}

export default CanvasGrid;