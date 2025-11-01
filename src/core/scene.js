import "@kitware/vtk.js/favicon";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";
import vtkWebXRRenderWindowHelper from "@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import vtkResourceLoader from "@kitware/vtk.js/IO/Core/ResourceLoader";

import { XrSessionTypes } from "@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants";

import "@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper";
import "@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper";

import { initializeViewHelpers } from "../utils/viewHelpers.js";

// Load WebXR polyfill if needed
if (navigator.xr === undefined) {
  vtkResourceLoader
    .loadScript(
      "https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js"
    )
    .then(() => {
      new WebXRPolyfill();
    });
}

let renderer,
  renderWindow,
  openGLRenderWindow,
  camera,
  interactor,
  interactorStyle,
  XRHelper;
let vtpReader, mapper, actor, currentActor;
let originalPointsData = null;
let reductionApplied = false;
let vtkContainer = null;
let lastResetDatasetBounds = null; // Track last bounds we reset for

// ----------------------------------------------------------------------------
// Initialize VTK Scene
// ----------------------------------------------------------------------------

export function initializeScene(containerElement) {
  console.log("🎨 Initializing VTK scene in container");

  if (!containerElement) {
    console.error("❌ No container element provided!");
    return null;
  }

  vtkContainer = containerElement;
  containerElement.innerHTML = "";

  // Create renderer
  renderer = vtkRenderer.newInstance();
  renderer.setBackground(0.1, 0.1, 0.1);

  // Create render window
  renderWindow = vtkRenderWindow.newInstance();
  renderWindow.addRenderer(renderer);

  // Create OpenGL render window
  openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
  openGLRenderWindow.setContainer(containerElement);
  renderWindow.addView(openGLRenderWindow);

  // Set size
  const { width, height } = containerElement.getBoundingClientRect();
  openGLRenderWindow.setSize(width, height);

  // Create interactor
  interactor = vtkRenderWindowInteractor.newInstance();
  interactor.setView(openGLRenderWindow);
  interactor.initialize();

  // Set interaction style
  interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
  interactor.setInteractorStyle(interactorStyle);
  interactor.bindEvents(containerElement);

  // Get camera
  camera = renderer.getActiveCamera();

  // Setup WebXR helper
  XRHelper = vtkWebXRRenderWindowHelper.newInstance({
    renderWindow: openGLRenderWindow,
    drawControllersRay: true,
  });

  // Create VTP reader, mapper, actor
  vtpReader = vtkXMLPolyDataReader.newInstance();
  mapper = vtkMapper.newInstance();
  actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.setPickable(true);

  // Initialize view helpers
  initializeViewHelpers(renderer, renderWindow, camera, interactor);

  // Handle window resize
  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = containerElement.getBoundingClientRect();
    openGLRenderWindow.setSize(width, height);
    renderWindow.render();
  });
  resizeObserver.observe(containerElement);

  console.log("✅ VTK scene initialized successfully");

  return {
    renderer,
    renderWindow,
    openGLRenderWindow,
    camera,
    interactor,
    interactorStyle,
    XRHelper,
    vtpReader,
    mapper,
    actor,
  };
}

// ----------------------------------------------------------------------------
// Scene Accessors
// ----------------------------------------------------------------------------

export function getSceneObjects() {
  return {
    renderer,
    renderWindow,
    openGLRenderWindow,
    camera,
    interactor,
    interactorStyle,
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
  return originalPointsData || null;
}

export function setOriginalPointsData(data) {
  originalPointsData = data;
  console.log(
    `💾 Original points data saved: ${data ? data.length / 3 : 0} points`
  );
}

export function isReductionApplied() {
  return reductionApplied;
}

export function setReductionApplied(applied) {
  reductionApplied = applied;
}

export function getVTKRenderer() {
  return renderer;
}

export function getVTKRenderWindow() {
  return renderWindow;
}

export function getVTKContainer() {
  return vtkContainer;
}

export function renderScene() {
  if (renderWindow) {
    renderWindow.render();
  }
}

// ----------------------------------------------------------------------------
// VR Functions
// ----------------------------------------------------------------------------

export function startVR() {
  if (XRHelper) {
    XRHelper.startXR(XrSessionTypes.InlineVr);
  }
}

export function stopVR() {
  if (XRHelper) {
    XRHelper.stopXR();
  }
}

// ----------------------------------------------------------------------------
// Scene Cleanup
// ----------------------------------------------------------------------------

export function cleanupScene() {
  console.log("🧹 Cleaning up VTK scene...");

  if (openGLRenderWindow) {
    openGLRenderWindow.delete();
  }

  if (renderWindow) {
    renderWindow.delete();
  }

  if (renderer) {
    renderer.delete();
  }

  renderer = null;
  renderWindow = null;
  openGLRenderWindow = null;
  camera = null;
  interactor = null;

  console.log("✅ VTK scene cleaned up");
}

// ----------------------------------------------------------------------------
// Load Dataset into Scene
// ----------------------------------------------------------------------------

export function loadDatasetIntoScene(polyData, resetCamera = true) {
  if (!mapper || !renderer || !renderWindow) {
    console.error("❌ Scene not initialized");
    return false;
  }

  console.log("📊 Loading dataset into scene...");

  try {
    // CRITICAL: Extract and save original points data for dimensionality reduction
    const points = polyData.getPoints();
    if (points) {
      const pointsData = points.getData();
      // Save original points data as Float32Array
      originalPointsData = new Float32Array(pointsData); // Use module variable directly

      const numPoints = points.getNumberOfPoints();
      const bounds = polyData.getBounds();

      console.log(`✅ Saved ${numPoints.toLocaleString()} points for reduction`);
      
      // Import logging functions
      import('../ui/react/hooks/useLogging.js').then(({ logInfo, logProgress, logSuccess }) => {
        logInfo(`Dataset: ${numPoints.toLocaleString()} points`);
        logProgress(
          `Bounds: X[${bounds[0].toFixed(2)}, ${bounds[1].toFixed(2)}] ` +
          `Y[${bounds[2].toFixed(2)}, ${bounds[3].toFixed(2)}] ` +
          `Z[${bounds[4].toFixed(2)}, ${bounds[5].toFixed(2)}]`
        );
      });

      // Auto-size annotation markers based on data bounds
      const xRange = bounds[1] - bounds[0];
      const yRange = bounds[3] - bounds[2];
      const zRange = bounds[5] - bounds[4];
      const maxRange = Math.max(xRange, yRange, zRange);
      const annotationRadius = maxRange * 0.01;

      // Update annotation marker size if renderer is available
      import("./annotationRenderer.js").then((module) => {
        if (module.annotationRenderer) {
          module.annotationRenderer.setMarkerRadius(annotationRadius);
          console.log(`📍 Annotation marker size: ${annotationRadius.toFixed(4)}`);
        }
      });
    } else {
      console.warn("⚠️ No point data found in polydata");
    }

    // Update the mapper with new data
    mapper.setInputData(polyData);

    // Make sure actor is pickable
    if (actor) {
      actor.setPickable(true);
    }

    // Add actor to renderer if not already added
    if (actor && !renderer.getActors().includes(actor)) {
      renderer.addActor(actor);
      console.log("✅ Actor added to renderer");
    }

    // Reset camera to show the new data
    if (resetCamera) {
      renderer.resetCamera();
      console.log("📷 Camera reset");
    }

    // Reset reduction state
    reductionApplied = false;

    // Force multiple renders to ensure visibility
    renderWindow.render();

    setTimeout(() => {
      renderWindow.render();
    }, 100);

    setTimeout(() => {
      renderWindow.render();
    }, 300);

    import('../ui/react/hooks/useLogging.js').then(({ logSuccess }) => {
      logSuccess("Visualization loaded successfully");
    });
    
    console.log("✅ Dataset loaded into scene");

    return true;
  } catch (error) {
    console.error("❌ Error loading dataset into scene:", error);
    return false;
  }
}