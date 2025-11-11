// src/init/appInitializer.js
// CORRECTLY FIXED VERSION matching your actual folder structure

import { sessionManager } from "@Core/session/sessionManager.js";
import { initializeTensorFlow } from "@Services/tensorflow/tensorflowSetup.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { initializeYjsProvider } from "@Collaboration/yjs/yjsSetup.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";
import { visualizationManager } from "@Core/visualizationManager.js";
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import {
  initializeAllObservers,
  markSystemReady,
} from "@Collaboration/yjs/yjsObservers.js";
import { textChat } from "@Collaboration/communication/textChat.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { runFoundationTests } from "@Tests/core/instanceTypes.test.js";

// Instance type registration
import { registerInstanceTypes } from "@Core/instances/types/instanceTypesInit.js";

// VR imports - these exist in your structure
import { vrModeManager } from "@VR/vrModeManager.js";
import { vrControllers } from "@VR/controllers/vrControllers.js";
import { vrAvatarSystem } from "@VR/avatars/vrAvatarSystem.js";
import { vrSpatialUI } from "@VR/ui/vrSpatialUI.js";

// Enhanced systems that may or may not exist yet
let syncManager = null;
let instanceCollaboration = null;
let instanceTools = null;

/**
 * Phase 1: Pre-React Initialization
 * Initialize core services that don't depend on UI
 */
export async function initializePhase1() {
  console.log("🚀 Phase 1: Core Services Initialization");
  console.log("==================================");

  try {
    // Instance type registration - MUST happen first
    // This makes visualization types (VTK, Plotly, etc.) available
    console.log("📋 Registering instance types...");
    registerInstanceTypes();

    // Session management - critical for room setup
    console.log("📋 Initializing session...");
    sessionManager.initializeFromURL();
    console.log(`✅ Session initialized - Room: ${sessionManager.getRoomId()}`);

    // Data cache - handles file storage
    console.log("💾 Setting up data cache...");
    if (dataCache) {
      if (typeof dataCache.initialize === "function") {
        dataCache.initialize();
        console.log("✅ Data cache initialized");
      } else {
        // The dataCache might auto-initialize on import
        console.log("✅ Data cache ready (auto-initialized)");
      }
    }

    // TensorFlow setup for dimensionality reduction algorithms
    console.log("🧠 Setting up TensorFlow...");
    try {
      if (initializeTensorFlow && typeof initializeTensorFlow === "function") {
        await initializeTensorFlow();
        console.log("✅ TensorFlow ready");
      } else {
        console.warn("⚠️ TensorFlow setup not available");
      }
    } catch (tfError) {
      console.warn("⚠️ TensorFlow initialization failed:", tfError.message);
      console.log("   Continuing without TensorFlow support");
    }

    // Y.js provider for real-time collaboration
    console.log("🔗 Initializing Y.js provider...");
    if (typeof initializeYjsProvider === "function") {
      initializeYjsProvider();
      console.log("✅ Y.js provider connected");
    } else {
      throw new Error("Y.js provider is required for collaboration");
    }

    console.log("✅ Phase 1 complete - Core services ready");
    console.log("");
  } catch (error) {
    console.error("❌ Phase 1 initialization failed:", error);
    throw error;
  }
}

/**
 * Phase 2: Post-Username Initialization
 * Initialize user-dependent services after username is set
 */
export async function initializePhase2() {
  console.log("🚀 Phase 2: User Services Initialization");
  console.log("=====================================");

  try {
    // Presence system for user awareness
    console.log("👥 Initializing presence system...");
    if (presenceSystem && typeof presenceSystem.initialize === "function") {
      presenceSystem.initialize();
      console.log("✅ Presence system ready");
    } else if (
      presenceSystem &&
      typeof presenceSystem.initializePresence === "function"
    ) {
      // Some versions might use initializePresence instead
      presenceSystem.initializePresence();
      console.log("✅ Presence system ready");
    } else {
      console.warn("⚠️ Presence system not available");
    }

    // Data managers for handling datasets and visualizations
    console.log("📦 Initializing data managers...");

    if (datasetManager) {
      if (typeof datasetManager.initialize === "function") {
        datasetManager.initialize();
      }
      console.log("   ✓ Dataset manager ready");
    }

    if (visualizationManager) {
      if (typeof visualizationManager.initialize === "function") {
        visualizationManager.initialize();
      }
      console.log("   ✓ Visualization manager ready");
    }

    if (annotationSystem) {
      if (typeof annotationSystem.initialize === "function") {
        annotationSystem.initialize();
      }
      console.log("   ✓ Annotation system ready");
    }

    console.log("✅ Data managers ready");

    // Y.js observers for real-time sync
    console.log("👁️ Setting up Y.js observers...");
    try {
      if (typeof initializeAllObservers === "function") {
        initializeAllObservers();
      }
      if (typeof markSystemReady === "function") {
        markSystemReady();
      }
      console.log("✅ Y.js observers active");
    } catch (observerError) {
      console.warn(
        "⚠️ Y.js observers setup incomplete:",
        observerError.message
      );
    }

    // Text chat for communication
    console.log("💬 Initializing text chat...");
    if (textChat && typeof textChat.initialize === "function") {
      try {
        textChat.initialize();
        console.log("✅ Text chat ready");
      } catch (chatError) {
        console.warn("⚠️ Text chat failed:", chatError.message);
      }
    } else {
      console.warn("⚠️ Text chat not available");
    }

    // VR systems initialization
    console.log("🥽 Initializing VR systems...");
    let vrInitialized = 0;

    if (vrModeManager && typeof vrModeManager.setupVRDetection === "function") {
      try {
        vrModeManager.setupVRDetection();
        vrInitialized++;
      } catch (e) {
        console.log(`   ⚠️ VR mode manager failed: ${e.message}`);
      }
    }

    if (vrControllers && typeof vrControllers.initialize === "function") {
      try {
        vrControllers.initialize();
        vrInitialized++;
      } catch (e) {
        console.log(`   ⚠️ VR controllers failed: ${e.message}`);
      }
    }

    if (vrAvatarSystem && typeof vrAvatarSystem.initialize === "function") {
      try {
        vrAvatarSystem.initialize();
        vrInitialized++;
      } catch (e) {
        console.log(`   ⚠️ VR avatar system failed: ${e.message}`);
      }
    }

    if (vrSpatialUI && typeof vrSpatialUI.initialize === "function") {
      try {
        vrSpatialUI.initialize();
        vrInitialized++;
      } catch (e) {
        console.log(`   ⚠️ VR spatial UI failed: ${e.message}`);
      }
    }

    if (vrInitialized > 0) {
      console.log(`✅ VR systems ready (${vrInitialized}/4 initialized)`);
    } else {
      console.log("⚠️ No VR systems available");
    }

    // Workspace manager for multi-instance support
    console.log("🎨 Initializing workspace manager...");
    if (workspaceManager && typeof workspaceManager.initialize === "function") {
      workspaceManager.initialize();
      console.log("✅ Workspace manager ready");
    }

    console.log("✅ Phase 2 complete - User services ready");
  } catch (error) {
    console.error("❌ Phase 2 initialization failed:", error);
    throw error;
  }
}

/**
 * Phase 3: Post-React Initialization
 * Initialize optional enhancement systems
 */
export async function initializePhase3() {
  console.log("🚀 Phase 3: Enhanced Systems Initialization");
  console.log("========================================");

  try {
    // Load optional enhanced systems dynamically
    console.log("📦 Loading enhanced systems...");

    // Try to load the sync manager from the sync folder
    try {
      const syncModule = await import("@Collaboration/sync/syncManager.js");
      if (syncModule?.syncManager) {
        syncManager = syncModule.syncManager;
        if (typeof syncManager.initialize === "function") {
          syncManager.initialize();
          console.log("✅ Sync manager initialized");
        }
      }
    } catch (e) {
      console.log("   Sync manager not available");
    }

    // Try to load instance collaboration from perInstance folder
    try {
      const collabModule = await import(
        "@Collaboration/perInstance/instanceCollaboration.js"
      );
      if (collabModule?.instanceCollaboration) {
        instanceCollaboration = collabModule.instanceCollaboration;
        console.log("✅ Instance collaboration loaded");
      }
    } catch (e) {
      console.log("   Instance collaboration not available");
    }

    // Try to load instance tools
    try {
      const toolsModule = await import("@Core/instances/instanceTools.js");
      if (toolsModule?.instanceTools) {
        instanceTools = toolsModule.instanceTools;
        console.log("✅ Instance tools loaded");
      }
    } catch (e) {
      console.log("   Instance tools not available");
    }

    // Set up instance creation hooks if we have enhanced systems
    if (instanceCollaboration || instanceTools) {
      setupInstanceHooks();
      console.log("✅ Instance hooks configured");
    }

    // Set up debug helpers for console access
    setupDebugHelpers();
    console.log("✅ Debug helpers available");

    console.log("✅ Phase 3 complete");
    console.log("🎉 CIA Web fully initialized!");
    console.log("📝 Type CIA.help() for debug commands");
  } catch (error) {
    // Phase 3 errors are non-critical
    console.warn("⚠️ Phase 3 partial failure:", error);
    console.log("Continuing with basic features");
  }
}

/**
 * Set up hooks for instance creation/deletion to add enhanced features
 */
function setupInstanceHooks() {
  if (!workspaceManager) {
    console.log("⚠️ Workspace manager not available for hooks");
    return;
  }

  // Only set up if we have enhanced systems
  if (!instanceCollaboration && !instanceTools) {
    console.log("⚠️ No enhanced systems for instance hooks");
    return;
  }

  // Save original methods
  const originalCreateInstance =
    workspaceManager.createInstance.bind(workspaceManager);
  const originalDeleteInstance =
    workspaceManager.deleteInstance.bind(workspaceManager);

  // Override createInstance to add enhancements
  workspaceManager.createInstance = function (containerElement, options = {}) {
    // Call original method first
    const instanceId = originalCreateInstance(containerElement, options);

    if (!instanceId) return null;

    // Get the created instance
    const instance = workspaceManager.getInstance(instanceId);

    if (instance && instance.sceneObjects) {
      // Add collaboration features if available
      if (instanceCollaboration) {
        try {
          instanceCollaboration.initializeForInstance(
            instanceId,
            instance.sceneObjects
          );
          instanceCollaboration.setCursorTracking(instanceId, true);
          console.log(`🤝 Collaboration enabled for instance: ${instanceId}`);
        } catch (error) {
          console.warn(
            `⚠️ Could not initialize collaboration for ${instanceId}:`,
            error
          );
        }
      }

      // Add tools if available
      if (instanceTools) {
        try {
          instanceTools.initializeTools(instanceId, instance.sceneObjects);
          console.log(`🛠️ Tools enabled for instance: ${instanceId}`);
        } catch (error) {
          console.warn(
            `⚠️ Could not initialize tools for ${instanceId}:`,
            error
          );
        }
      }
    }

    return instanceId;
  };

  // Override deleteInstance to clean up enhancements
  workspaceManager.deleteInstance = function (instanceId) {
    // Clean up enhancements first
    if (instanceCollaboration) {
      try {
        instanceCollaboration.cleanupInstance(instanceId);
      } catch (error) {
        console.warn(
          `⚠️ Error cleaning up collaboration for ${instanceId}:`,
          error
        );
      }
    }

    if (instanceTools) {
      try {
        instanceTools.cleanupTools(instanceId);
      } catch (error) {
        console.warn(`⚠️ Error cleaning up tools for ${instanceId}:`, error);
      }
    }

    // Call original method
    originalDeleteInstance(instanceId);
  };

  console.log("   Instance hooks installed");
}

/**
 * Set up debug helpers for console access
 */
function setupDebugHelpers() {
  if (typeof window !== "undefined") {
    window.CIA = window.CIA || {};

    // Add core managers
    window.CIA.workspaceManager = workspaceManager;
    window.CIA.datasetManager = datasetManager;
    window.CIA.visualizationManager = visualizationManager;
    window.CIA.annotationSystem = annotationSystem;
    window.CIA.dataCache = dataCache;
    window.CIA.presenceSystem = presenceSystem;

    // Add enhanced systems if available
    if (syncManager) window.CIA.syncManager = syncManager;
    if (instanceCollaboration)
      window.CIA.instanceCollaboration = instanceCollaboration;
    if (instanceTools) window.CIA.instanceTools = instanceTools;

    // Helper functions for debugging
    window.CIA.listInstances = () => {
      const ids = workspaceManager.getAllInstanceIds();
      console.log(`📊 Active instances: ${ids.length}`);
      ids.forEach((id) => {
        const inst = workspaceManager.getInstance(id);
        console.log(
          `  • ${id.slice(-8)}: dataset=${inst?.datasetId?.slice(-8) || "none"}`
        );
      });
      return ids;
    };

    window.CIA.listDatasets = () => {
      const datasets = datasetManager.getAllDatasets
        ? datasetManager.getAllDatasets()
        : [];
      if (datasets.length === 0) {
        console.log("No datasets loaded");
        return [];
      }
      console.table(
        datasets.map((d) => ({
          id: d.id?.slice(-8),
          name: d.name,
          points: d.pointCount,
          loaded: !!d.hasPolydata,
        }))
      );
      return datasets;
    };

    window.CIA.help = () => {
      console.log("🔧 CIA Web Debug Commands:");
      console.log("  CIA.listInstances() - List all active instances");
      console.log("  CIA.listDatasets() - List all loaded datasets");
      console.log("  CIA.workspaceManager - Access workspace manager");
      console.log("  CIA.datasetManager - Access dataset manager");
      console.log("  CIA.dataCache - Access data cache");
      console.log("  CIA.presenceSystem - Access presence system");
      if (syncManager) {
        console.log("  CIA.syncManager.forceSyncAll() - Force sync all data");
      }
      if (instanceTools) {
        console.log(
          "  CIA.instanceTools.resetCamera(instanceId) - Reset camera"
        );
      }
      console.log("\nType any command to try it!");
    };
  }
}

/**
 * Main initialization function
 * Call this from your app entry point
 */
export async function initializeCIAWeb() {
  console.log("====================================");
  console.log("🚀 Initializing CIA Web Application");
  console.log("====================================");
  console.log("");

  try {
    await initializePhase1();
    await initializePhase2();
    await initializePhase3();

    console.log("====================================");
    console.log("✅ CIA Web Ready!");
    console.log("Type CIA.help() in console for debug commands");
    console.log("====================================");

    if (process.env.NODE_ENV === "development") {
      window.CIA = window.CIA || {};
      window.CIA.runFoundationTests = runFoundationTests;
    }

    return true;
  } catch (error) {
    console.error("❌ Fatal initialization error:", error);
    return false;
  }
}

// Export everything for flexibility
export default {
  initializePhase1,
  initializePhase2,
  initializePhase3,
  initializeCIAWeb,
};
