/**
 * @file useViewsTab.js
 * @description Hook for Views tab state management.
 * Provides view filtering, lifecycle operations, and canvas integration.
 *
 * CRITICAL: Includes proper event subscriptions to refresh when views change.
 * This was missing in the previous implementation causing stale data.
 *
 * @example
 * const { views, onCanvasViews, handlePlaceView } = useViewsTab({ workspaceId });
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
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
  // STATE
  // =========================================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState(["active", "inactive"]);
  const [viewMode, setViewMode] = useState(VIEW_MODES.BY_STATUS);
  const [sortBy, setSortBy] = useState("name");
  const [expandedDatasets, setExpandedDatasets] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // CRITICAL: Refresh counter to trigger re-computation when views change
  const [refreshKey, setRefreshKey] = useState(0);

  // =========================================================================
  // EVENT SUBSCRIPTIONS - CRITICAL FOR REACTIVITY
  // =========================================================================

  useEffect(() => {
    const refresh = () => {
      log.debug("Views tab: Refreshing due to view event");
      setRefreshKey((k) => k + 1);
    };

    // Get the view manager
    const viewManager = getViewConfigurationManager();

    // Subscribe to ViewConfigurationManager events
    viewManager?.on?.("viewCreated", refresh);
    viewManager?.on?.("viewUpdated", refresh);
    viewManager?.on?.("viewTrashed", refresh);
    viewManager?.on?.("viewRestored", refresh);
    viewManager?.on?.("viewDeleted", refresh);
    viewManager?.on?.("viewActivated", refresh);
    viewManager?.on?.("viewDeactivated", refresh);
    viewManager?.on?.("viewRenamed", refresh);

    // Subscribe to canvas events
    window.addEventListener("cia:view-placed", refresh);
    window.addEventListener("cia:view-removed", refresh);
    window.addEventListener("cia:canvas-updated", refresh);

    return () => {
      viewManager?.off?.("viewCreated", refresh);
      viewManager?.off?.("viewUpdated", refresh);
      viewManager?.off?.("viewTrashed", refresh);
      viewManager?.off?.("viewRestored", refresh);
      viewManager?.off?.("viewDeleted", refresh);
      viewManager?.off?.("viewActivated", refresh);
      viewManager?.off?.("viewDeactivated", refresh);
      viewManager?.off?.("viewRenamed", refresh);

      window.removeEventListener("cia:view-placed", refresh);
      window.removeEventListener("cia:view-removed", refresh);
      window.removeEventListener("cia:canvas-updated", refresh);
    };
  }, []);

  // =========================================================================
  // GET ALL VIEWS - Includes refreshKey dependency
  // =========================================================================

  const allViews = useMemo(() => {
    try {
      const viewManager = getViewConfigurationManager();
      if (!viewManager) {
        log.warn("ViewConfigurationManager not available");
        return [];
      }

      // Get all views from the internal cache
      // Note: _viewConfigs is a Map, we need to access it properly
      // Try different methods to get all views
      let views = [];

      // Method 1: Try getViewsForDataset with all datasets (if available)
      // Method 2: Combine getMyViews + getSharedWithMe (may miss some)
      // Method 3: Use getActiveViews for now + manual inactive detection

      // First, try to get views using available methods
      const myViews = viewManager.getMyViews?.() || [];
      const sharedViews = viewManager.getSharedWithMe?.() || [];
      const trashedViews = viewManager.getTrashedViews?.() || [];

      log.debug(
        `Views found: ${myViews.length} owned, ${sharedViews.length} shared, ${trashedViews.length} trashed`
      );

      // Combine all (deduplicate by ID)
      const viewMap = new Map();
      [...myViews, ...sharedViews].forEach((v) => {
        if (v && v.id && !viewMap.has(v.id)) {
          viewMap.set(v.id, v);
        }
      });

      views = Array.from(viewMap.values());

      // If no views found, log a warning
      if (views.length === 0) {
        log.debug(
          "No views found - this may be normal if no views have been created yet"
        );
      }

      // Enrich views with additional data
      return views.map((v) => {
        // Get instance color from workspaceManager
        const instanceColor = workspaceManager?.getViewColor?.(v.id);

        // Get position from canvas if active
        const placement = canvasManager?.getPlacementForView?.(v.id);

        return {
          ...v,
          // Ensure we have the view id
          id: v.id,
          name: v.name || "Untitled View",
          datasetId: v.datasetId,
          datasetName: v.datasetName || v.datasetId,
          color: instanceColor || v.color || "#60a5fa",
          position: placement
            ? { row: placement.row, col: placement.col }
            : null,
          rowSpan: placement?.rowSpan || v.rowSpan || 1,
          colSpan: placement?.colSpan || v.colSpan || 1,
          // Determine status based on placement
          status: placement
            ? "active"
            : v.status === "trashed"
            ? "trashed"
            : "inactive",
        };
      });
    } catch (e) {
      log.error("Failed to get views:", e);
      return [];
    }
  }, [refreshKey]); // CRITICAL: Include refreshKey as dependency

  // =========================================================================
  // TRASHED VIEWS
  // =========================================================================

  const trashedViews = useMemo(() => {
    try {
      const viewManager = getViewConfigurationManager();
      return viewManager?.getTrashedViews?.() || [];
    } catch (e) {
      log.warn("Failed to get trashed views:", e);
      return [];
    }
  }, [refreshKey]);

  // =========================================================================
  // FILTER VIEWS
  // =========================================================================

  const filterViews = useCallback(
    (views) => {
      return views.filter((v) => {
        // Status filter
        if (v.status === "active" && !activeFilters.includes("active"))
          return false;
        if (v.status === "inactive" && !activeFilters.includes("inactive"))
          return false;
        if (v.isShared && activeFilters.includes("shared")) return true;
        if (v.linkedCount > 0 && activeFilters.includes("linked")) return true;

        // If we have active/inactive in filters, include those
        if (activeFilters.includes("active") && v.status === "active")
          return true;
        if (activeFilters.includes("inactive") && v.status === "inactive")
          return true;

        // Default: show if active or inactive is in filter
        return activeFilters.includes(v.status);
      });
    },
    [activeFilters]
  );

  // =========================================================================
  // FILTERED AND CATEGORIZED VIEWS
  // =========================================================================

  const filteredViews = useMemo(() => {
    let views = allViews.filter((v) => v.status !== "trashed");

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      views = views.filter(
        (v) =>
          v.name?.toLowerCase().includes(query) ||
          v.datasetName?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    views = filterViews(views);

    // Sort
    views.sort((a, b) => {
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

    return views;
  }, [allViews, searchQuery, filterViews, sortBy]);

  // Categorize views
  const onCanvasViews = useMemo(
    () => filteredViews.filter((v) => v.status === "active"),
    [filteredViews]
  );

  const notPlacedViews = useMemo(
    () => filteredViews.filter((v) => v.status === "inactive"),
    [filteredViews]
  );

  const recentlyDeletedViews = useMemo(
    () =>
      trashedViews.map((v) => ({
        ...v,
        expiresInHours: v.expiresInHours || 720, // Default 30 days
      })),
    [trashedViews]
  );

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

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("cia:view-placed", {
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

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("cia:view-removed", {
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
      // Remove from canvas first if placed
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
      // Close any lingering instances first
      await canvasManager?.removeViewPlacements?.(viewId);
      window.dispatchEvent(
        new CustomEvent("cia:close-view", {
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
    window.dispatchEvent(new CustomEvent("cia:open-create-view-modal"));
  }, []);

  const handleSelectView = useCallback((viewId) => {
    // Request the instance for this view
    window.dispatchEvent(
      new CustomEvent("cia:request-instance", {
        detail: { viewId, spawnNew: false },
      })
    );
  }, []);

  const handleNavigateToView = useCallback(
    (viewId) => {
      const view = allViews.find((v) => v.id === viewId);
      if (view?.position) {
        window.dispatchEvent(
          new CustomEvent("cia:navigate-to-cell", {
            detail: { row: view.position.row, col: view.position.col },
          })
        );
      }
    },
    [allViews]
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
    setRefreshKey((k) => k + 1);
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // Data
    views: filteredViews,
    allViews,
    onCanvasViews,
    notPlacedViews,
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
