// src/core/instances/types/vtk/features/VTKAnnotationLinesFeature.test.js
// Covers: measurement annotation content parsing, live add/remove lifecycle
// via AnnotationManager events, malformed content handling, and cleanup.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFakeCtx } from "@/test/fakeCanvas.js";

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
      // VRTextBillboard.faceCamera() reads this; harmless no-op for tests
      // that don't care about facing direction, required for the ones that do.
      getActiveCamera: vi.fn(() => ({ getPosition: () => [0, 0, 10] })),
      _actors: actors,
    },
    renderWindow: { render: vi.fn() },
  };
}

let getContextSpy;

beforeEach(() => {
  mockAnnotationManager = null;
  mockApiClient.get.mockReset().mockResolvedValue({ annotations: [] });

  // Labels are now VRTextBillboards (canvas2D -> vtkTexture), and jsdom has
  // no real <canvas> 2D context -- stub it the same way
  // VTKVRSpatialUI.integration.test.js does, via the shared fake.
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => createFakeCtx());
});

afterEach(() => {
  getContextSpy.mockRestore();
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
      authorName: null,
    });
  });

  it("extracts authorName from metadata so a persisted pin can say who placed it", () => {
    const parsed = parsePointAnnotation(
      makePointAnnotation({ metadata: { authorName: "Alice" } })
    );
    expect(parsed.authorName).toBe("Alice");
  });

  it("defaults authorName to null for an annotation created before the field existed", () => {
    const parsed = parsePointAnnotation(
      makePointAnnotation({ metadata: { color: [1, 0, 0] } }) // no authorName key at all
    );
    expect(parsed.authorName).toBeNull();
  });

  it("ignores a non-string authorName rather than propagating garbage", () => {
    const parsed = parsePointAnnotation(
      makePointAnnotation({ metadata: { authorName: 42 } })
    );
    expect(parsed.authorName).toBeNull();
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

// ---------------------------------------------------------------------------
// Pickability: persisted annotations must never absorb a raycast (see
// VTKInstanceHandler._getVRPickTargets, which filters renderer.getActors()
// on getPickable() && getVisibility() && getMapper()).
// ---------------------------------------------------------------------------

describe("VTKAnnotationLinesFeature actor pickability", () => {
  it("marks the line actor and its label billboard unpickable", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });

    const entry = feature.instanceStates.get("inst-1").lines.get("annot-1");
    expect(entry.actor.getPickable()).toBe(false);
    expect(entry.labelBillboard.getActor().getPickable()).toBe(false);

    await feature.cleanup("inst-1");
  });

  it("marks the point actor and its label billboard unpickable", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1", text: "Anomaly here" }),
    });

    const entry = feature.instanceStates.get("inst-1").points.get("pt-1");
    expect(entry.actor.getPickable()).toBe(false);
    expect(entry.labelBillboard.getActor().getPickable()).toBe(false);

    await feature.cleanup("inst-1");
  });
});

// ---------------------------------------------------------------------------
// Label text: vtkVectorText silently rendered nothing (no opentype.js font
// is ever supplied). Labels are now VRTextBillboard -- assert the stored
// entry exposes a real, text-bearing billboard rather than an empty
// vtkVectorText source/mapper/actor trio.
// ---------------------------------------------------------------------------

describe("VTKAnnotationLinesFeature label billboards", () => {
  it("renders the measurement distance as billboard text", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });

    const entry = feature.instanceStates.get("inst-1").lines.get("annot-1");
    expect(entry.labelBillboard).toBeTruthy();
    expect(typeof entry.labelBillboard.getText).toBe("function");
    expect(entry.labelBillboard.getText()).toBe("5.000 mm");
    // The old vtkVectorText trio no longer exists on the entry.
    expect(entry.labelSource).toBeUndefined();
    expect(entry.labelActor).toBeUndefined();
    expect(entry.labelMapper).toBeUndefined();

    await feature.cleanup("inst-1");
  });

  it("renders custom point annotation text as billboard text", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1", text: "Anomaly here" }),
    });

    const entry = feature.instanceStates.get("inst-1").points.get("pt-1");
    expect(entry.labelBillboard).toBeTruthy();
    expect(entry.labelBillboard.getText()).toBe("Anomaly here");

    await feature.cleanup("inst-1");
  });

  it("appends the author's name to the billboard text so OTHER participants see who placed it", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({
        id: "pt-1",
        text: "Anomaly here",
        metadata: { authorName: "Bob" },
      }),
    });

    const entry = feature.instanceStates.get("inst-1").points.get("pt-1");
    expect(entry.labelBillboard.getText()).toBe("Anomaly here — Bob");

    await feature.cleanup("inst-1");
  });

  it("omits the author suffix when the pin carries no authorName (pre-existing annotations)", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1", text: "Anomaly here" }),
    });

    const entry = feature.instanceStates.get("inst-1").points.get("pt-1");
    expect(entry.labelBillboard.getText()).toBe("Anomaly here");

    await feature.cleanup("inst-1");
  });

  it("skips the label billboard for the default 'VR marker' placeholder text", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1" }), // default text: "VR marker"
    });

    const entry = feature.instanceStates.get("inst-1").points.get("pt-1");
    expect(entry.labelBillboard).toBeNull();

    await feature.cleanup("inst-1");
  });

  it("disposes the label billboard (and removes its actor) when the annotation is removed", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makeMeasurementAnnotation({ id: "annot-1" }),
    });

    const entry = feature.instanceStates.get("inst-1").lines.get("annot-1");
    const labelActor = entry.labelBillboard.getActor();
    expect(sceneObjects.renderer._actors).toContain(labelActor);

    mockAnnotationManager._emit("annotationRemoved", {
      datasetId: "ds-1",
      annotationId: "annot-1",
    });

    // A leaked billboard actor would stay in the shared renderer forever --
    // both the line's geometry actor AND its label billboard must be gone.
    expect(sceneObjects.renderer._actors).not.toContain(labelActor);
    expect(sceneObjects.renderer._actors.length).toBe(0);

    await feature.cleanup("inst-1");
  });

  it("disposes point label billboards on cleanup, along with everything else", async () => {
    mockAnnotationManager = makeFakeAnnotationManager();

    const feature = new VTKAnnotationLinesFeature();
    const sceneObjects = makeMockSceneObjects();
    await feature.initialize("inst-1", { sceneObjects, datasetId: "ds-1" });

    mockAnnotationManager._emit("annotationAdded", {
      datasetId: "ds-1",
      annotation: makePointAnnotation({ id: "pt-1", text: "Anomaly here" }),
    });

    const entry = feature.instanceStates.get("inst-1").points.get("pt-1");
    const labelActor = entry.labelBillboard.getActor();
    expect(sceneObjects.renderer._actors).toContain(labelActor);

    await feature.cleanup("inst-1");

    expect(sceneObjects.renderer._actors).not.toContain(labelActor);
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// _computePointRadius: must derive from the DATA actor's bounds, not the
// renderer's -- in VR, computeVisiblePropBounds() also includes VR chrome
// (spatial menu, keyboard panel) placed in data space, which would
// otherwise inflate every marker.
// ---------------------------------------------------------------------------

describe("VTKAnnotationLinesFeature _computePointRadius", () => {
  function makeState({ actorBounds, rendererBounds } = {}) {
    return {
      pointRadiusFraction: 0.01,
      pointRadiusFallback: 0.05,
      sceneObjects: {
        actor: actorBounds ? { getBounds: vi.fn(() => actorBounds) } : undefined,
        renderer: {
          computeVisiblePropBounds: rendererBounds
            ? vi.fn(() => rendererBounds)
            : vi.fn(() => undefined),
        },
      },
    };
  }

  it("uses the data actor's bounds, not the renderer's (which include VR chrome)", () => {
    const feature = new VTKAnnotationLinesFeature();
    // Actor: 10-unit diagonal. Renderer (inflated by VR menu/keyboard panels
    // placed in data space): 100-unit diagonal. If the fix regressed to
    // renderer bounds, this radius would come out 10x too large.
    const state = makeState({
      actorBounds: [0, 10, 0, 0, 0, 0],
      rendererBounds: [0, 100, 0, 0, 0, 0],
    });

    const radius = feature._computePointRadius(state);

    expect(radius).toBeCloseTo(10 * 0.01);
  });

  it("falls back to renderer bounds when there is no data actor", () => {
    const feature = new VTKAnnotationLinesFeature();
    const state = makeState({ rendererBounds: [0, 100, 0, 0, 0, 0] });

    const radius = feature._computePointRadius(state);

    expect(radius).toBeCloseTo(100 * 0.01);
  });

  it("falls back to renderer bounds when the actor has no getBounds()", () => {
    const feature = new VTKAnnotationLinesFeature();
    const state = makeState({ rendererBounds: [0, 100, 0, 0, 0, 0] });
    state.sceneObjects.actor = {}; // no getBounds function

    const radius = feature._computePointRadius(state);

    expect(radius).toBeCloseTo(100 * 0.01);
  });

  it("falls back to the fixed default when neither bounds source is available", () => {
    const feature = new VTKAnnotationLinesFeature();
    const state = makeState();

    expect(feature._computePointRadius(state)).toBe(0.05);
  });

  it("never throws, even if the actor's getBounds() itself throws", () => {
    const feature = new VTKAnnotationLinesFeature();
    const state = makeState({ rendererBounds: [0, 100, 0, 0, 0, 0] });
    state.sceneObjects.actor = {
      getBounds: () => {
        throw new Error("boom");
      },
    };

    expect(() => feature._computePointRadius(state)).not.toThrow();
  });
});
