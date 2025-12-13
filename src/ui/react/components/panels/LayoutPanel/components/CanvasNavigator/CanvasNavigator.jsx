// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.jsx
// Canvas Navigator - Interactive minimap for canvas navigation and editing
//
// Features:
// - Navigate mode: Click cells to pan viewport, D-pad controls
// - Edit mode: Select, drag, merge/unmerge cells, delete views
// - Display modes: Names, Numbers, Colors only
// - Dock positions: Left panel (bottom), corners, free float, minimized
// - Smart tooltips on hover
// - Keyboard shortcuts: Delete, Escape, Ctrl+A
// - Persists float position to localStorage

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    Home, Plus, Minus, ZoomIn, ZoomOut, Grid3X3,
    X, Move, MapPin, Trash2, Type, Hash,
    Navigation, Edit3, MousePointer2, Combine, Split,
    PanelLeft, Minimize2, Maximize2,
    CornerDownLeft, CornerDownRight, CornerUpLeft, CornerUpRight, Pin,
} from 'lucide-react';
import { useCanvasNavigator, DISPLAY_MODES, NAV_MODES, DOCK_POSITIONS } from './CanvasNavigator.logic';
import './CanvasNavigator.scss';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * NavBtn - Small icon button with color support
 */
const NavBtn = memo(function NavBtn({
    children, onClick, active, color, disabled, title, size = 'md', className = ''
}) {
    return (
        <button
            className={`canvas-navigator__btn canvas-navigator__btn--${size} ${active ? 'canvas-navigator__btn--active' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
            data-color={color}
            style={active && color ? {
                '--btn-color': color,
                borderColor: color,
                background: `${color}20`,
                color: color,
            } : undefined}
        >
            {children}
        </button>
    );
});

/**
 * NumberSpinner - Compact number input with +/- buttons
 */
const NumberSpinner = memo(function NumberSpinner({
    value, onChange, min = 1, max = 10, label, color
}) {
    return (
        <div className="canvas-navigator__spinner">
            {label && <span className="canvas-navigator__spinner-label">{label}</span>}
            <NavBtn size="xs" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
                <Minus size={8} />
            </NavBtn>
            <input
                type="number"
                className="canvas-navigator__spinner-input"
                value={value}
                onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
                style={color ? { color } : undefined}
            />
            <NavBtn size="xs" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
                <Plus size={8} />
            </NavBtn>
        </div>
    );
});

/**
 * SectionLabel - Color-coded section header
 */
const SectionLabel = memo(function SectionLabel({ children, color }) {
    return (
        <div className="canvas-navigator__section-label" style={color ? { color } : undefined}>
            {children}
        </div>
    );
});

/**
 * SmartTooltip - Rich tooltip showing view details
 * Uses portal to render at document body level for proper z-index
 */
const SmartTooltip = memo(function SmartTooltip({ cell, position, visible }) {
    if (!visible || !cell) return null;

    const color = cell.instanceColor || cell.color || '#60a5fa';

    // Render using portal to escape any overflow:hidden containers
    return ReactDOM.createPortal(
        <div
            className="canvas-navigator__tooltip"
            style={{
                position: 'fixed',
                left: position.x + 12,
                top: position.y - 8,
                '--tooltip-color': color,
                borderColor: color,
                boxShadow: `0 4px 20px rgba(0, 0, 0, 0.5), 0 0 12px ${color}40`,
            }}
        >
            <div className="canvas-navigator__tooltip-header">
                <div
                    className="canvas-navigator__tooltip-swatch"
                    style={{ background: color }}
                />
                <span className="canvas-navigator__tooltip-name">{cell.name || cell.viewName || 'Untitled View'}</span>
            </div>
            {(cell.datasetName || cell.dataset) && (
                <div className="canvas-navigator__tooltip-row">
                    Dataset: <span>{cell.datasetName || cell.dataset || 'Unknown'}</span>
                </div>
            )}
            <div className="canvas-navigator__tooltip-row">
                Position: <span className="mono">({cell.row}, {cell.col})</span>
                {(cell.colSpan > 1 || cell.rowSpan > 1) && (
                    <span style={{ marginLeft: 8 }}>
                        Size: <span className="mono">{cell.rowSpan}×{cell.colSpan}</span>
                    </span>
                )}
            </div>
        </div>,
        document.body
    );
});

/**
 * DockPositionPicker - Dropdown for selecting dock position
 */
const DockPositionPicker = memo(function DockPositionPicker({
    currentPosition, onPositionChange, onClose
}) {
    return (
        <div className="canvas-navigator__dock-picker">
            <div className="canvas-navigator__dock-picker-label">Dock Position</div>
            <div className="canvas-navigator__dock-picker-grid">
                <NavBtn
                    size="sm"
                    active={currentPosition === DOCK_POSITIONS.TOP_LEFT}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.TOP_LEFT); onClose(); }}
                    title="Top Left"
                    color="var(--color-accent-blue)"
                >
                    <CornerUpLeft size={10} />
                </NavBtn>
                <div />
                <NavBtn
                    size="sm"
                    active={currentPosition === DOCK_POSITIONS.TOP_RIGHT}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.TOP_RIGHT); onClose(); }}
                    title="Top Right"
                    color="var(--color-accent-blue)"
                >
                    <CornerUpRight size={10} />
                </NavBtn>
                <div />
                <NavBtn
                    size="sm"
                    active={currentPosition === DOCK_POSITIONS.FLOAT}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.FLOAT); onClose(); }}
                    title="Float (Free Position)"
                    color="var(--color-accent-amber)"
                >
                    <Move size={10} />
                </NavBtn>
                <div />
                <NavBtn
                    size="sm"
                    active={currentPosition === DOCK_POSITIONS.BOTTOM_LEFT}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.BOTTOM_LEFT); onClose(); }}
                    title="Bottom Left"
                    color="var(--color-accent-blue)"
                >
                    <CornerDownLeft size={10} />
                </NavBtn>
                <div />
                <NavBtn
                    size="sm"
                    active={currentPosition === DOCK_POSITIONS.BOTTOM_RIGHT}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.BOTTOM_RIGHT); onClose(); }}
                    title="Bottom Right"
                    color="var(--color-accent-blue)"
                >
                    <CornerDownRight size={10} />
                </NavBtn>
            </div>
            <div className="canvas-navigator__dock-picker-options">
                <button
                    className={`canvas-navigator__dock-option ${currentPosition === DOCK_POSITIONS.LEFT_PANEL ? 'canvas-navigator__dock-option--active' : ''}`}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.LEFT_PANEL); onClose(); }}
                >
                    <PanelLeft size={12} />
                    Dock to Left Panel
                </button>
                <button
                    className={`canvas-navigator__dock-option ${currentPosition === DOCK_POSITIONS.MINIMIZED ? 'canvas-navigator__dock-option--active' : ''}`}
                    onClick={() => { onPositionChange(DOCK_POSITIONS.MINIMIZED); onClose(); }}
                >
                    <Minimize2 size={12} />
                    Minimize
                </button>
            </div>
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CanvasNavigator = memo(function CanvasNavigator({
    logic,
    isDocked, // Optional override - used when rendered by LayoutPanel
    onClose,
    onPopOut, // Legacy prop
    className = '',
}) {
    const nav = useCanvasNavigator(logic);
    const {
        // State
        canvasSize,
        viewport,
        viewportSize,
        cells,
        homepoint,
        minimapZoom,
        dockPosition: logicDockPosition,
        mode,
        displayMode,
        selectedCells,
        settingHomepoint,
        isAtHome,
        isDisabled,
        // Actions
        setMode,
        setDisplayMode,
        setSettingHomepoint,
        setDockPosition,
        moveViewport,
        navigateToCell,
        setHomepoint,
        clearHomepoint,
        setViewportSizeRows,
        setViewportSizeCols,
        setCanvasRows,
        setCanvasCols,
        setMinimapZoom,
        // Edit mode
        selectCell,
        clearSelection,
        selectAll,
        handleMerge,
        handleUnmerge,
        handleDelete,
        canMerge,
        canUnmerge,
        // Cell helpers
        getCellAt,
        isInViewport,
        getCellDisplay,
        getCellColor,
        // Drag
        draggedCell,
        dragOverCell,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
    } = nav;

    // Determine actual dock position - isDocked prop overrides logic
    const dockPosition = isDocked !== undefined
        ? (isDocked ? DOCK_POSITIONS.LEFT_PANEL : DOCK_POSITIONS.FLOAT)
        : logicDockPosition;

    // Local UI state
    const [showDockPicker, setShowDockPicker] = useState(false);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Cell dimensions based on zoom
    const CELL_W = 26 * minimapZoom;
    const CELL_H = 20 * minimapZoom;
    const GAP = 2;

    // Keyboard shortcuts
    useEffect(() => {
        if (mode !== NAV_MODES.EDIT) return;

        const handleKeyDown = (e) => {
            // Only handle if navigator is focused or no input is focused
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                clearSelection();
            } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                selectAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, handleDelete, clearSelection, selectAll]);

    // Generate minimap cells
    const minimapCells = useMemo(() => {
        const result = [];
        let viewIndex = 0;

        for (let row = 0; row < canvasSize.rows; row++) {
            for (let col = 0; col < canvasSize.cols; col++) {
                const cell = getCellAt(row, col);
                const inVP = isInViewport(row, col);
                const isHome = homepoint && row === homepoint.row && col === homepoint.col;
                const isSelected = selectedCells.includes(`${row}-${col}`);
                const isDragOver = dragOverCell?.row === row && dragOverCell?.col === col;

                // Skip non-origin cells of spanning placements
                if (cell && (cell.row !== row || cell.col !== col)) continue;

                const cellIndex = cell ? viewIndex++ : -1;
                result.push({
                    row, col, cell, inVP, isHome, isSelected, isDragOver, cellIndex,
                    key: `${row}-${col}`
                });
            }
        }
        return result;
    }, [canvasSize, cells, getCellAt, isInViewport, homepoint, selectedCells, dragOverCell]);

    // Handle cell click
    const handleCellClick = useCallback((row, col, cell, e) => {
        if (settingHomepoint) {
            setHomepoint(row, col);
            return;
        }

        if (mode === NAV_MODES.EDIT) {
            selectCell(row, col, e.shiftKey);
            return;
        }

        // Navigate mode
        navigateToCell(row, col);
    }, [mode, settingHomepoint, setHomepoint, selectCell, navigateToCell]);

    // Check if docked in left panel
    const isDockedInPanel = dockPosition === DOCK_POSITIONS.LEFT_PANEL;
    const isMinimized = dockPosition === DOCK_POSITIONS.MINIMIZED;
    const isCornerDocked = [
        DOCK_POSITIONS.TOP_LEFT,
        DOCK_POSITIONS.TOP_RIGHT,
        DOCK_POSITIONS.BOTTOM_LEFT,
        DOCK_POSITIONS.BOTTOM_RIGHT
    ].includes(dockPosition);

    // Minimized state
    if (isMinimized) {
        return (
            <button
                className="canvas-navigator canvas-navigator--minimized"
                onClick={() => setDockPosition(DOCK_POSITIONS.FLOAT)}
            >
                <Grid3X3 size={14} />
                <span>Canvas Navigator</span>
                <Maximize2 size={12} />
            </button>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`canvas-navigator ${isDockedInPanel ? 'canvas-navigator--docked-panel' : ''} ${isCornerDocked ? 'canvas-navigator--corner' : ''} ${dockPosition === DOCK_POSITIONS.FLOAT ? 'canvas-navigator--floating' : ''} ${isDisabled ? 'canvas-navigator--disabled' : ''} ${className}`}
            tabIndex={0}
        >
            {/* Header */}
            <div className="canvas-navigator__header">
                {!isDockedInPanel && <Move size={12} className="canvas-navigator__drag-handle" />}
                <Grid3X3 size={14} className="canvas-navigator__icon" />
                <span className="canvas-navigator__title">Canvas Navigator</span>

                {/* Mode Tabs */}
                <div className="canvas-navigator__mode-tabs">
                    <NavBtn
                        size="sm"
                        active={mode === NAV_MODES.NAVIGATE}
                        color="var(--color-accent-blue)"
                        onClick={() => { setMode(NAV_MODES.NAVIGATE); clearSelection(); }}
                        title="Navigate Mode"
                    >
                        <Navigation size={10} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        active={mode === NAV_MODES.EDIT}
                        color="var(--color-accent-purple)"
                        onClick={() => setMode(NAV_MODES.EDIT)}
                        title="Edit Mode"
                    >
                        <Edit3 size={10} />
                    </NavBtn>
                </div>

                {/* Display Mode Toggle */}
                <div className="canvas-navigator__display-toggle">
                    <NavBtn
                        size="xs"
                        active={displayMode === DISPLAY_MODES.NAMES}
                        onClick={() => setDisplayMode(DISPLAY_MODES.NAMES)}
                        title="Show Names"
                    >
                        <Type size={8} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        active={displayMode === DISPLAY_MODES.NUMBERS}
                        onClick={() => setDisplayMode(DISPLAY_MODES.NUMBERS)}
                        title="Show Numbers"
                    >
                        <Hash size={8} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        active={displayMode === DISPLAY_MODES.COLORS}
                        onClick={() => setDisplayMode(DISPLAY_MODES.COLORS)}
                        title="Colors Only"
                    >
                        <div className="canvas-navigator__color-swatch" />
                    </NavBtn>
                </div>

                {/* Dock Position */}
                <div className="canvas-navigator__dock-wrapper">
                    <NavBtn
                        size="sm"
                        onClick={() => setShowDockPicker(!showDockPicker)}
                        title="Dock Position"
                        active={showDockPicker}
                    >
                        <Pin size={10} />
                    </NavBtn>
                    {showDockPicker && (
                        <DockPositionPicker
                            currentPosition={dockPosition}
                            onPositionChange={setDockPosition}
                            onClose={() => setShowDockPicker(false)}
                        />
                    )}
                </div>

                {!isDockedInPanel && (
                    <NavBtn size="sm" onClick={onClose || onPopOut || (() => setDockPosition(DOCK_POSITIONS.MINIMIZED))} title="Close">
                        <X size={12} />
                    </NavBtn>
                )}
            </div>

            {/* Edit Mode Toolbar */}
            {mode === NAV_MODES.EDIT && (
                <div className="canvas-navigator__edit-toolbar">
                    <MousePointer2 size={12} className="canvas-navigator__edit-icon" />
                    <span className="canvas-navigator__edit-hint">
                        {selectedCells.length === 0
                            ? 'Click to select, Shift+click for multi-select'
                            : `${selectedCells.length} cell${selectedCells.length > 1 ? 's' : ''} selected`
                        }
                    </span>
                    <NavBtn
                        size="sm"
                        onClick={handleMerge}
                        disabled={!canMerge}
                        color="var(--color-accent-teal)"
                        title="Merge Selected Cells (creates layout template)"
                    >
                        <Combine size={10} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={handleUnmerge}
                        disabled={!canUnmerge}
                        color="var(--color-accent-amber)"
                        title="Unmerge Cell"
                    >
                        <Split size={10} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={handleDelete}
                        disabled={selectedCells.length === 0}
                        color="var(--color-accent-red)"
                        title="Delete Selected (Del)"
                    >
                        <Trash2 size={10} />
                    </NavBtn>
                    <button
                        className="canvas-navigator__edit-clear"
                        onClick={clearSelection}
                    >
                        Clear (Esc)
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="canvas-navigator__body">
                {/* Minimap */}
                <div
                    className={`canvas-navigator__minimap ${settingHomepoint ? 'canvas-navigator__minimap--setting-home' : ''}`}
                >
                    {settingHomepoint && (
                        <div className="canvas-navigator__home-hint">
                            Click a cell to set homepoint
                        </div>
                    )}

                    <div
                        className="canvas-navigator__grid"
                        style={{
                            gridTemplateColumns: `repeat(${canvasSize.cols}, ${CELL_W}px)`,
                            gridTemplateRows: `repeat(${canvasSize.rows}, ${CELL_H}px)`,
                            gap: GAP,
                        }}
                    >
                        {minimapCells.map(({ row, col, cell, inVP, isHome, isSelected, isDragOver, cellIndex, key }) => {
                            const cellColor = cell ? getCellColor(cell) : null;

                            return (
                                <div
                                    key={key}
                                    className={`canvas-navigator__cell ${cell ? 'canvas-navigator__cell--filled' : 'canvas-navigator__cell--empty'} ${inVP ? 'canvas-navigator__cell--in-viewport' : ''} ${isHome ? 'canvas-navigator__cell--home' : ''} ${isSelected ? 'canvas-navigator__cell--selected' : ''} ${isDragOver ? 'canvas-navigator__cell--drag-over' : ''}`}
                                    style={{
                                        gridRow: cell ? `${cell.row + 1} / span ${cell.rowSpan || 1}` : 'auto',
                                        gridColumn: cell ? `${cell.col + 1} / span ${cell.colSpan || 1}` : 'auto',
                                        '--cell-color': cellColor,
                                    }}
                                    onClick={(e) => handleCellClick(row, col, cell, e)}
                                    onMouseEnter={(e) => {
                                        if (cell) {
                                            setHoveredCell(cell);
                                            setTooltipPos({ x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onMouseMove={(e) => {
                                        if (hoveredCell) setTooltipPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    draggable={mode === NAV_MODES.EDIT && !!cell}
                                    onDragStart={(e) => cell && handleDragStart(cell, e)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(row, col, e)}
                                    onDrop={(e) => handleDrop(row, col, e)}
                                    title={cell ? undefined : `Empty (${row}, ${col})${isHome ? ' - HOME' : ''}`}
                                >
                                    {isHome && !cell && <Home size={Math.max(8, 10 * minimapZoom)} className="canvas-navigator__home-icon" />}
                                    {cell && getCellDisplay(cell, cellIndex)}
                                    {isHome && cell && <div className="canvas-navigator__home-dot" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Viewport Rectangle */}
                    {mode === NAV_MODES.NAVIGATE && (
                        <div
                            className="canvas-navigator__viewport-rect"
                            style={{
                                top: viewport.row * (CELL_H + GAP),
                                left: viewport.col * (CELL_W + GAP),
                                width: viewportSize.cols * (CELL_W + GAP) - GAP,
                                height: viewportSize.rows * (CELL_H + GAP) - GAP,
                            }}
                        />
                    )}
                </div>

                {/* Controls Panel */}
                <div className="canvas-navigator__controls">
                    {/* Position */}
                    <div className="canvas-navigator__control-section">
                        <SectionLabel color="var(--color-accent-amber)">Position</SectionLabel>
                        <div className="canvas-navigator__dpad">
                            <div className="canvas-navigator__dpad-row">
                                <div />
                                <NavBtn onClick={() => moveViewport('up')} title="Move Up">
                                    <ChevronUp size={12} />
                                </NavBtn>
                                <div />
                            </div>
                            <div className="canvas-navigator__dpad-row">
                                <NavBtn onClick={() => moveViewport('left')} title="Move Left">
                                    <ChevronLeft size={12} />
                                </NavBtn>
                                <NavBtn
                                    onClick={() => moveViewport('home')}
                                    active={isAtHome}
                                    color="var(--color-accent-amber)"
                                    disabled={!homepoint}
                                    title="Go Home"
                                >
                                    <Home size={10} />
                                </NavBtn>
                                <NavBtn onClick={() => moveViewport('right')} title="Move Right">
                                    <ChevronRight size={12} />
                                </NavBtn>
                            </div>
                            <div className="canvas-navigator__dpad-row">
                                <div />
                                <NavBtn onClick={() => moveViewport('down')} title="Move Down">
                                    <ChevronDown size={12} />
                                </NavBtn>
                                <div />
                            </div>
                        </div>
                        <div className="canvas-navigator__position-display">
                            {viewport.row},{viewport.col}
                        </div>
                    </div>

                    {/* Homepoint */}
                    <div className="canvas-navigator__control-section">
                        <SectionLabel color="var(--color-accent-pink)">Home</SectionLabel>
                        <div className="canvas-navigator__home-controls">
                            <NavBtn
                                onClick={() => setSettingHomepoint(!settingHomepoint)}
                                active={settingHomepoint}
                                color="var(--color-accent-pink)"
                                title="Set homepoint"
                            >
                                <MapPin size={10} />
                            </NavBtn>
                            {homepoint ? (
                                <>
                                    <span className="canvas-navigator__home-coords">
                                        {homepoint.row},{homepoint.col}
                                    </span>
                                    <NavBtn size="sm" onClick={clearHomepoint} title="Clear">
                                        <Trash2 size={8} />
                                    </NavBtn>
                                </>
                            ) : (
                                <span className="canvas-navigator__home-empty">Not set</span>
                            )}
                        </div>
                    </div>

                    {/* View Size (Rows × Cols) */}
                    <div className="canvas-navigator__control-section">
                        <SectionLabel color="var(--color-accent-green)">View Size</SectionLabel>
                        <div className="canvas-navigator__size-controls">
                            <NumberSpinner
                                label="Rows"
                                value={viewportSize.rows}
                                onChange={setViewportSizeRows}
                                min={1}
                                max={10}
                                color="var(--color-accent-green)"
                            />
                            <span className="canvas-navigator__size-x">×</span>
                            <NumberSpinner
                                label="Cols"
                                value={viewportSize.cols}
                                onChange={setViewportSizeCols}
                                min={1}
                                max={10}
                                color="var(--color-accent-green)"
                            />
                        </div>
                    </div>

                    {/* Zoom */}
                    <div className="canvas-navigator__control-section">
                        <SectionLabel color="var(--color-accent-blue)">Zoom</SectionLabel>
                        <div className="canvas-navigator__zoom-controls">
                            <NavBtn
                                onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))}
                                disabled={minimapZoom <= 0.5}
                            >
                                <ZoomOut size={10} />
                            </NavBtn>
                            <span className="canvas-navigator__zoom-value">
                                {Math.round(minimapZoom * 100)}%
                            </span>
                            <NavBtn
                                onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))}
                                disabled={minimapZoom >= 2}
                            >
                                <ZoomIn size={10} />
                            </NavBtn>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Canvas Size (Rows × Cols) */}
            <div className="canvas-navigator__footer">
                <SectionLabel color="var(--color-accent-purple)">Canvas</SectionLabel>
                <NumberSpinner
                    label="Rows"
                    value={canvasSize.rows}
                    onChange={setCanvasRows}
                    min={1}
                    max={50}
                    color="var(--color-accent-purple)"
                />
                <span className="canvas-navigator__size-x">×</span>
                <NumberSpinner
                    label="Cols"
                    value={canvasSize.cols}
                    onChange={setCanvasCols}
                    min={1}
                    max={50}
                    color="var(--color-accent-purple)"
                />
                <div className="canvas-navigator__footer-spacer" />
                <span className="canvas-navigator__view-count">
                    {cells.filter(c => c).length} views
                </span>
            </div>

            {/* Smart Tooltip */}
            <SmartTooltip cell={hoveredCell} position={tooltipPos} visible={!!hoveredCell} />
        </div>
    );
});

export default CanvasNavigator;