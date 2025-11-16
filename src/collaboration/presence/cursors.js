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
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { NETWORK_CONFIG } from "@Core/config/constants.js";

// Separate Y.js maps for position and preferences
const yCursors = ydoc.getMap("cursors"); // Position data only
const yCursorPrefs = ydoc.getMap("cursorPreferences"); // Visibility, style

// Cursor position tracking
let lastMousePosition = { x: 0, y: 0, timestamp: 0 };
let mouseMoveTimeout = null;

// Listeners for cursor updates (instance handlers subscribe here)
const cursorUpdateListeners = new Set();
const cursorRemoveListeners = new Set();

// Track which instance is currently active
let activeInstanceId = null;

export function setActiveInstance(instanceId) {
  activeInstanceId = instanceId;
  // Re-broadcast with new instance context
  if (lastMousePosition.timestamp > 0) {
    broadcastCursorPosition();
  }
}

export function getActiveInstance() {
  return activeInstanceId;
}

// ----------------------------------------------------------------------------
// Mouse Tracking (Global Page Coordinates)
// ----------------------------------------------------------------------------

export function initializeCursorTracking() {
  console.log("🖱️ Initializing cursor tracking");

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
  });

  window.addEventListener("focus", () => {
    if (lastMousePosition.timestamp > 0) {
      broadcastCursorPosition(true);
    }
  });

  console.log("✅ Cursor tracking initialized");
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

  yCursors.set(getUserId(), {
    instanceId: activeInstanceId,
    x: lastMousePosition.x,
    y: lastMousePosition.y,
    timestamp: lastMousePosition.timestamp,
    color: getUserColor(getUserId()),
    name: getUserName(),
    windowActive: windowActive,
    visible: prefs.visible, // Include visibility in position data for convenience
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

  console.log(`🖱️ My cursor visibility: ${visible}`);
}

export function getMyCursorVisible() {
  const prefs = yCursorPrefs.get(getUserId());
  return prefs?.visible !== false; // Default to visible
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
            console.error("Error in cursor update listener:", error);
          }
        });
      } else {
        // Cursor is hidden, notify removal
        cursorRemoveListeners.forEach((callback) => {
          try {
            callback({ userId });
          } catch (error) {
            console.error("Error in cursor remove listener:", error);
          }
        });
      }
    } else if (change.action === "delete") {
      // User disconnected
      cursorRemoveListeners.forEach((callback) => {
        try {
          callback({ userId });
        } catch (error) {
          console.error("Error in cursor remove listener:", error);
        }
      });
    }
  });
});

console.log("✅ Cursor coordination system initialized");
