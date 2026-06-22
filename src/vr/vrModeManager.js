// src/vr/vrModeManager.js
// Lightweight mode tracker that mirrors WebXR session state.
// VRManager (src/core/vr/VRManager.js) owns the XR session lifecycle;
// this class just keeps a public "desktop | vr" flag and notifies listeners.

import { vr as log } from "@Utils/logger.js";

class VRModeManager {
  constructor() {
    this.currentMode = "desktop"; // "desktop" | "vr"
    this._listeners = [];
  }

  getCurrentMode() {
    return this.currentMode;
  }

  isVRMode() {
    return this.currentMode === "vr";
  }

  isDesktopMode() {
    return this.currentMode === "desktop";
  }

  setMode(mode) {
    if (mode === this.currentMode) return;
    const prev = this.currentMode;
    this.currentMode = mode;
    log.info(`Mode: ${prev} → ${mode}`);
    this._listeners.forEach((cb) => {
      try { cb(mode, prev); } catch (e) { log.error("Mode listener error:", e); }
    });
  }

  onModeChange(callback) {
    this._listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Wire to VRManager events so mode tracks the real XR session.
   * Call once during app init when VRManager is available.
   */
  connectToVRManager(vrManager) {
    vrManager.on("vrEntered", () => this.setMode("vr"));
    vrManager.on("vrExited",  () => this.setMode("desktop"));
    log.info("VRModeManager connected to VRManager");
  }
}

export const vrModeManager = new VRModeManager();
