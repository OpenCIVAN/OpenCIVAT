// src/core/vr/__tests__/VRSpatialMenuModel.roster.test.js
// Phase 4's in-VR roster: participant cells in the People drawer's second row
// (drawerRow 1, which Phase 3 deliberately left free), capped at
// MAX_ROSTER_CELLS, tap-to-go-to.
//
// The load-bearing test in this file is the LAST describe block. getButtonLayout()
// is memoised because VTKVRSpatialUI calls it four times per frame, and the
// roster is the first input to that memo derived from LIVE session state. If the
// roster's contribution to the memo key varied per frame, computeGridLayout would
// re-run 4x/frame and VTKVRSpatialUI._reconcileButtonActors would tear down and
// rebuild the roster cards' canvases/textures/actors every frame — enough to drop
// a Quest session under 72fps. That is the regression this file guards.
import { describe, it, expect, vi } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRSpatialMenuModel, MAX_ROSTER_CELLS } from "../VRSpatialMenuModel.js";

function rosterRow(userId, over = {}) {
  return {
    userId,
    userName: userId.toUpperCase(),
    userColor: "#ff0000",
    mode: "vr-explorer",
    isSelf: false,
    isHost: false,
    isHolder: false,
    activity: null,
    isStale: false,
    distance: 1,
    ...over,
  };
}

function makeManager(roster, overrides = {}) {
  return {
    getActiveTool: vi.fn(() => null),
    getAnnotationDraft: vi.fn(() => null),
    getActiveDatasetName: vi.fn(() => "test.vtp"),
    getNavigationMode: vi.fn(() => "grab"),
    getNavigationModeInfo: vi.fn(() => ({ name: "Grab", controls: "" })),
    getVRScale: vi.fn(() => 1),
    getPendingWorkLabel: vi.fn(() => null),
    getVRNotice: vi.fn(() => null),
    isFollowingParticipant: vi.fn(() => null),
    getOtherParticipants: vi.fn(() => roster.map((r) => ({ odUserId: r.userId }))),
    goToParticipant: vi.fn(() => true),
    followParticipant: vi.fn(() => true),
    stopFollowing: vi.fn(),
    isManipulationHolder: vi.fn(() => false),
    getManipulationHolder: vi.fn(() => null),
    getManipulationRequests: vi.fn(() => []),
    getSessionRoster: vi.fn(() => roster),
    ...overrides,
  };
}

/** A model with the People drawer already open and the roster pulled. */
function openPeopleDrawer(roster, overrides) {
  const manager = makeManager(roster, overrides);
  const model = new VRSpatialMenuModel(manager);
  model.onSessionStart(); // syncs, which pulls the roster
  model.activate("people"); // toggles the drawer open
  return { model, manager };
}

describe("VRSpatialMenuModel — roster cells in the People drawer", () => {
  it("adds a roster cell per participant, on its own drawer row", () => {
    const { model } = openPeopleDrawer([rosterRow("alice"), rosterRow("bob")]);
    const layout = model.getButtonLayout();

    const cells = layout.filter((b) => b.kind === "roster-entry");
    expect(cells.map((c) => c.userId)).toEqual(["alice", "bob"]);
    expect(cells.map((c) => c.label)).toEqual(["ALICE", "BOB"]);

    // Every roster cell shares one row, and it is NOT the row the static
    // people verbs (Go To / Follow / Request / Give / Release) sit on.
    const cellRows = new Set(cells.map((c) => c.row));
    expect(cellRows.size).toBe(1);
    const verbRow = layout.find((b) => b.id === "goto-participant").row;
    expect([...cellRows][0]).not.toBe(verbRow);

    // drawerRow 1 renders BELOW drawerRow 0 (drawer rows read top-down; more
    // negative `row` renders higher), so the roster sits under its verbs.
    expect([...cellRows][0]).toBeGreaterThan(verbRow);
  });

  it("shows no roster cells while the drawer is closed", () => {
    const manager = makeManager([rosterRow("alice")]);
    const model = new VRSpatialMenuModel(manager);
    model.onSessionStart();

    expect(model.getButtonLayout().some((b) => b.kind === "roster-entry")).toBe(false);
  });

  it(`caps the row at MAX_ROSTER_CELLS (${MAX_ROSTER_CELLS}), keeping the highest-precedence entries`, () => {
    const many = ["a", "b", "c", "d", "e", "f", "g"].map((id) => rosterRow(id));
    const { model } = openPeopleDrawer(many);

    const cells = model.getButtonLayout().filter((b) => b.kind === "roster-entry");
    expect(cells).toHaveLength(MAX_ROSTER_CELLS);
    // The manager hands the roster back already in precedence order, so the
    // cap must truncate the TAIL, never reorder or sample.
    expect(cells.map((c) => c.userId)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("tapping a roster cell goes to that specific user", () => {
    const { model, manager } = openPeopleDrawer([rosterRow("alice"), rosterRow("bob")]);
    const cells = model.getButtonLayout().filter((b) => b.kind === "roster-entry");

    const result = model.activate(cells[1].id);

    expect(result).toMatchObject({ handled: true, action: "roster-goto", userId: "bob", ok: true });
    expect(manager.goToParticipant).toHaveBeenCalledWith("bob");
  });

  it("flags the control holder and dims a stale participant", () => {
    const { model } = openPeopleDrawer([
      rosterRow("alice", { isHolder: true }),
      rosterRow("bob", { isStale: true }),
    ]);
    const cells = model.getButtonLayout().filter((b) => b.kind === "roster-entry");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s]));

    expect(states[cells[0].id].holder).toBe(true);
    expect(states[cells[0].id].disabled).toBe(false);
    expect(states[cells[1].id].holder).toBe(false);
    expect(states[cells[1].id].disabled).toBe(true);
  });

  it("has no roster row at all when the session roster is empty", () => {
    const { model } = openPeopleDrawer([]);
    expect(model.getButtonLayout().some((b) => b.kind === "roster-entry")).toBe(false);
  });
});

describe("VRSpatialMenuModel — roster memo-key stability (frame budget)", () => {
  /**
   * One VR frame as VTKVRSpatialUI drives it: syncFromManager() once, then the
   * four getButtonLayout() reads (hitTest, _currentRowCount, _layoutButtons,
   * getButtonStates).
   */
  function frame(model) {
    model.syncFromManager();
    model.getButtonLayout();
    model.getButtonLayout();
    model.getButtonLayout();
    model.getButtonStates();
  }

  it("keeps _rosterKey byte-identical across consecutive identical frames", () => {
    const { model } = openPeopleDrawer([
      rosterRow("alice", { isHolder: true }),
      rosterRow("bob"),
    ]);

    frame(model);
    const first = model.getRosterKey();
    for (let i = 0; i < 10; i++) frame(model);

    expect(model.getRosterKey()).toBe(first);
    expect(first).toBe("alice:1,bob:0");
  });

  it("does NOT re-run computeGridLayout across identical consecutive frames", () => {
    const { model } = openPeopleDrawer([rosterRow("alice"), rosterRow("bob")]);

    frame(model); // warms the memo (computes exactly once)
    const afterWarmup = model.getButtonLayout();
    expect(afterWarmup.some((b) => b.kind === "roster-entry")).toBe(true);

    // computeGridLayout builds a FRESH array of fresh objects on every call, so
    // reference identity of the returned layout is a direct, spy-free proof
    // that it did not run: a single re-run would hand back a new array. (A spy
    // on the export cannot see the call — getButtonLayout resolves the local
    // module binding, not the namespace object.)
    for (let i = 0; i < 20; i++) {
      frame(model);
      // 20 frames x 4 reads = 80 getButtonLayout() calls, all memo hits.
      expect(model.getButtonLayout()).toBe(afterWarmup);
    }
    expect(model.getButtonLayout()[0]).toBe(afterWarmup[0]);
  });

  it("ignores roster fields that tick on their own (distance, activity)", () => {
    // distance changes every time anyone moves; activity flickers with every
    // manipulation. Neither changes the ROW, so neither may change the key.
    const roster = [rosterRow("alice", { distance: 1 })];
    const { model } = openPeopleDrawer(roster);
    frame(model);
    const before = model.getRosterKey();

    roster[0].distance = 42.7;
    roster[0].activity = "dataset";
    roster[0].isStale = true;
    model._rosterAtMs = 0; // force a refresh rather than waiting out the interval
    frame(model);

    expect(model.getRosterKey()).toBe(before);
  });

  it("DOES change the key when the roster's membership or holder changes", () => {
    const roster = [rosterRow("alice"), rosterRow("bob")];
    const { model } = openPeopleDrawer(roster);
    frame(model);
    const before = model.getRosterKey();

    roster[0].isHolder = true;
    model._rosterAtMs = 0;
    frame(model);
    expect(model.getRosterKey()).not.toBe(before);

    const withHolder = model.getRosterKey();
    roster.push(rosterRow("carol"));
    model._rosterAtMs = 0;
    frame(model);
    expect(model.getRosterKey()).not.toBe(withHolder);
  });

  it("does not call the manager's getSessionRoster once per frame", () => {
    const roster = [rosterRow("alice")];
    const { model, manager } = openPeopleDrawer(roster);
    manager.getSessionRoster.mockClear();

    // 60 frames inside one refresh interval.
    for (let i = 0; i < 60; i++) frame(model);

    expect(manager.getSessionRoster.mock.calls.length).toBeLessThan(5);
  });
});
