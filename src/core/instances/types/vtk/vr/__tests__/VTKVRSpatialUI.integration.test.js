// src/core/instances/types/vtk/vr/__tests__/VTKVRSpatialUI.integration.test.js
//
// End-to-end pipeline test for the in-VR spatial menu: initialize() -> a
// normal-frame update() -> dispose(), against a fake renderer. Unlike
// VTKVRSpatialUI.mapping.test.js (one narrow coordinate-math helper) and
// VRSpatialMenuModel.test.js (the pure data model only), this test actually
// exercises the canvas/texture/actor construction path — the code that
// builds the button quads and icon+label billboards in a real headset.
//
// jsdom has no real <canvas> 2D context or Path2D by default (the `canvas`
// npm package isn't installed), so this path has never executed under test
// before — which is how a change this size shipped without anything ever
// proving the panel actually produces visible, correctly-placed actors. This
// file stubs just enough of the Canvas 2D API to run the real code, then
// asserts on the REAL vtk.js actors it produces (visibility/position/scale),
// not on mock call counts.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRSpatialUI } from "../VTKVRSpatialUI.js";
import { VR_MENU_BUTTONS } from "@Core/vr/VRSpatialMenuModel.js";
import { VR_KEYBOARD_KEYS } from "@Core/vr/VRKeyboardModel.js";
import { createFakeCtx } from "@/test/fakeCanvas.js";

/** Minimal manager stub — same shape as VRSpatialMenuModel.test.js's makeManager(). */
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

/** A manager whose draft is open — switches the panel into keyboard mode. */
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

function makeFakeRenderer() {
  return { addActor: vi.fn(), removeActor: vi.fn() };
}

function makeInputState({ headY = 1.6, triggerPressed = false } = {}) {
  return {
    headPose: {
      position: { x: 0, y: headY, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 }, // identity: facing -Z
    },
    controllers: {
      // Identity transform matrix (column-major) -> forward = [0,0,-1], same
      // as the head, so the panel (anchored in front of the head) sits
      // directly along this ray.
      right: {
        targetRay: {
          position: { x: 0, y: headY, z: 0 },
          matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        },
        triggerPressed,
      },
      left: null,
    },
  };
}

/**
 * Same as makeInputState, but the controller ray is aimed exactly at
 * `target` (an [x,y,z] world point) instead of straight ahead — the panel
 * sits off-center (dropped + side-offset, see VTKVRSpatialUI's
 * PANEL_DROP/PANEL_SIDE_OFFSET), so hitting a specific button/tab requires
 * aiming at its actual computed position, not just "forward".
 */
function makeInputStateAimedAt(
  target,
  { headY = 1.6, triggerPressed = false, squeezePressed = false, controllerPosition = null } = {}
) {
  const origin = [0, headY, 0];
  const d = [target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]];
  const len = Math.hypot(...d) || 1;
  const dir = d.map((v) => v / len);
  // _pickRay derives direction as [-m8,-m9,-m10]; only those three matrix
  // slots matter (origin comes from targetRay.position).
  const matrix = [1, 0, 0, 0, 0, 1, 0, 0, -dir[0], -dir[1], -dir[2], 0, 0, 0, 0, 1];
  return {
    headPose: { position: { x: origin[0], y: origin[1], z: origin[2] }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    controllers: {
      right: {
        pose: {
          position: controllerPosition
            ? { x: controllerPosition[0], y: controllerPosition[1], z: controllerPosition[2] }
            : { x: origin[0], y: origin[1], z: origin[2] },
        },
        targetRay: { position: { x: origin[0], y: origin[1], z: origin[2] }, matrix },
        triggerPressed,
        squeezePressed,
      },
      left: null,
    },
  };
}

describe("VRSpatialUI integration — initialize/update/dispose against a fake renderer", () => {
  let getContextSpy;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => createFakeCtx());
    vi.stubGlobal(
      "Path2D",
      class FakePath2D {
        constructor(_pathData) {}
      }
    );
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("builds every static button + status/hint/reshow actors without throwing", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();

    expect(() => ui.initialize(renderer, makeManager())).not.toThrow();

    // Every button gets a card actor; buttons with a resolvable icon+label
    // (all of them, per the icon-data audit) also get a label actor.
    // Plus: backing panel, status line, hint line, reshow-tab card, reshow-tab label.
    const expectedMin = VR_MENU_BUTTONS.length * 2 + 5;
    expect(renderer.addActor.mock.calls.length).toBeGreaterThanOrEqual(expectedMin);

    // The actual regression this test exists to catch: a real panel with
    // real button actors, not zero.
    expect(ui._buttonActors.size).toBe(VR_MENU_BUTTONS.length);
  });

  it("makes every button visible with finite position/scale after a normal frame", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager());

    const result = ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(result).not.toBeNull();

    expect(ui._buttonActors.size).toBe(VR_MENU_BUTTONS.length);
    for (const [id, { actor, labelActor }] of ui._buttonActors) {
      expect(actor.getVisibility(), `button "${id}" quad should be visible`).toBe(true);
      const pos = actor.getPosition();
      const scale = actor.getScale();
      expect(pos.every(Number.isFinite), `button "${id}" position should be finite`).toBe(true);
      expect(scale.every((v) => Number.isFinite(v) && v > 0), `button "${id}" scale should be finite/positive`).toBe(
        true
      );
      if (labelActor) {
        expect(labelActor.getVisibility(), `button "${id}" label should be visible`).toBe(true);
      }
    }
  });

  // REGRESSION: _createButtonActor used to build its plane with vtkPlaneSource's
  // DEFAULTS, which span [0,1]² rather than the [-0.5,0.5]² that _layoutButtons
  // assumes. Every card then rendered half a cell up-and-right of the cell it
  // was positioned at, so the visible card no longer matched the region
  // hitTest() resolves — pointing at a card activated its neighbour, and the
  // centered icon/label billboard landed on the card's corner. The old test
  // only asserted positions were finite, so it could not catch this.
  //
  // Parameterized over both panel modes: this is the specific guard for the
  // PANEL_WIDTH -> this._panelWidth conversion (4 read sites — see
  // _layoutBackingPanel, _layoutButtons x2, _intersectPanel). Missing any one
  // of them would make _layoutButtons and the hit-region math disagree only
  // in keyboard mode (a wider panel), which the menu-only version of this
  // test could never catch.
  it.each([
    ["menu", () => makeManager()],
    ["keyboard", () => makeDraftManager()],
  ])("places each card ON its own hit region in %s mode (card plane must be centered)", (_label, makeMgr) => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeMgr());
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    const layout = ui.getModel().getButtonLayout();
    expect(layout.length).toBeGreaterThan(0);

    // Checking actor.getPosition() would be VACUOUS here — the actor is placed
    // at the cell centre either way; it's the plane's LOCAL vertex range that
    // was wrong. So assert on the actor's world BOUNDS, whose centre only
    // coincides with its position when the plane is authored centered.
    for (const region of layout) {
      const entry = ui._buttonActors.get(region.id);
      if (!entry) continue;

      const pos = entry.actor.getPosition();
      const b = entry.actor.getBounds(); // [xmin,xmax, ymin,ymax, zmin,zmax]
      const boundsCentre = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2];

      for (let i = 0; i < 3; i++) {
        expect(
          Math.abs(boundsCentre[i] - pos[i]),
          `card "${region.id}" geometry must be centred on its position (axis ${i})`
        ).toBeLessThan(1e-6);
      }

      // The card must also actually cover its cell, not collapse to a point.
      const width = b[1] - b[0];
      const height = b[3] - b[2];
      expect(width, `card "${region.id}" should have real width`).toBeGreaterThan(0);
      expect(height, `card "${region.id}" should have real height`).toBeGreaterThan(0);
    }
  });

  // NOTE on the one-frame lag asserted below: update() is a thin wrapper over
  // hitTest() (re-anchors from the raw head pose) then layout() (detects the
  // mode switch and nulls _lastHeadPos to force a re-anchor) — see the
  // "benign consequences" comment on layout()'s mode-switch block in
  // VTKVRSpatialUI.js. Because hitTest() runs BEFORE layout() within the same
  // update() call, nulling _lastHeadPos in layout() cannot make THAT SAME
  // call's hitTest() re-anchor — only the NEXT call's hitTest() sees
  // _lastHeadPos === null and actually recomputes the anchor. This mirrors
  // VRExplorationManager._onFrame's real frame order (hitTest() before nav,
  // layout() after), where the lag is exactly one rendered frame — imperceptible.
  it("opening the keyboard forces a re-anchor and actually moves the panel centre, one frame after the mode switch", () => {
    // The draft is toggled via a mutable object the manager mock reads live,
    // so the SAME input (identical head position) drives repeated update()
    // calls — isolating the mode switch as the only thing that changed.
    const draft = { active: false, text: "", fallbackText: "Note" };
    const manager = makeManager({ getAnnotationDraft: vi.fn(() => draft) });
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, manager);
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    const menuWidth = ui._panelWidth;
    const menuCenter = ui._panelAnchor.center.slice();
    expect(ui._lastHeadPos).not.toBeNull();

    draft.active = true; // open the draft -> the model reports keyboard mode
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    // Width actually swaps to the keyboard's own (wider) footprint on this
    // very call — that happens in layout(), same call as the mode detection.
    expect(ui._panelWidth).not.toBe(menuWidth);
    // But the re-anchor itself lags by one call: this call's hitTest() ran
    // BEFORE layout() nulled _lastHeadPos, so with an IDENTICAL head pose it
    // early-returned on REANCHOR_DISTANCE and the centre hasn't moved yet.
    expect(ui._panelAnchor.center).toEqual(menuCenter);

    // A third call's hitTest() now sees _lastHeadPos === null (nulled by the
    // previous call's layout()) and recomputes — with the SAME identical head
    // pose, the only way the centre can differ is the drop/side-offset swap
    // finally taking effect.
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._panelAnchor.center).not.toEqual(menuCenter);
  });

  it("hides the full panel and shows the reshow tab when manually hidden, and reshowing restores it", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager());
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    ui.getModel().setVisible(false);
    const hiddenInput = makeInputState();
    hiddenInput.controllers.left = { pose: { position: { x: -0.3, y: 1.1, z: -0.2 } } };
    ui.update(hiddenInput, { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    for (const { actor } of ui._buttonActors.values()) {
      expect(actor.getVisibility()).toBe(false);
    }
    expect(ui._reshowTabActor.getVisibility()).toBe(true);
    const wristPillCenter = ui._reshowAnchor.center;
    expect(wristPillCenter[0]).toBeCloseTo(-0.3, 5);
    expect(wristPillCenter[1]).toBeCloseTo(1.21, 5);
    expect(wristPillCenter[2]).toBeCloseTo(-0.2, 5);

    // Rising-edge select while hovering the wrist pill brings the panel back
    // at the current gaze, independent of where the old panel was left.
    const reopenInput = makeInputStateAimedAt(wristPillCenter, { triggerPressed: true });
    reopenInput.controllers.left = { pose: { position: { x: -0.3, y: 1.1, z: -0.2 } } };
    ui.update(reopenInput, {
      vrScale: 1.0,
      vrOrigin: [0, 0, 0],
    });
    expect(ui.getModel().isVisible()).toBe(true);
  });

  it("places the reshow tab off the forward aim axis when there is no left-hand pose", () => {
    // Gripless/transient-pointer input (Apple Vision Pro) never reports a
    // left-hand pose during one-handed aiming — makeInputState()'s default
    // `controllers.left: null` models exactly that. A dead-ahead fallback
    // used to sit right in the aim cone every tool's raycast uses, silently
    // eating the trigger pull meant for Annotate/Measure.
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager());
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    ui.getModel().setVisible(false);

    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    expect(ui._reshowTabActor.getVisibility()).toBe(true);
    const center = ui._reshowAnchor.center;
    // Facing -Z (identity orientation): the old dead-ahead fallback put the
    // tab at x === 0 (straight down the aim axis). It must now sit off to
    // the side instead.
    expect(center[0]).not.toBeCloseTo(0, 5);
    expect(Math.abs(center[0])).toBeGreaterThan(0.1);
  });

  it("trigger-drags the header and leaves the menu at its manual position", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager());
    ui.update(makeInputState(), { vrScale: 1, vrOrigin: [0, 0, 0] });

    const a = ui._panelAnchor;
    const headerCenter = [
      a.center[0] + a.up[0] * (ui._panelHeight / 2 + 0.095),
      a.center[1] + a.up[1] * (ui._panelHeight / 2 + 0.095),
      a.center[2] + a.up[2] * (ui._panelHeight / 2 + 0.095),
    ];
    const start = [...a.center];
    const begin = ui.hitTest(makeInputStateAimedAt(headerCenter, { triggerPressed: true }));
    expect(begin).toMatchObject({ buttonId: "__header__", consumingTrigger: true });

    const movedTarget = [headerCenter[0] - 0.2, headerCenter[1] + 0.08, headerCenter[2]];
    ui.hitTest(makeInputStateAimedAt(movedTarget, { triggerPressed: true }));
    expect(ui._panelAnchor.center).not.toEqual(start);

    ui.hitTest(makeInputStateAimedAt(movedTarget));
    const dropped = [...ui._panelAnchor.center];
    ui.hitTest(makeInputState({ headY: 2.4 }));
    expect(ui._panelAnchor.center).toEqual(dropped);
  });

  it("grip-grabs the header without offering that grip to world navigation", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager());
    ui.update(makeInputState(), { vrScale: 1, vrOrigin: [0, 0, 0] });

    const a = ui._panelAnchor;
    const headerCenter = [a.center[0], a.center[1] + ui._panelHeight / 2 + 0.095, a.center[2]];
    const startX = a.center[0];
    const begin = ui.hitTest(
      makeInputStateAimedAt(headerCenter, {
        squeezePressed: true,
        controllerPosition: [0, 1.2, 0],
      })
    );
    expect(begin).toMatchObject({ buttonId: "__header__", consumingGrip: true });

    ui.hitTest(
      makeInputStateAimedAt(headerCenter, {
        squeezePressed: true,
        controllerPosition: [0.25, 1.2, 0],
      })
    );
    expect(ui._panelAnchor.center[0]).toBeCloseTo(startX + 0.25, 5);
  });

  it("consumingTrigger is true for a plain button hover+tap, not just the header drag-bar", () => {
    // Regression: hitTest() used to return `consumingTrigger: !!headerHit` —
    // explicitly FALSE for an ordinary button tap (only true for the header
    // drag-bar). VRExplorationManager reads this as
    // `menuResult?.consumingTrigger ?? menuHovering`, and `??` only falls
    // through on null/undefined — an explicit `false` defeated that intended
    // fallback. Net effect: the SAME trigger pull that activated a button
    // (Undo, New Path, a tool switch, ...) was NOT stripped from the active
    // tool's input, so it also registered there as a fresh rising edge — e.g.
    // tapping "New Path" while Measure was active also placed a phantom
    // measurement point wherever the controller happened to be aimed.
    const manager = makeManager();
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), manager);
    ui.update(makeInputState(), { vrScale: 1, vrOrigin: [0, 0, 0] });

    const undoActor = ui._buttonActors.get("undo").actor;
    const target = undoActor.getPosition();

    const result = ui.hitTest(makeInputStateAimedAt(target, { triggerPressed: true }));

    expect(result.buttonId).toBe("undo");
    expect(result.hovering).toBe(true);
    // THE assertion this test exists for.
    expect(result.consumingTrigger).toBe(true);
    // And the tap actually reached the menu, not just the flag.
    expect(manager.undoLastToolAction).toHaveBeenCalled();
  });

  it("toggleAtHead closes the panel and reopens it at the current gaze", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager());
    ui.update(makeInputState(), { vrScale: 1, vrOrigin: [0, 0, 0] });
    const original = [...ui._panelAnchor.center];

    ui.toggleAtHead(makeInputState().headPose);
    expect(ui.getModel().isVisible()).toBe(false);

    const newHead = makeInputState({ headY: 2.1 }).headPose;
    ui.toggleAtHead(newHead);
    expect(ui.getModel().isVisible()).toBe(true);
    expect(ui._panelAnchor.center).not.toEqual(original);
    // Gaze-anchored (not a manual grab-drag), so the panel must keep
    // following the user afterward — see showAtHead.
    expect(ui._manualPlacement).toBe(false);
  });

  it("forceReanchor clears the cached anchor so the next call re-anchors even without position drift", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager());
    ui.update(makeInputState(), { vrScale: 1, vrOrigin: [0, 0, 0] });
    const original = [...ui._panelAnchor.center];

    // A small move, well under REANCHOR_DISTANCE — sanity-checks that the
    // gate normally holds the panel in place.
    ui.update(makeInputState({ headY: 1.65 }), { vrScale: 1, vrOrigin: [0, 0, 0] });
    expect(ui._panelAnchor.center).toEqual(original);

    // Simulates VRExplorationManager reacting to a reference-space change
    // (e.g. a snap-turn) — see VRExplorationManager._onFrame's yaw-offset check.
    ui.forceReanchor();
    expect(ui._panelAnchor).toBeNull();

    ui.update(makeInputState({ headY: 1.65 }), { vrScale: 1, vrOrigin: [0, 0, 0] });
    expect(ui._panelAnchor.center).not.toEqual(original);
    expect(ui._manualPlacement).toBe(false);
  });

  it("dispose() removes every actor it added and leaves no residual state", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager());
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    const addCount = renderer.addActor.mock.calls.length;
    ui.dispose();

    expect(renderer.removeActor.mock.calls.length).toBeGreaterThanOrEqual(VR_MENU_BUTTONS.length);
    expect(ui._buttonActors.size).toBe(0);
    // No mode switch happened in this test, so nothing should have been
    // parked — dispose() should find this map already empty.
    expect(ui._parkedActors.size).toBe(0);
    expect(addCount).toBeGreaterThan(0);
  });

  it("dispose() also removes PARKED actors (e.g. retired keyboard cards after the draft closes)", () => {
    // Parking (see _reconcileButtonActors) exists so a mode switch doesn't
    // rebuild ~50 canvas+texture actors every open — but that only pays off
    // if dispose() still cleans them up rather than leaking them in the
    // renderer for the rest of the session.
    const draft = { active: true, text: "", fallbackText: "Note" };
    const manager = makeManager({ getAnnotationDraft: vi.fn(() => draft) });
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, manager);
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] }); // opens keyboard
    expect(ui._buttonActors.size).toBe(VR_KEYBOARD_KEYS.length);

    draft.active = false; // close the draft -> back to the menu grid
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    expect(ui._buttonActors.size).toBe(VR_MENU_BUTTONS.length);
    // The keyboard's cards are retired but kept, not destroyed.
    expect(ui._parkedActors.size).toBe(VR_KEYBOARD_KEYS.length);

    const addCount = renderer.addActor.mock.calls.length;
    ui.dispose();

    expect(renderer.removeActor.mock.calls.length).toBeGreaterThanOrEqual(
      VR_MENU_BUTTONS.length + VR_KEYBOARD_KEYS.length
    );
    expect(ui._buttonActors.size).toBe(0);
    expect(ui._parkedActors.size).toBe(0);
    expect(addCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// hitTest()/layout() frame-order split (A4)
//
// update() previously did hit-testing AND placement in one pass, called
// BEFORE navigation updates vrContext.vrScale/vrOrigin each frame — so the
// panel's actors were placed with frame N-1's transform while the camera
// rendered frame N, and the panel visibly swam against the world whenever
// the user moved/scaled. The fix splits update() into hitTest() (pure
// XR-metre geometry, runs before nav) and layout() (placement, runs after
// nav, with THIS frame's transform) — see VTKVRSpatialUI.js for the full
// rationale. update() itself becomes a thin wrapper kept only so this whole
// file's pre-existing pipeline tests keep exercising both phases together.
// ---------------------------------------------------------------------------
describe("VRSpatialUI hitTest()/layout() frame-order split (A4)", () => {
  let getContextSpy;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => createFakeCtx());
    vi.stubGlobal(
      "Path2D",
      class FakePath2D {
        constructor(_pathData) {}
      }
    );
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("update() behaves identically to calling hitTest() then layout() directly (thin-wrapper contract)", () => {
    const rendererA = makeFakeRenderer();
    const uiA = new VRSpatialUI();
    uiA.initialize(rendererA, makeManager());

    const rendererB = makeFakeRenderer();
    const uiB = new VRSpatialUI();
    uiB.initialize(rendererB, makeManager());

    const input = makeInputState();
    const transform = { vrScale: 1.0, vrOrigin: [0, 0, 0] };

    const wrapperResult = uiA.update(input, transform);
    const splitResult = uiB.hitTest(input);
    uiB.layout(transform);

    // update()'s return value IS hitTest()'s return value (layout() returns
    // nothing) — the wrapper contract.
    expect(wrapperResult).toEqual(splitResult);

    // Every button actor lands in the same place, with the same visibility,
    // whichever path drove it.
    expect(uiA._buttonActors.size).toBe(uiB._buttonActors.size);
    for (const [id, entryA] of uiA._buttonActors) {
      const entryB = uiB._buttonActors.get(id);
      expect(entryB, `button "${id}" should exist on both UIs`).toBeDefined();
      expect(entryB.actor.getPosition()).toEqual(entryA.actor.getPosition());
      expect(entryB.actor.getVisibility()).toBe(entryA.actor.getVisibility());
    }
    expect(uiA._hoverButtonId).toBe(uiB._hoverButtonId);
  });

  it("layout() uses the transform passed to IT, not one passed to a previous hitTest() call", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager());

    // hitTest() takes no transform at all — its signature is (inputState)
    // only. Establish the panel anchor, then lay out once at the identity
    // transform to get each button's PHYSICAL (pre-transform) position.
    ui.hitTest(makeInputState());
    ui.layout({ vrScale: 1.0, vrOrigin: [0, 0, 0] });
    const anyId = VR_MENU_BUTTONS[0].id;
    const physicalPos = ui._buttonActors.get(anyId).actor.getPosition().slice();

    // No new hitTest() call in between — if layout() were somehow reusing a
    // transform latched earlier (or defaulting instead of reading its own
    // argument), this second layout() call would reproduce physicalPos.
    ui.layout({ vrScale: 2.0, vrOrigin: [1, 2, 3] });
    const scaledPos = ui._buttonActors.get(anyId).actor.getPosition();

    const expected = [
      physicalPos[0] / 2 + 1,
      physicalPos[1] / 2 + 2,
      physicalPos[2] / 2 + 3,
    ];
    for (let i = 0; i < 3; i++) {
      expect(scaledPos[i]).toBeCloseTo(expected[i], 5);
    }
  });

  it("activating a button that hides the panel during hitTest() makes layout() take the hidden path in the SAME frame", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager());

    // Establish a normal frame first so every button actor has a real world
    // position to aim the next frame's ray at.
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui.getModel().isVisible()).toBe(true);
    const hidePos = ui._buttonActors.get("hide-menu").actor.getPosition();

    // hitTest() alone: aim at "Hide" with the trigger down (rising edge from
    // the previous frame's release). This must activate hide-menu — and
    // hence flip the model to invisible — entirely within hitTest(), before
    // layout() ever runs this frame.
    const hitResult = ui.hitTest(makeInputStateAimedAt(hidePos, { triggerPressed: true }));
    expect(hitResult?.buttonId).toBe("hide-menu");
    expect(ui.getModel().isVisible()).toBe(false);

    // layout() re-reads isVisible() rather than trusting anything cached
    // during hitTest(), so it must take the hidden path THIS SAME call.
    ui.layout({ vrScale: 1.0, vrOrigin: [0, 0, 0] });

    if (ui._backingPanelActor) {
      expect(ui._backingPanelActor.getVisibility()).toBe(false);
    }
    for (const { actor } of ui._buttonActors.values()) {
      expect(actor.getVisibility()).toBe(false);
    }
    expect(ui._reshowTabActor.getVisibility()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Opening-frame panel placement — the panel must not sit on the forward axis
//
// This is a TRIGGER-LOSS bug, not a cosmetic one. _updateAnchor() runs from
// hitTest() (phase 1), but _dataBounds was only ever assigned in layout()
// (phase 2), and dispose() resets it to null every session. So the opening
// anchor was always computed blind, _adaptiveSideOffset fell back to the bare
// PANEL_SIDE_OFFSET (0.24 m) — smaller than the panel's own half-width
// (0.45 m) — and the panel's hit region straddled dead-ahead. Aiming at a
// centred dataset then reported a menu hover, and hitTest()'s consumingTrigger
// stripped that trigger from the tools, so Annotate/Measure/Probe placed
// nothing. The pointer reticle kept working throughout (it reads targetRay,
// which is never gated), which is what made this so hard to see.
//
// _updateAnchor's lazy re-anchor gate (REANCHOR_DISTANCE) then held that bad
// placement for as long as the user stood still — i.e. the whole session.
// ---------------------------------------------------------------------------
describe("VRSpatialUI opening-frame panel placement", () => {
  let getContextSpy;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => createFakeCtx());
    vi.stubGlobal(
      "Path2D",
      class FakePath2D {
        constructor(_pathData) {}
      }
    );
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  // A dataset as _applyInitialPlacement actually leaves it: standing on a
  // PEDESTAL_HEIGHT_M (0.5 m) pedestal, ~1.4 m ahead — i.e. BELOW eye line, so
  // the user aims DOWNWARD at it. That matters: the panel is dropped
  // PANEL_DROP (0.42 m) below eye line too, so it is precisely this downward
  // aim that the mis-anchored panel intercepts. A horizontal ray at head
  // height passes harmlessly over the panel and would NOT reproduce the bug.
  // vrScale 1 / vrOrigin origin keeps data space == XR space so the geometry
  // stays readable here.
  const SESSION_TRANSFORM = {
    vrScale: 1.0,
    vrOrigin: [0, 0, 0],
    dataBounds: [-0.5, 0.5, 0.5, 1.5, -1.9, -0.9],
  };
  const DATA_CENTER = [0, 1.0, -1.4];

  it("does not consume the trigger on the very FIRST hitTest when aiming at the data", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager(), SESSION_TRANSFORM);

    // The first frame of the session: no layout() has run yet, exactly as in
    // VRExplorationManager._onFrame where hitTest() precedes layout().
    const result = ui.hitTest(
      makeInputStateAimedAt(DATA_CENTER, { triggerPressed: true })
    );

    // Aiming at the dataset is not aiming at the menu.
    expect(result.buttonId).toBeNull();
    expect(result.hovering).toBe(false);
    // The assertion that actually matters: the trigger stays with the tools,
    // so Annotate/Measure/Probe still see their rising edge.
    expect(result.consumingTrigger).toBe(false);
  });

  it("places the panel clear of the forward axis on the opening frame", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager(), SESSION_TRANSFORM);
    ui.hitTest(makeInputState());

    // Facing -Z from the origin, so lateral displacement is |x|. The panel's
    // near edge must clear dead-ahead by its own half-width.
    const center = ui._panelAnchor.center;
    expect(Math.abs(center[0])).toBeGreaterThan(ui._panelWidth / 2);
  });

  it("_adaptiveSideOffset never returns less than the panel half-width, even with no bounds", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager());
    ui._dataBounds = null; // the pre-layout() state dispose() leaves behind

    const offset = ui._adaptiveSideOffset([0, 1.6, 0], [0, 0, -1], [1, 0, 0]);

    expect(Math.abs(offset)).toBeGreaterThanOrEqual(ui._panelWidth / 2);
  });

  it("still resolves a genuine button hover, so the fix does not disable the menu", () => {
    const ui = new VRSpatialUI();
    ui.initialize(makeFakeRenderer(), makeManager(), SESSION_TRANSFORM);
    ui.update(makeInputState(), SESSION_TRANSFORM);

    const undoPos = ui._buttonActors.get("undo").actor.getPosition();
    const result = ui.hitTest(makeInputStateAimedAt(undoPos));

    expect(result.buttonId).toBe("undo");
    expect(result.consumingTrigger).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Status/hint label repaint gate (Phase 5)
//
// getStatusLine() embeds the live vrScale, which VRScaleController mutates
// continuously during a two-hand pinch, so the pre-existing string
// dirty-check in _layoutStatus/_layoutHint isn't enough by itself to stop a
// canvas repaint + GPU texture re-upload on nearly every frame. These tests
// exercise the LABEL_REPAINT_INTERVAL_MS gate added on top of that
// dirty-check, via the real update() pipeline (not by calling the private
// _layoutStatus/_layoutHint methods directly) so they also prove the gate
// doesn't interfere with the position/visibility work that must still run
// every frame.
//
// ctx.fillText (see src/test/fakeCanvas.js) is a vi.fn(), and _statusCtx/
// _hintCtx are the SAME context object reused across redraws (only the
// canvas is resized per redraw, see _redrawStatusLabel/_redrawHintLabel), so
// counting ctx.fillText.mock.calls is a direct, low-level proxy for "how many
// times did the canvas actually get repainted" — independent of the
// positioning math that runs unconditionally.
describe("VRSpatialUI status/hint label repaint gate", () => {
  let getContextSpy;
  let nowSpy;
  let currentTime;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => createFakeCtx());
    vi.stubGlobal(
      "Path2D",
      class FakePath2D {
        constructor(_pathData) {}
      }
    );
    currentTime = 0;
    nowSpy = vi.spyOn(performance, "now").mockImplementation(() => currentTime);
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    nowSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("paints the status label immediately on first appearance (gate bypassed when previous text was empty)", () => {
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager({ getActiveDatasetName: vi.fn(() => "first.vtp") }));

    currentTime = 0;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    // _lastStatusText starts null (empty) -> the very first non-empty text
    // must bypass the gate rather than waiting up to LABEL_REPAINT_INTERVAL_MS.
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);
    expect(ui._statusCtx.fillText.mock.calls[0][0]).toContain("first.vtp");
  });

  it("does not repaint again for a rapid sequence of distinct texts inside one 125ms window", () => {
    const nameRef = { current: "a.vtp" };
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager({ getActiveDatasetName: vi.fn(() => nameRef.current) }));

    currentTime = 0;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] }); // immediate first paint
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);

    // Three more distinct texts, all within 125ms of the last ACTUAL paint —
    // none of these should trigger a repaint.
    nameRef.current = "b.vtp";
    currentTime = 10;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);

    nameRef.current = "c.vtp";
    currentTime = 60;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);

    nameRef.current = "d.vtp";
    currentTime = 100;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);

    // Still visible with the LAST actually-painted text ("a.vtp") until the
    // gate opens — the label doesn't flicker or blank out while gated.
    expect(ui._statusActor.getVisibility()).toBe(true);
  });

  it("paints the last pending text once the interval elapses — nothing is silently dropped", () => {
    const nameRef = { current: "a.vtp" };
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(renderer, makeManager({ getActiveDatasetName: vi.fn(() => nameRef.current) }));

    currentTime = 0;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] }); // immediate first paint
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);

    // Two gated changes in quick succession — neither repaints.
    nameRef.current = "b.vtp";
    currentTime = 20;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    nameRef.current = "c.vtp";
    currentTime = 40;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);

    // Text settles on "c.vtp" and stays there while time advances past the
    // gate — no further text changes, just the interval elapsing.
    currentTime = 130;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });

    // The gate opening must paint "c.vtp" — the last text that was ever
    // requested — not silently skip it because it wasn't "new" at the moment
    // the gate opened.
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(2);
    expect(ui._statusCtx.fillText.mock.calls[1][0]).toContain("c.vtp");
  });

  it("gates the status and hint labels independently — neither shares or resets the other's timer", () => {
    const nameRef = { current: "a.vtp" };
    const hintRef = { current: "controls A" };
    const renderer = makeFakeRenderer();
    const ui = new VRSpatialUI();
    ui.initialize(
      renderer,
      makeManager({
        getActiveDatasetName: vi.fn(() => nameRef.current),
        getNavigationModeInfo: vi.fn(() => ({ name: "Fly", controls: hintRef.current })),
      })
    );

    currentTime = 0;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] }); // both immediate
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);
    expect(ui._hintCtx.fillText).toHaveBeenCalledTimes(1);

    // Status changes and gets gated at t=10 (elapsed 10ms since its own last
    // paint at t=0); hint text is untouched so it does nothing either way.
    nameRef.current = "b.vtp";
    currentTime = 10;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(1);
    expect(ui._hintCtx.fillText).toHaveBeenCalledTimes(1);

    // Status's gate opens and it repaints at t=130 (130ms since ITS last
    // paint at t=0) — this must NOT reset or otherwise affect the hint's gate.
    currentTime = 130;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(2);
    expect(ui._hintCtx.fillText).toHaveBeenCalledTimes(1);

    // Hint changes at t=200 — 200ms since ITS OWN last paint at t=0, so its
    // own independent gate is open and it repaints right away. If the two
    // labels shared one gate, status's repaint at t=130 would have reset a
    // shared timer and this change (only 70ms later) would still be gated.
    hintRef.current = "controls B";
    currentTime = 200;
    ui.update(makeInputState(), { vrScale: 1.0, vrOrigin: [0, 0, 0] });
    expect(ui._hintCtx.fillText).toHaveBeenCalledTimes(2);
    expect(ui._hintCtx.fillText.mock.calls[1][0]).toContain("controls B");
    // Status text hasn't changed since its t=130 repaint, so it stays put.
    expect(ui._statusCtx.fillText).toHaveBeenCalledTimes(2);
  });
});
