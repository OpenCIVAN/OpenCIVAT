import { sessionManager } from "@Core/session/sessionManager.js";
import { initializeTensorFlow } from "@Services/tensorflow/tensorflowSetup.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { initializeYjsProvider } from "@Collaboration/yjs/yjsSetup.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

// Data architecture
import { DatasetManagerAdapter } from "@Core/data/managers/DatasetManagerAdapter.js";
import { DatasetManager } from "@Core/data/managers/DatasetManager.js";

// Collaboration systems
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";
import {
  initializeAllObservers,
  markSystemReady,
} from "@Collaboration/yjs/yjsObservers.js";
import { textChat } from "@Collaboration/communication/textChat.js";

// Instance management
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { registerInstanceTypes } from "@Core/instances/types/instanceTypesInit.js";

// Testing
import { runFoundationTests } from "@Tests/core/instanceTypes.test.js";
// At the top of appInitializer.js, add this export after initialization
export { datasetManager };

// ⭐ NEW: Global references to new architecture components
let datasetManager = null; // Will be the NEW DatasetManager instance
let dataCacheAdapter = null; // Adapter that bridges dataCache to DatasetManager

/**
 * Phase 1: Pre-User Initialization
 *
 * Initializes core services that don't depend on user identity.
 * These are the foundational systems that everything else builds on.
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

    // STEP 3: Data storage layer
    // Sets up the three-layer data architecture:
    // dataCache → DatasetManagerAdapter → DatasetManager
    console.log("💾 Setting up data storage layer...");

    if (dataCache) {
      if (typeof dataCache.initialize === "function") {
        await dataCache.initialize();
        console.log("  ✓ Data cache initialized");
      } else {
        console.log("  ✓ Data cache ready (auto-initialized)");
      }
    }

    console.log("  Creating cache adapter...");
    dataCacheAdapter = new DatasetManagerAdapter(dataCache);
    await dataCacheAdapter.initialize();
    console.log("  ✓ Cache adapter ready");

    console.log("  Creating dataset manager...");
    datasetManager = new DatasetManager();
    await datasetManager.initialize(dataCacheAdapter);
    console.log("  ✓ Dataset manager ready");

    console.log("✅ Data storage layer complete");

    // STEP 4: TensorFlow setup
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

    // STEP 5: Y.js provider
    // Required for real-time collaboration
    console.log("🔗 Initializing Y.js provider...");
    if (typeof initializeYjsProvider === "function") {
      initializeYjsProvider();
      console.log("✅ Y.js provider connected");
    } else {
      throw new Error("Y.js provider is required for collaboration");
    }

    // STEP 6: Debug helpers
    setupDebugHelpers();
    console.log("✅ Debug helpers available");

    console.log("✅ Phase 1 complete - Core services ready");
    console.log("");
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
    // STEP 1: Presence system
    // Tracks which users are in the room and their activities
    console.log("👥 Initializing presence system...");
    if (presenceSystem && typeof presenceSystem.initialize === "function") {
      presenceSystem.initialize();
      console.log("✅ Presence system ready");
    } else if (
      presenceSystem &&
      typeof presenceSystem.initializePresence === "function"
    ) {
      presenceSystem.initializePresence();
      console.log("✅ Presence system ready");
    } else {
      console.warn("⚠️ Presence system not available");
    }

    // STEP 2: Data managers
    // DatasetManager was initialized in Phase 1, confirm it's ready
    console.log("📦 Confirming data managers...");
    console.log("   ✓ Dataset manager ready (initialized in Phase 1)");

    // Annotation system for collaborative annotations
    if (annotationSystem) {
      if (typeof annotationSystem.initialize === "function") {
        annotationSystem.initialize();
      }
      console.log("   ✓ Annotation system ready");
    }

    console.log("✅ Data managers ready");

    // STEP 3: Y.js observers
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

    // STEP 4: Text chat
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

    // STEP 5: Workspace manager
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
 * TO ENABLE THIS PHASE:
 * 1. Implement the systems it references
 * 2. Test each system independently
 * 3. Uncomment and test the integration
 *
 * SYSTEMS TO IMPLEMENT:
 * - syncManager: Advanced synchronization beyond Y.js basics
 * - instanceCollaboration: Per-instance collaborative features
 * - VTK instance tools: Widget management, measurements, clipping
 */
export async function initializePhase3() {
  console.log("🚀 Phase 3: Enhanced Systems (Currently Disabled)");
  console.log("================================================");
  console.log(
    "⚠️ Phase 3 is disabled until enhancement systems are implemented"
  );
  console.log("   See comments in appInitializer.js for details");

  // Phase 3 would go here when systems are ready

  console.log("✅ Phase 3 complete (no optional systems loaded)");
}

/* ============================================================================
 * PHASE 3 IMPLEMENTATION (Commented out - enable when systems are ready)
 * ============================================================================
 
export async function initializePhase3() {
  console.log("🚀 Phase 3: Enhanced Systems Initialization");
  console.log("========================================");

  try {
    let syncManager = null;
    let instanceCollaboration = null;
    let vtkInstanceTools = null;

    console.log("📦 Loading enhanced systems...");

    // Try to load sync manager
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

    // Try to load instance collaboration
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

    // Try to load VTK instance tools
    try {
      const toolsModule = await import(
        "@Core/instances/types/vtk/VTKInstanceTools.js"
      );
      if (toolsModule?.vtkInstanceTools) {
        vtkInstanceTools = toolsModule.vtkInstanceTools;
        console.log("✅ VTK instance tools loaded");
      }
    } catch (e) {
      console.log("   VTK instance tools not available");
    }

    // Set up instance hooks if we have enhanced systems
    if (instanceCollaboration || vtkInstanceTools) {
      setupInstanceHooks(instanceCollaboration, vtkInstanceTools);
      console.log("✅ Instance hooks configured");
    }

    console.log("✅ Phase 3 complete");
  } catch (error) {
    console.warn("⚠️ Phase 3 partial failure:", error);
    console.log("Continuing with basic features");
  }
}

/**
 * Set up debug helpers for console access
 */
function setupDebugHelpers() {
  if (typeof window !== "undefined") {
    window.CIA = window.CIA || {};

    // Expose core systems
    window.CIA.datasetManager = datasetManager;
    window.CIA.dataCacheAdapter = dataCacheAdapter;
    window.CIA.dataCache = dataCache;
    window.CIA.workspaceManager = workspaceManager;
    window.CIA.annotationSystem = annotationSystem;
    window.CIA.presenceSystem = presenceSystem;

    // Helper functions
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
      const datasets = datasetManager.getAllDatasets();
      if (datasets.length === 0) {
        console.log("No datasets loaded");
        return [];
      }
      console.table(
        datasets.map((d) => ({
          id: d.id?.slice(-8),
          filename: d.filename,
          fileType: d.metadata?.fileType,
          annotations: d.annotations?.length || 0,
          analyzed: d.isAnalyzed(),
        }))
      );
      return datasets;
    };

    window.CIA.cacheStats = async () => {
      const stats = await dataCacheAdapter.getStats();
      console.log("📊 Cache Statistics:");
      console.log(`  Total files: ${stats.count}`);
      console.log(
        `  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`
      );
      console.table(stats.files);
      return stats;
    };

    window.CIA.help = () => {
      console.log("🔧 CIA Web Debug Commands:");
      console.log("  CIA.listInstances() - List all active instances");
      console.log("  CIA.listDatasets() - List all loaded datasets");
      console.log("  CIA.cacheStats() - Show cache statistics");
      console.log("  CIA.datasetManager - Access dataset manager");
      console.log("  CIA.workspaceManager - Access workspace manager");
      console.log("  CIA.presenceSystem - Access presence system");
      console.log("\nType any command to try it!");
    };
  }
}

function setupInstanceHooks(instanceCollaboration, vtkInstanceTools) {
  // Hook implementation would go here
  // This would enhance workspaceManager.createInstance and deleteInstance
  // to automatically initialize/cleanup enhanced features
}

/**
 * Main initialization function
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
