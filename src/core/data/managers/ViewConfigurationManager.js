// src/core/data/managers/ViewConfigurationManager.js

import { ViewConfiguration } from "@Core/data/models/ViewConfiguration.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";

/**
 * ViewConfigurationManager - Manages Layer 2 (ViewConfigurations)
 *
 * This manager sits between your DatasetManager (Layer 1) and InstanceManager (Layer 3).
 * It handles:
 * - Creating and destroying view configurations
 * - Syncing view state via Y.js for collaboration
 * - Managing active vs inactive views
 * - Cleanup of abandoned views
 *
 * CRITICAL FOR MULTI-TAB SYNC:
 * This is what enables users to see each other's views and camera movements!
 */

export class ViewConfigurationManager {
  constructor() {
    // In-memory cache of ViewConfiguration objects
    this._viewConfigs = new Map();

    // Y.js map for syncing view configurations
    // Structure: viewId -> { datasetId, camera, filters, widgets, etc. }
    this._yViews = ydoc.getMap("viewConfigurations");

    // Event listeners
    this._listeners = {
      viewAdded: [],
      viewRemoved: [],
      viewUpdated: [],
    };

    // Cleanup settings
    this._inactiveThresholdMs = 10 * 60 * 1000; // 10 minutes
    this._cleanupIntervalMs = 60 * 1000; // Check every minute
    this._cleanupInterval = null;
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the manager and set up Y.js observation
   */
  initialize() {
    console.log("📋 ViewConfigurationManager: Initializing...");

    // Load existing view configurations from Y.js
    this._loadFromYjs();

    // Set up Y.js observer for remote changes
    this._setupYjsObserver();

    // Start cleanup task
    this._startCleanupTask();

    console.log(
      `📋 ViewConfigurationManager: Initialized with ${this._viewConfigs.size} views`
    );
  }

  /**
   * Load view configurations from Y.js into memory
   */
  _loadFromYjs() {
    this._yViews.forEach((viewData, viewId) => {
      try {
        const view = ViewConfiguration.fromJSON(viewData);
        this._viewConfigs.set(viewId, view);
      } catch (error) {
        console.error(`Failed to load view ${viewId}:`, error);
      }
    });
  }

  /**
   * Set up Y.js observer to sync remote view changes
   */
  _setupYjsObserver() {
    this._yViews.observe((event) => {
      event.changes.keys.forEach((change, viewId) => {
        if (change.action === "add" || change.action === "update") {
          const viewData = this._yViews.get(viewId);
          if (!viewData) return;

          // Skip our own changes
          if (viewData.ownerUserId === getUserId()) {
            // We already have this locally
            return;
          }

          console.log(`📥 Remote view received: ${viewId}`);

          try {
            const view = ViewConfiguration.fromJSON(viewData);
            this._viewConfigs.set(viewId, view);
            this._emit("viewUpdated", view);
          } catch (error) {
            console.error(`Failed to sync view ${viewId}:`, error);
          }
        } else if (change.action === "delete") {
          console.log(`🗑️ Remote view deleted: ${viewId}`);
          this._viewConfigs.delete(viewId);
          this._emit("viewRemoved", viewId);
        }
      });
    });
  }

  // ==================== VIEW LIFECYCLE ====================

  /**
   * Create a new view configuration for a dataset
   *
   * @param {string} datasetId - Dataset to create view for
   * @param {object} config - Optional initial configuration
   * @returns {ViewConfiguration} - The created view
   */
  createView(datasetId, config = {}) {
    const view = new ViewConfiguration({
      ...config,
      datasetId,
      ownerUserId: getUserId(),
    });

    // Store locally
    this._viewConfigs.set(view.id, view);

    // Sync to Y.js for collaboration
    this._syncToYjs(view);

    // Emit event
    this._emit("viewAdded", view);

    console.log(`✅ View created: ${view.id} for dataset ${datasetId}`);

    return view;
  }

  /**
   * Get a view configuration by ID
   *
   * @param {string} viewId - View ID
   * @returns {ViewConfiguration|null}
   */
  getView(viewId) {
    return this._viewConfigs.get(viewId) || null;
  }

  /**
   * Get all view configurations for a dataset
   *
   * @param {string} datasetId - Dataset ID
   * @returns {ViewConfiguration[]}
   */
  getViewsForDataset(datasetId) {
    return Array.from(this._viewConfigs.values()).filter(
      (view) => view.datasetId === datasetId
    );
  }

  /**
   * Get all active view configurations
   *
   * @returns {ViewConfiguration[]}
   */
  getActiveViews() {
    return Array.from(this._viewConfigs.values()).filter((view) =>
      view.isActive()
    );
  }

  /**
   * Update a view configuration
   * This is called when instance state changes (camera, filters, etc.)
   *
   * @param {string} viewId - View ID
   * @param {object} updates - Fields to update
   */
  updateView(viewId, updates) {
    const view = this._viewConfigs.get(viewId);
    if (!view) {
      console.warn(`View ${viewId} not found`);
      return;
    }

    // Apply updates
    Object.assign(view, updates);
    view.lastActiveTimestamp = Date.now();

    // Sync to Y.js
    this._syncToYjs(view);

    // Emit event
    this._emit("viewUpdated", view);
  }

  /**
   * Update view camera (called frequently during interaction)
   *
   * @param {string} viewId - View ID
   * @param {object} cameraState - New camera parameters
   */
  updateCamera(viewId, cameraState) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateCamera(cameraState);
    this._syncToYjs(view); // ✅ This syncs to Y.js
    this._emit("viewUpdated", view);
  }

  /**
   * Mark view as active (instance is rendering it)
   *
   * @param {string} viewId - View ID
   */
  activateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.activate();
    this._syncToYjs(view);
    this._emit("viewUpdated", view);
  }

  /**
   * Decrement active instance count
   *
   * @param {string} viewId - View ID
   */
  deactivateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.deactivate();
    this._syncToYjs(view);
    this._emit("viewUpdated", view);
  }

  /**
   * Delete a view configuration
   *
   * @param {string} viewId - View ID
   */
  deleteView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Only owner can delete
    if (view.ownerUserId !== getUserId()) {
      console.warn("Cannot delete view owned by another user");
      return;
    }

    // Remove from memory
    this._viewConfigs.delete(viewId);

    // Remove from Y.js
    this._yViews.delete(viewId);

    // Emit event
    this._emit("viewRemoved", viewId);

    console.log(`🗑️ View deleted: ${viewId}`);
  }

  // ==================== SYNCHRONIZATION ====================

  /**
   * Sync a view configuration to Y.js for collaboration
   *
   * @param {ViewConfiguration} view - View to sync
   */
  _syncToYjs(view) {
    const data = view.toJSON();
    this._yViews.set(view.id, data);
  }

  // ==================== CLEANUP ====================

  /**
   * Start periodic cleanup of inactive views
   */
  _startCleanupTask() {
    if (this._cleanupInterval) return;

    this._cleanupInterval = setInterval(() => {
      this._cleanupInactiveViews();
    }, this._cleanupIntervalMs);

    console.log("🧹 View cleanup task started");
  }

  /**
   * Clean up views that should not be kept
   * Views are kept if:
   * - User explicitly saved them
   * - They're currently active
   * - They've been active recently
   */
  _cleanupInactiveViews() {
    const userId = getUserId();
    let cleanedCount = 0;

    this._viewConfigs.forEach((view) => {
      // Only clean up our own views
      if (view.ownerUserId !== userId) return;

      // Check if view should be kept
      if (!view.shouldKeep(this._inactiveThresholdMs)) {
        view.archive();
        this._syncToYjs(view);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Archived ${cleanedCount} inactive view(s)`);
    }
  }

  /**
   * Stop cleanup task
   */
  stopCleanupTask() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
      console.log("🧹 View cleanup task stopped");
    }
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Subscribe to view changes
   *
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
  }

  /**
   * Unsubscribe from view changes
   *
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  off(event, callback) {
    if (this._listeners[event]) {
      const index = this._listeners[event].indexOf(callback);
      if (index > -1) {
        this._listeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   *
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Cleanup when shutting down
   */
  destroy() {
    this.stopCleanupTask();
    this._viewConfigs.clear();
    this._listeners = {
      viewAdded: [],
      viewRemoved: [],
      viewUpdated: [],
    };
  }
}

// Export singleton instance
export const viewConfigurationManager = new ViewConfigurationManager();
