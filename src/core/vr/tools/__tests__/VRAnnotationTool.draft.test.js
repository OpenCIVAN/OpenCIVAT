// src/core/vr/tools/__tests__/VRAnnotationTool.draft.test.js
// Covers the draft state machine that sits between "trigger fixes a point"
// and "Save persists an annotation": place -> type -> confirm/cancel. See
// VRAnnotationTool.js's handleInput/confirmDraft/cancelDraft for the design.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

// VRAnnotationTool now reads the local user's display name for a placed
// pin's label — mock the whole module rather than adding a "presence" logger
// channel, matching the pattern in AvatarNetworkSync.pointer.test.js.
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserName: vi.fn(() => "Alice"),
}));

import { createFakeCtx } from "@/test/fakeCanvas.js";
import {
  VRAnnotationTool,
  ANNOTATION_LABEL_PRESETS,
} from "../VRAnnotationTool.js";
import { MAX_ANNOTATION_TEXT } from "@Core/vr/VRKeyboardModel.js";

function makeInputState({ triggerPressed = false, a = false } = {}) {
  return {
    controllers: {
      right: {
        targetRay: { position: { x: 0, y: 0, z: 0 }, matrix: new Array(16).fill(0) },
        triggerPressed,
        thumbstick: { x: 0, y: 0 },
        buttons: { a },
      },
    },
  };
}

function makeSpyRenderer() {
  const actors = [];
  return {
    actors,
    addActor: vi.fn((a) => actors.push(a)),
    removeActor: vi.fn((a) => {
      const i = actors.indexOf(a);
      if (i >= 0) actors.splice(i, 1);
    }),
    getActiveCamera: vi.fn(() => ({ getPosition: () => [0, 0, 5] })),
  };
}

describe("VRAnnotationTool — draft state machine", () => {
  let tool;
  let renderer;

  beforeEach(async () => {
    // VRTextBillboard.attach() needs a 2D canvas context, which jsdom does
    // not implement. Shared fake from src/test/fakeCanvas.js.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
      createFakeCtx()
    );

    tool = new VRAnnotationTool();
    renderer = makeSpyRenderer();
    await tool.activate({
      handler: {
        raycastVR: vi.fn(() => ({
          position: { x: 1, y: 2, z: 3 },
          normal: { x: 0, y: 1, z: 0 },
        })),
      },
      vrContext: { vrScale: 1 },
    });
  });

  function pull() {
    return tool.handleInput(makeInputState({ triggerPressed: true }), {});
  }

  function release() {
    return tool.handleInput(makeInputState({ triggerPressed: false }), {});
  }

  it("trigger + hit opens a draft (annotation-pending); _annotations stays empty", () => {
    const action = pull();
    expect(action).toMatchObject({ type: "annotation-pending" });
    expect(action.data.id).toBeTruthy();
    expect(tool._annotations).toHaveLength(0);
    expect(tool._draft).not.toBeNull();
  });

  it("trigger while a draft is live is a no-op: null, no raycast placement, _annotations stays empty", () => {
    pull();
    const raycastCallsBefore = tool._context.handler.raycastVR.mock.calls.length;

    const second = tool.handleInput(makeInputState({ triggerPressed: true }), {});

    expect(second).toBeNull();
    expect(tool._annotations).toHaveLength(0);
    // Still exactly one draft, not a second one.
    expect(tool._context.handler.raycastVR.mock.calls.length).toBe(raycastCallsBefore);
  });

  it("appendDraftText builds up the buffer and backspaceDraft removes from the end", () => {
    pull();
    expect(tool.appendDraftText("Hi")).toBe("Hi");
    expect(tool.appendDraftText("!")).toBe("Hi!");
    expect(tool.backspaceDraft()).toBe("Hi");
    expect(tool.getDraft().text).toBe("Hi");
  });

  it("appendDraftText clamps the total length at MAX_ANNOTATION_TEXT", () => {
    pull();
    tool.appendDraftText("a".repeat(MAX_ANNOTATION_TEXT - 2));
    const result = tool.appendDraftText("XYZ"); // would overshoot by 1
    expect(result.length).toBe(MAX_ANNOTATION_TEXT);
    // 198 'a's + "XYZ" sliced to 200 keeps "XY" and drops the trailing "Z".
    expect(result.endsWith("XY")).toBe(true);
  });

  it("confirmDraft() saves the typed text as a real annotation", () => {
    pull();
    tool.appendDraftText("Crack in the hull");

    const action = tool.confirmDraft();

    expect(action).toMatchObject({ type: "annotation-created" });
    expect(action.data.text).toBe("Crack in the hull");
    expect(tool._annotations).toHaveLength(1);
    expect(tool._annotations[0]).toBe(action.data); // same reference — see confirmDraft's docstring
    expect(tool._draft).toBeNull();
  });

  it("confirmDraft() with an empty buffer falls back to the preset selected at placement time", () => {
    tool.cycleLabel(); // -> ANNOTATION_LABEL_PRESETS[1] ("Anomaly")
    pull();
    // Nothing typed.
    const action = tool.confirmDraft();

    expect(action.data.text).toBe(ANNOTATION_LABEL_PRESETS[1]);
    expect(tool._annotations).toHaveLength(1);
  });

  it("cancelDraft() discards the point: annotation-cancelled, _annotations untouched", () => {
    const opened = pull();
    tool.appendDraftText("never mind");

    const action = tool.cancelDraft();

    expect(action).toMatchObject({ type: "annotation-cancelled", data: { id: opened.data.id } });
    expect(tool._annotations).toHaveLength(0);
    expect(tool._draft).toBeNull();
  });

  it("A-button cancels a live draft (Quest convenience) rather than raycasting", () => {
    pull();
    const action = tool.handleInput(makeInputState({ triggerPressed: false, a: true }), {});
    expect(action).toMatchObject({ type: "annotation-cancelled" });
    expect(tool._draft).toBeNull();
  });

  it("undoLast() cancels a live draft before popping a committed annotation", () => {
    // First, commit one real annotation.
    pull();
    tool.confirmDraft();
    release();
    tool._suppressUntilRelease = false; // simulate the physical release settling
    expect(tool._annotations).toHaveLength(1);

    // Now open a second draft and undo — it must cancel the draft, NOT
    // delete the already-committed, possibly collaborator-visible note.
    pull();
    const undone = tool.undoLast();

    expect(undone).toMatchObject({ type: "annotation-cancelled" });
    expect(tool._annotations).toHaveLength(1); // untouched
    expect(tool._draft).toBeNull();
  });

  it("deactivate() cancels the draft and removes provisional actors from the renderer", async () => {
    pull();
    tool.render(renderer); // materialize the provisional marker + label
    expect(renderer.actors.length).toBeGreaterThan(0);

    await tool.deactivate();

    expect(tool._draft).toBeNull();
    expect(tool._draftMarker).toBeNull();
    expect(renderer.actors.length).toBe(0);
  });

  describe("handoff to the server-fed feature", () => {
    it("confirm -> render() draws one tool sphere; serverId landing -> render() removes it", () => {
      pull();
      const action = tool.confirmDraft();
      const annotation = action.data;

      tool.render(renderer);
      expect(tool._markerActors.has(annotation.id)).toBe(true);
      // Marker sphere + text-billboard label — both are this tool's actors
      // until the handoff below.
      expect(renderer.actors.length).toBe(2);

      // VRExplorationManager._persistVRAnnotation back-fills this onto the
      // SAME object confirmDraft() returned — mutate it directly, exactly as
      // that back-fill does.
      annotation.serverId = "srv-1";
      tool.render(renderer);

      expect(tool._markerActors.has(annotation.id)).toBe(false);
      expect(renderer.actors.length).toBe(0);
    });
  });
});
