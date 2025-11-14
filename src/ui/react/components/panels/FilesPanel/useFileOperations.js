// src/ui/react/components/panels/FilesPanel/useFileOperations.js
import { useRef, useCallback } from "react";
import { datasetManager } from "@Init/appInitializer.js";

export function useFileOperations() {
  const loadingFilesRef = useRef(new Set());

  const loadSample = useCallback(async (sample) => {
    if (loadingFilesRef.current.has(sample.name)) {
      console.log(`📂 File ${sample.name} already loading, skipping`);
      return null;
    }

    loadingFilesRef.current.add(sample.name);

    try {
      console.log(`📂 Loading sample: ${sample.path}`);

      const response = await fetch(sample.path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], sample.name, {
        type: "application/octet-stream",
      });

      // FIXED: Variable name now accurately reflects what this is
      const datasetId = await datasetManager.loadDataset(file, sample.path);
      console.log(`✅ Sample loaded: ${sample.name}`);

      // Return just the ID - let the caller decide if they need the full object
      return datasetId;
    } catch (error) {
      console.error("❌ Failed to load sample:", error);
      throw new Error(`Failed to load ${sample.name}: ${error.message}`);
    } finally {
      loadingFilesRef.current.delete(sample.name);
    }
  }, []);

  const uploadFile = useCallback(async (file) => {
    if (!file) return null;

    try {
      console.log(`📂 Uploading file: ${file.name}`);

      // FIXED: Same clarity here
      const datasetId = await datasetManager.loadDataset(file, null);
      console.log(`✅ File uploaded: ${file.name}`);

      return datasetId;
    } catch (error) {
      console.error("❌ Failed to upload file:", error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
  }, []);

  return { loadSample, uploadFile };
}
