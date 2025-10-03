import { ydoc, yCursors, yUserNames } from "./yjsSetup.js";
import {
  logInfo,
  logSuccess,
  logProgress,
  logError,
  logWarning,
} from "../ui/logging.js";
import { NETWORK_CONFIG } from "../config/constants.js";
import { getSceneObjects } from "../core/scene.js";
import { getUserId, getUserName, setupUserName, getUserColor } from "./userManagement.js";

// ----------------------------------------------------------------------------
// Collaborative Cursor System
// ----------------------------------------------------------------------------

// Store active cursors
const activeCursors = new Map();
let isLocalMouseMove = false;
let lastMousePosition = { x: 0, y: 0, timestamp: 0 };
let mouseMoveTimeout = null;


// ----------------------------------------------------------------------------
// Cursor Visual Elements
// ----------------------------------------------------------------------------

function createCursorElement(userId, color, displayName) {
  try {
    const cursor = document.createElement("div");
    cursor.id = `cursor-${userId}`;
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

    // Add user label
    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute;
      top: 25px;
      left: 50%;
      transform: translateX(-50%);
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
    label.textContent = displayName || userId.replace("user_", "User ");

    cursor.appendChild(label);

    // Verify document.body exists before appending
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

function trackMouse() {
  document.addEventListener("mousemove", (event) => {
    if (isLocalMouseMove) return;

    const now = Date.now();
    lastMousePosition = {
      x: event.clientX,
      y: event.clientY,
      timestamp: now,
    };

    // Throttle updates to prevent overwhelming the network
    if (mouseMoveTimeout) {
      clearTimeout(mouseMoveTimeout);
    }

    mouseMoveTimeout = setTimeout(() => {
      updateMyCursor();
    }, NETWORK_CONFIG.CURSOR_UPDATE_THROTTLE);
  });

  // Handle mouse leave
  document.addEventListener("mouseleave", () => {
    hideMyCursor();
  });

  // Handle window focus/blur
  window.addEventListener("blur", () => {
    hideMyCursor();
  });

  window.addEventListener("focus", () => {
    if (lastMousePosition.timestamp > 0) {
      updateMyCursor();
    }
  });
}

export function updateMyCursor() {
  if (!lastMousePosition || lastMousePosition.timestamp === 0) return;

  yCursors.set(getUserId(), {
    x: lastMousePosition.x,
    y: lastMousePosition.y,
    timestamp: lastMousePosition.timestamp,
    color: getUserColor(getUserId()),
    active: true,
  });
}

export function hideMyCursor() {
  yCursors.set(getUserId(), {
    x: 0,
    y: 0,
    timestamp: Date.now(),
    color: getUserColor(getUserId()),
    active: false,
  });
}

function updateRemoteCursor(userId, data) {
  let cursorData = activeCursors.get(userId);
  let cursorElement = cursorData ? cursorData.element : null;

  // Get display name for this user
  const displayName =
    yUserNames.get(userId) || userId.replace("user_", "User ");

  if (!cursorElement || !cursorElement.parentNode) {
    // Create new cursor element
    cursorElement = createCursorElement(userId, data.color, displayName);
    if (!cursorElement) {
      logError(`Failed to create cursor element for ${userId}`);
      return;
    }

    activeCursors.set(userId, {
      element: cursorElement,
      lastUpdate: data.timestamp,
      displayName: displayName,
    });
  }

  // Update display name if it changed
  const currentData = activeCursors.get(userId);
  if (currentData && currentData.displayName !== displayName) {
    const label = cursorElement.querySelector("div");
    if (label) {
      label.textContent = displayName;
    }
    currentData.displayName = displayName;
  }

  // Safely update position
  try {
    if (cursorElement && cursorElement.style) {
      cursorElement.style.left = data.x + "px";
      cursorElement.style.top = data.y + "px";
      cursorElement.style.display = "block";

      // Update last seen timestamp
      const cursorInfo = activeCursors.get(userId);
      if (cursorInfo) {
        cursorInfo.lastUpdate = data.timestamp;
      }

      // Add activity indicator
      cursorElement.style.transform = "translate(-50%, -50%) scale(1.2)";
      setTimeout(() => {
        if (cursorElement && cursorElement.parentNode && cursorElement.style) {
          cursorElement.style.transform = "translate(-50%, -50%) scale(1)";
        }
      }, 150);
    }
  } catch (error) {
    logError(`Error updating cursor for ${userId}: ${error.message}`);
    // Clean up potentially corrupted cursor
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

// Setup cursor synchronization observer
function setupCursorSync() {
  yCursors.observe((event) => {
    try {
      event.changes.keys.forEach((change, key) => {
        if (key === getUserId()) return; // Skip own cursor

        try {
          const cursorData = yCursors.get(key);
          if (!cursorData) {
            // Cursor removed
            removeCursor(key);
            return;
          }

          if (!cursorData.active) {
            // Hide cursor
            hideCursor(key);
            return;
          }

          // Validate cursor data
          if (
            typeof cursorData.x !== "number" ||
            typeof cursorData.y !== "number"
          ) {
            logWarning(`Invalid cursor data for ${key}:`, cursorData);
            return;
          }

          // Update or create cursor
          updateRemoteCursor(key, cursorData);
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
}

// ----------------------------------------------------------------------------
// Cursor Cleanup
// ----------------------------------------------------------------------------

// Cleanup stale cursors
function startCursorCleanup() {
  // Clean up stale cursors per threshold
  setInterval(() => {
    const now = Date.now();
    const STALE_THRESHOLD = NETWORK_CONFIG.STALE_CURSOR_THRESHOLD; // 30 seconds

    activeCursors.forEach((cursor, userId) => {
      if (now - cursor.lastUpdate > STALE_THRESHOLD) {
        logProgress(`Removing stale cursor for ${userId}`);
        removeCursor(userId);
      }
    });

    // Also clean up from Yjs
    const allCursors = yCursors.toJSON();
    Object.keys(allCursors).forEach((userId) => {
      const cursorData = allCursors[userId];
      if (now - cursorData.timestamp > STALE_THRESHOLD) {
        yCursors.delete(userId);
        // Also remove from user names
        yUserNames.delete(userId);
      }
    });
  }, NETWORK_CONFIG.STALE_CURSOR_THRESHOLD);
}

export function initializeCursorSystem() {
  try {
    logInfo(`Initializing collaborative cursors for user: ${getUserId()}`);

    // Verify required dependencies
    if (!ydoc || !yCursors) {
      logError("Yjs not properly initialized - cursor system cannot start");
      return false;
    }

    if (!document.body) {
      logError("Document not ready - deferring cursor system initialization");
      // Try again after DOM is ready
      document.addEventListener("DOMContentLoaded", () => {
        initializeCursorSystem();
      });
      return false;
    }

    // Set up user name first
    setupUserName();

    // Set up mouse tracking
    trackMouse();

    // Set up syncing and cleanup
    setupCursorSync();
    startCursorCleanup();

    // Send initial cursor position after a short delay
    setTimeout(() => {
      if (lastMousePosition.timestamp > 0) {
        updateMyCursor();
      }
    }, 2000); // Increased delay to allow name setup

    logSuccess("Collaborative cursor system initialized");
    logProgress(`Your cursor color: ${getUserColor(getUserId())}`);
    logProgress(`Your display name: ${getUserName() || "Default"}`);
    logProgress("Move your mouse to see your cursor appear for other users");

    return true;
  } catch (error) {
    logError(`Failed to initialize cursor system: ${error.message}`);
    return false;
  }
}

export function getActiveCursors() {
  return activeCursors;
}

// ----------------------------------------------------------------------------
// Cleanup on page unload
// ----------------------------------------------------------------------------

window.addEventListener("beforeunload", () => {
  hideMyCursor();
});
