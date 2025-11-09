// ----------------------------------------------------------------------------
// Simple Visualization Manager
// Single shared visualization that everyone sees
// ----------------------------------------------------------------------------

import { getUserId } from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";

class VisualizationManager {
  constructor() {
    this.yViz = ydoc.getMap("currentVisualization");
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    console.log("🖼️ Simple visualization manager initialized");
  }

  /**
   * Set the current dataset being visualized
   */
  setCurrentDataset(datasetId, datasetName) {
    const current = {
      datasetId,
      datasetName,
      loadedBy: getUserId(),
      loadedAt: Date.now(),
    };

    this.yViz.set("current", current);
    console.log("📊 Current dataset set:", datasetName);
  }

  /**
   * Get current dataset
   */
  getCurrentDataset() {
    return this.yViz.get("current") || null;
  }

  /**
   * Update camera
   */
  updateCamera(camera) {
    this.yViz.set("camera", {
      ...camera,
      updatedBy: getUserId(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Get camera
   */
  getCamera() {
    return this.yViz.get("camera") || null;
  }
}

export const visualizationManager = new VisualizationManager();
