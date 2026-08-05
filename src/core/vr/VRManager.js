// src/core/vr/VRManager.js
// Manages VR session lifecycle and mode transitions
//
// WebXR Implementation for immersive VR experiences
//
// VR Modes:
// - 'inactive': Desktop mode, no VR session
// - 'grid': Views arranged in curved arc around user (Fiesta-style)
// - 'isolated': Single view at room-scale, user can walk around

import { vr as log } from "@Utils/logger.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";

/**
 * VRManager - Manages VR session lifecycle
 *
 * Responsibilities:
 * - Check WebXR availability and capabilities
 * - Enter/exit VR sessions
 * - Manage XR render loop and frame timing
 * - Track input sources (controllers, hands)
 * - Switch between grid and isolation modes
 * - Coordinate with handlers for VR rendering
 */
class VRManager extends BaseManager {
  constructor() {
    super({
      events: [
        "vrEntered",
        "vrExited",
        "modeChanged",
        "isolationEntered",
        "isolationExited",
        "handConnected",
        "handDisconnected",
        "controllerConnected",
        "controllerDisconnected",
      ],
      logCategory: "vr",
    });

    this._mode = "inactive"; // 'inactive' | 'grid' | 'isolated'
    this._xrSession = null;
    this._referenceSpace = null;
    // The ORIGINAL reference space returned by requestReferenceSpace, kept
    // separate from _referenceSpace so snap turn can rebuild _referenceSpace as
    // a fresh yaw-offset of this base each time (getOffsetReferenceSpace is
    // relative to the space it's called on, so re-offsetting an already-offset
    // space would compound instead of replace). _referenceSpace is what every
    // getPose/getViewerPose caller reads, so rotating it turns the whole
    // world — head, controllers, floor, dataset — together. See applySnapTurn.
    this._baseReferenceSpace = null;
    this._yawOffset = 0; // accumulated snap-turn yaw (radians)
    this._xrLayer = null;
    this._isolatedViewId = null;
    this._inputSources = new Map(); // XRInputSource -> controller data
    this._selectPressed = new Map(); // XRInputSource -> boolean (for gripless sources)
    this._hands = { left: null, right: null };
    this._mode = "inactive";
    this._xrSession = null;
    this._isolatedViewId = null;
    this._referenceSpace = null;

    // WebXR state
    this._glContext = null;
    this._frameId = null;
    this._isRendering = false;

    // Frame timing
    this._lastFrameTime = 0;
    this._frameCount = 0;
    this._sessionConfig = null;

    // Bind methods for event handlers
    this._handleSessionEnd = this._handleSessionEnd.bind(this);
    this._onXRFrame = this._onXRFrame.bind(this);
    this._handleInputSourcesChange = this._handleInputSourcesChange.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleSelectStart = this._handleSelectStart.bind(this);
    this._handleSelectEnd = this._handleSelectEnd.bind(this);
  }

  // ===========================================================================
  // CAPABILITY DETECTION
  // ===========================================================================

  /**
   * Check if WebXR is available in the browser
   */
  isVRSupported() {
    return (
      typeof navigator !== "undefined" &&
      "xr" in navigator &&
      typeof navigator.xr.isSessionSupported === "function"
    );
  }

  /**
   * Check for specific VR capabilities
   * @returns {Promise<{supported: boolean, reason: string|null, features: string[]}>}
   */
  async checkVRCapabilities() {
    if (!this.isVRSupported()) {
      return {
        supported: false,
        reason: "WebXR not available in this browser",
        features: [],
      };
    }

    try {
      const immersiveSupported = await navigator.xr.isSessionSupported(
        "immersive-vr"
      );

      if (!immersiveSupported) {
        return {
          supported: false,
          reason: "Immersive VR not supported on this device",
          features: [],
        };
      }

      // Check for optional features
      const features = ["immersive-vr"];

      // These checks would need actual session to verify, so we just list potential
      // (omits 'layers' — the renderer uses XRWebGLLayer baseLayer only, and
      // requesting the Layers API breaks VR entry on headsets that support it)
      const potentialFeatures = [
        "local-floor",
        "bounded-floor",
        "hand-tracking",
      ];

      return {
        supported: true,
        reason: null,
        features,
        potentialFeatures,
      };
    } catch (error) {
      return {
        supported: false,
        reason: `WebXR check failed: ${error.message}`,
        features: [],
      };
    }
  }

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  /**
   * Enter VR mode
   * @param {WebGLRenderingContext} glContext - Optional WebGL context to use
   * @returns {Promise<void>}
   */
  async enterVR(glContext = null, options = {}) {
    log.info("VRManager.enterVR() - Starting VR session");

    if (this._xrSession) {
      log.warn("VR session already active");
      return;
    }

    if (!this.isVRSupported()) {
      const error = new Error("WebXR is not supported in this browser");
      this._emit("error", { error, type: "not_supported" });
      throw error;
    }

    try {
      // Check if immersive-vr is supported
      const isSupported = await navigator.xr.isSessionSupported("immersive-vr");
      if (!isSupported) {
        throw new Error("Immersive VR not supported on this device");
      }

      log.debug("Requesting immersive-vr session...");

      const requestedFeatures = {
        requiredFeatures: Array.isArray(options.requiredFeatures)
          ? options.requiredFeatures
          : ["local-floor"],
        optionalFeatures: Array.isArray(options.optionalFeatures)
          ? options.optionalFeatures
          // NOTE: never default to 'layers' — the renderer uses XRWebGLLayer
          // baseLayer only (see _setupWebGLLayer). Headsets that support the
          // WebXR Layers API (Meta Quest) would grant it, and the spec then
          // rejects baseLayer in updateRenderState(), breaking VR entry.
          : ["bounded-floor", "hand-tracking"],
      };

      this._sessionConfig = {
        sessionId: options.sessionId || null,
        navigationMode: options.navigationMode || "fly",
        scale: options.scale ?? 1,
        deviceProfile: options.deviceProfile || "generic",
      };

      // Request immersive session with features
      this._xrSession = await navigator.xr.requestSession("immersive-vr", requestedFeatures);

      log.debug("XR session obtained, setting up event listeners...");

      // Set up session event listeners
      this._xrSession.addEventListener("end", this._handleSessionEnd);
      this._xrSession.addEventListener(
        "inputsourceschange",
        this._handleInputSourcesChange
      );
      this._xrSession.addEventListener("select", this._handleSelect);
      this._xrSession.addEventListener("selectstart", this._handleSelectStart);
      this._xrSession.addEventListener("selectend", this._handleSelectEnd);

      // Get reference space (try bounded-floor first, fall back to local-floor)
      try {
        this._referenceSpace = await this._xrSession.requestReferenceSpace(
          "bounded-floor"
        );
        log.debug("Using bounded-floor reference space");
      } catch {
        this._referenceSpace = await this._xrSession.requestReferenceSpace(
          "local-floor"
        );
        log.debug("Using local-floor reference space");
      }
      // Snap turn rebuilds _referenceSpace as a yaw-offset of this base.
      this._baseReferenceSpace = this._referenceSpace;
      this._yawOffset = 0;

      // Set up WebGL layer if context provided
      if (glContext) {
        await this._setupWebGLLayer(glContext);
      }

      // Initialize input sources that may already be connected
      this._initializeInputSources();

      // Update state
      this._mode = "grid";
      this._isRendering = true;

      // Emit events
      this._emit("sessionStarted", {
        session: this._xrSession,
        referenceSpace: this._referenceSpace,
        sessionType: "immersive-vr",
        config: this._sessionConfig,
      });
      this._emit("vrEntered", {
        sessionType: "immersive-vr",
        config: this._sessionConfig,
      });
      this._emit("modeChanged", { mode: this._mode });

      // Start render loop
      this._frameId = this._xrSession.requestAnimationFrame(this._onXRFrame);

      log.info("VR session started successfully");
    } catch (error) {
      log.error("Failed to enter VR:", error);
      this._emit("error", { error, type: "session_failed" });
      this._cleanup();
      throw new Error(`Failed to enter VR: ${error.message}`);
    }
  }

  /**
   * Set up WebGL layer for XR rendering
   * @private
   */
  async _setupWebGLLayer(glContext) {
    this._glContext = glContext;

    // Make XR compatible
    await glContext.makeXRCompatible();

    // Create XR layer
    this._xrLayer = new XRWebGLLayer(this._xrSession, glContext);

    // Update session render state. Set ONCE here, never per-frame: now that
    // the camera converts data units to metres via physicalScale
    // (VTKInstanceHandler._updateCameraFromVRPose), these depthNear/depthFar
    // values are true metres and are correct at every vrScale. 0.05 was a
    // regression from a previous commit — it bought nothing (the menu panel
    // sits at ~0.6 m, well past 0.05) and doubled the near:far ratio to
    // 20000:1 (0.05/1000), halving depth-buffer precision. 0.1/200 gives a
    // 2000:1 ratio. 200 m rather than a tighter far plane because the
    // dataset renders in data space at `diagonal * vrScale` physical metres,
    // so a far plane of 100 m would clip the dataset past roughly 40x
    // auto-fit zoom.
    this._xrSession.updateRenderState({
      baseLayer: this._xrLayer,
      depthNear: 0.1,
      depthFar: 200,
    });

    log.debug("WebGL layer configured for XR");
  }

  /**
   * Exit VR mode
   * @returns {Promise<void>}
   */
  async exitVR() {
    log.info("VRManager.exitVR() - Ending VR session");

    if (!this._xrSession) {
      log.warn("No VR session to exit");
      return;
    }

    // Stop render loop
    this._isRendering = false;
    if (this._frameId) {
      // Can't cancel XR animation frame directly, but stopping the loop is enough
      this._frameId = null;
    }

    try {
      await this._xrSession.end();
      log.info("VR session ended gracefully");
    } catch (error) {
      log.error("Error ending VR session:", error);
      // Clean up anyway
      this._cleanup();
    }
  }

  /**
   * Handle XR session end event (called by system or after exitVR)
   * @private
   */
  _handleSessionEnd(event) {
    log.info("VR session ended", event?.reason || "");
    this._cleanup();
  }

  /**
   * Clean up after VR session
   * @private
   */
  _cleanup() {
    // Remove event listeners
    if (this._xrSession) {
      this._xrSession.removeEventListener("end", this._handleSessionEnd);
      this._xrSession.removeEventListener(
        "inputsourceschange",
        this._handleInputSourcesChange
      );
      this._xrSession.removeEventListener("select", this._handleSelect);
      this._xrSession.removeEventListener(
        "selectstart",
        this._handleSelectStart
      );
      this._xrSession.removeEventListener("selectend", this._handleSelectEnd);
    }

    // Clear input sources
    this._inputSources.clear();
    this._selectPressed.clear();
    this._hands = { left: null, right: null };

    // Clear WebXR state
    this._xrSession = null;
    this._referenceSpace = null;
    this._baseReferenceSpace = null;
    this._yawOffset = 0;
    this._xrLayer = null;
    this._glContext = null;
    this._frameId = null;
    this._isRendering = false;
    this._frameCount = 0;
    this._sessionConfig = null;

    // Reset mode
    const wasIsolated = this._mode === "isolated";
    this._mode = "inactive";
    this._isolatedViewId = null;

    // Emit events
    this._emit("sessionEnded", { wasIsolated });
    this._emit("vrExited", { wasIsolated });
    this._emit("modeChanged", { mode: this._mode });
  }

  // ===========================================================================
  // XR RENDER LOOP
  // ===========================================================================

  /**
   * XR animation frame callback
   * @param {DOMHighResTimeStamp} time - Current time
   * @param {XRFrame} frame - XR frame data
   * @private
   */
  _onXRFrame(time, frame) {
    // Check if we should continue rendering
    if (!this._isRendering || !this._xrSession) {
      return;
    }

    // Request next frame immediately
    this._frameId = this._xrSession.requestAnimationFrame(this._onXRFrame);

    // Calculate delta time
    const deltaTime = this._lastFrameTime ? time - this._lastFrameTime : 16.67;
    this._lastFrameTime = time;
    this._frameCount++;

    try {
      // Get viewer pose
      const viewerPose = frame.getViewerPose(this._referenceSpace);

      if (!viewerPose) {
        // No pose available (tracking lost)
        return;
      }

      // Update input source poses
      const controllerPoses = this._updateInputPoses(frame);

      // Update hand tracking if available
      const handPoses = this._updateHandTracking(frame);

      // Emit frame event with all pose data
      this._emit("frame", {
        time,
        deltaTime,
        frame,
        viewerPose,
        views: viewerPose.views,
        controllerPoses,
        handPoses,
        referenceSpace: this._referenceSpace,
        session: this._xrSession,
        frameCount: this._frameCount,
      });
    } catch (error) {
      log.error("Error in XR frame:", error);
      this._emit("error", { error, type: "frame_error" });
    }
  }

  /**
   * Update input source poses
   * @private
   */
  _updateInputPoses(frame) {
    const poses = {};

    for (const [source, data] of this._inputSources) {
      if (source.gripSpace) {
        const gripPose = frame.getPose(source.gripSpace, this._referenceSpace);
        if (gripPose) {
          data.gripPose = gripPose;
          poses[data.handedness] = {
            gripPose,
            targetRayPose: source.targetRaySpace
              ? frame.getPose(source.targetRaySpace, this._referenceSpace)
              : null,
            gamepad: source.gamepad,
            handedness: data.handedness,
          };

          // Emit controller update
          this._emit("controllerUpdate", {
            source,
            handedness: data.handedness,
            gripPose,
            gamepad: source.gamepad,
          });
        }
      } else if (source.targetRaySpace && !source.hand) {
        // Gripless sources (Vision Pro transient-pointer: gaze + pinch).
        // The target ray pose stands in for the grip pose.
        const targetRayPose = frame.getPose(
          source.targetRaySpace,
          this._referenceSpace
        );
        if (targetRayPose) {
          data.gripPose = targetRayPose;
          poses[data.handedness] = {
            gripPose: targetRayPose,
            targetRayPose,
            gamepad: source.gamepad || null,
            handedness: data.handedness,
            targetRayMode: source.targetRayMode,
          };

          this._emit("controllerUpdate", {
            source,
            handedness: data.handedness,
            gripPose: targetRayPose,
            gamepad: source.gamepad || null,
          });
        }
      }
    }

    return poses;
  }

  /**
   * Update hand tracking poses
   * @private
   */
  _updateHandTracking(frame) {
    const handPoses = {};

    // Check if hand tracking is available
    if (!frame.session.inputSources) return handPoses;

    for (const source of frame.session.inputSources) {
      if (source.hand) {
        const handedness = source.handedness;
        const joints = {};

        // Get pose for each joint
        for (const joint of source.hand.values()) {
          const jointPose = frame.getJointPose(joint, this._referenceSpace);
          if (jointPose) {
            joints[joint.jointName] = {
              position: jointPose.transform.position,
              orientation: jointPose.transform.orientation,
              radius: jointPose.radius,
            };
          }
        }

        if (Object.keys(joints).length > 0) {
          handPoses[handedness] = joints;
          this._hands[handedness] = joints;

          this._emit("handUpdate", {
            handedness,
            joints,
          });
        }
      }
    }

    return handPoses;
  }

  // ===========================================================================
  // INPUT SOURCE TRACKING
  // ===========================================================================

  /**
   * Initialize input sources already connected when session starts
   * @private
   */
  _initializeInputSources() {
    if (!this._xrSession?.inputSources) return;

    for (const source of this._xrSession.inputSources) {
      this._addInputSource(source);
    }
  }

  /**
   * Handle input sources change event
   * @private
   */
  _handleInputSourcesChange(event) {
    // Handle added sources
    for (const source of event.added) {
      this._addInputSource(source);
    }

    // Handle removed sources
    for (const source of event.removed) {
      this._removeInputSource(source);
    }
  }

  /**
   * Add an input source
   * @private
   */
  _addInputSource(source) {
    const data = {
      handedness: source.handedness || "none",
      targetRayMode: source.targetRayMode,
      profiles: source.profiles,
      gripPose: null,
      isHand: !!source.hand,
    };

    this._inputSources.set(source, data);

    if (source.hand) {
      this._hands[source.handedness] = null; // Will be populated in frame loop
      this._emit("handConnected", {
        source,
        handedness: source.handedness,
      });
      log.debug(`Hand connected: ${source.handedness}`);
    } else {
      this._emit("controllerConnected", {
        source,
        handedness: data.handedness,
        profiles: source.profiles,
      });
      log.debug(
        `Controller connected: ${data.handedness} (${
          source.profiles?.[0] || "unknown"
        })`
      );
    }
  }

  /**
   * Remove an input source
   * @private
   */
  _removeInputSource(source) {
    const data = this._inputSources.get(source);
    if (!data) return;

    this._inputSources.delete(source);
    this._selectPressed.delete(source);

    if (data.isHand) {
      this._hands[data.handedness] = null;
      this._emit("handDisconnected", {
        source,
        handedness: data.handedness,
      });
      log.debug(`Hand disconnected: ${data.handedness}`);
    } else {
      this._emit("controllerDisconnected", {
        source,
        handedness: data.handedness,
      });
      log.debug(`Controller disconnected: ${data.handedness}`);
    }
  }

  // ===========================================================================
  // INPUT EVENT HANDLERS
  // ===========================================================================

  /**
   * Handle select event (trigger fully pressed and released)
   * @private
   */
  _handleSelect(event) {
    const data = this._inputSources.get(event.inputSource);
    log.debug(`Select: ${data?.handedness || "unknown"}`);
  }

  /**
   * Handle select start event (trigger pressed)
   * @private
   */
  _handleSelectStart(event) {
    // Track select state per source so gripless inputs (Vision Pro
    // transient-pointer) expose a trigger-equivalent without a gamepad.
    this._selectPressed.set(event.inputSource, true);
  }

  /**
   * Handle select end event (trigger released)
   * @private
   */
  _handleSelectEnd(event) {
    this._selectPressed.set(event.inputSource, false);
  }

  // ===========================================================================
  // CONTROLLER ACCESS
  // ===========================================================================

  /**
   * Get connected controllers
   * @returns {Array<{handedness: string, source: XRInputSource, profiles: string[]}>}
   */
  getControllers() {
    const controllers = [];
    for (const [source, data] of this._inputSources) {
      if (!data.isHand) {
        controllers.push({
          handedness: data.handedness,
          source,
          profiles: source.profiles,
        });
      }
    }
    return controllers;
  }

  /**
   * Whether a source's select action is currently pressed.
   * Gripless sources (Vision Pro transient-pointer) have no gamepad, so
   * selectstart/selectend tracking is their only trigger signal.
   * @param {XRInputSource} source
   * @returns {boolean}
   */
  isSelectPressed(source) {
    return this._selectPressed.get(source) === true;
  }

  /**
   * Get controller by handedness
   * @param {string} handedness - 'left' | 'right'
   * @returns {XRInputSource|null}
   */
  getController(handedness) {
    for (const [source, data] of this._inputSources) {
      if (!data.isHand && data.handedness === handedness) {
        return source;
      }
    }
    return null;
  }

  /**
   * Get hand tracking data
   * @param {string} handedness - 'left' | 'right'
   * @returns {Object|null} Joint poses
   */
  getHandTracking(handedness) {
    return this._hands[handedness];
  }

  /**
   * Check if hand tracking is active
   * @returns {boolean}
   */
  hasHandTracking() {
    return this._hands.left !== null || this._hands.right !== null;
  }

  // ===========================================================================
  // ISOLATION MODE (Room-scale single view)
  // ===========================================================================

  /**
   * Enter isolation mode - the active view's model is pulled to room scale
   * for walk-around inspection. The scene transform itself (vrScale/vrOrigin)
   * is applied by VRExplorationManager.enterIsolation(); this method tracks
   * the mode state and notifies listeners.
   *
   * @param {string} viewId - The ViewConfiguration ID being isolated
   */
  enterIsolationMode(viewId) {
    if (this._mode !== "grid") {
      log.warn("Must be in VR grid mode to enter isolation");
      return;
    }

    this._mode = "isolated";
    this._isolatedViewId = viewId;

    this._emit("isolationEntered", { viewId });
    this._emit("modeChanged", { mode: this._mode, isolatedViewId: viewId });

    log.debug(`Entered isolation mode for view: ${viewId}`);
  }

  /**
   * Exit isolation mode - scale/origin restoration is handled by
   * VRExplorationManager.exitIsolation(); this tracks the mode state.
   */
  exitIsolationMode() {
    if (this._mode !== "isolated") {
      log.warn("Not in isolation mode");
      return;
    }

    const previousViewId = this._isolatedViewId;
    this._mode = "grid";
    this._isolatedViewId = null;

    this._emit("isolationExited", { viewId: previousViewId });
    this._emit("modeChanged", { mode: this._mode });

    log.debug("Exited isolation mode, returned to grid");
  }

  // ===========================================================================
  // STATE GETTERS
  // ===========================================================================

  /**
   * Get current VR state
   */
  getState() {
    return {
      mode: this._mode,
      isolatedViewId: this._isolatedViewId,
      hasSession: this._xrSession !== null,
      isInVR: this._mode !== "inactive",
      isIsolated: this._mode === "isolated",
      isRendering: this._isRendering,
      frameCount: this._frameCount,
      controllerCount: this.getControllers().length,
      hasHandTracking: this.hasHandTracking(),
    };
  }

  /**
   * Get current mode
   */
  getMode() {
    return this._mode;
  }

  /**
   * Check if currently in VR
   */
  isInVR() {
    return this._mode !== "inactive";
  }

  /**
   * Check if in isolation mode
   */
  isIsolated() {
    return this._mode === "isolated";
  }

  /**
   * Get the isolated view ID (if in isolation mode)
   */
  getIsolatedViewId() {
    return this._isolatedViewId;
  }

  /**
   * Get the current XR session
   * @returns {XRSession|null}
   */
  getSession() {
    return this._xrSession;
  }

  /**
   * Get the current reference space
   * @returns {XRReferenceSpace|null}
   */
  getReferenceSpace() {
    return this._referenceSpace;
  }

  /**
   * Snap-turn the user by a fixed step, pivoting about their HEAD rather than
   * the world origin. This is the standard WebXR way to turn in place without
   * touching camera/tool math: it chains an offset onto _referenceSpace, so
   * the NEXT frame's getViewerPose (head) AND every getPose (controllers)
   * come back already rotated — head, hands, floor and dataset all turn
   * together, consistently. The dataset placement (vrOrigin/vrScale) is
   * untouched.
   *
   * Pivoting about the world origin (the old behavior, still used by setYaw)
   * also TRANSLATES a user who is standing away from the origin — it reads as
   * lurching sideways rather than turning in place. Pivoting about the head
   * fixes that: build the rotation as P = T(h) . Ry(-step) . T(-h), i.e.
   * translate the head to the origin, rotate, translate back.
   *
   * WebXR's getOffsetReferenceSpace applies the transform as the new space's
   * origin expressed in the old space, which moves the world OPPOSITE the
   * intended head turn — so to turn the user by +step we rotate the space by
   * -step (same sign convention as setYaw).
   *
   * Head-pivot turns MUST compound (each turn has a different pivot, since
   * the head moves), so this chains off the CURRENT _referenceSpace rather
   * than rebuilding from _baseReferenceSpace: per the WebXR spec,
   * getOffsetReferenceSpace composes into a single originOffset rather than
   * building a linked list, so repeated calls correctly accumulate.
   *
   * Sanity check for the translation term: a physically fixed point p
   * transforms under the space offset as q' = T(h).Ry(+step).T(-h).q (the
   * inverse of the -step space rotation). At p = h this gives q' = h, i.e.
   * the head itself does not move — only the world spins around it. Since
   * camera position = xrPos/vrScale + vrOrigin, an unmoved head means no
   * lurch. When headPos is null/omitted, hx = hz = 0 and t degenerates to
   * {0,0,0} — i.e. the old world-origin pivot.
   *
   * @param {number} sign - +1 or -1 (right/left); magnitude ignored
   * @param {number|null} [stepRad=null] - turn step in radians; null falls
   *   back to the default 30° step (Math.PI / 6)
   * @param {{x:number,y:number,z:number}|null} [headPos=null] - head position
   *   in the current reference space (e.g. inputState.headPose.position);
   *   null pivots about the world origin (old behavior)
   * @returns {number} the new accumulated yaw offset (radians)
   */
  applySnapTurn(sign, stepRad = null, headPos = null) {
    if (!sign) return this._yawOffset;
    const step = Math.sign(sign) * (stepRad != null ? stepRad : Math.PI / 6);
    this._yawOffset += step;

    if (
      !this._referenceSpace ||
      typeof this._referenceSpace.getOffsetReferenceSpace !== "function" ||
      typeof XRRigidTransform !== "function"
    ) {
      return this._yawOffset;
    }
    try {
      const c = Math.cos(-step);
      const s = Math.sin(-step);
      const hx = headPos?.x || 0;
      const hz = headPos?.z || 0;
      const t = { x: hx - (hx * c + hz * s), y: 0, z: hz - (-hx * s + hz * c) };
      const half = -step / 2;
      const q = { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
      this._referenceSpace = this._referenceSpace.getOffsetReferenceSpace(
        new XRRigidTransform(t, q)
      );
    } catch (e) {
      log.warn(`Snap turn failed: ${e?.message}`);
    }
    return this._yawOffset;
  }

  /**
   * Set the absolute snap-turn yaw offset (radians), rebuilding _referenceSpace
   * from _baseReferenceSpace. No-ops (leaving _referenceSpace as-is) if there's
   * no base space yet or the platform lacks getOffsetReferenceSpace/XRRigidTransform.
   * @param {number} radians
   * @returns {number} the applied yaw offset
   */
  setYaw(radians) {
    this._yawOffset = radians;
    const base = this._baseReferenceSpace;
    if (
      !base ||
      typeof base.getOffsetReferenceSpace !== "function" ||
      typeof XRRigidTransform !== "function"
    ) {
      return this._yawOffset;
    }
    try {
      // Rotate the space by −yaw about world-up (Y). Quaternion for a rotation
      // of angle a about +Y is (0, sin(a/2), 0, cos(a/2)).
      const half = -this._yawOffset / 2;
      const orientation = { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
      const transform = new XRRigidTransform({ x: 0, y: 0, z: 0 }, orientation);
      this._referenceSpace = base.getOffsetReferenceSpace(transform);
    } catch (e) {
      log.warn(`Snap turn failed: ${e?.message}`);
    }
    return this._yawOffset;
  }

  /**
   * Current accumulated snap-turn yaw offset (radians). Any change means
   * `_referenceSpace` was just re-derived via getOffsetReferenceSpace — every
   * pose reported afterward (including cached raw-space anchors computed
   * before the change) is now expressed in a different coordinate frame. See
   * applySnapTurn/setYaw; consumers that cache raw XR-space coordinates
   * across frames (e.g. VTKVRSpatialUI's panel anchor) must watch this and
   * invalidate their cache when it changes.
   * @returns {number}
   */
  getYawOffset() {
    return this._yawOffset;
  }

  /**
   * Get the XR WebGL layer
   * @returns {XRWebGLLayer|null}
   */
  getXRLayer() {
    return this._xrLayer;
  }


  /**
   * Get current session configuration
   * @returns {{sessionId:string|null,navigationMode:string,scale:number,deviceProfile:string}|null}
   */
  getSessionConfig() {
    return this._sessionConfig ? { ...this._sessionConfig } : null;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  dispose() {
    if (this._xrSession) {
      this.exitVR();
    }

    // Clear VR-specific state
    this._inputSources.clear();
    this._hands = { left: null, right: null };

    // Call parent cleanup
    super.dispose();
  }

}

// Singleton instance
export const vrManager = new VRManager();
