// src/core/vr/__tests__/VRExplorationManager.persistence.test.js
// VR tool results (annotations, measurements) must persist through the same
// REST path desktop annotations use, so they broadcast to all participants.
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
vi.mock("@Init/appInitializer.js", () => ({
  getViewConfigurationManager: vi.fn(),
}));
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "user-1"),
  getUserName: vi.fn(() => "Tester"),
  getUserColor: vi.fn(() => "#ff0000"),
}));
vi.mock("@Core/instances/types/vtk/vr/VTKVRAvatars.js", () => ({
  vrAvatarSystem: { initialize: vi.fn() },
}));

const mockAnnotationManager = {
  createAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
};
vi.mock("@Core/data/managers/AnnotationManager.js", () => ({
  get annotationManager() {
    return mockAnnotationManager;
  },
}));

import { vrExplorationManager } from "../VRExplorationManager.js";

function primeActiveContext() {
  vrExplorationManager._activeContext = {
    instance: {
      instanceData: { dataset: { id: "ds-1" }, projectId: "proj-1" },
    },
  };
}

// Let the dynamic import and its promise chain settle
async function flush() {
  await vi.dynamicImportSettled();
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("VRExplorationManager tool-result persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeActiveContext();
    vrExplorationManager._toolManager = null;
  });

  it("persists annotation-created through annotationManager.createAnnotation", async () => {
    mockAnnotationManager.createAnnotation.mockResolvedValue({ id: "srv-1" });
    const data = {
      id: "annot_local",
      type: "marker",
      position: { x: 1, y: 2, z: 3 },
      normal: { x: 0, y: 1, z: 0 },
      text: "",
    };

    vrExplorationManager._handleToolAction({ type: "annotation-created", data });
    await flush();

    expect(mockAnnotationManager.createAnnotation).toHaveBeenCalledWith(
      "ds-1",
      expect.objectContaining({
        position: [1, 2, 3],
        normal: [0, 1, 0],
        type: "point",
        metadata: expect.objectContaining({ source: "vr", vrMode: "marker" }),
      }),
      { projectId: "proj-1" }
    );
    // Server id mapped back for undo
    expect(data.serverId).toBe("srv-1");
  });

  it("persists measurement-created as a measurement-type annotation at the midpoint", async () => {
    mockAnnotationManager.createAnnotation.mockResolvedValue({ id: "srv-2" });
    const data = {
      id: "measure_local",
      startPoint: { x: 0, y: 0, z: 0 },
      endPoint: { x: 2, y: 0, z: 0 },
      distance: 2,
      unit: "units",
    };

    vrExplorationManager._handleToolAction({ type: "measurement-created", data });
    await flush();

    expect(mockAnnotationManager.createAnnotation).toHaveBeenCalledWith(
      "ds-1",
      expect.objectContaining({
        position: [1, 0, 0],
        type: "measurement",
        metadata: expect.objectContaining({
          startPoint: [0, 0, 0],
          endPoint: [2, 0, 0],
          distance: 2,
        }),
      }),
      { projectId: "proj-1" }
    );
    expect(data.serverId).toBe("srv-2");
  });

  it("deletes the persisted annotation on undo when a server id exists", async () => {
    mockAnnotationManager.deleteAnnotation.mockResolvedValue();

    vrExplorationManager._handleToolAction({
      type: "annotation-removed",
      data: { id: "annot_local", serverId: "srv-1" },
    });
    await flush();

    expect(mockAnnotationManager.deleteAnnotation).toHaveBeenCalledWith("ds-1", "srv-1");
  });

  it("skips deletion when the annotation was never persisted", async () => {
    vrExplorationManager._handleToolAction({
      type: "annotation-removed",
      data: { id: "annot_local" },
    });
    await flush();

    expect(mockAnnotationManager.deleteAnnotation).not.toHaveBeenCalled();
  });

  it("does nothing without an active dataset context and survives network failure", async () => {
    vrExplorationManager._activeContext = null;
    vrExplorationManager._handleToolAction({
      type: "annotation-created",
      data: { position: { x: 1, y: 1, z: 1 } },
    });
    await flush();
    expect(mockAnnotationManager.createAnnotation).not.toHaveBeenCalled();

    // Rejected persistence must not throw out of the handler
    primeActiveContext();
    mockAnnotationManager.createAnnotation.mockRejectedValue(new Error("offline"));
    expect(() =>
      vrExplorationManager._handleToolAction({
        type: "annotation-created",
        data: { position: { x: 1, y: 1, z: 1 } },
      })
    ).not.toThrow();
    await flush();
  });
});

// ---------------------------------------------------------------------------
// Draft state machine wiring: fixing a point (annotation-pending) and
// discarding it (annotation-cancelled) must never touch the server — only
// Save (confirmAnnotationDraft -> annotation-created) may. Also covers the
// in-flight-undo hole: undo racing ahead of an in-flight create POST.
// ---------------------------------------------------------------------------
describe("VR annotation draft persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeActiveContext();
    vrExplorationManager._toolManager = null;
  });

  it("annotation-pending does NOT call createAnnotation", async () => {
    vrExplorationManager._handleToolAction({
      type: "annotation-pending",
      data: { id: "draft_1", position: { x: 1, y: 1, z: 1 } },
    });
    await flush();

    expect(mockAnnotationManager.createAnnotation).not.toHaveBeenCalled();
  });

  it("annotation-cancelled does NOT call createAnnotation", async () => {
    vrExplorationManager._handleToolAction({
      type: "annotation-cancelled",
      data: { id: "draft_1" },
    });
    await flush();

    expect(mockAnnotationManager.createAnnotation).not.toHaveBeenCalled();
  });

  it("confirmAnnotationDraft() routes through _handleToolAction and persists the typed text", async () => {
    mockAnnotationManager.createAnnotation.mockResolvedValue({ id: "srv-9" });

    const annotation = {
      id: "annot_local",
      type: "marker",
      position: { x: 1, y: 2, z: 3 },
      normal: null,
      timestamp: Date.now(),
      text: "Crack in the hull",
      color: [1, 0.5, 0],
      size: 0.02,
    };
    const fakeTool = {
      id: "annotate",
      confirmDraft: vi.fn(() => ({ type: "annotation-created", data: annotation })),
    };
    vrExplorationManager._toolManager = { getActiveTool: () => fakeTool };

    const result = vrExplorationManager.confirmAnnotationDraft();

    expect(result).toBe(true);
    expect(fakeTool.confirmDraft).toHaveBeenCalled();

    await flush();

    expect(mockAnnotationManager.createAnnotation).toHaveBeenCalledWith(
      "ds-1",
      expect.objectContaining({
        position: [1, 2, 3],
        text: "Crack in the hull",
        type: "point",
      }),
      { projectId: "proj-1" }
    );
    // Persisted onto the SAME object confirmDraft() returned.
    expect(annotation.serverId).toBe("srv-9");
  });

  it("no-ops safely when Annotate isn't the active tool (or no tool manager at all)", () => {
    expect(vrExplorationManager.confirmAnnotationDraft()).toBe(false);
    expect(vrExplorationManager.cancelAnnotationDraft()).toBe(false);
    expect(vrExplorationManager.getAnnotationDraft()).toBeNull();
    expect(vrExplorationManager.appendAnnotationDraft("x")).toBeNull();
    expect(vrExplorationManager.backspaceAnnotationDraft()).toBeNull();

    vrExplorationManager._toolManager = { getActiveTool: () => ({ id: "clip" }) };
    expect(vrExplorationManager.confirmAnnotationDraft()).toBe(false);
    expect(mockAnnotationManager.createAnnotation).not.toHaveBeenCalled();
  });

  it("in-flight undo: mark _deleted, resolve createAnnotation, assert deleteAnnotation fires", async () => {
    let resolveCreate;
    mockAnnotationManager.createAnnotation.mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; })
    );
    mockAnnotationManager.deleteAnnotation.mockResolvedValue();

    const data = {
      id: "annot_local",
      type: "marker",
      position: { x: 1, y: 2, z: 3 },
      normal: null,
      text: "",
    };

    vrExplorationManager._handleToolAction({ type: "annotation-created", data });
    // Let the create POST actually fire (and capture resolveCreate) before
    // the user's undo lands — mirrors a keyboard user hitting Undo a beat
    // before the network round-trip finishes.
    await flush();

    data._deleted = true; // VRAnnotationTool.undoLast()'s tombstone

    resolveCreate({ id: "srv-42" });
    await flush();

    expect(data.serverId).toBe("srv-42");
    expect(mockAnnotationManager.deleteAnnotation).toHaveBeenCalledWith("ds-1", "srv-42");
  });
});
