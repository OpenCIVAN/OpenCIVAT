// src/core/instances/types/vtk/features/VTKClippingFeature.manual.test.js
// Widget-free ("manual") clipping path: VR (and any desktop instance with no
// widgetManager) drives a plain vtkPlane directly against the mapper instead
// of the interactive vtkImplicitPlaneWidget. Covers Phase 1b of the VR
// interaction plan.
import { describe, it, expect, vi, afterEach } from "vitest";
import { VTKClippingFeature } from "./VTKClippingFeature.js";
import { vtkPlaneWidget } from "../widgets/plane/VTKPlaneWidget.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeMapper() {
  return {
    getInputData: vi.fn(() => ({
      getBounds: () => [-1, 1, -2, 2, -3, 3],
    })),
    removeAllClippingPlanes: vi.fn(),
    addClippingPlane: vi.fn(),
  };
}

function makeFeatureWithState(overrides = {}) {
  const feature = new VTKClippingFeature();
  const mapper = overrides.mapper || makeMapper();
  const renderWindow = overrides.renderWindow || { render: vi.fn() };

  feature.instanceStates.set("inst-1", {
    enabled: false,
    widgetVisible: true,
    inverted: false,
    planePreset: "x",
    sceneObjects: { mapper, renderWindow },
    widgetManager: undefined, // no widget manager -> manual path by default
    bounds: null,
    center: null,
    manualClipPlane: null,
    ...overrides,
  });

  return { feature, mapper, renderWindow };
}

describe("VTKClippingFeature manual clip path", () => {
  it("enableClipping({manual:true}) with no widgetManager enables and adds a clipping plane", () => {
    const { feature, mapper, renderWindow } = makeFeatureWithState();

    feature.enableClipping("inst-1", { manual: true });

    const state = feature.instanceStates.get("inst-1");
    expect(state.enabled).toBe(true);
    expect(state.manualClipPlane).toBeTruthy();
    expect(mapper.addClippingPlane).toHaveBeenCalledWith(state.manualClipPlane);
    expect(renderWindow.render).toHaveBeenCalled();
  });

  it("enableClipping() (no options) also goes manual when there is no widgetManager", () => {
    const { feature } = makeFeatureWithState();

    feature.enableClipping("inst-1");

    const state = feature.instanceStates.get("inst-1");
    expect(state.enabled).toBe(true);
    expect(state.manualClipPlane).toBeTruthy();
  });

  it("_isManual reflects the presence of a manual clip plane", () => {
    const { feature } = makeFeatureWithState();
    const state = feature.instanceStates.get("inst-1");

    expect(feature._isManual(state)).toBe(false);
    feature.enableClipping("inst-1", { manual: true });
    expect(feature._isManual(feature.instanceStates.get("inst-1"))).toBe(true);
  });

  it("setPlaneData in manual mode calls removeAllClippingPlanes then addClippingPlane", () => {
    const { feature, mapper } = makeFeatureWithState();
    feature.enableClipping("inst-1", { manual: true });
    mapper.removeAllClippingPlanes.mockClear();
    mapper.addClippingPlane.mockClear();

    feature.setPlaneData("inst-1", { origin: [1, 2, 3], normal: [0, 1, 0] });

    expect(mapper.removeAllClippingPlanes).toHaveBeenCalled();
    expect(mapper.addClippingPlane).toHaveBeenCalled();

    const order = mapper.removeAllClippingPlanes.mock.invocationCallOrder[0];
    const addOrder = mapper.addClippingPlane.mock.invocationCallOrder[0];
    expect(order).toBeLessThan(addOrder);

    expect(feature.getManualPlane("inst-1")).toEqual({
      origin: [1, 2, 3],
      normal: [0, 1, 0],
    });
  });

  it("getConfigForSync -> applyRemoteConfig round-trips the plane in manual mode", () => {
    const { feature } = makeFeatureWithState();
    feature.enableClipping("inst-1", { manual: true });
    feature.setPlaneData("inst-1", { origin: [5, 6, 7], normal: [0, 0, 1] });

    const cfg = feature.getConfigForSync("inst-1");
    expect(cfg.enabled).toBe(true);
    expect(cfg.plane).toEqual({ origin: [5, 6, 7], normal: [0, 0, 1] });

    // Apply the same config onto a second, fresh manual instance and confirm
    // the plane round-trips.
    const { feature: peerFeature } = makeFeatureWithState();
    peerFeature.applyRemoteConfig("inst-1", cfg);

    const peerState = peerFeature.instanceStates.get("inst-1");
    expect(peerState.enabled).toBe(true);
    expect(peerFeature._isManual(peerState)).toBe(true);
    expect(peerFeature.getManualPlane("inst-1")).toEqual({
      origin: [5, 6, 7],
      normal: [0, 0, 1],
    });
  });

  it("invertClipping flips the normal in manual mode", () => {
    const { feature } = makeFeatureWithState();
    feature.enableClipping("inst-1", { manual: true });
    feature.setPlaneData("inst-1", { origin: [0, 0, 0], normal: [1, 0, 0] });

    feature.invertClipping("inst-1");

    expect(feature.instanceStates.get("inst-1").inverted).toBe(true);
    const plane = feature.getManualPlane("inst-1");
    expect(plane.origin).toEqual([0, 0, 0]);
    expect(plane.normal.map((n) => Math.abs(n))).toEqual([1, 0, 0]);
    expect(plane.normal[0]).toBeLessThan(0);
  });

  it("resetPlane restores the default preset in manual mode", () => {
    const { feature } = makeFeatureWithState();
    feature.enableClipping("inst-1", { manual: true });
    feature.setPlaneData("inst-1", { origin: [9, 9, 9], normal: [0, 1, 0] });
    feature.invertClipping("inst-1");

    feature.resetPlane("inst-1");

    const state = feature.instanceStates.get("inst-1");
    expect(state.inverted).toBe(false);
    // Default preset is "x" -> normal [1, 0, 0], origin at data center (0,0,0)
    expect(feature.getManualPlane("inst-1")).toEqual({
      origin: [0, 0, 0],
      normal: [1, 0, 0],
    });
  });

  it("_disableClipping clears the manual plane and calls removeAllClippingPlanes", () => {
    const { feature, mapper } = makeFeatureWithState();
    feature.enableClipping("inst-1", { manual: true });
    mapper.removeAllClippingPlanes.mockClear();

    feature.disableClipping("inst-1");

    const state = feature.instanceStates.get("inst-1");
    expect(state.manualClipPlane).toBeNull();
    expect(state.enabled).toBe(false);
    expect(mapper.removeAllClippingPlanes).toHaveBeenCalled();
  });

  describe("regression: widget path still works when a widgetManager IS present", () => {
    it("enableClipping() with a widgetManager uses vtkPlaneWidget, not the manual plane", () => {
      const initSpy = vi.spyOn(vtkPlaneWidget, "initialize").mockImplementation(() => {});
      vi.spyOn(vtkPlaneWidget, "setPlane").mockImplementation(() => {});
      vi.spyOn(vtkPlaneWidget, "getPlane").mockReturnValue({ origin: [0, 0, 0], normal: [1, 0, 0] });

      const { feature } = makeFeatureWithState({ widgetManager: {} });

      feature.enableClipping("inst-1");

      const state = feature.instanceStates.get("inst-1");
      expect(initSpy).toHaveBeenCalled();
      expect(state.enabled).toBe(true);
      expect(state.widgetVisible).toBe(true);
      expect(state.manualClipPlane).toBeNull();
      expect(feature._isManual(state)).toBe(false);
    });

    it("explicit {manual:true} still forces the manual path even with a widgetManager present", () => {
      const initSpy = vi.spyOn(vtkPlaneWidget, "initialize").mockImplementation(() => {});

      const { feature } = makeFeatureWithState({ widgetManager: {} });

      feature.enableClipping("inst-1", { manual: true });

      expect(initSpy).not.toHaveBeenCalled();
      expect(feature._isManual(feature.instanceStates.get("inst-1"))).toBe(true);
    });

    it("setPlaneData delegates to vtkPlaneWidget.setPlane when not manual", () => {
      vi.spyOn(vtkPlaneWidget, "initialize").mockImplementation(() => {});
      const setPlane = vi.spyOn(vtkPlaneWidget, "setPlane").mockImplementation(() => {});

      const { feature } = makeFeatureWithState({ widgetManager: {} });
      feature.enableClipping("inst-1");
      setPlane.mockClear();

      feature.setPlaneData("inst-1", { origin: [1, 1, 1], normal: [0, 1, 0] });

      expect(setPlane).toHaveBeenCalledWith("inst-1", { origin: [1, 1, 1], normal: [0, 1, 0] });
    });
  });
});
