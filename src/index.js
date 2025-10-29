// ----------------------------------------------------------------------------
// Application Initialization
// ----------------------------------------------------------------------------

// For streamlined VR development install the WebXR emulator extension
// https://github.com/MozillaReality/WebXR-emulator-extension

import { voiceChat } from './collaboration/voiceChat.js';
import { getUserName, setupUserName } from './collaboration/userManagement.js';

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
import { addVoiceChatControls } from "./ui/voiceChatControls.js";
import { initializeCursorSystem } from "./collaboration/cursors.js";
import { setupActorSync } from "./collaboration/actorSync.js";
import { setupReductionSync } from "./collaboration/reductionSync.js";
import { toggleDimensionalityReduction } from "./core/reductionController.js";
import { setupViewportInteraction } from "./ui/viewportInteraction.js";

// Get room name from URL or use default
function getRoomName() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || 'default-analytics-room';
}

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

  // Get room name for collaboration
  const roomName = getRoomName();
  logProgress(`Joining room: ${roomName}`);

  // Setup user name BEFORE connecting to Yjs and voice chat
  await setupUserName();
  logProgress("User name configured");

    // Note: Yjs is already connected via imports in other modules
  // The WebsocketProvider connects automatically when yjsSetup.js is imported
  logProgress("✅ Yjs collaboration ready");

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
      
      addVoiceChatControls(roomName);  // Pass roomName here!
      logProgress("Voice chat controls added");
    } catch (error) {
      console.warn("Could not add controls:", error);
    }
  }, 1000);


  // Voice chat will connect when user clicks "Join Voice Chat" button
  logProgress("Voice chat ready - click 'Join Voice Chat' to connect");

  // Adding click to connect voice chat directly on load is not user-friendly
  // // Connect to voice chat AFTER user name is set
  // try {
  //   const userName = getUserName();
  //   await voiceChat.connect(roomName, userName);
  //   logProgress("✅ Voice chat connected");
  // } catch (error) {
  //   console.warn("Voice chat failed to connect:", error);
  //   // Non-blocking - app continues without voice
  // }

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
  logInfo(`Load a VTP file to get started! Room: ${roomName}`);
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  voiceChat.disconnect();
});