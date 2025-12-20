/**
 * @file useViewsTab.js
 * @description Hook for Views tab state management.
 * Provides view filtering, lifecycle operations, and canvas integration.
 *
 * @example
 * const { views, onCanvasViews, handlePlaceView } = useViewsTab({ workspaceId });
 */

import { useState, useMemo, useCallback } from "react";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { views as log } from "@Utils/logger.js";

/**
 * @typedef {Object} UseViewsTabOptions
 * @property {string} workspaceId - Current workspace ID
 */

/**
 * @typedef {Object} UseViewsTabReturn
 * @property {Array} views - All views
 * @property {Array} onCanvasViews - Views currently on canvas
 * @property {Array} notPlacedViews - Views not on canvas
 * @property {Array} recentlyDeletedViews - Soft-deleted views
 * @property {boolean} isLoading - Loading state
 * @property {Error|null} error - Error state
 * @property {string} searchQuery - Current search query
 * @property {Function} setSearchQuery - Set search query
 * @property {string} activeFilter - Active filter ID
 * @property {Function} setActiveFilter - Set active filter
 * @property {Function} handlePlaceView - Place view on canvas
 * @property {Function} handleRemoveFromCanvas - Remove view from canvas
 * @property {Function} handleTrashView - Move view to trash
 * @property {Function} handleRestoreView - Restore view from trash
 * @property {Function} handlePermanentDelete - Permanently delete view
 * @property {Function} handleCreateView - Create new view
 * @property {Function} refetch - Refresh views
 */

/**
 * Hook for Views tab state management.
 *
 * @param {UseViewsTabOptions} options - Hook options
 * @returns {UseViewsTabReturn} Hook return value
 */
export function useViewsTab({ workspaceId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get all views from ViewConfigurationManager
  const allViews = useMemo(() => {
    try {
      return getViewConfigurationManager()?.getAllViews() || [];
    } catch (e) {
      log.error("Failed to get views:", e);
      return [];
    }
  }, []);

  // Filter views by search and active filter
  const filteredViews = useMemo(() => {
    let views = allViews;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      views = views.filter(
        (v) =>
          v.name?.toLowerCase().includes(query) ||
          v.datasetName?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (activeFilter === "shared") {
      views = views.filter((v) => v.isShared);
    } else if (activeFilter === "linked") {
      views = views.filter((v) => v.linkedCount > 0);
    }

    return views;
  }, [allViews, searchQuery, activeFilter]);

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
    () => filteredViews.filter((v) => v.status === "trashed"),
    [filteredViews]
  );

  // Handlers
  const handlePlaceView = useCallback(async (viewId) => {
    log.debug("Placing view on canvas:", viewId);
    try {
      await canvasManager?.placeView(viewId);
      getViewConfigurationManager()?.activateView(viewId);
    } catch (e) {
      log.error("Failed to place view:", e);
    }
  }, []);

  const handleRemoveFromCanvas = useCallback(async (viewId) => {
    log.debug("Removing view from canvas:", viewId);
    try {
      await canvasManager?.removeViewPlacements(viewId);
      getViewConfigurationManager()?.deactivateView(viewId);
    } catch (e) {
      log.error("Failed to remove view:", e);
    }
  }, []);

  const handleTrashView = useCallback((viewId) => {
    log.debug("Trashing view:", viewId);
    getViewConfigurationManager()?.trashView(viewId);
  }, []);

  const handleRestoreView = useCallback((viewId) => {
    log.debug("Restoring view:", viewId);
    getViewConfigurationManager()?.restoreView(viewId);
  }, []);

  const handlePermanentDelete = useCallback((viewId) => {
    log.debug("Permanently deleting view:", viewId);
    getViewConfigurationManager()?.permanentlyDeleteView(viewId);
  }, []);

  const handleCreateView = useCallback(() => {
    // Dispatch event to open create view modal
    window.dispatchEvent(new CustomEvent("cia:open-create-view-modal"));
  }, []);

  const refetch = useCallback(() => {
    // Force re-render by updating a state
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100);
  }, []);

  return {
    views: filteredViews,
    onCanvasViews,
    notPlacedViews,
    recentlyDeletedViews,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    handlePlaceView,
    handleRemoveFromCanvas,
    handleTrashView,
    handleRestoreView,
    handlePermanentDelete,
    handleCreateView,
    refetch,
  };
}

export default useViewsTab;
