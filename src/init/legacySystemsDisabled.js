// src/init/legacySystemsDisabled.js
/**
 * LEGACY SYSTEMS - DISABLED FOR MULTI-INSTANCE ARCHITECTURE
 *
 * This file documents systems that were built for single-VTK-container
 * architecture and have been disabled in favor of instance-based equivalents.
 *
 * Last updated: [Current Date]
 * Reason: Migration to multi-instance WorkspaceGrid architecture
 */

// ❌ DISABLED: Global scene initialization
// Old: Single global VTK container at app startup
// New: Per-instance VTK scenes created by WorkspaceGrid/InstanceViewport
// Location: Previously in CIAWebApp.jsx mounting logic

// ❌ DISABLED: setupFileHandler()
// Old: Direct DOM manipulation of file input element
// New: FilesPanel React component with datasetManager
// Location: appInitializer.js Phase 1 (commented out)

// ❌ DISABLED: setupViewportInteraction()
// Old: Global click handlers on single container
// New: Per-instance interaction handlers (to be implemented)
// Location: appInitializer.js Phase 3 (not initialized)

// ❌ DISABLED: datasetLoadingOrchestrator
// Old: Orchestrated loading into global scene
// New: Instances load their own datasets directly
// Location: appInitializer.js Phase 3 (commented out)

// ⚠️  PARTIALLY DISABLED: getSceneObjects()
// Old: Returns global scene objects
// New: Still used by workspaceManager for instance creation, but
//      other code should NOT call this expecting a global scene
// Location: sceneManager.js (kept for workspaceManager)

// ⚠️  TO REVIEW: Cursor system
// Needs verification that it doesn't access global scene
// Location: cursors.js (initialized in Phase 3)

// ⚠️  TO REVIEW: Debug helpers
// Needs update to work with instance-based architecture
// Location: debugHelpers.js

console.log("📋 Legacy systems documentation loaded");
console.log("   See src/init/legacySystemsDisabled.js for details");
