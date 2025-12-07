// src/core/instances/types/vtk/utils/cameraUtils.js
// VTK-specific camera utilities
//
// This file contains VTK-specific code that was previously in useBookmarks.js
// Camera capture is instance-type-specific, so it belongs in the VTK plugin.
//
// Usage (in VTK-aware code only):
//   import { captureCameraState, applyCameraState } from '@VTK/utils/cameraUtils.js';

import { instance as log } from "@Utils/logger.js";

/**
 * Capture current camera state from a VTK renderer
 *
 * Call this when creating a bookmark to capture the current view.
 * This is VTK-specific - other instance types will have their own capture methods.
 *
 * @param {Object} renderer - VTK renderer instance
 * @returns {Object|null} Camera state object or null if capture fails
 *
 * @example
 * // In a VTK-aware component or handler:
 * const cameraState = captureCameraState(sceneObjects.renderer);
 * await createBookmark({ name: 'My View', camera_state: cameraState });
 */
export function captureCameraState(renderer) {
  if (!renderer) {
    log.warn("No renderer provided to captureCameraState");
    return null;
  }

  try {
    const camera = renderer.getActiveCamera?.();
    if (!camera) {
      log.warn("No active camera found");
      return null;
    }

    return {
      position: camera.getPosition?.() || [0, 0, 1],
      focalPoint: camera.getFocalPoint?.() || [0, 0, 0],
      viewUp: camera.getViewUp?.() || [0, 1, 0],
      viewAngle: camera.getViewAngle?.() || 30,
      parallelScale: camera.getParallelScale?.() || 1,
      clippingRange: camera.getClippingRange?.() || [0.1, 1000],
    };
  } catch (error) {
    log.error("Failed to capture camera state:", error);
    return null;
  }
}

/**
 * Apply a saved camera state to a VTK renderer
 *
 * @param {Object} renderer - VTK renderer instance
 * @param {Object} cameraState - Saved camera state object
 * @param {Object} options - Options
 * @param {boolean} options.animate - Whether to animate the transition (future)
 * @returns {boolean} True if applied successfully
 *
 * @example
 * applyCameraState(sceneObjects.renderer, bookmark.cameraState);
 * sceneObjects.renderWindow.render();
 */
export function applyCameraState(renderer, cameraState, options = {}) {
  if (!renderer || !cameraState) {
    log.warn("Missing renderer or cameraState");
    return false;
  }

  try {
    const camera = renderer.getActiveCamera?.();
    if (!camera) {
      log.warn("No active camera found");
      return false;
    }

    // Apply position
    if (cameraState.position) {
      camera.setPosition(...cameraState.position);
    }

    // Apply focal point (some legacy bookmarks use 'target')
    const focalPoint = cameraState.focalPoint || cameraState.target;
    if (focalPoint) {
      camera.setFocalPoint(...focalPoint);
    }

    // Apply view up vector
    if (cameraState.viewUp || cameraState.up) {
      camera.setViewUp(...(cameraState.viewUp || cameraState.up));
    }

    // Apply projection parameters
    if (cameraState.viewAngle !== undefined) {
      camera.setViewAngle(cameraState.viewAngle);
    }

    if (cameraState.parallelScale !== undefined) {
      camera.setParallelScale(cameraState.parallelScale);
    }

    if (cameraState.clippingRange) {
      camera.setClippingRange(...cameraState.clippingRange);
    }

    // Reset clipping range to ensure proper rendering
    renderer.resetCameraClippingRange();

    log.debug("Camera state applied successfully");
    return true;
  } catch (error) {
    log.error("Failed to apply camera state:", error);
    return false;
  }
}

/**
 * Interpolate between two camera states (for smooth transitions)
 *
 * @param {Object} fromState - Starting camera state
 * @param {Object} toState - Target camera state
 * @param {number} t - Interpolation factor (0 to 1)
 * @returns {Object} Interpolated camera state
 */
export function interpolateCameraState(fromState, toState, t) {
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpArray = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

  return {
    position: lerpArray(fromState.position, toState.position, t),
    focalPoint: lerpArray(
      fromState.focalPoint || fromState.target,
      toState.focalPoint || toState.target,
      t
    ),
    viewUp: lerpArray(
      fromState.viewUp || fromState.up,
      toState.viewUp || toState.up,
      t
    ),
    viewAngle: lerp(fromState.viewAngle || 30, toState.viewAngle || 30, t),
    parallelScale: lerp(
      fromState.parallelScale || 1,
      toState.parallelScale || 1,
      t
    ),
  };
}

/**
 * Check if two camera states are approximately equal
 *
 * @param {Object} stateA - First camera state
 * @param {Object} stateB - Second camera state
 * @param {number} tolerance - Comparison tolerance (default 0.001)
 * @returns {boolean} True if states are approximately equal
 */
export function camerasEqual(stateA, stateB, tolerance = 0.001) {
  if (!stateA || !stateB) return false;

  const arraysEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((v, i) => Math.abs(v - b[i]) < tolerance);
  };

  return (
    arraysEqual(stateA.position, stateB.position) &&
    arraysEqual(
      stateA.focalPoint || stateA.target,
      stateB.focalPoint || stateB.target
    ) &&
    arraysEqual(stateA.viewUp || stateA.up, stateB.viewUp || stateB.up)
  );
}

export default {
  captureCameraState,
  applyCameraState,
  interpolateCameraState,
  camerasEqual,
};
