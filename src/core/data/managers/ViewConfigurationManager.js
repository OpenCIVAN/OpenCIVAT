// src/core/data/managers/ViewConfigurationManager.js
// Manages Layer 2 (ViewConfigurations) - the collaborative unit
//
// ARCHITECTURAL ROLE:
// - Sits between DatasetManager (Layer 1) and InstanceManager (Layer 3)
// - Owns all Y.js sync for view state
// - Handles linking, broadcasting, and presence
// - Manages view lifecycle and cleanup

import {
  ViewConfiguration,
  LINK_MODES,
  LINK_STATUS,
  LINKABLE_PROPERTIES,
} from "@Core/data/models/ViewConfiguration.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
// Note: ID generation happens in ViewConfiguration using @Utils/idGenerator.js

export class ViewConfigurationManager {
  constructor() {
    // In-memory cache of ViewConfiguration objects
    this._viewConfigs = new Map();

    // Y.js map for syncing view configurations
    this._yViews = ydoc.getMap("viewConfigurations");

    // Event listeners
    this._listeners = {
      viewAdded: [],
      viewRemoved: [],
      viewUpdated: [],
      viewShared: [],
      linkChanged: [],
      broadcastChanged: [],
      presenceChanged: [],
    };

    // Cleanup settings
    this._inactiveThresholdMs = 10 * 60 * 1000; // 10 minutes
    this._cleanupIntervalMs = 60 * 1000; // Check every minute
    this._cleanupInterval = null;

    // Presence update throttle
    this._presenceThrottleMs = 100; // Max 10 updates/second
    this._lastPresenceUpdate = new Map(); // viewId -> timestamp

    // Track which views we're observing for link updates
    this._linkObservers = new Map(); // targetViewId -> Set of subscriberViewIds
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

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

  _loadFromYjs() {
    this._yViews.forEach((viewData, viewId) => {
      try {
        const view = ViewConfiguration.fromJSON(viewData);
        this._viewConfigs.set(viewId, view);

        // Set up link observers for any existing links
        this._setupLinkObserversForView(view);
      } catch (error) {
        console.error(`Failed to load view ${viewId}:`, error);
      }
    });
  }

  _setupYjsObserver() {
    this._yViews.observe((event) => {
      event.changes.keys.forEach((change, viewId) => {
        if (change.action === "add" || change.action === "update") {
          const viewData = this._yViews.get(viewId);
          if (!viewData) return;

          const isOwnChange = viewData.ownerUserId === getUserId();
          const existingView = this._viewConfigs.get(viewId);

          if (isOwnChange && existingView) {
            // Our own change, already have it locally - skip
            return;
          }

          console.log(`📥 Remote view ${change.action}: ${viewId}`);

          try {
            const view = ViewConfiguration.fromJSON(viewData);
            this._viewConfigs.set(viewId, view);

            // Set up link observers
            this._setupLinkObserversForView(view);

            // Emit event
            this._emit("viewUpdated", view);

            // Notify any views linked to this one
            this._notifyLinkedViews(viewId, view);
          } catch (error) {
            console.error(`Failed to sync view ${viewId}:`, error);
          }
        } else if (change.action === "delete") {
          console.log(`🗑️ Remote view deleted: ${viewId}`);

          // Notify views that were linked to this one
          this._handleLinkTargetDeleted(viewId);

          this._viewConfigs.delete(viewId);
          this._emit("viewRemoved", viewId);
        }
      });
    });
  }

  // ===========================================================================
  // VIEW LIFECYCLE
  // ===========================================================================

  /**
   * Create a new view configuration for a dataset
   */
  createView(datasetId, config = {}) {
    const userId = getUserId();
    const userName = getUserName();

    const view = new ViewConfiguration({
      ...config,
      datasetId,
      ownerUserId: userId,
      ownerUserName: userName,
      projectId: config.projectId || null,
    });

    // If camera/colorMaps are null, populate from handler defaults
    if (view.camera === null || view.colorMaps === null) {
      const handler = config.handler || getHandlerForFileType(config.fileType);
      if (handler) {
        const defaults = handler.getDefaultViewState();
        if (view.camera === null) view.camera = defaults.camera;
        if (view.colorMaps === null) view.colorMaps = defaults.colorMaps;
      }
    }

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
   */
  getView(viewId) {
    return this._viewConfigs.get(viewId) || null;
  }

  /**
   * Get all view configurations for a dataset
   */
  getViewsForDataset(datasetId) {
    return Array.from(this._viewConfigs.values()).filter(
      (view) => view.datasetId === datasetId
    );
  }

  /**
   * Get all active view configurations
   */
  getActiveViews() {
    return Array.from(this._viewConfigs.values()).filter((view) =>
      view.isActive()
    );
  }

  /**
   * Get views owned by current user
   */
  getMyViews() {
    const userId = getUserId();
    return Array.from(this._viewConfigs.values()).filter(
      (view) => view.ownerUserId === userId
    );
  }

  /**
   * Get views shared with current user
   */
  getSharedWithMe() {
    const userId = getUserId();
    return Array.from(this._viewConfigs.values()).filter(
      (view) =>
        view.ownerUserId !== userId &&
        view.sharedWith.some((s) => s.userId === userId)
    );
  }

  /**
   * Delete a view configuration
   */
  deleteView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return false;

    // Only owner can delete
    if (view.ownerUserId !== getUserId()) {
      console.warn(`Cannot delete view ${viewId}: not owner`);
      return false;
    }

    // Remove from Y.js
    this._yViews.delete(viewId);

    // Remove locally
    this._viewConfigs.delete(viewId);

    // Notify linked views
    this._handleLinkTargetDeleted(viewId);

    // Emit event
    this._emit("viewRemoved", viewId);

    console.log(`🗑️ View deleted: ${viewId}`);

    return true;
  }

  // ===========================================================================
  // STATE UPDATES
  // ===========================================================================

  /**
   * Update view camera state
   */
  updateCamera(viewId, cameraState) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateCamera(cameraState);
    this._syncToYjs(view);
  }

  /**
   * Add a filter to a view
   */
  addFilter(viewId, filter) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const filterId = view.addFilter(filter);
    this._syncToYjs(view);
    return filterId;
  }

  /**
   * Update a filter
   */
  updateFilter(viewId, filterId, updates) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateFilter(filterId, updates);
    this._syncToYjs(view);
  }

  /**
   * Remove a filter
   */
  removeFilter(viewId, filterId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.removeFilter(filterId);
    this._syncToYjs(view);
  }

  /**
   * Add a widget to a view
   */
  addWidget(viewId, widget) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const widgetId = view.addWidget(widget);
    this._syncToYjs(view);
    return widgetId;
  }

  /**
   * Update a widget
   */
  updateWidget(viewId, widgetId, updates) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateWidget(widgetId, updates);
    this._syncToYjs(view);
  }

  /**
   * Remove a widget
   */
  removeWidget(viewId, widgetId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.removeWidget(widgetId);
    this._syncToYjs(view);
  }

  /**
   * Update annotation display settings
   */
  updateAnnotationDisplay(viewId, updates) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.updateAnnotationDisplay(updates);
    this._syncToYjs(view);
  }

  // ===========================================================================
  // LINKING
  // ===========================================================================

  /**
   * Link a property of one view to another
   */
  linkProperty(viewId, property, targetViewId, mode = LINK_MODES.FOLLOW) {
    const view = this._viewConfigs.get(viewId);
    const targetView = this._viewConfigs.get(targetViewId);

    if (!view || !targetView) {
      console.error(`Cannot link: view or target not found`);
      return null;
    }

    // Create the link
    const link = view.linkProperty(property, targetView, mode);

    // Register this view as observing the target
    this._registerLinkObserver(targetViewId, viewId);

    // Apply initial state from target if following
    if (mode === LINK_MODES.FOLLOW || mode === LINK_MODES.BIDIRECTIONAL) {
      this._applyLinkedProperty(view, property, targetView);
    }

    // Sync changes
    this._syncToYjs(view);

    // Emit event
    this._emit("linkChanged", {
      viewId,
      property,
      targetViewId,
      mode,
      action: "created",
    });

    return link;
  }

  /**
   * Unlink a property
   */
  unlinkProperty(viewId, property) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    const link = view.links[property];
    if (link) {
      const targetViewId = link.targetViewId;
      this._unregisterLinkObserver(targetViewId, viewId);
    }

    view.unlinkProperty(property);
    this._syncToYjs(view);

    this._emit("linkChanged", { viewId, property, action: "removed" });
  }

  /**
   * Unlink all properties
   */
  unlinkAll(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Unregister from all targets
    for (const property of LINKABLE_PROPERTIES) {
      const link = view.links[property];
      if (link) {
        this._unregisterLinkObserver(link.targetViewId, viewId);
      }
    }

    view.unlinkAll();
    this._syncToYjs(view);

    this._emit("linkChanged", { viewId, action: "all_removed" });
  }

  /**
   * Pause a link (stop syncing but keep the connection)
   */
  pauseLink(viewId, property) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.pauseLink(property);
    this._syncToYjs(view);

    this._emit("linkChanged", { viewId, property, action: "paused" });
  }

  /**
   * Resume a paused link
   */
  resumeLink(viewId, property) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.resumeLink(property);

    // Re-apply current state from target
    const link = view.links[property];
    if (link && link.isActive()) {
      const targetView = this._viewConfigs.get(link.targetViewId);
      if (targetView) {
        this._applyLinkedProperty(view, property, targetView);
      }
    }

    this._syncToYjs(view);

    this._emit("linkChanged", { viewId, property, action: "resumed" });
  }

  // ===========================================================================
  // BROADCASTING
  // ===========================================================================

  /**
   * Start broadcasting a view (one-to-many presentation mode)
   */
  startBroadcast(viewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Only owner can broadcast
    if (view.ownerUserId !== getUserId()) {
      console.warn(`Cannot broadcast view ${viewId}: not owner`);
      return;
    }

    view.startBroadcast(options);
    this._syncToYjs(view);

    this._emit("broadcastChanged", { viewId, action: "started", options });
  }

  /**
   * Stop broadcasting
   */
  stopBroadcast(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.stopBroadcast();
    this._syncToYjs(view);

    this._emit("broadcastChanged", { viewId, action: "stopped" });
  }

  /**
   * Pause broadcast
   */
  pauseBroadcast(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.pauseBroadcast();
    this._syncToYjs(view);

    this._emit("broadcastChanged", { viewId, action: "paused" });
  }

  /**
   * Resume broadcast
   */
  resumeBroadcast(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.resumeBroadcast();
    this._syncToYjs(view);

    this._emit("broadcastChanged", { viewId, action: "resumed" });
  }

  /**
   * Start following a broadcasting view
   */
  followBroadcast(viewId, sourceViewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    const sourceView = this._viewConfigs.get(sourceViewId);

    if (!view || !sourceView) return;

    if (!sourceView.isBroadcasting()) {
      console.warn(`Cannot follow ${sourceViewId}: not broadcasting`);
      return;
    }

    view.startFollowing(sourceView, options);
    sourceView.incrementFollowerCount();

    // Link all properties in broadcast mode
    for (const property of LINKABLE_PROPERTIES) {
      view.linkProperty(property, sourceView, LINK_MODES.BROADCAST);
    }

    this._syncToYjs(view);
    this._syncToYjs(sourceView);

    this._emit("broadcastChanged", {
      viewId,
      sourceViewId,
      action: "following_started",
    });
  }

  /**
   * Stop following a broadcast
   */
  stopFollowing(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view || !view.isFollowing()) return;

    const sourceViewId = view.following.sourceViewId;
    const sourceView = this._viewConfigs.get(sourceViewId);

    if (sourceView) {
      sourceView.decrementFollowerCount();
      this._syncToYjs(sourceView);
    }

    // Unlink all properties
    view.unlinkAll();
    view.stopFollowing();

    this._syncToYjs(view);

    this._emit("broadcastChanged", {
      viewId,
      sourceViewId,
      action: "following_stopped",
    });
  }

  /**
   * Get all views currently broadcasting
   */
  getBroadcastingViews() {
    return Array.from(this._viewConfigs.values()).filter((view) =>
      view.isBroadcasting()
    );
  }

  // ===========================================================================
  // FORKING
  // ===========================================================================

  /**
   * Fork a view (create a copy with lineage tracking)
   */
  forkView(viewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const userId = getUserId();
    const userName = getUserName();

    const forkedView = view.fork(userId, userName, options);

    // Store locally
    this._viewConfigs.set(forkedView.id, forkedView);

    // Sync to Y.js
    this._syncToYjs(forkedView);
    this._syncToYjs(view); // Update fork count on original

    // Emit event
    this._emit("viewAdded", forkedView);

    console.log(`🍴 View forked: ${view.id} -> ${forkedView.id}`);

    return forkedView;
  }

  // ===========================================================================
  // SNAPSHOTS
  // ===========================================================================

  /**
   * Create a snapshot of a view
   */
  createSnapshot(viewId, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return null;

    const snapshot = view.createSnapshot({
      ...options,
      userId: getUserId(),
      userName: getUserName(),
    });

    this._syncToYjs(view);

    return snapshot;
  }

  /**
   * Restore a snapshot
   */
  restoreSnapshot(viewId, snapshotId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.restoreSnapshot(snapshotId);
    this._syncToYjs(view);

    this._emit("viewUpdated", view);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(viewId, snapshotId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.deleteSnapshot(snapshotId);
    this._syncToYjs(view);
  }

  // ===========================================================================
  // SHARING
  // ===========================================================================

  /**
   * Share a view with another user
   */
  shareView(viewId, targetUserId, targetUserName, options = {}) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Only owner can share
    if (view.ownerUserId !== getUserId()) {
      console.warn(`Cannot share view ${viewId}: not owner`);
      return;
    }

    view.share(targetUserId, targetUserName, options);
    this._syncToYjs(view);

    this._emit("viewShared", { viewId, targetUserId, options });
  }

  /**
   * Unshare a view
   */
  unshareView(viewId, targetUserId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.unshare(targetUserId);
    this._syncToYjs(view);
  }

  /**
   * Change view visibility
   */
  setViewVisibility(viewId, visibility) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.setVisibility(visibility);
    this._syncToYjs(view);
  }

  // ===========================================================================
  // PRESENCE
  // ===========================================================================

  /**
   * Update cursor position for presence
   */
  updatePresence(viewId, cursorPosition) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    // Throttle presence updates
    const now = Date.now();
    const lastUpdate = this._lastPresenceUpdate.get(viewId) || 0;
    if (now - lastUpdate < this._presenceThrottleMs) {
      return;
    }
    this._lastPresenceUpdate.set(viewId, now);

    const userId = getUserId();
    const userName = getUserName();

    view.updatePresence(userId, userName, cursorPosition);

    // Only sync presence data, not full view
    this._syncPresenceToYjs(viewId, view.presence);

    this._emit("presenceChanged", { viewId, userId, cursorPosition });
  }

  /**
   * Remove presence when leaving a view
   */
  removePresence(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    const userId = getUserId();
    view.removePresence(userId);

    this._syncPresenceToYjs(viewId, view.presence);
  }

  // ===========================================================================
  // LIFECYCLE MANAGEMENT
  // ===========================================================================

  /**
   * Mark a view as active (instance opened)
   */
  activateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.activate();
    this._syncToYjs(view);
  }

  /**
   * Mark a view as inactive (instance closed)
   */
  deactivateView(viewId) {
    const view = this._viewConfigs.get(viewId);
    if (!view) return;

    view.deactivate();
    this._syncToYjs(view);
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

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

  // ===========================================================================
  // PRIVATE: Y.JS SYNC
  // ===========================================================================

  _syncToYjs(view) {
    try {
      this._yViews.set(view.id, view.toJSON());
    } catch (error) {
      console.error(`Failed to sync view ${view.id} to Y.js:`, error);
    }
  }

  _syncPresenceToYjs(viewId, presence) {
    // Use a separate Y.js map for high-frequency presence updates
    // to avoid syncing full view state on every cursor move
    const yPresence = ydoc.getMap("viewPresence");
    try {
      yPresence.set(viewId, presence);
    } catch (error) {
      console.error(`Failed to sync presence for ${viewId}:`, error);
    }
  }

  // ===========================================================================
  // PRIVATE: LINK MANAGEMENT
  // ===========================================================================

  _setupLinkObserversForView(view) {
    for (const property of LINKABLE_PROPERTIES) {
      const link = view.links[property];
      if (link && link.isActive()) {
        this._registerLinkObserver(link.targetViewId, view.id);
      }
    }
  }

  _registerLinkObserver(targetViewId, subscriberViewId) {
    if (!this._linkObservers.has(targetViewId)) {
      this._linkObservers.set(targetViewId, new Set());
    }
    this._linkObservers.get(targetViewId).add(subscriberViewId);
  }

  _unregisterLinkObserver(targetViewId, subscriberViewId) {
    const subscribers = this._linkObservers.get(targetViewId);
    if (subscribers) {
      subscribers.delete(subscriberViewId);
      if (subscribers.size === 0) {
        this._linkObservers.delete(targetViewId);
      }
    }
  }

  _notifyLinkedViews(targetViewId, targetView) {
    const subscribers = this._linkObservers.get(targetViewId);
    if (!subscribers) return;

    for (const subscriberViewId of subscribers) {
      const subscriberView = this._viewConfigs.get(subscriberViewId);
      if (!subscriberView) continue;

      // Apply linked properties from target
      for (const property of LINKABLE_PROPERTIES) {
        const link = subscriberView.links[property];
        if (link && link.targetViewId === targetViewId && link.isActive()) {
          const mode = link.mode;

          if (mode === LINK_MODES.FOLLOW || mode === LINK_MODES.BROADCAST) {
            this._applyLinkedProperty(subscriberView, property, targetView);
          }
          // BIDIRECTIONAL handled separately to avoid loops
        }
      }
    }
  }

  _applyLinkedProperty(view, property, sourceView) {
    // Deep copy the property value from source to view
    const value = sourceView[property];
    if (value !== undefined) {
      view[property] = JSON.parse(JSON.stringify(value));
      view.updatedAt = Date.now();

      // Update link sync timestamp
      if (view.links[property]) {
        view.links[property].updateLastSync();
      }
    }
  }

  _handleLinkTargetDeleted(targetViewId) {
    const subscribers = this._linkObservers.get(targetViewId);
    if (!subscribers) return;

    for (const subscriberViewId of subscribers) {
      const subscriberView = this._viewConfigs.get(subscriberViewId);
      if (!subscriberView) continue;

      // Mark links as broken
      subscriberView.handleLinkTargetLost(targetViewId, "target_deleted");
      this._syncToYjs(subscriberView);

      this._emit("linkChanged", {
        viewId: subscriberViewId,
        targetViewId,
        action: "broken",
        reason: "target_deleted",
      });
    }

    // Clear the observer list for this target
    this._linkObservers.delete(targetViewId);
  }

  // ===========================================================================
  // PRIVATE: CLEANUP
  // ===========================================================================

  _startCleanupTask() {
    this._cleanupInterval = setInterval(() => {
      this._performCleanup();
    }, this._cleanupIntervalMs);
  }

  _performCleanup() {
    const toRemove = [];

    for (const [viewId, view] of this._viewConfigs) {
      // Only cleanup our own views
      if (view.ownerUserId !== getUserId()) continue;

      if (view.isCleanupCandidate(this._inactiveThresholdMs)) {
        toRemove.push(viewId);
      }

      // Also cleanup stale presence
      view.cleanupStalePresence();
    }

    for (const viewId of toRemove) {
      console.log(`🧹 Auto-cleaning inactive view: ${viewId}`);
      this._yViews.delete(viewId);
      this._viewConfigs.delete(viewId);
      this._emit("viewRemoved", viewId);
    }
  }

  // ===========================================================================
  // SHUTDOWN
  // ===========================================================================

  shutdown() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }

    // Remove presence from all views
    const userId = getUserId();
    for (const [viewId, view] of this._viewConfigs) {
      view.removePresence(userId);
    }

    this._viewConfigs.clear();
    this._linkObservers.clear();
    this._lastPresenceUpdate.clear();

    console.log("📋 ViewConfigurationManager: Shutdown complete");
  }
}

// Export singleton
export const viewConfigurationManager = new ViewConfigurationManager();
