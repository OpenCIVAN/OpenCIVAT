// src/core/vr/navigation/VRTeleportMode.js
// Teleportation navigation mode for VR exploration

import { vr as log } from "@Utils/logger.js";

export class VRTeleportMode {
  /**
   * @param {Object} vrContext
   * @param {Object} [options]
   * @param {Function} [options.raycastToScene] - (originXR, directionXR) =>
   *   {position, valid} | null. Injected by VRNavigationController so a
   *   teleport target can land on the actual dataset surface, not just an
   *   infinite physical floor plane. See VRNavigationController._raycastToScene.
   */
  constructor(vrContext, options = {}) {
    this._vrContext = vrContext;
    this._options = {
      maxDistance: 50.0, // Maximum teleport distance in meters
      arcSegments: 30, // Number of segments in teleport arc
      arcHeight: 2.0, // Arc height for parabolic trajectory
      raycastToScene: null,
      ...options,
    };

    // Teleport state
    this._isActive = false;
    this._isAiming = false;
    this._targetPosition = null;
    this._targetValid = false;
    this._arcPoints = [];
  }

  activate() {
    this._isActive = true;
    this._resetState();
    log.debug("VRTeleportMode activated");
  }

  deactivate() {
    this._isActive = false;
    this._resetState();
    log.debug("VRTeleportMode deactivated");
  }

  _resetState() {
    this._isAiming = false;
    this._targetPosition = null;
    this._targetValid = false;
    this._arcPoints = [];
  }

  /**
   * Update teleport based on input.
   *
   * Two aim/commit gestures depending on the input source: thumbstick
   * push/release for tracked controllers, or pinch-hold/release for
   * Vision Pro's gripless "transient-pointer" source (no thumbstick — see
   * docs/apple-vision-pro.md).
   *
   * @param {Object} inputState - Controller input state
   * @param {XRFrame} frame - XR frame
   * @param {number} deltaTime - Time since last frame
   * @returns {Object} { position, orientation, teleporting, arcPoints }
   */
  update(inputState, frame, deltaTime) {
    if (!this._isActive) {
      return { position: null, orientation: null, teleporting: false };
    }

    const rightController = inputState.controllers?.right;
    if (!rightController) {
      return { position: null, orientation: null, teleporting: false };
    }

    const wasAiming = this._isAiming;
    const isGripless = rightController.targetRayMode === "transient-pointer";
    let shouldRelease = false;

    if (isGripless) {
      if (rightController.triggerPressed) {
        if (!this._isAiming) this._startAiming(rightController);
        this._updateAim(rightController, inputState);
      }
      shouldRelease = wasAiming && !rightController.triggerPressed;
    } else {
      const thumbstickY = rightController.thumbstick?.y || 0;

      // Start aiming when thumbstick pushed forward
      if (thumbstickY < -0.7 && !this._isAiming) {
        this._startAiming(rightController);
      }

      // Update aim while holding
      if (this._isAiming && thumbstickY < -0.3) {
        this._updateAim(rightController, inputState);
      }

      shouldRelease = wasAiming && thumbstickY > -0.3;
    }

    // Release to teleport
    if (shouldRelease) {
      const result = this._executeTeleport(inputState);
      this._resetState();
      return result;
    }

    // Return current state for rendering teleport arc
    return {
      position: null,
      orientation: null,
      teleporting: false,
      isAiming: this._isAiming,
      targetPosition: this._targetPosition,
      targetValid: this._targetValid,
      arcPoints: this._arcPoints,
    };
  }

  /**
   * Start aiming teleport
   * @private
   */
  _startAiming(controller) {
    this._isAiming = true;
    log.debug("Teleport aiming started");
  }

  /**
   * Update teleport aim
   * @private
   */
  _updateAim(controller, inputState) {
    const targetRay = controller.targetRay;
    if (!targetRay) {
      this._targetValid = false;
      return;
    }

    // Get ray origin and direction from controller
    const origin = targetRay.position || { x: 0, y: 0, z: 0 };
    const matrix = targetRay.matrix;

    // Extract forward direction from transform matrix
    // Forward is negative Z in WebXR
    let direction;
    if (matrix) {
      direction = {
        x: -matrix[8],
        y: -matrix[9],
        z: -matrix[10],
      };
    } else {
      // Fallback: point forward from controller
      direction = { x: 0, y: 0, z: -1 };
    }

    // Calculate parabolic arc
    this._arcPoints = this._calculateArc(origin, direction);

    // Find intersection with ground or valid surface
    const intersection = this._findIntersection(this._arcPoints);

    if (intersection) {
      this._targetPosition = intersection.position;
      this._targetValid = intersection.valid;
    } else {
      this._targetPosition = this._arcPoints[this._arcPoints.length - 1];
      this._targetValid = false;
    }
  }

  /**
   * Calculate parabolic arc for teleport visualization
   * @private
   */
  _calculateArc(origin, direction) {
    const points = [];
    const segments = this._options.arcSegments;
    const maxDistance = this._options.maxDistance;
    const gravity = 9.8;

    // Initial velocity
    const speed = 10.0; // m/s
    const velocity = {
      x: direction.x * speed,
      y: direction.y * speed + 2.0, // Add upward component for arc
      z: direction.z * speed,
    };

    let position = { ...origin };
    const timeStep = 0.1;

    for (let i = 0; i < segments; i++) {
      points.push({ ...position });

      // Update position with simple projectile motion
      position.x += velocity.x * timeStep;
      position.y += velocity.y * timeStep - 0.5 * gravity * timeStep * timeStep;
      position.z += velocity.z * timeStep;

      // Update velocity
      velocity.y -= gravity * timeStep;

      // Check if we've gone far enough or hit ground
      const distance = Math.sqrt(
        (position.x - origin.x) ** 2 +
          (position.y - origin.y) ** 2 +
          (position.z - origin.z) ** 2
      );

      if (distance > maxDistance || position.y < -10) break;
    }

    return points;
  }

  /**
   * Find intersection of arc with valid teleport surface: tries the actual
   * dataset first (via the injected raycastToScene, bounded to each arc
   * segment's length), then falls back to the physical floor plane so
   * teleporting off the edge of the dataset still lands somewhere.
   * @private
   */
  _findIntersection(arcPoints) {
    const raycastToScene = this._options.raycastToScene;
    if (raycastToScene) {
      for (let i = 1; i < arcPoints.length; i++) {
        const prev = arcPoints[i - 1];
        const curr = arcPoints[i];
        const seg = {
          x: curr.x - prev.x,
          y: curr.y - prev.y,
          z: curr.z - prev.z,
        };
        const segLength = Math.sqrt(seg.x * seg.x + seg.y * seg.y + seg.z * seg.z);
        if (segLength < 1e-6) continue;

        const direction = {
          x: seg.x / segLength,
          y: seg.y / segLength,
          z: seg.z / segLength,
        };

        let hit;
        try {
          hit = raycastToScene(prev, direction);
        } catch (e) {
          hit = null;
        }

        // Only accept hits within this segment — a farther hit will be (or
        // already was) found more accurately by a later/earlier segment.
        if (hit?.valid && hit.distance <= segLength) {
          return hit;
        }
      }
    }

    // Fall back to the physical floor plane (local-floor space, y=0).
    const groundY = 0;

    for (let i = 1; i < arcPoints.length; i++) {
      const prev = arcPoints[i - 1];
      const curr = arcPoints[i];

      // Check if arc crosses ground plane
      if (prev.y >= groundY && curr.y < groundY) {
        // Interpolate to find exact intersection point
        const t = (groundY - prev.y) / (curr.y - prev.y);
        return {
          position: {
            x: prev.x + t * (curr.x - prev.x),
            y: groundY,
            z: prev.z + t * (curr.z - prev.z),
          },
          valid: true,
        };
      }
    }

    return null;
  }

  /**
   * Execute the teleport.
   *
   * this._targetPosition is in XR (physical) space — but the thing we
   * actually control is vrOrigin (a DATA-space offset, see
   * VTKInstanceHandler._updateCameraFromVRPose's dataPos = xrPos/vrScale +
   * vrOrigin). We don't teleport the user's physical body; we shift the
   * data-space mapping so the physical floor position they're currently
   * standing at (approximated from head x/z at floor height) now
   * corresponds to the target point in data space.
   *
   * @param {Object} [inputState] - current frame's input state, for head position
   * @private
   */
  _executeTeleport(inputState) {
    if (!this._targetValid || !this._targetPosition) {
      log.debug("Teleport cancelled - invalid target");
      return { position: null, orientation: null, teleporting: false };
    }

    log.debug("Executing teleport to:", this._targetPosition);

    const vrScale = this._vrContext.vrScale || 1.0;
    const vrOrigin = this._vrContext.vrOrigin || [0, 0, 0];
    const headPos = inputState?.headPose?.position;
    const userFloorXR = headPos
      ? { x: headPos.x, y: 0, z: headPos.z }
      : { x: 0, y: 0, z: 0 };

    const position = {
      x: vrOrigin[0] + (this._targetPosition.x - userFloorXR.x) / vrScale,
      y: vrOrigin[1] + (this._targetPosition.y - userFloorXR.y) / vrScale,
      z: vrOrigin[2] + (this._targetPosition.z - userFloorXR.z) / vrScale,
    };

    return {
      position,
      orientation: null,
      teleporting: true,
    };
  }

  /**
   * Get teleport arc for rendering
   */
  getArcPoints() {
    return this._arcPoints;
  }

  /**
   * Get current target info
   */
  getTargetInfo() {
    return {
      position: this._targetPosition,
      valid: this._targetValid,
      isAiming: this._isAiming,
    };
  }
}

export default VRTeleportMode;
