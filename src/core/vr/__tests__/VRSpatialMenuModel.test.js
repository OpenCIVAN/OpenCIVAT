// src/core/vr/__tests__/VRSpatialMenuModel.test.js
// Logic-layer tests for the in-VR spatial tool menu: button layout / hit
// regions, action dispatch (button id → manager call), and show/hide on VR
// session start/end. The VTK rendering is intentionally not exercised here —
// VTKVRSpatialUI is a thin geometry wrapper over this model.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import {
  VRSpatialMenuModel,
  VR_MENU_BUTTONS,
  VR_MENU_CONTEXTUAL_BUTTONS,
  VR_MENU_DRAWERS,
  computeGridLayout,
} from "../VRSpatialMenuModel.js";
import { VR_KEYBOARD_KEYS } from "../VRKeyboardModel.js";

/** Minimal manager stub matching the methods the model calls. */
function makeManager(overrides = {}) {
  return {
    activateTool: vi.fn(),
    deactivateTool: vi.fn(),
    getActiveTool: vi.fn(() => null),
    undoLastToolAction: vi.fn(() => true),
    toggleIsolation: vi.fn(() => true),
    isIsolated: vi.fn(() => false),
    leaveSession: vi.fn(() => Promise.resolve()),
    cycleNavigationMode: vi.fn(() => "teleport"),
    setNavigationMode: vi.fn(),
    getNavigationMode: vi.fn(() => "fly"),
    setVRScale: vi.fn(),
    getVRScale: vi.fn(() => 1.0),
    getActiveDatasetName: vi.fn(() => "test.vtp"),
    getOtherParticipants: vi.fn(() => []),
    goToParticipant: vi.fn(() => true),
    followParticipant: vi.fn(() => true),
    stopFollowing: vi.fn(),
    isFollowingParticipant: vi.fn(() => null),
    cycleAnnotationLabel: vi.fn(() => "Anomaly"),
    getPendingAnnotationLabel: vi.fn(() => null),
    cycleRepresentation: vi.fn(() => "wireframe"),
    setRepresentation: vi.fn((m) => m),
    toggleReferenceGrid: vi.fn(() => true),
    isReferenceGridVisible: vi.fn(() => false),
    toggleDataAxes: vi.fn(() => true),
    areDataAxesVisible: vi.fn(() => false),
    cycleGridPlane: vi.fn(() => "xy"),
    isThresholdAvailable: vi.fn(() => true),
    isThresholdEnabled: vi.fn(() => false),
    toggleThresholdFilter: vi.fn(() => true),
    cycleThresholdMode: vi.fn(() => "above"),
    cycleThresholdArray: vi.fn(() => "temperature"),
    isIsosurfaceAvailable: vi.fn(() => true),
    isIsosurfaceEnabled: vi.fn(() => false),
    toggleIsosurface: vi.fn(() => true),
    cycleValueTarget: vi.fn(() => "point-size"),
    nudgeValue: vi.fn(() => 3),
    resetValue: vi.fn(() => 1),
    getRepresentation: vi.fn(() => "surface"),
    toggleGlyphs: vi.fn(() => true),
    isGlyphsEnabled: vi.fn(() => false),
    setGlyphType: vi.fn(() => true),
    getGlyphType: vi.fn(() => null),
    getDisabledGlyphTypeIds: vi.fn(() => []),
    getGlyphOrientationArray: vi.fn(() => null),
    invertClipPlane: vi.fn(),
    resetClipPlane: vi.fn(),
    cycleAnnotationColor: vi.fn(() => "Red"),
    toggleProbeContinuous: vi.fn(() => true),
    isProbeContinuous: vi.fn(() => false),
    clearProbeHistory: vi.fn(),
    createSnapshot: vi.fn(() => Promise.resolve()),
    loadSnapshot: vi.fn(() => Promise.resolve()),
    getSessionSnapshots: vi.fn(() => []),
    isVoiceMuted: vi.fn(() => false),
    toggleVoiceMute: vi.fn(() => true),
    isVoiceConnected: vi.fn(() => false),
    toggleVoiceConnection: vi.fn(() => true),
    getNavigationModeInfo: vi.fn(() => ({ name: "Fly", controls: "Thumbstick to move, trigger to boost" })),
    getAnnotationDraft: vi.fn(() => ({ active: false, text: "", fallbackText: "Note" })),
    appendAnnotationDraft: vi.fn((str) => str),
    backspaceAnnotationDraft: vi.fn(() => ""),
    confirmAnnotationDraft: vi.fn(() => true),
    cancelAnnotationDraft: vi.fn(() => true),
    ...overrides,
  };
}

/** A manager whose draft is open — the precondition for keyboard mode. */
function makeDraftManager(overrides = {}) {
  return makeManager({
    getAnnotationDraft: vi.fn(() => ({
      active: true,
      text: "",
      fallbackText: "Note",
      position: { x: 0, y: 0, z: 0 },
      color: [1, 0.5, 0],
    })),
    ...overrides,
  });
}

describe("VRSpatialMenuModel — layout & hit testing", () => {
  let model;
  beforeEach(() => {
    model = new VRSpatialMenuModel(makeManager());
  });

  it("lays out one non-overlapping cell per button, within [0,1] on both axes", () => {
    const layout = model.getButtonLayout();
    expect(layout).toHaveLength(VR_MENU_BUTTONS.length);

    for (const r of layout) {
      expect(r.u0).toBeGreaterThanOrEqual(0);
      expect(r.u1).toBeLessThanOrEqual(1);
      expect(r.u0).toBeLessThan(r.u1);
      expect(r.v0).toBeGreaterThanOrEqual(0);
      expect(r.v1).toBeLessThanOrEqual(1);
      expect(r.v0).toBeLessThan(r.v1);
    }
  });

  it("within each row, cells are strictly increasing and non-overlapping left→right", () => {
    const byRow = new Map();
    for (const r of model.getButtonLayout()) {
      if (!byRow.has(r.row)) byRow.set(r.row, []);
      byRow.get(r.row).push(r);
    }
    for (const cells of byRow.values()) {
      for (let i = 1; i < cells.length; i++) {
        expect(cells[i].u0).toBeGreaterThan(cells[i - 1].u1);
      }
    }
  });

  it("rows are stacked top-to-bottom without overlapping v-ranges", () => {
    const rowIds = [...new Set(model.getButtonLayout().map((r) => r.row))].sort((a, b) => a - b);
    for (const rowId of rowIds) {
      const cells = model.getButtonLayout().filter((r) => r.row === rowId);
      const v0 = cells[0].v0;
      const v1 = cells[0].v1;
      for (const c of cells) {
        expect(c.v0).toBe(v0);
        expect(c.v1).toBe(v1);
      }
      // v runs along +up, and the FIRST declared row renders at the TOP, so a
      // higher row index sits strictly BELOW a lower one.
      const higherRow = model.getButtonLayout().find((r) => r.row === rowId + 1);
      if (higherRow) {
        expect(higherRow.v1).toBeLessThanOrEqual(v0 + 1e-9);
      }
    }
  });

  it("hitTest maps a cell center back to that button", () => {
    for (const r of model.getButtonLayout()) {
      const hit = model.hitTest(r.cu, r.cv);
      expect(hit?.id).toBe(r.id);
    }
  });

  it("hitTest still maps every cell with a drawer AND a contextual row open", () => {
    // The densest layout the compact panel can reach: 4 static + 2 drawer + 1
    // contextual = 7 rows. Every cell must still round-trip.
    model.activate("filters");
    model.activate("clip"); // adds the contextual row
    const layout = model.getButtonLayout();

    expect(new Set(layout.map((r) => r.row)).size).toBe(7);
    for (const r of layout) {
      expect(model.hitTest(r.cu, r.cv)?.id).toBe(r.id);
    }
  });

  it("hitTest returns null off-panel, in gaps, and for non-finite input", () => {
    expect(model.hitTest(-0.1, 0.5)).toBeNull();
    expect(model.hitTest(0.5, 1.2)).toBeNull();
    expect(model.hitTest(NaN, 0.5)).toBeNull();
    // A point in the vertical padding band (below v0) is a miss
    const r = model.getButtonLayout()[0];
    expect(model.hitTest(r.cu, r.v0 - 0.01)).toBeNull();
  });

  it("top row (row 0) starts with annotate; the last (bottom) row ends with exit", () => {
    const layout = model.getButtonLayout();
    const row0 = layout.filter((r) => r.row === 0);
    expect(row0[0].id).toBe("annotate");

    const maxRow = Math.max(...layout.map((r) => r.row));
    const topRow = layout.filter((r) => r.row === maxRow);
    expect(topRow[topRow.length - 1].id).toBe("exit");
  });
});

// A6: getButtonLayout() is called up to 4x/frame from VTKVRSpatialUI
// (_currentRowCount, _layoutButtons, hitTest, getButtonStates) and rebuilds a
// Map + fresh objects per button each time — memoised on the only three
// fields the result depends on (_keyboardOpen, _activeToolId, _openDrawerId).
describe("VRSpatialMenuModel — getButtonLayout() memoisation (A6)", () => {
  let model;
  beforeEach(() => {
    model = new VRSpatialMenuModel(makeManager());
  });

  it("returns the identical array reference on repeated calls with unchanged state", () => {
    const first = model.getButtonLayout();
    const second = model.getButtonLayout();
    expect(second).toBe(first);
  });

  it("returns a DIFFERENT reference after _activeToolId changes", () => {
    const before = model.getButtonLayout();
    model.activate("annotate"); // activates the annotate tool
    const after = model.getButtonLayout();
    expect(after).not.toBe(before);
  });

  it("returns a DIFFERENT reference after _openDrawerId changes", () => {
    const before = model.getButtonLayout();
    model.activate("filters"); // opens the filters drawer
    const after = model.getButtonLayout();
    expect(after).not.toBe(before);
  });

  it("returns a DIFFERENT reference after _keyboardOpen changes", () => {
    const draft = { active: false, text: "", fallbackText: "Note" };
    const draftModel = new VRSpatialMenuModel(makeManager({ getAnnotationDraft: vi.fn(() => draft) }));
    const before = draftModel.getButtonLayout();

    draft.active = true;
    draftModel.syncFromManager(); // flips _keyboardOpen
    const after = draftModel.getButtonLayout();
    expect(after).not.toBe(before);
  });

  it("does not leak a stale cached layout across onSessionEnd/onSessionStart", () => {
    model.activate("clip"); // adds the contextual row, primes the cache
    const withContext = model.getButtonLayout();

    model.onSessionEnd();
    model.onSessionStart();
    const fresh = model.getButtonLayout();

    // Session end clears the active tool, so the fresh layout must be the
    // plain static grid again — not the cached contextual-row layout.
    expect(fresh).not.toBe(withContext);
    expect(fresh).toHaveLength(VR_MENU_BUTTONS.length);
  });
});

describe("VRSpatialMenuModel — action dispatch", () => {
  let manager;
  let model;
  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
  });

  it("tapping a tool activates it; tapping again deactivates (toggle)", () => {
    const r1 = model.activate("annotate");
    expect(r1).toMatchObject({ handled: true, action: "tool-activated", toolId: "annotate" });
    expect(manager.activateTool).toHaveBeenCalledWith("annotate");
    expect(model.getActiveToolId()).toBe("annotate");

    const r2 = model.activate("annotate");
    expect(r2).toMatchObject({ handled: true, action: "tool-deactivated", toolId: null });
    expect(manager.deactivateTool).toHaveBeenCalledTimes(1);
    expect(model.getActiveToolId()).toBeNull();
  });

  it("switching tools deactivates the old and activates the new", () => {
    model.activate("annotate");
    manager.activateTool.mockClear();
    const r = model.activate("measure");
    expect(r.toolId).toBe("measure");
    expect(manager.activateTool).toHaveBeenCalledWith("measure");
    expect(model.getActiveToolId()).toBe("measure");
  });

  it("undo routes through manager.undoLastToolAction", () => {
    const r = model.activate("undo");
    expect(manager.undoLastToolAction).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "undo", undone: true });
  });

  it("isolation toggle routes through manager.toggleIsolation (B-button path)", () => {
    manager.toggleIsolation.mockReturnValueOnce(true);
    const r = model.activate("isolation");
    expect(manager.toggleIsolation).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "isolation-toggled", isolated: true });
    expect(model.isIsolated()).toBe(true);
  });

  it("exit calls manager.leaveSession", () => {
    const r = model.activate("exit");
    expect(manager.leaveSession).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "exit" });
  });

  it("nav-mode cycles via manager.cycleNavigationMode", () => {
    manager.cycleNavigationMode.mockReturnValueOnce("walk");
    const r = model.activate("nav-mode");
    expect(manager.cycleNavigationMode).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "nav-mode-changed", mode: "walk" });
  });

  it("Move enters grab mode from teleport via manager.setNavigationMode", () => {
    manager.getNavigationMode.mockReturnValue("teleport");
    const r = model.activate("move");
    expect(manager.setNavigationMode).toHaveBeenCalledWith("grab");
    expect(r).toMatchObject({ handled: true, action: "nav-mode-set", mode: "grab" });
  });

  it("Move toggles back to fly when grab is already active", () => {
    // Untoggling returns to "fly" — the neutral mode where the trigger stays
    // free for tools/menu. It used to fall back to "teleport", which silently
    // handed the trigger to teleport aiming; teleport is now its own button.
    manager.getNavigationMode.mockReturnValue("grab");
    const r = model.activate("move");
    expect(manager.setNavigationMode).toHaveBeenCalledWith("fly");
    expect(r).toMatchObject({ handled: true, action: "nav-mode-set", mode: "fly" });
  });

  it("Teleport is a real selectable mode", () => {
    manager.getNavigationMode.mockReturnValue("fly");
    const r = model.activate("teleport");
    expect(manager.setNavigationMode).toHaveBeenCalledWith("teleport");
    expect(r).toMatchObject({ handled: true, action: "nav-mode-set", mode: "teleport" });
  });

  it("scale presets call manager.setVRScale with the button's fixed value", () => {
    const r = model.activate("scale-detail");
    expect(manager.setVRScale).toHaveBeenCalledWith(10.0);
    expect(r).toMatchObject({ handled: true, action: "scale-changed", scaleValue: 10.0, buttonId: "scale-detail" });
  });

  // Go To / Follow moved verbatim into the "people" drawer (they share the row
  // with the data-control buttons now), so the drawer has to be open for them
  // to be in the layout at all — same rule as every other drawer button.
  it("goto-participant cycles through getOtherParticipants and calls manager.goToParticipant", () => {
    manager.getOtherParticipants.mockReturnValue([
      { odUserId: "u1", userName: "Alice" },
      { odUserId: "u2", userName: "Bob" },
    ]);
    model.activate("people");
    const r1 = model.activate("goto-participant");
    expect(manager.goToParticipant).toHaveBeenCalledWith("u1");
    expect(r1).toMatchObject({ handled: true, action: "goto-participant", userId: "u1", ok: true });

    const r2 = model.activate("goto-participant");
    expect(manager.goToParticipant).toHaveBeenCalledWith("u2");
    expect(r2.userId).toBe("u2");

    // Wraps back to the first participant
    const r3 = model.activate("goto-participant");
    expect(r3.userId).toBe("u1");
  });

  it("goto-participant is a safe no-op with nobody else in the session", () => {
    manager.getOtherParticipants.mockReturnValue([]);
    model.activate("people");
    const r = model.activate("goto-participant");
    expect(r).toMatchObject({ handled: true, action: "goto-participant", ok: false, reason: "no-participants" });
    expect(manager.goToParticipant).not.toHaveBeenCalled();
  });

  it("follow-participant follows the next participant, then toggles off on a second tap", () => {
    manager.getOtherParticipants.mockReturnValue([{ odUserId: "u1", userName: "Alice" }]);

    model.activate("people");
    const r1 = model.activate("follow-participant");
    expect(manager.followParticipant).toHaveBeenCalledWith("u1");
    expect(r1).toMatchObject({ handled: true, action: "follow-participant", following: "u1" });

    manager.isFollowingParticipant.mockReturnValue("u1");
    const r2 = model.activate("follow-participant");
    expect(manager.stopFollowing).toHaveBeenCalledTimes(1);
    expect(r2).toMatchObject({ handled: true, action: "follow-participant", following: null });
  });

  // annotation-label is CONTEXTUAL to the annotate tool now (it only means
  // anything while annotating), so it is only present in the layout — and
  // therefore only activatable — while that tool is active.
  it("annotation-label cycles via manager.cycleAnnotationLabel", () => {
    model.activate("annotate");
    const r = model.activate("annotation-label");
    expect(manager.cycleAnnotationLabel).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "annotation-label-changed", label: "Anomaly" });
  });

  it("annotation-label is a safe no-op when no tool supports labels", () => {
    model.activate("annotate");
    manager.cycleAnnotationLabel.mockReturnValue(null);
    const r = model.activate("annotation-label");
    expect(r).toMatchObject({ handled: true, action: "annotation-label-changed", label: null, reason: "no-active-tool" });
  });

  it("annotation-label is absent from the layout unless annotate is active", () => {
    expect(model.getButtonLayout().some((b) => b.id === "annotation-label")).toBe(false);
    model.activate("annotate");
    expect(model.getButtonLayout().some((b) => b.id === "annotation-label")).toBe(true);
  });

  // The old single "representation" button blind-cycled surface->wireframe->
  // points. It lives in the Appearance drawer now as three discrete buttons, so
  // the panel can show WHICH mode is live (the cycling button's highlight was
  // "active if not surface", making wireframe and points indistinguishable).
  it("each representation button sets its own mode via manager.setRepresentation", () => {
    model.activate("appearance"); // open the drawer that holds them

    for (const [id, mode] of [
      ["rep-surface", "surface"],
      ["rep-wireframe", "wireframe"],
      ["rep-points", "points"],
    ]) {
      manager.setRepresentation.mockClear();
      const r = model.activate(id);
      expect(manager.setRepresentation).toHaveBeenCalledWith(mode);
      expect(r).toMatchObject({ handled: true, action: "representation-changed", mode });
    }
  });

  it("representation buttons are not dispatchable while the drawer is closed", () => {
    const r = model.activate("rep-wireframe");
    expect(r).toMatchObject({ handled: false });
    expect(manager.setRepresentation).not.toHaveBeenCalled();
  });

  it("glyph-types drawer opens from the top-level Glyphs button, not from 'advanced'", () => {
    // Promoted out of the "advanced"/More drawer to a top-level button next
    // to Style/Filters — see VR_MENU_BUTTONS. "glyphs" is no longer a valid
    // button id at all (replaced by one id per shape, e.g. "glyph-arrow").
    const opened = model.activate("glyphTypes");
    expect(opened).toMatchObject({ handled: true, action: "drawer-toggled", drawerId: "glyphTypes", open: true });

    const r = model.activate("glyph-arrow");
    expect(manager.setGlyphType).toHaveBeenCalledWith("arrow");
    expect(r).toMatchObject({ handled: true, action: "glyph-type-set", typeId: "arrow" });
  });

  it("each glyph-type-set button selects its own shape via manager.setGlyphType", () => {
    model.activate("glyphTypes");

    for (const typeId of ["arrow", "cone", "sphere", "cube", "cylinder", "dot"]) {
      manager.setGlyphType.mockClear();
      const r = model.activate(`glyph-${typeId}`);
      expect(manager.setGlyphType).toHaveBeenCalledWith(typeId);
      expect(r).toMatchObject({ handled: true, action: "glyph-type-set", typeId });
    }
  });

  it("the Off cell disables glyphs with typeId null, distinct from any real shape", () => {
    model.activate("glyphTypes");
    const r = model.activate("glyph-off");
    expect(manager.setGlyphType).toHaveBeenCalledWith(null);
    expect(r).toMatchObject({ handled: true, action: "glyph-type-set", typeId: null });
  });

  it("reports accepted:false without holding the optimistic state when the manager refuses", () => {
    manager.setGlyphType.mockReturnValue(false);
    model.activate("glyphTypes");
    const r = model.activate("glyph-arrow");
    expect(r).toMatchObject({ handled: true, action: "glyph-type-set", typeId: "arrow", accepted: false });
  });

  it("walk is a direct nav-mode-set button, same semantics as move", () => {
    model.activate("advanced");
    manager.getNavigationMode.mockReturnValue("teleport");
    const r = model.activate("walk");
    expect(manager.setNavigationMode).toHaveBeenCalledWith("walk");
    expect(r).toMatchObject({ handled: true, action: "nav-mode-set", mode: "walk" });
  });

  it("snapshot-save routes through manager.createSnapshot", () => {
    model.activate("advanced");
    const r = model.activate("snapshot-save");
    expect(manager.createSnapshot).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "snapshot-saved" });
  });

  it("snapshot-save swallows a rejected createSnapshot promise", () => {
    const rejecting = makeManager({ createSnapshot: vi.fn(() => Promise.reject(new Error("x"))) });
    const m = new VRSpatialMenuModel(rejecting);
    m.activate("advanced");
    expect(() => m.activate("snapshot-save")).not.toThrow();
  });

  it("snapshot-load cycles through getSessionSnapshots and calls manager.loadSnapshot", () => {
    model.activate("advanced");
    manager.getSessionSnapshots.mockReturnValue([{ id: "s1" }, { id: "s2" }]);
    const r1 = model.activate("snapshot-load");
    expect(manager.loadSnapshot).toHaveBeenCalledWith("s1");
    expect(r1).toMatchObject({ handled: true, action: "snapshot-load", snapshotId: "s1", ok: true });

    const r2 = model.activate("snapshot-load");
    expect(manager.loadSnapshot).toHaveBeenCalledWith("s2");
    expect(r2.snapshotId).toBe("s2");

    // Wraps back to the first snapshot
    const r3 = model.activate("snapshot-load");
    expect(r3.snapshotId).toBe("s1");
  });

  it("snapshot-load is a safe no-op with nothing saved", () => {
    model.activate("advanced");
    manager.getSessionSnapshots.mockReturnValue([]);
    const r = model.activate("snapshot-load");
    expect(r).toMatchObject({ handled: true, action: "snapshot-load", ok: false, reason: "no-snapshots" });
    expect(manager.loadSnapshot).not.toHaveBeenCalled();
  });

  it("voice-mute toggles via manager.toggleVoiceMute", () => {
    model.activate("advanced");
    const r = model.activate("voice-mute");
    expect(manager.toggleVoiceMute).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "voice-mute-toggled", muted: true });
  });

  it("voice-join toggles via manager.toggleVoiceConnection", () => {
    model.activate("advanced");
    const r = model.activate("voice-join");
    expect(manager.toggleVoiceConnection).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "voice-connection-toggled", connected: true });
  });

  it("hide-menu sets visibility false directly, without calling the manager", () => {
    model.onSessionStart();
    expect(model.isVisible()).toBe(true);
    const r = model.activate("hide-menu");
    expect(r).toEqual({ handled: true, action: "menu-hidden" });
    expect(model.isVisible()).toBe(false);
    // Local UI chrome — must not touch any manager method.
    expect(manager.leaveSession).not.toHaveBeenCalled();
    expect(manager.activateTool).not.toHaveBeenCalled();
  });

  it("unknown button id is a no-op", () => {
    const r = model.activate("nope");
    expect(r).toEqual({ handled: false });
    expect(manager.activateTool).not.toHaveBeenCalled();
  });

  it("tolerates a manager missing methods (partial mock, no active session)", () => {
    const bare = new VRSpatialMenuModel({});
    expect(() => bare.activate("annotate")).not.toThrow();
    expect(() => bare.activate("undo")).not.toThrow();
    expect(() => bare.activate("isolation")).not.toThrow();
    expect(() => bare.activate("exit")).not.toThrow();
  });

  it("swallows a rejected leaveSession promise", () => {
    const rejecting = makeManager({ leaveSession: vi.fn(() => Promise.reject(new Error("x"))) });
    const m = new VRSpatialMenuModel(rejecting);
    expect(() => m.activate("exit")).not.toThrow();
  });
});

describe("VRSpatialMenuModel — show/hide on session lifecycle", () => {
  let manager;
  let model;
  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
  });

  it("is hidden until a session starts, and hidden again after it ends", () => {
    expect(model.isVisible()).toBe(false);
    model.onSessionStart();
    expect(model.isVisible()).toBe(true);
    model.onSessionEnd();
    expect(model.isVisible()).toBe(false);
  });

  it("onSessionStart pulls active tool + isolation state from the manager", () => {
    manager.getActiveTool.mockReturnValue({ id: "measure" });
    manager.isIsolated.mockReturnValue(true);
    model.onSessionStart();
    expect(model.getActiveToolId()).toBe("measure");
    expect(model.isIsolated()).toBe(true);
  });

  it("onSessionEnd clears transient highlight state", () => {
    manager.getActiveTool.mockReturnValue({ id: "annotate" });
    model.onSessionStart();
    model.onSessionEnd();
    expect(model.getActiveToolId()).toBeNull();
    expect(model.isIsolated()).toBe(false);
  });
});

describe("VRSpatialMenuModel — state reflection for render layer", () => {
  it("getButtonStates marks the active tool and isolation as active", () => {
    const manager = makeManager({
      getActiveTool: vi.fn(() => ({ id: "measure" })),
      isIsolated: vi.fn(() => true),
    });
    const model = new VRSpatialMenuModel(manager);
    model.syncFromManager();

    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(states.measure).toBe(true);
    expect(states.annotate).toBe(false);
    expect(states.isolation).toBe(true);
    expect(states.undo).toBe(false);
    expect(states.exit).toBe(false);
  });

  it("syncFromManager treats a null active tool as nothing selected", () => {
    const model = new VRSpatialMenuModel(makeManager({ getActiveTool: vi.fn(() => null) }));
    model.syncFromManager();
    expect(model.getActiveToolId()).toBeNull();
  });

  it("getButtonStates marks the current scale preset as active", () => {
    const manager = makeManager({ getVRScale: vi.fn(() => 10.0) });
    const model = new VRSpatialMenuModel(manager);
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(states["scale-detail"]).toBe(true);
    expect(states["scale-normal"]).toBe(false);
    expect(states["scale-overview"]).toBe(false);
  });

  it("getButtonStates marks the Move button active when grab mode is on", () => {
    const active = new VRSpatialMenuModel(makeManager({ getNavigationMode: vi.fn(() => "grab") }));
    const off = new VRSpatialMenuModel(makeManager({ getNavigationMode: vi.fn(() => "teleport") }));
    expect(Object.fromEntries(active.getButtonStates().map((s) => [s.id, s.active])).move).toBe(true);
    expect(Object.fromEntries(off.getButtonStates().map((s) => [s.id, s.active])).move).toBe(false);
  });

  it("getButtonStates lights ONLY the live representation, not every non-surface one", () => {
    // The regression this pins: the old cycling button used
    // `active = mode !== "surface"`, so wireframe and points looked identical.
    const model = new VRSpatialMenuModel(
      makeManager({
        getRepresentation: vi.fn(() => "wireframe"),
        getGlyphType: vi.fn(() => "arrow"),
      })
    );
    model.activate("appearance");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));

    expect(states["rep-wireframe"]).toBe(true);
    expect(states["rep-points"]).toBe(false);
    expect(states["rep-surface"]).toBe(false);

    // Same exact-match principle as representation, applied to glyph type:
    // ONLY the live shape lights, not every non-off cell.
    model.activate("glyphTypes");
    const glyphStates = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(glyphStates["glyph-arrow"]).toBe(true);
    expect(glyphStates["glyph-cone"]).toBe(false);
    expect(glyphStates["glyph-sphere"]).toBe(false);
    expect(glyphStates["glyph-off"]).toBe(false);
  });

  it("getButtonStates leaves representation/glyphs inactive at defaults, and lights Off when disabled", () => {
    const model = new VRSpatialMenuModel(makeManager());
    model.activate("appearance");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(states["rep-surface"]).toBe(true); // makeManager reports "surface"
    expect(states["rep-wireframe"]).toBe(false);

    // makeManager's default getGlyphType() is null (disabled) — Off lights,
    // no shape does.
    model.activate("glyphTypes");
    const glyphStates = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(glyphStates["glyph-off"]).toBe(true);
    expect(glyphStates["glyph-arrow"]).toBe(false);
    expect(glyphStates["glyph-sphere"]).toBe(false);
  });

  it("getButtonStates disables a shape requiring orientation when the dataset has no vector array", () => {
    const model = new VRSpatialMenuModel(
      makeManager({ getDisabledGlyphTypeIds: vi.fn(() => ["arrow"]) })
    );
    model.activate("glyphTypes");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.disabled]));
    expect(states["glyph-arrow"]).toBe(true);
    expect(states["glyph-sphere"]).toBe(false);
    expect(states["glyph-off"]).toBe(false); // disabling is always available
  });
});

describe("VRSpatialMenuModel — status line", () => {
  it("combines dataset name, scale, and nav mode", () => {
    const manager = makeManager({
      getActiveDatasetName: vi.fn(() => "skull.vtp"),
      getVRScale: vi.fn(() => 10.0),
      getNavigationMode: vi.fn(() => "teleport"),
    });
    const model = new VRSpatialMenuModel(manager);
    expect(model.getStatusLine()).toBe("skull.vtp  •  10x  •  Teleport");
  });

  it("falls back gracefully when the manager has no data", () => {
    const model = new VRSpatialMenuModel({});
    expect(() => model.getStatusLine()).not.toThrow();
    expect(model.getStatusLine()).toBe("Dataset");
  });

  it("formats sub-1.0 scale as a ratio", () => {
    const manager = makeManager({ getVRScale: vi.fn(() => 0.1), getNavigationMode: vi.fn(() => "fly") });
    const model = new VRSpatialMenuModel(manager);
    // Quantized to the nearest whole ratio now (see _formatScale) — 1/0.1 = 10
    // exactly, so this stays "1:10" rather than the old one-decimal "1:10.0".
    expect(model.getStatusLine()).toContain("1:10");
  });

  it("_formatScale produces the same string for nearby scale values that previously diverged", () => {
    const model = new VRSpatialMenuModel(makeManager());
    // Old toFixed(1) formatting: "2.1x" vs "2.2x" (distinct every frame during
    // a slow pinch). New nearest-half quantization collapses both into "2x".
    expect(model._formatScale(2.1)).toBe(model._formatScale(2.2));
    expect(model._formatScale(2.1)).toBe("2x");

    // Zoomed-out branch: 1/19.3 and 1/19.4 are two nearby scale values whose
    // ratios both round to the same whole number.
    expect(model._formatScale(1 / 19.3)).toBe(model._formatScale(1 / 19.4));
    expect(model._formatScale(1 / 19.3)).toBe("1:19");
  });

  it("appends who's being followed", () => {
    const manager = makeManager({
      isFollowingParticipant: vi.fn(() => "u1"),
      getOtherParticipants: vi.fn(() => [{ odUserId: "u1", userName: "Alice" }]),
    });
    const model = new VRSpatialMenuModel(manager);
    expect(model.getStatusLine()).toContain("Following Alice");
  });

  it("appends the pending annotation label while the annotate tool is active", () => {
    const manager = makeManager({
      getActiveTool: vi.fn(() => ({ id: "annotate" })),
      getPendingAnnotationLabel: vi.fn(() => "Max"),
    });
    const model = new VRSpatialMenuModel(manager);
    model.syncFromManager();
    expect(model.getStatusLine()).toContain("Label: Max");
  });

  it("omits the label suffix when a different tool (or no tool) is active", () => {
    const manager = makeManager({
      getActiveTool: vi.fn(() => ({ id: "measure" })),
      getPendingAnnotationLabel: vi.fn(() => "Max"),
    });
    const model = new VRSpatialMenuModel(manager);
    model.syncFromManager();
    expect(model.getStatusLine()).not.toContain("Label:");
  });
});

describe("VRSpatialMenuModel — contextual row", () => {
  let manager;
  let model;
  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
  });

  it("adds no extra buttons when no tool is active", () => {
    expect(model.getButtonLayout()).toHaveLength(VR_MENU_BUTTONS.length);
  });

  it("gives measure a New Path button, since measuring is now a chained path", () => {
    // Undo pops one point at a time, so without this the only way to start a
    // disconnected measurement would be to undo every point first.
    model.activate("measure");
    const ids = model.getButtonLayout().map((b) => b.id);
    expect(ids).toContain("measure-new-path");
  });

  it("appends exactly the matching tool's contextual buttons as one extra row above TOOLS", () => {
    model.activate("clip");
    const layout = model.getButtonLayout();
    const clipContextual = VR_MENU_CONTEXTUAL_BUTTONS.filter((b) => b.contextTool === "clip");
    expect(layout).toHaveLength(VR_MENU_BUTTONS.length + clipContextual.length);

    // The contextual strip sits one row BEFORE the first static row, so it
    // renders directly above TOOLS — next to the tool whose options it holds.
    const minStaticRow = Math.min(...VR_MENU_BUTTONS.map((b) => b.row));
    const contextualRow = layout.filter((r) => r.row === minStaticRow - 1);
    // Derived, not hardcoded — the point is that the row matches the declared
    // set for this tool, whatever that set grows into.
    expect(contextualRow.map((b) => b.id).sort()).toEqual(
      clipContextual.map((b) => b.id).sort()
    );
  });

  it("annotate's contextual row is Color + Label; probe's is Continuous + Clear", () => {
    model.activate("annotate");
    let ids = model.getButtonLayout().filter((b) => b.contextTool === "annotate").map((b) => b.id);
    expect(ids.sort()).toEqual(["annotation-color", "annotation-label"]);

    model.activate("annotate"); // deactivate
    model.activate("probe");
    ids = model.getButtonLayout().filter((b) => b.contextTool === "probe").map((b) => b.id);
    expect(ids.sort()).toEqual(["probe-clear", "probe-continuous"]);
  });

  it("contextual row disappears when the tool deactivates, and its buttons become unhittable", () => {
    const clipCount = VR_MENU_CONTEXTUAL_BUTTONS.filter((b) => b.contextTool === "clip").length;
    model.activate("clip");
    expect(model.getButtonLayout()).toHaveLength(VR_MENU_BUTTONS.length + clipCount);

    model.activate("clip"); // toggle off
    expect(model.getButtonLayout()).toHaveLength(VR_MENU_BUTTONS.length);
    const r = model.activate("clip-invert");
    expect(r).toEqual({ handled: false });
  });

  it("contextual row disappears when switching to a different tool", () => {
    model.activate("clip");
    expect(model.getButtonLayout().some((b) => b.id === "clip-invert")).toBe(true);

    model.activate("measure"); // switches active tool
    expect(model.getButtonLayout().some((b) => b.id === "clip-invert")).toBe(false);
  });

  it("clip-invert/clip-reset route through the manager", () => {
    model.activate("clip");
    const r1 = model.activate("clip-invert");
    expect(manager.invertClipPlane).toHaveBeenCalledTimes(1);
    expect(r1).toMatchObject({ handled: true, action: "clip-inverted" });

    const r2 = model.activate("clip-reset");
    expect(manager.resetClipPlane).toHaveBeenCalledTimes(1);
    expect(r2).toMatchObject({ handled: true, action: "clip-reset" });
  });

  it("annotation-color routes through manager.cycleAnnotationColor", () => {
    // Replaced annotation-mode, whose marker/text/drawing cycle changed only
    // stored metadata — every mode rendered the same sphere.
    model.activate("annotate");
    const r = model.activate("annotation-color");
    expect(manager.cycleAnnotationColor).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "annotation-color-changed", color: "Red" });
  });

  it("probe-continuous/probe-clear route through the manager", () => {
    model.activate("probe");
    const r1 = model.activate("probe-continuous");
    expect(manager.toggleProbeContinuous).toHaveBeenCalledTimes(1);
    expect(r1).toMatchObject({ handled: true, action: "probe-continuous-toggled", enabled: true });

    const r2 = model.activate("probe-clear");
    expect(manager.clearProbeHistory).toHaveBeenCalledTimes(1);
    expect(r2).toMatchObject({ handled: true, action: "probe-history-cleared" });
  });

  it("getButtonStates reflects probe-continuous active state while probe is active", () => {
    manager.isProbeContinuous.mockReturnValue(true);
    model.activate("probe");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));
    expect(states["probe-continuous"]).toBe(true);
  });
});

describe("VRSpatialMenuModel — hint line", () => {
  it("shows the active tool's control summary", () => {
    const model = new VRSpatialMenuModel(makeManager());
    model.activate("clip");
    expect(model.getHintLine()).toBe("Grip+drag to aim, A to invert, B to reset");
  });

  it("falls back to the current nav mode's controls when no tool is active", () => {
    const manager = makeManager({
      getNavigationModeInfo: vi.fn(() => ({ name: "Teleport", controls: "Hold thumbstick to aim, release to teleport" })),
    });
    const model = new VRSpatialMenuModel(manager);
    expect(model.getHintLine()).toBe("Hold thumbstick to aim, release to teleport");
  });

  it("never throws with a manager missing getNavigationModeInfo", () => {
    const model = new VRSpatialMenuModel({});
    expect(() => model.getHintLine()).not.toThrow();
    expect(model.getHintLine()).toBe("");
  });
});

describe("VRSpatialMenuModel — drawers", () => {
  let manager;
  let model;

  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
  });

  const idsOf = (m) => m.getButtonLayout().map((b) => b.id);

  it("hides drawer buttons until the drawer is opened", () => {
    expect(idsOf(model)).not.toContain("rep-wireframe");

    model.activate("appearance");
    expect(idsOf(model)).toContain("rep-wireframe");
    expect(model.getOpenDrawerId()).toBe("appearance");
  });

  it("tapping the open drawer closes it", () => {
    model.activate("appearance");
    const r = model.activate("appearance");

    expect(r).toMatchObject({ action: "drawer-toggled", drawerId: "appearance", open: false });
    expect(model.getOpenDrawerId()).toBeNull();
    expect(idsOf(model)).not.toContain("rep-wireframe");
  });

  it("opening one drawer closes the other — this exclusivity bounds panel height", () => {
    model.activate("appearance");
    model.activate("filters");

    expect(model.getOpenDrawerId()).toBe("filters");
    const ids = idsOf(model);
    expect(ids).toContain("threshold-toggle");
    expect(ids).not.toContain("rep-wireframe");
  });

  it("highlights the open drawer's parent button", () => {
    model.activate("filters");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.active]));

    expect(states.filters).toBe(true);
    expect(states.appearance).toBe(false);
  });

  it("shares one stepper row across both drawers (same ids, one handler set)", () => {
    const stepperIds = ["value-target", "value-dec", "value-inc", "value-reset"];

    for (const drawerId of ["appearance", "filters"]) {
      model.activate(drawerId);
      const ids = idsOf(model);
      for (const s of stepperIds) expect(ids).toContain(s);
      // Never duplicated within a layout — duplicate ids would make hitTest
      // ambiguous and break the id->button lookup in activate().
      expect(ids.length).toBe(new Set(ids).size);
    }
  });

  it("keeps the row-0-annotate / last-row-exit invariants with a drawer open", () => {
    model.activate("filters");
    const layout = model.getButtonLayout();
    const rowIds = [...new Set(layout.map((b) => b.row))].sort((a, b) => a - b);

    const firstStatic = layout.filter((b) => b.row === 0);
    expect(firstStatic[0].id).toBe("annotate");

    const lastRow = layout.filter((b) => b.row === rowIds[rowIds.length - 1]);
    expect(lastRow[lastRow.length - 1].id).toBe("exit");
  });

  it("renders drawer rows ABOVE the static grid, nearest the button that opened them", () => {
    model.activate("appearance");
    const layout = model.getButtonLayout();

    // Negative rows sort above row 0; with the top-down v inversion that puts
    // them higher on the panel (larger v) than the static TOOLS row.
    const drawerRow = layout.find((b) => b.id === "rep-surface");
    const toolsRow = layout.find((b) => b.id === "annotate");
    expect(drawerRow.row).toBeLessThan(0);
    expect(drawerRow.v0).toBeGreaterThan(toolsRow.v1 - 1e-9);

    // Within the drawer, its own row 0 renders ABOVE row 1, so the drawer
    // reads top-down in declared order (choices first, then the stepper) —
    // matching how the static grid reads.
    const stepper = layout.find((b) => b.id === "value-inc");
    expect(stepper.v1).toBeLessThanOrEqual(drawerRow.v0 + 1e-9);
  });

  it("closes any open drawer on session end", () => {
    model.activate("filters");
    model.onSessionEnd();
    expect(model.getOpenDrawerId()).toBeNull();
  });

  it("ignores an unknown drawer id without throwing", () => {
    const r = model._toggleDrawer("nope");
    expect(r.handled).toBe(false);
    expect(model.getOpenDrawerId()).toBeNull();
  });

  it("every declared drawer button has a getButtonStates entry", () => {
    for (const drawerId of Object.keys(VR_MENU_DRAWERS)) {
      model.activate(drawerId);
      const stateIds = new Set(model.getButtonStates().map((s) => s.id));
      for (const btn of VR_MENU_DRAWERS[drawerId]) {
        expect(stateIds.has(btn.id)).toBe(true);
      }
    }
  });

  it("marks threshold sub-controls disabled while threshold is off", () => {
    const model = new VRSpatialMenuModel(
      makeManager({ isThresholdEnabled: vi.fn(() => false) })
    );
    model.activate("filters");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.disabled]));

    expect(states["threshold-mode"]).toBe(true);
    expect(states["threshold-array"]).toBe(true);
  });

  it("marks threshold/isosurface disabled when the dataset cannot support them", () => {
    const model = new VRSpatialMenuModel(
      makeManager({
        isThresholdAvailable: vi.fn(() => false),
        isIsosurfaceAvailable: vi.fn(() => false),
      })
    );
    model.activate("filters");
    const states = Object.fromEntries(model.getButtonStates().map((s) => [s.id, s.disabled]));

    expect(states["threshold-toggle"]).toBe(true);
    expect(states["iso-toggle"]).toBe(true);

    // ...and tapping one reports it did nothing, rather than silently no-oping.
    expect(model.activate("threshold-toggle")).toMatchObject({ handled: false, available: false });
    expect(model.activate("iso-toggle")).toMatchObject({ handled: false, available: false });
  });

  it("dispatches the shared stepper to the manager", () => {
    model.activate("appearance");

    expect(model.activate("value-target")).toMatchObject({ action: "value-target-changed" });
    expect(manager.cycleValueTarget).toHaveBeenCalledTimes(1);

    expect(model.activate("value-inc")).toMatchObject({ action: "value-nudged", steps: 1 });
    expect(manager.nudgeValue).toHaveBeenCalledWith(1);

    expect(model.activate("value-dec")).toMatchObject({ action: "value-nudged", steps: -1 });
    expect(manager.nudgeValue).toHaveBeenCalledWith(-1);

    expect(model.activate("value-reset")).toMatchObject({ action: "value-reset" });
    expect(manager.resetValue).toHaveBeenCalledTimes(1);
  });

  it("never throws with a bare manager", () => {
    const bare = new VRSpatialMenuModel({});
    bare.activate("appearance");
    expect(() => bare.getButtonStates()).not.toThrow();
    expect(() => bare.activate("rep-points")).not.toThrow();
    expect(() => bare.activate("value-inc")).not.toThrow();
  });
});

describe("VRSpatialMenuModel — keyboard mode", () => {
  let manager;
  let model;

  beforeEach(() => {
    manager = makeDraftManager();
    model = new VRSpatialMenuModel(manager);
    model.syncFromManager();
  });

  it("getButtonLayout returns only keyboard ids while a draft is open — the tool grid is gone", () => {
    const layout = model.getButtonLayout();
    const ids = layout.map((b) => b.id).sort();
    expect(ids).toEqual([...VR_KEYBOARD_KEYS.map((k) => k.id)].sort());
    expect(ids).not.toContain("annotate");
    expect(ids).not.toContain("exit");
  });

  it("isKeyboardOpen() reflects the draft's active flag", () => {
    expect(model.isKeyboardOpen()).toBe(true);
  });

  // The same invariants the plain menu grid is held to (see the "layout & hit
  // testing" describe above), re-run against computeGridLayout() directly for
  // BOTH button sets. These holding for a 10-column keyboard row is the whole
  // justification for making the keyboard a MODE of this model rather than a
  // second panel with its own layout math — see the class-level doc comment.
  it.each([
    ["menu grid", () => computeGridLayout(VR_MENU_BUTTONS)],
    ["keyboard grid", () => computeGridLayout(VR_KEYBOARD_KEYS)],
  ])("%s: one non-overlapping cell per button, within [0,1] on both axes", (_label, getLayout) => {
    const layout = getLayout();
    for (const r of layout) {
      expect(r.u0).toBeGreaterThanOrEqual(0);
      expect(r.u1).toBeLessThanOrEqual(1);
      expect(r.u0).toBeLessThan(r.u1);
      expect(r.v0).toBeGreaterThanOrEqual(0);
      expect(r.v1).toBeLessThanOrEqual(1);
      expect(r.v0).toBeLessThan(r.v1);
    }
  });

  it.each([
    ["menu grid", () => computeGridLayout(VR_MENU_BUTTONS)],
    ["keyboard grid", () => computeGridLayout(VR_KEYBOARD_KEYS)],
  ])("%s: within each row, cells are strictly increasing and non-overlapping left→right", (_label, getLayout) => {
    const byRow = new Map();
    for (const r of getLayout()) {
      if (!byRow.has(r.row)) byRow.set(r.row, []);
      byRow.get(r.row).push(r);
    }
    for (const cells of byRow.values()) {
      for (let i = 1; i < cells.length; i++) {
        expect(cells[i].u0).toBeGreaterThan(cells[i - 1].u1);
      }
    }
  });

  it.each([
    ["menu grid", () => computeGridLayout(VR_MENU_BUTTONS)],
    ["keyboard grid", () => computeGridLayout(VR_KEYBOARD_KEYS)],
  ])("%s: rows are stacked top-to-bottom without overlapping v-ranges", (_label, getLayout) => {
    const layout = getLayout();
    const rowIds = [...new Set(layout.map((r) => r.row))].sort((a, b) => a - b);
    for (const rowId of rowIds) {
      const cells = layout.filter((r) => r.row === rowId);
      const v0 = cells[0].v0;
      const v1 = cells[0].v1;
      for (const c of cells) {
        expect(c.v0).toBe(v0);
        expect(c.v1).toBe(v1);
      }
      const higherRow = layout.find((r) => r.row === rowId + 1);
      if (higherRow) {
        expect(higherRow.v1).toBeLessThanOrEqual(v0 + 1e-9);
      }
    }
  });

  it("hitTest maps each keyboard cell centre back to that key", () => {
    for (const r of model.getButtonLayout()) {
      expect(model.hitTest(r.cu, r.cv)?.id).toBe(r.id);
    }
  });

  it("kbd-char appends the bare character via manager.appendAnnotationDraft when shift is off", () => {
    const r = model.activate("kbd-q");
    expect(manager.appendAnnotationDraft).toHaveBeenCalledWith("q");
    expect(r).toMatchObject({ handled: true, action: "kbd-char", char: "q" });
  });

  it("shift 'once' capitalizes exactly the next character, then reverts to off", () => {
    model.activate("kbd-shift"); // off -> once
    manager.appendAnnotationDraft.mockClear();

    model.activate("kbd-q");
    expect(manager.appendAnnotationDraft).toHaveBeenCalledWith("Q");

    manager.appendAnnotationDraft.mockClear();
    model.activate("kbd-w");
    expect(manager.appendAnnotationDraft).toHaveBeenCalledWith("w"); // shift already consumed
  });

  it("shift 'lock' capitalizes every character until toggled off again", () => {
    model.activate("kbd-shift"); // off -> once
    model.activate("kbd-shift"); // once -> lock
    manager.appendAnnotationDraft.mockClear();

    model.activate("kbd-q");
    expect(manager.appendAnnotationDraft).toHaveBeenCalledWith("Q");
    manager.appendAnnotationDraft.mockClear();
    model.activate("kbd-w");
    expect(manager.appendAnnotationDraft).toHaveBeenCalledWith("W");
  });

  it("getButtonStates lights Shift only while 'once' or 'lock', not 'off'", () => {
    const stateOf = (id) =>
      model.getButtonStates().find((s) => s.id === id)?.active;
    expect(stateOf("kbd-shift")).toBe(false);

    model.activate("kbd-shift"); // once
    expect(stateOf("kbd-shift")).toBe(true);

    model.activate("kbd-shift"); // lock
    expect(stateOf("kbd-shift")).toBe(true);

    model.activate("kbd-shift"); // back to off
    expect(stateOf("kbd-shift")).toBe(false);
  });

  it("kbd-backspace routes through manager.backspaceAnnotationDraft", () => {
    const r = model.activate("kbd-backspace");
    expect(manager.backspaceAnnotationDraft).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "kbd-backspace" });
  });

  it("kbd-confirm routes through manager.confirmAnnotationDraft", () => {
    const r = model.activate("kbd-confirm");
    expect(manager.confirmAnnotationDraft).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "kbd-confirm", confirmed: true });
  });

  it("kbd-cancel routes through manager.cancelAnnotationDraft", () => {
    const r = model.activate("kbd-cancel");
    expect(manager.cancelAnnotationDraft).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "kbd-cancel", cancelled: true });
  });

  it("kbd-preset appends the preset text plus a trailing space (never replaces)", () => {
    const r = model.activate("kbd-preset-anomaly");
    expect(manager.appendAnnotationDraft).toHaveBeenCalledWith("Anomaly ");
    expect(r).toMatchObject({ handled: true, action: "kbd-preset", presetText: "Anomaly" });
  });

  it("getStatusLine shows the draft readout instead of dataset/scale/nav-mode", () => {
    manager.getAnnotationDraft.mockReturnValue({ active: true, text: "hello", fallbackText: "Note" });
    model.syncFromManager();
    expect(model.getStatusLine()).toContain("hello");
    expect(model.getStatusLine()).not.toContain("test.vtp");
  });

  it("getStatusLine falls back to the preset prompt when nothing has been typed", () => {
    manager.getAnnotationDraft.mockReturnValue({ active: true, text: "", fallbackText: "Max" });
    model.syncFromManager();
    expect(model.getStatusLine()).toContain('"Max"');
  });

  it("getHintLine switches to the keyboard hint", () => {
    expect(model.getHintLine()).toBe(
      "Type the note · Save places it for everyone · Cancel discards"
    );
  });

  it("the tool grid is unhittable while the keyboard is open", () => {
    expect(model.activate("annotate")).toEqual({ handled: false });
    expect(model.getButtonLayout().some((b) => b.id === "exit")).toBe(false);
  });

  it("closes automatically when the draft resolves — derived, never toggled", () => {
    expect(model.isKeyboardOpen()).toBe(true);
    manager.getAnnotationDraft.mockReturnValue({ active: false, text: "", fallbackText: "Note" });
    model.syncFromManager();
    expect(model.isKeyboardOpen()).toBe(false);
    expect(model.getButtonLayout().some((b) => b.id === "annotate")).toBe(true);
  });

  it("resets a held shift back to 'off' the moment the keyboard closes", () => {
    model.activate("kbd-shift"); // once
    manager.getAnnotationDraft.mockReturnValue({ active: false, text: "", fallbackText: "Note" });
    model.syncFromManager();

    // Re-open a fresh draft — shift must not have survived the close.
    manager.getAnnotationDraft.mockReturnValue({ active: true, text: "", fallbackText: "Note" });
    model.syncFromManager();
    const stateOf = (id) => model.getButtonStates().find((s) => s.id === id)?.active;
    expect(stateOf("kbd-shift")).toBe(false);
  });

  it("forces the panel visible even if manually hidden while a draft is open", () => {
    model.setVisible(false);
    expect(model.isVisible()).toBe(true);
  });

  it("tolerates a manager missing the draft methods entirely", () => {
    const bare = new VRSpatialMenuModel({});
    expect(() => bare.syncFromManager()).not.toThrow();
    expect(bare.isKeyboardOpen()).toBe(false);
    expect(() => bare.activate("kbd-confirm")).not.toThrow();
  });
});
