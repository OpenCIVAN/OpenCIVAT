/**
 * @file useViewsTab.js
 * @description Hook for Views tab state management.
 *
 * UPDATED VERSION:
 * - Uses ViewLifecycleService for all view operations
 * - Uses EventBus for event subscriptions
 * - Cleaner separation of concerns
 *
 * @example
 * const { views, handlePlaceView, handleTrashView } = useViewsTab({ workspaceId });
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { viewLifecycleService } from "@Services";
import { eventBus, BUS_EVENTS } from "@Core/events";
import {
  VIEW_EVENTS,
  CANVAS_MANAGER_EVENTS as CANVAS_EVENTS,
} from "@Core/events/eventConstants.js";
import { view as log } from "@Utils/logger.js";

// =============================================================================
// VIEW MODES
// =============================================================================

export const VIEW_MODES = {
  LIST: "list", // Simple list
  BY_STATUS: "byStatus", // Grouped by On Canvas / Not Placed / Deleted
  BY_DATASET: "byDataset", // Grouped by parent dataset
  GRID: "grid", // Grid preview mode
};

// =============================================================================
// HELPER: Get all views from manager
// =============================================================================

function getAllViewsFromManager(viewManager) {
  if (!viewManager) return [];

  // Access internal _viewConfigs Map directly
  // This bypasses userId filtering that breaks in dev mode
  if (viewManager._viewConfigs instanceof Map) {
    return Array.from(viewManager._viewConfigs.values());
  }

  // Fallback: combine available methods
  const myViews = viewManager.getMyViews?.() || [];
  const sharedViews = viewManager.getSharedWithMe?.() || [];

  const viewMap = new Map();
  [...myViews, ...sharedViews].forEach((v) => {
    if (v?.id) viewMap.set(v.id, v);
  });

  return Array.from(viewMap.values());
}

// =============================================================================
// HELPER: Enrich view with runtime data
// =============================================================================

function enrichView(view) {
  if (!view) return null;

  // Check if view is on canvas
  const isOnCanvas = viewLifecycleService.isViewOnCanvas(view.id);

  // Get placement info from canvas (for position info)
  const placement = canvasManager?.getPlacementForView?.(view.id);

  // Determine if view has any links
  const hasLinks =
    view.links &&
    Object.values(view.links).some(
      (link) => link && (link.isActive?.() || link.targetViewId)
    );

  return {
    ...view,
    isOnCanvas,
    placement,
    hasLinks,
    isLinked: hasLinks,
  };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useViewsTab({ workspaceId }) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [views, setViews] = useState([]);
  const [viewMode, setViewMode] = useState(VIEW_MODES.BY_STATUS);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);

  // -------------------------------------------------------------------------
  // LOAD VIEWS
  // -------------------------------------------------------------------------

  const loadViews = useCallback(() => {
    const viewManager = getViewConfigurationManager();
    const allViews = getAllViewsFromManager(viewManager);
    const enrichedViews = allViews.map(enrichView).filter(Boolean);
    setViews(enrichedViews);
    log.debug(`Loaded ${enrichedViews.length} views`);
  }, []);

  // Initial load
  useEffect(() => {
    loadViews();
  }, [loadViews, refreshCounter]);

  // -------------------------------------------------------------------------
  // EVENT SUBSCRIPTIONS - Manager Events
  // -------------------------------------------------------------------------

  useEffect(() => {
    const viewManager = getViewConfigurationManager();
    if (!viewManager?.on) return;

    const refresh = () => setRefreshCounter((c) => c + 1);

    // Subscribe to manager events
    const events = [
      VIEW_EVENTS.ADDED,
      VIEW_EVENTS.UPDATED,
      VIEW_EVENTS.REMOVED,
      VIEW_EVENTS.TRASHED,
      VIEW_EVENTS.RESTORED,
      VIEW_EVENTS.DELETED,
    ];

    events.forEach((event) => viewManager.on(event, refresh));

    return () => {
      events.forEach((event) => viewManager.off(event, refresh));
    };
  }, []);

  // -------------------------------------------------------------------------
  // EVENT SUBSCRIPTIONS - EventBus Events
  // -------------------------------------------------------------------------

  useEffect(() => {
    const refresh = () => setRefreshCounter((c) => c + 1);

    // Subscribe to EventBus events from ViewLifecycleService
    const unsubs = [
      eventBus.on(BUS_EVENTS.VIEW_CREATED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_PLACED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_REMOVED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_TRASHED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_RESTORED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_DELETED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_RENAMED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_ADDED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_REMOVED, refresh),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  // -------------------------------------------------------------------------
  // EVENT SUBSCRIPTIONS - Canvas Manager Events
  // -------------------------------------------------------------------------

  useEffect(() => {
    const refresh = () => setRefreshCounter((c) => c + 1);

    const unsubs = [
      canvasManager.on(CANVAS_EVENTS.PLACEMENT_ADDED, refresh),
      canvasManager.on(CANVAS_EVENTS.PLACEMENT_REMOVED, refresh),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  // -------------------------------------------------------------------------
  // VIEW OPERATIONS - All using ViewLifecycleService
  // -------------------------------------------------------------------------

  /**
   * Place a view on the canvas
   */
  const handlePlaceView = useCallback(async (viewId) => {
    log.debug("Placing view:", viewId);
    await viewLifecycleService.placeView(viewId);
  }, []);

  /**
   * Remove view from canvas (but keep the view)
   */
  const handleRemoveFromCanvas = useCallback(async (viewId) => {
    log.debug("Removing view from canvas:", viewId);
    await viewLifecycleService.removeViewFromCanvas(viewId);
  }, []);

  /**
   * Trash a view (soft delete)
   */
  const handleTrashView = useCallback(async (viewId) => {
    log.debug("Trashing view:", viewId);
    await viewLifecycleService.trashView(viewId);
  }, []);

  /**
   * Restore a view from trash
   */
  const handleRestoreView = useCallback(async (viewId) => {
    log.debug("Restoring view:", viewId);
    await viewLifecycleService.restoreView(viewId);
  }, []);

  /**
   * Permanently delete a view
   */
  const handleDeleteView = useCallback(async (viewId) => {
    log.debug("Deleting view:", viewId);
    await viewLifecycleService.deleteView(viewId);
  }, []);

  /**
   * Rename a view
   */
  const handleRenameView = useCallback(async (viewId, newName) => {
    log.debug("Renaming view:", viewId, newName);
    await viewLifecycleService.renameView(viewId, newName);
  }, []);

  /**
   * Focus/navigate to a view
   */
  const handleFocusView = useCallback((viewId) => {
    log.debug("Focusing view:", viewId);
    viewLifecycleService.focusView(viewId);
  }, []);

  /**
   * Duplicate a view
   */
  const handleDuplicateView = useCallback(async (viewId) => {
    log.debug("Duplicating view:", viewId);
    await viewLifecycleService.duplicateAndPlaceView(viewId);
  }, []);

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------

  /**
   * Filter views by search query
   */
  const filteredViews = useMemo(() => {
    if (!searchQuery.trim()) return views;

    const query = searchQuery.toLowerCase();
    return views.filter((view) => {
      const name = (view.name || "").toLowerCase();
      const datasetName = (view.datasetName || "").toLowerCase();
      return name.includes(query) || datasetName.includes(query);
    });
  }, [views, searchQuery]);

  /**
   * Views currently on canvas
   */
  const onCanvasViews = useMemo(() => {
    return filteredViews.filter((v) => v.isOnCanvas);
  }, [filteredViews]);

  /**
   * Views not placed (but not trashed)
   */
  const notPlacedViews = useMemo(() => {
    return filteredViews.filter((v) => !v.isOnCanvas && v.status !== "trashed");
  }, [filteredViews]);

  /**
   * Views in trash
   */
  const trashedViews = useMemo(() => {
    return filteredViews.filter((v) => v.status === "trashed");
  }, [filteredViews]);

  /**
   * Group views by dataset
   */
  const viewsByDataset = useMemo(() => {
    const grouped = new Map();
    filteredViews.forEach((view) => {
      const datasetId = view.datasetId || "unknown";
      if (!grouped.has(datasetId)) {
        grouped.set(datasetId, []);
      }
      grouped.get(datasetId).push(view);
    });
    return grouped;
  }, [filteredViews]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // State
    views: filteredViews,
    viewMode,
    searchQuery,

    // Setters
    setViewMode,
    setSearchQuery,

    // Computed groups
    onCanvasViews,
    notPlacedViews,
    trashedViews,
    viewsByDataset,

    // Actions - all using ViewLifecycleService
    handlePlaceView,
    handleRemoveFromCanvas,
    handleTrashView,
    handleRestoreView,
    handleDeleteView,
    handleRenameView,
    handleFocusView,
    handleDuplicateView,

    // Refresh trigger (for manual refresh)
    refresh: () => setRefreshCounter((c) => c + 1),
  };
}

export default useViewsTab;
