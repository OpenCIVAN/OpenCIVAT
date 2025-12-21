// src/ui/react/components/workspace/Canvas/CanvasWorkspace/CanvasWorkspace.jsx
// Integration component for the new canvas system
//
// This wraps CanvasGrid with workspace selection and subset management

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CanvasGrid } from '@UI/react/components/workspace';
import { SubsetPanel } from '@UI/react/components/panels/SubsetPanel';
import { FocusModeOverlay } from '@UI/react/components/panels/FocusModeOverlay';

import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { workspace as log } from '@Utils/logger.js';
import { useViewportEventListener } from '@UI/react/hooks/useViewportSync.js';

import './CanvasWorkspace.scss';

/**
 * CanvasWorkspace - Full canvas system with workspace selection
 *
 * Server-authoritative: No local fallback. Shows connection overlay when disconnected.
 */
export function CanvasWorkspace({ userId, projectId: propProjectId }) {
    // Use sessionManager room ID as fallback project ID
    const projectId = useMemo(() => {
        return propProjectId || sessionManager.getRoomId?.() || 'default-project';
    }, [propProjectId]);

    const [activeCanvasId, setActiveCanvasId] = useState(null);
    const [showSubsetPanel, setShowSubsetPanel] = useState(false);
    const [highlightedPlacementId, setHighlightedPlacementId] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const instanceCreationInProgress = useRef(false);

    // Canvas hook for the active canvas
    const {
        canvas,
        viewport,
        visiblePlacements,
        loading: isLoading,
        error: canvasError,
        moveViewport,
        setViewportPosition: navigateTo,
        addPlacement: serverAddPlacement,
    } = useCanvas(activeCanvasId);

    // Subsets hook
    const {
        subsets,
        focusedSubset,
        isFocusMode,
        enterFocusMode,
        exitFocusMode,
    } = useSubsets(activeCanvasId);

    // Load initial workspace/canvas (server-authoritative, no local fallback)
    useEffect(() => {
        const loadWorkspace = async () => {
            log.debug(`Loading canvases for project: ${projectId}`);
            setLoadError(null);

            try {
                // Get/create canvas from server (server is source of truth)
                const personalCanvas = await canvasManager.getPersonalCanvas(projectId);

                if (personalCanvas) {
                    log.debug(`Got personal canvas: ${personalCanvas.id}`);
                    setActiveCanvasId(personalCanvas.id);
                    // IMPORTANT: Also update the manager so other components can access it
                    canvasManager.setActiveCanvas(personalCanvas.id);
                }
            } catch (error) {
                log.error('Failed to load canvas from server:', error.message);
                setLoadError(error);
                // Mark as disconnected so ConnectionOverlay shows
                canvasManager.handleDisconnected(error);
            }
        };

        loadWorkspace();
    }, [projectId]);

    // Listen for viewport sync events from CanvasNavigator
    useViewportEventListener({
        onNavigateTo: useCallback((row, col) => {
            log.debug(`Viewport sync: navigate to [${row}, ${col}]`);
            navigateTo(row, col);
        }, [navigateTo]),
        onMoveViewport: useCallback((deltaRow, deltaCol) => {
            log.debug(`Viewport sync: move by [${deltaRow}, ${deltaCol}]`);
            moveViewport(deltaRow, deltaCol);
        }, [moveViewport]),
        canvasId: activeCanvasId,
    });

    // Add placement (server-authoritative)
    const addPlacement = useCallback(async (placementData) => {
        if (!activeCanvasId) {
            throw new Error('No canvas available');
        }
        return serverAddPlacement(placementData);
    }, [activeCanvasId, serverAddPlacement]);

    // Add row to canvas (server-authoritative)
    const addRow = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        log.debug('Adding row to canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, rows: cachedCanvas.dimensions.rows + 1 }
        });
    }, [activeCanvasId]);

    // Add column to canvas (server-authoritative)
    const addColumn = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        log.debug('Adding column to canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, cols: cachedCanvas.dimensions.cols + 1 }
        });
    }, [activeCanvasId]);

    // Remove placement (server-authoritative)
    const removePlacement = useCallback(async (placementId) => {
        if (!placementId) return;
        log.debug('Removing placement:', placementId);
        await canvasManager.removePlacement(placementId);
    }, []);

    // Find next empty cell for placement
    const findNextEmptyCell = useCallback(() => {
        if (!canvas) return { row: 0, col: 0 };

        const occupiedCells = new Set();
        if (canvas.placements) {
            canvas.placements.forEach(p => {
                for (let r = p.row; r < p.row + (p.rowSpan || 1); r++) {
                    for (let c = p.col; c < p.col + (p.colSpan || 1); c++) {
                        occupiedCells.add(`${r}-${c}`);
                    }
                }
            });
        }

        // Search for empty cell in viewport first, then expand
        const maxRows = canvas.dimensions?.rows || 10;
        const maxCols = canvas.dimensions?.cols || 10;

        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < maxCols; c++) {
                if (!occupiedCells.has(`${r}-${c}`)) {
                    return { row: r, col: c };
                }
            }
        }

        // All cells occupied, return next row
        return { row: maxRows, col: 0 };
    }, [canvas]);

    // Handle placement click
    const handlePlacementClick = useCallback((placement) => {
        log.debug('Placement clicked:', placement);
        // TODO: Open content or navigate
    }, []);

    // Handle cell double-click (add content)
    const handleCellDoubleClick = useCallback((row, col) => {
        log.debug('Add content at:', row, col);
        // TODO: Show add content dialog
    }, []);

    // Handle adding content to a cell from placeholder buttons
    const handleAddContent = useCallback(async (row, col, type) => {
        log.debug(`Add content requested: type=${type} at (${row}, ${col})`);

        if (!activeCanvasId) {
            log.error('No canvas available for adding content');
            return;
        }

        switch (type) {
            case 'view':
                // TODO: Implement view button functionality
                // Options to consider:
                // 1. Open file browser sidebar with target cell context
                // 2. Show dataset selector modal
                // 3. Quick-add from recent datasets
                log.debug('[STUB] View button clicked - need to implement dataset selection', { row, col });
                console.info('🔧 [TODO] View button needs implementation - should open dataset selector for cell', row, col);
                break;

            case 'notes':
                // Create a notes placement directly
                try {
                    await addPlacement({
                        row,
                        col,
                        rowSpan: 1,
                        colSpan: 1,
                        content: {
                            type: 'notes',
                            notesBlockId: null, // Will be created on first save
                        },
                    });
                    log.debug('Notes placement added');
                } catch (err) {
                    log.error('Failed to add notes placement:', err);
                }
                break;

            case 'image':
                // Dispatch event to open image selector
                window.dispatchEvent(new CustomEvent('cia:open-image-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                        purpose: 'add-image-to-cell'
                    }
                }));
                break;

            default:
                log.warn(`Unknown content type: ${type}`);
        }
    }, [activeCanvasId, addPlacement]);

    // Show error if canvas loading failed
    const showError = (canvasError || loadError) && !canvas;

    return (
        <div className="canvas-workspace">
            {/* Main content area */}
            <div className="canvas-workspace__content">
                {/* Canvas grid */}
                <div className="canvas-workspace__canvas">
                    {isLoading && !canvas ? (
                        <div className="canvas-workspace__loading">Loading canvas...</div>
                    ) : showError ? (
                        <div className="canvas-workspace__error">
                            {(canvasError || loadError)?.message || 'Failed to load canvas'}
                        </div>
                    ) : canvas ? (
                        <CanvasGrid
                            canvasId={activeCanvasId}
                            viewport={viewport}
                            placements={visiblePlacements}
                            focusedSubset={focusedSubset}
                            highlightedPlacementId={highlightedPlacementId}
                            onPlacementClick={handlePlacementClick}
                            onCellDoubleClick={handleCellDoubleClick}
                            onViewportChange={moveViewport}
                            onRemovePlacement={removePlacement}
                            onAddRow={addRow}
                            onAddColumn={addColumn}
                            onAddContent={handleAddContent}
                        />
                    ) : (
                        <div className="canvas-workspace__empty">
                            <p>No canvas selected</p>
                            <button onClick={() => {/* TODO: Create canvas */ }}>
                                Create Canvas
                            </button>
                        </div>
                    )}
                </div>

                {/* Subset panel (right sidebar) */}
                {showSubsetPanel && (
                    <div className="canvas-workspace__subset-panel">
                        <SubsetPanel
                            canvasId={activeCanvasId}
                            subsets={subsets}
                            focusedSubset={focusedSubset}
                            onEnterFocus={enterFocusMode}
                            onExitFocus={exitFocusMode}
                        />
                    </div>
                )}
            </div>

            {/* Focus mode overlay */}
            {isFocusMode && focusedSubset && (
                <FocusModeOverlay
                    subset={focusedSubset}
                    onExit={exitFocusMode}
                />
            )}
        </div>

    );
}

export default CanvasWorkspace;