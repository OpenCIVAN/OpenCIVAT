// src/init/appInitializer.js
// Application initialization - three-phase startup
//
// v2.0 ARCHITECTURE:
// - Server is source of truth for datasets, views, annotations
// - Y.js is used only for presence (cursors, avatars, view presence)
// - WebSocket broadcasts keep clients in sync without polling
import {
  yViews,
  yDatasets,
  yAnnotations,
  yWorkspaceLayouts,
  initializeYjsProvider,
} from "@Collaboration/yjs/yjsSetup.js";
import { initializeStorageProvider } from "@Core/config/storage.js";
import { DatasetManager } from "@Core/data/managers/DatasetManager.js";
import { ViewConfigurationManager } from "@Core/data/managers/ViewConfigurationManager.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { registerInstanceTypes } from "@Core/instances/types/instanceTypesInit.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { initializeTensorFlow } from "@Services/tensorflow/tensorflowSetup.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import { textChat } from "@Collaboration/communication/textChat.js";
import {
  initializeAllObservers,
  markSystemReady,
  clearAllYjsDatasets,
} from "@Collaboration/yjs/yjsObservers.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { config } from "@Core/config/clientConfig.js";
import { app as log } from "@Utils/logger.js";

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
  log.info("Phase 1: Core Services Initialization");
  log.info("==================================");

  try {
    // STEP 1: Register instance types
    // This MUST happen first so handlers are available when needed
    log.info("Registering instance types...");
    registerInstanceTypes();

    // STEP 2: Session management
    // Sets up room ID from URL for collaboration
    log.info("Initializing session...");
    sessionManager.initializeFromURL();
    log.info(`Session initialized - Room: ${sessionManager.getRoomId()}`);

    // STEP 3: Data storage layer (Layer 1)
    log.info("Setting up data storage layer...");

    // Initialize storage provider (with automatic fallback)
    const { provider: storageProvider, mode: storageMode } =
      await initializeStorageProvider();

    // Create dataset manager WITH the storage provider
    log.info("Creating dataset manager (Layer 1)...");
    datasetManager = new DatasetManager(storageProvider);
    await datasetManager.initialize();
    log.info("Dataset manager ready");

    // Initialize server sync (WebSocket for real-time updates)
    try {
      const { serverSync } = await import("@Services/serverSync.js");
      serverSync.initialize(datasetManager);
      log.info("Server sync connected");
    } catch (syncError) {
      log.warn("Server sync failed:", syncError.message);
    }

    // v2.0: Sync from server API (primary source of truth)
    if (storageMode === "server" || config.useServerStorage) {
      try {
        log.info("Fetching datasets from server API...");
        await fetchDatasetsFromServer();
        log.info("Synced datasets from server");
      } catch (error) {
        log.warn("Failed to fetch from server:", error.message);
        log.warn("Continuing with local datasets only...");
        // Fallback to legacy sync method
        try {
          await datasetManager.syncDatasetsFromServer();
        } catch (legacyError) {
          log.warn("Legacy sync also failed:", legacyError.message);
        }
      }
    }

    log.info("Data storage layer complete");
    log.info(`Storage mode: ${storageMode}`);

    // STEP 4: View Configuration layer (Layer 2)
    log.info("Setting up view configuration layer...");
    viewConfigurationManager = new ViewConfigurationManager();
    log.info("View configuration manager ready");
    log.info("View configuration layer complete");

    // STEP 5: TensorFlow setup
    // Needed for dimensionality reduction algorithms (PCA, t-SNE, UMAP)
    log.info("Setting up TensorFlow...");
    try {
      if (initializeTensorFlow && typeof initializeTensorFlow === "function") {
        await initializeTensorFlow();
        log.info("TensorFlow ready");
      } else {
        log.warn("TensorFlow setup not available");
      }
    } catch (tfError) {
      log.warn("TensorFlow initialization failed:", tfError.message);
      log.info("Continuing without TensorFlow support");
    }

    // STEP 6: Y.js provider
    // Required for real-time presence (cursors, avatars)
    // NOTE v2.0: Y.js is now for presence only, not state sync
    log.info("Initializing Y.js provider (presence only)...");
    if (typeof initializeYjsProvider === "function") {
      initializeYjsProvider();
      log.info("Y.js provider connected (presence layer)");
    } else {
      throw new Error("Y.js provider is required for presence");
    }

    // DEPRECATED v2.0: Y.js state sync
    // State comes from server now, not Y.js
    // Keeping this for backward compatibility during migration
    log.info(
      "DEPRECATED: Syncing datasets to Y.js (for backward compatibility)..."
    );
    datasetManager.syncAllDatasetsToYjs();
    log.info("Note: In v2.0, state should come from server API");

    // STEP 7: Initialize ViewConfigurationManager AFTER Y.js is ready
    log.info("Initializing view configuration manager...");
    viewConfigurationManager.initialize();
    log.info("View configuration manager ready");

    // Wire up ViewConfigurationManager to receive WebSocket broadcasts
    try {
      const { serverSync } = await import("@Services/serverSync.js");
      serverSync.setViewConfigurationManager(viewConfigurationManager);
      log.info("ViewConfigurationManager wired to server sync");
    } catch (error) {
      log.warn(
        "Failed to wire ViewConfigurationManager to server sync:",
        error.message
      );
    }

    // v2.0: Load views from server API (primary source of truth)
    if (storageMode === "server" || config.useServerStorage) {
      try {
        log.info("Fetching views from server API...");
        await viewConfigurationManager.loadFromServer();
        log.info("Synced views from server");
      } catch (error) {
        log.warn("Failed to fetch views from server:", error.message);
        log.warn("Views will be created as needed");
      }
    }

    // STEP 8: Debug helpers
    setupDebugHelpers();
    log.info("Debug helpers available");

    log.info("Phase 1 complete - Core services ready");
  } catch (error) {
    log.error("Phase 1 initialization failed:", error);
    throw error;
  }

  // Make Y.js maps globally accessible for debugging
  window.CIA = window.CIA || {};
  window.CIA.yViews = yViews;
  window.CIA.yDatasets = yDatasets;
  window.CIA.yAnnotations = yAnnotations;
  window.CIA.yWorkspaceLayouts = yWorkspaceLayouts;

  // Utility functions for debugging/cleanup
  window.CIA.clearYjsDatasets = clearAllYjsDatasets;
  log.info("Debug: Use window.CIA.clearYjsDatasets() to clear stale Y.js data");
}

/**
 * Phase 2: Post-User Initialization
 *
 * Initializes services that depend on user identity (username, userId).
 * User must be authenticated before this phase runs.
 */
export async function initializePhase2() {
  log.info("Phase 2: User Services Initialization");
  log.info("=====================================");

  try {
    // STEP 1: Wait for Y.js to sync
    log.info("Checking Y.js sync status...");
    const synced = await waitForYjsSync();
    if (synced) {
      log.info("Y.js already synced");
    } else {
      log.warn("Y.js sync timeout, continuing anyway");
    }

    // STEP 2: Presence system
    // Tracks which users are in the room and their activities
    log.info("👥 Initializing presence system...");
    if (presenceSystem && typeof presenceSystem.initialize === "function") {
      presenceSystem.initialize();
      log.info("Presence system ready");
      // Note: Presence system logs its own status, we don't need to query it here
    } else if (
      presenceSystem &&
      typeof presenceSystem.initializePresence === "function"
    ) {
      presenceSystem.initializePresence();
      log.info("Presence system ready");
    } else {
      log.warn("Presence system not available");
    }

    // STEP 3: Data managers
    // DatasetManager was initialized in Phase 1, confirm it's ready
    log.info("Confirming data managers...");
    log.info("Dataset manager ready (initialized in Phase 1)");

    // ✅ NEW: Initialize annotation system
    log.info("Initializing annotation system...");
    try {
      // Dynamically import to avoid circular dependencies
      const { initializeAnnotationManager } = await import(
        "@Core/data/managers/AnnotationManager.js"
      );
      annotationManager = initializeAnnotationManager(datasetManager);
      log.info("Annotation system ready");
    } catch (annotError) {
      log.warn("Annotation system failed to initialize:", annotError);
    }

    log.info("Data managers ready");

    useDatasetStore.getState().initialize(datasetManager);

    // STEP 4: Y.js observers
    // Set up observers for real-time data sync
    log.info("Setting up Y.js observers...");
    try {
      if (typeof initializeAllObservers === "function") {
        initializeAllObservers();
      }
      if (typeof markSystemReady === "function") {
        markSystemReady();
      }
      log.info("Y.js observers active");
    } catch (observerError) {
      log.warn("Y.js observers setup incomplete:", observerError.message);
    }

    // STEP 6: Cursor system
    log.info("Initializing cursor system...");
    try {
      const { initializeCursorTracking } = await import(
        "@Collaboration/presence/cursors.js"
      );
      initializeCursorTracking();
      log.info("Cursor tracking active");
    } catch (cursorError) {
      log.warn("Cursor system failed to initialize:", cursorError);
    }

    // STEP 7: Text chat
    // Real-time text communication between users
    log.info("Initializing text chat...");
    if (textChat && typeof textChat.initialize === "function") {
      try {
        textChat.initialize();
        log.info("Text chat ready");
      } catch (chatError) {
        log.warn("Text chat failed:", chatError.message);
      }
    } else {
      log.warn("Text chat not available");
    }

    // STEP 8: Workspace manager
    // Manages multiple visualization instances
    log.info("Initializing workspace manager...");
    if (workspaceManager && typeof workspaceManager.initialize === "function") {
      workspaceManager.initialize();
      log.info("Workspace manager ready");
    }

    log.info("Phase 2 complete - User services ready");
  } catch (error) {
    log.error("Phase 2 initialization failed:", error);
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
  log.info("Phase 3: Enhanced Systems (Currently Disabled)");
  log.info("================================================");
  log.info("Phase 3 is disabled until enhancement systems are implemented");
  log.info("See comments in appInitializer.js for details");

  // When ready, uncomment and implement:
  // await initializeVREnhancements();
  // await initializePluginSystem();
  // await initializeCloudSync();

  log.info("Phase 3 complete (no optional systems loaded)");
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

      log.info("Waiting for Y.js sync before Phase 2...");

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
  window.CIA.help = () => {
    log.info(`
╔════════════════════════════════════════════════════════════════╗
║                    CIA Web Debug Commands                      ║
╠════════════════════════════════════════════════════════════════╣
║  CIA.status()                  - Show system status            ║
║  CIA.listDatasets()            - List all datasets             ║
║  CIA.listViews()               - List all view configurations  ║
║  CIA.getDataset(id)            - Inspect a dataset             ║
║  CIA.getView(id)               - Inspect a view configuration  ║
║  CIA.getInstance(id)           - Inspect an instance window    ║
║                                                                ║
║  Direct Y.js Access:                                           ║
║  CIA.yDatasets                 - Y.js datasets map             ║
║  CIA.yViews                    - Y.js views map                ║
║  CIA.yAnnotations              - Y.js annotations map          ║
║                                                                ║
║  Managers:                                                     ║
║  CIA.datasetManager            - Dataset manager instance      ║
║  CIA.viewConfigurationManager  - View configuration manager    ║
║  CIA.instanceManager           - Instance manager              ║
╚════════════════════════════════════════════════════════════════╝
  `);
  };

  window.CIA.info = function () {
    const info = {
      room: sessionManager.getRoomId(),
      datasets: datasetManager?.getAllDatasets()?.length || 0,
      views: viewConfigurationManager?.getActiveViews()?.length || 0,
      instances: workspaceManager?.getInstanceCount() || 0,
    };
    log.info("=== System Info ===");
    log.info(`Room: ${info.room}`);
    log.info(`Datasets: ${info.datasets}`);
    log.info(`Active Views: ${info.views}`);
    log.info(`Instances: ${info.instances}`);
    return info;
  };

  window.CIA.listDatasets = function () {
    const datasets = datasetManager?.getAllDatasets() || [];
    log.info(`=== Datasets (${datasets.length}) ===`);
    datasets.forEach((ds) => {
      log.info(`${ds.id}: ${ds.filename}`);
      log.info(`Points: ${ds.metadata.pointCount || "unknown"}`);
      log.info(`Annotations: ${ds.annotations?.length || 0}`);
    });
    return datasets;
  };

  window.CIA.listViews = function () {
    const views = viewConfigurationManager?.getActiveViews() || [];
    log.info(`=== Active Views (${views.length}) ===`);
    views.forEach((view) => {
      log.info(`${view.id}: ${view.name}`);
      log.info(`Dataset: ${view.datasetId}`);
      log.info(`Active Instances: ${view.activeInstanceCount}`);
    });
    return views;
  };

  window.CIA.listViews = () => {
    log.info("Y.js Views:");
    yViews.forEach((view, id) => {
      log.info(`${id}:`, view);
    });
  };

  // Keep old name for backward compatibility during transition
  window.CIA.listInstances = () => {
    log.warn("CIA.listInstances() is deprecated. Use CIA.listViews()");
    window.CIA.listViews();
  };

  // Add new helper for viewing stats
  window.CIA.status = () => {
    log.info("CIA Web Status:");
    log.info(`Datasets: ${yDatasets.size}`);
    log.info(`Views: ${yViews.size}`);
    log.info(`Annotations: ${yAnnotations.size}`);
    log.info(`Workspace Layouts: ${yWorkspaceLayouts.size}`);
  };

  // Add helper to inspect a specific view
  window.CIA.getView = (viewId) => {
    const view = yViews.get(viewId);
    if (view) {
      log.info(`View ${viewId}:`, view);
      return view;
    } else {
      log.info(`View ${viewId} not found`);
      return null;
    }
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

  log.info("Debug helpers available");
  log.info("Type CIA.help() for available commands");
}

// Export annotation manager getter (since it's created in Phase 2)
export function getAnnotationManager() {
  return annotationManager;
}

// ============================================================================
// v2.0 SERVER SYNC FUNCTIONS
// These fetch state from the server API (source of truth)
// ============================================================================

/**
 * Fetch datasets from server API
 * This is the v2.0 way of getting datasets - server is source of truth
 */
async function fetchDatasetsFromServer() {
  const projectId = sessionManager.getProjectId?.() || config.defaultSessionId;

  const response = await fetch(
    `${config.apiBaseUrl}/projects/${projectId}/files`
  );

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  const data = await response.json();
  const serverFiles = data.files || [];

  log.info(`Found ${serverFiles.length} file(s) on server`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const serverFile of serverFiles) {
    // Check if we already have this dataset locally
    const existingLocal = datasetManager.getDataset(serverFile.id);
    if (existingLocal) {
      skippedCount++;
      continue;
    }

    // Check by hash if we have the same file under different ID
    const existingByHash = await datasetManager.findDatasetByHash(
      serverFile.hash
    );
    if (existingByHash) {
      // v2.0 FIX: Update the dataset's primary ID to match server ID
      // This ensures the UI uses the correct server-recognized ID
      const oldId = existingByHash.id;
      if (oldId !== serverFile.id) {
        log.info(`Updating dataset ID: ${oldId} → ${serverFile.id}`);

        // Remove from map with old ID
        datasetManager._datasets.delete(oldId);

        // Update the dataset object's ID
        existingByHash.id = serverFile.id;
        existingByHash.serverId = serverFile.id;

        // Re-add with new ID
        datasetManager._datasets.set(serverFile.id, existingByHash);

        // Update IndexedDB (remove old, add with new ID)
        try {
          await datasetManager._deleteDataset(oldId);
          await datasetManager._persistDataset(existingByHash);

          // Re-sync to Y.js with correct ID
          datasetManager._syncDatasetMetadataToYjs(existingByHash);

          log.info(`Dataset ID migration complete: ${existingByHash.filename}`);
        } catch (err) {
          log.warn(
            `Failed to persist ID update for ${existingByHash.filename}:`,
            err
          );
        }
      } else {
        existingByHash.serverId = serverFile.id;
      }
      skippedCount++;
      continue;
    }

    // Add the dataset from server
    await datasetManager._addDatasetFromServer(serverFile);
    addedCount++;
  }

  log.info(`Added ${addedCount}, skipped ${skippedCount} existing`);

  // v2.0: Clean up orphan datasets that don't exist on server
  // This prevents "File not found" errors from stale local data
  const serverIds = new Set(serverFiles.map((f) => f.id));
  const serverHashes = new Set(serverFiles.map((f) => f.hash).filter(Boolean));
  const localDatasets = datasetManager.getAllDatasets();
  let orphanCount = 0;

  for (const localDataset of localDatasets) {
    const hasServerId = serverIds.has(localDataset.id);
    const hasServerHash =
      localDataset.hash && serverHashes.has(localDataset.hash);

    if (!hasServerId && !hasServerHash) {
      // This dataset doesn't exist on server - it's orphan
      log.warn(
        `Orphan dataset found: ${localDataset.filename} (${localDataset.id})`
      );
      log.warn(`  → Removing from local storage (file not on server)`);

      try {
        datasetManager._datasets.delete(localDataset.id);
        await datasetManager._deleteDataset(localDataset.id);
        orphanCount++;
      } catch (err) {
        log.warn(`Failed to remove orphan dataset:`, err);
      }
    }
  }

  if (orphanCount > 0) {
    log.info(`Cleaned up ${orphanCount} orphan dataset(s)`);
  }

  return {
    total: serverFiles.length,
    added: addedCount,
    skipped: skippedCount,
    orphansRemoved: orphanCount,
  };
}

/**
 * Fetch views from server API
 * This is the v2.0 way of getting view configurations
 */
async function fetchViewsFromServer() {
  const projectId = sessionManager.getProjectId?.() || config.defaultSessionId;

  const response = await fetch(
    `${config.apiBaseUrl}/views?projectId=${projectId}`
  );

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  const data = await response.json();
  const serverViews = data.views || [];

  log.info(`Found ${serverViews.length} view(s) on server`);

  let addedCount = 0;
  for (const serverView of serverViews) {
    // Check if we already have this view
    const existing = viewConfigurationManager.getView?.(serverView.id);
    if (!existing) {
      viewConfigurationManager.addViewFromServer?.(serverView);
      addedCount++;
    }
  }

  return { total: serverViews.length, added: addedCount };
}

/**
 * Fetch annotations from server API
 * This is the v2.0 way of getting annotations
 */
async function fetchAnnotationsFromServer(fileId = null) {
  const projectId = sessionManager.getProjectId?.() || config.defaultSessionId;

  let url = `${config.apiBaseUrl}/annotations?projectId=${projectId}`;
  if (fileId) {
    url += `&fileId=${fileId}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  const data = await response.json();
  return data.annotations || [];
}

// Export for use by other modules
export {
  fetchDatasetsFromServer,
  fetchViewsFromServer,
  fetchAnnotationsFromServer,
};
