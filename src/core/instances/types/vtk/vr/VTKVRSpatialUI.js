// ----------------------------------------------------------------------------
// VR Spatial UI - 3D Floating Panels in VR
// ----------------------------------------------------------------------------

import { vrModeManager } from "@VR/vrModeManager.js";

class VRSpatialUI {
  constructor() {
    this.panels = new Map();
  }

  initialize() {
    console.log("VR spatial UI initialized (placeholder)");

    vrModeManager.onModeChange((mode) => {
      if (mode === "vr") {
        console.log("VR mode: Would create spatial UI here");
        // this.createVRMenus();
      } else {
        console.log("Desktop mode: Would cleanup spatial UI here");
        // this.cleanupVRMenus();
      }
    });
  }

  // Placeholder methods
  createVRMenus() {
    console.log("TODO: Create VR spatial menus");
  }

  cleanupVRMenus() {
    console.log("TODO: Cleanup VR spatial menus");
  }
}

export const vrSpatialUI = new VRSpatialUI();
