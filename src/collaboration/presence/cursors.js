// ----------------------------------------------------------------------------
// Collaborative Cursor System - Generic Coordination Layer
//
// ARCHITECTURE:
// This file handles cursor POSITION TRACKING and Y.js SYNCHRONIZATION only.
// It does NOT render cursors - that's the responsibility of instance type handlers.
//
// Instance handlers (VTKInstanceCursors, PlotlyInstanceCursors, etc.) subscribe
// to cursor updates and render cursors in their own coordinate systems.
// ----------------------------------------------------------------------------

import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { ydoc, awareness } from "@Collaboration/yjs/yjsSetup.js";
import { NETWORK_CONFIG } from "@Core/config/constants.js";
import { cursor as log } from "@Utils/logger.js";

// Separate Y.js maps for position and preferences
const yCursors = ydoc.getMap("cursors"); // Position data only
const yCursorPrefs = ydoc.getMap("cursorPreferences"); // Visibility, style

// Cursor position tracking
let lastMousePosition = { x: 0, y: 0, timestamp: 0 };
let mouseMoveTimeout = null;

// 3D world position (set by instance handlers like VTK)
let lastWorldPosition = null; // { x, y, z } or null
let lastWorldNormal = null; // { x, y, z } or null (surface normal for orientation)

// Listeners for cursor updates (instance handlers subscribe here)
const cursorUpdateListeners = new Set();
const cursorRemoveListeners = new Set();

// Track which instance is currently active
let activeInstanceId = null;
// Track which viewConfig is currently active (shared across collaborators)
let activeViewConfigId = null;

export function setActiveInstance(instanceId, viewConfigId = null) {
  const previousInstanceId = activeInstanceId;
  activeInstanceId = instanceId;

  // Update viewConfigId if provided
  if (viewConfigId !== null) {
    activeViewConfigId = viewConfigId;
  }

  // Clear world position when switching instances (3D coordinates are instance-specific)
  if (previousInstanceId !== instanceId) {
    lastWorldPosition = null;
    lastWorldNormal = null;
  }

  // Re-broadcast with new instance context
  if (lastMousePosition.timestamp > 0) {
    broadcastCursorPosition();
  }
}

export function getActiveInstance() {
  return activeInstanceId;
}

export function getActiveViewConfig() {
  return activeViewConfigId;
}

// ----------------------------------------------------------------------------
// Mouse Tracking (Global Page Coordinates)
// ----------------------------------------------------------------------------

export function initializeCursorTracking() {
  log.debug("Initializing cursor tracking");

  document.addEventListener("mousemove", (event) => {
    const now = Date.now();
    lastMousePosition = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
    };

    // Throttle updates
    if (mouseMoveTimeout) {
      clearTimeout(mouseMoveTimeout);
    }

    mouseMoveTimeout = setTimeout(() => {
      broadcastCursorPosition();
    }, NETWORK_CONFIG.CURSOR_UPDATE_THROTTLE);
  });

  // Handle window focus/blur
  window.addEventListener("blur", () => {
    broadcastCursorPosition(false);
    // Clear cursor from awareness when window loses focus
    const currentState = awareness.getLocalState() || {};
    awareness.setLocalState({
      ...currentState,
      cursor: null,
    });
  });

  window.addEventListener("focus", () => {
    if (lastMousePosition.timestamp > 0) {
      broadcastCursorPosition(true);
    }
  });

  log.debug("Cursor tracking initialized");
}

// ----------------------------------------------------------------------------
// Cursor Position Broadcasting
// ----------------------------------------------------------------------------

function broadcastCursorPosition(windowActive = true) {
  if (!lastMousePosition || lastMousePosition.timestamp === 0) return;

  // Read visibility preference
  const prefs = yCursorPrefs.get(getUserId()) || {
    visible: true,
    style: "pointer",
  };

  // Update position data in Y.js
  if (!activeInstanceId) return;

  // Build cursor data with extended 3D support
  const cursorData = {
    instanceId: activeInstanceId,
    // ViewConfigId for collaborative matching (shared across users viewing same content)
    viewConfigId: activeViewConfigId,
    // Screen coordinates (always present)
    screen: {
      x: lastMousePosition.x,
      y: lastMousePosition.y,
    },
    // Legacy fields for backward compatibility
    x: lastMousePosition.x,
    y: lastMousePosition.y,
    // World coordinates (optional, set by 3D handlers)
    world: lastWorldPosition ? { ...lastWorldPosition } : null,
    // Surface normal (optional, for orientation)
    normal: lastWorldNormal ? { ...lastWorldNormal } : null,
    // Metadata
    timestamp: lastMousePosition.timestamp,
    color: getUserColor(getUserId()),
    name: getUserName(),
    windowActive: windowActive,
    visible: prefs.visible, // Include visibility in position data for convenience
  };

  yCursors.set(getUserId(), cursorData);

  // Also update awareness for server-side recording
  const currentState = awareness.getLocalState() || {};
  awareness.setLocalState({
    ...currentState,
    cursor: {
      instanceId: activeInstanceId,
      viewConfigId: activeViewConfigId,
      screen: { x: lastMousePosition.x, y: lastMousePosition.y },
      x: lastMousePosition.x,
      y: lastMousePosition.y,
      world: lastWorldPosition ? { ...lastWorldPosition } : null,
      normal: lastWorldNormal ? { ...lastWorldNormal } : null,
      timestamp: lastMousePosition.timestamp,
    },
  });
}

// ----------------------------------------------------------------------------
// Cursor Visibility Control
// ----------------------------------------------------------------------------

export function setMyCursorVisible(visible) {
  const prefs = yCursorPrefs.get(getUserId()) || { style: "pointer" };
  prefs.visible = visible;
  yCursorPrefs.set(getUserId(), prefs);

  // Update current position with new visibility
  broadcastCursorPosition();

  log.debug(`My cursor visibility: ${visible}`);
}

export function getMyCursorVisible() {
  const prefs = yCursorPrefs.get(getUserId());
  return prefs?.visible !== false; // Default to visible
}

// ----------------------------------------------------------------------------
// 3D World Position Updates (For Instance Handlers like VTK)
// ----------------------------------------------------------------------------

/**
 * Update the cursor's 3D world position.
 * Called by instance handlers (VTK, etc.) when they can compute world coordinates
 * from screen coordinates (e.g., via ray picking).
 *
 * @param {{ x: number, y: number, z: number } | null} worldPos - World coordinates or null to clear
 * @param {{ x: number, y: number, z: number } | null} normal - Surface normal at cursor position (optional)
 */
export function updateCursorWorldPosition(worldPos, normal = null) {
  // Validate and store world position
  if (
    worldPos &&
    typeof worldPos.x === "number" &&
    typeof worldPos.y === "number" &&
    typeof worldPos.z === "number"
  ) {
    lastWorldPosition = {
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
    };
  } else {
    lastWorldPosition = null;
  }

  // Validate and store normal
  if (
    normal &&
    typeof normal.x === "number" &&
    typeof normal.y === "number" &&
    typeof normal.z === "number"
  ) {
    lastWorldNormal = {
      x: normal.x,
      y: normal.y,
      z: normal.z,
    };
  } else {
    lastWorldNormal = null;
  }

  // Broadcast the updated position (includes world coordinates now)
  if (lastMousePosition.timestamp > 0) {
    broadcastCursorPosition();
  }
}

/**
 * Clear the 3D world position (e.g., when cursor leaves the 3D surface)
 */
export function clearCursorWorldPosition() {
  lastWorldPosition = null;
  lastWorldNormal = null;

  if (lastMousePosition.timestamp > 0) {
    broadcastCursorPosition();
  }
}

/**
 * Get the current world position (for local use)
 * @returns {{ x: number, y: number, z: number } | null}
 */
export function getCursorWorldPosition() {
  return lastWorldPosition ? { ...lastWorldPosition } : null;
}

/**
 * Get the current world normal (for local use)
 * @returns {{ x: number, y: number, z: number } | null}
 */
export function getCursorWorldNormal() {
  return lastWorldNormal ? { ...lastWorldNormal } : null;
}

// ----------------------------------------------------------------------------
// Cursor Display Position Helper
// ----------------------------------------------------------------------------

/**
 * Get the display position for a cursor based on the requested mode.
 * Provides backward compatibility - falls back to screen coordinates if world is unavailable.
 *
 * @param {Object} cursorData - Cursor data from the subscription callback
 * @param {'screen' | 'world' | 'auto'} mode - Position mode:
 *   - 'screen': Always return screen coordinates
 *   - 'world': Return world coordinates (or null if unavailable)
 *   - 'auto': Return world if available, otherwise screen
 * @returns {{ type: 'screen' | 'world', position: { x: number, y: number, z?: number }, normal?: { x: number, y: number, z: number } } | null}
 */
export function getCursorDisplayPosition(cursorData, mode = "auto") {
  if (!cursorData) return null;

  // Get screen coordinates (with backward compatibility)
  const screenPos = cursorData.screen || { x: cursorData.x, y: cursorData.y };

  switch (mode) {
    case "screen":
      return {
        type: "screen",
        position: { x: screenPos.x, y: screenPos.y },
      };

    case "world":
      if (cursorData.world) {
        return {
          type: "world",
          position: {
            x: cursorData.world.x,
            y: cursorData.world.y,
            z: cursorData.world.z,
          },
          normal: cursorData.normal || null,
        };
      }
      return null; // World coordinates not available

    case "auto":
    default:
      if (cursorData.world) {
        return {
          type: "world",
          position: {
            x: cursorData.world.x,
            y: cursorData.world.y,
            z: cursorData.world.z,
          },
          normal: cursorData.normal || null,
        };
      }
      return {
        type: "screen",
        position: { x: screenPos.x, y: screenPos.y },
      };
  }
}

/**
 * Check if cursor data has valid world coordinates
 * @param {Object} cursorData - Cursor data from subscription
 * @returns {boolean}
 */
export function hasWorldPosition(cursorData) {
  return !!(
    cursorData?.world &&
    typeof cursorData.world.x === "number" &&
    typeof cursorData.world.y === "number" &&
    typeof cursorData.world.z === "number"
  );
}

// ----------------------------------------------------------------------------
// Subscribe to Cursor Updates (For Instance Handlers)
// ----------------------------------------------------------------------------

/**
 * Subscribe to cursor position updates from other users
 * Instance handlers call this to get notified of cursor movements
 *
 * @param {Function} callback - Called with { userId, cursorData }
 * @returns {Function} cleanup function
 */
export function onCursorUpdate(callback) {
  cursorUpdateListeners.add(callback);

  // Return cleanup function
  return () => {
    cursorUpdateListeners.delete(callback);
  };
}

/**
 * Subscribe to cursor removal events
 *
 * @param {Function} callback - Called with { userId }
 * @returns {Function} cleanup function
 */
export function onCursorRemove(callback) {
  cursorRemoveListeners.add(callback);

  return () => {
    cursorRemoveListeners.delete(callback);
  };
}

// ----------------------------------------------------------------------------
// Y.js Observer (Broadcasts to Instance Handlers)
// ----------------------------------------------------------------------------

// Observe cursor changes and notify all subscribers
yCursors.observe((event) => {
  event.changes.keys.forEach((change, userId) => {
    if (userId === getUserId()) return; // Ignore own cursor

    if (change.action === "add" || change.action === "update") {
      const cursorData = yCursors.get(userId);

      if (cursorData && cursorData.visible !== false) {
        // Notify all instance handlers
        cursorUpdateListeners.forEach((callback) => {
          try {
            callback({ userId, cursorData });
          } catch (error) {
            log.error("Error in cursor update listener:", error);
          }
        });
      } else {
        // Cursor is hidden, notify removal
        cursorRemoveListeners.forEach((callback) => {
          try {
            callback({ userId });
          } catch (error) {
            log.error("Error in cursor remove listener:", error);
          }
        });
      }
    } else if (change.action === "delete") {
      // User disconnected
      cursorRemoveListeners.forEach((callback) => {
        try {
          callback({ userId });
        } catch (error) {
          log.error("Error in cursor remove listener:", error);
        }
      });
    }
  });
});

log.debug("Cursor coordination system initialized");
