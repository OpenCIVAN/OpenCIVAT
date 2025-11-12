// Handles click-to-annotate for individual instances

import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import {
  getUserName,
  getUserId,
} from "@Collaboration/presence/userManagement.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

/**
 * Setup annotation click handler for a specific instance
 *
 * @param {string} instanceId - Instance ID
 * @param {Object} sceneObjects - VTK scene objects (renderer, interactor, etc.)
 * @param {string} datasetId - Dataset being displayed in this instance
 */
export function setupInstanceAnnotation(instanceId, sceneObjects, datasetId) {
  const { renderer, interactor } = sceneObjects;

  if (!renderer || !interactor) {
    console.warn(
      `Cannot setup annotations for instance ${instanceId}: missing scene objects`
    );
    return;
  }

  console.log(`📍 Setting up annotation handler for instance ${instanceId}`);

  // Track annotation mode state
  let annotationMode = false;

  // Listen for right-click to create annotations
  interactor.onRightButtonPress((callData) => {
    if (!datasetId) {
      console.warn("No dataset loaded, cannot create annotation");
      return;
    }

    // Get the pick position in world coordinates
    const position = callData.position;
    const picker = interactor.getPicker();

    if (!picker) {
      console.warn("No picker available");
      return;
    }

    // Pick at the mouse position
    picker.pick([position.x, position.y, 0], renderer);
    const pickedPoint = picker.getPickPosition();

    if (!pickedPoint || pickedPoint.every((coord) => coord === 0)) {
      console.log("No geometry picked");
      return;
    }

    console.log(`📍 Picked point:`, pickedPoint);

    // Prompt for annotation text
    const text = prompt("Enter annotation text:", "New annotation");

    if (!text) {
      console.log("Annotation cancelled");
      return;
    }

    // Get user info
    const userName = getUserName();
    const userId = getUserId();
    const userColor =
      presenceSystem.getUserPresence(userId)?.userColor || "#FF6B6B";

    // Create annotation
    const annotation = {
      datasetId: datasetId,
      position: {
        x: pickedPoint[0],
        y: pickedPoint[1],
        z: pickedPoint[2],
      },
      text: text,
      type: "note", // or "warning", "info", "measurement"
      userName: userName,
      userId: userId,
      userColor: userColor,
      createdAt: Date.now(),
      visible: true,
    };

    console.log(`📍 Creating annotation:`, annotation);

    // Add to annotation system (will sync via Y.js)
    annotationSystem.addAnnotation(annotation);

    console.log(`✅ Annotation created in instance ${instanceId}`);
  });

  console.log(
    `✅ Annotation handler setup complete for instance ${instanceId}`
  );

  // Return cleanup function
  return () => {
    // Cleanup if needed
    console.log(
      `🗑️  Cleaning up annotation handler for instance ${instanceId}`
    );
  };
}

/**
 * Simple annotation mode toggle for instances
 * In the future, this will be part of the instance toolbar
 */
export function toggleAnnotationMode(instanceId, enabled) {
  console.log(
    `📍 Annotation mode ${
      enabled ? "enabled" : "disabled"
    } for instance ${instanceId}`
  );
  // This will be expanded when we add proper toolbar integration
}
