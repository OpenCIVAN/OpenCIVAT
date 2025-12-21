/**
 * @file useViewsTab.js
 * @description Hook for Views tab state management.
 *
 * ARCHITECTURE:
 * - Uses ViewLifecycleService for all view operations (centralized)
 * - Uses EventBus + manager events for reactivity
 * - Uses useState instead of useMemo for views to ensure reactivity
 * - Properly tracks active/inactive/linked status
 *
 * UPDATED: Now uses ViewLifecycleService instead of direct manager calls
 *
 * @example
 * const { views, onCanvasViews, handlePlaceView } = useViewsTab({ workspaceId });
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { viewLifecycleService } from "@Services/ViewLifecycleService.js";
import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";
import {
  VIEW_EVENTS,
  CANVAS_MANAGER_EVENTS as CANVAS_EVENTS,
  DOM_EVENTS,
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
// HELPER: Find placement for a view (fallback if canvasManager method doesn't exist)
// =============================================================================

function findPlacementForView(viewId) {
  if (!viewId || !canvasManager) return null;

  // Try canvasManager method first (if it exists)
  if (typeof canvasManager.getPlacementForView === "function") {
    return canvasManager.getPlacementForView(viewId);
  }

  // Fallback: manually search through canvases
  // Check active canvas first
  const activeCanvas = canvasManager.getActiveCanvas?.();
  if (activeCanvas?.placements) {
    const placement = activeCanvas.placements.find(
      (p) =>
        p.content?.viewConfigurationId === viewId ||
        p.content?.viewId === viewId
    );
    if (placement) return placement;
  }

  // Check all canvases
  const allCanvases = canvasManager.getAllCanvases?.() || [];
  for (const canvas of allCanvases) {
    if (canvas.id === activeCanvas?.id) continue; // Already checked
    const placement = canvas.placements?.find(
      (p) =>
        p.content?.viewConfigurationId === viewId ||
        p.content?.viewId === viewId
    );
    if (placement) return placement;
  }

  return null;
}

// =============================================================================
// HELPER: Enrich view with runtime data
// =============================================================================

function enrichView(view) {
  if (!view) return null;

  // Get placement info from canvas
  const placement = findPlacementForView(view.id);
  const instanceColor = workspaceManager?.getViewColor?.(view.id);

  // Determine if view has any links
  const hasLinks =
    view.links &&
    Object.values(view.links).some(
      (link) => link && (link.isActive?.() || link.targetViewId)
    );

  // Count active links
  const linkedCount = view.links
    ? Object.values(view.links).filter((link) => link?.targetViewId).length
    : 0;

  // isOnCanvas is determined by placement existence
  const isOnCanvas = placement !== null;

  return {
    ...view,
    id: view.id,
    name: view.name || "Untitled View",
    datasetId: view.datasetId,
    datasetName: view.datasetName || view.datasetId,
    color: instanceColor || view.color || "#60a5fa",

    // Position & size
    position: placement ? { row: placement.row, col: placement.col } : null,
    rowSpan: placement?.rowSpan || view.rowSpan || 1,
    colSpan: placement?.colSpan || view.colSpan || 1,

    // Canvas placement status
    isOnCanvas,
    placementId: placement?.id || null,

    // Status - PLACEMENT is authoritative for active/inactive
    // Only use view.status for "trashed" state
    status:
      view.status === "trashed"
        ? "trashed"
        : isOnCanvas
        ? "active"
        : "inactive",

    // Link info
    hasLinks,
    linkedCount,
    isLinked: hasLinks,
  };
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for Views tab state management.
 *
 * @param {Object} options - Hook options
 * @param {string} options.workspaceId - Current workspace ID
 * @returns {Object} Hook return value
 */
export function useViewsTab({ workspaceId }) {
  // =========================================================================
  // STATE - Use useState for reactivity (not useMemo!)
  // =========================================================================

  const [views, setViews] = useState([]);
  const [trashedViews, setTrashedViews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState(["active", "inactive"]);
  const [viewMode, setViewMode] = useState(VIEW_MODES.BY_STATUS);
  const [sortBy, setSortBy] = useState("name");
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // =========================================================================
  // LOAD VIEWS - Called on mount and when events fire
  // =========================================================================

  const loadViews = useCallback(() => {
    try {
      const viewManager = getViewConfigurationManager();
      if (!viewManager) {
        log.debug("ViewConfigurationManager not available yet");
        return;
      }

      // Get all views
      const allRawViews = getAllViewsFromManager(viewManager);

      // Separate trashed from non-trashed
      const nonTrashed = allRawViews.filter((v) => v.status !== "trashed");
      const trashed =
        viewManager.getTrashedViews?.() ||
        allRawViews.filter((v) => v.status === "trashed");

      // Enrich views with runtime data
      const enrichedViews = nonTrashed.map(enrichView).filter(Boolean);
      const enrichedTrashed = trashed.map(enrichView).filter(Boolean);

      setViews(enrichedViews);
      setTrashedViews(enrichedTrashed);

      log.debug(
        `Loaded ${enrichedViews.length} views, ${enrichedTrashed.length} trashed`
      );
    } catch (e) {
      log.error("Failed to load views:", e);
      setError(e);
    }
  }, []);

  // =========================================================================
  // INITIAL LOAD
  // =========================================================================

  useEffect(() => {
    loadViews();
  }, [loadViews, workspaceId]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - Manager Events
  // =========================================================================

  useEffect(() => {
    const viewManager = getViewConfigurationManager();
    if (!viewManager?.on) return;

    // Subscribe to ViewConfigurationManager events
    const events = [
      VIEW_EVENTS.ADDED,
      VIEW_EVENTS.UPDATED,
      VIEW_EVENTS.REMOVED,
      VIEW_EVENTS.TRASHED,
      VIEW_EVENTS.RESTORED,
      VIEW_EVENTS.DELETED,
    ];

    events.forEach((event) => viewManager.on(event, loadViews));

    return () => {
      events.forEach((event) => viewManager.off(event, loadViews));
    };
  }, [loadViews]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - EventBus Events (from ViewLifecycleService)
  // =========================================================================

  useEffect(() => {
    const unsubs = [
      eventBus.on(BUS_EVENTS.VIEW_CREATED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_PLACED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_REMOVED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_TRASHED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_RESTORED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_DELETED, loadViews),
      eventBus.on(BUS_EVENTS.VIEW_RENAMED, loadViews),
      eventBus.on(BUS_EVENTS.PLACEMENT_ADDED, loadViews),
      eventBus.on(BUS_EVENTS.PLACEMENT_REMOVED, loadViews),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [loadViews]);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - Canvas Manager Events
  // =========================================================================

  useEffect(() => {
    const unsubs = [
      canvasManager.on(CANVAS_EVENTS.PLACEMENT_ADDED, loadViews),
      canvasManager.on(CANVAS_EVENTS.PLACEMENT_REMOVED, loadViews),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [loadViews]);

  // =========================================================================
  // FILTERED & SORTED VIEWS
  // =========================================================================

  const filteredViews = useMemo(() => {
    let result = [...views];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name?.toLowerCase().includes(query) ||
          v.datasetName?.toLowerCase().includes(query)
      );
    }

    // Apply status filters
    if (activeFilters.length > 0 && !activeFilters.includes("all")) {
      result = result.filter((v) => {
        if (activeFilters.includes("active") && v.status === "active")
          return true;
        if (activeFilters.includes("inactive") && v.status === "inactive")
          return true;
        if (activeFilters.includes("shared") && v.isShared) return true;
        if (activeFilters.includes("linked") && v.isLinked) return true;
        return false;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "position":
          const posA = a.position || { row: 999, col: 999 };
          const posB = b.position || { row: 999, col: 999 };
          return posA.row !== posB.row
            ? posA.row - posB.row
            : posA.col - posB.col;
        case "recent":
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        case "dataset":
          return (a.datasetName || "").localeCompare(b.datasetName || "");
        default:
          return 0;
      }
    });

    return result;
  }, [views, searchQuery, activeFilters, sortBy]);

  // =========================================================================
  // CATEGORIZED VIEWS
  // =========================================================================

  const onCanvasViews = useMemo(
    () => filteredViews.filter((v) => v.isOnCanvas),
    [filteredViews]
  );

  const notPlacedViews = useMemo(
    () => filteredViews.filter((v) => !v.isOnCanvas && v.status !== "trashed"),
    [filteredViews]
  );

  const linkedViews = useMemo(
    () => filteredViews.filter((v) => v.isLinked),
    [filteredViews]
  );

  const unlinkedViews = useMemo(
    () => filteredViews.filter((v) => !v.isLinked),
    [filteredViews]
  );

  const recentlyDeletedViews = useMemo(() => trashedViews, [trashedViews]);

  // Group by dataset
  const viewsByDataset = useMemo(() => {
    const groups = new Map();

    filteredViews.forEach((view) => {
      const datasetId = view.datasetId || "unknown";
      const datasetName = view.datasetName || "Unknown Dataset";

      if (!groups.has(datasetId)) {
        groups.set(datasetId, {
          id: datasetId,
          name: datasetName,
          views: [],
        });
      }
      groups.get(datasetId).views.push(view);
    });

    return Array.from(groups.values());
  }, [filteredViews]);

  // =========================================================================
  // FILTER TOGGLE
  // =========================================================================

  const toggleFilter = useCallback((filterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  // =========================================================================
  // DATASET EXPANSION
  // =========================================================================

  const toggleDatasetExpanded = useCallback((datasetId) => {
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(datasetId)) {
        next.delete(datasetId);
      } else {
        next.add(datasetId);
      }
      return next;
    });
  }, []);

  // =========================================================================
  // VIEW LIFECYCLE HANDLERS - Using ViewLifecycleService
  // =========================================================================

  /**
   * Place a view on the canvas
   */
  const handlePlaceView = useCallback(async (viewId) => {
    log.debug("Placing view on canvas:", viewId);
    try {
      await viewLifecycleService.placeView(viewId);
    } catch (e) {
      log.error("Failed to place view:", e);
      setError(e);
    }
  }, []);

  /**
   * Remove a view from the canvas (but keep the view)
   */
  const handleRemoveFromCanvas = useCallback(async (viewId) => {
    log.debug("Removing view from canvas:", viewId);
    try {
      await viewLifecycleService.removeViewFromCanvas(viewId);
    } catch (e) {
      log.error("Failed to remove view:", e);
      setError(e);
    }
  }, []);

  /**
   * Move a view to trash (soft delete)
   */
  const handleTrashView = useCallback(async (viewId) => {
    log.debug("Trashing view:", viewId);
    try {
      await viewLifecycleService.trashView(viewId);
    } catch (e) {
      log.error("Failed to trash view:", e);
      setError(e);
    }
  }, []);

  /**
   * Restore a view from trash
   */
  const handleRestoreView = useCallback(async (viewId) => {
    log.debug("Restoring view:", viewId);
    try {
      await viewLifecycleService.restoreView(viewId);
    } catch (e) {
      log.error("Failed to restore view:", e);
      setError(e);
    }
  }, []);

  /**
   * Permanently delete a view
   */
  const handlePermanentDelete = useCallback(async (viewId) => {
    log.debug("Permanently deleting view:", viewId);
    try {
      await viewLifecycleService.deleteView(viewId);
    } catch (e) {
      log.error("Failed to delete view:", e);
      setError(e);
    }
  }, []);

  /**
   * Open the create view modal
   */
  const handleCreateView = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DOM_EVENTS.OPEN_CREATE_VIEW_MODAL));
  }, []);

  /**
   * Select/focus a view (navigate to it if on canvas)
   */
  const handleSelectView = useCallback((viewId) => {
    log.debug("Selecting view:", viewId);
    viewLifecycleService.focusView(viewId);
  }, []);

  /**
   * Navigate to view's position on canvas
   */
  const handleNavigateToView = useCallback(
    (viewId) => {
      const view = views.find((v) => v.id === viewId);
      if (view?.position) {
        window.dispatchEvent(
          new CustomEvent(DOM_EVENTS.NAVIGATE_TO_CELL, {
            detail: { row: view.position.row, col: view.position.col },
          })
        );
      }
    },
    [views]
  );

  /**
   * Rename a view
   */
  const handleRenameView = useCallback(async (viewId, newName) => {
    log.debug("Renaming view:", viewId, "to", newName);
    try {
      await viewLifecycleService.renameView(viewId, newName);
    } catch (e) {
      log.error("Failed to rename view:", e);
      setError(e);
    }
  }, []);

  /**
   * Resize a view's placement on canvas
   * Note: This still uses canvasManager directly as it's a placement operation
   */
  const handleResizeView = useCallback((viewId, size) => {
    log.debug("Resizing view:", viewId, size);
    const placement = canvasManager?.getPlacementForView?.(viewId);
    if (placement) {
      canvasManager?.resizePlacement?.(placement.id, size.rows, size.cols);
    }
  }, []);

  // =========================================================================
  // MANUAL REFRESH
  // =========================================================================

  const refetch = useCallback(() => {
    loadViews();
  }, [loadViews]);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // Data
    views: filteredViews,
    allViews: views,
    onCanvasViews,
    notPlacedViews,
    linkedViews,
    unlinkedViews,
    recentlyDeletedViews,
    viewsByDataset,

    // State
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    expandedDatasets,
    toggleDatasetExpanded,

    // Handlers - all using ViewLifecycleService
    handlePlaceView,
    handleRemoveFromCanvas,
    handleTrashView,
    handleRestoreView,
    handlePermanentDelete,
    handleCreateView,
    handleSelectView,
    handleNavigateToView,
    handleRenameView,
    handleResizeView,
    refetch,
  };
}

export default useViewsTab;
