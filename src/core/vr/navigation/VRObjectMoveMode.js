// src/core/vr/navigation/VRObjectMoveMode.js
// "Move object" manipulation mode: pinch-and-drag to translate the ACTIVE
// dataset's own transform (its position in data space), as opposed to VRGrabMode
// which moves the whole world (vrOrigin) for locomotion.
//
// This is the VR equivalent of dragging the Transform > Position sliders in the
// desktop InstanceToolsPanel: it moves the shared object for EVERY collaborator.
// The applied transform is broadcast by VRExplorationManager via the same
// visualizationSyncService channel the desktop panel uses, so an in-VR move is
// identical to a desktop one.
//
// COORDINATE DERIVATION
// ---------------------------------------------------------------------------
// The camera mapping is  xrPos = (dataPos - vrOrigin) * vrScale. To keep the
// grabbed point of the object pinned under the hand as the hand moves by
// Δhand (XR space), the object's xr position must move by Δhand, so its DATA
// position must change by ΔP = Δhand / vrScale:
//
//     (P_new - vrOrigin)*scale - (P_old - vrOrigin)*scale = Δhand
//   ⇒ ΔP = P_new - P_old = Δhand / vrScale
//
// i.e. the object moves the SAME direction as the hand (VRGrabMode moves the
// world the opposite way to pull data toward the user). Dividing by vrScale
// keeps the gesture 1:1 in physical space regardless of zoom. World yaw
// (vrRotation) is ignored here, matching VRGrabMode's delta convention.

import { vr as log } from "@Utils/logger.js";
import { instanceTools } from "@VTK/vtkInstanceTools.js";

// 1:1 hand-to-object gain — the grabbed point must track the hand exactly.
const MOVE_GAIN = 1.0;

export class VRObjectMoveMode {
  /**
   * @param {Object} vrContext - live VR context (vrScale + instanceId).
   * @param {Object} [options]
   * @param {(final: boolean) => void} [options.onObjectMoved] - called after the
   *   object transform is applied locally each grabbing frame (final=false) and
   *   once on release (final=true), so the manager can broadcast/persist it.
   */
  constructor(vrContext, options = {}) {
    this._vrContext = vrContext;
    this._onObjectMoved = options.onObjectMoved || null;
    this.reset();
  }

  activate() {
    this.reset();
    log.debug("VRObjectMoveMode activated");
  }

  deactivate() {
    this.reset();
    log.debug("VRObjectMoveMode deactivated");
  }

  reset() {
    this._grabbing = false;
    this._wasPressed = false;
    this._startHandXR = null;
    this._startObjPos = null;
    this._ranLastFrame = false;
  }

  /** See VRGrabMode.onFrameSkipped — re-anchor a held grab after a suppressed frame. */
  onFrameSkipped() {
    this._ranLastFrame = false;
  }

  /**
   * @param {Object} inputState - controller input state
   * @returns {Object} navigation result. Always empty of `position` — moving the
   *   object must NOT move the world (vrOrigin stays put).
   */
  update(inputState) {
    const instanceId = this._vrContext?.instanceId;
    const hand = this._pickHand(inputState);
    const pressed = !!hand?.triggerPressed;
    const pos = hand?.pose?.position;

    // Falling edge OR pose loss while grabbing → end the grab, emit final.
    if (this._grabbing && (!pressed || !pos)) {
      this._grabbing = false;
      this._wasPressed = pressed;
      this._ranLastFrame = true;
      this._onObjectMoved?.(true);
      return {};
    }

    // Rising edge → anchor at current hand + object position.
    if (!this._grabbing && pressed && !this._wasPressed && pos && instanceId) {
      this._anchor(pos, instanceId);
      this._grabbing = true;
    }

    if (this._grabbing && pos && instanceId) {
      // Re-anchor if a frame was suppressed (two-hand scale) so we don't jump.
      if (!this._ranLastFrame || !this._startObjPos) {
        this._anchor(pos, instanceId);
      }

      const scale = this._vrContext.vrScale || 1.0;
      const nx = this._startObjPos[0] + ((pos.x - this._startHandXR[0]) * MOVE_GAIN) / scale;
      const ny = this._startObjPos[1] + ((pos.y - this._startHandXR[1]) * MOVE_GAIN) / scale;
      const nz = this._startObjPos[2] + ((pos.z - this._startHandXR[2]) * MOVE_GAIN) / scale;

      instanceTools.setPosition?.(instanceId, nx, ny, nz);
      this._onObjectMoved?.(false);
    }

    this._wasPressed = pressed;
    this._ranLastFrame = true;
    return {};
  }

  /** Pick the grabbing hand: right if posed, else left. @private */
  _pickHand(inputState) {
    const right = inputState?.controllers?.right;
    if (right?.pose) return right;
    const left = inputState?.controllers?.left;
    if (left?.pose) return left;
    return null;
  }

  /** Record the grab anchor (hand XR position + current object data position). @private */
  _anchor(pos, instanceId) {
    this._startHandXR = [pos.x, pos.y, pos.z];
    const p = instanceTools.getPosition?.(instanceId) || [0, 0, 0];
    this._startObjPos = [p[0], p[1], p[2]];
  }

  isGrabbing() {
    return this._grabbing;
  }
}

export default VRObjectMoveMode;
