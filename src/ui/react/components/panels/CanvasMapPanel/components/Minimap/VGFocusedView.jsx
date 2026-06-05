/**
 * @file VGFocusedView.jsx
 * @description Container component for the focused VG overlay.
 *
 * Composes focused overlay grid + quick ops toolbar.
 * Phase 4: adds pointer-based drag, right-click context menu,
 * targeting visuals, and DragGhost rendering.
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { DropdownPortal, useDropdown } from '@UI/react/components/atoms/DropdownPortal';
import { FocusedCell } from './FocusedCell';
import { CellContextMenu } from './CellContextMenu';
import { DragGhost } from './DragGhost';
import { TemplatePicker } from '../QuickOps/TemplatePicker';
import { LAYOUTS } from '../../utils/constants';
import { getInternalCells } from '../../hooks/useInternalCellLayout';

const DRAG_THRESHOLD = 4;

/**
 * @param {Object} props
 * @param {Object} props.focusedVG - The focused ViewGroup
 * @param {Array} props.focusedSlots - Slot data array (view per cell index)
 * @param {Object} props.focusedLayout - Layout definition
 * @param {number} props.containerWidth - Minimap container width
 * @param {number} props.containerHeight - Minimap container height
 * @param {Function} props.onSlotDrop - Slot drop callback (slotIndex, payload)
 * @param {Function} props.onSlotClear - Slot clear callback (slotIndex)
 * @param {Function} props.onBackToCanvas - Exit focus callback
 * @param {Function} props.parseDragPayload - Drag payload parser
 * @param {Function} props.isViewPayload - View payload checker
 * @param {Object} props.quickOps - Quick ops state from useVGQuickOps
 * @param {Function} props.onCellDragComplete - Drag complete handler
 * @param {Function} props.onCellAssign - Assignment handler (cellIndex)
 * @param {Function} props.onTargetingResolve - Targeting resolve handler (targetCellIndex)
 * @param {Function} props.onSplitCell - Split cell handler (cellIndex)
 * @param {Function} props.onApplyTemplate - Apply layout template (layoutId)
 * @param {Function} props.onMergeCells - Merge selected cells (array)
 * @param {Function} props.onOpenEditor - Open VG editor
 */
export const VGFocusedView = memo(function VGFocusedView({
  focusedVG,
  focusedSlots,
  focusedLayout,
  containerWidth,
  containerHeight,
  onSlotDrop,
  onSlotClear,
  onBackToCanvas,
  parseDragPayload,
  isViewPayload,
  quickOps,
  onCellDragComplete,
  onCellAssign,
  onTargetingResolve,
  onSplitCell,
  onApplyTemplate,
  onMergeCells,
  onOpenEditor,
}) {
  const templateDropdown = useDropdown();
  const [focusedDropIndex, setFocusedDropIndex] = useState(null);
  const dragStartRef = useRef(null);
  const cellRectsRef = useRef([]);
  const suppressNativeClickCellRef = useRef(null);

  const layout = focusedLayout || (focusedVG ? (LAYOUTS[focusedVG.layoutId] || LAYOUTS.single) : LAYOUTS.single);

  const stageDims = useMemo(() => {
    const safeWidth = Math.max(0, containerWidth || 0);
    const safeHeight = Math.max(0, containerHeight || 0);
    const minSide = Math.max(120, Math.min(safeWidth, safeHeight));
    const basePadding = Math.max(12, Math.round(minSide * 0.06));
    const toolbarHeight = 52;
    const availableWidth = Math.max(0, safeWidth - basePadding * 2);
    const availableHeight = Math.max(0, safeHeight - basePadding * 2 - toolbarHeight);
    const maxGridWidth = Math.min(availableWidth, 360);
    const maxGridHeight = Math.min(availableHeight, 360);
    const aspect = (layout?.cols || 1) / (layout?.rows || 1);
    let gridWidth = maxGridWidth;
    let gridHeight = maxGridWidth / aspect;
    if (gridHeight > maxGridHeight) {
      gridHeight = maxGridHeight;
      gridWidth = gridHeight * aspect;
    }
    return {
      padding: basePadding,
      gridWidth: Math.max(0, gridWidth),
      gridHeight: Math.max(0, gridHeight),
    };
  }, [containerWidth, containerHeight, layout?.cols, layout?.rows]);

  const cells = useMemo(() => {
    if (!layout || stageDims.gridWidth <= 0 || stageDims.gridHeight <= 0) return [];
    const filledCount = focusedSlots ? focusedSlots.filter(Boolean).length : 0;
    const innerPadding = Math.max(8, Math.round(Math.min(stageDims.gridWidth, stageDims.gridHeight) * 0.06));
    const cellGap = Math.max(6, Math.round(Math.min(stageDims.gridWidth, stageDims.gridHeight) * 0.04));
    const innerW = Math.max(0, stageDims.gridWidth - innerPadding * 2);
    const innerH = Math.max(0, stageDims.gridHeight - innerPadding * 2);
    return getInternalCells(layout, innerW, innerH, filledCount, { padding: innerPadding, gap: cellGap });
  }, [layout, stageDims.gridWidth, stageDims.gridHeight, focusedSlots]);

  // ── External drag-drop (from CompanionPanel) ────────────────────────────
  const handleCellDragOver = useCallback((e, cellIndex) => {
    const payload = parseDragPayload(e);
    if (!isViewPayload(payload)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setFocusedDropIndex(cellIndex);
  }, [parseDragPayload, isViewPayload]);

  const handleCellDragLeave = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setFocusedDropIndex(null);
  }, []);

  const handleCellDrop = useCallback((e, cellIndex) => {
    const payload = parseDragPayload(e);
    if (!isViewPayload(payload)) return;
    e.preventDefault();
    e.stopPropagation();
    onSlotDrop?.(cellIndex, payload);
    setFocusedDropIndex(null);
  }, [parseDragPayload, isViewPayload, onSlotDrop]);

  // ── Cell click (with targeting override) ────────────────────────────────
  const handleCellClick = useCallback((cellIndex, e) => {
    if (suppressNativeClickCellRef.current === cellIndex) {
      suppressNativeClickCellRef.current = null;
      return;
    }
    // If targeting is active, resolve it
    if (quickOps?.targeting) {
      onTargetingResolve?.(cellIndex);
      return;
    }
    const selected = quickOps?.selectedCells;
    const selectedSize = selected?.size || 0;
    const isModifier = !!(e?.shiftKey || e?.metaKey || e?.ctrlKey);
    const shouldExtendSelection = isModifier || (selectedSize > 0 && !selected?.has(cellIndex));
    quickOps?.selectCell(cellIndex, { shift: shouldExtendSelection });
  }, [quickOps, onTargetingResolve]);

  // ── Pointer-based drag (follows edit-mode VG move pattern) ──────────────
  const handleCellPointerDown = useCallback((cellIndex, view, e) => {
    if (!view || !quickOps || e.button !== 0) return;
    // Don't start drag if targeting is active
    if (quickOps.targeting) return;

    // Shift-click on filled cells should behave like selection-only multi-select
    // so merge gestures remain possible when cells already contain views.
    if (e.shiftKey) {
      e.preventDefault();
      suppressNativeClickCellRef.current = cellIndex;
      quickOps.selectCell(cellIndex, { shift: true });
      return;
    }

    const selected = quickOps.selectedCells;
    const selectedSize = selected?.size || 0;
    const isAlreadySingleSelected = selectedSize === 1 && selected?.has(cellIndex);
    const shouldExtendSelection = selectedSize > 0 && !selected?.has(cellIndex);
    let selectionChangedOnPointerDown = false;
    if (!isAlreadySingleSelected) {
      quickOps.selectCell(cellIndex, { shift: shouldExtendSelection });
      selectionChangedOnPointerDown = true;
      suppressNativeClickCellRef.current = cellIndex;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    dragStartRef.current = { cellIndex, view, startX, startY };

    const handlePointerMove = (moveEvt) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;

      if (!isDragging) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        isDragging = true;
        quickOps.startDrag(cellIndex, view);
      }

      quickOps.updateDragGhost(moveEvt.clientX, moveEvt.clientY);
    };

    const handlePointerUp = (upEvt) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      dragStartRef.current = null;

      if (!isDragging) {
        // If pointerdown already changed selection, skip click fallback to avoid
        // immediately toggling the same cell back off.
        if (!selectionChangedOnPointerDown) {
          const upSelected = quickOps.selectedCells;
          const upSelectedSize = upSelected?.size || 0;
          const isModifier = !!(upEvt?.shiftKey || upEvt?.metaKey || upEvt?.ctrlKey);
          const shouldExtendSelection = isModifier || (upSelectedSize > 0 && !upSelected?.has(cellIndex));
          quickOps.selectCell(cellIndex, { shift: shouldExtendSelection });
          suppressNativeClickCellRef.current = cellIndex;
        }
        return;
      }

      // Hit-test against cell rects to find target
      const targetCellIndex = hitTestCells(upEvt.clientX, upEvt.clientY, cellIndex);
      const dragInfo = quickOps.endDrag();

      if (dragInfo && targetCellIndex !== null && targetCellIndex !== cellIndex) {
        const targetView = focusedSlots?.[targetCellIndex] || null;
        onCellDragComplete?.({
          sourceCellIndex: cellIndex,
          targetCellIndex,
          sourceView: view,
          targetView,
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [quickOps, focusedSlots, onCellDragComplete, handleCellClick]);

  // Hit-test pointer position against rendered cell rects
  const hitTestCells = useCallback((clientX, clientY, excludeIndex) => {
    const rects = cellRectsRef.current;
    for (let i = 0; i < rects.length; i++) {
      if (i === excludeIndex) continue;
      const rect = rects[i];
      if (!rect) continue;
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return i;
      }
    }
    return null;
  }, []);

  // Ref callback to capture cell DOM rects
  const setCellRef = useCallback((index, el) => {
    if (el) {
      cellRectsRef.current[index] = el.getBoundingClientRect();
    }
  }, []);

  // ── Context menu ────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((cellIndex, view, isMerged, e) => {
    e.preventDefault();
    quickOps?.openContextMenu(cellIndex, { x: e.clientX, y: e.clientY }, view, isMerged);
  }, [quickOps]);

  // Context menu action handlers
  const handleSwapWith = useCallback(() => {
    const cm = quickOps?.contextMenu;
    if (!cm) return;
    quickOps.enterTargeting('swap', cm.cellIndex, cm.cellView);
  }, [quickOps]);

  const handleMoveTo = useCallback(() => {
    const cm = quickOps?.contextMenu;
    if (!cm) return;
    quickOps.enterTargeting('move', cm.cellIndex, cm.cellView);
  }, [quickOps]);

  const handleDuplicateTo = useCallback(() => {
    const cm = quickOps?.contextMenu;
    if (!cm) return;
    quickOps.enterTargeting('clone', cm.cellIndex, cm.cellView);
  }, [quickOps]);

  const handleRemoveFromCell = useCallback(() => {
    const cm = quickOps?.contextMenu;
    if (!cm) return;
    onSlotClear?.(cm.cellIndex);
  }, [quickOps, onSlotClear]);

  const handleAssignView = useCallback(() => {
    const cm = quickOps?.contextMenu;
    if (!cm) return;
    onCellAssign?.(cm.cellIndex);
  }, [quickOps, onCellAssign]);

  const handleSplitCell = useCallback(() => {
    const cm = quickOps?.contextMenu;
    if (!cm) return;
    onSplitCell?.(cm.cellIndex);
  }, [quickOps, onSplitCell]);

  // ── Empty cell "+" click ────────────────────────────────────────────────
  const handleAssignEmpty = useCallback((cellIndex, e) => {
    if (quickOps?.targeting) {
      onTargetingResolve?.(cellIndex);
      return;
    }
    const selected = quickOps?.selectedCells;
    const selectedSize = selected?.size || 0;
    const isModifierSelect = !!(e?.shiftKey || e?.metaKey || e?.ctrlKey);
    const isAlreadySingleSelected = selectedSize === 1 && selected?.has(cellIndex);
    if (isAlreadySingleSelected && !isModifierSelect) {
      // Explicit assign intent: second click on same selected empty cell.
      onCellAssign?.(cellIndex);
      return;
    }
    // Default empty-cell click should select so merge/split selection is stable.
    handleCellClick(cellIndex, e);
  }, [quickOps, onTargetingResolve, onCellAssign, handleCellClick]);

  const isMergeCapableLayout = (focusedLayout?.rows === 2 && focusedLayout?.cols === 2);
  const selectedCount = quickOps?.selectedCells?.size || 0;
  const canMerge = isMergeCapableLayout && quickOps?.isRectangularSelection && selectedCount === 2;
  const canSplit = !!focusedLayout?.merged && (quickOps?.selectedCells?.size || 0) === 1;
  const mergeTooltip = canMerge
    ? 'Merge cells'
    : (isMergeCapableLayout ? 'Select exactly two adjacent cells to merge' : 'Merge is only available for 2x2 layouts');
  const handleMerge = useCallback(() => {
    if (!canMerge) return;
    const indices = Array.from(quickOps.selectedCells);
    onMergeCells?.(indices);
  }, [canMerge, quickOps?.selectedCells, onMergeCells]);

  const handleSplit = useCallback(() => {
    if (!canSplit) return;
    const cellIndex = Array.from(quickOps.selectedCells)[0];
    onSplitCell?.(cellIndex);
  }, [canSplit, quickOps?.selectedCells, onSplitCell]);

  const handleApplyTemplate = useCallback((layoutId) => {
    onApplyTemplate?.(layoutId);
    templateDropdown.close();
  }, [onApplyTemplate, templateDropdown]);

  // ── Keyboard: arrow key navigation between cells ───────────────────────
  const gridRef = useRef(null);

  const handleGridKeyDown = useCallback((e) => {
    if (!gridRef.current || !cells.length) return;
    const arrows = { ArrowUp: true, ArrowDown: true, ArrowLeft: true, ArrowRight: true };
    if (!arrows[e.key]) return;

    e.preventDefault();
    const focused = document.activeElement;
    const cellEls = Array.from(gridRef.current.querySelectorAll('[role="gridcell"]'));
    const currentIdx = cellEls.indexOf(focused);
    if (currentIdx < 0) {
      cellEls[0]?.focus();
      return;
    }

    // Determine grid columns from cell positions
    const colSet = new Set(cells.map(c => c.col !== undefined ? c.col : 0));
    const gridCols = colSet.size || 1;

    let nextIdx = currentIdx;
    if (e.key === 'ArrowRight') nextIdx = Math.min(currentIdx + 1, cellEls.length - 1);
    if (e.key === 'ArrowLeft') nextIdx = Math.max(currentIdx - 1, 0);
    if (e.key === 'ArrowDown') nextIdx = Math.min(currentIdx + gridCols, cellEls.length - 1);
    if (e.key === 'ArrowUp') nextIdx = Math.max(currentIdx - gridCols, 0);

    if (nextIdx !== currentIdx) {
      cellEls[nextIdx]?.focus();
    }
  }, [cells, focusedVG?.layoutId]);

  const { targeting, dragState } = quickOps || {};

  return (
    <div
      className="minimap__focused-overlay"
      style={{ '--vg-color': focusedVG.color }}
    >
      <div className="minimap__focused-stage" style={{ padding: stageDims.padding }}>
        <div
          className="minimap__focused-grid"
          ref={gridRef}
          role="grid"
          aria-label={`${focusedVG.name || 'ViewGroup'} cells`}
          onKeyDown={handleGridKeyDown}
          style={{
            width: stageDims.gridWidth,
            height: stageDims.gridHeight,
          }}
        >
          {cells.map((cell, i) => {
            const view = focusedSlots?.[i] || null;
            const isDropTarget = focusedDropIndex === i;
            const isSelected = quickOps?.selectedCells?.has(i) || false;

            // Drag visual states
            const isDragSource = dragState?.sourceCellIndex === i;
            const isDragTarget = dragState && !isDragSource && i !== dragState.sourceCellIndex;

            // Targeting visual states
            let isTargetingValid = false;
            let isTargetingPulse = false;
            if (targeting && i !== targeting.sourceCellIndex) {
              if (targeting.action === 'swap') {
                isTargetingValid = !!view;
                isTargetingPulse = !!view;
              } else {
                // move or clone — target must be empty
                isTargetingValid = !view;
              }
            }

            // Assigning state
            const isAssigning = quickOps?.assigningCellIndex === i;

            return (
              <FocusedCell
                key={i}
                ref={(el) => setCellRef(i, el)}
                cell={cell}
                view={view}
                vgColor={focusedVG.color}
                isSelected={isSelected}
                isDropTarget={isDropTarget}
                isDragSource={isDragSource}
                isDragTarget={isDragTarget}
                isTargetingValid={isTargetingValid}
                isTargetingPulse={isTargetingPulse}
                isAssigning={isAssigning}
                onClick={(e) => handleCellClick(i, e)}
                onDragOver={(e) => handleCellDragOver(e, i)}
                onDragLeave={handleCellDragLeave}
                onDrop={(e) => handleCellDrop(e, i)}
                onClearView={() => onSlotClear?.(i)}
                onContextMenu={(e) => handleContextMenu(i, view, cell.isMerged || false, e)}
                onPointerDown={view ? (e) => handleCellPointerDown(i, view, e) : undefined}
                onAssign={(e) => handleAssignEmpty(i, e)}
                targeting={!!targeting}
                animationDelay={i * 30}
              />
            );
          })}
        </div>
      </div>

      <div className="minimap__focused-toolbar">
        <button
          type="button"
          className="minimap__focused-toolbar-btn minimap__focused-toolbar-btn--back"
          onClick={onBackToCanvas}
          disabled={!onBackToCanvas}
        >
          <Icon name="chevronLeft" size={12} />
          <span>Canvas</span>
        </button>
        <div className="minimap__focused-toolbar-sep" />
        <button
          type="button"
          className="minimap__focused-toolbar-btn minimap__focused-toolbar-btn--template"
          ref={templateDropdown.triggerRef}
          onClick={templateDropdown.toggle}
          disabled={!onApplyTemplate}
          aria-expanded={templateDropdown.open}
          aria-haspopup
        >
          <Icon name="layoutGrid" size={12} />
          <span>Template</span>
          <Icon name="chevronDown" size={10} />
        </button>
        <div className="minimap__focused-toolbar-sep" />
        <Tooltip content={mergeTooltip} placement="top" delay={300}>
          <button
            type="button"
            className={`minimap__focused-toolbar-icon ${canMerge ? '' : 'minimap__focused-toolbar-icon--disabled'}`}
            onClick={handleMerge}
            disabled={!canMerge}
            aria-label={mergeTooltip}
          >
            <Icon name="combine" size={12} />
          </button>
        </Tooltip>
        <Tooltip content={canSplit ? 'Split cell' : 'Select any cell in a merged layout to split'} placement="top" delay={300}>
          <button
            type="button"
            className={`minimap__focused-toolbar-icon ${canSplit ? '' : 'minimap__focused-toolbar-icon--disabled'}`}
            onClick={handleSplit}
            disabled={!canSplit}
            aria-label={canSplit ? 'Split cell' : 'Select any cell in a merged layout to split'}
          >
            <Icon name="layers" size={12} />
          </button>
        </Tooltip>
        <div className="minimap__focused-toolbar-sep" />
        <button
          type="button"
          className="minimap__focused-toolbar-btn minimap__focused-toolbar-btn--editor"
          onClick={onOpenEditor}
          disabled={!onOpenEditor}
        >
          <Icon name="pencil" size={12} />
          <span>Editor</span>
        </button>
      </div>

      <DropdownPortal
        open={templateDropdown.open}
        onClose={templateDropdown.close}
        triggerRef={templateDropdown.triggerRef}
        position="top"
        align="center"
        offset={8}
      >
        <TemplatePicker
          currentLayout={focusedVG.layoutId || 'single'}
          currentRows={focusedVG.position?.rowSpan || layout.rows}
          currentCols={focusedVG.position?.colSpan || layout.cols}
          onApply={handleApplyTemplate}
          onClose={templateDropdown.close}
        />
      </DropdownPortal>

      {/* Context menu portal */}
      {quickOps?.contextMenu && (
        <CellContextMenu
          view={quickOps.contextMenu.cellView}
          cell={cells[quickOps.contextMenu.cellIndex]}
          position={quickOps.contextMenu.position}
          vgColor={focusedVG.color}
          vgName={focusedVG.name}
          isMerged={quickOps.contextMenu.cellIsMerged}
          onClose={quickOps.closeContextMenu}
          onSwapWith={handleSwapWith}
          onMoveTo={handleMoveTo}
          onDuplicateTo={handleDuplicateTo}
          onRemove={handleRemoveFromCell}
          onAssignView={handleAssignView}
          onSplitCell={handleSplitCell}
        />
      )}

      {/* Drag ghost portal */}
      {dragState && (
        <DragGhost
          view={dragState.sourceView}
          vgColor={focusedVG.color}
          x={dragState.ghostX}
          y={dragState.ghostY}
        />
      )}
    </div>
  );
});

export default VGFocusedView;
