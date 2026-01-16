// src/collaboration/yjs/yjsSetup.js
// Core Y.js infrastructure - document, maps, provider initialization
//
// v2.0 ARCHITECTURE: Y.js for PRESENCE ONLY
// ============================================================================
// Y.js is used ONLY for ephemeral presence data:
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

import clientConfig from "@Core/config/clientConfig.js";
import { sessionManager } from "@Core/session/sessionManager";
import { authService } from "@Services/authService.js";
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

// Camera presence: viewId -> { camera: {...}, userId, lastUpdate }
// Real-time camera sync for smooth collaborative viewing
export const yCameras = ydoc.getMap("cameras");

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

async function waitForAccessToken(timeoutMs = 15000) {
  const existingToken = await authService.getAccessToken().catch(() => null);
  if (existingToken) {
    return existingToken;
  }

  if (clientConfig.devBypassAuth) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      reject(new Error("Timed out waiting for access token"));
    }, timeoutMs);

    const unsubscribe = authService.onAuthStateChange(async (event) => {
      if (resolved) return;
      if (event === "authenticated") {
        const token = await authService.getAccessToken().catch(() => null);
        if (token) {
          resolved = true;
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(token);
        }
      } else if (event === "logout" || event === "session_expired") {
        resolved = true;
        clearTimeout(timeoutId);
        unsubscribe();
        reject(new Error("Authentication required"));
      }
    });
  });
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
    log.warn("Failed to get access token for Y.js:", error.message);
  }

  if (!token && !clientConfig.devBypassAuth) {
    throw new Error("Missing access token for Y.js connection");
  }

  const params = {};
  if (token) {
    params.token = token;
  }
  if (clientConfig.devBypassAuth) {
    const user = authService.getUser?.();
    if (user?.id) {
      params.userId = user.id;
      params.username = user.name;
    }
  }

  _provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
    awareness,
    params,
  });

  log.info(`Y.js connecting to ${wsUrl} room: ${roomId}`);

  _provider.on("status", (event) => {
    log.info(`Y.js connection status: ${event.status}`);
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
      lastUpdate: Date.now(),
    });
  } catch (error) {
    log.error("Failed to sync camera to Y.js:", error);
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
