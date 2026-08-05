// src/core/instances/types/vtk/__tests__/VTKInstanceHandler.probeVR.test.js
//
// Covers probeDataVR (R5 probe tool support): nearest-point lookup over the
// instance polydata + point-data array value extraction, and graceful null
// when there is no polydata/points. Uses a synthetic mock polydata at the same
// seam the tool reads (vrContext.sceneObjects.mapper.getInputData) — no vtk.js
// objects needed, matching how the existing VTKInstanceHandler tests construct
// the handler and drive its methods with plain-object fakes.
import { describe, it, expect, beforeEach } from "vitest";
import { VTKInstanceHandler } from "../VTKInstanceHandler.js";

/**
 * Build a fake vtkPolyData-shaped object.
 * @param {number[]} points - flat [x,y,z, x,y,z, ...]
 * @param {Array<{name:string, comps:number, data:number[]}>} arrays
 */
function makePolyData(points, arrays = []) {
  return {
    getPoints: () => ({
      getNumberOfPoints: () => points.length / 3,
      getData: () => points,
    }),
    getPointData: () => ({
      getNumberOfArrays: () => arrays.length,
      getArrayByIndex: (i) => {
        const a = arrays[i];
        if (!a) return null;
        return {
          getName: () => a.name,
          getNumberOfComponents: () => a.comps,
          getData: () => a.data,
        };
      },
    }),
  };
}

function makeVrContext(polyData) {
  return {
    sceneObjects: {
      mapper: { getInputData: () => polyData },
    },
  };
}

describe("VTKInstanceHandler.probeDataVR", () => {
  let handler;

  beforeEach(() => {
    handler = new VTKInstanceHandler();
  });

  it("returns the nearest point id, distance, position and scalar value", () => {
    // three points along X; one scalar array "temperature"
    const points = [0, 0, 0, 1, 0, 0, 2, 0, 0];
    const arrays = [{ name: "temperature", comps: 1, data: [10, 20, 30] }];
    const ctx = makeVrContext(makePolyData(points, arrays));

    const result = handler.probeDataVR(ctx, { x: 0.9, y: 0.05, z: 0 });

    expect(result).not.toBeNull();
    expect(result.pointId).toBe(1); // (1,0,0) is nearest to (0.9,0.05,0)
    expect(result.position).toEqual([1, 0, 0]);
    expect(result.values.temperature).toBe(20);
    expect(result.distance).toBeCloseTo(Math.hypot(0.1, 0.05, 0));
  });

  it("extracts multi-component array values as an array", () => {
    const points = [0, 0, 0, 5, 5, 5];
    const arrays = [
      { name: "velocity", comps: 3, data: [1, 2, 3, 4, 5, 6] },
    ];
    const ctx = makeVrContext(makePolyData(points, arrays));

    const result = handler.probeDataVR(ctx, { x: 5, y: 5, z: 5 });
    expect(result.pointId).toBe(1);
    expect(result.values.velocity).toEqual([4, 5, 6]);
  });

  it("accepts an array-form position", () => {
    const points = [0, 0, 0, 10, 0, 0];
    const ctx = makeVrContext(makePolyData(points, []));
    const result = handler.probeDataVR(ctx, [9, 0, 0]);
    expect(result.pointId).toBe(1);
  });

  it("returns null when there is no polydata", () => {
    const ctx = makeVrContext(null);
    expect(handler.probeDataVR(ctx, { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it("returns null when the polydata has no points", () => {
    const ctx = makeVrContext(makePolyData([], []));
    expect(handler.probeDataVR(ctx, { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it("returns null when vrContext/sceneObjects is missing", () => {
    expect(handler.probeDataVR(null, { x: 0, y: 0, z: 0 })).toBeNull();
    expect(handler.probeDataVR({}, { x: 0, y: 0, z: 0 })).toBeNull();
  });
});
