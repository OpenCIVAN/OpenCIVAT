// src/ui/react/hooks/useViewMetadata.js
// Lightweight hook to read view metadata (displayName, color, datasetId) without creating an instance
//
// PURPOSE:
// Used by CanvasCell to display view headers in COLD mode (thumbnail-only, no InstanceViewport).
// This allows the header to show the view name and control buttons even when no instance is mounted.
//
// ARCHITECTURE:
// - Reads ONLY from ViewConfigurationManager (core data layer)
// - Does NOT import or depend on any instance handler (VTK, image, etc.)
// - Does NOT create expensive subscriptions to camera, filters, or render state
// - Uses getViewConfigurationManager() to read directly from the manager

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getViewConfigurationManager,
  getDatasetManager,
} from "@Init/appInitializer.js";

/**
 * useViewMetadata - Lightweight hook for reading view metadata without creating an instance
 *
 * This hook provides display name and color for views in COLD mode (thumbnail-only).
 * It subscribes only to view name changes to minimize re-renders.
 *
 * @param {string} viewId - The view configuration ID
 * @returns {Object} { displayName, color, datasetId, datasetFilename, isLoading }
 *
 * @example
 * function ColdViewHeader({ viewId }) {
 *   const { displayName, color } = useViewMetadata(viewId);
 *   return (
 *     <div style={{ color: color?.hex }}>
 *       {displayName}
 *     </div>
 *   );
 * }
 */
export function useViewMetadata(viewId) {
  const [metadata, setMetadata] = useState({
    displayName: "View",
    color: null,
    datasetId: null,
    datasetFilename: null,
    isLoading: true,
  });

  // Track previous values to avoid unnecessary updates
  const prevValuesRef = useRef({ name: null, color: null });

  // Fetch metadata from managers
  const fetchMetadata = useCallback(() => {
    if (!viewId) {
      setMetadata({
        displayName: "View",
        color: null,
        datasetId: null,
        datasetFilename: null,
        isLoading: false,
      });
      return;
    }

    const viewManager = getViewConfigurationManager();
    const datasetManager = getDatasetManager();

    if (!viewManager) {
      // Manager not ready yet, keep loading state
      return;
    }

    const view = viewManager.getView(viewId);

    if (!view) {
      setMetadata({
        displayName: "Unknown View",
        color: null,
        datasetId: null,
        datasetFilename: null,
        isLoading: false,
      });
      return;
    }

    // Get dataset info
    const dataset =
      view.datasetId && datasetManager?.getDataset(view.datasetId);
    const datasetFilename = dataset?.filename || null;

    // Determine display name
    // Priority: view.name > dataset filename > 'View'
    const isDefaultName =
      !view.name ||
      view.name === "Untitled View" ||
      view.name === "Default View" ||
      view.name === datasetFilename;

    const displayName = isDefaultName
      ? datasetFilename || view.name || "View"
      : view.name;

    // Get color from view or use default
    const color = view.color || { hex: "#60a5fa", name: "blue" };

    // Only update if values actually changed (prevent unnecessary re-renders)
    const newName = displayName;
    const newColorHex = color?.hex;

    if (
      prevValuesRef.current.name !== newName ||
      prevValuesRef.current.color !== newColorHex
    ) {
      prevValuesRef.current = { name: newName, color: newColorHex };

      setMetadata({
        displayName,
        color,
        datasetId: view.datasetId,
        datasetFilename,
        isLoading: false,
      });
    }
  }, [viewId]);

  // Fetch on mount and when viewId changes
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Subscribe to view updates (only for name changes)
  useEffect(() => {
    if (!viewId) return;

    const viewManager = getViewConfigurationManager();
    if (!viewManager) return;

    const handleViewUpdate = (view) => {
      // Only re-fetch if this is our view
      if (view?.id === viewId || view === viewId) {
        fetchMetadata();
      }
    };

    // Subscribe to viewUpdated events
    viewManager.on?.("viewUpdated", handleViewUpdate);

    return () => {
      viewManager.off?.("viewUpdated", handleViewUpdate);
    };
  }, [viewId, fetchMetadata]);

  // Also listen for manager ready event (in case we loaded before manager was ready)
  useEffect(() => {
    const viewManager = getViewConfigurationManager();
    if (!viewManager) return;

    if (viewManager.isReady?.()) {
      fetchMetadata();
    } else {
      const unsubscribe = viewManager.onReady?.(() => {
        fetchMetadata();
      });

      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    }
  }, [fetchMetadata]);

  return metadata;
}

/**
 * useViewDisplayName - Convenience hook that just returns the display name
 *
 * @param {string} viewId - View configuration ID
 * @returns {string} Display name or 'View'
 */
export function useViewDisplayName(viewId) {
  const { displayName } = useViewMetadata(viewId);
  return displayName;
}

/**
 * useViewColor - Convenience hook that just returns the view color
 *
 * @param {string} viewId - View configuration ID
 * @returns {Object|null} Color object with { hex, name } or null
 */
export function useViewColor(viewId) {
  const { color } = useViewMetadata(viewId);
  return color;
}

export default useViewMetadata;
