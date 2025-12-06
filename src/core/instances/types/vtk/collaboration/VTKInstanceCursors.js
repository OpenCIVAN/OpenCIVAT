// ----------------------------------------------------------------------------
// VTK Instance Cursor Rendering
//
// Renders collaborative cursors within VTK 3D scenes.
// Supports both 3D actor rendering (when world coordinates available) and
// DOM overlay fallback (for screen-only coordinates).
//
// ARCHITECTURE:
// - For cursors with world coordinates: Render as VTK sphere/cone actors
// - For cursors with screen-only coordinates: Render as DOM overlays
// - Actor pooling to reduce allocation overhead
// - Name labels positioned via world-to-screen projection
// ----------------------------------------------------------------------------

import {
  onCursorUpdate,
  onCursorRemove,
  hasWorldPosition,
} from "@Collaboration/presence/cursors.js";
import { worldToScreen } from "@VTK/utils/vtkRaycaster.js";
import { cursor as log } from "@Utils/logger.js";

// VTK imports for 3D cursor actors
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkConeSource from "@kitware/vtk.js/Filters/Sources/ConeSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

// Constants
const CURSOR_SPHERE_RADIUS = 0.02; // Relative to scene scale
const CURSOR_CONE_HEIGHT = 0.04;
const CURSOR_CONE_RADIUS = 0.015;
const ACTOR_POOL_SIZE = 10; // Pre-allocate this many cursor actors
const LABEL_OFFSET_Y = 25; // Pixels below cursor for label

/**
 * Parse hex color to RGB array [0-1]
 * @param {string} hexColor - Color in hex format (#RRGGBB)
 * @returns {[number, number, number]}
 */
function hexToRgb(hexColor) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * VTKInstanceCursors - Manages collaborative cursor rendering in VTK scenes
 */
class VTKInstanceCursors {
  constructor() {
    // Map of instanceId → instance cursor state
    this.instanceStates = new Map();

    // Cleanup functions for global listeners
    this.cleanupFunctions = [];
  }

  /**
   * Setup cursor rendering for a specific VTK instance
   *
   * @param {string} instanceId - Instance ID (local to this browser)
   * @param {HTMLElement} container - VTK container element
   * @param {Object} sceneObjects - VTK scene objects (renderer, renderWindow, etc.)
   * @param {string} viewConfigId - ViewConfig ID (shared across collaborators)
   */
  setupInstanceCursors(
    instanceId,
    container,
    sceneObjects = null,
    viewConfigId = null
  ) {
    log.debug(
      `Setting up cursors for instance: ${instanceId}, viewConfig: ${viewConfigId}`
    );

    // Initialize state for this instance
    const state = {
      container,
      sceneObjects,
      viewConfigId, // For collaborative cursor matching
      // 3D actor cursors: userId → { actor, source, mapper, type: 'sphere'|'cone' }
      actorCursors: new Map(),
      // DOM overlay cursors (fallback): userId → DOM element
      domCursors: new Map(),
      // Actor pool for reuse
      actorPool: [],
      // Label elements: userId → DOM element
      labels: new Map(),
      // Track which render mode each user is using
      renderModes: new Map(), // userId → 'actor' | 'dom'
    };

    this.instanceStates.set(instanceId, state);

    // Pre-populate actor pool
    if (sceneObjects) {
      this._initializeActorPool(state);
    }

    // Subscribe to cursor updates
    const cleanupUpdate = onCursorUpdate(({ userId, cursorData }) => {
      this.renderCursor(instanceId, userId, cursorData);
    });

    const cleanupRemove = onCursorRemove(({ userId }) => {
      this.removeCursor(instanceId, userId);
    });

    // Store cleanup functions
    this.cleanupFunctions.push(cleanupUpdate, cleanupRemove);
  }

  /**
   * Update scene objects reference (called after VTK pipeline is initialized)
   */
  setSceneObjects(instanceId, sceneObjects, viewConfigId = null) {
    const state = this.instanceStates.get(instanceId);
    if (state) {
      state.sceneObjects = sceneObjects;
      // Update viewConfigId if provided (may not have been available during setup)
      if (viewConfigId !== null) {
        state.viewConfigId = viewConfigId;
      }
      // Initialize actor pool now that we have scene objects
      this._initializeActorPool(state);
    }
  }

  /**
   * Initialize the actor pool with pre-created cursor actors
   */
  _initializeActorPool(state) {
    if (!state.sceneObjects?.renderer) return;

    for (let i = 0; i < ACTOR_POOL_SIZE; i++) {
      const cursorActor = this._createCursorActor();
      cursorActor.actor.setVisibility(false);
      state.actorPool.push(cursorActor);
    }

    log.debug(`Initialized actor pool with ${ACTOR_POOL_SIZE} cursors`);
  }

  /**
   * Create a cursor actor (sphere with optional cone for direction)
   */
  _createCursorActor() {
    // Create sphere source for cursor point
    const sphereSource = vtkSphereSource.newInstance();
    sphereSource.setRadius(CURSOR_SPHERE_RADIUS);
    sphereSource.setThetaResolution(16);
    sphereSource.setPhiResolution(16);

    // Create cone source for direction indicator (optional)
    const coneSource = vtkConeSource.newInstance();
    coneSource.setHeight(CURSOR_CONE_HEIGHT);
    coneSource.setRadius(CURSOR_CONE_RADIUS);
    coneSource.setResolution(12);
    coneSource.setDirection(0, 0, 1); // Default pointing up

    // Create mapper for sphere
    const sphereMapper = vtkMapper.newInstance();
    sphereMapper.setInputConnection(sphereSource.getOutputPort());

    // Create actor for sphere
    const sphereActor = vtkActor.newInstance();
    sphereActor.setMapper(sphereMapper);
    sphereActor.getProperty().setAmbient(0.5);
    sphereActor.getProperty().setDiffuse(0.5);
    sphereActor.setPickable(false); // Don't interfere with scene picking

    // Create mapper for cone
    const coneMapper = vtkMapper.newInstance();
    coneMapper.setInputConnection(coneSource.getOutputPort());

    // Create actor for cone
    const coneActor = vtkActor.newInstance();
    coneActor.setMapper(coneMapper);
    coneActor.getProperty().setAmbient(0.5);
    coneActor.getProperty().setDiffuse(0.5);
    coneActor.setPickable(false);
    coneActor.setVisibility(false); // Hidden by default, shown when we have normal

    return {
      sphereSource,
      sphereMapper,
      actor: sphereActor,
      coneSource,
      coneMapper,
      coneActor,
      inUse: false,
      userId: null,
    };
  }

  /**
   * Get an actor from the pool or create a new one
   */
  _acquireActor(state, userId) {
    // First check if user already has an actor
    if (state.actorCursors.has(userId)) {
      return state.actorCursors.get(userId);
    }

    // Try to get from pool
    let cursorActor = state.actorPool.find((a) => !a.inUse);

    if (!cursorActor) {
      // Pool exhausted, create new actor
      log.debug(`Actor pool exhausted, creating new cursor actor`);
      cursorActor = this._createCursorActor();
    }

    // Mark as in use
    cursorActor.inUse = true;
    cursorActor.userId = userId;

    // Add to renderer if we have scene objects
    if (state.sceneObjects?.renderer) {
      state.sceneObjects.renderer.addActor(cursorActor.actor);
      state.sceneObjects.renderer.addActor(cursorActor.coneActor);
    }

    // Store reference
    state.actorCursors.set(userId, cursorActor);

    return cursorActor;
  }

  /**
   * Release an actor back to the pool
   */
  _releaseActor(state, userId) {
    const cursorActor = state.actorCursors.get(userId);
    if (!cursorActor) return;

    // Hide the actor
    cursorActor.actor.setVisibility(false);
    cursorActor.coneActor.setVisibility(false);

    // Remove from renderer
    if (state.sceneObjects?.renderer) {
      state.sceneObjects.renderer.removeActor(cursorActor.actor);
      state.sceneObjects.renderer.removeActor(cursorActor.coneActor);
    }

    // Mark as available
    cursorActor.inUse = false;
    cursorActor.userId = null;

    // Remove from active cursors
    state.actorCursors.delete(userId);

    // Return to pool if it came from there
    if (!state.actorPool.includes(cursorActor)) {
      state.actorPool.push(cursorActor);
    }
  }

  /**
   * Render or update a cursor
   */
  renderCursor(instanceId, userId, cursorData) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Match on viewConfigId (shared across collaborators) if available
    // Fall back to instanceId matching for backward compatibility
    const shouldShow = state.viewConfigId
      ? cursorData.viewConfigId === state.viewConfigId
      : cursorData.instanceId === instanceId;

    if (!shouldShow) {
      this.removeCursor(instanceId, userId);
      return;
    }

    // Determine render mode based on available coordinates
    const hasWorld = hasWorldPosition(cursorData);
    const hasSceneObjects = !!state.sceneObjects?.renderer;

    if (hasWorld && hasSceneObjects) {
      // Render as 3D actor
      this._renderActorCursor(state, userId, cursorData);
      // Remove any existing DOM cursor
      this._removeDomCursor(state, userId);
      state.renderModes.set(userId, "actor");
    } else {
      // Fallback to DOM overlay
      this._renderDomCursor(state, userId, cursorData);
      // Remove any existing actor cursor
      this._releaseActor(state, userId);
      state.renderModes.set(userId, "dom");
    }
  }

  /**
   * Render cursor as 3D VTK actor
   */
  _renderActorCursor(state, userId, cursorData) {
    const cursorActor = this._acquireActor(state, userId);
    const { world, normal, color } = cursorData;

    // Calculate cursor size based on scene scale
    const bounds = state.sceneObjects.renderer.computeVisiblePropBounds();
    const sceneSize = Math.max(
      bounds[1] - bounds[0],
      bounds[3] - bounds[2],
      bounds[5] - bounds[4]
    );
    const cursorSize = sceneSize * CURSOR_SPHERE_RADIUS;

    // Update sphere position and size
    cursorActor.sphereSource.setRadius(cursorSize);
    cursorActor.sphereSource.setCenter(world.x, world.y, world.z);

    // Set color from user
    const rgb = hexToRgb(color || "#60a5fa");
    cursorActor.actor.getProperty().setColor(...rgb);
    cursorActor.actor.setVisibility(true);

    // Update cone if we have normal data
    if (normal && (normal.x !== 0 || normal.y !== 0 || normal.z !== 0)) {
      const coneSize = sceneSize * CURSOR_CONE_HEIGHT;
      cursorActor.coneSource.setHeight(coneSize);
      cursorActor.coneSource.setRadius(coneSize * 0.4);

      // Position cone slightly above surface along normal
      const offset = cursorSize * 1.5;
      cursorActor.coneSource.setCenter(
        world.x + normal.x * offset,
        world.y + normal.y * offset,
        world.z + normal.z * offset
      );

      // Orient cone along normal (pointing into surface)
      cursorActor.coneSource.setDirection(-normal.x, -normal.y, -normal.z);

      cursorActor.coneActor.getProperty().setColor(...rgb);
      cursorActor.coneActor.getProperty().setOpacity(0.7);
      cursorActor.coneActor.setVisibility(true);
    } else {
      cursorActor.coneActor.setVisibility(false);
    }

    // Update or create label
    this._updateLabel(state, userId, cursorData, world);

    // Trigger render
    if (state.sceneObjects?.renderWindow) {
      state.sceneObjects.renderWindow.render();
    }
  }

  /**
   * Render cursor as DOM overlay (fallback for screen-only coordinates)
   */
  _renderDomCursor(state, userId, cursorData) {
    let cursorEl = state.domCursors.get(userId);

    if (!cursorEl) {
      cursorEl = this._createDomCursorElement(cursorData);
      state.domCursors.set(userId, cursorEl);
      state.container.appendChild(cursorEl);
    }

    // Get screen coordinates (use legacy x/y or screen object)
    const screenX = cursorData.screen?.x ?? cursorData.x;
    const screenY = cursorData.screen?.y ?? cursorData.y;

    // Convert from global page coords to container-relative coords
    const rect = state.container.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

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
   * Update or create label for a cursor
   */
  _updateLabel(state, userId, cursorData, worldPos) {
    let labelEl = state.labels.get(userId);

    if (!labelEl) {
      labelEl = this._createLabelElement(cursorData);
      state.labels.set(userId, labelEl);
      state.container.appendChild(labelEl);
    }

    // Project world position to screen
    const screenPos = worldToScreen(
      state.sceneObjects,
      [worldPos.x, worldPos.y, worldPos.z],
      state.container
    );

    if (screenPos && screenPos.visible) {
      const rect = state.container.getBoundingClientRect();
      const x = screenPos.screenX - rect.left;
      const y = screenPos.screenY - rect.top + LABEL_OFFSET_Y;

      labelEl.style.left = `${x}px`;
      labelEl.style.top = `${y}px`;
      labelEl.style.display = "block";
    } else {
      labelEl.style.display = "none";
    }
  }

  /**
   * Create label DOM element
   */
  _createLabelElement(cursorData) {
    const label = document.createElement("div");
    label.className = "vtk-cursor-label";
    label.style.cssText = `
      position: absolute;
      background: ${cursorData.color || "#60a5fa"};
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
      pointer-events: none;
      z-index: 10000;
      transform: translateX(-50%);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    label.textContent = cursorData.name || "Unknown";
    return label;
  }

  /**
   * Create DOM cursor element (for fallback rendering)
   */
  _createDomCursorElement(cursorData) {
    const cursor = document.createElement("div");
    cursor.className = "remote-cursor";
    cursor.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 10000;
      transform: translate(-4px, -4px);
      transition: left 0.05s ease, top 0.05s ease;
    `;

    // Create arrow SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.style.cssText = "filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M3 3 L3 17 L9 13 L12 20 L14 19 L11 12 L18 12 Z");
    path.setAttribute("fill", cursorData.color || "#60a5fa");
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
      background: ${cursorData.color || "#60a5fa"};
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
   * Remove a DOM cursor
   */
  _removeDomCursor(state, userId) {
    const cursorEl = state.domCursors.get(userId);
    if (cursorEl) {
      cursorEl.remove();
      state.domCursors.delete(userId);
    }
  }

  /**
   * Remove a label
   */
  _removeLabel(state, userId) {
    const labelEl = state.labels.get(userId);
    if (labelEl) {
      labelEl.remove();
      state.labels.delete(userId);
    }
  }

  /**
   * Remove cursor from instance (both actor and DOM)
   */
  removeCursor(instanceId, userId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Remove actor cursor
    this._releaseActor(state, userId);

    // Remove DOM cursor
    this._removeDomCursor(state, userId);

    // Remove label
    this._removeLabel(state, userId);

    // Clear render mode
    state.renderModes.delete(userId);

    // Trigger render to show removal
    if (state.sceneObjects?.renderWindow) {
      state.sceneObjects.renderWindow.render();
    }
  }

  /**
   * Cleanup cursors for an instance
   */
  cleanupInstance(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Remove all actor cursors from renderer
    state.actorCursors.forEach((cursorActor, userId) => {
      if (state.sceneObjects?.renderer) {
        state.sceneObjects.renderer.removeActor(cursorActor.actor);
        state.sceneObjects.renderer.removeActor(cursorActor.coneActor);
      }
    });
    state.actorCursors.clear();

    // Cleanup actor pool
    state.actorPool.forEach((cursorActor) => {
      cursorActor.actor.delete();
      cursorActor.coneActor.delete();
      cursorActor.sphereMapper.delete();
      cursorActor.coneMapper.delete();
      cursorActor.sphereSource.delete();
      cursorActor.coneSource.delete();
    });
    state.actorPool = [];

    // Remove all DOM cursors
    state.domCursors.forEach((cursorEl) => cursorEl.remove());
    state.domCursors.clear();

    // Remove all labels
    state.labels.forEach((labelEl) => labelEl.remove());
    state.labels.clear();

    // Clear render modes
    state.renderModes.clear();

    // Remove state
    this.instanceStates.delete(instanceId);

    log.debug(`Cleaned up cursors for instance: ${instanceId}`);
  }

  /**
   * Cleanup all cursors
   */
  destroy() {
    // Cleanup all instances
    this.instanceStates.forEach((state, instanceId) => {
      this.cleanupInstance(instanceId);
    });

    // Call cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}

// Export singleton instance
export const vtkInstanceCursors = new VTKInstanceCursors();
