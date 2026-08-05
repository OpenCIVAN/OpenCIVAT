// src/core/vr/__tests__/VRExplorationManager.arbitration.test.js
// Input arbitration (R2): the floating spatial menu must be interactable
// without its pinches also firing tools/teleport. The menu hit-tests the RAW
// input first; nav and tools then receive a gated clone with the offending
// trigger stripped. Persistence of the final placement (grab release /
// teleport commit) writes the ViewConfiguration's VR hints exactly once.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

const mockVrManager = {
  isVRSupported: vi.fn(() => false),
  isSelectPressed: vi.fn(() => false),
  getReferenceSpace: vi.fn(() => ({})),
  getYawOffset: vi.fn(() => 0),
  on: vi.fn(),
  off: vi.fn(),
};
vi.mock("@Core/vr/VRManager.js", () => ({
  get vrManager() {
    return mockVrManager;
  },
}));

vi.mock("@Core/data/models/VRExplorationSession.js", () => ({
  VRExplorationSession: class {},
  PARTICIPATION_MODE: { VR_EXPLORER: "vr-explorer", DESKTOP_OBSERVER: "desktop-observer" },
  SESSION_STATUS: { ACTIVE: "active" },
  EXPLORATION_MODES: { FLY: "fly", TELEPORT: "teleport", WALK: "walk", SCALE: "scale", GRAB: "grab" },
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

const mockUpdateVRHints = vi.fn();
const mockGetView = vi.fn(() => ({ updateVRHints: mockUpdateVRHints }));
vi.mock("@Init/appInitializer.js", () => ({
  getViewConfigurationManager: vi.fn(() => ({ getView: mockGetView })),
}));
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "user-1"),
  getUserName: vi.fn(() => "Tester"),
  getUserColor: vi.fn(() => "#ff0000"),
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRAvatars.js", () => ({
  vrAvatarSystem: { initialize: vi.fn(), dispose: vi.fn(), update: vi.fn() },
}));

// Spatial UI: control what hitTest() reports (hover / hand) per test. Split
// into hitTest() (phase 1, before nav — raw input arbitration, what these
// tests exercise) and layout() (phase 2, after nav — see the frame-order
// test below) mirroring VRExplorationManager._onFrame's real call sites.
const mockSpatialHitTest = vi.fn(() => ({ hovering: false, hand: "right", buttonId: null }));
const mockSpatialLayout = vi.fn();
const mockForceReanchor = vi.fn();
vi.mock("@Core/instances/types/vtk/vr/VTKVRSpatialUI.js", () => ({
  vrSpatialUI: {
    hitTest: (...a) => mockSpatialHitTest(...a),
    layout: (...a) => mockSpatialLayout(...a),
    forceReanchor: (...a) => mockForceReanchor(...a),
    toggleAtHead: vi.fn(),
    dispose: vi.fn(),
  },
}));
vi.mock("@Core/vr/environment/VREnvironment.js", () => ({
  vrEnvironment: { updateTransform: vi.fn() },
}));

import { vrExplorationManager } from "../VRExplorationManager.js";

const TRANSFORM = { position: { x: 0, y: 1.5, z: 0 }, matrix: new Array(16).fill(0) };

function makeFrame(inputSources) {
  return {
    session: { inputSources },
    getViewerPose: vi.fn(() => null),
    getPose: vi.fn(() => ({ transform: TRANSFORM })),
  };
}

// A gripless Vision Pro source with the pinch held.
const PINCH_SOURCE = {
  handedness: "none",
  targetRayMode: "transient-pointer",
  targetRaySpace: {},
  gripSpace: null,
  gamepad: null,
  hand: null,
};

describe("VRExplorationManager._onFrame — input arbitration (R2)", () => {
  let navUpdate;
  let toolUpdate;
  let activeTool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVrManager.isSelectPressed.mockReturnValue(true); // pinch held

    navUpdate = vi.fn(() => ({ vrScale: null, position: null }));
    toolUpdate = vi.fn(() => null);
    activeTool = null;

    vrExplorationManager._inputProfileDetected = true; // skip one-shot switch
    vrExplorationManager._followTargetUserId = null;
    vrExplorationManager._lastMenuYawOffset = 0;
    mockVrManager.getYawOffset.mockReturnValue(0);
    vrExplorationManager._activeContext = {
      handler: { updateVRExploration: vi.fn() },
      vrContext: { vrScale: 1, vrOrigin: [1, 2, 3] },
      instance: { viewConfigId: "view-1" },
    };
    vrExplorationManager._navigationController = {
      getMode: vi.fn(() => "teleport"),
      setMode: vi.fn(),
      update: navUpdate,
    };
    vrExplorationManager._toolManager = {
      getActiveTool: vi.fn(() => activeTool),
      update: toolUpdate,
    };
  });

  afterEach(() => {
    vrExplorationManager._activeContext = null;
    vrExplorationManager._navigationController = null;
    vrExplorationManager._toolManager = null;
    vrExplorationManager._inputProfileDetected = false;
  });

  function runFrame() {
    vrExplorationManager._onFrame({
      time: 0,
      deltaTime: 16,
      frame: makeFrame([PINCH_SOURCE]),
      viewerPose: null,
    });
  }

  it("passes the RAW input state to the spatial menu (before nav/tools)", () => {
    runFrame();
    expect(mockSpatialHitTest).toHaveBeenCalledTimes(1);
    const raw = mockSpatialHitTest.mock.calls[0][0];
    // Raw: the pinch trigger is still present for the menu to consume.
    expect(raw.controllers.right.triggerPressed).toBe(true);
  });

  it("menu hover strips the trigger from BOTH nav and tool updates", () => {
    mockSpatialHitTest.mockReturnValueOnce({ hovering: true, hand: "right", buttonId: "move" });
    runFrame();

    const navInput = navUpdate.mock.calls[0][0];
    const toolInput = toolUpdate.mock.calls[0][0];
    expect(navInput.controllers.right.triggerPressed).toBe(false);
    expect(navInput.controllers.right.triggerValue).toBe(0);
    expect(toolInput.controllers.right.triggerPressed).toBe(false);
    expect(toolInput.controllers.right.triggerValue).toBe(0);
  });

  it("does NOT strip the trigger when the pointer is not over the menu", () => {
    mockSpatialHitTest.mockReturnValueOnce({ hovering: false, hand: "right", buttonId: null });
    runFrame();
    expect(navUpdate.mock.calls[0][0].controllers.right.triggerPressed).toBe(true);
    expect(toolUpdate.mock.calls[0][0].controllers.right.triggerPressed).toBe(true);
  });

  it("an active tool strips the trigger from nav (annotation pinch must not aim teleport) but tools keep it", () => {
    activeTool = { id: "annotate" };
    mockSpatialHitTest.mockReturnValueOnce({ hovering: false, hand: "right", buttonId: null });
    runFrame();

    // Nav must not see the pinch...
    expect(navUpdate.mock.calls[0][0].controllers.right.triggerPressed).toBe(false);
    // ...but the tool still gets it (it's placing the annotation).
    expect(toolUpdate.mock.calls[0][0].controllers.right.triggerPressed).toBe(true);
  });

  it("does not mutate the object _gatherInputState returned (menu sees raw even after gating)", () => {
    activeTool = { id: "annotate" };
    mockSpatialHitTest.mockReturnValueOnce({ hovering: true, hand: "right", buttonId: "move" });
    runFrame();
    // The exact object handed to the menu still reports the pinch as pressed,
    // even though nav/tools received a stripped clone this same frame.
    const raw = mockSpatialHitTest.mock.calls[0][0];
    expect(raw.controllers.right.triggerPressed).toBe(true);
    // And the gated clone the nav saw is a DIFFERENT object with it stripped.
    expect(navUpdate.mock.calls[0][0]).not.toBe(raw);
    expect(navUpdate.mock.calls[0][0].controllers.right.triggerPressed).toBe(false);
  });

  it("strips grip only while the menu is grip-dragging", () => {
    const raw = {
      controllers: {
        right: {
          triggerPressed: true,
          triggerValue: 1,
          squeezePressed: true,
          squeezeValue: 1,
        },
      },
    };
    const gated = vrExplorationManager._gateInputState(raw, new Set(), new Set(["right"]));
    expect(gated.controllers.right.squeezePressed).toBe(false);
    expect(gated.controllers.right.squeezeValue).toBe(0);
    expect(gated.controllers.right.triggerPressed).toBe(true);
    expect(raw.controllers.right.squeezePressed).toBe(true);
  });

  // A4: hitTest() must run before nav (asserted throughout this file via
  // navUpdate/toolUpdate seeing hitTest's arbitration result), and layout()
  // must run after nav, with THIS frame's post-nav transform — not the
  // pre-nav vrContext snapshot hitTest() itself never even receives.
  it("calls layout() once per frame, after nav, with the frame's vrScale/vrOrigin", () => {
    navUpdate.mockReturnValue({ vrScale: 2.5, position: { x: 4, y: 5, z: 6 } });
    runFrame();

    expect(mockSpatialLayout).toHaveBeenCalledTimes(1);
    expect(mockSpatialHitTest).toHaveBeenCalledTimes(1);
    // hitTest() takes only inputState — no transform argument at all.
    expect(mockSpatialHitTest.mock.calls[0]).toHaveLength(1);
    // layout() sees the transform AFTER nav applied navUpdate's result to
    // vrContext (vrScale 2.5, origin [4,5,6]), not the pre-frame vrContext
    // ({ vrScale: 1, vrOrigin: [1, 2, 3] } from beforeEach).
    expect(mockSpatialLayout).toHaveBeenCalledWith({ vrScale: 2.5, vrOrigin: [4, 5, 6] });
  });

  // A snap-turn rotates the XR reference space itself, which is deliberately
  // built to leave head POSITION nearly unchanged — so vrSpatialUI's own
  // position-drift re-anchor gate never trips on its own, and its cached
  // anchor would silently desync from the camera and stay frozen there (the
  // "menu doesn't follow the user" bug). _onFrame watches vrManager's yaw
  // offset itself and forces a fresh anchor the frame after it changes.
  it("does not force a menu re-anchor when the yaw offset hasn't changed", () => {
    runFrame();
    expect(mockForceReanchor).not.toHaveBeenCalled();
  });

  it("forces a menu re-anchor the frame after vrManager reports a new yaw offset", () => {
    mockVrManager.getYawOffset.mockReturnValue(Math.PI / 6); // one snap-turn step
    runFrame();
    expect(mockForceReanchor).toHaveBeenCalledTimes(1);

    // Stays at the new offset next frame — must not keep re-forcing forever.
    runFrame();
    expect(mockForceReanchor).toHaveBeenCalledTimes(1);
  });

  it("persists VR hints exactly once when a grab ends", () => {
    navUpdate.mockReturnValue({ vrScale: null, position: { x: 4, y: 5, z: 6 }, grabEnded: true });
    vrExplorationManager._navigationController.getMode = vi.fn(() => "grab");
    runFrame();

    expect(mockUpdateVRHints).toHaveBeenCalledTimes(1);
    expect(mockUpdateVRHints).toHaveBeenCalledWith({
      vrScale: 1,
      vrOrigin: [4, 5, 6],
      explorationMode: "grab",
    });
  });

  it("persists VR hints when a teleport commits", () => {
    navUpdate.mockReturnValue({ vrScale: null, position: { x: 7, y: 8, z: 9 }, teleporting: true });
    runFrame();
    expect(mockUpdateVRHints).toHaveBeenCalledTimes(1);
    expect(mockUpdateVRHints).toHaveBeenCalledWith(
      expect.objectContaining({ vrOrigin: [7, 8, 9], explorationMode: "teleport" })
    );
  });

  it("does NOT persist during an ongoing gesture (no grabEnded / teleporting)", () => {
    navUpdate.mockReturnValue({ vrScale: null, position: { x: 4, y: 5, z: 6 } });
    runFrame();
    expect(mockUpdateVRHints).not.toHaveBeenCalled();
  });
});
