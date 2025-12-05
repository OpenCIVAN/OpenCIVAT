/**
 * CanvasNavigator Component
 *
 * Minimap and navigation controls for the infinite canvas.
 * Can be docked (in panel) or floating (overlay on canvas).
 *
 * Features:
 * - Minimap with cell visualization
 * - Click-to-navigate
 * - Viewport dragging
 * - DROP TARGETS for view repositioning from ViewsSubtab
 *
 * When DOCKED: No tools bar (tools in Canvas subtab)
 * When FLOATING: Shows tools bar
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
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
        // Drop handling
        dropTargetCell,
        isValidDrop,
        handleCellDragOver,
        handleCellDragLeave,
        handleCellDrop,
    } = nav;

    // Generate minimap grid with drop target info
    const minimapCells = useMemo(() => {
        const result = [];
        for (let row = 0; row < canvasSize.rows; row++) {
            for (let col = 0; col < canvasSize.cols; col++) {
                const cell = getCellAt(row, col);
                const inVP = isInViewport(row, col);

                // Skip non-origin cells of spanning placements
                if (cell && (cell.row !== row || cell.col !== col)) continue;

                // Check if this is the current drop target
                const isDropTarget =
                    dropTargetCell?.row === row && dropTargetCell?.col === col;

                result.push({
                    row,
                    col,
                    cell,
                    inVP,
                    isDropTarget,
                    key: `${row}-${col}`,
                });
            }
        }
        return result;
    }, [canvasSize, getCellAt, isInViewport, dropTargetCell]);

    // Cell drag handlers - wrapped for row/col context
    const makeDragOverHandler = useCallback(
        (row, col) => (e) => handleCellDragOver(e, row, col),
        [handleCellDragOver]
    );

    const makeDropHandler = useCallback(
        (row, col) => (e) => handleCellDrop(e, row, col),
        [handleCellDrop]
    );

    return (
        <div
            className={`canvas-navigator ${isDocked ? 'canvas-navigator--docked' : 'canvas-navigator--floating'} ${className}`}
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

                    <div className="canvas-navigator__divider" />

                    <button
                        className={`canvas-navigator__tool-btn canvas-navigator__tool-btn--amber ${editMode ? 'canvas-navigator__tool-btn--active' : ''}`}
                        onClick={toggleEditMode}
                        title="Edit mode"
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
                        {minimapCells.map(({ row, col, cell, inVP, isDropTarget, key }) => {
                            const colorIndex = cell?.color ?? 0;
                            const color = INSTANCE_COLORS[colorIndex % INSTANCE_COLORS.length];
                            const isEmpty = !cell;

                            return (
                                <div
                                    key={key}
                                    className={`canvas-navigator__cell
                                        ${cell ? 'canvas-navigator__cell--filled' : 'canvas-navigator__cell--empty'}
                                        ${isDropTarget ? 'canvas-navigator__cell--drop-target' : ''}
                                        ${isDropTarget && !isValidDrop ? 'canvas-navigator__cell--drop-invalid' : ''}
                                    `}
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
                                    onDragOver={makeDragOverHandler(row, col)}
                                    onDragLeave={handleCellDragLeave}
                                    onDrop={makeDropHandler(row, col)}
                                    title={cell?.name || 'Empty cell - drop view here'}
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
                            className={`canvas-navigator__nav-btn canvas-navigator__nav-btn--center ${isAtHome ? 'canvas-navigator__nav-btn--home' : ''}`}
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
                            className="canvas-navigator__zoom-btn"
                            onClick={() => setZoom(zoom - 0.25)}
                            disabled={zoom <= 0.5}
                            title="Zoom out"
                        >
                            <ZoomOut size={12} />
                        </button>
                        <span className="canvas-navigator__zoom-label">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            className="canvas-navigator__zoom-btn"
                            onClick={() => setZoom(zoom + 0.25)}
                            disabled={zoom >= 2}
                            title="Zoom in"
                        >
                            <ZoomIn size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer with size controls */}
            <div className="canvas-navigator__footer">
                <span className="canvas-navigator__footer-label">Size</span>
                <div className="canvas-navigator__size-group">
                    <span className="canvas-navigator__size-label">Cols</span>
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={decrementColsHold.start}
                        onMouseUp={decrementColsHold.stop}
                        onMouseLeave={decrementColsHold.stop}
                        title="Remove column"
                    >
                        <Minus size={10} />
                    </button>
                    <input
                        type="number"
                        className="canvas-navigator__size-input"
                        value={canvasSize.cols}
                        onChange={(e) => setCanvasCols(parseInt(e.target.value) || 1)}
                        min={1}
                    />
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={incrementColsHold.start}
                        onMouseUp={incrementColsHold.stop}
                        onMouseLeave={incrementColsHold.stop}
                        title="Add column"
                    >
                        <Plus size={10} />
                    </button>
                </div>
                <span className="canvas-navigator__size-x">×</span>
                <div className="canvas-navigator__size-group">
                    <span className="canvas-navigator__size-label">Rows</span>
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={decrementRowsHold.start}
                        onMouseUp={decrementRowsHold.stop}
                        onMouseLeave={decrementRowsHold.stop}
                        title="Remove row"
                    >
                        <Minus size={10} />
                    </button>
                    <input
                        type="number"
                        className="canvas-navigator__size-input"
                        value={canvasSize.rows}
                        onChange={(e) => setCanvasRows(parseInt(e.target.value) || 1)}
                        min={1}
                    />
                    <button
                        className="canvas-navigator__size-btn"
                        onMouseDown={incrementRowsHold.start}
                        onMouseUp={incrementRowsHold.stop}
                        onMouseLeave={incrementRowsHold.stop}
                        title="Add row"
                    >
                        <Plus size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default CanvasNavigator;