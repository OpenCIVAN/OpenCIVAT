// src/init/appInitializer.js
// Application initialization - three-phase startup
//
// v2.0 ARCHITECTURE:
// - Server is source of truth for datasets, views, annotations
// - Y.js is used only for presence (cursors, avatars, view presence)
// - WebSocket broadcasts keep clients in sync without polling
import { initializeYjsProvider } from "@Collaboration/yjs/yjsSetup.js";
import { initializeStorageProvider } from "@Services/storage/storageService.js";
import { DatasetManager } from "@Core/data/managers/DatasetManager.js";
import { ViewConfigurationManager } from "@Core/data/managers/ViewConfigurationManager.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { subsetManager } from "@Core/data/managers/SubsetManager.js";
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
import { logInfo, logSuccess, logWarning, logError } from "@Utils/logger.js";
import {
  checkSyncStatus,
  performReconciliation,
  clearSyncState,
  DivergenceLevel,
} from "@Services/syncService.js";
import { viewLifecycleService } from '@Services/ViewLifecycleService.js';

// ✅ NEW: Import annotation system
// We'll initialize this in Phase 2 after DatasetManager is ready
let annotationManager = null;

// Global references (exported for use throughout the app)
export let datasetManager = null;
export let dataCacheAdapter = null;
export let viewConfigurationManager = null;

/**
 * Get the DatasetManager instance
 * Use this instead of importing datasetManager directly.
 */
export function getDatasetManager() {
  return datasetManager;
}

/**
 * Get the ViewConfigurationManager instance
 * Use this instead of importing viewConfigurationManager directly.
 */
export function getViewConfigurationManager() {
  return viewConfigurationManager;
}

/**
 * Get the DataCacheAdapter instance
 */
export function getDataCacheAdapter() {
  return dataCacheAdapter;
}

/**
 * Phase 0: Server Sync Check
 *
 * Runs BEFORE Phase 1 to detect server resets and prepare for reconciliation.
 *
 * @returns {Promise<{canContinue: boolean, serverStatus: object}>}
 */
export async function initializePhase0() {
  log.info("Phase 0: Server Sync Check\n=====================================");

  try {
    const syncStatus = await checkSyncStatus();

    if (syncStatus.divergence === DivergenceLevel.OFFLINE) {
      log.warn("Server unreachable - continuing with local state");
      return { canContinue: true, serverStatus: null, offline: true };
    }

    if (
      syncStatus.divergence === DivergenceLevel.MAJOR &&
      syncStatus.requiresClear
    ) {
      log.warn("Server database reset detected!");
      clearSyncState();
      return {
        canContinue: true,
        serverStatus: syncStatus.serverStatus,
        serverReset: true,
      };
    }

    log.debug("Sync check passed");
    return {
      canContinue: true,
      serverStatus: syncStatus.serverStatus,
      firstSync: syncStatus.firstSync,
    };
  } catch (error) {
    log.error("Phase 0 sync check failed:", error);
    return { canContinue: true, serverStatus: null, error };
  }
}

/**
 * Phase 1: Core Services Initialization
 *
 * These are the foundational systems that everything else builds on.
 * No user authentication required yet.
 */
export async function initializePhase1() {
  log.info(
    "Phase 1: Core Services Initialization\n====================================="
  );
  logInfo("Initializing core services...");

  try {
    // STEP 1: Register instance types
    // This MUST happen first so handlers are available when needed
    log.debug("Registering instance types...");
    registerInstanceTypes();
    logInfo("Instance types registered");

    // STEP 2: Session management
    // Sets up room ID from URL for collaboration
    log.debug("Initializing session...");
    sessionManager.initializeFromURL();
    log.debug(`Session initialized - Room: ${sessionManager.getRoomId()}`);

    // STEP 3: Data storage layer (Layer 1)
    log.debug("Setting up data storage layer...");

    // Initialize storage provider (with automatic fallback)
    const { provider: storageProvider, mode: storageMode } =
      await initializeStorageProvider();

    // Create dataset manager WITH the storage provider
    log.debug("Creating dataset manager (Layer 1)...");
    datasetManager = new DatasetManager(storageProvider);
    await datasetManager.initialize();
    log.debug("Dataset manager ready");
    logInfo("Data storage initialized");

    // Initialize server sync (WebSocket for real-time updates)
    try {
      const { serverSync } = await import("@Services/serverSync.js");
      serverSync.initialize(datasetManager);
      log.debug("Server sync connected");
      logInfo("Server sync connected");
    } catch (syncError) {
      log.warn("Server sync failed:", syncError.message);
      logWarning("Server sync unavailable - working offline");
    }

    // v2.0: Sync from server API (primary source of truth)
    if (storageMode === "server" || config.useServerStorage) {
      try {
        log.debug("Fetching datasets from server API...");
        await fetchDatasetsFromServer();
        log.debug("Synced datasets from server");
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

    log.debug("Data storage layer complete");
    log.debug(`Storage mode: ${storageMode}`);

    // STEP 3.5: Reconcile local state with server
    log.debug("Reconciling local state with server...");
    try {
      const phase0Result = window.__CIA_PHASE0_RESULT || {};

      const reconcileResult = await performReconciliation(
        datasetManager,
        viewConfigurationManager,
        phase0Result.serverStatus
      );

      const { divergence, totalOrphansRemoved } = reconcileResult;

      switch (divergence) {
        case DivergenceLevel.NONE:
          log.debug("Local state in sync with server");
          break;
        case DivergenceLevel.MINOR:
          log.debug(`Silent cleanup: ${totalOrphansRemoved} stale item(s)`);
          break;
        case DivergenceLevel.MODERATE:
          log.info(`Synced: cleared ${totalOrphansRemoved} stale item(s)`);
          break;
        case DivergenceLevel.MAJOR:
          log.warn(`Major sync: cleared ${totalOrphansRemoved} item(s)`);
          break;
      }
    } catch (error) {
      log.error("Reconciliation failed:", error);
    }

    // STEP 4: View Configuration layer (Layer 2)
    log.debug("Setting up view configuration layer...");
    viewConfigurationManager = new ViewConfigurationManager();
    log.debug("View configuration manager ready");
    log.debug("View configuration layer complete");

    // STEP 5: TensorFlow setup
    // Needed for dimensionality reduction algorithms (PCA, t-SNE, UMAP)
    log.debug("Setting up TensorFlow...");
    try {
      if (initializeTensorFlow && typeof initializeTensorFlow === "function") {
        await initializeTensorFlow();
        log.debug("TensorFlow ready");
      } else {
        log.warn("TensorFlow setup not available");
      }
    } catch (tfError) {
      log.warn("TensorFlow initialization failed:", tfError.message);
      log.debug("Continuing without TensorFlow support");
    }

    // STEP 6: Y.js provider
    // Required for real-time presence (cursors, avatars)
    // NOTE v2.0: Y.js is now for presence only, not state sync
    log.debug("Initializing Y.js provider (presence only)...");
    if (typeof initializeYjsProvider === "function") {
      initializeYjsProvider();
      log.debug("Y.js provider connected (presence layer)");
    } else {
      throw new Error("Y.js provider is required for presence");
    }

    // STEP 7: Initialize ViewConfigurationManager AFTER Y.js is ready
    log.debug("Initializing view configuration manager...");
    viewConfigurationManager.initialize();
    log.debug("View configuration manager ready");

    // Wire up ViewConfigurationManager to receive WebSocket broadcasts
    try {
      const { serverSync } = await import("@Services/serverSync.js");
      serverSync.setViewConfigurationManager(viewConfigurationManager);
      log.debug("ViewConfigurationManager wired to server sync");
    } catch (error) {
      log.warn(
        "Failed to wire ViewConfigurationManager to server sync:",
        error.message
      );
    }

    // v2.0: Load views from server API (primary source of truth)
    if (storageMode === "server" || config.useServerStorage) {
      try {
        log.debug("Fetching views from server API...");
        await viewConfigurationManager.loadFromServer();
        log.debug("Synced views from server");
      } catch (error) {
        log.warn("Failed to fetch views from server:", error.message);
        log.warn("Views will be created as needed");
      }
    }

    // STEP 8: Initialize Canvas system managers
    log.debug("Initializing canvas managers...");
    canvasManager.initialize({
      apiBaseUrl: config.apiBaseUrl,
      sessionManager: sessionManager,
    });
    subsetManager.initialize({
      apiBaseUrl: config.apiBaseUrl,
      sessionManager: sessionManager,
      canvasManager: canvasManager,
    });
    log.debug("Canvas managers initialized");

    // Wire up CanvasManager to receive WebSocket broadcasts
    try {
      const { serverSync } = await import("@Services/serverSync.js");
      serverSync.setCanvasManager(canvasManager);
      serverSync.setSubsetManager(subsetManager);
      log.debug("CanvasManager wired to server sync");
    } catch (error) {
      log.warn("Failed to wire CanvasManager to server sync:", error.message);
    }

    // STEP 9: Debug helpers
    setupDebugHelpers();
    log.debug("Debug helpers available");

    log.info("Phase 1 complete - Core services ready");
    logSuccess("Core services ready");
  } catch (error) {
    log.error("Phase 1 initialization failed:", error);
    logError("Core initialization failed: " + error.message);
    throw error;
  }

  // Initialize global debugging namespace
  window.CIA = window.CIA || {};

  // Legacy Y.js cleanup utility (kept for migration)
  window.CIA.clearYjsDatasets = clearAllYjsDatasets;
  log.debug(
    "Debug: Use window.CIA.clearYjsDatasets() to clear stale Y.js data"
  );
}

/**
 * Phase 2: Post-User Initialization
 *
 * Initializes services that depend on user identity (username, userId).
 * User must be authenticated before this phase runs.
 */
export async function initializePhase2() {
  log.info(
    "Phase 2: User Services Initialization\n====================================="
  );
  logInfo("Initializing user services...");

  try {
    // STEP 1: Wait for Y.js to sync
    log.debug("Checking Y.js sync status...");
    const synced = await waitForYjsSync();
    if (synced) {
      log.debug("Y.js already synced");
    } else {
      log.warn("Y.js sync timeout, continuing anyway");
    }

    // STEP 2: Presence system
    // Tracks which users are in the room and their activities
    log.debug("Initializing presence system...");
    if (presenceSystem && typeof presenceSystem.initialize === "function") {
      presenceSystem.initialize();
      log.debug("Presence system ready");
      logInfo("Presence system ready");
      // Note: Presence system logs its own status, we don't need to query it here
    } else if (
      presenceSystem &&
      typeof presenceSystem.initializePresence === "function"
    ) {
      presenceSystem.initializePresence();
      log.debug("Presence system ready");
      logInfo("Presence system ready");
    } else {
      log.warn("Presence system not available");
      logWarning("Presence system unavailable");
    }

    // STEP 3: Data managers
    // DatasetManager was initialized in Phase 1, confirm it's ready
    log.debug("Confirming data managers...");
    log.debug("Dataset manager ready (initialized in Phase 1)");

    // ✅ NEW: Initialize annotation system
    log.debug("Initializing annotation system...");
    try {
      // Dynamically import to avoid circular dependencies
      const { initializeAnnotationManager } = await import(
        "@Core/data/managers/AnnotationManager.js"
      );
      annotationManager = initializeAnnotationManager(datasetManager);
      log.debug("Annotation system ready");
    } catch (annotError) {
      log.warn("Annotation system failed to initialize:", annotError);
    }

    log.debug("Data managers ready");

    useDatasetStore.getState().initialize(datasetManager);

    // STEP 4: Y.js observers
    // Set up observers for real-time data sync
    log.debug("Setting up Y.js observers...");
    try {
      if (typeof initializeAllObservers === "function") {
        initializeAllObservers();
      }
      if (typeof markSystemReady === "function") {
        markSystemReady();
      }
      log.debug("Y.js observers active");
    } catch (observerError) {
      log.warn("Y.js observers setup incomplete:", observerError.message);
    }

    // STEP 6: Cursor system
    log.debug("Initializing cursor system...");
    try {
      const { initializeCursorTracking } = await import(
        "@Collaboration/presence/cursors.js"
      );
      initializeCursorTracking();
      log.debug("Cursor tracking active");
    } catch (cursorError) {
      log.warn("Cursor system failed to initialize:", cursorError);
    }

    // STEP 7: Text chat
    // Real-time text communication between users
    log.debug("Initializing text chat...");
    if (textChat && typeof textChat.initialize === "function") {
      try {
        textChat.initialize();
        log.debug("Text chat ready");
      } catch (chatError) {
        log.warn("Text chat failed:", chatError.message);
      }
    } else {
      log.warn("Text chat not available");
    }

    // STEP 8: Workspace manager
    // Manages multiple visualization instances
    log.debug("Initializing workspace manager...");
    if (workspaceManager && typeof workspaceManager.initialize === "function") {
      workspaceManager.initialize();
      log.debug("Workspace manager ready");
    }

    // STEP 9: Voice command handlers
    // Wire up handlers for voice commands dispatched by voiceCommandService
    log.debug("Initializing voice command handlers...");
    try {
      const { initializeVoiceCommandHandlers } = await import(
        "@Services/voice/voiceCommandHandlers.js"
      );
      initializeVoiceCommandHandlers();
      log.debug("Voice command handlers ready");
    } catch (voiceError) {
      log.warn("Voice command handlers failed to initialize:", voiceError);
    }

    viewLifecycleService.initialize();
    log.info('ViewLifecycleService initialized');

    log.info("Phase 2 complete - User services ready");
    logSuccess("Application ready");
  } catch (error) {
    log.error("Phase 2 initialization failed:", error);
    logError("User services initialization failed: " + error.message);
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
  log.info(
    "Phase 3: Enhanced Systems (Currently Disabled)\n====================================="
  );
  log.debug("Phase 3 is disabled until enhancement systems are implemented");
  log.debug("See comments in appInitializer.js for details");

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

      log.debug("Waiting for Y.js sync before Phase 2...");

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
  window.CIA.canvasManager = canvasManager;

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
║  CIA.info()                    - Show system info              ║
║  CIA.listDatasets()            - List all datasets             ║
║  CIA.listViews()               - List all view configurations  ║
║  CIA.listInstances()           - List instance windows         ║
║  CIA.getDataset(id)            - Inspect a dataset             ║
║  CIA.getView(id)               - Inspect a view configuration  ║
║  CIA.getInstance(id)           - Inspect an instance window    ║
║                                                                ║
║  Managers:                                                     ║
║  CIA.datasetManager            - Dataset manager (Layer 1)     ║
║  CIA.viewConfigurationManager  - View config manager (Layer 2) ║
║  CIA.workspaceManager          - Instance window manager (L3)  ║
║                                                                ║
║  Sync & Reconciliation:                                        ║
║  CIA.syncStatus()              - Check sync status with server ║
║  CIA.forceReconcile()          - Force reconcile local/server  ║
║  CIA.resetLocalState()         - Clear all local data          ║
║                                                                ║
║  Legacy Cleanup:                                               ║
║  CIA.clearYjsDatasets()        - Clear stale Y.js data         ║
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

  window.CIA.status = function () {
    const datasets = datasetManager?.getAllDatasets() || [];
    const views = viewConfigurationManager?.getActiveViews() || [];
    const instances = workspaceManager?.getInstanceCount() || 0;
    log.info("CIA Web Status:");
    log.info(`Datasets: ${datasets.length}`);
    log.info(`Views: ${views.length}`);
    log.info(`Instances: ${instances}`);
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

  // Sync debugging helpers
  window.CIA.syncStatus = async function () {
    try {
      const status = await checkSyncStatus();
      log.info("=== Sync Status ===");
      log.info(`Divergence: ${status.divergence}`);
      log.info(`First sync: ${status.firstSync}`);
      log.info(`Requires clear: ${status.requiresClear}`);
      if (status.serverStatus) {
        log.info(`Server instance: ${status.serverStatus.serverInstanceId}`);
        log.info(`Server datasets: ${status.serverStatus.datasetCount}`);
        log.info(`Server views: ${status.serverStatus.viewCount}`);
      }
      return status;
    } catch (error) {
      log.error("Failed to get sync status:", error);
      return { error: error.message };
    }
  };

  window.CIA.forceReconcile = async function () {
    log.info("=== Force Reconciliation ===");
    try {
      const result = await performReconciliation(
        datasetManager,
        viewConfigurationManager,
        null // No cached server status, will fetch fresh
      );
      log.info(`Divergence: ${result.divergence}`);
      log.info(`Datasets removed: ${result.datasets?.orphansRemoved || 0}`);
      log.info(`Views removed: ${result.views?.orphansRemoved || 0}`);
      log.info(`ID migrations: ${result.datasets?.idMigrations || 0}`);
      return result;
    } catch (error) {
      log.error("Reconciliation failed:", error);
      return { error: error.message };
    }
  };

  window.CIA.resetLocalState = async function () {
    log.warn("=== Resetting Local State ===");
    log.warn("This will clear all local data and re-fetch from server");

    try {
      // Clear sync state
      clearSyncState();

      // Force reset both managers
      if (datasetManager?.forceReset) {
        await datasetManager.forceReset();
        log.info("Dataset manager reset complete");
      }

      if (viewConfigurationManager?.forceReset) {
        await viewConfigurationManager.forceReset();
        log.info("View configuration manager reset complete");
      }

      log.info("Local state cleared. Reload page to re-fetch from server.");
      return { success: true };
    } catch (error) {
      log.error("Reset failed:", error);
      return { error: error.message };
    }
  };

  log.debug("Debug helpers available");
  log.debug("Type CIA.help() for available commands");
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

  log.debug(`Found ${serverFiles.length} file(s) on server`);

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
        log.debug(`Updating dataset ID: ${oldId} → ${serverFile.id}`);

        // Remove from map with old ID
        datasetManager._datasets.delete(oldId);

        // Update the dataset object's ID and download path
        existingByHash.id = serverFile.id;
        existingByHash.serverId = serverFile.id;
        existingByHash.publicPath = `${config.apiBaseUrl}/files/${serverFile.id}/download`;

        // Re-add with new ID
        datasetManager._datasets.set(serverFile.id, existingByHash);

        // Update IndexedDB (remove old, add with new ID)
        try {
          await datasetManager._deleteDataset(oldId);
          await datasetManager._persistDataset(existingByHash);

          log.debug(
            `Dataset ID migration complete: ${existingByHash.filename}`
          );
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

  log.debug(`Added ${addedCount}, skipped ${skippedCount} existing`);

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
    log.debug(`Cleaned up ${orphanCount} orphan dataset(s)`);
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

  log.debug(`Found ${serverViews.length} view(s) on server`);

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
