// src/core/vr/__tests__/VRExplorationManager.vizsync.test.js
// VR visualization changes (clip gestures, representation cycling, glyph
// toggling) must reach collaborators + persistence through the same
// visualization-sync channel the desktop menus use — and for drag gestures,
// only on gesture end (final: true), never per drag frame.
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

const mockClipConfig = { enabled: true, plane: { origin: [0, 0, 0], normal: [1, 0, 0] } };
vi.mock("@Core/instances/types/vtk/features/index.js", () => ({
  vtkClippingFeature: { getConfigForSync: vi.fn(() => mockClipConfig) },
}));

const mockGlyphConfig = { enabled: true, glyphType: "arrow" };
const mockGlyphState = {
  enabled: false,
  vectorArrays: [{ name: "velocity" }],
  scalarArrays: [],
};
vi.mock("@Core/instances/types/vtk/features/VTKGlyphFeature.js", () => ({
  vtkGlyphFeature: {
    getState: vi.fn(() => mockGlyphState),
    enableGlyphs: vi.fn(),
    disableGlyphs: vi.fn(),
    setGlyphType: vi.fn(),
    getConfigForSync: vi.fn(() => mockGlyphConfig),
  },
  isGlyphFeatureAvailable: vi.fn(() => true),
  getDisabledGlyphTypes: vi.fn(() => []),
}));

vi.mock("@VTK/vtkInstanceTools.js", () => ({
  instanceTools: {
    getRepresentation: vi.fn(() => "surface"),
    setRepresentation: vi.fn(),
  },
}));

const mockPush = vi.fn(() => Promise.resolve());
vi.mock("@Services/visualizationSyncService.js", () => ({
  pushSharedVisualizationUpdate: (...args) => mockPush(...args),
}));

import { vrExplorationManager } from "../VRExplorationManager.js";
import { instanceTools } from "@VTK/vtkInstanceTools.js";
import {
  vtkGlyphFeature,
  getDisabledGlyphTypes,
} from "@Core/instances/types/vtk/features/VTKGlyphFeature.js";

describe("VRExplorationManager — VR visualization sync (clip/representation/glyphs)", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.mocked(instanceTools.setRepresentation).mockClear();
    vi.mocked(vtkGlyphFeature.enableGlyphs).mockClear();
    vi.mocked(vtkGlyphFeature.disableGlyphs).mockClear();
    vi.mocked(vtkGlyphFeature.setGlyphType).mockClear();
    vi.mocked(getDisabledGlyphTypes).mockReturnValue([]);
    mockGlyphState.enabled = false;
    mockGlyphState.vectorArrays = [{ name: "velocity" }];
    mockGlyphState.scalarArrays = [];
    // cycleRepresentation/toggleGlyphs now defer their expensive call to the
    // end of the next XR frame (see VRExplorationManager._deferHeavy) —
    // start each test with an empty queue so one test's leftover deferred
    // task can never bleed into the next.
    vrExplorationManager._deferredWork = [];
    vrExplorationManager._pendingWorkLabel = null;
    vrExplorationManager._activeContext = {
      instance: {
        viewConfigId: "view-1",
        instanceId: "inst-1",
        instanceData: { polydata: { fake: true } },
      },
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
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("cycleRepresentation returns the optimistic mode immediately, then renders + pushes once the frame drains", () => {
    const next = vrExplorationManager.cycleRepresentation();
    expect(next).toBe("wireframe"); // surface → wireframe

    // Deferred (see VRExplorationManager._deferHeavy) — nothing has run yet.
    expect(instanceTools.setRepresentation).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    vrExplorationManager._drainDeferredWork();

    expect(instanceTools.setRepresentation).toHaveBeenCalledWith("inst-1", "wireframe");
    expect(mockPush).toHaveBeenCalledWith("view-1", { representation: "wireframe" });
  });

  it("toggleGlyphs returns the optimistic enabled state immediately, then enables + pushes once the frame drains", () => {
    const enabled = vrExplorationManager.toggleGlyphs();
    expect(enabled).toBe(true);

    expect(vtkGlyphFeature.enableGlyphs).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    vrExplorationManager._drainDeferredWork();

    // Settings are chosen from what the DATA has rather than inherited from
    // VTKGlyphFeature's defaults, which assume an oriented arrow and a
    // meaningless absolute scaleFactor of 1.0. With a vector array present:
    // arrow, oriented and scaled by that array's magnitude ('scalar' is the one
    // SCALING_MODES entry that maps correctly onto vtk.js's enum).
    expect(vtkGlyphFeature.enableGlyphs).toHaveBeenCalledWith(
      "inst-1",
      { fake: true },
      expect.objectContaining({
        glyphType: "arrow",
        scalingMode: "scalar",
        orientationArray: "velocity",
        scaleArray: "velocity",
      })
    );
    // And a size derived from the data rather than a hardcoded 1.0.
    const opts = vtkGlyphFeature.enableGlyphs.mock.calls[0][2];
    expect(Number.isFinite(opts.scaleFactor)).toBe(true);
    expect(opts.scaleFactor).toBeGreaterThan(0);

    expect(mockPush).toHaveBeenCalledWith("view-1", { glyph: mockGlyphConfig });
  });

  it("toggleGlyphs disables when already enabled and still pushes the patch once drained", () => {
    mockGlyphState.enabled = true;
    const enabled = vrExplorationManager.toggleGlyphs();
    expect(enabled).toBe(false);

    expect(vtkGlyphFeature.disableGlyphs).not.toHaveBeenCalled();

    vrExplorationManager._drainDeferredWork();

    expect(vtkGlyphFeature.disableGlyphs).toHaveBeenCalledWith("inst-1");
    expect(mockPush).toHaveBeenCalledWith("view-1", { glyph: mockGlyphConfig });
  });

  // setGlyphType exposes the SAME desktop VTKGlyphFeature API as toggleGlyphs
  // above (mirrors VTKGlyphFeature.test.js's own setGlyphType coverage at the
  // manager layer) — but lets the caller pick a shape rather than always
  // auto-picking arrow-or-sphere, which is what made VR glyphs look "random".
  describe("setGlyphType", () => {
    it("enables WITH the requested type when not yet enabled, deferred", () => {
      const accepted = vrExplorationManager.setGlyphType("cone");
      expect(accepted).toBe(true);

      expect(vtkGlyphFeature.enableGlyphs).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      vrExplorationManager._drainDeferredWork();

      expect(vtkGlyphFeature.enableGlyphs).toHaveBeenCalledWith(
        "inst-1",
        { fake: true },
        expect.objectContaining({ glyphType: "cone", orientationArray: "velocity" })
      );
      expect(mockPush).toHaveBeenCalledWith("view-1", { glyph: mockGlyphConfig });
    });

    it("swaps the shape synchronously (not deferred) when glyphs are already enabled", () => {
      mockGlyphState.enabled = true;
      const accepted = vrExplorationManager.setGlyphType("sphere");
      expect(accepted).toBe(true);

      // Cheap — setGlyphType only rebuilds the glyph source, not the mapper —
      // so unlike the initial enable above it runs immediately, no drain needed.
      expect(vtkGlyphFeature.setGlyphType).toHaveBeenCalledWith("inst-1", "sphere");
      expect(mockPush).toHaveBeenCalledWith("view-1", { glyph: mockGlyphConfig });
    });

    it("disables with typeId === null, same as toggleGlyphs' disable branch", () => {
      mockGlyphState.enabled = true;
      const accepted = vrExplorationManager.setGlyphType(null);
      expect(accepted).toBe(true);
      expect(vtkGlyphFeature.disableGlyphs).not.toHaveBeenCalled();

      vrExplorationManager._drainDeferredWork();

      expect(vtkGlyphFeature.disableGlyphs).toHaveBeenCalledWith("inst-1");
      expect(mockPush).toHaveBeenCalledWith("view-1", { glyph: mockGlyphConfig });
    });

    it("refuses a type requiring orientation when the dataset has no vector array", () => {
      vi.mocked(getDisabledGlyphTypes).mockReturnValue(["arrow"]);
      const accepted = vrExplorationManager.setGlyphType("arrow");

      expect(accepted).toBe(false);
      expect(vtkGlyphFeature.enableGlyphs).not.toHaveBeenCalled();
      expect(vtkGlyphFeature.setGlyphType).not.toHaveBeenCalled();
      // Refusal is reported, not silent — see the notice-visibility fix.
      expect(vrExplorationManager.getVRNotice()).toMatch(/vector array/i);
    });

    it("returns false without an active context and never throws", () => {
      vrExplorationManager._activeContext = null;
      expect(() => vrExplorationManager.setGlyphType("arrow")).not.toThrow();
      expect(vrExplorationManager.setGlyphType("arrow")).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("no-ops without an active context and never throws", () => {
    vrExplorationManager._activeContext = null;
    expect(() =>
      vrExplorationManager._handleToolAction({
        type: "clip-box-updated",
        data: { final: true },
      })
    ).not.toThrow();
    expect(vrExplorationManager.cycleRepresentation()).toBeNull();
    expect(vrExplorationManager.toggleGlyphs()).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
    // Neither no-op path should have queued anything.
    expect(vrExplorationManager._deferredWork).toHaveLength(0);
  });

  it("probe actions stay local (no sync)", () => {
    vrExplorationManager._handleToolAction({
      type: "probe-created",
      data: { value: 42 },
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
