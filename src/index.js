// ----------------------------------------------------------------------------
// Application Initialization
// ----------------------------------------------------------------------------

// For streamlined VR development install the WebXR emulator extension
// https://github.com/MozillaReality/WebXR-emulator-extension

// Unused imports
import vtkCalculator from "@kitware/vtk.js/Filters/General/Calculator";
import vtkPolyDataNormals from "@kitware/vtk.js/Filters/Core/PolyDataNormals";
import vtkRemoteView from "@kitware/vtk.js/Rendering/Misc/RemoteView";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";

import { AttributeTypes } from "@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants";
import { FieldDataTypes } from "@kitware/vtk.js/Common/DataModel/DataSet/Constants";

import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import { colorSpaceToWorking } from "three/tsl";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import { P } from "@kitware/vtk.js/Common/Core/Math/index";

import {
  initializeLogging,
  logInfo,
  logSuccess,
  logProgress,
} from "./ui/logging.js";
import {
  initializeTensorFlow,
  logMemoryUsage,
  cleanupTensors,
} from "./utils/tensorflowSetup.js";
import { initializeScene } from "./core/scene.js";
import { setupFileHandler } from "./core/fileHandler.js";
import {
  setupDimensionalityReductionControls,
  getReductionMethod,
  getReductionComponents,
  setReductionMethod,
  setReductionComponents,
} from "./ui/controls.js";
import { addCursorControls } from "./ui/cursorControls.js";
import { initializeCursorSystem } from "./collaboration/cursors.js";
import { setupActorSync } from "./collaboration/actorSync.js";
import { setupReductionSync } from "./collaboration/reductionSync.js";
import { toggleDimensionalityReduction } from "./core/reductionController.js";
import { setupViewportInteraction } from "./ui/viewportInteraction.js";

async function initializeApplication() {
  logInfo("Starting VTK.js with TensorFlow.js Application...");

  // Initialize logging system first
  initializeLogging();

  // Initialize TensorFlow.js
  const tfReady = await initializeTensorFlow();
  if (!tfReady) {
    console.error("TensorFlow.js failed to initialize, PCA will not work");
  }

  // Initialize 3D scene
  initializeScene();
  logProgress("3D scene initialized");

  // Setup file handling
  setupFileHandler();
  logProgress("File handler ready");

  // Setup UI controls
  setupDimensionalityReductionControls(toggleDimensionalityReduction);
  logProgress("Dimensionality reduction controls ready");

  // Setup collaboration features
  setupActorSync();
  logProgress("Actor synchronization ready");

  setupReductionSync(
    toggleDimensionalityReduction,
    getReductionMethod,
    getReductionComponents,
    setReductionMethod,
    setReductionComponents
  );
  logProgress("Reduction synchronization ready");

  // Initialize collaborative cursor system
  initializeCursorSystem();

  setupViewportInteraction();

  // Add cursor UI controls with delay to ensure table exists
  setTimeout(() => {
    try {
      addCursorControls();
      logProgress("Cursor controls added");
    } catch (error) {
      console.warn("Could not add cursor controls:", error);
    }
  }, 1000);

  logSuccess("Application initialized successfully!");
  logInfo("Available features:");
  logProgress("  ✓ VTP file loading and visualization");
  logProgress("  ✓ WebXR/VR support");
  logProgress("  ✓ PCA with TensorFlow.js (optimized memory management)");
  logProgress("  ✓ t-SNE and UMAP (pure JavaScript implementations)");
  logProgress("  ✓ Real-time collaboration (Yjs)");
  logProgress("  ✓ Collaborative cursors");
  logProgress("  ✓ Advanced logging and performance monitoring");
  logProgress(
    "  ✓ Automatic optimization for datasets from 100 to 1,000,000+ points"
  );
  logInfo("Load a VTP file to get started!");
  logMemoryUsage("on startup");
}

// Set up cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cleanupTensors();
  });
}

// Expose functions for debugging
if (typeof window !== "undefined") {
  window.debugAPI = {
    toggleReduction: toggleDimensionalityReduction,
    logMemory: logMemoryUsage,
    cleanup: cleanupTensors,
    getReductionMethod,
    getReductionComponents,
  };

  console.log("Debug API available at window.debugAPI");
}

// Start the application
initializeApplication().catch((error) => {
  console.error("Failed to initialize application:", error);
});
