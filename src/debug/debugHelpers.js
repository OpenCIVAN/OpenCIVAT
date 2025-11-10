// src/debug/debugHelpers.js
// This file exposes internal managers to the global window object for debugging

import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";

export function initializeDebugHelpers() {
  window.CIA = {
    // Core managers
    datasetManager,
    visualizationManager,
    workspaceManager, // ← Add this!

    // Updated helpers for multi-instance
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

    // ✨ NEW: Get instances instead of global scene
    listInstances: () => {
      const ids = workspaceManager.getAllInstanceIds();
      console.log("Active instances:", ids);
      ids.forEach((id) => {
        const inst = workspaceManager.getInstance(id);
        console.log(`  ${id}:`, {
          datasetId: inst.datasetId,
          active: id === workspaceManager.activeInstanceId,
        });
      });
      return ids;
    },

    // ✨ NEW: Get scene for specific instance
    getInstanceScene: (instanceId) => {
      const inst = workspaceManager.getInstance(instanceId);
      if (inst) {
        console.log(`Scene objects for ${instanceId}:`, inst.sceneObjects);
        return inst.sceneObjects;
      } else {
        console.log(`Instance ${instanceId} not found`);
        return null;
      }
    },

    // ✨ NEW: Get active instance scene
    getActiveInstanceScene: () => {
      const activeId = workspaceManager.activeInstanceId;
      if (!activeId) {
        console.log("No active instance");
        return null;
      }
      return window.CIA.getInstanceScene(activeId);
    },

    // Remove old getScene() that expects global scene
    // getScene: () => { ... }  ← DELETE THIS
  };

  console.log("🐛 Debug helpers initialized");
  console.log("   Access via window.CIA in console");
  console.log("   Try: CIA.listInstances() or CIA.listDatasets()");
}
