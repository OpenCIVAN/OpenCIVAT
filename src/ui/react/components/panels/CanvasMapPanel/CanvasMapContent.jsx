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

// LocalStorage helpers for custom viewports persistence
const VIEWPORTS_KEY = 'cia:canvas-map:customViewports';
const SELECTED_VP_KEY = 'cia:canvas-map:selectedViewportId';
function loadCustomViewports() {
  try {
    const stored = localStorage.getItem(VIEWPORTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}
function saveCustomViewports(viewports) {
  try { localStorage.setItem(VIEWPORTS_KEY, JSON.stringify(viewports)); } catch { /* ignore */ }
}
function loadSelectedViewportId() {
  try { return localStorage.getItem(SELECTED_VP_KEY) || null; } catch { return null; }
}
function saveSelectedViewportId(id) {
  try { localStorage.setItem(SELECTED_VP_KEY, id || ''); } catch { /* ignore */ }
}
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { useWorkspacePresence } from '@UI/react/hooks/useRoomPresence';
import { useBookmarks } from '@UI/react/hooks/useBookmarks';
import { useCanvas } from '@UI/react/hooks/useCanvas';
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { dispatchNavigateTo, VIEWPORT_EVENTS } from '@UI/react/hooks/useViewportSync';
import { workspaceManager as instanceWorkspaceManager } from '@Core/instances/workspaceManager';
import { workspace as workspaceLog } from '@Utils/logger.js';

// V2 Components
import { MapToolbar } from './components/MapToolbar';
import { ModeTabs } from './components/ModeTabs';
import { Minimap } from './components/Minimap';
import { VGContextBar } from './components/QuickOps';
import { EditModeBar } from './components/EditModeBar/EditModeBar';
import { CanvasMapBottomPanel } from './components/BottomPanel/CanvasMapBottomPanel';
import { ViewportsPanel, LayoutPanel, TeamPanel } from './components/ContextualPanels';

// Transaction store
import { useCanvasHistory, selectIsEditMode, selectPendingChangeCount } from '@UI/react/store/canvasTransactionStore';

// Collaboration hooks
import { useCanvasLockSync } from '@UI/react/hooks/useCanvasLockSync';
import { useRemoteDraft } from '@UI/react/hooks/useRemoteDraft';
import { useEditModeTimer } from '@UI/react/hooks/useEditModeTimer';

// Edit mode dialog
import { StillEditingDialog } from './components/EditModeBar/StillEditingDialog';

// Confirmation dialog for VG deletion
import { DeleteViewGroupDialog } from '@UI/react/components/modals/confirmations/DeleteViewGroupDialog';

// Footer: WorkspaceSelector
import { WorkspaceSelector } from '@UI/react/components/molecules/WorkspaceSelector/WorkspaceSelector';

// Hooks and Utils
import { useCanvasMapState } from './hooks/useCanvasMapState';
import { useVGQuickOps } from './hooks/useVGQuickOps';
import { getInternalCells } from './hooks/useInternalCellLayout';
import { MAP_MODES, SIZE_MODE_BREAKPOINTS, LAYOUTS } from './utils/constants';
import { formatCellRef, getVGDisplayName, clamp } from './utils/gridUtils';
import { addCustomTemplate, createTemplateFromViewGroup, saveServerTemplate } from '@Core/viewgroups/templates';
import { viewGroupManager } from '@Core/data/managers/ViewGroupManager';
import { viewConfigurationManager } from '@Core/data/managers/ViewConfigurationManager';
import { workspaceManager } from '@Core/data/managers/WorkspaceManager';
import { canvasManager } from '@Core/data/managers/CanvasManager';
import { toast } from '@UI/react/store/toastStore';
import { viewAssignment } from '@UI/react/store/viewAssignmentStore';

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
  panelState,
  onUpdatePanelMeta,
  // Footer props (for no-workspace state)
  workspaces: workspacesProp,
  onOpenWorkspace,
  onCreateWorkspace,
}) {
  const { isVR } = useAdaptive();
  const canvasMapContext = useCanvasMap();
  const placedVGIds = canvasMapContext?.placedVGIds || [];
  const setPlacedVGs = canvasMapContext?.setPlacedVGs;
  const minimapContainerRef = useRef(null);

  // Minimap resize (drag handle between minimap and bottom panel)
  const [minimapHeightOverride, setMinimapHeightOverride] = useState(null);
  const resizeDragRef = useRef(null);
  const minimapHeightOverrideRef = useRef(null);

  // Guard: prevent handleVGUpdated from making stale changes during layout transitions
  const layoutChangeInProgress = useRef(false);
  const layoutIdByVGRef = useRef(new Map());

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
  const { canvas, viewport, setCanvasSize, addPlacement, removePlacement } = useCanvas();

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

  // Transaction store (edit mode)
  const txMode = useCanvasHistory((s) => s.mode);
  const txDraft = useCanvasHistory((s) => s.draft);
  const txEnterEditMode = useCanvasHistory((s) => s.enterEditMode);
  const txCommitTransaction = useCanvasHistory((s) => s.commitTransaction);
  const txDiscardTransaction = useCanvasHistory((s) => s.discardTransaction);
  const txUndo = useCanvasHistory((s) => s.undo);
  const txRedo = useCanvasHistory((s) => s.redo);
  const txCanUndo = useCanvasHistory((s) => s.past.length > 0 && !s.isUndoing && !s.isRedoing);
  const txCanRedo = useCanvasHistory((s) => s.future.length > 0 && !s.isUndoing && !s.isRedoing);
  const isEditMode = txMode === 'transactional';
  const pendingChangeCount = txDraft.operations.length;

  // Collaboration: remote lock sync + draft preview
  useCanvasLockSync(canvas?.id);
  const remoteLock = useCanvasHistory((s) => s.remoteLock);
  const { remoteOperations, remoteReactions, remoteSnapshots, hasRemoteDraft } = useRemoteDraft();
  const [showRemoteDraft, setShowRemoteDraft] = useState(true);

  // Timer / expiry dialog state
  const [showExpiryDialog, setShowExpiryDialog] = useState(false);
  const [graceTimeRemaining, setGraceTimeRemaining] = useState(null);

  // VG delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetVG, setDeleteTargetVG] = useState(null);
  const graceIntervalRef = useRef(null);

  const { timeRemaining, isWarning } = useEditModeTimer({
    onExpired: () => setShowExpiryDialog(true),
  });

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts: undo/redo when in edit mode
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e) => {
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          txRedo();
        } else {
          txUndo();
        }
      }
    };

    const container = minimapContainerRef.current?.closest('.canvas-map-v2');
    container?.addEventListener('keydown', handleKeyDown);
    return () => container?.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, txUndo, txRedo]);

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
  // Always include implicit VGs that are placed on the canvas (have canvasPosition),
  // even when showImplicitVGs is off. This ensures views dragged onto the canvas
  // appear on the minimap as their auto-created solo ViewGroups.
  const sourceVGs = useMemo(() => {
    if (showImplicitVGs) return rawViewGroups || [];
    const visible = new Set((visibleViewGroups || []).map(vg => vg.id));
    const merged = [...(visibleViewGroups || [])];
    for (const vg of (rawViewGroups || [])) {
      if (visible.has(vg.id)) continue;
      const pos = vg.getCanvasPosition?.() || vg.canvasPosition;
      if (pos && pos.row !== undefined) merged.push(vg);
    }
    return merged;
  }, [showImplicitVGs, rawViewGroups, visibleViewGroups]);

  const viewGroups = useMemo(() => {
    return sourceVGs.map(vg => {
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
  }, [sourceVGs]);

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
    { id: 'starred', label: 'Bookmarked', icon: 'bookmark', predicate: (vg) => vg.isStarred },
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

  const [customViewports, setCustomViewports] = useState(() => loadCustomViewports() || []);
  const [selectedViewportId, setSelectedViewportId] = useState(() => loadSelectedViewportId());
  const [workspaceLabel, setWorkspaceLabel] = useState(null);

  useEffect(() => {
    if (viewports.length === 0) return;
    setCustomViewports((prev) => (prev.length ? prev : viewports));
    setSelectedViewportId((prev) => prev ?? viewports[0]?.id ?? null);
  }, [viewports]);

  // Listen for canvas viewport changes and update the primary viewport indicator.
  // We use a direct listener instead of useViewportSyncListener because the minimap
  // is a global panel (no paneId) and needs to accept events from any/focused pane.
  useEffect(() => {
    const handleViewportChanged = (e) => {
      const { viewport: vp, canvasId: eventPaneId } = e.detail;
      if (!vp) return;
      // Accept events from the focused pane, or any pane if none is focused
      if (eventPaneId) {
        const focusedPaneId = instanceWorkspaceManager?.getFocusedPaneId?.();
        if (focusedPaneId && eventPaneId !== focusedPaneId) return;
      }
      setCustomViewports((prev) =>
        prev.map((v) =>
          v.isPrimary
            ? { ...v, position: { row: vp.row, col: vp.col }, size: { rows: vp.rows, cols: vp.cols } }
            : v
        )
      );
    };
    window.addEventListener(VIEWPORT_EVENTS.VIEWPORT_CHANGED, handleViewportChanged);
    return () => window.removeEventListener(VIEWPORT_EVENTS.VIEWPORT_CHANGED, handleViewportChanged);
  }, []);

  // Persist customViewports and selectedViewportId to localStorage
  useEffect(() => {
    if (customViewports.length > 0) saveCustomViewports(customViewports);
  }, [customViewports]);
  useEffect(() => { saveSelectedViewportId(selectedViewportId); }, [selectedViewportId]);

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

  const resizeConstraints = useMemo(() => {
    const rows = canvasData?.rows || 1;
    const cols = canvasData?.cols || 1;
    const nextRows = rows - 1;
    const nextCols = cols - 1;

    const topBlockers = [];
    const bottomBlockers = [];
    const leftBlockers = [];
    const rightBlockers = [];

    const items = [];
    activeViewGroups.forEach((vg) => {
      if (!vg?.position) return;
      items.push({
        row: vg.position.row ?? 0,
        col: vg.position.col ?? 0,
        rowSpan: vg.position.rowSpan ?? 1,
        colSpan: vg.position.colSpan ?? 1,
      });
    });
    customViewports.forEach((vp) => {
      if (!vp?.position) return;
      items.push({
        row: vp.position.row ?? 0,
        col: vp.position.col ?? 0,
        rowSpan: vp.size?.rows ?? vp.rows ?? 1,
        colSpan: vp.size?.cols ?? vp.cols ?? 1,
      });
    });

    if (nextRows >= 1 || nextCols >= 1) {
      items.forEach((item) => {
        const rowEnd = item.row + item.rowSpan;
        const colEnd = item.col + item.colSpan;
        if (item.row <= 0) topBlockers.push(item);
        if (item.col <= 0) leftBlockers.push(item);
        if (nextRows >= 1 && rowEnd > nextRows) bottomBlockers.push(item);
        if (nextCols >= 1 && colEnd > nextCols) rightBlockers.push(item);
      });
    }

    const canRemoveTop = rows > 1 && topBlockers.length === 0;
    const canRemoveBottom = rows > 1 && bottomBlockers.length === 0;
    const canRemoveLeft = cols > 1 && leftBlockers.length === 0;
    const canRemoveRight = cols > 1 && rightBlockers.length === 0;

    return {
      canRemoveTop,
      canRemoveBottom,
      canRemoveLeft,
      canRemoveRight,
      canRemoveRows: canRemoveBottom,
      canRemoveCols: canRemoveRight,
      topBlockerCount: topBlockers.length,
      bottomBlockerCount: bottomBlockers.length,
      leftBlockerCount: leftBlockers.length,
      rightBlockerCount: rightBlockers.length,
    };
  }, [activeViewGroups, canvasData.rows, canvasData.cols, customViewports]);

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

  // Compute dimmed VG IDs for search/filter dimming on minimap
  const dimmedVGIds = useMemo(() => {
    if (!state.searchQuery && !vgFilter.quickFilters?.length) return new Set();
    const filteredIds = new Set(filteredActiveViewGroups.map(vg => vg.id));
    return new Set(activeViewGroups.filter(vg => !filteredIds.has(vg.id)).map(vg => vg.id));
  }, [activeViewGroups, filteredActiveViewGroups, state.searchQuery, vgFilter.quickFilters]);

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

  // Focused VG layout (for QuickOps toolbar)
  // Depend on layoutId directly since the VG object is mutated in place
  const focusedLayout = useMemo(() => {
    if (!state.focusedVG) return null;
    return LAYOUTS[state.focusedVG.layoutId] || LAYOUTS.single;
  }, [state.focusedVG, state.focusedVG?.layoutId]);

  // Compute minimal cell descriptors so quickOps validation (isRectangularSelection, hasMergedCellSelected) works
  const focusedCellDescriptors = useMemo(() => {
    if (!focusedLayout) return [];
    return getInternalCells(focusedLayout, 100, 100, 0, { padding: 0, gap: 0 });
  }, [focusedLayout]);

  // Quick ops state (cell selection for merge/split gating)
  const quickOps = useVGQuickOps({
    focusedVG: state.focusedVG,
    cells: focusedCellDescriptors,
    onExitFocus: state.handleBackFromFocus,
  });

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [followingUser, setFollowingUser] = useState(null);

  // ---------------------------------------------------------------------------
  // Viewport navigation helper — includes focused paneId so CanvasGrid accepts it
  // ---------------------------------------------------------------------------
  const navigateCanvas = useCallback((row, col) => {
    const paneId = instanceWorkspaceManager?.getFocusedPaneId?.() || null;
    dispatchNavigateTo(row, col, paneId);
  }, []);

  // ---------------------------------------------------------------------------
  // Action Handlers (placeholder implementations)
  // ---------------------------------------------------------------------------

  const handleGoHome = useCallback(() => {
    setCustomViewports((prev) =>
      prev.map((vp) =>
        vp.id === selectedViewportId
          ? { ...vp, position: { ...vp.position, row: 0, col: 0 } }
          : vp
      )
    );
    navigateCanvas(0, 0);
  }, [selectedViewportId, navigateCanvas]);

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

  const rectsOverlap = useCallback((a, b) => (
    a.row < b.row + b.rowSpan
    && a.row + a.rowSpan > b.row
    && a.col < b.col + b.colSpan
    && a.col + a.colSpan > b.col
  ), []);

  const hasOverlap = useCallback((rect, ignoreId) => (
    activeViewGroups.some((vg) => {
      if (!vg?.position) return false;
      if (ignoreId && vg.id === ignoreId) return false;
      return rectsOverlap(rect, vg.position);
    })
  ), [activeViewGroups, rectsOverlap]);

  const findFirstFit = useCallback((rowSpan = 1, colSpan = 1, ignoreId = null, startRow = 0, startCol = 0) => {
    const maxRow = canvasData.rows - rowSpan;
    const maxCol = canvasData.cols - colSpan;
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
      if (!hasOverlap(proposed, ignoreId)) return pos;
    }
    return null;
  }, [canvasData.cols, canvasData.rows, hasOverlap]);

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

      const layout = LAYOUTS[created.layoutId || 'single'] || LAYOUTS.single;
      const rowSpan = layout.rows || 1;
      const colSpan = layout.cols || 1;
      const candidate = findFirstFit(rowSpan, colSpan, null, 0, 0);
      const targetRow = candidate ? candidate.row : canvasData.rows;
      const targetCol = candidate ? candidate.col : 0;

      // Update with name and position (makes it visible in UI)
      await updateViewGroup(created.id, {
        name: newName,
        canvasPosition: {
          row: targetRow,
          col: targetCol,
          rowSpan,
          colSpan,
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
  }, [workspaceId, createViewGroup, updateViewGroup, canvasData, viewGroups, findFirstFit, syncViewGroupNow]);

  const findNextOpenCell = useCallback((rowSpan = 1, colSpan = 1, ignoreId = null) => {
    const candidate = findFirstFit(rowSpan, colSpan, ignoreId, 0, 0);
    if (candidate) return candidate;
    return { row: canvasData.rows, col: 0 };
  }, [canvasData.rows, findFirstFit]);

  const resolveVGDropPosition = useCallback((targetRow, targetCol, rowSpan = 1, colSpan = 1, ignoreId = null) => {
    const requestedRow = Math.max(0, targetRow ?? 0);
    const requestedCol = Math.max(0, targetCol ?? 0);
    const requestedRect = { row: requestedRow, col: requestedCol, rowSpan, colSpan };
    if (!hasOverlap(requestedRect, ignoreId)) {
      return { row: requestedRow, col: requestedCol };
    }

    const maxRow = Math.max(0, canvasData.rows - rowSpan);
    const maxCol = Math.max(0, canvasData.cols - colSpan);
    const clampedRow = clamp(requestedRow, 0, maxRow);
    const clampedCol = clamp(requestedCol, 0, maxCol);
    const candidate = findFirstFit(rowSpan, colSpan, ignoreId, clampedRow, clampedCol);
    if (candidate) return candidate;

    const expansionStartRow = Math.max(canvasData.rows, requestedRow);
    const expansionStartCol = Math.max(0, requestedCol);
    const expansionStartRect = {
      row: expansionStartRow,
      col: expansionStartCol,
      rowSpan,
      colSpan,
    };
    if (!hasOverlap(expansionStartRect, ignoreId)) {
      return { row: expansionStartRow, col: expansionStartCol };
    }

    const rowLimit = expansionStartRow + canvasData.rows + 6;
    const colLimit = Math.max(canvasData.cols + 6, expansionStartCol + 1);
    for (let r = expansionStartRow; r < rowLimit; r += 1) {
      for (let c = 0; c < colLimit; c += 1) {
        const probe = { row: r, col: c, rowSpan, colSpan };
        if (!hasOverlap(probe, ignoreId)) {
          return { row: r, col: c };
        }
      }
    }

    return { row: canvasData.rows, col: 0 };
  }, [canvasData.cols, canvasData.rows, findFirstFit, hasOverlap]);

  const findActivePlacementForView = useCallback((viewId) => {
    if (!viewId) return null;
    const viewKey = String(viewId);
    const activeCanvas = canvasManager.getActiveCanvas();
    if (!activeCanvas?.placements?.length) return null;
    return activeCanvas.placements.find((placement) => {
      const placementViewId = placement?.content?.viewConfigurationId || placement?.content?.viewId;
      return placementViewId != null && String(placementViewId) === viewKey;
    }) || null;
  }, []);

  const handleResizeCanvas = useCallback(async (directionOrPayload, actionArg = 'add') => {
    if (!setCanvasSize || !canvasData) return;
    const payload = typeof directionOrPayload === 'string'
      ? { direction: directionOrPayload, action: actionArg }
      : (directionOrPayload || {});
    const direction = payload.direction;
    const action = payload.action || 'add';
    if (!direction) return;

    const isRow = direction === 'top' || direction === 'bottom';
    const isTop = direction === 'top';
    const isLeft = direction === 'left';
    const isBottom = direction === 'bottom';
    const isRight = direction === 'right';
    const delta = action === 'remove' ? -1 : 1;
    const deltaRows = isRow ? delta : 0;
    const deltaCols = isRow ? 0 : delta;

    const canRemoveForDirection = (() => {
      if (direction === 'top') return resizeConstraints.canRemoveTop;
      if (direction === 'bottom') return resizeConstraints.canRemoveBottom;
      if (direction === 'left') return resizeConstraints.canRemoveLeft;
      return resizeConstraints.canRemoveRight;
    })();

    const blockerCountForDirection = (() => {
      if (direction === 'top') return resizeConstraints.topBlockerCount;
      if (direction === 'bottom') return resizeConstraints.bottomBlockerCount;
      if (direction === 'left') return resizeConstraints.leftBlockerCount;
      return resizeConstraints.rightBlockerCount;
    })();

    if (delta < 0 && !canRemoveForDirection) {
      const count = blockerCountForDirection;
      const directionLabel = isTop
        ? 'top row'
        : isBottom
          ? 'bottom row'
          : isLeft
            ? 'left column'
            : 'right column';
      toast.warning(
        count > 0
          ? `Cannot remove ${directionLabel} — ${count} item${count === 1 ? '' : 's'} would be clipped.`
          : `Cannot remove ${directionLabel}.`
      );
      return;
    }

    const shiftContent = async (rowDelta, colDelta) => {
      if (!rowDelta && !colDelta) return true;
      const vgTargets = activeViewGroups.filter((vg) => vg?.position);
      if (vgTargets.length > 0 && !updateViewGroup) {
        toast.error('ViewGroup operations are not available.');
        return false;
      }
      try {
        if (vgTargets.length > 0) {
          await Promise.all(vgTargets.map((vg) => {
            if (!vg?.position) return null;
            const nextPosition = {
              ...vg.position,
              row: (vg.position.row ?? 0) + rowDelta,
              col: (vg.position.col ?? 0) + colDelta,
            };
            return updateViewGroup(vg.id, { canvasPosition: nextPosition });
          }).filter(Boolean));
        }
        if (syncViewGroupNow && vgTargets.length > 0) {
          await Promise.all(vgTargets.map((vg) => (
            vg?.id ? syncViewGroupNow(vg.id) : null
          )).filter(Boolean));
        }
        setCustomViewports((prev) => prev.map((vp) => ({
          ...vp,
          position: {
            ...vp.position,
            row: (vp.position?.row ?? 0) + rowDelta,
            col: (vp.position?.col ?? 0) + colDelta,
          },
        })));
        return true;
      } catch (err) {
        toast.error('Failed to shift canvas content.');
        console.error('Failed to shift canvas content:', err);
        return false;
      }
    };

    const nextRows = Math.max(1, canvasData.rows + deltaRows);
    const nextCols = Math.max(1, canvasData.cols + deltaCols);

    if (action === 'add') {
      if (isTop || isLeft) {
        setCanvasSize({ rows: nextRows, cols: nextCols });
        await shiftContent(isTop ? 1 : 0, isLeft ? 1 : 0);
        return;
      }
      setCanvasSize({ rows: nextRows, cols: nextCols });
      return;
    }

    if (isTop || isLeft) {
      const shifted = await shiftContent(isTop ? -1 : 0, isLeft ? -1 : 0);
      if (shifted) {
        setCanvasSize({ rows: nextRows, cols: nextCols });
      }
      return;
    }

    setCanvasSize({ rows: nextRows, cols: nextCols });
  }, [activeViewGroups, canvasData, resizeConstraints, setCanvasSize, syncViewGroupNow, updateViewGroup]);

  const handleExpandCanvas = useCallback((direction, action) => {
    handleResizeCanvas(direction, action);
  }, [handleResizeCanvas]);

  const handleViewportMove = useCallback(({ id, toRow, toCol }) => {
    setCustomViewports((prev) =>
      prev.map((vp) => {
        if (vp.id !== id) return vp;
        return {
          ...vp,
          position: { ...vp.position, row: toRow, col: toCol },
        };
      })
    );
    navigateCanvas(toRow, toCol);
  }, [navigateCanvas]);

  const handleAdjustRows = useCallback((delta) => {
    if (!delta) return;
    handleResizeCanvas('bottom', delta > 0 ? 'add' : 'remove');
  }, [handleResizeCanvas]);

  const handleAdjustCols = useCallback((delta) => {
    if (!delta) return;
    handleResizeCanvas('right', delta > 0 ? 'add' : 'remove');
  }, [handleResizeCanvas]);

  const resolveGroupSlotFromCanvasCell = useCallback((group, row, col) => {
    if (!group) return null;
    const liveGroup = viewGroupManager.getViewGroup(group.id) || group;
    const position = liveGroup.getCanvasPosition?.() || liveGroup.canvasPosition || liveGroup.position;
    if (!position || position.row === undefined || position.col === undefined) return null;

    const relRow = row - position.row;
    const relCol = col - position.col;
    if (relRow < 0 || relCol < 0) return null;

    const layoutDef = LAYOUTS[liveGroup.layoutId] || LAYOUTS.single;
    const totalCells = layoutDef.cells || ((layoutDef.rows || 1) * (layoutDef.cols || 1));
    const cells = getInternalCells(layoutDef, 100, 100, totalCells, { padding: 0, gap: 0 });

    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      const spanRows = cell.mergeSpan?.rows || 1;
      const spanCols = cell.mergeSpan?.cols || 1;
      const rowEnd = cell.row + spanRows;
      const colEnd = cell.col + spanCols;
      if (relRow >= cell.row && relRow < rowEnd && relCol >= cell.col && relCol < colEnd) {
        return {
          group: liveGroup,
          slotIndex: i,
          slot: liveGroup.getSlotAt?.(i) || liveGroup.slots?.[i] || null,
          mergeSpan: { rows: spanRows, cols: spanCols },
        };
      }
    }

    return null;
  }, []);

  const handleCanvasDrop = useCallback(async ({ row, col, data }) => {
    if (!data) return;
    const dropRow = Math.max(0, row ?? 0);
    const dropCol = Math.max(0, col ?? 0);

    if (data.type === 'vg-place' || data.type === 'vg-import') {
      const targetVG = rawViewGroups.find((vg) => vg.id === data.vgId);
      if (!targetVG || !updateViewGroup) return;

      const layoutId = targetVG.layoutId || targetVG.layout?.type || 'single';
      const layout = LAYOUTS[layoutId] || LAYOUTS.single;
      const position = targetVG.canvasPosition || targetVG.position || {};
      const rowSpan = position.rowSpan || layout.rows || 1;
      const colSpan = position.colSpan || layout.cols || 1;
      const placement = resolveVGDropPosition(dropRow, dropCol, rowSpan, colSpan, targetVG.id);
      const placeRow = placement.row;
      const placeCol = placement.col;

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
        // Create canvas placements for the VG's views, respecting merged layout
        const vgViews = targetVG.getViews?.() || targetVG.slots || targetVG.views || [];
        const validViews = vgViews.filter(s => s && (s.viewId || s.id));
        if (addPlacement && validViews.length > 0) {
          const cells = getInternalCells(layout, 100, 100, validViews.length, { padding: 0, gap: 0 });
          for (let i = 0; i < validViews.length && i < cells.length; i += 1) {
            const cell = cells[i];
            const r = placeRow + cell.row;
            const c = placeCol + cell.col;
            const rs = cell.mergeSpan?.rows || 1;
            const cs = cell.mergeSpan?.cols || 1;
            const viewId = validViews[i].viewId || validViews[i].id;
            try {
              await addPlacement({ row: r, col: c, rowSpan: rs, colSpan: cs, content: { type: 'view', viewConfigurationId: viewId } });
            } catch (e) { /* view may already be placed */ }
          }
        }
      } catch (err) {
        console.error('Failed to place ViewGroup:', err);
      }
      return;
    }

    const isTemplateCreate = data.type === 'template-create'
      || data.templateId
      || (data.layoutId && !data.vgId);

    if (isTemplateCreate) {
      if (!createViewGroup || !updateViewGroup) return;

      try {
        const created = await createViewGroup(data.layoutId || 'single', data.templateId || null);
        if (!created) return;
        const layout = LAYOUTS[created.layoutId || data.layoutId || 'single'] || LAYOUTS.single;
        const rowSpan = layout.rows || 1;
        const colSpan = layout.cols || 1;
        const placement = resolveVGDropPosition(dropRow, dropCol, rowSpan, colSpan, null);
        const placeRow = placement.row;
        const placeCol = placement.col;
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
        // Create empty placements matching the VG internal layout
        if (addPlacement) {
          const cells = getInternalCells(layout, 100, 100, layout.cells || (layout.rows * layout.cols), { padding: 0, gap: 0 });
          for (const cell of cells) {
            const r = placeRow + cell.row;
            const c = placeCol + cell.col;
            const rs = cell.mergeSpan?.rows || 1;
            const cs = cell.mergeSpan?.cols || 1;
            try {
              await addPlacement({ row: r, col: c, rowSpan: rs, colSpan: cs, content: { type: 'empty' } });
            } catch (e) { /* cell may be occupied */ }
          }
        }
      } catch (err) {
        console.error('Failed to create ViewGroup from template:', err);
      }
      return;
    }

    const isDatasetDrop = data.type === 'dataset'
      || (data.datasetId && !data.view && !data.viewId && !data.viewConfigId);
    if (isDatasetDrop) {
      window.dispatchEvent(new CustomEvent('cia:request-instance', {
        detail: {
          datasetId: data.datasetId,
          fileName: data.name,
          fileType: data.fileType,
          spawnNew: true,
          targetRow: dropRow,
          targetCol: dropCol,
          rowSpan: 1,
          colSpan: 1,
          canvasId: canvas?.id,
        },
      }));
      return;
    }

    const isViewDrop = data.type === 'view'
      || data.type === 'view-item'
      || Boolean(data.view)
      || Boolean(data.viewId)
      || Boolean(data.viewConfigId);
    if (isViewDrop) {
      const viewData = data.view || data;
      const sourceViewId = data.viewConfigId || data.viewId || viewData.id || viewData.viewId;
      if (!sourceViewId) return;

      const duplicateRequested = Boolean(data.duplicate || data.modifiers?.alt);
      const createLinked = Boolean(data.modifiers?.alt);

      const targetGroup = activeViewGroups.find((vg) => {
        const pos = vg.getCanvasPosition?.() || vg.canvasPosition || vg.position;
        if (!pos || pos.row === undefined || pos.col === undefined) return false;
        const rowEnd = pos.row + (pos.rowSpan || 1);
        const colEnd = pos.col + (pos.colSpan || 1);
        return dropRow >= pos.row && dropRow < rowEnd && dropCol >= pos.col && dropCol < colEnd;
      });
      const targetSlotInfo = targetGroup
        ? resolveGroupSlotFromCanvasCell(targetGroup, dropRow, dropCol)
        : null;
      const existingTargetViewId = targetSlotInfo?.slot?.viewId || null;

      if (!duplicateRequested && existingTargetViewId === sourceViewId) {
        return;
      }

      // Match canvas-cell drop semantics: dropping onto an occupied slot replaces
      // the existing view so the move request can complete deterministically.
      if (!duplicateRequested && existingTargetViewId && existingTargetViewId !== sourceViewId) {
        const occupiedPlacement = findActivePlacementForView(existingTargetViewId);
        if (occupiedPlacement && removePlacement) {
          try {
            if ((occupiedPlacement.rowSpan || 1) > 1 || (occupiedPlacement.colSpan || 1) > 1) {
              await canvasManager.resizePlacement(occupiedPlacement.id, 1, 1);
            }
            await removePlacement(occupiedPlacement.id);
          } catch { /* ignore */ }
        }
        try {
          await viewGroupManager.removeViewFromGroup(targetSlotInfo.group.id, existingTargetViewId);
        } catch { /* ignore */ }
      }

      if (duplicateRequested) {
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
          detail: {
            datasetId: viewData.datasetId || data.datasetId,
            duplicateViewId: sourceViewId,
            spawnNew: true,
            targetRow: dropRow,
            targetCol: dropCol,
            rowSpan: 1,
            colSpan: 1,
            canvasId: canvas?.id,
            createLinked,
          },
        }));
        return;
      }

      window.dispatchEvent(new CustomEvent('cia:request-instance', {
        detail: {
          datasetId: viewData.datasetId || data.datasetId,
          viewConfigId: sourceViewId,
          spawnNew: false,
          moveExisting: true,
          targetRow: dropRow,
          targetCol: dropCol,
          rowSpan: 1,
          colSpan: 1,
          canvasId: canvas?.id,
        },
      }));
    }
  }, [
    addPlacement,
    canvas?.id,
    canvasData.cols,
    canvasData.rows,
    createViewGroup,
    rawViewGroups,
    activeViewGroups,
    resolveVGDropPosition,
    resolveGroupSlotFromCanvasCell,
    setCanvasSize,
    syncViewGroupNow,
    updateViewGroup,
    findActivePlacementForView,
    removePlacement,
  ]);

  const handleVGDoubleClick = useCallback((vgId) => {
    state.handleVGDoubleClick(vgId);
  }, [state]);

  const handleDeleteVG = useCallback((vgId) => {
    if (!vgId || !deleteViewGroup) return;
    const target = viewGroups.find((vg) => vg.id === vgId);
    setDeleteTargetVG(target || { id: vgId, name: 'ViewGroup' });
    setDeleteDialogOpen(true);
  }, [deleteViewGroup, viewGroups]);

  const handleConfirmDeleteVG = useCallback(async () => {
    if (!deleteTargetVG || !deleteViewGroup) return;
    const { id: vgId, name } = deleteTargetVG;
    try {
      // Remove canvas placements for the VG's views (unmerge first)
      const viewIds = (deleteTargetVG?.getViewIds?.() || deleteTargetVG?.views?.map(v => v.id || v.viewId) || []).filter(Boolean);
      for (const viewId of viewIds) {
        const placement = findActivePlacementForView(viewId);
        if (placement && removePlacement) {
          try {
            if ((placement.rowSpan || 1) > 1 || (placement.colSpan || 1) > 1) {
              await canvasManager.resizePlacement(placement.id, 1, 1);
            }
            await removePlacement(placement.id);
          } catch { /* ignore */ }
        }
      }
      // Also remove empty placeholder placements in the VG's canvas area
      const pos = deleteTargetVG?.getCanvasPosition?.() || deleteTargetVG?.canvasPosition || deleteTargetVG?.position;
      if (pos && removePlacement) {
        const activeCanvas = canvasManager.getActiveCanvas();
        if (activeCanvas) {
          for (let r = pos.row; r < pos.row + (pos.rowSpan || 1); r++) {
            for (let c = pos.col; c < pos.col + (pos.colSpan || 1); c++) {
              const p = activeCanvas.getPlacementAt(r, c);
              if (p && (p.content?.type === 'empty' || !p.content?.type)) {
                try {
                  if ((p.rowSpan || 1) > 1 || (p.colSpan || 1) > 1) {
                    await canvasManager.resizePlacement(p.id, 1, 1);
                  }
                  await removePlacement(p.id);
                } catch { /* ignore */ }
              }
            }
          }
        }
      }
      await deleteViewGroup(vgId);
      toast.success(`Deleted "${name || 'ViewGroup'}"`);
    } catch (err) {
      toast.error(`Failed to delete "${name || 'ViewGroup'}"`);
      console.error('Failed to delete ViewGroup:', err);
    }
    setDeleteTargetVG(null);
  }, [deleteTargetVG, deleteViewGroup, findActivePlacementForView, removePlacement]);

  // Sync canvas placements when views are added/removed from explicit VGs
  useEffect(() => {
    let disposed = false;

    const clearEmptyPlacementsInRect = async (row, col, rowSpan = 1, colSpan = 1, excludeId = null) => {
      const activeCanvas = canvasManager.getActiveCanvas();
      if (!activeCanvas) return;
      const rowEnd = row + Math.max(1, rowSpan);
      const colEnd = col + Math.max(1, colSpan);
      const overlaps = (placement) => {
        const pRowEnd = placement.row + (placement.rowSpan || 1);
        const pColEnd = placement.col + (placement.colSpan || 1);
        return placement.row < rowEnd && pRowEnd > row && placement.col < colEnd && pColEnd > col;
      };
      const blockers = (activeCanvas.placements || []).filter((placement) => {
        if (!placement || placement.id === excludeId) return false;
        if (!overlaps(placement)) return false;
        return placement.content?.type === 'empty' || !placement.content?.viewConfigurationId;
      });
      for (const blocker of blockers) {
        try { await removePlacement?.(blocker.id); } catch { /* ignore */ }
      }
    };

    const handleViewAdded = async ({ groupId, viewId, position }) => {
      if (disposed || !addPlacement) return;
      if (layoutChangeInProgress.current) return;
      const vg = viewGroupManager.getViewGroup(groupId);
      if (!vg || !vg.isExplicit) return; // Only sync for explicit VGs
      const pos = vg.getCanvasPosition?.() || vg.canvasPosition;
      if (!pos || pos.row === undefined) return;
      // Use layout cells to respect merged spans
      const layoutDef = LAYOUTS[vg.layoutId] || LAYOUTS.single;
      const cells = getInternalCells(layoutDef, 100, 100, position + 1, { padding: 0, gap: 0 });
      const cell = cells[position];
      if (!cell) return;
      const r = pos.row + cell.row;
      const c = pos.col + cell.col;
      const rs = cell.mergeSpan?.rows || 1;
      const cs = cell.mergeSpan?.cols || 1;

      const existingPlacement = findActivePlacementForView(viewId);
      if (existingPlacement) {
        await clearEmptyPlacementsInRect(r, c, rs, cs, existingPlacement.id);
        try {
          if ((existingPlacement.rowSpan || 1) !== rs || (existingPlacement.colSpan || 1) !== cs) {
            await canvasManager.resizePlacement(existingPlacement.id, rs, cs);
          }
          if (existingPlacement.row !== r || existingPlacement.col !== c) {
            await canvasManager.movePlacement(existingPlacement.id, r, c);
          }
        } catch { /* ignore */ }
        return;
      }

      // New placement for this view in the target slot.
      await clearEmptyPlacementsInRect(r, c, rs, cs);
      try {
        await addPlacement({ row: r, col: c, rowSpan: rs, colSpan: cs,
          content: { type: 'view', viewConfigurationId: viewId } });
      } catch { /* already placed */ }
    };

    const handleViewRemoved = async ({ viewId }) => {
      if (disposed || !removePlacement) return;
      if (layoutChangeInProgress.current) return;
      if (!viewId) return;
      // Allow remove+add reassign flows to settle before deciding to remove placement.
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (disposed) return;
      if (layoutChangeInProgress.current) return;
      const currentGroup = viewGroupManager.findGroupContainingView(viewId);
      if (currentGroup) return;
      const placement = findActivePlacementForView(viewId);
      if (placement) {
        try { await removePlacement(placement.id); } catch { /* ignore */ }
      }
    };

    viewGroupManager.on('viewAdded', handleViewAdded);
    viewGroupManager.on('viewRemoved', handleViewRemoved);
    return () => {
      disposed = true;
      viewGroupManager.off('viewAdded', handleViewAdded);
      viewGroupManager.off('viewRemoved', handleViewRemoved);
    };
  }, [addPlacement, findActivePlacementForView, removePlacement]);

  // Clean up implicit VGs when canvas placements are removed (e.g., close button)
  useEffect(() => {
    const handlePlacementRemoved = async ({ placement }) => {
      if (!placement) return;
      const viewId = placement.content?.viewConfigurationId || placement.content?.viewId;
      if (!viewId) return;
      const group = viewGroupManager.findGroupContainingView(viewId);
      if (!group) return;
      // Remove the view from the VG's slots
      await viewGroupManager.removeViewFromGroup(group.id, viewId);
      // If the VG is implicit and now empty, delete it
      if (!group.isExplicit && group.getViewCount() === 0) {
        try { await viewGroupManager.deleteViewGroup(group.id); } catch { /* ignore */ }
      }
    };
    canvasManager.on('placementRemoved', handlePlacementRemoved);
    return () => canvasManager.off('placementRemoved', handlePlacementRemoved);
  }, []);

  /**
   * Reconcile canvas placements for a VG after a layout change.
   * Updates view placements' positions/spans and manages empty placeholders.
   * Must be called AFTER all setViewAtSlot calls are complete.
   */
  const reconcileVGPlacements = useCallback(async (vgId) => {
    const vg = viewGroupManager.getViewGroup(vgId);
    if (!vg) return;
    const pos = vg.getCanvasPosition?.() || vg.canvasPosition;
    if (!pos || pos.row === undefined) return;

    const layoutDef = LAYOUTS[vg.layoutId] || LAYOUTS.single;
    const totalCells = layoutDef.cells || (layoutDef.rows * layoutDef.cols);
    const cells = getInternalCells(layoutDef, 100, 100, totalCells, { padding: 0, gap: 0 });
    const slots = vg.slots || [];

    const activeCanvas = canvasManager.getActiveCanvas();
    if (!activeCanvas) return;

    const rectsOverlap = (a, b) => (
      a.row < b.row + b.rowSpan
      && a.row + a.rowSpan > b.row
      && a.col < b.col + b.colSpan
      && a.col + a.colSpan > b.col
    );

    const removeOverlappingEmptyPlacements = async (
      row,
      col,
      rowSpan = 1,
      colSpan = 1,
      excludeId = null
    ) => {
      const canvasNow = canvasManager.getActiveCanvas();
      if (!canvasNow) return;
      const targetRect = { row, col, rowSpan: Math.max(1, rowSpan), colSpan: Math.max(1, colSpan) };
      const blockers = (canvasNow.placements || []).filter((placement) => {
        if (!placement || placement.id === excludeId) return false;
        if (!(placement.content?.type === 'empty' || !placement.content?.viewConfigurationId)) return false;
        const placementRect = {
          row: placement.row,
          col: placement.col,
          rowSpan: placement.rowSpan || 1,
          colSpan: placement.colSpan || 1,
        };
        return rectsOverlap(targetRect, placementRect);
      });
      for (const blocker of blockers) {
        try { await canvasManager.removePlacement(blocker.id); } catch { /* ignore */ }
      }
    };

    // Collect all placements within VG footprint
    const vgRowEnd = pos.row + (pos.rowSpan || layoutDef.rows || 1);
    const vgColEnd = pos.col + (pos.colSpan || layoutDef.cols || 1);
    const footprintRect = {
      row: pos.row,
      col: pos.col,
      rowSpan: vgRowEnd - pos.row,
      colSpan: vgColEnd - pos.col,
    };
    const footprintPlacements = (activeCanvas.placements || []).filter((placement) => {
      const placementRect = {
        row: placement.row,
        col: placement.col,
        rowSpan: placement.rowSpan || 1,
        colSpan: placement.colSpan || 1,
      };
      return rectsOverlap(footprintRect, placementRect);
    });

    // Track which placement IDs we've accounted for
    const accountedIds = new Set();

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const targetRow = pos.row + cell.row;
      const targetCol = pos.col + cell.col;
      const rs = cell.mergeSpan?.rows || 1;
      const cs = cell.mergeSpan?.cols || 1;

      const slot = slots[i];
      const viewId = slot?.viewId;

      if (viewId) {
        // View slot — find or create view placement
        const placement = findActivePlacementForView(viewId);
        if (placement) {
          accountedIds.add(placement.id);
          const placementMatchesTarget = (candidate) => (
            !!candidate
            && candidate.row === targetRow
            && candidate.col === targetCol
            && (candidate.rowSpan || 1) === rs
            && (candidate.colSpan || 1) === cs
          );
          const needsUpdate = placement.row !== targetRow
            || placement.col !== targetCol
            || (placement.rowSpan || 1) !== rs
            || (placement.colSpan || 1) !== cs;
          if (needsUpdate) {
            await removeOverlappingEmptyPlacements(targetRow, targetCol, rs, cs, placement.id);
            let latestPlacement = canvasManager.findPlacement(placement.id)?.placement || placement;
            try {
              const updatedPlacement = await canvasManager.updatePlacement(placement.id, {
                row: targetRow,
                col: targetCol,
                rowSpan: rs,
                colSpan: cs,
              });
              latestPlacement = canvasManager.findPlacement(placement.id)?.placement || updatedPlacement || latestPlacement;
              if (!placementMatchesTarget(latestPlacement)) {
                throw new Error(
                  `Placement ${placement.id} did not update to [${targetRow}, ${targetCol}]`
                );
              }
            } catch {
              // Fallback for partial server update rejections.
              try { await canvasManager.movePlacement(placement.id, targetRow, targetCol); } catch { /* ignore */ }
              try { await canvasManager.resizePlacement(placement.id, rs, cs); } catch { /* ignore */ }
              latestPlacement = canvasManager.findPlacement(placement.id)?.placement || latestPlacement;
              if (!placementMatchesTarget(latestPlacement) && addPlacement) {
                // Last resort: recreate at target if update/move/resize was a silent no-op.
                try { await canvasManager.removePlacement(placement.id); } catch { /* ignore */ }
                await removeOverlappingEmptyPlacements(targetRow, targetCol, rs, cs);
                try {
                  await addPlacement({
                    row: targetRow,
                    col: targetCol,
                    rowSpan: rs,
                    colSpan: cs,
                    content: { type: 'view', viewConfigurationId: viewId },
                  });
                } catch { /* ignore */ }
              }
            }
          }
        } else if (addPlacement) {
          await removeOverlappingEmptyPlacements(targetRow, targetCol, rs, cs);
          try {
            await addPlacement({ row: targetRow, col: targetCol, rowSpan: rs, colSpan: cs,
              content: { type: 'view', viewConfigurationId: viewId } });
          } catch { /* ignore */ }
        }
      } else {
        // Empty slot — find existing empty at this position or create one
        const existing = footprintPlacements.find(p =>
          p.row === targetRow && p.col === targetCol &&
          !accountedIds.has(p.id) &&
          (p.content?.type === 'empty' || !p.content?.viewConfigurationId)
        );
        if (existing) {
          accountedIds.add(existing.id);
          if (existing.rowSpan !== rs || existing.colSpan !== cs) {
            await removeOverlappingEmptyPlacements(targetRow, targetCol, rs, cs, existing.id);
            try { await canvasManager.resizePlacement(existing.id, rs, cs); } catch { /* ignore */ }
          }
        } else if (addPlacement) {
          await removeOverlappingEmptyPlacements(targetRow, targetCol, rs, cs);
          try {
            await addPlacement({ row: targetRow, col: targetCol, rowSpan: rs, colSpan: cs,
              content: { type: 'empty' } });
          } catch { /* ignore */ }
        }
      }
    }

    // Remove leftover empty placements that don't match any cell
    const latestCanvas = canvasManager.getActiveCanvas();
    const latestFootprintPlacements = (latestCanvas?.placements || []).filter((placement) => {
      const placementRect = {
        row: placement.row,
        col: placement.col,
        rowSpan: placement.rowSpan || 1,
        colSpan: placement.colSpan || 1,
      };
      return rectsOverlap(footprintRect, placementRect);
    });
    for (const p of latestFootprintPlacements) {
      if (!accountedIds.has(p.id) &&
          (p.content?.type === 'empty' || !p.content?.viewConfigurationId)) {
        try { await canvasManager.removePlacement(p.id); } catch { /* ignore */ }
      }
    }
  }, [addPlacement, findActivePlacementForView]);

  // Sync canvas placement spans when a VG is updated (position moves, etc.)
  // Layout changes are reconciled with full placement rebuild.
  useEffect(() => {
    const handleVGUpdated = async ({ viewGroup: vg }) => {
      if (!vg) return;

      const prevLayoutId = layoutIdByVGRef.current.get(vg.id);
      layoutIdByVGRef.current.set(vg.id, vg.layoutId);

      if (layoutChangeInProgress.current) return;

      // Always run full reconciliation on updates.
      // This guarantees view placements track VG moves, not just layout changes.
      if (prevLayoutId !== vg.layoutId || vg.getCanvasPosition?.() || vg.canvasPosition) {
        await reconcileVGPlacements(vg.id);
      }
    };
    viewGroupManager.on('viewGroupUpdated', handleVGUpdated);
    return () => viewGroupManager.off('viewGroupUpdated', handleVGUpdated);
  }, [reconcileVGPlacements]);

  const handleFocusedVGRename = useCallback(async (newName) => {
    const targetId = state.focusedVGId || state.selectedVGId;
    if (!targetId || !updateViewGroup) return;
    if (!newName?.trim()) return;
    try {
      await updateViewGroup(targetId, { name: newName.trim() });
      if (syncViewGroupNow) {
        await syncViewGroupNow(targetId);
      }
    } catch (err) {
      toast.error('Failed to rename ViewGroup');
      console.error('Failed to rename ViewGroup:', err);
    }
  }, [state.focusedVGId, state.selectedVGId, updateViewGroup, syncViewGroupNow]);

  const resolveFocusedSlotTarget = useCallback((group, slotIndex) => {
    if (!group) return null;
    const pos = group.getCanvasPosition?.() || group.canvasPosition;
    if (!pos || pos.row === undefined || pos.col === undefined) return null;
    const layoutDef = LAYOUTS[group.layoutId] || LAYOUTS.single;
    const cells = getInternalCells(layoutDef, 100, 100, slotIndex + 1, { padding: 0, gap: 0 });
    const cell = cells[slotIndex];
    if (!cell) return null;
    return {
      row: pos.row + cell.row,
      col: pos.col + cell.col,
      rowSpan: cell.mergeSpan?.rows || 1,
      colSpan: cell.mergeSpan?.cols || 1,
    };
  }, []);

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

    const target = resolveFocusedSlotTarget(group, slotIndex);
    if (!target) return;

    const isDatasetDrop = data.type === 'dataset'
      || (data.datasetId && !data.view && !data.viewId && !data.viewConfigId);
    const viewData = data.view || data;
    const incomingViewId = data.viewConfigId || data.viewId || viewData.id || viewData.viewId || null;
    const slot = group.getSlotAt?.(slotIndex);
    const existingViewId = slot?.viewId || null;

    // Replace semantics for focused-slot drops:
    // clear target slot occupant first so a move/create can land cleanly.
    if (existingViewId && existingViewId !== incomingViewId) {
      const placement = findActivePlacementForView(existingViewId);
      if (placement && removePlacement) {
        try {
          if ((placement.rowSpan || 1) > 1 || (placement.colSpan || 1) > 1) {
            await canvasManager.resizePlacement(placement.id, 1, 1);
          }
          await removePlacement(placement.id);
        } catch { /* ignore */ }
      }
      try { await viewGroupManager.removeViewFromGroup(group.id, existingViewId); } catch { /* ignore */ }
    }

    if (isDatasetDrop) {
      await handleCanvasDrop({
        row: target.row,
        col: target.col,
        data: {
          ...data,
          type: 'dataset',
        },
      });
      return;
    }

    const isViewDrop = data.type === 'view'
      || data.type === 'view-item'
      || Boolean(data.view)
      || Boolean(data.viewId)
      || Boolean(data.viewConfigId);
    if (isViewDrop && incomingViewId) {
      await handleCanvasDrop({
        row: target.row,
        col: target.col,
        data: {
          ...data,
          type: data.type || 'view',
          viewConfigId: incomingViewId,
        },
      });
      return;
    }
  }, [state.focusedVGId, syncViewGroupNow, resolveFocusedSlotTarget, handleCanvasDrop, findActivePlacementForView, removePlacement]);

  const handleFocusedVGSlotClear = useCallback(async (slotIndex) => {
    if (!state.focusedVGId) return;
    const group = viewGroupManager.getViewGroup(state.focusedVGId);
    if (!group) return;
    const slot = group.getSlotAt?.(slotIndex);
    if (!slot || slot.isEmpty?.()) return;
    try {
      const placement = findActivePlacementForView(slot.viewId);
      if (placement && removePlacement) {
        try {
          if ((placement.rowSpan || 1) > 1 || (placement.colSpan || 1) > 1) {
            await canvasManager.resizePlacement(placement.id, 1, 1);
          }
          await removePlacement(placement.id);
        } catch { /* ignore */ }
      }
      await viewGroupManager.removeViewFromGroup(group.id, slot.viewId);
      if (syncViewGroupNow) {
        await syncViewGroupNow(group.id);
      }
    } catch (err) {
      console.error('Failed to remove view from slot:', err);
      toast.error('Failed to remove view');
    }
  }, [state.focusedVGId, syncViewGroupNow, findActivePlacementForView, removePlacement]);

  const handleMove = useCallback((direction) => {
    const delta = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    }[direction];

    if (!delta) return;

    setCustomViewports((prev) => {
      const updated = prev.map((vp) => {
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
      });
      const moved = updated.find((vp) => vp.id === selectedViewportId);
      if (moved) navigateCanvas(moved.position.row, moved.position.col);
      return updated;
    });
  }, [canvasData.cols, canvasData.rows, selectedViewportId, navigateCanvas]);

  const handleViewportClick = useCallback((viewportId) => {
    setSelectedViewportId(viewportId);
    state.handleViewportClick(viewportId);
  }, [state]);

  const handleVGRestore = useCallback(async (vgId) => {
    if (!vgId || !updateViewGroup) return;
    const target = rawViewGroups.find((vg) => vg.id === vgId);
    if (!target) return;
    const layoutId = target.layoutId || target.layout?.type || 'single';
    const layout = LAYOUTS[layoutId] || LAYOUTS.single;
    const rowSpan = layout.rows || 1;
    const colSpan = layout.cols || 1;
    const { row, col } = findNextOpenCell(rowSpan, colSpan, target.id);
    try {
      await updateViewGroup(vgId, {
        canvasPosition: { row, col, rowSpan, colSpan },
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
      const layoutId = created.layoutId || created.layout?.type || 'single';
      const layout = LAYOUTS[layoutId] || LAYOUTS.single;
      const rowSpan = layout.rows || 1;
      const colSpan = layout.cols || 1;
      const { row, col } = findNextOpenCell(rowSpan, colSpan, created.id);
      await updateViewGroup(created.id, {
        canvasPosition: { row, col, rowSpan, colSpan },
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
          const layout = LAYOUTS[detail.layoutId || 'single'] || LAYOUTS.single;
          const rowSpan = layout.rows || 1;
          const colSpan = layout.cols || 1;
          // Use target position from canvas drop, or auto-find next open cell
          let row, col;
          if (detail.targetRow !== undefined && detail.targetCol !== undefined) {
            ({ row, col } = resolveVGDropPosition(
              detail.targetRow,
              detail.targetCol,
              rowSpan,
              colSpan,
              created.id
            ));
          } else {
            ({ row, col } = findNextOpenCell(rowSpan, colSpan, created.id));
          }
          // Expand canvas if needed
          const nextRows = Math.max(canvasData.rows, row + rowSpan);
          const nextCols = Math.max(canvasData.cols, col + colSpan);
          if (setCanvasSize && (nextRows !== canvasData.rows || nextCols !== canvasData.cols)) {
            setCanvasSize({ rows: nextRows, cols: nextCols });
          }
          await updateViewGroup(created.id, {
            name: detail.templateName || created.name,
            color: detail.color || created.color,
            canvasPosition: { row, col, rowSpan, colSpan },
          });
          // Create empty placements matching the VG internal layout
          if (addPlacement) {
            const cells = getInternalCells(layout, 100, 100, layout.cells || (layout.rows * layout.cols), { padding: 0, gap: 0 });
            for (const cell of cells) {
              const r = row + cell.row;
              const c = col + cell.col;
              const rs = cell.mergeSpan?.rows || 1;
              const cs = cell.mergeSpan?.cols || 1;
              try {
                await addPlacement({ row: r, col: c, rowSpan: rs, colSpan: cs, content: { type: 'empty' } });
              } catch (e) { /* cell may be occupied */ }
            }
          }
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
    resolveVGDropPosition,
    addPlacement,
    canvasData,
    setCanvasSize,
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

  // ---------------------------------------------------------------------------
  // Edit Mode (Transactional Editing) handlers
  // ---------------------------------------------------------------------------

  const handleEnterEditMode = useCallback(async () => {
    // Snapshot current VG positions + canvas dimensions
    const snapshot = {
      viewGroups: activeViewGroups.map((vg) => ({
        id: vg.id,
        name: vg.name,
        color: vg.color,
        position: vg.position ? { ...vg.position } : null,
      })),
      canvasDimensions: { rows: canvasData.rows, cols: canvasData.cols },
    };

    // Get current user name for lock display
    const { getUser } = await import('@Services/authService.js');
    const user = getUser();
    const userName = user?.name || user?.email || 'Unknown';

    const result = await txEnterEditMode(snapshot, {
      canvasId: canvas?.id,
      userName,
    });
    if (result?.success) {
      toast.info('Edit session started', {
        actionLabel: 'Open Operations Panel',
        onAction: () => {
          window.dispatchEvent(new CustomEvent('cia:toggle-popout', {
            detail: { popoutId: 'canvasOps' },
          }));
        },
        duration: 6000,
      });
    }
  }, [activeViewGroups, canvasData, txEnterEditMode, canvas]);

  useEffect(() => {
    const handleHeaderEdit = () => {
      handleEnterEditMode();
    };
    window.addEventListener('cia:canvas-map-edit', handleHeaderEdit);
    return () => window.removeEventListener('cia:canvas-map-edit', handleHeaderEdit);
  }, [handleEnterEditMode]);

  const handleCommit = useCallback(async () => {
    await txCommitTransaction();
  }, [txCommitTransaction]);

  const handleDiscard = useCallback(async () => {
    await txDiscardTransaction();
  }, [txDiscardTransaction]);

  // ── Expiry dialog: grace period auto-discard (60s) ──
  const GRACE_PERIOD_S = 60;

  useEffect(() => {
    if (!showExpiryDialog) {
      if (graceIntervalRef.current) clearInterval(graceIntervalRef.current);
      setGraceTimeRemaining(null);
      return;
    }

    let remaining = GRACE_PERIOD_S;
    setGraceTimeRemaining(remaining);

    graceIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setGraceTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(graceIntervalRef.current);
        setShowExpiryDialog(false);
        txDiscardTransaction();
        toast.warning('Edit session expired — changes discarded');
      }
    }, 1000);

    return () => {
      if (graceIntervalRef.current) clearInterval(graceIntervalRef.current);
    };
  }, [showExpiryDialog, txDiscardTransaction]);

  // Close dialog when exiting edit mode
  useEffect(() => {
    if (!isEditMode) setShowExpiryDialog(false);
  }, [isEditMode]);

  const handleExpiryExtend = useCallback(async () => {
    setShowExpiryDialog(false);
    const success = await useCanvasHistory.getState().extendLock();
    if (success) {
      toast.success('Edit session extended');
    } else {
      toast.error('Failed to extend — maximum extensions reached');
    }
  }, []);

  const handleExpiryCommit = useCallback(async () => {
    setShowExpiryDialog(false);
    await txCommitTransaction();
  }, [txCommitTransaction]);

  const handleExpiryDiscard = useCallback(async () => {
    setShowExpiryDialog(false);
    await txDiscardTransaction();
  }, [txDiscardTransaction]);

  // ---------------------------------------------------------------------------
  // Quick Ops handlers (Phase 3)
  // ---------------------------------------------------------------------------

  /** Apply a layout template to the focused VG */
  const handleApplyTemplate = useCallback(async (layoutId) => {
    if (!state.focusedVGId || !updateViewGroup) return;
    const targetVG = rawViewGroups.find((vg) => vg.id === state.focusedVGId);
    if (!targetVG) return;

    const newLayout = LAYOUTS[layoutId] || LAYOUTS.single;
    const position = targetVG.canvasPosition || targetVG.position || {};
    const oldLayoutId = targetVG.layoutId || 'single';
    const oldPosition = { ...position };

    // New footprint must accommodate the layout's grid
    const newRowSpan = Math.max(position.rowSpan || 1, newLayout.rows);
    const newColSpan = Math.max(position.colSpan || 1, newLayout.cols);

    layoutChangeInProgress.current = true;
    try {
      await updateViewGroup(state.focusedVGId, {
        layoutId,
        canvasPosition: {
          row: position.row ?? 0,
          col: position.col ?? 0,
          rowSpan: newRowSpan,
          colSpan: newColSpan,
        },
      });
      if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
      await reconcileVGPlacements(state.focusedVGId);

      useCanvasHistory.getState().record({
        type: 'RESIZE',
        description: `Apply template "${layoutId}"`,
        undo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, {
              layoutId: oldLayoutId,
              canvasPosition: oldPosition,
            });
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
        redo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, {
              layoutId,
              canvasPosition: { row: position.row ?? 0, col: position.col ?? 0, rowSpan: newRowSpan, colSpan: newColSpan },
            });
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
      });
    } catch (err) {
      console.error('Failed to apply template:', err);
      toast.error('Failed to apply template');
    } finally {
      layoutChangeInProgress.current = false;
    }
  }, [state.focusedVGId, rawViewGroups, updateViewGroup, syncViewGroupNow, reconcileVGPlacements]);

  /** Resize the internal grid (change layout rows/cols) */
  const handleResizeInternal = useCallback(async ({ rows: newRows, cols: newCols }) => {
    if (!state.focusedVGId || !updateViewGroup) return;
    const targetVG = rawViewGroups.find((vg) => vg.id === state.focusedVGId);
    if (!targetVG) return;

    // Find or create matching layout ID
    const matchingLayout = Object.entries(LAYOUTS).find(
      ([, l]) => l.rows === newRows && l.cols === newCols && !l.merged
    );
    const newLayoutId = matchingLayout ? matchingLayout[0] : targetVG.layoutId || 'single';
    const oldLayoutId = targetVG.layoutId || 'single';

    const position = targetVG.canvasPosition || targetVG.position || {};
    const oldPosition = { ...position };
    const newRowSpan = Math.max(position.rowSpan || 1, newRows);
    const newColSpan = Math.max(position.colSpan || 1, newCols);

    layoutChangeInProgress.current = true;
    try {
      await updateViewGroup(state.focusedVGId, {
        layoutId: newLayoutId,
        canvasPosition: {
          row: position.row ?? 0,
          col: position.col ?? 0,
          rowSpan: newRowSpan,
          colSpan: newColSpan,
        },
      });
      if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
      await reconcileVGPlacements(state.focusedVGId);

      useCanvasHistory.getState().record({
        type: 'RESIZE',
        description: `Resize internal grid to ${newRows}×${newCols}`,
        undo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, {
              layoutId: oldLayoutId,
              canvasPosition: oldPosition,
            });
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
        redo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, {
              layoutId: newLayoutId,
              canvasPosition: { row: position.row ?? 0, col: position.col ?? 0, rowSpan: newRowSpan, colSpan: newColSpan },
            });
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
      });
    } catch (err) {
      console.error('Failed to resize internal grid:', err);
      toast.error('Failed to resize internal grid');
    } finally {
      layoutChangeInProgress.current = false;
    }
  }, [state.focusedVGId, rawViewGroups, updateViewGroup, syncViewGroupNow, reconcileVGPlacements]);

  /** Resize the canvas footprint (rowSpan/colSpan) */
  const handleResizeFootprint = useCallback(async ({ rowSpan, colSpan, direction }) => {
    if (!state.focusedVGId || !updateViewGroup) return;
    const targetVG = rawViewGroups.find((vg) => vg.id === state.focusedVGId);
    if (!targetVG) return;

    const position = targetVG.canvasPosition || targetVG.position || {};
    const oldPosition = { ...position };

    let newRow = position.row ?? 0;
    let newCol = position.col ?? 0;

    // Adjust origin for directional expansion
    if (direction === 'up') newRow = Math.max(0, newRow - 1);
    if (direction === 'left') newCol = Math.max(0, newCol - 1);

    const newPosition = { row: newRow, col: newCol, rowSpan, colSpan };

    // Check canvas bounds and auto-expand
    const neededRows = newRow + rowSpan;
    const neededCols = newCol + colSpan;
    if (setCanvasSize && (neededRows > canvasData.rows || neededCols > canvasData.cols)) {
      setCanvasSize({
        rows: Math.max(canvasData.rows, neededRows),
        cols: Math.max(canvasData.cols, neededCols),
      });
    }

    layoutChangeInProgress.current = true;
    try {
      await updateViewGroup(state.focusedVGId, { canvasPosition: newPosition });
      if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
      await reconcileVGPlacements(state.focusedVGId);

      useCanvasHistory.getState().record({
        type: 'RESIZE',
        description: `Resize footprint to ${rowSpan}×${colSpan}`,
        undo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, { canvasPosition: oldPosition });
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
        redo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, { canvasPosition: newPosition });
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
      });
    } catch (err) {
      console.error('Failed to resize footprint:', err);
      toast.error('Failed to resize footprint');
    } finally {
      layoutChangeInProgress.current = false;
    }
  }, [state.focusedVGId, rawViewGroups, updateViewGroup, syncViewGroupNow, setCanvasSize, canvasData, reconcileVGPlacements]);

  /** Merge selected cells — changes layout from 2x2 to a merged variant (1+2 or 2+1) */
  const handleMergeCells = useCallback(async (cellIndices) => {
    if (!state.focusedVGId || !updateViewGroup || !focusedLayout) return;

    // Only merge from 2x2 (the only layout with merged variants)
    if (focusedLayout.merged || focusedLayout.rows !== 2 || focusedLayout.cols !== 2) {
      toast.warning('Merge is only available for 2\u00d72 layouts');
      return;
    }

    // Determine merge direction from cell positions
    // 2x2 cells: idx 0=(0,0), 1=(0,1), 2=(1,0), 3=(1,1)
    const positions = cellIndices.map(i => ({
      row: Math.floor(i / focusedLayout.cols),
      col: i % focusedLayout.cols,
    }));
    const allSameCol = positions.every(p => p.col === positions[0].col);
    const allSameRow = positions.every(p => p.row === positions[0].row);

    let targetLayoutId;
    if (allSameCol && positions[0].col === 0) {
      targetLayoutId = '1+2'; // merge left column
    } else if (allSameCol && positions[0].col === 1) {
      targetLayoutId = '2+1'; // merge right column
    } else if (allSameRow) {
      toast.warning('Row merge is not yet supported');
      return;
    } else {
      toast.warning('Invalid merge selection');
      return;
    }

    // Capture current views before layout change
    const oldLayoutId = state.focusedVG.layoutId || 'single';
    const oldViews = focusedSlots ? [...focusedSlots] : [];

    // Remap 2x2 -> merged layout using the canonical slot order:
    // 2x2 slots: 0=TL, 1=TR, 2=BL, 3=BR
    // 1+2 (merged left): 0=merged-left, 1=TR, 2=BR
    // 2+1 (merged right): 0=TL, 1=BL, 2=merged-right
    const sortedSelected = [...cellIndices].sort((a, b) => a - b);
    const mergedView = sortedSelected.map((idx) => oldViews[idx]).find(Boolean) || null;
    let newViews;
    if (targetLayoutId === '1+2') {
      newViews = [
        mergedView,
        oldViews[1] || null,
        oldViews[3] || null,
      ];
    } else { // '2+1'
      newViews = [
        oldViews[0] || null,
        oldViews[2] || null,
        mergedView,
      ];
    }

    const applyViewsToSlots = async (viewsBySlot) => {
      const liveGroup = viewGroupManager.getViewGroup(state.focusedVGId);
      if (!liveGroup) return;

      const existingViewIds = (liveGroup.slots || [])
        .map((slot) => slot?.viewId)
        .filter(Boolean);
      for (const existingViewId of existingViewIds) {
        await viewGroupManager.removeViewFromGroup(state.focusedVGId, existingViewId);
      }

      for (let i = 0; i < viewsBySlot.length; i += 1) {
        const view = viewsBySlot[i];
        if (!view) continue;
        await viewGroupManager.setViewAtSlot(
          state.focusedVGId,
          i,
          view.id,
          view.name,
          view.type,
          view.datasetId
        );
      }
    };

    layoutChangeInProgress.current = true;
    try {
      await updateViewGroup(state.focusedVGId, { layoutId: targetLayoutId });

      await applyViewsToSlots(newViews);

      if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
      await reconcileVGPlacements(state.focusedVGId);
      quickOps.clearSelection();

      useCanvasHistory.getState().record({
        type: 'MERGE',
        description: `Merge cells into ${targetLayoutId}`,
        undo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, { layoutId: oldLayoutId });
            await applyViewsToSlots(oldViews);
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
        redo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, { layoutId: targetLayoutId });
            await applyViewsToSlots(newViews);
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
      });
    } catch (err) {
      console.error('[QuickOps] Merge failed:', err);
      toast.error('Failed to merge cells');
    } finally {
      layoutChangeInProgress.current = false;
    }
  }, [state.focusedVGId, state.focusedVG, focusedLayout, focusedSlots, updateViewGroup, syncViewGroupNow, quickOps, reconcileVGPlacements]);

  /** Split a merged cell — changes layout from a merged variant back to 2x2 */
  const handleSplitCell = useCallback(async (cellIndex) => {
    if (!state.focusedVGId || !updateViewGroup || !focusedLayout) return;

    if (!focusedLayout.merged) {
      toast.warning('No merged cells to split');
      return;
    }

    const oldLayoutId = state.focusedVG.layoutId || 'single';
    const targetLayoutId = '2x2';

    // Capture current views (3 slots for merged layout)
    const oldViews = focusedSlots ? [...focusedSlots] : [];

    // Map merged layout -> 2x2 using canonical slot order:
    // 2x2 slots: 0=TL, 1=TR, 2=BL, 3=BR
    // 1+2 (merged left): 0=merged-left, 1=TR, 2=BR
    // 2+1 (merged right): 0=TL, 1=BL, 2=merged-right
    // Merged-cell view collapses back to one cell when split.
    let newViews;
    if (oldLayoutId === '1+2') {
      newViews = [
        oldViews[0] || null,
        oldViews[1] || null,
        null,
        oldViews[2] || null,
      ];
    } else if (oldLayoutId === '2+1') {
      newViews = [
        oldViews[0] || null,
        oldViews[2] || null,
        oldViews[1] || null,
        null,
      ];
    } else {
      toast.warning('Unknown merged layout');
      return;
    }

    const applyViewsToSlots = async (viewsBySlot) => {
      const liveGroup = viewGroupManager.getViewGroup(state.focusedVGId);
      if (!liveGroup) return;

      const existingViewIds = (liveGroup.slots || [])
        .map((slot) => slot?.viewId)
        .filter(Boolean);
      for (const existingViewId of existingViewIds) {
        await viewGroupManager.removeViewFromGroup(state.focusedVGId, existingViewId);
      }

      for (let i = 0; i < viewsBySlot.length; i += 1) {
        const view = viewsBySlot[i];
        if (!view) continue;
        await viewGroupManager.setViewAtSlot(
          state.focusedVGId,
          i,
          view.id,
          view.name,
          view.type,
          view.datasetId
        );
      }
    };

    layoutChangeInProgress.current = true;
    try {
      await updateViewGroup(state.focusedVGId, { layoutId: targetLayoutId });

      await applyViewsToSlots(newViews);

      if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
      await reconcileVGPlacements(state.focusedVGId);
      quickOps.clearSelection();

      useCanvasHistory.getState().record({
        type: 'UNMERGE',
        description: `Split merged cell (${oldLayoutId} \u2192 2\u00d72)`,
        undo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, { layoutId: oldLayoutId });
            await applyViewsToSlots(oldViews);
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
        redo: async () => {
          layoutChangeInProgress.current = true;
          try {
            await updateViewGroup(state.focusedVGId, { layoutId: targetLayoutId });
            await applyViewsToSlots(newViews);
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
            await reconcileVGPlacements(state.focusedVGId);
          } finally { layoutChangeInProgress.current = false; }
        },
      });
    } catch (err) {
      console.error('[QuickOps] Split failed:', err);
      toast.error('Failed to split cell');
    } finally {
      layoutChangeInProgress.current = false;
    }
  }, [state.focusedVGId, state.focusedVG, focusedLayout, focusedSlots, updateViewGroup, syncViewGroupNow, quickOps, reconcileVGPlacements]);

  // ── Phase 4: Cell interaction handlers ────────────────────────────────

  /** Handle drag-to-swap or drag-to-move between cells */
  const handleCellDragComplete = useCallback(async ({ sourceCellIndex, targetCellIndex, sourceView, targetView }) => {
    if (!state.focusedVGId) return;
    const group = viewGroupManager.getViewGroup(state.focusedVGId);
    if (!group) return;

    const ensureSync = async () => {
      if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
      await reconcileVGPlacements(group.id);
    };

    if (targetView) {
      // SWAP: set both slots cross-wise
      const srcViewId = sourceView.id;
      const srcViewName = sourceView.name;
      const srcViewType = sourceView.type;
      const srcDatasetId = sourceView.datasetId || null;
      const tgtViewId = targetView.id;
      const tgtViewName = targetView.name;
      const tgtViewType = targetView.type;
      const tgtDatasetId = targetView.datasetId || null;

      await viewGroupManager.setViewAtSlot(group.id, sourceCellIndex, tgtViewId, tgtViewName, tgtViewType, tgtDatasetId);
      await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, srcViewId, srcViewName, srcViewType, srcDatasetId);
      await ensureSync();

      useCanvasHistory.getState().record({
        type: 'SWAP',
        description: `Swap "${srcViewName}" with "${tgtViewName}"`,
        undo: async () => {
          await viewGroupManager.setViewAtSlot(group.id, sourceCellIndex, srcViewId, srcViewName, srcViewType, srcDatasetId);
          await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, tgtViewId, tgtViewName, tgtViewType, tgtDatasetId);
          await ensureSync();
        },
        redo: async () => {
          await viewGroupManager.setViewAtSlot(group.id, sourceCellIndex, tgtViewId, tgtViewName, tgtViewType, tgtDatasetId);
          await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, srcViewId, srcViewName, srcViewType, srcDatasetId);
          await ensureSync();
        },
      });
    } else {
      // MOVE: remove from source, set at target
      const viewId = sourceView.id;
      const viewName = sourceView.name;
      const viewType = sourceView.type;
      const datasetId = sourceView.datasetId || null;

      await viewGroupManager.removeViewFromGroup(group.id, viewId);
      await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, viewId, viewName, viewType, datasetId);
      await ensureSync();

      useCanvasHistory.getState().record({
        type: 'MOVE',
        description: `Move "${viewName}" to cell ${targetCellIndex}`,
        undo: async () => {
          await viewGroupManager.removeViewFromGroup(group.id, viewId);
          await viewGroupManager.setViewAtSlot(group.id, sourceCellIndex, viewId, viewName, viewType, datasetId);
          await ensureSync();
        },
        redo: async () => {
          await viewGroupManager.removeViewFromGroup(group.id, viewId);
          await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, viewId, viewName, viewType, datasetId);
          await ensureSync();
        },
      });
    }
  }, [state.focusedVGId, syncViewGroupNow, reconcileVGPlacements]);

  /** Handle cell assignment via CompanionPanel */
  const handleCellAssign = useCallback((cellIndex) => {
    if (!state.focusedVGId || !state.focusedVG) return;
    const group = viewGroupManager.getViewGroup(state.focusedVGId);
    if (!group) return;

    // Determine cell row/col from layout
    const layout = LAYOUTS[state.focusedVG.layoutId] || LAYOUTS.single;
    const layoutCols = layout.cols || 1;
    const cellRow = Math.floor(cellIndex / layoutCols);
    const cellCol = cellIndex % layoutCols;

    quickOps.startAssigning(cellIndex);

    viewAssignment.request({
      vgId: state.focusedVGId,
      cellRow,
      cellCol,
      vgName: state.focusedVG.name || 'ViewGroup',
      vgColor: state.focusedVG.color,
      source: 'focusedView',
      onAssign: (view, mode) => {
        handleFocusedVGSlotDrop(cellIndex, { type: 'view', view });
        quickOps.clearAssigning();
      },
      onCancel: () => {
        quickOps.clearAssigning();
      },
    });
  }, [state.focusedVGId, state.focusedVG, quickOps, handleFocusedVGSlotDrop]);

  /** Handle targeting resolution (swap/move/clone from context menu) */
  const handleTargetingResolve = useCallback((targetCellIndex) => {
    if (!quickOps?.targeting) return;
    const result = quickOps.resolveTargeting(targetCellIndex);
    if (!result) return;

    const targetView = focusedSlots?.[targetCellIndex] || null;

    if (result.action === 'swap') {
      handleCellDragComplete({
        sourceCellIndex: result.sourceCellIndex,
        targetCellIndex,
        sourceView: result.sourceView,
        targetView,
      });
    } else if (result.action === 'move') {
      handleCellDragComplete({
        sourceCellIndex: result.sourceCellIndex,
        targetCellIndex,
        sourceView: result.sourceView,
        targetView: null,
      });
    } else if (result.action === 'clone') {
      // Clone: place a copy in the target without removing from source
      if (!state.focusedVGId) return;
      const group = viewGroupManager.getViewGroup(state.focusedVGId);
      if (!group) return;

      const viewId = result.sourceView.id;
      const viewName = result.sourceView.name;
      const viewType = result.sourceView.type;
      const datasetId = result.sourceView.datasetId || null;

      (async () => {
        await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, viewId, viewName, viewType, datasetId);
        if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);

        useCanvasHistory.getState().record({
          type: 'ADD',
          description: `Duplicate "${viewName}" to cell ${targetCellIndex}`,
          undo: async () => {
            await viewGroupManager.removeViewFromGroup(group.id, viewId);
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
          },
          redo: async () => {
            await viewGroupManager.setViewAtSlot(group.id, targetCellIndex, viewId, viewName, viewType, datasetId);
            if (syncViewGroupNow) await syncViewGroupNow(state.focusedVGId);
          },
        });
      })();
    }
  }, [quickOps, focusedSlots, state.focusedVGId, syncViewGroupNow, handleCellDragComplete]);

  /** Open the VG Editor for the focused VG */
  const handleOpenFocusedEditor = useCallback(() => {
    if (!state.focusedVG) return;
    handleOpenEditor(state.focusedVG);
  }, [state.focusedVG, handleOpenEditor]);

  // Handle VG move in edit mode (from Minimap pointer drag)
  const handleEditModeMove = useCallback(async ({ vgId, toRow, toCol }) => {
    if (!updateViewGroup) return;
    const targetVG = rawViewGroups.find((vg) => vg.id === vgId);
    if (!targetVG) return;

    const position = targetVG.canvasPosition || targetVG.position || {};
    const oldRow = position.row ?? 0;
    const oldCol = position.col ?? 0;
    const rowSpan = position.rowSpan || 1;
    const colSpan = position.colSpan || 1;

    const proposed = { row: toRow, col: toCol, rowSpan, colSpan };
    if (hasOverlap(proposed, vgId)) {
      toast.warning('Cannot move ViewGroup — space is occupied.');
      return;
    }

    // Apply visual change immediately
    await updateViewGroup(vgId, {
      canvasPosition: { row: toRow, col: toCol, rowSpan, colSpan },
    });

    // Record the operation (stages to draft in transactional mode)
    useCanvasHistory.getState().record({
      type: 'MOVE',
      description: `Move VG to (${toRow}, ${toCol})`,
      undo: async () => {
        await updateViewGroup(vgId, {
          canvasPosition: { row: oldRow, col: oldCol, rowSpan, colSpan },
        });
      },
      redo: async () => {
        await updateViewGroup(vgId, {
          canvasPosition: { row: toRow, col: toCol, rowSpan, colSpan },
        });
      },
    });
  }, [rawViewGroups, updateViewGroup, hasOverlap]);

  // Handle VG removal in edit mode
  const handleEditModeRemove = useCallback(async (vgId) => {
    if (!updateViewGroup) return;
    const targetVG = rawViewGroups.find((vg) => vg.id === vgId);
    if (!targetVG) return;

    const position = targetVG.canvasPosition || targetVG.position || {};
    const savedPosition = { ...position };

    // Remove from canvas by clearing position
    await updateViewGroup(vgId, { canvasPosition: null });

    useCanvasHistory.getState().record({
      type: 'DELETE',
      description: `Remove VG from canvas`,
      undo: async () => {
        await updateViewGroup(vgId, { canvasPosition: savedPosition });
      },
      redo: async () => {
        await updateViewGroup(vgId, { canvasPosition: null });
      },
    });
  }, [rawViewGroups, updateViewGroup]);

  // Draft snapshot for change indicators in Minimap
  const draftSnapshot = useMemo(() => {
    if (!isEditMode || !txDraft.snapshot) return null;
    return txDraft.snapshot;
  }, [isEditMode, txDraft.snapshot]);

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
  const headerHeight = 0;
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

  const computedMinimapHeight = Math.max(
    60,
    Math.min(maxMinimapHeight, Math.max(minMinimapHeight, targetMinimapHeight))
  );
  // Use user override when set, clamped to valid range
  const minimapHeight = minimapHeightOverride !== null
    ? Math.max(60, Math.min(contentHeight - 80, minimapHeightOverride))
    : computedMinimapHeight;
  const contextualHeight = Math.max(80, contentHeight - minimapHeight);
  const densityMode = isShort || isCompact ? 'dense' : 'standard';

  // Restore saved minimap share on mount or when contentHeight changes (but not during drag)
  useEffect(() => {
    if (resizeDragRef.current) return; // Don't override during active drag
    const savedShare = panelState?.meta?.minimapShare;
    if (savedShare != null && contentHeight > 0) {
      const desired = Math.max(60, Math.min(contentHeight - 80, contentHeight * savedShare));
      setMinimapHeightOverride(desired);
      minimapHeightOverrideRef.current = desired;
    }
  }, [contentHeight, panelState?.meta?.minimapShare]);

  // Resize handle handlers
  const handleResizePointerDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = minimapHeight;
    resizeDragRef.current = { startY, startHeight };

    const handleMove = (moveEvt) => {
      if (!resizeDragRef.current) return;
      const delta = moveEvt.clientY - resizeDragRef.current.startY;
      const newHeight = Math.max(60, Math.min(contentHeight - 80, resizeDragRef.current.startHeight + delta));
      setMinimapHeightOverride(newHeight);
      minimapHeightOverrideRef.current = newHeight;
    };

    const handleUp = () => {
      const finalHeight = minimapHeightOverrideRef.current;
      resizeDragRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (contentHeight > 0 && finalHeight != null) {
        const ratio = finalHeight / contentHeight;
        onUpdatePanelMeta?.({ minimapShare: Math.max(0, Math.min(1, ratio)) });
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [minimapHeight, contentHeight, onUpdatePanelMeta]);

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
          <span>Select or create a workspace to get started</span>
        </div>
        <div className="canvas-map-v2__no-workspace-footer">
          <WorkspaceSelector
            workspace={null}
            workspaces={workspacesProp || []}
            onSelect={(ws) => onOpenWorkspace?.(ws.id)}
            onCreate={onCreateWorkspace}
            label="Open Workspace"
          />
        </div>
      </div>
    );
  }

  if (workspaceLog.isEnabled('trace')) {
    const implicitCount = rawViewGroups?.filter(vg => !vg.name && !vg.isExplicit)?.length || 0;
    const explicitCount = rawViewGroups?.filter(vg => vg.name || vg.isExplicit)?.length || 0;
    workspaceLog.trace('[CanvasMapContent] Data summary:', {
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
      data-edit-mode={isEditMode || undefined}
    >
      {/* Mode Tabs */}
      <ModeTabs
        activeMode={state.mapMode}
        onModeChange={state.handleModeChange}
        sizeMode={effectiveSizeMode}
      />

      {/* Toolbar */}
        <MapToolbar
          minimapZoom={state.minimapZoom}
          showViewports={state.showViewports}
          showInternals={state.showInternals}
          showCursors={state.showCursors}
        onZoomIn={state.handleZoomIn}
        onZoomOut={state.handleZoomOut}
        onResetView={handleResetMinimapView}
        toggleShowViewports={state.toggleShowViewports}
        toggleShowInternals={state.toggleShowInternals}
        toggleShowCursors={state.toggleShowCursors}
        isEditMode={isEditMode}
        remoteLock={remoteLock}
          hasRemoteDraft={hasRemoteDraft}
          showRemoteDraft={showRemoteDraft}
          toggleShowRemoteDraft={() => setShowRemoteDraft((p) => !p)}
          onEditLayout={handleEnterEditMode}
          sizeMode={effectiveSizeMode}
        />

      {/* Edit mode bar - between toolbar and minimap */}
      {isEditMode && (
        <EditModeBar
          pendingChangeCount={pendingChangeCount}
          onCommit={handleCommit}
          onDiscard={handleDiscard}
          timeRemaining={timeRemaining}
          isWarning={isWarning}
          onExtend={handleExpiryExtend}
          canUndo={txCanUndo}
          canRedo={txCanRedo}
          onUndo={txUndo}
          onRedo={txRedo}
        />
      )}

      {/* Main Body with Companion Panel beside content */}
      <div className="canvas-map-v2__body">
        {/* Main content column */}
        <div className="canvas-map-v2__main-content">
          <div
            className="canvas-map-v2__minimap-row"
            style={{ flex: `0 1 ${minimapHeight}px`, minHeight: 60 }}
          >
            <div className="canvas-map-v2__minimap-shell" ref={minimapContainerRef}>
              <div className="canvas-map-v2__minimap-container">
                <Minimap
                  canvas={canvasData}
                  viewGroups={activeViewGroups}
                  collisionViewGroups={activeViewGroups}
                  viewports={customViewports}
                  collaborators={collaborators}
                  flattenedViews={filteredFlattenedViews}
                  showViews={false}
                  showVGs
                  mapMode={state.mapMode}
                  focusedVG={state.focusedVG}
                  minimapZoom={state.minimapZoom}
                  showGridLabels
                  showInternals={state.showInternals || !!state.focusedVGId}
                  showViewports={state.showViewports}
                  showCollaborators={state.showCollaborators || state.mapMode === MAP_MODES.TEAM}
                  showCursors={state.showCursors}
                  selectedVGId={state.selectedVGId}
                  selectedViewportId={selectedViewportId}
                  focusedSlots={focusedSlots}
                  onFocusedVGSlotDrop={handleFocusedVGSlotDrop}
                  onFocusedVGSlotClear={handleFocusedVGSlotClear}
                  onBackFromFocus={state.handleBackFromFocus}
                  onVGClick={state.handleVGClick}
                  onVGDoubleClick={handleVGDoubleClick}
                  onDeselect={() => { state.setSelectedVGId(null); state.handleBackFromFocus(); }}
                  onDropItem={handleCanvasDrop}
                  containerWidth={minimapWidth}
                  containerHeight={minimapInnerHeight}
                  resetPanSignal={minimapResetSignal}
                  isEditMode={isEditMode}
                  onMoveVG={isEditMode ? handleEditModeMove : undefined}
                  onRemoveVG={isEditMode ? handleEditModeRemove : undefined}
                  draftSnapshot={draftSnapshot}
                  remoteDraftSnapshot={showRemoteDraft && !isEditMode ? remoteSnapshots[0] : null}
                  remoteOperations={showRemoteDraft && !isEditMode ? remoteOperations : []}
                  quickOps={quickOps}
                  onApplyTemplate={handleApplyTemplate}
                  onMergeCells={handleMergeCells}
                  onSplitCell={handleSplitCell}
                  onOpenEditor={handleOpenFocusedEditor}
                  onCellDragComplete={handleCellDragComplete}
                  onCellAssign={handleCellAssign}
                  onTargetingResolve={handleTargetingResolve}
                  dimmedVGIds={dimmedVGIds}
                  canRemoveRows={resizeConstraints.canRemoveRows}
                  canRemoveCols={resizeConstraints.canRemoveCols}
                  canRemoveTop={resizeConstraints.canRemoveTop}
                  canRemoveBottom={resizeConstraints.canRemoveBottom}
                  canRemoveLeft={resizeConstraints.canRemoveLeft}
                  canRemoveRight={resizeConstraints.canRemoveRight}
                  isVR={isVR}
                  onExpandCanvas={handleExpandCanvas}
                  onViewportMove={handleViewportMove}
                />
              </div>
            </div>
          </div>

          {/* VG Context Bar - below minimap when selected or focused */}
          {(state.focusedVGId || state.selectedVGId) && (
            <VGContextBar
              selectedVG={state.selectedVG}
              focusedVG={state.focusedVG}
              canvas={canvasData}
              viewGroups={activeViewGroups}
              onResizeInternal={handleResizeInternal}
              onResizeFootprint={handleResizeFootprint}
              onRename={handleFocusedVGRename}
              onDeselect={() => state.setSelectedVGId(null)}
              onDuplicate={handleDuplicateVG}
              onSaveTemplate={handleSaveTemplate}
              onDelete={handleDeleteVG}
              onEditVG={handleOpenEditor}
            />
          )}

          {/* Resize handle between minimap and bottom content */}
          <Tooltip content="Drag to resize minimap" placement="top" delay={300}>
            <div
              className="canvas-map-v2__resize-handle"
              onPointerDown={handleResizePointerDown}
              aria-label="Drag to resize minimap"
            >
              <div className="canvas-map-v2__resize-grip" />
            </div>
          </Tooltip>


        <CanvasMapBottomPanel
          sizeMode={effectiveSizeMode}
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          filter={vgFilter}
          filterConfig={{ sortOptions: vgSortOptions, typeCategories: vgTypeCategories }}
          tagOptions={viewGroupTags}
          quickFilterDefs={vgQuickFilters}
          quickFilterCounts={quickFilterCounts}
          onMove={handleMove}
          onGoHome={handleGoHome}
          onSetHome={handleSetHome}
          onFitAll={handleFitAll}
          onAddBookmark={handleAddBookmark}
          currentPositionLabel={currentPositionLabel}
          isAtHome={isAtHome}
          minHeight={0}
          totalVGCount={viewGroups.length}
          activeVGCount={activeViewGroups.length}
          filteredVGCount={filteredViewGroups.length}
          workspaceName={workspaceDisplayName}
          canvasRows={canvasData.rows}
          canvasCols={canvasData.cols}
          totalViewCount={state.flattenedViews?.length || 0}
        >
          {state.mapMode === MAP_MODES.VIEWPORTS && (
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
              canRemoveRows={resizeConstraints.canRemoveRows}
              canRemoveCols={resizeConstraints.canRemoveCols}
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

      <StillEditingDialog
        isOpen={showExpiryDialog}
        onClose={() => setShowExpiryDialog(false)}
        onExtend={handleExpiryExtend}
        onCommit={handleExpiryCommit}
        onDiscard={handleExpiryDiscard}
        pendingChangeCount={pendingChangeCount}
        graceTimeRemaining={graceTimeRemaining}
      />

      <DeleteViewGroupDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDeleteTargetVG(null); }}
        viewGroup={deleteTargetVG}
        onConfirm={handleConfirmDeleteVG}
      />
    </div>
  );
});

export default CanvasMapContent;
