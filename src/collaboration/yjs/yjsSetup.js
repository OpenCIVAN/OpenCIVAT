// src/collaboration/yjs/yjsSetup.js
// Core Y.js infrastructure - document, maps, provider initialization
//
// v2.1 ARCHITECTURE: Y.js for PRESENCE + REAL-TIME VISUALIZATION SYNC
// ============================================================================
// Y.js handles ephemeral real-time data:
// - Cursor positions
// - VR avatars and controller poses
// - Active users in views
// - Text chat (via Matrix-CRDT in future)
// - Camera state (real-time smooth sync between collaborators)
// - Visualization settings (representation, opacity, colormap, scalar coloring)
// - Active manipulator identity (who is currently interacting)
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

import clientConfig from "@Core/config/clientConfig.js";
import { sessionManager } from "@Core/session/sessionManager";
import { authService } from "@Services/authService.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
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

// Cursor presence: userId -> { position, color, name, viewId, lastUpdate }
export const yCursors = ydoc.getMap("cursors");

// Camera presence: viewId -> { camera: {...}, userId, clientId, lastUpdate }
// Real-time camera sync for smooth collaborative viewing
export const yCameras = ydoc.getMap("cameras");

// Visualization state: viewId -> { visualization: {...}, userId, clientId, lastUpdate }
// Real-time sync for representation, opacity, colormap, scalar coloring
export const yVisualizationState = ydoc.getMap("visualizationState");

// Manipulator state: userId -> { userId, displayName, target, action, clientId, timestamp }
// Tracks who is currently interacting (camera, dataset, filter)
export const yManipulatorState = ydoc.getMap("manipulatorState");

// Active dataset: roomId -> { datasetId, name, path, type, source, version, updatedBy, updatedAt, clientId }
// Syncs dataset selection to all users in the same room/session
export const yActiveDataset = ydoc.getMap("activeDataset");

// View presence: viewId -> { viewers: [userId, ...], lastUpdate }
export const yViewPresence = ydoc.getMap("viewPresence");

// VR avatars: userId -> { position, rotation, headPose, handPoses, ... }
export const yAvatars = ydoc.getMap("avatars");

// VR controllers: `${userId}_${hand}` -> { position, rotation, buttons, ... }
export const yVRControllers = ydoc.getMap("vrControllers");

// Text chat: Array of { userId, message, timestamp }
// NOTE: Planning migration to Matrix-CRDT for federation and E2EE
export const yText = ydoc.getArray("chatMessages");

// ============================================================================
// Provider Initialization
// ============================================================================

let _provider = null;

async function waitForAccessToken() {
  // In dev bypass mode, no token is needed.
  const isDevMode =
    clientConfig.devBypassAuth === true || clientConfig.devBypassAuth === "true";
  if (isDevMode) return null;

  try {
    // authService.getAccessToken() auto-refreshes if needed.
    const token = await authService.getAccessToken?.();
    return token || null;
  } catch {
    log.debug("Could not get access token — proceeding without (dev or offline?)");
    return null;
  }
}

/**
 * Initialize the Y.js WebSocket provider
 * This must be called after sessionManager.initializeFromURL()
 */
export async function initializeYjsProvider() {
  if (_provider) {
    log.warn("Y.js provider already initialized");
    return _provider;
  }

  const roomId = sessionManager.getRoomId();
  const wsUrl = clientConfig.yjsWebSocketUrl;
  let token = null;

  try {
    token = await waitForAccessToken();
  } catch (error) {
    // Token errors are ignored - connecting without token in dev mode
    log.debug("Proceeding without access token");
  }

  // All connections allowed in development - token not required for collaboration
  log.info("Y.js connecting in collaboration mode (no token required)");

  const isDevMode =
    clientConfig.devBypassAuth === true || clientConfig.devBypassAuth === "true";

  const params = {};

  if (token) {
    // Pass JWT so server can validate room membership in production
    params.token = token;
  }

  if (isDevMode) {
    // DEV_BYPASS_AUTH: identify user by id/name via URL params
    const user = authService.getUser?.();
    if (user?.id) {
      params.userId = user.id;
      params.username = user.name;
    }
  }

  // Pass projectId so the Y.js server can perform project/room membership checks
  const projectId = sessionManager.projectId || clientConfig.defaultProjectId || null;
  if (projectId) {
    params.projectId = projectId;
  }

  _provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
    awareness,
    params,
  });

  log.info(`Y.js connecting to ${wsUrl} room: ${roomId}`);

  _provider.on("status", (event) => {
    log.info(`Y.js connection status: ${event.status}`);
    if (event.status === 'connected') {
      console.group("[CIA Collab] Y.js connected");
      console.log("Room:", roomId);
      console.log("User:", getUserId(), "(per-tab identity)");
      console.log("Y.js clientID (unique per tab):", ydoc.clientID);
      console.log("WebSocket URL:", wsUrl);
      console.groupEnd();
    }
  });

  _provider.on("sync", (synced) => {
    if (synced) {
      log.info("Y.js synchronized with server");

      // Initialize presence observers when sync is complete
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
 * Update camera presence in Y.js for real-time sync
 * This enables smooth camera synchronization between users viewing the same view
 * @param {string} viewId - View configuration ID
 * @param {string} userId - User who moved the camera
 * @param {Object} cameraState - { position, focalPoint, viewUp, parallelScale, clippingRange, viewAngle }
 */
export function syncCameraToYjs(viewId, userId, cameraState) {
  try {
    yCameras.set(viewId, {
      camera: cameraState,
      userId,
      clientId: ydoc.clientID,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync camera to Y.js:", error);
  }
}

/**
 * Sync visualization settings to Y.js for real-time collaborative updates.
 * Covers representation, opacity, colormap, scalar array selection.
 * @param {string} viewId - View configuration ID
 * @param {string} userId - User making the change
 * @param {Object} vizState - Partial visualization state (only changed fields)
 */
export function syncVisualizationToYjs(viewId, userId, vizState) {
  try {
    // Merge with existing state so partial updates don't overwrite other fields
    const existing = yVisualizationState.get(viewId)?.visualization || {};
    yVisualizationState.set(viewId, {
      visualization: { ...existing, ...vizState },
      userId,
      clientId: ydoc.clientID,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync visualization to Y.js:", error);
  }
}

/**
 * Broadcast active manipulator identity for UI awareness.
 * Call with target/action when interaction starts; call with null target to clear.
 * @param {string} userId
 * @param {string|null} displayName
 * @param {string|null} target - "camera" | "dataset" | "filter" | null (clear)
 * @param {string|null} action - "manipulating" | "loading" | "filtering" | null
 */
export function syncManipulatorToYjs(userId, displayName, target, action) {
  try {
    if (!target) {
      yManipulatorState.delete(userId);
    } else {
      yManipulatorState.set(userId, {
        userId,
        displayName,
        target,
        action,
        clientId: ydoc.clientID,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    log.error("Failed to sync manipulator to Y.js:", error);
  }
}

/**
 * Broadcast the active dataset to all users in the same room.
 * Keyed by roomId so sync is scoped to the current session only.
 * @param {string} roomId - Session/room ID (from sessionManager.getRoomId())
 * @param {string} userId - User making the selection
 * @param {{ datasetId, name, path, type, source }} datasetInfo
 */
export function syncActiveDatasetToYjs(roomId, userId, datasetInfo) {
  try {
    const prev = yActiveDataset.get(roomId);
    const version = (prev?.version || 0) + 1;
    yActiveDataset.set(roomId, {
      ...datasetInfo,
      version,
      updatedBy: userId,
      updatedAt: Date.now(),
      clientId: ydoc.clientID,
    });
    console.log('[CIA Collab] → activeDataset broadcast', datasetInfo.datasetId, 'v' + version);
  } catch (error) {
    log.error("Failed to sync active dataset to Y.js:", error);
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

log.info("Y.js core initialized (v2.0 - presence only architecture)");
