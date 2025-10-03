import { getUserId } from "../collaboration/userManagement.js";
import { getSceneObjects } from "../core/scene.js";

// Track mouse position within the VTK.js render window
let vtkMousePosition = { x: 0, y: 0 };

export function setupViewportInteraction() {
  const { fullScreenRenderer } = getSceneObjects();
  const vtkContainer = fullScreenRenderer?.getContainer();
  const userId = getUserId();

  if (!vtkContainer) return;

  if (vtkContainer) {
    vtkContainer.addEventListener("mousemove", (event) => {
      const rect = vtkContainer.getBoundingClientRect();
      vtkMousePosition = {
        x: event.clientX,
        y: event.clientY,
        relativeX: (event.clientX - rect.left) / rect.width,
        relativeY: (event.clientY - rect.top) / rect.height,
      };
    });

    // Add visual indicator for 3D interaction
    vtkContainer.addEventListener("mouseenter", () => {
      if (document.getElementById(`cursor-${userId}`)) {
        document.getElementById(`cursor-${userId}`).style.borderColor =
          "#00ff00";
      }
    });

    vtkContainer.addEventListener("mouseleave", () => {
      if (document.getElementById(`cursor-${userId}`)) {
        document.getElementById(`cursor-${userId}`).style.borderColor = "white";
      }
    });
  }
}

export function getVTKMousePosition() {
  return vtkMousePosition;
}
