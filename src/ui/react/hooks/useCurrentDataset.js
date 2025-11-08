// src/ui/react/hooks/useCurrentDataset.js
// Enhanced hook that provides both the ID and full dataset info

import { useEffect, useState } from "react";
import { simpleVisualizationManager } from "../../../core/simpleVisualizationManager.js";
import { datasetManager } from "../../../core/datasetManager.js";

/**
 * Hook to track the current dataset with complete information
 *
 * @returns {Object} An object containing:
 *   - datasetId: The ID of the current dataset (or null)
 *   - datasetInfo: The full current dataset object from simpleVisualizationManager
 *   - datasetDetails: The actual dataset with polydata from datasetManager
 *   - isLoading: Whether the dataset is currently being loaded
 *   - hasPolydata: Whether the polydata is available
 */
export function useCurrentDataset() {
  // Track multiple pieces of state for a complete picture
  const [datasetId, setDatasetId] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [datasetDetails, setDatasetDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Function to update all our state based on current situation
    const updateDatasetState = () => {
      // Get the current dataset info from the visualization manager
      const current = simpleVisualizationManager.getCurrentDataset();

      if (current && current.datasetId) {
        // We have a current dataset selected
        setDatasetId(current.datasetId);
        setDatasetInfo(current);

        // Now try to get the actual dataset with polydata
        const dataset = datasetManager.getDatasetSync(current.datasetId);

        if (dataset && dataset.polydata) {
          // Dataset is fully loaded
          setDatasetDetails(dataset);
          setIsLoading(false);
        } else {
          // Dataset is selected but polydata not yet available
          // This happens when a remote user selects a dataset
          // that we haven't loaded locally yet
          setDatasetDetails(null);
          setIsLoading(true);

          // Attempt to load it asynchronously
          datasetManager.getDataset(current.datasetId).then((loaded) => {
            if (loaded && loaded.polydata) {
              setDatasetDetails(loaded);
              setIsLoading(false);
            } else {
              setIsLoading(false);
            }
          });
        }
      } else {
        // No dataset selected
        setDatasetId(null);
        setDatasetInfo(null);
        setDatasetDetails(null);
        setIsLoading(false);
      }
    };

    // Set up initial state
    updateDatasetState();

    // Listen for changes from the visualization manager
    simpleVisualizationManager.yViz.observe(updateDatasetState);

    // Also listen for changes from the dataset manager
    // This catches when polydata becomes available
    const unsubscribeDataset = datasetManager.onChange(updateDatasetState);

    // Cleanup function - unsubscribe from both sources
    return () => {
      simpleVisualizationManager.yViz.unobserve(updateDatasetState);
      unsubscribeDataset();
    };
  }, []); // Empty deps - only set up listeners once

  // Return a comprehensive object with all useful information
  return {
    datasetId, // Just the ID (for backward compatibility)
    datasetInfo, // The info from simpleVisualizationManager
    datasetDetails, // The full dataset with polydata
    isLoading, // Loading state
    hasPolydata: !!datasetDetails?.polydata, // Quick check for polydata
  };
}

// Also export a simplified version for components that only need the ID
export function useCurrentDatasetId() {
  const { datasetId } = useCurrentDataset();
  return datasetId;
}
