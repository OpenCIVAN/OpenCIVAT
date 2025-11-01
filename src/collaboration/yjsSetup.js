// ----------------------------------------------------------------------------
// Yjs Setup - Collaborative data structures
// 
// EXTENSIBILITY NOTES:
// - Currently uses in-memory Y.js (no persistence)
// - To add backend persistence: See TODO markers below
// - For production: Add y-indexeddb provider for client-side cache
// - For enterprise: Integrate with PostgreSQL/MongoDB backend
// ----------------------------------------------------------------------------

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { NETWORK_CONFIG } from "../config/constants.js";

// ----------------------------------------------------------------------------
// Core Y.js Document
// ----------------------------------------------------------------------------

export const ydoc = new Y.Doc();

// WebSocket provider for real-time collaboration
export const provider = new WebsocketProvider(
  NETWORK_CONFIG.WEBSOCKET_URL,
  NETWORK_CONFIG.ROOM_NAME,
  ydoc
);

// TODO (Backend Integration): When adding persistence layer:
// import { IndexeddbPersistence } from 'y-indexeddb';
// const indexeddbProvider = new IndexeddbPersistence(ROOM_NAME, ydoc);
// This provides client-side caching while offline

// ----------------------------------------------------------------------------
// Shared State Maps
// 
// ARCHITECTURE NOTE:
// Each map represents a different data domain. Keep these separate for:
// - Performance (updates only trigger observers of specific maps)
// - Extensibility (easy to add new domains)
// - Security (future: scope access control per map)
// ----------------------------------------------------------------------------

// PROJECT-LEVEL STATE
// Datasets available to entire project
export const yDatasets = ydoc.getMap("datasets");
// TODO (Multi-project): When supporting multiple projects:
// - Key format: projectId -> Map of datasets
// - Enables project-level isolation

// VISUALIZATION STATE
// Views that users create (personal or shared)
export const yVisualizations = ydoc.getMap("visualizations");
// TODO (Groups): When adding multiple groups:
// - Nest under group IDs: groupId -> Map of visualizations
// - Enables group-scoped views

// ANNOTATION STATE
// Annotations tied to datasets or project
export const yAnnotations = ydoc.getMap("annotations");
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
// - Cursors should include vizId for scoping

// VR COLLABORATION (Future)
export const yAvatars = ydoc.getMap("avatars");
export const yVRControllers = ydoc.getMap("vrControllers");
// TODO (VR): Implement avatar system when VR features are ready

// 3D VISUALIZATION STATE (Legacy - consider refactoring)
export const yActor = ydoc.getMap("actor");
export const yFile = ydoc.getMap("fileData");
export const yReduction = ydoc.getMap("reduction");
// TODO (Refactor): Merge these into yVisualizations for consistency

// ----------------------------------------------------------------------------
// Connection Events
// ----------------------------------------------------------------------------

provider.on('status', event => {
  console.log(`📡 Yjs connection status: ${event.status}`);
  // TODO (Backend): Add reconnection logic with exponential backoff
});

provider.on('sync', synced => {
  if (synced) {
    console.log('✅ Yjs synchronized with server');
    // TODO (Backend): Trigger loading of persisted state from database
    // TODO (Offline): Sync local changes made while offline
  }
});

// TODO (Error Handling): Add connection error handlers
// provider.on('connection-error', (error) => { ... });

console.log("✅ Yjs document initialized");
console.log(`📡 Connecting to: ${NETWORK_CONFIG.WEBSOCKET_URL}/${NETWORK_CONFIG.ROOM_NAME}`);

// ----------------------------------------------------------------------------
// EXTENSION POINT: Backend Integration
// 
// To add backend persistence:
// 1. Create server/persistence.js (see architecture docs)
// 2. On server: Listen to Y.js updates, save to database
// 3. On connect: Load persisted state into Y.js doc
// 4. Implement snapshot/restore API
// 
// Example:
// import { persistenceManager } from './backend/persistence.js';
// provider.on('sync', async () => {
//   await persistenceManager.loadProjectState(projectId, ydoc);
// });
// ----------------------------------------------------------------------------