// src/ui/react/components/workspace/CanvasGrid.jsx
// Main canvas grid component - renders visible placements
//
// ARCHITECTURE:
// - Only renders placements within the viewport (GPU optimization)
// - Supports spanning (1-3 rows/cols per placement)
// - Handles keyboard navigation
// - Integrates with selection mode for subset creation

import React, { useCallback, useEffect, useRef } from 'react';
import { CanvasCell } from './CanvasCell.jsx';
import { useCanvas, useSubsets } from '@UI/react/hooks/useCanvas.js';
import './CanvasGrid.scss';

/**
 * CanvasGrid - The main workspace grid
 *
 * Renders a viewport-sized grid with placements positioned according
 * to their row/col coordinates. Only placements visible in the viewport
 * are rendered.
 */
export function CanvasGrid({ canvasId, onCellClick, onCellDoubleClick }) {
  const gridRef = useRef(null);

  const {
    canvas,
    loading,
    error,
    viewport,
    visiblePlacements,
    moveViewport,
  } = useCanvas(canvasId);

  const {
    selectionMode,
    selectedIds,
    toggleSelection,
    inFocusMode,
    activeSubset,
  } = useSubsets(canvasId);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if grid is focused or no input is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveViewport(-1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveViewport(1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveViewport(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveViewport(0, 1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveViewport]);

  // Handle cell click
  const handleCellClick = useCallback(
    (placement, row, col) => {
      if (selectionMode && placement) {
        toggleSelection(placement.id);
      } else if (onCellClick) {
        onCellClick(placement, row, col);
      }
    },
    [selectionMode, toggleSelection, onCellClick]
  );

  // Handle cell double click
  const handleCellDoubleClick = useCallback(
    (placement, row, col) => {
      if (onCellDoubleClick) {
        onCellDoubleClick(placement, row, col);
      }
    },
    [onCellDoubleClick]
  );

  // Build grid cells
  const renderCells = () => {
    const cells = [];
    const placementMap = new Map();

    // Map placements to their positions
    visiblePlacements.forEach((placement) => {
      const key = `${placement.row}-${placement.col}`;
      placementMap.set(key, placement);
    });

    // Track which cells are covered by spanning placements
    const coveredCells = new Set();
    visiblePlacements.forEach((placement) => {
      for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
        for (let c = placement.col; c < placement.col + placement.colSpan; c++) {
          if (r !== placement.row || c !== placement.col) {
            coveredCells.add(`${r}-${c}`);
          }
        }
      }
    });

    // Generate cells for the viewport
    for (let row = viewport.row; row < viewport.row + viewport.rows; row++) {
      for (let col = viewport.col; col < viewport.col + viewport.cols; col++) {
        const key = `${row}-${col}`;

        // Skip cells covered by spanning placements
        if (coveredCells.has(key)) {
          continue;
        }

        const placement = placementMap.get(key);
        const isSelected = placement && selectedIds.includes(placement.id);

        // Calculate grid position (relative to viewport)
        const gridRow = row - viewport.row + 1;
        const gridCol = col - viewport.col + 1;

        cells.push(
          <CanvasCell
            key={key}
            placement={placement}
            row={row}
            col={col}
            gridRow={gridRow}
            gridCol={gridCol}
            rowSpan={placement?.rowSpan || 1}
            colSpan={placement?.colSpan || 1}
            isSelected={isSelected}
            selectionMode={selectionMode}
            onClick={() => handleCellClick(placement, row, col)}
            onDoubleClick={() => handleCellDoubleClick(placement, row, col)}
          />
        );
      }
    }

    return cells;
  };

  // Loading state
  if (loading) {
    return (
      <div className="canvas-grid canvas-grid--loading">
        <div className="canvas-grid__loader">Loading canvas...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="canvas-grid canvas-grid--error">
        <div className="canvas-grid__error">
          <p>Failed to load canvas</p>
          <small>{error.message}</small>
        </div>
      </div>
    );
  }

  // No canvas state
  if (!canvas) {
    return (
      <div className="canvas-grid canvas-grid--empty">
        <div className="canvas-grid__empty">
          <p>No canvas selected</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={`canvas-grid ${selectionMode ? 'canvas-grid--selection-mode' : ''} ${
        inFocusMode ? 'canvas-grid--focus-mode' : ''
      }`}
      tabIndex={0}
      role="grid"
      aria-label="Workspace canvas"
    >
      {/* Focus mode indicator */}
      {inFocusMode && activeSubset && (
        <div className="canvas-grid__focus-banner">
          <span>Focus: {activeSubset.name}</span>
        </div>
      )}

      {/* Selection mode indicator */}
      {selectionMode && (
        <div className="canvas-grid__selection-banner">
          <span>Selection Mode - Click views to select</span>
          <span className="canvas-grid__selection-count">
            {selectedIds.length} selected
          </span>
        </div>
      )}

      {/* Grid container */}
      <div
        className="canvas-grid__cells"
        style={{
          gridTemplateRows: `repeat(${viewport.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${viewport.cols}, 1fr)`,
        }}
      >
        {renderCells()}
      </div>

      {/* Viewport info */}
      <div className="canvas-grid__viewport-info">
        <span>
          Viewport: ({viewport.row}, {viewport.col}) - {viewport.rows}×{viewport.cols}
        </span>
        <span>
          Canvas: {canvas.dimensions.rows}×{canvas.dimensions.cols}
        </span>
      </div>
    </div>
  );
}

export default CanvasGrid;
