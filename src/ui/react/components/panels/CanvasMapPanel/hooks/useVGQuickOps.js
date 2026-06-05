/**
 * @file useVGQuickOps.js
 * @description State machine for cell interactions during focused mode.
 *
 * Manages selection, drag-to-swap/move, right-click context menu,
 * targeting modes (swap/move/clone), and CompanionPanel assignment.
 *
 * Interaction mode priority (highest wins):
 *   DRAGGING_VIEW > CONTEXT_MENU > *_TARGETING > ASSIGNING_VIEW > MULTI_SELECTED > CELL_SELECTED > IDLE
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { viewAssignment } from '@UI/react/store/viewAssignmentStore';

/**
 * @param {Object} params
 * @param {Object|null} params.focusedVG - Currently focused ViewGroup
 * @param {Array} params.cells - Cell array from getInternalCells
 * @param {Function} params.onExitFocus - Callback to exit focus mode
 * @returns {Object} Quick ops state and actions
 */
export function useVGQuickOps({ focusedVG, cells = [], onExitFocus }) {
  const [selectedCells, setSelectedCells] = useState(() => new Set());

  // ── Interaction state atoms ─────────────────────────────────────────────
  const [dragState, setDragState] = useState(null);
  // { sourceCellIndex, sourceView, ghostX, ghostY }

  const [contextMenu, setContextMenu] = useState(null);
  // { cellIndex, position: {x,y}, cellView, cellIsMerged }

  const [targeting, setTargeting] = useState(null);
  // { action: 'swap'|'move'|'clone', sourceCellIndex, sourceView }

  const [assigningCellIndex, setAssigningCellIndex] = useState(null);

  // ── Computed interaction mode ───────────────────────────────────────────
  const interactionMode = useMemo(() => {
    if (dragState) return 'DRAGGING_VIEW';
    if (contextMenu) return 'CONTEXT_MENU';
    if (targeting) return `${targeting.action.toUpperCase()}_TARGETING`;
    if (assigningCellIndex !== null) return 'ASSIGNING_VIEW';
    if (selectedCells.size > 1) return 'MULTI_SELECTED';
    if (selectedCells.size === 1) return 'CELL_SELECTED';
    return 'IDLE';
  }, [dragState, contextMenu, targeting, assigningCellIndex, selectedCells.size]);

  // ── Selection actions ───────────────────────────────────────────────────
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
  }, []);

  const selectCell = useCallback((cellIndex, { shift = false } = {}) => {
    // Any selection action should exit assignment mode to avoid mixed intent.
    if (assigningCellIndex !== null) {
      viewAssignment.cancel();
      setAssigningCellIndex(null);
    }

    setSelectedCells((prev) => {
      if (!shift) {
        // Keep a single selected cell selected on repeated clicks to reduce
        // accidental deselection while building merge selections.
        if (prev.has(cellIndex) && prev.size === 1) {
          return prev;
        }
        return new Set([cellIndex]);
      }
      const next = new Set(prev);
      if (next.has(cellIndex)) {
        next.delete(cellIndex);
      } else {
        next.add(cellIndex);
      }
      return next;
    });
  }, [assigningCellIndex]);

  // ── Derived: is the selection a rectangular region? ─────────────────────
  const isRectangularSelection = useMemo(() => {
    if (selectedCells.size <= 1) return true;
    const selectedPositions = [];
    for (const idx of selectedCells) {
      const cell = cells[idx];
      if (!cell) return false;
      selectedPositions.push({ row: cell.row, col: cell.col });
    }
    const minRow = Math.min(...selectedPositions.map((p) => p.row));
    const maxRow = Math.max(...selectedPositions.map((p) => p.row));
    const minCol = Math.min(...selectedPositions.map((p) => p.col));
    const maxCol = Math.max(...selectedPositions.map((p) => p.col));
    const boundingArea = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return boundingArea === selectedCells.size;
  }, [selectedCells, cells]);

  // ── Derived: does any selected cell have isMerged === true? ─────────────
  const hasMergedCellSelected = useMemo(() => {
    for (const idx of selectedCells) {
      const cell = cells[idx];
      if (cell?.isMerged) return true;
    }
    return false;
  }, [selectedCells, cells]);

  // ── Drag actions ────────────────────────────────────────────────────────
  const startDrag = useCallback((cellIndex, view) => {
    setContextMenu(null);
    setDragState({ sourceCellIndex: cellIndex, sourceView: view, ghostX: 0, ghostY: 0 });
  }, []);

  const updateDragGhost = useCallback((x, y) => {
    setDragState((prev) => prev ? { ...prev, ghostX: x, ghostY: y } : null);
  }, []);

  const endDrag = useCallback(() => {
    const current = dragState;
    setDragState(null);
    return current;
  }, [dragState]);

  const cancelDrag = useCallback(() => {
    setDragState(null);
  }, []);

  // ── Context menu actions ────────────────────────────────────────────────
  const openContextMenu = useCallback((cellIndex, position, cellView, cellIsMerged) => {
    setContextMenu({ cellIndex, position, cellView, cellIsMerged });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ── Targeting actions ───────────────────────────────────────────────────
  const enterTargeting = useCallback((action, sourceCellIndex, sourceView) => {
    setContextMenu(null);
    setTargeting({ action, sourceCellIndex, sourceView });
  }, []);

  const resolveTargeting = useCallback((targetCellIndex) => {
    const current = targeting;
    setTargeting(null);
    if (!current) return null;
    return {
      action: current.action,
      sourceCellIndex: current.sourceCellIndex,
      sourceView: current.sourceView,
      targetCellIndex,
    };
  }, [targeting]);

  const cancelTargeting = useCallback(() => {
    setTargeting(null);
  }, []);

  // ── Assignment actions ──────────────────────────────────────────────────
  const startAssigning = useCallback((cellIndex) => {
    setAssigningCellIndex(cellIndex);
  }, []);

  const clearAssigning = useCallback(() => {
    setAssigningCellIndex(null);
  }, []);

  // ── Escape handler (cascade) ────────────────────────────────────────────
  useEffect(() => {
    if (!focusedVG) return;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();

      // Cascade: drag > contextMenu > targeting > assigning > selection > exit
      if (dragState) {
        setDragState(null);
        return;
      }
      if (contextMenu) {
        setContextMenu(null);
        return;
      }
      if (targeting) {
        setTargeting(null);
        return;
      }
      if (assigningCellIndex !== null) {
        viewAssignment.cancel();
        setAssigningCellIndex(null);
        return;
      }
      if (selectedCells.size > 0) {
        clearSelection();
        return;
      }
      onExitFocus?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedVG, dragState, contextMenu, targeting, assigningCellIndex, selectedCells.size, clearSelection, onExitFocus]);

  // ── Reset all interaction state when focusedVG changes ──────────────────
  const prevFocusedIdRef = useRef(focusedVG?.id);
  useEffect(() => {
    if (focusedVG?.id === prevFocusedIdRef.current) return;
    prevFocusedIdRef.current = focusedVG?.id;

    clearSelection();
    setDragState(null);
    setContextMenu(null);
    setTargeting(null);
    if (assigningCellIndex !== null) {
      viewAssignment.cancel();
      setAssigningCellIndex(null);
    }
  }, [focusedVG?.id, clearSelection, assigningCellIndex]);

  return {
    // Selection
    selectedCells,
    interactionMode,
    selectCell,
    clearSelection,
    isRectangularSelection,
    hasMergedCellSelected,

    // Drag
    dragState,
    startDrag,
    updateDragGhost,
    endDrag,
    cancelDrag,

    // Context menu
    contextMenu,
    openContextMenu,
    closeContextMenu,

    // Targeting
    targeting,
    enterTargeting,
    resolveTargeting,
    cancelTargeting,

    // Assignment
    assigningCellIndex,
    startAssigning,
    clearAssigning,
  };
}
