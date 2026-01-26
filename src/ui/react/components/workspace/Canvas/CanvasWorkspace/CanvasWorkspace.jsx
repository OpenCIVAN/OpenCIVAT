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
import { SubsetSelectorModal } from '@UI/react/components/modals/SubsetSelectorModal';

// New canvas chrome components
import { CanvasChrome } from '../CanvasChrome/CanvasChrome.jsx';
import { CanvasInfoFooter } from '../CanvasInfoFooter/CanvasInfoFooter.jsx';
import { EdgeTrigger, FloatingPanel } from '../EdgePanels';
import { FloatingCanvasWrapper, CANVAS_MODES, ASPECT_RATIOS } from '../FloatingCanvas';
import { Footer2 } from '@UI/react/components/organisms/Footer2';
import { CreateWorkspacePanel } from '@UI/react/components/panels/FloatingPanel';

import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { ViewStackProvider, useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic.js';
import { useViewGroupManagerSync } from '@UI/react/hooks/useViewGroupManagerSync.js';
import { useViewGroups, useViewGroupLinks, useViewLinks } from '@UI/react/hooks';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
import { useWorkspaces } from '@UI/react/hooks/useWorkspaces.js';
import { useRoomActions } from '@UI/react/hooks/useRoomPresence.js';
import { useRoomsTab } from '@UI/react/components/panels/RightPanel/tabs/RoomsTab/hooks/useRoomsTab.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { workspace as log } from '@Utils/logger.js';
import { normalizeInstanceToolsResult } from '@UI/react/utils/instanceTools.js';
// Viewport sync handled by CanvasGrid - no need to import here

import './CanvasWorkspace.scss';

/**
 * CanvasWorkspaceInner - Internal component with ViewStack context
 */
function CanvasWorkspaceInner({ userId, projectId: propProjectId, leftPanelContent, rightPanelContent }) {
    const layoutContext = useLayoutContext();
    const setLeftDockedOpen = layoutContext?.setLeftOpen || (() => { });
    const setRightDockedOpen = layoutContext?.setRightOpen || (() => { });
    // Use sessionManager room ID as fallback project ID
    const projectId = useMemo(() => {
        return propProjectId || sessionManager.getRoomId?.() || 'default-project';
    }, [propProjectId]);

    const [activeCanvasId, setActiveCanvasId] = useState(null);
    const [showSubsetPanel, setShowSubsetPanel] = useState(false);
    const [showSubsetSelector, setShowSubsetSelector] = useState(false);
    const [highlightedPlacementId, setHighlightedPlacementId] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const instanceCreationInProgress = useRef(false);

    // Floating panel state
    const [leftPanelOpen, setLeftPanelOpen] = useState(false);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [showCreateWorkspacePanel, setShowCreateWorkspacePanel] = useState(false);

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
    const [mergeMode, setMergeMode] = useState(false);
    const [flowDirection, setFlowDirection] = useState('row');
    const [showCoordinates, setShowCoordinates] = useState(false);
    const [showViewGroupBorders, setShowViewGroupBorders] = useState(false);

    // Rooms and workspaces hooks
    const { currentRoom } = useRoomsTab({ projectId });

    const { setWorkspace: setWorkspacePresence } = useRoomActions();

    const {
        workspaces: allWorkspaces,
        currentWorkspaceId,
        selectWorkspace,
        createBreakout,
        createProjectWorkspace,
    } = useWorkspaces({ userId, projectId });

    // Transform workspaces for the selector
    const workspacesForSelector = useMemo(() => {
        return allWorkspaces || [];
    }, [allWorkspaces]);

    const currentWorkspace = useMemo(() => {
        return allWorkspaces?.find(ws => ws.id === currentWorkspaceId) || null;
    }, [allWorkspaces, currentWorkspaceId]);

    // Handle workspace change
    const handleWorkspaceChange = useCallback((workspaceId) => {
        selectWorkspace(workspaceId);
        setWorkspacePresence(workspaceId);
    }, [selectWorkspace, setWorkspacePresence]);

    const handleWorkspaceSelect = useCallback((workspaceItem) => {
        const workspaceId = workspaceItem?.id || workspaceItem;
        if (workspaceId) {
            handleWorkspaceChange(workspaceId);
        }
    }, [handleWorkspaceChange]);

    // Handle workspace creation - open the panel
    const handleOpenCreateWorkspace = useCallback(() => {
        setShowCreateWorkspacePanel(true);
    }, []);

    // Handle actual workspace creation from the panel
    const handleCreateWorkspace = useCallback(async ({ name, description, type }) => {
        try {
            let workspace;
            if (type === 'breakout') {
                workspace = await createBreakout(name, 2, currentRoom?.id);
            } else {
                workspace = await createProjectWorkspace(name, description);
            }

            if (workspace) {
                // Select the newly created workspace
                selectWorkspace(workspace.id);
                setWorkspacePresence(workspace.id);
                log.info('Created and selected workspace:', workspace.name);
            }
        } catch (error) {
            log.error('Failed to create workspace:', error);
            throw error; // Re-throw so the panel can handle it
        }
    }, [createProjectWorkspace, createBreakout, selectWorkspace, setWorkspacePresence, currentRoom]);

    // Dispatch edit mode changes to CanvasGrid
    const handleEditModeChange = useCallback((newEditMode) => {
        setEditMode(newEditMode);
        window.dispatchEvent(new CustomEvent('canvas:editModeChange', {
            detail: { editMode: newEditMode }
        }));
    }, []);

    // Dispatch tool changes to CanvasGrid
    const handleToolChange = useCallback((newTool) => {
        setActiveTool(newTool);
        window.dispatchEvent(new CustomEvent('canvas:toolChange', {
            detail: { tool: newTool }
        }));
        // Pan tool automatically enables edit mode
        if (newTool === 'pan') {
            handleEditModeChange(true);
        }
    }, [handleEditModeChange]);

    // Handle merge mode toggle
    const handleMergeModeChange = useCallback((newMergeMode) => {
        setMergeMode(newMergeMode);
        if (newMergeMode) {
            // Entering merge mode also enables edit mode
            handleEditModeChange(true);
        }
        window.dispatchEvent(new CustomEvent('canvas:mergeModeChange', {
            detail: { mergeMode: newMergeMode }
        }));
    }, [handleEditModeChange]);

    const handleEditBarGridAction = useCallback((action) => {
        switch (action) {
            case 'merge':
                handleMergeModeChange(!mergeMode);
                break;
            case 'split':
            case 'swap':
            default:
                log.debug(`Canvas edit action not yet implemented: ${action}`);
                break;
        }
    }, [handleMergeModeChange, mergeMode]);

    const handleEditBarRowAction = useCallback((action) => {
        if (action === 'add') {
            if (flowDirection === 'row') {
                addColumn();
            } else {
                addRow();
            }
            return;
        }

        if (action === 'remove') {
            if (flowDirection === 'row') {
                removeColumn();
            } else {
                removeRow();
            }
        }
    }, [addColumn, addRow, removeColumn, removeRow, flowDirection]);

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
        activeSubset: focusedSubset,
        inFocusMode: isFocusMode,
        selectionMode,
        selectedIds,
        createSubset,
        enterFocusMode,
        exitFocusMode,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        addPlacementsToSubset,
    } = useSubsets(activeCanvasId);

    const handleDockLeftPanel = useCallback(() => {
        setLeftDockedOpen(true);
        setLeftPanelOpen(false);
    }, [setLeftDockedOpen, setLeftPanelOpen]);

    const handleDockRightPanel = useCallback(() => {
        setRightDockedOpen(true);
        setRightPanelOpen(false);
    }, [setRightDockedOpen, setRightPanelOpen]);

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

    const removeRow = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        const nextRows = Math.max(1, cachedCanvas.dimensions.rows - 1);
        log.debug('Removing row from canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, rows: nextRows }
        });
    }, [activeCanvasId]);

    const removeColumn = useCallback(async () => {
        const cachedCanvas = canvasManager.getCanvas(activeCanvasId);
        if (!cachedCanvas) return;

        const nextCols = Math.max(1, cachedCanvas.dimensions.cols - 1);
        log.debug('Removing column from canvas');
        await canvasManager.updateCanvas(activeCanvasId, {
            dimensions: { ...cachedCanvas.dimensions, cols: nextCols }
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
        goBack,
        canGoBack,
        currentView,
    } = useViewStack();

    // Get active view from view context (source of truth for what's currently selected)
    const {
        activeView: contextActiveView,
        onCanvasViews,
        availableViews,
        onSelectView: contextSelectView,
        onPlaceView: contextPlaceView,
        onViewAction: contextViewAction,
    } = useViewContextLogic();

    // Connect WebSocket broadcasts to ViewGroupManager
    useViewGroupManagerSync();

    // ViewGroup data for header and footer (shared source of truth)
    const {
        visibleViewGroups,
        activeViewGroupId,
        createViewGroup,
        updateViewGroup,
        deleteViewGroup,
        duplicateViewGroup,
        selectViewGroup,
        goToViewGroup,
    } = useViewGroups(currentWorkspaceId || projectId);

    const { isLinked: isViewGroupLinked } = useViewGroupLinks(activeViewGroupId);
    const { links: activeViewLinks } = useViewLinks(contextActiveView?.id);

    const formattedViewGroups = useMemo(() => (
        visibleViewGroups.map(vg => ({
            id: vg.id,
            name: vg.name || 'Untitled Group',
            color: vg.color,
            layoutId: vg.layoutId,
            views: vg.getViewIds?.() || [],
            linkedTo: vg.link?.targetGroupId || null,
            linkedToName: vg.link?.targetGroupName || null,
        }))
    ), [visibleViewGroups]);

    const activeHeaderViewGroup = useMemo(() => (
        formattedViewGroups.find(vg => vg.id === activeViewGroupId) || null
    ), [formattedViewGroups, activeViewGroupId]);

    const linkingServiceAdapter = useMemo(() => {
        if (!activeViewLinks || activeViewLinks.length === 0) return null;

        const linksByProperty = {};
        for (const link of activeViewLinks) {
            if (!linksByProperty[link.property]) {
                linksByProperty[link.property] = [];
            }
            const otherId = link.sourceViewId === contextActiveView?.id
                ? link.targetViewId
                : link.sourceViewId;
            linksByProperty[link.property].push({
                ...link,
                targetId: otherId,
            });
        }

        return {
            getLinksForProperty: (viewGroupId, propertyId) => {
                return linksByProperty[propertyId] || [];
            },
        };
    }, [activeViewLinks, contextActiveView?.id]);

    const handleSelectViewGroup = useCallback((viewGroupId) => {
        selectViewGroup(viewGroupId);
    }, [selectViewGroup]);

    const handleCreateViewGroup = useCallback(async (layoutId, templateId) => {
        try {
            await createViewGroup(layoutId, templateId);
        } catch (error) {
            log.error('Failed to create ViewGroup:', error);
        }
    }, [createViewGroup]);

    const handleUpdateViewGroup = useCallback(async (viewGroupId, updates) => {
        try {
            await updateViewGroup(viewGroupId, updates);
        } catch (error) {
            log.error('Failed to update ViewGroup:', error);
        }
    }, [updateViewGroup]);

    const handleDeleteViewGroup = useCallback(async (viewGroupId) => {
        try {
            await deleteViewGroup(viewGroupId);
        } catch (error) {
            log.error('Failed to delete ViewGroup:', error);
        }
    }, [deleteViewGroup]);

    const handleDuplicateViewGroup = useCallback(async (viewGroupId, linkOption) => {
        try {
            const linkOptionMap = {
                keepIndividual: 'keep_individual',
                linkToOriginal: 'link_to_original',
                noLinks: 'no_links',
            };

            await duplicateViewGroup(viewGroupId, {
                linkOption: linkOptionMap[linkOption] || 'no_links',
            });
        } catch (error) {
            log.error('Failed to duplicate ViewGroup:', error);
        }
    }, [duplicateViewGroup]);

    const handleGoToViewGroup = useCallback((viewGroupId) => {
        goToViewGroup(viewGroupId);
    }, [goToViewGroup]);

    // Dynamic footer width measurement
    const footerRef = useRef(null);
    const [footerWidth, setFooterWidth] = useState(1200);

    useEffect(() => {
        if (!footerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setFooterWidth(entry.contentRect.width);
            }
        });
        observer.observe(footerRef.current);
        return () => observer.disconnect();
    }, []);

    // Get layout context for panel focus mode (collapse panels when entering focus view)
    // Renamed to avoid collision with useSubsets's enterFocusMode/exitFocusMode
    const {
        enterFocusMode: enterPanelFocusMode,
        exitFocusMode: exitPanelFocusMode
    } = useLayoutContext();

    // Track previous focus view state to detect exit
    const wasFocusViewRef = useRef(isFocusView);

    // Restore panels when exiting focus view (e.g., pressing Escape, clicking back)
    useEffect(() => {
        // Detect transition from focus view to non-focus view
        if (wasFocusViewRef.current && !isFocusView) {
            exitPanelFocusMode?.();
        }
        wasFocusViewRef.current = isFocusView;
    }, [isFocusView, exitPanelFocusMode]);

    // ==========================================================================
    // INSTANCE TOOLS STATE (from handler)
    // ==========================================================================

    const [instanceToolsData, setInstanceToolsData] = useState({ sections: [], tools: [] });

    // Load tools when active instance changes
    useEffect(() => {
        const loadInstanceTools = () => {
            const instance = workspaceManager?.getActiveInstance?.();
            log.debug('InstanceTools: Active instance:', instance?.instanceId);

            if (!instance?.instanceId) {
                log.debug('InstanceTools: No active instance, clearing tools');
                setInstanceToolsData({ sections: [], tools: [] });
                return;
            }

            try {
                // Get structured tools from the instance handler
                const result = workspaceManager.getInstanceTools(instance.instanceId);
                const normalized = normalizeInstanceToolsResult(result);
                log.debug('InstanceTools: Loaded tools:', normalized.tools?.length, normalized.tools?.map(t => t.id));
                setInstanceToolsData(normalized);
            } catch (err) {
                log.warn('Failed to load instance tools:', err);
                setInstanceToolsData({ sections: [], tools: [] });
            }
        };

        loadInstanceTools();

        // Listen for instance focus changes
        const handleInstanceFocus = () => {
            log.debug('InstanceTools: Instance focus event received');
            loadInstanceTools();
        };
        window.addEventListener('cia:instance-focused', handleInstanceFocus);
        window.addEventListener('cia:active-instance-changed', handleInstanceFocus);
        window.addEventListener('cia:tools-updated', handleInstanceFocus);

        return () => {
            window.removeEventListener('cia:instance-focused', handleInstanceFocus);
            window.removeEventListener('cia:active-instance-changed', handleInstanceFocus);
            window.removeEventListener('cia:tools-updated', handleInstanceFocus);
        };
    }, [contextActiveView]);

    // Split tools by placement: notch (quick-access) vs footer (display/config)
    const { notchTools, footerTools, toolSections } = useMemo(() => {
        const { sections = [], tools = [] } = instanceToolsData;
        return {
            notchTools: tools.filter(t => t.placement === 'notch'),
            footerTools: tools.filter(t => t.placement === 'footer'),
            toolSections: sections,
        };
    }, [instanceToolsData]);

    // Listen for "Add to Subset" requests from ViewHeader menus
    useEffect(() => {
        const handleAddToSubsetRequest = (e) => {
            log.debug('Add to Subset request received:', e.detail);
            // Show the subset selector modal
            setShowSubsetSelector(true);
        };

        window.addEventListener('cia:add-to-subset-request', handleAddToSubsetRequest);
        return () => {
            window.removeEventListener('cia:add-to-subset-request', handleAddToSubsetRequest);
        };
    }, []);

    // Handle tool selection from notch
    // Note: For menu items, the onClick is already called directly in ToolMenu.handleSelect
    // This callback is mainly for logging and handling non-menu tools
    const handleNotchToolSelect = useCallback((tool) => {
        log.debug('Notch tool selected:', tool?.id, tool?.selectedOption?.id);
        // onClick is already called in ToolMenu.handleSelect for menu options
        // For non-menu tools (type !== 'menu'), the onClick would be on the tool itself
        if (tool.type !== 'menu' && tool.onClick) {
            log.debug('  -> Calling tool.onClick() for non-menu tool');
            tool.onClick();
        }
    }, []);

    // Handle opening full Instance Tools panel
    const handleResetCamera = useCallback(() => {
        const instance = workspaceManager?.getActiveInstance?.();
        if (instance?.instanceId) {
            workspaceManager.resetCamera?.(instance.instanceId);
            // Zoom level will be updated via onCameraChange subscription
        }
    }, []);

    // ==========================================================================
    // DUPLICATE VIEW & VIEW SETTINGS HANDLERS
    // ==========================================================================

    const handleDuplicateView = useCallback(() => {
        log.debug('Duplicate view requested from Footer2');
        if (contextActiveView?.id) {
            window.dispatchEvent(new CustomEvent('cia:duplicate-view', {
                detail: { viewId: contextActiveView.id }
            }));
        }
    }, [contextActiveView]);

    const handleViewSettings = useCallback(() => {
        log.debug('View settings requested from Footer2');
        if (contextActiveView?.id) {
            window.dispatchEvent(new CustomEvent('cia:open-view-settings', {
                detail: { viewId: contextActiveView.id }
            }));
        }
    }, [contextActiveView]);

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
            // Enter focus mode with active view from context (the currently focused instance)
            // This is the source of truth - it's set when user clicks on a cell

            // First try: Use the active view from context (user's current selection)
            if (contextActiveView?.id) {
                // Find the placement by viewConfigurationId or position
                const activePlacement = canvas?.placements?.find(p =>
                    p.content?.viewConfigurationId === contextActiveView.id ||
                    (contextActiveView.position &&
                     p.row === contextActiveView.position.row &&
                     p.col === contextActiveView.position.col)
                );

                if (activePlacement) {
                    focusView({
                        placementId: activePlacement.id,
                        viewConfigurationId: contextActiveView.id,
                        name: contextActiveView.name || 'View',
                        row: activePlacement.row,
                        col: activePlacement.col,
                    });
                    return;
                }
            }

            // Fallback: No active view - try to focus the first view on canvas
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
        } else if (mode === 'subset') {
            // Enter subset mode - show the subset selector modal
            log.debug('Subset mode requested - opening subset selector');
            setShowSubsetSelector(true);
        }
    }, [goHome, focusView, openSubset, canvas?.placements, contextActiveView, subsets]);

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
            // Double-click view → focus mode (view stack + panel collapse)
            focusView({
                placementId: placement.id,
                name: placement.content?.name || 'View',
                row: placement.row,
                col: placement.col,
            });

            // Also collapse panels for maximum canvas space
            enterPanelFocusMode?.(placement.id);
        }
    }, [focusView, openSubset, enterPanelFocusMode]);

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
                // Dispatch event to open dataset selector modal
                window.dispatchEvent(new CustomEvent('cia:open-dataset-selector', {
                    detail: {
                        targetRow: row,
                        targetCol: col,
                    }
                }));
                log.debug('Dispatched cia:open-dataset-selector', { row, col });
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

    // ==========================================================================
    // SUBSET SELECTOR MODAL HANDLERS
    // ==========================================================================

    // Handle selecting an existing subset from the modal
    const handleSelectSubset = useCallback((subset) => {
        log.debug('Subset selected:', subset.id, subset.name);
        openSubset({
            subsetId: subset.id,
            name: subset.name || 'Subset',
            placementIds: subset.placementIds || [],
        });
        setShowSubsetSelector(false);
    }, [openSubset]);

    // Handle creating a new subset from selected placements
    const handleCreateSubset = useCallback(async ({ name, placementIds }) => {
        log.debug('Creating subset:', name, 'with placements:', placementIds);
        try {
            const newSubset = await createSubset({
                name,
                placementIds,
            });
            // Exit selection mode and clear selection
            exitSelectionMode(true);
            setShowSubsetSelector(false);
            // Return the subset so the modal can optionally place it on canvas
            return newSubset;
        } catch (err) {
            log.error('Failed to create subset:', err);
            setShowSubsetSelector(false);
            return null;
        }
    }, [createSubset, exitSelectionMode]);

    // Handle entering selection mode from the modal
    const handleEnterSelectionMode = useCallback(() => {
        log.debug('Entering selection mode for subset creation');
        enterSelectionMode();
        setShowSubsetSelector(false);
    }, [enterSelectionMode]);

    // Handle adding placements to an existing subset
    const handleAddToExistingSubset = useCallback(async (subsetId, placementIds) => {
        log.debug('Adding placements to subset:', subsetId, placementIds);
        try {
            await addPlacementsToSubset(subsetId, placementIds);
            // Exit selection mode and clear selection
            exitSelectionMode(true);
        } catch (err) {
            log.error('Failed to add placements to subset:', err);
        }
    }, [addPlacementsToSubset, exitSelectionMode]);

    // Handle placing a subset on the canvas as a first-class citizen
    const handlePlaceSubsetOnCanvas = useCallback(async (subsetId) => {
        log.debug('Placing subset on canvas:', subsetId);
        if (!activeCanvasId) {
            log.error('No canvas available for placing subset');
            return;
        }

        try {
            // Find next empty cell
            const { row, col } = findNextEmptyCell();

            // Create a subset placement
            await addPlacement({
                row,
                col,
                rowSpan: 1,
                colSpan: 1,
                content: {
                    type: 'subset',
                    subsetId,
                },
            });
            log.debug('Subset placement added at', row, col);
        } catch (err) {
            log.error('Failed to place subset on canvas:', err);
        }
    }, [activeCanvasId, findNextEmptyCell, addPlacement]);

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

    const handleCanvasSizeChange = useCallback(async (newSize) => {
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
    }, [activeCanvasId, canvasManager]);

    const handleViewportSizeChange = useCallback((newSize) => {
        // Update viewport size in useCanvas hook (this is the actual viewport used by CanvasGrid)
        setViewportSize(newSize.rows, newSize.cols);
        // Also update local gridSize state for UI display consistency
        setGridSize({ rows: newSize.rows, cols: newSize.cols });
    }, [setViewportSize, setGridSize]);

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
            <CanvasChrome
                className="canvas-workspace"
                headerProps={{
                    canGoBack,
                    onGoBack: goBack,
                    onGoHome: goHome,
                    workspace: currentWorkspace || { id: projectId, name: 'Workspace', type: 'project' },
                    workspaces: workspacesForSelector,
                    onWorkspaceChange: handleWorkspaceSelect,
                    viewGroup: activeHeaderViewGroup,
                    viewGroups: formattedViewGroups,
                    onViewGroupChange: (viewGroup) => handleSelectViewGroup(viewGroup?.id ?? null),
                    isViewGroupLinked,
                    isEditMode: editMode,
                    onToggleEditMode: handleEditModeChange,
                    flowDirection: flowDirection === 'row' ? 'right' : 'down',
                    onFlowDirectionChange: (direction) => {
                        setFlowDirection(direction === 'right' ? 'row' : 'column');
                    },
                    showCoordinates,
                    showViewGroupBorders,
                    onToggleCoordinates: setShowCoordinates,
                    onToggleViewGroupBorders: setShowViewGroupBorders,
                    windowMode: canvasMode === CANVAS_MODES.FULLSCREEN ? 'full' : canvasMode,
                    onWindowModeChange: (mode) => {
                        setCanvasMode(mode === 'full' ? CANVAS_MODES.FULLSCREEN : mode);
                    },
                    isFullscreen: canvasMode === CANVAS_MODES.FULLSCREEN,
                    onToggleFullscreen: (next) => {
                        setCanvasMode(next ? CANVAS_MODES.FULLSCREEN : CANVAS_MODES.DOCKED);
                    },
                }}
                editBarProps={{
                    activeTool,
                    onToolChange: handleToolChange,
                    onGridAction: handleEditBarGridAction,
                    onRowAction: handleEditBarRowAction,
                    onDone: () => handleEditModeChange(false),
                }}
                footer1Props={{
                    canUndo: false,
                    canRedo: false,
                    activeView: contextActiveView,
                    onCanvasViews,
                    availableViews,
                    onSelectView: contextSelectView,
                    onPlaceView: contextPlaceView,
                    onViewAction: contextViewAction,
                    tools: notchTools,
                    toolSections,
                    onSelectTool: handleNotchToolSelect,
                }}
                footer2={(
                    <div ref={footerRef}>
                        <Footer2
                            viewGroups={formattedViewGroups}
                            activeViewGroupId={activeViewGroupId}
                            onSelectViewGroup={handleSelectViewGroup}
                            onCreateViewGroup={handleCreateViewGroup}
                            onUpdateViewGroup={handleUpdateViewGroup}
                            onDeleteViewGroup={handleDeleteViewGroup}
                            onDuplicateViewGroup={handleDuplicateViewGroup}
                            onGoToViewGroup={handleGoToViewGroup}
                            activeViewType={contextActiveView?.type || 'vtk-volume'}
                            activeViewColor={contextActiveView?.color || null}
                            isFocused={isFocusView}
                            instanceTools={footerTools}
                            toolSections={toolSections}
                            onSelectTool={handleNotchToolSelect}
                            onToggleFocus={() => {
                                if (isFocusView) {
                                    goHome();
                                } else {
                                    handleToolbarModeChange('focus');
                                }
                            }}
                            activeSubset={focusedSubset}
                            onOpenSubsetDropdown={() => setShowSubsetSelector(true)}
                            onSnapshot={() => {
                                log.debug('Snapshot requested from Footer2');
                                if (contextActiveView?.id) {
                                    window.dispatchEvent(new CustomEvent('cia:snapshot-view', {
                                        detail: { viewId: contextActiveView.id }
                                    }));
                                }
                            }}
                            onResetView={() => {
                                log.debug('Reset view requested from Footer2');
                                handleResetCamera();
                            }}
                            onDuplicateView={handleDuplicateView}
                            onViewSettings={handleViewSettings}
                            onOpenLayoutTab={() => {
                                setLeftDockedOpen(true);
                            }}
                            onOpenLinkManager={() => {
                                log.debug('Link manager requested');
                            }}
                            isVRAvailable={true}
                            isInVR={false}
                            onToggleVR={() => {
                                log.debug('VR toggle requested');
                            }}
                            linkingService={linkingServiceAdapter}
                            containerWidth={footerWidth}
                        />
                    </div>
                )}
                infoBar={(
                    <CanvasInfoFooter
                        canvasSize={canvasSize}
                        viewportSize={gridSize}
                        cellSize={cellSize}
                        collaboratorCount={3}
                        syncStatus="synced"
                        onCanvasSizeChange={handleCanvasSizeChange}
                        onViewportSizeChange={handleViewportSizeChange}
                        onOpenNavigator={() => {
                            // TODO: Open canvas navigator
                        }}
                    />
                )}
                isEditMode={editMode}
            >
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
                                showCoordinates={showCoordinates}
                                onPlacementClick={handlePlacementClick}
                                onPlacementDoubleClick={handlePlacementDoubleClick}
                                onCellDoubleClick={handleCellDoubleClick}
                                onViewportChange={moveViewport}
                                onRemovePlacement={removePlacement}
                                onAddRow={addRow}
                                onAddColumn={addColumn}
                                onAddContent={handleAddContent}
                                onOpenSubsetSelector={() => setShowSubsetSelector(true)}
                            />
                        ) : (
                            <div className="canvas-workspace__empty">
                                <p>No canvas selected</p>
                                <button onClick={() => { /* TODO: Create canvas */ }}>
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
                        onDock={handleDockLeftPanel}
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
                        onDock={handleDockRightPanel}
                        title="Properties"
                        width={280}
                    >
                        {rightPanelContent}
                    </FloatingPanel>
                </div>
            </CanvasChrome>

            {/* Focus mode overlay */}
            {isFocusMode && focusedSubset && (
                <FocusModeOverlay
                    subset={focusedSubset}
                    onExit={exitFocusMode}
                />
            )}

            {/* Subset selector modal */}
            <SubsetSelectorModal
                isOpen={showSubsetSelector}
                onClose={() => setShowSubsetSelector(false)}
                subsets={subsets}
                allPlacements={visiblePlacements}
                selectedPlacementIds={selectedIds}
                onSelectSubset={handleSelectSubset}
                onCreateSubset={handleCreateSubset}
                onAddToSubset={handleAddToExistingSubset}
                onPlaceOnCanvas={handlePlaceSubsetOnCanvas}
                onEnterSelectionMode={handleEnterSelectionMode}
            />

            {/* Create Workspace Panel */}
            <CreateWorkspacePanel
                isOpen={showCreateWorkspacePanel}
                onClose={() => setShowCreateWorkspacePanel(false)}
                onCreate={handleCreateWorkspace}
                userId={userId}
                projectId={projectId}
            />
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
