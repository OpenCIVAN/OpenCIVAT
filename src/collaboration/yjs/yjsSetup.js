// src/collaboration/yjs/yjsSetup.js
// Core Y.js infrastructure - document, maps, provider initialization
//
// ARCHITECTURE: yInstances → yViews
// ViewConfigurations (Layer 2) are the collaborative unit, not instances (Layer 3)
// Instances are ephemeral renderers - they don't sync via Y.js

import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";

import { NETWORK_CONFIG } from "@Core/config/constants.js";
import { sessionManager } from "@Core/session/sessionManager";

// ============================================================================
// Core Y.js Document and Awareness
// ============================================================================
export const ydoc = new Y.Doc();
export const awareness = new Awareness(ydoc);

// ============================================================================
// Shared State Maps
// These are the "channels" for different types of data
// ============================================================================

// ---------------------------------------------------------------------------
// DATASET STATE (Layer 1)
// ---------------------------------------------------------------------------
// Datasets available to entire project (metadata only, not binary data)
export const yDatasets = ydoc.getMap("datasets");
// Structure: datasetId -> { id, name, hash, bounds, pointCount, ... }
// NOTE: Binary data stays in IndexedDB/S3, only metadata syncs via Y.js

// ---------------------------------------------------------------------------
// VIEW CONFIGURATION STATE (Layer 2) - THE COLLABORATIVE UNIT
// ---------------------------------------------------------------------------
// View configurations with camera, filters, widgets - THIS IS WHAT SYNCS
export const yViews = ydoc.getMap("viewConfigurations");
// Structure: viewId -> { id, datasetId, camera, filters, widgets, ... }
//
// ARCHITECTURAL NOTE:
// - ViewConfigurations are the "saved state" that persists
// - Multiple users can share the same ViewConfiguration
// - InstanceWindows (Layer 3) are ephemeral projectors - they DON'T sync
// - When an instance renders a view, it reads from yViews
// - When a user moves the camera, the VIEW updates, which syncs to others

// View presence (high-frequency cursor updates, separate for performance)
export const yViewPresence = ydoc.getMap("viewPresence");
// Structure: viewId -> { viewers: [...], lastUpdate }

// ---------------------------------------------------------------------------
// ANNOTATION STATE (Linked to Datasets - Layer 1)
// ---------------------------------------------------------------------------
// Annotations tied to datasets (not views or instances)
export const yAnnotations = ydoc.getMap("annotations");
// Structure: datasetId -> Array of annotations
// Annotations belong to the dataset, visible to all views of that dataset

// ---------------------------------------------------------------------------
// COLLABORATION STATE
// ---------------------------------------------------------------------------
export const yCursors = ydoc.getMap("cursors");       // User presence + cursor positions
export const yText = ydoc.getArray("chatMessages");   // Text chat

// ---------------------------------------------------------------------------
// FILE DATA
// ---------------------------------------------------------------------------
export const yFile = ydoc.getMap("file");

// ---------------------------------------------------------------------------
// VR COLLABORATION (Future)
// ---------------------------------------------------------------------------
export const yAvatars = ydoc.getMap("avatars");
export const yVRControllers = ydoc.getMap("vrControllers");

// ---------------------------------------------------------------------------
// WORKSPACE LAYOUTS (Future - for grid synchronization)
// ---------------------------------------------------------------------------
export const yWorkspaceLayouts = ydoc.getMap("workspaceLayouts");
// Structure: layoutId -> { grid, slots, owner, sharedWith }
// Future: Enables synchronized grid arrangements across users

// ============================================================================
// DEPRECATED: yInstances
// Kept for backward compatibility during transition - WILL BE REMOVED
// ============================================================================
export const yInstances = ydoc.getMap("instances");
// ⚠️ DEPRECATED: Use yViews instead
// Instances are ephemeral (Layer 3) and should NOT sync to Y.js
// ViewConfigurations (Layer 2) are the collaborative unit

// ============================================================================
// Provider Initialization
// ============================================================================

let _provider = null;

/**
 * Initialize the Y.js WebSocket provider
 * This must be called after sessionManager.initializeFromURL()
 */
export function initializeYjsProvider() {
  if (_provider) {
    console.warn("⚠️ Y.js provider already initialized");
    return _provider;
  }

  const roomId = sessionManager.getRoomId();

  _provider = new WebsocketProvider(
    NETWORK_CONFIG.WEBSOCKET_URL,
    roomId,
    ydoc,
    { awareness }
  );

  console.log(`📡 Y.js connecting to room: ${roomId}`);

  _provider.on("status", (event) => {
    console.log(`📡 Y.js connection status: ${event.status}`);
  });

  _provider.on("sync", (synced) => {
    if (synced) {
      console.log("✅ Y.js synchronized with server");

      // Initialize observers when sync is complete
      import("@Collaboration/yjs/yjsObservers.js").then(
        ({ initializeAllObservers }) => {
          initializeAllObservers();
        }
      );
    }
  });

  return _provider;
}

// Export provider as a getter so it throws a helpful error if accessed before init
export const provider = new Proxy(
  {},
  {
    get(target, prop) {
      if (!_provider) {
        const error = new Error(
          `Y.js provider not initialized - call initializeYjsProvider() first.\n` +
            `Attempted to access provider.${String(prop)}`
        );
        console.error("🔍 Provider access stack trace:");
        console.error(error.stack);
        throw error;
      }
      return _provider[prop];
    },
  }
);

// ============================================================================
// Sync Helper Functions: Local State → Y.js
// ============================================================================

/**
 * Sync dataset metadata to Y.js
 * Called after adding/updating a dataset in DatasetManager
 *
 * @param {string} datasetId - Dataset ID
 * @param {Object} metadata - Dataset metadata (NO binary data)
 */
export function syncDatasetToYjs(datasetId, metadata) {
  try {
    const syncData = {
      id: metadata.id || datasetId,
      name: metadata.name,
      hash: metadata.hash,
      bounds: metadata.bounds,
      pointCount: metadata.pointCount,
      cellCount: metadata.cellCount,
      sizeBytes: metadata.sizeBytes,
      uploadedBy: metadata.uploadedBy,
      uploadedByName: metadata.uploadedByName,
      uploadedAt: metadata.uploadedAt,
      publicPath: metadata.publicPath,
    };

    yDatasets.set(datasetId, syncData);
    console.log(`📤 Dataset synced to Y.js: ${metadata.name}`);
  } catch (error) {
    console.error("❌ Failed to sync dataset to Y.js:", error);
  }
}

/**
 * Sync view configuration to Y.js
 * Called by ViewConfigurationManager when view state changes
 *
 * @param {string} viewId - View configuration ID
 * @param {Object} viewConfig - View configuration data (use view.toJSON())
 */
export function syncViewToYjs(viewId, viewConfig) {
  try {
    yViews.set(viewId, viewConfig);
    console.log(`📤 View synced to Y.js: ${viewId}`);
  } catch (error) {
    console.error("❌ Failed to sync view to Y.js:", error);
  }
}

/**
 * Sync dataset annotations to Y.js
 * Called after adding/updating annotations
 *
 * @param {string} datasetId - Dataset ID
 * @param {Array} annotations - Array of annotation objects
 */
export function syncAnnotationsToYjs(datasetId, annotations) {
  try {
    yAnnotations.set(datasetId, annotations);
    console.log(
      `📤 Annotations synced to Y.js: ${annotations.length} annotations`
    );
  } catch (error) {
    console.error("❌ Failed to sync annotations to Y.js:", error);
  }
}

/**
 * Sync workspace layout to Y.js (Future)
 *
 * @param {string} layoutId - Layout ID
 * @param {Object} layout - Layout configuration
 */
export function syncWorkspaceLayoutToYjs(layoutId, layout) {
  try {
    yWorkspaceLayouts.set(layoutId, layout);
    console.log(`📤 Workspace layout synced to Y.js: ${layoutId}`);
  } catch (error) {
    console.error("❌ Failed to sync workspace layout to Y.js:", error);
  }
}

/**
 * Remove dataset from Y.js
 *
 * @param {string} datasetId - Dataset ID to remove
 */
export function removeDatasetFromYjs(datasetId) {
  yDatasets.delete(datasetId);
  yAnnotations.delete(datasetId);
  console.log(`📤 Dataset removed from Y.js: ${datasetId}`);
}

/**
 * Remove view configuration from Y.js
 *
 * @param {string} viewId - View ID to remove
 */
export function removeViewFromYjs(viewId) {
  yViews.delete(viewId);
  yViewPresence.delete(viewId);
  console.log(`📤 View removed from Y.js: ${viewId}`);
}

/**
 * Remove workspace layout from Y.js
 *
 * @param {string} layoutId - Layout ID to remove
 */
export function removeWorkspaceLayoutFromYjs(layoutId) {
  yWorkspaceLayouts.delete(layoutId);
  console.log(`📤 Workspace layout removed from Y.js: ${layoutId}`);
}

// ============================================================================
// DEPRECATED FUNCTIONS
// These will be removed in a future version
// ============================================================================

/**
 * @deprecated Use syncViewToYjs() instead
 * Instance state should not be synced - sync ViewConfigurations instead
 */
export function syncInstanceToYjs(instanceId, instance) {
  console.warn(
    "⚠️ DEPRECATED: syncInstanceToYjs() is deprecated. " +
    "Use syncViewToYjs() instead. Instances are ephemeral and should not sync."
  );
  
  // For backward compatibility, still sync (but warn)
  try {
    const syncData = {
      id: instance.id || instanceId,
      datasetId: instance.datasetId,
      userId: instance.userId,
      userName: instance.userName,
      type: instance.type,
      visibility: instance.visibility,
      camera: instance.camera,
      filters: instance.filters || [],
      widgets: instance.widgets || [],
      linkedTo: instance.linkedTo || [],
      linkMode: instance.linkMode,
      cursor: instance.cursor || { position: null, visible: false },
      lastActive: Date.now(),
    };

    yInstances.set(instanceId, syncData);
  } catch (error) {
    console.error("❌ Failed to sync instance to Y.js:", error);
  }
}

/**
 * @deprecated Use removeViewFromYjs() instead
 */
export function removeInstanceFromYjs(instanceId) {
  console.warn(
    "⚠️ DEPRECATED: removeInstanceFromYjs() is deprecated. " +
    "Use removeViewFromYjs() instead."
  );
  yInstances.delete(instanceId);
}

console.log("✅ Y.js core initialized (yViews architecture)");