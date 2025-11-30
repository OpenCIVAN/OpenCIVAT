// src/collaboration/yjs/yjsSetup.js
// Core Y.js infrastructure - document, maps, provider initialization
//
// v2.0 ARCHITECTURE: Y.js for PRESENCE ONLY
// ============================================================================
// In v2.0, Y.js is used ONLY for ephemeral presence data:
// - Cursor positions
// - VR avatars and controller poses
// - Active users in views
// - Text chat (via Matrix-CRDT in future)
//
// PERSISTENT STATE comes from SERVER via REST API + WebSocket broadcast:
// - Datasets → server/src/routes/files.js
// - Annotations → server/src/routes/annotations.js
// - View configurations → server/src/routes/views.js
//
// This separation ensures:
// - Server is single source of truth (audit trails, versioning)
// - Y.js handles only high-frequency, ephemeral updates
// - WebSocket broadcasts keep clients in sync without polling
// ============================================================================

import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";

import { NETWORK_CONFIG } from "@Core/config/constants.js";
import { sessionManager } from "@Core/session/sessionManager";
import { sync as log } from "@Utils/logger.js";

// ============================================================================
// Core Y.js Document and Awareness
// ============================================================================
export const ydoc = new Y.Doc();
export const awareness = new Awareness(ydoc);

// ============================================================================
// PRESENCE STATE (Active in v2.0)
// These are the only Y.js maps that should be actively used
// ============================================================================

// ---------------------------------------------------------------------------
// CURSOR PRESENCE
// ---------------------------------------------------------------------------
export const yCursors = ydoc.getMap("cursors");
// Structure: userId -> { position, color, name, viewId, lastUpdate }
// High-frequency updates for real-time cursor tracking

// ---------------------------------------------------------------------------
// VIEW PRESENCE
// ---------------------------------------------------------------------------
export const yViewPresence = ydoc.getMap("viewPresence");
// Structure: viewId -> { viewers: [userId, ...], lastUpdate }
// Tracks who is viewing which view configuration

// ---------------------------------------------------------------------------
// VR COLLABORATION
// ---------------------------------------------------------------------------
export const yAvatars = ydoc.getMap("avatars");
// Structure: userId -> { position, rotation, headPose, handPoses, ... }
export const yVRControllers = ydoc.getMap("vrControllers");
// Structure: `${userId}_${hand}` -> { position, rotation, buttons, ... }

// ---------------------------------------------------------------------------
// TEXT CHAT (Legacy - will migrate to Matrix-CRDT)
// ---------------------------------------------------------------------------
export const yText = ydoc.getArray("chatMessages");
// Structure: Array of { userId, message, timestamp }
// NOTE: Planning migration to Matrix-CRDT for federation and E2EE

// ============================================================================
// DEPRECATED STATE MAPS (v2.0)
// These are kept for backward compatibility but NO LONGER ACTIVELY SYNCED
// Server is now the source of truth for all persistent state
// ============================================================================

// @deprecated v2.0 - Use server API: GET/POST /api/files
export const yDatasets = ydoc.getMap("datasets");

// @deprecated v2.0 - Use server API: GET/POST /api/views
export const yViews = ydoc.getMap("viewConfigurations");

// @deprecated v2.0 - Use server API: GET/POST /api/annotations
export const yAnnotations = ydoc.getMap("annotations");

// @deprecated v2.0 - Instances are ephemeral and don't sync
export const yInstances = ydoc.getMap("instances");

// @deprecated v2.0 - Use server API for workspace layouts
export const yWorkspaceLayouts = ydoc.getMap("workspaceLayouts");

// @deprecated v2.0 - File metadata comes from server
export const yFile = ydoc.getMap("file");

// ============================================================================
// Provider Initialization
// ============================================================================

let _provider = null;

/**
 * Initialize the Y.js WebSocket provider
 * This must be called after sessionManager.initializeFromURL()
 */
export function initializeYjsProvider() {
  if (_provider) {
    log.warn("Y.js provider already initialized");
    return _provider;
  }

  const roomId = sessionManager.getRoomId();

  _provider = new WebsocketProvider(
    NETWORK_CONFIG.WEBSOCKET_URL,
    roomId,
    ydoc,
    { awareness }
  );

  log.info(`Y.js connecting to room: ${roomId}`);

  _provider.on("status", (event) => {
    log.info(`Y.js connection status: ${event.status}`);
  });

  _provider.on("sync", (synced) => {
    if (synced) {
      log.info("Y.js synchronized with server");

      // Initialize observers when sync is complete
      import("@Collaboration/yjs/yjsObservers.js").then(
        ({ initializeAllObservers }) => {
          initializeAllObservers();
        }
      );
    }
  });

  return _provider;
}

// Export provider as a getter so it throws a helpful error if accessed before init
export const provider = new Proxy(
  {},
  {
    get(target, prop) {
      if (!_provider) {
        const error = new Error(
          `Y.js provider not initialized - call initializeYjsProvider() first.\n` +
            `Attempted to access provider.${String(prop)}`
        );
        log.error("Provider access stack trace:");
        log.error(error.stack);
        throw error;
      }
      return _provider[prop];
    },
  }
);

// ============================================================================
// PRESENCE SYNC FUNCTIONS (Active in v2.0)
// These are the only sync functions that should be actively used
// ============================================================================

/**
 * Update cursor presence in Y.js
 * @param {string} userId - User ID
 * @param {Object} cursorData - { position, color, name, viewId }
 */
export function syncCursorToYjs(userId, cursorData) {
  try {
    yCursors.set(userId, {
      ...cursorData,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync cursor to Y.js:", error);
  }
}

/**
 * Update VR avatar presence in Y.js
 * @param {string} userId - User ID
 * @param {Object} avatarData - { position, rotation, headPose, ... }
 */
export function syncAvatarToYjs(userId, avatarData) {
  try {
    yAvatars.set(userId, {
      ...avatarData,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync avatar to Y.js:", error);
  }
}

/**
 * Update VR controller presence in Y.js
 * @param {string} controllerId - `${userId}_${hand}` format
 * @param {Object} controllerData - { position, rotation, buttons, ... }
 */
export function syncVRControllerToYjs(controllerId, controllerData) {
  try {
    yVRControllers.set(controllerId, {
      ...controllerData,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync VR controller to Y.js:", error);
  }
}

/**
 * Update view presence (who is viewing what)
 * @param {string} viewId - View configuration ID
 * @param {string[]} viewers - Array of user IDs viewing this view
 */
export function syncViewPresenceToYjs(viewId, viewers) {
  try {
    yViewPresence.set(viewId, {
      viewers,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync view presence to Y.js:", error);
  }
}

/**
 * Remove user presence from Y.js (call on disconnect)
 * @param {string} userId - User ID to remove
 */
export function removeUserPresenceFromYjs(userId) {
  yCursors.delete(userId);
  yAvatars.delete(userId);
  // Remove both hand controllers
  yVRControllers.delete(`${userId}_left`);
  yVRControllers.delete(`${userId}_right`);
  log.info(`User presence removed from Y.js: ${userId}`);
}

// ============================================================================
// DEPRECATED SYNC FUNCTIONS (v2.0)
// These are kept for backward compatibility but should NOT be used
// State should be synced via server API + WebSocket broadcast
// ============================================================================

/**
 * @deprecated v2.0 - Use server API: POST /api/files
 * Dataset state should come from server, not Y.js
 */
export function syncDatasetToYjs(datasetId, metadata) {
  log.warn(
    "DEPRECATED v2.0: syncDatasetToYjs() - Use server API instead. " +
      "This function is kept for backward compatibility only."
  );
  try {
    yDatasets.set(datasetId, {
      id: metadata.id || datasetId,
      name: metadata.name,
      hash: metadata.hash,
      publicPath: metadata.publicPath,
      userId: metadata.uploadedBy,
      metadata: {
        fileSize: metadata.sizeBytes,
        uploadedAt: metadata.uploadedAt,
        uploadedBy: metadata.uploadedBy,
      },
    });
  } catch (error) {
    log.error("Failed to sync dataset to Y.js:", error);
  }
}

/**
 * @deprecated v2.0 - Use server API: POST /api/views
 */
export function syncViewToYjs(viewId, viewConfig) {
  log.warn("DEPRECATED v2.0: syncViewToYjs() - Use server API instead.");
  try {
    yViews.set(viewId, viewConfig);
  } catch (error) {
    log.error("Failed to sync view to Y.js:", error);
  }
}

/**
 * @deprecated v2.0 - Use server API: POST /api/annotations
 */
export function syncAnnotationsToYjs(datasetId, annotations) {
  log.warn(
    "DEPRECATED v2.0: syncAnnotationsToYjs() - Use server API instead."
  );
  try {
    yAnnotations.set(datasetId, annotations);
  } catch (error) {
    log.error("Failed to sync annotations to Y.js:", error);
  }
}

/**
 * @deprecated v2.0 - Use server API for workspace layouts
 */
export function syncWorkspaceLayoutToYjs(layoutId, layout) {
  log.warn(
    "DEPRECATED v2.0: syncWorkspaceLayoutToYjs() - Use server API instead."
  );
  try {
    yWorkspaceLayouts.set(layoutId, layout);
  } catch (error) {
    log.error("Failed to sync workspace layout to Y.js:", error);
  }
}

/**
 * @deprecated v2.0 - Use server API: DELETE /api/files/:id
 */
export function removeDatasetFromYjs(datasetId) {
  log.warn(
    "DEPRECATED v2.0: removeDatasetFromYjs() - Use server API instead."
  );
  yDatasets.delete(datasetId);
  yAnnotations.delete(datasetId);
}

/**
 * @deprecated v2.0 - Use server API: DELETE /api/views/:id
 */
export function removeViewFromYjs(viewId) {
  log.warn(
    "DEPRECATED v2.0: removeViewFromYjs() - Use server API instead."
  );
  yViews.delete(viewId);
  yViewPresence.delete(viewId);
}

/**
 * @deprecated v2.0 - Use server API
 */
export function removeWorkspaceLayoutFromYjs(layoutId) {
  log.warn(
    "DEPRECATED v2.0: removeWorkspaceLayoutFromYjs() - Use server API instead."
  );
  yWorkspaceLayouts.delete(layoutId);
}

/**
 * @deprecated - Instances are ephemeral and should not sync
 */
export function syncInstanceToYjs(instanceId, instance) {
  log.warn(
    "DEPRECATED: syncInstanceToYjs() - Instances are ephemeral and should not sync."
  );
}

/**
 * @deprecated - Instances are ephemeral and should not sync
 */
export function removeInstanceFromYjs(instanceId) {
  log.warn(
    "DEPRECATED: removeInstanceFromYjs() - Instances are ephemeral."
  );
  yInstances.delete(instanceId);
}

log.info("Y.js core initialized (v2.0 - presence only architecture)");
