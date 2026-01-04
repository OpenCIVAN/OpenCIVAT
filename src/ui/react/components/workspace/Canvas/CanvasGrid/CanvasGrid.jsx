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
import { Icon } from '@UI/react/components/atoms/Icon';
import { CanvasCell } from '@UI/react/components/workspace';
import { ConnectionOverlay } from '../ConnectionOverlay';
import { IsolationOverlay, useIsolationMode } from '@UI/react/components/workspace/Canvas/IsolationOverlay';
import { SelectionContextMenu } from '../SelectionContextMenu';
import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import { useViewportSize } from '@UI/react/hooks';
import { useCanvasDimensions, RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { useViewportEventListener } from '@UI/react/hooks/useViewportSync';
import { LAYOUT_MODES, FLOW_DIRECTIONS } from '@Core/data/models/WorkspaceCanvas.js';
import { workspace as log } from '@Utils/logger.js';
import './CanvasGrid.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// 8px gap per canvas-theme-explorer-v2 prototype specification
const GAP = 8; // Gap between cells in pixels
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
                    <div className="canvas-grid__error-icon"><Icon name="warning" size={24} /></div>
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
    const [selectionModifierHeld, setSelectionModifierHeld] = useState(false);

    // Listen for edit mode and tool changes from secondary footer
    useEffect(() => {
        const handleEditModeChange = (e) => {
            setEditMode(e.detail.editMode);
        };
        const handleToolChange = (e) => {
            setActiveTool(e.detail.tool);
            // Entering a tool also enables edit mode
            if (e.detail.tool !== 'select') {
                setEditMode(true);
            }
        };

        window.addEventListener('canvas:editModeChange', handleEditModeChange);
        window.addEventListener('canvas:toolChange', handleToolChange);

        return () => {
            window.removeEventListener('canvas:editModeChange', handleEditModeChange);
            window.removeEventListener('canvas:toolChange', handleToolChange);
        };
    }, []);

    // Active view tracking - for performance optimization
    // Only the active view mounts InstanceViewport in THUMBNAIL/SNAPSHOT modes
    const [activeViewId, setActiveViewId] = useState(null);

    // LRU cache of recently active views for warm-pausing
    // These views keep their InstanceViewport mounted but paused (no GPU work)
    // This enables fast switching between recently used views
    const MAX_WARM_INSTANCES = 3; // Budget for paused instances
    const [recentViewIds, setRecentViewIds] = useState([]);

    // Context menu state
    const [contextMenu, setContextMenu] = useState({
        isOpen: false,
        position: null,
        cells: [],
    });

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

    useViewportEventListener({
        onNavigateTo: useCallback((row, col) => {
            if (process.env.NODE_ENV === 'development') {
                log.debug(`[CanvasGrid] Viewport sync: navigate to [${row}, ${col}]`);
            }
            // We can't use setViewportPosition directly from useCanvas because
            // it doesn't exist as a direct function. We need to calculate delta.
            // Actually, useCanvas does have moveViewport and we can calculate the delta.
            const currentRow = viewport?.row ?? 0;
            const currentCol = viewport?.col ?? 0;
            const deltaRow = row - currentRow;
            const deltaCol = col - currentCol;

            if (deltaRow !== 0 || deltaCol !== 0) {
                // Use the moveViewport from useCanvas
                moveViewport(deltaRow, deltaCol);
            }
        }, [viewport?.row, viewport?.col, moveViewport]),

        onMoveViewport: useCallback((deltaRow, deltaCol) => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[CanvasGrid] Viewport sync: move by [${deltaRow}, ${deltaCol}]`);
            }
            moveViewport(deltaRow, deltaCol);
        }, [moveViewport]),

        canvasId: canvasId,
    });


    const {
        viewportSize,
        isMinSize,
        isMaxSize,
        incrementViewportSize,
        decrementViewportSize,
        setViewportSize,
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


    useEffect(() => {
        const handleViewportSizeChanged = (e) => {
            const { size, previousSize } = e.detail;
            if (size?.rows && size?.cols) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[CanvasGrid] Viewport size changed: ${previousSize?.rows}x${previousSize?.cols} → ${size.rows}x${size.cols}`);
                }
                // Note: We don't need to do anything here because useViewportSize
                // is already being used in this component. The hook shares state
                // via the event system. If viewportSize isn't updating, check that
                // useViewportSize is correctly listening for this event.
            }
        };

        window.addEventListener('cia:viewport-size-changed', handleViewportSizeChanged);
        return () => window.removeEventListener('cia:viewport-size-changed', handleViewportSizeChanged);
    }, []);

    // ==========================================================================
    // ACTIVE VIEW TRACKING (Performance optimization)
    // ==========================================================================
    // Listen for instance focus events to track which view is active.
    // Only the active view mounts InstanceViewport in THUMBNAIL/SNAPSHOT modes,
    // reducing WebGL/GPU load from N instances to 0-1.

    useEffect(() => {
        const handleInstanceFocused = (e) => {
            // Note: The event uses 'viewId' not 'viewConfigId'
            const { viewId } = e.detail || {};
            if (viewId) {
                setActiveViewId((prevActiveId) => {
                    // Update LRU cache when active view changes
                    if (prevActiveId && prevActiveId !== viewId) {
                        setRecentViewIds((prevRecent) => {
                            // Build LRU list: [prevActive, ...filtered], max MAX_WARM_INSTANCES
                            // 1. Remove new active view from recent (it's now LIVE, not WARM)
                            // 2. Remove prevActive from filtered (will add to front)
                            const withoutNew = prevRecent.filter(id => id !== viewId);
                            const withoutPrev = withoutNew.filter(id => id !== prevActiveId);
                            // 3. Build updated list with prevActive at front
                            const updated = [prevActiveId, ...withoutPrev].slice(0, MAX_WARM_INSTANCES);

                            // DEV ASSERTIONS: Verify LRU invariants
                            if (process.env.NODE_ENV === 'development') {
                                // Invariant 1: activeViewId should never be in recentViewIds
                                if (updated.includes(viewId)) {
                                    console.error('[LRU BUG] activeViewId found in recentViewIds:', viewId, updated);
                                }
                                // Invariant 2: No duplicates in recentViewIds
                                const uniqueSet = new Set(updated);
                                if (uniqueSet.size !== updated.length) {
                                    console.error('[LRU BUG] Duplicates in recentViewIds:', updated);
                                }
                                // Debug log for instrumentation
                                if (window.__CIA_DEBUG_RENDER) {
                                    log.debug(`[LRU] LIVE: ${viewId.slice(0, 8)}, WARM: [${updated.map(id => id.slice(0, 8)).join(', ')}]`);
                                }
                            }

                            return updated;
                        });
                    }
                    return viewId;
                });

                if (process.env.NODE_ENV === 'development') {
                    log.debug(`[CanvasGrid] Active view changed: ${viewId}`);
                }
            }
        };

        window.addEventListener('cia:instance-focused', handleInstanceFocused);
        return () => window.removeEventListener('cia:instance-focused', handleInstanceFocused);
    }, []);
    // ==========================================================================
    // CONTAINER MEASUREMENT HOOK (robust resize handling)
    // ==========================================================================

    // Memoize dimensions config to prevent re-render loop
    const dimensionsConfig = useMemo(() => ({
        viewportCols: effectiveViewport.cols,
        viewportRows: effectiveViewport.rows,
        gap: GAP,
        padding: {
            top: 12,
            right: 12,
            bottom: 12,
            left: 12,
        },
    }), [effectiveViewport.cols, effectiveViewport.rows]);

    const {
        isReady: measurementsReady,
        measurementError,
        containerSize,
        cellSize,
        renderMode,
        measureRef,
        remeasure,
    } = useCanvasDimensions(dimensionsConfig);

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
            // Skip if typing in an input or textarea
            if (e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable) {
                return;
            }

            // Arrow keys - require grid focus for directional navigation
            if (gridRef.current?.contains(document.activeElement)) {
                const arrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

                if (arrowKey) {
                    e.preventDefault();

                    // Calculate direction
                    const deltaRow = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                    const deltaCol = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;

                    // If cells are selected, move/extend selection
                    if (selectedCells.length > 0) {
                        const lastSelected = selectedCells[selectedCells.length - 1];
                        const newRow = Math.max(0, lastSelected.row + deltaRow);
                        const newCol = Math.max(0, lastSelected.col + deltaCol);

                        // Find placement at new position
                        const newPlacement = canvas?.placements?.find(
                            p => p.row === newRow && p.col === newCol
                        );

                        if (newPlacement) {
                            const newCellData = { row: newRow, col: newCol, placement: newPlacement };

                            if (e.shiftKey) {
                                // Shift+Arrow: extend selection
                                const alreadySelected = selectedCells.some(
                                    sc => sc.row === newRow && sc.col === newCol
                                );
                                if (!alreadySelected) {
                                    setSelectedCells(prev => [...prev, newCellData]);
                                }
                            } else {
                                // Arrow only: move selection to new cell
                                setSelectedCells([newCellData]);
                            }
                        }
                    } else {
                        // No selection - move viewport (original behavior)
                        moveViewport(deltaRow, deltaCol);
                    }
                }
            }

            // ZOOM KEYS - Work globally (anywhere on page)
            // + / = : Zoom IN (fewer cells, larger)
            // - / _ : Zoom OUT (more cells, smaller - bird's eye)
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                decrementViewportSize(); // Zoom IN = fewer cells = decrement
                requestAnimationFrame(() => gridRef.current?.focus());
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                incrementViewportSize(); // Zoom OUT = more cells = increment
                requestAnimationFrame(() => gridRef.current?.focus());
            }

            // Number key presets - work globally
            if (e.key === '1' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                setViewportSize?.(1, 1);
            } else if (e.key === '2' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // 2x2 
                setViewportSize?.(2, 2);
            } else if (e.key === '3' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // 3x3
                setViewportSize?.(3, 3);
            } else if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                // 10x10 bird's eye (max)
                setViewportSize?.(10, 10);
            }

            // Home key - reset to default viewport
            if (e.key === 'Home') {
                e.preventDefault();
                resetViewportSize?.();
                requestAnimationFrame(() => gridRef.current?.focus());
            }

            // Ctrl+Shift+A - Select all cells with views (Ctrl+A conflicts with annotations)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
                // Only if grid has focus
                if (gridRef.current?.contains(document.activeElement)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cellsWithViews = (canvas?.placements || [])
                        .filter(p => p.content?.type === 'view')
                        .map(p => ({
                            row: p.row,
                            col: p.col,
                            placement: p,
                        }));
                    setSelectedCells(cellsWithViews);
                }
            }

            // Escape - Deselect all (per spec)
            if (e.key === 'Escape') {
                if (selectedCells.length > 0) {
                    e.preventDefault();
                    setSelectedCells([]);
                }
                // Also close context menu
                if (contextMenu.isOpen) {
                    setContextMenu({ isOpen: false, position: null, cells: [] });
                }
            }

            // Tab / Shift+Tab - Cycle through cells with views
            if (e.key === 'Tab' && gridRef.current?.contains(document.activeElement)) {
                const cellsWithViews = (canvas?.placements || [])
                    .filter(p => p.content?.type === 'view')
                    .sort((a, b) => {
                        // Sort by row first, then by column
                        if (a.row !== b.row) return a.row - b.row;
                        return a.col - b.col;
                    });

                if (cellsWithViews.length > 0) {
                    e.preventDefault();

                    // Find current index
                    let currentIndex = -1;
                    if (selectedCells.length > 0) {
                        const lastSelected = selectedCells[selectedCells.length - 1];
                        currentIndex = cellsWithViews.findIndex(
                            p => p.row === lastSelected.row && p.col === lastSelected.col
                        );
                    }

                    // Calculate next index (wrap around)
                    let nextIndex;
                    if (e.shiftKey) {
                        // Shift+Tab - go backwards
                        nextIndex = currentIndex <= 0 ? cellsWithViews.length - 1 : currentIndex - 1;
                    } else {
                        // Tab - go forwards
                        nextIndex = currentIndex >= cellsWithViews.length - 1 ? 0 : currentIndex + 1;
                    }

                    const nextPlacement = cellsWithViews[nextIndex];
                    setSelectedCells([{
                        row: nextPlacement.row,
                        col: nextPlacement.col,
                        placement: nextPlacement,
                    }]);

                    // Emit focus event for the selected view
                    if (nextPlacement.content?.viewConfigurationId) {
                        window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                            detail: { viewId: nextPlacement.content.viewConfigurationId }
                        }));
                    }
                }
            }

            // Enter - Activate/isolate selected cell
            if (e.key === 'Enter' && selectedCells.length === 1) {
                e.preventDefault();
                const selected = selectedCells[0];
                if (selected.placement) {
                    // Check if should isolate (for small cells) or just focus
                    if (shouldTriggerIsolation(renderMode)) {
                        isolateCell({
                            id: selected.placement.id,
                            viewId: selected.placement.content?.viewConfigurationId,
                            name: getPlacementName(selected.placement),
                            row: selected.row,
                            col: selected.col,
                        });
                    } else {
                        // Emit focus event
                        if (selected.placement.content?.viewConfigurationId) {
                            window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                                detail: { viewId: selected.placement.content.viewConfigurationId }
                            }));
                        }
                    }
                }
            }

            // Space - Toggle selection of focused cell (without moving)
            if (e.code === 'Space' && gridRef.current?.contains(document.activeElement)) {
                // Only handle if we have a single selected cell and Ctrl is held
                if ((e.ctrlKey || e.metaKey) && selectedCells.length > 0) {
                    e.preventDefault();
                    const lastSelected = selectedCells[selectedCells.length - 1];
                    // Toggle this cell's selection
                    const isInSelection = selectedCells.length > 1;
                    if (isInSelection) {
                        // Remove from multi-selection
                        setSelectedCells(prev => prev.slice(0, -1));
                    }
                }
            }

            // Delete/Backspace - Remove selected views (with confirmation)
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCells.length > 0) {
                // Only if not in an input
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    // Dispatch event to show confirmation dialog
                    window.dispatchEvent(new CustomEvent('cia:confirm-delete-views', {
                        detail: {
                            cells: selectedCells.filter(c => c.placement?.content?.type === 'view'),
                            onConfirm: () => {
                                selectedCells.forEach(cell => {
                                    if (cell.placement) {
                                        onRemovePlacement?.(cell.placement.id);
                                    }
                                });
                                setSelectedCells([]);
                            }
                        }
                    }));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveViewport, incrementViewportSize, decrementViewportSize, resetViewportSize, setViewportSize, canvas?.placements, selectedCells, contextMenu.isOpen, renderMode, shouldTriggerIsolation, isolateCell, onRemovePlacement]);

    // ==========================================================================
    // SELECTION MODIFIER KEY TRACKING (for cursor feedback)
    // ==========================================================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                setSelectionModifierHeld(true);
            }
        };

        const handleKeyUp = (e) => {
            // Check if any modifier is still held
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                setSelectionModifierHeld(false);
            }
        };

        // Also handle window blur (user switches apps while holding modifier)
        const handleBlur = () => {
            setSelectionModifierHeld(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // ==========================================================================
    // CELL CLICK HANDLING
    // ==========================================================================

    const handleCellClick = useCallback((placement, e) => {
        // Selection modifiers bypass isolation mode
        const isSelectionClick = e.ctrlKey || e.metaKey || e.shiftKey;

        // Ctrl/Cmd+Click - toggle cell in selection
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            const cellData = { row: placement.row, col: placement.col, placement };
            const isCurrentlySelected = selectedCells.some(
                sc => sc.row === placement.row && sc.col === placement.col
            );

            if (isCurrentlySelected) {
                // Remove from selection
                setSelectedCells(prev => prev.filter(
                    sc => !(sc.row === placement.row && sc.col === placement.col)
                ));
            } else {
                // Add to selection
                setSelectedCells(prev => [...prev, cellData]);
            }
            return;
        }

        // Shift+Click - Select rectangular range from last selected cell (per spec)
        // Ctrl+Shift+Click - Add rectangular range to existing selection
        if (e.shiftKey) {
            // Get the anchor cell (last selected, or first if none)
            const anchorCell = selectedCells.length > 0
                ? selectedCells[selectedCells.length - 1]
                : null;

            if (!anchorCell) {
                // No previous selection, just select the clicked cell
                setSelectedCells([{ row: placement.row, col: placement.col, placement }]);
                return;
            }

            // Calculate rectangular bounds between anchor and clicked cell
            const minRow = Math.min(anchorCell.row, placement.row);
            const maxRow = Math.max(anchorCell.row, placement.row);
            const minCol = Math.min(anchorCell.col, placement.col);
            const maxCol = Math.max(anchorCell.col, placement.col);

            // Build list of all cells in the rectangular range
            const rangeCells = [];
            for (let row = minRow; row <= maxRow; row++) {
                for (let col = minCol; col <= maxCol; col++) {
                    // Find placement at this position
                    const cellPlacement = canvas?.placements?.find(
                        p => p.row === row && p.col === col
                    );
                    rangeCells.push({
                        row,
                        col,
                        placement: cellPlacement || null,
                    });
                }
            }

            if (e.ctrlKey || e.metaKey) {
                // Ctrl+Shift+Click: Add range to existing selection (dedup)
                setSelectedCells(prev => {
                    const existingKeys = new Set(prev.map(c => `${c.row},${c.col}`));
                    const newCells = rangeCells.filter(c => !existingKeys.has(`${c.row},${c.col}`));
                    return [...prev, ...newCells];
                });
            } else {
                // Shift+Click: Replace selection with range
                setSelectedCells(rangeCells);
            }
            return;
        }

        // Single click just focuses/activates the view (no isolation)
        // Isolation is now triggered by double-click for finer-grained control
        if (onCellClick) {
            onCellClick(placement, e);
        }
    }, [onCellClick, selectedCells, canvas?.placements]);

    // Double-click triggers isolation mode for small cells
    const handleCellDoubleClick = useCallback((placement, e) => {
        // Only trigger isolation in thumbnail/snapshot modes
        if (shouldTriggerIsolation(renderMode)) {
            isolateCell({
                id: placement.id,
                viewId: placement.content?.viewConfigurationId,
                name: getPlacementName(placement),
                row: placement.row,
                col: placement.col,
            });
        }
    }, [renderMode, shouldTriggerIsolation, isolateCell]);

    // ==========================================================================
    // CONTEXT MENU HANDLERS
    // ==========================================================================

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();

        // Only show context menu if there are selected cells
        if (selectedCells.length === 0) return;

        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            cells: selectedCells,
        });
    }, [selectedCells]);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: null, cells: [] });
    }, []);

    // Click on grid background (not a cell) deselects all - per spec
    const handleGridClick = useCallback((e) => {
        // Only if clicking directly on the viewport (not a child cell)
        if (e.target === e.currentTarget && selectedCells.length > 0) {
            setSelectedCells([]);
        }
    }, [selectedCells.length]);

    const handleSwapCells = useCallback(() => {
        if (selectedCells.length !== 2) return;
        const [cell1, cell2] = selectedCells;

        // Swap placements
        if (cell1.placement && cell2.placement) {
            canvasManager.swapPlacements?.(cell1.placement.id, cell2.placement.id);
        }
        setSelectedCells([]);
    }, [selectedCells]);

    const handleMergeCells = useCallback(() => {
        if (selectedCells.length < 2) return;

        // Calculate bounds of selected cells
        const rows = selectedCells.map(c => c.row);
        const cols = selectedCells.map(c => c.col);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);

        // TODO: Implement merge via canvasManager
        log.info(`Merge cells from [${minRow},${minCol}] to [${maxRow},${maxCol}]`);
        setSelectedCells([]);
    }, [selectedCells]);

    const handleAlignCells = useCallback((direction) => {
        if (selectedCells.length < 2) return;
        // TODO: Implement alignment
        log.info(`Align cells: ${direction}`);
    }, [selectedCells]);

    const handleCloseAllViews = useCallback(() => {
        const viewCells = selectedCells.filter(c => c.placement?.content?.type === 'view');
        viewCells.forEach(cell => {
            if (cell.placement) {
                onRemovePlacement?.(cell.placement.id);
            }
        });
        setSelectedCells([]);
    }, [selectedCells, onRemovePlacement]);

    const handleDeleteAllViews = useCallback(() => {
        // Same as close for now - could be permanent delete in future
        handleCloseAllViews();
    }, [handleCloseAllViews]);

    // ==========================================================================
    // HELPER FUNCTIONS
    // ==========================================================================

    function getPlacementName(placement) {
        if (placement.content?.type === 'view') {
            try {
                const view = getViewConfigurationManager()?.getView(placement.content.viewConfigurationId);
                if (view) {
                    const dataset = getDatasetManager()?.getDataset(view.datasetId);
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

    // Build placement lookup Map for O(1) access in render loop
    // Key: "row,col" -> placement
    const placementLookup = useMemo(() => {
        const map = new Map();
        if (viewportPlacements) {
            for (const p of viewportPlacements) {
                map.set(`${p.row},${p.col}`, p);
            }
        }
        return map;
    }, [viewportPlacements]);

    // Build Sets for O(1) selection lookups in render loop
    const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedCellsSet = useMemo(() => {
        const set = new Set();
        for (const sc of selectedCells) {
            set.add(`${sc.row},${sc.col}`);
        }
        return set;
    }, [selectedCells]);

    const handleCellDrop = useCallback(async (row, col, dropData) => {
        log.debug('handleCellDrop', { row, col, dropData });

        try {
            // Handle push actions with modifiers
            // Per spec: Shift = wrap to next row, Ctrl = close last view
            if (dropData.action === 'push') {
                const { direction, modifiers = {} } = dropData;
                log.debug(`Push ${direction} at [${row}, ${col}] with modifiers:`, modifiers);

                // Calculate the actual insert position based on push direction
                // When dropping on PUSH_DOWN zone of cell [1,0], insert at [2,0] (below)
                // When dropping on PUSH_RIGHT zone of cell [1,0], insert at [1,1] (right)
                let insertRow = row;
                let insertCol = col;

                switch (direction) {
                    case 'down':
                        insertRow = row + 1;
                        break;
                    case 'up':
                        // Insert at current position, push existing up
                        // But we need to ensure row doesn't go negative
                        insertRow = Math.max(0, row);
                        break;
                    case 'right':
                        insertCol = col + 1;
                        break;
                    case 'left':
                        insertCol = Math.max(0, col);
                        break;
                }

                // Push existing views to make room at the insert position
                await canvasManager.pushPlacements(canvasId, insertRow, insertCol, direction, {
                    wrap: modifiers.shift || false,
                    closeLast: modifiers.ctrl || false,
                });

                // Update row/col to the insert position for placing the new view
                row = insertRow;
                col = insertCol;

                // Fall through to standard drop handling to place the new view
            }

            // Handle swap actions - when dropping ON an existing view
            // This replaces the existing view with the dropped one
            if (dropData.action === 'swap' && dropData.existingPlacement) {

                // Legacy swap behavior: if dragging within canvas, swap positions
                const sourcePlacementId = dropData.sourcePlacementId;
                const targetPlacementId = dropData.existingPlacement.id;

                if (sourcePlacementId && targetPlacementId) {
                    await canvasManager.swapPlacements(sourcePlacementId, targetPlacementId);
                    return; // Swap complete, don't place a new view
                }

                // If dropping from panel, remove existing and place new
                // First remove existing placement
                const existingPlacementId = dropData.existingPlacement.id;
                if (existingPlacementId) {
                    await canvasManager.removePlacement(canvasId, existingPlacementId);
                }
                // Fall through to normal handling to place the new view
            }

            // IMPORTANT: Check type field FIRST before checking for id
            // Every object has an id, so we must check type to distinguish

            // Case 1: File dropped (from FilesTab)
            // Check this FIRST because files have both 'id' and other properties
            if (dropData.type === 'file' || dropData.isFile) {
                log.debug(`File dropped: ${dropData.name} at [${row}, ${col}]`);

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

            // Case 2: Dataset dropped (create new view)
            if (dropData.type === 'dataset' || (dropData.datasetId && !dropData.viewConfigId)) {
                log.debug(`Creating new view for dataset ${dropData.datasetId} at [${row}, ${col}]`);

                window.dispatchEvent(new CustomEvent('cia:request-instance', {
                    detail: {
                        datasetId: dropData.datasetId,
                        fileName: dropData.name, // Pass the dataset name for the view
                        fileType: dropData.fileType,
                        spawnNew: true,
                        targetRow: row,
                        targetCol: col,
                        canvasId,
                    },
                }));
                return;
            }

            // Case 3: ViewItem dropped (existing view from Views/Datasets tab)
            // ARCHITECTURE:
            // - If view is NOT on canvas: PLACE IT (move, not copy)
            // - If view IS on canvas: DUPLICATE it (copy)
            // - Alt+drop = create fully linked view (regardless of placement status)
            if (dropData.viewConfigId || dropData.type === 'view' || dropData.type === 'view-item') {
                const sourceViewId = dropData.viewConfigId || dropData.viewId || dropData.id;
                const datasetId = dropData.datasetId;
                const createLinked = dropData.modifiers?.alt; // Alt key = create linked view

                // Check if view is already on the canvas
                const isAlreadyOnCanvas = canvasManager.isViewOnCanvas(sourceViewId);

                if (isAlreadyOnCanvas) {
                    // View already placed - duplicate it
                    log.debug(`ViewItem dropped - creating duplicate of ${sourceViewId} at [${row}, ${col}]`);
                    window.dispatchEvent(new CustomEvent('cia:request-instance', {
                        detail: {
                            datasetId: datasetId,
                            duplicateViewId: sourceViewId,
                            spawnNew: true,
                            targetRow: row,
                            targetCol: col,
                            canvasId,
                            createLinked,
                        },
                    }));
                } else {
                    // View not on canvas - place it (move, not copy)
                    log.debug(`ViewItem dropped - placing view ${sourceViewId} at [${row}, ${col}]`);
                    window.dispatchEvent(new CustomEvent('cia:request-instance', {
                        detail: {
                            datasetId: datasetId,
                            viewConfigId: sourceViewId, // Use viewConfigId to place, not duplicate
                            spawnNew: false, // Not spawning new, placing existing
                            targetRow: row,
                            targetCol: col,
                            canvasId,
                            createLinked,
                        },
                    }));
                }
                return;
            }

            // Unknown format - log warning instead of silently failing
            log.warn('Unknown drop data format:', dropData);
            log.warn('Expected one of: type="file", type="dataset", type="view", or viewConfigId');

        } catch (error) {
            log.error('Drop failed:', error);
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
                // Use Map for O(1) lookup instead of O(n) find
                const placement = placementLookup.get(key);

                // Validate placement has valid content
                if (placement && !isValidPlacement(placement)) {
                    log.warn(`Invalid placement at [${canvasRow}, ${canvasCol}]:`, placement);
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
                        key={`cell-${canvasRow}-${canvasCol}`}
                        className="canvas-grid__cell-wrapper"
                        data-placement-id={placement?.id}
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
                            isSelected={
                                selectedIdsSet.has(placement?.id) ||
                                selectedCellsSet.has(key) ||
                                (activeViewId && placement?.content?.viewConfigurationId === activeViewId)
                            }
                            inEditMode={editMode}
                            activeViewId={activeViewId}
                            recentViewIds={recentViewIds}
                            onSelect={toggleSelection}
                            onClick={(e) => placement && handleCellClick(placement, e)}
                            onDoubleClick={(e) => placement && handleCellDoubleClick(placement, e)}
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
        placementLookup,
        effectiveViewport,
        cellSize,
        renderMode,
        highlightedPlacementId,
        selectedIdsSet,
        selectedCellsSet,
        editMode,
        activeViewId,
        recentViewIds,
        toggleSelection,
        handleCellClick,
        handleCellDoubleClick,
        onAddContent,
        onRemovePlacement,
        handleCellDrop,
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
                    {/* Loading overlay - shows OVER the grid, doesn't unmount it */}
                    {!measurementsReady && (
                        <div className="canvas-grid__loading-overlay">
                            <LoadingState
                                message="Preparing workspace..."
                                error={measurementError}
                            />
                        </div>
                    )}

                    {/* Grid viewport - ALWAYS rendered to preserve VTK instances */}
                    <div
                        ref={gridRef}
                        className={`canvas-grid__viewport ${!measurementsReady ? 'canvas-grid__viewport--loading' : ''} ${selectionModifierHeld ? 'canvas-grid__viewport--selection-mode' : ''}`}
                        tabIndex={0}
                        onClick={handleGridClick}
                        onContextMenu={handleContextMenu}
                    >
                        {renderCells}
                    </div>
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
                        onRemove={() => {
                            // First exit isolation mode
                            exitIsolation();
                            // Then remove the placement
                            const placement = viewportPlacements.find(p => p.id === isolatedCell.id);
                            if (placement) {
                                onRemovePlacement?.(placement.id);
                            }
                        }}
                    />
                )}
            </IsolationOverlay>

            {/* Connection Overlay */}
            <ConnectionOverlay
                connectionState={connectionState}
                error={canvasManager.getLastError()}
                onRetry={handleRetryConnection}
            />

            {/* Selection Context Menu */}
            <SelectionContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                selectedCells={contextMenu.cells}
                onClose={handleCloseContextMenu}
                onSwap={handleSwapCells}
                onMerge={handleMergeCells}
                onAlign={handleAlignCells}
                onCloseAll={handleCloseAllViews}
                onDeleteAll={handleDeleteAllViews}
            />
        </div>
    );
}

export default CanvasGrid;