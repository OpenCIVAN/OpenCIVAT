// ----------------------------------------------------------------------------
// VTK Raycaster Utility
//
// Converts screen (2D) coordinates to world (3D) coordinates via raycasting.
// Used for collaborative cursors in 3D scenes.
//
// COORDINATE SYSTEMS:
// 1. Screen coordinates: Pixels from top-left of browser window (clientX, clientY)
// 2. Container-relative: Pixels from top-left of VTK container element
// 3. Normalized Device Coordinates (NDC): [-1, 1] range used by VTK picker
// 4. World coordinates: 3D position in the scene's coordinate system
//
// TRANSFORMATION PIPELINE:
// Screen → Container-relative → NDC → Picker → World
// ----------------------------------------------------------------------------

import vtkCellPicker from "@kitware/vtk.js/Rendering/Core/CellPicker";
import { instance as log } from "@Utils/logger.js";

// Cache pickers per instance to avoid recreation overhead
const pickerCache = new Map(); // instanceId -> vtkCellPicker

// Default picker tolerance (in normalized coordinates)
const DEFAULT_TOLERANCE = 0.005;

/**
 * Get or create a cached picker for an instance
 *
 * @param {string} instanceId - Unique instance identifier
 * @param {Object} options - Picker configuration options
 * @returns {vtkCellPicker} The picker instance
 */
function getOrCreatePicker(instanceId, options = {}) {
  if (pickerCache.has(instanceId)) {
    return pickerCache.get(instanceId);
  }

  const picker = vtkCellPicker.newInstance();

  // Configure picker tolerance
  // Lower = more precise, but may miss curved surfaces
  // Higher = more forgiving, but may pick wrong surface
  picker.setTolerance(options.tolerance || DEFAULT_TOLERANCE);

  // Enable picking of volumes if needed (usually false for surface picking)
  picker.setPickFromList(false);

  pickerCache.set(instanceId, picker);

  log.debug(`Created raycaster picker for instance: ${instanceId}`);

  return picker;
}

/**
 * Convert screen coordinates to normalized device coordinates (NDC).
 *
 * NDC in VTK:
 * - X: -1 (left edge) to +1 (right edge)
 * - Y: -1 (bottom edge) to +1 (top edge)
 *
 * Note: VTK's Y-axis is inverted compared to browser coordinates
 * (browser Y increases downward, VTK Y increases upward)
 *
 * @param {number} screenX - Screen X coordinate (clientX)
 * @param {number} screenY - Screen Y coordinate (clientY)
 * @param {HTMLElement} container - VTK container element
 * @returns {{ ndcX: number, ndcY: number, valid: boolean }}
 */
function screenToNDC(screenX, screenY, container) {
  const rect = container.getBoundingClientRect();

  // Convert to container-relative coordinates
  const containerX = screenX - rect.left;
  const containerY = screenY - rect.top;

  // Check if point is within container bounds
  const valid =
    containerX >= 0 &&
    containerX <= rect.width &&
    containerY >= 0 &&
    containerY <= rect.height;

  if (!valid || rect.width === 0 || rect.height === 0) {
    return { ndcX: 0, ndcY: 0, valid: false };
  }

  // Convert to normalized [0, 1] range
  const normalizedX = containerX / rect.width;
  const normalizedY = containerY / rect.height;

  // Convert to NDC [-1, 1] range
  // X: 0 -> -1, 1 -> +1
  // Y: 0 -> +1 (top), 1 -> -1 (bottom) - note the Y inversion!
  const ndcX = normalizedX * 2 - 1;
  const ndcY = 1 - normalizedY * 2; // Invert Y axis

  return { ndcX, ndcY, valid: true };
}

/**
 * Raycast from screen coordinates to find 3D world position.
 *
 * This function performs a ray pick from the camera through the given screen
 * coordinates and returns the intersection point with scene geometry.
 *
 * @param {Object} sceneObjects - VTK scene objects from instance
 * @param {Object} sceneObjects.renderer - vtkRenderer instance
 * @param {Object} sceneObjects.renderWindow - vtkRenderWindow instance
 * @param {Object} sceneObjects.camera - vtkCamera instance
 * @param {number} screenX - Screen X coordinate (e.g., event.clientX)
 * @param {number} screenY - Screen Y coordinate (e.g., event.clientY)
 * @param {HTMLElement} container - VTK container DOM element
 * @param {Object} options - Optional configuration
 * @param {string} options.instanceId - Instance ID for picker caching
 * @param {number} options.tolerance - Pick tolerance (default: 0.005)
 * @returns {{
 *   worldPosition: [number, number, number] | null,
 *   normal: [number, number, number] | null,
 *   hit: boolean,
 *   cellId: number | null,
 *   actorId: string | null
 * }}
 */
export function raycastFromScreen(
  sceneObjects,
  screenX,
  screenY,
  container,
  options = {}
) {
  // Validate inputs
  if (!sceneObjects?.renderer || !sceneObjects?.renderWindow) {
    log.warn("raycastFromScreen: Invalid sceneObjects provided");
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  if (!container) {
    log.warn("raycastFromScreen: No container provided");
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  const { renderer, renderWindow } = sceneObjects;

  // Convert screen coordinates to NDC
  const { ndcX, ndcY, valid } = screenToNDC(screenX, screenY, container);

  if (!valid) {
    // Cursor is outside the container
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }

  // Get or create picker
  const instanceId = options.instanceId || "default";
  const picker = getOrCreatePicker(instanceId, options);

  // Add all actors from renderer to picker (ensure we pick everything)
  const actors = renderer.getActors();
  actors.forEach((actor) => {
    if (actor.getPickable()) {
      picker.addPickList(actor);
    }
  });

  try {
    // Perform the pick operation
    // pick(selectionX, selectionY, selectionZ, renderer)
    // For 2D picking, selectionZ is typically 0
    picker.pick([ndcX, ndcY, 0], renderer);

    // Check if we hit something
    const pickedPosition = picker.getPickPosition();
    const pickedNormal = picker.getPickNormal();
    const cellId = picker.getCellId();

    // cellId of -1 means no intersection
    if (cellId < 0) {
      return {
        worldPosition: null,
        normal: null,
        hit: false,
        cellId: null,
        actorId: null,
      };
    }

    // Get the picked actor (if available)
    const pickedActor = picker.getActor();
    const actorId = pickedActor ? pickedActor.get?.("id") : null;

    return {
      worldPosition: [pickedPosition[0], pickedPosition[1], pickedPosition[2]],
      normal: pickedNormal
        ? [pickedNormal[0], pickedNormal[1], pickedNormal[2]]
        : null,
      hit: true,
      cellId,
      actorId,
    };
  } catch (error) {
    log.error("raycastFromScreen: Pick operation failed", error);
    return {
      worldPosition: null,
      normal: null,
      hit: false,
      cellId: null,
      actorId: null,
    };
  }
}

/**
 * Raycast with alternative methods for different use cases.
 *
 * Sometimes vtkCellPicker may miss thin surfaces or points.
 * This function tries multiple picking strategies.
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {HTMLElement} container - VTK container element
 * @param {Object} options - Configuration options
 * @returns {Object} Raycast result
 */
export function raycastFromScreenWithFallback(
  sceneObjects,
  screenX,
  screenY,
  container,
  options = {}
) {
  // First try with cell picker (best for surfaces)
  const result = raycastFromScreen(
    sceneObjects,
    screenX,
    screenY,
    container,
    options
  );

  if (result.hit) {
    return result;
  }

  // If cell picker missed, try with a larger tolerance
  const looseTolerance = (options.tolerance || DEFAULT_TOLERANCE) * 3;
  const fallbackResult = raycastFromScreen(
    sceneObjects,
    screenX,
    screenY,
    container,
    { ...options, tolerance: looseTolerance }
  );

  if (fallbackResult.hit) {
    return fallbackResult;
  }

  // If still no hit, return a world position along the view ray
  // This gives a sensible position even when not hitting geometry
  const worldPos = getWorldPositionOnViewRay(
    sceneObjects,
    screenX,
    screenY,
    container
  );

  return {
    worldPosition: worldPos,
    normal: null,
    hit: false,
    cellId: null,
    actorId: null,
    onViewRay: true, // Flag indicating this is on the ray, not on geometry
  };
}

/**
 * Get a world position along the view ray (even if no geometry is hit).
 *
 * This is useful for showing cursor position in empty space.
 * The position is computed at the focal point distance from the camera.
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {HTMLElement} container - VTK container element
 * @returns {[number, number, number] | null} World position on view ray
 */
export function getWorldPositionOnViewRay(
  sceneObjects,
  screenX,
  screenY,
  container
) {
  if (!sceneObjects?.camera || !sceneObjects?.renderer) {
    return null;
  }

  const { camera, renderer } = sceneObjects;

  // Convert screen to NDC
  const { ndcX, ndcY, valid } = screenToNDC(screenX, screenY, container);
  if (!valid) return null;

  try {
    // Get camera position and focal point
    const cameraPos = camera.getPosition();
    const focalPoint = camera.getFocalPoint();

    // Calculate the distance from camera to focal plane
    const distance = Math.sqrt(
      Math.pow(focalPoint[0] - cameraPos[0], 2) +
        Math.pow(focalPoint[1] - cameraPos[1], 2) +
        Math.pow(focalPoint[2] - cameraPos[2], 2)
    );

    // Use renderer to convert display to world coordinates
    // Create a point on the near clipping plane
    const nearPoint = renderer.displayToWorld(ndcX, ndcY, 0);
    const farPoint = renderer.displayToWorld(ndcX, ndcY, 1);

    if (!nearPoint || !farPoint) return null;

    // Calculate ray direction
    const rayDir = [
      farPoint[0] - nearPoint[0],
      farPoint[1] - nearPoint[1],
      farPoint[2] - nearPoint[2],
    ];

    // Normalize
    const rayLength = Math.sqrt(
      rayDir[0] ** 2 + rayDir[1] ** 2 + rayDir[2] ** 2
    );
    if (rayLength === 0) return null;

    rayDir[0] /= rayLength;
    rayDir[1] /= rayLength;
    rayDir[2] /= rayLength;

    // Project point at focal distance
    return [
      nearPoint[0] + rayDir[0] * distance,
      nearPoint[1] + rayDir[1] * distance,
      nearPoint[2] + rayDir[2] * distance,
    ];
  } catch (error) {
    log.error("getWorldPositionOnViewRay failed:", error);
    return null;
  }
}

/**
 * Convert world coordinates back to screen coordinates.
 *
 * Useful for displaying UI elements at 3D positions.
 *
 * @param {Object} sceneObjects - VTK scene objects
 * @param {[number, number, number]} worldPosition - 3D world coordinates
 * @param {HTMLElement} container - VTK container element
 * @returns {{ screenX: number, screenY: number, visible: boolean } | null}
 */
export function worldToScreen(sceneObjects, worldPosition, container) {
  if (!sceneObjects?.renderer || !worldPosition) {
    return null;
  }

  const { renderer } = sceneObjects;

  try {
    // Use renderer to convert world to display coordinates
    const displayCoord = renderer.worldToDisplay(
      worldPosition[0],
      worldPosition[1],
      worldPosition[2]
    );

    if (!displayCoord) return null;

    const rect = container.getBoundingClientRect();

    // displayCoord is in [0,1] normalized coordinates
    // Convert to screen pixels
    const containerX = displayCoord[0] * rect.width;
    const containerY = (1 - displayCoord[1]) * rect.height; // Invert Y

    // Check if point is in front of camera (z < 1 means visible)
    const visible = displayCoord[2] < 1;

    return {
      screenX: rect.left + containerX,
      screenY: rect.top + containerY,
      visible,
    };
  } catch (error) {
    log.error("worldToScreen failed:", error);
    return null;
  }
}

/**
 * Dispose the raycaster for an instance.
 *
 * Call this when cleaning up an instance to free memory.
 *
 * @param {string} instanceId - Instance ID to clean up
 */
export function disposeRaycaster(instanceId) {
  if (pickerCache.has(instanceId)) {
    const picker = pickerCache.get(instanceId);
    picker.delete(); // VTK cleanup
    pickerCache.delete(instanceId);
    log.debug(`Disposed raycaster for instance: ${instanceId}`);
  }
}

/**
 * Dispose all raycasters.
 *
 * Call this on application shutdown.
 */
export function disposeAllRaycasters() {
  pickerCache.forEach((picker, instanceId) => {
    picker.delete();
    log.debug(`Disposed raycaster for instance: ${instanceId}`);
  });
  pickerCache.clear();
}

// Export coordinate conversion helpers for external use
export { screenToNDC, DEFAULT_TOLERANCE };
