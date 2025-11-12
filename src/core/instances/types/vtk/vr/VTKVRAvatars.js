// ----------------------------------------------------------------------------
// VR Avatars - Show User Representations in VR
// ----------------------------------------------------------------------------

import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

import {
  getUserId,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { yAvatars } from "@Collaboration/yjs/yjsSetup.js";
import { getSceneObjects } from "@VTK/scene/sceneManager.js";
import { vrModeManager } from "@VR/vrModeManager.js";

class VRAvatarSystem {
  constructor() {
    this.avatars = new Map(); // userId -> { head, leftHand, rightHand }
    this.localAvatar = null;
    this.trackingInterval = null;
  }

  initialize() {
    console.log("VR avatar system initialized (placeholder)");

    // TODO: Implement actual avatar tracking with WebXR poses
    // For now, just log when mode changes
    vrModeManager.onModeChange((mode) => {
      if (mode === "vr") {
        console.log("VR mode: Would create avatars here");
        // this.createLocalAvatar();
      } else {
        console.log("Desktop mode: Would remove avatars here");
        // this.removeLocalAvatar();
      }
    });

    // Listen for remote avatars from Yjs
    yAvatars.observe((event) => {
      event.changes.keys.forEach((change, userId) => {
        if (userId === getUserId()) return;

        if (change.action === "add" || change.action === "update") {
          const avatarData = yAvatars.get(userId);
          console.log("Remote avatar update:", userId, avatarData);
          // this.updateRemoteAvatar(userId, avatarData);
        } else if (change.action === "delete") {
          console.log("Remote avatar removed:", userId);
          // this.removeRemoteAvatar(userId);
        }
      });
    });
  }

  // Placeholder methods for future implementation
  createLocalAvatar() {
    console.log("TODO: Create local VR avatar");
  }

  removeLocalAvatar() {
    console.log("TODO: Remove local VR avatar");
  }

  updateRemoteAvatar(userId, avatarData) {
    console.log("TODO: Update remote avatar:", userId);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 107, b: 107 };
  }
}

export const vrAvatarSystem = new VRAvatarSystem();
