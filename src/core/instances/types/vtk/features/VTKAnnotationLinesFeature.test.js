// src/core/instances/types/vtk/features/VTKAnnotationLinesFeature.test.js
// Covers: measurement annotation content parsing, live add/remove lifecycle
// via AnnotationManager events, malformed content handling, and cleanup.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { render: mkLog(), createLogger: () => mkLog() };
});

const mockApiClient = { get: vi.fn(async () => ({ annotations: [] })) };
vi.mock("@Services/apiClient.js", () => ({
  get apiClient() {
    return mockApiClient;
  },
}));

let mockAnnotationManager = null;
vi.mock("@Init/appInitializer.js", () => ({
  getAnnotationManager: vi.fn(() => mockAnnotationManager),
}));

import {
  VTKAnnotationLinesFeature,
  parseMeasurementAnnotation,
  parsePointAnnotation,
} from "./VTKAnnotationLinesFeature.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMeasurementAnnotation(overrides = {}) {
  return {
    id: "annot-1",
    type: "measurement",
    metadata: {
      startPoint: [0, 0, 0],
      endPoint: [3, 4, 0],
      distance: 5,
      unit: "mm",
    },
    ...overrides,
  };
}

/** Minimal fake AnnotationManager exposing the BaseManager on()/_emit() shape. */
function makePointAnnotation(overrides = {}) {
  return {
    id: "pt-1",
    type: "point",
    position: [1, 2, 3],
    text: "VR marker",
    metadata: { source: "vr", vrMode: "marker", color: [1, 0, 0] },
    ...overrides,
  };
}

function makeFakeAnnotationManager() {
  const listeners = new Map();
  return {
    on: vi.fn((event, cb) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(cb);
      return () => {
        const arr = listeners.get(event) || [];
        const i = arr.indexOf(cb);
        if (i !== -1) arr.splice(i, 1);
      };
    }),
    _emit(event, data) {
      for (const cb of listeners.get(event) || []) cb(data);
    },
    _listenerCount(event) {
      return (listeners.get(event) || []).length;
    },
  };
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
  };
}

beforeEach(() => {
  mockAnnotationManager = null;
  mockApiClient.get.mockReset().mockResolvedValue({ annotations: [] });
});

// ---------------------------------------------------------------------------
// parseMeasurementAnnotation
// ---------------------------------------------------------------------------

describe("parseMeasurementAnnotation", () => {
  it("extracts line endpoints, distance, and unit from a well-formed annotation", () => {
    const parsed = parseMeasurementAnnotation(makeMeasurementAnnotation());
    expect(parsed).toEqual({
      id: "annot-1",
      startPoint: [0, 0, 0],
      endPoint: [3, 4, 0],
      distance: 5,
      unit: "mm",
    });
  });

  it("defaults unit to 'units' when metadata omits it", () => {
    const parsed = parseMeasurementAnnotation(
      makeMeasurementAnnotation({ metadata: { startPoint: [0, 0, 0], endPoint: [1, 0, 0], distance: 1 } })
    );
    expect(parsed.unit).toBe("units");
  });

  it("recomputes distance from points when metadata.distance is missing", () => {
    const parsed = parseMeasurementAnnotation(
      makeMeasurementAnnotation({
        metadata: { startPoint: [0, 0, 0], endPoint: [3, 4, 0] },
      })
    );
    expect(parsed.distance).toBeCloseTo(5);
  });

  it("returns null for a non-measurement annotation type", () => {
    expect(parseMeasurementAnnotation(makeMeasurementAnnotation({ type: "point" }))).toBeNull();
  });

  it("returns null (does not throw) for missing annotation", () => {
    expect(() => parseMeasurementAnnotation(null)).not.toThrow();
    expect(parseMeasurementAnnotation(null)).toBeNull();
    expect(parseMeasurementAnnotation(undefined)).toBeNull();
  });

  it("returns null (does not throw) when metadata is missing entirely", () => {
    const annotation = makeMeasurementAnnotation({ metadata: undefined });
    expect(() => parseMeasurementAnnotation(annotation)).not.toThrow();
    expect(parseMeasurementAnnotation(annotation)).toBeNull();
  });

  it("returns null for malformed points (wrong length, non-numeric, or missing)", () => {
    expect(
      parseMeasurementAnnotation(
        makeMeasurementAnnotation({ metadata: { startPoint: [0, 0], endPoint: [1, 0, 0] } })
      )
    ).toBeNull();
    expect(
      parseMeasurementAnnotation(
        makeMeasurementAnnotation({ metadata: { startPoint: ["a", "b", "c"], endPoint: [1, 0, 0] } })
      )
    ).toBeNull();
    expect(
      parseMeasurementAnnotation(
        makeMeasurementAnnotation({ metadata: { startPoint: [0, 0, 0], endPoint: null } })
      )
    ).toBeNull();
    expect(
      parseMeasurementAnnotation(
        makeMeasurementAnnotation({ metadata: { startPoint: [0, 0, NaN], endPoint: [1, 0, 0] } })
      )
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parsePointAnnotation
// ---------------------------------------------------------------------------

describe("parsePointAnnotation", () => {
  it("extracts id, position, text, and normalized color from a well-formed point annotation", () => {
    const parsed = parsePointAnnotation(makePointAnnotation());
    expect(parsed).toEqual({
      id: "pt-1",
      position: [1, 2, 3],
      text: "VR marker",
      color: [1, 0, 0],
    });
  });

  it("normalizes a hex color string to an [r,g,b] array", () => {
    const parsed = parsePointAnnotation(
      makePointAnnotation({ metadata: { color: "#ff0000" } })
    );
    expect(parsed.color[0]).toBeCloseTo(1);
    expect(parsed.color[1]).toBeCloseTo(0);
    expect(parsed.color[2]).toBeCloseTo(0);
  });

  it("returns null color for an unrecognized color value (caller falls back to default)", () => {
    const parsed = parsePointAnnotation(
      makePointAnnotation({ metadata: { color: 42 } })
    );
    expect(parsed.color).toBeNull();
  });

  it("returns null for a non-point annotation type", () => {
    expect(parsePointAnnotation(makePointAnnotation({ type: "measurement" }))).toBeNull();
  });

  it("returns null (does not throw) for missing or malformed position", () => {
    expect(parsePointAnnotation(null)).toBeNull();
    expect(parsePointAnnotation(makePointAnnotation({ position: undefined }))).toBeNull();
    expect(parsePointAnnotation(makePointAnnotation({ position: [1, 2] }))).toBeNull();
    expect(parsePointAnnotation(makePointAnnotation({ position: [1, 2, NaN] }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Feature lifecycle: initialize / load-on-open / live add / live remove / cleanup
// ---------------------------------------------------------------------------

describe("VTKAnnotationLinesFeature lifecycle", () => {
  it("does nothing (no throw) when sceneObjects has no renderer", async () => {
    const feature = new VTKAnnotationLinesFeature();
    await expect(
      feature.initialize("inst-1", { sceneObjects: {}, datasetId: "ds-1" })
    ).resolves.not.toThrow();
    expect(feature.getState("inst-1")).toBeNull();
  });

  it("fetches existing measurement annotations for the dataset on initialize", async () => {
    mockApiClient.get.mockResolvedValue({
      annotations: [makeMeasurementAnnotation({ id: "annot-existing" })],
    });

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    expect(mockApiClient.get).toHaveBeenCalledWith("/annotations?fileId=ds-1");
    expect(sceneObjects.renderer.addActor).toHaveBeenCalled();
    expect(feature.getState("inst-1").measurementCount).toBe(1);

    await feature.cleanup("inst-1");
  });

  it("subscribes to AnnotationManager and adds a line on annotationAdded for the matching dataset", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    expect(sceneObjects.renderer.addActor).not.toHaveBeenCalled();

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation(),
    });

    // Line actor + label actor both added
    expect(sceneObjects.renderer.addActor).toHaveBeenCalled();
    expect(feature.getState("inst-1").measurementCount).toBe(1);
    expect(sceneObjects.renderWindow.render).toHaveBeenCalled();

    await feature.cleanup("inst-1");
  });

  it("ignores annotationAdded events for a different dataset", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-OTHER",
      annotation: makeMeasurementAnnotation(),
    });

    expect(sceneObjects.renderer.addActor).not.toHaveBeenCalled();
    expect(feature.getState("inst-1").measurementCount).toBe(0);

    await feature.cleanup("inst-1");
  });

  it("ignores malformed measurement content on annotationAdded without throwing", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    expect(() =>
      mockAnnotationManager._emit("annotationAdded", {
        datasetId: "ds-1",
        annotation: { id: "bad-1", type: "measurement", metadata: { startPoint: [1] } },
      })
    ).not.toThrow();

    expect(sceneObjects.renderer.addActor).not.toHaveBeenCalled();
    expect(feature.getState("inst-1").measurementCount).toBe(0);

    await feature.cleanup("inst-1");
  });

  it("removes the line actor on annotationRemoved for the matching dataset", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });
    expect(feature.getState("inst-1").measurementCount).toBe(1);
    expect(sceneObjects.renderer._actors.length).toBeGreaterThan(0);

    mockAnnotationManager._emit("annotationRemoved", {
      datasetId: "ds-1",
      annotationId: "annot-1",
    });

    expect(feature.getState("inst-1").measurementCount).toBe(0);
    expect(sceneObjects.renderer._actors.length).toBe(0);

    await feature.cleanup("inst-1");
  });

  it("ignores annotationRemoved events for a different dataset", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });
    expect(feature.getState("inst-1").measurementCount).toBe(1);

    mockAnnotationManager._emit("annotationRemoved", {
      datasetId: "ds-OTHER",
      annotationId: "annot-1",
    });

    expect(feature.getState("inst-1").measurementCount).toBe(1);

    await feature.cleanup("inst-1");
  });

  it("unsubscribes from AnnotationManager and removes all actors on cleanup", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });
    expect(sceneObjects.renderer._actors.length).toBeGreaterThan(0);
    expect(mockAnnotationManager._listenerCount("annotationAdded")).toBe(1);

    await feature.cleanup("inst-1");

    expect(sceneObjects.renderer._actors.length).toBe(0);
    expect(mockAnnotationManager._listenerCount("annotationAdded")).toBe(0);
    expect(feature.getState("inst-1")).toBeNull();

    // Events after cleanup must not resurrect actors or throw
    expect(() =>
      mockAnnotationManager._emit("annotationAdded", {
        datasetId: "ds-1",
        annotation: makeMeasurementAnnotation({ id: "annot-2" }),
      })
    ).not.toThrow();
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("renders a sphere marker on annotationAdded for a point annotation and removes it on annotationRemoved", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1" }),
    });

    expect(sceneObjects.renderer.addActor).toHaveBeenCalled();
    expect(feature.getState("inst-1").pointCount).toBe(1);
    expect(feature.getState("inst-1").measurementCount).toBe(0);

    mockAnnotationManager._emit("annotationRemoved", {
      datasetId: "ds-1",
      annotationId: "pt-1",
    });

    expect(feature.getState("inst-1").pointCount).toBe(0);
    expect(sceneObjects.renderer._actors.length).toBe(0);

    await feature.cleanup("inst-1");
  });

  it("renders both measurement lines and point markers from the initial fetch", async () => {
    mockApiClient.get.mockResolvedValue({
      annotations: [
        makeMeasurementAnnotation({ id: "m-1" }),
        makePointAnnotation({ id: "pt-1" }),
        { id: "note-1", type: "text", position: [0, 0, 0] }, // non-renderable type skipped
      ],
    });

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    const state = feature.getState("inst-1");
    expect(state.measurementCount).toBe(1);
    expect(state.pointCount).toBe(1);

    await feature.cleanup("inst-1");
  });

  it("ignores malformed point content on annotationAdded without throwing", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    expect(() =>
      mockAnnotationManager._emit("annotationAdded", {
        datasetId: "ds-1",
        annotation: { id: "bad-pt", type: "point", position: [1] },
      })
    ).not.toThrow();

    expect(feature.getState("inst-1").pointCount).toBe(0);

    await feature.cleanup("inst-1");
  });

  it("cleanup removes point markers along with lines", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1" }),
    });
    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "m-1" }),
    });
    expect(sceneObjects.renderer._actors.length).toBeGreaterThan(1);

    await feature.cleanup("inst-1");

    expect(sceneObjects.renderer._actors.length).toBe(0);
    expect(feature.getState("inst-1")).toBeNull();
  });

  it("re-initializing the same instance does not leak actors from the prior initialize()", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();
    mockApiClient.get.mockResolvedValue({
      annotations: [makeMeasurementAnnotation({ id: "annot-1" })],
    });

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();

    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });
    const firstCount = sceneObjects.renderer._actors.length;
    expect(firstCount).toBeGreaterThan(0);

    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    // Same annotation set re-fetched; actor count should not have doubled
    expect(sceneObjects.renderer._actors.length).toBe(firstCount);

    await feature.cleanup("inst-1");
  });

  it("clears all lines and refetches when the dataset scope changes via setDatasetId", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();
    mockApiClient.get.mockResolvedValueOnce({ annotations: [] });

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });
    expect(feature.getState("inst-1").measurementCount).toBe(1);

    mockApiClient.get.mockResolvedValueOnce({
      annotations: [makeMeasurementAnnotation({ id: "annot-ds2" })],
    });
    await feature.setDatasetId("inst-1", "ds-2");

    expect(feature.getState("inst-1").datasetId).toBe("ds-2");
    expect(feature.getState("inst-1").measurementCount).toBe(1);

    // The ds-1 annotation must no longer be tracked
    mockAnnotationManager._emit("annotationRemoved", {
      datasetId: "ds-1",
      annotationId: "annot-1",
    });
    expect(feature.getState("inst-1").measurementCount).toBe(1);

    await feature.cleanup("inst-1");
  });
});
