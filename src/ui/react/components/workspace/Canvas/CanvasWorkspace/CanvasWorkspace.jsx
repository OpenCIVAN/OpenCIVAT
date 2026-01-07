// src/ui/react/components/workspace/Canvas/CanvasWorkspace/CanvasWorkspace.jsx
// Integration component for the new canvas system
//
// This wraps CanvasGrid with:
// - ViewStackProvider for navigation (Grid → Focus → Subset)
// - Canvas chrome (Header, Toolbar, StatusBar)
// - Edge triggers and floating panels

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CanvasGrid } from '@UI/react/components/workspace';
import { SubsetPanel } from '@UI/react/components/panels/SubsetPanel';
import { FocusModeOverlay } from '@UI/react/components/panels/FocusModeOverlay';

// New canvas chrome components
import { CanvasHeaderBar } from '../CanvasHeaderBar/CanvasHeaderBar.jsx';
import { CanvasToolbar } from '../CanvasToolbar/CanvasToolbar.jsx';
import { CanvasInfoFooter } from '../CanvasInfoFooter/CanvasInfoFooter.jsx';
import { EdgeTrigger, FloatingPanel } from '../EdgePanels';
import { FloatingCanvasWrapper, CANVAS_MODES, ASPECT_RATIOS } from '../FloatingCanvas';

import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { ViewStackProvider, useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { workspace as log } from '@Utils/logger.js';
// Viewport sync handled by CanvasGrid - no need to import here

import './CanvasWorkspace.scss';

/**
 * CanvasWorkspaceInner - Internal component with ViewStack context
 */
function CanvasWorkspaceInner({ userId, projectId: propProjectId, leftPanelContent, rightPanelContent }) {
    // Use sessionManager room ID as fallback project ID
    const projectId = useMemo(() => {
        return propProjectId || sessionManager.getRoomId?.() || 'default-project';
    }, [propProjectId]);

    const [activeCanvasId, setActiveCanvasId] = useState(null);
    const [showSubsetPanel, setShowSubsetPanel] = useState(false);
    const [highlightedPlacementId, setHighlightedPlacementId] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const instanceCreationInProgress = useRef(false);

    // Floating panel state
    const [leftPanelOpen, setLeftPanelOpen] = useState(false);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);

    // Grid size state
    const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });

    // Canvas mode state (dock/float/fullscreen)
    const [canvasMode, setCanvasMode] = useState(CANVAS_MODES.DOCKED);
    const [aspectRatio, setAspectRatio] = useState('FREE');
    const [floatingPosition, setFloatingPosition] = useState({ x: 100, y: 100 });
    const [floatingSize, setFloatingSize] = useState({ width: 800, height: 600 });

    // Header bar state (edit mode, tools, flow)
    const [editMode, setEditMode] = useState(false);
    const [activeTool, setActiveTool] = useState('select');
    const [flowDirection, setFlowDirection] = useState('row');

    // Links state
    const [viewLinks, setViewLinks] = useState({});
    const [recentUnlinks, setRecentUnlinks] = useState([]);

    // Canvas hook for the active canvas
    const {
        canvas,
        viewport,
        visiblePlacements,
        loading: isLoading,
        error: canvasError,
        moveViewport,
        setViewportPosition: navigateTo,
        setViewportSize,
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

    // NOTE: Viewport sync events are handled by CanvasGrid directly
    // Do NOT listen here to avoid double movement

    // Sync local gridSize display state with actual viewport from useCanvas
    useEffect(() => {
        if (viewport?.rows && viewport?.cols) {
            setGridSize({ rows: viewport.rows, cols: viewport.cols });
        }
    }, [viewport?.rows, viewport?.cols]);

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

    // Access view stack for navigation
    const {
        focusView,
        openSubset,
        isGridView,
        isFocusView,
        isSubsetView,
        goHome,
        currentView,
    } = useViewStack();

    // Compute view mode for toolbar based on view stack state
    const toolbarViewMode = useMemo(() => {
        if (isFocusView) return 'focus';
        if (isSubsetView) return 'subset';
        return 'normal';
    }, [isFocusView, isSubsetView]);

    // Handle toolbar mode change - enter/exit focus/subset modes
    const handleToolbarModeChange = useCallback((mode) => {
        log.debug('Toolbar mode change:', mode);

        if (mode === 'normal') {
            // Exit to grid view
            goHome();
        } else if (mode === 'focus') {
            // Enter focus mode with active view
            // Find the active/highlighted placement
            const activePlacement = canvas?.placements?.find(p => p.id === highlightedPlacementId);
            if (activePlacement) {
                const viewId = activePlacement.content?.viewConfigurationId;
                let viewName = 'View';
                if (viewId) {
                    try {
                        const view = getViewConfigurationManager()?.getView(viewId);
                        if (view) {
                            const dataset = getDatasetManager()?.getDataset(view.datasetId);
                            viewName = dataset?.filename || view.name || 'View';
                        }
                    } catch (e) {
                        // Fall through
                    }
                }
                focusView({
                    placementId: activePlacement.id,
                    viewConfigurationId: viewId,
                    name: viewName,
                    row: activePlacement.row,
                    col: activePlacement.col,
                });
            } else {
                // No active view - try to focus the first view on canvas
                const firstViewPlacement = canvas?.placements?.find(p => p.content?.viewConfigurationId);
                if (firstViewPlacement) {
                    const viewId = firstViewPlacement.content?.viewConfigurationId;
                    let viewName = 'View';
                    if (viewId) {
                        try {
                            const view = getViewConfigurationManager()?.getView(viewId);
                            if (view) {
                                const dataset = getDatasetManager()?.getDataset(view.datasetId);
                                viewName = dataset?.filename || view.name || 'View';
                            }
                        } catch (e) {
                            // Fall through
                        }
                    }
                    focusView({
                        placementId: firstViewPlacement.id,
                        viewConfigurationId: viewId,
                        name: viewName,
                        row: firstViewPlacement.row,
                        col: firstViewPlacement.col,
                    });
                } else {
                    log.warn('No views available to focus');
                }
            }
        } else if (mode === 'subset') {
            // TODO: Enter subset mode
            log.debug('Subset mode requested - not yet implemented');
        }
    }, [goHome, focusView, canvas?.placements, highlightedPlacementId]);

    // Handle placement click (single click - select)
    const handlePlacementClick = useCallback((placement) => {
        log.debug('Placement clicked:', placement);
        // Single click selects the view
        setHighlightedPlacementId(placement.id);
    }, []);

    // Handle placement double-click (focus view - per memory log)
    const handlePlacementDoubleClick = useCallback((placement) => {
        log.debug('Placement double-clicked:', placement);

        // Check if it's a subset
        if (placement.content?.type === 'subset') {
            // Double-click subset → open subset view
            openSubset({
                subsetId: placement.content.subsetId,
                name: placement.content.name || 'Subset',
                views: placement.content.views || [],
            });
        } else {
            // Double-click view → focus mode
            focusView({
                placementId: placement.id,
                name: placement.content?.name || 'View',
                row: placement.row,
                col: placement.col,
            });
        }
    }, [focusView, openSubset]);

    // Handle cell double-click (empty cell - add content)
    const handleCellDoubleClick = useCallback((row, col) => {
        log.debug('Empty cell double-clicked at:', row, col);
        // Empty cells trigger add content dialog
        // This is handled by the CanvasGrid component
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
                console.info('[TODO] View button needs implementation - should open dataset selector for cell', row, col);
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

    // Compute cell size and render mode
    const cellSize = useMemo(() => {
        // Estimate based on viewport size (will be more accurate with actual measurements)
        const avgWidth = 300;
        const avgHeight = 250;
        return { width: avgWidth, height: avgHeight };
    }, []);

    const renderMode = useMemo(() => {
        const minDimension = Math.min(cellSize.width, cellSize.height);
        if (minDimension >= 200) return 'full';
        if (minDimension >= 150) return 'compact';
        if (minDimension >= 80) return 'thumbnail';
        return 'snapshot';
    }, [cellSize]);

    // Canvas dimensions
    const canvasSize = useMemo(() => ({
        cols: canvas?.dimensions?.cols || 10,
        rows: canvas?.dimensions?.rows || 10,
    }), [canvas]);

    // Panel toggle handlers
    const toggleLeftPanel = useCallback(() => {
        setLeftPanelOpen(prev => !prev);
    }, []);

    const toggleRightPanel = useCallback(() => {
        setRightPanelOpen(prev => !prev);
    }, []);

    // Link management handlers
    const handleUpdateLink = useCallback((typeId, targetId, direction) => {
        setViewLinks(prev => {
            const newLinks = { ...prev };
            if (targetId === null) {
                // Unlink - save to recent unlinks first
                if (prev[typeId]?.targetId) {
                    setRecentUnlinks(recent => [
                        { typeId, targetId: prev[typeId].targetId, direction: prev[typeId].direction },
                        ...recent.slice(0, 4)
                    ]);
                }
                delete newLinks[typeId];
            } else {
                newLinks[typeId] = { targetId, direction };
            }
            return newLinks;
        });
    }, []);

    const handleRestoreLink = useCallback((typeId, targetId, direction) => {
        setViewLinks(prev => ({
            ...prev,
            [typeId]: { targetId, direction }
        }));
        setRecentUnlinks(recent => recent.filter(u => !(u.typeId === typeId && u.targetId === targetId)));
    }, []);

    // Get current active view for links
    const activeViewForLinks = useMemo(() => {
        if (!highlightedPlacementId) return null;
        const placement = visiblePlacements.find(p => p.id === highlightedPlacementId);
        if (!placement) return null;
        return {
            id: placement.id,
            name: placement.content?.name || `View ${placement.row},${placement.col}`,
            type: placement.content?.type || 'vtk',
            color: placement.content?.color || '#60a5fa',
            position: { row: placement.row, col: placement.col },
        };
    }, [highlightedPlacementId, visiblePlacements]);

    return (
        <FloatingCanvasWrapper
            canvasMode={canvasMode}
            aspectRatio={aspectRatio}
            position={floatingPosition}
            size={floatingSize}
            onPositionChange={setFloatingPosition}
            onSizeChange={setFloatingSize}
            onModeChange={setCanvasMode}
        >
            <div className="canvas-workspace">
                {/* Canvas Header Bar - Room/Workspace/Edit/Flow/Size/CanvasMode */}
                <CanvasHeaderBar
                    // Room props (uses RoomPresenceIndicator)
                    room={{ id: 'main', name: 'Main Room', type: 'main' }}
                    roomMembers={[
                        { id: 'user1', name: 'Alice', color: '#60a5fa' },
                        { id: 'user2', name: 'Bob', color: '#4ade80' },
                        { id: 'user3', name: 'Carol', color: '#f472b6' },
                    ]}
                    availableRooms={[]}
                    onRoomChange={() => {}}
                    onOpenRoomsPanel={() => {}}
                    onCreateRoom={() => {}}
                    // Workspace props (uses WorkspaceSelector)
                    workspace={{ id: projectId, name: 'Workspace', type: 'project' }}
                    workspaces={[{ id: projectId, name: 'Workspace', type: 'project' }]}
                    onWorkspaceChange={() => {}}
                    onCreateWorkspace={() => {}}
                    // Edit tools
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    mergeMode={false}
                    onMergeModeChange={() => {}}
                    editMode={editMode}
                    onEditModeChange={setEditMode}
                    // Flow (uses FlowDirectionToggle)
                    flowDirection={flowDirection}
                    onFlowDirectionChange={setFlowDirection}
                    // Size (uses CanvasSizeDisplay and ViewportSizeDisplay from bars)
                    canvasSize={canvasSize}
                    viewportSize={gridSize}
                    canvasPlacements={visiblePlacements}
                    onCanvasSizeChange={async (newSize) => {
                        // Update canvas dimensions on server
                        if (!activeCanvasId) return;
                        const currentCanvas = canvasManager.getCanvas(activeCanvasId);
                        if (!currentCanvas) return;

                        const newDimensions = {
                            ...currentCanvas.dimensions,
                            rows: newSize.rows,
                            cols: newSize.cols,
                        };
                        await canvasManager.updateCanvas(activeCanvasId, { dimensions: newDimensions });
                    }}
                    onViewportSizeChange={(newSize) => {
                        // Update viewport size in useCanvas hook (this is the actual viewport used by CanvasGrid)
                        setViewportSize(newSize.rows, newSize.cols);
                        // Also update local gridSize state for UI display consistency
                        setGridSize({ rows: newSize.rows, cols: newSize.cols });
                    }}
                    // Canvas mode
                    canvasMode={canvasMode}
                    onCanvasModeChange={setCanvasMode}
                />

                {/* Main content area */}
                <div className="canvas-workspace__content">
                {/* Left Edge Trigger */}
                <EdgeTrigger
                    side="left"
                    onClick={toggleLeftPanel}
                    active={leftPanelOpen}
                />

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
                            onPlacementDoubleClick={handlePlacementDoubleClick}
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

                {/* Right Edge Trigger */}
                <EdgeTrigger
                    side="right"
                    onClick={toggleRightPanel}
                    active={rightPanelOpen}
                />

                {/* Subset panel (right sidebar) - legacy, will be replaced by FloatingPanel */}
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

                {/* Left Floating Panel */}
                <FloatingPanel
                    side="left"
                    visible={leftPanelOpen}
                    onClose={() => setLeftPanelOpen(false)}
                    title="Files"
                    width={280}
                >
                    {leftPanelContent}
                </FloatingPanel>

                {/* Right Floating Panel */}
                <FloatingPanel
                    side="right"
                    visible={rightPanelOpen}
                    onClose={() => setRightPanelOpen(false)}
                    title="Properties"
                    width={280}
                >
                    {rightPanelContent}
                </FloatingPanel>
            </div>

            {/* Canvas Toolbar - Navigation + History + ViewContextBlock */}
            {/* Note: Navigation and ViewContextBlock use useViewContextLogic hook internally */}
            {/* which connects to LayoutPanelContext for viewport state */}
            <CanvasToolbar
                // History
                canUndo={false}
                canRedo={false}
                onUndo={() => {}}
                onRedo={() => {}}

                // View mode (for ViewContextBlock)
                viewMode={toolbarViewMode}
                onModeChange={handleToolbarModeChange}

                // Quick actions (for ViewContextBlock)
                onSnapshot={() => {
                    log.debug('Snapshot requested');
                }}
                onDuplicate={() => {
                    log.debug('Duplicate requested');
                }}
                onSettings={() => {
                    log.debug('Settings requested');
                }}
            />

            {/* Canvas Info Footer - Canvas/Viewport/Cell size + Sync status */}
            {/* Placed below toolbar to separate from app footer */}
            <CanvasInfoFooter
                canvasSize={canvasSize}
                viewportSize={gridSize}
                cellSize={cellSize}
                collaboratorCount={3} // TODO: Get from actual collab state
                syncStatus="synced" // TODO: Get from actual sync state
                onOpenNavigator={() => {
                    // TODO: Open canvas navigator
                }}
            />

            {/* Focus mode overlay */}
            {isFocusMode && focusedSubset && (
                <FocusModeOverlay
                    subset={focusedSubset}
                    onExit={exitFocusMode}
                />
            )}
            </div>
        </FloatingCanvasWrapper>
    );
}

/**
 * CanvasWorkspace - Full canvas system with workspace selection
 *
 * Wraps the inner component with ViewStackProvider for navigation state
 * Server-authoritative: No local fallback. Shows connection overlay when disconnected.
 */
export function CanvasWorkspace({ userId, projectId, leftPanelContent, rightPanelContent }) {
    return (
        <ViewStackProvider>
            <CanvasWorkspaceInner
                userId={userId}
                projectId={projectId}
                leftPanelContent={leftPanelContent}
                rightPanelContent={rightPanelContent}
            />
        </ViewStackProvider>
    );
}

export default CanvasWorkspace;