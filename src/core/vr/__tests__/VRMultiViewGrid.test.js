// src/core/vr/__tests__/VRMultiViewGrid.test.js
// Covers: grid placement math, proxy-actor lifecycle (enable/disable),
// dataset-to-cell normalization, targeted-placement highlighting, and
// robustness against unusable instances.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import {
  VRMultiViewGrid,
  computeGridPlacements,
  unionActorBounds,
} from "../VRMultiViewGrid.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Minimal vtkActor-like source: bounds + a shared mapper token + property. */
function makeSourceActor(bounds, mapper = { id: "mapper" }) {
  return {
    getBounds: () => bounds,
    getMapper: () => mapper,
    getProperty: () => ({
      getColor: () => [1, 0, 0],
      getOpacity: () => 1,
      getRepresentation: () => 2,
    }),
  };
}

function makeSceneObjects() {
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

// ---------------------------------------------------------------------------
// computeGridPlacements
// ---------------------------------------------------------------------------

describe("computeGridPlacements", () => {
  it("arranges ids row-major in a near-square grid", () => {
    const { placements, rows, cols } = computeGridPlacements(["a", "b", "c", "d", "e"]);
    expect(cols).toBe(3); // ceil(sqrt(5))
    expect(rows).toBe(2);
    expect(placements).toEqual([
      { id: "a", row: 0, col: 0 },
      { id: "b", row: 0, col: 1 },
      { id: "c", row: 0, col: 2 },
      { id: "d", row: 1, col: 0 },
      { id: "e", row: 1, col: 1 },
    ]);
  });

  it("respects an explicit column count", () => {
    const { placements, rows, cols } = computeGridPlacements(["a", "b", "c"], 1);
    expect(cols).toBe(1);
    expect(rows).toBe(3);
    expect(placements[2]).toEqual({ id: "c", row: 2, col: 0 });
  });

  it("returns an empty grid for no ids", () => {
    expect(computeGridPlacements([])).toEqual({ placements: [], rows: 0, cols: 0 });
    expect(computeGridPlacements(null)).toEqual({ placements: [], rows: 0, cols: 0 });
  });
});

// ---------------------------------------------------------------------------
// unionActorBounds
// ---------------------------------------------------------------------------

describe("unionActorBounds", () => {
  it("unions bounds across actors", () => {
    const b = unionActorBounds([
      makeSourceActor([0, 1, 0, 1, 0, 1]),
      makeSourceActor([-2, 0.5, 0, 3, -1, 0]),
    ]);
    expect(b).toEqual([-2, 1, 0, 3, -1, 1]);
  });

  it("skips invalid/uninitialized bounds and never throws", () => {
    const b = unionActorBounds([
      { getBounds: () => [1, -1, 0, 0, 0, 0] }, // VTK 'empty' bounds (min > max)
      { getBounds: () => null },
      {
        getBounds: () => {
          throw new Error("boom");
        },
      },
      makeSourceActor([0, 2, 0, 2, 0, 2]),
    ]);
    expect(b).toEqual([0, 2, 0, 2, 0, 2]);
  });

  it("returns null when nothing is usable", () => {
    expect(unionActorBounds([])).toBeNull();
    expect(unionActorBounds([{ getBounds: () => null }])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// VRMultiViewGrid lifecycle
// ---------------------------------------------------------------------------

describe("VRMultiViewGrid", () => {
  let grid;
  let sceneObjects;

  beforeEach(() => {
    grid = new VRMultiViewGrid();
    sceneObjects = makeSceneObjects();
  });

  it("builds one proxy per source actor and reports enabled", () => {
    const shown = grid.enable(sceneObjects, [
      { instanceId: "i1", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
      {
        instanceId: "i2",
        actors: [
          makeSourceActor([0, 2, 0, 2, 0, 2]),
          makeSourceActor([0, 1, 0, 1, 0, 1]),
        ],
      },
    ]);

    expect(shown).toBe(2);
    expect(grid.isEnabled()).toBe(true);
    expect(grid.getPlacements().sort()).toEqual(["i1", "i2"]);
    // 1 proxy for i1 + 2 proxies for i2
    expect(sceneObjects.renderer._actors.length).toBe(3);
    expect(sceneObjects.renderWindow.render).toHaveBeenCalled();
  });

  it("proxies share the source mapper and do not mutate source actors", () => {
    const mapper = { id: "shared-mapper" };
    const source = makeSourceActor([0, 10, 0, 10, 0, 10], mapper);
    const setPosition = vi.fn();
    source.setPosition = setPosition; // would only be called if we mutated it

    grid.enable(sceneObjects, [{ instanceId: "i1", actors: [source] }]);

    const proxy = sceneObjects.renderer._actors[0];
    expect(proxy.getMapper()).toBe(mapper);
    expect(setPosition).not.toHaveBeenCalled();
  });

  it("normalizes a dataset into its cell: worldCenter of data == cell center", () => {
    // Dataset centered at (100, 50, 0) with diagonal ~17.32 must land at the
    // layout cell position, scaled to the cell's view scale.
    const source = makeSourceActor([95, 105, 45, 55, -5, 5]);
    grid.enable(sceneObjects, [{ instanceId: "i1", actors: [source] }]);

    const proxy = sceneObjects.renderer._actors[0];
    const s = proxy.getScale()[0];
    const pos = proxy.getPosition();
    // worldPoint(datasetCenter) = position + s * center must equal cell center
    const cell = grid._cells.get("i1");
    const p = cell.transform.position;
    expect(pos[0] + s * 100).toBeCloseTo(p.x, 5);
    expect(pos[1] + s * 50).toBeCloseTo(p.y, 5);
    expect(pos[2] + s * 0).toBeCloseTo(p.z, 5);
    // Diagonal fits the cell's scale
    const diagonal = Math.sqrt(10 * 10 + 10 * 10 + 10 * 10);
    expect(s * diagonal).toBeCloseTo(cell.transform.scale, 5);
  });

  it("skips instances without usable actors/bounds and returns 0 when nothing shows", () => {
    const shown = grid.enable(sceneObjects, [
      { instanceId: "empty", actors: [] },
      { instanceId: "no-bounds", actors: [{ getBounds: () => null, getMapper: () => ({}) }] },
      null,
    ]);
    expect(shown).toBe(0);
    expect(grid.isEnabled()).toBe(false);
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("disable removes and deletes all proxies and clears state", () => {
    grid.enable(sceneObjects, [
      { instanceId: "i1", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
    ]);
    const proxy = sceneObjects.renderer._actors[0];

    grid.disable();

    expect(sceneObjects.renderer._actors.length).toBe(0);
    expect(proxy.isDeleted()).toBe(true);
    expect(grid.isEnabled()).toBe(false);
    expect(grid.getPlacements()).toEqual([]);
  });

  it("re-enable tears down the previous grid first (no proxy leaks)", () => {
    grid.enable(sceneObjects, [
      { instanceId: "i1", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
    ]);
    expect(sceneObjects.renderer._actors.length).toBe(1);

    grid.enable(sceneObjects, [
      { instanceId: "i2", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
    ]);

    expect(sceneObjects.renderer._actors.length).toBe(1);
    expect(grid.getPlacements()).toEqual(["i2"]);
  });

  it("setTargeted scales the targeted cell up and reverts the previous target", () => {
    grid.enable(sceneObjects, [
      { instanceId: "i1", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
      { instanceId: "i2", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
    ]);
    const base1 = grid._cells.get("i1").proxies[0].getScale()[0];

    grid.setTargeted("i1");
    expect(grid.getTargetedPlacement()).toBe("i1");
    expect(grid._cells.get("i1").proxies[0].getScale()[0]).toBeGreaterThan(base1);

    grid.setTargeted("i2");
    expect(grid.getTargetedPlacement()).toBe("i2");
    expect(grid._cells.get("i1").proxies[0].getScale()[0]).toBeCloseTo(base1, 5);

    grid.setTargeted(null);
    expect(grid.getTargetedPlacement()).toBeNull();
  });

  it("setTargeted with an unknown id clears the target instead of throwing", () => {
    grid.enable(sceneObjects, [
      { instanceId: "i1", actors: [makeSourceActor([0, 1, 0, 1, 0, 1])] },
    ]);
    grid.setTargeted("i1");
    expect(() => grid.setTargeted("nope")).not.toThrow();
    expect(grid.getTargetedPlacement()).toBeNull();
  });
});
