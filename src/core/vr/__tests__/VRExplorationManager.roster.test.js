// src/core/vr/__tests__/VRExplorationManager.roster.test.js
// Phase 4: getSessionRoster() — the single decorated, precedence-ORDERED
// participant list that both roster surfaces render (the in-VR People drawer
// and the desktop VRSessionPanel).
//
// Precedence is the point of the method. Alphabetical or join order buries the
// two people whose state actually matters — whoever holds the data-manipulation
// token, and the host who can take it back — under however many observers
// happened to join first.
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
  EXPLORATION_MODES: { FLY: "fly", TELEPORT: "teleport", WALK: "walk", GRAB: "grab", MOVE_OBJECT: "move-object" },
}));
vi.mock("@Core/vr/VRParticipantSync.js", () => ({ VRParticipantSync: class {} }));
vi.mock("@Core/vr/tools/VRToolManager.js", () => ({ VRToolManager: class {} }));
vi.mock("@Core/vr/VRSnapshotManager.js", () => ({ VRSnapshotManager: class {} }));
vi.mock("@Core/vr/VRControlManager.js", () => ({ VRControlManager: class {} }));
vi.mock("@Core/vr/VRManipulationLock.js", () => ({ VRManipulationLock: class {} }));
vi.mock("@Core/vr/navigation/VRNavigationController.js", () => ({ VRNavigationController: class {} }));
vi.mock("@Core/instances/workspaceManager.js", () => ({
  workspaceManager: { getInstance: vi.fn(), getInstancesByType: vi.fn(() => []) },
}));
vi.mock("@Init/appInitializer.js", () => ({ getViewConfigurationManager: vi.fn() }));
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "self-1"),
  getUserName: vi.fn(() => "Me"),
  getUserColor: vi.fn(() => "#ff0000"),
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRAvatars.js", () => ({
  vrAvatarSystem: { initialize: vi.fn(), dispose: vi.fn(), setLocalActivity: vi.fn() },
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRSpatialUI.js", () => ({ vrSpatialUI: { dispose: vi.fn() } }));
vi.mock("@Core/vr/VRMultiViewGrid.js", () => ({
  vrMultiViewGrid: { disable: vi.fn(), isEnabled: vi.fn(() => false) },
}));
vi.mock("@Services/apiClient.js", () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
vi.mock("@Core/instances/types/vtk/features/index.js", () => ({
  vtkClippingFeature: {}, vtkSceneFeature: {}, vtkThresholdFeature: {}, vtkIsosurfaceFeature: {},
}));
vi.mock("@Core/instances/types/vtk/features/VTKGlyphFeature.js", () => ({
  vtkGlyphFeature: {}, isGlyphFeatureAvailable: vi.fn(() => false),
}));
vi.mock("@VTK/vtkInstanceTools.js", () => ({ instanceTools: {} }));
vi.mock("@Services/visualizationSyncService.js", () => ({
  pushSharedVisualizationUpdate: vi.fn(),
}));
vi.mock("@Core/vr/VRCursorSync.js", () => ({ vrCursorSync: { initialize: vi.fn(), dispose: vi.fn() } }));
vi.mock("@Core/vr/environment/VREnvironment.js", () => ({ vrEnvironment: { dispose: vi.fn() } }));
vi.mock("@Services/voice/voiceRoomService.js", () => ({
  voiceRoomService: { isConnected: vi.fn(() => false) },
  getVoiceRoomName: vi.fn(() => "room"),
}));
// Straight-through XR->data conversion so `distance` is a plain Euclidean
// distance between the head positions the test supplies.
vi.mock("@Core/vr/tools/vrPlaneMath.js", () => ({
  mapXRPointToData: (p, scale, origin) => [
    p.x / scale + origin[0],
    p.y / scale + origin[1],
    p.z / scale + origin[2],
  ],
  controllerForward: vi.fn(() => [0, 0, -1]),
}));

const { yManipulatorState } = vi.hoisted(() => ({ yManipulatorState: new Map() }));
vi.mock("@Collaboration/yjs/yjsSetup.js", () => ({
  yVRSessions: { observe: vi.fn(), unobserve: vi.fn() },
  getVRSessionForView: vi.fn(() => null),
  claimVRSession: vi.fn((_v, r) => r),
  heartbeatVRSession: vi.fn(),
  releaseVRSession: vi.fn(),
  syncManipulatorToYjs: vi.fn(),
  yManipulatorState,
  awareness: { setLocalState: vi.fn(), on: vi.fn(), off: vi.fn(), getStates: () => new Map() },
}));

import { vrExplorationManager } from "../VRExplorationManager.js";

const SELF = "self-1";

function participant(odUserId, over = {}) {
  return {
    odUserId,
    userName: odUserId.toUpperCase(),
    userColor: "#00ff00",
    mode: "vr-explorer",
    joinedAt: 1000,
    ...over,
  };
}

/**
 * Wire the manager's private collaborators directly — startExploration() drags
 * in WebXR and VTK, and none of it is what this method reads.
 */
function setup({ participants, ownerUserId = null, holder = null, remote = [], poses = {} }) {
  vrExplorationManager._activeSession = { id: "s1", ownerUserId, participants };
  vrExplorationManager._participantSync = {
    getRemoteParticipants: () => remote,
    getParticipantState: (id) => poses[id] || null,
  };
  vrExplorationManager._manipulationLock = holder
    ? { getHolder: () => holder }
    : { getHolder: () => null };
}

function headAt(x, y, z) {
  return { headPose: { position: { x, y, z } }, vrScale: 1, vrOrigin: [0, 0, 0] };
}

describe("VRExplorationManager.getSessionRoster — precedence", () => {
  beforeEach(() => {
    yManipulatorState.clear();
    vrExplorationManager._activeSession = null;
    vrExplorationManager._participantSync = null;
    vrExplorationManager._manipulationLock = null;
  });

  it("returns an empty roster with no active session", () => {
    expect(vrExplorationManager.getSessionRoster()).toEqual([]);
  });

  it("orders holder → host → VR explorers by joinedAt → desktop observers", () => {
    setup({
      ownerUserId: "host-1",
      holder: { holderUserId: "holder-1", holderUserName: "Holder" },
      participants: [
        participant("desk-1", { mode: "desktop-observer", joinedAt: 10 }),
        participant("vr-late", { joinedAt: 900 }),
        participant("host-1", { joinedAt: 5 }),
        participant("vr-early", { joinedAt: 100 }),
        participant("holder-1", { joinedAt: 5000 }),
      ],
    });

    expect(vrExplorationManager.getSessionRoster().map((r) => r.userId)).toEqual([
      "holder-1", // holds the data token, despite joining LAST
      "host-1",
      "vr-early", // VR explorers by joinedAt ascending
      "vr-late",
      "desk-1", // desktop observers last, despite joining FIRST
    ]);
  });

  it("puts the host first when nobody holds the token", () => {
    setup({
      ownerUserId: "host-1",
      participants: [participant("vr-a", { joinedAt: 1 }), participant("host-1", { joinedAt: 99 })],
    });

    expect(vrExplorationManager.getSessionRoster().map((r) => r.userId)).toEqual(["host-1", "vr-a"]);
  });

  it("collapses to one band when the host IS the holder", () => {
    setup({
      ownerUserId: "host-1",
      holder: { holderUserId: "host-1" },
      participants: [participant("host-1"), participant("vr-a", { joinedAt: 2 })],
    });

    const roster = vrExplorationManager.getSessionRoster();
    expect(roster[0].userId).toBe("host-1");
    expect(roster[0].isHost).toBe(true);
    expect(roster[0].isHolder).toBe(true);
  });

  it("breaks joinedAt ties on userId so the order never jitters", () => {
    setup({
      participants: [
        participant("zeta", { joinedAt: 7 }),
        participant("alpha", { joinedAt: 7 }),
        participant("mid", { joinedAt: 7 }),
      ],
    });

    expect(vrExplorationManager.getSessionRoster().map((r) => r.userId)).toEqual([
      "alpha",
      "mid",
      "zeta",
    ]);
  });
});

describe("VRExplorationManager.getSessionRoster — row decoration", () => {
  beforeEach(() => {
    yManipulatorState.clear();
    vrExplorationManager._activeSession = null;
    vrExplorationManager._participantSync = null;
    vrExplorationManager._manipulationLock = null;
  });

  it("flags self, and never marks self stale", () => {
    setup({
      participants: [participant(SELF), participant("other")],
      // getRemoteParticipants() never includes self, by construction.
      remote: [{ odUserId: "other", isStale: false }],
    });

    const roster = vrExplorationManager.getSessionRoster();
    const me = roster.find((r) => r.userId === SELF);
    expect(me.isSelf).toBe(true);
    expect(me.isStale).toBe(false);
    expect(roster.find((r) => r.userId === "other").isSelf).toBe(false);
  });

  it("flags a stale participant from the pose map", () => {
    setup({
      participants: [participant(SELF), participant("ghost"), participant("live")],
      remote: [
        { odUserId: "ghost", isStale: true },
        { odUserId: "live", isStale: false },
      ],
    });

    const byId = Object.fromEntries(
      vrExplorationManager.getSessionRoster().map((r) => [r.userId, r])
    );
    expect(byId.ghost.isStale).toBe(true);
    expect(byId.live.isStale).toBe(false);
  });

  it("does not call a participant the pose map has never seen 'stale'", () => {
    // A desktop observer sends no poses at all; neither does a VR peer whose
    // first packet has not landed. Neither is a dead session.
    setup({
      participants: [participant("desk", { mode: "desktop-observer" })],
      remote: [],
    });

    expect(vrExplorationManager.getSessionRoster()[0].isStale).toBe(false);
  });

  it("populates distance from the participants' head poses, and 0 for self", () => {
    setup({
      participants: [participant(SELF), participant("near"), participant("far")],
      poses: {
        [SELF]: headAt(0, 0, 0),
        near: headAt(3, 4, 0), // 5 away
        far: headAt(0, 0, 10),
      },
    });

    const byId = Object.fromEntries(
      vrExplorationManager.getSessionRoster().map((r) => [r.userId, r])
    );
    expect(byId[SELF].distance).toBe(0);
    expect(byId.near.distance).toBeCloseTo(5, 6);
    expect(byId.far.distance).toBeCloseTo(10, 6);
  });

  it("leaves distance null when a position is unknown", () => {
    setup({
      participants: [participant(SELF), participant("nowhere")],
      poses: { [SELF]: headAt(0, 0, 0) },
    });

    expect(
      vrExplorationManager.getSessionRoster().find((r) => r.userId === "nowhere").distance
    ).toBeNull();
  });

  it("reads activity from the shared manipulator channel", () => {
    yManipulatorState.set("busy", { userId: "busy", target: "dataset", action: "manipulating" });
    setup({ participants: [participant("busy"), participant("idle")] });

    const byId = Object.fromEntries(
      vrExplorationManager.getSessionRoster().map((r) => [r.userId, r])
    );
    expect(byId.busy.activity).toBe("dataset");
    expect(byId.idle.activity).toBeNull();
  });

  it("returns the documented row shape and nothing more", () => {
    setup({ ownerUserId: SELF, participants: [participant(SELF)] });

    const [row] = vrExplorationManager.getSessionRoster();
    // joinedAt is used to SORT, not to render — it must not leak into the shape.
    expect(Object.keys(row).sort()).toEqual(
      [
        "activity",
        "distance",
        "isHolder",
        "isHost",
        "isSelf",
        "isStale",
        "mode",
        "userColor",
        "userId",
        "userName",
      ].sort()
    );
  });

  it("survives a participant sync that throws", () => {
    vrExplorationManager._activeSession = { id: "s1", ownerUserId: null, participants: [participant("a")] };
    vrExplorationManager._participantSync = {
      getRemoteParticipants: () => {
        throw new Error("y.js gone");
      },
      getParticipantState: () => null,
    };
    vrExplorationManager._manipulationLock = null;

    expect(vrExplorationManager.getSessionRoster().map((r) => r.userId)).toEqual(["a"]);
  });
});
