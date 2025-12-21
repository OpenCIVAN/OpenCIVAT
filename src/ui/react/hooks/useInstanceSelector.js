/**
 * @file useInstanceSelector.js
 * @description Hook for managing instance selection state in the SecondaryFooter.
 *
 * Provides:
 * - Active instance from workspaceManager
 * - Views currently on canvas (active, placed)
 * - Available views (can be placed on canvas)
 * - Handlers for selection and placement
 *
 * @example
 * const {
 *   activeInstance,
 *   onCanvasViews,
 *   availableViews,
 *   handleSelectInstance,
 *   handlePlaceView
 * } = useInstanceSelector({ workspaceId });
 */

// src/ui/react/hooks/useInstanceSelector.js
// Hook for managing instance selection state in the SecondaryFooter
//
// FIXED:
// - Properly gets VIEW name from ViewConfigurationManager (not dataset filename)
// - Gets DATASET name separately
// - Listens for name change events
// - Subscribes to canvas placement changes

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getViewConfigurationManager,
  getDatasetManager,
} from "@Init/appInitializer.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { view as log } from "@Utils/logger.js";

/**
 * Hook for instance selector state management.
 *
 * @param {Object} options - Hook options
 * @param {string} options.workspaceId - Current workspace ID
 * @returns {Object} Instance selector state and handlers
 */
export function useInstanceSelector({ workspaceId } = {}) {
  const [activeInstance, setActiveInstance] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ===========================================================================
  // SUBSCRIBE TO ACTIVE INSTANCE CHANGES
  // ===========================================================================
  useEffect(() => {
    const updateActiveInstance = () => {
      try {
        const instance = workspaceManager?.getActiveInstance?.();

        if (!instance) {
          setActiveInstance(null);
          return;
        }

        // Get the ViewConfiguration for this instance to get the REAL view name
        const viewManager = getViewConfigurationManager();
        const viewConfig = viewManager?.getView?.(
          instance.viewConfigId || instance.viewId
        );

        // Get the dataset name separately
        const datasetManager = getDatasetManager();
        const datasetId =
          viewConfig?.datasetId || instance.instanceData?.dataset?.id;
        const dataset = datasetId
          ? datasetManager?.getDataset?.(datasetId)
          : null;

        setActiveInstance({
          id: instance.instanceId || instance.id,
          viewId: instance.viewConfigId || instance.viewId,
          // Use view name from ViewConfiguration, not dataset filename
          name: viewConfig?.name || instance.name || "Untitled View",
          // Dataset name is separate
          datasetName:
            dataset?.name ||
            instance.instanceData?.dataset?.name ||
            instance.instanceData?.dataset?.filename ||
            "Unknown Dataset",
          color:
            viewConfig?.color?.hex ||
            instance.color?.hex ||
            instance.color ||
            "#60a5fa",
          type: instance.type || viewConfig?.handlerType || "vtk",
        });
      } catch (error) {
        log.warn("Failed to get active instance:", error);
        setActiveInstance(null);
      }
    };

    // Initial check
    updateActiveInstance();

    // Listen for instance focus changes
    const handleInstanceFocus = () => updateActiveInstance();

    // Listen for view/instance name changes
    const handleNameChange = (event) => {
      // Re-fetch to get updated name
      updateActiveInstance();
    };

    window.addEventListener("cia:instance-focused", handleInstanceFocus);
    window.addEventListener("cia:active-instance-changed", handleInstanceFocus);

    // ViewConfigurationManager events for name changes
    const viewManager = getViewConfigurationManager();
    if (viewManager?.on) {
      viewManager.on("viewUpdated", handleNameChange);
      viewManager.on("viewRenamed", handleNameChange);
    }

    return () => {
      window.removeEventListener("cia:instance-focused", handleInstanceFocus);
      window.removeEventListener(
        "cia:active-instance-changed",
        handleInstanceFocus
      );

      if (viewManager?.off) {
        viewManager.off("viewUpdated", handleNameChange);
        viewManager.off("viewRenamed", handleNameChange);
      }
    };
  }, [refreshKey]);

  // ===========================================================================
  // SUBSCRIBE TO CANVAS PLACEMENTS
  // ===========================================================================
  useEffect(() => {
    const updatePlacements = () => {
      try {
        const currentPlacements = canvasManager?.getPlacements?.() || [];
        setPlacements(currentPlacements);
      } catch (error) {
        log.warn("Failed to get placements:", error);
        setPlacements([]);
      }
    };

    // Initial load
    updatePlacements();

    // Listen for placement changes
    const handlePlacementChange = () => {
      updatePlacements();
      setRefreshKey((k) => k + 1);
    };

    // Canvas events
    window.addEventListener("cia:view-placed", handlePlacementChange);
    window.addEventListener("cia:view-removed", handlePlacementChange);
    window.addEventListener("cia:close-view", handlePlacementChange);
    window.addEventListener("cia:placement-added", handlePlacementChange);
    window.addEventListener("cia:placement-removed", handlePlacementChange);

    // CanvasManager events
    if (canvasManager?.on) {
      canvasManager.on("placementAdded", handlePlacementChange);
      canvasManager.on("placementRemoved", handlePlacementChange);
      canvasManager.on("canvasLoaded", handlePlacementChange);
    }

    return () => {
      window.removeEventListener("cia:view-placed", handlePlacementChange);
      window.removeEventListener("cia:view-removed", handlePlacementChange);
      window.removeEventListener("cia:close-view", handlePlacementChange);
      window.removeEventListener("cia:placement-added", handlePlacementChange);
      window.removeEventListener(
        "cia:placement-removed",
        handlePlacementChange
      );

      if (canvasManager?.off) {
        canvasManager.off("placementAdded", handlePlacementChange);
        canvasManager.off("placementRemoved", handlePlacementChange);
        canvasManager.off("canvasLoaded", handlePlacementChange);
      }
    };
  }, []);

  // ===========================================================================
  // COMPUTE ON-CANVAS VIEWS
  // Views that are currently placed on the canvas grid
  // ===========================================================================
  const onCanvasViews = useMemo(() => {
    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();

    // Get view IDs from placements
    const placedViewIds = new Set();
    placements.forEach((p) => {
      const viewId =
        p.content?.viewConfigurationId || p.content?.viewId || p.viewId;
      if (viewId) placedViewIds.add(viewId);
    });

    // Build view info for each placed view
    const views = [];
    placedViewIds.forEach((viewId) => {
      const viewConfig = viewManager?.getView?.(viewId);
      if (!viewConfig) return;

      // Skip trashed views
      if (viewConfig.status === "trashed") return;

      // Get dataset name
      const dataset = viewConfig.datasetId
        ? datasetManager?.getDataset?.(viewConfig.datasetId)
        : null;

      // Find placement for position
      const placement = placements.find(
        (p) =>
          (p.content?.viewConfigurationId || p.content?.viewId || p.viewId) ===
          viewId
      );

      views.push({
        id: viewId,
        name: viewConfig.name || "Untitled View",
        datasetName:
          dataset?.name || viewConfig.datasetName || "Unknown Dataset",
        color: viewConfig.color?.hex || viewConfig.color || "#60a5fa",
        position: placement
          ? { row: placement.row, col: placement.col }
          : { row: 0, col: 0 },
      });
    });

    return views;
  }, [placements, refreshKey]);

  // ===========================================================================
  // COMPUTE AVAILABLE VIEWS
  // Views that exist but are not currently on canvas
  // ===========================================================================
  const availableViews = useMemo(() => {
    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();

    if (!viewManager) return [];

    const allViews = viewManager.getAllViews?.() || [];
    const onCanvasIds = new Set(onCanvasViews.map((v) => v.id));

    return allViews
      .filter((view) => {
        // Not already on canvas
        if (onCanvasIds.has(view.id)) return false;
        // Not trashed
        if (view.status === "trashed") return false;
        // Not inactive (optional - could show inactive with different styling)
        // if (view.status === "inactive") return false;
        return true;
      })
      .map((view) => {
        const dataset = view.datasetId
          ? datasetManager?.getDataset?.(view.datasetId)
          : null;

        return {
          id: view.id,
          name: view.name || "Untitled View",
          datasetName: dataset?.name || view.datasetName || "Unknown Dataset",
        };
      });
  }, [onCanvasViews, refreshKey]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  /**
   * Select/focus an instance on the canvas
   * @param {string} viewId - View ID to focus
   */
  const handleSelectInstance = useCallback(
    (viewId) => {
      log.debug("Instance selector: selecting view", viewId);

      // Find the instance for this view
      if (workspaceManager) {
        const instances = workspaceManager.getInstances?.() || [];
        const instance = instances.find(
          (i) =>
            i.viewId === viewId || i.viewConfigId === viewId || i.id === viewId
        );

        if (instance) {
          // Set as active instance
          workspaceManager.setActiveInstance?.(
            instance.id || instance.instanceId
          );

          // Dispatch event for other components to react
          window.dispatchEvent(
            new CustomEvent("cia:instance-focused", {
              detail: {
                instanceId: instance.id || instance.instanceId,
                viewId,
              },
            })
          );
        }
      }

      // Also navigate canvas to show the view
      const placement = placements.find(
        (p) =>
          (p.content?.viewConfigurationId || p.content?.viewId || p.viewId) ===
          viewId
      );
      if (placement) {
        window.dispatchEvent(
          new CustomEvent("cia:navigate-to-cell", {
            detail: { row: placement.row, col: placement.col },
          })
        );
      }
    },
    [placements]
  );

  /**
   * Place a view on the canvas
   * @param {string} viewId - View ID to place
   */
  const handlePlaceView = useCallback(
    (viewId) => {
      log.debug("Instance selector: placing view", viewId);

      const viewManager = getViewConfigurationManager();
      const view = viewManager?.getView?.(viewId);

      if (!view) {
        log.warn("Cannot place view: view not found", viewId);
        return;
      }

      // Find next available cell
      const nextCell = canvasManager?.getNextAvailableCell?.() || {
        row: 0,
        col: 0,
      };

      // Activate the view (mark as active)
      viewManager?.activateView?.(viewId);

      // Place on canvas
      if (canvasManager?.placeView) {
        canvasManager.placeView(viewId, nextCell.row, nextCell.col);
      }

      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent("cia:view-placed", {
          detail: { viewId, row: nextCell.row, col: nextCell.col },
        })
      );

      // Optionally focus the new view
      handleSelectInstance(viewId);
    },
    [handleSelectInstance]
  );

  return {
    activeInstance,
    onCanvasViews,
    availableViews,
    handleSelectInstance,
    handlePlaceView,
  };
}

export default useInstanceSelector;
