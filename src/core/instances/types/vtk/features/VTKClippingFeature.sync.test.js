// src/core/instances/types/vtk/features/VTKClippingFeature.sync.test.js
// Collaborative sync surface of the clipping feature: declarative config out
// (getConfigForSync) and remote reconciliation in (applyRemoteConfig).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VTKClippingFeature,
  normalizeClippingConfig,
} from "./VTKClippingFeature.js";
import { vtkPlaneWidget } from "../widgets/plane/VTKPlaneWidget.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFeatureWithState(overrides = {}) {
  const feature = new VTKClippingFeature();
  feature.instanceStates.set("inst-1", {
    enabled: false,
    widgetVisible: true,
    inverted: false,
    planePreset: "x",
    sceneObjects: { mapper: {}, renderWindow: { render: vi.fn() } },
    widgetManager: {},
    bounds: null,
    center: null,
    manualClipPlane: null,
    ...overrides,
  });
  return feature;
}

describe("normalizeClippingConfig", () => {
  it("fills defaults for malformed input", () => {
    expect(normalizeClippingConfig(undefined)).toEqual({
      enabled: false,
      inverted: false,
      planePreset: "x",
      plane: null,
    });
    expect(normalizeClippingConfig({ planePreset: "bogus" }).planePreset).toBe("x");
  });

  it("passes through valid values including a well-formed plane", () => {
    const cfg = normalizeClippingConfig({
      enabled: true,
      inverted: true,
      planePreset: "z",
      plane: { origin: [1, 2, 3], normal: [0, 0, 1] },
    });
    expect(cfg).toEqual({
      enabled: true,
      inverted: true,
      planePreset: "z",
      plane: { origin: [1, 2, 3], normal: [0, 0, 1] },
    });
  });

  it("drops a malformed plane instead of throwing", () => {
    expect(normalizeClippingConfig({ plane: { origin: [1, 2] } }).plane).toBeNull();
    expect(normalizeClippingConfig({ plane: "garbage" }).plane).toBeNull();
  });

  it("never throws on garbage input", () => {
    expect(() => normalizeClippingConfig(null)).not.toThrow();
    expect(() => normalizeClippingConfig("garbage")).not.toThrow();
    expect(() => normalizeClippingConfig(42)).not.toThrow();
  });
});

describe("VTKClippingFeature.getConfigForSync", () => {
  it("returns declarative params including the live plane when enabled", () => {
    const feature = makeFeatureWithState({ enabled: true, inverted: true, planePreset: "y" });
    vi.spyOn(vtkPlaneWidget, "getPlane").mockReturnValue({ origin: [0, 1, 0], normal: [0, 1, 0] });

    const cfg = feature.getConfigForSync("inst-1");

    expect(cfg).toEqual({
      enabled: true,
      inverted: true,
      planePreset: "y",
      plane: { origin: [0, 1, 0], normal: [0, 1, 0] },
    });
  });

  it("omits the plane when disabled", () => {
    const feature = makeFeatureWithState({ enabled: false });
    const getPlane = vi.spyOn(vtkPlaneWidget, "getPlane");

    const cfg = feature.getConfigForSync("inst-1");

    expect(cfg.plane).toBeNull();
    expect(getPlane).not.toHaveBeenCalled();
  });

  it("returns safe defaults for unknown instance", () => {
    const feature = new VTKClippingFeature();
    expect(feature.getConfigForSync("nope").enabled).toBe(false);
  });
});

describe("VTKClippingFeature.applyRemoteConfig", () => {
  let feature;

  beforeEach(() => {
    feature = makeFeatureWithState();
  });

  it("disables when remote config says disabled", () => {
    feature.instanceStates.get("inst-1").enabled = true;
    const disable = vi.spyOn(feature, "disableClipping").mockImplementation(() => {});
    feature.applyRemoteConfig("inst-1", { enabled: false });
    expect(disable).toHaveBeenCalledWith("inst-1");
  });

  it("enables, applies inversion, and sets the exact plane when provided", () => {
    const enable = vi.spyOn(feature, "enableClipping").mockImplementation(() => {
      feature.instanceStates.get("inst-1").enabled = true;
    });
    const invert = vi.spyOn(feature, "invertClipping").mockImplementation(() => {});
    const setPlaneData = vi.spyOn(feature, "setPlaneData").mockImplementation(() => {});
    const setPlanePreset = vi.spyOn(feature, "setPlanePreset");

    feature.applyRemoteConfig("inst-1", {
      enabled: true,
      inverted: true,
      planePreset: "z",
      plane: { origin: [1, 1, 1], normal: [0, 0, 1] },
    });

    expect(enable).toHaveBeenCalledWith("inst-1");
    expect(invert).toHaveBeenCalledWith("inst-1");
    expect(setPlaneData).toHaveBeenCalledWith("inst-1", { origin: [1, 1, 1], normal: [0, 0, 1] });
    expect(setPlanePreset).not.toHaveBeenCalled();
    expect(feature.instanceStates.get("inst-1").planePreset).toBe("z");
  });

  it("falls back to the preset when no exact plane is given", () => {
    vi.spyOn(feature, "enableClipping").mockImplementation(() => {
      feature.instanceStates.get("inst-1").enabled = true;
    });
    const setPlanePreset = vi.spyOn(feature, "setPlanePreset").mockImplementation(() => {});
    const setPlaneData = vi.spyOn(feature, "setPlaneData");

    feature.applyRemoteConfig("inst-1", { enabled: true, planePreset: "y" });

    expect(setPlanePreset).toHaveBeenCalledWith("inst-1", "y");
    expect(setPlaneData).not.toHaveBeenCalled();
  });

  it("does not re-invert when already matching remote inverted state", () => {
    feature.instanceStates.get("inst-1").enabled = true;
    feature.instanceStates.get("inst-1").inverted = true;
    const invert = vi.spyOn(feature, "invertClipping").mockImplementation(() => {});
    vi.spyOn(feature, "setPlanePreset").mockImplementation(() => {});

    feature.applyRemoteConfig("inst-1", { enabled: true, inverted: true, planePreset: "x" });

    expect(invert).not.toHaveBeenCalled();
  });

  it("is a no-op for unknown instances and never throws on garbage", () => {
    expect(() => feature.applyRemoteConfig("nope", null)).not.toThrow();
    expect(() => feature.applyRemoteConfig("inst-1", { planePreset: 42 })).not.toThrow();
  });
});
