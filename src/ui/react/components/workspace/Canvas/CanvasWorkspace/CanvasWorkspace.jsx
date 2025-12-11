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
import { viewConfigurationManager, datasetManager } from '@Init/appInitializer.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { workspace as log } from '@Utils/logger.js';

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

    // Handle file drops to specific cells
    useEffect(() => {
        const handleFileToCell = async (event) => {
            const { file, targetRow, targetCol, canvasId } = event.detail;

            if (canvasId !== activeCanvasId) {
                log.debug('File drop for different canvas, ignoring');
                return;
            }

            log.info(`Loading file ${file.name} into cell [${targetRow}, ${targetCol}]`);

            try {
                // Check if file is already loaded as a dataset
                let datasetId = file.id;
                const existingDataset = window.CIA?.datasetManager?.getDataset(file.id);

                if (!existingDataset) {
                    // File not loaded yet - need to load it first
                    log.debug('File not loaded, fetching from server...');

                    const downloadUrl = file.downloadUrl ||
                        `${window.CIA_CONFIG?.apiBaseUrl || 'http://localhost:3001'}/api/files/${file.id}/download`;

                    const response = await fetch(downloadUrl, {
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to download file: ${response.status}`);
                    }

                    const blob = await response.blob();
                    const fileObj = new File([blob], file.name, {
                        type: file.mimeType || 'application/octet-stream',
                    });

                    // Add to DatasetManager
                    const dataset = await window.CIA.datasetManager.addDataset(fileObj, {
                        userId: file.uploadedBy || 'system',
                        serverId: file.id,
                        serverMetadata: {
                            fileType: file.fileType,
                            hash: file.hash,
                            uploadedAt: file.uploadedAt,
                        },
                    });

                    datasetId = dataset.id;
                    log.info(`File loaded into DatasetManager: ${datasetId}`);
                }

                // Now dispatch instance request with target position
                window.dispatchEvent(new CustomEvent('cia:request-instance', {
                    detail: {
                        datasetId,
                        spawnNew: true,
                        targetRow,
                        targetCol,
                        canvasId: activeCanvasId,
                        fileName: file.name,
                        fileType: file.fileType,
                    },
                }));

            } catch (error) {
                log.error('Failed to load file to cell:', error);
                // Optionally show toast
            }
        };

        window.addEventListener('cia:load-file-to-cell', handleFileToCell);
        return () => window.removeEventListener('cia:load-file-to-cell', handleFileToCell);
    }, [activeCanvasId]);

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