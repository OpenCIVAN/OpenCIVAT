// Core Y.js infrastructure - document, maps, provider initialization

import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";

import { NETWORK_CONFIG } from "@Core/config/constants.js";
import { sessionManager } from "@Core/session/sessionManager";

// ----------------------------------------------------------------------------
// Core Y.js Document and Awareness
// ----------------------------------------------------------------------------
export const ydoc = new Y.Doc();
export const awareness = new Awareness(ydoc);

// ----------------------------------------------------------------------------
// Shared State Maps
// These are the "channels" for different types of data
// ----------------------------------------------------------------------------

// DATASET STATE
// Datasets available to entire project (metadata only, not binary data)
export const yDatasets = ydoc.getMap("datasets");
// Structure: datasetId -> { id, name, hash, bounds, pointCount, ... }
// NOTE: Binary data stays in IndexedDB, only metadata syncs via Y.js
// TODO (Server): When files are server-hosted, add fetchUrl field

// INSTANCE STATE (Viewport configurations)
// Individual views of datasets with camera, filters, widgets
export const yInstances = ydoc.getMap("instances");
// Structure: instanceId -> { id, datasetId, userId, type, camera, filters, ... }
// Each instance stores its own state in yInstances like this:
// {
//   id: 'instance-123',
//   datasetId: 'dataset-abc',
//   camera: { position: [...], focalPoint: [...] },
//   filters: [{ type: 'threshold', params: {...} }],
//   reduction: { type: 'pca', applied: true, params: {...} },  // Instance-specific
//   widgets: [{ type: 'plane', visible: true }]
// }

// ANNOTATION STATE
// Annotations tied to datasets (not instances)
export const yAnnotations = ydoc.getMap("annotations");
// Structure: datasetId -> Array of annotations
// Annotations belong to the dataset, visible to all instances viewing it
// TODO (Scoping): Structure for scoped annotations:
// {
//   dataset: { datasetId -> Array of annotations },
//   project: Array of project-level annotations,
//   group: { groupId -> Array of group annotations }  // Future
// }

// COLLABORATION STATE
export const yCursors = ydoc.getMap("cursors"); // User presence + cursor positions
export const yText = ydoc.getArray("chatMessages"); // Text chat
// TODO (Groups): When adding breakout groups:
// - Chat should be nested: groupId -> Array of messages
// - Cursors should include instanceId for scoping

// FILE DATA
export const yFile = ydoc.getMap("file");

// VR COLLABORATION (Future)
export const yAvatars = ydoc.getMap("avatars");
export const yVRControllers = ydoc.getMap("vrControllers");
// TODO (VR): Implement avatar system when VR features are ready

// ----------------------------------------------------------------------------
// Provider Initialization
// ----------------------------------------------------------------------------

// We can't create the provider until we know which room we're connecting to
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
    roomId, // Use room ID from session manager
    ydoc,
    { awareness }
  );

  console.log(`📡 Y.js connecting to room: ${roomId}`);

  // Setup connection event handlers
  _provider.on("status", (event) => {
    console.log(`📡 Y.js connection status: ${event.status}`);
    // TODO (Backend): Add reconnection logic with exponential backoff
  });

  // Set up connection observers
  _provider.on("sync", (synced) => {
    if (synced) {
      console.log("✅ Y.js synchronized with server");

      // Initialize observers when sync is complete
      // Import dynamically to avoid circular dependency
      import("@Collaboration/yjs/yjsObservers.js").then(
        ({ initializeAllObservers }) => {
          initializeAllObservers();
        }
      );

      // TODO (Backend): Trigger loading of persisted state from database
      // TODO (Offline): Sync local changes made while offline
    }
  });

  // TODO (Error Handling): Add connection error handlers
  // _provider.on("connection-error", (error) => { ... });

  return _provider;
}

// Export provider as a getter so it throws a helpful error if accessed before init
export const provider = new Proxy(
  {},
  {
    get(target, prop) {
      if (!_provider) {
        // Capture the stack trace to see who's calling
        const error = new Error(
          `Y.js provider not initialized - call initializeYjsProvider() first.\n` +
            `Attempted to access provider.${String(prop)}`
        );

        // The stack trace will show the full call chain
        console.error("🔍 Provider access stack trace:");
        console.error(error.stack);

        throw error;
      }
      return _provider[prop];
    },
  }
);

// ----------------------------------------------------------------------------
// Sync Helper Functions: Zustand → Y.js
// These push local changes to distributed state
// ----------------------------------------------------------------------------

/**
 * Sync dataset metadata to Y.js
 * Called after adding/updating a dataset in Zustand
 *
 * @param {string} datasetId - Dataset ID
 * @param {Object} metadata - Dataset metadata (NO binary data)
 */
export function syncDatasetToYjs(datasetId, metadata) {
  try {
    const syncData = {
      id: metadata.id || datasetId,
      name: metadata.name,
      hash: metadata.hash, // ← Key for IndexedDB lookup
      bounds: metadata.bounds,
      pointCount: metadata.pointCount,
      cellCount: metadata.cellCount,
      sizeBytes: metadata.sizeBytes,
      uploadedBy: metadata.uploadedBy,
      uploadedByName: metadata.uploadedByName,
      uploadedAt: metadata.uploadedAt,
      publicPath: metadata.publicPath,
      // Annotations are synced separately via yAnnotations
    };

    yDatasets.set(datasetId, syncData);
    console.log(`📤 Dataset synced to Y.js: ${metadata.name}`);

    // TODO (Server): When files are server-hosted:
    // syncData.fetchUrl = `/api/datasets/${metadata.hash}`;
    // This allows remote users to download instead of upload
  } catch (error) {
    console.error("❌ Failed to sync dataset to Y.js:", error);
  }
}

/**
 * Sync instance configuration to Y.js
 * Called after creating/updating an instance in Zustand
 *
 * @param {string} instanceId - Instance ID
 * @param {Object} instance - Instance configuration
 */
export function syncInstanceToYjs(instanceId, instance) {
  try {
    const syncData = {
      id: instance.id || instanceId,
      datasetId: instance.datasetId,
      userId: instance.userId,
      userName: instance.userName,
      type: instance.type, // "desktop" or "vr"
      visibility: instance.visibility, // "private" or "shared"
      camera: instance.camera,
      filters: instance.filters || [],
      widgets: instance.widgets || [],
      linkedTo: instance.linkedTo || [],
      linkMode: instance.linkMode,
      cursor: instance.cursor || { position: null, visible: false },
      lastActive: Date.now(),
    };

    yInstances.set(instanceId, syncData);
    console.log(`📤 Instance synced to Y.js: ${instanceId}`);
  } catch (error) {
    console.error("❌ Failed to sync instance to Y.js:", error);
  }
}

/**
 * Sync dataset annotations to Y.js
 * Called after adding/updating annotations
 *
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
 * Remove dataset from Y.js
 *
 * @param {string} datasetId - Dataset ID to remove
 */
export function removeDatasetFromYjs(datasetId) {
  yDatasets.delete(datasetId);
  yAnnotations.delete(datasetId); // Also remove annotations
  console.log(`📤 Dataset removed from Y.js: ${datasetId}`);
}

/**
 * Remove instance from Y.js
 *
 * @param {string} instanceId - Instance ID to remove
 */
export function removeInstanceFromYjs(instanceId) {
  yInstances.delete(instanceId);
  console.log(`📤 Instance removed from Y.js: ${instanceId}`);
}

console.log("✅ Y.js core initialized");
