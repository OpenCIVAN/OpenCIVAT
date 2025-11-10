// src/ui/react/hooks/useCurrentDataset.js
// FIXED: Prevents infinite loop by using single state object

import { useEffect, useState, useCallback } from "react";

import { datasetManager } from "@Core/datasets/datasetManager.js";
import { visualizationManager } from "@Core/visualizationManager.js";

/**
 * Hook to track the current dataset with complete information
 *
 * CRITICAL FIX: Uses a single state object instead of multiple state variables
 * to prevent cascading re-renders when used by multiple components
 */
export function useCurrentDataset() {
  // CRITICAL: Use single state object to batch updates
  const [state, setState] = useState({
    datasetId: null,
    datasetInfo: null,
    datasetDetails: null,
    isLoading: false,
    hasPolydata: false,
  });

  useEffect(() => {
    // Memoized update function - won't change on every render
    const updateDatasetState = () => {
      const current = visualizationManager.getCurrentDataset();

      if (current && current.datasetId) {
        const dataset = datasetManager.getDatasetSync(current.datasetId);

        if (dataset && dataset.polydata) {
          // Dataset fully loaded - batch all updates into one setState
          setState({
            datasetId: current.datasetId,
            datasetInfo: current,
            datasetDetails: dataset,
            isLoading: false,
            hasPolydata: true,
          });
        } else {
          // Dataset selected but not loaded yet
          setState({
            datasetId: current.datasetId,
            datasetInfo: current,
            datasetDetails: null,
            isLoading: true,
            hasPolydata: false,
          });

          // Try to load asynchronously
          datasetManager.getDataset(current.datasetId).then((loaded) => {
            if (loaded && loaded.polydata) {
              setState((prev) => ({
                ...prev,
                datasetDetails: loaded,
                isLoading: false,
                hasPolydata: true,
              }));
            } else {
              setState((prev) => ({
                ...prev,
                isLoading: false,
              }));
            }
          });
        }
      } else {
        // No dataset selected - batch clear all state
        setState({
          datasetId: null,
          datasetInfo: null,
          datasetDetails: null,
          isLoading: false,
          hasPolydata: false,
        });
      }
    };

    // Initial update
    updateDatasetState();

    // Listen for changes
    visualizationManager.yViz.observe(updateDatasetState);
    const unsubscribeDataset = datasetManager.onChange(updateDatasetState);

    // Cleanup
    return () => {
      visualizationManager.yViz.unobserve(updateDatasetState);
      unsubscribeDataset();
    };
  }, []); // Empty deps - only set up listeners once

  // Return destructured state for backward compatibility
  return state;
}

// Simplified version that only returns the ID
export function useCurrentDatasetId() {
  const { datasetId } = useCurrentDataset();
  return datasetId;
}
