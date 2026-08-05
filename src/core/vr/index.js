// src/core/vr/index.js
// VR System Exports
//
// This module provides the VR infrastructure for CIA Web.
//
// Design Principle (DEC-014): VR-First, Desktop-First Implementation
// - Architecture designed for VR from day one
// - Implemented on desktop first for easier debugging
// - Every component considers VR from the start
//
// Components:
// - VRManager: sole owner of WebXR session lifecycle, input, and the XR frame loop
// - VRExplorationManager: what happens once a session is live (navigation,
//   tools, avatars, spatial UI); drives VTKInstanceHandler's stereo render
//   off VRManager's frame event
// - VRControllerRenderer: controller/ray visuals for the exploration path
// - VRGridLayout: Flat grid positioning in VR space
// - VRCursorSync: Cross-platform cursor visibility
// - VRNavigationController: Navigation modes (fly, teleport, walk)

export { VRManager, vrManager } from "./VRManager.js";
export { VRControllerRenderer } from "./VRControllerRenderer.js";
export { VRGridLayout, vrGridLayout } from "./VRGridLayout.js";
export { VRMultiViewGrid, vrMultiViewGrid, computeGridPlacements } from "./VRMultiViewGrid.js";
export { VRCursorSync, vrCursorSync } from "./VRCursorSync.js";
export { vrExplorationManager } from "./VRExplorationManager.js";

// Navigation
export {
  VRNavigationController,
  VRFlyMode,
  VRTeleportMode,
  VRScaleController,
} from "./navigation/index.js";

// Convenience function to check VR support
export function isVRSupported() {
  return (
    typeof navigator !== "undefined" &&
    "xr" in navigator &&
    typeof navigator.xr.isSessionSupported === "function"
  );
}

// Convenience function to get VR capabilities
export async function getVRCapabilities() {
  const { vrManager } = await import("./VRManager.js");
  return vrManager.checkVRCapabilities();
}
