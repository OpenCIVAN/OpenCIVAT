// ----------------------------------------------------------------------------
// VR Spatial UI - in-scene tool menu for immersive WebXR sessions
// ----------------------------------------------------------------------------
//
// WHY IN-SCENE (NOT DOM)
// WebXR immersive sessions on Safari/visionOS and most browsers do NOT render
// the page DOM, so the React VRWristMenu is invisible once the headset is on.
// To let a user pick tools / toggle isolation / leave VR without removing the
// headset, the menu is drawn as VTK geometry inside the same scene the data
// lives in — a head-anchored quad panel with one button cell per action.
//
// The DOM VRWristMenu remains the pre-session / 2D fallback. Both read the same
// source of truth (VRExplorationManager via VRSpatialMenuModel), so they can
// never disagree.
//
// ANCHORING
// The panel floats ~1.2 m in front of the head, dropped well below eye-line
// and offset to one side so it reads as a chest-level/peripheral HUD instead
// of sitting on the same forward ray as an auto-fit dataset (which would
// otherwise visually block it). It re-anchors lazily: it only follows the
// head once the head has drifted past a comfort threshold, so it feels
// world-stable while you inspect but comes back when you turn to look for it.
//
// SELECTION
//  - Controller ray: the target ray is intersected with the panel plane; a
//    persistent hover highlight tracks the pointed button, and a rising-edge
//    trigger commits the tap.
//  - Vision Pro transient-pointer (gaze + pinch): there is no persistent hover
//    ray, so there is no hover highlight; a pinch (select) at the gaze target
//    intersects the panel and commits directly (tap-select).
//
// This file is the thin VTK layer; all layout / hit-region math / action
// dispatch lives in VRSpatialMenuModel (pure, unit-tested).

import { vr as log } from "@Utils/logger.js";
import { VRSpatialMenuModel } from "@Core/vr/VRSpatialMenuModel.js";
import { readVRAccessibilitySettings } from "@Core/vr/vrAccessibilityStore.js";
// Canvas->texture and rounded-rect tracing now live in the shared VR text
// primitive (src/core/vr/ui/VRTextBillboard.js) so the menu, avatar labels and
// every tool label use one implementation. The private methods below are kept
// as thin delegating wrappers rather than removed — they're referenced
// throughout this file and by VTKVRSpatialUI.integration.test.js.
import { roundRectPath, uploadCanvasTexture } from "@Core/vr/ui/VRTextBillboard.js";
import { getSymbolName } from "@UI/react/components/atoms/Icon/iconRegistry.js";
import { ICON_PATHS } from "@UI/react/components/atoms/Icon/iconPaths.js";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";

// Physical panel size in meters (WebXR world units before vrScale). Width is
// fixed; height is DERIVED per-frame from the model's current row count
// (ROW_HEIGHT_M * row count, see _currentRowCount/_panelHeight) — it grows by
// one row automatically while a tool with contextual buttons is active, and
// shrinks back when it deactivates, with no manual constant to maintain.
// 0.78 rather than the original 0.66 so the widest rows (6 columns, since
// drawers arrived) still give ~0.13 m cells — about 6.2 degrees at
// PANEL_DISTANCE, comfortable for both a Quest controller ray and a Vision Pro
// gaze pinch.
const PANEL_WIDTH = 0.9;
// Keyboard mode's own panel geometry — swapped in over the menu's constants
// above whenever VRSpatialMenuModel.isKeyboardOpen() is true (see update()'s
// mode switch). At the menu's 0.78 m width a 10-column row (digits, QWERTY,
// ASDF...) gives 0.078 m cells, ~3.7° at PANEL_DISTANCE — too small for a
// Vision Pro gaze pinch to reliably land. Widening (NOT pushing the panel
// further away — angular size is width/distance, so more distance only makes
// this worse) gets 0.115 m cells, ~5.5°, comparable to Quest's own on-screen
// keyboard (~5.7°).
const KEYBOARD_PANEL_WIDTH = 1.15; // 0.115 m cells ≈ 5.5° at PANEL_DISTANCE — Quest's own keyboard is ~5.7°
const KEYBOARD_PANEL_DROP = 0.42; // less dropped: you read this panel, not glance at it
const KEYBOARD_PANEL_SIDE_OFFSET = 0.0; // centred while modal
const ROW_HEIGHT_M = 0.14; // matches the original single-row height
// With a drawer open the panel can reach 8 rows (5 static + 2 drawer + 1
// contextual). At a fixed 0.14 m that would be 1.12 m tall — taller than the
// user and well outside a comfortable gaze cone. Rows shrink toward
// ROW_HEIGHT_MIN_M instead, capping total height. _layoutButtons and
// _intersectPanel both derive from this._panelHeight, so hit-testing follows
// automatically — there is no second place to keep in sync.
const MAX_PANEL_HEIGHT_M = 0.86;
const ROW_HEIGHT_MIN_M = 0.1;
// Panel placement. These are paired with VRExplorationManager's entry-fit
// geometry (PANEL_PLANE_M / FIT_HALF_ANGLE_RAD there) and must move together:
// the dataset is auto-fitted to a ~15 deg angular radius specifically so that
// it and this panel can both sit in front of the user without overlapping.
//
// The previous values (1.2 m out, a fixed 0.28 m side offset) could not work
// at any setting: 0.28 m is smaller than the panel's own 0.435 m half-width,
// so the panel did not clear the forward axis, and against a dataset
// subtending ~77 deg the required offset was ~67 deg of azimuth — outside any
// usable gaze cone. Shrinking the entry fit is what made this solvable.
const PANEL_DISTANCE = 1.45;
const PANEL_DROP = 0.42; // how far below eye-line the panel center sits
const PANEL_SIDE_OFFSET = 0.24; // minimum lateral offset, metres
// Clearance budget for _adaptiveSideOffset: how far past the dataset's edge to
// place the panel, and how far off-axis it may ever be pushed.
const SIDE_MARGIN_RAD = (8 * Math.PI) / 180;
const MAX_PANEL_AZIMUTH_RAD = (38 * Math.PI) / 180;
const MAX_PANEL_SIDE_OFFSET_M = 1.6;
// Keep the panel's bottom edge above the floor for seated/crouching users.
const FLOOR_CLEARANCE_M = 0.15;
// Lazy re-anchor: only chase the head after it drifts this far (meters).
const REANCHOR_DISTANCE = 0.5;

// Button/state colours now live in CARD_STYLES (CSS strings) since cards are
// canvas-drawn rather than solid-tinted quads. See below.
const COLOR_LABEL = "#ffffff";
const COLOR_STATUS = "#dbe8f8";

// --- Card styling ---------------------------------------------------------
// Each button background is now a ROUNDED CARD drawn on its own canvas texture
// (rounded rect fill + border, tinted by state), instead of a flat solid-color
// quad. Drawing the card on canvas — rather than tinting a textured quad via
// setColor — sidesteps VTK.js texture/colour-modulation ambiguity: the pixels
// are exactly what Canvas 2D paints. The card is only redrawn when a button's
// visual state changes (idle/hover/active), dirty-checked in _applyButtonVisuals.
const CARD_TEX_W = 320; // card canvas resolution (px) — stretched to the cell
const CARD_TEX_H = 200;
const CARD_CORNER_RADIUS = 30; // px on the CARD_TEX canvas
const CARD_BORDER_WIDTH = 5; // px
// CSS colour strings (canvas paints in CSS colours). Kept visually in step with
// the COLOR_* RGB triples above but a touch richer, with an alpha so the dark
// backing panel reads through the edges.
const CARD_STYLES = {
  idle: { fill: "rgba(24,29,42,0.98)", border: "rgba(112,130,169,0.78)" },
  hover: { fill: "rgba(52,92,140,0.97)", border: "rgba(150,196,255,0.95)" },
  active: { fill: "rgba(26,110,104,0.97)", border: "rgba(120,232,216,0.98)" },
  // A button that currently cannot do anything: no scalar arrays to threshold
  // on, no volume to isosurface. Without this the card looks identical to a
  // working one and a tap just silently does nothing — the failure mode the
  // Views button's "no-other-views" result was added to avoid.
  disabled: { fill: "rgba(24,27,36,0.86)", border: "rgba(90,101,128,0.58)" },
  // The participant who currently holds the data-manipulation token
  // (VRManipulationLock), on their roster cell in the people drawer. Amber
  // rather than the teal "active" so "this person controls the data" never
  // reads as "this button is switched on" — the two mean different things and
  // can be true of different cells at the same time.
  holder: { fill: "rgba(96,66,18,0.96)", border: "rgba(255,190,92,0.98)" },
};

// Per-activity accent, keyed by a button's `group` (VR_MENU_GROUPS). Applied as
// the IDLE card's border + a thin top edge bar, so each row of the panel reads
// as one activity at a glance. Hover/active borders are deliberately left alone
// so state feedback still reads the same everywhere.
const GROUP_ACCENTS = {
  TOOLS: "rgba(255,176,90,0.95)", // amber — create/measure on the data
  MOVE: "rgba(126,203,255,0.95)", // sky — locomotion + object manipulation
  VIEW: "rgba(167,231,140,0.95)", // green — scale + appearance
  SCENE: "rgba(206,160,255,0.95)", // violet — what's shown, save/restore
  SESSION: "rgba(255,138,168,0.95)", // rose — people, voice, exit
};
const GROUP_ACCENT_FALLBACK = "rgba(96,110,146,0.55)";
// Height of the accent bar along the card's top edge, in CARD_TEX px.
const GROUP_BAR_H = 10;
// Raise the hovered/active card slightly toward the user along the panel normal
// for tactile depth (standard VR button feedback).
const CARD_HOVER_LIFT = 0.01; // metres (physical), before vrScale

// --- Backing panel --------------------------------------------------------
// A single dark, rounded, semi-transparent card sits behind the whole grid so
// the buttons read as one cohesive panel instead of floating tiles.
const BACKING_TEX_W = 512;
const BACKING_TEX_H = 512;
const BACKING_CORNER_RADIUS = 48; // px on the BACKING_TEX canvas
const BACKING_STYLE = { fill: "rgba(10,13,21,0.94)", border: "rgba(112,133,174,0.78)" };
const BACKING_HEADER = { fill: "rgba(37,75,119,0.94)" }; // top header band
const BACKING_PAD_M = 0.045; // padding around the grid, metres
const BACKING_HEADER_M = 0.1; // large grab target above the controls, metres
const BACKING_BEHIND_M = 0.008; // push behind the button plane, metres

// Text labels: rendered as canvas-texture billboards (see _createTextLabelActor),
// not vtkVectorText — vtkVectorText requires an opentype.js-parsed font via
// setFont(), which nothing in this codebase (or its dependencies; opentype.js
// isn't even installed) ever supplies, so every vtkVectorText label silently
// rendered as empty, invisible geometry. Canvas text has no such dependency.
const BUTTON_LABEL_WORLD_HEIGHT = 0.038; // label height in meters, before vrScale
const LABEL_LIFT = 0.003; // float above the button quad so it never z-fights

// Status line: sits just above the panel's top edge.
const STATUS_WORLD_HEIGHT = 0.038;
const STATUS_MARGIN = 0.03;

// Hint line ("how do I use this"): sits just below the panel's bottom edge —
// a separate line from the status line above, so the two never get
// concatenated into one unreadably long piece of text (see
// VRSpatialMenuModel.getHintLine).
const HINT_WORLD_HEIGHT = 0.031;
const HINT_MARGIN = 0.03;

// Status/hint canvas repaint gate: _layoutStatus/_layoutHint already
// dirty-check the text before doing any work, but VRSpatialMenuModel's
// status string embeds the live vrScale, which VRScaleController mutates
// continuously during a two-hand pinch — so even with _formatScale coarsened
// (see VRSpatialMenuModel._formatScale), the string can still change often
// enough to repaint the canvas + re-upload its GPU texture almost every
// frame. This caps the repaint rate independently of the dirty-check, which
// still governs WHETHER a repaint is needed at all — this only governs how
// SOON a pending change is allowed to actually paint. ~8 Hz is well above
// what's perceptible for a text label but far below 72-90 Hz frame rate.
const LABEL_REPAINT_INTERVAL_MS = 125;

/** Monotonic clock for the repaint gate above — mirrors the defensive
 * fallback VRExplorationManager already uses elsewhere in the VR stack.
 * @private
 */
function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// Compact wrist-mounted reopen pill shown while the full panel is hidden.
const RESHOW_TAB_WIDTH_M = 0.2;
const RESHOW_TAB_HEIGHT_M = 0.075;
// Lateral offset for the reshow tab's no-left-hand fallback placement (see
// _updateReshowAnchor). Gripless/transient-pointer input (Apple Vision Pro)
// never reports a left-hand pose during one-handed aiming, which is the
// common case, not an edge case — a dead-ahead fallback would sit right in
// the "look at the dataset and point at it" cone every active tool's
// raycast uses, silently eating the trigger pull meant for the tool.
const RESHOW_TAB_FALLBACK_SIDE_OFFSET_M = 0.3;

/**
 * VRSpatialUI — renders the in-session tool panel and routes ray taps back
 * through VRSpatialMenuModel → VRExplorationManager.
 *
 * Lifecycle: initialize(renderer, manager) → per-frame update(inputState) →
 * dispose(). Show/hide is bound to VR session start/end through the model.
 */
export class VRSpatialUI {
  constructor() {
    this._renderer = null;
    this._model = null;
    this._buttonActors = new Map(); // buttonId → { actor, labelActor }
    this._panelAnchor = null; // { center:[x,y,z], right:[..], up:[..], normal:[..] }
    this._reshowAnchor = null;
    this._lastHeadPos = null;
    this._lastSelectPressed = false;
    this._lastInputState = null;
    this._lastGripPressed = { left: false, right: false };
    // Once moved, the panel remains exactly where the user leaves it. It only
    // follows the head again when explicitly reopened via X or the wrist pill.
    this._manualPlacement = false;
    // { kind, hand, rayDistance?, offsetRight?, offsetUp?, lastPosition? }
    this._dragState = null;
    this._hoverButtonId = null;
    // Panel height in metres, derived per-frame from the model's current row
    // count (ROW_HEIGHT_M * rows) — see _currentRowCount(). Defaults to the 5
    // static rows so geometry math is sane before the first update() call.
    this._panelHeight = this._computePanelHeight(5);
    // Tracks which tool was active last frame, so the contextual row's actors
    // are only rebuilt on an actual change (see _reconcileButtonActors),
    // not every frame.
    this._lastActiveToolId = null;
    this._lastOpenDrawerId = null;
    // Coarse people-drawer roster signature from the model, so the roster row's
    // actors are only reconciled when the row actually changes shape.
    this._lastRosterKey = "";
    // Status line (dataset / scale / nav mode) — a single dynamic label kept
    // separate from the static button labels since its text changes. Canvas/
    // context/texture/plane are kept around so _redrawStatusLabel can update
    // them in place instead of recreating the actor every text change.
    this._statusCanvas = null;
    this._statusCtx = null;
    this._statusTexture = null;
    this._statusPlaneSource = null;
    this._statusActor = null;
    this._statusWorldWidth = 0;
    this._lastStatusText = null;
    // Timestamp (performance.now()) of the last ACTUAL status canvas repaint —
    // separate from _lastHintPaintTime below so the two labels gate
    // independently (see LABEL_REPAINT_INTERVAL_MS / _layoutStatus).
    this._lastStatusPaintTime = 0;
    // Hint line ("how do I use this") — same pattern as the status line, kept
    // as a fully separate actor/canvas so the two lines never collide.
    this._hintCanvas = null;
    this._hintCtx = null;
    this._hintTexture = null;
    this._hintPlaneSource = null;
    this._hintActor = null;
    this._hintWorldWidth = 0;
    this._lastHintText = null;
    // Timestamp of the last actual hint canvas repaint — see
    // _lastStatusPaintTime above.
    this._lastHintPaintTime = 0;
    // Reshow tab — shown instead of the full panel while manually hidden.
    this._reshowTabActor = null;
    this._reshowTabLabelActor = null;
    this._reshowTabCard = null; // {canvas, ctx, texture, stateKey} for hover redraw
    // Hover result from THIS frame's hitTest()'s _hitTestReshowTab, latched
    // here so layout()'s _layoutReshowTab (which runs later, after nav) knows
    // whether to paint the tab's hover state without re-running the ray test.
    this._reshowHovering = false;
    // Backing panel — one dark rounded card behind the whole button grid.
    this._backingPanelActor = null;
    this._backingCanvas = null;
    this._backingCtx = null;
    this._backingTexture = null;
    this._backingPlaneSource = null;
    // XR→data affine (dataPos = xrPos/vrScale + vrOrigin). All panel geometry
    // and hit-testing is computed in physical (XR) metres; these convert the
    // final actor placements into the data-space renderer the VR camera draws,
    // so the panel appears at a fixed physical size/distance regardless of how
    // the dataset is zoomed. Mirrors VREnvironment's per-actor transform.
    this._vrScale = 1.0;
    this._vrOrigin = [0, 0, 0];
    // Latched from layout()'s payload. Used to size the panel's lateral offset
    // so it sits BESIDE the dataset rather than inside it.
    this._dataBounds = null;
    // Per-instance panel geometry, defaulted to the menu's constants and
    // swapped for the keyboard's own set in update() whenever the model's
    // mode flips (see _lastPanelMode). Instance fields (not module constants)
    // because the SAME panel now has two possible footprints.
    this._panelWidth = PANEL_WIDTH;
    this._panelDrop = PANEL_DROP;
    this._panelSideOffset = PANEL_SIDE_OFFSET;
    this._panelDistance = PANEL_DISTANCE;
    // Which side the panel prefers when the dataset is dead ahead and both
    // sides are equally clear. +1 = the user's right. Resolved from the
    // accessibility settings at initialize().
    this._panelSideSign = 1;
    this._lastAnchorScale = null;
    this._lastPanelMode = "menu";
    // Actors for buttons whose id fell out of the current layout (e.g. a
    // mode switch), moved here instead of destroyed — see
    // _reconcileButtonActors. Re-adopted if the same id reappears; otherwise
    // sit invisible until dispose().
    this._parkedActors = new Map();
  }

  /**
   * Map a physical (XR) point to the data-space coordinate the VR camera
   * renders: dataPos = xrPos/vrScale + vrOrigin.
   * @private
   */
  _toData(p) {
    const s = this._vrScale || 1.0;
    const o = this._vrOrigin || [0, 0, 0];
    return [p[0] / s + o[0], p[1] / s + o[1], p[2] / s + o[2]];
  }

  /**
   * @param {object} renderer - VTK.js renderer (vrContext.sceneObjects.renderer)
   * @param {object} manager  - VRExplorationManager (source of truth)
   */
  /**
   * @param {object} renderer - the shared VTK renderer
   * @param {object} manager - VRExplorationManager (the model's command surface)
   * @param {{vrScale?:number, vrOrigin?:number[], dataBounds?:number[]}} [transform]
   *   The session's XR→data transform. Pass it: the first hitTest() commits a
   *   panel anchor BEFORE the first layout() ever runs, and without bounds
   *   that anchor lands across the forward axis (see _latchTransform).
   */
  initialize(renderer, manager, transform) {
    // Idempotency guard: if a previous VR session's teardown ever failed to
    // call dispose() (e.g. an earlier sub-manager's dispose() threw before
    // leaveSession() reached this one), stale button/label actors would
    // still be sitting in this same long-lived renderer. Disposing first
    // guarantees at most one menu panel ever exists, self-healing any leak
    // instead of stacking a duplicate set of "blue rectangles" on top.
    if (this._renderer) this.dispose();
    this._renderer = renderer;
    // Which side the panel prefers. Read once here, matching how the snap-turn
    // step is read once at VRNavigationController construction — there is no
    // live-update path for accessibility settings mid-session.
    try {
      const hand = readVRAccessibilitySettings()?.input?.dominantHand;
      this._panelSideSign = hand === "left" ? -1 : 1;
    } catch {
      this._panelSideSign = 1;
    }
    // Seed the transform BEFORE the first frame. dispose() resets _dataBounds
    // to null every session, so without this the session's opening anchor is
    // always computed blind — and _updateAnchor's lazy re-anchor gate then
    // keeps that bad placement for as long as the user stands still.
    this._latchTransform(transform);
    this._model = new VRSpatialMenuModel(manager);
    this._model.onSessionStart();
    this._buildActors();
    log.info("VR spatial UI initialized");
  }

  /**
   * Latch the current XR→data transform so _updateAnchor/_layoutButtons can
   * place the panel in the data-space renderer at a fixed physical size.
   *
   * Shared by initialize() and layout() deliberately. It used to live only in
   * layout(), which is PHASE 2 of the frame — but _updateAnchor() runs from
   * hitTest(), PHASE 1, so on the very first frame the anchor was committed
   * with _dataBounds still null. _adaptiveSideOffset then fell back to the
   * bare PANEL_SIDE_OFFSET, which is smaller than the panel's own half-width,
   * putting the panel across the user's forward axis — exactly where they aim
   * to reach a centred dataset. See _adaptiveSideOffset for the consequence.
   * @private
   */
  _latchTransform(transform) {
    if (!transform) return;
    this._vrScale = transform.vrScale || 1.0;
    this._vrOrigin = transform.vrOrigin || [0, 0, 0];
    // Keep the last known bounds when a frame omits them, so the panel's
    // placement doesn't snap around on a transient null.
    this._dataBounds = transform.dataBounds ?? this._dataBounds;
  }

  /** The pure model, exposed for wiring/inspection. */
  getModel() {
    return this._model;
  }

  // ===========================================================================
  // GEOMETRY
  // ===========================================================================

  _buildActors() {
    if (!this._renderer || !this._model) return;
    this._buildBackingPanel();
    this._reconcileButtonActors();
    this._buildStatusLabel();
    this._buildHintLabel();
    this._buildReshowTab();
  }

  /**
   * Backing panel: a single dark, rounded, semi-transparent card behind the
   * whole grid (with a subtle header band) so the buttons read as one cohesive
   * panel. Drawn once at a fixed texture resolution; the plane is re-sized to
   * the live panel footprint each frame in _layoutBackingPanel.
   * @private
   */
  _buildBackingPanel() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = BACKING_TEX_W;
      canvas.height = BACKING_TEX_H;
      const ctx = canvas.getContext("2d");

      const texture = vtkTexture.newInstance();
      texture.setInterpolate(true);

      this._backingCanvas = canvas;
      this._backingCtx = ctx;
      this._backingTexture = texture;
      // Content (menu group legend vs. keyboard title) is drawn separately so
      // update()'s mode switch can repaint it without rebuilding the actor —
      // see _drawBackingPanel.
      this._drawBackingPanel("menu");

      // Seeded as a real unit quad, not the degenerate all-zero plane vtk.js
      // warns about ("Bad plane definition"); _layoutBackingPanel resizes it
      // to the live panel footprint on the first frame anyway.
      const planeSource = vtkPlaneSource.newInstance({
        origin: [-0.5, -0.5, 0],
        point1: [0.5, -0.5, 0],
        point2: [-0.5, 0.5, 0],
      });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());
      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.addTexture(texture);
      actor.getProperty().setLighting(false);
      actor.getProperty().setOpacity(1.0);
      actor.setForceTranslucent(true); // see _createButtonActor
      actor.setVisibility(false);
      actor.setPickable(false);

      this._backingPlaneSource = planeSource;
      this._backingPanelActor = actor;
      this._renderer.addActor(actor);
    } catch (err) {
      log.warn(`VR menu backing panel failed: ${err?.message}`);
    }
  }

  /**
   * Paint the backing panel's HEADER content for the given mode onto the
   * already-built canvas/ctx/texture, re-uploading the texture — the canvas
   * itself never changes size (BACKING_TEX_W x BACKING_TEX_H is fixed), only
   * what's drawn on it, so a plain re-upload is enough; no plane/actor rebuild.
   *
   * "menu" draws a concise title and a visible drag affordance. "keyboard"
   * draws a plain Annotation title.
   * @param {"menu"|"keyboard"} mode
   * @private
   */
  _drawBackingPanel(mode) {
    const canvas = this._backingCanvas;
    const ctx = this._backingCtx;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Body
    this._roundRectPath(ctx, 4, 4, w - 8, h - 8, BACKING_CORNER_RADIUS);
    ctx.fillStyle = BACKING_STYLE.fill;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = BACKING_STYLE.border;
    ctx.stroke();
    // Header band across the top (proportional to the texture height).
    const headerPx = Math.round(h * 0.14);
    this._roundRectPath(ctx, 4, 4, w - 8, headerPx, BACKING_CORNER_RADIUS);
    ctx.fillStyle = BACKING_HEADER.fill;
    ctx.fill();

    const midY = 4 + headerPx / 2;

    if (mode === "keyboard") {
      // A single centred title — no per-group swatches, nothing to legend.
      ctx.font = `600 ${Math.round(headerPx * 0.4)}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLOR_LABEL;
      ctx.fillText("Annotation", w / 2, midY + 1);
      if (this._backingTexture) this._uploadCanvasTexture(canvas, ctx, this._backingTexture);
      return;
    }

    ctx.font = `700 ${Math.round(headerPx * 0.36)}px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLOR_LABEL;
    ctx.fillText("VR CONTROLS", 24, midY + 1);

    // A simple grip mark plus instruction makes the previously invisible
    // movable region discoverable in-headset.
    ctx.font = `600 ${Math.round(headerPx * 0.27)}px Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#dbe8f8";
    ctx.fillText("TRIGGER OR GRIP TO MOVE", w - 24, midY + 1);

    if (this._backingTexture) this._uploadCanvasTexture(canvas, ctx, this._backingTexture);
  }

  /**
   * Size + place the backing panel to sit just behind the button grid, covering
   * the grid plus padding and a header band above it.
   * @private
   */
  _layoutBackingPanel() {
    const a = this._panelAnchor;
    if (!a || !this._backingPanelActor || !this._backingPlaneSource) return;
    const { center, normal } = a;
    const yawDeg = (Math.atan2(normal[0], normal[2]) * 180) / Math.PI;
    const inv = 1 / (this._vrScale || 1.0);

    const width = this._panelWidth + BACKING_PAD_M * 2;
    const height = this._panelHeight + BACKING_PAD_M * 2 + BACKING_HEADER_M;
    const hw = width / 2;
    const hh = height / 2;
    this._backingPlaneSource.setOrigin(-hw, -hh, 0);
    this._backingPlaneSource.setPoint1(hw, -hh, 0);
    this._backingPlaneSource.setPoint2(-hw, hh, 0);

    // Center shifts up by half the header so the grid stays centred below it,
    // and pushes slightly behind the button plane so cards float in front.
    const ov = BACKING_HEADER_M / 2;
    const cx = center[0] + a.up[0] * ov - normal[0] * BACKING_BEHIND_M;
    const cy = center[1] + a.up[1] * ov - normal[1] * BACKING_BEHIND_M;
    const cz = center[2] + a.up[2] * ov - normal[2] * BACKING_BEHIND_M;
    this._backingPanelActor.setPosition(...this._toData([cx, cy, cz]));
    this._backingPanelActor.setOrientation(0, yawDeg, 0);
    this._backingPanelActor.setScale(inv, inv, inv);
    this._backingPanelActor.setVisibility(true);
  }

  /**
   * Bring this._buttonActors in sync with the model's CURRENT button layout
   * (static rows + any active contextual row). Only adds/removes the actors
   * that actually changed — the 25 static buttons never do, so in practice
   * this only ever touches the 0-2 contextual-row actors when a tool with
   * contextual buttons (clip/annotate/probe) activates or deactivates.
   * Called once at init (empty map → adds everything) and again from
   * update() whenever the active tool id changes.
   * @private
   */
  _reconcileButtonActors() {
    if (!this._renderer || !this._model) return;
    const layout = this._model.getButtonLayout();
    const currentIds = new Set(layout.map((r) => r.id));

    // Park (don't destroy) actors whose id fell out of the layout. A mode
    // switch — menu <-> keyboard, or a tool/drawer toggle — can retire and
    // later reintroduce the same ids repeatedly (every keyboard open/close is
    // ~50 cards), and each card is a canvas + texture + up to two actors:
    // rebuilding that set from scratch on every open would be a visible
    // hitch at 90 Hz. setVisibility(false) on BOTH actors is required here,
    // not optional — _layoutButtons only ever positions/shows ids that ARE in
    // the current layout, so a parked card left visible would linger at its
    // last position forever.
    for (const [id, entry] of this._buttonActors) {
      if (currentIds.has(id)) continue;
      entry.actor.setVisibility(false);
      if (entry.labelActor) entry.labelActor.setVisibility(false);
      this._parkedActors.set(id, entry);
      this._buttonActors.delete(id);
    }

    for (const region of layout) {
      if (this._buttonActors.has(region.id)) continue;

      // Re-adopt a parked actor for this id before building a new one — this
      // is what makes reopening the keyboard (or reactivating a tool) cheap:
      // its cards already exist, just hidden. _layoutButtons/_applyButtonVisuals
      // run every frame regardless of adopt-vs-build, so position and visual
      // state (idle/hover/active) both catch up this same frame.
      const parked = this._parkedActors.get(region.id);
      if (parked) {
        this._parkedActors.delete(region.id);
        this._buttonActors.set(region.id, parked);
        continue;
      }

      // Per-button isolation: _createButtonContentActor already catches its
      // own errors and degrades to a label-less quad, but _createButtonActor
      // and the addActor calls themselves are not guarded. Without this
      // try/catch, one bad button (e.g. a future icon/vtk.js edge case) would
      // throw out of the whole loop and leave every button after it — and on
      // the very first iteration, the ENTIRE panel — missing with no
      // indication why. Isolating per-button means the rest of the panel
      // still renders, and the specific failing button is named in the log.
      try {
        const card = this._createButtonActor("idle", region.group);
        const label = this._createButtonContentActor(
          region.label,
          region.icon,
          BUTTON_LABEL_WORLD_HEIGHT,
          COLOR_LABEL
        );
        this._buttonActors.set(region.id, {
          actor: card.actor,
          labelActor: label?.actor ?? null,
          canvas: card.canvas,
          ctx: card.ctx,
          texture: card.texture,
          stateKey: card.stateKey,
          group: region.group ?? null,
          // What the label canvas currently reads. Static buttons never change
          // it; roster cells do (see _refreshRosterLabels), and this is the
          // dirty-check that keeps that from repainting on every frame.
          labelText: region.label ?? "",
          labelPaintTime: now(),
        });
        this._renderer.addActor(card.actor);
        if (label) this._renderer.addActor(label.actor);
      } catch (err) {
        log.error(`VR menu button "${region.id}" failed to build — ${err?.message}`, err?.stack || err);
      }
    }
  }

  /**
   * Panel height (metres) for the CURRENT frame, derived from the model's
   * live row count so it grows/shrinks automatically with the contextual
   * row — no hardcoded constant to bump when VR_MENU_BUTTONS changes shape.
   * @private
   */
  _currentRowCount() {
    if (!this._model) return 5;
    const layout = this._model.getButtonLayout();
    if (!layout.length) return 5;
    // Count DISTINCT rows, not max+1. Extra rows (drawers, the contextual row)
    // carry NEGATIVE indices so they sort above the static grid — with static
    // rows 0..4 and one contextual row at -1 there are six rows, but max+1
    // returned five, so the panel never grew and every row silently shrank by
    // a sixth. Harmless-looking (hit-testing stayed self-consistent, since
    // layout and _intersectPanel both divide by the same _panelHeight) right
    // up until drawers add a second and third negative row.
    return new Set(layout.map((r) => r.row)).size;
  }

  /**
   * Physical panel height for a given row count, with rows compressing rather
   * than the panel growing without bound. See MAX_PANEL_HEIGHT_M.
   * @param {number} rows
   * @returns {number} height in metres
   * @private
   */
  _computePanelHeight(rows) {
    const n = Math.max(1, rows);
    const rowH = Math.min(
      ROW_HEIGHT_M,
      Math.max(ROW_HEIGHT_MIN_M, MAX_PANEL_HEIGHT_M / n)
    );
    return rowH * n;
  }

  /**
   * Status line actor: same canvas-texture technique as button labels, but
   * its text changes at runtime, so the canvas/context/texture/plane are kept
   * around (as instance fields) for _redrawStatusLabel to update in place.
   * @private
   */
  _buildStatusLabel() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");

      // resizable:true is REQUIRED here. This label's canvas is re-sized to fit
      // each new string (see _redrawStatusLabel/_redrawHintLabel), and on WebGL2
      // vtk.js allocates non-resizable textures with texStorage2D, which makes
      // them immutable — every upload after the first would silently fail and
      // the text would freeze on its first value.
      const texture = vtkTexture.newInstance({ resizable: true });
      texture.setInterpolate(true);

      const planeSource = vtkPlaneSource.newInstance({
        origin: [-0.5, -0.5, 0],
        point1: [0.5, -0.5, 0],
        point2: [-0.5, 0.5, 0],
      });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.addTexture(texture);
      actor.getProperty().setOpacity(1.0);
      actor.getProperty().setLighting(false);
      actor.setForceTranslucent(true); // see _createButtonActor
      actor.setVisibility(false);
      actor.setPickable(false);

      this._statusCanvas = canvas;
      this._statusCtx = ctx;
      this._statusTexture = texture;
      this._statusPlaneSource = planeSource;
      this._statusActor = actor;
      this._statusWorldWidth = 0;
      this._renderer.addActor(actor);
    } catch (err) {
      log.warn(`VR menu status label failed: ${err?.message}`);
    }
  }

  /**
   * Build a rounded-card button background: a plane textured with a canvas that
   * paints a rounded-rect fill + border in the given visual state. Returns a
   * bundle (actor + the canvas/ctx/texture needed to redraw it on state change,
   * plus the current stateKey for dirty-checking). Replaces the old flat
   * solid-colour quad — the "just a rectangle" look the redesign removes.
   * @param {"idle"|"hover"|"active"} [stateKey]
   * @private
   */
  _createButtonActor(stateKey = "idle", group = null) {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_TEX_W;
    canvas.height = CARD_TEX_H;
    const ctx = canvas.getContext("2d");

    const texture = vtkTexture.newInstance();
    texture.setInterpolate(true);

    // CENTERED on its own local origin, spanning [-0.5,0.5]². vtkPlaneSource's
    // DEFAULTS (origin [0,0,0], point1 [1,0,0], point2 [0,1,0]) span [0,1]²
    // instead — relying on them here put every card half a cell up-and-right of
    // the cell centre _layoutButtons positions it at, so the visible card no
    // longer coincided with the hit region hitTest() uses (you pressed the
    // card's neighbour) nor with its own centred icon+label billboard (which
    // landed on the card's bottom-left corner). Every other plane in this file
    // is authored centred; this one must be too.
    const plane = vtkPlaneSource.newInstance({
      origin: [-0.5, -0.5, 0],
      point1: [0.5, -0.5, 0],
      point2: [-0.5, 0.5, 0],
      xResolution: 1,
      yResolution: 1,
    });
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(plane.getOutputPort());
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.addTexture(texture);
    actor.getProperty().setLighting(false);
    actor.getProperty().setOpacity(1.0);
    // vtkActor.getIsOpaque() inspects model.texture, which addTexture() never
    // writes (it appends to model.textures), so a textured-but-opacity-1 actor
    // is classified opaque and renders with depthMask(true) — its transparent
    // rounded corners then punch holes in the backing panel behind it. Forcing
    // the translucent pass makes the alpha composite correctly.
    actor.setForceTranslucent(true);
    actor.setVisibility(false);
    // Menu chrome must never be picked by the data-space tools.
    actor.setPickable(false);

    this._drawCard(ctx, canvas, texture, stateKey, group);
    return { actor, canvas, ctx, texture, stateKey, group };
  }

  /**
   * Trace a rounded-rect path (works without native ctx.roundRect, which jsdom
   * and some canvases lack). Corners are clamped so tiny cards stay valid.
   * @private
   */
  _roundRectPath(ctx, x, y, w, h, r) {
    roundRectPath(ctx, x, y, w, h, r);
  }

  /**
   * Paint a button card (rounded rect fill + border) for the given state onto
   * its canvas and re-upload the texture. Cheap; only called on state change.
   * @private
   */
  _drawCard(ctx, canvas, texture, stateKey, group) {
    const style = CARD_STYLES[stateKey] || CARD_STYLES.idle;
    const accent = GROUP_ACCENTS[group] || GROUP_ACCENT_FALLBACK;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const inset = CARD_BORDER_WIDTH;
    this._roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, CARD_CORNER_RADIUS);
    ctx.fillStyle = style.fill;
    ctx.fill();
    // Idle cards carry their activity's accent as the border; hover/active keep
    // their own state colour so the selection feedback stays unambiguous.
    ctx.lineWidth = CARD_BORDER_WIDTH;
    ctx.strokeStyle = stateKey === "idle" ? accent : style.border;
    ctx.stroke();

    // Accent bar along the top edge, clipped to the rounded card, so the group
    // stays identifiable even while a card is hovered or active.
    ctx.save();
    this._roundRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, CARD_CORNER_RADIUS);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(inset, inset, w - inset * 2, GROUP_BAR_H);
    ctx.restore();

    this._uploadCanvasTexture(canvas, ctx, texture);
  }

  /**
   * Canvas-texture text label — same technique as
   * src/core/vr/avatars/AvatarLabel.js: draws crisp text via the Canvas 2D
   * API into an offscreen canvas, uploads it as a vtkTexture on a plane
   * authored directly at its final physical (metre) footprint, sized to the
   * text's own measured aspect ratio (no stretching, no per-character-count
   * estimate). The plane is centered on its own local origin, so callers just
   * position it at the desired center point — see _layoutButtons/_layoutStatus.
   *
   * Returns null on failure or empty text — the button stays usable as an
   * unlabeled quad.
   *
   * @param {string} text
   * @param {number} worldHeight - label height in physical metres (before vrScale)
   * @param {string} cssColor - text fill color
   * @returns {{actor:object, worldWidth:number, worldHeight:number}|null}
   * @private
   */
  _createTextLabelActor(text, worldHeight, cssColor) {
    const str = text || "";
    if (!str) return null;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const pxHeight = 80;
      const font = `700 ${Math.round(pxHeight * 0.62)}px Arial, sans-serif`;
      ctx.font = font;
      const measured = ctx.measureText(str).width;
      const padding = pxHeight * 0.4;
      canvas.width = Math.max(1, Math.ceil(measured + padding * 2));
      canvas.height = pxHeight;
      // Resizing the canvas resets its 2D context state — re-apply the font.
      ctx.font = font;
      ctx.fillStyle = cssColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText(str, canvas.width / 2, canvas.height / 2 + 1);

      const texture = vtkTexture.newInstance();
      texture.setInterpolate(true);
      this._uploadCanvasTexture(canvas, ctx, texture);

      const worldWidth = worldHeight * (canvas.width / canvas.height);
      const hw = worldWidth / 2;
      const hh = worldHeight / 2;
      const planeSource = vtkPlaneSource.newInstance({
        origin: [-hw, -hh, 0],
        point1: [hw, -hh, 0],
        point2: [-hw, hh, 0],
      });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.addTexture(texture);
      actor.getProperty().setOpacity(1.0);
      actor.getProperty().setLighting(false);
      actor.setVisibility(false);
      actor.setPickable(false);
      return { actor, worldWidth, worldHeight };
    } catch (err) {
      log.warn(`VR menu label failed for "${str}": ${err?.message}`);
      return null;
    }
  }

  /**
   * Icon + label canvas-texture billboard for a menu button — same technique
   * as _createTextLabelActor (offscreen canvas → vtkTexture on a plane sized
   * to the canvas's own aspect ratio), extended to draw the button's Material
   * Symbols glyph (from ICON_PATHS, reused from the desktop icon system — no
   * separate VR asset pipeline) to the left of the label, both on one canvas
   * so they upload as a single texture/actor. Falls back to label-only if the
   * icon key doesn't resolve to path data (defensive; every current button
   * has a valid icon).
   *
   * @param {string} text
   * @param {string} iconKey - semantic icon name (VR_MENU_BUTTONS `icon` field)
   * @param {number} worldHeight - label height in physical metres (before vrScale)
   * @param {string} cssColor - fill color for both icon and text
   * @returns {{actor:object, worldWidth:number, worldHeight:number}|null}
   * @private
   */
  _createButtonContentActor(text, iconKey, worldHeight, cssColor) {
    const str = text || "";
    if (!str) return null;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const pxHeight = 80;
      const font = `700 ${Math.round(pxHeight * 0.62)}px Arial, sans-serif`;
      ctx.font = font;
      const measured = ctx.measureText(str).width;
      const padding = pxHeight * 0.4;

      const symbolName = iconKey ? getSymbolName(iconKey) : null;
      const hasIconGlyph = !!(symbolName && ICON_PATHS[symbolName]);
      const iconSize = pxHeight * 0.72;
      const iconGap = pxHeight * 0.18;
      const iconBlockWidth = hasIconGlyph ? iconSize + iconGap : 0;

      canvas.width = Math.max(1, Math.ceil(iconBlockWidth + measured + padding * 2));
      canvas.height = pxHeight;
      // Resizing the canvas resets its 2D context state — re-apply the font.
      ctx.font = font;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let textStartX = padding;
      if (hasIconGlyph) {
        const iconTop = (pxHeight - iconSize) / 2;
        this._drawIconGlyph(ctx, symbolName, padding, iconTop, iconSize, cssColor);
        textStartX = padding + iconBlockWidth;
      }

      ctx.fillStyle = cssColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(str, textStartX, canvas.height / 2 + 1);

      const texture = vtkTexture.newInstance();
      texture.setInterpolate(true);
      this._uploadCanvasTexture(canvas, ctx, texture);

      const worldWidth = worldHeight * (canvas.width / canvas.height);
      const hw = worldWidth / 2;
      const hh = worldHeight / 2;
      const planeSource = vtkPlaneSource.newInstance({
        origin: [-hw, -hh, 0],
        point1: [hw, -hh, 0],
        point2: [-hw, hh, 0],
      });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.addTexture(texture);
      actor.getProperty().setOpacity(1.0);
      actor.getProperty().setLighting(false);
      // The icon/label canvas is transparent everywhere except the glyph and
      // text, so it MUST composite rather than write depth. See _createButtonActor.
      actor.setForceTranslucent(true);
      actor.setVisibility(false);
      actor.setPickable(false);
      return { actor, worldWidth, worldHeight };
    } catch (err) {
      log.warn(`VR menu button content failed for "${str}": ${err?.message}`);
      return null;
    }
  }

  /**
   * Draw a Material Symbols glyph (ICON_PATHS SVG path data, authored on the
   * standard "0 -960 960 960" viewBox) into a square region of a 2D canvas.
   *
   * Path2D accepts SVG path syntax directly, so the only work is mapping the
   * viewBox into the target square. The transform below reproduces exactly
   * what an SVG viewer would do: translate to the target box origin, scale by
   * (boxSize/960), then translate by (0, 960) so svgY=-960 (top of glyph)
   * lands at the box's top edge and svgY=0 (bottom) lands at its bottom edge
   * — i.e. standard top-down orientation, matching how the label text is
   * already drawn on this same canvas. No extra vertical flip is needed here:
   * _uploadCanvasTexture flips the WHOLE canvas uniformly for the WebGL
   * texture, exactly as it already does for text.
   * @private
   */
  _drawIconGlyph(ctx, symbolName, x, y, size, cssColor) {
    const pathData = ICON_PATHS[symbolName];
    if (!pathData) return;
    const scale = size / 960;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(0, 960);
    ctx.fillStyle = cssColor;
    ctx.fill(new Path2D(pathData));
    ctx.restore();
  }

  /**
   * Redraw the (dynamic) status canvas for new text, re-upload its texture,
   * and resize its plane to match the new text's aspect ratio.
   * @private
   */
  _redrawStatusLabel(text) {
    const canvas = this._statusCanvas;
    const ctx = this._statusCtx;
    const pxHeight = 80;
    const font = `600 ${Math.round(pxHeight * 0.58)}px Arial, sans-serif`;
    ctx.font = font;
    const measured = ctx.measureText(text).width;
    const padding = pxHeight * 0.4;
    canvas.width = Math.max(1, Math.ceil(measured + padding * 2));
    canvas.height = pxHeight;
    ctx.font = font; // re-apply after resize
    ctx.fillStyle = COLOR_STATUS;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    this._uploadCanvasTexture(canvas, ctx, this._statusTexture);

    const worldHeight = STATUS_WORLD_HEIGHT;
    const worldWidth = worldHeight * (canvas.width / canvas.height);
    const hw = worldWidth / 2;
    const hh = worldHeight / 2;
    this._statusPlaneSource.setOrigin(-hw, -hh, 0);
    this._statusPlaneSource.setPoint1(hw, -hh, 0);
    this._statusPlaneSource.setPoint2(-hw, hh, 0);
    this._statusWorldWidth = worldWidth;
  }

  /**
   * Hint line actor ("how do I use this right now") — same canvas-texture/
   * dirty-check pattern as the status label, kept as fully separate fields so
   * the two lines never collide into one string.
   * @private
   */
  _buildHintLabel() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");

      // resizable:true is REQUIRED here. This label's canvas is re-sized to fit
      // each new string (see _redrawStatusLabel/_redrawHintLabel), and on WebGL2
      // vtk.js allocates non-resizable textures with texStorage2D, which makes
      // them immutable — every upload after the first would silently fail and
      // the text would freeze on its first value.
      const texture = vtkTexture.newInstance({ resizable: true });
      texture.setInterpolate(true);

      const planeSource = vtkPlaneSource.newInstance({
        origin: [-0.5, -0.5, 0],
        point1: [0.5, -0.5, 0],
        point2: [-0.5, 0.5, 0],
      });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(planeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.addTexture(texture);
      actor.getProperty().setOpacity(1.0);
      actor.getProperty().setLighting(false);
      actor.setForceTranslucent(true); // see _createButtonActor
      actor.setVisibility(false);
      actor.setPickable(false);

      this._hintCanvas = canvas;
      this._hintCtx = ctx;
      this._hintTexture = texture;
      this._hintPlaneSource = planeSource;
      this._hintActor = actor;
      this._hintWorldWidth = 0;
      this._renderer.addActor(actor);
    } catch (err) {
      log.warn(`VR menu hint label failed: ${err?.message}`);
    }
  }

  /** @private */
  _redrawHintLabel(text) {
    const canvas = this._hintCanvas;
    const ctx = this._hintCtx;
    const pxHeight = 64; // slightly smaller than status/button text — secondary info
    const font = `500 ${Math.round(pxHeight * 0.54)}px Arial, sans-serif`;
    ctx.font = font;
    const measured = ctx.measureText(text).width;
    const padding = pxHeight * 0.4;
    canvas.width = Math.max(1, Math.ceil(measured + padding * 2));
    canvas.height = pxHeight;
    ctx.font = font; // re-apply after resize
    ctx.fillStyle = COLOR_STATUS;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
    this._uploadCanvasTexture(canvas, ctx, this._hintTexture);

    const worldHeight = HINT_WORLD_HEIGHT;
    const worldWidth = worldHeight * (canvas.width / canvas.height);
    const hw = worldWidth / 2;
    const hh = worldHeight / 2;
    this._hintPlaneSource.setOrigin(-hw, -hh, 0);
    this._hintPlaneSource.setPoint1(hw, -hh, 0);
    this._hintPlaneSource.setPoint2(-hw, hh, 0);
    this._hintWorldWidth = worldWidth;
  }

  /**
   * The tiny always-on quad shown instead of the full panel while it's
   * manually hidden. Built once at init alongside the rest of the panel; its
   * own per-frame positioning/hit-testing happens in _updateReshowTab.
   * @private
   */
  _buildReshowTab() {
    if (!this._renderer) return;
    try {
      const card = this._createButtonActor();
      this._reshowTabActor = card.actor;
      this._reshowTabCard = card; // keep canvas/ctx/texture for hover redraw
      this._renderer.addActor(card.actor);

      const label = this._createButtonContentActor(
        "OPEN MENU",
        "menu",
        BUTTON_LABEL_WORLD_HEIGHT * 0.85,
        COLOR_LABEL
      );
      this._reshowTabLabelActor = label?.actor ?? null;
      if (this._reshowTabLabelActor) this._renderer.addActor(this._reshowTabLabelActor);
    } catch (err) {
      log.error(`VR menu reshow tab failed to build — ${err?.message}`, err?.stack || err);
    }
  }

  /**
   * Upload a 2D canvas's current pixels into a vtkTexture, flipped vertically
   * (WebGL texture origin is bottom-left; canvas is top-left).
   * @private
   */
  _uploadCanvasTexture(canvas, ctx, texture) {
    uploadCanvasTexture(canvas, ctx, texture);
  }

  // ===========================================================================
  // PER-FRAME UPDATE
  // ===========================================================================

  /**
   * @param {object} inputState - from VRExplorationManager._gatherInputState():
   *   { headPose:{position,orientation}, controllers:{ right:{ targetRay,
   *     triggerPressed, ... } } }
   * @returns {{hovering:boolean, buttonId:string|null, hand:string}|null}
   *   Input-arbitration result for the frame loop: whether the pointer is over
   *   a menu button (so its pinch should NOT also drive nav/tools) and which
   *   hand did the picking. Returns null when the menu is not initialized or
   *   has no input — the frame loop treats that as "no menu interaction this
   *   frame". While manually hidden, only the tiny reshow tab is hit-tested
   *   (see _hitTestReshowTab) — the full button grid does not run at all, so
   *   tool triggers elsewhere in the view behave completely normally.
   *
   * Thin wrapper over hitTest() + layout() (frame-order contract below) —
   * kept ONLY so the two phases can still be exercised back-to-back with the
   * same transform in one call, and so the pre-existing test suite continues
   * to exercise the whole pipeline unmodified. VRExplorationManager._onFrame
   * itself calls hitTest() and layout() separately, straddling navigation —
   * see those methods.
   */
  update(inputState, transform) {
    const result = this.hitTest(inputState);
    this.layout(transform);
    return result;
  }

  /**
   * PHASE 1 (call BEFORE navigation updates this frame's vrScale/vrOrigin) —
   * pure XR-metre geometry, entirely independent of the XR→data transform
   * (never reads/writes _vrScale/_vrOrigin — those only feed _toData, called
   * exclusively from layout()'s methods below). Re-syncs the model against
   * the manager, re-anchors the panel from the raw head pose, hit-tests the
   * controller ray against the panel (or, while manually hidden, the tiny
   * reshow tab), and — on a rising-edge select — ACTIVATES the hovered
   * button.
   *
   * Activation MUST stay in this early phase: a button press has to take
   * effect before nav/tools/the handler run later in this SAME frame (e.g.
   * tapping "Hide" must hide the panel before layout() decides, below, which
   * path to render this same frame), not a frame later.
   *
   * @param {object} inputState
   * @returns {{hovering:boolean, buttonId:string|null, hand:string}|null}
   */
  hitTest(inputState) {
    if (!this._model || !inputState) return null;
    this._lastInputState = inputState;

    if (!this._model.isVisible()) {
      return this._hitTestReshowTab(inputState);
    }

    // Keep highlights aligned with the manager (tool may have changed via the
    // DOM menu, isolation via the B-button).
    this._model.syncFromManager();

    this._updateAnchor(inputState.headPose);
    // Needed here, not only in layout(): _intersectPanel below divides by
    // this._panelHeight to resolve the hit's v-coordinate, so it must already
    // reflect the row count implied by the state syncFromManager just pulled.
    // layout() recomputes this again after its own actor-reconcile step —
    // see the comment there.
    this._panelHeight = this._computePanelHeight(this._currentRowCount());

    const ray = this._pickRay(inputState);
    const selectPressed = ray ? !!inputState.controllers?.[ray.hand]?.triggerPressed : false;
    const gripPressed = ray ? !!inputState.controllers?.[ray.hand]?.squeezePressed : false;

    if (this._dragState) {
      const dragHand = this._dragState.hand;
      const dragRay = this._rayForHand(inputState, dragHand);
      const dragController = inputState.controllers?.[dragHand];
      const stillPressed =
        this._dragState.kind === "trigger"
          ? !!dragController?.triggerPressed
          : !!dragController?.squeezePressed;

      if (stillPressed) {
        this._updateDrag(dragRay, dragController);
        this._lastSelectPressed = selectPressed;
        this._rememberGripState(inputState);
        return {
          hovering: true,
          buttonId: "__header__",
          hand: dragHand,
          consumingTrigger: this._dragState.kind === "trigger",
          consumingGrip: this._dragState.kind === "grip",
        };
      }
      this._dragState = null;
      this._manualPlacement = true;
    }

    const headerHit = ray ? this._intersectHeader(ray.origin, ray.direction) : null;
    const hit = !headerHit && ray ? this._intersectPanel(ray.origin, ray.direction) : null;
    this._hoverButtonId = hit ? this._model.hitTest(hit.u, hit.v)?.id ?? null : null;

    // Rising-edge select (trigger on controllers, pinch on transient-pointer).
    if (headerHit && selectPressed && !this._lastSelectPressed && ray) {
      this._beginTriggerDrag(ray, headerHit);
    } else if (
      headerHit &&
      gripPressed &&
      !this._lastGripPressed[ray.hand] &&
      ray
    ) {
      this._beginGripDrag(ray.hand, inputState.controllers?.[ray.hand]);
    } else if (selectPressed && !this._lastSelectPressed && this._hoverButtonId) {
      this._model.activate(this._hoverButtonId);
    }
    this._lastSelectPressed = selectPressed;
    this._rememberGripState(inputState);

    const hand = ray?.hand || (inputState.controllers?.right ? "right" : "left");
    const hovering = !!this._hoverButtonId || !!headerHit;
    return {
      hovering,
      buttonId: headerHit ? "__header__" : this._hoverButtonId ?? null,
      hand,
      // MUST equal `hovering`, not just `!!headerHit`. VRExplorationManager
      // reads this as `menuResult?.consumingTrigger ?? menuHovering` — `??`
      // only falls through on null/undefined, so an explicit `false` here
      // (as this used to be for every ordinary button tap, header drag being
      // the only case it covered) defeats that fallback. The trigger pull
      // that activates a button via `_model.activate()` two lines above
      // still reached the active tool's handleInput() as a live rising edge,
      // e.g. tapping "New Path" while Measure was active also placed a
      // phantom measurement point wherever the controller was aimed.
      consumingTrigger: hovering,
      consumingGrip: this._dragState?.kind === "grip",
    };
  }

  /**
   * Show the full panel at the user's current gaze direction. This is a
   * gaze-anchored placement, NOT a manual one — _manualPlacement stays false
   * afterward so _updateAnchor's lazy re-anchor-on-drift (see its docstring)
   * keeps running on every subsequent frame and the panel keeps following the
   * user as they move. Only an explicit header grab-drag (_beginTriggerDrag/
   * _beginGripDrag) should latch _manualPlacement — this used to also latch
   * it here, which froze the panel in place the moment it was (re)shown.
   */
  showAtHead(headPose) {
    if (!this._model) return;
    this._model.setVisible(true);
    this._dragState = null;
    this._manualPlacement = false;
    this._panelAnchor = null;
    this._lastHeadPos = null;
    this._updateAnchor(headPose);
  }

  /** Left-X entry point: close when open; reopen at current gaze when closed. */
  toggleAtHead(headPose) {
    if (!this._model) return;
    if (this._model.isVisible()) {
      this._model.setVisible(false);
      this._dragState = null;
      this._hoverButtonId = null;
    } else {
      this.showAtHead(headPose);
    }
  }

  /**
   * Invalidate the cached panel anchor so the next _updateAnchor() call
   * recomputes unconditionally, bypassing both the position-drift gate and
   * the manual-placement latch. Call this whenever something redefines the
   * XR reference space itself (e.g. VRManager.applySnapTurn/setYaw) — the
   * cached `_panelAnchor` holds raw XR-space numbers captured in the OLD
   * frame, and a reference-space rotation is deliberately position-preserving
   * (see applySnapTurn), so the position-drift gate never trips on its own
   * and the stale anchor would otherwise desync from the camera permanently.
   * Also clears a manual placement: its cached coordinates are equally
   * invalidated by the reference-space change, so keeping it would just
   * freeze the panel in the wrong spot instead of the right one.
   */
  forceReanchor() {
    this._panelAnchor = null;
    this._lastHeadPos = null;
    this._lastAnchorScale = null;
    this._manualPlacement = false;
  }

  /**
   * PHASE 2 (call AFTER navigation updates this frame's vrScale/vrOrigin,
   * before the stereo draw) — places every actor using the transform THIS
   * frame's camera will actually render with, fixing the one-frame
   * placement lag the hitTest/layout split exists to remove (see the
   * frame-order comment at the VRExplorationManager._onFrame call sites).
   *
   * Re-reads this._model.isVisible() rather than trusting anything cached
   * during hitTest() — an activation THAT SAME hitTest() call (tapping
   * "Hide", or the reshow tab bringing the panel back) may have just
   * flipped it, and this must take the correspondingly correct path this
   * same frame, not one frame later.
   *
   * @param {{vrScale?:number, vrOrigin?:number[], dataBounds?:number[]}} [transform]
   */
  layout(transform) {
    if (!this._model) return;

    this._latchTransform(transform);

    if (!this._model.isVisible()) {
      this._hideFullPanelActors();
      this._updateReshowAnchor(this._lastInputState || {});
      this._layoutReshowTab();
      return;
    }
    if (this._reshowTabActor) this._reshowTabActor.setVisibility(false);
    if (this._reshowTabLabelActor) this._reshowTabLabelActor.setVisibility(false);

    // Rebuild only the contextual row's actors when the active tool changes
    // (not the whole panel) — avoids tearing down/recreating all 25 static
    // buttons every time a tool toggles.
    // Opening/closing a drawer adds or removes whole rows of buttons, so it
    // needs the same actor rebuild the contextual row already triggered.
    const activeToolId = this._model.getActiveToolId();
    const openDrawerId = this._model.getOpenDrawerId?.() ?? null;

    // Menu <-> keyboard mode switch. Swaps the panel's physical footprint
    // (width/drop/side-offset) wholesale rather than tweening it — a draft
    // opening/closing is a discrete event, not something that benefits from
    // animating the panel underneath the user's hands.
    const mode = this._model.isKeyboardOpen?.() ? "keyboard" : "menu";
    const modeChanged = mode !== this._lastPanelMode;
    if (modeChanged) {
      this._lastPanelMode = mode;
      this._panelWidth = mode === "keyboard" ? KEYBOARD_PANEL_WIDTH : PANEL_WIDTH;
      this._panelDrop = mode === "keyboard" ? KEYBOARD_PANEL_DROP : PANEL_DROP;
      this._panelSideOffset = mode === "keyboard" ? KEYBOARD_PANEL_SIDE_OFFSET : PANEL_SIDE_OFFSET;
      // _updateAnchor (called from hitTest(), not here) early-returns unless
      // the head has drifted past REANCHOR_DISTANCE, so without nulling this
      // the new width/drop/offset would sit unused until the user physically
      // walked half a metre — the panel would keep rendering at its OLD
      // footprint/position. Because hitTest() already ran earlier THIS frame,
      // nulling it here only takes effect starting with the NEXT frame's
      // hitTest() — one frame of lag on keyboard open. Imperceptible.
      this._lastHeadPos = null;
      // Repaint the header in place (same canvas/texture, see
      // _drawBackingPanel) — the group legend makes no sense above a QWERTY
      // grid, and vice versa.
      this._drawBackingPanel(mode);
    }

    // The people drawer's roster row appears/disappears with the roster
    // itself, which the model exposes as a COARSE key — see
    // VRSpatialMenuModel._refreshRoster. Comparing the key (rather than
    // reconciling unconditionally) is what keeps a roster that is merely
    // *observed* every frame from rebuilding actors every frame.
    const rosterKey = this._model.getRosterKey?.() ?? "";
    if (
      activeToolId !== this._lastActiveToolId ||
      openDrawerId !== this._lastOpenDrawerId ||
      rosterKey !== this._lastRosterKey ||
      modeChanged
    ) {
      this._lastActiveToolId = activeToolId;
      this._lastOpenDrawerId = openDrawerId;
      this._lastRosterKey = rosterKey;
      this._reconcileButtonActors();
    }
    this._panelHeight = this._computePanelHeight(this._currentRowCount());

    this._layoutBackingPanel();
    // Before _layoutButtons: a swapped roster label is a NEW actor, and only
    // _layoutButtons positions/shows it. Repainting after it would leave the
    // new label at the origin, invisible, for one frame.
    this._refreshRosterLabels();
    this._layoutButtons();
    this._layoutStatus();
    this._layoutHint();
    this._applyButtonVisuals();
  }

  /** Hide every full-panel actor (backing/buttons/labels/status/hint) while the reshow tab is shown. @private */
  _hideFullPanelActors() {
    if (this._backingPanelActor) this._backingPanelActor.setVisibility(false);
    for (const { actor, labelActor } of this._buttonActors.values()) {
      actor.setVisibility(false);
      if (labelActor) labelActor.setVisibility(false);
    }
    if (this._statusActor) this._statusActor.setVisibility(false);
    if (this._hintActor) this._hintActor.setVisibility(false);
  }

  /**
   * Head-anchored placement with lazy re-anchor: recompute the panel frame
   * only when the head has moved past REANCHOR_DISTANCE from where the panel
   * was last placed, so it stays world-stable during close inspection.
   * @private
   */
  _updateAnchor(headPose) {
    if (!headPose?.position) return;
    if (this._manualPlacement && this._panelAnchor) return;
    const p = headPose.position;
    const headPos = [p.x, p.y, p.z];

    // Re-anchor on head translation, but ALSO on a significant zoom: the
    // lateral clearance the panel needs is a function of the dataset's angular
    // size, which vrScale changes directly. Without this the panel would stay
    // put while the data grew straight through it.
    const scaleChanged =
      this._lastAnchorScale &&
      Math.abs(Math.log((this._vrScale || 1) / this._lastAnchorScale)) >
        Math.log(1.25);

    if (this._panelAnchor && this._lastHeadPos && !scaleChanged) {
      const dx = headPos[0] - this._lastHeadPos[0];
      const dy = headPos[1] - this._lastHeadPos[1];
      const dz = headPos[2] - this._lastHeadPos[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < REANCHOR_DISTANCE) {
        return; // still comfortable; leave the panel where it is
      }
    }

    // Forward from head orientation (-Z), flattened to horizontal so the panel
    // doesn't pitch wildly when the user looks up/down.
    const fwd = this._orientationForward(headPose.orientation);
    let fx = fwd[0];
    let fz = fwd[2];
    const flen = Math.hypot(fx, fz) || 1;
    fx /= flen;
    fz /= flen;

    // Panel basis: right = fwd × worldUp, up = worldUp (kept upright for
    // reading). This USED to be [fz, 0, -fx], which is the NEGATION of
    // fwd × up — so the button grid rendered horizontally mirrored (the plane's
    // texture-u runs along the actor's local +X, which the yaw maps to
    // [-fz, 0, fx]) and PANEL_SIDE_OFFSET pushed the panel to the user's LEFT
    // despite its "toward +right" comment. Hit-testing used the same wrong
    // basis so it stayed self-consistent, which is why it went unnoticed.
    const right = [-fz, 0, fx];
    const up = [0, 1, 0];
    const normal = [-fx, 0, -fz]; // faces back toward the head

    // How far to the side the panel must sit to clear the dataset. A fixed
    // offset cannot work: the auto-fit dataset subtends ~30-77 deg depending
    // on zoom while the panel subtends ~30 deg, so the required clearance is a
    // function of both. See _adaptiveSideOffset.
    const side = this._adaptiveSideOffset(headPos, [fx, 0, fz], right);

    const center = [
      headPos[0] + fx * this._panelDistance + right[0] * side,
      headPos[1] - this._panelDrop,
      headPos[2] + fz * this._panelDistance + right[2] * side,
    ];

    // Never let the panel sink through the floor. A seated or crouching user
    // (head at ~1.0 m) minus a 0.55 m drop minus the panel's own half-height
    // puts its bottom edge underground; this was previously unguarded.
    const halfHeight = (this._panelHeight || 0) / 2 + BACKING_PAD_M;
    center[1] = Math.max(center[1], FLOOR_CLEARANCE_M + halfHeight);

    this._panelAnchor = { center, right, up, normal };
    this._lastHeadPos = headPos;
    this._lastAnchorScale = this._vrScale || 1;
  }

  /**
   * Lateral offset (metres along `right`) that puts the panel BESIDE the
   * dataset rather than inside it.
   *
   * The panel used to sit 1.2 m out with a fixed 0.28 m offset — smaller than
   * its own 0.435 m half-width, so it did not even clear the forward axis. With
   * the dataset auto-fitted to a 1.25 m bounding radius at 2 m, the panel plane
   * fell INSIDE the dataset's bounding sphere and ~100% of its silhouette was
   * swallowed: near geometry occluded the buttons, far geometry was painted
   * over by them, and the analytic hit test happily reported hits on buttons
   * the user could not see.
   *
   * Required azimuth = (bearing to the data) + (its angular radius) + margin +
   * (the panel's own half-angle), clamped so the panel never ends up somewhere
   * the user has to crane to reach.
   *
   * The no-bounds fallback is clamped to clear the forward axis on its own.
   * The configured PANEL_SIDE_OFFSET is only a MINIMUM PREFERENCE and is
   * smaller than the panel's half-width, so returning it bare put the panel's
   * hit region across dead-ahead. That is not merely a cosmetic overlap: a
   * ray aimed at a centred dataset then reports a menu-button hover, and
   * hitTest()'s `consumingTrigger` strips that trigger from the tools — so
   * Annotate/Measure/Probe silently stopped placing anything while the
   * pointer reticle kept working, because the reticle reads targetRay (never
   * gated) rather than triggerPressed (gated).
   * @private
   */
  _adaptiveSideOffset(headPos, fwd, right) {
    // Never less than the panel's own half-width plus its backing pad, or the
    // panel straddles the axis the user aims along.
    const minClear = this._panelWidth / 2 + BACKING_PAD_M;
    const base = Math.max(this._panelSideOffset, minClear);
    const b = this._dataBounds;
    if (!Array.isArray(b) || b.length !== 6) return base;

    const s = this._vrScale || 1;
    const o = this._vrOrigin || [0, 0, 0];
    // Dataset centre and bounding radius, in physical metres.
    const cx = ((b[0] + b[1]) / 2 - o[0]) * s;
    const cy = ((b[2] + b[3]) / 2 - o[1]) * s;
    const cz = ((b[4] + b[5]) / 2 - o[2]) * s;
    const radius = 0.5 * Math.hypot(b[1] - b[0], b[3] - b[2], b[5] - b[4]) * s;

    const vx = cx - headPos[0];
    const vy = cy - headPos[1];
    const vz = cz - headPos[2];
    const dist = Math.hypot(vx, vy, vz);
    if (!Number.isFinite(dist) || dist <= radius * 1.02) {
      // Head is inside the dataset — no lateral offset can clear it, so park
      // the panel at the maximum and let the user hide it if it's in the way.
      return MAX_PANEL_SIDE_OFFSET_M;
    }

    const alpha = Math.asin(Math.min(1, radius / dist)); // angular radius
    // Signed bearing of the data from straight ahead, in the panel's plane.
    const beta = Math.atan2(
      vx * right[0] + vz * right[2],
      vx * fwd[0] + vz * fwd[2]
    );
    const panelHalf = Math.atan2(
      this._panelWidth / 2 + BACKING_PAD_M,
      this._panelDistance
    );

    const azimuth = Math.min(
      Math.abs(beta) + alpha + SIDE_MARGIN_RAD + panelHalf,
      MAX_PANEL_AZIMUTH_RAD
    );
    const offset = Math.tan(azimuth) * this._panelDistance;
    // Put the panel on the side AWAY from the data when it is off-centre, and
    // otherwise on the user's dominant-hand side.
    const sign = Math.abs(beta) > 1e-3 ? -Math.sign(beta) : this._panelSideSign;

    return sign * Math.min(Math.max(offset, base), MAX_PANEL_SIDE_OFFSET_M);
  }

  /**
   * Position each button quad inside the panel frame from its UV region.
   * Always reads a FRESH getButtonLayout() (not a cached region from
   * _buttonActors) because row heights depend on total row count — when the
   * contextual row appears/disappears, every static button's v-position
   * shifts too, even though its own actor didn't change.
   * @private
   */
  _layoutButtons() {
    const a = this._panelAnchor;
    if (!a) return;
    const { center, right, up } = a;

    // Yaw the quads/labels so they face the same way the panel normal points
    // (plane/text geometry natively faces +Z). The data-space renderer only
    // scales + translates relative to physical space (no world rotation), so
    // this yaw is unchanged; positions/sizes are converted below.
    const yawDeg = (Math.atan2(a.normal[0], a.normal[2]) * 180) / Math.PI;
    const inv = 1 / (this._vrScale || 1.0);

    // Gap between adjacent cards (fraction of the cell) so the rounded cards
    // read as distinct tiles rather than a merged sheet.
    const CARD_FILL = 0.88;

    for (const region of this._model.getButtonLayout()) {
      const entry = this._buttonActors.get(region.id);
      if (!entry) continue; // reconciled out this frame; skip
      const { actor, labelActor } = entry;

      // Raise the hovered card toward the user for tactile depth. Reflects
      // THIS frame's hover — hitTest() (which sets _hoverButtonId) runs
      // earlier in the same frame as layout() (which calls this), so there
      // is no lag to account for here.
      const lift = region.id === this._hoverButtonId ? CARD_HOVER_LIFT : 0;

      // UV center → offset from panel center, in meters
      const ou = (region.cu - 0.5) * this._panelWidth;
      const ov = (region.cv - 0.5) * this._panelHeight;
      const cx = center[0] + right[0] * ou + up[0] * ov + a.normal[0] * lift;
      const cy = center[1] + right[1] * ou + up[1] * ov + a.normal[1] * lift;
      const cz = center[2] + right[2] * ou + up[2] * ov + a.normal[2] * lift;
      actor.setPosition(...this._toData([cx, cy, cz]));
      actor.setOrientation(0, yawDeg, 0);

      // Scale the centred unit plane (spans [-0.5,0.5], see _createButtonActor)
      // to cell size, inset by CARD_FILL for the inter-card gap, then by
      // 1/vrScale so it renders at its authored physical size in data space.
      const w = (region.u1 - region.u0) * this._panelWidth * CARD_FILL;
      const h = (region.v1 - region.v0) * this._panelHeight * CARD_FILL;
      actor.setScale(w * inv, h * inv, inv);
      actor.setVisibility(true);

      if (labelActor) {
        // The label plane is already centered on its own local origin and
        // sized to the text's measured aspect ratio (see
        // _createTextLabelActor), so it just needs to sit at the cell center,
        // lifted slightly off the card along the normal (plus the hover lift)
        // so it never z-fights.
        labelActor.setPosition(
          ...this._toData([
            cx + a.normal[0] * LABEL_LIFT,
            cy + a.normal[1] * LABEL_LIFT,
            cz + a.normal[2] * LABEL_LIFT,
          ])
        );
        labelActor.setOrientation(0, yawDeg, 0);
        labelActor.setScale(inv, inv, inv);
        labelActor.setVisibility(true);
      }
    }
  }

  /**
   * Position the dataset/scale/nav-mode status line just above the panel's
   * top edge. Text is only redrawn (canvas repaint + texture re-upload) when
   * it actually changes (dirty-checked) — doing that every frame would be
   * wasteful for a value that's usually static between input events.
   *
   * On top of the dirty-check, actual repaints are additionally rate-limited
   * to LABEL_REPAINT_INTERVAL_MS: VRSpatialMenuModel's status string embeds
   * the live vrScale, which changes continuously during a two-hand pinch, so
   * the dirty-check alone doesn't stop a canvas repaint + GPU texture
   * re-upload on nearly every frame (see VTKVRSpatialUI header comment / the
   * Phase 5 fix notes). The gate is bypassed when the label is appearing from
   * empty (immediate first paint — e.g. the "Working…" pending-work label
   * must show up right away) or disappearing to empty (instant hide, which
   * needs no repaint anyway). When a repaint is skipped by the gate,
   * `_lastStatusText` is deliberately left UNCHANGED so the dirty-check keeps
   * retrying on later frames — reading the model's CURRENT text fresh each
   * time — until the gate opens and the latest text finally paints. Nothing
   * is ever silently dropped, just delayed by at most one interval.
   * @private
   */
  _layoutStatus() {
    const a = this._panelAnchor;
    if (!a || !this._statusActor) return;

    const text = this._model.getStatusLine();
    if (text !== this._lastStatusText) {
      const previousTextWasEmpty = !this._lastStatusText;
      const gateOpen =
        !text || previousTextWasEmpty || now() - this._lastStatusPaintTime >= LABEL_REPAINT_INTERVAL_MS;
      if (gateOpen) {
        this._lastStatusText = text;
        if (text) {
          this._redrawStatusLabel(text);
          this._lastStatusPaintTime = now();
        }
      }
      // else: gated. Leave _lastStatusText as-is (still the last text that
      // was actually painted) so this `if` keeps re-entering on future
      // frames — re-reading the model's current text each time — until the
      // gate opens and whatever the latest text is at that point gets
      // painted. The rejected text is never stored anywhere; it's simply
      // recomputed from the model, which is always the freshest source.
    }
    if (!text) {
      this._statusActor.setVisibility(false);
      return;
    }

    const { center, up } = a;
    const yawDeg = (Math.atan2(a.normal[0], a.normal[2]) * 180) / Math.PI;

    const topEdgeOv = 0.5 * this._panelHeight;
    const ov = topEdgeOv + STATUS_MARGIN + STATUS_WORLD_HEIGHT * 0.5;

    const cx = center[0] + up[0] * ov;
    const cy = center[1] + up[1] * ov;
    const cz = center[2] + up[2] * ov;

    const inv = 1 / (this._vrScale || 1.0);
    this._statusActor.setPosition(
      ...this._toData([
        cx + a.normal[0] * LABEL_LIFT,
        cy + a.normal[1] * LABEL_LIFT,
        cz + a.normal[2] * LABEL_LIFT,
      ])
    );
    this._statusActor.setOrientation(0, yawDeg, 0);
    this._statusActor.setScale(inv, inv, inv);
    this._statusActor.setVisibility(true);
  }

  /**
   * Position the "how do I use this" hint line just BELOW the panel's bottom
   * edge (mirrors _layoutStatus, which sits above the top edge) — kept
   * separate so it never gets concatenated with the status line's session
   * state into one unreadable string.
   *
   * Same LABEL_REPAINT_INTERVAL_MS gate as _layoutStatus, on its own
   * `_lastHintPaintTime` field so the two labels never share (or contend
   * over) one gate — see the longer comment there for the full rationale and
   * the pending-text handling.
   * @private
   */
  _layoutHint() {
    const a = this._panelAnchor;
    if (!a || !this._hintActor) return;

    const text = this._model.getHintLine();
    if (text !== this._lastHintText) {
      const previousTextWasEmpty = !this._lastHintText;
      const gateOpen =
        !text || previousTextWasEmpty || now() - this._lastHintPaintTime >= LABEL_REPAINT_INTERVAL_MS;
      if (gateOpen) {
        this._lastHintText = text;
        if (text) {
          this._redrawHintLabel(text);
          this._lastHintPaintTime = now();
        }
      }
      // else: gated — see _layoutStatus for why _lastHintText is deliberately
      // left unchanged here.
    }
    if (!text) {
      this._hintActor.setVisibility(false);
      return;
    }

    const { center, up } = a;
    const yawDeg = (Math.atan2(a.normal[0], a.normal[2]) * 180) / Math.PI;

    const bottomEdgeOv = -0.5 * this._panelHeight;
    const ov = bottomEdgeOv - HINT_MARGIN - HINT_WORLD_HEIGHT * 0.5;

    const cx = center[0] + up[0] * ov;
    const cy = center[1] + up[1] * ov;
    const cz = center[2] + up[2] * ov;

    const inv = 1 / (this._vrScale || 1.0);
    this._hintActor.setPosition(
      ...this._toData([
        cx + a.normal[0] * LABEL_LIFT,
        cy + a.normal[1] * LABEL_LIFT,
        cz + a.normal[2] * LABEL_LIFT,
      ])
    );
    this._hintActor.setOrientation(0, yawDeg, 0);
    this._hintActor.setScale(inv, inv, inv);
    this._hintActor.setVisibility(true);
  }

  /**
   * Repaint the people-drawer roster cells whose label text has changed.
   *
   * Roster cards are keyed by POSITION (`roster-0`..`roster-4`), so the same
   * five actors are reused as people join, leave, or get handed the data token
   * and the precedence order reshuffles — which means the NAME on a given card
   * can change without the card itself being rebuilt.
   *
   * Every repaint is a canvas draw plus an uploadCanvasTexture() — a GPU
   * upload. So this uses exactly the two-stage gate _layoutStatus already
   * uses: a dirty-check on the text, and on top of it LABEL_REPAINT_INTERVAL_MS
   * so a burst of roster churn (three people joining at once) cannot fire five
   * uploads on five consecutive frames. When the gate defers a repaint,
   * `labelText` is left UNCHANGED so this method re-enters on later frames and
   * eventually paints whatever the latest text is — nothing is dropped, only
   * delayed by at most one interval.
   * @private
   */
  _refreshRosterLabels() {
    if (!this._renderer || !this._model) return;
    const t = now();

    for (const region of this._model.getButtonLayout()) {
      if (region.kind !== "roster-entry") continue;
      const entry = this._buttonActors.get(region.id);
      if (!entry) continue;

      const text = region.label || "";
      if (entry.labelText === text) continue;
      if (t - (entry.labelPaintTime || 0) < LABEL_REPAINT_INTERVAL_MS) continue;

      // The label plane is sized to its own text's aspect ratio at build time
      // (see _createButtonContentActor), so a different name needs a different
      // plane — repainting the existing canvas in place would stretch the new
      // text to the old name's width. Swap the actor instead.
      try {
        const label = this._createButtonContentActor(
          text,
          region.icon,
          BUTTON_LABEL_WORLD_HEIGHT,
          COLOR_LABEL
        );
        if (entry.labelActor) this._renderer.removeActor(entry.labelActor);
        entry.labelActor = label?.actor ?? null;
        if (label) this._renderer.addActor(label.actor);
        entry.labelText = text;
        entry.labelPaintTime = t;
      } catch (err) {
        log.error(`VR roster label "${region.id}" failed to repaint — ${err?.message}`);
        // Leave labelText alone: the next frame past the gate retries.
      }
    }
  }

  /**
   * Repaint each button card for its current visual state (idle / hover /
   * active), but only when that state actually changed — the card canvas +
   * texture upload is far more work than the old setColor, so a dirty-check per
   * button keeps it to the 0-2 buttons whose state flips on a given frame.
   * @private
   */
  _applyButtonVisuals() {
    const states = new Map(this._model.getButtonStates().map((s) => [s.id, s]));
    for (const [id, entry] of this._buttonActors) {
      const state = states.get(id);
      let key = "idle";
      // Disabled wins over hover: pointing at a dead button must not make it
      // look live. It loses to active, so a filter that is ON but momentarily
      // unavailable still reads as ON.
      if (state?.active) key = "active";
      else if (state?.disabled) key = "disabled";
      else if (id === this._hoverButtonId) key = "hover";
      // Holder is the roster cell's IDLE variant — it loses to hover so
      // pointing at the cell still gives the usual "you are about to press
      // this" feedback, and to disabled so a stale participant still reads as
      // unreachable.
      else if (state?.holder) key = "holder";
      if (entry.stateKey !== key && entry.ctx) {
        this._drawCard(entry.ctx, entry.canvas, entry.texture, key, entry.group);
        entry.stateKey = key;
      }
    }
  }

  // ===========================================================================
  // RAY / INTERSECTION MATH
  // ===========================================================================

  _rememberGripState(inputState) {
    this._lastGripPressed.left = !!inputState.controllers?.left?.squeezePressed;
    this._lastGripPressed.right = !!inputState.controllers?.right?.squeezePressed;
  }

  _controllerPosition(controller) {
    const p = controller?.pose?.position || controller?.targetRay?.position;
    return p ? [p.x, p.y, p.z] : null;
  }

  _beginTriggerDrag(ray, headerHit) {
    this._manualPlacement = true;
    this._dragState = {
      kind: "trigger",
      hand: ray.hand,
      rayDistance: headerHit.t,
      offsetRight: headerHit.mu,
      offsetUp: headerHit.mv,
    };
  }

  _beginGripDrag(hand, controller) {
    const lastPosition = this._controllerPosition(controller);
    if (!lastPosition) return;
    this._manualPlacement = true;
    this._dragState = { kind: "grip", hand, lastPosition };
  }

  _updateDrag(ray, controller) {
    const drag = this._dragState;
    const a = this._panelAnchor;
    if (!drag || !a) return;

    if (drag.kind === "trigger" && ray) {
      const point = [
        ray.origin[0] + ray.direction[0] * drag.rayDistance,
        ray.origin[1] + ray.direction[1] * drag.rayDistance,
        ray.origin[2] + ray.direction[2] * drag.rayDistance,
      ];
      a.center = [
        point[0] - a.right[0] * drag.offsetRight - a.up[0] * drag.offsetUp,
        point[1] - a.right[1] * drag.offsetRight - a.up[1] * drag.offsetUp,
        point[2] - a.right[2] * drag.offsetRight - a.up[2] * drag.offsetUp,
      ];
    } else if (drag.kind === "grip") {
      const current = this._controllerPosition(controller);
      if (!current || !drag.lastPosition) return;
      a.center = [
        a.center[0] + current[0] - drag.lastPosition[0],
        a.center[1] + current[1] - drag.lastPosition[1],
        a.center[2] + current[2] - drag.lastPosition[2],
      ];
      drag.lastPosition = current;
    }

    const halfHeight = (this._panelHeight || 0) / 2 + BACKING_PAD_M;
    a.center[1] = Math.max(a.center[1], FLOOR_CLEARANCE_M + halfHeight);
  }

  /**
   * Extract a pickable ray from input. Prefers the right controller's target
   * ray (also the Vision Pro transient-pointer path, which _gatherInputState
   * maps onto controllers.right). Returns { origin:[x,y,z], direction:[x,y,z] }
   * or null.
   * @private
   */
  _pickRay(inputState) {
    const hand = inputState.controllers?.right ? "right" : "left";
    return this._rayForHand(inputState, hand);
  }

  _rayForHand(inputState, hand) {
    const ctrl = inputState.controllers?.[hand];
    const tr = ctrl?.targetRay;
    if (!tr) return null;
    const origin = tr.position;
    if (!origin) return null;
    // XRRigidTransform: forward is -Z of its matrix (column-major).
    let direction;
    if (tr.matrix) {
      direction = [-tr.matrix[8], -tr.matrix[9], -tr.matrix[10]];
    } else if (tr.orientation) {
      direction = this._orientationForward(tr.orientation);
    } else {
      return null;
    }
    return { origin: [origin.x, origin.y, origin.z], direction, hand };
  }

  _isSelectPressed(inputState) {
    const ctrl = inputState.controllers?.right || inputState.controllers?.left;
    return !!ctrl?.triggerPressed;
  }

  /**
   * Ray/panel-plane intersection, returning the (u,v) hit in panel space or
   * null (miss, behind, or outside the quad). Panel space: u along +right,
   * v along +up, both in [0,1] across the panel rect.
   * @private
   */
  _intersectPanel(origin, direction) {
    const a = this._panelAnchor;
    if (!a) return null;
    const { center, right, up, normal } = a;

    const denom = this._dot(direction, normal);
    if (Math.abs(denom) < 1e-6) return null; // parallel

    const diff = [center[0] - origin[0], center[1] - origin[1], center[2] - origin[2]];
    const t = this._dot(diff, normal) / denom;
    if (t < 0) return null; // behind the ray

    const hit = [
      origin[0] + direction[0] * t,
      origin[1] + direction[1] * t,
      origin[2] + direction[2] * t,
    ];
    const local = [hit[0] - center[0], hit[1] - center[1], hit[2] - center[2]];

    // Project onto panel axes → meters from center → [0,1] fraction.
    const mu = this._dot(local, right);
    const mv = this._dot(local, up);
    const u = mu / this._panelWidth + 0.5;
    const v = mv / this._panelHeight + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { u, v, t };
  }

  /** Ray hit against the dedicated header/grab band above the button grid. */
  _intersectHeader(origin, direction) {
    const a = this._panelAnchor;
    if (!a) return null;
    const { center, right, up, normal } = a;
    const denom = this._dot(direction, normal);
    if (Math.abs(denom) < 1e-6) return null;
    const t = this._dot(
      [center[0] - origin[0], center[1] - origin[1], center[2] - origin[2]],
      normal
    ) / denom;
    if (t < 0) return null;
    const point = [
      origin[0] + direction[0] * t,
      origin[1] + direction[1] * t,
      origin[2] + direction[2] * t,
    ];
    const local = [point[0] - center[0], point[1] - center[1], point[2] - center[2]];
    const mu = this._dot(local, right);
    const mv = this._dot(local, up);
    const halfWidth = this._panelWidth / 2 + BACKING_PAD_M;
    const headerBottom = this._panelHeight / 2 + BACKING_PAD_M;
    const headerTop = headerBottom + BACKING_HEADER_M;
    if (Math.abs(mu) > halfWidth || mv < headerBottom || mv > headerTop) return null;
    return { t, mu, mv, point };
  }

  /**
   * Same ray/plane intersection as _intersectPanel, but against the tiny
   * fixed-size reshow-tab region centered on the panel anchor, instead of the
   * full button grid. Returns a boolean hover flag (the tab has no sub-regions
   * to distinguish).
   * @private
   */
  _intersectReshowTab(origin, direction) {
    const a = this._reshowAnchor;
    if (!a) return false;
    const { center, right, up, normal } = a;

    const denom = this._dot(direction, normal);
    if (Math.abs(denom) < 1e-6) return false;

    const diff = [center[0] - origin[0], center[1] - origin[1], center[2] - origin[2]];
    const t = this._dot(diff, normal) / denom;
    if (t < 0) return false;

    const hit = [
      origin[0] + direction[0] * t,
      origin[1] + direction[1] * t,
      origin[2] + direction[2] * t,
    ];
    const local = [hit[0] - center[0], hit[1] - center[1], hit[2] - center[2]];
    const mu = this._dot(local, right);
    const mv = this._dot(local, up);
    return (
      Math.abs(mu) <= RESHOW_TAB_WIDTH_M / 2 &&
      Math.abs(mv) <= RESHOW_TAB_HEIGHT_M / 2
    );
  }

  /**
   * Place the reopen pill just above the left controller, facing the user.
   *
   * Fallback (no left-hand pose this frame): this used to plant the tab
   * dead-ahead of the face. That's not a rare corner case — gripless/
   * transient-pointer input (Apple Vision Pro) never reports a left-hand
   * pose while the user is one-handed pinch-aiming, which is the ordinary
   * way to use an active tool. A dead-ahead tab sat right in that aim cone
   * and its hit-test's `consumingTrigger` silently stole the pinch meant for
   * Annotate/Measure (see VRExplorationManager._onFrame's menuConsumesTrigger
   * gating). Offset it to the side instead, using the same forward/right
   * basis convention _updateAnchor() uses to keep the full panel beside the
   * dataset rather than in front of it.
   */
  _updateReshowAnchor(inputState) {
    const head = inputState.headPose?.position;
    if (!head) return;
    const left = this._controllerPosition(inputState.controllers?.left);
    let center;
    if (left) {
      center = [left[0], left[1] + 0.11, left[2]];
    } else {
      const fwd = this._orientationForward(inputState.headPose?.orientation);
      let fx = fwd[0];
      let fz = fwd[2];
      const len = Math.hypot(fx, fz) || 1;
      fx /= len;
      fz /= len;
      const right = [-fz, 0, fx]; // same basis as _updateAnchor's PANEL_SIDE_OFFSET
      center = [
        head.x + fx * 0.5 + right[0] * RESHOW_TAB_FALLBACK_SIDE_OFFSET_M,
        head.y - 0.24,
        head.z + fz * 0.5 + right[2] * RESHOW_TAB_FALLBACK_SIDE_OFFSET_M,
      ];
    }

    let nx = head.x - center[0];
    let nz = head.z - center[2];
    const nlen = Math.hypot(nx, nz) || 1;
    nx /= nlen;
    nz /= nlen;
    const normal = [nx, 0, nz];
    this._reshowAnchor = {
      center,
      right: [nz, 0, -nx],
      up: [0, 1, 0],
      normal,
    };
  }

  /**
   * hitTest() half of the reshow-tab pair below: while the panel is manually
   * hidden, re-anchor from the raw head pose (same lazy anchoring the full
   * panel uses) and hit-test the tiny reshow tab against the current ray —
   * pure XR-metre geometry, no transform involved. Latches the hover result
   * on this._reshowHovering for _layoutReshowTab (which runs later, after
   * nav) to paint without re-running the ray test. On rising-edge select,
   * makes the panel visible again immediately (this._model.setVisible(true))
   * so layout() takes the now-visible path this SAME frame, not one frame
   * later. Uses the exact same ray/select machinery as the full panel, so it
   * works identically on gamepad and gripless (Vision Pro) input.
   *
   * Shares this._lastSelectPressed with the full-panel path in hitTest()
   * above — safe because exactly one of the two runs per frame (gated on
   * this._model.isVisible()), so the rising edge is only ever consumed once
   * per frame either way.
   * @private
   */
  _hitTestReshowTab(inputState) {
    if (!this._reshowTabActor) return null;
    this._updateReshowAnchor(inputState);
    const a = this._reshowAnchor;
    if (!a) {
      this._reshowHovering = false;
      return null;
    }

    const ray = this._pickRay(inputState);
    const hovering = ray ? this._intersectReshowTab(ray.origin, ray.direction) : false;
    this._reshowHovering = hovering;

    const selectPressed = this._isSelectPressed(inputState);
    if (selectPressed && !this._lastSelectPressed && hovering) {
      this.showAtHead(inputState.headPose);
    }
    this._lastSelectPressed = selectPressed;
    this._rememberGripState(inputState);

    const hand = ray?.hand || (inputState.controllers?.right ? "right" : "left");
    return {
      hovering,
      buttonId: hovering ? "__reshow__" : null,
      hand,
      consumingTrigger: hovering,
      consumingGrip: false,
    };
  }

  /**
   * layout() half of the reshow-tab pair: places the tab actor at the panel
   * anchor computed by _hitTestReshowTab earlier this frame, using THIS
   * frame's XR→data transform, and repaints its card for the hover state
   * _hitTestReshowTab already determined (this._reshowHovering) — no ray
   * test here, placement only. Mirrors _layoutButtons/_layoutBackingPanel's
   * split from their own hit-testing.
   * @private
   */
  _layoutReshowTab() {
    if (!this._reshowTabActor) return;
    const a = this._reshowAnchor;
    if (!a) {
      this._reshowTabActor.setVisibility(false);
      if (this._reshowTabLabelActor) this._reshowTabLabelActor.setVisibility(false);
      return;
    }

    const { center, normal } = a;
    const yawDeg = (Math.atan2(normal[0], normal[2]) * 180) / Math.PI;
    const inv = 1 / (this._vrScale || 1.0);

    this._reshowTabActor.setPosition(...this._toData(center));
    this._reshowTabActor.setOrientation(0, yawDeg, 0);
    this._reshowTabActor.setScale(RESHOW_TAB_WIDTH_M * inv, RESHOW_TAB_HEIGHT_M * inv, inv);
    this._reshowTabActor.setVisibility(true);

    // Redraw the reshow card only on hover-state change (dirty-checked), same
    // as the button cards — setColor no longer tints a textured card.
    const key = this._reshowHovering ? "hover" : "idle";
    if (this._reshowTabCard && this._reshowTabCard.stateKey !== key) {
      this._drawCard(
        this._reshowTabCard.ctx,
        this._reshowTabCard.canvas,
        this._reshowTabCard.texture,
        key,
        this._reshowTabCard.group
      );
      this._reshowTabCard.stateKey = key;
    }

    if (this._reshowTabLabelActor) {
      this._reshowTabLabelActor.setPosition(
        ...this._toData([
          center[0] + normal[0] * LABEL_LIFT,
          center[1] + normal[1] * LABEL_LIFT,
          center[2] + normal[2] * LABEL_LIFT,
        ])
      );
      this._reshowTabLabelActor.setOrientation(0, yawDeg, 0);
      this._reshowTabLabelActor.setScale(inv, inv, inv);
      this._reshowTabLabelActor.setVisibility(true);
    }
  }

  /** Forward (-Z) vector of a quaternion {x,y,z,w}. @private */
  _orientationForward(q) {
    if (!q) return [0, 0, -1];
    const { x, y, z, w } = q;
    // Rotate (0,0,-1) by q.
    return [
      -2 * (x * z + w * y),
      -2 * (y * z - w * x),
      -(1 - 2 * (x * x + y * y)),
    ];
  }

  _dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  // ===========================================================================
  // TEARDOWN
  // ===========================================================================

  /** Called on VR session end / instance teardown. */
  dispose() {
    if (this._model) this._model.onSessionEnd();
    if (this._renderer) {
      if (this._backingPanelActor) this._renderer.removeActor(this._backingPanelActor);
      for (const { actor, labelActor } of this._buttonActors.values()) {
        this._renderer.removeActor(actor);
        if (labelActor) this._renderer.removeActor(labelActor);
      }
      // Parked actors (see _reconcileButtonActors) are hidden, not in the
      // renderer's normal live set — but they were still addActor()'d at some
      // point, so they must be removed here too or a session's worth of
      // retired keyboard/contextual cards leak in the renderer forever.
      for (const { actor, labelActor } of this._parkedActors.values()) {
        this._renderer.removeActor(actor);
        if (labelActor) this._renderer.removeActor(labelActor);
      }
      if (this._statusActor) this._renderer.removeActor(this._statusActor);
      if (this._hintActor) this._renderer.removeActor(this._hintActor);
      if (this._reshowTabActor) this._renderer.removeActor(this._reshowTabActor);
      if (this._reshowTabLabelActor) this._renderer.removeActor(this._reshowTabLabelActor);
    }
    this._buttonActors.clear();
    this._parkedActors.clear();
    this._panelAnchor = null;
    this._reshowAnchor = null;
    this._lastHeadPos = null;
    this._hoverButtonId = null;
    this._lastSelectPressed = false;
    this._lastInputState = null;
    this._lastGripPressed = { left: false, right: false };
    this._manualPlacement = false;
    this._dragState = null;
    this._panelHeight = this._computePanelHeight(5);
    this._lastActiveToolId = null;
    this._lastOpenDrawerId = null;
    this._lastRosterKey = "";
    this._panelWidth = PANEL_WIDTH;
    this._panelDrop = PANEL_DROP;
    this._panelSideOffset = PANEL_SIDE_OFFSET;
    this._lastPanelMode = "menu";
    this._statusCanvas = null;
    this._statusCtx = null;
    this._statusTexture = null;
    this._statusPlaneSource = null;
    this._statusActor = null;
    this._statusWorldWidth = 0;
    this._lastStatusText = null;
    this._lastStatusPaintTime = 0;
    this._hintCanvas = null;
    this._hintCtx = null;
    this._hintTexture = null;
    this._hintPlaneSource = null;
    this._hintActor = null;
    this._hintWorldWidth = 0;
    this._lastHintText = null;
    this._lastHintPaintTime = 0;
    this._reshowTabActor = null;
    this._reshowTabLabelActor = null;
    this._reshowTabCard = null;
    this._reshowHovering = false;
    this._backingPanelActor = null;
    this._backingCanvas = null;
    this._backingCtx = null;
    this._backingTexture = null;
    this._backingPlaneSource = null;
    // Bounds belong to this session's dataset — carrying them into the next
    // session would place the panel against the wrong geometry.
    this._dataBounds = null;
    this._renderer = null;
    this._model = null;
    log.debug("VR spatial UI disposed");
  }
}

// Singleton for VRExplorationManager to drive per-session.
export const vrSpatialUI = new VRSpatialUI();
export default vrSpatialUI;
