// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab.jsx
// Layout tab content for the unified left panel
//
// Features:
// - Infinite canvas navigator with viewport control
// - Grid layout minimap with cell selection
// - Canvas size controls (add/remove rows/columns)
// - View mode toggle (Normal, Isolation, Subset)
// - Cell resize and arrangement
// - Quick layout presets
// - Workspace members visibility
// - VS Code-style collapsible sections

import React, { useState, useCallback, useMemo } from 'react';
import {
    LayoutGrid,
    Grid3X3,
    Maximize,
    Maximize2,
    Layers,
    Plus,
    Minus,
    Move,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ChevronLeft,
    Eye,
    EyeOff,
    Users,
    User,
    Globe,
    Briefcase,
    Zap,
    Moon,
    Radio,
    MousePointer2,
    PenTool,
    Link2,
    MoreHorizontal,
    Square,
    Columns,
    Rows,
    PanelLeft,
    Save,
    UserCircle,
    Navigation,
    Crosshair,
    Database,
    X,
    GripVertical,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";

// =============================================================================
// SAMPLE DATA
// =============================================================================

const CURRENT_WORKSPACE = {
    id: 'personal',
    name: 'My Workspace',
    type: 'personal',
    color: 'green',
};

// Initial canvas and viewport configuration
const INITIAL_CANVAS_SIZE = { rows: 4, cols: 5 };
const INITIAL_VIEWPORT = { row: 0, col: 0, rows: 2, cols: 3 };

const INITIAL_CELLS = [
    { id: 'c1', row: 0, col: 0, rowSpan: 1, colSpan: 2, instance: { id: 'i1', name: 'Brain MRI - Axial', dataset: 'Brain_Scan_001.nii', color: 'blue' } },
    { id: 'c2', row: 0, col: 2, rowSpan: 2, colSpan: 1, instance: { id: 'i2', name: 'Spine CT', dataset: 'CT_Overlay.dcm', color: 'purple' } },
    { id: 'c3', row: 1, col: 0, rowSpan: 1, colSpan: 1, instance: { id: 'i3', name: 'PCA Plot', dataset: 'Analysis.vtk', color: 'green' } },
    { id: 'c4', row: 1, col: 1, rowSpan: 1, colSpan: 1, instance: null },
    { id: 'c5', row: 2, col: 0, rowSpan: 1, colSpan: 3, instance: { id: 'i4', name: 'Timeline', dataset: 'Timeline.csv', color: 'amber' } },
    { id: 'c6', row: 3, col: 0, rowSpan: 1, colSpan: 2, instance: null },
    { id: 'c7', row: 3, col: 2, rowSpan: 1, colSpan: 1, instance: { id: 'i5', name: 'Comparison View', dataset: 'Reference.nii', color: 'pink' } },
    { id: 'c8', row: 0, col: 3, rowSpan: 2, colSpan: 2, instance: { id: 'i6', name: 'Full Scan', dataset: 'FullBody.dcm', color: 'teal' } },
    { id: 'c9', row: 2, col: 3, rowSpan: 2, colSpan: 2, instance: null },
];

const AVAILABLE_DATASETS = [
    { id: 'd1', name: 'Brain MRI', color: 'blue' },
    { id: 'd2', name: 'Spine CT', color: 'purple' },
    { id: 'd3', name: 'PCA Results', color: 'green' },
    { id: 'd7', name: 'Knee X-Ray', color: 'amber' },
    { id: 'd8', name: 'Heart Echo', color: 'pink' },
];

const WORKSPACE_MEMBERS = [
    { id: 'me', name: 'You', color: 'teal', isMe: true, status: 'active', cursorVisible: true },
    { id: 'u1', name: 'Dr. Smith', color: 'pink', isMe: false, status: 'active', cursorVisible: true },
    { id: 'u2', name: 'Dr. Jones', color: 'amber', isMe: false, status: 'idle', cursorVisible: true },
];

const LAYOUT_PRESETS = [
    { id: 'single', name: 'Single', icon: Square, grid: '1×1' },
    { id: 'split-h', name: 'Split H', icon: Columns, grid: '1×2' },
    { id: 'split-v', name: 'Split V', icon: Rows, grid: '2×1' },
    { id: 'quad', name: 'Quad', icon: Grid3X3, grid: '2×2' },
    { id: 'focus', name: 'Focus', icon: PanelLeft, grid: '1+2' },
];

const VIEW_MODES = [
    { id: 'normal', label: 'Normal', icon: Grid3X3, color: 'green', description: 'Standard grid view with all instances visible.' },
    { id: 'isolation', label: 'Isolation', icon: Maximize, color: 'purple', description: 'Focus on a single instance. Click an instance or select from list.' },
    { id: 'subset', label: 'Subset', icon: Layers, color: 'teal', description: 'Select multiple instances to view together. Others are hidden.' },
];

const RESIZE_OPTIONS = ['1×1', '1×2', '2×1', '2×2', '1×3', '3×1'];

// =============================================================================
// WORKSPACE ICON HELPER
// =============================================================================

function getWorkspaceIcon(type) {
    switch (type) {
        case 'personal': return UserCircle;
        case 'project': return Globe;
        case 'breakout': return Briefcase;
        default: return Globe;
    }
}

// =============================================================================
// CANVAS NAVIGATOR (Mini-map with viewport)
// =============================================================================

function CanvasNavigator({ canvasSize, viewport, cells, onCellClick, onViewportMove, onCanvasSizeChange }) {
    const cellSize = 16;
    const gap = 2;

    // Get cell at position
    const getCellAt = useCallback((row, col) => {
        return cells.find(c =>
            row >= c.row && row < c.row + c.rowSpan &&
            col >= c.col && col < c.col + c.colSpan
        );
    }, [cells]);

    // Check if position is in viewport
    const isInViewport = useCallback((row, col) => {
        return row >= viewport.row && row < viewport.row + viewport.rows &&
            col >= viewport.col && col < viewport.col + viewport.cols;
    }, [viewport]);

    return (
        <div className="canvas-navigator">
            <div className="canvas-navigator__map-container">
                {/* Grid */}
                <div
                    className="canvas-navigator__grid"
                    style={{
                        gridTemplateColumns: `repeat(${canvasSize.cols}, ${cellSize}px)`,
                        gridTemplateRows: `repeat(${canvasSize.rows}, ${cellSize}px)`,
                        gap: `${gap}px`,
                    }}
                >
                    {Array.from({ length: canvasSize.rows * canvasSize.cols }).map((_, idx) => {
                        const row = Math.floor(idx / canvasSize.cols);
                        const col = idx % canvasSize.cols;
                        const cell = getCellAt(row, col);
                        const inVP = isInViewport(row, col);

                        // Skip if covered by spanning cell
                        if (cell && (cell.row !== row || cell.col !== col)) return null;

                        return (
                            <div
                                key={idx}
                                className={`canvas-navigator__cell ${cell?.instance ? '' : 'canvas-navigator__cell--empty'}`}
                                style={{
                                    gridRow: cell ? `${cell.row + 1} / span ${cell.rowSpan}` : 'auto',
                                    gridColumn: cell ? `${cell.col + 1} / span ${cell.colSpan}` : 'auto',
                                    '--cell-color': cell?.instance ? `var(--color-accent-${cell.instance.color})` : undefined,
                                    opacity: inVP ? 1 : 0.5,
                                }}
                                onClick={() => onCellClick(row, col)}
                                title={cell?.instance?.name || 'Empty'}
                            />
                        );
                    })}
                </div>

                {/* Viewport indicator */}
                <div
                    className="canvas-navigator__viewport"
                    style={{
                        top: `${8 + viewport.row * (cellSize + gap)}px`,
                        left: `${8 + viewport.col * (cellSize + gap)}px`,
                        width: `${viewport.cols * cellSize + (viewport.cols - 1) * gap}px`,
                        height: `${viewport.rows * cellSize + (viewport.rows - 1) * gap}px`,
                    }}
                />
            </div>

            {/* D-pad navigation */}
            <div className="canvas-navigator__controls">
                <div className="canvas-navigator__dpad">
                    <div />
                    <button
                        className="canvas-navigator__nav-btn"
                        onClick={() => onViewportMove('up')}
                        title="Pan up"
                    >
                        <ChevronUp size={12} />
                    </button>
                    <div />
                    <button
                        className="canvas-navigator__nav-btn"
                        onClick={() => onViewportMove('left')}
                        title="Pan left"
                    >
                        <ChevronLeft size={12} />
                    </button>
                    <button
                        className="canvas-navigator__nav-btn canvas-navigator__nav-btn--center"
                        onClick={() => onViewportMove('reset')}
                        title="Reset"
                    >
                        <Crosshair size={12} />
                    </button>
                    <button
                        className="canvas-navigator__nav-btn"
                        onClick={() => onViewportMove('right')}
                        title="Pan right"
                    >
                        <ChevronRight size={12} />
                    </button>
                    <div />
                    <button
                        className="canvas-navigator__nav-btn"
                        onClick={() => onViewportMove('down')}
                        title="Pan down"
                    >
                        <ChevronDown size={12} />
                    </button>
                    <div />
                </div>
                <div className="canvas-navigator__position">
                    Viewport: ({viewport.col},{viewport.row})
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// CANVAS SIZE CONTROLS
// =============================================================================

function CanvasSizeControls({ canvasSize, viewport, onAddRow, onRemoveRow, onAddCol, onRemoveCol }) {
    const canRemoveRow = canvasSize.rows > viewport.rows;
    const canRemoveCol = canvasSize.cols > viewport.cols;

    return (
        <div className="canvas-size-controls">
            <div className="canvas-size-controls__group">
                <div className="canvas-size-controls__label">Rows</div>
                <div className="canvas-size-controls__buttons">
                    <button
                        className="canvas-size-controls__btn"
                        onClick={onRemoveRow}
                        disabled={!canRemoveRow}
                    >
                        <Minus size={12} />
                    </button>
                    <span className="canvas-size-controls__value">{canvasSize.rows}</span>
                    <button
                        className="canvas-size-controls__btn canvas-size-controls__btn--add"
                        onClick={onAddRow}
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </div>
            <div className="canvas-size-controls__divider" />
            <div className="canvas-size-controls__group">
                <div className="canvas-size-controls__label">Columns</div>
                <div className="canvas-size-controls__buttons">
                    <button
                        className="canvas-size-controls__btn"
                        onClick={onRemoveCol}
                        disabled={!canRemoveCol}
                    >
                        <Minus size={12} />
                    </button>
                    <span className="canvas-size-controls__value">{canvasSize.cols}</span>
                    <button
                        className="canvas-size-controls__btn canvas-size-controls__btn--add"
                        onClick={onAddCol}
                    >
                        <Plus size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// ARRANGEMENT GRID
// =============================================================================

function ArrangementGrid({ cells, viewport, canvasSize, selectedCell, editMode, dragOverCell, onSelectCell, onClearCell, onDragOver, onDrop }) {
    const cellSize = 48;
    const gap = 4;

    // Get cell at global position
    const getCellAt = useCallback((row, col) => {
        return cells.find(c =>
            row >= c.row && row < c.row + c.rowSpan &&
            col >= c.col && col < c.col + c.colSpan
        );
    }, [cells]);

    return (
        <div
            className="arrangement-grid"
            style={{
                gridTemplateColumns: `repeat(${viewport.cols}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${viewport.rows}, ${cellSize}px)`,
                gap: `${gap}px`,
            }}
        >
            {Array.from({ length: viewport.rows * viewport.cols }).map((_, idx) => {
                const localRow = Math.floor(idx / viewport.cols);
                const localCol = idx % viewport.cols;
                const globalRow = viewport.row + localRow;
                const globalCol = viewport.col + localCol;
                const cell = getCellAt(globalRow, globalCol);

                // Skip if covered by spanning cell
                if (cell && (cell.row !== globalRow || cell.col !== globalCol)) return null;

                const isSelected = selectedCell === cell?.id;
                const isDragOver = dragOverCell === cell?.id;

                return (
                    <div
                        key={idx}
                        className={`arrangement-grid__cell ${cell?.instance ? '' : 'arrangement-grid__cell--empty'} ${isSelected ? 'arrangement-grid__cell--selected' : ''} ${isDragOver ? 'arrangement-grid__cell--drag-over' : ''}`}
                        style={{
                            gridRow: cell ? `${cell.row - viewport.row + 1} / span ${Math.min(cell.rowSpan, viewport.rows - (cell.row - viewport.row))}` : 'auto',
                            gridColumn: cell ? `${cell.col - viewport.col + 1} / span ${Math.min(cell.colSpan, viewport.cols - (cell.col - viewport.col))}` : 'auto',
                            '--cell-color': cell?.instance ? `var(--color-accent-${cell.instance.color})` : undefined,
                        }}
                        onClick={() => cell && onSelectCell(isSelected ? null : cell.id)}
                        onDragOver={(e) => cell && onDragOver(cell.id, e)}
                        onDrop={() => cell && onDrop(cell)}
                    >
                        {cell?.instance ? (
                            <>
                                <div
                                    className="arrangement-grid__cell-color"
                                    style={{ background: `var(--color-accent-${cell.instance.color})` }}
                                />
                                <span className="arrangement-grid__cell-name">
                                    {cell.instance.name.split(' ')[0]}
                                </span>
                                {editMode && (
                                    <button
                                        className="arrangement-grid__cell-clear"
                                        onClick={(e) => { e.stopPropagation(); onClearCell(cell.id); }}
                                    >
                                        <X size={8} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <Plus size={16} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// =============================================================================
// RESIZE CONTROLS
// =============================================================================

function ResizeControls({ selectedCell, cells, onResize }) {
    const cell = cells.find(c => c.id === selectedCell);
    if (!cell?.instance) return null;

    return (
        <div className="resize-controls">
            <div className="resize-controls__label">
                Resize: {cell.instance.name}
            </div>
            <div className="resize-controls__options">
                {RESIZE_OPTIONS.map(size => {
                    const [cols, rows] = size.split('×').map(Number);
                    return (
                        <button
                            key={size}
                            className="resize-controls__btn"
                            onClick={() => onResize(selectedCell, { rowSpan: rows, colSpan: cols })}
                        >
                            {size}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// DATASET DRAG SOURCE
// =============================================================================

function DatasetDragSource({ datasets, onDragStart, onDragEnd }) {
    return (
        <div className="dataset-drag-source">
            <div className="dataset-drag-source__label">
                Drag datasets to empty cells:
            </div>
            <div className="dataset-drag-source__items">
                {datasets.map(dataset => (
                    <div
                        key={dataset.id}
                        className="dataset-drag-source__item"
                        style={{ '--dataset-color': `var(--color-accent-${dataset.color})` }}
                        draggable
                        onDragStart={() => onDragStart(dataset)}
                        onDragEnd={onDragEnd}
                    >
                        <Database size={12} />
                        {dataset.name}
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// VIEW MODE BUTTONS
// =============================================================================

function ViewModeButtons({ viewMode, onModeChange }) {
    return (
        <div className="view-mode-section">
            <div className="view-mode-section__buttons">
                {VIEW_MODES.map(mode => {
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            className={`view-mode-btn ${viewMode === mode.id ? 'view-mode-btn--active' : ''}`}
                            data-color={mode.color}
                            onClick={() => onModeChange(mode.id)}
                        >
                            <Icon size={16} />
                            <span>{mode.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="view-mode-section__description">
                {VIEW_MODES.find(m => m.id === viewMode)?.description}
            </div>
        </div>
    );
}

// =============================================================================
// MEMBER ITEM
// =============================================================================

function MemberItem({ member, cursorVisible, onToggleCursor }) {
    return (
        <div
            className={`member-item ${member.isMe ? 'member-item--me' : ''}`}
            style={{ '--member-color': `var(--color-accent-${member.color})` }}
        >
            <span className={`member-item__status ${member.status === 'active' ? 'member-item__status--active' : ''}`} />
            <div className="member-item__info">
                <span className="member-item__name">
                    {member.name}
                    {member.isMe && <span className="member-item__you-badge">YOU</span>}
                </span>
                <span className="member-item__activity">
                    {member.status === 'active' ? (
                        <><Zap size={8} /> Active</>
                    ) : (
                        <><Moon size={8} /> Idle</>
                    )}
                </span>
            </div>
            {!member.isMe && (
                <>
                    <button
                        className={`member-item__btn ${cursorVisible ? 'member-item__btn--active' : ''}`}
                        onClick={() => onToggleCursor(member.id)}
                        title="Toggle cursor visibility"
                    >
                        {cursorVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <button className="member-item__btn" title="Follow">
                        <Radio size={10} />
                    </button>
                </>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LayoutPanelContent({ workspaceId }) {
    // State
    const [viewMode, setViewMode] = useState('normal');
    const [canvasSize, setCanvasSize] = useState(INITIAL_CANVAS_SIZE);
    const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
    const [cells, setCells] = useState(INITIAL_CELLS);
    const [selectedCell, setSelectedCell] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [draggedDataset, setDraggedDataset] = useState(null);
    const [dragOverCell, setDragOverCell] = useState(null);
    const [memberCursors, setMemberCursors] = useState(
        Object.fromEntries(WORKSPACE_MEMBERS.map(m => [m.id, m.cursorVisible]))
    );

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        modes: { expanded: true, flexGrow: 0 },
        canvas: { expanded: true, flexGrow: 1 },
        arrange: { expanded: true, flexGrow: 2 },
        presets: { expanded: false, flexGrow: 0 },
        members: { expanded: false, flexGrow: 1 },
    });

    // Canvas navigation
    const moveViewport = useCallback((direction) => {
        setViewport(prev => {
            const newViewport = { ...prev };
            switch (direction) {
                case 'up': newViewport.row = Math.max(0, prev.row - 1); break;
                case 'down': newViewport.row = Math.min(canvasSize.rows - prev.rows, prev.row + 1); break;
                case 'left': newViewport.col = Math.max(0, prev.col - 1); break;
                case 'right': newViewport.col = Math.min(canvasSize.cols - prev.cols, prev.col + 1); break;
                case 'reset': return { ...prev, row: 0, col: 0 };
            }
            return newViewport;
        });
    }, [canvasSize]);

    // Canvas size controls
    const addRow = useCallback(() => setCanvasSize(prev => ({ ...prev, rows: prev.rows + 1 })), []);
    const removeRow = useCallback(() => {
        if (canvasSize.rows > viewport.rows) {
            setCanvasSize(prev => ({ ...prev, rows: prev.rows - 1 }));
        }
    }, [canvasSize.rows, viewport.rows]);
    const addCol = useCallback(() => setCanvasSize(prev => ({ ...prev, cols: prev.cols + 1 })), []);
    const removeCol = useCallback(() => {
        if (canvasSize.cols > viewport.cols) {
            setCanvasSize(prev => ({ ...prev, cols: prev.cols - 1 }));
        }
    }, [canvasSize.cols, viewport.cols]);

    // Mini-map cell click
    const handleMinimapClick = useCallback((row, col) => {
        setViewport(prev => ({
            ...prev,
            row: Math.min(row, canvasSize.rows - prev.rows),
            col: Math.min(col, canvasSize.cols - prev.cols),
        }));
    }, [canvasSize]);

    // Cell operations
    const clearCell = useCallback((cellId) => {
        setCells(prev => prev.map(c =>
            c.id === cellId ? { ...c, instance: null } : c
        ));
    }, []);

    const resizeCell = useCallback((cellId, newSpan) => {
        setCells(prev => prev.map(c =>
            c.id === cellId ? { ...c, ...newSpan } : c
        ));
        setSelectedCell(null);
    }, []);

    // Drag & drop
    const handleDragStart = useCallback((dataset) => {
        setDraggedDataset(dataset);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedDataset(null);
        setDragOverCell(null);
    }, []);

    const handleDragOver = useCallback((cellId, e) => {
        e.preventDefault();
        setDragOverCell(cellId);
    }, []);

    const handleDrop = useCallback((cell) => {
        if (draggedDataset && cell && !cell.instance) {
            setCells(prev => prev.map(c =>
                c.id === cell.id
                    ? { ...c, instance: { id: `i-new-${Date.now()}`, name: draggedDataset.name, dataset: `${draggedDataset.name}.dcm`, color: draggedDataset.color } }
                    : c
            ));
        }
        setDraggedDataset(null);
        setDragOverCell(null);
    }, [draggedDataset]);

    // Toggle member cursor
    const toggleMemberCursor = useCallback((memberId) => {
        setMemberCursors(prev => ({ ...prev, [memberId]: !prev[memberId] }));
    }, []);

    const WorkspaceIcon = getWorkspaceIcon(CURRENT_WORKSPACE.type);
    const activeMembers = WORKSPACE_MEMBERS.filter(m => m.status === 'active').length;
    const filledCells = cells.filter(c => c.instance).length;

    return (
        <div className="layout-tab">
            {/* Header */}
            <div className="panel-header">
                <LayoutGrid size={14} className="panel-header__icon file-icon--green" />
                <span className="panel-header__title">Layout</span>
                <span className="panel-header__badge">{canvasSize.cols}×{canvasSize.rows} canvas</span>
            </div>

            {/* Workspace indicator */}
            <div className="layout-tab__workspace-indicator" style={{ '--workspace-color': `var(--color-accent-${CURRENT_WORKSPACE.color})` }}>
                <WorkspaceIcon size={14} />
                <span className="layout-tab__workspace-name">{CURRENT_WORKSPACE.name}</span>
                <span className="layout-tab__workspace-count">{filledCells} instances</span>
            </div>

            {/* Content */}
            <div className="layout-tab__content">
                {/* View Modes */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('modes')}
                    >
                        {sectionStates.modes?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>View Mode</span>
                    </div>
                    {sectionStates.modes?.expanded && (
                        <ViewModeButtons viewMode={viewMode} onModeChange={setViewMode} />
                    )}
                </div>

                {/* Canvas Navigator */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('canvas')}
                    >
                        {sectionStates.canvas?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <Navigation size={12} />
                        <span>Canvas Navigator</span>
                    </div>
                    {sectionStates.canvas?.expanded && (
                        <>
                            <CanvasNavigator
                                canvasSize={canvasSize}
                                viewport={viewport}
                                cells={cells}
                                onCellClick={handleMinimapClick}
                                onViewportMove={moveViewport}
                                onCanvasSizeChange={setCanvasSize}
                            />
                            <CanvasSizeControls
                                canvasSize={canvasSize}
                                viewport={viewport}
                                onAddRow={addRow}
                                onRemoveRow={removeRow}
                                onAddCol={addCol}
                                onRemoveCol={removeCol}
                            />
                        </>
                    )}
                </div>

                {/* Arrange Views */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('arrange')}
                    >
                        {sectionStates.arrange?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <Move size={12} />
                        <span>Arrange Views</span>
                        <button
                            className={`layout-tab__edit-toggle ${editMode ? 'layout-tab__edit-toggle--active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setEditMode(!editMode); }}
                        >
                            {editMode ? 'Done' : 'Edit'}
                        </button>
                    </div>
                    {sectionStates.arrange?.expanded && (
                        <>
                            <div className="layout-tab__arrange-container">
                                <ArrangementGrid
                                    cells={cells}
                                    viewport={viewport}
                                    canvasSize={canvasSize}
                                    selectedCell={selectedCell}
                                    editMode={editMode}
                                    dragOverCell={dragOverCell}
                                    onSelectCell={setSelectedCell}
                                    onClearCell={clearCell}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                />
                            </div>
                            {selectedCell && (
                                <ResizeControls
                                    selectedCell={selectedCell}
                                    cells={cells}
                                    onResize={resizeCell}
                                />
                            )}
                            <DatasetDragSource
                                datasets={AVAILABLE_DATASETS}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            />
                        </>
                    )}
                </div>

                {/* Quick Layouts */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('presets')}
                    >
                        {sectionStates.presets?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <span>Quick Layouts</span>
                    </div>
                    {sectionStates.presets?.expanded && (
                        <div className="layout-presets">
                            {LAYOUT_PRESETS.map(preset => {
                                const Icon = preset.icon;
                                return (
                                    <button key={preset.id} className="layout-preset-btn">
                                        <Icon size={12} />
                                        {preset.name}
                                    </button>
                                );
                            })}
                            <button className="layout-preset-btn layout-preset-btn--save">
                                <Save size={12} />
                                Save Current
                            </button>
                        </div>
                    )}
                </div>

                {/* Workspace Members */}
                <div className="layout-tab__section">
                    <div
                        className="layout-tab__section-header"
                        onClick={() => toggleSection('members')}
                    >
                        {sectionStates.members?.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <Users size={12} />
                        <span>Workspace Members</span>
                        <span className="layout-tab__section-badge">{activeMembers} active</span>
                    </div>
                    {sectionStates.members?.expanded && (
                        <>
                            {WORKSPACE_MEMBERS.map(member => (
                                <MemberItem
                                    key={member.id}
                                    member={member}
                                    cursorVisible={memberCursors[member.id]}
                                    onToggleCursor={toggleMemberCursor}
                                />
                            ))}
                            <div className="members-actions">
                                <button className="members-action-btn" data-color="green">
                                    <Eye size={10} /> Show All
                                </button>
                                <button className="members-action-btn">
                                    <EyeOff size={10} /> Hide All
                                </button>
                            </div>
                            <button className="advanced-cursors-link">
                                <MousePointer2 size={10} />
                                Advanced cursor settings →
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <PenTool size={11} />
                    <span>Workspace Annotation</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <Link2 size={11} />
                    <span>Link Views</span>
                </button>
            </div>
        </div>
    );
}

export default LayoutPanelContent;