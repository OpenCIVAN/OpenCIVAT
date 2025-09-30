import "@kitware/vtk.js/favicon";

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkWebXRRenderWindowHelper from "@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import vtkResourceLoader from "@kitware/vtk.js/IO/Core/ResourceLoader";

import { XrSessionTypes } from "@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants";

// Force DataAccessHelper to have access to various data source
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper";

// Custom UI controls, including button to start XR session
import controlPanel from "../controller.html";
import { initializeViewHelpers } from "../utils/viewHelpers.js";

// Dynamically load WebXR polyfill from CDN for WebVR and Cardboard API backwards compatibility
if (navigator.xr === undefined) {
  vtkResourceLoader
    .loadScript(
      "https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js"
    )
    .then(() => {
      // eslint-disable-next-line no-new, no-undef
      new WebXRPolyfill();
    });
}

let fullScreenRenderer, renderer, renderWindow, camera, interactor, XRHelper;
let vtpReader, mapper, actor, currentActor;
let originalPointsData = null;
let reductionApplied = false;

// ----------------------------------------------------------------------------
// Standard VTK.js Setup
// ----------------------------------------------------------------------------

export function initializeScene() {
  fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: [0, 0, 0],
  });

  renderer = fullScreenRenderer.getRenderer();
  renderWindow = fullScreenRenderer.getRenderWindow();
  camera = renderer.getActiveCamera();
  interactor = renderWindow.getInteractor();

  XRHelper = vtkWebXRRenderWindowHelper.newInstance({
    renderWindow: fullScreenRenderer.getApiSpecificRenderWindow(),
    drawControllersRay: true,
  });

  vtpReader = vtkXMLPolyDataReader.newInstance();
  mapper = vtkMapper.newInstance();
  actor = vtkActor.newInstance();
  actor.setMapper(mapper);

  fullScreenRenderer.addController(controlPanel);

  initializeViewHelpers(renderer, renderWindow, camera);

  return {
    fullScreenRenderer,
    renderer,
    renderWindow,
    camera,
    interactor,
    XRHelper,
    vtpReader,
    mapper,
    actor,
  };
}

export function getSceneObjects() {
  return {
    fullScreenRenderer,
    renderer,
    renderWindow,
    camera,
    interactor,
    XRHelper,
    vtpReader,
    mapper,
    actor,
    currentActor,
  };
}

export function setCurrentActor(newActor) {
  currentActor = newActor;
}

export function getCurrentActor() {
  return currentActor;
}

export function getOriginalPointsData() {
  return originalPointsData;
}

export function setOriginalPointsData(data) {
  originalPointsData = data;
}

export function isReductionApplied() {
  return reductionApplied;
}

export function setReductionApplied(applied) {
  reductionApplied = applied;
}

export function startVR() {
  XRHelper.startXR(XrSessionTypes.InlineVr);
}

export function stopVR() {
  XRHelper.stopXR();
}
