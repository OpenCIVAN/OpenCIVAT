import vtkOrientationMarkerWidget from "@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget";
import vtkAnnotatedCubeActor from "@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor";
import { getSceneObjects } from './scene.js';

// ----------------------------------------------------------------------------
// Create an Orientation Marker
// ----------------------------------------------------------------------------

let axes = null;
let axesPosition = null;

export function createOrientationMarker() {
  const { interactor } = getSceneObjects();

  // create axes
  axes = vtkAnnotatedCubeActor.newInstance();
  axes.setDefaultStyle({
    text: "+X",
    fontStyle: "bold",
    fontFamily: "Arial",
    fontColor: "black",
    fontSizeScale: (res) => res / 2,
    faceColor: "#0000ff",
    faceRotation: 0,
    edgeThickness: 0.1,
    edgeColor: "black",
    resolution: 400,
  });
  // axes.setXPlusFaceProperty({ text: '+X' });
  axes.setXMinusFaceProperty({
    text: "-X",
    faceColor: "#ffff00",
    faceRotation: 90,
    fontStyle: "italic",
  });
  axes.setYPlusFaceProperty({
    text: "+Y",
    faceColor: "#00ff00",
    fontSizeScale: (res) => res / 4,
  });
  axes.setYMinusFaceProperty({
    text: "-Y",
    faceColor: "#00ffff",
    fontColor: "white",
  });
  axes.setZPlusFaceProperty({
    text: "+Z",
    edgeColor: "yellow",
  });
  axes.setZMinusFaceProperty({
    text: "-Z",
    faceRotation: 45,
    edgeThickness: 0,
  });
  axesPosition = axes.getPosition();

  // create orientation widget
  const orientationWidget = vtkOrientationMarkerWidget.newInstance({
    actor: axes,
    interactor: interactor,
  });
  orientationWidget.setEnabled(true);
  orientationWidget.setViewportCorner(
    vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
  );
  orientationWidget.setViewportSize(0.1);
  orientationWidget.setMinPixelSize(100);
  orientationWidget.setMaxPixelSize(300);
}

export function getAxes() {
  return axes;
}

export function getAxesPosition() {
  return axesPosition;
}
