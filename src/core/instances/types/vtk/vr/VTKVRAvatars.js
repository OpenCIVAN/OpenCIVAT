// ----------------------------------------------------------------------------
// VR Avatars - Show User Representations in VR
// ----------------------------------------------------------------------------

import { vr as log } from "@Utils/logger.js";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

import {
  getUserId,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { yAvatars } from "@Collaboration/yjs/yjsSetup.js";
import { vrModeManager } from "@VR/vrModeManager.js";

class VRAvatarSystem {
  constructor() {
    this.avatars = new Map(); // userId -> { head, leftHand, rightHand }
    this.localAvatar = null;
    this.trackingInterval = null;
  }

  initialize() {
    log.debug("VR avatar system initialized (placeholder)");

    // TODO: Implement actual avatar tracking with WebXR poses
    // For now, just log when mode changes
    vrModeManager.onModeChange((mode) => {
      if (mode === "vr") {
        log.debug("VR mode: Would create avatars here");
        // this.createLocalAvatar();
      } else {
        log.debug("Desktop mode: Would remove avatars here");
        // this.removeLocalAvatar();
      }
    });

    // Listen for remote avatars from Yjs
    yAvatars.observe((event) => {
      event.changes.keys.forEach((change, userId) => {
        if (userId === getUserId()) return;

        if (change.action === "add" || change.action === "update") {
          const avatarData = yAvatars.get(userId);
          log.debug("Remote avatar update:", userId, avatarData);
          // this.updateRemoteAvatar(userId, avatarData);
        } else if (change.action === "delete") {
          log.debug("Remote avatar removed:", userId);
          // this.removeRemoteAvatar(userId);
        }
      });
    });
  }

  // Placeholder methods for future implementation
  createLocalAvatar() {
    log.debug("TODO: Create local VR avatar");
  }

  removeLocalAvatar() {
    log.debug("TODO: Remove local VR avatar");
  }

  updateRemoteAvatar(userId, avatarData) {
    log.debug("TODO: Update remote avatar:", userId);
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
