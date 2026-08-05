// src/core/vr/__tests__/VRValueEditorModel.test.js
//
// The shared numeric stepper: one retargetable control driving every adjustable
// value in VR (point size, line width, threshold bounds, isovalue, opacity).
//
// Pure logic, no VTK — same contract as VRSpatialMenuModel. The key behaviours
// pinned here are the ones that would otherwise produce dead or dangerous
// buttons in-headset: skipping unavailable targets (so cycling never lands on
// "Isovalue" with no volume loaded), clamping at both ends, and never throwing
// on a partial manager (a throw here lands inside the XR frame loop).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRValueEditorModel } from "../VRValueEditorModel.js";

/**
 * Manager stub. Defaults put the dataset in `points` representation with both
 * filters off, so exactly one target (point-size) is available.
 */
function makeManager(overrides = {}) {
  const state = { pointSize: 4, lineWidth: 2, isovalue: 1500, isoOpacity: 1 };
  return {
    _state: state,
    getRepresentation: vi.fn(() => "points"),
    getPointSize: vi.fn(() => state.pointSize),
    setPointSize: vi.fn((v) => { state.pointSize = v; }),
    getLineWidth: vi.fn(() => state.lineWidth),
    setLineWidth: vi.fn((v) => { state.lineWidth = v; }),
    isThresholdEnabled: vi.fn(() => false),
    getThresholdState: vi.fn(() => null),
    setThresholdMin: vi.fn(),
    setThresholdMax: vi.fn(),
    isIsosurfaceEnabled: vi.fn(() => false),
    getIsosurfaceState: vi.fn(() => null),
    setIsovalue: vi.fn((v) => { state.isovalue = v; }),
    setIsosurfaceOpacity: vi.fn((v) => { state.isoOpacity = v; }),
    ...overrides,
  };
}

describe("VRValueEditorModel — targeting", () => {
  let manager;
  let editor;

  beforeEach(() => {
    manager = makeManager();
    editor = new VRValueEditorModel(manager);
  });

  it("defaults to the first available target rather than nothing", () => {
    expect(editor.getActiveTarget()?.id).toBe("point-size");
  });

  it("marks point-size available only in points representation", () => {
    const byId = (m) =>
      Object.fromEntries(
        new VRValueEditorModel(m).getTargets().map((t) => [t.id, t.available])
      );

    expect(byId(makeManager({ getRepresentation: () => "points" }))["point-size"]).toBe(true);
    expect(byId(makeManager({ getRepresentation: () => "surface" }))["point-size"]).toBe(false);
    expect(byId(makeManager({ getRepresentation: () => "wireframe" }))["line-width"]).toBe(true);
  });

  it("cycleTarget SKIPS unavailable targets", () => {
    // Threshold on with a range; isosurface still off.
    const m = makeManager({
      getRepresentation: () => "surface", // point-size + line-width unavailable
      isThresholdEnabled: () => true,
      getThresholdState: () => ({ range: [0, 100], minValue: 10, maxValue: 90 }),
    });
    const e = new VRValueEditorModel(m);

    const seen = new Set();
    for (let i = 0; i < 6; i++) seen.add(e.cycleTarget());

    expect(seen).toEqual(new Set(["threshold-min", "threshold-max"]));
    expect(seen.has("isovalue")).toBe(false);
    expect(seen.has("point-size")).toBe(false);
  });

  it("returns null from cycleTarget when nothing is adjustable", () => {
    const e = new VRValueEditorModel(makeManager({ getRepresentation: () => "surface" }));
    expect(e.cycleTarget()).toBeNull();
    expect(e.getActiveTarget()).toBeNull();
  });
});

describe("VRValueEditorModel — nudging", () => {
  let manager;
  let editor;

  beforeEach(() => {
    manager = makeManager();
    editor = new VRValueEditorModel(manager);
  });

  it("steps up and down by the target's step", () => {
    expect(editor.nudge(1)).toBe(5); // 4 -> 5, step 1
    expect(manager.setPointSize).toHaveBeenCalledWith(5);
    expect(editor.nudge(-1)).toBe(4);
  });

  it("clamps at both ends instead of running away", () => {
    manager._state.pointSize = 20; // max
    expect(editor.nudge(1)).toBe(20);

    manager._state.pointSize = 1; // min
    expect(editor.nudge(-1)).toBe(1);
  });

  it("uses the coarse step for |steps| > 1, not N fine steps", () => {
    manager._state.pointSize = 4;
    // coarseStep = step * 10 = 10, clamped to max 20.
    expect(editor.nudge(3)).toBe(14);
  });

  it("derives a proportional step for data-derived ranges", () => {
    // A 0..3071 isovalue range must not step by 1 — that would need 3000 taps.
    const m = makeManager({
      isIsosurfaceEnabled: () => true,
      getIsosurfaceState: () => ({ scalarRange: [0, 3000], isovalue: 1500, opacity: 1 }),
    });
    const e = new VRValueEditorModel(m);
    while (e.getActiveTarget()?.id !== "isovalue") e.cycleTarget();

    expect(e.nudge(1)).toBe(1530); // span/100 = 30
    expect(m.setIsovalue).toHaveBeenCalledWith(1530);
  });

  it("ignores zero and non-finite step counts", () => {
    expect(editor.nudge(0)).toBeNull();
    expect(editor.nudge(NaN)).toBeNull();
    expect(manager.setPointSize).not.toHaveBeenCalled();
  });

  it("returns null when the current value cannot be read", () => {
    const e = new VRValueEditorModel(makeManager({ getPointSize: () => undefined }));
    expect(e.nudge(1)).toBeNull();
  });
});

describe("VRValueEditorModel — reset and readout", () => {
  it("reset restores the target's default", () => {
    const manager = makeManager();
    manager._state.pointSize = 12;
    const editor = new VRValueEditorModel(manager);

    expect(editor.reset()).toBe(1);
    expect(manager.setPointSize).toHaveBeenCalledWith(1);
  });

  it("reset falls back to the low end for data-derived targets", () => {
    const m = makeManager({
      isIsosurfaceEnabled: () => true,
      getIsosurfaceState: () => ({ scalarRange: [100, 900], isovalue: 500, opacity: 1 }),
    });
    const e = new VRValueEditorModel(m);
    while (e.getActiveTarget()?.id !== "isovalue") e.cycleTarget();

    expect(e.reset()).toBe(100);
  });

  it("readout names the value, its number, and its range", () => {
    const editor = new VRValueEditorModel(makeManager());
    expect(editor.getReadout()).toBe("Point Size  4  [1 … 20]");
  });

  it("readout shows decimals only for fine-grained targets", () => {
    const m = makeManager({
      getRepresentation: () => "surface",
      isIsosurfaceEnabled: () => true,
      getIsosurfaceState: () => ({ scalarRange: [0, 1], isovalue: 0.5, opacity: 0.35 }),
    });
    const e = new VRValueEditorModel(m);
    while (e.getActiveTarget()?.id !== "iso-opacity") e.cycleTarget();

    expect(e.getReadout()).toBe("Surface Opacity  0.35  [0.00 … 1.00]");
  });

  it("readout is empty when nothing is adjustable", () => {
    const e = new VRValueEditorModel(makeManager({ getRepresentation: () => "surface" }));
    expect(e.getReadout()).toBe("");
  });
});

describe("VRValueEditorModel — defensive contract", () => {
  it("never throws with a bare manager", () => {
    const e = new VRValueEditorModel({});
    expect(() => e.getTargets()).not.toThrow();
    expect(e.cycleTarget()).toBeNull();
    expect(e.nudge(1)).toBeNull();
    expect(e.reset()).toBeNull();
    expect(e.getReadout()).toBe("");
  });

  it("never throws with no manager at all", () => {
    const e = new VRValueEditorModel(null);
    expect(() => e.getTargets()).not.toThrow();
    expect(e.getActiveTarget()).toBeNull();
  });

  it("swallows a throwing manager rather than breaking the XR frame loop", () => {
    const e = new VRValueEditorModel(
      makeManager({
        getRepresentation: () => "points",
        setPointSize: vi.fn(() => { throw new Error("boom"); }),
      })
    );
    expect(() => e.nudge(1)).not.toThrow();
    expect(e.nudge(1)).toBeNull(); // reports failure rather than a phantom value
  });
});
