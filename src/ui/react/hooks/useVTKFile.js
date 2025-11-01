// src/ui/react/hooks/useVTKFile.js
// Custom hook to track when VTK files are loaded
// Bridges the gap between core VTK modules and React components

import { useState, useEffect } from "react";
import { datasetManager } from "../../../core/datasetManager.js";
import { simpleVisualizationManager } from "../../../core/simpleVisualizationManager.js";
import { sceneState } from "../../../core/sceneState.js";

/**
 * Hook to track the currently loaded VTK file
 * Returns: { currentDataset, isFileLoaded, polydata, numPoints }
 *
 * This hook listens to the datasetManager and provides React components
 * with information about the currently active VTK file.
 */
export function useVTKFile() {
  const [currentDataset, setCurrentDataset] = useState(null);
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [fileInfo, setFileInfo] = useState({
    polydata: null,
    numPoints: 0,
    bounds: null,
    filename: null,
  });

  useEffect(() => {
    console.log("🔗 useVTKFile hook initialized");

    // Update function that gets called when datasets change
    const updateFileState = () => {
      const current = simpleVisualizationManager.getCurrentDataset();

      if (!current) {
        setCurrentDataset(null);
        setIsFileLoaded(false);
        setFileInfo({
          polydata: null,
          numPoints: 0,
          bounds: null,
          filename: null,
        });
        return;
      }

      const dataset = datasetManager.getDataset(current.datasetId);

      if (dataset && dataset.polydata) {
        const points = dataset.polydata.getPoints();
        const numPoints = points ? points.getNumberOfPoints() : 0;
        const bounds = dataset.polydata.getBounds();

        setCurrentDataset(current);
        setIsFileLoaded(true);
        setFileInfo({
          polydata: dataset.polydata,
          numPoints,
          bounds,
          filename: dataset.filename,
        });

        console.log(
          "✅ File loaded in hook:",
          dataset.filename,
          "Points:",
          numPoints
        );
      } else {
        setIsFileLoaded(false);
      }
    };

    // Listen for dataset changes
    datasetManager.onChange(updateFileState);
    simpleVisualizationManager.yViz.observe(updateFileState);

    // Initial update
    updateFileState();

    // Cleanup
    return () => {
      simpleVisualizationManager.yViz.unobserve(updateFileState);
    };
  }, []);

  return {
    currentDataset,
    isFileLoaded,
    ...fileInfo,
  };
}
