// src/core/vr/tools/VRMeasureTool.js
// Chained polyline distance measurement for VR.
//
// Pick a point, pick another and the segment between them is measured; the NEXT
// pick continues from where the last one ended, building a connected path.
// Each segment carries its own distance label and the tool shows a running
// total, so measuring around a feature is one continuous gesture rather than a
// series of disconnected pairs.
//
// Undo pops a single POINT (not a whole segment), which is what makes the chain
// feel like drawing: one tap in, one tap out.
//
// Labels are canvas-texture billboards, NOT vtkVectorText. vtkVectorText needs
// an opentype.js-parsed font that nothing in this codebase supplies, so every
// distance readout it drew was invisible empty geometry — the tool measured
// correctly and showed you nothing.

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
import { VRTextBillboard } from '@Core/vr/ui/VRTextBillboard.js';

const ENDPOINT_APPARENT_RADIUS_M = 0.012;
const LABEL_APPARENT_HEIGHT_M = 0.018;
const TOTAL_LABEL_APPARENT_HEIGHT_M = 0.024;
const LINE_COLOR = [1.0, 0.85, 0.2];
const ENDPOINT_COLOR = [1.0, 0.6, 0.1];
const PREVIEW_COLOR = [0.6, 0.75, 1.0];
const LABEL_TEXT_COLOR = '#fdf6e3';
const LABEL_BACKGROUND = 'rgba(24,20,10,0.80)';
const TOTAL_TEXT_COLOR = '#ffffff';
const TOTAL_BACKGROUND = 'rgba(150,90,10,0.88)';

// Caps the actor pool. A path longer than this is almost certainly a stuck
// trigger rather than intent.
const MAX_POINTS = 64;

// The live preview raycasts against the dataset; at 90 Hz that is a full
// O(cells) intersection test every frame purely for a rubber-band line.
const PREVIEW_EVERY_N_FRAMES = 2;

export class VRMeasureTool extends VRToolInterface {
  constructor() {
    super({
      id: 'measure',
      name: 'Measure',
      icon: 'ruler',
      category: 'analysis',
    });

    // The path being built, in data space.
    this._points = [];
    // One entry per adjacent pair of _points.
    this._segments = [];
    // Completed paths, archived by newPath().
    this._paths = [];
    this._unit = 'units';

    // In-headset visuals (created lazily in render()).
    this._renderer = null;
    this._pointActors = [];
    this._segmentActors = []; // [{ actor, source, label }]
    this._totalLabel = null;
    this._previewActor = null;
    this._previewSource = null;
    this._previewPoint = null;
    this._frameCounter = 0;
  }

  async activate(context) {
    await super.activate(context);
    log.debug('Measure tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._previewPoint = null;
    this._clearVisuals();
  }

  // ===========================================================================
  // INPUT
  // ===========================================================================

  handleInput(inputState, frame) {
    const rightCtrl = inputState.controllers?.right;

    // Rising-edge detection, updated BEFORE acting on it: the placement branch
    // returns early, so updating afterwards never ran on a successful
    // placement and re-armed every frame the trigger stayed down.
    //
    // Update the latch even when rightCtrl is absent — a gripless/
    // transient-pointer source (Vision Pro) only exists in inputState while
    // a pinch is physically held, so it vanishes on every release. Bailing
    // out before this update left the latch stuck at `true` from the last
    // pinch that reached it, so no later pinch could ever read as a fresh
    // rising edge again.
    const triggerPressed = !!rightCtrl?.triggerPressed;
    const triggerRisingEdge = triggerPressed && !this._lastTriggerState;
    this._lastTriggerState = triggerPressed;

    if (!rightCtrl) return null;

    if (triggerRisingEdge) {
      // Data-control gate — see the identical check in VRAnnotationTool:
      // enforced at placement, not at tool selection, and fails open when no
      // predicate was injected into the tool context.
      if (this._context?.canManipulate?.('Measurement') === false) return null;
      return this._addPoint(rightCtrl, frame);
    }

    // Rubber-band preview toward wherever the controller is now pointing.
    // Stored as tool-local state and drawn in render(); deliberately NOT
    // returned as an action — the old code emitted a `measurement-preview`
    // every frame, which meant a log line and a dispatch at 90 Hz for
    // something no handler consumed.
    this._frameCounter += 1;
    if (
      this._points.length > 0 &&
      this._frameCounter % PREVIEW_EVERY_N_FRAMES === 0
    ) {
      const hit = this._performRaycast(rightCtrl, frame);
      this._previewPoint = hit ? { ...hit.position } : null;
    }

    return null;
  }

  /** @private Append a picked point, closing a segment when there's a predecessor. */
  _addPoint(controller, frame) {
    if (this._points.length >= MAX_POINTS) {
      log.warn(`VR measure: path capped at ${MAX_POINTS} points`);
      return null;
    }

    const hit = this._performRaycast(controller, frame);
    if (!hit) return null;

    const point = { ...hit.position };
    const previous = this._points[this._points.length - 1] || null;
    this._points.push(point);

    if (!previous) {
      return { type: 'measurement-start-placed', data: { point } };
    }

    const segment = {
      id: `measure_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      startPoint: { ...previous },
      endPoint: { ...point },
      distance: this._calculateDistance(previous, point),
      unit: this._unit,
    };
    this._segments.push(segment);

    // This payload shape is exactly what
    // VRExplorationManager._persistVRMeasurement already consumes, so chaining
    // needed no persistence changes: one annotation per segment, and the
    // manager back-fills `serverId` onto this same object.
    return { type: 'measurement-created', data: segment };
  }

  /**
   * Remove the most recently placed point, and with it the segment it closed.
   * Undoing by POINT rather than by segment is what makes the chain feel like
   * drawing — each tap in is one tap out.
   * @returns {{type:string,data?:object}|null}
   */
  undoLast() {
    if (!this._points.length) return null;

    this._points.pop();
    this._previewPoint = null;

    // Removing point N also removes the segment (N-1 -> N).
    if (this._segments.length > this._points.length - 1 && this._segments.length) {
      const removed = this._segments.pop();
      return { type: 'measurement-removed', data: removed };
    }

    // Only the lone start point was pending — nothing was ever persisted.
    return { type: 'measurement-cancelled' };
  }

  /**
   * Archive the current path and start a fresh one, so a new measurement can
   * begin somewhere disconnected. Backs the contextual "New Path" button.
   * @returns {{type:string,data:object}|null}
   */
  newPath() {
    if (!this._points.length) return null;

    const path = {
      id: `path_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      points: this._points.slice(),
      segments: this._segments.slice(),
      total: this.getTotal(),
    };
    this._paths.push(path);

    this._points = [];
    this._segments = [];
    this._previewPoint = null;

    return { type: 'measurement-path-completed', data: path };
  }

  /** @returns {number} summed length of the active path */
  getTotal() {
    return this._segments.reduce((sum, s) => sum + (s.distance || 0), 0);
  }

  getControllerHints() {
    return {
      left: {},
      right: {
        trigger: this._points.length ? 'Add point to path' : 'Start measuring',
      },
    };
  }

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  /**
   * Draw the active path: a sphere per point, a line + distance label per
   * segment, a running total past the last point, and a rubber-band preview
   * from the last point to where the controller is aimed.
   * @param {Object} renderer - VTK VR scene renderer
   */
  render(renderer) {
    if (!renderer) return;
    this._renderer = renderer;

    this._reconcilePoints(renderer);
    this._reconcileSegments(renderer);

    const sphereScale = this._apparentScale(ENDPOINT_APPARENT_RADIUS_M);
    this._points.forEach((p, i) => {
      const actor = this._pointActors[i];
      if (!actor) return;
      actor.setPosition(p.x, p.y, p.z);
      actor.setScale(sphereScale, sphereScale, sphereScale);
      actor.setVisibility(true);
    });

    this._segments.forEach((seg, i) => {
      const entry = this._segmentActors[i];
      if (!entry) return;
      const { startPoint: a, endPoint: b } = seg;

      entry.source.setPoint1(a.x, a.y, a.z);
      entry.source.setPoint2(b.x, b.y, b.z);
      entry.actor.setVisibility(true);

      entry.label
        .setText(`${seg.distance.toFixed(3)} ${seg.unit}`)
        .setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
        .setScale(this._apparentScale(LABEL_APPARENT_HEIGHT_M))
        .faceCamera(renderer)
        .setVisible(true);
    });

    this._renderTotal(renderer);
    this._renderPreview(renderer);
  }

  /**
   * Running total, anchored just past the last point. Only meaningful once
   * there is more than one segment — with a single segment it would just
   * repeat that segment's own label.
   * @private
   */
  _renderTotal(renderer) {
    if (!this._totalLabel) {
      this._totalLabel = new VRTextBillboard({
        worldHeight: TOTAL_LABEL_APPARENT_HEIGHT_M,
        color: TOTAL_TEXT_COLOR,
        background: TOTAL_BACKGROUND,
      }).attach(renderer);
    }

    if (this._segments.length < 2) {
      this._totalLabel.setVisible(false);
      return;
    }

    const last = this._points[this._points.length - 1];
    const lift = (ENDPOINT_APPARENT_RADIUS_M * 3) / this._getVrScale();
    this._totalLabel
      .setText(`Total ${this.getTotal().toFixed(3)} ${this._unit}`)
      .setPosition(last.x, last.y + lift, last.z)
      .setScale(this._apparentScale(TOTAL_LABEL_APPARENT_HEIGHT_M))
      .faceCamera(renderer)
      .setVisible(true);
  }

  /** @private Rubber-band line from the last placed point to the aim point. */
  _renderPreview(renderer) {
    const last = this._points[this._points.length - 1];
    if (!last || !this._previewPoint) {
      this._previewActor?.setVisibility(false);
      return;
    }

    if (!this._previewSource) {
      this._previewSource = vtkLineSource.newInstance({
        point1: [0, 0, 0],
        point2: [0, 0, 0],
      });
      this._previewActor = this._makeActor(this._previewSource, PREVIEW_COLOR);
      this._previewActor.getProperty().setLineWidth(2);
      this._previewActor.getProperty().setOpacity(0.7);
      renderer.addActor(this._previewActor);
    }

    const p = this._previewPoint;
    this._previewSource.setPoint1(last.x, last.y, last.z);
    this._previewSource.setPoint2(p.x, p.y, p.z);
    this._previewActor.setVisibility(true);
  }

  /**
   * Grow/shrink the point-marker pool to match _points. Actors are reused
   * across frames; only a change in count rebuilds anything.
   * @private
   */
  _reconcilePoints(renderer) {
    while (this._pointActors.length < this._points.length) {
      const source = vtkSphereSource.newInstance({
        radius: 1.0, // scaled per-frame via _apparentScale
        phiResolution: 12,
        thetaResolution: 12,
      });
      const actor = this._makeActor(source, ENDPOINT_COLOR);
      renderer.addActor(actor);
      this._pointActors.push(actor);
    }
    while (this._pointActors.length > this._points.length) {
      const actor = this._pointActors.pop();
      renderer.removeActor(actor);
      actor.delete?.();
    }
  }

  /** @private Same pooling for segment lines + their labels. */
  _reconcileSegments(renderer) {
    while (this._segmentActors.length < this._segments.length) {
      const source = vtkLineSource.newInstance({
        point1: [0, 0, 0],
        point2: [0, 0, 0],
      });
      const actor = this._makeActor(source, LINE_COLOR);
      actor.getProperty().setLineWidth(3);
      renderer.addActor(actor);

      const label = new VRTextBillboard({
        worldHeight: LABEL_APPARENT_HEIGHT_M,
        color: LABEL_TEXT_COLOR,
        background: LABEL_BACKGROUND,
      }).attach(renderer);

      this._segmentActors.push({ actor, source, label });
    }
    while (this._segmentActors.length > this._segments.length) {
      const entry = this._segmentActors.pop();
      renderer.removeActor(entry.actor);
      entry.actor.delete?.();
      entry.label.dispose();
    }
  }

  /** @private */
  _makeActor(source, color) {
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(source.getOutputPort());
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(...color);
    actor.getProperty().setLighting(false);
    // Measurement geometry must never intercept the next pick — otherwise the
    // second point of a segment could land on the first point's own sphere.
    actor.setPickable(false);
    actor.setVisibility(false);
    return actor;
  }

  /**
   * @private Remove every actor from the renderer it was added to. Reached via
   * VRToolManager.cleanup() -> deactivateTool() -> deactivate(). Mandatory:
   * these live in the renderer VR shares with the desktop canvas, so a leak
   * corrupts desktop framing after the session ends.
   */
  _clearVisuals() {
    const r = this._renderer;
    if (r) {
      for (const actor of this._pointActors) {
        r.removeActor(actor);
        actor.delete?.();
      }
      for (const entry of this._segmentActors) {
        r.removeActor(entry.actor);
        entry.actor.delete?.();
        entry.label.dispose();
      }
      if (this._previewActor) {
        r.removeActor(this._previewActor);
        this._previewActor.delete?.();
      }
    }
    this._totalLabel?.dispose();

    this._pointActors = [];
    this._segmentActors = [];
    this._previewActor = null;
    this._previewSource = null;
    this._totalLabel = null;
    this._renderer = null;
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  _calculateDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;
    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  /** @returns {Array<object>} segments of the active path */
  getMeasurements() {
    return this._segments;
  }

  /** @returns {Array<object>} points of the active path */
  getPoints() {
    return this._points;
  }

  /** @returns {Array<object>} archived paths */
  getPaths() {
    return this._paths;
  }

  removeMeasurement(measurementId) {
    const index = this._segments.findIndex((s) => s.id === measurementId);
    if (index !== -1) this._segments.splice(index, 1);
  }

  clearMeasurements() {
    this._points = [];
    this._segments = [];
    this._paths = [];
    this._previewPoint = null;
  }

  /**
   * Coarse state for the menu/hint layer.
   * @returns {'idle'|'placing-start'|'placing-end'}
   */
  getMeasurementState() {
    // `this.isActive` (no call) is a bound-method reference, always truthy —
    // this branch never took. `isActive()` is the real check (VRToolInterface.js).
    if (!this.isActive()) return 'idle';
    return this._points.length ? 'placing-end' : 'placing-start';
  }
}

export default VRMeasureTool;
