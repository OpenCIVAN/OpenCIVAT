// src/core/vr/VRKeyboardModel.js
// ----------------------------------------------------------------------------
// VR Keyboard Model — pure data + logic behind the spatial QWERTY keyboard
// shown when a user places an annotation in VR.
// ----------------------------------------------------------------------------
//
// WHY THIS EXISTS
// Same reasoning as VRSpatialMenuModel.js: WebXR immersive sessions do not
// render the DOM, so any keyboard UI has to be drawn as in-scene VTK geometry.
// This module is the geometry-free brain of that keyboard — key layout data
// and the pure string/shift logic — with NO VTK, React, manager, or DOM
// references, so it is fully unit-testable in jsdom and keeps core/ free of
// UI deps. The rendering layer (VTKVRSpatialUI) consumes VR_KEYBOARD_KEYS the
// same way it consumes VR_MENU_BUTTONS: each descriptor uses the identical
// {id,label,icon,kind,row,group} shape VRSpatialMenuModel.getButtonLayout()
// already knows how to lay out (group by row, equal-width cells per row,
// inset by padding, first declared row on top) — nothing about that layout
// code needs to change to support a second button set.
//
// IMPORTANT DESIGN NOTE — why shift never re-labels a key
// The alphabetic key caps (Q, W, E, ...) stay permanently uppercase in
// `label` and are NEVER re-labelled when shift toggles. Those labels are
// baked into per-key canvas textures at build time (see
// VTKVRSpatialUI._createButtonContentActor), so re-labelling on every shift
// press would mean 26 canvas repaints plus 26 texture uploads inside a 90Hz
// XR frame loop. Instead, `label` is fixed and `shiftChar()` is the single
// place that decides which character actually gets inserted into the draft
// string. This is the single most important performance decision here — do
// not "fix" the caps to reflect shift state.
//
// COORDINATE / SHAPE CONVENTION
// See VRSpatialMenuModel.js for the panel-UV layout convention this data is
// designed to be laid out with. This module does not implement layout itself
// — it only supplies descriptors in the same shape.

/**
 * Key descriptors, left→right within each row, declared top→bottom (row 0 is
 * the TOP row when laid out by VRSpatialMenuModel.getButtonLayout-style
 * logic — see that module's row-inversion comment).
 *
 * Row map:
 *   0 — the 5 annotation label presets (kbd-preset)
 *   1 — digits 1234567890 (kbd-char) — 10 keys
 *   2 — Q W E R T Y U I O P (kbd-char) — 10 keys
 *   3 — A S D F G H J K L (kbd-char) — 9 keys
 *   4 — Z X C V B N M (kbd-char) — 7 keys
 *   5 — Shift, Space, Del, Cancel, Save
 *
 * Rows 3 and 4 intentionally do NOT pad to 10 columns — punctuation ('.' ','
 * '-' '/') was dropped for annotation text entry, and each row's own key
 * count (9, then 7) is left as-is. `computeGridLayout`'s per-row
 * `cellW = 1/n` math means fewer keys in a row makes each of that row's keys
 * proportionally wider — exactly the "bigger, easier to hit" trade-off this
 * simplification is for. Do not re-pad these rows back to 10.
 *
 * `icon: null` on the character keys is intentional, not a placeholder: the
 * render layer degrades an unresolved/absent icon to a clean, centred label
 * card (see VTKVRSpatialUI._createButtonContentActor's hasIconGlyph check),
 * which is exactly what a keycap should look like. Space carries the
 * non-empty label "Space" (rather than " ") because that same render method
 * returns null for an empty label string — a blank cap would simply not
 * render.
 *
 * `kbd-confirm` (Save) and `kbd-cancel` (Cancel) get their own `group`
 * values, distinct from the shared `KEYS` group everything else uses, so the
 * render layer's group→accent-colour table can give these two irreversible
 * actions real visual weight instead of blending into the keyboard.
 *
 * @type {ReadonlyArray<{id:string,label:string,icon:string|null,kind:string,
 *   row:number,group:string,char?:string,text?:string}>}
 */
export const VR_KEYBOARD_KEYS = Object.freeze([
  // ---- Row 0 — PRESETS: the only VR text-entry shortcut ---------------------
  // Order and strings match ANNOTATION_LABEL_PRESETS in VRAnnotationTool.js
  // exactly (see the drift-guard test) — kept as literals here rather than an
  // import so this module never pulls in VRAnnotationTool.js's vtk.js deps.
  { id: "kbd-preset-note", label: "Note", icon: null, kind: "kbd-preset", text: "Note", row: 0, group: "KEYS" },
  { id: "kbd-preset-anomaly", label: "Anomaly", icon: null, kind: "kbd-preset", text: "Anomaly", row: 0, group: "KEYS" },
  { id: "kbd-preset-check-this", label: "Check this", icon: null, kind: "kbd-preset", text: "Check this", row: 0, group: "KEYS" },
  { id: "kbd-preset-max", label: "Max", icon: null, kind: "kbd-preset", text: "Max", row: 0, group: "KEYS" },
  { id: "kbd-preset-min", label: "Min", icon: null, kind: "kbd-preset", text: "Min", row: 0, group: "KEYS" },

  // ---- Row 1 — DIGITS -------------------------------------------------------
  { id: "kbd-1", label: "1", icon: null, kind: "kbd-char", char: "1", row: 1, group: "KEYS" },
  { id: "kbd-2", label: "2", icon: null, kind: "kbd-char", char: "2", row: 1, group: "KEYS" },
  { id: "kbd-3", label: "3", icon: null, kind: "kbd-char", char: "3", row: 1, group: "KEYS" },
  { id: "kbd-4", label: "4", icon: null, kind: "kbd-char", char: "4", row: 1, group: "KEYS" },
  { id: "kbd-5", label: "5", icon: null, kind: "kbd-char", char: "5", row: 1, group: "KEYS" },
  { id: "kbd-6", label: "6", icon: null, kind: "kbd-char", char: "6", row: 1, group: "KEYS" },
  { id: "kbd-7", label: "7", icon: null, kind: "kbd-char", char: "7", row: 1, group: "KEYS" },
  { id: "kbd-8", label: "8", icon: null, kind: "kbd-char", char: "8", row: 1, group: "KEYS" },
  { id: "kbd-9", label: "9", icon: null, kind: "kbd-char", char: "9", row: 1, group: "KEYS" },
  { id: "kbd-0", label: "0", icon: null, kind: "kbd-char", char: "0", row: 1, group: "KEYS" },

  // ---- Row 2 — Q W E R T Y U I O P ------------------------------------------
  { id: "kbd-q", label: "Q", icon: null, kind: "kbd-char", char: "q", row: 2, group: "KEYS" },
  { id: "kbd-w", label: "W", icon: null, kind: "kbd-char", char: "w", row: 2, group: "KEYS" },
  { id: "kbd-e", label: "E", icon: null, kind: "kbd-char", char: "e", row: 2, group: "KEYS" },
  { id: "kbd-r", label: "R", icon: null, kind: "kbd-char", char: "r", row: 2, group: "KEYS" },
  { id: "kbd-t", label: "T", icon: null, kind: "kbd-char", char: "t", row: 2, group: "KEYS" },
  { id: "kbd-y", label: "Y", icon: null, kind: "kbd-char", char: "y", row: 2, group: "KEYS" },
  { id: "kbd-u", label: "U", icon: null, kind: "kbd-char", char: "u", row: 2, group: "KEYS" },
  { id: "kbd-i", label: "I", icon: null, kind: "kbd-char", char: "i", row: 2, group: "KEYS" },
  { id: "kbd-o", label: "O", icon: null, kind: "kbd-char", char: "o", row: 2, group: "KEYS" },
  { id: "kbd-p", label: "P", icon: null, kind: "kbd-char", char: "p", row: 2, group: "KEYS" },

  // ---- Row 3 — A S D F G H J K L (9 keys, no punctuation) ------------------
  { id: "kbd-a", label: "A", icon: null, kind: "kbd-char", char: "a", row: 3, group: "KEYS" },
  { id: "kbd-s", label: "S", icon: null, kind: "kbd-char", char: "s", row: 3, group: "KEYS" },
  { id: "kbd-d", label: "D", icon: null, kind: "kbd-char", char: "d", row: 3, group: "KEYS" },
  { id: "kbd-f", label: "F", icon: null, kind: "kbd-char", char: "f", row: 3, group: "KEYS" },
  { id: "kbd-g", label: "G", icon: null, kind: "kbd-char", char: "g", row: 3, group: "KEYS" },
  { id: "kbd-h", label: "H", icon: null, kind: "kbd-char", char: "h", row: 3, group: "KEYS" },
  { id: "kbd-j", label: "J", icon: null, kind: "kbd-char", char: "j", row: 3, group: "KEYS" },
  { id: "kbd-k", label: "K", icon: null, kind: "kbd-char", char: "k", row: 3, group: "KEYS" },
  { id: "kbd-l", label: "L", icon: null, kind: "kbd-char", char: "l", row: 3, group: "KEYS" },

  // ---- Row 4 — Z X C V B N M (7 keys, no punctuation) -----------------------
  { id: "kbd-z", label: "Z", icon: null, kind: "kbd-char", char: "z", row: 4, group: "KEYS" },
  { id: "kbd-x", label: "X", icon: null, kind: "kbd-char", char: "x", row: 4, group: "KEYS" },
  { id: "kbd-c", label: "C", icon: null, kind: "kbd-char", char: "c", row: 4, group: "KEYS" },
  { id: "kbd-v", label: "V", icon: null, kind: "kbd-char", char: "v", row: 4, group: "KEYS" },
  { id: "kbd-b", label: "B", icon: null, kind: "kbd-char", char: "b", row: 4, group: "KEYS" },
  { id: "kbd-n", label: "N", icon: null, kind: "kbd-char", char: "n", row: 4, group: "KEYS" },
  { id: "kbd-m", label: "M", icon: null, kind: "kbd-char", char: "m", row: 4, group: "KEYS" },

  // ---- Row 5 — Shift, Space, Del, Cancel, Save ------------------------------
  { id: "kbd-shift", label: "Shift", icon: "arrowUp", kind: "kbd-shift", row: 5, group: "KEYS" },
  // Non-empty label ("Space", not " ") — see the class-level comment on why a
  // blank label would fail to render at all.
  { id: "kbd-space", label: "Space", icon: null, kind: "kbd-char", char: " ", row: 5, group: "KEYS" },
  { id: "kbd-backspace", label: "Del", icon: "delete", kind: "kbd-backspace", row: 5, group: "KEYS" },
  // Distinct groups so the render layer's accent table gives these two
  // irreversible actions their own colour (see class-level comment above).
  { id: "kbd-cancel", label: "Cancel", icon: "cancel", kind: "kbd-cancel", row: 5, group: "CANCEL" },
  { id: "kbd-confirm", label: "Save", icon: "save", kind: "kbd-confirm", row: 5, group: "CONFIRM" },
]);

/**
 * Total map from every `kbd-char` key's `char` to its shifted form. "Total"
 * here means every char that appears in VR_KEYBOARD_KEYS has an entry —
 * enforced by a drift-guard test — so shiftChar() never has to guess.
 * Digits map to their standard US-keyboard shift symbols; space maps to
 * itself (shift has no effect on it). No punctuation keys exist on this
 * keyboard, so no punctuation entries belong here either.
 * @type {Readonly<Object<string,string>>}
 */
export const SHIFT_MAP = Object.freeze({
  a: "A", b: "B", c: "C", d: "D", e: "E", f: "F", g: "G", h: "H", i: "I", j: "J",
  k: "K", l: "L", m: "M", n: "N", o: "O", p: "P", q: "Q", r: "R", s: "S", t: "T",
  u: "U", v: "V", w: "W", x: "X", y: "Y", z: "Z",
  "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
  "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
  " ": " ",
});

/** Buffer cap the caller (annotation draft state) is expected to enforce. */
export const MAX_ANNOTATION_TEXT = 200;

/**
 * The character actually inserted for a keypress, given the current shift
 * mode. Key CAPS never change (see the module-level design note) — this is
 * the one place shift has any effect.
 *
 * @param {string} ch - a single character, normally a `kbd-char` key's `char`
 * @param {'off'|'once'|'lock'} shiftMode
 * @returns {string} the shifted character, or `ch` unchanged when shift is
 *   'off', `ch` isn't a string, or SHIFT_MAP has no entry for it (never
 *   returns undefined).
 */
export function shiftChar(ch, shiftMode) {
  if (shiftMode !== "once" && shiftMode !== "lock") return ch;
  if (typeof ch !== "string") return ch;
  return SHIFT_MAP[ch] ?? ch;
}

// off -> once -> lock -> off. 'once' is a single shifted keystroke (mirrors a
// physical Shift tap); 'lock' persists until toggled off again (mirrors caps
// lock) — Vision Pro/Quest pinch-only input has no way to hold a modifier
// down, so this tri-state stands in for "hold vs. lock" entirely via taps.
const SHIFT_CYCLE = Object.freeze({ off: "once", once: "lock", lock: "off" });

/**
 * Advances the shift tri-state on a tap of the Shift key.
 * @param {'off'|'once'|'lock'} mode
 * @returns {'off'|'once'|'lock'} unrecognized input defensively resets to 'off'
 */
export function nextShiftMode(mode) {
  return SHIFT_CYCLE[mode] ?? "off";
}

/**
 * Consumes a one-shot shift after the next character is inserted. 'lock'
 * persists across keystrokes; everything else (including already-'off' or
 * unrecognized input) collapses to 'off'.
 * @param {'off'|'once'|'lock'} mode
 * @returns {'off'|'lock'}
 */
export function consumeShift(mode) {
  return mode === "lock" ? "lock" : "off";
}

// Roughly how many trailing characters of the draft fit comfortably on the
// status panel. This clamp is load-bearing, not cosmetic: the consumer
// (VTKVRSpatialUI._redrawStatusLabel) sizes its canvas/plane to whatever
// string it's given with no width ceiling of its own, so an unclamped
// MAX_ANNOTATION_TEXT-length buffer would allocate a ~4000px canvas and a
// metres-wide plane in VR. Clamping here, in pure/testable code, is what
// keeps that from ever happening.
const DRAFT_LINE_CLAMP = 44;

// Static — no blink. A blinking caret would mean re-rendering the status
// label (canvas repaint + texture re-upload) on a timer forever, which would
// defeat _redrawStatusLabel's dirty-check (it only redraws when the text
// actually changes) and cost a resize/upload twice a second for the entire
// life of the annotate tool.
const CARET = "▌";

// Fallback-of-fallback when the caller doesn't supply one. A literal, not an
// import of ANNOTATION_LABEL_PRESETS[0] from VRAnnotationTool.js — that file
// imports vtk.js, and this module must stay free of any VTK dependency, even
// transitively. Kept in sync with ANNOTATION_LABEL_PRESETS[0] by inspection;
// callers are expected to always pass the real pending label as `fallback`.
const DEFAULT_FALLBACK_LABEL = "Note";

/**
 * One-line status readout shown above the keyboard panel while typing.
 *
 * @param {string} text - the in-progress annotation draft
 * @param {{fallback?: string}} [options] - `fallback` is the label Save will
 *   use if the draft is empty (normally the tool's currently-pending preset
 *   label)
 * @returns {string} never throws, even on null/undefined/non-string `text`
 */
export function formatDraftLine(text, { fallback } = {}) {
  const safeFallback =
    typeof fallback === "string" && fallback.length ? fallback : DEFAULT_FALLBACK_LABEL;
  const raw = typeof text === "string" ? text : "";

  if (raw.trim().length === 0) {
    return `Save uses "${safeFallback}"  ${CARET}`;
  }

  const display =
    raw.length > DRAFT_LINE_CLAMP ? `…${raw.slice(raw.length - DRAFT_LINE_CLAMP)}` : raw;
  return `${display} ${CARET}`;
}
