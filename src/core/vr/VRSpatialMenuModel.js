// src/core/vr/VRSpatialMenuModel.js
// ----------------------------------------------------------------------------
// VR Spatial Menu Model — pure layout + hit-test + action-dispatch logic
// ----------------------------------------------------------------------------
//
// WHY THIS EXISTS
// WebXR immersive sessions (Safari/visionOS and most browsers) do NOT render
// the DOM, so a React component like VRWristMenu is invisible in-headset. The
// guaranteed in-session UI is therefore drawn as in-scene VTK geometry by
// VTKVRSpatialUI. This module is the geometry-free brain of that panel:
//
//   - button layout (id → local-space rect on the panel quad)
//   - hit testing (a UV point on the panel → which button, if any)
//   - action dispatch (button id → a call on the injected manager surface)
//   - show/hide bookkeeping keyed on VR session start/end
//   - selected-tool / isolation reflection so the panel never disagrees with
//     the manager (single source of truth = VRExplorationManager state)
//
// It holds NO React and NO VTK references — everything visual/stateful lives
// behind the `manager` surface injected at construction. That keeps it unit
// testable in jsdom and keeps core/ free of UI deps.
//
// COORDINATE CONVENTION
// The panel is a unit quad in "panel UV" space: u ∈ [0,1] left→right,
// v ∈ [0,1] bottom→top. Buttons are laid out in one or more equal-width
// horizontal rows, stacked bottom→top by ascending `row` index (row 0 is the
// bottom row). VTKVRSpatialUI maps this UV space onto a world-space quad
// anchored in front of the head; the raycast hit it feeds back in is already
// reduced to a (u, v) pair, so this module stays free of 3D math.

import { vr as log } from "@Utils/logger.js";
import {
  VR_KEYBOARD_KEYS,
  shiftChar,
  nextShiftMode,
  consumeShift,
  formatDraftLine,
} from "@Core/vr/VRKeyboardModel.js";

/**
 * Button descriptors, left→right within each row, rows bottom→top. `kind`
 * drives dispatch:
 *   - "tool":              toggles a VR tool (annotate/measure/clip/probe) via the manager
 *   - "action":            a one-shot command (undo)
 *   - "toggle":            a stateful toggle (isolation/grid) reflected from manager
 *   - "nav-mode":          cycles the locomotion mode (fly/teleport/walk)
 *   - "nav-mode-set":      toggles a specific locomotion mode on/off (grab/walk)
 *   - "scale":             jumps to a fixed vrScale preset
 *   - "representation":    cycles surface→wireframe→points (same as desktop menu)
 *   - "glyph-type-set":    selects a specific glyph type, or disables glyphs
 *                          (mode === null) — same VTKGlyphFeature API + type
 *                          set as the desktop glyph menu
 *   - "snapshot-save":     quick-saves a session snapshot
 *   - "snapshot-load":     cycles to the next saved snapshot and loads it
 *   - "voice-mute":        toggles the local participant's voice mute state
 *   - "voice-join":        joins/leaves the session's voice room
 *   - "toggle-visibility": hides the panel (local UI chrome, no manager call)
 *   - "control-request":   ask the holder for the data-manipulation token
 *   - "control-grant":     hand that token to a requester/participant
 *   - "control-release":   give the token back to the session host
 *   - "exit":              leave the VR session
 * @type {ReadonlyArray<{id:string,label:string,icon:string,kind:string,toolId?:string,scaleValue?:number,mode?:string,row:number}>}
 */
export const VR_MENU_BUTTONS = Object.freeze([
  // ---- Row 0 — TOOLS: create / measure / inspect on the data ---------------
  // annotate stays first (VTKVRSpatialUI/tests rely on row 0 starting with it).
  { id: "annotate", label: "Annotate", icon: "edit", kind: "tool", toolId: "annotate", row: 0, group: "TOOLS" },
  { id: "measure", label: "Measure", icon: "ruler", kind: "tool", toolId: "measure", row: 0, group: "TOOLS" },
  { id: "clip", label: "Clip", icon: "crop", kind: "tool", toolId: "clip", row: 0, group: "TOOLS" },
  { id: "probe", label: "Probe", icon: "crosshair", kind: "tool", toolId: "probe", row: 0, group: "TOOLS" },
  { id: "undo", label: "Undo", icon: "rotateCcw", kind: "action", row: 0, group: "TOOLS" },

  // ---- Row 1 — MOVE: locomotion + object manipulation ----------------------
  // These are mutually exclusive modes. The selected mode decides what the
  // TRIGGER does; grip always pulls the world and the left stick always moves
  // (see VRNavigationController.update's layered model).
  { id: "nav-mode", label: "Nav", icon: "compass", kind: "nav-mode", row: 1, group: "MOVE" },
  // "grab": trigger stays free (tools/menu); grip pulls the world.
  { id: "move", label: "Move", icon: "move", kind: "nav-mode-set", mode: "grab", row: 1, group: "MOVE" },
  // "move-object": trigger drags the ACTIVE dataset's transform for every
  // collaborator (shared), not just the local view.
  { id: "move-object", label: "Move Obj", icon: "transform", kind: "nav-mode-set", mode: "move-object", row: 1, group: "MOVE" },
  // "teleport": trigger aims the arc and commits on release.
  { id: "teleport", label: "Teleport", icon: "zap", kind: "nav-mode-set", mode: "teleport", row: 1, group: "MOVE" },

  // ---- Row 2 — VIEW: scale + appearance ------------------------------------
  // scaleValue matches VRScaleController's preset numbers (small=overview,
  // large=detail); representation/glyphs reuse the desktop implementations so
  // VR and desktop stay consistent.
  { id: "scale-overview", label: "Overview", icon: "minimize", kind: "scale", scaleValue: 0.1, row: 2, group: "VIEW" },
  { id: "scale-normal", label: "Normal", icon: "square", kind: "scale", scaleValue: 1.0, row: 2, group: "VIEW" },
  { id: "scale-detail", label: "Detail", icon: "maximize", kind: "scale", scaleValue: 10.0, row: 2, group: "VIEW" },
  // Two drawers replace what used to be a single blind "Style" cycling button.
  // Cycling gave no way to see which representation was live (and its highlight
  // was "active if not surface", so wireframe and points looked identical), and
  // there was nowhere to put threshold/isosurface at all. See VR_MENU_DRAWERS.
  { id: "appearance", label: "Style", icon: "cube", kind: "drawer", drawerId: "appearance", row: 2, group: "VIEW" },
  { id: "filters", label: "Filters", icon: "filter", kind: "drawer", drawerId: "filters", row: 2, group: "VIEW" },
  // Promoted to a top-level button (was a buried on/off toggle inside the
  // "advanced" drawer, "glyph-toggle" — see VR_MENU_DRAWERS.glyphTypes) so
  // glyph TYPE selection is directly reachable, matching Style/Filters.
  // id matches drawerId exactly, same convention as appearance/filters/
  // people/advanced above — several tests/call sites open a drawer via
  // model.activate(drawerId), which only works when the two agree.
  { id: "glyphTypes", label: "Glyphs", icon: "arrowUpRight", kind: "drawer", drawerId: "glyphTypes", row: 2, group: "VIEW" },
  // ---- Row 4 — SESSION: the essential session controls ---------------------
  // Less-frequent scene, snapshot, voice and alternate-navigation actions
  // live in the Advanced drawer. Keeping the default surface to four rows
  // gives every Quest-facing card and label materially more screen space.
  // exit stays last (VTKVRSpatialUI/tests rely on the last row ending with it).
  { id: "people", label: "People", icon: "user", kind: "drawer", drawerId: "people", row: 4, group: "SESSION" },
  { id: "isolation", label: "Isolate", icon: "fullscreen", kind: "toggle", row: 4, group: "SESSION" },
  { id: "advanced", label: "More", icon: "sliders", kind: "drawer", drawerId: "advanced", row: 4, group: "SESSION" },
  { id: "hide-menu", label: "Hide", icon: "eyeOff", kind: "toggle-visibility", row: 4, group: "SESSION" },
  { id: "exit", label: "Exit VR", icon: "doorOpen", kind: "exit", row: 4, group: "SESSION" },
]);

/**
 * The shared numeric stepper row, instantiated into every drawer.
 *
 * Kept as a factory rather than a constant so each drawer gets its own frozen
 * copies (with its own `drawerRow`) while the ids and kinds stay identical —
 * one set of handlers, one active target, regardless of which drawer is open.
 *
 * @param {number} drawerRow - which row within the drawer these occupy
 * @returns {Array<object>}
 */
function STEPPER_ROW_TEMPLATE(drawerRow) {
  return [
    { id: "value-target", label: "Target", icon: "target", kind: "value-target", drawerRow, group: "VIEW" },
    { id: "value-dec", label: "−", icon: "minus", kind: "value-nudge", steps: -1, drawerRow, group: "VIEW" },
    { id: "value-inc", label: "+", icon: "plus", kind: "value-nudge", steps: 1, drawerRow, group: "VIEW" },
    { id: "value-reset", label: "Reset", icon: "restore", kind: "value-reset", drawerRow, group: "VIEW" },
  ];
}

/**
 * Drawers: extra button rows that appear above the static grid while their
 * parent button is open, and vanish when it closes. Exactly one drawer may be
 * open at a time — that mutual exclusion is what bounds the panel's height.
 *
 * The `value-*` stepper row is DELIBERATELY shared by both drawers (same ids,
 * same kinds, one set of handlers). One stepper retargeted via `value-target`
 * serves every numeric parameter — point size, line width, threshold bounds,
 * isovalue, opacity — instead of each growing its own control. That is what
 * makes these fit on the panel at all.
 *
 * Why buttons and not a thumbstick: `_gatherInputState` hardcodes
 * `thumbstick:{x:0,y:0}`, `squeezePressed:false` and `buttons:{a:false,b:false}`
 * for Vision Pro transient pointers, so a thumbstick-driven value control
 * simply would not exist there. Discrete taps use the trigger/pinch — the only
 * input guaranteed on both Quest and Vision Pro.
 *
 * @type {Readonly<Object<string, ReadonlyArray<object>>>}
 */
export const VR_MENU_DRAWERS = Object.freeze({
  appearance: Object.freeze([
    { id: "rep-surface", label: "Surface", icon: "square", kind: "representation-set", mode: "surface", drawerRow: 0, group: "VIEW" },
    { id: "rep-wireframe", label: "Wire", icon: "grid", kind: "representation-set", mode: "wireframe", drawerRow: 0, group: "VIEW" },
    { id: "rep-points", label: "Points", icon: "dotsHorizontal", kind: "representation-set", mode: "points", drawerRow: 0, group: "VIEW" },
    { id: "grid-plane", label: "Plane", icon: "layers", kind: "grid-plane", drawerRow: 0, group: "VIEW" },
    ...STEPPER_ROW_TEMPLATE(1),
  ]),
  filters: Object.freeze([
    { id: "threshold-toggle", label: "Threshold", icon: "filter", kind: "threshold-toggle", drawerRow: 0, group: "VIEW" },
    { id: "threshold-mode", label: "Mode", icon: "sliders", kind: "threshold-mode", drawerRow: 0, group: "VIEW" },
    { id: "threshold-array", label: "Array", icon: "database", kind: "threshold-array", drawerRow: 0, group: "VIEW" },
    { id: "iso-toggle", label: "Isosurface", icon: "layers", kind: "iso-toggle", drawerRow: 0, group: "VIEW" },
    ...STEPPER_ROW_TEMPLATE(1),
  ]),
  // People + data control. Deliberately has NO stepper row: nothing here is
  // numeric. drawerRow 1 is left free for the Phase 4 roster cells, which is
  // why this drawer is one row today rather than being folded into row 4.
  people: Object.freeze([
    { id: "goto-participant", label: "Go To", icon: "target", kind: "goto-participant", drawerRow: 0, group: "SESSION" },
    { id: "follow-participant", label: "Follow", icon: "user", kind: "follow-participant", drawerRow: 0, group: "SESSION" },
    // Data-manipulation token (VRManipulationLock). Request = "may I have it";
    // Give = hand it to the oldest requester (or the next participant);
    // Release = hand it back to the host.
    { id: "control-request", label: "Request", icon: "hand", kind: "control-request", drawerRow: 0, group: "SESSION" },
    { id: "control-grant", label: "Give", icon: "share", kind: "control-grant", drawerRow: 0, group: "SESSION" },
    { id: "control-release", label: "Release", icon: "unlock", kind: "control-release", drawerRow: 0, group: "SESSION" },
  ]),
  // The 6 real vtk.js glyph shapes desktop's glyph menu already offers
  // (VTKInstanceHandler.js glyph-menu options — vtkArrowSource/ConeSource/
  // SphereSource/CubeSource/CylinderSource; "dot" is a small vtkSphereSource),
  // plus one explicit "Off" cell replacing the old bare on/off toggle. A
  // single kind ("glyph-type-set") for everything here, so type-selection and
  // enable/disable can't fall out of sync with each other.
  glyphTypes: Object.freeze([
    { id: "glyph-arrow", label: "Arrow", icon: "arrowUpRight", kind: "glyph-type-set", mode: "arrow", drawerRow: 0, group: "VIEW" },
    { id: "glyph-cone", label: "Cone", icon: "triangle", kind: "glyph-type-set", mode: "cone", drawerRow: 0, group: "VIEW" },
    { id: "glyph-sphere", label: "Sphere", icon: "circle", kind: "glyph-type-set", mode: "sphere", drawerRow: 0, group: "VIEW" },
    { id: "glyph-cube", label: "Cube", icon: "square", kind: "glyph-type-set", mode: "cube", drawerRow: 0, group: "VIEW" },
    { id: "glyph-cylinder", label: "Cylinder", icon: "database", kind: "glyph-type-set", mode: "cylinder", drawerRow: 1, group: "VIEW" },
    { id: "glyph-dot", label: "Dot", icon: "dotsHorizontal", kind: "glyph-type-set", mode: "dot", drawerRow: 1, group: "VIEW" },
    { id: "glyph-off", label: "Off", icon: "eyeOff", kind: "glyph-type-set", mode: null, drawerRow: 1, group: "VIEW" },
  ]),
  // Controls intentionally kept off the default surface so the core menu is
  // readable on Quest 2. Nothing is removed; the existing dispatch paths are
  // reused unchanged when this drawer is open.
  advanced: Object.freeze([
    { id: "walk", label: "Walk", icon: "footprints", kind: "nav-mode-set", mode: "walk", drawerRow: 0, group: "MOVE" },
    { id: "voice-join", label: "Voice", icon: "headsetMic", kind: "voice-join", drawerRow: 0, group: "SESSION" },
    { id: "voice-mute", label: "Mute", icon: "mic", kind: "voice-mute", drawerRow: 0, group: "SESSION" },
    { id: "grid", label: "Views", icon: "layoutGrid", kind: "toggle", drawerRow: 1, group: "SCENE" },
    { id: "ref-grid", label: "Grid", icon: "grid", kind: "scene-grid", drawerRow: 1, group: "SCENE" },
    { id: "axes", label: "Axes", icon: "axis3d", kind: "scene-axes", drawerRow: 1, group: "SCENE" },
    { id: "snapshot-save", label: "Save", icon: "save", kind: "snapshot-save", drawerRow: 1, group: "SCENE" },
    { id: "snapshot-load", label: "Load", icon: "folderOpen", kind: "snapshot-load", drawerRow: 1, group: "SCENE" },
  ]),
});

/**
 * Ordered activity groups, one per static row (top → bottom). Drives the
 * per-group card border accent and the row labels drawn on the backing panel
 * (see VTKVRSpatialUI), so the grouping is visible in-headset rather than only
 * implied by position.
 * @type {ReadonlyArray<string>}
 */
export const VR_MENU_GROUPS = Object.freeze([
  "TOOLS",
  "MOVE",
  "VIEW",
  "SCENE",
  "SESSION",
]);

/**
 * Contextual buttons: only appear (as an extra row above the static rows)
 * while the matching tool (`contextTool`) is active. Measure gets no entry —
 * the global "Undo" button already cancels an in-progress measurement or
 * removes the last completed one (see VRMeasureTool.undoLast), so a redundant
 * Cancel button would just duplicate it.
 * @type {ReadonlyArray<{id:string,label:string,icon:string,kind:string,contextTool:string}>}
 */
export const VR_MENU_CONTEXTUAL_BUTTONS = Object.freeze([
  // Measure builds a CHAINED path: each pick continues from the last. "New
  // Path" is how you start a disconnected measurement somewhere else without
  // undoing everything. Undo still pops one point at a time.
  { id: "measure-new-path", label: "New Path", icon: "plus", kind: "measure-new-path", contextTool: "measure", group: "TOOLS" },
  { id: "clip-invert", label: "Invert", icon: "flipHorizontal", kind: "clip-invert", contextTool: "clip", group: "TOOLS" },
  // Snap the cut to a principal axis. Matters most on Vision Pro, where there
  // is no grip to brace against while free-aiming a plane by hand.
  { id: "clip-axis", label: "Axis", icon: "axis3d", kind: "clip-axis", contextTool: "clip", group: "TOOLS" },
  { id: "clip-reset", label: "Reset", icon: "restore", kind: "clip-reset", contextTool: "clip", group: "TOOLS" },
  // Replaced an "annotation mode" cycle (marker/text/drawing) that changed only
  // stored metadata — every mode drew the same sphere. Colour is small but
  // actually visible, and already flows through to persistence.
  { id: "annotation-color", label: "Color", icon: "palette", kind: "annotation-color", contextTool: "annotate", group: "TOOLS" },
  // Cycles the annotate tool's pending preset label — the only VR text-entry
  // mechanism (see ANNOTATION_LABEL_PRESETS in VRAnnotationTool.js). Contextual
  // rather than static: it is meaningless unless the annotate tool is active,
  // and moving it here freed its grid slot for the Teleport mode button.
  { id: "annotation-label", label: "Label", icon: "tag", kind: "annotation-label", contextTool: "annotate", group: "TOOLS" },
  { id: "probe-continuous", label: "Continuous", icon: "sync", kind: "probe-continuous", contextTool: "probe", group: "TOOLS" },
  { id: "probe-clear", label: "Clear", icon: "trash", kind: "probe-clear", contextTool: "probe", group: "TOOLS" },
]);

// Fraction of each cell's width/height left as inner padding (per side).
const CELL_PADDING = 0.06;

// How long a local tool tap is trusted over the manager's reported active tool.
// Covers the async activate/deactivate round-trip (see syncFromManager).
const TOOL_SYNC_HOLD_MS = 250;

// --- People drawer roster ---------------------------------------------------
// One row of participant cells inside the `people` drawer (drawerRow 1, which
// VR_MENU_DRAWERS.people deliberately leaves free). Capped so the row's cells
// stay wide enough to hit reliably with a pinch ray at PANEL_DISTANCE — five
// cells across PANEL_WIDTH is already about the narrowest comfortable target,
// and the roster is precedence-ORDERED (holder, host, then VR by join time),
// so a cap truncates the least important entries, never the important ones.
export const MAX_ROSTER_CELLS = 5;

// The roster is PRESENCE-rate data, not frame-rate data. Rebuilding it every
// frame would allocate a fresh array of decorated rows 72-90 times a second for
// something that changes when somebody joins, leaves, or is handed the data
// token. Refreshing on this interval also makes it structurally impossible for
// _rosterKey — and therefore getButtonLayout()'s memo key — to differ between
// two consecutive frames.
const ROSTER_REFRESH_MS = 250;

/**
 * Pure grid-layout math: group `buttons` by `row`, lay each row out as
 * equal-width horizontal cells inset by `padding`, and stack rows bottom→top
 * by ascending row index (row 0 renders at the BOTTOM of the stack; negative
 * rows — drawers, the contextual row — sort above row 0 and render higher
 * still). Extracted out of getButtonLayout() so a second button set (the
 * keyboard, see VR_KEYBOARD_KEYS) can reuse the identical math verbatim
 * rather than duplicating it — see the class-level VRSpatialMenuModel doc for
 * why the keyboard is a MODE of this model rather than a second panel.
 *
 * @param {ReadonlyArray<object>} buttons - descriptors carrying at least `row`
 * @param {number} [padding=CELL_PADDING] - inner padding per side, as a
 *   fraction of the cell's own width/height
 * @returns {Array<object>} each input button plus {u0,u1,v0,v1,cu,cv}
 */
export function computeGridLayout(buttons, padding = CELL_PADDING) {
  const rows = new Map();
  for (const btn of buttons) {
    const rowId = btn.row ?? 0;
    if (!rows.has(rowId)) rows.set(rowId, []);
    rows.get(rowId).push(btn);
  }
  const rowIds = [...rows.keys()].sort((a, b) => a - b);
  const rowH = 1 / rowIds.length;

  const layout = [];
  rowIds.forEach((rowId, rowIndex) => {
    const rowButtons = rows.get(rowId);
    const n = rowButtons.length;
    const cellW = 1 / n;
    const padU = cellW * padding;
    const padV = rowH * padding;
    // v runs along +up, so the LAST row index must sit at v=0 for the FIRST
    // declared row to render at the TOP. Without this inversion the panel
    // read bottom-up (tools at the floor, session controls at eye level),
    // the opposite of the declaration order and of how the groups read.
    const vBase = (rowIds.length - 1 - rowIndex) * rowH;

    rowButtons.forEach((btn, i) => {
      const u0 = i * cellW + padU;
      const u1 = (i + 1) * cellW - padU;
      const v0 = vBase + padV;
      const v1 = vBase + rowH - padV;
      layout.push({
        ...btn,
        u0,
        u1,
        v0,
        v1,
        cu: (u0 + u1) / 2,
        cv: (v0 + v1) / 2,
      });
    });
  });
  return layout;
}

/**
 * VRSpatialMenuModel
 *
 * @param {object} manager - Injected manager surface (VRExplorationManager).
 *   Only the methods used below are required; each call is guarded so a
 *   partial mock (or a manager without an active session) never throws.
 */
export class VRSpatialMenuModel {
  constructor(manager) {
    this._manager = manager || null;
    this._visible = false;
    // Local mirror of the active tool id, kept in sync via syncFromManager()
    // and updated optimistically on tap so highlight feedback is immediate.
    this._activeToolId = null;
    this._isolated = false;
    this._gridEnabled = false;
    // Which drawer (if any) is expanded. At most one at a time — that mutual
    // exclusion is what bounds the panel's height (see VR_MENU_DRAWERS).
    this._openDrawerId = null;
    // Cycle position through getOtherParticipants() for the Go To/Follow
    // buttons — see _pickNextParticipant.
    this._participantCycleIndex = -1;
    // Cycle position through getSessionSnapshots() for the Load button — see
    // _loadNextSnapshot. Same "cycle to next X" pattern as participants.
    this._snapshotCycleIndex = -1;
    // Timestamp of the last local tool tap, so syncFromManager() can briefly
    // trust the optimistic _activeToolId over the manager's lagging async
    // getActiveTool(). Null when there is no tap to honour.
    this._toolTapAtMs = null;
    // Keyboard mode — DERIVED every frame from the annotate tool's draft
    // state in syncFromManager(), never toggled directly. Nobody taps a
    // "keyboard" button: it opens the instant a draft exists and closes on
    // confirm/cancel/tool-deactivate/session-end, so the panel and the tool
    // can never disagree (see the class-level architecture note in the task
    // this was implemented from — no optimistic-hold window like
    // _activeToolId's, because confirm/cancel mutate the tool synchronously).
    this._keyboardOpen = false;
    // Tri-state shift ('off'|'once'|'lock'), reset to 'off' whenever the
    // keyboard closes so a stale shift never leaks into the next draft.
    this._shiftMode = "off";
    // Mirrors of the current draft, refreshed every syncFromManager() call —
    // getStatusLine()/getHintLine() read these instead of re-querying the
    // manager mid-frame.
    this._draftText = "";
    this._draftFallback = "";
    // Optimistic-hold bookkeeping for buttons whose manager call now runs on
    // a DEFERRED VR frame (VRExplorationManager._deferHeavy — glyph rebuild,
    // isosurface extraction, threshold reapply, representation change all
    // moved off the synchronous activate() path to stop the mid-frame
    // shaking, see VRExplorationManager.toggleGlyphs). Same problem
    // TOOL_SYNC_HOLD_MS solves for tool activation above: the manager's
    // getX()/getState() reads keep reporting the OLD value until the queued
    // task actually drains, so without a hold the button would flash back to
    // its old highlight for however many frames that takes. Keyed by a short
    // domain id so one small map serves every deferred toggle instead of a
    // field pair per button — see _holdDeferred/_readDeferredHold.
    this._deferredHolds = new Map(); // id -> { value, atMs }
    // getButtonLayout() memoisation — see the method doc for why. Keyed on
    // the three fields the returned geometry/labels actually depend on;
    // cleared on session start/end so a fresh session never reads a stale
    // layout from a previous one.
    this._layoutCache = null;
    this._layoutCacheKey = null;
    // Participant roster shown in the `people` drawer, refreshed at
    // ROSTER_REFRESH_MS by syncFromManager(). `_rosterKey` is the COARSE
    // signature that feeds getButtonLayout()'s memo key — see _refreshRoster.
    this._roster = [];
    this._rosterKey = "";
    this._rosterAtMs = 0;
  }

  // ===========================================================================
  // LAYOUT
  // ===========================================================================

  /**
   * Turn the manager's roster rows into drawer button descriptors for the
   * `people` drawer's second row. Kept out of getButtonLayout() so it only
   * runs on a memo MISS, not on all four of that method's per-frame calls.
   * @returns {Array<object>}
   * @private
   */
  _rosterCells() {
    return this._roster.slice(0, MAX_ROSTER_CELLS).map((entry, i) => ({
      // Index-keyed, not userId-keyed: the render layer parks and re-adopts
      // actors by button id, so a fixed set of five ids means the roster row
      // owns at most five cards for the whole session instead of accumulating
      // one parked card per user who has ever appeared in it.
      id: `roster-${i}`,
      // Name only. Anything that ticks (distance, staleness) would repaint the
      // label canvas — a GPU texture upload — every time it moved.
      label: entry.userName,
      icon: entry.mode === "vr-explorer" ? "user" : "monitor",
      kind: "roster-entry",
      userId: entry.userId,
      drawerRow: 1,
      group: "SESSION",
    }));
  }

  /**
   * Compute button hit regions in panel-UV space (u,v ∈ [0,1]).
   * Buttons are grouped by `row` (row 0 = bottom), each row laid out as an
   * equal-width horizontal strip, rows stacked bottom→top. Returned rects
   * are inset by CELL_PADDING so adjacent buttons/rows don't share an edge
   * (avoids ambiguous hits). With a single row this reduces to exactly the
   * original one-row layout.
   *
   * When a tool with contextual buttons (VR_MENU_CONTEXTUAL_BUTTONS) is
   * active, its buttons are appended as one extra row above the static rows
   * — so the panel grows by exactly one row while a contextual tool is
   * active, and shrinks back the moment it deactivates.
   *
   * @returns {Array<{id:string,label:string,icon:string,kind:string,
   *   toolId?:string, row:number, u0:number,u1:number,v0:number,v1:number,
   *   cu:number,cv:number}>} cu/cv = cell center (for placing labels/icons)
   */
  getButtonLayout() {
    // Memoised: VTKVRSpatialUI calls this FOUR times per frame (hitTest,
    // _currentRowCount, _layoutButtons, getButtonStates), and computeGridLayout
    // allocates a Map + per-row arrays + a fresh object per button every call —
    // several hundred short-lived objects/frame at 72Hz otherwise. The result
    // only ever changes when one of these three fields changes, so a cheap key
    // string is enough to skip the rebuild on every other call this frame (and
    // across frames where nothing changed at all). Verified: shift state does
    // NOT affect the returned geometry/labels (computeGridLayout(VR_KEYBOARD_KEYS)
    // is passed the raw table; shift only surfaces via getButtonStates'
    // kbd-shift branch), so it is deliberately excluded from the key.
    //
    // _rosterKey is the fourth component and the one with teeth: the people
    // drawer's roster row is derived from live session state, so a key that
    // encoded anything continuous (distance, timestamps, staleness) would
    // differ on every frame, defeating the memo entirely — computeGridLayout
    // would re-run 4x/frame AND VTKVRSpatialUI._reconcileButtonActors would
    // tear down and rebuild the roster cards' canvases/textures/actors every
    // frame. It is therefore COARSE (`userId:isHolder` per cell) and refreshed
    // only every ROSTER_REFRESH_MS. See _refreshRoster.
    const key =
      `${this._keyboardOpen ? 1 : 0}|${this._activeToolId ?? ""}|` +
      `${this._openDrawerId ?? ""}|${this._rosterKey}`;
    if (this._layoutCacheKey === key) return this._layoutCache;

    // Modal: while an annotation draft is open, the panel IS the keyboard —
    // no static grid, no contextual row, no drawer. hitTest/activate/
    // getButtonStates all read getButtonLayout(), so returning the keyboard's
    // own grid here is the entire mode switch; nothing downstream needs to
    // know "keyboard" exists as a concept.
    if (this._keyboardOpen) {
      const layout = computeGridLayout(VR_KEYBOARD_KEYS);
      this._layoutCacheKey = key;
      this._layoutCache = layout;
      return layout;
    }

    const contextual = VR_MENU_CONTEXTUAL_BUTTONS.filter(
      (b) => b.contextTool === this._activeToolId
    );
    let drawer = this._openDrawerId
      ? VR_MENU_DRAWERS[this._openDrawerId] || []
      : [];
    // The people drawer's static row 0 is the verbs (Go To / Follow / the data
    // token); row 1 is the roster itself, built from live session state rather
    // than declared in the frozen constant.
    if (this._openDrawerId === "people" && this._roster.length) {
      drawer = [...drawer, ...this._rosterCells()];
    }

    // Extra rows stack ABOVE the static grid, assigned negative row indices
    // (which sort before every static row and, with the top-down v inversion
    // below, render upward toward eye level). Drawer rows go nearest the static
    // grid — right under the drawer button that opened them — and the
    // contextual row sits above those, next to the tool whose options it holds.
    //
    // Grouping drawer buttons by their own `drawerRow` first keeps a
    // multi-row drawer's internal order intact no matter how many rows it has.
    const extraRows = [];
    if (drawer.length) {
      const byDrawerRow = new Map();
      for (const btn of drawer) {
        const r = btn.drawerRow ?? 0;
        if (!byDrawerRow.has(r)) byDrawerRow.set(r, []);
        byDrawerRow.get(r).push(btn);
      }
      // Descending, because extraRows are assigned progressively MORE negative
      // rows (-1, -2, ...) and more-negative renders higher up the panel. Put
      // the drawer's own row 0 LAST here and it lands topmost, so a drawer
      // reads top-down in its declared order — same as the static grid does.
      const drawerRowIds = [...byDrawerRow.keys()].sort((a, b) => b - a);
      for (const r of drawerRowIds) extraRows.push(byDrawerRow.get(r));
    }
    if (contextual.length) extraRows.push(contextual);

    let allButtons = VR_MENU_BUTTONS;
    if (extraRows.length) {
      const minStaticRow = Math.min(...VR_MENU_BUTTONS.map((b) => b.row ?? 0));
      allButtons = [
        ...VR_MENU_BUTTONS,
        ...extraRows.flatMap((buttons, i) =>
          buttons.map((b) => ({ ...b, row: minStaticRow - 1 - i }))
        ),
      ];
    }

    // Surface the live roster count on the People button itself, so a solo
    // user sees "People (1)" and knows they're already listed instead of
    // having to open the drawer on faith that something (including
    // themselves) is in there. this._roster is kept current by
    // syncFromManager -> _refreshRoster, which always runs before this.
    const rosterCount = this._roster.length;
    allButtons = allButtons.map((b) =>
      b.id === "people" ? { ...b, label: `People (${rosterCount})` } : b
    );

    const layout = computeGridLayout(allButtons);
    this._layoutCacheKey = key;
    this._layoutCache = layout;
    return layout;
  }

  // ===========================================================================
  // HIT TESTING
  // ===========================================================================

  /**
   * Which button (if any) a panel-UV point lands on.
   * Out-of-range or non-finite input returns null (a miss), never throws.
   *
   * @param {number} u - horizontal fraction across the panel [0,1]
   * @param {number} v - vertical fraction up the panel [0,1]
   * @returns {object|null} the layout entry hit, or null
   */
  hitTest(u, v) {
    if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;

    for (const region of this.getButtonLayout()) {
      if (u >= region.u0 && u <= region.u1 && v >= region.v0 && v <= region.v1) {
        return region;
      }
    }
    return null;
  }

  // ===========================================================================
  // ACTION DISPATCH
  // ===========================================================================

  /**
   * Dispatch the action for a button id against the injected manager.
   * Returns a small result object describing what happened (handy for tests
   * and for the render layer to update highlights) rather than throwing on a
   * missing/absent manager method.
   *
   * Single source of truth: tool selection goes through
   * manager.activateTool/deactivateTool, isolation through
   * manager.toggleIsolation (same path as the B-button), undo emits the same
   * annotation-removed action the A-button uses, and exit calls leaveSession.
   *
   * @param {string} buttonId
   * @returns {{handled:boolean, action?:string, toolId?:string|null,
   *   isolated?:boolean}}
   */
  activate(buttonId) {
    // Look up against the CURRENT layout (static + active-contextual), not the
    // frozen static constant, so contextual buttons are dispatchable while
    // their tool is active, and a stale id from a since-deactivated tool
    // safely falls through to the "unknown button" no-op below.
    const btn = this.getButtonLayout().find((b) => b.id === buttonId);
    if (!btn) {
      log.warn(`VRSpatialMenu: unknown button "${buttonId}"`);
      return { handled: false };
    }

    switch (btn.kind) {
      case "tool":
        return this._activateTool(btn.toolId);
      case "action":
        // Currently only "undo"
        return this._undo();
      case "toggle":
        return btn.id === "grid" ? this._toggleGrid() : this._toggleIsolation();
      case "drawer":
        return this._toggleDrawer(btn.drawerId);
      case "nav-mode":
        return this._cycleNavMode();
      case "nav-mode-set":
        return this._setNavMode(btn.mode);
      case "scale":
        return this._setScale(btn.scaleValue, btn.id);
      case "goto-participant":
        return this._gotoNextParticipant();
      case "follow-participant":
        return this._toggleFollowNextParticipant();
      case "roster-entry":
        return this._gotoRosterEntry(btn.userId);
      // --- Data-manipulation token (see VRManipulationLock) ------------------
      case "control-request":
        return this._requestControl();
      case "control-grant":
        return this._grantControl();
      case "control-release":
        return this._releaseControl();
      case "annotation-label":
        return this._cycleAnnotationLabel();
      case "representation":
        return this._cycleRepresentation();
      case "representation-set":
        return this._setRepresentation(btn.mode);
      case "glyph-type-set":
        return this._setGlyphType(btn.mode);
      // --- Scene chrome (data reference grid + labelled axes) ---------------
      case "scene-grid":
        return this._toggleReferenceGrid();
      case "scene-axes":
        return this._toggleDataAxes();
      case "grid-plane":
        return this._cycleGridPlane();
      // --- Filters ----------------------------------------------------------
      case "threshold-toggle":
        return this._toggleThreshold();
      case "threshold-mode":
        return this._cycleThresholdMode();
      case "threshold-array":
        return this._cycleThresholdArray();
      case "iso-toggle":
        return this._toggleIsosurface();
      // --- Shared numeric stepper (see VR_MENU_DRAWERS) ----------------------
      case "value-target":
        return this._cycleValueTarget();
      case "value-nudge":
        return this._nudgeValue(btn.steps);
      case "value-reset":
        return this._resetValue();
      case "measure-new-path":
        return this._measureNewPath();
      case "clip-axis":
        return this._cycleClipAxis();
      case "clip-invert":
        return this._invertClipPlane();
      case "clip-reset":
        return this._resetClipPlane();
      case "annotation-color":
        return this._cycleAnnotationColor();
      case "probe-continuous":
        return this._toggleProbeContinuous();
      case "probe-clear":
        return this._clearProbeHistory();
      case "snapshot-save":
        return this._saveSnapshot();
      case "snapshot-load":
        return this._loadNextSnapshot();
      case "voice-mute":
        return this._toggleVoiceMute();
      case "voice-join":
        return this._toggleVoiceConnection();
      case "toggle-visibility":
        return this._hideMenu();
      case "exit":
        return this._exit();
      // --- Spatial keyboard (see VRKeyboardModel / isKeyboardOpen) -----------
      case "kbd-char":
        return this._kbdChar(btn.char);
      case "kbd-shift":
        return this._kbdShift();
      case "kbd-backspace":
        return this._kbdBackspace();
      case "kbd-preset":
        return this._kbdPreset(btn.text);
      case "kbd-confirm":
        return this._kbdConfirm();
      case "kbd-cancel":
        return this._kbdCancel();
      default:
        return { handled: false };
    }
  }

  /**
   * Insert one character, shifted per the current tri-state, then consume a
   * one-shot shift (lock persists). @private
   */
  _kbdChar(char) {
    const text = this._call("appendAnnotationDraft", shiftChar(char, this._shiftMode));
    this._shiftMode = consumeShift(this._shiftMode);
    return { handled: true, action: "kbd-char", char, text: text ?? null };
  }

  /** Advance the shift tri-state (off -> once -> lock -> off). @private */
  _kbdShift() {
    this._shiftMode = nextShiftMode(this._shiftMode);
    return { handled: true, action: "kbd-shift", shiftMode: this._shiftMode };
  }

  /** Delete the last character of the draft. @private */
  _kbdBackspace() {
    const text = this._call("backspaceAnnotationDraft");
    return { handled: true, action: "kbd-backspace", text: text ?? null };
  }

  /**
   * Append a preset phrase (plus a trailing space) to the draft buffer.
   * APPENDS rather than replaces: replacing would silently destroy anything
   * already typed with no undo, and append is identical to replace when the
   * buffer is empty — the common case of a one-tap preset fill.
   * @private
   */
  _kbdPreset(text) {
    const newText = this._call("appendAnnotationDraft", `${text} `);
    return { handled: true, action: "kbd-preset", presetText: text, text: newText ?? null };
  }

  /** Save the draft as a real annotation and close the keyboard. @private */
  _kbdConfirm() {
    const confirmed = !!this._call("confirmAnnotationDraft");
    return { handled: true, action: "kbd-confirm", confirmed };
  }

  /** Discard the draft and close the keyboard. @private */
  _kbdCancel() {
    const cancelled = !!this._call("cancelAnnotationDraft");
    return { handled: true, action: "kbd-cancel", cancelled };
  }

  /**
   * Cycles fly → teleport → walk via the same VRNavigationController the
   * launch modal's dropdown drives (VRExplorationManager.cycleNavigationMode).
   */
  _cycleNavMode() {
    const mode = this._call("cycleNavigationMode");
    return { handled: true, action: "nav-mode-changed", mode: mode ?? null };
  }

  /**
   * Toggles a specific locomotion mode (grab / move-object / walk / teleport).
   * Tapping the button of the ALREADY-active mode drops back to "fly" — the
   * neutral default where the left stick flies, grip pulls the world, and the
   * trigger stays free for tools and the menu. (It used to fall back to
   * "teleport", which silently parked the user in a mode whose trigger is
   * captured by teleport aiming; teleport is now its own explicit button.)
   * Uses the same VRExplorationManager.setNavigationMode the launch modal's
   * dropdown drives.
   * @private
   */
  _setNavMode(mode) {
    const current = this._call("getNavigationMode");
    const next = current === mode ? "fly" : mode;
    this._call("setNavigationMode", next);
    return { handled: true, action: "nav-mode-set", mode: next };
  }

  /** Jumps directly to a fixed vrScale (VRExplorationManager.setVRScale). */
  _setScale(scaleValue, buttonId) {
    this._call("setVRScale", scaleValue);
    return { handled: true, action: "scale-changed", scaleValue, buttonId };
  }

  /**
   * Advances to the next other participant (wrapping), for both Go To and
   * Follow — a stable cycle order so repeated taps step through everyone
   * rather than jumping around.
   * @private
   */
  _pickNextParticipant() {
    const others = this._call("getOtherParticipants") || [];
    if (!others.length) return null;
    this._participantCycleIndex = (this._participantCycleIndex + 1) % others.length;
    return others[this._participantCycleIndex]?.odUserId ?? null;
  }

  _gotoNextParticipant() {
    const userId = this._pickNextParticipant();
    if (!userId) {
      return { handled: true, action: "goto-participant", ok: false, reason: "no-participants" };
    }
    const ok = !!this._call("goToParticipant", userId);
    return { handled: true, action: "goto-participant", userId, ok };
  }

  /**
   * Tapping a roster cell goes to that specific participant — the same
   * manager call the cycling "Go To" button makes, just without the guesswork
   * of which person the cycle is currently on.
   * @param {string} userId
   * @private
   */
  _gotoRosterEntry(userId) {
    if (!userId) {
      return { handled: true, action: "roster-goto", ok: false, reason: "no-user" };
    }
    // Keep the Go To / Follow cycle in step with the explicit pick, so a
    // subsequent "Follow" tap follows the person you just went to rather than
    // resuming from wherever the cycle happened to be.
    const others = this._call("getOtherParticipants") || [];
    const idx = others.findIndex((p) => p?.odUserId === userId);
    if (idx >= 0) this._participantCycleIndex = idx;

    const ok = !!this._call("goToParticipant", userId);
    return { handled: true, action: "roster-goto", userId, ok };
  }

  /** Toggles off if already following anyone; otherwise follows the next participant. */
  _toggleFollowNextParticipant() {
    if (this._call("isFollowingParticipant")) {
      this._call("stopFollowing");
      return { handled: true, action: "follow-participant", following: null };
    }
    const userId = this._pickNextParticipant();
    if (!userId) {
      return { handled: true, action: "follow-participant", following: null, reason: "no-participants" };
    }
    this._call("followParticipant", userId);
    return { handled: true, action: "follow-participant", following: userId };
  }

  /**
   * Ask whoever holds the data-manipulation token for it
   * (VRExplorationManager.requestManipulationControl → VRManipulationLock).
   * @private
   */
  _requestControl() {
    const requested = !!this._call("requestManipulationControl");
    return { handled: true, action: "control-request", requested };
  }

  /**
   * Hand the token on. Prefers the OLDEST pending request — someone actually
   * asked, so answering them beats an arbitrary cycle position. With no
   * pending request, falls back to the same next-participant cycle Go To and
   * Follow use, so the button still does something in a session where nobody
   * has asked yet.
   * @private
   */
  _grantControl() {
    const [oldest] = this._call("getManipulationRequests") || [];
    if (oldest?.userId) {
      const granted = !!this._call("grantManipulationControlTo", oldest.userId, oldest.userName);
      return { handled: true, action: "control-grant", userId: oldest.userId, granted };
    }

    const userId = this._pickNextParticipant();
    if (!userId) {
      return { handled: true, action: "control-grant", granted: false, reason: "no-participants" };
    }
    const granted = !!this._call("grantManipulationControlTo", userId);
    return { handled: true, action: "control-grant", userId, granted };
  }

  /** Give the token back to the session host. @private */
  _releaseControl() {
    const released = !!this._call("releaseManipulationControl");
    return { handled: true, action: "control-release", released };
  }

  /** Advances the active tool's pending preset annotation label (see VRAnnotationTool.cycleLabel). */
  _cycleAnnotationLabel() {
    const label = this._call("cycleAnnotationLabel");
    if (label == null) {
      return { handled: true, action: "annotation-label-changed", label: null, reason: "no-active-tool" };
    }
    return { handled: true, action: "annotation-label-changed", label };
  }

  /**
   * Cycles surface → wireframe → points through the same desktop
   * implementation (VRExplorationManager.cycleRepresentation → instanceTools),
   * so a VR tap and a desktop menu click are indistinguishable to collaborators.
   */
  _cycleRepresentation() {
    const mode = this._call("cycleRepresentation");
    if (mode != null) this._holdDeferred("representation", mode);
    return { handled: true, action: "representation-changed", mode: mode ?? null };
  }

  /**
   * Set one specific representation (the Appearance drawer's Surface/Wire/
   * Points buttons), rather than blind-cycling. Cycling gave no way to see
   * which mode was live, and its highlight was "active if not surface" — so
   * wireframe and points were indistinguishable on the panel.
   * @param {'surface'|'wireframe'|'points'} mode
   * @private
   */
  _setRepresentation(mode) {
    const applied = this._call("setRepresentation", mode);
    const resolved = applied === undefined ? mode : applied ?? null;
    if (resolved != null) this._holdDeferred("representation", resolved);
    return {
      handled: true,
      action: "representation-changed",
      mode: resolved,
    };
  }

  /**
   * Toggle the data reference grid. Distinct from the "Views" button, which
   * toggles VRMultiViewGrid (other open views laid out in space).
   * @private
   */
  _toggleReferenceGrid() {
    const visible = this._call("toggleReferenceGrid");
    return { handled: true, action: "reference-grid-toggled", visible: !!visible };
  }

  /** Toggle the labelled data axes. @private */
  _toggleDataAxes() {
    const visible = this._call("toggleDataAxes");
    return { handled: true, action: "data-axes-toggled", visible: !!visible };
  }

  /** Cycle the reference grid's plane (xz -> xy -> yz). @private */
  _cycleGridPlane() {
    const plane = this._call("cycleGridPlane");
    return { handled: true, action: "grid-plane-changed", plane: plane ?? null };
  }

  /**
   * Toggle the threshold filter. Reports `available:false` rather than
   * pretending to work when the dataset has no scalar arrays to threshold on —
   * the render layer dims the card so a tap that cannot do anything at least
   * says so (same reasoning as the Views button's "no-other-views").
   * @private
   */
  _toggleThreshold() {
    if (this._call("isThresholdAvailable") === false) {
      return { handled: false, action: "threshold-toggled", available: false };
    }
    const enabled = !!this._call("toggleThresholdFilter");
    this._holdDeferred("threshold", enabled);
    return { handled: true, action: "threshold-toggled", enabled, available: true };
  }

  /** Cycle threshold mode (between -> above -> below). @private */
  _cycleThresholdMode() {
    const mode = this._call("cycleThresholdMode");
    return { handled: true, action: "threshold-mode-changed", mode: mode ?? null };
  }

  /** Cycle which scalar array the threshold acts on. @private */
  _cycleThresholdArray() {
    const arrayName = this._call("cycleThresholdArray");
    return { handled: true, action: "threshold-array-changed", arrayName: arrayName ?? null };
  }

  /**
   * Toggle isosurface extraction. Requires volume/image data, so it is inert
   * (and dimmed) for plain polydata.
   * @private
   */
  _toggleIsosurface() {
    if (this._call("isIsosurfaceAvailable") === false) {
      return { handled: false, action: "isosurface-toggled", available: false };
    }
    const enabled = !!this._call("toggleIsosurface");
    this._holdDeferred("isosurface", enabled);
    return { handled: true, action: "isosurface-toggled", enabled, available: true };
  }

  /** Retarget the shared stepper to the next editable value. @private */
  _cycleValueTarget() {
    const target = this._call("cycleValueTarget");
    return { handled: true, action: "value-target-changed", targetId: target ?? null };
  }

  /**
   * Step the active numeric target up or down.
   * @param {number} steps - signed step count (+1 / -1)
   * @private
   */
  _nudgeValue(steps) {
    const value = this._call("nudgeValue", steps);
    return { handled: true, action: "value-nudged", steps, value: value ?? null };
  }

  /** Restore the active numeric target to its default. @private */
  _resetValue() {
    const value = this._call("resetValue");
    return { handled: true, action: "value-reset", value: value ?? null };
  }

  /** Cycle the clip plane's axis constraint (free -> X -> Y -> Z). @private */
  _cycleClipAxis() {
    const axis = this._call("cycleClipAxis");
    return { handled: true, action: "clip-axis-changed", axis: axis ?? null };
  }

  /** Archive the active measurement path and start a fresh one. @private */
  _measureNewPath() {
    const path = this._call("startNewMeasurementPath");
    return { handled: true, action: "measure-new-path", path: path ?? null };
  }

  /**
   * Select a glyph type (or disable with mode === null) via the same desktop
   * VTKGlyphFeature API (VRExplorationManager.setGlyphType). The "glyphs"
   * deferred-hold key is shared with the type-set buttons' active-state read
   * in getButtonStates() — held as the TYPE ID (or null), not a boolean, so
   * the just-tapped shape lights immediately instead of waiting out
   * _deferHeavy's async enable/rebuild.
   * @private
   */
  _setGlyphType(typeId) {
    const accepted = !!this._call("setGlyphType", typeId);
    if (accepted) this._holdDeferred("glyphs", typeId);
    return { handled: true, action: "glyph-type-set", typeId, accepted };
  }

  /** Inverts the active Clip tool's plane direction (VRExplorationManager.invertClipPlane). */
  _invertClipPlane() {
    this._call("invertClipPlane");
    return { handled: true, action: "clip-inverted" };
  }

  /** Resets the active Clip tool's plane (VRExplorationManager.resetClipPlane). */
  _resetClipPlane() {
    this._call("resetClipPlane");
    return { handled: true, action: "clip-reset" };
  }

  /** Cycles the active Annotate tool's placement mode: marker → text → drawing. */
  _cycleAnnotationColor() {
    const color = this._call("cycleAnnotationColor");
    return { handled: true, action: "annotation-color-changed", color: color ?? null };
  }

  /** Toggles the active Probe tool's continuous-sampling mode. */
  _toggleProbeContinuous() {
    const enabled = !!this._call("toggleProbeContinuous");
    return { handled: true, action: "probe-continuous-toggled", enabled };
  }

  /** Clears the active Probe tool's sample history. */
  _clearProbeHistory() {
    this._call("clearProbeHistory");
    return { handled: true, action: "probe-history-cleared" };
  }

  /**
   * Quick-saves a VR session snapshot (VRExplorationManager.createSnapshot).
   * Fire-and-forget like _exit() — createSnapshot is async, but dispatch must
   * return synchronously.
   * @private
   */
  _saveSnapshot() {
    try {
      const r = this._call("createSnapshot");
      if (r && typeof r.catch === "function") {
        r.catch((err) => log.warn("VR snapshot save failed:", err?.message));
      }
    } catch (err) {
      log.warn("VR snapshot save threw:", err?.message);
    }
    return { handled: true, action: "snapshot-saved" };
  }

  /**
   * Cycles to the next saved session snapshot and loads it — mirrors
   * _pickNextParticipant's "cycle to next X" pattern since there's no
   * per-item picker UI in VR.
   * @private
   */
  _loadNextSnapshot() {
    const snapshots = this._call("getSessionSnapshots") || [];
    if (!snapshots.length) {
      return { handled: true, action: "snapshot-load", ok: false, reason: "no-snapshots" };
    }
    this._snapshotCycleIndex = (this._snapshotCycleIndex + 1) % snapshots.length;
    const snap = snapshots[this._snapshotCycleIndex];
    try {
      const r = this._call("loadSnapshot", snap?.id);
      if (r && typeof r.catch === "function") {
        r.catch((err) => log.warn("VR snapshot load failed:", err?.message));
      }
    } catch (err) {
      log.warn("VR snapshot load threw:", err?.message);
    }
    return { handled: true, action: "snapshot-load", snapshotId: snap?.id ?? null, ok: true };
  }

  /** Toggles the local participant's voice mute state (voiceRoomService via manager). */
  _toggleVoiceMute() {
    const muted = !!this._call("toggleVoiceMute");
    return { handled: true, action: "voice-mute-toggled", muted };
  }

  /** Joins or leaves the session's voice room (voiceRoomService via manager). */
  _toggleVoiceConnection() {
    const connected = !!this._call("toggleVoiceConnection");
    return { handled: true, action: "voice-connection-toggled", connected };
  }

  /**
   * Open/close a drawer. Local UI chrome only — no manager call.
   *
   * Tapping the open drawer closes it; tapping a different one switches to it.
   * Opening is exclusive by construction (a single `_openDrawerId`, not a set),
   * which is what caps the panel at a comfortable height: 5 static rows + at
   * most 2 drawer rows + at most 1 contextual row.
   *
   * @param {string} drawerId - key into VR_MENU_DRAWERS
   * @returns {{handled:boolean, action:string, drawerId:string|null, open:boolean}}
   * @private
   */
  _toggleDrawer(drawerId) {
    if (!drawerId || !VR_MENU_DRAWERS[drawerId]) {
      log.warn(`VRSpatialMenu: unknown drawer "${drawerId}"`);
      return { handled: false, action: "drawer-toggled", drawerId: null, open: false };
    }
    const open = this._openDrawerId !== drawerId;
    this._openDrawerId = open ? drawerId : null;
    return { handled: true, action: "drawer-toggled", drawerId, open };
  }

  /** @returns {string|null} the open drawer's id, or null */
  getOpenDrawerId() {
    return this._openDrawerId;
  }

  /**
   * Hides the panel. Local UI chrome, NOT manager state — unlike every other
   * button, this does not go through this._call(). VTKVRSpatialUI shows a
   * tiny always-on "reshow tab" (using the same hit-test machinery as the
   * full panel) to bring it back; see VTKVRSpatialUI._updateReshowTab.
   * @private
   */
  _hideMenu() {
    this._visible = false;
    return { handled: true, action: "menu-hidden" };
  }

  _activateTool(toolId) {
    // Toggle semantics: tapping the already-active tool turns it off, so the
    // user can drop back to plain navigation without a separate "none" button.
    // Stamp the tap so syncFromManager() honours this optimistic value while
    // the manager's async tool switch settles (see TOOL_SYNC_HOLD_MS).
    this._toolTapAtMs = Date.now();
    if (this._activeToolId === toolId) {
      this._call("deactivateTool");
      this._activeToolId = null;
      return { handled: true, action: "tool-deactivated", toolId: null };
    }
    this._call("activateTool", toolId);
    this._activeToolId = toolId;
    return { handled: true, action: "tool-activated", toolId };
  }

  _undo() {
    // Routes to the same tool-level undo the controller A-button drives, so
    // there is one undo path (and persistence/broadcast stays consistent).
    const undone = this._call("undoLastToolAction");
    return { handled: true, action: "undo", undone: undone === true };
  }

  _toggleIsolation() {
    let isolated = this._isolated;
    if (typeof this._manager?.toggleIsolation === "function") {
      // toggleIsolation returns the new isolated state (true/false)
      isolated = this._manager.toggleIsolation();
    } else {
      isolated = !this._isolated;
    }
    this._isolated = !!isolated;
    return { handled: true, action: "isolation-toggled", isolated: this._isolated };
  }

  _toggleGrid() {
    const wasEnabled = this._gridEnabled;
    let enabled = this._gridEnabled;
    if (typeof this._manager?.toggleGridMode === "function") {
      // toggleGridMode returns the new enabled state (true/false)
      enabled = this._manager.toggleGridMode();
    } else {
      enabled = !this._gridEnabled;
    }
    this._gridEnabled = !!enabled;

    // Asking to turn the grid ON and still getting `false` back means there was
    // nothing to show — the grid renders OTHER open VTK views, so with a single
    // dataset open it silently did nothing. Report why, the same way
    // snapshot-load and goto-participant do, so the hint line can say so
    // instead of the button just refusing to light.
    if (!wasEnabled && !this._gridEnabled) {
      return {
        handled: true,
        action: "grid-toggled",
        gridEnabled: false,
        reason: "no-other-views",
      };
    }
    return { handled: true, action: "grid-toggled", gridEnabled: this._gridEnabled };
  }

  _exit() {
    // leaveSession is async; fire-and-forget — the panel is torn down by the
    // subsequent session-end signal, not by this promise resolving.
    try {
      const r = this._manager?.leaveSession?.();
      if (r && typeof r.catch === "function") {
        r.catch((err) => log.warn("VR exit failed:", err?.message));
      }
    } catch (err) {
      log.warn("VR exit threw:", err?.message);
    }
    return { handled: true, action: "exit" };
  }

  /**
   * Stamp an optimistic value for a deferred toggle so getButtonStates() can
   * trust it over the manager's (still-stale) live read for TOOL_SYNC_HOLD_MS
   * — see the constructor note on _deferredHolds.
   * @param {string} id - domain key, e.g. "glyphs" / "isosurface" /
   *   "threshold" / "representation"
   * @private
   */
  _holdDeferred(id, value) {
    this._deferredHolds.set(id, { value, atMs: Date.now() });
  }

  /**
   * Read a deferred toggle's display value: the optimistic tap value while
   * its hold window is still open, otherwise `liveValue` (already read from
   * the manager by the caller).
   * @private
   */
  _readDeferredHold(id, liveValue) {
    const hold = this._deferredHolds.get(id);
    if (hold && Date.now() - hold.atMs < TOOL_SYNC_HOLD_MS) {
      return hold.value;
    }
    if (hold) this._deferredHolds.delete(id);
    return liveValue;
  }

  _call(method, ...args) {
    const fn = this._manager?.[method];
    if (typeof fn === "function") {
      try {
        return fn.apply(this._manager, args);
      } catch (err) {
        log.warn(`VRSpatialMenu: manager.${method} threw:`, err?.message);
      }
    }
    return undefined;
  }

  // ===========================================================================
  // SHOW / HIDE  (driven by VR session lifecycle)
  // ===========================================================================

  /** Called on VR session start. Panel becomes visible and re-syncs state. */
  onSessionStart() {
    this._visible = true;
    // A stale layout from a previous session must never leak into a fresh
    // one — see the getButtonLayout() cache note.
    this._layoutCache = null;
    this._layoutCacheKey = null;
    // Force a roster pull on the first syncFromManager() of the new session
    // rather than inheriting the previous one's refresh timestamp.
    this._rosterAtMs = 0;
    this.syncFromManager();
    return this._visible;
  }

  /** Called on VR session end. Panel hides and forgets transient state. */
  onSessionEnd() {
    this._visible = false;
    this._activeToolId = null;
    this._isolated = false;
    this._gridEnabled = false;
    this._openDrawerId = null;
    this._participantCycleIndex = -1;
    this._snapshotCycleIndex = -1;
    this._toolTapAtMs = null;
    this._keyboardOpen = false;
    this._shiftMode = "off";
    this._draftText = "";
    this._draftFallback = "";
    this._deferredHolds.clear();
    this._layoutCache = null;
    this._layoutCacheKey = null;
    this._roster = [];
    this._rosterKey = "";
    this._rosterAtMs = 0;
    return this._visible;
  }

  /**
   * @returns {boolean} whether the panel should be drawn. Forces true while
   *   an annotation draft is open, regardless of `_visible` — the keyboard
   *   layout has no `hide-menu` key, so if visibility were somehow false
   *   while a draft is open, VTKVRSpatialUI.update() would take the
   *   reshow-tab path and strand the user with an uncancellable draft. Checked
   *   LIVE via the manager (not the cached `_keyboardOpen`) because
   *   VTKVRSpatialUI calls this BEFORE syncFromManager() each frame — see its
   *   update()'s `if (!this._model.isVisible())` guard.
   */
  isVisible() {
    if (this._visible) return true;
    if (this._call("getAnnotationDraft")?.active) return true;
    // A manipulation-lock block or a persistence failure (see
    // VRExplorationManager._flashVRNotice) used to only ever appear if the
    // panel already happened to be open — a user who had closed it (or never
    // opened it) got no indication their action was silently refused. The
    // notice is inherently transient (VR_NOTICE_MS), so force-showing the
    // panel while one is live costs nothing once it expires.
    return !!this._call("getVRNotice");
  }

  /**
   * Manually show/hide the panel (the "Hide" button / reshow tab). Distinct
   * from onSessionStart/onSessionEnd's lifecycle-driven visibility — a manual
   * hide does not persist across sessions; onSessionStart always resets to
   * visible, which is the simplest, least-surprising default.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this._visible = !!visible;
    return this._visible;
  }

  // ===========================================================================
  // STATE REFLECTION (keep panel == manager)
  // ===========================================================================

  /**
   * Pull authoritative state from the manager so the panel highlights match
   * whatever the manager actually has active (e.g. a tool activated by the
   * DOM wrist menu, or isolation entered via the B-button). Safe to call any
   * time; missing manager methods are treated as "nothing active".
   */
  syncFromManager() {
    // Optimistic-hold window. VRExplorationManager.activateTool() drives the
    // ASYNC VRToolManager.activateTool without awaiting it (the old tool's
    // deactivate() is awaited first), so getActiveTool() keeps reporting the
    // PREVIOUS tool for a frame or more after a tap. Since this runs every
    // frame, it used to stomp the optimistic _activeToolId set on tap and then
    // flip back once the promise settled — visibly flickering the highlight and
    // tearing down/rebuilding the contextual row's actors on every tool press.
    // Within the window we trust the local tap; after it, the manager wins.
    const holding =
      this._toolTapAtMs != null &&
      Date.now() - this._toolTapAtMs < TOOL_SYNC_HOLD_MS;

    if (!holding) {
      const active = this._manager?.getActiveTool?.();
      // getActiveTool() returns a tool instance (with .id) or null/undefined.
      this._activeToolId = active?.id ?? null;
      this._toolTapAtMs = null;
    }

    if (typeof this._manager?.isIsolated === "function") {
      this._isolated = !!this._manager.isIsolated();
    }
    if (typeof this._manager?.isGridModeEnabled === "function") {
      this._gridEnabled = !!this._manager.isGridModeEnabled();
    }

    // Keyboard mode is entirely DERIVED from the draft's presence — see the
    // constructor comment. This runs every frame (same cadence as the tool/
    // isolation sync above), so the panel flips to/from the keyboard the
    // instant the tool opens or resolves a draft, with no separate signal to
    // keep in sync.
    const draft = this._call("getAnnotationDraft");
    this._keyboardOpen = !!draft?.active;
    this._draftText = draft?.text ?? "";
    this._draftFallback = draft?.fallbackText ?? "";
    if (!this._keyboardOpen) this._shiftMode = "off";

    this._refreshRoster();

    return {
      activeToolId: this._activeToolId,
      isolated: this._isolated,
      gridEnabled: this._gridEnabled,
    };
  }

  /**
   * Pull manager.getSessionRoster() at most once every ROSTER_REFRESH_MS and
   * recompute the COARSE signature that gates getButtonLayout()'s memo.
   *
   * The signature deliberately contains only `userId:isHolder` per cell — who
   * is in the row, in what order, and which one holds the data token. Those are
   * exactly the things that change the row's GEOMETRY or its card styling.
   * Everything else the roster carries (distance, isStale, activity) is either
   * continuous or ticks on its own clock; folding any of it into this string
   * would make the key differ frame to frame, which costs a full
   * computeGridLayout plus a teardown/rebuild of the roster cards in
   * VTKVRSpatialUI — hundreds of allocations and several texture uploads per
   * frame, enough to drop a Quest session under 72fps.
   *
   * The interval alone is not the guarantee; the coarseness is. The interval
   * just keeps the manager call itself off the frame path.
   * @private
   */
  _refreshRoster() {
    const nowMs = Date.now();
    if (this._rosterAtMs && nowMs - this._rosterAtMs < ROSTER_REFRESH_MS) return;
    this._rosterAtMs = nowMs;

    const roster = this._call("getSessionRoster");
    this._roster = Array.isArray(roster) ? roster : [];

    const key = this._roster
      .slice(0, MAX_ROSTER_CELLS)
      .map((e) => `${e.userId}:${e.isHolder ? 1 : 0}`)
      .join(",");
    this._rosterKey = key;
  }

  /** @returns {Array<object>} the roster rows currently backing the people drawer. */
  getRoster() {
    return this._roster;
  }

  /** @returns {string} the coarse roster signature feeding getButtonLayout()'s memo key. */
  getRosterKey() {
    return this._rosterKey;
  }

  getActiveToolId() {
    return this._activeToolId;
  }

  isIsolated() {
    return this._isolated;
  }

  /** @returns {boolean} true while an annotation draft is open and the panel is the keyboard. */
  isKeyboardOpen() {
    return this._keyboardOpen;
  }

  /**
   * Render-time button states for the geometry layer: which button is the
   * active tool and whether isolation is on, so it can tint/highlight them.
   * Iterates getButtonLayout() (not the static constant) so contextual-row
   * buttons get highlighting for free while their tool is active.
   * @returns {Array<{id:string, active:boolean, disabled:boolean, holder:boolean}>}
   */
  getButtonStates() {
    return this.getButtonLayout().map((btn) => {
      let active = false;
      // `disabled` means "this button cannot do anything right now" (no scalar
      // arrays to threshold, no volume to isosurface). The render layer dims
      // the card, so a tap that no-ops at least looks like it will.
      let disabled = false;
      // `holder` is a THIRD card style (see VTKVRSpatialUI's CARD_STYLES),
      // not a variant of active: "this person controls the data" is a property
      // of the participant, not of the button being pressed.
      let holder = false;
      if (btn.kind === "tool") active = this._activeToolId === btn.toolId;
      else if (btn.kind === "drawer") active = this._openDrawerId === btn.drawerId;
      else if (btn.id === "isolation") active = this._isolated;
      else if (btn.id === "grid") active = this._gridEnabled;
      // Relative tolerance, not ===. Two-hand pinch mutates vrScale
      // continuously, so exact equality made all three presets go dark after
      // any zoom gesture and only relight on a pixel-perfect preset tap.
      else if (btn.kind === "scale") {
        const scale = this._call("getVRScale");
        active =
          typeof scale === "number" &&
          Number.isFinite(scale) &&
          Math.abs(scale - btn.scaleValue) <= btn.scaleValue * 0.02;
      }
      else if (btn.kind === "nav-mode-set") active = this._call("getNavigationMode") === btn.mode;
      else if (btn.id === "follow-participant") active = !!this._call("isFollowingParticipant");
      // Roster cells: light the one you are currently following, accent the
      // control holder, and dim anyone whose pose has gone stale (tapping them
      // cannot go anywhere — goToParticipant has no position to aim at).
      else if (btn.kind === "roster-entry") {
        const entry = this._roster.find((e) => e.userId === btn.userId);
        active = !!btn.userId && this._call("isFollowingParticipant") === btn.userId;
        holder = !!entry?.isHolder;
        disabled = !!entry?.isStale;
      }
      // Data-manipulation token. "Release" lights while you hold it (it's the
      // only button that does anything then); "Give" is dimmed for anyone who
      // doesn't hold it, because they have nothing to give away.
      else if (btn.kind === "control-release") {
        active = !!this._call("isManipulationHolder");
      }
      else if (btn.kind === "control-grant") {
        disabled = !this._call("isManipulationHolder");
      }
      // Requesting is pointless while you already hold it.
      else if (btn.kind === "control-request") {
        disabled = !!this._call("isManipulationHolder");
      }
      else if (btn.kind === "representation") {
        const mode = this._readDeferredHold("representation", this._call("getRepresentation"));
        active = !!mode && mode !== "surface";
      }
      // Exact match, unlike the legacy cycling button above: each of
      // Surface/Wire/Points lights only for its own mode, so the panel finally
      // shows WHICH representation is live.
      else if (btn.kind === "representation-set") {
        active = this._readDeferredHold("representation", this._call("getRepresentation")) === btn.mode;
      }
      else if (btn.kind === "scene-grid") active = !!this._call("isReferenceGridVisible");
      else if (btn.kind === "scene-axes") active = !!this._call("areDataAxesVisible");
      else if (btn.kind === "threshold-toggle") {
        active = this._readDeferredHold("threshold", !!this._call("isThresholdEnabled"));
        disabled = this._call("isThresholdAvailable") === false;
      } else if (btn.kind === "iso-toggle") {
        active = this._readDeferredHold("isosurface", !!this._call("isIsosurfaceEnabled"));
        disabled = this._call("isIsosurfaceAvailable") === false;
      }
      // Threshold sub-controls are meaningless while threshold is off.
      else if (btn.kind === "threshold-mode" || btn.kind === "threshold-array") {
        disabled = !this._call("isThresholdEnabled");
      }
      // Exact match against the LIVE type, same convention as
      // representation-set: only the cell matching the current shape lights,
      // "Off" lights when glyphs are disabled (currentType is null/undefined).
      else if (btn.kind === "glyph-type-set") {
        const currentType = this._readDeferredHold("glyphs", this._call("getGlyphType"));
        active = btn.mode === null ? currentType == null : currentType === btn.mode;
        if (btn.mode !== null) {
          const disabledTypes = this._call("getDisabledGlyphTypeIds") || [];
          disabled = disabledTypes.includes(btn.mode);
        }
      }
      else if (btn.kind === "probe-continuous") active = !!this._call("isProbeContinuous");
      // Only meaningful once connected: voiceRoomService.isMuted initialises to
      // TRUE before any room is joined, which lit the Mute button from the
      // moment VR started even though nothing was muted (nor mutable — its
      // toggle early-returns while disconnected).
      else if (btn.kind === "voice-mute") {
        active = !!this._call("isVoiceConnected") && !!this._call("isVoiceMuted");
      }
      else if (btn.kind === "voice-join") active = !!this._call("isVoiceConnected");
      // Shift lights for either held state ('once' or 'lock') — the render
      // layer doesn't need to distinguish them, both read as "the next/every
      // letter is capitalized".
      else if (btn.kind === "kbd-shift") {
        active = this._shiftMode === "once" || this._shiftMode === "lock";
      }
      // clip-invert/clip-reset/annotation-mode/snapshot-save/snapshot-load/
      // toggle-visibility, the value-* stepper, and the rest of the keyboard
      // (char/backspace/preset/confirm/cancel) are momentary actions — never
      // highlighted.
      return { id: btn.id, active, disabled, holder };
    });
  }

  // ===========================================================================
  // STATUS LINE
  // ===========================================================================

  /**
   * A single text line for the geometry layer to render above the button
   * rows: dataset name, current scale, and locomotion mode. Never throws —
   * missing manager data just yields a shorter/blanker line.
   * @returns {string}
   */
  getStatusLine() {
    // Keyboard mode replaces the whole status line with the live draft
    // readout (typed text, or the fallback-preset prompt) — dataset/scale/
    // nav-mode are meaningless while the user is heads-down typing a note.
    if (this._keyboardOpen) {
      return formatDraftLine(this._draftText, { fallback: this._draftFallback });
    }

    // A deferred toggle (glyph rebuild, isosurface, threshold, representation
    // — see VRExplorationManager._deferHeavy) is queued or actively running.
    // Replacing the whole line, same as the keyboard-mode branch above, keeps
    // this readable — the dataset/scale/mode parts aren't useful information
    // while the user is staring at a stall they just caused.
    const pendingWork = this._call("getPendingWorkLabel");
    if (typeof pendingWork === "string" && pendingWork.length) {
      return pendingWork;
    }

    // Transient notice (VRExplorationManager._flashVRNotice) — most often
    // "X needs data control". Deliberately AFTER pendingWork: a stall the user
    // just caused is more urgent than a refusal they can retry, and pending
    // work self-clears in a few hundred ms anyway. Zero new actors: this rides
    // the same dirty-checked status canvas as everything else here.
    const notice = this._call("getVRNotice");
    if (typeof notice === "string" && notice.length) {
      return notice;
    }

    // Which array is driving glyph orientation is otherwise invisible in VR —
    // it's auto-picked (the dataset's first vector array) and desktop's
    // equivalent label (`Glyphs: ${glyphType}`, VTKInstanceHandler.js) never
    // had a VR counterpart. That silence is why VR glyphs read as "random":
    // arrows point along whatever array happened to be first, with no way to
    // tell which one or that you're looking at a default rather than a choice.
    if (this._openDrawerId === "glyphTypes") {
      const glyphType = this._call("getGlyphType");
      const orientationArray = this._call("getGlyphOrientationArray");
      if (!glyphType) return "Glyphs: off";
      return orientationArray
        ? `Glyphs: ${glyphType} — oriented by "${orientationArray}"`
        : `Glyphs: ${glyphType}`;
    }

    const name = this._call("getActiveDatasetName") || "Dataset";
    const navMode = this._call("getNavigationMode");
    const scale = this._call("getVRScale");

    const parts = [name];
    if (typeof scale === "number" && Number.isFinite(scale) && scale > 0) {
      parts.push(this._formatScale(scale));
    }
    if (typeof navMode === "string" && navMode.length) {
      parts.push(navMode[0].toUpperCase() + navMode.slice(1));
    }

    const followedId = this._call("isFollowingParticipant");
    if (followedId) {
      const others = this._call("getOtherParticipants") || [];
      const target = others.find((p) => p.odUserId === followedId);
      parts.push(`Following ${target?.userName || followedId}`);
    }

    if (this._activeToolId === "annotate") {
      const pendingLabel = this._call("getPendingAnnotationLabel");
      if (pendingLabel) parts.push(`Label: ${pendingLabel}`);
    }

    return parts.join("  •  ");
  }

  /**
   * Quantized to ~2 significant figures so the string stays STABLE across the
   * small, continuous scale changes VRScaleController applies during a
   * two-hand pinch — VTKVRSpatialUI._layoutStatus dirty-checks this string to
   * decide whether to repaint the status canvas + re-upload its GPU texture,
   * so a value that changes on almost every frame (the old toFixed(1)/
   * toFixed(1) behavior) defeated that check entirely. Fewer distinct values
   * is the goal here, not a different label shape.
   * @private
   */
  _formatScale(scale) {
    if (scale >= 1) {
      // Below 10x, snap to the nearest half (0.5) instead of the nearest
      // tenth — coarser than a straight 2-sig-fig round would give, which is
      // what actually cuts the repaint rate during a slow pinch-zoom. At/above
      // 10x, a whole number already reads as ~2 sig figs at that magnitude.
      const rounded = scale < 10 ? Math.round(scale * 2) / 2 : Math.round(scale);
      return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}x`;
    }
    // Zoomed out: "1:37.4" doesn't read as meaningfully different from
    // "1:37", so round to the nearest whole ratio — cuts the distinct-string
    // count ~10x relative to the previous one-decimal formatting.
    return `1:${Math.round(1 / scale)}`;
  }

  // ===========================================================================
  // HINT LINE — "how do I interact with this right now"
  // ===========================================================================

  /**
   * A single "how do I use this" line for the geometry layer to render below
   * the button grid — separate from getStatusLine() (session state: dataset/
   * scale/mode/following) so the two don't get concatenated into one
   * unreadably long canvas-texture line. While a tool is active, shows that
   * tool's control summary; otherwise shows the current locomotion mode's
   * controls (VRNavigationController.NAVIGATION_MODE_INFO, surfaced via
   * VRExplorationManager.getNavigationModeInfo() — previously written but
   * never called from anywhere in the UI). Never throws; missing manager data
   * just yields an empty line.
   * @returns {string}
   */
  getHintLine() {
    // Leading branch, same reasoning as getStatusLine(): while typing, the
    // hint is about the keyboard, not the active tool's normal controls.
    if (this._keyboardOpen) {
      return "Type the note · Save places it for everyone · Cancel discards";
    }
    // Matching branch to getStatusLine()'s notice: the status line says WHAT
    // was refused, this line says what to do about it. Same ordering rule —
    // pending work wins, because there is nothing to do about a stall.
    const notice = this._call("getVRNotice");
    if (typeof notice === "string" && notice.length) {
      const pendingWork = this._call("getPendingWorkLabel");
      if (!(typeof pendingWork === "string" && pendingWork.length)) {
        return this._call("isManipulationHolder")
          ? "You have data control"
          : "Open People → Request control";
      }
    }
    if (this._activeToolId) {
      const toolHints = {
        clip: "Grip+drag to aim, A to invert, B to reset",
        // No thumbstick reference: it is hardcoded inert for Vision Pro
        // transient pointers, and the mode cycle it drove is gone. Label and
        // Color are on the contextual row, reachable on both headsets.
        annotate: "Trigger to fix a point, then type the note",
        // Chained: each pick continues the path from the last point. No
        // B-button reference — Vision Pro has no A/B, so Undo/New Path on the
        // menu are the only controls guaranteed on both headsets.
        measure: "Trigger to add points · Undo removes the last one",
        probe: "Trigger to probe, A for continuous, B to clear, thumbstick to browse history",
      };
      return toolHints[this._activeToolId] || "";
    }
    const info = this._call("getNavigationModeInfo");
    return info?.controls || "";
  }
}

export default VRSpatialMenuModel;
