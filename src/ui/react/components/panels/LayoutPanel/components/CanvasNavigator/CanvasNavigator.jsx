// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.jsx
// Canvas Navigator - Responsive design that adapts to docked vs floating modes
//
// DOCKED MODE (compact):
// - Minimap fills width, auto-sized cells
// - Controls in compact row below minimap
// - Collapsible sections
//
// FLOATING MODE (full):
// - Minimap on left, controls on right
// - Full control panel with all options

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    Grid3X3, Move, GripVertical, Pin, PinOff, X, Maximize2, Minimize2,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Home, Crosshair,
    ZoomIn, ZoomOut, Pencil, Navigation, Type, Hash, Palette,
    PanelLeft, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight,
    Merge, Split, Trash2, Plus, Minus, Settings2
} from 'lucide-react';
import { useCanvasNavigator, DISPLAY_MODES, NAV_MODES, DOCK_POSITIONS } from './CanvasNavigator.logic';
import './CanvasNavigator.scss';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * NavBtn - Compact navigation button
 */
const NavBtn = memo(function NavBtn({
    children,
    onClick,
    active,
    disabled,
    title,
    size = 'md',
    color,
    className = '',
    ...props
}) {
    return (
        <button
            className={`canvas-navigator__btn canvas-navigator__btn--${size} ${active ? 'canvas-navigator__btn--active' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
            data-color={color}
            {...props}
        >
            {children}
        </button>
    );
});

/**
 * NumberSpinner - Compact number input with +/- buttons
 */
const NumberSpinner = memo(function NumberSpinner({
    label,
    value,
    onChange,
    min = 1,
    max = 50,
    color,
    compact = false,
}) {
    const handleIncrement = useCallback(() => {
        if (value < max) onChange(value + 1);
    }, [value, max, onChange]);

    const handleDecrement = useCallback(() => {
        if (value > min) onChange(value - 1);
    }, [value, min, onChange]);

    return (
        <div className={`canvas-navigator__spinner ${compact ? 'canvas-navigator__spinner--compact' : ''}`}>
            {label && <span className="canvas-navigator__spinner-label">{label}</span>}
            <button
                className="canvas-navigator__spinner-btn"
                onClick={handleDecrement}
                disabled={value <= min}
            >
                <Minus size={10} />
            </button>
            <span
                className="canvas-navigator__spinner-value"
                style={{ color: color || 'inherit' }}
            >
                {value}
            </span>
            <button
                className="canvas-navigator__spinner-btn"
                onClick={handleIncrement}
                disabled={value >= max}
            >
                <Plus size={10} />
            </button>
        </div>
    );
});

/**
 * SmartTooltip - Rich tooltip showing view details (portal rendered)
 */
const SmartTooltip = memo(function SmartTooltip({ cell, position, visible }) {
    if (!visible || !cell) return null;

    const color = cell.instanceColor || cell.color || '#60a5fa';
    const colorValue = typeof color === 'number'
        ? ['#60a5fa', '#34d399', '#7dd3fc', '#fb7185', '#c084fc', '#fbbf24'][color % 6]
        : color;

    return ReactDOM.createPortal(
        <div
            className="canvas-navigator__tooltip"
            style={{
                position: 'fixed',
                left: position.x + 12,
                top: position.y - 8,
                '--tooltip-color': colorValue,
                borderColor: colorValue,
            }}
        >
            <div className="canvas-navigator__tooltip-header">
                <div
                    className="canvas-navigator__tooltip-swatch"
                    style={{ background: colorValue }}
                />
                <span className="canvas-navigator__tooltip-name">
                    {cell.name || cell.viewName || cell.title || 'Untitled View'}
                </span>
            </div>
            {(cell.datasetName || cell.dataset) && (
                <div className="canvas-navigator__tooltip-row">
                    Dataset: <span>{cell.datasetName || cell.dataset}</span>
                </div>
            )}
            <div className="canvas-navigator__tooltip-row">
                Position: <span className="mono">({cell.row}, {cell.col})</span>
                {(cell.colSpan > 1 || cell.rowSpan > 1) && (
                    <span style={{ marginLeft: 8 }}>
                        Size: <span className="mono">{cell.rowSpan || 1}×{cell.colSpan || 1}</span>
                    </span>
                )}
            </div>
        </div>,
        document.body
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CanvasNavigator = memo(function CanvasNavigator({
    logic,
    isDocked,
    onClose,
    isCompact = false,
    isVeryCompact = false,
    className = '',
}) {
    const nav = useCanvasNavigator(logic);
    const {
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
        selectCell,
        clearSelection,
        selectAll,
        handleMerge,
        handleUnmerge,
        handleDelete,
        canMerge,
        canUnmerge,
        getCellAt,
        isInViewport,
        getCellDisplay,
        getCellColor,
        draggedCell,
        dragOverCell,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
    } = nav;

    // Determine dock position
    const dockPosition = isDocked !== undefined
        ? (isDocked ? DOCK_POSITIONS.LEFT_PANEL : DOCK_POSITIONS.FLOAT)
        : logicDockPosition;

    const isDockedInPanel = dockPosition === DOCK_POSITIONS.LEFT_PANEL;

    // Local UI state
    const [showDockPicker, setShowDockPicker] = useState(false);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [showControls, setShowControls] = useState(!isDockedInPanel);
    const containerRef = useRef(null);
    const minimapRef = useRef(null);

    // Auto-calculate cell size based on container width when docked
    const [containerWidth, setContainerWidth] = useState(300);

    useEffect(() => {
        if (!minimapRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        observer.observe(minimapRef.current);
        return () => observer.disconnect();
    }, []);

    // Calculate cell dimensions
    const cellDimensions = useMemo(() => {
        if (isDockedInPanel) {
            // Auto-size cells to fit container width
            const padding = 16; // padding on sides
            const gap = 2;
            const availableWidth = containerWidth - padding;
            const cellWidth = Math.max(16, Math.floor((availableWidth - (canvasSize.cols - 1) * gap) / canvasSize.cols));
            const cellHeight = Math.max(12, Math.floor(cellWidth * 0.75));
            return { width: cellWidth, height: cellHeight, gap };
        } else {
            // Fixed size based on zoom for floating mode
            return {
                width: 26 * minimapZoom,
                height: 20 * minimapZoom,
                gap: 2
            };
        }
    }, [isDockedInPanel, containerWidth, canvasSize.cols, minimapZoom]);

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
        navigateToCell(row, col);
    }, [mode, settingHomepoint, setHomepoint, selectCell, navigateToCell]);

    // Keyboard shortcuts
    useEffect(() => {
        if (mode !== NAV_MODES.EDIT) return;

        const handleKeyDown = (e) => {
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

    // ==========================================================================
    // RENDER - DOCKED (COMPACT) MODE
    // ==========================================================================

    if (isDockedInPanel) {
        return (
            <div
                ref={containerRef}
                className={`canvas-navigator canvas-navigator--docked ${className}`}
            >
                {/* Compact Header */}
                <div className="canvas-navigator__header canvas-navigator__header--compact">
                    <Grid3X3 size={12} className="canvas-navigator__icon" />
                    <span className="canvas-navigator__title">Canvas Navigator</span>

                    {/* Mode toggle */}
                    <div className="canvas-navigator__mode-tabs">
                        <NavBtn
                            size="xs"
                            active={mode === NAV_MODES.NAVIGATE}
                            onClick={() => setMode(NAV_MODES.NAVIGATE)}
                            title="Navigate"
                        >
                            <Navigation size={10} />
                        </NavBtn>
                        <NavBtn
                            size="xs"
                            active={mode === NAV_MODES.EDIT}
                            onClick={() => setMode(NAV_MODES.EDIT)}
                            title="Edit"
                        >
                            <Pencil size={10} />
                        </NavBtn>
                    </div>

                    {/* Display toggle */}
                    <div className="canvas-navigator__display-toggle">
                        <NavBtn size="xs" active={displayMode === DISPLAY_MODES.NAMES} onClick={() => setDisplayMode(DISPLAY_MODES.NAMES)} title="Names">
                            <Type size={9} />
                        </NavBtn>
                        <NavBtn size="xs" active={displayMode === DISPLAY_MODES.NUMBERS} onClick={() => setDisplayMode(DISPLAY_MODES.NUMBERS)} title="Numbers">
                            <Hash size={9} />
                        </NavBtn>
                        <NavBtn size="xs" active={displayMode === DISPLAY_MODES.COLORS} onClick={() => setDisplayMode(DISPLAY_MODES.COLORS)} title="Colors">
                            <Palette size={9} />
                        </NavBtn>
                    </div>

                    {/* Undock button */}
                    <NavBtn
                        size="xs"
                        onClick={() => setDockPosition(DOCK_POSITIONS.FLOAT)}
                        title="Undock"
                    >
                        <PinOff size={10} />
                    </NavBtn>
                </div>

                {/* Minimap - Full Width */}
                <div
                    ref={minimapRef}
                    className={`canvas-navigator__minimap canvas-navigator__minimap--full-width ${settingHomepoint ? 'canvas-navigator__minimap--setting-home' : ''}`}
                >
                    <div
                        className="canvas-navigator__grid"
                        style={{
                            gridTemplateColumns: `repeat(${canvasSize.cols}, ${cellDimensions.width}px)`,
                            gridTemplateRows: `repeat(${canvasSize.rows}, ${cellDimensions.height}px)`,
                            gap: cellDimensions.gap,
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
                                >
                                    {isHome && !cell && <Home size={8} className="canvas-navigator__home-icon" />}
                                    {cell && displayMode !== DISPLAY_MODES.COLORS && (
                                        <span className="canvas-navigator__cell-text">
                                            {getCellDisplay(cell, cellIndex)}
                                        </span>
                                    )}
                                    {isHome && cell && <div className="canvas-navigator__home-dot" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Viewport rectangle overlay */}
                    <div
                        className="canvas-navigator__viewport-rect"
                        style={{
                            left: viewport.col * (cellDimensions.width + cellDimensions.gap),
                            top: viewport.row * (cellDimensions.height + cellDimensions.gap),
                            width: viewportSize.cols * cellDimensions.width + (viewportSize.cols - 1) * cellDimensions.gap,
                            height: viewportSize.rows * cellDimensions.height + (viewportSize.rows - 1) * cellDimensions.gap,
                        }}
                    />
                </div>

                {/* Compact Controls Row */}
                <div className="canvas-navigator__compact-controls">
                    {/* Navigation D-pad with Home + Zoom */}
                    <div className="canvas-navigator__nav-group">
                        <div className="canvas-navigator__dpad-mini">
                            <NavBtn size="xs" onClick={() => moveViewport('up')} title="Up"><ChevronUp size={10} /></NavBtn>
                            <NavBtn size="xs" onClick={() => moveViewport('left')} title="Left"><ChevronLeft size={10} /></NavBtn>
                            <NavBtn size="xs" onClick={() => moveViewport('home')} active={isAtHome} title="Home"><Home size={10} /></NavBtn>
                            <NavBtn size="xs" onClick={() => moveViewport('right')} title="Right"><ChevronRight size={10} /></NavBtn>
                            <NavBtn size="xs" onClick={() => moveViewport('down')} title="Down"><ChevronDown size={10} /></NavBtn>
                        </div>
                        {/* Zoom controls - shares row with dpad */}
                        <div className="canvas-navigator__zoom-mini">
                            <NavBtn size="xs" onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))} title="Zoom Out"><ZoomOut size={10} /></NavBtn>
                            <span className="canvas-navigator__zoom-mini-value">{Math.round(minimapZoom * 100)}%</span>
                            <NavBtn size="xs" onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))} title="Zoom In"><ZoomIn size={10} /></NavBtn>
                        </div>
                    </div>

                    {/* Position display */}
                    <div className="canvas-navigator__position-mini">
                        <span className="canvas-navigator__position-label">Pos</span>
                        <span className="canvas-navigator__position-value">{viewport.row},{viewport.col}</span>
                    </div>

                    {/* View size */}
                    <div className="canvas-navigator__viewsize-mini">
                        <span className="canvas-navigator__viewsize-label">View</span>
                        <NumberSpinner value={viewportSize.rows} onChange={setViewportSizeRows} min={1} max={10} compact />
                        <span>×</span>
                        <NumberSpinner value={viewportSize.cols} onChange={setViewportSizeCols} min={1} max={10} compact />
                    </div>

                    {/* Expand controls button */}
                    <NavBtn
                        size="xs"
                        onClick={() => setShowControls(!showControls)}
                        active={showControls}
                        title="More options"
                    >
                        <Settings2 size={10} />
                    </NavBtn>
                </div>

                {/* Expandable controls section */}
                {showControls && (
                    <div className="canvas-navigator__expanded-controls">
                        {/* Homepoint */}
                        <div className="canvas-navigator__control-row">
                            <span className="canvas-navigator__control-label" style={{ color: '#f472b6' }}>Home</span>
                            <NavBtn
                                size="xs"
                                active={settingHomepoint}
                                onClick={() => setSettingHomepoint(!settingHomepoint)}
                                title="Set homepoint"
                            >
                                <Crosshair size={10} />
                            </NavBtn>
                            {homepoint && (
                                <>
                                    <span className="canvas-navigator__home-coords">{homepoint.row},{homepoint.col}</span>
                                    <NavBtn size="xs" onClick={clearHomepoint} title="Clear home">
                                        <Trash2 size={10} />
                                    </NavBtn>
                                </>
                            )}
                        </div>

                        {/* Canvas size */}
                        <div className="canvas-navigator__control-row">
                            <span className="canvas-navigator__control-label" style={{ color: '#c084fc' }}>Canvas</span>
                            <NumberSpinner label="R" value={canvasSize.rows} onChange={setCanvasRows} min={1} max={50} compact />
                            <span>×</span>
                            <NumberSpinner label="C" value={canvasSize.cols} onChange={setCanvasCols} min={1} max={50} compact />
                            <span className="canvas-navigator__view-count">{cells.length} views</span>
                        </div>

                        {/* Edit mode tools */}
                        {mode === NAV_MODES.EDIT && (
                            <div className="canvas-navigator__control-row">
                                <span className="canvas-navigator__control-label" style={{ color: '#c084fc' }}>Edit</span>
                                <NavBtn size="xs" onClick={handleMerge} disabled={!canMerge} title="Merge"><Merge size={10} /></NavBtn>
                                <NavBtn size="xs" onClick={handleUnmerge} disabled={!canUnmerge} title="Unmerge"><Split size={10} /></NavBtn>
                                <NavBtn size="xs" onClick={handleDelete} disabled={selectedCells.length === 0} title="Delete"><Trash2 size={10} /></NavBtn>
                                <span className="canvas-navigator__selection-count">{selectedCells.length} selected</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Tooltip */}
                <SmartTooltip cell={hoveredCell} position={tooltipPos} visible={!!hoveredCell} />
            </div>
        );
    }

    // ==========================================================================
    // RENDER - FLOATING (FULL) MODE
    // ==========================================================================

    const CELL_W = cellDimensions.width;
    const CELL_H = cellDimensions.height;
    const GAP = cellDimensions.gap;

    return (
        <div
            ref={containerRef}
            className={`canvas-navigator canvas-navigator--floating ${isCompact ? 'canvas-navigator--compact' : ''} ${isVeryCompact ? 'canvas-navigator--very-compact' : ''} ${className}`}
        >
            {/* Header */}
            <div className="canvas-navigator__header">
                <GripVertical size={14} className="canvas-navigator__drag-handle" />
                <Grid3X3 size={14} className="canvas-navigator__icon" />
                <span className="canvas-navigator__title">Canvas Navigator</span>

                {/* Mode tabs */}
                <div className="canvas-navigator__mode-tabs">
                    <NavBtn
                        size="sm"
                        active={mode === NAV_MODES.NAVIGATE}
                        onClick={() => setMode(NAV_MODES.NAVIGATE)}
                        title="Navigate mode"
                        color="var(--color-accent-blue)"
                    >
                        <Navigation size={12} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        active={mode === NAV_MODES.EDIT}
                        onClick={() => setMode(NAV_MODES.EDIT)}
                        title="Edit mode"
                        color="var(--color-accent-purple)"
                    >
                        <Pencil size={12} />
                    </NavBtn>
                </div>

                {/* Display mode toggle */}
                <div className="canvas-navigator__display-toggle">
                    <NavBtn size="sm" active={displayMode === DISPLAY_MODES.NAMES} onClick={() => setDisplayMode(DISPLAY_MODES.NAMES)} title="Show names">
                        <Type size={10} />
                    </NavBtn>
                    <NavBtn size="sm" active={displayMode === DISPLAY_MODES.NUMBERS} onClick={() => setDisplayMode(DISPLAY_MODES.NUMBERS)} title="Show numbers">
                        <Hash size={10} />
                    </NavBtn>
                    <NavBtn size="sm" active={displayMode === DISPLAY_MODES.COLORS} onClick={() => setDisplayMode(DISPLAY_MODES.COLORS)} title="Colors only">
                        <Palette size={10} />
                    </NavBtn>
                </div>

                {/* Dock button */}
                <NavBtn
                    size="sm"
                    onClick={() => setDockPosition(DOCK_POSITIONS.LEFT_PANEL)}
                    title="Dock to panel"
                >
                    <Pin size={12} />
                </NavBtn>

                {/* Close button */}
                <NavBtn size="sm" onClick={onClose || (() => setDockPosition(DOCK_POSITIONS.MINIMIZED))} title="Close">
                    <X size={12} />
                </NavBtn>
            </div>

            {/* Edit Toolbar */}
            {mode === NAV_MODES.EDIT && (
                <div className="canvas-navigator__edit-toolbar">
                    <span className="canvas-navigator__edit-info">
                        {selectedCells.length} selected
                    </span>
                    <NavBtn size="sm" onClick={handleMerge} disabled={!canMerge} color="var(--color-accent-green)" title="Merge">
                        <Merge size={10} />
                    </NavBtn>
                    <NavBtn size="sm" onClick={handleUnmerge} disabled={!canUnmerge} color="var(--color-accent-amber)" title="Unmerge">
                        <Split size={10} />
                    </NavBtn>
                    <NavBtn size="sm" onClick={handleDelete} disabled={selectedCells.length === 0} color="var(--color-accent-red)" title="Delete">
                        <Trash2 size={10} />
                    </NavBtn>
                    <button className="canvas-navigator__edit-clear" onClick={clearSelection}>
                        Clear
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="canvas-navigator__body">
                {/* Minimap */}
                <div className={`canvas-navigator__minimap ${settingHomepoint ? 'canvas-navigator__minimap--setting-home' : ''}`}>
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
                                >
                                    {isHome && !cell && <Home size={Math.max(8, 10 * minimapZoom)} className="canvas-navigator__home-icon" />}
                                    {cell && displayMode !== DISPLAY_MODES.COLORS && getCellDisplay(cell, cellIndex)}
                                    {isHome && cell && <div className="canvas-navigator__home-dot" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Viewport rectangle */}
                    <div
                        className="canvas-navigator__viewport-rect"
                        style={{
                            left: viewport.col * (CELL_W + GAP),
                            top: viewport.row * (CELL_H + GAP),
                            width: viewportSize.cols * CELL_W + (viewportSize.cols - 1) * GAP,
                            height: viewportSize.rows * CELL_H + (viewportSize.rows - 1) * GAP,
                        }}
                    />
                </div>

                {/* Controls Panel */}
                <div className="canvas-navigator__controls">
                    {/* Position/Navigation - combined with Zoom when very compact */}
                    <div className="canvas-navigator__control-section">
                        <div className="canvas-navigator__section-label" style={{ color: '#fbbf24' }}>Position</div>
                        <div className="canvas-navigator__dpad">
                            <NavBtn size="sm" onClick={() => moveViewport('up')}><ChevronUp size={12} /></NavBtn>
                            <NavBtn size="sm" onClick={() => moveViewport('left')}><ChevronLeft size={12} /></NavBtn>
                            <NavBtn size="sm" onClick={() => moveViewport('home')} active={isAtHome}><Home size={12} /></NavBtn>
                            <NavBtn size="sm" onClick={() => moveViewport('right')}><ChevronRight size={12} /></NavBtn>
                            <NavBtn size="sm" onClick={() => moveViewport('down')}><ChevronDown size={12} /></NavBtn>
                        </div>
                        <div className="canvas-navigator__position-display">{viewport.row},{viewport.col}</div>
                        {/* Zoom controls inline when very compact */}
                        {isVeryCompact && (
                            <div className="canvas-navigator__zoom-controls canvas-navigator__zoom-controls--inline">
                                <NavBtn size="sm" onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))}><ZoomOut size={12} /></NavBtn>
                                <span className="canvas-navigator__zoom-value">{Math.round(minimapZoom * 100)}%</span>
                                <NavBtn size="sm" onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))}><ZoomIn size={12} /></NavBtn>
                            </div>
                        )}
                    </div>

                    {/* Homepoint - combined with View Size when very compact */}
                    <div className="canvas-navigator__control-section">
                        <div className="canvas-navigator__section-label" style={{ color: '#f472b6' }}>Home</div>
                        <div className="canvas-navigator__home-controls">
                            <NavBtn
                                size="sm"
                                active={settingHomepoint}
                                onClick={() => setSettingHomepoint(!settingHomepoint)}
                                title="Set homepoint"
                            >
                                <Crosshair size={12} />
                            </NavBtn>
                            <span className="canvas-navigator__home-value">
                                {homepoint ? `${homepoint.row},${homepoint.col}` : '—'}
                            </span>
                            {homepoint && (
                                <NavBtn size="sm" onClick={clearHomepoint} title="Clear"><Trash2 size={10} /></NavBtn>
                            )}
                        </div>
                        {/* View Size inline when very compact */}
                        {isVeryCompact && (
                            <div className="canvas-navigator__size-controls canvas-navigator__size-controls--inline">
                                <span className="canvas-navigator__size-label">View</span>
                                <NumberSpinner value={viewportSize.rows} onChange={setViewportSizeRows} min={1} max={10} color="#34d399" compact />
                                <span>×</span>
                                <NumberSpinner value={viewportSize.cols} onChange={setViewportSizeCols} min={1} max={10} color="#34d399" compact />
                            </div>
                        )}
                    </div>

                    {/* View Size - hidden when very compact (shown inline above) */}
                    {!isVeryCompact && (
                        <div className="canvas-navigator__control-section">
                            <div className="canvas-navigator__section-label" style={{ color: '#34d399' }}>View Size</div>
                            <div className="canvas-navigator__size-controls canvas-navigator__size-controls--stacked">
                                <div className="canvas-navigator__size-row">
                                    <span className="canvas-navigator__size-label">Rows</span>
                                    <NumberSpinner value={viewportSize.rows} onChange={setViewportSizeRows} min={1} max={10} color="#34d399" compact />
                                </div>
                                <div className="canvas-navigator__size-row">
                                    <span className="canvas-navigator__size-label">Cols</span>
                                    <NumberSpinner value={viewportSize.cols} onChange={setViewportSizeCols} min={1} max={10} color="#34d399" compact />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Zoom - hidden when very compact (shown inline above) */}
                    {!isVeryCompact && (
                        <div className="canvas-navigator__control-section">
                            <div className="canvas-navigator__section-label" style={{ color: '#60a5fa' }}>Zoom</div>
                            <div className="canvas-navigator__zoom-controls">
                                <NavBtn size="sm" onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))}><ZoomOut size={12} /></NavBtn>
                                <span className="canvas-navigator__zoom-value">{Math.round(minimapZoom * 100)}%</span>
                                <NavBtn size="sm" onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))}><ZoomIn size={12} /></NavBtn>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="canvas-navigator__footer">
                <span className="canvas-navigator__footer-label" style={{ color: '#c084fc' }}>Canvas</span>
                <NumberSpinner label="Rows" value={canvasSize.rows} onChange={setCanvasRows} min={1} max={50} color="#c084fc" />
                <span className="canvas-navigator__size-x">×</span>
                <NumberSpinner label="Cols" value={canvasSize.cols} onChange={setCanvasCols} min={1} max={50} color="#c084fc" />
                <div className="canvas-navigator__footer-spacer" />
                <span className="canvas-navigator__view-count">{cells.length} views</span>
            </div>

            {/* Tooltip */}
            <SmartTooltip cell={hoveredCell} position={tooltipPos} visible={!!hoveredCell} />
        </div>
    );
});

export default CanvasNavigator;