import { describe, it, expect, beforeEach, vi } from "vitest";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkPoints from "@kitware/vtk.js/Common/Core/Points";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import {
  VTKGlyphFeature,
  normalizeGlyphConfig,
  isVectorOrientationAvailable,
  isGlyphFeatureAvailable,
  getDisabledGlyphTypes,
} from "./VTKGlyphFeature.js";

function makeSyntheticPolydata(n = 10, { withVector = true, withScalar = true } = {}) {
  const xyz = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    xyz[i * 3] = i;
    xyz[i * 3 + 1] = 0;
    xyz[i * 3 + 2] = 0;
  }
  const points = vtkPoints.newInstance();
  points.setData(xyz, 3);

  const pd = vtkPolyData.newInstance();
  pd.setPoints(points);

  if (withVector) {
    const vecData = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      vecData[i * 3] = 1;
      vecData[i * 3 + 1] = 0;
      vecData[i * 3 + 2] = 0;
    }
    pd.getPointData().addArray(
      vtkDataArray.newInstance({ name: "velocity", numberOfComponents: 3, values: vecData })
    );
  }

  if (withScalar) {
    const scalarData = new Float32Array(n);
    for (let i = 0; i < n; i++) scalarData[i] = i;
    pd.getPointData().addArray(
      vtkDataArray.newInstance({ name: "temperature", numberOfComponents: 1, values: scalarData })
    );
  }

  return pd;
}

function makeMockSceneObjects() {
  const actors = [];
  return {
    renderer: {
      addActor: vi.fn((a) => actors.push(a)),
      removeActor: vi.fn((a) => {
        const i = actors.indexOf(a);
        if (i >= 0) actors.splice(i, 1);
      }),
      _actors: actors,
    },
    renderWindow: { render: vi.fn() },
    actor: {
      setVisibility: vi.fn(),
      getProperty: () => ({ getPointSize: () => 1, setPointSize: vi.fn() }),
    },
  };
}

describe("normalizeGlyphConfig", () => {
  it("returns safe defaults for an empty/missing config", () => {
    expect(normalizeGlyphConfig({})).toEqual({
      enabled: false,
      glyphType: "arrow",
      scaleFactor: 1.0,
      scalingMode: "vector",
      orientationArray: null,
      scaleArray: null,
      colorArray: null,
      colorMode: "solid",
      solidColor: [0.2, 0.4, 0.9],
      density: 1.0,
    });
  });

  it("does not crash on undefined/null input", () => {
    expect(() => normalizeGlyphConfig(undefined)).not.toThrow();
    expect(() => normalizeGlyphConfig(null)).not.toThrow();
    expect(normalizeGlyphConfig(null).glyphType).toBe("arrow");
  });

  it("falls back field-by-field on garbage/out-of-range input", () => {
    const result = normalizeGlyphConfig({
      glyphType: "not-a-type",
      scaleFactor: -5,
      density: 99,
      colorMode: "bogus",
    });
    expect(result.glyphType).toBe("arrow");
    expect(result.scaleFactor).toBe(1.0);
    expect(result.density).toBe(1);
    expect(result.colorMode).toBe("solid");
  });
});

describe("glyph validity helpers", () => {
  it("arrow requires a valid vector array", () => {
    const feature = new VTKGlyphFeature();
    const instanceId = "arrow-validity";
    feature.initialize(instanceId, { sceneObjects: makeMockSceneObjects() });

    const pd = makeSyntheticPolydata(10, { withVector: false, withScalar: true });
    feature.scanAvailableArrays(instanceId, pd);
    const state = feature.getState(instanceId);

    expect(isVectorOrientationAvailable(state.vectorArrays)).toBe(false);
    expect(getDisabledGlyphTypes(state.vectorArrays)).toContain("arrow");
  });

  it("dot glyph does not require vector orientation", () => {
    const feature = new VTKGlyphFeature();
    const instanceId = "dot-validity";
    feature.initialize(instanceId, { sceneObjects: makeMockSceneObjects() });

    const pd = makeSyntheticPolydata(10, { withVector: false, withScalar: true });
    feature.scanAvailableArrays(instanceId, pd);
    const state = feature.getState(instanceId);

    expect(getDisabledGlyphTypes(state.vectorArrays)).not.toContain("dot");

    expect(() => feature.enableGlyphs(instanceId, pd, { glyphType: "dot" })).not.toThrow();
    expect(feature.getState(instanceId).enabled).toBe(true);
  });

  it("missing vector and scalar arrays produces an unsupported/degraded state", () => {
    const feature = new VTKGlyphFeature();
    const instanceId = "degraded";
    feature.initialize(instanceId, { sceneObjects: makeMockSceneObjects() });

    const pd = makeSyntheticPolydata(10, { withVector: false, withScalar: false });
    feature.scanAvailableArrays(instanceId, pd);
    const state = feature.getState(instanceId);

    expect(isGlyphFeatureAvailable(state.vectorArrays, state.scalarArrays)).toBe(false);
  });
});

describe("VTKGlyphFeature actor lifecycle", () => {
  let feature;
  let sceneObjects;
  let instanceId;

  beforeEach(() => {
    feature = new VTKGlyphFeature();
    sceneObjects = makeMockSceneObjects();
    instanceId = "actor-lifecycle";
    feature.initialize(instanceId, { sceneObjects });
  });

  it("enabling glyphs adds exactly one actor and triggers a render", () => {
    const pd = makeSyntheticPolydata(10);
    feature.enableGlyphs(instanceId, pd);

    expect(sceneObjects.renderer.addActor).toHaveBeenCalledTimes(1);
    expect(sceneObjects.renderWindow.render).toHaveBeenCalled();
    expect(feature.getState(instanceId).enabled).toBe(true);
  });

  it("disabling glyphs removes the actor cleanly", () => {
    const pd = makeSyntheticPolydata(10);
    feature.enableGlyphs(instanceId, pd);
    feature.disableGlyphs(instanceId);

    expect(sceneObjects.renderer.removeActor).toHaveBeenCalledTimes(1);
    expect(sceneObjects.renderer._actors.length).toBe(0);
    expect(feature.getState(instanceId).enabled).toBe(false);
  });

  it("does not touch the original non-glyph actor's visibility on enable, and restores it on disable", () => {
    const pd = makeSyntheticPolydata(10);
    feature.enableGlyphs(instanceId, pd);
    expect(sceneObjects.actor.setVisibility).not.toHaveBeenCalled();

    feature.disableGlyphs(instanceId);
    expect(sceneObjects.actor.setVisibility).toHaveBeenCalledWith(true);
  });

  it("changing glyph type does not duplicate actors", () => {
    const pd = makeSyntheticPolydata(10);
    feature.enableGlyphs(instanceId, pd);

    feature.setGlyphType(instanceId, "cone");
    feature.setGlyphType(instanceId, "sphere");
    feature.setGlyphType(instanceId, "dot");

    expect(sceneObjects.renderer.addActor).toHaveBeenCalledTimes(1);
    expect(sceneObjects.renderer._actors.length).toBe(1);
  });

  it("repeated enable/disable toggling leaves no leftover actors", () => {
    const pd = makeSyntheticPolydata(10);
    for (let i = 0; i < 3; i++) {
      feature.enableGlyphs(instanceId, pd);
      feature.disableGlyphs(instanceId);
    }
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });
});

describe("VTKGlyphFeature density/subsample", () => {
  it("reduces the point count fed to the glyph mapper", () => {
    const feature = new VTKGlyphFeature();
    const sceneObjects = makeMockSceneObjects();
    const instanceId = "density";
    feature.initialize(instanceId, { sceneObjects });

    const pd = makeSyntheticPolydata(100);
    feature.enableGlyphs(instanceId, pd);

    const state = feature.instanceStates.get(instanceId);
    const before = state.glyphMapper.getInputData(0).getPoints().getNumberOfPoints();
    expect(before).toBe(100);

    feature.setDensity(instanceId, 0.1);
    const after = state.glyphMapper.getInputData(0).getPoints().getNumberOfPoints();

    expect(after).toBeLessThan(before);
    expect(after).toBeCloseTo(10, 0);
  });

  it("disposes the previous derived polydata instead of leaking it", () => {
    const feature = new VTKGlyphFeature();
    const sceneObjects = makeMockSceneObjects();
    const instanceId = "density-leak";
    feature.initialize(instanceId, { sceneObjects });

    const pd = makeSyntheticPolydata(100);
    feature.enableGlyphs(instanceId, pd);

    const state = feature.instanceStates.get(instanceId);
    feature.setDensity(instanceId, 0.1);
    const firstDerived = state.derivedPolydata;
    expect(firstDerived).not.toBeNull();

    feature.setDensity(instanceId, 0.5);
    expect(state.derivedPolydata).not.toBe(firstDerived);
  });

  it("full density (1.0) uses the base polydata directly (no derived copy)", () => {
    const feature = new VTKGlyphFeature();
    const sceneObjects = makeMockSceneObjects();
    const instanceId = "density-full";
    feature.initialize(instanceId, { sceneObjects });

    const pd = makeSyntheticPolydata(50);
    feature.enableGlyphs(instanceId, pd, { density: 1.0 });

    const state = feature.instanceStates.get(instanceId);
    expect(state.derivedPolydata).toBeNull();
    expect(state.glyphMapper.getInputData(0)).toBe(pd);
  });
});

describe("VTKGlyphFeature declarative config sync", () => {
  it("round-trips config from one instance to another via getConfigForSync/applyRemoteConfig", () => {
    const featureA = new VTKGlyphFeature();
    const sceneObjectsA = makeMockSceneObjects();
    const instanceIdA = "sync-a";
    featureA.initialize(instanceIdA, { sceneObjects: sceneObjectsA });

    const pdA = makeSyntheticPolydata(20);
    featureA.enableGlyphs(instanceIdA, pdA, {
      glyphType: "cone",
      scaleFactor: 2.0,
      density: 0.5,
      colorMode: "solid",
    });

    const synced = featureA.getConfigForSync(instanceIdA);

    const featureB = new VTKGlyphFeature();
    const sceneObjectsB = makeMockSceneObjects();
    const instanceIdB = "sync-b";
    featureB.initialize(instanceIdB, { sceneObjects: sceneObjectsB });
    const pdB = makeSyntheticPolydata(20);

    featureB.applyRemoteConfig(instanceIdB, pdB, synced);
    const stateB = featureB.getState(instanceIdB);

    expect(stateB.glyphType).toBe("cone");
    expect(stateB.scaleFactor).toBe(2.0);
    expect(stateB.density).toBe(0.5);
    expect(stateB.colorMode).toBe("solid");
  });

  it("applyRemoteConfig disables glyphs when enabled is false", () => {
    const feature = new VTKGlyphFeature();
    const sceneObjects = makeMockSceneObjects();
    const instanceId = "sync-disable";
    feature.initialize(instanceId, { sceneObjects });

    const pd = makeSyntheticPolydata(10);
    feature.enableGlyphs(instanceId, pd);
    expect(feature.getState(instanceId).enabled).toBe(true);

    feature.applyRemoteConfig(instanceId, pd, { enabled: false });
    expect(feature.getState(instanceId).enabled).toBe(false);
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("applyRemoteConfig does not throw when enabling without polydata (degrades safely)", () => {
    const feature = new VTKGlyphFeature();
    const sceneObjects = makeMockSceneObjects();
    const instanceId = "sync-no-polydata";
    feature.initialize(instanceId, { sceneObjects });

    expect(() =>
      feature.applyRemoteConfig(instanceId, null, { enabled: true, glyphType: "arrow" })
    ).not.toThrow();
    expect(feature.getState(instanceId).enabled).toBe(false);
  });

  it("applyRemoteConfig does not duplicate actors when config is applied repeatedly", () => {
    const feature = new VTKGlyphFeature();
    const sceneObjects = makeMockSceneObjects();
    const instanceId = "sync-repeat";
    feature.initialize(instanceId, { sceneObjects });

    const pd = makeSyntheticPolydata(10);
    const config = { enabled: true, glyphType: "sphere", scaleFactor: 1.5 };

    feature.applyRemoteConfig(instanceId, pd, config);
    feature.applyRemoteConfig(instanceId, pd, config);
    feature.applyRemoteConfig(instanceId, pd, { ...config, scaleFactor: 2.0 });

    expect(sceneObjects.renderer.addActor).toHaveBeenCalledTimes(1);
    expect(sceneObjects.renderer._actors.length).toBe(1);
  });
});
