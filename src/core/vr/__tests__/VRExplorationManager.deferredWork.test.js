// src/core/vr/__tests__/VRExplorationManager.deferredWork.test.js
// Phase 4: the "Glyphs" menu button used to run vtkGlyphFeature.enableGlyphs
// (an O(N) subsampled-polydata copy) SYNCHRONOUSLY inside the XR rAF
// callback (VTKVRSpatialUI.update -> VRSpatialMenuModel.activate ->
// VRExplorationManager.toggleGlyphs), so a large mesh dropped frames and the
// headset's reprojection showed up as the world shaking. This file covers
// the deferred-work queue that moves that work to the END of the frame
// AFTER the eyes are drawn (see VRExplorationManager._deferHeavy /
// _drainDeferredWork, called from _onFrame right after
// handler.updateVRExploration).
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
  EXPLORATION_MODES: { FLY: "fly", TELEPORT: "teleport", WALK: "walk" },
}));
vi.mock("@Core/vr/VRParticipantSync.js", () => ({ VRParticipantSync: class {} }));
vi.mock("@Core/vr/tools/VRToolManager.js", () => ({ VRToolManager: class {} }));
vi.mock("@Core/vr/VRSnapshotManager.js", () => ({ VRSnapshotManager: class {} }));
vi.mock("@Core/vr/VRControlManager.js", () => ({ VRControlManager: class {} }));
vi.mock("@Core/vr/navigation/VRNavigationController.js", () => ({
  VRNavigationController: class {},
}));
vi.mock("@Core/instances/workspaceManager.js", () => ({
  workspaceManager: { getInstance: vi.fn(), getInstancesByType: vi.fn(() => []) },
}));
vi.mock("@Init/appInitializer.js", () => ({
  getViewConfigurationManager: vi.fn(),
}));
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "user-1"),
  getUserName: vi.fn(() => "Tester"),
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
  vtkClippingFeature: { getConfigForSync: vi.fn() },
}));

const mockGlyphState = {
  enabled: false,
  vectorArrays: [],
  scalarArrays: [],
};
vi.mock("@Core/instances/types/vtk/features/VTKGlyphFeature.js", () => ({
  vtkGlyphFeature: {
    getState: vi.fn(() => mockGlyphState),
    enableGlyphs: vi.fn(),
    disableGlyphs: vi.fn(),
    getConfigForSync: vi.fn(() => ({})),
  },
  isGlyphFeatureAvailable: vi.fn(
    (vectorArrays, scalarArrays) =>
      (vectorArrays?.length || 0) + (scalarArrays?.length || 0) > 0
  ),
}));

vi.mock("@VTK/vtkInstanceTools.js", () => ({
  instanceTools: { getRepresentation: vi.fn(() => "surface"), setRepresentation: vi.fn() },
}));

const mockPush = vi.fn(() => Promise.resolve());
vi.mock("@Services/visualizationSyncService.js", () => ({
  pushSharedVisualizationUpdate: (...args) => mockPush(...args),
}));

import { vrExplorationManager } from "../VRExplorationManager.js";
import { vr as log } from "@Utils/logger.js";

describe("VRExplorationManager — deferred work queue (_deferHeavy / _drainDeferredWork)", () => {
  beforeEach(() => {
    vrExplorationManager._deferredWork = [];
    vrExplorationManager._pendingWorkLabel = null;
    vrExplorationManager._activeContext = null;
    vi.clearAllMocks();
  });

  it("_deferHeavy does not execute the task immediately", () => {
    const fn = vi.fn();
    vrExplorationManager._deferHeavy("Doing thing…", fn);
    expect(fn).not.toHaveBeenCalled();
    expect(vrExplorationManager._deferredWork).toHaveLength(1);
  });

  it("_drainDeferredWork runs exactly ONE task per call, in FIFO order", () => {
    const order = [];
    vrExplorationManager._deferHeavy("A", () => order.push("a"));
    vrExplorationManager._deferHeavy("B", () => order.push("b"));
    vrExplorationManager._deferHeavy("C", () => order.push("c"));

    vrExplorationManager._drainDeferredWork();
    expect(order).toEqual(["a"]);
    expect(vrExplorationManager._deferredWork).toHaveLength(2);

    vrExplorationManager._drainDeferredWork();
    expect(order).toEqual(["a", "b"]);
    expect(vrExplorationManager._deferredWork).toHaveLength(1);

    vrExplorationManager._drainDeferredWork();
    expect(order).toEqual(["a", "b", "c"]);
    expect(vrExplorationManager._deferredWork).toHaveLength(0);

    // Draining an empty queue is a safe no-op.
    expect(() => vrExplorationManager._drainDeferredWork()).not.toThrow();
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("a throwing task does not prevent later tasks from draining, and does not strand _pendingWorkLabel", () => {
    const good = vi.fn();
    vrExplorationManager._deferHeavy("Boom", () => {
      throw new Error("boom");
    });
    vrExplorationManager._deferHeavy("Good", good);

    expect(() => vrExplorationManager._drainDeferredWork()).not.toThrow();
    expect(log.error).toHaveBeenCalled();
    // The throwing task is still consumed (shifted off), and the next one's
    // label is now pending — not stuck on the failed task, not null either.
    expect(vrExplorationManager.getPendingWorkLabel()).toBe("Good");
    expect(good).not.toHaveBeenCalled();

    vrExplorationManager._drainDeferredWork();
    expect(good).toHaveBeenCalledTimes(1);
    expect(vrExplorationManager.getPendingWorkLabel()).toBeNull();
  });

  it("getPendingWorkLabel returns the label while queued and null once drained", () => {
    expect(vrExplorationManager.getPendingWorkLabel()).toBeNull();

    vrExplorationManager._deferHeavy("Building glyphs…", () => {});
    expect(vrExplorationManager.getPendingWorkLabel()).toBe("Building glyphs…");

    vrExplorationManager._drainDeferredWork();
    expect(vrExplorationManager.getPendingWorkLabel()).toBeNull();
  });

  it("leaveSession-style teardown clears the queue so nothing runs after exit", () => {
    vrExplorationManager._deferHeavy("Building glyphs…", () => {});
    expect(vrExplorationManager._deferredWork).toHaveLength(1);

    // Mirrors the reset block in leaveSession()'s finally clause.
    vrExplorationManager._deferredWork = [];
    vrExplorationManager._pendingWorkLabel = null;

    expect(vrExplorationManager._deferredWork).toHaveLength(0);
    expect(vrExplorationManager.getPendingWorkLabel()).toBeNull();
  });

  it("_drainDeferredWork skips refreshDataBounds when the task opts out via boundsMayChange: false", () => {
    const refreshSpy = vi.spyOn(vrExplorationManager, "refreshDataBounds");
    vrExplorationManager._activeContext = { vrContext: { dataBounds: [0, 1, 0, 1, 0, 1] } };

    vrExplorationManager._deferHeavy("Applying appearance…", () => {}, { boundsMayChange: false });
    vrExplorationManager._drainDeferredWork();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("_drainDeferredWork still calls refreshDataBounds for tasks that may substitute the actor", () => {
    const refreshSpy = vi.spyOn(vrExplorationManager, "refreshDataBounds");
    vrExplorationManager._activeContext = { vrContext: { dataBounds: [0, 1, 0, 1, 0, 1] } };

    vrExplorationManager._deferHeavy("Building glyphs…", () => {});
    vrExplorationManager._drainDeferredWork();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it("toggleGlyphs() still returns false synchronously (without enqueuing) when the dataset has no vector/scalar arrays", () => {
    mockGlyphState.enabled = false;
    mockGlyphState.vectorArrays = [];
    mockGlyphState.scalarArrays = [];
    vrExplorationManager._activeContext = {
      instance: {
        viewConfigId: "view-1",
        instanceId: "inst-1",
        instanceData: { polydata: { fake: true } },
      },
    };

    const result = vrExplorationManager.toggleGlyphs();

    expect(result).toBe(false);
    expect(vrExplorationManager._deferredWork).toHaveLength(0);
    expect(vrExplorationManager.getPendingWorkLabel()).toBeNull();
  });
});
