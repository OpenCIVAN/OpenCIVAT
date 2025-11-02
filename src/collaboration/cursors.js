// ----------------------------------------------------------------------------
// Collaborative Cursor System - Redesigned
// Separates cursor POSITION from cursor VISIBILITY
// ----------------------------------------------------------------------------

import { ydoc } from "./yjsSetup.js";
import {
  logInfo,
  logSuccess,
  logProgress,
  logError,
  logWarning,
} from "../ui/react/hooks/useLogging.js";
import { NETWORK_CONFIG } from "../config/constants.js";
import { getUserId, getUserName, getUserColor } from "./userManagement.js";

// Separate Yjs maps for position and preferences
const yCursors = ydoc.getMap("cursors"); // Position data only
const yCursorPrefs = ydoc.getMap("cursorPreferences"); // Visibility, size, style

// Store active cursors
const activeCursors = new Map();
let lastMousePosition = { x: 0, y: 0, timestamp: 0 };
let mouseMoveTimeout = null;

// ----------------------------------------------------------------------------
// Cursor Visual Elements
// ----------------------------------------------------------------------------

function createCursorElement(userId, color, displayName, isPointer = false) {
  try {
    const cursor = document.createElement("div");
    cursor.id = `cursor-${userId}`;

    if (isPointer) {
      // Pointer-style cursor (better for precision)
      cursor.style.cssText = `
        position: fixed;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-4px, -4px);
        transition: all 0.1s ease;
      `;

      // Create arrow SVG
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "24");
      svg.setAttribute("height", "24");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.style.cssText = "filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));";

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", "M3 3 L3 17 L9 13 L12 20 L14 19 L11 12 L18 12 Z");
      path.setAttribute("fill", color);
      path.setAttribute("stroke", "white");
      path.setAttribute("stroke-width", "1");

      svg.appendChild(path);
      cursor.appendChild(svg);
    } else {
      // Circle cursor (legacy)
      cursor.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -50%);
        transition: all 0.1s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
    }

    // Add user label
    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute;
      top: ${isPointer ? "24px" : "25px"};
      left: ${isPointer ? "0px" : "50%"};
      transform: translateX(${isPointer ? "0%" : "-50%"});
      background: ${color};
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-family: Arial, sans-serif;
      white-space: nowrap;
      font-weight: bold;
      max-width: 120px;
      text-overflow: ellipsis;
      overflow: hidden;
    `;
    label.textContent = displayName || "Unknown";

    cursor.appendChild(label);

    if (document.body) {
      document.body.appendChild(cursor);
    } else {
      logError("Cannot create cursor: document.body not available");
      return null;
    }

    return cursor;
  } catch (error) {
    logError(`Failed to create cursor element for ${userId}: ${error.message}`);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Mouse Tracking (Position Only)
// ----------------------------------------------------------------------------

function trackMouse() {
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
      updateMyCursorPosition();
    }, NETWORK_CONFIG.CURSOR_UPDATE_THROTTLE);
  });

  // Handle window focus/blur
  window.addEventListener("blur", () => {
    // Don't update position, just mark as inactive in position data
    updateMyCursorPosition(false);
  });

  window.addEventListener("focus", () => {
    if (lastMousePosition.timestamp > 0) {
      updateMyCursorPosition(true);
    }
  });
}

// ----------------------------------------------------------------------------
// Update Position (Reads Visibility from Preferences)
// ----------------------------------------------------------------------------

export function updateMyCursorPosition(windowActive = true) {
  if (!lastMousePosition || lastMousePosition.timestamp === 0) return;

  // Read visibility preference (separate from position)
  const prefs = yCursorPrefs.get(getUserId()) || {
    visible: true,
    style: "pointer",
  };

  // Update ONLY position data
  yCursors.set(getUserId(), {
    x: lastMousePosition.x,
    y: lastMousePosition.y,
    timestamp: lastMousePosition.timestamp,
    color: getUserColor(getUserId()),
    name: getUserName(),
    windowActive: windowActive,
  });
}

// ----------------------------------------------------------------------------
// Cursor Visibility Control (Separate from Position)
// ----------------------------------------------------------------------------

export function setMyCursorVisible(visible) {
  const currentPrefs = yCursorPrefs.get(getUserId()) || {};

  yCursorPrefs.set(getUserId(), {
    ...currentPrefs,
    visible: visible,
    timestamp: Date.now(),
  });

  console.log(`👁️ Cursor visibility set to: ${visible}`);
}

export function hideMyCursor(hide = true) {
  setMyCursorVisible(!hide);
}

export function setCursorStyle(style = "pointer") {
  const currentPrefs = yCursorPrefs.get(getUserId()) || {};

  yCursorPrefs.set(getUserId(), {
    ...currentPrefs,
    style: style, // 'pointer' or 'circle'
    timestamp: Date.now(),
  });

  console.log(`🖱️ Cursor style set to: ${style}`);
}

// ----------------------------------------------------------------------------
// Remote Cursor Rendering
// ----------------------------------------------------------------------------

function updateRemoteCursor(userId, positionData) {
  // Get preferences for this user
  const prefs = yCursorPrefs.get(userId) || { visible: true, style: "pointer" };

  // Check if cursor should be visible
  if (!prefs.visible || !positionData.windowActive) {
    hideCursor(userId);
    return;
  }

  let cursorData = activeCursors.get(userId);
  let cursorElement = cursorData ? cursorData.element : null;

  const displayName = positionData.name || "Unknown";
  const style = prefs.style || "pointer";

  // Create cursor if it doesn't exist or style changed
  if (
    !cursorElement ||
    !cursorElement.parentNode ||
    cursorData.style !== style
  ) {
    if (cursorElement && cursorElement.parentNode) {
      cursorElement.parentNode.removeChild(cursorElement);
    }

    cursorElement = createCursorElement(
      userId,
      positionData.color,
      displayName,
      style === "pointer"
    );
    if (!cursorElement) {
      logError(`Failed to create cursor element for ${userId}`);
      return;
    }

    activeCursors.set(userId, {
      element: cursorElement,
      lastUpdate: positionData.timestamp,
      displayName: displayName,
      style: style,
    });
  }

  // Update position
  try {
    if (cursorElement && cursorElement.style) {
      cursorElement.style.left = positionData.x + "px";
      cursorElement.style.top = positionData.y + "px";
      cursorElement.style.display = "block";

      // Update last seen timestamp
      const cursorInfo = activeCursors.get(userId);
      if (cursorInfo) {
        cursorInfo.lastUpdate = positionData.timestamp;
      }

      // Activity indicator
      cursorElement.style.transform =
        style === "pointer"
          ? "translate(-4px, -4px) scale(1.2)"
          : "translate(-50%, -50%) scale(1.2)";
      setTimeout(() => {
        if (cursorElement && cursorElement.parentNode && cursorElement.style) {
          cursorElement.style.transform =
            style === "pointer"
              ? "translate(-4px, -4px) scale(1)"
              : "translate(-50%, -50%) scale(1)";
        }
      }, 150);
    }
  } catch (error) {
    logError(`Error updating cursor for ${userId}: ${error.message}`);
    removeCursor(userId);
  }
}

function hideCursor(userId) {
  try {
    const cursor = activeCursors.get(userId);
    if (cursor && cursor.element && cursor.element.style) {
      cursor.element.style.display = "none";
    }
  } catch (error) {
    logWarning(`Error hiding cursor for ${userId}: ${error.message}`);
  }
}

function removeCursor(userId) {
  try {
    const cursor = activeCursors.get(userId);
    if (cursor && cursor.element) {
      if (cursor.element.parentNode) {
        cursor.element.parentNode.removeChild(cursor.element);
      }
      activeCursors.delete(userId);
    }
  } catch (error) {
    logWarning(`Error removing cursor for ${userId}: ${error.message}`);
  }
}

// ----------------------------------------------------------------------------
// Cursor Synchronization
// ----------------------------------------------------------------------------

function setupCursorSync() {
  // Listen for POSITION updates
  yCursors.observe((event) => {
    try {
      event.changes.keys.forEach((change, key) => {
        if (key === getUserId()) return; // Skip own cursor

        try {
          const positionData = yCursors.get(key);
          if (!positionData) {
            removeCursor(key);
            return;
          }

          // Validate cursor data
          if (
            typeof positionData.x !== "number" ||
            typeof positionData.y !== "number"
          ) {
            logWarning(`Invalid cursor data for ${key}`);
            return;
          }

          updateRemoteCursor(key, positionData);
        } catch (innerError) {
          logError(
            `Error processing cursor update for ${key}: ${innerError.message}`
          );
        }
      });
    } catch (error) {
      logError(`Error in cursor observer: ${error.message}`);
    }
  });

  // Listen for PREFERENCE updates
  yCursorPrefs.observe((event) => {
    try {
      event.changes.keys.forEach((change, key) => {
        if (key === getUserId()) return; // Skip own preferences

        // Re-render cursor with new preferences
        const positionData = yCursors.get(key);
        if (positionData) {
          updateRemoteCursor(key, positionData);
        }
      });
    } catch (error) {
      logError(`Error in cursor preferences observer: ${error.message}`);
    }
  });
}

// ----------------------------------------------------------------------------
// Cursor Cleanup
// ----------------------------------------------------------------------------

function startCursorCleanup() {
  setInterval(() => {
    const now = Date.now();
    const STALE_THRESHOLD = NETWORK_CONFIG.STALE_CURSOR_THRESHOLD;

    // Clean up stale cursors from DOM
    activeCursors.forEach((cursor, userId) => {
      if (now - cursor.lastUpdate > STALE_THRESHOLD) {
        logProgress(`Removing stale cursor for ${userId}`);
        removeCursor(userId);
      }
    });

    // Clean up stale cursors from Yjs
    const allCursors = yCursors.toJSON();
    Object.keys(allCursors).forEach((userId) => {
      const cursorData = allCursors[userId];
      if (cursorData && now - cursorData.timestamp > STALE_THRESHOLD) {
        yCursors.delete(userId);
      }
    });
  }, NETWORK_CONFIG.STALE_CURSOR_THRESHOLD);
}

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------

export function initializeCursorSystem() {
  try {
    logInfo(`Initializing collaborative cursors for user: ${getUserId()}`);

    if (!yCursors) {
      logError("Yjs not properly initialized - cursor system cannot start");
      return false;
    }

    if (!document.body) {
      logError("Document not ready - deferring cursor system initialization");
      document.addEventListener("DOMContentLoaded", () => {
        initializeCursorSystem();
      });
      return false;
    }

    // Set up mouse tracking
    trackMouse();

    // Set up syncing and cleanup
    setupCursorSync();
    startCursorCleanup();

    // Initialize preferences for this user
    if (!yCursorPrefs.get(getUserId())) {
      yCursorPrefs.set(getUserId(), {
        visible: true,
        style: "pointer",
        timestamp: Date.now(),
      });
    }

    // Send initial cursor position after delay
    setTimeout(() => {
      if (lastMousePosition.timestamp > 0) {
        updateMyCursorPosition(true);
      }
    }, 1000);

    logSuccess("Collaborative cursor system initialized");
    logProgress(`Your cursor color: ${getUserColor(getUserId())}`);
    logProgress(`Your display name: ${getUserName()}`);

    return true;
  } catch (error) {
    logError(`Failed to initialize cursor system: ${error.message}`);
    return false;
  }
}

export function getActiveCursors() {
  return activeCursors;
}

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    setMyCursorVisible(false);
  });
}

// TODO: Future enhancements
// - Per-user cursor visibility control (hide specific users)
// - Per-view cursor filtering (show cursors only in specific views)
// - Cursor confined to visualization area
// - Custom cursor sizes
// - VR controller → 2D cursor projection
