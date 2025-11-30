// src/core/vr/VRIsolationMode.js
// Manages room-scale isolation mode for deep VR analysis
//
// STUB: Structure only, implementation deferred per DEC-014
//
// Isolation Mode:
// - Pull single view to room-scale
// - User can physically walk around the 3D model
// - Other VR users appear as avatars in the same space
// - Desktop users' cursors visible as floating rays/dots

import { vr as log } from "@Utils/logger.js";

/**
 * VRIsolationMode - Room-scale single view mode
 *
 * When user "grabs" a view in grid mode, it scales up to room size.
 * The user can then physically walk around the 3D model.
 *
 * Features:
 * - Scale up view to comfortable room-scale size
 * - Position model at center of play space
 * - Show other users as avatars
 * - Project desktop cursors into 3D space
 * - Provide "return to grid" gesture/button
 */
export class VRIsolationMode {
  constructor(options = {}) {
    // Configuration
    this._defaultScale = options.defaultScale || 2.0; // Room-scale multiplier
    this._minScale = options.minScale || 0.5;
    this._maxScale = options.maxScale || 10.0;
    this._modelHeight = options.modelHeight || 1.2; // meters above floor

    // State
    this._isolatedViewId = null;
    this._isolatedViewConfig = null;
    this._currentScale = this._defaultScale;
    this._modelPosition = { x: 0, y: this._modelHeight, z: -1.5 };
    this._modelRotation = { x: 0, y: 0, z: 0, w: 1 };

    // Transition state
    this._isTransitioning = false;
    this._transitionProgress = 0;

    // Event listeners
    this._listeners = {
      scaleChanged: [],
      positionChanged: [],
      transitionStart: [],
      transitionEnd: [],
    };
  }

  // ===========================================================================
  // ISOLATION LIFECYCLE
  // ===========================================================================

  /**
   * Isolate a view - scale it up to room size
   *
   * @param {ViewConfiguration} viewConfig - The view to isolate
   * @param {Object} options - Isolation options
   */
  isolateView(viewConfig, options = {}) {
    log.debug(
      `VRIsolationMode.isolateView(${viewConfig.id}) - STUB: Not fully implemented`
    );

    // TODO: Full implementation
    // 1. Store current grid state for return
    // 2. Animate view scaling up
    // 3. Fade out other views
    // 4. Center model in play space
    // 5. Enable room-scale tracking
    // 6. Set up hand/controller interactions

    this._isolatedViewId = viewConfig.id;
    this._isolatedViewConfig = viewConfig;
    this._currentScale = options.scale || this._defaultScale;

    // Calculate initial position (in front of user, at comfortable height)
    this._modelPosition = {
      x: options.x || 0,
      y: options.y || this._modelHeight,
      z: options.z || -1.5, // 1.5m in front
    };

    this._emit("transitionStart", {
      viewId: viewConfig.id,
      type: "enter",
    });

    // Simulate transition
    this._isTransitioning = true;
    setTimeout(() => {
      this._isTransitioning = false;
      this._emit("transitionEnd", {
        viewId: viewConfig.id,
        type: "enter",
      });
    }, 500);

    log.debug(`Isolated view: ${viewConfig.id} at scale ${this._currentScale}`);
  }

  /**
   * Return to grid view
   */
  returnToGrid() {
    log.debug("VRIsolationMode.returnToGrid() - STUB: Not fully implemented");

    if (!this._isolatedViewId) {
      log.warn("Not in isolation mode");
      return;
    }

    // TODO: Full implementation
    // 1. Animate view scaling down
    // 2. Fade in grid views
    // 3. Return to grid tracking mode

    const viewId = this._isolatedViewId;

    this._emit("transitionStart", {
      viewId,
      type: "exit",
    });

    // Simulate transition
    this._isTransitioning = true;
    setTimeout(() => {
      this._isolatedViewId = null;
      this._isolatedViewConfig = null;
      this._isTransitioning = false;

      this._emit("transitionEnd", {
        viewId,
        type: "exit",
      });
    }, 500);

    log.debug("Returning to grid view");
  }

  // ===========================================================================
  // SCALE & POSITION MANIPULATION
  // ===========================================================================

  /**
   * Set model scale
   * @param {number} scale - New scale multiplier
   */
  setScale(scale) {
    const clampedScale = Math.max(
      this._minScale,
      Math.min(this._maxScale, scale)
    );
    this._currentScale = clampedScale;
    this._emit("scaleChanged", { scale: clampedScale });
  }

  /**
   * Adjust scale relative to current
   * @param {number} delta - Scale change (positive = bigger)
   */
  adjustScale(delta) {
    this.setScale(this._currentScale + delta);
  }

  /**
   * Reset to default scale
   */
  resetScale() {
    this.setScale(this._defaultScale);
  }

  /**
   * Set model position
   * @param {Object} position - { x, y, z }
   */
  setPosition(position) {
    this._modelPosition = { ...this._modelPosition, ...position };
    this._emit("positionChanged", { position: this._modelPosition });
  }

  /**
   * Set model rotation
   * @param {Object} rotation - { x, y, z, w } quaternion
   */
  setRotation(rotation) {
    this._modelRotation = { ...this._modelRotation, ...rotation };
  }

  /**
   * Reset model to default position
   */
  resetPosition() {
    this._modelPosition = { x: 0, y: this._modelHeight, z: -1.5 };
    this._modelRotation = { x: 0, y: 0, z: 0, w: 1 };
    this._emit("positionChanged", { position: this._modelPosition });
  }

  // ===========================================================================
  // CURSOR PROJECTION
  // ===========================================================================

  /**
   * Project a desktop user's 2D cursor to 3D position in isolated view
   *
   * @param {string} userId - The desktop user's ID
   * @param {Object} screenPos - { x, y } normalized screen position (0-1)
   * @param {Object} viewBounds - View bounds in screen space
   * @returns {Object} - { x, y, z } world position for the cursor dot
   */
  projectDesktopCursor(userId, screenPos, viewBounds) {
    log.trace(
      "VRIsolationMode.projectDesktopCursor() - STUB: Not fully implemented"
    );

    // TODO: Full implementation
    // 1. Map screen position to view-local position
    // 2. Cast ray through the 3D model
    // 3. Return intersection point or projected point on view plane

    // Placeholder: project to a plane in front of model
    const x = (screenPos.x - 0.5) * 2 * this._currentScale;
    const y =
      this._modelPosition.y + (0.5 - screenPos.y) * 2 * this._currentScale;
    const z = this._modelPosition.z + 0.5; // Slightly in front

    return { x, y, z, userId };
  }

  /**
   * Get 3D position for a VR user's controller intersection with the model
   *
   * @param {Object} ray - { origin: Vector3, direction: Vector3 }
   * @returns {Object|null} - Intersection point or null
   */
  getControllerIntersection(ray) {
    log.trace(
      "VRIsolationMode.getControllerIntersection() - STUB: Not fully implemented"
    );

    // TODO: Full implementation
    // 1. Cast ray against model geometry
    // 2. Return intersection point with normal

    // Placeholder: simple plane intersection
    const t =
      (this._modelPosition.z - ray.origin.z) / (ray.direction.z || 0.001);
    if (t > 0) {
      return {
        x: ray.origin.x + ray.direction.x * t,
        y: ray.origin.y + ray.direction.y * t,
        z: this._modelPosition.z,
        normal: { x: 0, y: 0, z: 1 },
      };
    }

    return null;
  }

  // ===========================================================================
  // STATE GETTERS
  // ===========================================================================

  /**
   * Get current isolation state
   */
  getState() {
    return {
      isIsolated: this._isolatedViewId !== null,
      viewId: this._isolatedViewId,
      scale: this._currentScale,
      position: { ...this._modelPosition },
      rotation: { ...this._modelRotation },
      isTransitioning: this._isTransitioning,
    };
  }

  /**
   * Check if currently isolating a view
   */
  isIsolated() {
    return this._isolatedViewId !== null;
  }

  /**
   * Get isolated view ID
   */
  getIsolatedViewId() {
    return this._isolatedViewId;
  }

  /**
   * Get current scale
   */
  getScale() {
    return this._currentScale;
  }

  /**
   * Get model transform for rendering
   */
  getModelTransform() {
    return {
      position: { ...this._modelPosition },
      rotation: { ...this._modelRotation },
      scale: {
        x: this._currentScale,
        y: this._currentScale,
        z: this._currentScale,
      },
    };
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
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
      this._listeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          log.error(`VRIsolationMode event error (${event}):`, error);
        }
      });
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  dispose() {
    this._isolatedViewId = null;
    this._isolatedViewConfig = null;
    Object.keys(this._listeners).forEach((event) => {
      this._listeners[event] = [];
    });
  }
}

// Default instance
export const vrIsolationMode = new VRIsolationMode();
