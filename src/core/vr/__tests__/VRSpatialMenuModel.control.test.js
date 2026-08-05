// src/core/vr/__tests__/VRSpatialMenuModel.control.test.js
// Phase 3's menu surface: the People drawer (Go To / Follow moved verbatim off
// row 4, plus Request / Give / Release for the data-manipulation token), and
// the in-VR notice on the status/hint lines.
//
// Row 4 was already full at 6 cells, so this restructure is the risky part:
// VTKVRSpatialUI and the existing suite both rely on row 0 starting with
// `annotate` and the last static row ending with `exit`. Both invariants are
// asserted here as well, deliberately duplicating VRSpatialMenuModel.test.js —
// they are what makes the restructure safe.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRSpatialMenuModel, VR_MENU_BUTTONS, VR_MENU_DRAWERS } from "../VRSpatialMenuModel.js";

function makeManager(overrides = {}) {
  return {
    getActiveTool: vi.fn(() => null),
    getAnnotationDraft: vi.fn(() => null),
    getActiveDatasetName: vi.fn(() => "test.vtp"),
    getNavigationMode: vi.fn(() => "grab"),
    getNavigationModeInfo: vi.fn(() => ({ name: "Grab", controls: "Grip to pull the world" })),
    getVRScale: vi.fn(() => 1),
    getPendingWorkLabel: vi.fn(() => null),
    getVRNotice: vi.fn(() => null),
    isFollowingParticipant: vi.fn(() => null),
    getOtherParticipants: vi.fn(() => []),
    goToParticipant: vi.fn(() => true),
    followParticipant: vi.fn(() => true),
    stopFollowing: vi.fn(),
    // Manipulation token delegates
    requestManipulationControl: vi.fn(() => true),
    grantManipulationControlTo: vi.fn(() => true),
    releaseManipulationControl: vi.fn(() => true),
    getManipulationRequests: vi.fn(() => []),
    isManipulationHolder: vi.fn(() => false),
    getManipulationHolder: vi.fn(() => null),
    ...overrides,
  };
}

/** getButtonStates() as a lookup, since only a couple of ids matter per test. */
function statesById(model) {
  return Object.fromEntries(model.getButtonStates().map((s) => [s.id, s]));
}

describe("VRSpatialMenuModel — row 4 restructure invariants", () => {
  let model;
  beforeEach(() => {
    model = new VRSpatialMenuModel(makeManager());
  });

  it("row 0 still starts with annotate and the last static row still ends with exit", () => {
    const layout = model.getButtonLayout();
    const row0 = layout.filter((r) => r.row === 0);
    expect(row0[0].id).toBe("annotate");

    const maxRow = Math.max(...layout.map((r) => r.row));
    const lastRow = layout.filter((r) => r.row === maxRow);
    expect(lastRow[lastRow.length - 1].id).toBe("exit");
  });

  it("holds those invariants with the People drawer open too", () => {
    model.activate("people");
    const layout = model.getButtonLayout();

    expect(layout.filter((r) => r.row === 0)[0].id).toBe("annotate");
    const maxRow = Math.max(...layout.map((r) => r.row));
    const lastRow = layout.filter((r) => r.row === maxRow);
    expect(lastRow[lastRow.length - 1].id).toBe("exit");
  });

  it("row 4 keeps only essential session controls plus the advanced drawer", () => {
    expect(VR_MENU_BUTTONS.filter((b) => b.row === 4).map((b) => b.id)).toEqual([
      "people",
      "isolation",
      "advanced",
      "hide-menu",
      "exit",
    ]);
  });

  it("Go To and Follow moved verbatim into the drawer — same ids and kinds", () => {
    const drawer = VR_MENU_DRAWERS.people;
    expect(drawer.map((b) => b.id)).toEqual([
      "goto-participant",
      "follow-participant",
      "control-request",
      "control-grant",
      "control-release",
    ]);
    expect(drawer.find((b) => b.id === "goto-participant").kind).toBe("goto-participant");
    expect(drawer.find((b) => b.id === "follow-participant").kind).toBe("follow-participant");
  });

  it("leaves drawerRow 1 free for the Phase 4 roster", () => {
    expect(VR_MENU_DRAWERS.people.every((b) => b.drawerRow === 0)).toBe(true);
  });

  it("drawer buttons are unhittable until the drawer is open", () => {
    expect(model.getButtonLayout().some((b) => b.id === "control-request")).toBe(false);
    model.activate("people");
    expect(model.getButtonLayout().some((b) => b.id === "control-request")).toBe(true);
  });
});

describe("VRSpatialMenuModel — control dispatch", () => {
  let model;
  let manager;
  beforeEach(() => {
    manager = makeManager();
    model = new VRSpatialMenuModel(manager);
    model.activate("people");
  });

  it("control-request calls manager.requestManipulationControl", () => {
    const r = model.activate("control-request");
    expect(manager.requestManipulationControl).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "control-request", requested: true });
  });

  it("control-grant answers the OLDEST pending request first", () => {
    manager.getManipulationRequests.mockReturnValue([
      { userId: "u9", userName: "Carol", atMs: 1 },
      { userId: "u8", userName: "Dave", atMs: 2 },
    ]);
    const r = model.activate("control-grant");
    expect(manager.grantManipulationControlTo).toHaveBeenCalledWith("u9", "Carol");
    expect(r).toMatchObject({ handled: true, action: "control-grant", userId: "u9", granted: true });
  });

  it("control-grant falls back to the next participant when nobody has asked", () => {
    manager.getOtherParticipants.mockReturnValue([{ odUserId: "u1", userName: "Alice" }]);
    const r = model.activate("control-grant");
    expect(manager.grantManipulationControlTo).toHaveBeenCalledWith("u1");
    expect(r).toMatchObject({ handled: true, action: "control-grant", userId: "u1" });
  });

  it("control-grant is a safe no-op in a solo session", () => {
    const r = model.activate("control-grant");
    expect(manager.grantManipulationControlTo).not.toHaveBeenCalled();
    expect(r).toMatchObject({ handled: true, action: "control-grant", granted: false, reason: "no-participants" });
  });

  it("control-release calls manager.releaseManipulationControl", () => {
    const r = model.activate("control-release");
    expect(manager.releaseManipulationControl).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ handled: true, action: "control-release", released: true });
  });

  it("Go To and Follow still dispatch unchanged from inside the drawer", () => {
    manager.getOtherParticipants.mockReturnValue([{ odUserId: "u1", userName: "Alice" }]);

    expect(model.activate("goto-participant")).toMatchObject({
      handled: true,
      action: "goto-participant",
      userId: "u1",
      ok: true,
    });
    expect(manager.goToParticipant).toHaveBeenCalledWith("u1");

    expect(model.activate("follow-participant")).toMatchObject({
      handled: true,
      action: "follow-participant",
      following: "u1",
    });
  });

  it("never throws against a manager with none of the control methods", () => {
    const bare = new VRSpatialMenuModel({});
    bare.activate("people");
    expect(() => bare.activate("control-request")).not.toThrow();
    expect(() => bare.activate("control-grant")).not.toThrow();
    expect(() => bare.activate("control-release")).not.toThrow();
    expect(() => bare.getButtonStates()).not.toThrow();
  });
});

describe("VRSpatialMenuModel — control button states", () => {
  it("Release lights and Give/Request enable for the holder", () => {
    const model = new VRSpatialMenuModel(makeManager({ isManipulationHolder: vi.fn(() => true) }));
    model.activate("people");
    const states = statesById(model);

    expect(states["control-release"].active).toBe(true);
    expect(states["control-grant"].disabled).toBe(false);
    // Nothing to request when you already hold it.
    expect(states["control-request"].disabled).toBe(true);
  });

  it("Give is disabled and Release dark for a non-holder", () => {
    const model = new VRSpatialMenuModel(makeManager({ isManipulationHolder: vi.fn(() => false) }));
    model.activate("people");
    const states = statesById(model);

    expect(states["control-release"].active).toBe(false);
    expect(states["control-grant"].disabled).toBe(true);
    expect(states["control-request"].disabled).toBe(false);
  });
});

describe("VRSpatialMenuModel — notice on the status and hint lines", () => {
  it("surfaces the manager's VR notice on the status line", () => {
    const model = new VRSpatialMenuModel(
      makeManager({ getVRNotice: vi.fn(() => "Glyphs needs data control — Alice has it") })
    );
    expect(model.getStatusLine()).toBe("Glyphs needs data control — Alice has it");
  });

  it("pendingWork STILL wins over the notice", () => {
    const model = new VRSpatialMenuModel(
      makeManager({
        getPendingWorkLabel: vi.fn(() => "Building glyphs…"),
        getVRNotice: vi.fn(() => "Glyphs needs data control"),
      })
    );
    expect(model.getStatusLine()).toBe("Building glyphs…");
  });

  it("falls back to the normal status line once the notice expires", () => {
    const manager = makeManager({ getVRNotice: vi.fn(() => null) });
    const model = new VRSpatialMenuModel(manager);
    expect(model.getStatusLine()).toContain("test.vtp");
  });

  it("the hint line tells a non-holder where the button is", () => {
    const model = new VRSpatialMenuModel(
      makeManager({
        getVRNotice: vi.fn(() => "Clip needs data control"),
        isManipulationHolder: vi.fn(() => false),
      })
    );
    expect(model.getHintLine()).toBe("Open People → Request control");
  });

  it("the hint line says nothing about requesting when you already hold it", () => {
    const model = new VRSpatialMenuModel(
      makeManager({
        getVRNotice: vi.fn(() => "Data control released"),
        isManipulationHolder: vi.fn(() => true),
      })
    );
    expect(model.getHintLine()).toBe("You have data control");
  });

  it("pendingWork wins on the hint line too", () => {
    const model = new VRSpatialMenuModel(
      makeManager({
        getPendingWorkLabel: vi.fn(() => "Building glyphs…"),
        getVRNotice: vi.fn(() => "Clip needs data control"),
      })
    );
    expect(model.getHintLine()).toBe("Grip to pull the world");
  });
});
