// src/core/vr/__tests__/VRExplorationManager.isolation.test.js
// Isolation mode = pure vrScale/vrOrigin change (room-scale walk-around),
// fully reversible on exit.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

const mockVrManager = {
  isVRSupported: vi.fn(() => false),
  isSelectPressed: vi.fn(() => false),
  enterIsolationMode: vi.fn(),
  exitIsolationMode: vi.fn(),
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
  vrAvatarSystem: { initialize: vi.fn(), dispose: vi.fn(), update: vi.fn() },
}));

import { vrExplorationManager } from "../VRExplorationManager.js";

describe("VRExplorationManager isolation mode", () => {
  let ctx;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = {
      // 2 x 2 x 1 box centered at (1, 1, 0.5), diagonal = 3
      dataBounds: [0, 2, 0, 2, 0, 1],
      vrScale: 0.4,
      vrOrigin: [5, 6, 7],
      instanceId: "inst-1",
    };
    vrExplorationManager._isolationBackup = null;
    vrExplorationManager._navigationController = null;
    vrExplorationManager._activeContext = {
      vrContext: ctx,
      instance: { viewConfigId: "view-1" },
    };
  });

  it("enterIsolation auto-fits the model and rests it on the pedestal", () => {
    const ok = vrExplorationManager.enterIsolation();

    expect(ok).toBe(true);

    // Auto-fit: the bounding diagonal spans the standard physical fit size.
    // Asserted via the invariant rather than a hard-coded scale so the fit
    // geometry can be retuned without rewriting this test.
    expect(3 * ctx.vrScale).toBeCloseTo(1.36, 1);

    // Centred in X, placed in front along Z.
    expect(ctx.vrOrigin[0]).toBeCloseTo(1, 5);
    expect((0.5 - ctx.vrOrigin[2]) * ctx.vrScale).toBeLessThan(-2);

    // GROUNDED: the data-space bottom (dataBounds[2] = 0) maps to physical
    // y = PEDESTAL_HEIGHT_M (0.5), not the literal floor — see
    // VRExplorationManager.js's PEDESTAL_HEIGHT_M. This is what stops a
    // two-hand zoom lifting the model overhead.
    expect((ctx.dataBounds[2] - ctx.vrOrigin[1]) * ctx.vrScale).toBeCloseTo(0.5, 10);

    expect(mockVrManager.enterIsolationMode).toHaveBeenCalledWith("view-1");
    expect(vrExplorationManager.isIsolated()).toBe(true);
  });

  it("exitIsolation restores the previous scale and horizontal position, re-grounded", () => {
    vrExplorationManager.enterIsolation();
    const ok = vrExplorationManager.exitIsolation();

    expect(ok).toBe(true);
    expect(ctx.vrScale).toBe(0.4);
    // X/Z restored verbatim. Y is deliberately RE-GROUNDED rather than
    // restored: dataBounds can change while isolated (a filter swapping the
    // actor), which would make the backed-up Y stale and leave the dataset
    // floating or sunk on exit.
    expect(ctx.vrOrigin[0]).toBe(5);
    expect(ctx.vrOrigin[2]).toBe(7);
    expect((ctx.dataBounds[2] - ctx.vrOrigin[1]) * ctx.vrScale).toBeCloseTo(0.5, 10);
    expect(mockVrManager.exitIsolationMode).toHaveBeenCalled();
    expect(vrExplorationManager.isIsolated()).toBe(false);
  });

  it("toggleIsolation flips between states", () => {
    vrExplorationManager.toggleIsolation();
    expect(vrExplorationManager.isIsolated()).toBe(true);
    vrExplorationManager.toggleIsolation();
    expect(vrExplorationManager.isIsolated()).toBe(false);
  });

  it("enterIsolation is idempotent and exitIsolation without enter is a no-op", () => {
    vrExplorationManager.enterIsolation();
    const backup = vrExplorationManager._isolationBackup;
    vrExplorationManager.enterIsolation();
    expect(vrExplorationManager._isolationBackup).toBe(backup);

    vrExplorationManager.exitIsolation();
    expect(vrExplorationManager.exitIsolation()).toBe(false);
  });

  it("does nothing without an active VR context", () => {
    vrExplorationManager._activeContext = null;
    expect(vrExplorationManager.enterIsolation()).toBe(false);
    expect(mockVrManager.enterIsolationMode).not.toHaveBeenCalled();
  });
});
