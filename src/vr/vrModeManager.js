// ----------------------------------------------------------------------------
// Mode Manager - Handles VR vs Desktop Mode
// ----------------------------------------------------------------------------

import { logInfo, logSuccess } from "@UI/react/hooks/useLogging.js";

class VRModeManager {
  constructor() {
    this.currentMode = "desktop"; // "desktop" or "vr"
    this.modeChangeListeners = [];
    this.vrSession = null;
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

    const previousMode = this.currentMode;
    this.currentMode = mode;

    logInfo(`Mode changed: ${previousMode} → ${mode}`);

    // Notify all listeners
    this.modeChangeListeners.forEach((callback) => {
      try {
        callback(mode, previousMode);
      } catch (error) {
        console.error("Error in mode change listener:", error);
      }
    });
  }

  onModeChange(callback) {
    this.modeChangeListeners.push(callback);
  }

  setupVRDetection() {
    // TODO: Implement proper VR session detection
    // For now, we"ll detect VR mode manually or via button click

    logInfo("VR detection initialized (manual mode)");

    // Listen for Enter VR button clicks
    // The "Enter VR" button will trigger mode change manually

    // We can detect when WebXR session starts by monitoring the button
    setTimeout(() => {
      const vrButton = document.querySelector("button"); // VTK.js creates VR button
      if (vrButton && vrButton.textContent.includes("VR")) {
        vrButton.addEventListener("click", () => {
          // Give VR time to start
          setTimeout(() => {
            if (navigator.xr) {
              navigator.xr
                .isSessionSupported("immersive-vr")
                .then((supported) => {
                  if (supported) {
                    // Check if session is active
                    this.checkVRSession();
                  }
                });
            }
          }, 1000);
        });
      }
    }, 2000);
  }

  checkVRSession() {
    // Poll to check if we're in VR
    const checkInterval = setInterval(() => {
      // Check if fullscreen or in VR
      const isFullscreen = document.fullscreenElement !== null;

      if (isFullscreen && this.currentMode !== "vr") {
        this.setMode("vr");
        logSuccess("VR mode activated");
      } else if (!isFullscreen && this.currentMode === "vr") {
        this.setMode("desktop");
        logSuccess("Desktop mode activated");
      }
    }, 1000);

    // Store interval so we can clear it later
    this.vrCheckInterval = checkInterval;
  }

  getVRSession() {
    return this.vrSession;
  }
}

export const vrModeManager = new VRModeManager();
