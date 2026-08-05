// src/core/vr/VRValueEditorModel.js
//
// One numeric stepper, retargetable, serving every adjustable value in VR.
//
// WHY ONE STEPPER: the spatial menu is a fixed UV grid of cards. Giving point
// size, line width, threshold min, threshold max, isovalue and iso opacity each
// their own control would not fit, and would keep not fitting as filters are
// added. Instead a single four-button row (Target / − / + / Reset) is shared by
// every drawer, and `value-target` cycles which parameter it drives.
//
// WHY BUTTONS AND NOT A THUMBSTICK: VRExplorationManager._gatherInputState
// hardcodes `thumbstick:{x:0,y:0}`, `squeezePressed:false` and
// `buttons:{a:false,b:false}` for Vision Pro transient pointers. A
// thumbstick-driven value control would simply not exist on that headset.
// Discrete taps use the trigger/pinch — the one input guaranteed on both Quest
// and Vision Pro, and the one the input-arbitration layer already reserves for
// menu interaction.
//
// Pure logic, no VTK and no React, so it can be unit-tested like
// VRSpatialMenuModel. Every manager call is guarded: a partial manager (or no
// active session) yields an inert editor rather than a throw inside the XR
// frame loop.

import { vr as log } from '@Utils/logger.js';

// Range-bound targets divide their span into this many steps.
const STEPS_PER_RANGE = 100;
const COARSE_MULTIPLIER = 10;

/**
 * Target definitions. `get`/`set` receive the manager so nothing here holds
 * state of its own — the feature modules remain the single source of truth.
 *
 * `min`/`max` may be functions for targets whose range depends on the loaded
 * data (isovalue follows the scalar range; threshold follows its array).
 * @type {ReadonlyArray<object>}
 */
const TARGETS = Object.freeze([
  {
    id: 'point-size',
    label: 'Point Size',
    min: 1,
    max: 20,
    step: 1,
    defaultValue: 1,
    // Only meaningful when you can actually see the points.
    available: (m) => m.getRepresentation?.() === 'points',
    get: (m) => m.getPointSize?.(),
    set: (m, v) => m.setPointSize?.(v),
  },
  {
    id: 'line-width',
    label: 'Line Width',
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 1,
    available: (m) => m.getRepresentation?.() === 'wireframe',
    get: (m) => m.getLineWidth?.(),
    set: (m, v) => m.setLineWidth?.(v),
  },
  {
    id: 'threshold-min',
    label: 'Threshold Min',
    available: (m) => !!m.isThresholdEnabled?.(),
    range: (m) => m.getThresholdState?.()?.range,
    get: (m) => m.getThresholdState?.()?.minValue,
    set: (m, v) => m.setThresholdMin?.(v),
  },
  {
    id: 'threshold-max',
    label: 'Threshold Max',
    available: (m) => !!m.isThresholdEnabled?.(),
    range: (m) => m.getThresholdState?.()?.range,
    get: (m) => m.getThresholdState?.()?.maxValue,
    set: (m, v) => m.setThresholdMax?.(v),
  },
  {
    id: 'isovalue',
    label: 'Isovalue',
    available: (m) => !!m.isIsosurfaceEnabled?.(),
    range: (m) => m.getIsosurfaceState?.()?.scalarRange,
    get: (m) => m.getIsosurfaceState?.()?.isovalue,
    set: (m, v) => m.setIsovalue?.(v),
  },
  {
    id: 'iso-opacity',
    label: 'Surface Opacity',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 1,
    available: (m) => !!m.isIsosurfaceEnabled?.(),
    get: (m) => m.getIsosurfaceState?.()?.opacity,
    set: (m, v) => m.setIsosurfaceOpacity?.(v),
  },
]);

export class VRValueEditorModel {
  /**
   * @param {object} manager - VRExplorationManager (or any partial stand-in)
   */
  constructor(manager) {
    this._manager = manager || null;
    this._activeTargetId = null;
  }

  /**
   * Every target with its resolved range and availability for the current
   * dataset/filter state.
   * @returns {Array<object>}
   */
  getTargets() {
    return TARGETS.map((t) => this._resolve(t));
  }

  /**
   * The target the stepper currently drives. Falls back to the first available
   * one so the stepper is never pointed at nothing on first use.
   * @returns {object|null}
   */
  getActiveTarget() {
    const resolved = this.getTargets();
    const current = resolved.find((t) => t.id === this._activeTargetId);
    if (current?.available) return current;
    return resolved.find((t) => t.available) || null;
  }

  /**
   * Advance to the next AVAILABLE target, wrapping. Unavailable targets are
   * skipped rather than shown-and-inert: cycling onto "Isovalue" with no volume
   * loaded would look like a broken button.
   * @returns {string|null} the new target id
   */
  cycleTarget() {
    const resolved = this.getTargets();
    const usable = resolved.filter((t) => t.available);
    if (!usable.length) return null;

    const activeId = this.getActiveTarget()?.id ?? null;
    const idx = usable.findIndex((t) => t.id === activeId);
    const next = usable[(idx + 1) % usable.length];
    this._activeTargetId = next.id;
    return next.id;
  }

  /**
   * Step the active target's value.
   * @param {number} steps - signed; magnitude > 1 uses the coarse step
   * @returns {number|null} the new value, or null if nothing is adjustable
   */
  nudge(steps) {
    const target = this.getActiveTarget();
    if (!target || !Number.isFinite(steps) || steps === 0) return null;

    const current = Number(target.value);
    if (!Number.isFinite(current)) return null;

    // |steps| === 1 is a fine nudge; anything larger is the coarse step (a
    // long-press or a dedicated coarse button), not N fine steps.
    const delta =
      Math.abs(steps) > 1 ? target.coarseStep : target.step;
    const next = this._clamp(current + Math.sign(steps) * delta, target.min, target.max);
    return this._apply(target, next);
  }

  /**
   * Restore the active target to its default (or the low end of its range for
   * data-derived targets, which have no fixed default).
   * @returns {number|null} the restored value
   */
  reset() {
    const target = this.getActiveTarget();
    if (!target) return null;
    const fallback = Number.isFinite(target.defaultValue)
      ? target.defaultValue
      : target.min;
    if (!Number.isFinite(fallback)) return null;
    return this._apply(target, fallback);
  }

  /**
   * One-line readout for the panel's status line, e.g.
   * "Isovalue  1284.0  [1000 … 3071]".
   * @returns {string}
   */
  getReadout() {
    const target = this.getActiveTarget();
    if (!target) return '';

    const value = Number(target.value);
    const shown = Number.isFinite(value) ? this._format(value, target) : '—';
    const lo = Number.isFinite(target.min) ? this._format(target.min, target) : null;
    const hi = Number.isFinite(target.max) ? this._format(target.max, target) : null;
    const range = lo !== null && hi !== null ? `  [${lo} … ${hi}]` : '';

    return `${target.label}  ${shown}${range}`;
  }

  // ---------------------------------------------------------------------------

  /**
   * Fill in a target's live range, value and availability from the manager.
   * @private
   */
  _resolve(t) {
    const m = this._manager;
    let min = t.min;
    let max = t.max;

    if (typeof t.range === 'function') {
      const r = this._guard(() => t.range(m));
      if (Array.isArray(r) && r.length >= 2 && Number.isFinite(r[0]) && Number.isFinite(r[1])) {
        [min, max] = r;
      }
    }

    // Data-derived targets get a step proportional to their span, so one tap
    // moves a visible amount whether the range is 0..1 or 0..3071.
    const span = Number.isFinite(min) && Number.isFinite(max) ? max - min : null;
    const step = Number.isFinite(t.step)
      ? t.step
      : span && span > 0
      ? span / STEPS_PER_RANGE
      : 1;

    return {
      ...t,
      min,
      max,
      step,
      coarseStep: step * COARSE_MULTIPLIER,
      value: this._guard(() => t.get(m)),
      available: !!m && this._guard(() => t.available(m)) === true,
    };
  }

  /** @private Write a value back through the manager. */
  _apply(target, value) {
    const ok = this._guard(() => {
      target.set(this._manager, value);
      return true;
    });
    return ok === true ? value : null;
  }

  /** @private */
  _clamp(v, min, max) {
    let out = v;
    if (Number.isFinite(min)) out = Math.max(min, out);
    if (Number.isFinite(max)) out = Math.min(max, out);
    return out;
  }

  /**
   * @private Integer-ish targets read better without decimals; fine-grained
   * ones need them.
   */
  _format(v, target) {
    if (target.step >= 1) return String(Math.round(v));
    if (target.step >= 0.01) return v.toFixed(2);
    return v.toFixed(3);
  }

  /**
   * @private Never let a partial manager or a feature throw inside the XR frame
   * loop — the same defensive contract as VRSpatialMenuModel._call.
   */
  _guard(fn) {
    try {
      return fn();
    } catch (err) {
      log.warn(`VR value editor call failed: ${err?.message}`);
      return undefined;
    }
  }
}

export { TARGETS as VR_VALUE_TARGETS };
export default VRValueEditorModel;
