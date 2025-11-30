// src/core/instances/types/vtk/vr/VTKVRController.js
// ----------------------------------------------------------------------------
// VR Controllers - Handle Meta Quest / Oculus Controllers
// ----------------------------------------------------------------------------
//
// STATUS: PLACEHOLDER FOR FUTURE VR IMPLEMENTATION
//
// TODO (VR Implementation):
// This file needs to be converted to per-instance pattern when VR is implemented.
//
// Current architecture issues:
// - Uses singleton pattern (should be per-instance)
// - Missing integration with VTKInstanceHandler
// - No XR session management
//
// Proper implementation should:
// 1. Accept instanceId and sceneObjects in initialize()
// 2. Store controllers per-instance in a Map
// 3. Integrate with VTKInstanceHandler.enterInstanceVR()
// 4. Clean up controllers in VTKInstanceHandler.cleanup()
//
// See VTKOrientationWidget.js for the correct per-instance pattern.
// ----------------------------------------------------------------------------

import { vr as log } from "@Utils/logger.js";
import { vrModeManager } from "@VR/vrModeManager.js";

class VRControllers {
  constructor() {
    // TODO: Convert to per-instance storage
    // Should be: this.instanceControllers = new Map()
    this.controllers = [];
    this.initialized = false;
  }

  /**
   * Initialize VR controller system
   *
   * TODO: This should accept (instanceId, sceneObjects, xrSession)
   * and store controller data per-instance
   */
  initialize() {
    // Wait for VR mode
    vrModeManager.onModeChange((mode) => {
      if (mode === "vr") {
        this.setupControllers();
      } else {
        this.cleanupControllers();
      }
    });

    log.info("VR controller system ready (placeholder)");
  }

  /**
   * Setup VR controllers for current session
   *
   * TODO: When implementing:
   * - Accept instanceId parameter
   * - Get XR session from VTKInstanceHandler
   * - Access renderer/interactor from instance's sceneObjects
   * - Store controller state in this.instanceControllers.get(instanceId)
   */
  setupControllers() {
    // PLACEHOLDER CODE - This will need complete rewrite for per-instance VR

    // In the future implementation, this would be:
    // const instance = workspaceManager.getInstance(instanceId);
    // const { renderer, interactor } = instance.instanceData.sceneObjects;
    // const xrSession = instance.instanceData.xrSession;

    log.debug(
      "VR Controllers: Placeholder - needs per-instance implementation"
    );

    /* OLD CODE - COMMENTED OUT (references dead sceneManager)
    const { fullScreenRenderer } = getSceneObjects();

    if (!fullScreenRenderer) {
      console.warn("Cannot setup VR controllers: no renderer");
      return;
    }
    */

    try {
      const session = vrModeManager.getVRSession();

      if (session) {
        // Listen for controller events
        session.addEventListener("selectstart", (event) => {
          log.trace("Controller select start:", event);
          this.onSelectStart(event);
        });

        session.addEventListener("selectend", (event) => {
          log.trace("Controller select end:", event);
          this.onSelectEnd(event);
        });

        session.addEventListener("squeezestart", (event) => {
          log.trace("Controller squeeze start:", event);
          this.onSqueezeStart(event);
        });

        session.addEventListener("squeezeend", (event) => {
          log.trace("Controller squeeze end:", event);
          this.onSqueezeEnd(event);
        });

        this.initialized = true;
        log.info("VR controllers initialized (placeholder)");
      } else {
        log.warn("No XR session available");
      }
    } catch (error) {
      log.error("Failed to setup VR controllers:", error);
    }
  }

  /**
   * Handle trigger press
   * TODO: Pass instanceId to know which instance this affects
   */
  onSelectStart(event) {
    log.trace("Trigger pressed on controller");
    // TODO: Implement interaction (e.g., select annotation, grab object)
    // Should call: instance.handler.handleVRSelect(instanceData, event)
  }

  onSelectEnd(event) {
    log.trace("Trigger released");
  }

  /**
   * Handle grip press
   * TODO: Pass instanceId to know which instance this affects
   */
  onSqueezeStart(event) {
    log.trace("Grip pressed on controller");
    // TODO: Implement grab/move functionality
    // Should call: instance.handler.handleVRGrip(instanceData, event)
  }

  onSqueezeEnd(event) {
    log.trace("Grip released");
  }

  /**
   * Cleanup controllers
   * TODO: Accept instanceId to clean up specific instance
   */
  cleanupControllers() {
    this.controllers = [];
    this.initialized = false;
    log.info("VR controllers cleaned up");
  }

  isInitialized() {
    return this.initialized;
  }
}

export const vrControllers = new VRControllers();

// ============================================================================
// FUTURE IMPLEMENTATION NOTES
// ============================================================================
//
// When implementing proper VR support, this file should follow this pattern:
//
// class VRControllers {
//   constructor() {
//     this.instanceControllers = new Map(); // instanceId → controller data
//   }
//
//   initialize(instanceId, sceneObjects, xrSession) {
//     const { renderer, interactor } = sceneObjects;
//
//     // Store per-instance
//     this.instanceControllers.set(instanceId, {
//       xrSession,
//       renderer,
//       interactor,
//       leftController: null,
//       rightController: null,
//       eventListeners: []
//     });
//
//     this._setupEventListeners(instanceId, xrSession);
//   }
//
//   cleanup(instanceId) {
//     const data = this.instanceControllers.get(instanceId);
//     if (data) {
//       // Remove event listeners
//       data.eventListeners.forEach(cleanup => cleanup());
//       this.instanceControllers.delete(instanceId);
//     }
//   }
//
//   _handleSelect(instanceId, event) {
//     const instance = workspaceManager.getInstance(instanceId);
//     if (instance && instance.handler.handleVRSelect) {
//       instance.handler.handleVRSelect(instance.instanceData, event);
//     }
//   }
// }
//
// Integration with VTKInstanceHandler:
//
// async enterInstanceVR(instanceData, xrSession) {
//   const { instanceId, sceneObjects } = instanceData;
//
//   // Initialize controllers for this instance
//   vrControllers.initialize(instanceId, sceneObjects, xrSession);
//
//   // Return VR context
//   return {
//     xrSession,
//     controllers: vrControllers.getControllers(instanceId)
//   };
// }
//
// async exitInstanceVR(instanceData) {
//   vrControllers.cleanup(instanceData.instanceId);
// }
//
