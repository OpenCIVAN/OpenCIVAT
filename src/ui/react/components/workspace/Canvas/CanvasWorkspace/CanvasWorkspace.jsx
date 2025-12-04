// src/ui/react/components/workspace/Canvas/CanvasWorkspace/CanvasWorkspace.jsx
// Integration component for the new canvas system
//
// This wraps CanvasGrid with workspace selection and subset management

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CanvasGrid } from '@UI/react/components/workspace';
import { SubsetPanel } from '@UI/react/components/panels/SubsetPanel.jsx';
import { FocusModeOverlay } from '@UI/react/components/panels/FocusModeOverlay.jsx';

import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { viewConfigurationManager, datasetManager } from '@Init/appInitializer.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { workspace as log } from '@Utils/logger.js';

import './CanvasWorkspace.scss';

// Local canvas ID for fallback mode (when server APIs not available)
const LOCAL_CANVAS_ID = 'local-canvas-001';

/**
 * CanvasWorkspace - Full canvas system with workspace selection
 */
export function CanvasWorkspace({ userId, projectId: propProjectId }) {
    // Use sessionManager room ID as fallback project ID
    const projectId = useMemo(() => {
        return propProjectId || sessionManager.getRoomId?.() || 'default-project';
    }, [propProjectId]);

    const [activeCanvasId, setActiveCanvasId] = useState(null);
    const [showSubsetPanel, setShowSubsetPanel] = useState(false);
    const [highlightedPlacementId, setHighlightedPlacementId] = useState(null);
    const [isLocalCanvas, setIsLocalCanvas] = useState(false);
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

    // Load initial workspace/canvas
    useEffect(() => {
        const loadWorkspace = async () => {
            log.debug(`Loading canvases for project: ${projectId}`);

            try {
                // Try to get/create canvas from server
                const personalCanvas = await canvasManager.getPersonalCanvas(projectId);

                if (personalCanvas) {
                    log.debug(`Got personal canvas: ${personalCanvas.id}`);
                    setActiveCanvasId(personalCanvas.id);
                    setIsLocalCanvas(false);
                }
            } catch (error) {
                log.warn('Server canvas API not available, using local canvas:', error.message);
                createLocalFallbackCanvas();
            }
        };

        // Create a local fallback canvas (used when server is unavailable)
        const createLocalFallbackCanvas = () => {
            // Check if already exists
            if (canvasManager.getCanvas(LOCAL_CANVAS_ID)) {
                log.debug('Local canvas already exists, reusing');
                setActiveCanvasId(LOCAL_CANVAS_ID);
                setIsLocalCanvas(true);
                return;
            }

            // Create a canvas object that mimics WorkspaceCanvas
            const fallbackCanvas = {
                id: LOCAL_CANVAS_ID,
                name: 'My Workspace',
                projectId,
                dimensions: { rows: 6, cols: 6 },
                placements: [],
                ownership: { type: 'personal', ownerId: userId || 'local-user' },
                getPlacementsInViewport: function (vp) {
                    return this.placements.filter(p =>
                        p.row >= vp.row &&
                        p.row < vp.row + vp.rows &&
                        p.col >= vp.col &&
                        p.col < vp.col + vp.cols
                    );
                },
                getPlacementById: function (id) {
                    return this.placements.find(p => p.id === id);
                }
            };

            // Register with canvasManager so useCanvas hook works
            canvasManager._canvases.set(LOCAL_CANVAS_ID, fallbackCanvas);
            canvasManager.setActiveCanvas(LOCAL_CANVAS_ID);

            setActiveCanvasId(LOCAL_CANVAS_ID);
            setIsLocalCanvas(true);
            log.info('Created local fallback canvas');
        };

        loadWorkspace();
    }, [projectId, userId]);

    // Add placement (with local fallback)
    const addPlacement = useCallback(async (placementData) => {
        // For server-backed canvases, use the server API
        if (!isLocalCanvas && activeCanvasId) {
            return serverAddPlacement(placementData);
        }

        // Local canvas fallback - update canvasManager cache directly
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (cachedCanvas) {
            const newPlacement = {
                id: `local-placement-${Date.now()}`,
                row: placementData.row || 0,
                col: placementData.col || 0,
                rowSpan: placementData.rowSpan || 1,
                colSpan: placementData.colSpan || 1,
                content: placementData.content || { type: 'empty' },
            };

            // Update the cached canvas directly
            cachedCanvas.placements.push(newPlacement);

            // Emit event so useCanvas hook updates
            canvasManager._emit('placementAdded', {
                canvasId: activeCanvasId,
                placement: newPlacement,
                source: 'local'
            });

            return newPlacement;
        }

        throw new Error('No canvas available');
    }, [isLocalCanvas, activeCanvasId, serverAddPlacement]);

    // Add row to canvas (with local fallback)
    const addRow = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        log.debug('Adding row to canvas');

        // For local canvas, update directly
        if (isLocalCanvas) {
            cachedCanvas.dimensions.rows += 1;
            canvasManager._emit('canvasUpdated', {
                canvas: cachedCanvas,
                updates: { dimensions: cachedCanvas.dimensions },
                source: 'local'
            });
            return;
        }

        // Try server API
        try {
            await canvasManager.updateCanvas(activeCanvasId, {
                dimensions: { ...cachedCanvas.dimensions, rows: cachedCanvas.dimensions.rows + 1 }
            });
        } catch (error) {
            log.warn('Server update failed, updating locally:', error.message);
            cachedCanvas.dimensions.rows += 1;
            canvasManager._emit('canvasUpdated', {
                canvas: cachedCanvas,
                updates: { dimensions: cachedCanvas.dimensions },
                source: 'local'
            });
        }
    }, [isLocalCanvas, activeCanvasId]);

    // Add column to canvas (with local fallback)
    const addColumn = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        log.debug('Adding column to canvas');

        // For local canvas, update directly
        if (isLocalCanvas) {
            cachedCanvas.dimensions.cols += 1;
            canvasManager._emit('canvasUpdated', {
                canvas: cachedCanvas,
                updates: { dimensions: cachedCanvas.dimensions },
                source: 'local'
            });
            return;
        }

        // Try server API
        try {
            await canvasManager.updateCanvas(activeCanvasId, {
                dimensions: { ...cachedCanvas.dimensions, cols: cachedCanvas.dimensions.cols + 1 }
            });
        } catch (error) {
            log.warn('Server update failed, updating locally:', error.message);
            cachedCanvas.dimensions.cols += 1;
            canvasManager._emit('canvasUpdated', {
                canvas: cachedCanvas,
                updates: { dimensions: cachedCanvas.dimensions },
                source: 'local'
            });
        }
    }, [isLocalCanvas, activeCanvasId]);

    // Remove placement (with local fallback)
    const removePlacement = useCallback(async (placementId) => {
        if (!placementId) return;

        log.debug('Removing placement:', placementId);

        // For server-backed canvases, use the server API
        if (!isLocalCanvas && activeCanvasId) {
            try {
                await canvasManager.removePlacement(placementId);
                return;
            } catch (error) {
                log.error('Failed to remove placement via server:', error);
                // Fall through to local removal
            }
        }

        // Local canvas fallback - update canvasManager cache directly
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (cachedCanvas) {
            const idx = cachedCanvas.placements.findIndex(p => p.id === placementId);
            if (idx !== -1) {
                const removed = cachedCanvas.placements.splice(idx, 1)[0];

                // Emit event so useCanvas hook updates
                canvasManager._emit('placementRemoved', {
                    canvasId: activeCanvasId,
                    placement: removed,
                    placementId,
                    source: 'local'
                });

                log.debug('Placement removed:', placementId);
            }
        }
    }, [isLocalCanvas, activeCanvasId]);

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

    // Listen for instance creation events (same as WorkspaceGrid)
    useEffect(() => {
        if (!activeCanvasId) return;

        const handleInstanceRequest = async (event) => {
            // Prevent duplicate handling
            if (instanceCreationInProgress.current) return;

            const datasetId = event.detail?.datasetId || event.detail?.fileId;
            const viewConfigId = event.detail?.viewConfigId || event.detail?.viewId;
            const spawnNew = event.detail?.spawnNew;
            const duplicateViewId = event.detail?.duplicateViewId;

            log.debug('Canvas instance request:', { datasetId, viewConfigId, spawnNew });

            if (!datasetId || typeof datasetId !== 'string') {
                log.error('Invalid dataset ID:', datasetId);
                return;
            }

            instanceCreationInProgress.current = true;

            try {
                // Get the dataset
                let dataset = datasetManager.getDataset(datasetId);

                if (!dataset) {
                    log.info(`Dataset ${datasetId} not found locally, syncing from server...`);
                    await datasetManager.syncDatasetsFromServer();
                    dataset = datasetManager.getDataset(datasetId);
                }

                if (!dataset) {
                    log.error('Dataset not found after sync:', datasetId);
                    return;
                }

                // Check if view already exists on canvas
                const isPlaceholder = viewConfigId && viewConfigId.startsWith('placeholder-');

                if (viewConfigId && !isPlaceholder && !spawnNew && canvas) {
                    const existingPlacement = canvas.placements?.find(
                        p => p.content?.viewConfigurationId === viewConfigId
                    );
                    if (existingPlacement) {
                        log.debug(`Highlighting existing placement for view ${viewConfigId}`);
                        setHighlightedPlacementId(existingPlacement.id);
                        // Navigate viewport to show this placement
                        navigateTo(existingPlacement.row, existingPlacement.col);
                        setTimeout(() => setHighlightedPlacementId(null), 1500);
                        return;
                    }
                }

                // Determine which view to use
                let finalViewConfigId = viewConfigId;

                // Handle view duplication
                if (duplicateViewId) {
                    log.debug(`Duplicating view ${duplicateViewId}`);
                    const newViewConfig = await viewConfigurationManager.duplicateView(duplicateViewId);
                    if (newViewConfig) {
                        finalViewConfigId = newViewConfig.id;
                    }
                } else if (!viewConfigId || isPlaceholder || spawnNew) {
                    // Create new view configuration
                    log.debug(`Creating new view for dataset ${datasetId}`);
                    const newViewConfig = await viewConfigurationManager.createView(datasetId, {
                        name: `View of ${dataset.filename || dataset.fileName || 'Unknown'}`,
                        instanceType: dataset.metadata?.defaultInstanceType || 'vtk'
                    });
                    if (newViewConfig) {
                        finalViewConfigId = newViewConfig.id;
                    }
                }

                if (!finalViewConfigId) {
                    log.error('Could not resolve view configuration');
                    return;
                }

                // Find empty cell and add placement
                const { row, col } = findNextEmptyCell();
                log.debug(`Adding placement at (${row}, ${col}) for view ${finalViewConfigId}`);

                await addPlacement({
                    row,
                    col,
                    rowSpan: 1,
                    colSpan: 1,
                    content: {
                        type: 'view',
                        viewConfigurationId: finalViewConfigId,
                    },
                });

                // Navigate viewport to show new placement
                navigateTo(Math.max(0, row - 1), Math.max(0, col - 1));

            } catch (error) {
                log.error('Failed to handle instance request:', error);
            } finally {
                instanceCreationInProgress.current = false;
            }
        };

        window.addEventListener('cia:create-instance', handleInstanceRequest);
        window.addEventListener('cia:request-instance', handleInstanceRequest);

        return () => {
            window.removeEventListener('cia:create-instance', handleInstanceRequest);
            window.removeEventListener('cia:request-instance', handleInstanceRequest);
        };
    }, [activeCanvasId, canvas, addPlacement, navigateTo, findNextEmptyCell]);

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

    // Show error only if no canvas is available (not using local fallback)
    const showError = canvasError && !isLocalCanvas && !canvas;

    return (
        <div className="canvas-workspace">
            {/* Main content area */}
            <div className="canvas-workspace__content">
                {/* Canvas grid */}
                <div className="canvas-workspace__canvas">
                    {isLoading && !canvas ? (
                        <div className="canvas-workspace__loading">Loading canvas...</div>
                    ) : showError ? (
                        <div className="canvas-workspace__error">{canvasError}</div>
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