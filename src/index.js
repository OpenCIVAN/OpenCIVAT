// ----------------------------------------------------------------------------
// Application Initialization
// ----------------------------------------------------------------------------

import { voiceChat } from "./collaboration/voiceChat.js";
import { setupUserName } from "./collaboration/userManagement.js";
import { modeManager } from "./core/modeManager.js";
import { vrControllers } from "./vr/vrControllers.js";
import { vrAvatarSystem } from "./vr/vrAvatars.js";
import { vrSpatialUI } from "./vr/vrSpatialUI.js";

// Import logging
import {
  logInfo,
  logSuccess,
  logProgress,
} from "./ui/react/hooks/useLogging.js";

import {
  initializeTensorFlow,
  logMemoryUsage,
  cleanupTensors,
} from "./utils/tensorflowSetup.js";

import { setupFileHandler } from "./core/fileHandler.js";

// Import reduction state manager
import {
  getReductionMethod,
  getReductionComponents,
  setReductionMethod,
  setReductionComponents,
} from "./core/reductionState.js";

// Import Y.js setup and observers
import {
  syncDatasetToYjs,
  syncInstanceToYjs,
  syncAnnotationsToYjs,
  initializeAllObservers,
  yDatasets,
} from "./collaboration/yjsSetup.js";

import { textChat } from "./collaboration/textChat.js";
import { initializeCursorSystem } from "./collaboration/cursors.js";
import { setupActorSync } from "./collaboration/actorSync.js";
import { setupReductionSync } from "./collaboration/reductionSync.js";
import { toggleDimensionalityReduction } from "./core/reductionController.js";
import { setupViewportInteraction } from "./ui/viewportInteraction.js";
import { annotationRenderer } from "./core/annotationRenderer.js";
import { annotationSystem } from "./collaboration/annotations.js";
import { presenceSystem } from "./collaboration/presenceSystem.js";
import { datasetManager } from "./core/datasetManager.js";
import { simpleVisualizationManager } from "./core/simpleVisualizationManager.js";
import { cameraSync } from "./collaboration/cameraSync.js";
import { dataCleanup } from "./services/dataCleanup.js";
import { dataCache } from "./services/dataCache.js";
import { datasetLoadingOrchestrator } from "./core/datasetLoadingOrchestrator.js";

// Get room name from URL or use default
function getRoomName() {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "default-analytics-room";
}

// ========================================
// PHASE 1: Pre-Scene Initialization
// Things that don't need VTK scene
// ========================================
async function initializeApplicationPreScene() {
  logInfo("Starting CIA Web App Application...");

  // Initialize TensorFlow.js
  const tfReady = await initializeTensorFlow();
  if (!tfReady) {
    console.error("TensorFlow.js failed to initialize, PCA will not work");
  }

  logProgress("Scene will be initialized by Web App UI");

  // Setup file handling
  setupFileHandler();
  logProgress("File handler ready");

  // Get room name for collaboration
  const roomName = getRoomName();
  logProgress(`Joining room: ${roomName}`);

  // Setup user name BEFORE connecting to Yjs and voice chat
  const hasUsername = await setupUserName();
  if (hasUsername) {
    logProgress("User name configured");
  } else {
    logProgress("User name will be prompted by UI");
  }

  // Initialize presence system (must be after user setup)
  presenceSystem.initialize();
  logProgress("Presence system initialized");

  // Dataset manager initialization
  datasetManager.initialize();
  logProgress("Dataset manager initialized");

  // 🔥 Initialize Y.js observers
  logInfo("Initializing Y.js observers...");
  initializeAllObservers();
  logSuccess("Y.js observers ready");

  // Initialize visualization manager
  simpleVisualizationManager.initialize();
  logProgress("Visualization manager initialized");

  // Initialize the orchestrator after the VTK scene is ready
  datasetLoadingOrchestrator.initialize();

  // Initialize annotation system early
  annotationSystem.initialize();
  logProgress("Annotation system initialized");

  // Initialize text chat system (only once!)
  textChat.initialize();
  logProgress("Text chat system initialized");

  // Initialize VR systems (non-blocking)
  try {
    modeManager.setupVRDetection();
    logProgress("VR detection initialized");

    vrControllers.initialize();
    logProgress("VR controllers initialized");

    vrAvatarSystem.initialize();
    logProgress("VR avatar system initialized");

    vrSpatialUI.initialize();
    logProgress("VR spatial UI initialized");
  } catch (error) {
    console.warn("VR systems failed to initialize (non-critical):", error);
  }

  logSuccess("Pre-scene initialization complete!");

  return roomName;
}

// ========================================
// PHASE 2: Post-Scene Initialization
// Things that REQUIRE VTK scene to exist
// This is called by React after VTK is initialized
// ========================================
export function initializeApplicationPostScene() {
  console.log("🔧 Starting post-scene initialization...");

  try {
    // Setup collaboration features (these need the scene)
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
    logProgress("Collaborative cursor system ready");

    // Setup viewport interaction (must be before annotation renderer)
    try {
      setupViewportInteraction();
      logProgress("Viewport interaction ready");
      console.log("✅ Viewport interaction initialized");
    } catch (error) {
      console.error("❌ Failed to setup viewport interaction:", error);
    }

    // Add camera sync
    cameraSync.initialize();
    logProgress("Camera synchronization ready");

    // Initialize annotation renderer after scene is ready
    setTimeout(() => {
      annotationRenderer.initialize();
      logProgress("Annotation renderer initialized");
    }, 500);

    // Setup store sync
    setupStoreSync();

    // 🔥 Make debugging tools available globally
    if (typeof window !== "undefined") {
      window.datasetManager = datasetManager;
      window.dataCache = dataCache;
      window.dataCleanup = dataCleanup;

      window.debugAPI = {
        // Dataset debugging
        datasetManager,
        dataCache,
        dataCleanup,
        checkDatasets: () => {
          console.log("📊 Dataset Status:");
          console.log(
            "  In Memory:",
            Array.from(datasetManager.datasets.keys()).length
          );
          console.log("  In Y.js:", yDatasets.size);

          console.log("\n📋 Details:");
          datasetManager.datasets.forEach((dataset, id) => {
            console.log(`  ${id}:`, {
              name: dataset.name,
              hasPolydata: !!dataset.polydata,
              points: dataset.polydata?.getPoints()?.getNumberOfPoints() || 0,
            });
          });
        },

        // Existing debug methods
        toggleReduction: toggleDimensionalityReduction,
        logMemory: logMemoryUsage,
        cleanup: cleanupTensors,
        getReductionMethod,
        getReductionComponents,
        voiceChat,
        textChat,
        annotationSystem,
        annotationRenderer,
      };

      console.log("💡 Debug API available at window.debugAPI");
      console.log("💡 Try: window.debugAPI.checkDatasets()");
    }

    logSuccess("Post-scene initialization complete!");
    logInfo("🎉 Web App is ready!");
  } catch (error) {
    console.error("Error in post-scene initialization:", error);
  }
}

// ========================================
// Store Sync Setup
// ========================================
async function setupStoreSync() {
  const { useDatasetStore } = await import("./ui/react/store/datasetStore.js");
  const { useInstanceStore } = await import(
    "./ui/react/store/instanceStore.js"
  );

  // Note: Automatic syncing is handled by observers
  console.log("✅ Store sync ready");
}

// ========================================
// Hide old UI elements
// ========================================
function hideOldUI() {
  console.log("🧹 Hiding old UI elements...");

  // Hide old VTK container
  const oldContainer = document.querySelector(".vtk-container");
  if (oldContainer) {
    oldContainer.style.display = "none";
    console.log("✅ Hidden old VTK container");
  }

  // Hide any old control panels
  const controlPanels = document.querySelectorAll(".control-panel");
  controlPanels.forEach((panel) => {
    panel.style.display = "none";
  });

  // Hide elements from old index.html
  const elementsToHide = [
    "leftPanel",
    "rightPanel",
    "collaborationPanel",
    "logsPanel",
    "leftPanelTable",
    "rightPanelTable",
  ];

  elementsToHide.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = "none";
      console.log(`✅ Hidden ${id}`);
    }
  });

  console.log("✅ Old UI elements hidden");
}

// ========================================
// Cleanup on page unload
// ========================================
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cleanupTensors();
    voiceChat.disconnect();
  });
}

// ========================================
// Start the application and mount React Web App
// ========================================
import { mountReactUI } from "./ui/react/index.js";

// Flag to ensure we only initialize once
let appInitialized = false;

// Run pre-scene initialization, then mount React Web App
if (!appInitialized) {
  appInitialized = true;

  initializeApplicationPreScene()
    .then((roomName) => {
      console.log("🎨 Mounting React Web App UI...");

      // Hide old UI first
      hideOldUI();

      // Mount React Web App (which will initialize VTK and then call initializeApplicationPostScene)
      mountReactUI(roomName);

      console.log("🚀 Web App UI mounted - waiting for VTK initialization");
    })
    .catch((error) => {
      console.error("Failed to initialize application:", error);
      appInitialized = false; // Reset on error so it can be retried
    });
}
