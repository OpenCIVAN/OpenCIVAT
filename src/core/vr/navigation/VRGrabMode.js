// src/core/vr/navigation/VRGrabMode.js
// "Grab" locomotion mode: pinch-and-drag the world to pull the data closer or
// push it away, so the dataset never feels bolted to a fixed spot (R4).
//
// SIGN DERIVATION (why we SUBTRACT delta/scale from vrOrigin)
// ---------------------------------------------------------------------------
// The camera mapping (VTKInstanceHandler._updateCameraFromVRPose) is:
//
//     dataPos = xrPos / vrScale + vrOrigin
//   ⇔ xrPos   = (dataPos - vrOrigin) * vrScale
//
// At grab start the data point sitting under the hand is:
//
//     dataUnderHand = startHandXR / vrScale + startOrigin
//
// As the hand moves to handNowXR we want that SAME data point to stay pinned
// under the hand (the grabbed point tracks the hand). Solve for the new origin:
//
//     dataUnderHand = handNowXR / vrScale + vrOrigin_new
//   ⇒ vrOrigin_new  = dataUnderHand - handNowXR / vrScale
//                    = startOrigin + (startHandXR - handNowXR) / vrScale
//                    = startOrigin - (handNowXR - startHandXR) / vrScale
//                    = startOrigin - delta / vrScale        (delta = handNowXR - startHandXR)
//
// Sanity check the "pull toward chest ⇒ data comes closer" requirement on the
// Z axis (WebXR: -Z is forward/away, +Z is back/toward the chest). Pulling the
// hand toward the chest means delta.z > 0, so vrOrigin_new.z decreases. A data
// point then renders at xrPos.z = (dataPos.z - vrOrigin.z) * vrScale, which
// INCREASES as vrOrigin.z drops — i.e. the whole dataset (and the grabbed
// point exactly) moves toward +Z, toward the user. Closer. Correct.
//
// Dividing by vrScale keeps the gesture 1:1 in physical space regardless of
// how zoomed-in the data is: at vrScale = 2 the same hand travel produces half
// the origin change, so the grabbed point still tracks the hand.

import { vr as log } from "@Utils/logger.js";

// 1:1 hand-to-world gain. No smoothing — the grabbed point must track the hand
// exactly so the manipulation feels direct.
const GRAB_GAIN = 1.0;

// Default engagement: the trigger (Vision Pro pinch or a controller's index
// trigger). VRExplorationManager constructs the always-on WORLD grab with a
// GRIP predicate instead (squeeze on tracked controllers, pinch on gripless
// Vision Pro sources) so grip pulls the world while the trigger stays free for
// object-move / tools / the menu — see VRNavigationController.
// Second argument (`engaged`) ignored by default, so existing callers/tests
// (which only ever pass the hand) are unchanged.
const DEFAULT_IS_ENGAGED = (hand, _engaged) => !!hand?.triggerPressed;

export class VRGrabMode {
  /**
   * @param {Object} vrContext - live VR context (vrScale / vrOrigin are the
   *   locomotion state this mode writes through its returned result).
   * @param {Object} [options]
   * @param {(hand:Object, engaged?:boolean)=>boolean} [options.isEngaged] -
   *   predicate deciding whether a controller is currently "gripping" for
   *   this grab. `engaged` is the CURRENT grab state for that hand, passed so
   *   a predicate can apply hysteresis (e.g. a Schmitt trigger: engage at a
   *   high threshold, release at a lower one) instead of chattering on a
   *   single threshold. Defaults to the trigger, ignoring `engaged`, so
   *   existing callers/tests are unchanged.
   */
  constructor(vrContext, options = {}) {
    this._vrContext = vrContext;
    this._isEngaged = options.isEngaged || DEFAULT_IS_ENGAGED;
    this.reset();
  }

  activate() {
    this.reset();
    log.debug("VRGrabMode activated");
  }

  deactivate() {
    this.reset();
    log.debug("VRGrabMode deactivated");
  }

  reset() {
    this._grabbing = false;
    this._wasPressed = false;
    this._startHandXR = null;
    this._startOrigin = null;
    this._lastPosition = null;
    // True once update() has run for a frame; cleared by onFrameSkipped() so a
    // grab that resumes after a suppressed frame re-anchors instead of jumping.
    this._ranLastFrame = false;
    // Hand latched for the duration of the current grab (see _pickHandName).
    // Prevents a mid-grab re-pick from comparing the new hand's position
    // against the old hand's anchor and teleporting vrOrigin.
    this._grabHand = null;
  }

  /**
   * Called by VRNavigationController on frames where it suppresses the active
   * mode (two-hand scale gesture in progress). Marks that this mode did NOT run
   * last frame so the next GRABBING frame re-anchors from current values.
   */
  onFrameSkipped() {
    this._ranLastFrame = false;
  }

  /**
   * @param {Object} inputState - controller input state
   * @returns {{position?:{x,y,z}, grabEnded?:boolean}} navigation result:
   *   `position` (new vrOrigin) while grabbing, plus `grabEnded:true` on the
   *   frame the pinch releases (so the frame loop can persist the final pose).
   */
  update(inputState) {
    const handName = this._pickHandName(inputState);
    const hand = handName ? inputState?.controllers?.[handName] : null;
    // Pass the current grab state so the predicate applies the release (low)
    // threshold once engaged — see gripPredicate in VRExplorationManager.
    const pressed = !!hand && this._isEngaged(hand, this._grabbing);
    const pos = hand?.pose?.position;

    // Falling edge OR pose loss while grabbing → end the grab, hold last pose.
    if (this._grabbing && (!pressed || !pos)) {
      this._grabbing = false;
      this._wasPressed = pressed;
      this._ranLastFrame = true;
      this._grabHand = null;
      return { position: this._lastPosition ? { ...this._lastPosition } : null, grabEnded: true };
    }

    // Rising edge → anchor the grab at the current hand + origin.
    if (!this._grabbing && pressed && !this._wasPressed && pos) {
      this._anchor(pos);
      this._grabbing = true;
      this._grabHand = handName;
    }

    let result = { position: null };

    if (this._grabbing && pos) {
      // If a frame was suppressed (two-hand scale) while we were grabbing,
      // vrOrigin/vrScale may have moved out from under us — re-anchor so the
      // grab resumes from where the hand is now rather than snapping.
      if (!this._ranLastFrame) {
        this._anchor(pos);
      }

      const scale = this._vrContext.vrScale || 1.0;
      const delta = [
        pos.x - this._startHandXR[0],
        pos.y - this._startHandXR[1],
        pos.z - this._startHandXR[2],
      ];
      const origin = this._startOrigin.map(
        (v, i) => v - (delta[i] * GRAB_GAIN) / scale
      );
      this._lastPosition = { x: origin[0], y: origin[1], z: origin[2] };
      result = { position: { ...this._lastPosition } };
    }

    this._wasPressed = pressed;
    this._ranLastFrame = true;
    return result;
  }

  /**
   * Pick the name ('right'/'left') of the grabbing hand. Prefer a hand that
   * is BOTH posed and currently engaged (so gripping the left hand grabs
   * with the left, not the right), falling back to any posed hand so the
   * rising-edge anchor still fires the frame a grip begins.
   *
   * While a grab is in progress the hand is LATCHED: re-picking mid-grab
   * would compare the new hand's position against the old hand's anchor and
   * teleport vrOrigin by the full inter-hand distance in one frame. Losing
   * the latched hand's pose returns null, which routes update() into its
   * falling-edge branch — the grab ends cleanly on the last good position
   * rather than switching hands.
   * @private
   */
  _pickHandName(inputState) {
    const c = inputState?.controllers || {};
    if (this._grabbing && this._grabHand) {
      return c[this._grabHand]?.pose ? this._grabHand : null;
    }
    if (c.right?.pose && this._isEngaged(c.right, false)) return 'right';
    if (c.left?.pose && this._isEngaged(c.left, false)) return 'left';
    if (c.right?.pose) return 'right';
    if (c.left?.pose) return 'left';
    return null;
  }

  /** Record the grab anchor (hand XR position + current vrOrigin). @private */
  _anchor(pos) {
    this._startHandXR = [pos.x, pos.y, pos.z];
    const origin = this._vrContext.vrOrigin || [0, 0, 0];
    this._startOrigin = [origin[0], origin[1], origin[2]];
    this._lastPosition = { x: origin[0], y: origin[1], z: origin[2] };
  }

  isGrabbing() {
    return this._grabbing;
  }
}

export default VRGrabMode;
