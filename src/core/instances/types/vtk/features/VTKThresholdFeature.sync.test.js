// src/core/instances/types/vtk/features/VTKThresholdFeature.sync.test.js
// Collaborative sync surface of the threshold feature: declarative config
// out (getConfigForSync) and remote reconciliation in (applyRemoteConfig).
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  VTKThresholdFeature,
  normalizeThresholdConfig,
} from "./VTKThresholdFeature.js";

function makeFeatureWithState(overrides = {}) {
  const feature = new VTKThresholdFeature();
  feature.instanceStates.set("inst-1", {
    enabled: false,
    mode: "between",
    minValue: 0,
    maxValue: 10,
    selectedArray: "pressure",
    availableArrays: [
      { name: "pressure", type: "point", range: [0, 10] },
      { name: "velocity_mag", type: "point", range: [0, 100] },
    ],
    scalarRange: [0, 10],
    sceneObjects: { renderWindow: { render: vi.fn() } },
    originalPolydata: {},
    calculator: null,
    thresholdMapper: null,
    thresholdActor: null,
    originalActor: null,
    ...overrides,
  });
  return feature;
}

describe("normalizeThresholdConfig", () => {
  it("fills defaults for malformed input", () => {
    expect(normalizeThresholdConfig(undefined)).toEqual({
      enabled: false,
      mode: "between",
      minValue: 0,
      maxValue: 1,
      selectedArray: null,
    });
    expect(normalizeThresholdConfig({ mode: "bogus", minValue: "x" }).mode).toBe("between");
  });

  it("passes through valid values", () => {
    const cfg = normalizeThresholdConfig({
      enabled: true,
      mode: "above",
      minValue: 2,
      maxValue: 8,
      selectedArray: "pressure",
    });
    expect(cfg).toEqual({
      enabled: true,
      mode: "above",
      minValue: 2,
      maxValue: 8,
      selectedArray: "pressure",
    });
  });
});

describe("VTKThresholdFeature.getConfigForSync", () => {
  it("returns declarative params only (no actors/arrays/data)", () => {
    const feature = makeFeatureWithState({ enabled: true, mode: "above", minValue: 3 });
    const cfg = feature.getConfigForSync("inst-1");
    expect(cfg).toEqual({
      enabled: true,
      mode: "above",
      minValue: 3,
      maxValue: 10,
      selectedArray: "pressure",
    });
  });

  it("returns safe defaults for unknown instance", () => {
    const feature = new VTKThresholdFeature();
    expect(feature.getConfigForSync("nope").enabled).toBe(false);
  });
});

describe("VTKThresholdFeature.applyRemoteConfig", () => {
  let feature;

  beforeEach(() => {
    feature = makeFeatureWithState();
  });

  it("disables when remote config says disabled", () => {
    feature.instanceStates.get("inst-1").enabled = true;
    const disable = vi.spyOn(feature, "disableThreshold").mockImplementation(() => {});
    feature.applyRemoteConfig("inst-1", { enabled: false });
    expect(disable).toHaveBeenCalledWith("inst-1");
  });

  it("selects the remote array by name, sets mode and range, then enables", () => {
    const selectArray = vi.spyOn(feature, "selectArray");
    const setMode = vi.spyOn(feature, "setMode");
    const setRange = vi.spyOn(feature, "setRange");
    const enable = vi.spyOn(feature, "enableThreshold").mockImplementation(() => {});

    feature.applyRemoteConfig("inst-1", {
      enabled: true,
      mode: "above",
      minValue: 20,
      maxValue: 80,
      selectedArray: "velocity_mag",
    });

    expect(selectArray).toHaveBeenCalledWith("inst-1", "velocity_mag");
    expect(setMode).toHaveBeenCalledWith("inst-1", "above");
    expect(setRange).toHaveBeenCalledWith("inst-1", 20, 80);
    expect(enable).toHaveBeenCalledWith("inst-1");
  });

  it("ignores an array name that does not exist locally", () => {
    const selectArray = vi.spyOn(feature, "selectArray");
    vi.spyOn(feature, "enableThreshold").mockImplementation(() => {});

    feature.applyRemoteConfig("inst-1", {
      enabled: true,
      selectedArray: "does_not_exist",
      minValue: 1,
      maxValue: 2,
    });

    expect(selectArray).not.toHaveBeenCalled();
  });

  it("is a no-op for unknown instances and never throws on garbage", () => {
    expect(() => feature.applyRemoteConfig("nope", null)).not.toThrow();
    expect(() => feature.applyRemoteConfig("inst-1", { mode: 42 })).not.toThrow();
  });
});
