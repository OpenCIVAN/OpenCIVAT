/**
 * @file useSecondaryHeaderLogic.js
 * @description Hook that wires SecondaryHeader to the canvas/layout system.
 *
 * This hook bridges:
 * - LayoutPanelContext (canvas navigation, viewport)
 * - ViewConfigurationManager (view names, metadata)
 * - Room/workspace state
 *
 * Usage:
 * ```jsx
 * const headerLogic = useSecondaryHeaderLogic();
 * <SecondaryHeader {...headerLogic} />
 * ```
 */

import { useCallback, useMemo, useEffect, useState } from "react";
import { useLayoutPanelContext } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import { getViewConfigurationManager } from "@Init/appInitializer";
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
  // LAYOUT PANEL CONTEXT (canvas navigation)
  // =========================================================================

  const layoutContext = useLayoutPanelContext();
  const logic = layoutContext?.logic || {};

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
  const [activeViewId, setActiveViewId] = useState(null);

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

    return () => {
      unsubs.forEach((unsub) => unsub?.());
      window.removeEventListener("cia:views-loaded", refresh);
      window.removeEventListener("cia:view-added", refresh);
    };
  }, []);

  /**
   * Get enriched views on canvas with names
   */
  const onCanvasViews = useMemo(() => {
    const canvas = canvasManager?.getActiveCanvas?.();
    const placements = canvas?.placements || [];
    const vcm = getViewConfigurationManager?.();

    return placements
      .filter((p) => p.content?.type === "view")
      .map((p, index) => {
        const viewId = p.content?.viewConfigurationId;
        const viewConfig = vcm?.getViewConfiguration?.(viewId);

        // Get view name - try multiple sources
        let name = viewConfig?.name;
        if (!name && viewConfig?.datasetId) {
          name = `View of ${viewConfig.datasetId}`;
        }
        if (!name) {
          name = `View ${index + 1}`;
        }

        return {
          id: viewId,
          name,
          type: viewConfig?.type || "vtk",
          position: { col: p.col, row: p.row },
          color: getViewColor(viewId, index),
          datasetName: viewConfig?.datasetName || viewConfig?.datasetId,
        };
      });
  }, [refreshKey]);

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
   * Active view (currently selected)
   */
  const activeView = useMemo(() => {
    if (!activeViewId) return null;
    return onCanvasViews.find((v) => v.id === activeViewId) || null;
  }, [activeViewId, onCanvasViews]);

  // =========================================================================
  // VIEW HANDLERS
  // =========================================================================

  /**
   * Select a view (focus it)
   */
  const handleSelectView = useCallback(
    (viewId) => {
      log.debug("SecondaryHeader: Select view", viewId);
      setActiveViewId(viewId);

      // Find the view's position and navigate to it
      const view = onCanvasViews.find((v) => v.id === viewId);
      if (view?.position) {
        navigateToCell(view.position.row, view.position.col);
      }

      // Emit event for other components
      eventBus.emit(BUS_EVENTS.VIEW_FOCUSED, { viewId });
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

      setActiveViewId(viewId);
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
