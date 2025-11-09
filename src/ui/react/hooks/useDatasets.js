// src/ui/react/hooks/useDatasets.js
// Hook to track all datasets in the system

import { useEffect, useState } from "react";

import { datasetManager } from "@Core/datasets/datasetManager.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";

export function useDatasets() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    // Initial load from store
    const updateDatasets = () => {
      const allDatasets = datasetManager.getAllDatasets();
      setDatasets(allDatasets);
    };

    updateDatasets();

    // Listen for changes from datasetManager
    const unsubscribe = datasetManager.onChange(updateDatasets);

    // Also listen to Zustand store changes
    const unsubscribeStore = useDatasetStore.subscribe(updateDatasets);

    return () => {
      unsubscribe();
      unsubscribeStore();
    };
  }, []);

  return datasets;
}
