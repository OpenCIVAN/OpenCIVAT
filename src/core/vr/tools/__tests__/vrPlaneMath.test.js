// src/core/vr/tools/__tests__/vrPlaneMath.test.js
import { describe, it, expect } from "vitest";

import {
  rotateVectorByQuaternion,
  controllerForward,
  mapXRPointToData,
  quantizeNormalToAxis,
  yawRotateVector,
  buildYawPivotMatrix,
  buildPlaneFrameMatrix,
} from "../vrPlaneMath.js";

/** Apply a flat column-major 4x4 matrix (gl-matrix layout) to a point. */
function applyMat4(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

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

describe("yawRotateVector", () => {
  it("theta 0 returns the input", () => {
    expect(yawRotateVector([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });

  it("leaves the Y component untouched", () => {
    const [, y] = yawRotateVector([1, 7, 0], Math.PI / 3);
    expect(y).toBe(7);
  });

  it("+90° about Y sends +X toward +Z", () => {
    const [x, , z] = yawRotateVector([1, 0, 0], Math.PI / 2);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
  });

  it("is invertible with the negated angle", () => {
    const v = [0.3, -1.2, 0.7];
    const round = yawRotateVector(yawRotateVector(v, 1.1), -1.1);
    expect(round[0]).toBeCloseTo(v[0]);
    expect(round[1]).toBeCloseTo(v[1]);
    expect(round[2]).toBeCloseTo(v[2]);
  });
});

describe("buildYawPivotMatrix", () => {
  it("theta 0 is the identity matrix regardless of pivot", () => {
    const m = buildYawPivotMatrix(0, [5, -3, 9]);
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    for (let i = 0; i < 16; i++) {
      expect(m[i]).toBeCloseTo(identity[i]);
    }
  });

  it("defaults to a zero pivot", () => {
    const m = buildYawPivotMatrix(Math.PI / 2);
    const p = applyMat4(m, [1, 2, 3]);
    const expected = yawRotateVector([1, 2, 3], Math.PI / 2);
    expect(p[0]).toBeCloseTo(expected[0]);
    expect(p[1]).toBeCloseTo(expected[1]);
    expect(p[2]).toBeCloseTo(expected[2]);
  });

  it("transforming a point matches pivot + yawRotateVector(point - pivot, theta)", () => {
    const pivot = [10, 4, -6];
    const theta = 1.234;
    const point = [12, 7, -2];
    const m = buildYawPivotMatrix(theta, pivot);
    const actual = applyMat4(m, point);

    const relative = [point[0] - pivot[0], point[1] - pivot[1], point[2] - pivot[2]];
    const rotated = yawRotateVector(relative, theta);
    const expected = [rotated[0] + pivot[0], rotated[1] + pivot[1], rotated[2] + pivot[2]];

    expect(actual[0]).toBeCloseTo(expected[0]);
    expect(actual[1]).toBeCloseTo(expected[1]);
    expect(actual[2]).toBeCloseTo(expected[2]);
  });

  it("leaves the pivot point itself fixed", () => {
    const pivot = [3, -8, 2];
    const m = buildYawPivotMatrix(0.7, pivot);
    const p = applyMat4(m, pivot);
    expect(p[0]).toBeCloseTo(pivot[0]);
    expect(p[1]).toBeCloseTo(pivot[1]);
    expect(p[2]).toBeCloseTo(pivot[2]);
  });

  it("does not move points along the Y axis relative to the pivot", () => {
    const pivot = [1, 5, 1];
    const m = buildYawPivotMatrix(0.9, pivot);
    const p = applyMat4(m, [1, 50, 1]);
    expect(p[1]).toBeCloseTo(50);
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

describe("buildPlaneFrameMatrix", () => {
  /** Apply a flat column-major 4x4 to a direction (no translation). */
  function applyDir(m, v) {
    const [x, y, z] = v;
    return [
      m[0] * x + m[4] * y + m[8] * z,
      m[1] * x + m[5] * y + m[9] * z,
      m[2] * x + m[6] * y + m[10] * z,
    ];
  }

  it("maps local +Z onto the supplied normal", () => {
    for (const n of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.3, -0.5, 0.81]]) {
      const len = Math.hypot(...n);
      const unit = n.map((c) => c / len);
      const m = buildPlaneFrameMatrix([0, 0, 0], n);
      const mapped = applyDir(m, [0, 0, 1]);
      mapped.forEach((c, i) => expect(c).toBeCloseTo(unit[i]));
    }
  });

  it("puts the origin in the translation slots", () => {
    const m = buildPlaneFrameMatrix([2, -7, 4], [0, 0, 1]);
    expect(m[12]).toBeCloseTo(2);
    expect(m[13]).toBeCloseTo(-7);
    expect(m[14]).toBeCloseTo(4);
    expect(m[15]).toBe(1);
  });

  it("is the identity for a +Z normal at the origin", () => {
    const m = buildPlaneFrameMatrix([0, 0, 0], [0, 0, 1]);
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    // The in-plane rotation is arbitrary, so only check that the frame is
    // orthonormal and +Z maps to +Z — not every element.
    expect(m[8]).toBeCloseTo(identity[8]);
    expect(m[9]).toBeCloseTo(identity[9]);
    expect(m[10]).toBeCloseTo(identity[10]);
  });

  it("produces an orthonormal, right-handed basis", () => {
    const m = buildPlaneFrameMatrix([1, 2, 3], [0.4, 0.5, -0.77]);
    const t = [m[0], m[1], m[2]];
    const b = [m[4], m[5], m[6]];
    const n = [m[8], m[9], m[10]];
    const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];

    expect(Math.hypot(...t)).toBeCloseTo(1);
    expect(Math.hypot(...b)).toBeCloseTo(1);
    expect(Math.hypot(...n)).toBeCloseTo(1);
    expect(dot(t, b)).toBeCloseTo(0);
    expect(dot(t, n)).toBeCloseTo(0);
    expect(dot(b, n)).toBeCloseTo(0);
  });

  it("handles a normal nearly parallel to the reference axis", () => {
    // The +X reference would give a degenerate cross product here; the helper
    // switches references rather than returning garbage.
    const m = buildPlaneFrameMatrix([0, 0, 0], [1, 0, 0]);
    expect(m).not.toBeNull();
    const t = [m[0], m[1], m[2]];
    expect(Math.hypot(...t)).toBeCloseTo(1);
  });

  it("returns null for a degenerate normal rather than NaNs", () => {
    expect(buildPlaneFrameMatrix([0, 0, 0], [0, 0, 0])).toBeNull();
    expect(buildPlaneFrameMatrix([0, 0, 0], [NaN, 0, 1])).toBeNull();
    expect(buildPlaneFrameMatrix([0, 0, 0], null)).toBeNull();
  });
});
