// Locomotion is CONTROLLER-relative: you travel along the ray you are
// pointing, not along where your head happens to be facing.
//
// The direction tests here are the important ones. Two sign inversions have
// shipped in _getMovementInput already: WebXR reports thumbstick Y as NEGATIVE
// when pushed forward, and the old head-relative implementation let that raw
// value through because it then rotated in a frame where -Z was forward, so
// the two conventions cancelled. Now `z` is a scalar along an EXPLICIT forward
// basis vector, so an un-negated value would drive the user backwards along
// their own aim. These tests exist to catch a third inversion.
import { describe, it, expect } from "vitest";
import { VRFlyMode } from "../VRFlyMode.js";

/** Quaternion for a yaw of `theta` about world-up. */
function yawQuat(theta) {
  return { x: 0, y: Math.sin(theta / 2), z: 0, w: Math.cos(theta / 2) };
}
/** Quaternion for a pitch of `theta` about X (positive = aim upward). */
function pitchQuat(theta) {
  return { x: Math.sin(theta / 2), y: 0, z: 0, w: Math.cos(theta / 2) };
}

function hand(thumbstick, orientation = { x: 0, y: 0, z: 0, w: 1 }, buttons = {}) {
  return { thumbstick, targetRay: { orientation }, buttons };
}

function inputFor(handName, controller) {
  return { controllers: { [handName]: controller } };
}

/** Integrate to steady state so the exponential smoothing has settled. */
function settle(mode, input, steps = 400, dt = 1 / 72) {
  let res;
  for (let i = 0; i < steps; i++) res = mode.update(input, null, dt);
  return res;
}

function makeFly(ctx = { vrScale: 1, vrOrigin: [0, 0, 0] }) {
  const m = new VRFlyMode(ctx, { hand: "left", planar: false, strafe: true });
  m.activate();
  return m;
}
function makeWalk(ctx = { vrScale: 1, vrOrigin: [0, 0, 0] }) {
  const m = new VRFlyMode(ctx, { hand: "right", planar: true, strafe: false });
  m.activate();
  return m;
}

describe("VRFlyMode — travels along the controller's aim", () => {
  it("stick forward with the controller aimed at -Z moves along -Z", () => {
    const res = settle(makeFly(), inputFor("left", hand({ x: 0, y: -1 })));
    expect(res.delta.z).toBeLessThan(-0.001);
    expect(Math.abs(res.delta.x)).toBeLessThan(1e-6);
  });

  it("stick forward with the controller aimed at +X moves along +X", () => {
    // THE test the sign trap would fail: aim right, push forward, go right.
    const aimPlusX = yawQuat(-Math.PI / 2); // rotates [0,0,-1] -> [1,0,0]
    const res = settle(makeFly(), inputFor("left", hand({ x: 0, y: -1 }, aimPlusX)));
    expect(res.delta.x).toBeGreaterThan(0.001);
    expect(Math.abs(res.delta.z)).toBeLessThan(1e-6);
  });

  it("stick BACK with the controller aimed at +X moves along -X", () => {
    const aimPlusX = yawQuat(-Math.PI / 2);
    const res = settle(makeFly(), inputFor("left", hand({ x: 0, y: 1 }, aimPlusX)));
    expect(res.delta.x).toBeLessThan(-0.001);
  });

  it("strafe right is perpendicular to the aim, on the right-hand side", () => {
    // Aimed at -Z, right is +X.
    let res = settle(makeFly(), inputFor("left", hand({ x: 1, y: 0 })));
    expect(res.delta.x).toBeGreaterThan(0.001);
    expect(Math.abs(res.delta.z)).toBeLessThan(1e-6);

    // Aimed at +X, right is +Z.
    res = settle(makeFly(), inputFor("left", hand({ x: 1, y: 0 }, yawQuat(-Math.PI / 2))));
    expect(res.delta.z).toBeGreaterThan(0.001);
  });

  it("flying with the controller aimed upward gains altitude", () => {
    const res = settle(makeFly(), inputFor("left", hand({ x: 0, y: -1 }, pitchQuat(Math.PI / 4))));
    expect(res.delta.y).toBeGreaterThan(0.001);
    expect(res.delta.z).toBeLessThan(0); // still going forward too
  });

  it("flying with the controller aimed downward loses altitude", () => {
    const res = settle(makeFly(), inputFor("left", hand({ x: 0, y: -1 }, pitchQuat(-Math.PI / 4))));
    expect(res.delta.y).toBeLessThan(-0.001);
  });
});

describe("VRFlyMode — walk configuration is ground-locked", () => {
  it("never changes altitude even when aimed steeply up", () => {
    const res = settle(makeWalk(), inputFor("right", hand({ x: 0, y: -1 }, pitchQuat(Math.PI / 4))));
    expect(res.delta.y).toBe(0);
    expect(res.delta.z).toBeLessThan(-0.001); // still walks forward
  });

  it("ignores the A/B vertical buttons", () => {
    const res = settle(
      makeWalk(),
      inputFor("right", hand({ x: 0, y: -1 }, { x: 0, y: 0, z: 0, w: 1 }, { a: true }))
    );
    expect(res.delta.y).toBe(0);
  });

  it("does not strafe — the right stick's X axis belongs to snap turn", () => {
    const res = settle(makeWalk(), inputFor("right", hand({ x: 1, y: 0 })));
    expect(res).toEqual({ delta: null, speed: 0 });
  });

  it("holds a sane heading when aimed straight down (degenerate ground projection)", () => {
    const res = settle(makeWalk(), inputFor("right", hand({ x: 0, y: -1 }, pitchQuat(-Math.PI / 2))));
    expect(Number.isFinite(res.delta.x)).toBe(true);
    expect(Number.isFinite(res.delta.z)).toBe(true);
    expect(res.delta.y).toBe(0);
  });
});

describe("VRFlyMode — deadzone and idle behaviour", () => {
  it("rejects a worn-stick diagonal rest of (0.12, 0.12) at deadzone 0.2", () => {
    // Regression guard: hypot ~0.1697. Under the previous 0.15 radial deadzone
    // this passed and produced ~3.3 cm/s of permanent unwanted flight.
    const res = settle(makeFly(), inputFor("left", hand({ x: 0.12, y: 0.12 })));
    expect(res).toEqual({ delta: null, speed: 0 });
  });

  it("still moves for a clearly-intentional push", () => {
    const res = settle(makeFly(), inputFor("left", hand({ x: 0.5, y: 0.5 })));
    expect(Math.hypot(res.delta.x, res.delta.y, res.delta.z)).toBeGreaterThan(0.001);
  });

  it("reports no movement at all once a released stick settles", () => {
    const fly = makeFly();
    settle(fly, inputFor("left", hand({ x: 0, y: -1 })), 50);
    const res = settle(fly, inputFor("left", hand({ x: 0, y: 0 })), 500);
    expect(res).toEqual({ delta: null, speed: 0 });
  });

  it("is frame-rate independent: 1s at 72Hz and at 90Hz travel the same distance", () => {
    const total = (dt, steps) => {
      const fly = makeFly();
      const input = inputFor("left", hand({ x: 0, y: -1 }));
      let sum = 0;
      for (let i = 0; i < steps; i++) {
        const r = fly.update(input, null, dt);
        if (r.delta) sum += Math.hypot(r.delta.x, r.delta.y, r.delta.z);
      }
      return sum;
    };
    const a = total(1 / 72, 72);
    const b = total(1 / 90, 90);
    expect(Math.abs(a - b) / a).toBeLessThan(0.02);
  });

  it("scales speed by vrScale so travel is a constant physical pace", () => {
    const at = (vrScale) => {
      const fly = makeFly({ vrScale, vrOrigin: [0, 0, 0] });
      const r = settle(fly, inputFor("left", hand({ x: 0, y: -1 })));
      return Math.abs(r.delta.z);
    };
    // Data-space delta halves when the world is drawn twice as large.
    expect(at(2)).toBeCloseTo(at(1) / 2, 6);
  });

  it("reads its own hand only", () => {
    const fly = makeFly();
    // Stick pushed on the RIGHT hand; the fly instance watches the left.
    const res = settle(fly, inputFor("right", hand({ x: 0, y: -1 })));
    expect(res).toEqual({ delta: null, speed: 0 });
  });
});
