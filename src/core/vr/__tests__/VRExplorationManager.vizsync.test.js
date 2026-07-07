// src/core/vr/__tests__/VRExplorationManager.vizsync.test.js
// VR clip/slice gestures must reach collaborators + persistence through the
// same visualization-sync channel the desktop menus use — and only on gesture
// end (final: true), never per drag frame.
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

const mockClipConfig = { enabled: true, plane: { origin: [0, 0, 0], normal: [1, 0, 0] } };
const mockSliceConfig = { enabled: true, sliceMode: 2, sliceIndex: 5 };
vi.mock("@Core/instances/types/vtk/features/index.js", () => ({
  vtkClippingFeature: { getConfigForSync: vi.fn(() => mockClipConfig) },
  vtkSliceFeature: { getConfigForSync: vi.fn(() => mockSliceConfig) },
}));

const mockPush = vi.fn(() => Promise.resolve());
vi.mock("@Services/visualizationSyncService.js", () => ({
  pushSharedVisualizationUpdate: (...args) => mockPush(...args),
}));

import { vrExplorationManager } from "../VRExplorationManager.js";

describe("VRExplorationManager — VR clip/slice visualization sync", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vrExplorationManager._activeContext = {
      instance: { viewConfigId: "view-1", instanceId: "inst-1" },
      vrContext: { instanceId: "inst-1" },
    };
  });

  it("pushes clipBox config on final clip-box-updated actions", () => {
    vrExplorationManager._handleToolAction({
      type: "clip-box-updated",
      data: { instanceId: "inst-1", final: true },
    });
    expect(mockPush).toHaveBeenCalledWith("view-1", { clipBox: mockClipConfig });
  });

  it("does NOT push during drag frames (final: false)", () => {
    vrExplorationManager._handleToolAction({
      type: "clip-box-updated",
      data: { instanceId: "inst-1", final: false },
    });
    vrExplorationManager._handleToolAction({
      type: "slice-plane-updated",
      data: { final: false },
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pushes slicePlane config on final slice-plane-updated actions", () => {
    vrExplorationManager._handleToolAction({
      type: "slice-plane-updated",
      data: { origin: [0, 0, 0], normal: [0, 1, 0], final: true },
    });
    expect(mockPush).toHaveBeenCalledWith("view-1", { slicePlane: mockSliceConfig });
  });

  it("no-ops without an active context and never throws", () => {
    vrExplorationManager._activeContext = null;
    expect(() =>
      vrExplorationManager._handleToolAction({
        type: "clip-box-updated",
        data: { final: true },
      })
    ).not.toThrow();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("probe actions stay local (no sync)", () => {
    vrExplorationManager._handleToolAction({
      type: "probe-created",
      data: { value: 42 },
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
