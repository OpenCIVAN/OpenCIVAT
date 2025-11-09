// src/debug/debugHelpers.js
// This file exposes internal managers to the global window object for debugging

import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";
import { getSceneObjects } from "@Core/scene/sceneManager.js";
import { visualizationManager } from "@Core/visualizationManager.js";
import { dataCache } from "@Services/storage/dataCache.js";

/**
 * Initialize debug helpers and expose managers to window for console access
 * Call this AFTER all managers are initialized
 */
export function initializeDebugHelpers() {
  // Create a debug namespace on window
  window.CIA = {
    // Core managers
    datasetManager,
    visualizationManager,
    dataCache,
    annotationSystem,
    presenceSystem,

    // Helper functions for common debugging tasks
    getCurrentDataset: () => {
      const current = visualizationManager.getCurrentDataset();
      console.log("Current dataset:", current);
      return current;
    },

    listDatasets: () => {
      const all = datasetManager.getAllDatasets();
      console.table(all);
      return all;
    },

    getScene: () => {
      const scene = getSceneObjects();
      console.log("Scene objects:", scene);
      return scene;
    },

    checkDatasetInMemory: (datasetId) => {
      const dataset = datasetManager.getDatasetSync(datasetId);
      if (dataset) {
        console.log("Dataset found in memory:", dataset);
        console.log("Has polydata:", !!dataset.polydata);
        if (dataset.polydata) {
          const points = dataset.polydata.getPoints();
          console.log("Number of points:", points?.getNumberOfPoints() || 0);
        }
      } else {
        console.log("Dataset NOT found in memory");
      }
      return dataset;
    },

    forceLoadDataset: async (datasetId) => {
      console.log("Attempting to force load dataset:", datasetId);
      const dataset = await datasetManager.getDataset(datasetId);
      if (dataset) {
        console.log("✅ Dataset loaded:", dataset);
        // Try to load into scene
        const { loadDatasetIntoScene } = await import("@Core/scene/sceneManager.js");
        if (dataset.polydata) {
          loadDatasetIntoScene(dataset.polydata, true, datasetId);
          console.log("✅ Loaded into scene");
        }
      } else {
        console.log("❌ Failed to load dataset");
      }
      return dataset;
    },

    debugInfo: () => {
      console.group("🔍 CIA Debug Information");

      console.group("Datasets");
      const datasets = datasetManager.getAllDatasets();
      console.log("Total datasets:", datasets.length);
      datasets.forEach((d) => {
        console.log(
          `  ${d.name}: ${d.hasPolydata ? "✅ Ready" : "⏳ Not loaded"}`
        );
      });
      console.groupEnd();

      console.group("Current Visualization");
      const current = visualizationManager.getCurrentDataset();
      if (current) {
        console.log("Dataset ID:", current.datasetId);
        console.log("Dataset Name:", current.datasetName);
        console.log("Loaded by:", current.loadedBy);
        console.log("Loaded at:", new Date(current.loadedAt).toLocaleString());
      } else {
        console.log("No dataset currently selected");
      }
      console.groupEnd();

      console.group("Scene Status");
      const scene = getSceneObjects();
      console.log("Renderer exists:", !!scene.renderer);
      console.log("Render window exists:", !!scene.renderWindow);
      console.log("Interactor exists:", !!scene.interactor);
      if (scene.renderer) {
        const actors = scene.renderer.getActors();
        console.log("Number of actors:", actors.length);
      }
      console.groupEnd();

      console.group("Presence");
      const users = presenceSystem.getAllUsers();
      console.log("Connected users:", users.length);
      users.forEach((u) => {
        console.log(`  ${u.userName} (${u.userId})`);
      });
      console.groupEnd();

      console.groupEnd();
    },
  };

  console.log("✅ Debug helpers initialized!");
  console.log("📌 Access managers via: window.CIA");
  console.log("📌 Try: CIA.debugInfo() for full status");
  console.log("📌 Try: CIA.getCurrentDataset() to see current dataset");
  console.log("📌 Try: CIA.listDatasets() to see all datasets");
}
