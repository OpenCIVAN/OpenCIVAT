// src/collaboration/cameraSync.js
// Sync camera positions across users

import { getUserId } from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { getSceneObjects } from "@Core/scene/sceneManager.js";

class CameraSync {
  constructor() {
    this.yCamera = ydoc.getMap("camera");
    this.isLocalChange = false;
    this.throttleTimeout = null;
  }

  initialize() {
    console.log("📷 Camera sync initialized");

    // Listen for remote camera changes
    this.yCamera.observe((event) => {
      if (this.isLocalChange) {
        this.isLocalChange = false;
        return;
      }

      this.applyCameraState();
    });

    // Broadcast local camera changes (throttled)
    const { camera, renderer, renderWindow } = getSceneObjects();
    if (!camera || !renderWindow) return;

    // Listen to camera changes
    const interactor = renderWindow.getInteractor();
    if (interactor) {
      interactor.onAnimation(() => {
        this.broadcastCameraState();
      });
    }
  }

  broadcastCameraState() {
    // Throttle to avoid too many updates
    if (this.throttleTimeout) return;

    this.throttleTimeout = setTimeout(() => {
      const { camera } = getSceneObjects();
      if (!camera) return;

      const state = {
        position: camera.getPosition(),
        focalPoint: camera.getFocalPoint(),
        viewUp: camera.getViewUp(),
        userId: getUserId(),
        timestamp: Date.now(),
      };

      this.isLocalChange = true;
      this.yCamera.set("current", state);

      console.log("📷 Broadcasting camera state");

      this.throttleTimeout = null;
    }, 100); // Update every 100ms max
  }

  applyCameraState() {
    const state = this.yCamera.get("current");
    if (!state) return;

    // Don't apply our own changes
    if (state.userId === getUserId()) return;

    const { camera, renderWindow, renderer } = getSceneObjects();
    if (!camera || !renderWindow) return;

    console.log("📷 Applying remote camera state");

    camera.setPosition(...state.position);
    camera.setFocalPoint(...state.focalPoint);
    camera.setViewUp(...state.viewUp);

    // Force camera update
    camera.modified();

    // Reset clipping range
    if (renderer) {
      renderer.resetCameraClippingRange();
    }

    // Force multiple renders to ensure update
    renderWindow.render();

    setTimeout(() => {
      if (renderWindow) {
        renderWindow.render();
      }
    }, 50);

    setTimeout(() => {
      if (renderWindow) {
        renderWindow.render();
      }
    }, 150);

    console.log("   ✅ Camera state applied and rendered");
  }
}

export const cameraSync = new CameraSync();
