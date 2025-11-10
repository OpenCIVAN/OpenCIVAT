// src/ui/react/hooks/useDatasets.js
// FIXED: Use shallow comparison to prevent infinite loop from array recreation

import { useSyncExternalStore } from "react";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";
import { shallow } from "zustand/shallow";

// CRITICAL: Move subscribe/getSnapshot functions OUTSIDE the hook
const subscribeToDatasetManager = (callback) => {
  return datasetManager.onChange(callback);
};

const getDatasetManagerSnapshot = () => {
  return datasetManager.datasets.size + datasetManager.loadingDatasets.size;
};

export function useDatasets() {
  // CRITICAL FIX: Use shallow equality to compare array contents
  // Without this, Zustand creates a new array reference every time,
  // causing infinite re-renders even when the data hasn't changed
  const datasetsMetadata = useDatasetStore(
    (state) => state.getAllDatasets(),
    shallow // ← This is the key fix!
  );

  // Subscribe to datasetManager for loading state
  const managerVersion = useSyncExternalStore(
    subscribeToDatasetManager,
    getDatasetManagerSnapshot
  );

  // Transform the data - runs on every render but that's fine, it's fast
  return datasetsMetadata.map((metadata) => {
    const localDataset = datasetManager.datasets.get(metadata.id);
    const loadingInfo = datasetManager.loadingDatasets.get(metadata.id);

    return {
      id: metadata.id,
      name: metadata.name,
      hash: metadata.hash,
      pointCount: metadata.pointCount || 0,
      cellCount: metadata.cellCount || 0,
      uploadedBy: metadata.uploadedBy,
      uploadedByName: metadata.uploadedByName || "Unknown",
      uploadedAt: metadata.uploadedAt,
      publicPath: metadata.publicPath,
      bounds: metadata.bounds,
      annotations: metadata.annotations || [],
      hasPolydata: !!localDataset?.polydata,
      isLoading: !!loadingInfo,
      loadingStage: loadingInfo?.stage || null,
    };
  });
}
