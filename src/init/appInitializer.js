// src/init/appInitializer.js
// Application initialization - three-phase startup

import { initializeStorageProvider } from "@Core/config/storage.js";
import { DatasetManager } from "@Core/data/managers/DatasetManager.js";
import { ViewConfigurationManager } from "@Core/data/managers/ViewConfigurationManager.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { registerInstanceTypes } from "@Core/instances/types/instanceTypesInit.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { initializeTensorFlow } from "@Services/tensorflow/tensorflowSetup.js";
import { initializeYjsProvider } from "@Collaboration/yjs/yjsSetup.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { textChat } from "@Collaboration/communication/textChat.js";
import {
  initializeAllObservers,
  markSystemReady,
} from "@Collaboration/yjs/yjsObservers.js";

// ✅ NEW: Import annotation system
// We'll initialize this in Phase 2 after DatasetManager is ready
let annotationManager = null;

// Global references (exported for use throughout the app)
export let datasetManager = null;
export let dataCacheAdapter = null;
export let viewConfigurationManager = null;

/**
 * Phase 1: Core Services Initialization
 *
 * These are the foundational systems that everything else builds on.
 * No user authentication required yet.
 */
export async function initializePhase1() {
  console.log("🚀 Phase 1: Core Services Initialization");
  console.log("==================================");

  try {
    // STEP 1: Register instance types
    // This MUST happen first so handlers are available when needed
    console.log("📋 Registering instance types...");
    registerInstanceTypes();

    // STEP 2: Session management
    // Sets up room ID from URL for collaboration
    console.log("📋 Initializing session...");
    sessionManager.initializeFromURL();
    console.log(`✅ Session initialized - Room: ${sessionManager.getRoomId()}`);

    // STEP 3: Data storage layer (Layer 1)
    console.log("💾 Setting up data storage layer...");

    // Initialize storage provider (with automatic fallback)
    const { provider: storageProvider, mode: storageMode } =
      await initializeStorageProvider();

    // Create dataset manager WITH the storage provider
    console.log("  Creating dataset manager (Layer 1)...");
    datasetManager = new DatasetManager(storageProvider);
    await datasetManager.initialize();
    console.log("  ✓ Dataset manager ready");

    // Sync from server if we're in server mode
    if (storageMode === "server") {
      try {
        await datasetManager.syncDatasetsFromServer();
        console.log("  ✓ Synced datasets from server");
      } catch (error) {
        console.warn("  ⚠️ Failed to sync from server:", error.message);
        console.warn("  Continuing with local datasets only...");
      }
    }

    console.log("✅ Data storage layer complete");
    console.log(`   Storage mode: ${storageMode}`);

    // STEP 4: View Configuration layer (Layer 2)
    console.log("📋 Setting up view configuration layer...");
    viewConfigurationManager = new ViewConfigurationManager();
    console.log("  ✓ View configuration manager ready");
    console.log("✅ View configuration layer complete");

    // STEP 5: TensorFlow setup
    // Needed for dimensionality reduction algorithms (PCA, t-SNE, UMAP)
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

    // STEP 6: Y.js provider
    // Required for real-time collaboration
    console.log("🔗 Initializing Y.js provider...");
    if (typeof initializeYjsProvider === "function") {
      initializeYjsProvider();
      console.log("✅ Y.js provider connected");
    } else {
      throw new Error("Y.js provider is required for collaboration");
    }

    // Sync existing datasets now that Y.js is ready
    console.log("🔄 Syncing existing datasets to Y.js...");
    datasetManager.syncAllDatasetsToYjs();

    // STEP 7: Initialize ViewConfigurationManager AFTER Y.js is ready
    console.log("🔗 Initializing view configuration sync...");
    viewConfigurationManager.initialize();
    console.log("✅ View configuration sync ready");

    // STEP 8: Debug helpers
    setupDebugHelpers();
    console.log("✅ Debug helpers available");

    console.log("✅ Phase 1 complete - Core services ready");
  } catch (error) {
    console.error("❌ Phase 1 initialization failed:", error);
    throw error;
  }
}

/**
 * Phase 2: Post-User Initialization
 *
 * Initializes services that depend on user identity (username, userId).
 * User must be authenticated before this phase runs.
 */
export async function initializePhase2() {
  console.log("🚀 Phase 2: User Services Initialization");
  console.log("=====================================");

  try {
    // STEP 1: Wait for Y.js to sync
    console.log("⏳ Checking Y.js sync status...");
    const synced = await waitForYjsSync();
    if (synced) {
      console.log("✅ Y.js already synced");
    } else {
      console.warn("⚠️ Y.js sync timeout, continuing anyway");
    }

    // STEP 2: Presence system
    // Tracks which users are in the room and their activities
    console.log("👥 Initializing presence system...");
    if (presenceSystem && typeof presenceSystem.initialize === "function") {
      presenceSystem.initialize();
      console.log("✅ Presence system ready");
      // Note: Presence system logs its own status, we don't need to query it here
    } else if (
      presenceSystem &&
      typeof presenceSystem.initializePresence === "function"
    ) {
      presenceSystem.initializePresence();
      console.log("✅ Presence system ready");
    } else {
      console.warn("⚠️ Presence system not available");
    }

    // STEP 3: Data managers
    // DatasetManager was initialized in Phase 1, confirm it's ready
    console.log("📦 Confirming data managers...");
    console.log("   ✓ Dataset manager ready (initialized in Phase 1)");

    // ✅ NEW: Initialize annotation system
    console.log("📍 Initializing annotation system...");
    try {
      // Dynamically import to avoid circular dependencies
      const { initializeAnnotationManager } = await import(
        "@Core/data/managers/AnnotationManager.js"
      );
      annotationManager = initializeAnnotationManager(datasetManager);
      console.log("   ✓ Annotation system ready");
    } catch (annotError) {
      console.warn("⚠️ Annotation system failed to initialize:", annotError);
    }

    console.log("✅ Data managers ready");

    // STEP 4: Y.js observers
    // Set up observers for real-time data sync
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

    // STEP 5: Text chat
    // Real-time text communication between users
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

    // STEP 6: Workspace manager
    // Manages multiple visualization instances
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
 * Phase 3: Enhanced Systems (CURRENTLY DISABLED)
 *
 * This phase was designed to load optional enhancement systems that
 * extend core functionality. These systems don't exist yet, so this
 * phase is commented out.
 *
 * Future systems to add here:
 * - Advanced VR features (spatial UI, controller mapping)
 * - Plugin system for custom visualizations
 * - Advanced collaboration features (screen sharing, co-editing)
 * - Cloud sync and backup
 * - Analytics and telemetry
 */
export async function initializePhase3() {
  console.log("🚀 Phase 3: Enhanced Systems (Currently Disabled)");
  console.log("================================================");
  console.log(
    "⚠️ Phase 3 is disabled until enhancement systems are implemented"
  );
  console.log("   See comments in appInitializer.js for details");

  // When ready, uncomment and implement:
  // await initializeVREnhancements();
  // await initializePluginSystem();
  // await initializeCloudSync();

  console.log("✅ Phase 3 complete (no optional systems loaded)");
}

/**
 * Wait for Y.js to synchronize with the server
 * Returns a promise that resolves when synced or times out
 */
function waitForYjsSync(timeoutMs = 2000) {
  return new Promise((resolve) => {
    // Import provider dynamically to avoid circular dependency
    import("@Collaboration/yjs/yjsSetup.js").then(({ provider }) => {
      // Check if already synced
      if (provider.synced) {
        resolve(true);
        return;
      }

      console.log("⏳ Waiting for Y.js sync before Phase 2...");

      // Set up sync listener
      const handleSync = (synced) => {
        if (synced) {
          provider.off("sync", handleSync);
          clearTimeout(timeout);
          resolve(true);
        }
      };

      provider.on("sync", handleSync);

      // Timeout fallback
      const timeout = setTimeout(() => {
        provider.off("sync", handleSync);
        resolve(false);
      }, timeoutMs);
    });
  });
}

/**
 * Set up debug helpers in window.CIA for console debugging
 */
function setupDebugHelpers() {
  if (typeof window === "undefined") return;

  window.CIA = window.CIA || {};

  // Expose managers and providers for debugging
  window.CIA.datasetManager = datasetManager;
  window.CIA.viewConfigurationManager = viewConfigurationManager;
  window.CIA.workspaceManager = workspaceManager;
  window.CIA.sessionManager = sessionManager;

  // For debugging only - expose the internal storage provider
  // This violates encapsulation but is useful for development
  if (process.env.NODE_ENV === "development") {
    Object.defineProperty(window.CIA, "storageProvider", {
      get() {
        // Access it through the datasetManager
        return datasetManager?.storageProvider;
      },
      enumerable: false, // Don't show it in console autocomplete
    });
  }

  // Helper functions
  window.CIA.help = function () {
    console.log(`
=== CIA Web Debug Helpers ===

Managers:
  CIA.datasetManager          - Dataset management
  CIA.viewConfigurationManager - View configuration management
  CIA.workspaceManager        - Instance management
  CIA.sessionManager          - Session management

Commands:
  CIA.help()                  - Show this help
  CIA.info()                  - Show system info
  CIA.listDatasets()          - List all datasets
  CIA.listViews()             - List all view configurations
  CIA.listInstances()         - List all instances
  CIA.getDataset(id)          - Get dataset by ID
  CIA.getView(id)             - Get view by ID
  CIA.getInstance(id)         - Get instance by ID

Examples:
  CIA.info()
  CIA.listDatasets()
  CIA.getDataset('dataset_123')
    `);
  };

  window.CIA.info = function () {
    const info = {
      room: sessionManager.getRoomId(),
      datasets: datasetManager?.getAllDatasets()?.length || 0,
      views: viewConfigurationManager?.getActiveViews()?.length || 0,
      instances: workspaceManager?.getInstanceCount() || 0,
    };
    console.log("=== System Info ===");
    console.log(`Room: ${info.room}`);
    console.log(`Datasets: ${info.datasets}`);
    console.log(`Active Views: ${info.views}`);
    console.log(`Instances: ${info.instances}`);
    return info;
  };

  window.CIA.listDatasets = function () {
    const datasets = datasetManager?.getAllDatasets() || [];
    console.log(`=== Datasets (${datasets.length}) ===`);
    datasets.forEach((ds) => {
      console.log(`  ${ds.id}: ${ds.filename}`);
      console.log(`    Points: ${ds.metadata.pointCount || "unknown"}`);
      console.log(`    Annotations: ${ds.annotations?.length || 0}`);
    });
    return datasets;
  };

  window.CIA.listViews = function () {
    const views = viewConfigurationManager?.getActiveViews() || [];
    console.log(`=== Active Views (${views.length}) ===`);
    views.forEach((view) => {
      console.log(`  ${view.id}: ${view.name}`);
      console.log(`    Dataset: ${view.datasetId}`);
      console.log(`    Active Instances: ${view.activeInstanceCount}`);
    });
    return views;
  };

  window.CIA.listInstances = function () {
    const instanceIds = workspaceManager?.getAllInstanceIds() || [];
    console.log(`=== Instances (${instanceIds.length}) ===`);
    instanceIds.forEach((id) => {
      const instance = workspaceManager.getInstance(id);
      console.log(`  ${id}:`);
      console.log(`    Type: ${instance.type}`);
      console.log(`    Dataset: ${instance.datasetId || "none"}`);
    });
    return instanceIds;
  };

  window.CIA.getDataset = function (id) {
    return datasetManager?.getDataset(id);
  };

  window.CIA.getView = function (id) {
    return viewConfigurationManager?.getView(id);
  };

  window.CIA.getInstance = function (id) {
    return workspaceManager?.getInstance(id);
  };

  console.log("✅ Debug helpers available");
  console.log("   Type CIA.help() for available commands");
}

// Export annotation manager getter (since it's created in Phase 2)
export function getAnnotationManager() {
  return annotationManager;
}
