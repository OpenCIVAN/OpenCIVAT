// src/ui/react/components/workspace/ViewportNavigator.jsx
// Navigation controls for the canvas viewport
//
// Provides buttons for:
// - Directional navigation (up/down/left/right)
// - Viewport size adjustment
// - Jump to specific position
// - Canvas dimension controls

import React, { useCallback, useState } from 'react';
import { useCanvas } from '@UI/react/hooks/useCanvas.js';
import './ViewportNavigator.scss';

/**
 * ViewportNavigator - Controls for viewport navigation
 */
export function ViewportNavigator({ canvasId, compact = false }) {
    const {
        canvas,
        viewport,
        moveViewport,
        setViewportPosition,
        setViewportSize,
        addRow,
        addColumn,
    } = useCanvas(canvasId);

    const [showJumpDialog, setShowJumpDialog] = useState(false);
    const [jumpRow, setJumpRow] = useState(0);
    const [jumpCol, setJumpCol] = useState(0);

    const canvasRows = canvas?.dimensions?.rows || 3;
    const canvasCols = canvas?.dimensions?.cols || 3;

    // Navigation bounds
    const canMoveUp = viewport.row > 0;
    const canMoveDown = viewport.row + viewport.rows < canvasRows;
    const canMoveLeft = viewport.col > 0;
    const canMoveRight = viewport.col + viewport.cols < canvasCols;

    // Handle jump to position
    const handleJump = useCallback(() => {
        setViewportPosition(jumpRow, jumpCol);
        setShowJumpDialog(false);
    }, [jumpRow, jumpCol, setViewportPosition]);

    // Viewport size options
    const sizeOptions = [
        { rows: 2, cols: 2, label: '2×2' },
        { rows: 2, cols: 3, label: '2×3' },
        { rows: 3, cols: 3, label: '3×3' },
        { rows: 3, cols: 4, label: '3×4' },
    ];

    if (compact) {
        return (
            <div className="viewport-navigator viewport-navigator--compact">
                <div className="viewport-navigator__arrows">
                    <button
                        className="viewport-navigator__btn viewport-navigator__btn--up"
                        onClick={() => moveViewport(-1, 0)}
                        disabled={!canMoveUp}
                        aria-label="Move up"
                    >
                        ↑
                    </button>
                    <div className="viewport-navigator__arrows-row">
                        <button
                            className="viewport-navigator__btn viewport-navigator__btn--left"
                            onClick={() => moveViewport(0, -1)}
                            disabled={!canMoveLeft}
                            aria-label="Move left"
                        >
                            ←
                        </button>
                        <span className="viewport-navigator__position">
                            {viewport.row},{viewport.col}
                        </span>
                        <button
                            className="viewport-navigator__btn viewport-navigator__btn--right"
                            onClick={() => moveViewport(0, 1)}
                            disabled={!canMoveRight}
                            aria-label="Move right"
                        >
                            →
                        </button>
                    </div>
                    <button
                        className="viewport-navigator__btn viewport-navigator__btn--down"
                        onClick={() => moveViewport(1, 0)}
                        disabled={!canMoveDown}
                        aria-label="Move down"
                    >
                        ↓
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="viewport-navigator">
            {/* Navigation section */}
            <div className="viewport-navigator__section">
                <h4 className="viewport-navigator__title">Navigate</h4>

                <div className="viewport-navigator__arrows">
                    <button
                        className="viewport-navigator__btn viewport-navigator__btn--up"
                        onClick={() => moveViewport(-1, 0)}
                        disabled={!canMoveUp}
                        aria-label="Move viewport up"
                    >
                        ↑
                    </button>
                    <div className="viewport-navigator__arrows-row">
                        <button
                            className="viewport-navigator__btn viewport-navigator__btn--left"
                            onClick={() => moveViewport(0, -1)}
                            disabled={!canMoveLeft}
                            aria-label="Move viewport left"
                        >
                            ←
                        </button>
                        <button
                            className="viewport-navigator__btn viewport-navigator__btn--center"
                            onClick={() => setShowJumpDialog(true)}
                            aria-label="Jump to position"
                            title="Jump to position"
                        >
                            ⊕
                        </button>
                        <button
                            className="viewport-navigator__btn viewport-navigator__btn--right"
                            onClick={() => moveViewport(0, 1)}
                            disabled={!canMoveRight}
                            aria-label="Move viewport right"
                        >
                            →
                        </button>
                    </div>
                    <button
                        className="viewport-navigator__btn viewport-navigator__btn--down"
                        onClick={() => moveViewport(1, 0)}
                        disabled={!canMoveDown}
                        aria-label="Move viewport down"
                    >
                        ↓
                    </button>
                </div>

                <div className="viewport-navigator__info">
                    Position: ({viewport.row}, {viewport.col})
                </div>
            </div>

            {/* Viewport size section */}
            <div className="viewport-navigator__section">
                <h4 className="viewport-navigator__title">Viewport Size</h4>
                <div className="viewport-navigator__sizes">
                    {sizeOptions.map((opt) => (
                        <button
                            key={opt.label}
                            className={`viewport-navigator__size-btn ${viewport.rows === opt.rows && viewport.cols === opt.cols
                                    ? 'viewport-navigator__size-btn--active'
                                    : ''
                                }`}
                            onClick={() => setViewportSize(opt.rows, opt.cols)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Canvas size section */}
            <div className="viewport-navigator__section">
                <h4 className="viewport-navigator__title">Canvas Size</h4>
                <div className="viewport-navigator__canvas-info">
                    {canvasRows} rows × {canvasCols} columns
                </div>
                <div className="viewport-navigator__canvas-actions">
                    <button
                        className="viewport-navigator__btn viewport-navigator__btn--add"
                        onClick={addRow}
                        aria-label="Add row"
                    >
                        + Row
                    </button>
                    <button
                        className="viewport-navigator__btn viewport-navigator__btn--add"
                        onClick={addColumn}
                        aria-label="Add column"
                    >
                        + Column
                    </button>
                </div>
            </div>

            {/* Jump dialog */}
            {showJumpDialog && (
                <div className="viewport-navigator__dialog-overlay">
                    <div className="viewport-navigator__dialog">
                        <h4>Jump to Position</h4>
                        <div className="viewport-navigator__dialog-inputs">
                            <label>
                                Row:
                                <input
                                    type="number"
                                    min={0}
                                    max={canvasRows - viewport.rows}
                                    value={jumpRow}
                                    onChange={(e) => setJumpRow(parseInt(e.target.value) || 0)}
                                />
                            </label>
                            <label>
                                Column:
                                <input
                                    type="number"
                                    min={0}
                                    max={canvasCols - viewport.cols}
                                    value={jumpCol}
                                    onChange={(e) => setJumpCol(parseInt(e.target.value) || 0)}
                                />
                            </label>
                        </div>
                        <div className="viewport-navigator__dialog-actions">
                            <button onClick={() => setShowJumpDialog(false)}>Cancel</button>
                            <button onClick={handleJump}>Jump</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViewportNavigator;