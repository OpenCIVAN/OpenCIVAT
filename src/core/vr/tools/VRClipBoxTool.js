// src/core/vr/tools/VRClipBoxTool.js
// Clip Plane tool for VR — drive the shared clipping plane with a controller.
//
// This tool drives VTKClippingFeature (the same feature the desktop
// clipping-plane menu uses), so a VR-manipulated clip plane:
//   - actually clips the data (mapper clipping plane, not a visual-only prop)
//   - reaches all collaborators live via the existing `clipBox` visualization
//     sync channel (VRExplorationManager pushes getConfigForSync on gesture end)
//   - persists into ViewConfiguration like any desktop clipping change.
//
// Historical note: this file previously implemented a 6-sided "clip box" that
// called handler.setClipBox/updateClipBox/removeClipBox — methods that never
// existed, making the tool a total no-op. It was deliberately re-scoped to a
// single plane so it could reuse the working, synced clipping channel.
//
// Coordinate spaces: controller poses arrive in XR space; the clipping plane
// lives in data space. Origins are converted with mapXRPointToData
// (dataPos = xrPos / vrScale + vrOrigin); normals are direction vectors and
// only need the controller-orientation rotation (see vrPlaneMath.js).

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';
import { vtkClippingFeature } from '@Core/instances/types/vtk/features/index.js';
import { controllerForward, mapXRPointToData } from './vrPlaneMath.js';

export class VRClipBoxTool extends VRToolInterface {
  constructor() {
    super({
      id: 'clip',
      name: 'Clip Plane',
      icon: 'box',
      category: 'visualization',
    });

    this._dragging = false;
    this._dragHand = null;
    this._lastAButtonState = false;
    this._lastBButtonState = false;
  }

  async activate(context) {
    await super.activate(context);

    const instanceId = context.vrContext?.instanceId;
    if (instanceId) {
      try {
        vtkClippingFeature.enableClipping(instanceId);
      } catch (err) {
        log.warn(`Clip plane: enableClipping failed: ${err?.message}`);
      }
    }

    log.debug('Clip plane tool activated');
  }

  async deactivate() {
    await super.deactivate();
    // Clipping intentionally stays enabled on deactivate — the plane is shared
    // state; peers (or the desktop menu) turn it off explicitly.
    this._dragging = false;
    this._dragHand = null;
  }

  handleInput(inputState /*, frame */) {
    const { controllers } = inputState;
    const instanceId = this._context?.vrContext?.instanceId;
    if (!instanceId) return null;

    // Grip drag: plane follows the controller (origin at controller position,
    // normal along controller forward).
    if (!this._dragging) {
      for (const hand of ['left', 'right']) {
        const ctrl = controllers[hand];
        if (ctrl?.squeezePressed && ctrl.pose?.position) {
          this._dragging = true;
          this._dragHand = hand;
          return { type: 'clip-grab-start', data: { instanceId } };
        }
      }
    }

    if (this._dragging) {
      const ctrl = controllers[this._dragHand];

      if (!ctrl?.squeezePressed) {
        // Gesture end — signal the manager to sync/persist the final plane.
        this._dragging = false;
        this._dragHand = null;
        return { type: 'clip-box-updated', data: { instanceId, final: true } };
      }

      if (ctrl.pose?.position && ctrl.pose?.orientation) {
        const { vrScale, vrOrigin } = this._context.vrContext;
        const origin = mapXRPointToData(ctrl.pose.position, vrScale, vrOrigin);
        const normal = controllerForward(ctrl.pose.orientation);
        try {
          vtkClippingFeature.setPlaneData(instanceId, { origin, normal });
        } catch (err) {
          log.warn(`Clip plane: setPlaneData failed: ${err?.message}`);
        }
        return { type: 'clip-box-updated', data: { instanceId, final: false } };
      }
      return null;
    }

    const right = controllers.right;

    // A button: invert clipping direction.
    if (right?.buttons?.a && !this._lastAButtonState) {
      this._lastAButtonState = true;
      try {
        vtkClippingFeature.invertClipping(instanceId);
      } catch (err) {
        log.warn(`Clip plane: invert failed: ${err?.message}`);
      }
      return { type: 'clip-box-updated', data: { instanceId, final: true } };
    }
    this._lastAButtonState = right?.buttons?.a || false;

    // B button: reset the plane.
    if (right?.buttons?.b && !this._lastBButtonState) {
      this._lastBButtonState = true;
      try {
        vtkClippingFeature.resetPlane(instanceId);
      } catch (err) {
        log.warn(`Clip plane: reset failed: ${err?.message}`);
      }
      return { type: 'clip-box-updated', data: { instanceId, final: true } };
    }
    this._lastBButtonState = right?.buttons?.b || false;

    return null;
  }

  getControllerHints() {
    return {
      left: {
        grip: 'Hold to aim clip plane',
      },
      right: {
        grip: 'Hold to aim clip plane',
        a: 'Invert direction',
        b: 'Reset plane',
      },
    };
  }
}

export default VRClipBoxTool;
