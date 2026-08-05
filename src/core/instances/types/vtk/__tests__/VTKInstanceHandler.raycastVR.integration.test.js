// src/core/instances/types/vtk/__tests__/VTKInstanceHandler.raycastVR.integration.test.js
//
// End-to-end VR picking against the REAL vtkCellPicker and REAL vtkPolyData.
//
// This file exists because the sibling unit file (VTKInstanceHandler.raycastVR.test.js)
// mocks the picker module wholesale, with `getCellId: () => 42`. That mock reports a
// successful hit unconditionally, so the real picker math never executed in CI — and
// four consecutive on-headset bug fixes were "verified" green against it while VR
// annotate/measure stayed completely dead on both Quest 2 and Vision Pro.
//
// The specific defect the mock hid: vtkPicker.pick3DPoint passes its two endpoint
// arguments STRAIGHT to pick3DInternal without appending a homogeneous w
// (Picker.js:268-284) — unlike publicAPI.pick, which explicitly sets
// p1World[3] = p2World[3] = 1.0 first (Picker.js:263-264). pick3DInternal then does
// vec4.transformMat4(...) followed by vec3.scale(p, p, 1 / p[3]) (Picker.js:103-106),
// so a plain 3-element array makes w undefined -> every coordinate NaN -> no cell is
// ever intersected -> getCellId() keeps its -1 default -> raycastVR returns null on
// EVERY call, in every coordinate space.
//
// Deliberately NO vi.mock here. If this file ever starts mocking the picker again it
// stops being able to catch the class of bug it was written for.
import { describe, it, expect, beforeEach } from "vitest";
import vtkCubeSource from "@kitware/vtk.js/Filters/Sources/CubeSource";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import { VTKInstanceHandler } from "../VTKInstanceHandler.js";

/**
 * Minimal renderer stub satisfying exactly what vtkPicker.pick3DPoint touches
 * before it reaches the geometry: computeTolerance() (Picker.js:46-63) needs
 * getRenderWindow().getViews()[0], getViewport() and normalizedDisplayToWorld;
 * pick3DPoint itself needs view.getViewportSize() to be non-degenerate
 * (Picker.js:275-279 bails out with "viewport area is 0" otherwise).
 *
 * No GL context is involved — actors and mappers are pure data until rendered,
 * so the ACTUAL intersection math below runs for real.
 */
function makeRendererStub(actors) {
  const view = {
    getSize: () => [1000, 1000],
    getViewportSize: () => [1000, 1000],
    displayToNormalizedDisplay: (x, y, z) => [x / 1000, y / 1000, z],
  };
  return {
    getRenderWindow: () => ({ getViews: () => [view] }),
    getViewport: () => [0, 0, 1, 1],
    normalizedDisplayToWorld: (x, y, z) => [x, y, z],
    getActors: () => actors,
  };
}

/** A real 2x2x2 cube actor centred on the data-space origin (spans -1..1). */
function makeCubeActor() {
  const cube = vtkCubeSource.newInstance({
    xLength: 2,
    yLength: 2,
    zLength: 2,
    center: [0, 0, 0],
  });
  const mapper = vtkMapper.newInstance();
  mapper.setInputData(cube.getOutputData());
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  return actor;
}

const CUBE_BOUNDS = [-1, 1, -1, 1, -1, 1];

// Non-identity on purpose: a real session is never at identity
// (_applyInitialPlacement auto-fits on entry), and at identity the XR->data
// mapping is a no-op that hides conversion bugs.
const VR_SCALE = 2;
const VR_ORIGIN = [10, 20, 30];

function makeVrContext(actor) {
  return {
    dataBounds: [...CUBE_BOUNDS],
    vrScale: VR_SCALE,
    vrOrigin: [...VR_ORIGIN],
    sceneObjects: {
      renderer: makeRendererStub([actor]),
      actor,
    },
  };
}

/** Inverse of mapXRPointToData: the XR point that lands on `dataPos`. */
function xrPointFor(dataPos) {
  return {
    x: (dataPos[0] - VR_ORIGIN[0]) * VR_SCALE,
    y: (dataPos[1] - VR_ORIGIN[1]) * VR_SCALE,
    z: (dataPos[2] - VR_ORIGIN[2]) * VR_SCALE,
  };
}

describe("raycastVR — real vtkCellPicker, real geometry", () => {
  let handler;
  let actor;

  beforeEach(() => {
    handler = new VTKInstanceHandler();
    actor = makeCubeActor();
  });

  it("returns a hit on the cube's +Z face for a ray aimed at it", () => {
    // Controller sits at data-space [0, 0, 5] (in front of the cube) aiming -Z.
    // Given in XR metres, exactly as controller.targetRay reports it.
    const ctx = makeVrContext(actor);
    const result = handler.raycastVR(ctx, {
      origin: xrPointFor([0, 0, 5]),
      direction: { x: 0, y: 0, z: -1 },
    });

    expect(result).not.toBeNull();
    expect(result.cellId).toBeGreaterThanOrEqual(0);
    // The near face of a cube spanning -1..1 sits at z = +1.
    expect(result.position.z).toBeCloseTo(1, 5);
    expect(result.position.x).toBeCloseTo(0, 5);
    expect(result.position.y).toBeCloseTo(0, 5);
  });

  it("returns null when the ray points away from the geometry", () => {
    const ctx = makeVrContext(actor);
    const result = handler.raycastVR(ctx, {
      origin: xrPointFor([0, 0, 5]),
      direction: { x: 0, y: 0, z: 1 }, // away from the cube
    });

    expect(result).toBeNull();
  });

  it("reports a MISS after a HIT rather than repeating the previous cell", () => {
    // vtkPicker.pick3DPoint calls the module-local initialize() (Picker.js:272),
    // NOT publicAPI.initialize — and vtkCellPicker only overrides the latter
    // (CellPicker.js:113-116 -> resetPickInfo -> model.cellId = -1). publicAPI.pick
    // calls it explicitly (CellPicker.js:137); pick3DPoint does not. Without an
    // explicit reset, a miss silently reports the PREVIOUS frame's cellId and
    // pickPosition, so markers would stick to a stale point.
    const ctx = makeVrContext(actor);

    const hit = handler.raycastVR(ctx, {
      origin: xrPointFor([0, 0, 5]),
      direction: { x: 0, y: 0, z: -1 },
    });
    expect(hit).not.toBeNull();

    const miss = handler.raycastVR(ctx, {
      origin: xrPointFor([0, 0, 5]),
      direction: { x: 0, y: 0, z: 1 },
    });
    expect(miss).toBeNull();
  });

  it("hits the same geometry from a different scale/origin placement", () => {
    // Guards the XR->data conversion specifically: change the placement and the
    // same physical gesture must still land on the cube.
    const ctx = makeVrContext(actor);
    ctx.vrScale = 0.25;
    ctx.vrOrigin = [-4, 7, 100];
    const origin = {
      x: (0 - ctx.vrOrigin[0]) * ctx.vrScale,
      y: (0 - ctx.vrOrigin[1]) * ctx.vrScale,
      z: (5 - ctx.vrOrigin[2]) * ctx.vrScale,
    };

    const result = handler.raycastVR(ctx, {
      origin,
      direction: { x: 0, y: 0, z: -1 },
    });

    expect(result).not.toBeNull();
    expect(result.position.z).toBeCloseTo(1, 5);
  });
});
