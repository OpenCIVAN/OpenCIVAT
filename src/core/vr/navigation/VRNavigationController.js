// src/core/vr/navigation/VRNavigationController.js
// Orchestrates VR navigation layers (scale/twist, world-grab, walk+fly, object-move)

import { vr as log } from "@Utils/logger.js";
import { EXPLORATION_MODES } from "@Core/data/models/VRExplorationSession.js";
import { VRFlyMode } from "./VRFlyMode.js";
import { VRGrabMode } from "./VRGrabMode.js";
import { VRObjectMoveMode } from "./VRObjectMoveMode.js";
import { VRScaleController } from "./VRScaleController.js";
import { mapXRPointToData } from "@Core/vr/tools/vrPlaneMath.js";
import { readVRAccessibilitySettings } from "@Core/vr/vrAccessibilityStore.js";

/** Fallback snap-turn step (degrees) used when the configured value is missing or garbage. */
const DEFAULT_SNAP_TURN_DEGREES = 45;

/**
 * Per-mode display metadata (name/icon/description/controls), keyed by the
 * real EXPLORATION_MODES values. Module-level (not just an instance method)
 * so it's importable WITHOUT an instantiated controller — VRLaunchModal shows
 * this before a VR session (and its VRNavigationController) exists.
 * @type {Readonly<Record<string, {name:string, icon:string, description:string, controls:string}>>}
 */
// Walk and fly are no longer modes — both sticks are live at all times — so
// every entry describes the SAME control set. The keys are kept because
// persisted session rows still carry these values (see setMode).
const UNIVERSAL_CONTROLS =
  "Right stick: walk where you point | Left stick: fly along your aim | " +
  "Right stick L/R: snap turn | Grip: pull world | Grip+trigger: carry data | " +
  "Two-hand: scale/twist";

export const NAVIGATION_MODE_INFO = Object.freeze({
  [EXPLORATION_MODES.FLY]: {
    name: "Explore",
    icon: "fly",
    description: "Walk on the right stick, fly on the left; trigger free for tools",
    controls: UNIVERSAL_CONTROLS,
  },
  [EXPLORATION_MODES.TELEPORT]: {
    name: "Explore",
    icon: "fly",
    description: "Walk on the right stick, fly on the left; trigger free for tools",
    controls: UNIVERSAL_CONTROLS,
  },
  [EXPLORATION_MODES.WALK]: {
    name: "Explore",
    icon: "footprints",
    description: "Walk on the right stick, fly on the left; trigger free for tools",
    controls: UNIVERSAL_CONTROLS,
  },
  [EXPLORATION_MODES.GRAB]: {
    name: "Explore",
    icon: "move",
    description: "Walk on the right stick, fly on the left; trigger free for tools",
    controls: UNIVERSAL_CONTROLS,
  },
  [EXPLORATION_MODES.MOVE_OBJECT]: {
    name: "Move Object",
    icon: "move",
    description: "Reposition the dataset for all collaborators",
    controls: UNIVERSAL_CONTROLS,
  },
});

export class VRNavigationController {
  /**
   * Layered always-on navigation model (new in this revision). Per frame:
   *   1. Scale/twist (two-hand pinch+squeeze) — highest precedence; suppresses all others
   *   2. World-grab (grip-engaged VRGrabMode) — owns vrOrigin; suppresses stick locomotion
   *   3. Locomotion (VRFlyMode/FLY+WALK) + snap turn (right-stick flick) — always on
   *   4. Object-move (trigger-engaged VRObjectMoveMode) — independent; gated by manager
   *   5. Teleport (optional toggle) — when enabled, trigger aims/commits teleport
   *
   * Snap turn is debounced: fires once when |rightStickX| > 0.7, re-arms after < 0.3.
   * Engagement predicates are injected so grip/trigger can be remapped per platform.
   *
   * @param {object} session
   * @param {object} vrContext
   * @param {object} [options]
   * @param {object} [options.vrManager] - required for snap-turn plumbing
   * @param {(final: boolean) => void} [options.onObjectMoved] - forwarded to
   *   VRObjectMoveMode so the manager can broadcast the shared object transform.
   * @param {boolean} [options.enableTeleport=false] - if true, trigger does teleport
   *   (instead of object-move) when no exclusive tool is active.
   */
  constructor(session, vrContext, options = {}) {
    this._session = session;
    this._vrContext = vrContext;
    this._vrManager = options.vrManager;

    // Locomotion: two always-live instances of the same class, so there is no
    // walk-vs-fly mode to switch between and their deltas simply add.
    //   FLY  — left stick, full 3D along the LEFT controller's ray, strafe on X.
    //   WALK — right stick, ground-locked along the RIGHT controller's ray
    //          projected to the floor. No strafe: right X is snap turn, so you
    //          steer by pointing.
    this._flyMode = new VRFlyMode(vrContext, {
      hand: "left",
      planar: false,
      strafe: true,
    });
    this._walkMode = new VRFlyMode(vrContext, {
      hand: "right",
      planar: true,
      strafe: false,
    });

    // World-grab uses grip engagement (injected by VRExplorationManager)
    // Constructor will pass { isEngaged: gripPredicate }; see setWorldGrabEngagement.
    this._worldGrab = new VRGrabMode(vrContext);

    // Object-move uses trigger engagement (always trigger for object transform)
    this._objectMove = new VRObjectMoveMode(vrContext, {
      onObjectMoved: options.onObjectMoved,
    });

    // Scale controller is always active
    this._scaleController = new VRScaleController(vrContext);

    // Navigation mode state
    this._activeMode = null;
    this._activeModeId = null;

    // Snap-turn state. The step is read ONCE at construction (not on every
    // frame) from the VR accessibility settings persisted by
    // VRAccessibilityContext (src/ui/react/) — core can't import that context
    // directly (UI -> Core is the wrong direction), so it goes through the
    // shared vrAccessibilityStore module instead. 'off' disables snap turn
    // entirely; anything else is degrees, converted to radians here.
    this._snapTurnArmed = true; // ready to fire on next stick flick
    this._lastRightStickX = 0;
    this._snapTurnRad = this._resolveSnapTurnRad(readVRAccessibilitySettings());

    // Both locomotion instances gate their update() on _isActive.
    this._flyMode.activate();
    this._walkMode.activate();

    this.setMode(session.defaultExplorationMode || EXPLORATION_MODES.GRAB);
  }

  /**
   * Set the engagement predicate for world-grab (default trigger; overridden
   * to grip for tracked controllers by VRExplorationManager).
   * @param {(hand:Object)=>boolean} predicate - isEngaged(hand) => boolean
   */
  setWorldGrabEngagement(predicate) {
    if (predicate) {
      this._worldGrab = new VRGrabMode(this._vrContext, { isEngaged: predicate });
    }
  }

  /**
   * Retained for API/persistence compatibility only.
   *
   * Locomotion no longer has modes: fly (left stick) and walk (right stick)
   * are both live every frame, and carrying the dataset is the grip+trigger
   * chord rather than a mode. The FLY/WALK/TELEPORT enum values still arrive
   * here from persisted session rows (`default_exploration_mode`), so they are
   * accepted and normalised rather than rejected.
   *
   * @param {string} modeId - One of EXPLORATION_MODES
   */
  setMode(modeId) {
    const normalized =
      modeId === EXPLORATION_MODES.MOVE_OBJECT
        ? EXPLORATION_MODES.MOVE_OBJECT
        : EXPLORATION_MODES.GRAB;
    if (this._activeModeId === normalized) return;
    this._activeModeId = normalized;
    log.debug(`Navigation mode changed to: ${normalized} (requested: ${modeId})`);
  }

  /**
   * Get current navigation mode
   */
  getMode() {
    return this._activeModeId;
  }

  /**
   * Cycle through available navigation modes
   */
  cycleMode() {
    const modes = [
      EXPLORATION_MODES.FLY,
      EXPLORATION_MODES.TELEPORT,
      EXPLORATION_MODES.WALK,
      EXPLORATION_MODES.GRAB,
      EXPLORATION_MODES.MOVE_OBJECT,
    ];

    const currentIndex = modes.indexOf(this._activeModeId);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setMode(modes[nextIndex]);

    return modes[nextIndex];
  }

  /**
   * Layered always-on update: scale > world-grab > locomotion+snap-turn > object-move.
   * Each layer may suppress the ones below it (e.g. scaling prevents grab+locomotion).
   *
   * @param {Object} inputState - Controller input state
   * @param {XRFrame} frame - XR frame
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {Object} Navigation result { position, orientation, vrScale, vrRotation, ... }
   */
  update(inputState, frame, deltaTime) {
    let result = {
      position: null,
      orientation: null,
      vrScale: null,
      vrRotation: null,
      teleporting: false,
    };

    // --- Layer 1: Scale + twist (two-hand pinch/squeeze) — HIGHEST precedence ---
    const scaleResult = this._scaleController.update(inputState, deltaTime);
    const isScaling = scaleResult.scaling;
    if (isScaling) {
      result.vrScale = scaleResult.newScale;
      if (scaleResult.newRotation != null) {
        result.vrRotation = scaleResult.newRotation;
      }
      // The scale gesture also moves vrOrigin, so the dataset grows about the
      // point between the user's hands instead of about the XR origin (which
      // sent it flying off across the room and overhead). Nothing else writes
      // position on this frame — the layers below are all suppressed.
      if (scaleResult.position) {
        result.position = scaleResult.position;
      }
      // Signal all other layers they're suppressed so re-anchor on resume
      this._worldGrab.onFrameSkipped?.();
      this._flyMode.onFrameSkipped?.();
      this._objectMove.onFrameSkipped?.();
      return result; // Skip all lower layers
    }

    // --- Layer 2: World-grab (grip-engaged, always-on) ---
    const grabResult = this._worldGrab.update(inputState);
    const grabbing = this._worldGrab.isGrabbing();
    if (grabResult?.position) {
      result.position = grabResult.position;
    }
    if (grabResult?.grabEnded) {
      // Surface release so the manager persists the final placement.
      result.grabEnded = true;
    }

    // Also treat the release frame (grabEnded, isGrabbing already false) as
    // grab-owned so fly doesn't overwrite the grab's committed final position.
    const grabOwnsFrame = grabbing || !!grabResult?.grabEnded;

    if (grabOwnsFrame) {
      // While pulling the world, don't also stick-locomote (would fight the
      // grab for vrOrigin). Bleed velocity so it doesn't lurch on release.
      this._flyMode.onFrameSkipped?.();
      this._walkMode.onFrameSkipped?.();
    } else {
      // --- Layer 3: Locomotion (both sticks) + snap-turn (right stick X) ---
      //
      // Fly and walk are BOTH live, so they return deltas rather than absolute
      // positions — two absolute positions would overwrite each other and one
      // stick would silently win. Summing lets the user fly forward while
      // walking sideways, and keeps each instance's smoothing independent.
      const flyResult = this._flyMode.update(inputState, frame, deltaTime);
      const walkResult = this._walkMode.update(inputState, frame, deltaTime);
      const fly = flyResult?.delta;
      const walk = walkResult?.delta;

      if (fly || walk) {
        const o = this._vrContext.vrOrigin || [0, 0, 0];
        result.position = {
          x: o[0] + (fly?.x || 0) + (walk?.x || 0),
          y: o[1] + (fly?.y || 0) + (walk?.y || 0),
          z: o[2] + (fly?.z || 0) + (walk?.z || 0),
        };
      }

      // Snap-turn on right-stick X flick (always-on). Walk deliberately does
      // not strafe, so the right stick's X axis is free for this.
      if (this._vrManager) {
        this._updateSnapTurn(inputState);
      }
    }

    // --- Layer 4: object-move on GRIP + TRIGGER, always available ---
    //
    // Grip alone pulls the world (layer 2); grip AND trigger on the same hand
    // picks up the dataset itself. Making it a chord rather than a mode means
    // the user can carry the data without a trip to the menu — which is what
    // they reached for two grips to do — while a bare trigger stays free for
    // tools and the spatial menu.
    //
    // The manager strips the trigger from this input when a tool is active or
    // a menu is hovered, so this only ever sees a "free" trigger. The grip
    // predicate excludes trigger-held hands (see setWorldGrabEngagement), so
    // the chord routes here instead of driving a world grab — the two can
    // never run at once.
    if (this._isObjectMoveChord(inputState)) {
      this._objectMove.update(inputState);
    } else {
      // Keep the object-move mode's internal edge state from going stale so
      // the next chord re-anchors instead of jumping.
      this._objectMove.onFrameSkipped?.();
    }

    return result;
  }

  /**
   * True when either hand holds grip AND trigger together — the "carry the
   * dataset" chord. Deliberately checks the raw pair rather than a mode flag
   * so it works from any navigation state.
   * @private
   */
  _isObjectMoveChord(inputState) {
    const held = (c) =>
      !!c &&
      c.triggerPressed === true &&
      (c.isTransientPointer ? true : (c.squeezeValue || 0) > 0.4);
    return (
      held(inputState?.controllers?.left) ||
      held(inputState?.controllers?.right)
    );
  }

  /**
   * Resolve the configured movement.snapTurn value ('off' | 15 | 30 | 45 | 90
   * degrees) to radians, or null when snap turn is disabled. Falls back to
   * DEFAULT_SNAP_TURN_DEGREES for a missing/garbage value.
   * @param {{movement?: {snapTurn?: *}}} settings
   * @returns {number|null}
   * @private
   */
  _resolveSnapTurnRad(settings) {
    const raw = settings?.movement?.snapTurn;
    if (raw === "off") return null;
    const degrees = typeof raw === "number" && Number.isFinite(raw) ? raw : DEFAULT_SNAP_TURN_DEGREES;
    return (degrees * Math.PI) / 180;
  }

  /**
   * Handle snap-turn via right-stick X flick. Debounced: fires once when
   * |rightStickX| > 0.7, re-arms after it returns < 0.3. No-ops entirely when
   * the configured step is 'off' (this._snapTurnRad is null).
   * @private
   */
  _updateSnapTurn(inputState) {
    if (this._snapTurnRad == null) return;

    const rightStick = inputState?.controllers?.right?.thumbstick;
    const rightStickX = rightStick?.x || 0;

    if (this._snapTurnArmed && Math.abs(rightStickX) > 0.7) {
      // Fire snap turn: +X = right, -X = left
      const sign = Math.sign(rightStickX);
      const headPos = inputState?.headPose?.position || null;
      this._vrManager.applySnapTurn(sign, this._snapTurnRad, headPos);
      this._snapTurnArmed = false;
      this._lastRightStickX = rightStickX;
    } else if (!this._snapTurnArmed && Math.abs(rightStickX) < 0.3) {
      // Re-arm once the stick returns to center
      this._snapTurnArmed = true;
    }

    this._lastRightStickX = rightStickX;
  }

  /**
   * Get current VR scale
   */
  getScale() {
    return this._scaleController.getScale();
  }

  /**
   * Set VR scale directly
   *
   * @param {number} scale - New scale value
   */
  setScale(scale, pivotXR = null) {
    this._scaleController.setScale(scale, pivotXR);
  }

  /**
   * Get navigation mode display info for the CURRENTLY active mode. See
   * NAVIGATION_MODE_INFO for the full per-mode table (also usable without an
   * instantiated controller, e.g. by the pre-session launch modal).
   */
  getModeInfo() {
    return NAVIGATION_MODE_INFO[this._activeModeId] || NAVIGATION_MODE_INFO[EXPLORATION_MODES.FLY];
  }

  /**
   * Get scale controller info
   */
  getScaleInfo() {
    return {
      currentScale: this._scaleController.getScale(),
      minScale: this._scaleController.getMinScale(),
      maxScale: this._scaleController.getMaxScale(),
    };
  }

  /**
   * Clean up navigation controller
   */
  cleanup() {
    this._flyMode?.cleanup?.();
    this._walkMode?.cleanup?.();
    this._worldGrab?.cleanup?.();
    this._objectMove?.cleanup?.();
    this._scaleController?.cleanup?.();
  }
}

export default VRNavigationController;
