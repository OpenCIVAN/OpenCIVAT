// src/core/vr/__tests__/VRManager.applySnapTurn.test.js
// applySnapTurn pivots the snap-turn about the user's HEAD (not the world
// origin) so a user standing away from the origin turns in place instead of
// lurching sideways. See the derivation in VRManager.js's applySnapTurn doc
// comment: P = T(h) . Ry(-step) . T(-h).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { vrManager } from "../VRManager.js";

/** Records the (position, orientation) passed to `new XRRigidTransform(...)`. */
function stubXRRigidTransform() {
  const calls = [];
  function XRRigidTransform(position, orientation) {
    calls.push({ position, orientation });
    this.position = position;
    this.orientation = orientation;
  }
  vi.stubGlobal("XRRigidTransform", XRRigidTransform);
  return calls;
}

describe("VRManager.applySnapTurn — head-pivot snap turn", () => {
  let nextSpace;

  beforeEach(() => {
    vrManager._yawOffset = 0;
    vrManager._baseReferenceSpace = null;
    nextSpace = { id: "next-space" };
    vrManager._referenceSpace = {
      getOffsetReferenceSpace: vi.fn(() => nextSpace),
    };
  });

  it("returns the unchanged yaw offset and does nothing else when sign is 0", () => {
    const before = vrManager._referenceSpace;
    expect(vrManager.applySnapTurn(0, Math.PI / 2, { x: 1, y: 0, z: 0 })).toBe(0);
    expect(vrManager._referenceSpace).toBe(before);
  });

  it("bails gracefully (still tracking yawOffset) when XRRigidTransform is unavailable", () => {
    vi.stubGlobal("XRRigidTransform", undefined);
    const before = vrManager._referenceSpace;
    const result = vrManager.applySnapTurn(1, Math.PI / 2, { x: 1, y: 0, z: 0 });
    expect(result).toBeCloseTo(Math.PI / 2, 10);
    // Reference space untouched — platform can't build the transform.
    expect(vrManager._referenceSpace).toBe(before);
    vi.unstubAllGlobals();
  });

  it("bails gracefully when there is no current reference space", () => {
    vrManager._referenceSpace = null;
    const result = vrManager.applySnapTurn(1, Math.PI / 2, { x: 1, y: 0, z: 0 });
    expect(result).toBeCloseTo(Math.PI / 2, 10);
    expect(vrManager._referenceSpace).toBeNull();
  });

  it("produces a zero translation when headPos is null (degenerates to world-origin pivot)", () => {
    const calls = stubXRRigidTransform();
    vrManager.applySnapTurn(1, Math.PI / 2, null);

    expect(calls).toHaveLength(1);
    expect(calls[0].position.x).toBeCloseTo(0, 10);
    expect(calls[0].position.y).toBeCloseTo(0, 10);
    expect(calls[0].position.z).toBeCloseTo(0, 10);
    // Rotation is still applied: -step/2 about Y for step = +PI/2.
    const half = -(Math.PI / 2) / 2;
    expect(calls[0].orientation).toEqual({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
    expect(vrManager._referenceSpace).toBe(nextSpace);

    vi.unstubAllGlobals();
  });

  it("produces the expected non-zero translation for a 90-degree turn with head at (1,0,0)", () => {
    // step = +PI/2 -> c = cos(-PI/2) = 0, s = sin(-PI/2) = -1
    // t.x = 1 - (1*0 + 0*-1) = 1
    // t.z = 0 - (-1*-1 + 0*0) = -1
    const calls = stubXRRigidTransform();
    vrManager.applySnapTurn(1, Math.PI / 2, { x: 1, y: 0, z: 0 });

    expect(calls).toHaveLength(1);
    expect(calls[0].position.x).toBeCloseTo(1, 10);
    expect(calls[0].position.y).toBeCloseTo(0, 10);
    expect(calls[0].position.z).toBeCloseTo(-1, 10);

    vi.unstubAllGlobals();
  });

  it("uses the default 30-degree step when stepRad is null", () => {
    const calls = stubXRRigidTransform();
    vrManager.applySnapTurn(1, null, null);
    const half = -(Math.PI / 6) / 2;
    expect(calls[0].orientation.y).toBeCloseTo(Math.sin(half), 10);
    expect(vrManager._yawOffset).toBeCloseTo(Math.PI / 6, 10);
    vi.unstubAllGlobals();
  });

  it("accumulates _yawOffset across successive turns (compounding pivots)", () => {
    stubXRRigidTransform();
    vrManager.applySnapTurn(1, Math.PI / 4, { x: 1, y: 0, z: 0 });
    expect(vrManager._yawOffset).toBeCloseTo(Math.PI / 4, 10);
    vrManager.applySnapTurn(-1, Math.PI / 4, { x: 1, y: 0, z: 0 });
    expect(vrManager._yawOffset).toBeCloseTo(0, 10);
    vi.unstubAllGlobals();
  });

  it("chains off the CURRENT _referenceSpace, not _baseReferenceSpace", () => {
    stubXRRigidTransform();
    const baseSpace = { id: "base", getOffsetReferenceSpace: vi.fn(() => ({ id: "from-base" })) };
    vrManager._baseReferenceSpace = baseSpace;
    vrManager.applySnapTurn(1, Math.PI / 4, { x: 0, y: 0, z: 0 });
    expect(baseSpace.getOffsetReferenceSpace).not.toHaveBeenCalled();
    expect(vrManager._referenceSpace).toBe(nextSpace);
    vi.unstubAllGlobals();
  });
});
