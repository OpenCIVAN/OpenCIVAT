/**
 * CanvasNavigator Component
 *
 * Minimap and navigation controls for the infinite canvas.
 * Can be docked (in panel) or floating (overlay on canvas).
 *
 * When DOCKED:
 * - No tools bar (tools in Canvas subtab)
 * - Navigator header with dock/undock toggle
 *
 * When FLOATING:
 * - Shows tools bar (Select, Pan, Merge, Edit, Drop Mode, Undo/Redo)
 * - Self-contained navigation
 */

import React, { memo, useMemo } from 'react';
import {
    Map,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Crosshair,
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
        handleMinimapClick,
        getCellAt,
        isInViewport,
        setZoom,
        canUndo,
        canRedo,
        undo,
        redo,
    } = nav;

    // Generate minimap grid
    const minimapCells = useMemo(() => {
        const result = [];
        for (let row = 0; row < canvasSize.rows; row++) {
            for (let col = 0; col < canvasSize.cols; col++) {
                const cell = getCellAt(row, col);
                const inVP = isInViewport(row, col);

                // Skip non-origin cells of spanning placements
                if (cell && (cell.row !== row || cell.col !== col)) continue;

                result.push({
                    row,
                    col,
                    cell,
                    inVP,
                    key: `${row}-${col}`,
                });
            }
        }
        return result;
    }, [canvasSize, getCellAt, isInViewport]);

    return (
        <div
            className={`canvas-navigator ${isDocked ? 'canvas-navigator--docked' : 'canvas-navigator--floating'} ${className}`}
        >
            {/* Header */}
            <div className="canvas-navigator__header">
                <Map size={12} className="canvas-navigator__header-icon" />
                <span className="canvas-navigator__header-title">Canvas Navigator</span>
                <div className="canvas-navigator__header-actions">
                    <button
                        className="canvas-navigator__header-btn"
                        onClick={toggleNavigatorDocked}
                        title={isDocked ? 'Undock navigator' : 'Dock navigator'}
                    >
                        {isDocked ? <PanelBottomClose size={11} /> : <PanelBottom size={11} />}
                    </button>
                    <button
                        className="canvas-navigator__header-btn"
                        onClick={onPopOut}
                        title="Pop out to new window"
                    >
                        <ExternalLink size={11} />
                    </button>
                </div>
            </div>

            {/* Tools Bar - Only when floating */}
            {!isDocked && (
                <div className="canvas-navigator__tools">
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--blue ${tool === TOOLS.SELECT ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={() => setTool(TOOLS.SELECT)}
                        title="Select tool"
                    >
                        <MousePointer2 size={14} />
                    </button>
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--teal ${tool === TOOLS.PAN ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={() => setTool(TOOLS.PAN)}
                        title="Pan tool"
                    >
                        <Hand size={14} />
                    </button>
                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--purple ${tool === TOOLS.MERGE ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={() => setTool(TOOLS.MERGE)}
                        title="Merge tool"
                    >
                        <Combine size={14} />
                    </button>

                    <div className="canvas-navigator__divider" />

                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--amber ${editMode ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={toggleEditMode}
                        title="Toggle edit mode"
                    >
                        <Pencil size={14} />
                    </button>

                    {editMode && (
                        <div className="canvas-navigator__drop-mode">
                            <button
                                className={`canvas-navigator__drop-btn ${dropMode === DROP_MODES.ADD ? 'canvas-navigator__drop-btn--active' : ''}`}
                                onClick={() => setDropMode(DROP_MODES.ADD)}
                                data-color="green"
                            >
                                <PlusCircle size={12} />
                                <span>Add</span>
                            </button>
                            <button
                                className={`canvas-navigator__drop-btn ${dropMode === DROP_MODES.REPLACE ? 'canvas-navigator__drop-btn--active' : ''}`}
                                onClick={() => setDropMode(DROP_MODES.REPLACE)}
                                data-color="amber"
                            >
                                <Replace size={12} />
                                <span>Replace</span>
                            </button>
                        </div>
                    )}

                    <div className="canvas-navigator__spacer" />

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
                        {minimapCells.map(({ row, col, cell, inVP, key }) => {
                            const colorIndex = cell?.color ?? 0;
                            const color = INSTANCE_COLORS[colorIndex % INSTANCE_COLORS.length];

                            return (
                                <div
                                    key={key}
                                    className={`canvas-navigator__cell ${cell ? 'canvas-navigator__cell--filled' : 'canvas-navigator__cell--empty'}`}
                                    style={{
                                        gridRow: cell
                                            ? `${cell.row + 1} / span ${cell.rowSpan || 1}`
                                            : 'auto',
                                        gridColumn: cell
                                            ? `${cell.col + 1} / span ${cell.colSpan || 1}`
                                            : 'auto',
                                        '--cell-color': cell ? color : undefined,
                                        opacity: inVP ? 1 : 0.6,
                                    }}
                                    onClick={() => handleMinimapClick(row, col)}
                                    title={cell?.name || 'Empty'}
                                >
                                    {cell && (
                                        <span className="canvas-navigator__cell-label">
                                            {cell.name?.substring(0, 5)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Viewport indicator */}
                    <div
                        className="canvas-navigator__viewport-indicator"
                        style={{
                            top: `${viewport.row * (CELL_H + GAP)}px`,
                            left: `${viewport.col * (CELL_W + GAP)}px`,
                            width: `${viewport.cols * (CELL_W + GAP) - GAP}px`,
                            height: `${viewport.rows * (CELL_H + GAP) - GAP}px`,
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="canvas-navigator__controls">
                    {/* D-pad */}
                    <div className="canvas-navigator__dpad">
                        <div />
                        <button
                            className="canvas-navigator__nav-btn"
                            onClick={() => moveViewport('up')}
                            title="Pan up"
                        >
                            <ChevronUp size={10} />
                        </button>
                        <div />
                        <button
                            className="canvas-navigator__nav-btn"
                            onClick={() => moveViewport('left')}
                            title="Pan left"
                        >
                            <ChevronLeft size={10} />
                        </button>
                        <button
                            className={`canvas-navigator__nav-btn canvas-navigator__nav-btn--center ${isAtHome ? 'canvas-navigator__nav-btn--active' : ''}`}
                            onClick={() => moveViewport('reset')}
                            title="Go to homepoint"
                        >
                            <Crosshair size={10} />
                        </button>
                        <button
                            className="canvas-navigator__nav-btn"
                            onClick={() => moveViewport('right')}
                            title="Pan right"
                        >
                            <ChevronRight size={10} />
                        </button>
                        <div />
                        <button
                            className="canvas-navigator__nav-btn"
                            onClick={() => moveViewport('down')}
                            title="Pan down"
                        >
                            <ChevronDown size={10} />
                        </button>
                        <div />
                    </div>

                    {/* Position display */}
                    <div className="canvas-navigator__position">
                        {viewport.col},{viewport.row}
                    </div>

                    {/* Zoom controls */}
                    <div className="canvas-navigator__zoom">
                        <button
                            className="canvas-navigator__nav-btn"
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                            title="Zoom out"
                        >
                            <ZoomOut size={9} />
                        </button>
                        <span className="canvas-navigator__zoom-level">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            className="canvas-navigator__nav-btn"
                            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                            title="Zoom in"
                        >
                            <ZoomIn size={10} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Size Controls */}
            <div className="canvas-navigator__size-controls">
                <span className="canvas-navigator__size-label">Size</span>

                <div className="canvas-navigator__size-group">
                    <span className="canvas-navigator__size-dim">Cols</span>
                    <button
                        className="canvas-navigator__size-btn"
                        {...decrementColsHold}
                        title="Decrease columns"
                    >
                        <Minus size={10} />
                    </button>
                    <input
                        type="number"
                        className="canvas-navigator__size-input"
                        min="1"
                        value={canvasSize.cols}
                        onChange={(e) => setCanvasCols(parseInt(e.target.value) || 1)}
                    />
                    <button
                        className="canvas-navigator__size-btn"
                        {...incrementColsHold}
                        title="Increase columns"
                    >
                        <Plus size={10} />
                    </button>
                </div>

                <span className="canvas-navigator__size-separator">×</span>

                <div className="canvas-navigator__size-group">
                    <span className="canvas-navigator__size-dim">Rows</span>
                    <button
                        className="canvas-navigator__size-btn"
                        {...decrementRowsHold}
                        title="Decrease rows"
                    >
                        <Minus size={10} />
                    </button>
                    <input
                        type="number"
                        className="canvas-navigator__size-input"
                        min="1"
                        value={canvasSize.rows}
                        onChange={(e) => setCanvasRows(parseInt(e.target.value) || 1)}
                    />
                    <button
                        className="canvas-navigator__size-btn"
                        {...incrementRowsHold}
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