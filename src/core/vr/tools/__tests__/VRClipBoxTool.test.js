// src/core/vr/tools/__tests__/VRClipBoxTool.test.js
//
// The clip tool had TWO independent reasons it did nothing:
//   1. VTKClippingFeature.enableClipping bailed without a widgetManager, which
//      was never assigned anywhere in the repo (fixed separately).
//   2. Aiming was gated on ctrl.squeezePressed — grip — which
//      VRExplorationManager._gatherInputState hardcodes to FALSE for Vision Pro
//      transient pointers. So even with (1) fixed, the tool was permanently
//      dead on that headset.
//
// The Vision Pro cases below are the regression guard for (2): they drive the
// tool with a controller shaped exactly as _gatherInputState builds one for a
// transient pointer (no grip, no thumbstick, no A/B) and assert the plane still
// moves.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

// vi.hoisted, because vi.mock's factory is lifted above ordinary top-level
// consts — referencing one directly throws "Cannot access before initialization".
const { clippingFeature } = vi.hoisted(() => ({
  clippingFeature: {
    enableClipping: vi.fn(),
    setPlaneData: vi.fn(),
    getPlaneData: vi.fn(() => ({ origin: [0, 0, 0], normal: [0, 0, 1] })),
    invertClipping: vi.fn(),
    resetPlane: vi.fn(),
  },
}));
vi.mock("@Core/instances/types/vtk/features/index.js", () => ({
  vtkClippingFeature: clippingFeature,
}));

import { VRClipBoxTool } from "../VRClipBoxTool.js";

/** A Vision Pro transient pointer, exactly as _gatherInputState builds it. */
function visionProController({ triggerPressed = false } = {}) {
  return {
    targetRay: { position: { x: 0, y: 0, z: 0 }, matrix: new Array(16).fill(0) },
    pose: { position: { x: 1, y: 2, z: 3 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    triggerPressed,
    squeezePressed: false, // no grip on Vision Pro
    squeezeValue: 0,
    thumbstick: { x: 0, y: 0 }, // no thumbstick
    buttons: { a: false, b: false }, // no face buttons
    isTransientPointer: true,
  };
}

/** A Quest controller: grip and face buttons present. */
function questController({ triggerPressed = false, squeezePressed = false, a = false, b = false } = {}) {
  return {
    targetRay: { position: { x: 0, y: 0, z: 0 }, matrix: new Array(16).fill(0) },
    pose: { position: { x: 1, y: 2, z: 3 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    triggerPressed,
    squeezePressed,
    squeezeValue: squeezePressed ? 1 : 0,
    thumbstick: { x: 0, y: 0 },
    buttons: { a, b },
    isTransientPointer: false,
  };
}

const inputWith = (right, left = null) => ({ controllers: { right, left } });

async function makeTool() {
  const tool = new VRClipBoxTool();
  await tool.activate({
    handler: {},
    vrContext: {
      instanceId: "inst-1",
      vrScale: 1,
      vrOrigin: [0, 0, 0],
      dataBounds: [0, 1, 0, 1, 0, 1],
    },
  });
  return tool;
}

beforeEach(() => {
  vi.clearAllMocks();
  clippingFeature.getPlaneData.mockReturnValue({ origin: [0, 0, 0], normal: [0, 0, 1] });
});

describe("VRClipBoxTool — activation", () => {
  it("always enables clipping in MANUAL mode", async () => {
    // The widget path needs a mouse interactor and would add widget actors to
    // the renderer VR shares with the desktop canvas.
    await makeTool();
    expect(clippingFeature.enableClipping).toHaveBeenCalledWith("inst-1", { manual: true });
  });
});

describe("VRClipBoxTool — aiming works on Vision Pro (no grip)", () => {
  let tool;
  beforeEach(async () => { tool = await makeTool(); });

  it("starts aiming on TRIGGER, not grip", () => {
    const action = tool.handleInput(inputWith(visionProController({ triggerPressed: true })));
    expect(action).toMatchObject({ type: "clip-grab-start" });
  });

  it("moves the plane while the trigger is held", () => {
    tool.handleInput(inputWith(visionProController({ triggerPressed: true })));
    const action = tool.handleInput(inputWith(visionProController({ triggerPressed: true })));

    expect(clippingFeature.setPlaneData).toHaveBeenCalled();
    expect(action).toMatchObject({ type: "clip-box-updated", data: { final: false } });
  });

  it("signals a final update on release, so the plane syncs once", () => {
    tool.handleInput(inputWith(visionProController({ triggerPressed: true })));
    tool.handleInput(inputWith(visionProController({ triggerPressed: true })));
    const action = tool.handleInput(inputWith(visionProController({ triggerPressed: false })));

    expect(action).toMatchObject({ type: "clip-box-updated", data: { final: true } });
  });

  it("does NOT respond to grip, which would fight world-grab on Quest", () => {
    const gripOnly = questController({ squeezePressed: true, triggerPressed: false });
    expect(tool.handleInput(inputWith(gripOnly))).toBeNull();
    expect(clippingFeature.setPlaneData).not.toHaveBeenCalled();
  });
});

describe("VRClipBoxTool — axis lock", () => {
  let tool;
  beforeEach(async () => { tool = await makeTool(); });

  it("cycles free -> X -> Y -> Z -> free", () => {
    expect(tool.getAxisLock()).toBeNull();
    tool.cycleAxisLock();
    expect(tool.getAxisLock()).toBe("x");
    tool.cycleAxisLock();
    expect(tool.getAxisLock()).toBe("y");
    tool.cycleAxisLock();
    expect(tool.getAxisLock()).toBe("z");
    tool.cycleAxisLock();
    expect(tool.getAxisLock()).toBeNull();
  });

  it("snaps the aimed normal to the locked axis", () => {
    tool.cycleAxisLock(); // x
    tool.handleInput(inputWith(visionProController({ triggerPressed: true })));
    tool.handleInput(inputWith(visionProController({ triggerPressed: true })));

    const last = clippingFeature.setPlaneData.mock.calls.at(-1)[1];
    expect(last.normal).toEqual([1, 0, 0]);
  });

  it("re-applies immediately, without needing a re-aim", () => {
    tool.cycleAxisLock();
    expect(clippingFeature.setPlaneData).toHaveBeenCalled();
  });
});

describe("VRClipBoxTool — Quest shortcuts still work", () => {
  let tool;
  beforeEach(async () => { tool = await makeTool(); });

  it("A inverts and B resets", () => {
    tool.handleInput(inputWith(questController({ a: true })));
    expect(clippingFeature.invertClipping).toHaveBeenCalledWith("inst-1");

    tool._lastBButtonState = false;
    tool.handleInput(inputWith(questController({ b: true })));
    expect(clippingFeature.resetPlane).toHaveBeenCalledWith("inst-1");
  });

  it("exposes the same actions to the menu, so Vision Pro has parity", () => {
    expect(tool.invert()).toMatchObject({ type: "clip-box-updated" });
    expect(tool.reset()).toMatchObject({ type: "clip-box-updated" });
    expect(clippingFeature.invertClipping).toHaveBeenCalled();
    expect(clippingFeature.resetPlane).toHaveBeenCalled();
  });
});

describe("VRClipBoxTool — plane visual", () => {
  function makeSpyRenderer() {
    const actors = [];
    return {
      actors,
      addActor: vi.fn((a) => actors.push(a)),
      removeActor: vi.fn((a) => {
        const i = actors.indexOf(a);
        if (i >= 0) actors.splice(i, 1);
      }),
      getActiveCamera: vi.fn(() => ({ getPosition: () => [0, 0, 5] })),
    };
  }

  let tool;
  let renderer;
  beforeEach(async () => {
    tool = await makeTool();
    renderer = makeSpyRenderer();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
      font: "", fillStyle: "", textAlign: "", textBaseline: "",
      measureText: () => ({ width: 40 }),
      fillText: vi.fn(), clearRect: vi.fn(), fill: vi.fn(),
      beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(), stroke: vi.fn(),
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    }));
  });

  it("draws a translucent quad plus a wireframe outline", () => {
    tool.render(renderer);

    expect(tool._planeActor).toBeTruthy();
    expect(tool._outlineActor).toBeTruthy();
    expect(tool._planeActor.getProperty().getOpacity()).toBeLessThan(1);
    // Translucent geometry must be classified as such or it renders with
    // depthMask(true) and punches a hole through the data behind it.
    expect(tool._planeActor.getForceTranslucent()).toBe(true);
    expect(tool._outlineActor.getProperty().getRepresentation()).toBe(1);
  });

  it("never lets the visual absorb a tool raycast", () => {
    tool.render(renderer);
    expect(tool._planeActor.getPickable()).toBe(false);
    expect(tool._outlineActor.getPickable()).toBe(false);
  });

  it("removes every actor on deactivate — the renderer is shared with desktop", async () => {
    tool.render(renderer);
    expect(renderer.actors.length).toBeGreaterThan(0);

    await tool.deactivate();

    expect(renderer.actors.length).toBe(0);
    expect(tool._planeActor).toBeNull();
    expect(tool._readout).toBeNull();
  });

  it("hides the visual when there is no plane to show", async () => {
    const fresh = new VRClipBoxTool();
    clippingFeature.getPlaneData.mockReturnValue(null);
    await fresh.activate({
      handler: {},
      vrContext: { instanceId: "i", vrScale: 1, vrOrigin: [0, 0, 0], dataBounds: [0, 1, 0, 1, 0, 1] },
    });

    expect(() => fresh.render(renderer)).not.toThrow();
    expect(fresh._planeActor).toBeNull();
  });
});
