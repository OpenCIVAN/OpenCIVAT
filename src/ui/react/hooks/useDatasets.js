// src/ui/react/hooks/useDatasets.js
import { useState, useEffect } from "react";
import { ui as log } from "@Utils/logger.js";
import { getDatasetManager } from "./useDatasetManager.js";

export function useDatasets() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    log.debug("useDatasets: Setting up subscription");

    // Get the manager (this will throw a clear error if not ready)
    const datasetManager = getDatasetManager();

    const updateDatasets = () => {
      log.debug("useDatasets: Updating datasets");

      // Get all datasets from the NEW datasetManager
      const allDatasets = datasetManager.getAllDatasets();

      // The NEW manager returns proper Dataset objects
      // Transform them for React consumption
      const transformed = allDatasets.map((dataset) => ({
        id: dataset.id,
        name: dataset.filename,
        hash: dataset.metadata?.hash,
        pointCount: dataset.metadata?.pointCount || 0,
        cellCount: dataset.metadata?.cellCount || 0,
        uploadedBy: dataset.metadata?.uploadedBy,
        uploadedByName: dataset.metadata?.uploadedByName || "Unknown",
        uploadedAt: dataset.metadata?.uploadedAt,
        publicPath: dataset.metadata?.publicPath,
        bounds: dataset.metadata?.bounds,
        annotations: dataset.annotations || [],
        hasPolydata: !!dataset.polydata, // Temporary until ViewConfiguration
        isAnalyzed: dataset.isAnalyzed(),
      }));

      setDatasets(transformed);
    };

    // Initial update
    updateDatasets();

    // Subscribe to changes from the NEW datasetManager
    // The NEW manager uses the 'on' method for subscriptions
    datasetManager.on("datasetAdded", updateDatasets);
    datasetManager.on("datasetUpdated", updateDatasets);
    datasetManager.on("datasetRemoved", updateDatasets);
    datasetManager.on("datasetLoaded", updateDatasets);

    return () => {
      log.debug("useDatasets: Cleaning up subscription");
      datasetManager.off("datasetAdded", updateDatasets);
      datasetManager.off("datasetUpdated", updateDatasets);
      datasetManager.off("datasetRemoved", updateDatasets);
      datasetManager.off("datasetLoaded", updateDatasets);
    };
  }, []);

  return datasets;
}
