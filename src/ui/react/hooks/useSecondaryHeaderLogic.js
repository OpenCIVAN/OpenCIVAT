/**
 * @file useSecondaryHeaderLogic.js
 * @description Hook that wires SecondaryHeader to the canvas/layout system.
 *
 * This hook bridges:
 * - LayoutPanelContext (canvas navigation, viewport)
 * - workspaceManager (active instance - source of truth)
 * - ViewConfigurationManager (view names, metadata)
 *
 * Usage:
 * ```jsx
 * const headerLogic = useSecondaryHeaderLogic();
 * <SecondaryHeader {...headerLogic} />
 * ```
 */

import { useCallback, useMemo, useEffect, useState } from "react";
import { useLayoutPanelContext } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import {
  getViewConfigurationManager,
  getDatasetManager,
} from "@Init/appInitializer";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { eventBus, BUS_EVENTS } from "@Core/events";
import { ui as log } from "@Utils/logger.js";

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_COLORS = [
  "#60a5fa", // Blue
  "#34d399", // Green
  "#2dd4bf", // Teal
  "#fb7185", // Pink
  "#c084fc", // Purple
  "#fbbf24", // Amber
];

/**
 * Get consistent color for a view based on its ID
 */
const getViewColor = (viewId, index = 0) => {
  if (!viewId) return VIEW_COLORS[0];
  const hash = viewId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return VIEW_COLORS[(hash + index) % VIEW_COLORS.length];
};

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useSecondaryHeaderLogic() {
  // =========================================================================
  // LAYOUT PANEL CONTEXT (canvas navigation + cells)
  // =========================================================================

  const layoutContext = useLayoutPanelContext();
  const logic = layoutContext?.logic || {};

  // Get cells (enriched placements) from context - this is the source of truth
  const cells = logic.cells || [];

  // Extract viewport position with safe defaults
  const viewport = useMemo(
    () => ({
      row: logic.viewport?.row ?? 0,
      col: logic.viewport?.col ?? 0,
    }),
    [logic.viewport]
  );

  // Canvas position for display (col, row format)
  const canvasPosition = useMemo(
    () => ({
      col: viewport.col,
      row: viewport.row,
    }),
    [viewport]
  );

  const isAtOrigin = canvasPosition.col === 0 && canvasPosition.row === 0;

  // Navigation functions from layout context
  const moveViewport = logic.moveViewport || (() => {});
  const navigateToCell = logic.navigateToCell || (() => {});
  const homepoint = logic.homepoint || { row: 0, col: 0 };

  // =========================================================================
  // NAVIGATION HANDLERS
  // =========================================================================

  /**
   * Handle direction-based navigation (up/down/left/right)
   */
  const handleNavigate = useCallback(
    (direction) => {
      log.debug("SecondaryHeader navigation:", direction);

      switch (direction) {
        case "up":
          moveViewport(-1, 0);
          break;
        case "down":
          moveViewport(1, 0);
          break;
        case "left":
          moveViewport(0, -1);
          break;
        case "right":
          moveViewport(0, 1);
          break;
        default:
          log.warn("Unknown direction:", direction);
      }
    },
    [moveViewport]
  );

  /**
   * Navigate to home/origin position
   */
  const handleHome = useCallback(() => {
    log.debug("SecondaryHeader: Navigate home");
    if (homepoint) {
      navigateToCell(homepoint.row, homepoint.col);
    } else {
      navigateToCell(0, 0);
    }
  }, [navigateToCell, homepoint]);

  /**
   * Open bookmarks panel/popout
   */
  const handleBookmark = useCallback(() => {
    log.debug("SecondaryHeader: Open bookmarks");
    window.dispatchEvent(new CustomEvent("open:bookmarks"));
  }, []);

  // =========================================================================
  // VIEW DATA (enriched with names)
  // =========================================================================

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeInstance, setActiveInstance] = useState(null);

  // Listen for view/placement changes
  useEffect(() => {
    const refresh = () => setRefreshKey((k) => k + 1);

    const unsubs = [
      eventBus.on(BUS_EVENTS.VIEW_PLACED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_REMOVED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_ADDED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_REMOVED, refresh),
    ];

    // Also listen for DOM events
    window.addEventListener("cia:views-loaded", refresh);
    window.addEventListener("cia:view-added", refresh);
    window.addEventListener("cia:view-updated", refresh);

    return () => {
      unsubs.forEach((unsub) => unsub?.());
      window.removeEventListener("cia:views-loaded", refresh);
      window.removeEventListener("cia:view-added", refresh);
      window.removeEventListener("cia:view-updated", refresh);
    };
  }, []);

  // Sync with workspaceManager.getActiveInstance() - the source of truth
  // This matches InstanceToolsTab behavior exactly
  useEffect(() => {
    const updateActiveInstance = () => {
      const instance = workspaceManager?.getActiveInstance?.();
      setActiveInstance(instance || null);
    };

    // Initial check
    updateActiveInstance();

    // Listen for the same events as InstanceToolsTab
    const handleInstanceFocus = () => {
      updateActiveInstance();
    };

    window.addEventListener("cia:instance-focused", handleInstanceFocus);
    window.addEventListener("cia:active-instance-changed", handleInstanceFocus);

    // Also listen to eventBus
    const unsub = eventBus.on(BUS_EVENTS.VIEW_FOCUSED, handleInstanceFocus);

    return () => {
      unsub?.();
      window.removeEventListener("cia:instance-focused", handleInstanceFocus);
      window.removeEventListener(
        "cia:active-instance-changed",
        handleInstanceFocus
      );
    };
  }, []);

  /**
   * Get enriched views on canvas with names
   * Uses cells from LayoutPanelContext which are already enriched with view metadata
   */
  const onCanvasViews = useMemo(() => {
    // cells from context are already enriched with viewConfiguration data
    return cells.map((cell, index) => {
      const viewId = cell.viewConfigurationId || cell.id;
      const cellName = cell.name || cell.title;

      // Check if the name is a default placeholder
      const isDefaultName =
        !cellName ||
        cellName === "Untitled View" ||
        cellName === "Default View";

      // Get dataset filename as fallback for default names
      let displayName = cellName;
      if (isDefaultName) {
        const vcm = getViewConfigurationManager?.();
        const viewConfig = vcm?.getView?.(viewId);
        const dataset = viewConfig?.datasetId
          ? getDatasetManager?.()?.getDataset?.(viewConfig.datasetId)
          : null;
        displayName = dataset?.filename || cellName || `View ${index + 1}`;
      }

      return {
        id: viewId,
        name: displayName,
        type: cell.content?.type || "vtk",
        position: { col: cell.col, row: cell.row },
        color: cell.color || cell.instanceColor || getViewColor(viewId, index),
        datasetName: cell.datasetName || cell.datasetId,
      };
    });
  }, [cells, refreshKey]);

  /**
   * Get available views (not on canvas)
   */
  const availableViews = useMemo(() => {
    const vcm = getViewConfigurationManager?.();
    if (!vcm) return [];

    const allViews = vcm.getAllViewConfigurations?.() || [];
    const onCanvasIds = new Set(onCanvasViews.map((v) => v.id));

    return allViews
      .filter((v) => !onCanvasIds.has(v.id))
      .map((v, index) => ({
        id: v.id,
        name: v.name || `View of ${v.datasetId || "Unknown"}`,
        type: v.type || "vtk",
        color: getViewColor(v.id, index),
        datasetName: v.datasetName || v.datasetId,
      }));
  }, [onCanvasViews, refreshKey]);

  /**
   * Active view (currently selected) - derived from workspaceManager's activeInstance
   * Uses workspaceManager.getViewColor() for consistent coloring with InstanceToolsTab
   */
  const activeView = useMemo(() => {
    if (!activeInstance) return null;

    const viewConfigId = activeInstance.viewConfigId || activeInstance.viewId;
    if (!viewConfigId) return null;

    // Get color from workspaceManager for consistency
    const instanceColor = workspaceManager.getViewColor?.(viewConfigId);
    const colorHex =
      instanceColor?.hex || activeInstance.color?.hex || activeInstance.color;

    // Find matching view in onCanvasViews for position info
    const canvasView = onCanvasViews.find((v) => v.id === viewConfigId);

    // Get view name from ViewConfigurationManager
    // Prefer dataset filename over default "Untitled View" name
    const vcm = getViewConfigurationManager?.();
    const viewConfig = vcm?.getView?.(viewConfigId);
    const dataset = viewConfig?.datasetId
      ? getDatasetManager?.()?.getDataset?.(viewConfig.datasetId)
      : null;

    // Check if view name is a default placeholder
    const isDefaultName =
      !viewConfig?.name ||
      viewConfig.name === "Untitled View" ||
      viewConfig.name === "Default View";

    // Prefer dataset filename over default view name
    const displayName = isDefaultName
      ? dataset?.filename ||
        viewConfig?.name ||
        activeInstance.name ||
        canvasView?.name ||
        "Active View"
      : viewConfig.name;

    return {
      id: viewConfigId,
      name: displayName,
      type: viewConfig?.handlerType || activeInstance.type || "vtk",
      position: canvasView?.position || null,
      color: colorHex || canvasView?.color || VIEW_COLORS[0],
      datasetName:
        dataset?.filename || viewConfig?.datasetName || canvasView?.datasetName,
    };
  }, [activeInstance, onCanvasViews, refreshKey]);

  // =========================================================================
  // VIEW HANDLERS
  // =========================================================================

  /**
   * Select a view (focus it)
   * Sets the active instance via workspaceManager to stay in sync with InstanceToolsTab
   */
  const handleSelectView = useCallback(
    (viewId) => {
      log.debug("SecondaryHeader: Select view", viewId);

      // Find the instance by viewConfigId and set it as active
      const instance = workspaceManager?.getInstanceByViewConfigId?.(viewId);
      if (instance?.instanceId) {
        workspaceManager.setActiveInstance(instance.instanceId);
      }

      // Find the view's position and navigate to it
      const view = onCanvasViews.find((v) => v.id === viewId);
      if (view?.position) {
        navigateToCell(view.position.row, view.position.col);
      }

      // Emit events for other components
      eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId });
      window.dispatchEvent(
        new CustomEvent("cia:instance-focused", {
          detail: { viewId, instanceId: instance?.instanceId },
        })
      );
    },
    [onCanvasViews, navigateToCell]
  );

  /**
   * Place a view on the canvas
   */
  const handlePlaceView = useCallback(
    async (viewId) => {
      log.debug("SecondaryHeader: Place view", viewId);

      // Find first empty cell or use current viewport position
      const canvas = canvasManager?.getActiveCanvas?.();
      if (!canvas) return;

      // Try to place at current viewport position
      await canvas.addPlacement?.({
        row: viewport.row,
        col: viewport.col,
        content: {
          type: "view",
          viewConfigurationId: viewId,
        },
      });

      // Set the placed view as active
      const instance = workspaceManager?.getInstanceByViewConfigId?.(viewId);
      if (instance?.instanceId) {
        workspaceManager.setActiveInstance(instance.instanceId);
      }
    },
    [viewport]
  );

  // =========================================================================
  // RETURN API
  // =========================================================================

  return {
    // Navigation props
    canvasPosition,
    isAtOrigin,
    onNavigate: handleNavigate,
    onHome: handleHome,
    onBookmark: handleBookmark,

    // View props
    activeView,
    onCanvasViews,
    availableViews,
    onSelectView: handleSelectView,
    onPlaceView: handlePlaceView,
  };
}

export default useSecondaryHeaderLogic;
