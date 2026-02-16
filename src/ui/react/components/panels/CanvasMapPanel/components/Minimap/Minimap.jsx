/**
 * @file Minimap.jsx
 * @description Main minimap component for Canvas Map Panel V2
 *
 * Features:
 * - Grid-based canvas overview
 * - VG blocks or View cells (based on display mode)
 * - Viewport indicators
 * - Collaborator indicators with cursor tracking
 * - Link lines (in Links mode)
 * - Panning support for large canvases
 */

import React, { memo, useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { VGBlock } from './VGBlock';
import { ViewCell } from './ViewCell';
import { ViewportIndicator } from './ViewportIndicator';
import { CollaboratorIndicator } from './CollaboratorIndicator';
import { CursorIndicator } from './CursorIndicator';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { useMinimapPanning } from '../../hooks/useMinimapPanning';
import { useMinimapCellSize } from '../../hooks/useMinimapCellSize';
import { MAP_MODES, MINIMAP_CONSTANTS, LAYOUTS } from '../../utils/constants';
import { colToLetter, clamp } from '../../utils/gridUtils';
import { parseDragData } from '@UI/react/hooks/dragDropTypes';
import { VGFocusedView } from './VGFocusedView';
import { ExpansionGutter } from './ExpansionGutter';
import './Minimap.scss';

/**
 * Minimap - Grid-based canvas overview with panning
 */
export const Minimap = memo(function Minimap({
  // Data
  canvas,
  viewGroups,
  viewports,
  collaborators,
  flattenedViews,

  // Display settings
  showViews = false,
  showVGs = true,
  mapMode,
  minimapZoom,
  showGridLabels,
  showInternals,
  showViewports,
  showCollaborators,
  showCursors,

  // Selection state
  selectedVGId,
  selectedViewportId,

  // Handlers
  onVGClick,
  onVGDoubleClick,
  onDeselect,
  onDropItem,
  onFocusedVGSlotDrop,
  onFocusedVGSlotClear,
  onBackFromFocus,

  // Container dimensions
  containerWidth,
  containerHeight,

  // Focus state
  focusedVG,
  focusedSlots = [],

  // Collision/placement (optional)
  collisionViewGroups,

  // Companion panel (for extended panning)
  companionOpen = false,
  companionWidth = 0,

  // Control signals
  resetPanSignal = 0,

  // Edit mode (transactional editing)
  isEditMode = false,
  onMoveVG,
  onRemoveVG,
  draftSnapshot,
  displayViewGroups: displayViewGroupsProp,

  // Remote draft preview (collaboration)
  remoteDraftSnapshot,
  remoteOperations = [],

  // Quick ops (passed from parent)
  quickOps,
  onApplyTemplate,
  onMergeCells,
  onSplitCell,
  onOpenEditor,

  // Phase 4: cell interaction handlers
  onCellDragComplete,
  onCellAssign,
  onTargetingResolve,

  // Search dimming
  dimmedVGIds,

  // Canvas expansion & viewport drag
  onExpandCanvas,
  onViewportMove,
  canRemoveRows = true,
  canRemoveCols = true,
  isVR = false,
  canRemoveTop,
  canRemoveBottom,
  canRemoveLeft,
  canRemoveRight,
}) {
  const { rows, cols } = canvas;
  const containerRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const dropTargetRef = useRef(null);
  const dragPayloadRef = useRef(null);

  // Edit mode VG move state
  const [movingVG, setMovingVG] = useState(null); // { vg, startX, startY }
  const [moveGhost, setMoveGhost] = useState(null); // { row, col, rowSpan, colSpan, color }
  const moveGhostRef = useRef(null); // ref to avoid stale closure in pointer up

  // Calculate cell sizing
  const sizing = useMinimapCellSize({
    containerWidth: containerWidth || 300,
    containerHeight: containerHeight || 300,
    rows,
    cols,
    zoom: minimapZoom,
    showLabels: showGridLabels,
  });

  const { cellSize, headerWidth, headerHeight, labelFontSize } = sizing;
  const renderGap = MINIMAP_CONSTANTS.GRID_GAP;
  const renderPitch = cellSize + renderGap;
  const gridExtra = MINIMAP_CONSTANTS.EXTRA_GRID_CELLS ?? 2;
  const gridCols = Math.max(cols + gridExtra, cols);
  const gridRows = Math.max(rows + gridExtra, rows);
  const gridWidth = gridCols * cellSize + (gridCols - 1) * renderGap;
  const gridHeight = gridRows * cellSize + (gridRows - 1) * renderGap;
  const canvasWidth = cols * cellSize + (cols - 1) * renderGap;
  const canvasHeight = rows * cellSize + (rows - 1) * renderGap;
  const scrollPadding = MINIMAP_CONSTANTS.SCROLL_PADDING * 2;
  const labelOffsetX = showGridLabels ? headerWidth : 0;
  const labelOffsetY = showGridLabels ? headerHeight : 0;
  const isFocused = !!focusedVG;
  const cellRadius = Math.max(3, Math.round(cellSize * 0.16));

  // Panning support with extended bounds (V2Spec: allows panning ~3 cells beyond content)
  const cellPitch = renderPitch;

  const panEnabled = !focusedVG && (sizing.needsPanning || MINIMAP_CONSTANTS.PAN_PADDING_CELLS > 0);
  const panning = useMinimapPanning({
    contentWidth: gridWidth + labelOffsetX + scrollPadding,
    contentHeight: gridHeight + labelOffsetY + scrollPadding,
    viewportWidth: containerWidth || 300,
    viewportHeight: containerHeight || 300,
    enabled: panEnabled,
    cellPitch,
    companionOpen,
    companionOffset: companionWidth,
  });

  React.useEffect(() => {
    if (resetPanSignal === 0) return;
    panning.resetPan();
  }, [resetPanSignal, panning.resetPan]);

  // Collaborators with cursor data for cursor indicators
  const collaboratorsWithCursors = useMemo(() => {
    return collaborators.filter(c => c.isOnline && c.cursor && (c.showCursor ?? true));
  }, [collaborators]);

  const collisionGroups = useMemo(() => {
    if (collisionViewGroups && collisionViewGroups.length) {
      return collisionViewGroups;
    }
    return viewGroups;
  }, [collisionViewGroups, viewGroups]);

  const focusedLayout = useMemo(() => {
    if (!focusedVG) return null;
    return LAYOUTS[focusedVG.layoutId] || LAYOUTS.single;
  }, [focusedVG, focusedVG?.layoutId]);

  const parseDragPayload = useCallback((event) => {
    const parsed = parseDragData(event?.dataTransfer);
    if (parsed) {
      dragPayloadRef.current = parsed;
      return parsed;
    }

    const readData = (type) => {
      try {
        return event?.dataTransfer?.getData?.(type) || '';
      } catch {
        return '';
      }
    };
    const raw = readData('application/x-cia-drag')
      || readData('application/json')
      || readData('text')
      || readData('text/plain');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        dragPayloadRef.current = parsed;
        return parsed;
      } catch {
        // Fall through to global drag payload
      }
    }

    if (typeof window !== 'undefined' && window.__ciaDragPayload) {
      dragPayloadRef.current = window.__ciaDragPayload;
      return window.__ciaDragPayload;
    }

    return dragPayloadRef.current;
  }, []);

  const isViewPayload = useCallback((payload) => {
    if (!payload) return false;
    if (payload.type === 'vg-place' || payload.type === 'vg-import' || payload.type === 'template-create') {
      return false;
    }
    if (payload.type === 'dataset') return true;
    if (payload.type === 'view' || payload.type === 'view-item') return true;
    if (payload.view || payload.viewId || payload.viewConfigId) return true;
    if (payload.datasetId && !payload.templateId) return true;
    return false;
  }, []);

  const handleVGDragStart = useCallback((event, vg) => {
    if (!event?.dataTransfer || !vg) return;
    const payload = {
      type: 'vg-place',
      vgId: vg.id,
      vgName: vg.name,
      vgColor: vg.color,
    };
    const safeSetDragData = (type) => {
      try {
        event.dataTransfer.setData(type, JSON.stringify(payload));
      } catch {
        // Firefox may reject some custom MIME types.
      }
    };
    event.dataTransfer.effectAllowed = 'move';
    safeSetDragData('text');
    safeSetDragData('text/plain');
    safeSetDragData('application/json');
    safeSetDragData('application/x-cia-drag');
    if (typeof window !== 'undefined') {
      window.__ciaDragPayload = payload;
    }
    dragPayloadRef.current = payload;
    setIsDragOver(true);
  }, []);

  const handleVGDragEnd = useCallback(() => {
    setIsDragOver(false);
    setDropTarget(null);
    if (typeof window !== 'undefined') {
      window.__ciaDragPayload = null;
    }
    dragPayloadRef.current = null;
  }, []);

  // ── Edit mode: pointer-event VG move handler ─────────────────────────
  const handleVGPointerDown = useCallback((event, vg) => {
    if (!isEditMode || !onMoveVG || !containerRef.current) return;

    event.preventDefault();
    const pointerId = event.pointerId;
    containerRef.current.setPointerCapture(pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    setMovingVG({ vg, startX, startY });

    const handlePointerMove = (e) => {
      if (!containerRef.current) return;
      // Compute target cell from pointer position
      const rect = containerRef.current.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const contentX = localX - MINIMAP_CONSTANTS.SCROLL_PADDING - labelOffsetX + panning.panOffset.x;
      const contentY = localY - MINIMAP_CONSTANTS.SCROLL_PADDING - labelOffsetY + panning.panOffset.y;

      const rawCol = Math.floor(contentX / renderPitch);
      const rawRow = Math.floor(contentY / renderPitch);
      const rowSpan = vg.position?.rowSpan || 1;
      const colSpan = vg.position?.colSpan || 1;
      const maxCol = Math.max(0, cols - colSpan);
      const maxRow = Math.max(0, rows - rowSpan);
      const col = clamp(rawCol, 0, maxCol);
      const row = clamp(rawRow, 0, maxRow);

      const ghostVal = { row, col, rowSpan, colSpan, color: vg.color };
      setMoveGhost(ghostVal);
      moveGhostRef.current = ghostVal;
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (containerRef.current) {
        try { containerRef.current.releasePointerCapture(pointerId); } catch { }
      }

      // Finalize move using ref (avoids stale closure)
      const ghost = moveGhostRef.current;
      setMovingVG(null);
      setMoveGhost(null);
      moveGhostRef.current = null;

      if (ghost && onMoveVG) {
        onMoveVG({ vgId: vg.id, toRow: ghost.row, toCol: ghost.col });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [isEditMode, onMoveVG, labelOffsetX, labelOffsetY, panning.panOffset.x, panning.panOffset.y, renderPitch, cols, rows]);

  // ── Compute change status for each VG (draft indicators) ─────────────
  const getChangeStatus = useCallback((vgId) => {
    if (!isEditMode || !draftSnapshot) return null;
    const snapshotVG = draftSnapshot.find((s) => s.id === vgId);
    const currentVG = viewGroups.find((v) => v.id === vgId);
    if (!snapshotVG && currentVG) return 'added';
    if (snapshotVG && !currentVG) return 'removed';
    if (snapshotVG && currentVG && currentVG.position) {
      const sp = snapshotVG.position;
      const cp = currentVG.position;
      if (sp && cp && (sp.row !== cp.row || sp.col !== cp.col)) return 'moved';
    }
    return null;
  }, [isEditMode, draftSnapshot, viewGroups]);

  // ── Ghost outlines for removed VGs ─────────────────────────────────────
  const removedVGGhosts = useMemo(() => {
    if (!isEditMode || !draftSnapshot) return [];
    const currentIds = new Set(viewGroups.map((v) => v.id));
    return draftSnapshot.filter((s) => !currentIds.has(s.id) && s.position);
  }, [isEditMode, draftSnapshot, viewGroups]);

  // Ghost outlines for MOVED VGs — show original position with dashed outline
  const movedVGGhosts = useMemo(() => {
    if (!isEditMode || !draftSnapshot) return [];
    return draftSnapshot
      .filter((snap) => {
        const current = viewGroups.find((v) => v.id === snap.id);
        if (!current?.position || !snap.position) return false;
        return current.position.row !== snap.position.row || current.position.col !== snap.position.col;
      })
      .map((snap) => ({ ...snap, originalPosition: snap.position }));
  }, [isEditMode, draftSnapshot, viewGroups]);

  const resolveSpanForData = useCallback((data) => {
    if (!data) return { rowSpan: 1, colSpan: 1 };
    if (data.type === 'vg-place' || data.type === 'vg-import') {
      const vg = viewGroups.find((group) => group.id === data.vgId);
      if (!vg) return { rowSpan: 1, colSpan: 1 };
      const layoutId = vg.layoutId || 'single';
      const layout = LAYOUTS[layoutId] || LAYOUTS.single;
      const rowSpan = vg.position?.rowSpan || layout.rows || 1;
      const colSpan = vg.position?.colSpan || layout.cols || 1;
      return { rowSpan, colSpan };
    }
    if (data.type === 'template-create' || data.templateId || (data.layoutId && !data.vgId)) {
      const layout = LAYOUTS[data.layoutId] || LAYOUTS.single;
      return { rowSpan: layout.rows || 1, colSpan: layout.cols || 1 };
    }
    return { rowSpan: 1, colSpan: 1 };
  }, [viewGroups]);

  const computeDropPosition = useCallback((event, data) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const contentX = localX - MINIMAP_CONSTANTS.SCROLL_PADDING - labelOffsetX + panning.panOffset.x;
    const contentY = localY - MINIMAP_CONSTANTS.SCROLL_PADDING - labelOffsetY + panning.panOffset.y;

    if (!Number.isFinite(contentX) || !Number.isFinite(contentY)) return null;

    const rawCol = Math.floor(contentX / renderPitch);
    const rawRow = Math.floor(contentY / renderPitch);
    if (rawCol < 0 || rawRow < 0) return null;

    const { rowSpan, colSpan } = resolveSpanForData(data);
    const maxCol = Math.max(0, cols - colSpan);
    const maxRow = Math.max(0, rows - rowSpan);
    const startCol = clamp(rawCol, 0, maxCol);
    const startRow = clamp(rawRow, 0, maxRow);
    const desiredCol = Math.max(0, rawCol);
    const desiredRow = Math.max(0, rawRow);
    const outsideCanvas = rawRow > maxRow || rawCol > maxCol;
    return {
      rowSpan,
      colSpan,
      startRow,
      startCol,
      desiredRow,
      desiredCol,
      outsideCanvas,
    };
  }, [cols, labelOffsetX, labelOffsetY, panning.panOffset.x, panning.panOffset.y, renderPitch, resolveSpanForData, rows]);

  const rectsOverlap = useCallback((a, b) => (
    a.row < b.row + b.rowSpan
    && a.row + a.rowSpan > b.row
    && a.col < b.col + b.colSpan
    && a.col + a.colSpan > b.col
  ), []);

  const findFirstFit = useCallback((rowSpan, colSpan, ignoreId, startRow, startCol) => {
    const maxRow = rows - rowSpan;
    const maxCol = cols - colSpan;
    if (maxRow < 0 || maxCol < 0) return null;
    const candidates = [];
    for (let r = 0; r <= maxRow; r += 1) {
      for (let c = 0; c <= maxCol; c += 1) {
        candidates.push({ row: r, col: c });
      }
    }
    const startIndex = candidates.findIndex(
      (pos) => pos.row === startRow && pos.col === startCol
    );
    const ordered = startIndex >= 0
      ? [...candidates.slice(startIndex), ...candidates.slice(0, startIndex)]
      : candidates;
    for (const pos of ordered) {
      const proposed = { row: pos.row, col: pos.col, rowSpan, colSpan };
      const overlaps = collisionGroups.some((vg) => {
        if (vg.id === ignoreId || !vg.position) return false;
        return rectsOverlap(proposed, vg.position);
      });
      if (!overlaps) return pos;
    }
    return null;
  }, [collisionGroups, cols, rectsOverlap, rows]);

  const isDropRectColliding = useCallback((rect, ignoreId) => {
    return collisionGroups.some((vg) => {
      if (vg.id === ignoreId || !vg.position) return false;
      return rectsOverlap(rect, vg.position);
    });
  }, [collisionGroups, rectsOverlap]);

  const computeDropTarget = useCallback((event, data) => {
    const base = computeDropPosition(event, data);
    if (!base) return null;
    const { rowSpan, colSpan } = base;
    const isTemplateDrop = data?.type === 'template-create' || data?.templateId || (data?.layoutId && !data?.vgId);
    const requiresCollisionFreePlacement = data?.type === 'vg-place'
      || data?.type === 'vg-import'
      || isTemplateDrop;
    if (!requiresCollisionFreePlacement && isViewPayload(data)) {
      // Views/datasets may target cells inside VG footprints so they can be inserted into VGs.
      return {
        row: Math.max(0, base.desiredRow),
        col: Math.max(0, base.desiredCol),
        rowSpan,
        colSpan,
      };
    }

    const ignoreId = (data?.type === 'vg-place' || data?.type === 'vg-import') ? data.vgId : null;
    const desired = {
      row: base.desiredRow,
      col: base.desiredCol,
      rowSpan,
      colSpan,
    };

    // If dragging outside the current canvas bounds and spot is clear, preview exact expansion target.
    if (base.outsideCanvas && !isDropRectColliding(desired, ignoreId)) {
      return desired;
    }

    const candidate = findFirstFit(rowSpan, colSpan, ignoreId, base.startRow, base.startCol);
    if (candidate) {
      return { ...candidate, rowSpan, colSpan };
    }

    // No fit in current bounds: expand in the drag direction and keep it collision-free.
    const expansionStart = {
      row: Math.max(rows, base.desiredRow),
      col: Math.max(0, base.desiredCol),
      rowSpan,
      colSpan,
    };
    if (!isDropRectColliding(expansionStart, ignoreId)) {
      return expansionStart;
    }

    for (let r = expansionStart.row; r < expansionStart.row + rows + 6; r += 1) {
      for (let c = 0; c < Math.max(cols + 6, expansionStart.col + 1); c += 1) {
        const probe = { row: r, col: c, rowSpan, colSpan };
        if (!isDropRectColliding(probe, ignoreId)) {
          return probe;
        }
      }
    }

    return { row: rows, col: 0, rowSpan, colSpan };
  }, [cols, computeDropPosition, findFirstFit, isDropRectColliding, isViewPayload, rows]);

  const shouldIgnoreCanvasDrop = useCallback((data) => {
    // Focused mode has its own slot-level drop zones.
    if (focusedVG) return true;
    if (!data) return false;
    return false;
  }, [focusedVG]);

  const gridCells = useMemo(() => {
    const cells = [];
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        const isActive = row < rows && col < cols;
        const x = col * renderPitch + 0.5;
        const y = row * renderPitch + 0.5;
        cells.push(
          <rect
            key={`cell-${row}-${col}`}
            x={x}
            y={y}
            width={Math.max(0, cellSize - 1)}
            height={Math.max(0, cellSize - 1)}
            rx={cellRadius}
            ry={cellRadius}
            className={`minimap__grid-cell ${isActive ? '' : 'minimap__grid-cell--extra'}`}
          />
        );
      }
    }
    return cells;
  }, [cellRadius, cellSize, cols, gridCols, gridRows, renderPitch, rows]);

  return (
    <div
      ref={containerRef}
      className={`minimap ${panning.isDragging ? 'minimap--dragging' : ''} ${panning.canPan ? 'minimap--pannable' : ''} ${isDragOver ? 'minimap--drop-target' : ''} ${isFocused ? 'minimap--focused' : ''}`}
      style={{
        '--cell-size': `${cellSize}px`,
        '--grid-gap': `${renderGap}px`,
        '--header-width': `${headerWidth}px`,
        '--header-height': `${headerHeight}px`,
        '--label-font-size': `${labelFontSize}px`,
        '--scroll-padding': `${MINIMAP_CONSTANTS.SCROLL_PADDING}px`,
      }}
      onDragEnter={(e) => {
        if (!onDropItem) return;
        const payload = parseDragPayload(e);
        if (payload && shouldIgnoreCanvasDrop(payload)) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!onDropItem) return;
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragOver(false);
        setDropTarget(null);
        dropTargetRef.current = null;
        dragPayloadRef.current = null;
      }}
      onDragOver={(e) => {
        if (!onDropItem) return;
        const payload = parseDragPayload(e);
        if (payload && shouldIgnoreCanvasDrop(payload)) return;
        e.preventDefault();
        const isViewLike = payload?.type === 'view'
          || payload?.type === 'view-item'
          || !!payload?.view
          || !!payload?.viewId
          || !!payload?.viewConfigId;
        const isMove = payload?.type === 'vg-place'
          || payload?.type === 'vg-import'
          || isViewLike;
        const allowed = String(e.dataTransfer?.effectAllowed || '').toLowerCase();
        const allowsCopy = !allowed || allowed === 'all' || allowed === 'uninitialized' || allowed.includes('copy');
        const allowsMove = !allowed || allowed === 'all' || allowed === 'uninitialized' || allowed.includes('move');
        let preferredDropEffect = isMove ? 'move' : 'copy';
        if (preferredDropEffect === 'move' && !allowsMove && allowsCopy) {
          preferredDropEffect = 'copy';
        } else if (preferredDropEffect === 'copy' && !allowsCopy && allowsMove) {
          preferredDropEffect = 'move';
        }
        e.dataTransfer.dropEffect = preferredDropEffect;
        setIsDragOver(true);
        const data = payload || { type: 'unknown' };
        const target = computeDropTarget(e, data);
        setDropTarget(target);
        dropTargetRef.current = target;
      }}
      onDrop={(e) => {
        if (!onDropItem || !containerRef.current) return;
        e.preventDefault();
        const data = parseDragPayload(e);
        if (!data) return;
        if (shouldIgnoreCanvasDrop(data)) return;

        const normalizedData = data.type === 'vg-import' && !focusedVG
          ? { ...data, type: 'vg-place' }
          : data;
        // Use the last drag-over target when available so the drop position
        // matches the visible indicator even if drop-event coordinates wobble.
        const target = dropTargetRef.current || computeDropTarget(e, normalizedData);
        if (!target) return;

        onDropItem({ row: target.row, col: target.col, data: normalizedData });
        setIsDragOver(false);
        setDropTarget(null);
        dropTargetRef.current = null;
        dragPayloadRef.current = null;
      }}
    >
      <div
        className="minimap__edge-guard minimap__edge-guard--top"
        aria-hidden="true"
        style={{
          width: gridWidth + headerWidth + MINIMAP_CONSTANTS.SCROLL_PADDING,
        }}
      />
      <div
        className="minimap__edge-guard minimap__edge-guard--left"
        aria-hidden="true"
        style={{
          height: gridHeight + headerHeight + MINIMAP_CONSTANTS.SCROLL_PADDING,
        }}
      />
      {showGridLabels && !isFocused && (
        <div className="minimap__labels">
          <div
            className="minimap__labels-corner"
            style={{
              width: headerWidth,
              height: headerHeight,
              top: MINIMAP_CONSTANTS.SCROLL_PADDING,
              left: MINIMAP_CONSTANTS.SCROLL_PADDING,
            }}
          />
          <div
            className="minimap__labels-top"
            style={{
              left: MINIMAP_CONSTANTS.SCROLL_PADDING + headerWidth,
              top: MINIMAP_CONSTANTS.SCROLL_PADDING,
              width: gridWidth,
            }}
          >
            <div
              className="minimap__labels-top-inner"
              style={{
                transform: `translateX(${-panning.panOffset.x}px)`,
                gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
                columnGap: `${renderGap}px`,
              }}
            >
              {Array.from({ length: gridCols }).map((_, col) => {
                const isMajor = (col + 1) % 5 === 0;
                const isActive = col < cols;
                return (
                  <div
                    key={`col-${col}`}
                    className="minimap__col-header"
                    style={{
                      color: isMajor
                        ? 'var(--minimap-label-major)'
                        : isActive
                          ? 'var(--minimap-label-active)'
                          : 'var(--minimap-label-inactive)',
                      fontWeight: isMajor ? 600 : 500,
                    }}
                  >
                    {colToLetter(col)}
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="minimap__labels-left"
            style={{
              left: MINIMAP_CONSTANTS.SCROLL_PADDING,
              top: MINIMAP_CONSTANTS.SCROLL_PADDING + headerHeight,
              height: gridHeight,
            }}
          >
            <div
              className="minimap__labels-left-inner"
              style={{
                transform: `translateY(${-panning.panOffset.y}px)`,
                gridTemplateRows: `repeat(${gridRows}, ${cellSize}px)`,
                rowGap: `${renderGap}px`,
              }}
            >
              {Array.from({ length: gridRows }).map((_, row) => {
                const isMajor = (row + 1) % 5 === 0;
                const isActive = row < rows;
                return (
                  <div
                    key={`row-${row}`}
                    className="minimap__row-header"
                    style={{
                      color: isMajor
                        ? 'var(--minimap-label-major)'
                        : isActive
                          ? 'var(--minimap-label-active)'
                          : 'var(--minimap-label-inactive)',
                      fontWeight: isMajor ? 600 : 500,
                    }}
                  >
                    {row + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content wrapper */}
      <div
        className="minimap__viewport"
        {...panning.panProps}
      >
        <div
          className="minimap__scroll"
          style={{
            padding: `${MINIMAP_CONSTANTS.SCROLL_PADDING}px`,
            transform: `translate(${-panning.panOffset.x}px, ${-panning.panOffset.y}px)`,
          }}
        >
          {/* Field grid disabled to match spec (cleaner grid) */}
          {/* Link lines (Links mode, VG sub-tab) */}
          {/* Link lines removed — Links mode consolidated */}

          {/* Grid with labels */}
          <div
            className="minimap__container"
            style={{
              paddingLeft: labelOffsetX,
              paddingTop: labelOffsetY,
            }}
          >
            {/* Main grid area */}
            <div className="minimap__grid-area">
              {/* Grid cells */}
              <div
                className="minimap__grid"
                style={{
                  width: gridWidth,
                  height: gridHeight,
                }}
              >
                <svg
                  className="minimap__grid-cells"
                  width={gridWidth}
                  height={gridHeight}
                  viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                  aria-hidden="true"
                >
                  {gridCells}
                  <rect
                    x={0.5}
                    y={0.5}
                    width={canvasWidth}
                    height={canvasHeight}
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    className="minimap__grid-outline"
                  />
                </svg>

                <div className="minimap__grid-content" onClick={() => {
                  if (!panning.didPanRef.current) onDeselect?.();
                }}>
                  {/* VG Blocks (VG mode, or subtle outlines in VIEW mode) */}
                  {showVGs && viewGroups.map(vg => {
                    if (!vg.position) return null;
                    const isSelected = selectedVGId === vg.id;
                    const isGhosted = false; // Links mode removed
                    const isSubtle = showViews && showVGs;
                    const isFocused = focusedVG?.id === vg.id;
                    const allowInternals = mapMode === MAP_MODES.LAYOUT && showInternals;
                    const isDimmedByFocus = !!focusedVG && focusedVG.id !== vg.id;
                    const isDimmedBySearch = dimmedVGIds?.has(vg.id) ?? false;

                    return (
                      <VGBlock
                        key={`${vg.id}-${vg.layoutId}`}
                        vg={vg}
                        cellSize={cellSize}
                        gap={renderGap}
                        isSelected={isSelected}
                        isGhosted={isGhosted}
                        showInternals={allowInternals && (!focusedVG || focusedVG?.id === vg.id) && !isFocused}
                        subtle={isSubtle}
                        draggable={!isSubtle}
                        onDragStart={(e) => handleVGDragStart(e, vg)}
                        onDragEnd={handleVGDragEnd}
                        onClick={() => onVGClick(vg.id)}
                        onDoubleClick={() => onVGDoubleClick(vg.id)}
                        isEditMode={isEditMode}
                        onPointerDown={isEditMode ? handleVGPointerDown : undefined}
                        isBeingMoved={movingVG?.vg?.id === vg.id}
                        onRemove={isEditMode ? onRemoveVG : undefined}
                        changeStatus={getChangeStatus(vg.id)}
                        dimmed={isDimmedByFocus || isDimmedBySearch}
                      />
                    );
                  })}

                  {/* Ghost footprint during VG move in edit mode */}
                  {moveGhost && (
                    <div
                      className="minimap__move-ghost"
                      style={{
                        left: moveGhost.col * renderPitch,
                        top: moveGhost.row * renderPitch,
                        width: moveGhost.colSpan * cellSize + (moveGhost.colSpan - 1) * renderGap,
                        height: moveGhost.rowSpan * cellSize + (moveGhost.rowSpan - 1) * renderGap,
                        '--ghost-color': moveGhost.color,
                      }}
                    />
                  )}

                  {/* Ghost outlines for removed VGs in edit mode */}
                  {isEditMode && removedVGGhosts.map(ghost => (
                    <div
                      key={`removed-${ghost.id}`}
                      className="minimap__removed-ghost"
                      style={{
                        left: ghost.position.col * renderPitch,
                        top: ghost.position.row * renderPitch,
                        width: (ghost.position.colSpan || 1) * cellSize + ((ghost.position.colSpan || 1) - 1) * renderGap,
                        height: (ghost.position.rowSpan || 1) * cellSize + ((ghost.position.rowSpan || 1) - 1) * renderGap,
                        '--ghost-color': ghost.color || 'var(--color-text-muted)',
                      }}
                    />
                  ))}

                  {/* Ghost outlines for moved VGs at original positions */}
                  {isEditMode && movedVGGhosts.map((ghost) => (
                    <div
                      key={`moved-ghost-${ghost.id}`}
                      className="minimap__moved-ghost"
                      style={{
                        left: ghost.originalPosition.col * renderPitch,
                        top: ghost.originalPosition.row * renderPitch,
                        width: (ghost.originalPosition.colSpan || 1) * cellSize + ((ghost.originalPosition.colSpan || 1) - 1) * renderGap,
                        height: (ghost.originalPosition.rowSpan || 1) * cellSize + ((ghost.originalPosition.rowSpan || 1) - 1) * renderGap,
                      }}
                    />
                  ))}

                  {/* View Cells (View mode) */}
                  {showViews && flattenedViews.map(view => (
                    <ViewCell
                      key={view.id}
                      view={view}
                      cellSize={cellSize}
                      gap={renderGap}
                      isSelected={selectedVGId === view.vgId}
                      onClick={() => onVGClick(view.vgId)}
                    />
                  ))}

                  {/* Viewport indicators */}
                  {showViewports && (
                    mapMode === MAP_MODES.VIEWPORTS ||
                    mapMode === MAP_MODES.LAYOUT ||
                    mapMode === MAP_MODES.TEAM
                  ) && viewports.map(vp => {
                    if (!vp.position) return null;
                    const vpLeft = vp.position.col * renderPitch;
                    const vpTop = vp.position.row * renderPitch;
                    const vpWidth = vp.size.cols * cellSize + (vp.size.cols - 1) * renderGap;
                    const tooltip = `${vp.name} viewport`;
                    const overlayWidth = Math.min(84, Math.max(24, vpWidth));

                    return (
                      <React.Fragment key={vp.id}>
                        <Tooltip content={tooltip} placement="top" delay={400}>
                          <div
                            className="minimap__overlay-hit minimimap__overlay-hit--viewport"
                            style={{
                              left: vpLeft + 4,
                              top: vpTop + 2,
                              width: overlayWidth,
                              height: 18,
                            }}
                            aria-label={tooltip}
                          />
                        </Tooltip>
                        <ViewportIndicator
                          viewport={vp}
                          cellSize={cellSize}
                          gap={renderGap}
                          isSelected={selectedViewportId === vp.id}
                          onViewportMove={onViewportMove}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* Collaborator viewport indicators */}
                  {showCollaborators && (
                    mapMode === MAP_MODES.VIEWPORTS ||
                    mapMode === MAP_MODES.TEAM
                  ) && collaborators.filter(c => c.isOnline && c.viewport).map(collab => {
                    const vp = collab.viewport;
                    if (!vp) return null;
                    const collabLeft = vp.col * renderPitch;
                    const collabTop = vp.row * renderPitch;
                    const collabWidth = vp.cols * cellSize + (vp.cols - 1) * renderGap;
                    const tooltip = `${collab.name}${collab.isBroadcasting ? ' (Broadcasting)' : ''}`;
                    const overlayLeft = Math.max(0, collabLeft + collabWidth - 28);
                    const overlayTop = Math.max(0, collabTop - 10);

                    return (
                      <React.Fragment key={collab.id}>
                        <Tooltip content={tooltip} placement="top" delay={400}>
                          <div
                            className="minimap__overlay-hit minimimap__overlay-hit--collab"
                            style={{
                              left: overlayLeft,
                              top: overlayTop,
                              width: 24,
                              height: 16,
                            }}
                            aria-label={tooltip}
                          />
                        </Tooltip>
                        <CollaboratorIndicator
                          collaborator={collab}
                          cellSize={cellSize}
                          gap={renderGap}
                          showName={mapMode === MAP_MODES.TEAM}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* Cursor tooltip anchors */}
                  {showCursors && mapMode === MAP_MODES.TEAM && collaboratorsWithCursors.map(collab => {
                    const cursor = collab.cursor;
                    if (!cursor) return null;
                    const cursorLeft = cursor.col * renderPitch + (cursor.colOffset || 0) * cellSize;
                    const cursorTop = cursor.row * renderPitch + (cursor.rowOffset || 0) * cellSize;
                    const tooltip = collab.name;
                    const overlayLeft = Math.max(0, cursorLeft - 6);
                    const overlayTop = Math.max(0, cursorTop - 6);

                    return (
                      <Tooltip key={`cursor-tooltip-${collab.id}`} content={tooltip} placement="top" delay={400}>
                        <div
                          className="minimap__overlay-hit minimimap__overlay-hit--cursor"
                          style={{
                            left: overlayLeft,
                            top: overlayTop,
                            width: 16,
                            height: 16,
                          }}
                          aria-label={tooltip}
                        />
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* Expansion gutters at grid edges */}
              {onExpandCanvas && (
                <ExpansionGutter
                  gridWidth={canvasWidth}
                  gridHeight={canvasHeight}
                  cellSize={cellSize}
                  onExpand={onExpandCanvas}
                  isEditMode={isEditMode}
                  canRemoveRows={canRemoveRows}
                  canRemoveCols={canRemoveCols}
                  canRemoveTop={canRemoveTop}
                  canRemoveBottom={canRemoveBottom}
                  canRemoveLeft={canRemoveLeft}
                  canRemoveRight={canRemoveRight}
                  isVR={isVR}
                />
              )}

              {/* Cursor indicators (overlaid on grid) */}
              {showCursors && mapMode === MAP_MODES.TEAM && (
                <div className="minimap__cursors">
                  {collaboratorsWithCursors.map(collab => (
                    <CursorIndicator
                      key={`cursor-${collab.id}`}
                      collaborator={collab}
                      cellSize={cellSize}
                      gap={renderGap}
                      showName={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drop target indicator — rendered at root level to stay above focused overlay */}
      {dropTarget && (
        <div
          className="minimap__drop-target"
          style={{
            left: MINIMAP_CONSTANTS.SCROLL_PADDING + labelOffsetX + dropTarget.col * renderPitch - panning.panOffset.x,
            top: MINIMAP_CONSTANTS.SCROLL_PADDING + labelOffsetY + dropTarget.row * renderPitch - panning.panOffset.y,
            width: dropTarget.colSpan * cellSize + (dropTarget.colSpan - 1) * renderGap,
            height: dropTarget.rowSpan * cellSize + (dropTarget.rowSpan - 1) * renderGap,
          }}
        />
      )}

      {focusedVG && (
        <VGFocusedView
          focusedVG={focusedVG}
          focusedSlots={focusedSlots}
          focusedLayout={focusedLayout}
          containerWidth={containerWidth || 300}
          containerHeight={containerHeight || 300}
          onSlotDrop={onFocusedVGSlotDrop}
          onSlotClear={onFocusedVGSlotClear}
          onBackToCanvas={onBackFromFocus}
          parseDragPayload={parseDragPayload}
          isViewPayload={isViewPayload}
          quickOps={quickOps}
          onCellDragComplete={onCellDragComplete}
          onCellAssign={onCellAssign}
          onTargetingResolve={onTargetingResolve}
          onApplyTemplate={onApplyTemplate}
          onMergeCells={onMergeCells}
          onSplitCell={onSplitCell}
          onOpenEditor={onOpenEditor}
        />
      )}

      {/* Panning indicator */}
      {panning.canPan && !isFocused && (
        <div className="minimap__pan-hint">
          <Icon name="move" size={12} />
          Drag to pan
        </div>
      )}
    </div>
  );
});

export default Minimap;
