// src/core/vr/tools/__tests__/vrPlaneMath.test.js
import { describe, it, expect } from "vitest";

import {
  rotateVectorByQuaternion,
  controllerForward,
  mapXRPointToData,
  quantizeNormalToAxis,
} from "../vrPlaneMath.js";

const IDENTITY_Q = { x: 0, y: 0, z: 0, w: 1 };
const Y90_Q = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 };
const X90_Q = { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };

describe("rotateVectorByQuaternion", () => {
  it("identity returns the input", () => {
    expect(rotateVectorByQuaternion([1, 2, 3], IDENTITY_Q)).toEqual([1, 2, 3]);
  });

  it("90° about Y sends -Z to -X", () => {
    const [x, y, z] = rotateVectorByQuaternion([0, 0, -1], Y90_Q);
    expect(x).toBeCloseTo(-1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it("90° about X sends +Y to +Z", () => {
    const [x, y, z] = rotateVectorByQuaternion([0, 1, 0], X90_Q);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });

  it("normalizes non-unit quaternions", () => {
    const doubled = { x: 0, y: Math.SQRT1_2 * 2, z: 0, w: Math.SQRT1_2 * 2 };
    const [x, , z] = rotateVectorByQuaternion([0, 0, -1], doubled);
    expect(x).toBeCloseTo(-1);
    expect(z).toBeCloseTo(0);
  });

  it("treats a near-zero quaternion as identity", () => {
    expect(
      rotateVectorByQuaternion([1, 0, 0], { x: 0, y: 0, z: 0, w: 0 })
    ).toEqual([1, 0, 0]);
    expect(rotateVectorByQuaternion([1, 0, 0], null)).toEqual([1, 0, 0]);
  });
});

describe("controllerForward", () => {
  it("identity orientation points down -Z", () => {
    const [x, y, z] = controllerForward(IDENTITY_Q);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
  });
});

describe("mapXRPointToData", () => {
  it("applies dataPos = xrPos / vrScale + vrOrigin", () => {
    expect(mapXRPointToData({ x: 2, y: 4, z: -6 }, 2, [10, 20, 30])).toEqual([
      11, 22, 27,
    ]);
  });

  it("defaults to scale 1 and origin 0", () => {
    expect(mapXRPointToData({ x: 1, y: 2, z: 3 })).toEqual([1, 2, 3]);
    expect(mapXRPointToData({ x: 1, y: 2, z: 3 }, 0, null)).toEqual([1, 2, 3]);
  });
});

describe("quantizeNormalToAxis", () => {
  it("picks the dominant axis with sign", () => {
    expect(quantizeNormalToAxis([0.9, 0.1, 0.2])).toEqual({
      axis: 0,
      sign: 1,
      vector: [1, 0, 0],
    });
    expect(quantizeNormalToAxis([0.1, -0.8, 0.2])).toEqual({
      axis: 1,
      sign: -1,
      vector: [0, -1, 0],
    });
    expect(quantizeNormalToAxis([0, 0.2, -0.9])).toEqual({
      axis: 2,
      sign: -1,
      vector: [0, 0, -1],
    });
  });

  it("survives a missing normal", () => {
    expect(quantizeNormalToAxis(null).axis).toBe(1);
  });
});
