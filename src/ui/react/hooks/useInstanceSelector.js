/**
 * @file useInstanceSelector.js
 * @description Hook for instance/view selection state.
 *
 * UPDATED VERSION:
 * - Uses ViewLifecycleService for view placement
 * - Simplified - delegates complex logic to service
 *
 * @example
 * const { activeInstance, handleSelectInstance, handlePlaceView } = useInstanceSelector();
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { viewLifecycleService } from "@Services";
import { eventBus, BUS_EVENTS } from "@Core/events";
import { instance as log } from "@Utils/logger.js";

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useInstanceSelector({ workspaceId } = {}) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [activeInstanceId, setActiveInstanceId] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // -------------------------------------------------------------------------
  // GET PLACEMENTS
  // -------------------------------------------------------------------------

  const placements = useMemo(() => {
    const canvas = canvasManager?.getActiveCanvas?.();
    return canvas?.placements || [];
  }, [refreshCounter]);

  // -------------------------------------------------------------------------
  // COMPUTED: Views on canvas
  // -------------------------------------------------------------------------

  const onCanvasViews = useMemo(() => {
    return placements
      .filter((p) => p.content?.type === "view")
      .map((p) => ({
        viewId: p.content?.viewConfigurationId,
        placementId: p.id,
        row: p.row,
        col: p.col,
      }));
  }, [placements]);

  // -------------------------------------------------------------------------
  // EVENT SUBSCRIPTIONS
  // -------------------------------------------------------------------------

  useEffect(() => {
    const refresh = () => setRefreshCounter((c) => c + 1);

    // Subscribe to EventBus events
    const unsubs = [
      eventBus.on(BUS_EVENTS.VIEW_PLACED, refresh),
      eventBus.on(BUS_EVENTS.VIEW_REMOVED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_ADDED, refresh),
      eventBus.on(BUS_EVENTS.PLACEMENT_REMOVED, refresh),
    ];

    // Subscribe to canvas manager events
    const canvasUnsubs = [
      canvasManager?.on?.("placementAdded", refresh),
      canvasManager?.on?.("placementRemoved", refresh),
      canvasManager?.on?.("activeCanvasChanged", refresh),
    ].filter(Boolean);

    return () => {
      unsubs.forEach((unsub) => unsub());
      canvasUnsubs.forEach((unsub) => unsub?.());
    };
  }, []);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Select/focus an instance/view
   */
  const handleSelectInstance = useCallback((viewId) => {
    log.debug("Selecting instance:", viewId);

    setActiveInstanceId(viewId);

    // Focus the view (will navigate if on canvas)
    viewLifecycleService.focusView(viewId);
  }, []);

  /**
   * Place a view on the canvas
   */
  const handlePlaceView = useCallback(async (viewId) => {
    log.debug("Placing view:", viewId);

    await viewLifecycleService.placeView(viewId);

    // Select the newly placed view
    setActiveInstanceId(viewId);
  }, []);

  /**
   * Get the active instance info
   */
  const activeInstance = useMemo(() => {
    if (!activeInstanceId) return null;

    const placement = placements.find(
      (p) => p.content?.viewConfigurationId === activeInstanceId
    );

    if (!placement) return { viewId: activeInstanceId, isOnCanvas: false };

    return {
      viewId: activeInstanceId,
      placementId: placement.id,
      row: placement.row,
      col: placement.col,
      isOnCanvas: true,
    };
  }, [activeInstanceId, placements]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    activeInstance,
    activeInstanceId,
    onCanvasViews,
    handleSelectInstance,
    handlePlaceView,
    setActiveInstanceId,
  };
}

export default useInstanceSelector;
