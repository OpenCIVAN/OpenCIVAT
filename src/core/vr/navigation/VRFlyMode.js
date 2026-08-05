// src/core/vr/navigation/VRFlyMode.js
// Stick locomotion for VR exploration — one class, two configurations.
//
// VRNavigationController builds two instances of this:
//   * FLY  — left stick, full 3D along the LEFT controller's ray (aim up, fly
//            up), with strafe on the X axis.
//   * WALK — right stick, ground-locked along the RIGHT controller's ray
//            projected onto the floor plane. No strafe: right stick X is snap
//            turn, so you steer by pointing rather than by strafing.
// Both are always live and their deltas simply add, so there is no walk/fly
// "mode" to switch between.
//
// Movement is CONTROLLER-relative, not head-relative. You go where you point,
// which is what makes the stick read as moving the user rather than sliding
// the dataset — you can look around freely while travelling.

import { vr as log } from "@Utils/logger.js";
import { controllerForward } from "@Core/vr/tools/vrPlaneMath.js";

export class VRFlyMode {
  constructor(vrContext, options = {}) {
    this._vrContext = vrContext;
    this._options = {
      baseSpeed: 2.0, // meters per second at scale 1.0
      // Which controller supplies both the stick and the aim direction.
      hand: "left",
      // Ground-locked: the aim ray is projected onto the floor plane and the
      // vertical (A/B) input is ignored, so this instance can never change
      // altitude. This is what makes WALK walk.
      planar: false,
      // Whether stick X strafes. Off for the walk instance, whose X axis
      // belongs to snap turn.
      strafe: true,
      // Thumbstick deadzone. Must be >= the worst-case resting drift on a
      // diagonal, not just per-axis: the deadzone is applied to the RADIAL
      // magnitude (see _getMovementInput), and a worn Quest 2 stick resting
      // at (x, x) on both axes has magnitude x*sqrt(2). A per-axis-safe
      // 0.15/0.15 rest point (each axis under the old 0.15 threshold) has
      // hypot ~0.212, which used to pass the deadzone and produce a small
      // but permanent unwanted drift. 0.2 covers a diagonal rest point of
      // ~0.14/axis with margin.
      deadzone: 0.2,
      // Exponential smoothing time constant (seconds) — dt-correct, unlike a
      // per-frame smoothing factor (see update()). -(1/72)/Math.log(0.9)
      // matches the feel of the old smoothing:0.9 at 72 Hz.
      smoothingTau: 0.1318,
      ...options,
    };

    // Velocity in the controller's LOCAL frame: x = strafe, y = vertical,
    // z = along the aim ray. Smoothing the local scalars rather than a world
    // vector means the velocity follows your aim as you turn, instead of
    // coasting off in the direction you were pointing a moment ago.
    this._velocity = { x: 0, y: 0, z: 0 };
    this._isActive = false;
  }

  activate() {
    this._isActive = true;
    this._velocity = { x: 0, y: 0, z: 0 };
    log.debug(`VRFlyMode activated (${this._options.hand}, planar=${this._options.planar})`);
  }

  deactivate() {
    this._isActive = false;
    log.debug("VRFlyMode deactivated");
  }

  /** No-op re-anchor hook (parity with grab layers) — locomotion holds no
   * cross-frame anchor beyond smoothed velocity, so nothing to reset. */
  onFrameSkipped() {
    // Bleed velocity so locomotion doesn't lurch when a suppressed frame
    // (two-hand scale, world grab) ends.
    this._velocity = { x: 0, y: 0, z: 0 };
  }

  /**
   * Update locomotion for this frame.
   *
   * Returns a DELTA (data space), not an absolute vrOrigin: fly and walk are
   * both live every frame, so two absolute positions would overwrite each
   * other. VRNavigationController sums the deltas and applies them once.
   *
   * @param {Object} inputState - Controller input state
   * @param {XRFrame} frame - XR frame (unused; kept for layer signature parity)
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {{delta: {x,y,z}|null, speed: number}}
   */
  update(inputState, frame, deltaTime) {
    if (!this._isActive) return { delta: null, speed: 0 };

    const controller = inputState.controllers?.[this._options.hand];

    // baseSpeed is "meters per second at scale 1.0" (a physical walking
    // pace); dividing by vrScale converts that into the equivalent
    // data-space speed, matching the camera's own xrPos/vrScale mapping
    // (VTKInstanceHandler._updateCameraFromVRPose) so travel feels like a
    // consistent physical pace regardless of the current zoom level.
    const vrScale = this._vrContext.vrScale || 1.0;
    const speed = this._options.baseSpeed / vrScale;

    const moveInput = this._getMovementInput(controller);

    const targetVelocity = {
      x: this._options.strafe ? moveInput.x * speed : 0,
      y: this._options.planar ? 0 : moveInput.y * speed,
      z: moveInput.z * speed,
    };

    // Smooth velocity — exponential decay toward targetVelocity with a fixed
    // time constant (tau), so the ramp feels the same regardless of frame
    // rate (72 vs 90 vs 120 Hz). A per-frame smoothing factor (the old
    // `smoothing: 0.9` applied every frame) is frame-rate dependent: the same
    // factor converges faster at higher Hz.
    const alpha = 1 - Math.exp(-deltaTime / this._options.smoothingTau);
    this._velocity = {
      x: this._velocity.x + (targetVelocity.x - this._velocity.x) * alpha,
      y: this._velocity.y + (targetVelocity.y - this._velocity.y) * alpha,
      z: this._velocity.z + (targetVelocity.z - this._velocity.z) * alpha,
    };

    // Idle deadband: exponential decay toward a released stick's zero target
    // asymptotically approaches {0,0,0} but never exactly reaches it, so the
    // delta was ALWAYS non-null and vrContext.vrOrigin got a new
    // (epsilon-different) value every frame forever. That permanently defeats
    // VREnvironment.updateTransform's dirty check, re-transforming every
    // environment actor each frame even when the user is standing still. Snap
    // components below a noise floor to exactly 0, and when all three are
    // exactly zero, report no movement at all.
    const idleThreshold = 1e-4 * speed;
    if (Math.abs(this._velocity.x) < idleThreshold) this._velocity.x = 0;
    if (Math.abs(this._velocity.y) < idleThreshold) this._velocity.y = 0;
    if (Math.abs(this._velocity.z) < idleThreshold) this._velocity.z = 0;

    if (
      this._velocity.x === 0 &&
      this._velocity.y === 0 &&
      this._velocity.z === 0
    ) {
      return { delta: null, speed: 0 };
    }

    // Compose the local velocity onto the controller's basis. Direction
    // vectors are unaffected by the XR->data map (which is scale + translation
    // only, no rotation), so a unit XR direction is also a unit data-space
    // direction — see the note atop vrPlaneMath.js.
    const { fwd, right } = this._basis(controller);
    const vx = this._velocity.x;
    const vy = this._velocity.y;
    const vz = this._velocity.z;

    return {
      delta: {
        x: (right[0] * vx + fwd[0] * vz) * deltaTime,
        y: (fwd[1] * vz + vy) * deltaTime, // right[] is horizontal, so no term
        z: (right[2] * vx + fwd[2] * vz) * deltaTime,
      },
      speed: Math.hypot(vx, vy, vz),
    };
  }

  /**
   * Aim basis for this instance's controller: `fwd` is where the ray points
   * (flattened to the floor plane when `planar`), `right` is the horizontal
   * perpendicular.
   *
   * Uses `targetRay` — the AIMING ray — rather than `pose`, which is the grip
   * axis. On Quest they differ by a noticeable tilt, and the user's mental
   * model is "I go where the pointer points". Falls back to `pose` because
   * targetRay is absent for some input sources.
   * @private
   */
  _basis(controller) {
    const ray = controller?.targetRay || controller?.pose;
    let f = ray?.orientation ? controllerForward(ray.orientation) : [0, 0, -1];

    if (this._options.planar) {
      const l = Math.hypot(f[0], f[2]);
      // Aiming straight up or down has no heading — hold the last sensible
      // direction rather than producing NaN or lurching sideways.
      f = l > 1e-4 ? [f[0] / l, 0, f[2] / l] : [0, 0, -1];
    } else {
      const l = Math.hypot(f[0], f[1], f[2]) || 1;
      f = [f[0] / l, f[1] / l, f[2] / l];
    }

    // right = fwd x up, horizontal by construction.
    let r = [-f[2], 0, f[0]];
    const rl = Math.hypot(r[0], r[2]);
    r = rl > 1e-4 ? [r[0] / rl, 0, r[2] / rl] : [1, 0, 0];

    return { fwd: f, right: r };
  }

  /**
   * Deadzoned stick input, mapped into the controller's local frame.
   * @private
   */
  _getMovementInput(controller) {
    if (!controller?.thumbstick) {
      return { x: 0, y: 0, z: 0 };
    }

    const { x, y } = controller.thumbstick;
    const deadzone = this._options.deadzone;

    // Radial deadzone with rescale. A per-axis deadzone (Math.abs(x) >
    // deadzone ? x : 0) rejects a diagonal push whose axes are each below the
    // threshold even though its magnitude is well past it, and snaps
    // discontinuously to full value the instant either axis crosses the
    // threshold. Radial deadzone treats the stick as a disc and rescales the
    // surviving magnitude back into [0, 1] so speed ramps continuously from
    // zero at the deadzone boundary.
    const mag = Math.min(1, Math.hypot(x, y));
    let adjustedX = 0;
    let adjustedY = 0;
    if (mag > deadzone) {
      const k = ((mag - deadzone) / (1 - deadzone)) / mag;
      adjustedX = x * k;
      adjustedY = y * k;
    }

    // NEGATED, and this matters. WebXR reports axes[3] as NEGATIVE when the
    // stick is pushed forward. The previous head-relative implementation let
    // that raw value through because it then rotated the vector in a frame
    // where -Z was forward, so the two conventions cancelled. Here `z` is a
    // scalar amount along an EXPLICIT forward basis vector, so a negative
    // value would drive the user backwards along their own aim. Two sign
    // inversions have shipped in this function before — the direction tests in
    // VRFlyMode.test.js exist to catch a third.
    const forwardAmount = -adjustedY;

    // Vertical from A/B buttons only. Squeeze/grip is reserved for world-grab
    // (VRExplorationManager's grip predicate, engages above 0.7); a
    // squeezeValue branch here used to overlap that band, so every world-grab
    // start also produced an unintended upward lurch.
    let verticalInput = 0;
    if (controller.buttons?.a) verticalInput = 1;
    if (controller.buttons?.b) verticalInput = -1;

    return {
      x: adjustedX, // strafe
      y: verticalInput, // up/down
      z: forwardAmount, // along the aim ray
    };
  }
}

export default VRFlyMode;
