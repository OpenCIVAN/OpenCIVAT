/**
 * CanvasNavigator Component
 *
 * Minimap and navigation controls for the infinite canvas.
 * Can be docked (in panel) or floating (overlay on canvas).
 *
 * Features:
 * - Minimap with cell visualization & click-to-navigate
 * - D-pad navigation controls
 * - Viewport position display
 * - Zoom controls
 * - Canvas size controls (Cols × Rows)
 * - DROP TARGETS for view repositioning from ViewsSubtab
 *
 * When DOCKED: No tools bar (tools in Canvas subtab)
 * When FLOATING: Shows tools bar
 */

import React, { memo, useMemo, useCallback, useRef } from 'react';
import {
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Home,
    Plus,
    Minus,
    ZoomIn,
    ZoomOut,
    MousePointer2,
    Hand,
    Combine,
    Pencil,
    PlusCircle,
    Replace,
    Undo,
    Redo,
    PanelBottom,
    PanelBottomClose,
    ExternalLink,
    Crosshair,
} from 'lucide-react';
import { useCanvasNavigator } from './CanvasNavigator.logic';
import { TOOLS, DROP_MODES } from '../../LayoutPanel.logic';
import './CanvasNavigator.scss';

// Minimap cell dimensions
const CELL_W = 28;
const CELL_H = 20;
const GAP = 2;

// Instance colors for view color coding
const INSTANCE_COLORS = [
    '#60a5fa', // blue
    '#4ade80', // green
    '#f472b6', // pink
    '#fbbf24', // amber
    '#2dd4bf', // teal
    '#a78bfa', // purple
];

export const CanvasNavigator = memo(function CanvasNavigator({
    isDocked,
    logic,
    onPopOut,
    className = '',
}) {
    const nav = useCanvasNavigator(logic);
    const {
        canvasSize,
        viewport,
        cells,
        zoom,
        isAtHome,
        tool,
        setTool,
        editMode,
        toggleEditMode,
        dropMode,
        setDropMode,
        toggleNavigatorDocked,
        incrementColsHold,
        decrementColsHold,
        incrementRowsHold,
        decrementRowsHold,
        setCanvasCols,
        setCanvasRows,
        moveViewport,
        navigateToCell,
        getCellAt,
        isInViewport,
        getCellColor,
        setZoom,
        zoomIn,
        zoomOut,
        canUndo,
        canRedo,
        undo,
        redo,
        isDisabled,
        // Drop handling
        dropTargetCell,
        isValidDrop,
        handleCellDragOver,
        handleCellDragLeave,
        handleCellDrop,
    } = nav;

    // Refs for press-and-hold
    const holdIntervalRef = useRef(null);

    const startHold = useCallback((action) => {
        action();
        holdIntervalRef.current = setInterval(action, 150);
    }, []);

    const stopHold = useCallback(() => {
        if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
    }, []);

    // Generate minimap grid
    const minimapCells = useMemo(() => {
        const result = [];
        for (let row = 0; row < canvasSize.rows; row++) {
            for (let col = 0; col < canvasSize.cols; col++) {
                const cell = getCellAt(row, col);
                const inVP = isInViewport(row, col);

                // Skip non-origin cells of spanning placements
                if (cell && (cell.row !== row || cell.col !== col)) continue;

                const isDropTarget = dropTargetCell?.row === row && dropTargetCell?.col === col;
                const color = cell ? getCellColor(cell.colorIndex ?? 0) : null;

                result.push({
                    row,
                    col,
                    cell,
                    inVP,
                    isDropTarget,
                    color,
                    key: `${row}-${col}`,
                });
            }
        }
        return result;
    }, [canvasSize, getCellAt, isInViewport, getCellColor, dropTargetCell]);

    // Minimap click handler
    const handleMinimapCellClick = useCallback((row, col) => {
        navigateToCell?.(row, col);
    }, [navigateToCell]);

    return (
        <div
            className={`canvas-navigator ${isDocked ? 'canvas-navigator--docked' : 'canvas-navigator--floating'} ${isDisabled ? 'canvas-navigator--disabled' : ''} ${className}`}
        >
            {/* Header */}
            <div className="canvas-navigator__header">
                <span className="canvas-navigator__title">
                    {canvasSize.rows}×{canvasSize.cols} Canvas
                </span>
                <div className="canvas-navigator__header-actions">
                    {onPopOut && (
                        <button
                            className="canvas-navigator__header-btn"
                            onClick={onPopOut}
                            title="Pop out"
                        >
                            <ExternalLink size={12} />
                        </button>
                    )}
                    <button
                        className="canvas-navigator__header-btn"
                        onClick={toggleNavigatorDocked}
                        title={isDocked ? 'Undock navigator' : 'Dock navigator'}
                    >
                        {isDocked ? <PanelBottomClose size={12} /> : <PanelBottom size={12} />}
                    </button>
                </div>
            </div>

            {/* Tools Bar - only when floating */}
            {!isDocked && (
                <div className="canvas-navigator__tools">
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--blue ${tool === TOOLS.SELECT ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={() => setTool(TOOLS.SELECT)}
                        title="Select"
                    >
                        <MousePointer2 size={14} />
                    </button>
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--teal ${tool === TOOLS.PAN ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={() => setTool(TOOLS.PAN)}
                        title="Pan"
                    >
                        <Hand size={14} />
                    </button>
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--purple ${tool === TOOLS.MERGE ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={() => setTool(TOOLS.MERGE)}
                        title="Merge cells"
                    >
                        <Combine size={14} />
                    </button>
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--amber ${editMode ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={toggleEditMode}
                        title="Edit mode"
                    >
                        <Pencil size={14} />
                    </button>

                    <div className="canvas-navigator__divider" />

                    {/* Drop mode toggle */}
                    <div className="canvas-navigator__drop-mode">
                        <button
                            className={`canvas-navigator__drop-btn ${dropMode === DROP_MODES.ADD ? 'canvas-navigator__drop-btn--active' : ''}`}
                            data-color="green"
                            onClick={() => setDropMode(DROP_MODES.ADD)}
                            title="Add mode"
                        >
                            <PlusCircle size={12} />
                            Add
                        </button>
                        <button
                            className={`canvas-navigator__drop-btn ${dropMode === DROP_MODES.REPLACE ? 'canvas-navigator__drop-btn--active' : ''}`}
                            data-color="amber"
                            onClick={() => setDropMode(DROP_MODES.REPLACE)}
                            title="Replace mode"
                        >
                            <Replace size={12} />
                            Replace
                        </button>
                    </div>

                    <div className="canvas-navigator__spacer" />

                    {/* Undo/Redo */}
                    <button
                        className="canvas-navigator__tool-btn"
                        onClick={undo}
                        disabled={!canUndo}
                        title="Undo"
                    >
                        <Undo size={14} />
                    </button>
                    <button
                        className="canvas-navigator__tool-btn"
                        onClick={redo}
                        disabled={!canRedo}
                        title="Redo"
                    >
                        <Redo size={14} />
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="canvas-navigator__main">
                {/* Minimap */}
                <div className="canvas-navigator__minimap">
                    <div
                        className="canvas-navigator__grid"
                        style={{
                            gridTemplateColumns: `repeat(${canvasSize.cols}, ${CELL_W}px)`,
                            gridTemplateRows: `repeat(${canvasSize.rows}, ${CELL_H}px)`,
                            gap: `${GAP}px`,
                        }}
                    >
                        {minimapCells.map(({ row, col, cell, inVP, isDropTarget, color, key }) => (
                            <div
                                key={key}
                                className={`canvas-navigator__cell ${cell ? 'canvas-navigator__cell--filled' : 'canvas-navigator__cell--empty'} ${inVP ? 'canvas-navigator__cell--in-viewport' : ''} ${isDropTarget ? 'canvas-navigator__cell--drop-target' : ''} ${isDropTarget && !isValidDrop ? 'canvas-navigator__cell--drop-invalid' : ''}`}
                                style={{
                                    gridRow: cell ? `${cell.row + 1} / span ${cell.rowSpan || 1}` : 'auto',
                                    gridColumn: cell ? `${cell.col + 1} / span ${cell.colSpan || 1}` : 'auto',
                                    '--cell-color': color,
                                }}
                                onClick={() => handleMinimapCellClick(row, col)}
                                onDragOver={(e) => handleCellDragOver(e, row, col)}
                                onDragLeave={handleCellDragLeave}
                                onDrop={(e) => handleCellDrop(e, row, col)}
                                title={cell ? `View at ${row},${col}` : `Empty cell ${row},${col}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Controls Panel */}
                <div className="canvas-navigator__controls">
                    {/* D-Pad Navigation */}
                    <div className="canvas-navigator__dpad">
                        <div className="canvas-navigator__dpad-row">
                            <div /> {/* spacer */}
                            <button
                                className="canvas-navigator__nav-btn"
                                onClick={() => moveViewport('up')}
                                title="Move up"
                            >
                                <ChevronUp size={14} />
                            </button>
                            <div /> {/* spacer */}
                        </div>
                        <div className="canvas-navigator__dpad-row">
                            <button
                                className="canvas-navigator__nav-btn"
                                onClick={() => moveViewport('left')}
                                title="Move left"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                className={`canvas-navigator__nav-btn canvas-navigator__nav-btn--center ${isAtHome ? 'canvas-navigator__nav-btn--active' : ''}`}
                                onClick={() => moveViewport('home')}
                                title="Go to home (0,0)"
                            >
                                <Home size={12} />
                            </button>
                            <button
                                className="canvas-navigator__nav-btn"
                                onClick={() => moveViewport('right')}
                                title="Move right"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="canvas-navigator__dpad-row">
                            <div /> {/* spacer */}
                            <button
                                className="canvas-navigator__nav-btn"
                                onClick={() => moveViewport('down')}
                                title="Move down"
                            >
                                <ChevronDown size={14} />
                            </button>
                            <div /> {/* spacer */}
                        </div>
                    </div>

                    {/* Position Display */}
                    <div className="canvas-navigator__position">
                        <Crosshair size={10} />
                        <span>{viewport.row},{viewport.col}</span>
                    </div>

                    {/* Zoom Controls */}
                    <div className="canvas-navigator__zoom">
                        <button
                            className="canvas-navigator__zoom-btn"
                            onClick={zoomOut}
                            disabled={zoom <= 0.5}
                            title="Zoom out"
                        >
                            <ZoomOut size={12} />
                        </button>
                        <span className="canvas-navigator__zoom-value">{Math.round(zoom * 100)}%</span>
                        <button
                            className="canvas-navigator__zoom-btn"
                            onClick={zoomIn}
                            disabled={zoom >= 2}
                            title="Zoom in"
                        >
                            <ZoomIn size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Size Controls */}
            <div className="canvas-navigator__size-bar">
                <div className="canvas-navigator__size-group">
                    <span className="canvas-navigator__size-label">Cols</span>
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={() => startHold(decrementColsHold)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        disabled={canvasSize.cols <= 1}
                        title="Decrease columns"
                    >
                        <Minus size={10} />
                    </button>
                    <input
                        type="number"
                        className="canvas-navigator__size-input"
                        value={canvasSize.cols}
                        onChange={(e) => setCanvasCols(parseInt(e.target.value, 10) || 1)}
                        min={1}
                        max={20}
                    />
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={() => startHold(incrementColsHold)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        disabled={canvasSize.cols >= 20}
                        title="Increase columns"
                    >
                        <Plus size={10} />
                    </button>
                </div>

                <span className="canvas-navigator__size-separator">×</span>

                <div className="canvas-navigator__size-group">
                    <span className="canvas-navigator__size-label">Rows</span>
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={() => startHold(decrementRowsHold)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        disabled={canvasSize.rows <= 1}
                        title="Decrease rows"
                    >
                        <Minus size={10} />
                    </button>
                    <input
                        type="number"
                        className="canvas-navigator__size-input"
                        value={canvasSize.rows}
                        onChange={(e) => setCanvasRows(parseInt(e.target.value, 10) || 1)}
                        min={1}
                        max={20}
                    />
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={() => startHold(incrementRowsHold)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        disabled={canvasSize.rows >= 20}
                        title="Increase rows"
                    >
                        <Plus size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default CanvasNavigator;