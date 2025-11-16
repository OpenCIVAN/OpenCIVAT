// ----------------------------------------------------------------------------
// VTK Instance Cursor Rendering
//
// Subscribes to generic cursor updates and renders them within VTK containers.
// Each instance has its own set of cursor elements.
// ----------------------------------------------------------------------------

import {
  onCursorUpdate,
  onCursorRemove,
} from "@Collaboration/presence/cursors.js";

class VTKInstanceCursors {
  constructor() {
    // Map of instanceId → Map of userId → cursor DOM element
    this.cursorElements = new Map();

    // Cleanup functions for global listeners
    this.cleanupFunctions = [];
  }

  /**
   * Setup cursor rendering for a specific VTK instance
   *
   * @param {string} instanceId - Instance ID
   * @param {HTMLElement} container - VTK container element
   */
  setupInstanceCursors(instanceId, container) {
    console.log(`🖱️ Setting up cursors for instance: ${instanceId}`);

    // Create cursor map for this instance
    if (!this.cursorElements.has(instanceId)) {
      this.cursorElements.set(instanceId, new Map());
    }

    // Subscribe to cursor updates
    const cleanupUpdate = onCursorUpdate(({ userId, cursorData }) => {
      this.renderCursor(instanceId, container, userId, cursorData);
    });

    const cleanupRemove = onCursorRemove(({ userId }) => {
      this.removeCursor(instanceId, userId);
    });

    // Store cleanup functions
    this.cleanupFunctions.push(cleanupUpdate, cleanupRemove);

    // Track mouse leaving the container
    container.addEventListener("mouseleave", () => {
      // Could hide cursors or do nothing
    });
  }

  /**
   * Render or update a cursor in the instance
   */
  renderCursor(instanceId, container, userId, cursorData) {
    const cursors = this.cursorElements.get(instanceId);
    if (!cursors) return;

    // NEW: Only show cursor if it's in THIS instance
    if (cursorData.instanceId !== instanceId) {
      // Cursor is in a different instance, hide it
      this.removeCursor(instanceId, userId);
      return;
    }

    // Get or create cursor element
    let cursorEl = cursors.get(userId);
    if (!cursorEl) {
      cursorEl = this.createCursorElement(userId, cursorData);
      cursors.set(userId, cursorEl);
      container.appendChild(cursorEl);
    }

    // Update position (convert from global page coords to container-relative coords)
    const rect = container.getBoundingClientRect();
    const x = cursorData.x - rect.left;
    const y = cursorData.y - rect.top;

    // Only show if cursor is within container bounds
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      cursorEl.style.left = `${x}px`;
      cursorEl.style.top = `${y}px`;
      cursorEl.style.display = "block";
    } else {
      cursorEl.style.display = "none";
    }
  }

  /**
   * Remove cursor from instance
   */
  removeCursor(instanceId, userId) {
    const cursors = this.cursorElements.get(instanceId);
    if (!cursors) return;

    const cursorEl = cursors.get(userId);
    if (cursorEl) {
      cursorEl.remove();
      cursors.delete(userId);
    }
  }

  /**
   * Create cursor DOM element
   */
  createCursorElement(userId, cursorData) {
    const cursor = document.createElement("div");
    cursor.className = "remote-cursor";
    cursor.style.cssText = `
      position: absolute;
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

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M3 3 L3 17 L9 13 L12 20 L14 19 L11 12 L18 12 Z");
    path.setAttribute("fill", cursorData.color);
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "1");

    svg.appendChild(path);
    cursor.appendChild(svg);

    // Add name label
    const label = document.createElement("div");
    label.style.cssText = `
      position: absolute;
      top: 24px;
      left: 0px;
      background: ${cursorData.color};
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
    label.textContent = cursorData.name || "Unknown";

    cursor.appendChild(label);

    return cursor;
  }

  /**
   * Cleanup cursors for an instance
   */
  cleanupInstance(instanceId) {
    const cursors = this.cursorElements.get(instanceId);
    if (cursors) {
      cursors.forEach((cursorEl) => cursorEl.remove());
      this.cursorElements.delete(instanceId);
    }
  }

  /**
   * Cleanup all cursors
   */
  destroy() {
    this.cursorElements.forEach((cursors) => {
      cursors.forEach((cursorEl) => cursorEl.remove());
    });
    this.cursorElements.clear();

    // Call cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}

// Export singleton instance
export const vtkInstanceCursors = new VTKInstanceCursors();
