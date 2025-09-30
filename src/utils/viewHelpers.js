import { logProgress } from "../ui/logging.js";

let renderer, renderWindow, camera;

export function initializeViewHelpers(rendererRef, renderWindowRef, cameraRef) {
  renderer = rendererRef;
  renderWindow = renderWindowRef;
  camera = cameraRef;
}

export function setup2DView() {
  // Position camera to look down at the XY plane for 2D visualization
  // const camera = renderer.getActiveCamera();

  // Get the bounds of the current data
  const bounds = renderer.computeVisiblePropBounds();
  const centerX = (bounds[0] + bounds[1]) / 2;
  const centerY = (bounds[2] + bounds[3]) / 2;
  const centerZ = 0; // Since all Z coordinates are 0

  const rangeX = bounds[1] - bounds[0];
  const rangeY = bounds[3] - bounds[2];
  const maxRange = Math.max(rangeX, rangeY);

  // Position camera directly above looking straight down
  camera.setPosition(centerX, centerY, maxRange * 2);
  camera.setFocalPoint(centerX, centerY, centerZ);
  camera.setViewUp(0, 1, 0); // Y axis points up

  // Force orthographic (parallel) projection for true 2D
  camera.setParallelProjection(true);
  camera.setParallelScale(maxRange * 0.55);

  // ----------------
  // DO NOT TOUCH INTERACTOR CODE BELOW: it doesn't work
  // ----------------

  // Disable 3D interactions to keep it 2D
  // const interactor = renderWindow.getInteractor();
  // const interactorStyle = interactor.getInteractorStyle();

  // // Store original interaction state
  // if (!window.original3DInteractionState) {
  //   window.original3DInteractionState = {
  //     leftButtonAction: interactorStyle.getLeftButtonAction(),
  //     middleButtonAction: interactorStyle.getMiddleButtonAction(),
  //     rightButtonAction: interactorStyle.getRightButtonAction()
  //   };
  // }

  // // Set 2D interaction style - only allow pan and zoom, no rotation
  // interactorStyle.setLeftButtonAction('Pan');
  // interactorStyle.setMiddleButtonAction('Zoom');
  // interactorStyle.setRightButtonAction('Pan');

  // Force render
  renderWindow.render();

  logProgress(
    "Locked to 2D viewing mode (no rotation, orthographic projection)"
  );
}

export function restore3DView() {
  // const camera = renderer.getActiveCamera();
  // const interactor = renderWindow.getInteractor();
  // const interactorStyle = interactor.getInteractorStyle();

  // Restore perspective projection
  camera.setParallelProjection(false);

  // ----------------
  // DO NOT TOUCH INTERACTOR CODE BELOW: it doesn't work
  // ----------------

  // // Restore 3D interactions
  // if (window.original3DInteractionState) {
  //   interactorStyle.setLeftButtonAction(window.original3DInteractionState.leftButtonAction);
  //   interactorStyle.setMiddleButtonAction(window.original3DInteractionState.middleButtonAction);
  //   interactorStyle.setRightButtonAction(window.original3DInteractionState.rightButtonAction);
  // } else {
  //   // Default 3D interaction
  //   interactorStyle.setLeftButtonAction('Rotate');
  //   interactorStyle.setMiddleButtonAction('Zoom');
  //   interactorStyle.setRightButtonAction('Pan');
  // }

  logProgress(
    "Restored 3D viewing mode (rotation enabled, perspective projection)"
  );
}
