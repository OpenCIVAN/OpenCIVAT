// src/ui/react/hooks/useDatasets.js
// FIXED: Stable subscribe function to prevent infinite re-render loop

import { useSyncExternalStore, useCallback } from "react";

import { datasetManager } from "@Core/datasets/datasetManager.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";

// CRITICAL: Move subscribe function OUTSIDE the hook
// This ensures it has a stable reference and doesn't recreate on every render
const subscribeToDatasetManager = (callback) => {
  return datasetManager.onChange(callback);
};

// CRITICAL: Move getSnapshot function OUTSIDE the hook
// This ensures React can properly cache the snapshot
const getDatasetManagerSnapshot = () => {
  return datasetManager.datasets.size + datasetManager.loadingDatasets.size;
};

export function useDatasets() {
  // Subscribe to Zustand for metadata changes
  const datasetsMetadata = useDatasetStore((state) => state.getAllDatasets());

  // Subscribe to datasetManager for loading state
  // Using STABLE functions that don't recreate on every render
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
