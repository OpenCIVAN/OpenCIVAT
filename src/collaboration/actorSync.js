// ----------------------------------------------------------------------------
// Yjs Observer: Actor Orientation and Representation
// ----------------------------------------------------------------------------

import { yActor as yActorMap } from "./yjsSetup.js";
import { getCurrentActor, getSceneObjects } from "../core/scene.js";
import { getAxes, getAxesPosition } from "../core/orientationMarker.js";

export function setupActorSync() {
  const { renderer, renderWindow, camera, interactor } = getSceneObjects();

  // Observer for incoming changes
  yActorMap.observe((event) => {
    const currentActor = getCurrentActor();
    if (!currentActor) return;

    const orient = yActorMap.get("orientation");
    if (orient) {
      currentActor.setOrientation(...orient);

      const axes = getAxes();
      const axesPosition = getAxesPosition();
      if (axes) {
        axes.setOrientation(...orient);
        axes.setPosition(...axesPosition);
      }

      const cameraPos = yActorMap.get("cameraPosition");
      if (cameraPos) {
        camera.setPosition(...cameraPos);
      }

      const cameraFocal = yActorMap.get("cameraFocalPoint");
      if (cameraFocal) {
        camera.setFocalPoint(...cameraFocal);
      }

      renderer.resetCameraClippingRange();
      renderWindow.render();
    }

    const rep = yActorMap.get("representation");
    if (rep !== undefined) {
      currentActor.getProperty().setRepresentation(rep);
      renderer.resetCameraClippingRange();
      renderWindow.render();
    }
  });

  // ----------------------------------------------------------------------------
  // Tracking/Sending Mouse Interaction
  // ----------------------------------------------------------------------------

  let isDraggingActor = false;
  let mouseStartPos = null;
  let actorStartOrient = null;

  interactor.onMouseMove((callData) => {
    const currentActor = getCurrentActor();
    if (isDraggingActor && currentActor) {
      const mousePos = callData.position;
      const deltaX = mousePos.x - mouseStartPos.x;
      const deltaY = mousePos.y - mouseStartPos.y;

      currentActor.setOrientation(
        actorStartOrient[0] - deltaY * 0.1,
        actorStartOrient[1] + deltaX * 0.1, // flip Y
        actorStartOrient[2]
      );

      const axes = getAxes();
      const axesPosition = getAxesPosition();
      if (axes) {
        axes.setOrientation(...currentActor.getOrientation());
        axes.setPosition(...axesPosition);
      }

      renderWindow.render();
      sendActorPosition();
    }
  });

  interactor.onLeftButtonPress((callData) => {
    const currentActor = getCurrentActor();
    if (!currentActor) return;
    isDraggingActor = true;
    actorStartOrient = [...currentActor.getOrientation()];
    mouseStartPos = callData.position; // Store the starting mouse position
  });

  interactor.onLeftButtonRelease(() => {
    isDraggingActor = false;
    actorStartOrient = null;
    mouseStartPos = null;
  });
}

function sendActorPosition() {
  const currentActor = getCurrentActor();
  const { camera } = getSceneObjects();

  if (currentActor) {
    const orient = currentActor.getOrientation();
    yActorMap.set("orientation", orient);

    const cameraPos = camera.getPosition();
    const cameraFocal = camera.getFocalPoint();
    yActorMap.set("cameraPosition", cameraPos);
    yActorMap.set("cameraFocalPoint", cameraFocal);
  }
}
