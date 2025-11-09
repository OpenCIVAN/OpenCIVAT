// src/init/appInitializer.js

import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import { textChat } from "@Collaboration/communication/textChat.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { markSystemReady } from "@Collaboration/yjs/yjsObservers.js";
import { initializeAllObservers } from "@Collaboration/yjs/yjsObservers.js";
import { initializeYjsProvider } from "@Collaboration/yjs/yjsSetup.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";
import { setupFileHandler } from "@Core/datasets/fileHandler.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { visualizationManager } from "@Core/visualizationManager.js";
import { initializeTensorFlow } from "@Services/tensorflow/tensorflowSetup.js";
import { vrModeManager } from "@VR/vrModeManager";
import { vrControllers } from "@VR/vrControllers";
import { vrAvatarSystem } from "@VR/vrAvatarSystem";
import { vrSpatialUI } from "@VR/vrSpatialUI";

/**
 * Phase 1: Pre-User Initialization
 * Initialize everything that doesn't need user input
 */
export async function initializePhase1() {
  console.log("🚀 Phase 1: Pre-User Initialization");

  // FIRST: Determine which room we're in
  // This must happen before Y.js connects
  const roomId = sessionManager.initializeFromURL();
  console.log(`✅ Session initialized: Room ${roomId}`);

  // Save to localStorage for next visit
  sessionManager.saveCurrentRoomToStorage();

  // Initialize Y.js provider with the correct room
  initializeYjsProvider();

  // Initialize TensorFlow
  const tfReady = await initializeTensorFlow();
  if (!tfReady) {
    console.warn("⚠️ TensorFlow.js not available");
  }

  // Setup file handling (doesn't need username)
  setupFileHandler();

  console.log("✅ Phase 1 complete");

  // Return session info for use by React
  return {
    roomId: sessionManager.getRoomId(),
    roomName: sessionManager.getRoomName(),
  };
}

/**
 * Phase 2: Post-User Initialization
 * Initialize systems that REQUIRE username to exist
 * This is called AFTER the username modal is dismissed
 */
export async function initializePhase2(username) {
  console.log("🚀 Phase 2: Post-User Initialization");
  console.log("🔍 Phase 2 START");
  console.log(`   User: ${username}`);

  // Now that we have username, initialize presence
  presenceSystem.initialize();
  console.log("✅ Presence system initialized");
  console.log("🔍 After presence init");

  // Initialize data managers
  datasetManager.initialize();
  console.log("🔍 After dataset manager init");
  visualizationManager.initialize();
  console.log("🔍 After visualization manager init");
  annotationSystem.initialize();
  console.log("🔍 After annotation system init");
  console.log("✅ Data systems initialized");

  // Initialize Y.js observers
  // These can now properly filter by user ID
  initializeAllObservers();
  console.log("✅ Y.js observers initialized");
  console.log("🔍 After observers init");

  // Mark system ready to process remote datasets
  markSystemReady();
  console.log("✅ System marked as ready");
  console.log("🔍 After mark system ready");

  // Initialize text chat
  textChat.initialize();
  console.log("✅ Text chat initialized");

  // Initialize VR systems (non-blocking)
  try {
    vrModeManager.setupVRDetection();
    vrControllers.initialize();
    vrAvatarSystem.initialize();
    vrSpatialUI.initialize();
    console.log("✅ VR systems initialized");
  } catch (error) {
    console.warn("⚠️ VR systems not available:", error.message);
  }
  console.log("🔍 Phase 2 COMPLETE");
  console.log("✅ Phase 2 complete - Application ready!");
}

/**
 * Phase 3: Post-Scene Initialization
 * Initialize systems that need VTK scene to exist
 * This is called AFTER VTK scene is created
 */
export function initializePhase3() {
  console.log("🚀 Phase 3: Post-Scene Initialization");

  // Initialize collaborative cursors
  import("@Collaboration/presence/cursors.js").then(
    ({ initializeCursorSystem }) => {
      initializeCursorSystem();
    }
  );

  // Setup viewport interaction
  import("@UI/viewportInteraction.js").then(({ setupViewportInteraction }) => {
    setupViewportInteraction();
  });

  // Initialize camera sync - but this needs refactoring too
  // for multi-instance (each instance should have independent camera)
  import("@Collaboration/sync/cameraSync.js").then(({ cameraSync }) => {
    // TODO: Refactor camera sync to work per-instance
    // For now, comment out to avoid conflicts
    // cameraSync.initialize();
  });

  // Initialize annotation renderer (needs VTK scene)
  setTimeout(() => {
    import("@Collaboration/annotations/annotationRenderer.js").then(
      ({ annotationRenderer }) => {
        annotationRenderer.initialize();
      }
    );
  }, 500);

  // Initialize dataset loading orchestrator
  import("@Core/datasets/datasetLoadingOrchestrator.js").then(
    ({ datasetLoadingOrchestrator }) => {
      datasetLoadingOrchestrator.initialize();
    }
  );

  console.log("✅ Phase 3 complete - Scene ready!");
}
