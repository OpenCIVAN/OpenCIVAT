// ----------------------------------------------------------------------------
// Visualization Manager
// Manages multiple VTK canvases (views) of datasets
//
// CURRENT SCOPE:
// - Create views (personal or shared)
// - Track which dataset each view displays
// - Sync camera positions
//
// FUTURE EXTENSIBILITY:
// - Group-scoped views
// - Multi-viewport layouts
// - View templates/presets
// ----------------------------------------------------------------------------

import { yVisualizations } from "../collaboration/yjsSetup.js";
import { getUserId, getUserName } from "../collaboration/userManagement.js";
import { datasetManager } from "./datasetManager.js";
import { getSceneObjects } from "./scene.js";

class VisualizationManager {
  constructor() {
    this.visualizations = new Map(); // vizId -> { vtkCanvas, metadata }
    this.activeVizId = null;
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    // Listen for visualization changes
    yVisualizations.observe(() => {
      this._syncVisualizationsFromYjs();
    });

    console.log("🖼️ Visualization manager initialized");
  }

  /**
   * Create a new visualization
   * @param {string} datasetId - Dataset to visualize
   * @param {string} scope - 'personal' or 'shared'
   * @param {Object} options - Additional options
   * @returns {string} Visualization ID
   */
  createVisualization(datasetId, scope = "personal", options = {}) {
    const dataset = datasetManager.getDataset(datasetId);

    if (!dataset) {
      console.error("Dataset not found:", datasetId);
      return null;
    }

    const id = `viz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = options.name || `View of ${dataset.filename}`;

    // Store metadata in Y.js
    yVisualizations.set(id, {
      id,
      datasetId,
      scope, // 'personal' | 'shared'
      name,
      createdBy: getUserId(),
      createdByName: getUserName(),
      createdAt: Date.now(),

      // Camera state (synced for shared views)
      camera: null,

      // Widget state
      widgets: {
        axis: false,
        scalarBar: false,
      },

      // Reduction state
      reduction: {
        active: false,
        method: "pca",
        components: 3,
      },

      // TODO (Groups): Add groupId for group-scoped views
      // TODO (Following): Add followingUserId for follow mode
    });

    console.log(`🖼️ Visualization created: ${name} (${scope})`);
    return id;
  }

  /**
   * Get visualization metadata
   * @param {string} id - Visualization ID
   * @returns {Object|null}
   */
  getVisualization(id) {
    const yData = yVisualizations.get(id);
    const local = this.visualizations.get(id);

    return {
      ...yData,
      ...local,
    };
  }

  /**
   * Get all visualizations
   * @returns {Array}
   */
  getAllVisualizations() {
    const viz = [];
    yVisualizations.forEach((data, id) => {
      viz.push({
        id,
        ...data,
        isYours: data.createdBy === getUserId(),
      });
    });
    return viz;
  }

  /**
   * Get visualizations by scope
   * @param {string} scope - 'personal' or 'shared'
   * @returns {Array}
   */
  getVisualizationsByScope(scope) {
    return this.getAllVisualizations().filter((v) => v.scope === scope);
  }

  /**
   * Get your personal visualizations
   * @returns {Array}
   */
  getPersonalVisualizations() {
    return this.getAllVisualizations().filter(
      (v) => v.scope === "personal" && v.createdBy === getUserId()
    );
  }

  /**
   * Get shared visualizations (everyone can see)
   * @returns {Array}
   */
  getSharedVisualizations() {
    return this.getAllVisualizations().filter((v) => v.scope === "shared");
  }

  /**
   * Change visualization scope
   * @param {string} id - Visualization ID
   * @param {string} newScope - 'personal' or 'shared'
   */
  changeScope(id, newScope) {
    const viz = yVisualizations.get(id);

    if (!viz) {
      console.error("Visualization not found:", id);
      return;
    }

    // TODO (Permissions): Check if user can change scope
    // Only creator or admin should be able to change

    viz.scope = newScope;
    yVisualizations.set(id, viz);

    console.log(`🔄 Visualization ${id} scope changed to: ${newScope}`);
  }

  /**
   * Update camera position
   * @param {string} id - Visualization ID
   * @param {Object} camera - Camera state
   */
  updateCamera(id, camera) {
    const viz = yVisualizations.get(id);

    if (!viz) return;

    viz.camera = camera;
    viz.lastUpdated = Date.now();
    viz.lastUpdatedBy = getUserId();

    yVisualizations.set(id, viz);
  }

  /**
   * Remove visualization
   * @param {string} id - Visualization ID
   */
  removeVisualization(id) {
    yVisualizations.delete(id);
    this.visualizations.delete(id);

    console.log(`🗑️ Visualization removed: ${id}`);
  }

  /**
   * Set active visualization
   * @param {string} id - Visualization ID
   */
  setActive(id) {
    this.activeVizId = id;
    console.log(`🎯 Active visualization: ${id}`);
  }

  /**
   * Get active visualization
   * @returns {Object|null}
   */
  getActive() {
    return this.activeVizId ? this.getVisualization(this.activeVizId) : null;
  }

  _syncVisualizationsFromYjs() {
    // TODO: Handle remote visualization updates
    // For now, just log
    console.log("🔄 Visualizations synced from Y.js");
  }

  // ----------------------------------------------------------------------------
  // EXTENSION POINTS
  // ----------------------------------------------------------------------------

  /**
   * TODO (Follow Mode): Follow another user's camera
   * enableFollowMode(vizId, targetUserId) {
   *   const viz = yVisualizations.get(vizId);
   *   viz.followingUserId = targetUserId;
   *
   *   // Subscribe to their camera updates
   *   const targetViz = this._findVisualizationByUser(targetUserId);
   *   // Sync camera whenever they move
   * }
   */

  /**
   * TODO (Duplication): Duplicate a view
   * duplicateVisualization(sourceVizId) {
   *   const source = yVisualizations.get(sourceVizId);
   *   return this.createVisualization(source.datasetId, 'personal', {
   *     name: `${source.name} (Copy)`,
   *     camera: source.camera,
   *     widgets: { ...source.widgets }
   *   });
   * }
   */

  /**
   * TODO (Groups): Group-scoped visualizations
   * createGroupVisualization(datasetId, groupId) {
   *   // Only members of group can see this
   * }
   */
}

export const visualizationManager = new VisualizationManager();
