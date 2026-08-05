// src/core/vr/__tests__/VRExplorationManager.grounding.test.js
// The dataset must rest ON THE FLOOR, not float at eye height.
//
// Why this matters: the XR->data map is `dataPos = xrPos/vrScale + vrOrigin`,
// so a data point's PHYSICAL position is `xr(P) = (P - vrOrigin) * vrScale`.
// Changing vrScale with vrOrigin fixed is therefore a homothety about the XR
// origin — which, in local-floor space, is the floor point under the user. Any
// point NOT on that plane moves away from it in proportion to the scale
// change, including vertically. The dataset used to start ~0.6 m off the
// ground, so a two-hand zoom lifted it 1.2 m, then 2.4 m, until it was
// overhead and unreachable (the user's report).
//
// A point sitting exactly ON the origin plane is a fixed point of that
// homothety. So `vrOrigin[1] = dataBounds[2] - PEDESTAL_HEIGHT_M / vrScale`
// (see VRExplorationManager.js's PEDESTAL_HEIGHT_M) grounds the dataset on a
// fixed-height pedestal rather than directly on the floor, at every scale
// established through a DISCRETE placement (initial entry, isolation, going
// to a participant, a menu scale preset) — each of these re-derives vrOrigin[1]
// from the CURRENT vrScale via _groundY, so the pedestal reads correctly at
// whatever scale is active when they run. A live two-hand zoom is the one
// exception: VRScaleController deliberately holds vrOrigin[1] fixed for the
// gesture's duration (see its _pivotedOrigin), so the pedestal's apparent
// height scales right along with the rest of the (intentionally, interactively
// resizing) scene for that gesture — the same proportional change a zoom
// gives everything else, not a runaway drift. These tests pin the invariant
// for the discrete-placement case.
const PEDESTAL_HEIGHT_M = 0.5; // must match VRExplorationManager.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});
vi.mock("@Core/vr/VRManager.js", () => ({
  vrManager: { isVRSupported: vi.fn(() => false), on: vi.fn(), off: vi.fn() },
}));
vi.mock("@Core/data/models/VRExplorationSession.js", () => ({
  VRExplorationSession: class {},
  PARTICIPATION_MODE: { VR_EXPLORER: "vr-explorer", DESKTOP_OBSERVER: "desktop-observer" },
  SESSION_STATUS: { ACTIVE: "active" },
}));
vi.mock("@Core/vr/VRParticipantSync.js", () => ({ VRParticipantSync: class {} }));
vi.mock("@Core/vr/tools/VRToolManager.js", () => ({ VRToolManager: class {} }));
vi.mock("@Core/vr/VRSnapshotManager.js", () => ({ VRSnapshotManager: class {} }));
vi.mock("@Core/vr/VRControlManager.js", () => ({ VRControlManager: class {} }));
vi.mock("@Core/vr/navigation/VRNavigationController.js", () => ({
  VRNavigationController: class {},
}));
vi.mock("@Core/instances/workspaceManager.js", () => ({
  workspaceManager: { getInstance: vi.fn() },
}));
vi.mock("@Init/appInitializer.js", () => ({ getViewConfigurationManager: vi.fn() }));
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "user-1"),
  getUserName: vi.fn(() => "Tester"),
  getUserColor: vi.fn(() => "#ff0000"),
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRAvatars.js", () => ({
  vrAvatarSystem: { initialize: vi.fn() },
}));
vi.mock("@Core/data/managers/AnnotationManager.js", () => ({
  get annotationManager() {
    return { createAnnotation: vi.fn(), deleteAnnotation: vi.fn() };
  },
}));

import { vrExplorationManager } from "../VRExplorationManager.js";

// A 2x2x2 box whose base sits at data-space y = 0.
const BOUNDS = [-1, 1, 0, 2, -1, 1];

/** Physical height of a data-space Y coordinate. This is the whole invariant. */
function physicalY(dataY, ctx) {
  return (dataY - ctx.vrOrigin[1]) * ctx.vrScale;
}

/** Quaternion for a rotation of `rad` about the X axis (pitch up when positive). */
function pitchQuat(rad) {
  return { x: Math.sin(rad / 2), y: 0, z: 0, w: Math.cos(rad / 2) };
}

function viewerPose(orientation, position = { x: 0, y: 1.6, z: 0 }) {
  return { transform: { position, orientation } };
}

describe("VR dataset grounding", () => {
  let ctx;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = { dataBounds: [...BOUNDS], vrScale: 1, vrOrigin: [0, 0, 0], vrRotation: 0 };
  });

  it("places the dataset's base on the pedestal at entry", () => {
    vrExplorationManager._applyPoseRelativePlacement(
      ctx,
      viewerPose({ x: 0, y: 0, z: 0, w: 1 })
    );

    // dataBounds[2] is the data-space bottom; it must map to physical
    // y = PEDESTAL_HEIGHT_M, not the literal floor.
    expect(physicalY(BOUNDS[2], ctx)).toBeCloseTo(PEDESTAL_HEIGHT_M, 10);
    expect(ctx.vrOrigin[1]).toBeCloseTo(BOUNDS[2] - PEDESTAL_HEIGHT_M / ctx.vrScale, 10);
  });

  it("scales the pedestal proportionally (not unboundedly) across a raw 100x scale mutation", () => {
    // vrOrigin[1] is a FIXED data-space value once placed (same mechanism as
    // the original bounds[2]-only grounding). A raw vrScale mutation with
    // nothing re-deriving vrOrigin[1] (i.e. a live two-hand zoom gesture,
    // which deliberately holds Y fixed for its duration — see
    // VRScaleController._pivotedOrigin) makes the pedestal's PHYSICAL height
    // scale proportionally with the total zoom — exactly like the dataset's
    // own apparent size does. That's expected, bounded, single-value drift,
    // NOT the original bug: the original bug was UNBOUNDED compounding across
    // REPEATED gestures, because each fresh grip re-anchored to an
    // increasingly-lifted stale origin. Here nothing touches vrOrigin[1]
    // between gestures, so a regrab at the same total zoom reproduces the
    // same height every time instead of compounding it further.
    vrExplorationManager._applyPoseRelativePlacement(
      ctx,
      viewerPose({ x: 0, y: 0, z: 0, w: 1 })
    );
    const fitted = ctx.vrScale;

    for (const k of [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 50, 100]) {
      ctx.vrScale = fitted * k;
      expect(physicalY(BOUNDS[2], ctx)).toBeCloseTo(PEDESTAL_HEIGHT_M * k, 6);
    }
  });

  it("puts the dataset in front of the user at the fitted size", () => {
    const head = { x: 0, y: 1.6, z: 0 };
    vrExplorationManager._applyPoseRelativePlacement(
      ctx,
      viewerPose({ x: 0, y: 0, z: 0, w: 1 }, head)
    );

    const center = [0, 1, 0]; // centre of BOUNDS
    const xrZ = (center[2] - ctx.vrOrigin[2]) * ctx.vrScale;
    // Facing -Z, so the dataset sits at negative Z, ~2.6 m out.
    expect(xrZ).toBeLessThan(-2);
    expect(xrZ).toBeGreaterThan(-3.2);

    // Bounding diagonal spans ~1.36 physical metres (the new fit).
    const diagonal = Math.hypot(
      BOUNDS[1] - BOUNDS[0],
      BOUNDS[3] - BOUNDS[2],
      BOUNDS[5] - BOUNDS[4]
    );
    expect(diagonal * ctx.vrScale).toBeCloseTo(1.36, 1);
  });

  it("ignores head pitch when placing — looking up or down must not launch the dataset", () => {
    // controllerForward is the full 3D forward, so the old code's
    // `forward[1] * distance` threw the dataset up to +/-2 m vertically if the
    // user happened to be looking up on the first frame.
    const level = { dataBounds: [...BOUNDS], vrScale: 1, vrOrigin: [0, 0, 0] };
    const up = { dataBounds: [...BOUNDS], vrScale: 1, vrOrigin: [0, 0, 0] };
    const down = { dataBounds: [...BOUNDS], vrScale: 1, vrOrigin: [0, 0, 0] };

    vrExplorationManager._applyPoseRelativePlacement(level, viewerPose({ x: 0, y: 0, z: 0, w: 1 }));
    vrExplorationManager._applyPoseRelativePlacement(up, viewerPose(pitchQuat(Math.PI / 4)));
    vrExplorationManager._applyPoseRelativePlacement(down, viewerPose(pitchQuat(-Math.PI / 4)));

    for (const c of [up, down]) {
      expect(c.vrOrigin[0]).toBeCloseTo(level.vrOrigin[0], 8);
      expect(c.vrOrigin[1]).toBeCloseTo(level.vrOrigin[1], 8);
      expect(c.vrOrigin[2]).toBeCloseTo(level.vrOrigin[2], 8);
    }
  });

  it("falls back to a forward heading when the user looks straight up", () => {
    // Degenerate case: the ground-projected gaze has no length.
    const straightUp = { dataBounds: [...BOUNDS], vrScale: 1, vrOrigin: [0, 0, 0] };
    vrExplorationManager._applyPoseRelativePlacement(
      straightUp,
      viewerPose(pitchQuat(Math.PI / 2))
    );

    expect(straightUp.vrOrigin.every((v) => Number.isFinite(v))).toBe(true);
    expect(physicalY(BOUNDS[2], straightUp)).toBeCloseTo(PEDESTAL_HEIGHT_M, 10);
    const xrZ = (0 - straightUp.vrOrigin[2]) * straightUp.vrScale;
    expect(xrZ).toBeLessThan(0); // still placed in front, not at the origin
  });

  it("keeps the base on the pedestal when going to a participant", () => {
    vrExplorationManager._activeContext = { vrContext: ctx };
    ctx.vrOrigin = [0, BOUNDS[2] - PEDESTAL_HEIGHT_M / ctx.vrScale, 0];
    vi.spyOn(vrExplorationManager, "_getParticipantDataPosition").mockReturnValue([5, 9, 7]);

    expect(vrExplorationManager.goToParticipant("u2")).toBe(true);
    // Moved horizontally, but not lifted to the participant's altitude.
    expect(ctx.vrOrigin[0]).toBeCloseTo(5, 8);
    expect(physicalY(BOUNDS[2], ctx)).toBeCloseTo(PEDESTAL_HEIGHT_M, 10);
  });
});

describe("VRExplorationManager.refreshDataBounds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("picks up new bounds when a filter substitutes a derived actor", () => {
    const ctx = {
      dataBounds: [...BOUNDS],
      sceneObjects: { actor: { getBounds: () => [-3, 3, 5, 9, -3, 3] } },
    };
    expect(vrExplorationManager.refreshDataBounds(ctx)).toEqual([-3, 3, 5, 9, -3, 3]);
    expect(ctx.dataBounds).toEqual([-3, 3, 5, 9, -3, 3]);
  });

  it("keeps the previous bounds when the actor reports a degenerate box", () => {
    const ctx = {
      dataBounds: [...BOUNDS],
      sceneObjects: { actor: { getBounds: () => [0, 0, 0, 0, 0, 0] } },
    };
    vrExplorationManager.refreshDataBounds(ctx);
    expect(ctx.dataBounds).toEqual(BOUNDS);
  });

  it("keeps the previous bounds when the actor is gone", () => {
    const ctx = { dataBounds: [...BOUNDS], sceneObjects: {} };
    vrExplorationManager.refreshDataBounds(ctx);
    expect(ctx.dataBounds).toEqual(BOUNDS);
  });
});

describe("VRExplorationManager._computeAutoPlacement — pedestal", () => {
  it("puts the dataset's bottom bound PEDESTAL_HEIGHT_M above the floor, not on it", () => {
    const placement = vrExplorationManager._computeAutoPlacement(BOUNDS);
    const physicalBottom = (BOUNDS[2] - placement.vrOrigin[1]) * placement.vrScale;
    expect(physicalBottom).toBeCloseTo(PEDESTAL_HEIGHT_M, 10);
    expect(placement.groundY).toBeCloseTo(placement.vrOrigin[1], 10);
  });
});

describe("VRExplorationManager.setVRScale — re-grounds after a discrete scale change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vrExplorationManager._activeContext = {
      vrContext: { dataBounds: [...BOUNDS], vrScale: 1, vrOrigin: [0, 0, 0] },
    };
  });

  it("re-derives vrOrigin[1] for the new scale after a menu preset tap", () => {
    const ctx = vrExplorationManager._activeContext.vrContext;
    vrExplorationManager._navigationController = {
      setScale: vi.fn((scale) => {
        ctx.vrScale = scale; // mirrors VRScaleController.setScale's own write
      }),
    };

    vrExplorationManager.setVRScale(2);

    expect(ctx.vrScale).toBe(2);
    expect((ctx.dataBounds[2] - ctx.vrOrigin[1]) * ctx.vrScale).toBeCloseTo(
      PEDESTAL_HEIGHT_M,
      10
    );
  });
});
