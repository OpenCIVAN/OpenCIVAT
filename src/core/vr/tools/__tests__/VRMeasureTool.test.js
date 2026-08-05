// src/core/vr/tools/__tests__/VRMeasureTool.test.js
// Covers the in-headset measurement visuals (R5): placing two points builds a
// line actor (plus endpoint spheres + distance label) in the renderer, and
// deactivate tears them all down. Uses real vtk.js source/mapper/actor
// construction (jsdom-safe) with a fake spy renderer, mirroring
// VRControllerRenderer.reticle.test.js / VREnvironment.test.js.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRMeasureTool } from "../VRMeasureTool.js";

function makeSpyRenderer() {
  const actors = [];
  return {
    actors,
    addActor: vi.fn((a) => actors.push(a)),
    removeActor: vi.fn((a) => {
      const i = actors.indexOf(a);
      if (i >= 0) actors.splice(i, 1);
    }),
  };
}

function makeInputState({ triggerPressed = false } = {}) {
  return {
    controllers: {
      right: {
        targetRay: { position: { x: 0, y: 0, z: 0 }, matrix: new Array(16).fill(0) },
        triggerPressed,
        thumbstick: { x: 0, y: 0 },
        buttons: {},
      },
    },
  };
}

describe("VRMeasureTool — measurement rendering", () => {
  let tool;
  let renderer;
  let raycastVR;

  beforeEach(async () => {
    tool = new VRMeasureTool();
    renderer = makeSpyRenderer();
    raycastVR = vi
      .fn()
      .mockReturnValueOnce({ position: { x: 0, y: 0, z: 0 } }) // start
      .mockReturnValue({ position: { x: 3, y: 4, z: 0 } }); // end + previews
    await tool.activate({
      handler: { raycastVR },
      vrContext: { vrScale: 2 },
    });
  });

  function placeStart() {
    tool._lastTriggerState = false;
    return tool.handleInput(makeInputState({ triggerPressed: true }), {});
  }
  function placeEnd() {
    tool._lastTriggerState = false;
    return tool.handleInput(makeInputState({ triggerPressed: true }), {});
  }

  it("builds a point marker, a segment line and a distance label for a pair", () => {
    const startAction = placeStart();
    expect(startAction).toMatchObject({ type: "measurement-start-placed" });

    const endAction = placeEnd();
    expect(endAction).toMatchObject({ type: "measurement-created" });
    expect(endAction.data.distance).toBeCloseTo(5); // 3-4-5 triangle

    tool.render(renderer);

    expect(tool.getPoints().length).toBe(2);
    expect(tool.getMeasurements().length).toBe(1);
    expect(tool._segmentActors[0].actor.getVisibility()).toBe(true);
    expect(tool._segmentActors[0].label.getText()).toContain("5.000");
  });

  it("shows only the point marker while the segment is still open", () => {
    placeStart();
    tool.render(renderer);

    expect(tool._pointActors.length).toBe(1);
    expect(tool._pointActors[0].getVisibility()).toBe(true);
    expect(tool._segmentActors.length).toBe(0);
  });

  it("removes every actor on deactivate (shared renderer — a leak breaks desktop)", async () => {
    placeStart();
    placeEnd();
    tool.render(renderer);
    expect(renderer.actors.length).toBeGreaterThan(0);

    await tool.deactivate();

    expect(renderer.actors.length).toBe(0);
    expect(tool._pointActors.length).toBe(0);
    expect(tool._segmentActors.length).toBe(0);
    expect(tool._totalLabel).toBeNull();
  });

  it("scales point markers for constant apparent size (base / vrScale)", () => {
    placeStart();
    placeEnd();
    tool.render(renderer);
    // ENDPOINT_APPARENT_RADIUS_M (0.012) / vrScale (2) = 0.006
    expect(tool._pointActors[0].getScale()[0]).toBeCloseTo(0.006);
  });

  it("recognizes a second pinch as a fresh rising edge when the controller disappears between presses (Vision Pro release)", () => {
    // Gripless/transient-pointer input (Apple Vision Pro) only reports a
    // controller in inputState.controllers.right while a pinch is physically
    // held — release makes it vanish entirely, unlike a tracked controller
    // (Quest) whose object persists with triggerPressed: false. Deliberately
    // does NOT manually reset _lastTriggerState (unlike placeStart/placeEnd
    // above) so the release itself is what has to clear the latch.
    const startAction = tool.handleInput(makeInputState({ triggerPressed: true }), {});
    expect(startAction).toMatchObject({ type: "measurement-start-placed" });

    // Release: the transient-pointer source disappears entirely.
    tool.handleInput({ controllers: {} }, {});

    const endAction = tool.handleInput(makeInputState({ triggerPressed: true }), {});
    expect(endAction).toMatchObject({ type: "measurement-created" });
  });

  it("getMeasurementState reports idle when the tool is not active", async () => {
    // `if (!this.isActive)` (no call) is a bound-method reference, always
    // truthy, so this branch never took — the status line reported
    // 'placing-start' even for a deactivated tool with no points. `isActive()`
    // is the real check (VRToolInterface.js).
    await tool.deactivate();
    expect(tool.getMeasurementState()).toBe("idle");
  });

  it("getMeasurementState reflects point count once active", () => {
    expect(tool.getMeasurementState()).toBe("placing-start");
    placeStart();
    expect(tool.getMeasurementState()).toBe("placing-end");
  });
});

describe("VRMeasureTool — chained polyline", () => {
  let tool;
  let renderer;

  /** Raycast that walks a fixed list of points, one per trigger pull. */
  function makeToolAt(points) {
    const t = new VRMeasureTool();
    let i = 0;
    const raycastVR = vi.fn(() => ({ position: points[Math.min(i, points.length - 1)] }));
    t.activate({ handler: { raycastVR }, vrContext: { vrScale: 1 } });
    t._advance = () => { i += 1; };
    return t;
  }

  function tap(t) {
    t._lastTriggerState = false;
    const r = t.handleInput(makeInputState({ triggerPressed: true }), {});
    t._advance();
    return r;
  }

  beforeEach(() => {
    renderer = makeSpyRenderer();
    // A path along +X: 0 -> 1 -> 3 -> 6, i.e. segments of 1, 2 and 3.
    tool = makeToolAt([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
      { x: 6, y: 0, z: 0 },
    ]);
  });

  it("continues from the previous point instead of starting a fresh pair", () => {
    tap(tool); // 0
    tap(tool); // 1  -> segment 0->1
    tap(tool); // 3  -> segment 1->3

    const segs = tool.getMeasurements();
    expect(segs.length).toBe(2);
    // The crux of chaining: segment 2 STARTS where segment 1 ended.
    expect(segs[1].startPoint).toMatchObject(segs[0].endPoint);
    expect(segs[0].distance).toBeCloseTo(1);
    expect(segs[1].distance).toBeCloseTo(2);
  });

  it("reports a running total across every segment", () => {
    tap(tool); tap(tool); tap(tool); tap(tool);

    expect(tool.getMeasurements().length).toBe(3);
    expect(tool.getTotal()).toBeCloseTo(6); // 1 + 2 + 3
  });

  it("shows the total only once there is more than one segment", () => {
    tap(tool); tap(tool);
    tool.render(renderer);
    expect(tool._totalLabel.getActor().getVisibility()).toBe(false);

    tap(tool);
    tool.render(renderer);
    expect(tool._totalLabel.getActor().getVisibility()).toBe(true);
    expect(tool._totalLabel.getText()).toContain("3.000");
  });

  it("undo pops ONE point and returns the segment it removed", () => {
    tap(tool); tap(tool); tap(tool);
    expect(tool.getPoints().length).toBe(3);

    const undone = tool.undoLast();
    expect(undone).toMatchObject({ type: "measurement-removed" });
    expect(undone.data.distance).toBeCloseTo(2);
    expect(tool.getPoints().length).toBe(2);
    expect(tool.getMeasurements().length).toBe(1);
  });

  it("undo of a lone start point cancels rather than removing a segment", () => {
    tap(tool);
    expect(tool.undoLast()).toMatchObject({ type: "measurement-cancelled" });
    expect(tool.getPoints().length).toBe(0);
  });

  it("undo on an empty path is a no-op", () => {
    expect(tool.undoLast()).toBeNull();
  });

  it("releases actors as the path shrinks", () => {
    tap(tool); tap(tool); tap(tool);
    tool.render(renderer);
    const peak = renderer.actors.length;

    tool.undoLast();
    tool.render(renderer);

    expect(renderer.actors.length).toBeLessThan(peak);
    expect(tool._pointActors.length).toBe(2);
    expect(tool._segmentActors.length).toBe(1);
  });

  it("newPath archives the current path and starts clean", () => {
    tap(tool); tap(tool); tap(tool);

    const done = tool.newPath();
    expect(done).toMatchObject({ type: "measurement-path-completed" });
    expect(done.data.segments.length).toBe(2);
    expect(done.data.total).toBeCloseTo(3);

    expect(tool.getPoints().length).toBe(0);
    expect(tool.getMeasurements().length).toBe(0);
    expect(tool.getPaths().length).toBe(1);
  });

  it("newPath on an empty path is a no-op", () => {
    expect(tool.newPath()).toBeNull();
  });

  it("emits a payload shaped for _persistVRMeasurement, unchanged by chaining", () => {
    tap(tool);
    const action = tap(tool);

    // VRExplorationManager._persistVRMeasurement reads exactly these fields,
    // which is why chaining needed no persistence changes.
    expect(action.data).toMatchObject({
      id: expect.any(String),
      startPoint: { x: 0, y: 0, z: 0 },
      endPoint: { x: 1, y: 0, z: 0 },
      unit: "units",
    });
    expect(action.data.distance).toBeCloseTo(1);
  });

  it("does NOT emit a preview action every frame", () => {
    // The old tool returned a `measurement-preview` action per frame — a
    // dispatch and a log line at 90 Hz that no handler consumed.
    tap(tool);
    for (let i = 0; i < 6; i++) {
      const r = tool.handleInput(makeInputState({ triggerPressed: false }), {});
      expect(r).toBeNull();
    }
  });

  it("caps the path length rather than growing actors without bound", () => {
    for (let i = 0; i < 70; i++) tap(tool);
    expect(tool.getPoints().length).toBeLessThanOrEqual(64);
  });
});
