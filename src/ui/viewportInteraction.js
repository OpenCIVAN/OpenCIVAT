// ----------------------------------------------------------------------------
// Viewport Interaction
// ----------------------------------------------------------------------------

import { getUserId } from "../collaboration/userManagement.js";
import { getSceneObjects } from "../core/scene.js";
import {
  isAnnotationMode,
  promptForAnnotationText,
} from "../core/annotationState.js";
import { annotationRenderer } from "../core/annotationRenderer.js";

import vtkCellPicker from "@kitware/vtk.js/Rendering/Core/CellPicker";
import vtkPointPicker from "@kitware/vtk.js/Rendering/Core/PointPicker";

// Track mouse position within the VTK.js render window
let vtkMousePosition = { x: 0, y: 0 };

export function setupViewportInteraction() {
  const { fullScreenRenderer, renderer, renderWindow } = getSceneObjects();
  const vtkContainer = fullScreenRenderer?.getContainer();
  const userId = getUserId();

  if (!vtkContainer) return;

  // Mouse move tracking
  vtkContainer.addEventListener("mousemove", (event) => {
    const rect = vtkContainer.getBoundingClientRect();
    vtkMousePosition = {
      x: event.clientX,
      y: event.clientY,
      relativeX: (event.clientX - rect.left) / rect.width,
      relativeY: (event.clientY - rect.top) / rect.height,
    };
  });

  // Visual indicator for 3D interaction
  vtkContainer.addEventListener("mouseenter", () => {
    const cursor = document.getElementById(`cursor-${userId}`);
    if (cursor) {
      cursor.style.borderColor = "#00ff00";
    }
  });

  vtkContainer.addEventListener("mouseleave", () => {
    const cursor = document.getElementById(`cursor-${userId}`);
    if (cursor) {
      cursor.style.borderColor = "white";
    }
  });

  // Click handler for annotations - with debouncing
  let isProcessingClick = false;

  vtkContainer.addEventListener("click", (event) => {
    if (!isAnnotationMode() || isProcessingClick) {
      return;
    }

    isProcessingClick = true;

    // Get 3D position from click using VTK.js picker
    const position = get3DPositionFromClick(event, vtkContainer);

    if (position) {
      promptForAnnotationText(position);
    }

    // Reset after a short delay
    setTimeout(() => {
      isProcessingClick = false;
    }, 500);
  });

  // Change cursor style when in annotation mode
  setInterval(() => {
    if (vtkContainer) {
      vtkContainer.style.cursor = isAnnotationMode() ? "crosshair" : "default";
    }
  }, 100);
}

function get3DPositionFromClick(event, container) {
  const { renderer, renderWindow } = getSceneObjects();

  if (!renderer || !renderWindow) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const displayPosition = [x, rect.height - y, 0];

  try {
    const actors = renderer.getActors();
    const pickableActors = actors.filter((actor) => actor.getPickable());

    if (pickableActors.length === 0) {
      return useFallbackPosition(renderer, x, y, rect);
    }

    // Try Point Picker with generous tolerance
    const pointPicker = vtkPointPicker.newInstance();
    pointPicker.setPickFromList(true);
    pointPicker.setTolerance(0.05);

    pickableActors.forEach((actor) => pointPicker.addPickList(actor));

    if (pointPicker.pick(displayPosition, renderer)) {
      const pos = pointPicker.getPickPosition();
      if (isValidPosition(pos)) {
        console.log("📍 Picked at:", pos);
        return { x: pos[0], y: pos[1], z: pos[2] };
      }
    }

    // Try Cell Picker
    const cellPicker = vtkCellPicker.newInstance();
    cellPicker.setPickFromList(true);
    cellPicker.setTolerance(0.05);

    pickableActors.forEach((actor) => cellPicker.addPickList(actor));

    if (cellPicker.pick(displayPosition, renderer)) {
      const pos = cellPicker.getPickPosition();
      if (isValidPosition(pos)) {
        console.log("📍 Picked at:", pos);
        return { x: pos[0], y: pos[1], z: pos[2] };
      }
    }

    // Use fallback with smart positioning
    return useFallbackPosition(renderer, x, y, rect);
  } catch (error) {
    console.error("Picking error:", error);
    return useFallbackPosition(renderer, x, y, rect);
  }
}

function isValidPosition(pos) {
  return (
    pos &&
    pos.length === 3 &&
    !isNaN(pos[0]) &&
    !isNaN(pos[1]) &&
    !isNaN(pos[2]) &&
    isFinite(pos[0]) &&
    isFinite(pos[1]) &&
    isFinite(pos[2])
  );
}

function useFallbackPosition(renderer, mouseX, mouseY, rect) {
  try {
    const camera = renderer.getActiveCamera();
    const focalPoint = camera.getFocalPoint();
    const position = camera.getPosition();
    const viewUp = camera.getViewUp();

    // Calculate view direction
    const viewDir = [
      focalPoint[0] - position[0],
      focalPoint[1] - position[1],
      focalPoint[2] - position[2],
    ];

    const distance = Math.sqrt(
      viewDir[0] * viewDir[0] +
        viewDir[1] * viewDir[1] +
        viewDir[2] * viewDir[2]
    );

    // Normalize
    viewDir[0] /= distance;
    viewDir[1] /= distance;
    viewDir[2] /= distance;

    // Use mouse position to offset from focal point
    const offsetX = (mouseX / rect.width - 0.5) * distance * 0.5;
    const offsetY =
      ((rect.height - mouseY) / rect.height - 0.5) * distance * 0.5;

    // Cross product to get right vector
    const right = [
      viewDir[1] * viewUp[2] - viewDir[2] * viewUp[1],
      viewDir[2] * viewUp[0] - viewDir[0] * viewUp[2],
      viewDir[0] * viewUp[1] - viewDir[1] * viewUp[0],
    ];

    // Calculate final position
    const finalPos = [
      focalPoint[0] + right[0] * offsetX + viewUp[0] * offsetY,
      focalPoint[1] + right[1] * offsetX + viewUp[1] * offsetY,
      focalPoint[2] + right[2] * offsetX + viewUp[2] * offsetY,
    ];

    console.log("📍 Using fallback position");

    return {
      x: finalPos[0],
      y: finalPos[1],
      z: finalPos[2],
    };
  } catch (err) {
    return { x: 0, y: 0, z: 0 };
  }
}

export function getVTKMousePosition() {
  return vtkMousePosition;
}
