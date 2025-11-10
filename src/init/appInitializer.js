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
import { vrModeManager } from "@VR/vrModeManager.js";
import { vrControllers } from "@VR/vrControllers.js";
import { vrAvatarSystem } from "@VR/vrAvatarSystem.js";
import { vrSpatialUI } from "@VR/vrSpatialUI.js";

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
 * Phase 3: Post-Scene Initialization (MINIMAL VERSION)
 *
 * With multi-instance architecture, VTK-dependent systems are initialized
 * per-instance, not globally. This phase now only handles systems that
 * don't require VTK containers.
 *
 * ❌ REMOVED (moved to per-instance initialization):
 * - setupViewportInteraction (needs container)
 * - annotationRenderer.initialize (needs renderer)
 * - cameraSync.initialize (needs camera)
 * - actorSync (needs scene objects)
 *
 * ✅ KEPT (work without VTK):
 * - Cursor system (tracks positions, no container needed)
 * - Dataset orchestrator (coordinates loading)
 */
export function initializePhase3() {
  console.log("🚀 Phase 3: Post-Scene Initialization (Minimal)");

  // Initialize collaborative cursors
  // This tracks cursor positions but doesn't need VTK containers
  import("@Collaboration/presence/cursors.js")
    .then(({ initializeCursorSystem }) => {
      try {
        initializeCursorSystem();
        console.log("✅ Cursor system initialized");
      } catch (error) {
        console.warn("⚠️ Cursor system not available:", error.message);
      }
    })
    .catch((error) => {
      console.warn("⚠️ Could not load cursor system:", error.message);
    });

  // Initialize dataset loading orchestrator
  // This coordinates dataset loading but doesn't need VTK containers
  import("@Core/datasets/datasetLoadingOrchestrator.js")
    .then(({ datasetLoadingOrchestrator }) => {
      try {
        datasetLoadingOrchestrator.initialize();
        console.log("✅ Dataset loading orchestrator initialized");
      } catch (error) {
        console.warn("⚠️ Dataset orchestrator not available:", error.message);
      }
    })
    .catch((error) => {
      console.warn("⚠️ Could not load dataset orchestrator:", error.message);
    });

  console.log("✅ Phase 3 complete - Ready for instances!");
  console.log(
    "💡 Instance-specific systems will initialize when instances are created"
  );
}

/**
 * NEW: Per-Instance Initialization
 *
 * Call this from InstanceViewport after creating a VTK scene.
 * This initializes systems that need VTK scene objects.
 *
 * @param {string} instanceId - The instance ID
 * @param {Object} sceneObjects - VTK scene objects (renderer, renderWindow, etc.)
 */
export function initializeInstanceSystems(instanceId, sceneObjects) {
  console.log(
    `🎨 Initializing VTK-dependent systems for instance: ${instanceId}`
  );

  const { renderer, renderWindow, camera, interactor, openGLRenderWindow } =
    sceneObjects;

  if (!renderer || !renderWindow) {
    console.error(`❌ Invalid scene objects for instance ${instanceId}`);
    return;
  }

  // TODO: Initialize per-instance systems here as needed
  // Examples for future implementation:

  // 1. Instance-specific viewport interaction
  // import("@UI/viewportInteraction.js").then(({ setupInstanceInteraction }) => {
  //   setupInstanceInteraction(instanceId, interactor, renderer);
  // });

  // 2. Instance-specific annotation renderer
  // import("@Collaboration/annotations/annotationRenderer.js").then(({ createInstanceAnnotationRenderer }) => {
  //   createInstanceAnnotationRenderer(instanceId, renderer, renderWindow);
  // });

  // 3. Instance-specific camera sync (if sharing camera)
  // import("@Collaboration/sync/cameraSync.js").then(({ syncInstanceCamera }) => {
  //   syncInstanceCamera(instanceId, camera, renderer);
  // });

  console.log(`✅ Instance systems initialized: ${instanceId}`);
}
