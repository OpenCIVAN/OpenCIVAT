// src/core/vr/index.js
// VR System Exports
//
// This module provides the VR infrastructure for CIA Web.
// Currently contains STUBS - architecture ready, implementation deferred.
//
// Design Principle (DEC-014): VR-First, Desktop-First Implementation
// - Architecture designed for VR from day one
// - Implemented on desktop first for easier debugging
// - Every component considers VR from the start
//
// Components:
// - VRManager: Session lifecycle, mode switching
// - VRGridLayout: Curved grid positioning in VR space
// - VRIsolationMode: Room-scale single view mode
// - VRCursorSync: Cross-platform cursor visibility

export { VRManager, vrManager } from './VRManager.js';
export { VRGridLayout, vrGridLayout } from './VRGridLayout.js';
export { VRIsolationMode, vrIsolationMode } from './VRIsolationMode.js';
export { VRCursorSync, vrCursorSync } from './VRCursorSync.js';

// Convenience function to check VR support
export function isVRSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'xr' in navigator &&
    typeof navigator.xr.isSessionSupported === 'function'
  );
}

// Convenience function to get VR capabilities
export async function getVRCapabilities() {
  const { vrManager } = await import('./VRManager.js');
  return vrManager.checkVRCapabilities();
}
