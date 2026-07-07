// src/core/vr/__tests__/VRSpatialMenuModel.test.js
// Logic-layer tests for the in-VR spatial tool menu: button layout / hit
// regions, action dispatch (button id → manager call), and show/hide on VR
// session start/end. The VTK rendering is intentionally not exercised here —
// VTKVRSpatialUI is a thin geometry wrapper over this model.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRSpatialMenuModel, VR_MENU_BUTTONS } from "../VRSpatialMenuModel.js";

/** Minimal manager stub matching the methods the model calls. */
function makeManager(overrides = {}) {
  return {
    activateTool: vi.fn(),
    deactivateTool: vi.fn(),
    getActiveTool: vi.fn(() => null),
    undoLastToolAction: vi.fn(() => true),
    toggleIsolation: vi.fn(() => true),
    isIsolated: vi.fn(() => false),
    leaveSession: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe("VRSpatialMenuModel — layout & hit testing", () => {
  let model;
  beforeEach(() => {
    model = new VRSpatialMenuModel(makeManager());
  });

  it("lays out one non-overlapping cell per button, left→right in [0,1]", () => {
    const layout = model.getButtonLayout();
    expect(layout).toHaveLength(VR_MENU_BUTTONS.length);

    for (const r of layout) {
      expect(r.u0).toBeGreaterThanOrEqual(0);
      expect(r.u1).toBeLessThanOrEqual(1);
      expect(r.u0).toBeLessThan(r.u1);
      expect(r.v0).toBeLessThan(r.v1);
    }
    // Strictly increasing, non-overlapping (padding leaves gaps between cells)
    for (let i = 1; i < layout.length; i++) {
      expect(layout[i].u0).toBeGreaterThan(layout[i - 1].u1);
    }
  });

  it("hitTest maps a cell center back to that button", () => {
    for (const r of model.getButtonLayout()) {
      const hit = model.hitTest(r.cu, r.cv);
      expect(hit?.id).toBe(r.id);
    }
  });

  it("hitTest returns null off-panel, in gaps, and for non-finite input", () => {
    expect(model.hitTest(-0.1, 0.5)).toBeNull();
    expect(model.hitTest(0.5, 1.2)).toBeNull();
    expect(model.hitTest(NaN, 0.5)).toBeNull();
    // A point in the vertical padding band (below v0) is a miss
    const r = model.getButtonLayout()[0];
    expect(model.hitTest(r.cu, r.v0 - 0.01)).toBeNull();
  });

  it("first and last buttons are annotate and exit", () => {
    const layout = model.getButtonLayout();
    expect(layout[0].id).toBe("annotate");
    expect(layout[layout.length - 1].id).toBe("exit");
  });
});

describe("VRSpatialMenuModel — action dispatch", () => {
  let manager;
  let model;
  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
  });

  it("tapping a tool activates it; tapping again deactivates (toggle)", () => {
    const r1 = model.activate("annotate");
    expect(r1).toMatchObject({ handled: true, action: "tool-activated", toolId: "annotate" });
    expect(manager.activateTool).toHaveBeenCalledWith("annotate");
    expect(model.getActiveToolId()).toBe("annotate");

    const r2 = model.activate("annotate");
    expect(r2).toMatchObject({ handled: true, action: "tool-deactivated", toolId: null });
    expect(manager.deactivateTool).toHaveBeenCalledTimes(1);
    expect(model.getActiveToolId()).toBeNull();
  });

  it("switching tools deactivates the old and activates the new", () => {
    model.activate("annotate");
    manager.activateTool.mockClear();
    const r = model.activate("measure");
    expect(r.toolId).toBe("measure");
    expect(manager.activateTool).toHaveBeenCalledWith("measure");
    expect(model.getActiveToolId()).toBe("measure");
  });

  it("undo routes through manager.undoLastToolAction", () => {
    const r = model.activate("undo");
    expect(manager.undoLastToolAction).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "undo", undone: true });
  });

  it("isolation toggle routes through manager.toggleIsolation (B-button path)", () => {
    manager.toggleIsolation.mockReturnValueOnce(true);
    const r = model.activate("isolation");
    expect(manager.toggleIsolation).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "isolation-toggled", isolated: true });
    expect(model.isIsolated()).toBe(true);
  });

  it("exit calls manager.leaveSession", () => {
    const r = model.activate("exit");
    expect(manager.leaveSession).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "exit" });
  });

  it("unknown button id is a no-op", () => {
    const r = model.activate("nope");
    expect(r).toEqual({ handled: false });
    expect(manager.activateTool).not.toHaveBeenCalled();
  });

  it("tolerates a manager missing methods (partial mock, no active session)", () => {
    const bare = new VRSpatialMenuModel({});
    expect(() => bare.activate("annotate")).not.toThrow();
    expect(() => bare.activate("undo")).not.toThrow();
    expect(() => bare.activate("isolation")).not.toThrow();
    expect(() => bare.activate("exit")).not.toThrow();
  });

  it("swallows a rejected leaveSession promise", () => {
    const rejecting = makeManager({ leaveSession: vi.fn(() => Promise.reject(new Error("x"))) });
    const m = new VRSpatialMenuModel(rejecting);
    expect(() => m.activate("exit")).not.toThrow();
  });
});

describe("VRSpatialMenuModel — show/hide on session lifecycle", () => {
  let manager;
  let model;
  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
  });

  it("is hidden until a session starts, and hidden again after it ends", () => {
    expect(model.isVisible()).toBe(false);
    model.onSessionStart();
    expect(model.isVisible()).toBe(true);
    model.onSessionEnd();
    expect(model.isVisible()).toBe(false);
  });

  it("onSessionStart pulls active tool + isolation state from the manager", () => {
    manager.getActiveTool.mockReturnValue({ id: "measure" });
    manager.isIsolated.mockReturnValue(true);
    model.onSessionStart();
    expect(model.getActiveToolId()).toBe("measure");
    expect(model.isIsolated()).toBe(true);
  });

  it("onSessionEnd clears transient highlight state", () => {
    manager.getActiveTool.mockReturnValue({ id: "annotate" });
    model.onSessionStart();
    model.onSessionEnd();
    expect(model.getActiveToolId()).toBeNull();
    expect(model.isIsolated()).toBe(false);
  });
});

describe("VRSpatialMenuModel — state reflection for render layer", () => {
  it("getButtonStates marks the active tool and isolation as active", () => {
    const manager = makeManager({
      getActiveTool: vi.fn(() => ({ id: "measure" })),
      isIsolated: vi.fn(() => true),
    });
    const model = new VRSpatialMenuModel(manager);
    model.syncFromManager();

    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(states.measure).toBe(true);
    expect(states.annotate).toBe(false);
    expect(states.isolation).toBe(true);
    expect(states.undo).toBe(false);
    expect(states.exit).toBe(false);
  });

  it("syncFromManager treats a null active tool as nothing selected", () => {
    const model = new VRSpatialMenuModel(makeManager({ getActiveTool: vi.fn(() => null) }));
    model.syncFromManager();
    expect(model.getActiveToolId()).toBeNull();
  });
});
