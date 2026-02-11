/**
 * @file CanvasMapContent.jsx
 * @description Canvas Map Panel V2 content component
 *
 * Primary Functions:
 * - Navigate the infinite canvas
 * - Manage ViewGroups (create, edit, merge, split, link)
 * - Visualize and follow collaborators with cursor tracking
 * - Understand linking relationships between VGs and Views
 *
 * V2 Features:
 * - Minimap + companion panel for quick actions
 * - Companion panel for Views & Datasets
 * - Pannable minimap for large canvases
 * - Real-time cursor tracking for collaborators
 */

import React, { memo, useMemo, useRef, useCallback, useState, useEffect } from 'react';

// LocalStorage helper for showImplicitVGs
const IMPLICIT_VGS_KEY = 'cia:canvas-map:showImplicitVGs';
function loadShowImplicitVGs() {
  try {
    const stored = localStorage.getItem(IMPLICIT_VGS_KEY);
    return stored ? JSON.parse(stored) : false;
  } catch { return false; }
}
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { useWorkspacePresence } from '@UI/react/hooks/useRoomPresence';
import { useBookmarks } from '@UI/react/hooks/useBookmarks';
import { useCanvas } from '@UI/react/hooks/useCanvas';
import { useListFilter } from '@UI/react/hooks/useListFilter';

// V2 Components
import { MapToolbar } from './components/MapToolbar';
import { Minimap } from './components/Minimap';
import { CanvasMapBottomPanel } from './components/BottomPanel/CanvasMapBottomPanel';
import { ViewportsPanel, LayoutPanel, TeamPanel } from './components/ContextualPanels';

// Hooks and Utils
import { useCanvasMapState } from './hooks/useCanvasMapState';
import { MAP_MODES, SIZE_MODE_BREAKPOINTS, LAYOUTS } from './utils/constants';
import { formatCellRef, getVGDisplayName } from './utils/gridUtils';
import { addCustomTemplate, createTemplateFromViewGroup, saveServerTemplate } from '@Core/viewgroups/templates';
import { viewGroupManager } from '@Core/data/managers/ViewGroupManager';
import { viewConfigurationManager } from '@Core/data/managers/ViewConfigurationManager';
import { workspaceManager } from '@Core/data/managers/WorkspaceManager';
import { toast } from '@UI/react/store/toastStore';

// Styles - Component styles are imported by each component
import './CanvasMapPanel.scss';

/**
 * CanvasMapContent - V2 Content for the Canvas Map panel
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Workspace ID for loading data
 * @param {string} props.projectId - Project ID for template persistence
 * @param {number} props.width - Current panel width
 * @param {number} props.height - Current panel height
 * @param {string} props.sizeMode - 'compact' | 'standard' | 'expanded'
 */
export const CanvasMapContent = memo(function CanvasMapContent({
  workspaceId,
  projectId,
  width,
  height,
  sizeMode: panelSizeMode,
}) {
  const { isVR } = useAdaptive();
  const canvasMapContext = useCanvasMap();
  const placedVGIds = canvasMapContext?.placedVGIds || [];
  const setPlacedVGs = canvasMapContext?.setPlacedVGs;
  const minimapContainerRef = useRef(null);
  const prevZoomRef = useRef(null);

  // Local state for showing implicit VGs (debug feature)
  const [showImplicitVGs, setShowImplicitVGs] = useState(loadShowImplicitVGs);
  const toggleShowImplicitVGs = useCallback(() => {
    setShowImplicitVGs(prev => {
      const next = !prev;
      try { localStorage.setItem(IMPLICIT_VGS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Load real data from hooks
  // ---------------------------------------------------------------------------

  // Canvas data
  const { canvas, viewport, setCanvasSize } = useCanvas();

  // ViewGroups
  const {
    viewGroups: rawViewGroups,
    visibleViewGroups,
    isLoading: vgLoading,
    createViewGroup,
    updateViewGroup,
    duplicateViewGroup,
    deleteViewGroup,
    syncViewGroupNow,
  } = useViewGroups(workspaceId);

  // Collaborators
  const { users: rawCollaborators } = useWorkspacePresence(workspaceId);

  // Bookmarks
  const {
    bookmarks: rawBookmarks,
    isLoading: bookmarksLoading,
  } = useBookmarks({ workspaceId, scope: 'all' });

  // ---------------------------------------------------------------------------
  // Transform data to match expected structure
  // ---------------------------------------------------------------------------

  // Transform canvas data
  const canvasData = useMemo(() => ({
    rows: canvas?.dimensions?.rows || 4,
    cols: canvas?.dimensions?.cols || 4,
    homePosition: { row: 0, col: 0 }, // TODO: Get from user preferences
  }), [canvas]);

  // Transform ViewGroups to expected structure
  // Use rawViewGroups when showImplicitVGs is enabled, otherwise visibleViewGroups
  const viewGroups = useMemo(() => {
    const sourceVGs = showImplicitVGs ? rawViewGroups : visibleViewGroups;
    return (sourceVGs || []).map(vg => {
      const canvasPosition = vg.getCanvasPosition?.()
        || vg.canvasPosition
        || vg.position
        || (vg.row !== undefined ? {
          row: vg.row,
          col: vg.col,
          rowSpan: vg.rowSpan,
          colSpan: vg.colSpan,
        } : null);
      const resolvedLayoutId = vg.layoutId || vg.layout?.type || 'single';
      const layout = LAYOUTS[resolvedLayoutId] || LAYOUTS.single;

      const normalizedPosition = canvasPosition
        ? {
          row: canvasPosition.row ?? 0,
          col: canvasPosition.col ?? 0,
          rowSpan: canvasPosition.rowSpan ?? layout.rows ?? 1,
          colSpan: canvasPosition.colSpan ?? layout.cols ?? 1,
        }
        : null;

      return ({
        id: vg.id,
        name: vg.name,
        color: vg.color || '#a855f7',
        isExplicit: !!vg.name,
        isActive: normalizedPosition?.row !== undefined && normalizedPosition?.col !== undefined,
        isLinked: !!vg.link,
        isShared: vg.isShared ?? (vg.sharedWith?.length > 0),
        isStarred: vg.isStarred ?? vg.starred ?? false,
        layoutId: resolvedLayoutId,
        type: resolvedLayoutId,
        tags: vg.tags || [],
        position: normalizedPosition,
        views: (vg.views || vg.getViews?.() || vg.slots || [])
          .filter((view) => view && (view.id || view.viewId))
          .map((view) => ({
            id: view.id || view.viewId,
            name: view.name || view.viewName,
            type: view.type || view.viewType,
            datasetId: view.datasetId,
            datasetName: view.datasetName,
          })),
        link: vg.link,
      });
    });
  }, [showImplicitVGs, rawViewGroups, visibleViewGroups]);

  useEffect(() => {
    if (!setCanvasSize) return;
    let maxRow = canvasData.rows;
    let maxCol = canvasData.cols;

    viewGroups.forEach((vg) => {
      if (!vg.position) return;
      const bottomEdge = (vg.position.row ?? 0) + (vg.position.rowSpan ?? 1);
      const rightEdge = (vg.position.col ?? 0) + (vg.position.colSpan ?? 1);
      if (bottomEdge > maxRow) maxRow = bottomEdge;
      if (rightEdge > maxCol) maxCol = rightEdge;
    });

    if (maxRow > canvasData.rows || maxCol > canvasData.cols) {
      setCanvasSize({ rows: maxRow, cols: maxCol });
    }
  }, [canvasData.cols, canvasData.rows, setCanvasSize, viewGroups]);

  const vgTypeCategories = useMemo(() => ([
    {
      id: 'layout',
      label: 'Layout',
      icon: 'grid3x3',
      types: Object.keys(LAYOUTS).map((layoutId) => ({
        id: layoutId,
        label: layoutId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    },
  ]), []);

  const vgQuickFilters = useMemo(() => ([
    { id: 'active', label: 'Active', icon: 'checkCircle', predicate: (vg) => vg.isActive },
    { id: 'linked', label: 'Linked', icon: 'link2', predicate: (vg) => vg.isLinked },
    { id: 'shared', label: 'Shared', icon: 'share2', predicate: (vg) => vg.isShared },
    { id: 'starred', label: 'Starred', icon: 'star', predicate: (vg) => vg.isStarred },
  ]), []);

  const vgSortOptions = useMemo(() => ([
    {
      value: 'position',
      label: 'Position (A1->)',
      shortLabel: 'Position',
      icon: 'grid3x3',
      comparator: (a, b) => {
        const ap = (a.position?.row ?? 99) * 100 + (a.position?.col ?? 99);
        const bp = (b.position?.row ?? 99) * 100 + (b.position?.col ?? 99);
        return ap - bp;
      },
    },
    {
      value: 'name-asc',
      label: 'Name (A->Z)',
      shortLabel: 'Name',
      icon: 'sort',
      comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      value: 'name-desc',
      label: 'Name (Z->A)',
      shortLabel: 'Name',
      icon: 'sort',
      comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
    },
  ]), []);

  const viewGroupTags = useMemo(
    () => Array.from(new Set(viewGroups.flatMap((vg) => vg.tags || []))).filter(Boolean),
    [viewGroups]
  );

  const vgFilter = useListFilter({
    searchFields: (vg) => [
      getVGDisplayName(vg),
      ...(vg.views || []).map((v) => v.name || ''),
    ],
    quickFilterDefs: vgQuickFilters,
    sortOptions: vgSortOptions,
    persistKey: workspaceId ? `canvasmap-vg-filters:${workspaceId}` : null,
  });

  const filteredViewGroups = useMemo(
    () => vgFilter.applyFilters(viewGroups),
    [viewGroups, vgFilter.applyFilters]
  );

  const quickFilterCounts = useMemo(() => {
    return vgQuickFilters.reduce((acc, def) => {
      acc[def.id] = viewGroups.filter(def.predicate).length;
      return acc;
    }, {});
  }, [viewGroups, vgQuickFilters]);

  // Get inactive VGs (no position)
  const inactiveVGs = useMemo(() => {
    return viewGroups.filter(vg => !vg.position);
  }, [viewGroups]);

  // Get active VGs (have position)
  const activeViewGroups = useMemo(() => {
    return viewGroups.filter(vg => vg.position);
  }, [viewGroups]);

  const filteredActiveViewGroups = useMemo(() => {
    return filteredViewGroups.filter(vg => vg.position);
  }, [filteredViewGroups]);

  const filteredInactiveVGs = useMemo(() => {
    return filteredViewGroups.filter(vg => !vg.position);
  }, [filteredViewGroups]);

  const activeVGIds = useMemo(
    () => activeViewGroups.map((vg) => vg.id),
    [activeViewGroups]
  );

  useEffect(() => {
    if (!setPlacedVGs) return;
    if (
      placedVGIds.length === activeVGIds.length &&
      placedVGIds.every((id, idx) => id === activeVGIds[idx])
    ) {
      return;
    }
    setPlacedVGs(activeVGIds);
  }, [activeVGIds, placedVGIds, setPlacedVGs]);

  // Transform viewports from canvas viewport
  const viewports = useMemo(() => {
    if (!viewport) return [];
    return [{
      id: 'primary',
      name: 'Main',
      position: { row: viewport.row || 0, col: viewport.col || 0 },
      size: { rows: viewport.rows || 3, cols: viewport.cols || 3 },
      mode: 'snap',
      isPrimary: true,
    }];
  }, [viewport]);

  const [customViewports, setCustomViewports] = useState([]);
  const [selectedViewportId, setSelectedViewportId] = useState(null);
  const [workspaceLabel, setWorkspaceLabel] = useState(null);

  useEffect(() => {
    if (viewports.length === 0) return;
    setCustomViewports((prev) => (prev.length ? prev : viewports));
    setSelectedViewportId((prev) => prev ?? viewports[0]?.id ?? null);
  }, [viewports]);


  useEffect(() => {
    if (!workspaceId) {
      setWorkspaceLabel(null);
      return undefined;
    }

    const updateLabel = () => {
      const ws = workspaceManager.getWorkspace(workspaceId);
      setWorkspaceLabel(ws?.name || null);
    };

    updateLabel();
    const unsubscribe = workspaceManager.subscribe(updateLabel);
    return unsubscribe;
  }, [workspaceId]);

  const workspaceDisplayName = useMemo(() => {
    if (!workspaceId) return null;
    if (workspaceLabel) return workspaceLabel;
    const shortId = workspaceId.slice(0, 8);
    return `Workspace ${shortId}`;
  }, [workspaceId, workspaceLabel]);


  const currentViewport = customViewports.find((vp) => vp.id === selectedViewportId) || customViewports[0];
  const currentPosition = currentViewport?.position || { row: 0, col: 0 };
  const currentPositionLabel = formatCellRef(currentPosition.row, currentPosition.col);
  const isAtHome =
    currentPosition.row === canvasData.homePosition.row &&
    currentPosition.col === canvasData.homePosition.col;

  // Transform collaborators to expected structure
  const baseCollaborators = useMemo(() => {
    return (rawCollaborators || []).map(user => ({
      id: user.id,
      name: user.name || user.email || 'Unknown',
      avatar: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U',
      color: user.color || '#22c55e',
      viewport: user.position ? {
        row: user.position.row || 0,
        col: user.position.col || 0,
        rows: 2,
        cols: 2,
      } : null,
      cursor: user.cursor ? {
        row: user.cursor.row || 0,
        col: user.cursor.col || 0,
        rowOffset: user.cursor.rowOffset || 0.5,
        colOffset: user.cursor.colOffset || 0.5,
      } : null,
      isBroadcasting: user.isBroadcasting || false,
      isOnline: true,
    }));
  }, [rawCollaborators]);

  // Extract VG links from ViewGroups
  const vgLinks = useMemo(() => {
    const links = [];
    activeViewGroups.forEach(vg => {
      if (vg.link) {
        links.push({
          id: `vgl-${vg.id}`,
          from: vg.link.originatorGroupId,
          to: vg.link.targetGroupId,
          type: vg.link.properties?.includes('camera') ? 'camera' : 'data',
          mode: vg.link.linkMode || 'bidirectional',
        });
      }
    });
    return links;
  }, [activeViewGroups]);

  const minimapVgLinks = useMemo(() => {
    const visibleIds = new Set(filteredActiveViewGroups.map(vg => vg.id));
    return vgLinks.filter(link => visibleIds.has(link.from) && visibleIds.has(link.to));
  }, [vgLinks, filteredActiveViewGroups]);

  // View links (placeholder)
  const viewLinks = useMemo(() => [], []);

  // Transform bookmarks
  const bookmarks = useMemo(() => {
    return (rawBookmarks || []).map(bm => ({
      id: bm.id,
      name: bm.name,
      position: bm.cameraState?.position || { row: 0, col: 0 },
      isStarred: bm.isStarred,
      isPinned: bm.isPinned,
    }));
  }, [rawBookmarks]);

  const [minimapResetSignal, setMinimapResetSignal] = useState(0);

  const handleResetMinimapView = useCallback(() => {
    setMinimapResetSignal((prev) => prev + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize state from hook
  // ---------------------------------------------------------------------------

  const state = useCanvasMapState({
    canvas: canvasData,
    viewGroups: activeViewGroups,
    inactiveVGs,
    viewports: customViewports,
    collaborators: baseCollaborators,
    vgLinks,
    viewLinks,
    bookmarks,
    callbacks: {},
  });

  const filteredActiveIds = useMemo(() => {
    return new Set(filteredActiveViewGroups.map(vg => vg.id));
  }, [filteredActiveViewGroups]);

  const filteredFlattenedViews = useMemo(() => {
    return (state.flattenedViews || []).filter(view => filteredActiveIds.has(view.vgId));
  }, [state.flattenedViews, filteredActiveIds]);

  const collaborators = useMemo(() => {
    return baseCollaborators.map((collab) => ({
      ...collab,
      showCursor: state.collaboratorCursorVisibility?.[collab.id] ?? true,
    }));
  }, [baseCollaborators, state.collaboratorCursorVisibility]);

  const focusedSlots = useMemo(() => {
    if (!state.focusedVGId) return null;
    const group = viewGroupManager.getViewGroup(state.focusedVGId);
    if (!group) return null;
    const capacity = group.getLayoutCapacity?.() || group.slots?.length || 0;
    const slots = Array.from({ length: capacity }, (_, index) => {
      const slot = group.getSlotAt?.(index) || group.slots?.find((s) => s.position === index);
      if (!slot || slot.isEmpty?.()) return null;
      return {
        id: slot.viewId,
        name: slot.viewName,
        type: slot.viewType,
        datasetId: slot.datasetId || null,
        datasetName: slot.datasetName || null,
      };
    });
    return slots;
  }, [state.focusedVGId, rawViewGroups]);

  useEffect(() => {
    if (!state.setMinimapZoom) return;
    if (state.focusedVGId && state.focusedVG?.position) {
      if (prevZoomRef.current === null) {
        prevZoomRef.current = state.minimapZoom;
      }
      const targetZoom = Math.max(state.minimapZoom, 140);
      if (targetZoom !== state.minimapZoom) {
        state.setMinimapZoom(targetZoom);
      }
      return;
    }
    if (prevZoomRef.current !== null) {
      state.setMinimapZoom(prevZoomRef.current);
      prevZoomRef.current = null;
    }
  }, [state.focusedVGId, state.focusedVG, state.minimapZoom, state.setMinimapZoom]);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [followingUser, setFollowingUser] = useState(null);

  // ---------------------------------------------------------------------------
  // Action Handlers (placeholder implementations)
  // ---------------------------------------------------------------------------

  const handleGoHome = useCallback(() => {
    console.log('Go to home position');
    // TODO: Implement navigation to home position
  }, []);

  const handleSetHome = useCallback(() => {
    console.log('Set home position');
    // TODO: Implement setting home position
  }, []);

  const handleFitAll = useCallback(() => {
    console.log('Fit all content');
    // TODO: Implement fit all
  }, []);

  const handleAddBookmark = useCallback(() => {
    console.log('Add bookmark');
    // TODO: Implement add bookmark
  }, []);

  const handleBookmarkClick = useCallback((bookmark) => {
    console.log('Navigate to bookmark:', bookmark);
    // TODO: Implement bookmark navigation
  }, []);

  const handleBookmarkDelete = useCallback((bookmarkId) => {
    console.log('Delete bookmark:', bookmarkId);
    // TODO: Implement bookmark deletion
  }, []);

  const handleAddVG = useCallback(async () => {
    // Check prerequisites
    if (!workspaceId) {
      toast.warning('No workspace selected. Please select a workspace first.');
      console.error('[handleAddVG] Cannot create VG: No workspaceId provided');
      return;
    }

    // UUID validation regex - workspaces need server-assigned IDs to persist VGs
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(workspaceId)) {
      toast.warning('Workspace is still syncing. Please wait a moment and try again.');
      console.warn(`[handleAddVG] Workspace "${workspaceId}" is not yet synced (not a UUID). Waiting for server confirmation.`);
      return;
    }

    if (!createViewGroup || !updateViewGroup) {
      toast.error('ViewGroup operations are not available.');
      console.error('[handleAddVG] ViewGroup operations not available (createViewGroup or updateViewGroup is null)');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleAddVG] Creating ViewGroup...', { workspaceId });
    }

    try {
      // Find the first available position on the canvas
      const occupiedCells = new Set(
        activeViewGroups.map(vg => `${vg.position?.row ?? 0}-${vg.position?.col ?? 0}`)
      );

      let targetRow = 0;
      let targetCol = 0;
      for (let r = 0; r < canvasData.rows; r++) {
        for (let c = 0; c < canvasData.cols; c++) {
          if (!occupiedCells.has(`${r}-${c}`)) {
            targetRow = r;
            targetCol = c;
            break;
          }
        }
        if (!occupiedCells.has(`${targetRow}-${targetCol}`)) break;
      }

      // Generate a unique name
      const existingCount = viewGroups.length;
      const newName = `ViewGroup ${existingCount + 1}`;

      // Create the ViewGroup
      const created = await createViewGroup('single', null);
      if (!created) {
        toast.error('Failed to create ViewGroup.');
        console.error('[handleAddVG] createViewGroup returned null/undefined');
        return;
      }

      // Update with name and position (makes it visible in UI)
      const layout = LAYOUTS[created.layoutId || 'single'] || LAYOUTS.single;
      await updateViewGroup(created.id, {
        name: newName,
        canvasPosition: {
          row: targetRow,
          col: targetCol,
          rowSpan: layout.rows || 1,
          colSpan: layout.cols || 1,
        },
      });
      if (syncViewGroupNow) {
        await syncViewGroupNow(created.id);
      }

      toast.success(`Created "${newName}"`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[handleAddVG] Success! Created ViewGroup "${newName}" at position (${targetRow}, ${targetCol})`);
      }

      window.dispatchEvent(new CustomEvent('cia:open-vg-editor', {
        detail: {
          viewGroup: {
            id: created.id,
            name: newName,
            color: created.color,
            layoutId: created.layoutId || 'single',
            views: [],
          },
          isNewVG: false,
        },
      }));
    } catch (err) {
      toast.error(`Failed to create ViewGroup: ${err.message}`);
      console.error('[handleAddVG] Failed to create ViewGroup:', err);
    }
  }, [workspaceId, createViewGroup, updateViewGroup, activeViewGroups, canvasData, viewGroups]);

  const findNextOpenCell = useCallback(() => {
    const occupied = new Set(
      activeViewGroups.map(vg => `${vg.position?.row ?? 0}-${vg.position?.col ?? 0}`)
    );
    for (let r = 0; r < canvasData.rows; r += 1) {
      for (let c = 0; c < canvasData.cols; c += 1) {
        if (!occupied.has(`${r}-${c}`)) {
          return { row: r, col: c };
        }
      }
    }
    return { row: 0, col: 0 };
  }, [activeViewGroups, canvasData.cols, canvasData.rows]);

  const handleAdjustRows = useCallback((delta) => {
    if (!setCanvasSize || !canvasData) return;
    const newRows = Math.max(1, canvasData.rows + delta);
    setCanvasSize({ rows: newRows, cols: canvasData.cols });
  }, [setCanvasSize, canvasData]);

  const handleAdjustCols = useCallback((delta) => {
    if (!setCanvasSize || !canvasData) return;
    const newCols = Math.max(1, canvasData.cols + delta);
    setCanvasSize({ rows: canvasData.rows, cols: newCols });
  }, [setCanvasSize, canvasData]);

  const handleCanvasDrop = useCallback(async ({ row, col, data }) => {
    if (!data) return;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const rectsOverlap = (a, b) => (
      a.row < b.row + b.rowSpan
      && a.row + a.rowSpan > b.row
      && a.col < b.col + b.colSpan
      && a.col + a.colSpan > b.col
    );

    const findFirstFit = (rowSpan, colSpan, ignoreId, startRow, startCol) => {
      const rows = canvasData.rows;
      const cols = canvasData.cols;
      const candidates = [];
      for (let r = 0; r <= rows - rowSpan; r += 1) {
        for (let c = 0; c <= cols - colSpan; c += 1) {
          candidates.push({ row: r, col: c });
        }
      }
      // Start search from requested spot, then wrap around.
      const startIndex = candidates.findIndex(
        (pos) => pos.row === startRow && pos.col === startCol
      );
      const ordered = startIndex >= 0
        ? [...candidates.slice(startIndex), ...candidates.slice(0, startIndex)]
        : candidates;
      for (const pos of ordered) {
        const proposed = { row: pos.row, col: pos.col, rowSpan, colSpan };
        const overlaps = activeViewGroups.some((vg) => {
          if (vg.id === ignoreId || !vg.position) return false;
          return rectsOverlap(proposed, vg.position);
        });
        if (!overlaps) return pos;
      }
      return null;
    };

    if (data.type === 'vg-place') {
      const targetVG = rawViewGroups.find((vg) => vg.id === data.vgId);
      if (!targetVG || !updateViewGroup) return;

      const layoutId = targetVG.layoutId || targetVG.layout?.type || 'single';
      const layout = LAYOUTS[layoutId] || LAYOUTS.single;
      const position = targetVG.canvasPosition || targetVG.position || {};
      const rowSpan = position.rowSpan || layout.rows || 1;
      const colSpan = position.colSpan || layout.cols || 1;
      const maxRow = Math.max(0, canvasData.rows - rowSpan);
      const maxCol = Math.max(0, canvasData.cols - colSpan);
      const clampedRow = clamp(row, 0, maxRow);
      const clampedCol = clamp(col, 0, maxCol);
      const candidate = findFirstFit(rowSpan, colSpan, targetVG.id, clampedRow, clampedCol);
      const placeRow = candidate ? candidate.row : canvasData.rows;
      const placeCol = candidate ? candidate.col : 0;

      try {
        const nextRows = Math.max(canvasData.rows, placeRow + rowSpan);
        const nextCols = Math.max(canvasData.cols, placeCol + colSpan);
        if (setCanvasSize && (nextRows !== canvasData.rows || nextCols !== canvasData.cols)) {
          setCanvasSize({ rows: nextRows, cols: nextCols });
        }
        await updateViewGroup(targetVG.id, {
          canvasPosition: { row: placeRow, col: placeCol, rowSpan, colSpan },
        });
        if (syncViewGroupNow) {
          await syncViewGroupNow(targetVG.id);
        }
      } catch (err) {
        console.error('Failed to place ViewGroup:', err);
      }
      return;
    }

    if (data.type === 'template-create') {
      if (!createViewGroup || !updateViewGroup) return;

      try {
        const created = await createViewGroup(data.layoutId || 'single', data.templateId || null);
        if (!created) return;
        const layout = LAYOUTS[created.layoutId || data.layoutId || 'single'] || LAYOUTS.single;
        const rowSpan = layout.rows || 1;
        const colSpan = layout.cols || 1;
        const maxRow = Math.max(0, canvasData.rows - rowSpan);
        const maxCol = Math.max(0, canvasData.cols - colSpan);
        const clampedRow = clamp(row, 0, maxRow);
        const clampedCol = clamp(col, 0, maxCol);
        const candidate = findFirstFit(rowSpan, colSpan, null, clampedRow, clampedCol);
        const placeRow = candidate ? candidate.row : canvasData.rows;
        const placeCol = candidate ? candidate.col : 0;
        const nextRows = Math.max(canvasData.rows, placeRow + rowSpan);
        const nextCols = Math.max(canvasData.cols, placeCol + colSpan);
        if (setCanvasSize && (nextRows !== canvasData.rows || nextCols !== canvasData.cols)) {
          setCanvasSize({ rows: nextRows, cols: nextCols });
        }
        await updateViewGroup(created.id, {
          name: data.templateName || created.name,
          color: data.color || created.color,
          canvasPosition: {
            row: placeRow,
            col: placeCol,
            rowSpan,
            colSpan,
          },
        });
        if (syncViewGroupNow) {
          await syncViewGroupNow(created.id);
        }
      } catch (err) {
        console.error('Failed to create ViewGroup from template:', err);
      }
    }
  }, [rawViewGroups, createViewGroup, updateViewGroup, activeViewGroups, canvasData, setCanvasSize, syncViewGroupNow]);

  const handleVGDoubleClick = useCallback((vgId) => {
    state.handleVGDoubleClick(vgId);
  }, [state]);

  const handleDeleteVG = useCallback(async (vgId) => {
    if (!vgId || !deleteViewGroup) return;
    const target = viewGroups.find((vg) => vg.id === vgId);
    const name = target?.name || 'ViewGroup';
    const confirmed = window.confirm(`Delete "${name}"?`);
    if (!confirmed) return;
    try {
      await deleteViewGroup(vgId);
      toast.success(`Deleted "${name}"`);
    } catch (err) {
      toast.error(`Failed to delete "${name}"`);
      console.error('Failed to delete ViewGroup:', err);
    }
  }, [deleteViewGroup, viewGroups]);

  const handleFocusedVGRename = useCallback(async (newName) => {
    if (!state.focusedVGId || !updateViewGroup) return;
    if (!newName?.trim()) return;
    try {
      await updateViewGroup(state.focusedVGId, { name: newName.trim() });
      if (syncViewGroupNow) {
        await syncViewGroupNow(state.focusedVGId);
      }
    } catch (err) {
      toast.error('Failed to rename ViewGroup');
      console.error('Failed to rename ViewGroup:', err);
    }
  }, [state.focusedVGId, updateViewGroup, syncViewGroupNow]);

  const handleFocusedVGSlotDrop = useCallback(async (slotIndex, data) => {
    if (!state.focusedVGId || !data) return;
    const group = viewGroupManager.getViewGroup(state.focusedVGId);
    if (!group) return;
    const capacity = group.getLayoutCapacity?.() || group.slots?.length || 0;
    if (slotIndex < 0 || slotIndex >= capacity) return;

    const ensureSync = async () => {
      if (syncViewGroupNow) {
        await syncViewGroupNow(group.id);
      }
    };

    if (data.type === 'vg-import') {
      const emptySlots = group.slots
        ?.filter((slot) => slot?.isEmpty?.())
        .map((slot) => slot.position) || [];
      const viewsToAdd = (data.views || []).filter(Boolean).slice(0, emptySlots.length);

      for (let i = 0; i < viewsToAdd.length; i += 1) {
        const view = viewsToAdd[i];
        const viewId = view.id || view.viewId;
        if (!viewId) continue;
        const viewName = view.name || view.viewName;
        const viewType = view.type || view.viewType;
        await viewGroupManager.setViewAtSlot(group.id, emptySlots[i], viewId, viewName, viewType, view.datasetId || null);
      }
      await ensureSync();
      return;
    }

    if (data.type === 'dataset' || (data.datasetId && !data.view && !data.viewId)) {
      if (!viewConfigurationManager?.createView) return;
      try {
        const newView = await viewConfigurationManager.createView(data.datasetId, {
          name: data.name ? `${data.name} View` : 'Untitled View',
          fileType: data.fileType,
        });
        if (!newView?.id) return;
        await viewGroupManager.setViewAtSlot(
          group.id,
          slotIndex,
          newView.id,
          newView.name,
          newView.type,
          newView.datasetId || data.datasetId || null
        );
        await ensureSync();
      } catch (err) {
        console.error('Failed to create view from dataset:', err);
        toast.error('Failed to create view from dataset');
      }
      return;
    }

    const viewData = data.view || data;
    const viewId = viewData.id || viewData.viewId;
    if (!viewId) return;
    const viewName = viewData.name || viewData.viewName;
    const viewType = viewData.type || viewData.viewType;
    const datasetId = viewData.datasetId || data.datasetId || null;

    const existingSlot = group.findSlotByViewId?.(viewId);
    if (existingSlot && existingSlot.position !== slotIndex) {
      await viewGroupManager.removeViewFromGroup(group.id, viewId);
    }

    await viewGroupManager.setViewAtSlot(group.id, slotIndex, viewId, viewName, viewType, datasetId);
    await ensureSync();
  }, [state.focusedVGId, syncViewGroupNow]);

  const handleFocusedVGSlotClear = useCallback(async (slotIndex) => {
    if (!state.focusedVGId) return;
    const group = viewGroupManager.getViewGroup(state.focusedVGId);
    if (!group) return;
    const slot = group.getSlotAt?.(slotIndex);
    if (!slot || slot.isEmpty?.()) return;
    try {
      await viewGroupManager.removeViewFromGroup(group.id, slot.viewId);
      if (syncViewGroupNow) {
        await syncViewGroupNow(group.id);
      }
    } catch (err) {
      console.error('Failed to remove view from slot:', err);
      toast.error('Failed to remove view');
    }
  }, [state.focusedVGId, syncViewGroupNow]);

  const handleMove = useCallback((direction) => {
    const delta = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    }[direction];

    if (!delta) return;

    setCustomViewports((prev) =>
      prev.map((vp) => {
        if (vp.id !== selectedViewportId) return vp;
        const nextRow = Math.max(0, vp.position.row + delta.row);
        const nextCol = Math.max(0, vp.position.col + delta.col);
        const maxRow = Math.max(0, canvasData.rows - vp.size.rows);
        const maxCol = Math.max(0, canvasData.cols - vp.size.cols);
        return {
          ...vp,
          position: {
            ...vp.position,
            row: Math.min(nextRow, maxRow),
            col: Math.min(nextCol, maxCol),
          },
        };
      })
    );
  }, [canvasData.cols, canvasData.rows, selectedViewportId]);

  const handleViewportClick = useCallback((viewportId) => {
    setSelectedViewportId(viewportId);
    state.handleViewportClick(viewportId);
  }, [state]);

  const handleVGRestore = useCallback(async (vgId) => {
    if (!vgId || !updateViewGroup) return;
    const target = rawViewGroups.find((vg) => vg.id === vgId);
    if (!target) return;
    const { row, col } = findNextOpenCell();
    try {
      await updateViewGroup(vgId, {
        canvasPosition: { row, col, rowSpan: 1, colSpan: 1 },
      });
    } catch (err) {
      console.error('Failed to restore ViewGroup:', err);
    }
  }, [rawViewGroups, updateViewGroup, findNextOpenCell]);

  const handleDuplicateVG = useCallback(async (vgId) => {
    if (!vgId || !duplicateViewGroup || !updateViewGroup) return;
    try {
      const data = await duplicateViewGroup(vgId, { linkOption: 'none' });
      const created = data?.viewGroup || data;
      if (!created?.id) return;
      const { row, col } = findNextOpenCell();
      await updateViewGroup(created.id, {
        canvasPosition: { row, col, rowSpan: 1, colSpan: 1 },
      });
    } catch (err) {
      console.error('Failed to duplicate ViewGroup:', err);
    }
  }, [duplicateViewGroup, updateViewGroup, findNextOpenCell]);

  const handleOpenEditor = useCallback((vg) => {
    if (!vg?.id) return;
    const source = viewGroupManager.getViewGroup(vg.id) || vg;
    window.dispatchEvent(new CustomEvent('cia:open-vg-editor', {
      detail: { viewGroup: source, isNewVG: false },
    }));
  }, []);

  useEffect(() => {
    const handleGoto = (event) => {
      const vgId = event?.detail?.viewGroupId;
      if (!vgId) return;
      state.handleVGClick(vgId);
      if (state.mapMode !== MAP_MODES.LAYOUT) {
        state.setMapMode?.(MAP_MODES.LAYOUT);
      }
    };

      const handleTemplateCreate = async (event) => {
        const detail = event?.detail || {};
        if (!createViewGroup || !updateViewGroup) return;
        try {
          const created = await createViewGroup(detail.layoutId || 'single', detail.templateId || null);
          if (!created) return;
          const { row, col } = findNextOpenCell();
          await updateViewGroup(created.id, {
            name: detail.templateName || created.name,
            color: detail.color || created.color,
            canvasPosition: { row, col, rowSpan: 1, colSpan: 1 },
          });
          if (detail.openEditor) {
            window.dispatchEvent(new CustomEvent('cia:open-vg-editor', {
              detail: { viewGroup: created, isNewVG: false },
            }));
          }
        } catch (err) {
          console.error('Failed to create ViewGroup from template:', err);
        }
      };

    window.addEventListener('cia:goto-viewgroup', handleGoto);
    window.addEventListener('cia:create-vg-from-template', handleTemplateCreate);
    return () => {
      window.removeEventListener('cia:goto-viewgroup', handleGoto);
      window.removeEventListener('cia:create-vg-from-template', handleTemplateCreate);
    };
  }, [
    createViewGroup,
    updateViewGroup,
    findNextOpenCell,
    state.handleVGClick,
    state.mapMode,
    state.setMapMode,
  ]);

  const handleAddViewport = useCallback(() => {
    const nextId = `vp-${Date.now()}`;
    setCustomViewports((prev) => {
      const base = prev.find((vp) => vp.id === selectedViewportId) || prev[0];
      const seed = base || {
        id: 'primary',
        name: 'Main',
        position: { row: 0, col: 0 },
        size: { rows: 3, cols: 3 },
        mode: 'snap',
        isPrimary: true,
      };
      const nextViewport = {
        ...seed,
        id: nextId,
        name: `Viewport ${prev.length + 1}`,
        isPrimary: false,
        position: {
          ...seed.position,
          col: Math.min(seed.position.col + 1, Math.max(0, canvasData.cols - seed.size.cols)),
        },
      };
      return [...prev, nextViewport];
    });
    setSelectedViewportId(nextId);
  }, [canvasData.cols, selectedViewportId]);

  const handleDeleteViewport = useCallback((viewportId) => {
    setCustomViewports((prev) => {
      const next = prev.filter((vp) => vp.id !== viewportId);
      if (next.length === 0) return prev;
      setSelectedViewportId((current) =>
        current === viewportId ? next[0]?.id ?? null : current
      );
      return next;
    });
  }, []);

  const handleSetPrimaryViewport = useCallback((viewportId) => {
    setCustomViewports((prev) =>
      prev.map((vp) => ({ ...vp, isPrimary: vp.id === viewportId }))
    );
    setSelectedViewportId(viewportId);
  }, []);

  const handleFollowViewport = useCallback((viewportId) => {
    console.log('Follow viewport:', viewportId);
    // TODO: Implement viewport follow controls
  }, []);

  const handleSaveTemplate = useCallback(async (scope = 'personal') => {
    if (!state.focusedVG) {
      toast.error('Select a ViewGroup to save as a template.');
      return;
    }
    const template = createTemplateFromViewGroup(state.focusedVG, {
      name: `${getVGDisplayName(state.focusedVG)} Template`,
      scope,
    });
    if (projectId || workspaceId) {
      const saved = await saveServerTemplate({ projectId, workspaceId, template, scope });
      if (saved) {
        toast.success(`Saved template: ${saved.name}`);
        return;
      }
    }
    addCustomTemplate(template);
    toast.success(`Saved template locally: ${template.name}`);
  }, [projectId, state.focusedVG, workspaceId]);

  const handleFollow = useCallback((userId) => {
    const user = collaborators.find((collab) => collab.id === userId);
    setFollowingUser(user ? { id: user.id, name: user.name, color: user.color } : null);
    console.log('Follow user:', userId);
    // TODO: Implement following
  }, [collaborators]);

  const handleStopFollowing = useCallback(() => {
    setFollowingUser(null);
    console.log('Stop following');
  }, []);

  const handleLocate = useCallback((userId) => {
    console.log('Locate user:', userId);
    // TODO: Implement user location
  }, []);

  const handleJoinVoice = useCallback(() => {
    console.log('Join voice');
    // TODO: Implement join voice
  }, []);

  const handleInvite = useCallback(() => {
    console.log('Invite team');
    // TODO: Implement team invite
  }, []);

  const handleStartBroadcast = useCallback(() => {
    setIsBroadcasting(true);
    console.log('Start broadcasting');
    // TODO: Implement broadcast start
  }, []);

  const handleStopBroadcast = useCallback(() => {
    setIsBroadcasting(false);
    console.log('Stop broadcasting');
    // TODO: Implement broadcast stop
  }, []);

  const QUICK_NAV_WIDTH = 40;
  const MINIMAP_PADDING = 8;

  const effectiveWidth = width;
  const effectiveSizeMode = (() => {
    if (!Number.isFinite(effectiveWidth)) return panelSizeMode || 'standard';
    if (effectiveWidth < SIZE_MODE_BREAKPOINTS.compact) return 'compact';
    if (effectiveWidth >= SIZE_MODE_BREAKPOINTS.expanded) return 'expanded';
    return 'standard';
  })();

  const isCompact = effectiveSizeMode === 'compact';

  // Calculate available heights
  const headerHeight = state.focusedVGId ? 40 : 0;
  const toolbarVG = state.focusedVG || viewGroups.find((vg) => vg.id === state.selectedVGId);
  const tabsHeight = 40;
  const toolbarHeight = 40;
  const chromeHeight = headerHeight + tabsHeight + toolbarHeight;
  const contentHeight = Math.max(0, height - chromeHeight);

  const isShort = height < 520;
  const minContextualHeight = isCompact ? 180 : (isShort ? 200 : 220);
  const minMinimapHeight = isShort ? 80 : 110;
  const minimapShare = isCompact ? 0.4 : (isShort ? 0.45 : 0.55);

  const contextualFloor = Math.min(
    minContextualHeight,
    Math.max(80, contentHeight - minMinimapHeight)
  );
  const maxMinimapHeight = Math.max(60, contentHeight - contextualFloor);
  const targetMinimapHeight = Math.floor(contentHeight * minimapShare);

  const minimapHeight = Math.max(
    60,
    Math.min(maxMinimapHeight, Math.max(minMinimapHeight, targetMinimapHeight))
  );
  const contextualHeight = Math.max(80, contentHeight - minimapHeight);
  const densityMode = isShort || isCompact ? 'dense' : 'standard';

  // Calculate minimap container dimensions (after minimapHeight is calculated)
  const quickNavWidth = state.toolbarPosition ? QUICK_NAV_WIDTH : 0;
  const minimapWidth = Math.max(0, width - quickNavWidth - MINIMAP_PADDING * 2);
  const minimapInnerHeight = Math.max(0, minimapHeight - MINIMAP_PADDING * 2);

  // ---------------------------------------------------------------------------
  // Loading and empty states
  // ---------------------------------------------------------------------------

  if (vgLoading) {
    return (
      <div className="canvas-map-v2" data-vr={isVR} data-size-mode={effectiveSizeMode}>
        <div className="canvas-map-v2__loading">
          Loading canvas data...
        </div>
        <div className="canvas-map-v2__loading-footer">
          <Icon name="layers" size={12} />
          <span>
            Workspace: {workspaceDisplayName || 'Unknown'}
          </span>
        </div>
      </div>
    );
  }

  // Show helpful message when no workspace is selected
  if (!workspaceId) {
    return (
      <div className="canvas-map-v2" data-vr={isVR} data-size-mode={effectiveSizeMode}>
        <div className="canvas-map-v2__empty-state">
          <Icon name="map" size={32} />
          <p>No workspace selected</p>
          <span>Select or create a workspace to view the canvas map</span>
        </div>
      </div>
    );
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    const implicitCount = rawViewGroups?.filter(vg => !vg.name && !vg.isExplicit)?.length || 0;
    const explicitCount = rawViewGroups?.filter(vg => vg.name || vg.isExplicit)?.length || 0;
    console.debug('[CanvasMapContent] Data summary:', {
      workspaceId,
      rawViewGroupsCount: rawViewGroups?.length || 0,
      implicitCount,
      explicitCount,
      visibleViewGroupsCount: visibleViewGroups?.length || 0,
      showImplicitVGs,
      transformedViewGroupsCount: viewGroups?.length || 0,
      activeViewGroupsCount: activeViewGroups?.length || 0,
      totalViewsInVGs: viewGroups?.reduce((sum, vg) => sum + (vg.views?.length || 0), 0) || 0,
      canvasData,
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`canvas-map-v2 canvas-map-v2--${state.mapMode}`}
      data-vr={isVR}
      data-size-mode={effectiveSizeMode}
      data-density={densityMode}
    >
      {/* Breadcrumb / Back navigation (when focused) */}
      {state.focusedVGId && state.focusedVG && (
        <div
          className="canvas-map-v2__breadcrumb"
          style={{ '--vg-color': state.focusedVG.color }}
        >
          <button
            className="canvas-map-v2__breadcrumb-back"
            onClick={state.handleBackFromFocus}
          >
            <Icon name="chevronLeft" size={14} />
            {!isCompact && 'Canvas'}
          </button>
          <Icon name="chevronRight" size={14} className="canvas-map-v2__breadcrumb-sep" />
          <div className="canvas-map-v2__breadcrumb-current">
            <div
              className="canvas-map-v2__breadcrumb-dot"
              style={{ background: state.focusedVG.color }}
            />
            <span style={{ color: state.focusedVG.color }}>
              {getVGDisplayName(state.focusedVG)}
            </span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <MapToolbar
        mapMode={state.mapMode}
        showViews={state.showViews}
        showVGs={state.showVGs}
        minimapZoom={state.minimapZoom}
        showViewports={state.showViewports}
        showCollaborators={state.showCollaborators}
        showBookmarks={state.showBookmarks}
        showInternals={state.showInternals}
        linksSubTab={state.linksSubTab}
        setLinksSubTab={state.setLinksSubTab}
        collaborateSubTab={state.collaborateSubTab}
        setCollaborateSubTab={state.setCollaborateSubTab}
        onlineCollaboratorsCount={state.onlineCollaboratorsCount}
        onZoomIn={state.handleZoomIn}
        onZoomOut={state.handleZoomOut}
        onResetView={handleResetMinimapView}
        toggleShowViewports={state.toggleShowViewports}
        toggleShowCollaborators={state.toggleShowCollaborators}
        toggleShowBookmarks={state.toggleShowBookmarks}
        toggleShowInternals={state.toggleShowInternals}
        toggleShowViews={state.toggleShowViews}
        toggleShowVGs={state.toggleShowVGs}
        onAddVG={handleAddVG}
        showImplicitVGs={showImplicitVGs}
        toggleShowImplicitVGs={toggleShowImplicitVGs}
        sizeMode={effectiveSizeMode}
      />

      {/* Main Body with Companion Panel beside content */}
      <div className="canvas-map-v2__body">
        {/* Main content column */}
        <div className="canvas-map-v2__main-content">
          <div
            className="canvas-map-v2__minimap-row"
            style={{ height: minimapHeight }}
          >
            <div className="canvas-map-v2__minimap-shell" ref={minimapContainerRef}>
              <div className="canvas-map-v2__minimap-container">
                {toolbarVG && (
                  <div
                    className="canvas-map-v2__focus-toolbar-wrapper"
                    style={{ '--vg-color': toolbarVG.color }}
                  >
                    <div className="canvas-map-v2__focus-toolbar-name">
                      {getVGDisplayName(toolbarVG)}
                    </div>
                    <div className="canvas-map-v2__focus-toolbar">
                      <button
                        type="button"
                        className="canvas-map-v2__focus-btn"
                        onClick={() => handleOpenEditor(toolbarVG)}
                        title="Edit ViewGroup"
                      >
                        <Icon name="pencil" size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-map-v2__focus-btn"
                        onClick={() => handleOpenEditor(toolbarVG)}
                        title="Add view"
                      >
                        <Icon name="plus" size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-map-v2__focus-btn"
                        onClick={() => handleDuplicateVG(toolbarVG?.id)}
                        title="Duplicate ViewGroup"
                      >
                        <Icon name="copy" size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-map-v2__focus-btn"
                        onClick={() => handleSaveTemplate('personal')}
                        title="Save template"
                      >
                        <Icon name="save" size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-map-v2__focus-btn"
                        onClick={() => handleSaveTemplate('project')}
                        title="Save project template"
                      >
                        <Icon name="share" size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-map-v2__focus-btn canvas-map-v2__focus-btn--danger"
                        onClick={() => handleDeleteVG(toolbarVG?.id)}
                        title="Delete ViewGroup"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <Minimap
                  canvas={canvasData}
                  viewGroups={filteredActiveViewGroups}
                  collisionViewGroups={activeViewGroups}
                  viewports={customViewports}
                  collaborators={collaborators}
                  vgLinks={minimapVgLinks}
                  bookmarks={bookmarks}
                  flattenedViews={filteredFlattenedViews}
                  showViews={state.showViews}
                  showVGs={state.showVGs}
                  mapMode={state.mapMode}
                  focusedVG={state.focusedVG}
                  minimapZoom={state.minimapZoom}
                  showGridLabels
                  showInternals={state.showInternals || !!state.focusedVGId}
                  showViewports={state.showViewports}
                  showCollaborators={state.showCollaborators}
                  showBookmarks={state.showBookmarks}
                  showCursors={state.showCursors}
                  selectedVGId={state.selectedVGId}
                  selectedViewportId={selectedViewportId}
                  highlightedLinkId={state.highlightedLinkId}
                  focusedSlots={focusedSlots}
                  onFocusedVGRename={handleFocusedVGRename}
                  onFocusedVGSlotDrop={handleFocusedVGSlotDrop}
                  onFocusedVGSlotClear={handleFocusedVGSlotClear}
                  onVGClick={state.handleVGClick}
                  onVGDoubleClick={handleVGDoubleClick}
                  onLinkClick={state.handleLinkClick}
                  onDropItem={handleCanvasDrop}
                  containerWidth={minimapWidth}
                  containerHeight={minimapInnerHeight}
                  resetPanSignal={minimapResetSignal}
                />
              </div>
            </div>
          </div>

          <CanvasMapBottomPanel
          mapMode={state.mapMode}
          onModeChange={state.handleModeChange}
          sizeMode={effectiveSizeMode}
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          filter={vgFilter}
          filterConfig={{ sortOptions: vgSortOptions, typeCategories: vgTypeCategories }}
          tagOptions={viewGroupTags}
          quickFilterDefs={vgQuickFilters}
          quickFilterCounts={quickFilterCounts}
          minimapZoom={state.minimapZoom}
          onZoomIn={state.handleZoomIn}
          onZoomOut={state.handleZoomOut}
          onZoomReset={state.handleZoomReset}
          onMove={handleMove}
          onGoHome={handleGoHome}
          onSetHome={handleSetHome}
          onFitAll={handleFitAll}
          onAddBookmark={handleAddBookmark}
          currentPositionLabel={currentPositionLabel}
          isAtHome={isAtHome}
          minHeight={contextualHeight}
          totalVGCount={viewGroups.length}
          activeVGCount={activeViewGroups.length}
          filteredVGCount={filteredViewGroups.length}
          workspaceName={workspaceDisplayName}
        >
          {state.mapMode === MAP_MODES.NAVIGATE && (
            <ViewportsPanel
              viewports={customViewports}
              selectedViewportId={selectedViewportId}
              onViewportClick={handleViewportClick}
              onFollowViewport={handleFollowViewport}
              onAddViewport={handleAddViewport}
              onAddViewportAndFollow={handleAddViewport}
              isBroadcasting={isBroadcasting}
              followingUser={followingUser}
              onStartBroadcast={handleStartBroadcast}
              onStopBroadcast={handleStopBroadcast}
              sizeMode={effectiveSizeMode}
            />
          )}

          {state.mapMode === MAP_MODES.LAYOUT && (
            <LayoutPanel
              viewGroups={filteredActiveViewGroups}
              filteredVGs={filteredActiveViewGroups}
              inactiveVGs={filteredInactiveVGs}
              selectedVGId={state.selectedVGId}
              focusedVG={state.focusedVG}
              onVGClick={state.handleVGClick}
              onVGDoubleClick={handleVGDoubleClick}
              onVGRestore={handleVGRestore}
              onAddVG={handleAddVG}
              onChangeLayout={() => handleOpenEditor(state.focusedVG)}
              onAddView={() => handleOpenEditor(state.focusedVG)}
              onDuplicate={() => handleDuplicateVG(state.focusedVG?.id)}
              onLink={() => handleOpenEditor(state.focusedVG)}
              onSaveTemplate={handleSaveTemplate}
              onDelete={() => handleDeleteVG(state.focusedVG?.id)}
              canvasRows={canvasData.rows}
              canvasCols={canvasData.cols}
              onAdjustRows={handleAdjustRows}
              onAdjustCols={handleAdjustCols}
              sizeMode={effectiveSizeMode}
            />
          )}

          {state.mapMode === MAP_MODES.TEAM && (
            <TeamPanel
              collaborateSubTab={state.collaborateSubTab}
              viewports={customViewports}
              selectedViewportId={selectedViewportId}
              collaborators={collaborators}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              isBroadcasting={isBroadcasting}
              followingUser={followingUser}
              showCursors={state.showCursors}
              myCursorVisible={state.myCursorVisible}
              myCursorColor={state.myCursorColor}
              onViewportClick={handleViewportClick}
              onAddViewport={handleAddViewport}
              onDeleteViewport={handleDeleteViewport}
              onSetPrimaryViewport={handleSetPrimaryViewport}
              onFollow={handleFollow}
              onLocate={handleLocate}
              onJoinVoice={handleJoinVoice}
              onInvite={handleInvite}
              onStartBroadcast={handleStartBroadcast}
              onStopBroadcast={handleStopBroadcast}
              onStopFollowing={handleStopFollowing}
              onToggleShowCursors={state.toggleShowCursors}
              onToggleMyCursorVisible={state.toggleMyCursorVisible}
              onChangeMyCursorColor={state.setMyCursorColor}
              onToggleCollaboratorCursor={state.toggleCollaboratorCursor}
              sizeMode={effectiveSizeMode}
            />
          )}
        </CanvasMapBottomPanel>
        </div>
      </div>
    </div>
  );
});

export default CanvasMapContent;
