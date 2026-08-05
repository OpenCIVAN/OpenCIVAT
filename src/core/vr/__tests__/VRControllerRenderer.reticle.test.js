// src/core/vr/__tests__/VRControllerRenderer.reticle.test.js
// Hit-point reticle: shows at the raycast hit for ANY controller input type,
// hides on miss / missing raycast. Used to be Vision Pro (transient-pointer)
// only, on the assumption that a tracked controller's persistent ray line was
// "feedback enough" — it isn't, since that ray is drawn at a fixed length
// regardless of whether the raycast actually hits anything. A Quest user had
// no way to tell "will my trigger register here" before pulling it.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRControllerRenderer } from "../VRControllerRenderer.js";

function makeRenderer() {
  const actors = [];
  return {
    addActor: vi.fn((a) => actors.push(a)),
    removeActor: vi.fn((a) => {
      const i = actors.indexOf(a);
      if (i >= 0) actors.splice(i, 1);
    }),
    _actors: actors,
  };
}

function transientInput(overrides = {}) {
  return {
    controllers: {
      right: {
        pose: {
          position: { x: 0, y: 1.5, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        targetRay: { position: { x: 0, y: 1.5, z: 0 }, matrix: null },
        targetRayMode: "transient-pointer",
        triggerPressed: false,
        ...overrides,
      },
      left: null,
    },
    hands: {},
  };
}

describe("VRControllerRenderer gaze reticle", () => {
  let renderer;

  beforeEach(() => {
    renderer = makeRenderer();
  });

  it("shows the reticle at the raycast hit for transient-pointer input", () => {
    const raycast = vi.fn(() => ({ hit: true, position: { x: 1, y: 2, z: 3 } }));
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 1, raycast });

    ctrl.update(transientInput());

    expect(raycast).toHaveBeenCalled();
    expect(ctrl._reticle).not.toBeNull();
    expect(ctrl._reticle.getVisibility()).toBe(true);
    expect(ctrl._reticle.getPosition()).toEqual([1, 2, 3]);
  });

  it("hides the reticle on a raycast miss", () => {
    const raycast = vi.fn(() => null);
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 1, raycast });

    ctrl.update(transientInput());
    expect(ctrl._reticle?.getVisibility() ?? false).toBe(false);
  });

  it("also shows the reticle at the raycast hit for tracked-pointer (Quest) controllers", () => {
    const raycast = vi.fn(() => ({ hit: true, position: { x: 1, y: 2, z: 3 } }));
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 1, raycast });

    ctrl.update(transientInput({ targetRayMode: "tracked-pointer" }));

    expect(raycast).toHaveBeenCalled();
    expect(ctrl._reticle).not.toBeNull();
    expect(ctrl._reticle.getVisibility()).toBe(true);
    expect(ctrl._reticle.getPosition()).toEqual([1, 2, 3]);
  });

  it("hides the reticle on a raycast miss for a tracked-pointer controller too", () => {
    const raycast = vi.fn(() => null);
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 1, raycast });

    ctrl.update(transientInput({ targetRayMode: "tracked-pointer" }));
    expect(ctrl._reticle?.getVisibility() ?? false).toBe(false);
  });

  it("does nothing without an injected raycast", () => {
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 1 });
    expect(() => ctrl.update(transientInput())).not.toThrow();
    expect(ctrl._reticle).toBeNull();
  });

  it("scales the reticle by 1/vrScale and survives a throwing raycast", () => {
    const raycast = vi
      .fn()
      .mockImplementationOnce(() => ({ hit: true, position: { x: 0, y: 0, z: 0 } }))
      .mockImplementationOnce(() => {
        throw new Error("picker exploded");
      });
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 2, raycast });

    ctrl.update(transientInput());
    expect(ctrl._reticle.getScale()[0]).toBeCloseTo(0.005);

    expect(() => ctrl.update(transientInput())).not.toThrow();
    expect(ctrl._reticle.getVisibility()).toBe(false);
  });

  it("dispose removes the reticle actor", () => {
    const raycast = vi.fn(() => ({ hit: true, position: { x: 0, y: 0, z: 0 } }));
    const ctrl = new VRControllerRenderer(renderer, { vrScale: 1, raycast });
    ctrl.update(transientInput());
    const reticle = ctrl._reticle;

    ctrl.dispose();
    expect(renderer.removeActor).toHaveBeenCalledWith(reticle);
    expect(ctrl._reticle).toBeNull();
  });
});
