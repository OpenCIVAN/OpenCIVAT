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
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPlaneSource from '@kitware/vtk.js/Filters/Sources/PlaneSource';
import { vtkClippingFeature } from '@Core/instances/types/vtk/features/index.js';
import {
  controllerForward,
  mapXRPointToData,
  buildPlaneFrameMatrix,
  quantizeNormalToAxis,
} from './vrPlaneMath.js';
import { VRTextBillboard } from '@Core/vr/ui/VRTextBillboard.js';

const PLANE_COLOR = [0.35, 0.75, 1.0];
const PLANE_OPACITY = 0.22;
const OUTLINE_COLOR = [0.6, 0.9, 1.0];
const READOUT_APPARENT_HEIGHT_M = 0.02;
const READOUT_TEXT_COLOR = '#eaf6ff';
const READOUT_BACKGROUND = 'rgba(10,26,40,0.82)';
// Quad size relative to the dataset's bounding diagonal — slightly oversized so
// the cut plane visibly extends past the geometry it is cutting.
const PLANE_SIZE_FACTOR = 1.2;

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

    // In-headset visuals — you could previously only infer where the cut was
    // from the hole it left in the data.
    this._renderer = null;
    this._planeActor = null;
    this._outlineActor = null;
    this._planeSource = null;
    this._readout = null;
    this._plane = null; // last { origin, normal } applied
    this._axisLock = null; // null = free aim, else 'x' | 'y' | 'z'
  }

  /**
   * Whether this controller is currently aiming the clip plane.
   *
   * TRIGGER on both platforms, deliberately NOT grip. Grip is never stripped
   * from navigation (world-grab is always-on), so a grip-driven clip would
   * fight world-grab on Quest — and grip does not exist AT ALL on Vision Pro,
   * where _gatherInputState hardcodes squeezePressed:false for transient
   * pointers. This tool was therefore unusable on Vision Pro even once the
   * underlying clipping feature was fixed. Trigger IS stripped from nav on both
   * hands whenever a tool is active, so it is the one input guaranteed to be
   * both present and free here.
   *
   * This intentionally differs from VRNavigationController's own predicate
   * (isTransientPointer ? trigger : squeeze > 0.7) — that one routes
   * world-grab, which must stay on grip for Quest.
   * @private
   */
  _isAimPressed(ctrl) {
    return !!ctrl?.triggerPressed;
  }

  async activate(context) {
    await super.activate(context);

    const instanceId = context.vrContext?.instanceId;
    if (instanceId) {
      try {
        // manual:true is mandatory in VR — the widget path needs a mouse
        // interactor and would add widget actors into the renderer VR shares
        // with the desktop canvas.
        vtkClippingFeature.enableClipping(instanceId, { manual: true });
        this._plane = vtkClippingFeature.getPlaneData?.(instanceId) || null;
      } catch (err) {
        log.warn(`Clip plane: enableClipping failed: ${err?.message}`);
      }
    }

    log.debug('Clip plane tool activated');
  }

  async deactivate() {
    await super.deactivate();
    // Clipping intentionally stays enabled on deactivate — the plane is shared
    // state; peers (or the desktop menu) turn it off explicitly. The VISUALS
    // are tool chrome, though, and must go.
    this._dragging = false;
    this._dragHand = null;
    this._clearPlaneVisual();
  }

  handleInput(inputState /*, frame */) {
    const { controllers } = inputState;
    const instanceId = this._context?.vrContext?.instanceId;
    if (!instanceId) return null;

    // Trigger drag: the plane follows the controller — origin at the controller
    // position, normal along controller forward. See _isAimPressed for why
    // trigger and not grip.
    if (!this._dragging) {
      for (const hand of ['left', 'right']) {
        const ctrl = controllers[hand];
        if (this._isAimPressed(ctrl) && ctrl.pose?.position) {
          this._dragging = true;
          this._dragHand = hand;
          return { type: 'clip-grab-start', data: { instanceId } };
        }
      }
    }

    if (this._dragging) {
      const ctrl = controllers[this._dragHand];

      if (!this._isAimPressed(ctrl)) {
        // Gesture end — signal the manager to sync/persist the final plane.
        this._dragging = false;
        this._dragHand = null;
        return { type: 'clip-box-updated', data: { instanceId, final: true } };
      }

      if (ctrl.pose?.position && ctrl.pose?.orientation) {
        const { vrScale, vrOrigin } = this._context.vrContext;
        const origin = mapXRPointToData(ctrl.pose.position, vrScale, vrOrigin);
        let normal = controllerForward(ctrl.pose.orientation);
        // Axis lock snaps to the nearest principal axis, so an exactly
        // axis-aligned cut doesn't require a steady hand.
        if (this._axisLock) normal = this._axisNormal(this._axisLock);

        try {
          vtkClippingFeature.setPlaneData(instanceId, { origin, normal });
          this._plane = { origin, normal };
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
      return this.invert();
    }
    this._lastAButtonState = right?.buttons?.a || false;

    // B button: reset the plane.
    if (right?.buttons?.b && !this._lastBButtonState) {
      this._lastBButtonState = true;
      return this.reset();
    }
    this._lastBButtonState = right?.buttons?.b || false;

    return null;
  }

  /**
   * Invert the clip plane's direction. Shared by the A-button shortcut and
   * the spatial menu's contextual "Invert" button.
   * @returns {{type:string,data:object}|null} clip-box-updated action, or
   *   null if there's no active instance to clip.
   */
  invert() {
    const instanceId = this._context?.vrContext?.instanceId;
    if (!instanceId) return null;
    try {
      vtkClippingFeature.invertClipping(instanceId);
    } catch (err) {
      log.warn(`Clip plane: invert failed: ${err?.message}`);
    }
    return { type: 'clip-box-updated', data: { instanceId, final: true } };
  }

  /**
   * Reset the clip plane to its default. Shared by the B-button shortcut and
   * the spatial menu's contextual "Reset" button.
   * @returns {{type:string,data:object}|null} clip-box-updated action, or
   *   null if there's no active instance to clip.
   */
  reset() {
    const instanceId = this._context?.vrContext?.instanceId;
    if (!instanceId) return null;
    try {
      vtkClippingFeature.resetPlane(instanceId);
    } catch (err) {
      log.warn(`Clip plane: reset failed: ${err?.message}`);
    }
    return { type: 'clip-box-updated', data: { instanceId, final: true } };
  }

  /**
   * Undo the last clip change. The clip plane is a single piece of shared
   * state rather than a stack of discrete items, so the meaningful "undo" is
   * to put it back to its default — the same thing the contextual Reset button
   * does. Implements the optional `undoLast` hook that
   * VRExplorationManager.undoLastToolAction() calls, so the menu's global Undo
   * button is no longer a silent no-op while the clip tool is active.
   *
   * @returns {{type:string,data:object}|null} clip-box-updated action, or null
   *   if there's no active instance to clip.
   */
  undoLast() {
    return this.reset();
  }

  /**
   * Cycle the aim constraint: free -> X -> Y -> Z -> free. Backs the contextual
   * "Axis" button, and matters most on Vision Pro where there is no grip to
   * brace against while aiming.
   * @returns {{type:string,data:object}|null}
   */
  cycleAxisLock() {
    const instanceId = this._context?.vrContext?.instanceId;
    if (!instanceId) return null;

    const order = [null, 'x', 'y', 'z'];
    this._axisLock = order[(order.indexOf(this._axisLock) + 1) % order.length];

    // Re-apply immediately so the change is visible without re-aiming.
    if (this._axisLock && this._plane?.origin) {
      const normal = this._axisNormal(this._axisLock);
      try {
        vtkClippingFeature.setPlaneData(instanceId, { origin: this._plane.origin, normal });
        this._plane = { origin: this._plane.origin, normal };
      } catch (err) {
        log.warn(`Clip plane: axis lock failed: ${err?.message}`);
      }
    }
    return { type: 'clip-box-updated', data: { instanceId, final: true, axis: this._axisLock } };
  }

  /** @returns {string|null} */
  getAxisLock() {
    return this._axisLock;
  }

  /** @private */
  _axisNormal(axis) {
    if (axis === 'x') return [1, 0, 0];
    if (axis === 'y') return [0, 1, 0];
    return [0, 0, 1];
  }

  // ===========================================================================
  // VISUALS
  // ===========================================================================

  /**
   * Draw the cut plane as a translucent quad with a wireframe outline, plus a
   * readout of its orientation. Without this the only feedback was the hole the
   * clip left in the data, which makes aiming guesswork.
   * @param {Object} renderer - VTK VR scene renderer
   */
  render(renderer) {
    if (!renderer) return;
    this._renderer = renderer;

    const plane = this._plane;
    if (!plane?.origin || !plane?.normal) {
      this._setVisualVisible(false);
      return;
    }

    this._ensurePlaneVisual(renderer);
    this._updatePlaneVisual(plane.origin, plane.normal);

    if (this._readout) {
      const axis = this._axisLock ? this._axisLock.toUpperCase() : 'Free';
      const o = plane.origin;
      this._readout
        .setText(`Clip: ${axis}  (${o[0].toFixed(2)}, ${o[1].toFixed(2)}, ${o[2].toFixed(2)})`)
        .setPosition(o[0], o[1], o[2])
        .setScale(this._apparentScale(READOUT_APPARENT_HEIGHT_M))
        .faceCamera(renderer)
        .setVisible(true);
    }
  }

  /** @private Build the quad, its wireframe outline, and the readout once. */
  _ensurePlaneVisual(renderer) {
    if (this._planeActor) return;

    const size = this._planeSize();
    const h = size / 2;
    // Authored in the XY plane so its local +Z is the normal —
    // buildPlaneFrameMatrix maps that onto the actual clip normal.
    this._planeSource = vtkPlaneSource.newInstance({
      origin: [-h, -h, 0],
      point1: [h, -h, 0],
      point2: [-h, h, 0],
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(this._planeSource.getOutputPort());
    this._planeActor = vtkActor.newInstance();
    this._planeActor.setMapper(mapper);
    this._planeActor.getProperty().setColor(...PLANE_COLOR);
    this._planeActor.getProperty().setOpacity(PLANE_OPACITY);
    this._planeActor.getProperty().setLighting(false);
    // Translucent geometry must be classified as such or it renders with
    // depthMask(true) and punches a hole through the data behind it.
    this._planeActor.setForceTranslucent(true);
    this._planeActor.setPickable(false);
    renderer.addActor(this._planeActor);

    // Wireframe edge over the same source — a 22%-opacity quad alone is hard
    // to locate against a busy dataset.
    const outlineMapper = vtkMapper.newInstance();
    outlineMapper.setInputConnection(this._planeSource.getOutputPort());
    this._outlineActor = vtkActor.newInstance();
    this._outlineActor.setMapper(outlineMapper);
    this._outlineActor.getProperty().setRepresentation(1); // wireframe
    this._outlineActor.getProperty().setColor(...OUTLINE_COLOR);
    this._outlineActor.getProperty().setLineWidth(2);
    this._outlineActor.getProperty().setLighting(false);
    this._outlineActor.setPickable(false);
    renderer.addActor(this._outlineActor);

    this._readout = new VRTextBillboard({
      worldHeight: READOUT_APPARENT_HEIGHT_M,
      color: READOUT_TEXT_COLOR,
      background: READOUT_BACKGROUND,
    }).attach(renderer);
  }

  /** @private Orient + position the quad onto the current plane. */
  _updatePlaneVisual(origin, normal) {
    const matrix = buildPlaneFrameMatrix(origin, normal);
    if (!matrix) return;
    // UserMatrix, for the same reason _applyVRDataRotation uses it: it wraps
    // outermost, is identity-safe, and needs no knowledge of the actor's own
    // transform.
    this._planeActor?.setUserMatrix(matrix);
    this._outlineActor?.setUserMatrix(matrix);
    this._planeActor?.setVisibility(true);
    this._outlineActor?.setVisibility(true);
  }

  /** @private */
  _planeSize() {
    const b = this._context?.vrContext?.dataBounds;
    if (!Array.isArray(b) || b.length !== 6) return 1;
    const diagonal = Math.hypot(b[1] - b[0], b[3] - b[2], b[5] - b[4]);
    return Math.max(0.001, diagonal * PLANE_SIZE_FACTOR);
  }

  /** @private */
  _setVisualVisible(visible) {
    this._planeActor?.setVisibility(visible);
    this._outlineActor?.setVisibility(visible);
    this._readout?.setVisible(visible);
  }

  /** @private Actors live in the shared desktop renderer — this must run. */
  _clearPlaneVisual() {
    const r = this._renderer;
    if (r) {
      for (const actor of [this._planeActor, this._outlineActor]) {
        if (actor) {
          r.removeActor(actor);
          actor.delete?.();
        }
      }
    }
    this._readout?.dispose();
    this._planeActor = null;
    this._outlineActor = null;
    this._planeSource = null;
    this._readout = null;
    this._renderer = null;
  }

  getControllerHints() {
    // Trigger, not grip — grip does not exist on Vision Pro and would fight
    // world-grab on Quest. A/B are Quest-only convenience; the same actions are
    // on the menu's contextual row so Vision Pro has full parity.
    return {
      left: {
        trigger: 'Hold to aim clip plane',
      },
      right: {
        trigger: 'Hold to aim clip plane',
        a: 'Invert direction',
        b: 'Reset plane',
      },
    };
  }
}

export default VRClipBoxTool;
