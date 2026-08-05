// src/core/vr/__tests__/VRExplorationManager.manipulationGate.test.js
// Phase 3: a VR participant who does NOT hold the data-manipulation token must
// not be able to push shared visualization patches, enter move-object mode, or
// place annotations/measurements — and must be TOLD why rather than silently
// desyncing. The critical regression guarded here is the fail-open path: with
// no lock at all (VRExplorationManager.vizsync.test.js fabricates exactly that
// shape) everything must still work as it did before this feature landed.
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
  EXPLORATION_MODES: {
    FLY: "fly",
    TELEPORT: "teleport",
    WALK: "walk",
    GRAB: "grab",
    MOVE_OBJECT: "move-object",
  },
}));
vi.mock("@Core/vr/VRParticipantSync.js", () => ({ VRParticipantSync: class {} }));
// VRToolManager and the tools are deliberately NOT mocked here: the placement
// gate lives in their real code, and VRExplorationManager only constructs them
// inside startExploration(), which these tests never call.
vi.mock("@Core/vr/VRSnapshotManager.js", () => ({ VRSnapshotManager: class {} }));
vi.mock("@Core/vr/VRControlManager.js", () => ({ VRControlManager: class {} }));
vi.mock("@Core/vr/VRManipulationLock.js", () => ({ VRManipulationLock: class {} }));
vi.mock("@Core/vr/navigation/VRNavigationController.js", () => ({
  VRNavigationController: class {},
}));
vi.mock("@Core/instances/workspaceManager.js", () => ({
  workspaceManager: { getInstance: vi.fn(), getInstancesByType: vi.fn(() => []) },
}));
vi.mock("@Init/appInitializer.js", () => ({ getViewConfigurationManager: vi.fn() }));
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "peer-2"),
  getUserName: vi.fn(() => "Bob"),
  getUserColor: vi.fn(() => "#ff0000"),
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRAvatars.js", () => ({
  vrAvatarSystem: { initialize: vi.fn(), dispose: vi.fn() },
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRSpatialUI.js", () => ({
  vrSpatialUI: { dispose: vi.fn() },
}));
vi.mock("@Core/vr/VRMultiViewGrid.js", () => ({
  vrMultiViewGrid: { disable: vi.fn(), isEnabled: vi.fn(() => false) },
}));
vi.mock("@Services/apiClient.js", () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
vi.mock("@Core/instances/types/vtk/features/index.js", () => ({
  vtkClippingFeature: { getConfigForSync: vi.fn(() => ({ enabled: true })) },
  vtkSceneFeature: {},
  vtkThresholdFeature: { getConfigForSync: vi.fn() },
  vtkIsosurfaceFeature: { getConfigForSync: vi.fn() },
}));
vi.mock("@Core/instances/types/vtk/features/VTKGlyphFeature.js", () => ({
  vtkGlyphFeature: { getState: vi.fn(), getConfigForSync: vi.fn() },
  isGlyphFeatureAvailable: vi.fn(() => false),
}));
vi.mock("@VTK/vtkInstanceTools.js", () => ({
  instanceTools: { getRepresentation: vi.fn(() => "surface"), setRepresentation: vi.fn() },
}));

const mockPush = vi.fn(() => Promise.resolve());
vi.mock("@Services/visualizationSyncService.js", () => ({
  pushSharedVisualizationUpdate: (...args) => mockPush(...args),
}));

const mockSyncManipulator = vi.fn();
vi.mock("@Collaboration/yjs/yjsSetup.js", () => ({
  yVRSessions: { observe: vi.fn(), unobserve: vi.fn() },
  getVRSessionForView: vi.fn(() => null),
  claimVRSession: vi.fn((_v, r) => r),
  heartbeatVRSession: vi.fn(),
  releaseVRSession: vi.fn(),
  syncManipulatorToYjs: (...args) => mockSyncManipulator(...args),
  // Read by getSessionRoster() for each participant's live activity, and
  // pulled in transitively by presenceSystem (setVRPresence).
  yManipulatorState: new Map(),
  awareness: { setLocalState: vi.fn(), on: vi.fn(), off: vi.fn(), getStates: () => new Map() },
}));

import { vrExplorationManager } from "../VRExplorationManager.js";
import { VRToolManager } from "@Core/vr/tools/VRToolManager.js";
import { VRAnnotationTool } from "@Core/vr/tools/VRAnnotationTool.js";

/** A lock stub in the "someone else holds it" state. */
function blockedLock() {
  return {
    canManipulate: () => false,
    getHolder: () => ({ holderUserId: "host-1", holderUserName: "Alice" }),
    isHeldByMe: () => false,
    getRequests: () => [],
    requestControl: vi.fn(() => true),
    grantTo: vi.fn(() => true),
    release: vi.fn(() => true),
  };
}

/** A lock stub in the "we hold it" state. */
function heldLock() {
  return {
    canManipulate: () => true,
    getHolder: () => ({ holderUserId: "peer-2", holderUserName: "Bob" }),
    isHeldByMe: () => true,
    getRequests: () => [],
    requestControl: vi.fn(() => true),
    grantTo: vi.fn(() => true),
    release: vi.fn(() => true),
  };
}

function primeContext() {
  vrExplorationManager._deferredWork = [];
  vrExplorationManager._pendingWorkLabel = null;
  vrExplorationManager._vrNotice = null;
  vrExplorationManager._activeContext = {
    instance: {
      viewConfigId: "view-1",
      instanceId: "inst-1",
      instanceData: { polydata: { fake: true } },
    },
    vrContext: { instanceId: "inst-1" },
  };
}

describe("VRExplorationManager — manipulation gate", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSyncManipulator.mockClear();
    primeContext();
    vrExplorationManager._manipulationLock = null;
    vrExplorationManager._navigationController = null;
  });

  it("a blocked patch never reaches pushSharedVisualizationUpdate, and DOES set a notice", () => {
    vrExplorationManager._manipulationLock = blockedLock();

    vrExplorationManager._pushVisualizationPatch({ representation: "wireframe" });

    expect(mockPush).not.toHaveBeenCalled();
    const notice = vrExplorationManager.getVRNotice();
    expect(notice).toContain("Alice");
    expect(notice).toMatch(/data control/i);
  });

  it("the same patch goes through, and signals activity, for the holder", () => {
    vrExplorationManager._manipulationLock = heldLock();

    vrExplorationManager._pushVisualizationPatch({ representation: "wireframe" });

    expect(mockPush).toHaveBeenCalledWith("view-1", { representation: "wireframe" });
    // The EXISTING desktop manipulator-awareness channel, not new plumbing.
    expect(mockSyncManipulator).toHaveBeenCalledWith("peer-2", "Bob", "dataset", "manipulating");
  });

  it("filter-shaped patches signal 'filter' rather than 'dataset'", () => {
    vrExplorationManager._manipulationLock = heldLock();

    vrExplorationManager._pushVisualizationPatch({ threshold: { min: 0, max: 1 } });

    expect(mockSyncManipulator).toHaveBeenCalledWith("peer-2", "Bob", "filter", "manipulating");
  });

  it("the object-transform patch is blocked by the same single choke point", () => {
    vrExplorationManager._manipulationLock = blockedLock();

    vrExplorationManager._pushObjectTransformPatch(true);

    expect(mockPush).not.toHaveBeenCalled();
    expect(vrExplorationManager.getVRNotice()).toMatch(/Move Object/);
  });

  // REGRESSION: VRExplorationManager.vizsync.test.js fabricates _activeContext
  // with no lock whatsoever. Every gate must fail OPEN in that shape, or this
  // feature silently breaks every pre-existing VR sync path.
  it("fails OPEN with a null lock (regression: vizsync.test.js's context shape)", () => {
    vrExplorationManager._manipulationLock = null;

    expect(vrExplorationManager._hasManipulationControl()).toBe(true);
    expect(vrExplorationManager._requireManipulationControl("Anything")).toBe(true);

    vrExplorationManager._pushVisualizationPatch({ representation: "points" });

    expect(mockPush).toHaveBeenCalledWith("view-1", { representation: "points" });
    expect(vrExplorationManager.getVRNotice()).toBeNull();
  });

  it("fails OPEN when the lock throws, rather than locking everyone out", () => {
    vrExplorationManager._manipulationLock = {
      canManipulate: () => {
        throw new Error("y.js exploded");
      },
    };

    expect(vrExplorationManager._hasManipulationControl()).toBe(true);
    vrExplorationManager._pushVisualizationPatch({ representation: "points" });
    expect(mockPush).toHaveBeenCalled();
  });
});

describe("VRExplorationManager — navigation gate (move-object)", () => {
  let nav;

  beforeEach(() => {
    mockPush.mockClear();
    primeContext();
    nav = { setMode: vi.fn(), getMode: vi.fn(() => "grab"), cycleMode: vi.fn(() => "move-object") };
    vrExplorationManager._navigationController = nav;
  });

  it("refuses move-object for a non-holder and explains why", () => {
    vrExplorationManager._manipulationLock = blockedLock();

    expect(vrExplorationManager.setNavigationMode("move-object")).toBeNull();
    expect(nav.setMode).not.toHaveBeenCalled();
    expect(vrExplorationManager.getVRNotice()).toMatch(/Move Object/);
  });

  it("allows move-object for the holder", () => {
    vrExplorationManager._manipulationLock = heldLock();

    expect(vrExplorationManager.setNavigationMode("move-object")).toBe("move-object");
    expect(nav.setMode).toHaveBeenCalledWith("move-object");
  });

  it("never gates the per-user viewpoint modes", () => {
    vrExplorationManager._manipulationLock = blockedLock();

    for (const mode of ["fly", "teleport", "walk", "grab"]) {
      expect(vrExplorationManager.setNavigationMode(mode)).toBe(mode);
    }
    expect(nav.setMode).toHaveBeenCalledTimes(4);
    expect(vrExplorationManager.getVRNotice()).toBeNull();
  });

  it("the mode cycle cannot park a non-holder in move-object either", () => {
    vrExplorationManager._manipulationLock = blockedLock();
    nav.cycleMode.mockReturnValueOnce("move-object").mockReturnValueOnce("fly");

    expect(vrExplorationManager.cycleNavigationMode()).toBe("fly");
    expect(nav.cycleMode).toHaveBeenCalledTimes(2);
  });

  it("setVRScale — a per-user viewpoint concern — is never gated", () => {
    vrExplorationManager._manipulationLock = blockedLock();
    nav.setScale = vi.fn();

    vrExplorationManager.setVRScale(10);

    expect(nav.setScale).toHaveBeenCalled();
    expect(vrExplorationManager.getVRNotice()).toBeNull();
  });
});

describe("VRExplorationManager — public delegates", () => {
  beforeEach(() => {
    primeContext();
  });

  it("delegates request/grant/release/holder/requests to the lock", () => {
    const lock = heldLock();
    vrExplorationManager._manipulationLock = lock;

    vrExplorationManager.requestManipulationControl();
    expect(lock.requestControl).toHaveBeenCalled();

    vrExplorationManager.grantManipulationControlTo("peer-3", "Carol");
    expect(lock.grantTo).toHaveBeenCalledWith("peer-3", "Carol");

    vrExplorationManager.releaseManipulationControl();
    expect(lock.release).toHaveBeenCalled();

    expect(vrExplorationManager.getManipulationHolder()).toMatchObject({ holderUserId: "peer-2" });
    expect(vrExplorationManager.isManipulationHolder()).toBe(true);
    expect(vrExplorationManager.getManipulationRequests()).toEqual([]);
  });

  it("every delegate is a safe no-op with no lock", () => {
    vrExplorationManager._manipulationLock = null;

    expect(vrExplorationManager.requestManipulationControl()).toBe(false);
    expect(vrExplorationManager.grantManipulationControlTo("x")).toBe(false);
    expect(vrExplorationManager.releaseManipulationControl()).toBe(false);
    expect(vrExplorationManager.getManipulationHolder()).toBeNull();
    expect(vrExplorationManager.isManipulationHolder()).toBe(false);
    expect(vrExplorationManager.getManipulationRequests()).toEqual([]);
  });

  it("getVRNotice expires", () => {
    vrExplorationManager._flashVRNotice("Hello", 50);
    expect(vrExplorationManager.getVRNotice()).toBe("Hello");
    vrExplorationManager._vrNotice.untilMs = Date.now() - 1;
    expect(vrExplorationManager.getVRNotice()).toBeNull();
  });
});

// The tools take the predicate through VRToolManager's _toolContext (a live
// getter surface) rather than importing VRExplorationManager — which imports
// them, so a direct import would be a cycle.
describe("VR tool placement gate", () => {
  /** A right-hand trigger rising edge — the placement gesture. */
  const pull = {
    controllers: { right: { triggerPressed: true, buttons: {}, targetRay: { origin: [0, 0, 0], direction: [0, 0, -1] } } },
  };

  it("VRToolManager exposes an injected canManipulate() on the tool context", () => {
    const predicate = vi.fn(() => false);
    const mgr = new VRToolManager({}, {}, { canManipulate: predicate });

    expect(mgr._toolContext.canManipulate("Annotation")).toBe(false);
    expect(predicate).toHaveBeenCalledWith("Annotation");
  });

  it("VRToolManager's context permits everything when no predicate is injected", () => {
    const mgr = new VRToolManager({}, {});
    expect(mgr._toolContext.canManipulate("Annotation")).toBe(true);
  });

  it("annotation placement is refused for a non-holder, with no raycast attempted", () => {
    const tool = new VRAnnotationTool();
    const handler = { raycastVR: vi.fn(() => ({ position: { x: 0, y: 0, z: 0 } })) };
    tool._context = {
      handler,
      vrContext: {},
      canManipulate: vi.fn(() => false),
    };

    expect(tool.handleInput(pull, {})).toBeNull();
    expect(handler.raycastVR).not.toHaveBeenCalled();
    expect(tool.getDraft()).toBeNull();
  });

  it("annotation placement proceeds for the holder", () => {
    const tool = new VRAnnotationTool();
    const handler = {
      raycastVR: vi.fn(() => ({ position: { x: 1, y: 2, z: 3 }, normal: null })),
    };
    tool._context = {
      handler,
      vrContext: {},
      canManipulate: vi.fn(() => true),
    };

    const action = tool.handleInput(pull, {});
    expect(action).toMatchObject({ type: "annotation-pending" });
    expect(handler.raycastVR).toHaveBeenCalled();
  });
});
