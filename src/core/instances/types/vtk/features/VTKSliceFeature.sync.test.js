// src/core/instances/types/vtk/features/VTKSliceFeature.sync.test.js
// Collaborative sync surface of the slice feature: declarative config out
// (getConfigForSync) and remote reconciliation in (applyRemoteConfig).
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  VTKSliceFeature,
  normalizeSliceConfig,
} from "./VTKSliceFeature.js";

function makeFeatureWithState(overrides = {}) {
  const feature = new VTKSliceFeature();
  feature.instanceStates.set("inst-1", {
    enabled: false,
    sliceMode: 2, // Axial (K)
    sliceIndex: 5,
    windowWidth: 400,
    windowLevel: 200,
    windowPreset: "default",
    showCrosshair: false,
    interpolate: true,
    imageSlice: null,
    imageMapper: null,
    colorTransferFunction: null,
    imageData: null,
    extent: [0, 10, 0, 10, 0, 10],
    sliceRange: { min: 0, max: 10 },
    sceneObjects: { renderer: {}, renderWindow: { render: vi.fn() } },
    ...overrides,
  });
  return feature;
}

describe("normalizeSliceConfig", () => {
  it("fills defaults for malformed input", () => {
    expect(normalizeSliceConfig(undefined)).toEqual({
      enabled: false,
      sliceMode: 2,
      sliceIndex: 0,
      windowWidth: 400,
      windowLevel: 200,
      interpolate: true,
    });
    expect(normalizeSliceConfig({ sliceMode: 99 }).sliceMode).toBe(2);
    expect(normalizeSliceConfig({ sliceIndex: "x" }).sliceIndex).toBe(0);
  });

  it("passes through valid values", () => {
    const cfg = normalizeSliceConfig({
      enabled: true,
      sliceMode: 0,
      sliceIndex: 12,
      windowWidth: 80,
      windowLevel: 40,
      interpolate: false,
    });
    expect(cfg).toEqual({
      enabled: true,
      sliceMode: 0,
      sliceIndex: 12,
      windowWidth: 80,
      windowLevel: 40,
      interpolate: false,
    });
  });

  it("never throws on garbage input", () => {
    expect(() => normalizeSliceConfig(null)).not.toThrow();
    expect(() => normalizeSliceConfig("garbage")).not.toThrow();
    expect(() => normalizeSliceConfig(42)).not.toThrow();
  });
});

describe("VTKSliceFeature.getConfigForSync", () => {
  it("returns declarative params only (no imageData/mapper/actor)", () => {
    const feature = makeFeatureWithState({ enabled: true, sliceMode: 0, sliceIndex: 7 });
    const cfg = feature.getConfigForSync("inst-1");
    expect(cfg).toEqual({
      enabled: true,
      sliceMode: 0,
      sliceIndex: 7,
      windowWidth: 400,
      windowLevel: 200,
      interpolate: true,
    });
  });

  it("returns safe defaults for unknown instance", () => {
    const feature = new VTKSliceFeature();
    expect(feature.getConfigForSync("nope").enabled).toBe(false);
  });
});

describe("VTKSliceFeature.applyRemoteConfig", () => {
  let feature;

  beforeEach(() => {
    feature = makeFeatureWithState();
  });

  it("disables when remote config says disabled", () => {
    feature.instanceStates.get("inst-1").enabled = true;
    const disable = vi.spyOn(feature, "disableSliceViewing").mockImplementation(() => {});
    feature.applyRemoteConfig("inst-1", {}, { enabled: false });
    expect(disable).toHaveBeenCalledWith("inst-1");
  });

  it("warns and no-ops when enabling remotely with no imageData available", () => {
    const enable = vi.spyOn(feature, "enableSliceViewing").mockImplementation(() => Promise.resolve());
    feature.applyRemoteConfig("inst-1", null, { enabled: true });
    expect(enable).not.toHaveBeenCalled();
  });

  it("enables via enableSliceViewing then applies mode/index/window/level when not yet enabled", async () => {
    const enable = vi.spyOn(feature, "enableSliceViewing").mockImplementation(async (instanceId) => {
      // Mirror real enableSliceViewing flipping enabled=true.
      feature.instanceStates.get(instanceId).enabled = true;
    });
    const setSliceMode = vi.spyOn(feature, "setSliceMode").mockImplementation(() => {});
    const setSlice = vi.spyOn(feature, "setSlice").mockImplementation(() => {});
    const setWindowLevel = vi.spyOn(feature, "setWindowLevel").mockImplementation(() => {});

    const imageData = { fake: true };
    feature.applyRemoteConfig("inst-1", imageData, {
      enabled: true,
      sliceMode: 0,
      sliceIndex: 3,
      windowWidth: 80,
      windowLevel: 40,
      interpolate: true,
    });

    // enableSliceViewing() is async — flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(enable).toHaveBeenCalledWith("inst-1", imageData);
    expect(setSliceMode).toHaveBeenCalledWith("inst-1", 0);
    expect(setSlice).toHaveBeenCalledWith("inst-1", 3);
    expect(setWindowLevel).toHaveBeenCalledWith("inst-1", 80, 40);
  });

  it("applies only what changed via setters when already enabled", () => {
    feature.instanceStates.get("inst-1").enabled = true;
    const setSliceMode = vi.spyOn(feature, "setSliceMode").mockImplementation(() => {});
    const setSlice = vi.spyOn(feature, "setSlice").mockImplementation(() => {});
    const setWindowLevel = vi.spyOn(feature, "setWindowLevel").mockImplementation(() => {});
    const toggleInterpolation = vi.spyOn(feature, "toggleInterpolation").mockImplementation(() => {});
    const enable = vi.spyOn(feature, "enableSliceViewing");

    feature.applyRemoteConfig("inst-1", {}, {
      enabled: true,
      sliceMode: 2, // matches current state — should not be re-applied
      sliceIndex: 8, // differs from current (5)
      windowWidth: 400,
      windowLevel: 200,
      interpolate: true,
    });

    expect(enable).not.toHaveBeenCalled();
    expect(setSliceMode).not.toHaveBeenCalled();
    expect(setSlice).toHaveBeenCalledWith("inst-1", 8);
    expect(setWindowLevel).not.toHaveBeenCalled();
    expect(toggleInterpolation).not.toHaveBeenCalled();
  });

  it("is a no-op for unknown instances and never throws on garbage", () => {
    expect(() => feature.applyRemoteConfig("nope", null, null)).not.toThrow();
    expect(() => feature.applyRemoteConfig("inst-1", {}, { sliceMode: "bogus" })).not.toThrow();
  });
});
