/**
 * @file useViewsTab.js
 * @description Hook for Views tab state management.
 *
 * ARCHITECTURE:
 * - Uses centralized event types from @Core/events
 * - Uses useState instead of useMemo for views to ensure reactivity
 * - Properly tracks active/inactive/linked status
 *
 * @example
 * const { views, onCanvasViews, handlePlaceView } = useViewsTab({ workspaceId });
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
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
// HELPER: Enrich view with runtime data
// =============================================================================

function enrichView(view) {
  if (!view) return null;

  // Get placement info from canvas
  const placement = canvasManager?.getPlacementForView?.(view.id);
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

    // Status - use authoritative status, fallback to placement check
    status:
      view.status === "trashed"
        ? "trashed"
        : view.status === "active" || placement
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

      // Enrich all views with runtime data
      const enrichedViews = nonTrashed.map(enrichView).filter(Boolean);
      const enrichedTrashed = trashed
        .map((v) => ({
          ...enrichView(v),
          expiresInHours: v.expiresInHours || 720,
        }))
        .filter(Boolean);

      log.debug(
        `Loaded ${enrichedViews.length} views, ${enrichedTrashed.length} trashed`
      );

      setViews(enrichedViews);
      setTrashedViews(enrichedTrashed);
    } catch (e) {
      log.error("Failed to load views:", e);
      setError(e);
    }
  }, []);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - Using centralized event types
  // =========================================================================

  useEffect(() => {
    // Initial load
    loadViews();

    const viewManager = getViewConfigurationManager();

    // Manager event handlers
    const managerEvents = [
      VIEW_EVENTS.ADDED,
      VIEW_EVENTS.UPDATED,
      VIEW_EVENTS.REMOVED,
      VIEW_EVENTS.TRASHED,
      VIEW_EVENTS.RESTORED,
      VIEW_EVENTS.DELETED,
      VIEW_EVENTS.LINK_CHANGED,
    ];

    managerEvents.forEach((event) => {
      viewManager?.on?.(event, loadViews);
    });

    // Canvas manager events
    const canvasEvents = [
      CANVAS_EVENTS.PLACEMENT_ADDED,
      CANVAS_EVENTS.PLACEMENT_UPDATED,
      CANVAS_EVENTS.PLACEMENT_REMOVED,
    ];

    canvasEvents.forEach((event) => {
      canvasManager?.on?.(event, loadViews);
    });

    // DOM events
    const domEvents = [
      DOM_EVENTS.VIEW_PLACED,
      DOM_EVENTS.VIEW_REMOVED,
      DOM_EVENTS.CANVAS_UPDATED,
      DOM_EVENTS.PLACEMENT_ADDED,
      DOM_EVENTS.PLACEMENT_REMOVED,
    ];

    domEvents.forEach((event) => {
      window.addEventListener(event, loadViews);
    });

    // Cleanup
    return () => {
      managerEvents.forEach((event) => {
        viewManager?.off?.(event, loadViews);
      });

      canvasEvents.forEach((event) => {
        canvasManager?.off?.(event, loadViews);
      });

      domEvents.forEach((event) => {
        window.removeEventListener(event, loadViews);
      });
    };
  }, [loadViews]);

  // =========================================================================
  // FILTERED VIEWS - This can be useMemo since it's derived from state
  // =========================================================================

  const filteredViews = useMemo(() => {
    let result = [...views];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name?.toLowerCase().includes(query) ||
          v.datasetName?.toLowerCase().includes(query)
      );
    }

    // Status/type filters
    result = result.filter((v) => {
      // Check status filters
      if (v.status === "active" && activeFilters.includes("active"))
        return true;
      if (v.status === "inactive" && activeFilters.includes("inactive"))
        return true;

      // Check type filters
      if (v.isShared && activeFilters.includes("shared")) return true;
      if (v.isLinked && activeFilters.includes("linked")) return true;

      // Default: show if status is in active filters
      return activeFilters.includes(v.status);
    });

    // Sort
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
    () => filteredViews.filter((v) => v.status === "active"),
    [filteredViews]
  );

  const notPlacedViews = useMemo(
    () => filteredViews.filter((v) => v.status === "inactive"),
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
  // VIEW LIFECYCLE HANDLERS
  // =========================================================================

  const handlePlaceView = useCallback(async (viewId) => {
    log.debug("Placing view on canvas:", viewId);
    try {
      await canvasManager?.placeView?.(viewId);
      getViewConfigurationManager()?.activateView?.(viewId);

      window.dispatchEvent(
        new CustomEvent(DOM_EVENTS.VIEW_PLACED, {
          detail: { viewId },
        })
      );
    } catch (e) {
      log.error("Failed to place view:", e);
      setError(e);
    }
  }, []);

  const handleRemoveFromCanvas = useCallback(async (viewId) => {
    log.debug("Removing view from canvas:", viewId);
    try {
      await canvasManager?.removeViewPlacements?.(viewId);
      getViewConfigurationManager()?.deactivateView?.(viewId);

      window.dispatchEvent(
        new CustomEvent(DOM_EVENTS.VIEW_REMOVED, {
          detail: { viewId },
        })
      );
    } catch (e) {
      log.error("Failed to remove view:", e);
      setError(e);
    }
  }, []);

  const handleTrashView = useCallback(async (viewId) => {
    log.debug("Trashing view:", viewId);
    try {
      await canvasManager?.removeViewPlacements?.(viewId);
      getViewConfigurationManager()?.trashView?.(viewId);
    } catch (e) {
      log.error("Failed to trash view:", e);
      setError(e);
    }
  }, []);

  const handleRestoreView = useCallback((viewId) => {
    log.debug("Restoring view:", viewId);
    try {
      getViewConfigurationManager()?.restoreView?.(viewId);
    } catch (e) {
      log.error("Failed to restore view:", e);
      setError(e);
    }
  }, []);

  const handlePermanentDelete = useCallback(async (viewId) => {
    log.debug("Permanently deleting view:", viewId);
    try {
      await canvasManager?.removeViewPlacements?.(viewId);
      window.dispatchEvent(
        new CustomEvent(DOM_EVENTS.VIEW_CLOSED, {
          detail: { viewId },
        })
      );

      getViewConfigurationManager()?.permanentlyDeleteView?.(viewId);
    } catch (e) {
      log.error("Failed to delete view:", e);
      setError(e);
    }
  }, []);

  const handleCreateView = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DOM_EVENTS.OPEN_CREATE_VIEW_MODAL));
  }, []);

  const handleSelectView = useCallback((viewId) => {
    window.dispatchEvent(
      new CustomEvent(DOM_EVENTS.REQUEST_INSTANCE, {
        detail: { viewId, spawnNew: false },
      })
    );
  }, []);

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

  const handleRenameView = useCallback((viewId, newName) => {
    log.debug("Renaming view:", viewId, "to", newName);
    getViewConfigurationManager()?.renameView?.(viewId, newName);
  }, []);

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

    // Handlers
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
