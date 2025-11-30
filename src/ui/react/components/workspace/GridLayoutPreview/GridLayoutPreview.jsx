/**
 * GridLayoutPreview Component
 *
 * Grid visualization and management for workspace layouts.
 * Supports multiple context modes: layout, presence, homepoints, views.
 *
 * @param {string} context - Context mode: 'layout' | 'presence' | 'homepoints' | 'views'
 * @param {Array} placements - Array of placement objects
 * @param {Object} gridSize - { rows, cols }
 * @param {Array} collaborators - Array of collaborator objects (for presence context)
 * @param {boolean} isExpanded - Whether the preview is in expanded mode
 * @param {function} onApply - Callback when changes are applied
 * @param {function} onNavigate - Callback when viewport navigates
 * @param {function} onCellClick - Callback when cell is clicked
 * @param {function} onFollow - Callback when following a collaborator
 * @param {function} onSpawn - Callback when spawning a new view in an empty cell
 * @param {function} onExternalDrop - Callback when a ViewItem is dropped from external source
 * @param {string} className - Additional CSS class
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import {
    Edit3,
    Save,
    X,
    Undo2,
    Redo2,
    Grid3x3,
    GitBranch,
    Home,
    Users,
    Eye,
    Plus,
    Minus,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useGridLayoutPreview } from './GridLayoutPreview.logic';
import { DPadController } from './components/DPadController';
import { GridCell } from './components/GridCell';
import { ViewportIndicator } from './components/ViewportIndicator';
import { CollaboratorAvatar } from './components/CollaboratorAvatar';
import { ToolsSidebar } from './components/ToolsSidebar';
import './GridLayoutPreview.scss';

// Context-specific configurations
const CONTEXT_CONFIG = {
    layout: {
        title: 'Layout',
        icon: Grid3x3,
        showEditMode: true,
        showDPad: true,
        showPresets: true,
        footerToggle: 'Grid/Flow',
    },
    presence: {
        title: 'Presence',
        icon: Users,
        showEditMode: false,
        showDPad: true,
        showCollaborators: true,
        headerAction: 'Save Place',
    },
    homepoints: {
        title: 'Homepoints',
        icon: Home,
        showEditMode: false,
        showDPad: true,
        showHomepoint: true,
        headerAction: 'Set Home',
    },
    views: {
        title: 'Views',
        icon: Eye,
        showEditMode: false,
        showDPad: false,
        showDropZone: true,
        headerBadge: 'Drop zone',
    },
};

export const GridLayoutPreview = memo(function GridLayoutPreview({
    context = 'layout',
    placements = [],
    gridSize = { rows: 4, cols: 4 },
    collaborators = [],
    isExpanded = false,
    onApply,
    onNavigate,
    onCellClick,
    onFollow,
    onSetHome,
    onSavePlace,
    onSpawn,
    onExternalDrop,
    className = '',
}) {
    const config = CONTEXT_CONFIG[context] || CONTEXT_CONFIG.layout;
    const containerRef = useRef(null);
    const [externalDragOver, setExternalDragOver] = useState(null);

    const {
        placements: currentPlacements,
        gridSize: currentGridSize,
        gridCells,
        viewport,
        overlaps,
        isDirty,
        isEditMode,
        dragState,
        selectedCells,
        homepoint,
        canUndo,
        canRedo,
        canMergeSelectedCells,
        setIsEditMode,
        navigateViewport,
        navigateToCell,
        navigateHome,
        setZoom,
        setHomepoint,
        movePlacement,
        swapPlacements,
        resizePlacement,
        addRow,
        removeRow,
        addColumn,
        removeColumn,
        applyChanges,
        cancelChanges,
        undo,
        redo,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        toggleCellSelection,
        clearCellSelection,
    } = useGridLayoutPreview({
        initialPlacements: placements,
        initialGridSize: gridSize,
        onApply,
        onNavigate,
    });

    const [layoutMode, setLayoutMode] = useState('grid'); // grid | flow

    // Prevent middle mouse button pan (scrolling behavior)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseDown = (e) => {
            // Middle mouse button (button === 1)
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleAuxClick = (e) => {
            // Prevent middle click auto-scroll
            if (e.button === 1) {
                e.preventDefault();
            }
        };

        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('auxclick', handleAuxClick);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('auxclick', handleAuxClick);
        };
    }, []);

    // Handle external drag-and-drop (from ViewItem list)
    const handleExternalDragEnter = useCallback((e) => {
        // Check if this is an external drag (from ViewItem)
        if (e.dataTransfer.types.includes('application/x-viewitem')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    }, []);

    const handleExternalDragOver = useCallback((e) => {
        if (e.dataTransfer.types.includes('application/x-viewitem')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';

            // Get cell from target
            const cellElement = e.target.closest('[data-row][data-col]');
            if (cellElement) {
                const row = parseInt(cellElement.dataset.row, 10);
                const col = parseInt(cellElement.dataset.col, 10);
                setExternalDragOver({ row, col });
            }
        }
    }, []);

    const handleExternalDragLeave = useCallback((e) => {
        // Only clear if leaving the grid container
        if (!containerRef.current?.contains(e.relatedTarget)) {
            setExternalDragOver(null);
        }
    }, []);

    const handleExternalDrop = useCallback((e) => {
        if (e.dataTransfer.types.includes('application/x-viewitem')) {
            e.preventDefault();
            const viewItemData = e.dataTransfer.getData('application/x-viewitem');

            try {
                const viewItem = JSON.parse(viewItemData);
                const cellElement = e.target.closest('[data-row][data-col]');

                if (cellElement) {
                    const row = parseInt(cellElement.dataset.row, 10);
                    const col = parseInt(cellElement.dataset.col, 10);
                    onExternalDrop?.(viewItem, { row, col });
                }
            } catch (err) {
                console.error('Failed to parse dropped ViewItem:', err);
            }
        }

        setExternalDragOver(null);
    }, [onExternalDrop]);

    // Handle cell click based on context
    const handleCellClick = useCallback((cell) => {
        if (context === 'layout' && isEditMode) {
            if (cell.type === 'empty') {
                toggleCellSelection(cell.row, cell.col);
            }
        } else if (cell.type === 'empty' && onSpawn) {
            // Spawn new view in empty cell
            onSpawn({ row: cell.row, col: cell.col });
        } else {
            navigateToCell(cell.row, cell.col);
            onCellClick?.(cell);
        }
    }, [context, isEditMode, toggleCellSelection, navigateToCell, onCellClick, onSpawn]);

    // Handle header action based on context
    const handleHeaderAction = useCallback(() => {
        switch (context) {
            case 'presence':
                onSavePlace?.();
                break;
            case 'homepoints':
                setHomepoint(viewport);
                onSetHome?.(viewport);
                break;
            default:
                break;
        }
    }, [context, viewport, setHomepoint, onSavePlace, onSetHome]);

    // Get collaborators at a specific cell
    const getCollaboratorsAtCell = useCallback((row, col) => {
        return collaborators.filter(c => c.position?.row === row && c.position?.col === col);
    }, [collaborators]);

    const ContextIcon = config.icon;

    // Conditional rendering - show minimal UI when not expanded
    if (!isExpanded && context === 'views') {
        return (
            <div
                ref={containerRef}
                className={`grid-layout-preview grid-layout-preview--${context} grid-layout-preview--collapsed ${className}`}
                onDragEnter={handleExternalDragEnter}
                onDragOver={handleExternalDragOver}
                onDragLeave={handleExternalDragLeave}
                onDrop={handleExternalDrop}
            >
                <div className="grid-layout-preview__collapsed-content">
                    <ContextIcon size={16} />
                    <span className="grid-layout-preview__collapsed-text">Drop view here</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`grid-layout-preview grid-layout-preview--${context} ${isExpanded ? 'grid-layout-preview--expanded' : ''} ${className}`}
            onDragEnter={handleExternalDragEnter}
            onDragOver={handleExternalDragOver}
            onDragLeave={handleExternalDragLeave}
            onDrop={handleExternalDrop}
        >
            {/* Header */}
            <div className="grid-layout-preview__header">
                <div className="grid-layout-preview__header-left">
                    <ContextIcon size={14} className="grid-layout-preview__header-icon" />
                    <span className="grid-layout-preview__header-title">{config.title}</span>

                    {config.headerBadge && (
                        <span className="grid-layout-preview__header-badge">
                            {config.headerBadge}
                        </span>
                    )}
                </div>

                <div className="grid-layout-preview__header-right">
                    {/* Context-specific header action */}
                    {config.headerAction && (
                        <button
                            className="grid-layout-preview__header-action"
                            onClick={handleHeaderAction}
                        >
                            {config.headerAction}
                        </button>
                    )}

                    {/* Edit mode toggle (layout context) */}
                    {config.showEditMode && (
                        <button
                            className={`grid-layout-preview__edit-btn ${isEditMode ? 'grid-layout-preview__edit-btn--active' : ''}`}
                            onClick={() => setIsEditMode(!isEditMode)}
                            title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
                        >
                            <Edit3 size={14} />
                        </button>
                    )}

                    {/* Presets button (layout context) */}
                    {config.showPresets && (
                        <button className="grid-layout-preview__presets-btn" title="Layout presets">
                            <GitBranch size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Grid Area */}
            <div className="grid-layout-preview__main">
                {/* Grid Container */}
                <div
                    className="grid-layout-preview__grid-container"
                    style={{
                        '--grid-cols': currentGridSize.cols,
                        '--grid-rows': currentGridSize.rows,
                        '--zoom': viewport.zoom,
                    }}
                >
                    <div className="grid-layout-preview__grid">
                        {gridCells.map((cell) => (
                            <GridCell
                                key={`${cell.row}-${cell.col}`}
                                cell={cell}
                                isSelected={selectedCells.some(
                                    c => c.row === cell.row && c.col === cell.col
                                )}
                                isViewport={
                                    cell.row === viewport.row && cell.col === viewport.col
                                }
                                isHomepoint={
                                    config.showHomepoint &&
                                    cell.row === homepoint.row &&
                                    cell.col === homepoint.col
                                }
                                hasOverlap={cell.placement && overlaps.has(cell.placement.id)}
                                collaborators={
                                    config.showCollaborators
                                        ? getCollaboratorsAtCell(cell.row, cell.col)
                                        : []
                                }
                                isDragging={dragState?.placementId === cell.placement?.id}
                                isDropTarget={
                                    (dragState &&
                                        dragState.currentRow === cell.row &&
                                        dragState.currentCol === cell.col) ||
                                    (externalDragOver &&
                                        externalDragOver.row === cell.row &&
                                        externalDragOver.col === cell.col)
                                }
                                isExternalDropTarget={
                                    externalDragOver &&
                                    externalDragOver.row === cell.row &&
                                    externalDragOver.col === cell.col
                                }
                                canSpawn={!!onSpawn && cell.type === 'empty'}
                                isEditMode={isEditMode}
                                onClick={() => handleCellClick(cell)}
                                onDragStart={() =>
                                    cell.placement && startDrag(cell.placement.id, cell.row, cell.col)
                                }
                                onDragOver={() => updateDrag(cell.row, cell.col)}
                                onDrop={() => endDrag(cell.row, cell.col)}
                                onFollow={onFollow}
                            />
                        ))}
                    </div>

                    {/* Viewport indicator */}
                    <ViewportIndicator viewport={viewport} gridSize={currentGridSize} />
                </div>

                {/* D-Pad Controller */}
                {config.showDPad && (
                    <DPadController
                        onNavigate={navigateViewport}
                        onHome={navigateHome}
                        viewport={viewport}
                        gridSize={currentGridSize}
                        className="grid-layout-preview__dpad"
                    />
                )}

                {/* Edit Mode Sidebar */}
                {isEditMode && (
                    <ToolsSidebar
                        onAddRow={addRow}
                        onRemoveRow={removeRow}
                        onAddColumn={addColumn}
                        onRemoveColumn={removeColumn}
                        canMerge={canMergeSelectedCells}
                        onMerge={() => {
                            // Merge selected cells
                            clearCellSelection();
                        }}
                        gridSize={currentGridSize}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="grid-layout-preview__footer">
                <div className="grid-layout-preview__footer-left">
                    {/* Zoom controls */}
                    <div className="grid-layout-preview__zoom">
                        <button
                            className="grid-layout-preview__zoom-btn"
                            onClick={() => setZoom(viewport.zoom - 0.25)}
                            disabled={viewport.zoom <= 0.5}
                        >
                            <ZoomOut size={12} />
                        </button>
                        <span className="grid-layout-preview__zoom-value">
                            {Math.round(viewport.zoom * 100)}%
                        </span>
                        <button
                            className="grid-layout-preview__zoom-btn"
                            onClick={() => setZoom(viewport.zoom + 0.25)}
                            disabled={viewport.zoom >= 2}
                        >
                            <ZoomIn size={12} />
                        </button>
                    </div>

                    {/* Coordinates display */}
                    <span className="grid-layout-preview__coordinates">
                        {viewport.row + 1},{viewport.col + 1}
                    </span>
                </div>

                <div className="grid-layout-preview__footer-center">
                    {/* Layout mode toggle (layout context) */}
                    {config.footerToggle && (
                        <div className="grid-layout-preview__mode-toggle">
                            <button
                                className={`grid-layout-preview__mode-btn ${layoutMode === 'grid' ? 'grid-layout-preview__mode-btn--active' : ''}`}
                                onClick={() => setLayoutMode('grid')}
                            >
                                Grid
                            </button>
                            <button
                                className={`grid-layout-preview__mode-btn ${layoutMode === 'flow' ? 'grid-layout-preview__mode-btn--active' : ''}`}
                                onClick={() => setLayoutMode('flow')}
                            >
                                Flow
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid-layout-preview__footer-right">
                    {/* Pending changes indicator and actions */}
                    {isDirty && (
                        <div className="grid-layout-preview__pending">
                            <span className="grid-layout-preview__pending-indicator" />
                            <span className="grid-layout-preview__pending-text">Pending</span>
                        </div>
                    )}

                    {/* Undo/Redo */}
                    {isEditMode && (
                        <>
                            <button
                                className="grid-layout-preview__action-btn"
                                onClick={undo}
                                disabled={!canUndo}
                                title="Undo"
                            >
                                <Undo2 size={14} />
                            </button>
                            <button
                                className="grid-layout-preview__action-btn"
                                onClick={redo}
                                disabled={!canRedo}
                                title="Redo"
                            >
                                <Redo2 size={14} />
                            </button>
                        </>
                    )}

                    {/* Apply/Cancel */}
                    {isDirty && (
                        <>
                            <button
                                className="grid-layout-preview__cancel-btn"
                                onClick={cancelChanges}
                                title="Cancel changes"
                            >
                                <X size={14} />
                            </button>
                            <button
                                className="grid-layout-preview__apply-btn"
                                onClick={applyChanges}
                                title="Apply changes"
                            >
                                <Save size={14} />
                                Apply
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

export default GridLayoutPreview;