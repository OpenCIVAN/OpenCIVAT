// src/core/vr/navigation/__tests__/VRNavigationController.test.js
// Regression coverage for the always-on layered navigation model:
//   - fly is ACTIVATED at construction (it used to be dead — update() returned
//     null every frame because _isActive stayed false)
//   - fly is called with the real (inputState, frame, deltaTime) signature
//   - WALK ground-locks vertical movement
//   - snap turn debounces on the right-stick X flick
//   - object-move is suppressed while world-grabbing
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

// VRObjectMoveMode pulls in the VTK instance tools at module load; stub it so
// the controller can be constructed in a jsdom unit test.
vi.mock("@VTK/vtkInstanceTools.js", () => ({
  instanceTools: { getPosition: vi.fn(() => [0, 0, 0]), setPosition: vi.fn() },
}));

// Snap-turn step is read once at construction from the shared accessibility
// store (localStorage-backed in real code). Default (mocked) to 45 degrees
// unless a test overrides the mock return value for that call.
vi.mock("@Core/vr/vrAccessibilityStore.js", () => ({
  readVRAccessibilitySettings: vi.fn(() => ({ movement: { snapTurn: 45 } })),
}));

import { VRNavigationController } from "../VRNavigationController.js";
import { EXPLORATION_MODES } from "@Core/data/models/VRExplorationSession.js";
import { readVRAccessibilitySettings } from "@Core/vr/vrAccessibilityStore.js";

function makeController(overrides = {}) {
  const session = { defaultExplorationMode: EXPLORATION_MODES.FLY };
  const vrContext = { vrScale: 1.0, vrOrigin: [0, 0, 0], vrRotation: 0, instanceId: "inst-1" };
  const vrManager = { applySnapTurn: vi.fn() };
  const controller = new VRNavigationController(session, vrContext, { vrManager, ...overrides });
  return { controller, vrContext, vrManager };
}

/** Input with a left thumbstick (locomotion) and optional buttons/pose. */
function leftStick({ x = 0, y = 0, a = false } = {}) {
  return {
    headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
    controllers: {
      left: { pose: { position: { x: 0, y: 1.5, z: 0 } }, thumbstick: { x, y }, buttons: { a, b: false }, squeezeValue: 0 },
      right: null,
    },
  };
}

/** Input with a right thumbstick — the ground-locked walk instance. */
function rightStick({ x = 0, y = 0 } = {}) {
  return {
    headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
    controllers: {
      left: null,
      right: {
        pose: { position: { x: 0, y: 1.5, z: 0 } },
        thumbstick: { x, y },
        buttons: { a: false, b: false },
        squeezeValue: 0,
      },
    },
  };
}

describe("VRNavigationController — layered always-on model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readVRAccessibilitySettings.mockReturnValue({ movement: { snapTurn: 45 } });
  });

  it("activates the fly layer at construction so locomotion runs", () => {
    const { controller } = makeController();
    expect(controller._flyMode._isActive).toBe(true);
  });

  it("moves vrOrigin when the left stick is pushed (fly is reachable)", () => {
    const { controller } = makeController();
    // Push forward for several frames (velocity smoothing ramps up).
    let result;
    for (let i = 0; i < 10; i++) {
      result = controller.update(leftStick({ y: -1 }), {}, 0.016);
    }
    expect(result.position).not.toBeNull();
    // Some horizontal movement accumulated (z axis, forward/back).
    const moved = Math.abs(result.position.z) + Math.abs(result.position.x);
    expect(moved).toBeGreaterThan(0);
  });

  it("returns no movement when the stick is centered (deadzone)", () => {
    const { controller } = makeController();
    const result = controller.update(leftStick({ x: 0, y: 0 }), {}, 0.016);
    // A8 idle deadband: a fully centered stick targets exactly zero velocity,
    // so fly's per-component snap-to-zero (see VRFlyMode.update) fires
    // immediately and the layer reports no movement at all (position: null)
    // rather than re-writing vrOrigin to an unchanged value every frame.
    expect(result.position).toBeNull();
  });

  it("left stick flies (A gains altitude); right stick walks and never leaves the ground", () => {
    // Walk and fly are no longer modes — both sticks are live every frame. The
    // LEFT stick is the fly instance (A/B change altitude); the RIGHT stick is
    // the ground-locked walk instance.
    const flyC = makeController().controller;
    let flyResult;
    for (let i = 0; i < 10; i++) flyResult = flyC.update(leftStick({ a: true, y: -1 }), {}, 0.016);
    expect(flyResult.position.y).toBeGreaterThan(0);

    const walkC = makeController().controller;
    let walkResult;
    for (let i = 0; i < 10; i++) walkResult = walkC.update(rightStick({ y: -1 }), {}, 0.016);
    expect(walkResult.position).not.toBeNull();
    expect(walkResult.position.y).toBe(0);
  });

  it("both sticks at once compose additively", () => {
    const both = {
      headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
      controllers: {
        left: leftStick({ y: -1 }).controllers.left,
        right: rightStick({ y: -1 }).controllers.right,
      },
    };
    const c = makeController().controller;
    let res;
    for (let i = 0; i < 10; i++) res = c.update(both, {}, 0.016);

    const flyOnly = makeController().controller;
    let f;
    for (let i = 0; i < 10; i++) f = flyOnly.update(leftStick({ y: -1 }), {}, 0.016);

    // Neither stick wins — the combined travel exceeds either alone.
    expect(Math.abs(res.position.z)).toBeGreaterThan(Math.abs(f.position.z));
  });

  it("snap-turns once per flick and re-arms after the stick returns to center", () => {
    const { controller, vrManager } = makeController();
    const flick = {
      headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
      controllers: { left: null, right: { pose: { position: { x: 0, y: 1.5, z: 0 } }, thumbstick: { x: 0.9, y: 0 } } },
    };
    const center = {
      headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
      controllers: { left: null, right: { pose: { position: { x: 0, y: 1.5, z: 0 } }, thumbstick: { x: 0, y: 0 } } },
    };

    controller.update(flick, {}, 0.016);
    controller.update(flick, {}, 0.016); // held — must NOT re-fire
    expect(vrManager.applySnapTurn).toHaveBeenCalledTimes(1);
    // Configured step (45deg -> radians) and head position (none in this
    // fixture, so null) are passed through alongside the +1/-1 sign.
    expect(vrManager.applySnapTurn).toHaveBeenCalledWith(1, Math.PI / 4, null);

    controller.update(center, {}, 0.016); // re-arm
    controller.update(flick, {}, 0.016); // second flick fires again
    expect(vrManager.applySnapTurn).toHaveBeenCalledTimes(2);
  });

  it("reads the configured snap-turn step ONCE at construction, in radians", () => {
    readVRAccessibilitySettings.mockReturnValue({ movement: { snapTurn: 90 } });
    const { controller } = makeController();
    expect(controller._snapTurnRad).toBeCloseTo(Math.PI / 2, 10);
  });

  it("falls back to the 45-degree default for a missing/garbage snapTurn value", () => {
    readVRAccessibilitySettings.mockReturnValue({ movement: { snapTurn: "not-a-number" } });
    const { controller } = makeController();
    expect(controller._snapTurnRad).toBeCloseTo(Math.PI / 4, 10);
  });

  it("does not snap-turn at all when the configured step is 'off'", () => {
    readVRAccessibilitySettings.mockReturnValue({ movement: { snapTurn: "off" } });
    const { controller, vrManager } = makeController();
    expect(controller._snapTurnRad).toBeNull();

    const flick = {
      headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
      controllers: { left: null, right: { pose: { position: { x: 0, y: 1.5, z: 0 } }, thumbstick: { x: 0.9, y: 0 } } },
    };
    controller.update(flick, {}, 0.016);
    expect(vrManager.applySnapTurn).not.toHaveBeenCalled();
  });

  it("passes the live head position through to applySnapTurn when present", () => {
    const { controller, vrManager } = makeController();
    const flickWithHead = {
      headPose: { position: { x: 1, y: 1.6, z: 2 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      controllers: { left: null, right: { pose: { position: { x: 0, y: 1.5, z: 0 } }, thumbstick: { x: -0.9, y: 0 } } },
    };
    controller.update(flickWithHead, {}, 0.016);
    expect(vrManager.applySnapTurn).toHaveBeenCalledWith(-1, Math.PI / 4, { x: 1, y: 1.6, z: 2 });
  });

  // Carrying the dataset is the GRIP+TRIGGER chord, available from any state —
  // no mode switch needed. A bare trigger stays free for tools and the menu;
  // a bare grip pulls the world.
  function gripAndTriggerHeld() {
    const s = triggerHeld();
    s.controllers.right.squeezeValue = 1;
    return s;
  }

  function gripOnlyHeld() {
    const s = triggerHeld();
    s.controllers.right.squeezeValue = 1;
    s.controllers.right.triggerPressed = false;
    return s;
  }

  function triggerHeld() {
    return {
      headPose: { orientation: { x: 0, y: 0, z: 0, w: 1 } },
      controllers: {
        left: null,
        right: {
          pose: { position: { x: 0, y: 1.5, z: 0 } },
          targetRay: { position: { x: 0, y: 1.5, z: 0 }, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
          triggerPressed: true,
          squeezeValue: 0,
          thumbstick: { x: 0, y: 0 },
        },
      },
    };
  }

  it("grip+trigger carries the dataset; a bare trigger leaves it for tools", () => {
    const { controller } = makeController();
    const spy = vi.spyOn(controller._objectMove, "update");

    controller.update(triggerHeld(), {}, 0.016);
    expect(spy, "a bare trigger must stay free for tools/menu").not.toHaveBeenCalled();

    controller.update(gripAndTriggerHeld(), {}, 0.016);
    expect(spy).toHaveBeenCalled();
  });

  it("grip alone pulls the world and never carries the dataset", () => {
    const { controller } = makeController();
    // Mirror production's predicate: grip engages world-grab, but NOT when the
    // trigger is also held — that combination is the carry chord instead, so
    // the two can never run on the same frame.
    controller.setWorldGrabEngagement(
      (h) => (h?.squeezeValue || 0) > 0.7 && h?.triggerPressed !== true
    );
    const objSpy = vi.spyOn(controller._objectMove, "update");

    controller.update(gripOnlyHeld(), {}, 0.016); // rising edge — starts grab
    controller.update(gripOnlyHeld(), {}, 0.016); // grabbing

    expect(controller._worldGrab.isGrabbing()).toBe(true);
    expect(objSpy).not.toHaveBeenCalled();
  });

  it("the carry chord does not also start a world grab", () => {
    const { controller } = makeController();
    controller.setWorldGrabEngagement(
      (h) => (h?.squeezeValue || 0) > 0.7 && h?.triggerPressed !== true
    );
    controller.update(gripAndTriggerHeld(), {}, 0.016);
    controller.update(gripAndTriggerHeld(), {}, 0.016);
    expect(controller._worldGrab.isGrabbing()).toBe(false);
  });
});
