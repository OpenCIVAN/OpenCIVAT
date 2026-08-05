// src/core/vr/tools/VRAnnotationTool.js
// Annotation tool for VR - place markers and text annotations

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import { VRTextBillboard } from '@Core/vr/ui/VRTextBillboard.js';
import { MAX_ANNOTATION_TEXT } from '@Core/vr/VRKeyboardModel.js';
import { getUserName } from '@Collaboration/presence/userManagement.js';

// Apparent radius (metres) of a placed-annotation marker sphere, kept constant
// as the world scales via VRToolInterface._apparentScale.
const MARKER_APPARENT_RADIUS_M = 0.015;
const LABEL_APPARENT_HEIGHT_M = 0.02;
const DEFAULT_MARKER_COLOR = [1, 0.5, 0];
const LABEL_TEXT_COLOR = '#ffffff';
const LABEL_BACKGROUND = 'rgba(28,18,6,0.82)';

/**
 * Marker colours, cycled by the contextual "Color" button.
 *
 * This replaced an "annotation mode" cycle (marker/text/drawing) that changed
 * only stored metadata: render() drew a sphere regardless of mode, and
 * 'drawing' produced a one-element point list with no stroke accumulation. So
 * cycling mode changed nothing you could see. Colour is a small thing that is
 * actually visible, and it already flows through metadata.color into
 * _createMarkerActor and on to persistence.
 * @type {ReadonlyArray<{name:string, rgb:number[]}>}
 */
export const ANNOTATION_COLORS = Object.freeze([
  { name: 'Orange', rgb: [1, 0.5, 0] },
  { name: 'Red', rgb: [0.95, 0.25, 0.25] },
  { name: 'Green', rgb: [0.3, 0.85, 0.4] },
  { name: 'Blue', rgb: [0.35, 0.6, 1] },
  { name: 'Violet', rgb: [0.72, 0.45, 0.95] },
]);

/**
 * Compose a marker's billboard text with its author, so a pin says who left
 * it as well as what it says. VRTextBillboard is single-line (Canvas2D
 * fillText, no wrapping — see its header comment), hence one line with an
 * em-dash rather than a second line.
 * @param {string} text
 * @param {string|null|undefined} authorName
 * @returns {string}
 */
function _formatLabelText(text, authorName) {
  if (!text) return authorName ? `— ${authorName}` : '';
  return authorName ? `${text} — ${authorName}` : text;
}

// Historically the only text-entry mechanism available in VR (a fixed set of
// preset labels cycled by the spatial menu's "Label" button —
// VRExplorationManager.cycleAnnotationLabel), because WebXR's dom-overlay
// feature is not supported inside immersive-vr on Quest Browser or visionOS
// Safari, and voice input is command-grammar only, not free transcription
// (see src/services/voice/). The in-scene spatial keyboard (VRKeyboardModel
// + VTKVRSpatialUI) now provides real free-text entry via the draft state
// machine below, so these presets survive only as: (1) row 0 of that
// keyboard for one-tap quick fill, and (2) a draft's `fallbackText` — what
// Save uses when the user types nothing, preserving the original
// aim-trigger-Save fast path exactly.
export const ANNOTATION_LABEL_PRESETS = Object.freeze([
  'Note',
  'Anomaly',
  'Check this',
  'Max',
  'Min',
]);

export class VRAnnotationTool extends VRToolInterface {
  constructor() {
    super({
      id: 'annotate',
      name: 'Annotate',
      icon: 'message-circle',
      category: 'collaboration',
    });

    this._annotations = [];
    this._pendingLabel = ANNOTATION_LABEL_PRESETS[0];
    this._colorIndex = 0;

    // The in-progress draft: a fixed point with nothing persisted yet, filled
    // in by the spatial keyboard and resolved by confirmDraft()/cancelDraft().
    // { id, position, normal, timestamp, color, size, text, fallbackText }
    this._draft = null;
    // Provisional visuals for `_draft`: { actor, label }. Rebuilt only when
    // the draft's id changes (see _renderDraftMarker / _lastDraftId).
    this._draftMarker = null;
    this._lastDraftId = undefined;
    // See the field-level note in handleInput's suppression check: a
    // Save/Cancel pinch on the menu panel is consumed by VRSpatialUI before
    // this tool's handleInput ever sees that hand's trigger, so its
    // _lastTriggerState never latches true. Without this flag, the very next
    // frame — trigger still physically held, pointer now off the panel —
    // reads as a fresh rising edge and places a stray point. Cleared once the
    // trigger is physically released.
    this._suppressUntilRelease = false;

    // In-headset visuals, keyed by annotation id: { actor, label }. Reconciled
    // against `this._annotations` in render() only when the dirty signature
    // changes, then rescaled every frame for constant apparent size.
    this._markerActors = new Map();
    this._renderer = null;
    this._lastRenderSignature = null;
  }

  async activate(context) {
    await super.activate(context);
    log.debug('Annotation tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this.cancelDraft();
    this._disposeDraftMarker();
    this._clearMarkers();
  }

  /**
   * Draw one small sphere marker per placed annotation. Lazily creates actors
   * (dirty-checked on annotation count so geometry isn't rebuilt every frame)
   * and rescales them each frame so they hold a constant apparent size as the
   * world zooms.
   * @param {Object} renderer - VTK VR scene renderer
   */
  render(renderer) {
    if (!renderer) return;
    this._renderer = renderer;

    // Rebuild the actor set only when the dirty signature changed. Plain
    // length isn't enough any more: an annotation can gain a serverId
    // (falling out of liveIds in _reconcileMarkers) without the array length
    // moving at all, so the signature also folds in how many are still
    // un-persisted (owned by this tool rather than the server-fed feature).
    const unownedCount = this._annotations.reduce(
      (n, a) => n + (a.serverId ? 0 : 1),
      0
    );
    const signature = `${this._annotations.length}:${unownedCount}`;
    if (signature !== this._lastRenderSignature) {
      this._reconcileMarkers(renderer);
      this._lastRenderSignature = signature;
    }

    // Constant apparent size regardless of world scale.
    const s = this._apparentScale(MARKER_APPARENT_RADIUS_M);
    const labelScale = this._apparentScale(LABEL_APPARENT_HEIGHT_M);
    // Float the label clear of the marker sphere it belongs to.
    const lift = (MARKER_APPARENT_RADIUS_M * 2) / this._getVrScale();

    for (const annotation of this._annotations) {
      const entry = this._markerActors.get(annotation.id);
      if (!entry) continue;

      entry.actor.setScale(s, s, s);

      if (entry.label) {
        const p = annotation.position || {};
        entry.label
          .setPosition(p.x || 0, (p.y || 0) + lift, p.z || 0)
          .setScale(labelScale)
          .faceCamera(renderer)
          .setVisible(true);
      }
    }

    this._renderDraftMarker(renderer);
  }

  /**
   * Add actors for new annotations and remove actors for ones that no longer
   * need this tool's own marker, keying on annotation id so an add+undo in
   * the same frame still reconciles right.
   *
   * An annotation owns a tool-drawn marker only until it gains a `serverId`.
   * That field appearing is a precise proxy for "the server-fed
   * VTKAnnotationLinesFeature actor now exists", because
   * DatasetManager.addAnnotation emits `annotationAdded` locally on the same
   * promise resolution that _persistVRAnnotation uses to back-fill it. Once
   * that happens the annotation falls out of `liveIds` here and the existing
   * removal loop below tears this tool's now-redundant actor down — without
   * this, the author would see two spheres (this tool's + the feature's) for
   * the same annotation.
   * @private
   */
  _reconcileMarkers(renderer) {
    const liveIds = new Set(
      this._annotations.filter((a) => !a.serverId).map((a) => a.id)
    );

    for (const [id, entry] of this._markerActors) {
      if (!liveIds.has(id)) {
        renderer.removeActor(entry.actor);
        entry.actor.delete?.();
        entry.label?.dispose();
        this._markerActors.delete(id);
      }
    }

    for (const annotation of this._annotations) {
      if (annotation.serverId) continue; // handed off to the server-fed feature
      if (this._markerActors.has(annotation.id)) continue;
      const actor = this._createMarkerActor(annotation);
      if (!actor) continue;
      renderer.addActor(actor);

      // The annotation's text is what makes it say something rather than
      // just mark a spot.
      const labelText = _formatLabelText(annotation.text, annotation.authorName);
      let label = null;
      if (labelText) {
        label = new VRTextBillboard({
          text: labelText,
          worldHeight: LABEL_APPARENT_HEIGHT_M,
          color: LABEL_TEXT_COLOR,
          background: LABEL_BACKGROUND,
        }).attach(renderer);
      }

      this._markerActors.set(annotation.id, { actor, label });
    }
  }

  /**
   * Provisional visuals for the in-progress draft: a translucent, 1.35x
   * larger sphere plus a billboard label so "not saved yet" reads
   * unambiguously against committed markers. Rebuilt only when the draft's
   * identity changes (a new draft opened, or the draft resolved to null) —
   * per-frame text/position updates below don't need a rebuild.
   * @private
   */
  _renderDraftMarker(renderer) {
    const draft = this._draft;

    if (!draft) {
      if (this._draftMarker) this._disposeDraftMarker();
      return;
    }

    if (draft.id !== this._lastDraftId) {
      this._disposeDraftMarker();

      const actor = this._createMarkerActor(draft);
      if (actor) {
        actor.getProperty().setOpacity(0.55);
        renderer.addActor(actor);

        const label = new VRTextBillboard({
          // A draft is always the LOCAL user's own in-progress note.
          text: _formatLabelText(draft.text || draft.fallbackText, getUserName()),
          worldHeight: LABEL_APPARENT_HEIGHT_M,
          color: LABEL_TEXT_COLOR,
          background: LABEL_BACKGROUND,
        }).attach(renderer);

        this._draftMarker = { actor, label };
      }
      this._lastDraftId = draft.id;
    }

    if (!this._draftMarker) return;

    const draftRadius = MARKER_APPARENT_RADIUS_M * 1.35;
    const s = this._apparentScale(draftRadius);
    this._draftMarker.actor.setScale(s, s, s);

    const labelScale = this._apparentScale(LABEL_APPARENT_HEIGHT_M);
    const lift = (draftRadius * 2) / this._getVrScale();
    const p = draft.position || {};
    this._draftMarker.label
      ?.setText(_formatLabelText(draft.text || draft.fallbackText, getUserName()))
      .setPosition(p.x || 0, (p.y || 0) + lift, p.z || 0)
      .setScale(labelScale)
      .faceCamera(renderer)
      .setVisible(true);
  }

  /**
   * Tear down the draft's provisional actor/label, if any. Idempotent — safe
   * to call whether or not a draft marker currently exists.
   * @private
   */
  _disposeDraftMarker() {
    if (!this._draftMarker) return;
    if (this._renderer) {
      this._renderer.removeActor(this._draftMarker.actor);
      this._draftMarker.actor.delete?.();
    }
    this._draftMarker.label?.dispose();
    this._draftMarker = null;
    this._lastDraftId = undefined;
  }

  /** @private */
  _createMarkerActor(annotation) {
    const source = vtkSphereSource.newInstance({
      radius: 1.0, // scaled per-frame via _apparentScale
      phiResolution: 12,
      thetaResolution: 12,
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(source.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    const color = Array.isArray(annotation.color)
      ? annotation.color
      : DEFAULT_MARKER_COLOR;
    const property = actor.getProperty();
    property.setColor(...color);
    property.setLighting(false);

    actor.setPickable(false); // never intercept tool/teleport raycasts

    // annotation.position is already data/scene space ({x,y,z}).
    const p = annotation.position || {};
    actor.setPosition(p.x || 0, p.y || 0, p.z || 0);

    return actor;
  }

  /** @private Remove all marker actors from the renderer they were added to. */
  _clearMarkers() {
    for (const entry of this._markerActors.values()) {
      if (this._renderer) {
        this._renderer.removeActor(entry.actor);
        entry.actor.delete?.();
      }
      entry.label?.dispose();
    }
    this._markerActors.clear();
    this._lastRenderSignature = null;
    this._renderer = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;
    const rightCtrl = controllers.right;

    // Rising-edge detection: update _lastTriggerState unconditionally,
    // BEFORE acting on it, so a held trigger places exactly once per pull
    // rather than once per frame (~90Hz) — the previous version updated
    // this only on the branch that didn't place, so a successful
    // placement's early return skipped the update and re-armed itself
    // every single frame the trigger stayed down. Same discipline now
    // applies to the A-button edge below, for the same reason.
    //
    // Read via optional chaining and update the latch even when rightCtrl
    // is absent — a gripless/transient-pointer source (Vision Pro) is only
    // present in inputState while a pinch is physically held, so it
    // vanishes on every release. Bailing out on `!rightCtrl` BEFORE this
    // update (the previous bug) left the latch permanently stuck at `true`
    // from the last pinch that did reach it, so no later pinch could ever
    // read as a fresh rising edge again.
    const triggerPressed = !!rightCtrl?.triggerPressed;
    const triggerRisingEdge = triggerPressed && !this._lastTriggerState;
    this._lastTriggerState = triggerPressed;

    const aPressed = !!rightCtrl?.buttons?.a;
    const aRisingEdge = aPressed && !this._lastAButtonState;
    this._lastAButtonState = aPressed;

    // Modal: while a draft is open, the keyboard owns input — no raycast, no
    // new placement. The A-button is still honoured here as a Quest
    // convenience for bailing out without reaching for the on-panel Cancel
    // key, but it's a shortcut, not the guaranteed path: Cancel is (see
    // VRExplorationManager.cancelAnnotationDraft).
    if (this._draft != null) {
      if (aRisingEdge) return this.cancelDraft();
      return null;
    }

    // A Save/Cancel pinch on the menu panel is consumed by VRSpatialUI before
    // this tool's handleInput ever sees that hand's trigger (see the
    // _suppressUntilRelease field comment in the constructor). Skip exactly
    // one more trigger-held window so that consumed pinch can't be misread as
    // a fresh placement the instant the pointer leaves the panel.
    //
    // Gated on `triggerPressed`, not on `rightCtrl` directly, so a
    // gripless/transient-pointer release — which makes rightCtrl disappear
    // entirely rather than merely flip triggerPressed to false — still
    // clears this flag. Missing that on the disappearance frame would leave
    // it stuck `true` forever, identically to the _lastTriggerState bug this
    // same fix addresses.
    if (this._suppressUntilRelease) {
      if (triggerPressed) return null;
      this._suppressUntilRelease = false;
    }

    if (triggerRisingEdge) {
      // Data-control gate (VRManipulationLock, injected via the tool context).
      // Checked on PLACEMENT, not on tool selection: a non-holder can still
      // pick Annotate, aim, and find out on the first pull that they need the
      // token — which is far clearer than a greyed-out button. Fails open when
      // no predicate was injected. rightCtrl is guaranteed non-null here:
      // triggerRisingEdge can only be true when triggerPressed was, which
      // requires rightCtrl to have been truthy this frame.
      if (this._context?.canManipulate?.('Annotation') === false) return null;
      const hit = this._performRaycast(rightCtrl, frame);
      if (hit) return this._openDraft(hit);
    }

    // The thumbstick used to cycle annotation "mode" here. That is gone: it
    // changed only stored metadata (render() drew a sphere regardless), and the
    // thumbstick is hardcoded inert for Vision Pro transient pointers anyway,
    // so it was a Quest-only control for a no-op. Label and Color live on the
    // menu's contextual row, where both headsets can reach them.

    if (aRisingEdge) {
      const undone = this.undoLast();
      if (undone) return undone;
    }

    return null;
  }

  /**
   * Fix a point without persisting anything: opens `_draft`, which the
   * spatial keyboard reads/writes via getDraft()/appendDraftText()/
   * backspaceDraft() until confirmDraft() or cancelDraft() resolves it. Does
   * NOT touch `this._annotations` — nothing is a real annotation yet.
   *
   * The preset label becomes the draft's `fallbackText`, not seeded buffer
   * content: `text` starts empty so the user never has to backspace a
   * pre-filled word, and confirmDraft() falls back to it only if nothing was
   * typed. That's what keeps the original aim -> trigger -> Save fast path
   * working unchanged.
   * @private
   */
  _openDraft(hit) {
    this._draft = {
      id: `annot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { ...hit.position },
      normal: hit.normal ? { ...hit.normal } : null,
      timestamp: Date.now(),
      color: this._getAnnotationColor(),
      size: 0.02, // 2cm marker
      text: '',
      fallbackText: this._pendingLabel || ANNOTATION_LABEL_PRESETS[0],
    };

    return { type: 'annotation-pending', data: this._draft };
  }

  /**
   * Current draft state for the spatial keyboard to read. Returns null when
   * no draft is open.
   * @returns {{active:boolean,text:string,fallbackText:string,position:object,color:*}|null}
   */
  getDraft() {
    if (!this._draft) return null;
    const { text, fallbackText, position, color } = this._draft;
    return { active: true, text, fallbackText, position, color };
  }

  /**
   * Append typed characters to the draft buffer, clamped to
   * MAX_ANNOTATION_TEXT so a runaway caller (or a stuck key) can't grow it
   * without bound — see VRKeyboardModel's DRAFT_LINE_CLAMP note for why an
   * unclamped buffer is a real cost, not just tidiness.
   * @param {string} str
   * @returns {string|null} the new draft text, or null if no draft is open
   */
  appendDraftText(str) {
    if (!this._draft || typeof str !== 'string' || !str.length) {
      return this._draft ? this._draft.text : null;
    }
    this._draft.text = (this._draft.text + str).slice(0, MAX_ANNOTATION_TEXT);
    return this._draft.text;
  }

  /**
   * Remove the last character of the draft buffer.
   * @returns {string|null} the new draft text, or null if no draft is open
   */
  backspaceDraft() {
    if (!this._draft) return null;
    this._draft.text = this._draft.text.slice(0, -1);
    return this._draft.text;
  }

  /**
   * Save the draft as a real annotation: builds it in the existing
   * _createAnnotation shape, pushes it into `this._annotations`, clears the
   * draft, and arms the post-Save trigger-release guard.
   *
   * The returned action's `data` is the SAME object reference just pushed
   * into `_annotations` — VRExplorationManager._persistVRAnnotation
   * back-fills `data.serverId` onto it once the server responds, and this
   * tool's render() (see _reconcileMarkers) depends on seeing that mutation
   * to hand the marker off to the server-fed feature.
   * @returns {{type:'annotation-created', data:object}|null} null if no
   *   draft is open
   */
  confirmDraft() {
    if (!this._draft) return null;
    const draft = this._draft;

    // Empty buffer falls back to the preset selected at placement time —
    // see _openDraft's comment on why fallbackText exists.
    const text = draft.text.trim() || draft.fallbackText;
    const annotation = this._createAnnotation(draft, text);
    this._annotations.push(annotation);

    this._draft = null;
    this._suppressUntilRelease = true;

    return { type: 'annotation-created', data: annotation };
  }

  /**
   * Discard the draft: nothing is persisted, nothing is added to
   * `_annotations`. Disposes the provisional marker and arms the same
   * post-action trigger-release guard confirmDraft() does.
   * @returns {{type:'annotation-cancelled', data:{id:string}}|null} null if
   *   no draft is open
   */
  cancelDraft() {
    if (!this._draft) return null;
    const { id } = this._draft;

    this._draft = null;
    this._disposeDraftMarker();
    this._suppressUntilRelease = true;

    return { type: 'annotation-cancelled', data: { id } };
  }

  /**
   * Remove the most recently placed annotation (shared by the A-button and the
   * spatial menu's Undo button). A live draft is cancelled FIRST, before any
   * committed annotation is popped — otherwise Undo while mid-typing would
   * silently delete an earlier, collaborator-visible note instead of just
   * closing the keyboard.
   * @returns {Object|null} annotation-removed/annotation-cancelled action, or
   *   null if there is nothing to undo
   */
  undoLast() {
    if (this._draft != null) return this.cancelDraft();
    if (this._annotations.length === 0) return null;
    const removed = this._annotations.pop();
    // Tombstone so an in-flight persistence POST (create) that resolves
    // AFTER this undo knows to delete what it just created — see
    // VRExplorationManager._persistVRAnnotation.
    removed._deleted = true;
    return { type: 'annotation-removed', data: removed };
  }

  getControllerHints() {
    return {
      left: {},
      right: {
        trigger: 'Place point',
        a: 'Undo / Cancel',
      },
    };
  }

  /**
   * Advance to the next marker colour (wrapping). Backs the contextual "Color"
   * button, which replaced the old mode cycle.
   * @returns {string} the newly-selected colour name
   */
  cycleColor() {
    this._colorIndex = (this._colorIndex + 1) % ANNOTATION_COLORS.length;
    return ANNOTATION_COLORS[this._colorIndex].name;
  }

  /** @returns {string} the current colour's name */
  getPendingColorName() {
    return ANNOTATION_COLORS[this._colorIndex].name;
  }

  /**
   * Build the persisted-shape annotation object from a resolved draft. Used
   * only by confirmDraft() — see that method's comment for why the returned
   * object's identity (not just its contents) matters.
   * @param {object} draft - `this._draft` at confirm time
   * @param {string} text - the resolved text (typed, or draft.fallbackText)
   * @private
   */
  _createAnnotation(draft, text) {
    return {
      id: draft.id,
      // Always 'marker'. The old 'text' and 'drawing' modes are gone: the
      // annotation's text now renders for EVERY annotation (which is what
      // 'text' was reaching for), and 'drawing' never accumulated a stroke —
      // it stored a one-element point list and drew the same sphere. Real
      // freehand drawing needs trigger-held point accumulation, a polydata
      // stroke actor, a new persisted type, and desktop rendering support; it
      // is a separate feature, not a mode flag.
      type: 'marker',
      position: draft.position,
      normal: draft.normal,
      timestamp: draft.timestamp,
      text,
      // Who placed this pin. Threaded through _persistVRAnnotation's metadata
      // and back out via parsePointAnnotation so OTHER participants — not
      // just the author — see whose note this is on the persisted marker.
      authorName: getUserName(),
      color: draft.color,
      size: draft.size,
    };
  }

  /**
   * Advance to the next preset label (wrapping). Called from the spatial
   * menu's "Label" button.
   * @returns {string} the newly-selected label
   */
  cycleLabel() {
    const idx = ANNOTATION_LABEL_PRESETS.indexOf(this._pendingLabel);
    this._pendingLabel =
      ANNOTATION_LABEL_PRESETS[(idx + 1) % ANNOTATION_LABEL_PRESETS.length];
    return this._pendingLabel;
  }

  /** @returns {string} the label the next placed annotation will carry */
  getPendingLabel() {
    return this._pendingLabel;
  }

  /**
   * The colour the next placed annotation will carry. The explicitly-cycled
   * colour wins; otherwise fall back to the participant's own session colour so
   * annotations stay attributable at a glance in a shared session.
   * @private
   */
  _getAnnotationColor() {
    if (this._colorIndex > 0) return ANNOTATION_COLORS[this._colorIndex].rgb;
    return this._context?.vrContext?.userColor || DEFAULT_MARKER_COLOR;
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;

    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  /**
   * Get all annotations
   */
  getAnnotations() {
    return this._annotations;
  }

  /**
   * Remove an annotation
   */
  removeAnnotation(annotationId) {
    const index = this._annotations.findIndex(a => a.id === annotationId);
    if (index !== -1) {
      this._annotations.splice(index, 1);
    }
  }

  /**
   * Clear all annotations
   */
  clearAnnotations() {
    this._annotations = [];
  }
}

export default VRAnnotationTool;
