// src/core/vr/avatars/__tests__/SimpleAvatarFallback.pointer.test.js
// The pointer ray must terminate ON the shared geometry when the sender
// reported a hit — a ray that stops at an arbitrary fixed length points at
// nothing in particular, which is the opposite of what "look at THIS" needs.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

// The label does canvas/texture work that jsdom cannot render and this suite
// does not care about.
vi.mock("../AvatarLabel.js", () => ({
  AvatarLabel: class {
    create() {}
    setPosition() {}
    setVisible() {}
    setSpeaking() {}
    // Keeps the name tag at a constant apparent size against the local
    // viewer's vrScale, the same way the body and hit marker do.
    setScale() {}
    faceToward() {}
    dispose() {}
  },
}));

import { SimpleAvatarFallback } from "../SimpleAvatarFallback.js";

function makeRenderer() {
  const actors = [];
  return {
    addActor: vi.fn((a) => actors.push(a)),
    removeActor: vi.fn((a) => {
      const i = actors.indexOf(a);
      if (i >= 0) actors.splice(i, 1);
    }),
    _actors: actors,
  };
}

const HEAD = { position: { x: 0, y: 1.6, z: 0 }, visible: true };

function makePose(overrides = {}) {
  return {
    head: HEAD,
    leftHand: { position: null, visible: false },
    rightHand: { position: null, visible: false },
    pointer: {
      origin: { x: 0, y: 1, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
      hand: "right",
      visible: true,
    },
    pointerHit: null,
    ...overrides,
  };
}

describe("SimpleAvatarFallback — pointer ray + surface hit marker", () => {
  /** @type {SimpleAvatarFallback} */
  let avatar;
  let renderer;

  beforeEach(() => {
    renderer = makeRenderer();
    avatar = new SimpleAvatarFallback();
    avatar.create(renderer, {
      userId: "remote-1",
      displayName: "Bob",
      // hsl on purpose: this is exactly what getUserColor() emits.
      color: "hsl(210, 70%, 60%)",
    });
  });

  it("scales the BODY by the local viewer's 1/vrScale, not just the hit marker", () => {
    // The head/hand sources are authored in physical metres but live in scene
    // units, which are metres / vrScale. Only the hit marker used to
    // compensate, so a peer's body disagreed with their own pointer dot: at
    // detail zoom the head ballooned over the dataset, at room scale it shrank
    // away, and two headsets at different scales saw each other at different
    // sizes.
    avatar.updatePose(
      makePose({
        leftHand: { position: { x: -0.2, y: 1.2, z: 0 }, visible: true },
        rightHand: { position: { x: 0.2, y: 1.2, z: 0 }, visible: true },
      }),
      4
    );

    expect(avatar._headActor.getScale()[0]).toBeCloseTo(0.25);
    expect(avatar._leftHandActor.getScale()[0]).toBeCloseTo(0.25);
    expect(avatar._rightHandActor.getScale()[0]).toBeCloseTo(0.25);
  });

  it("keeps body and hit marker at the SAME scale so the dot stays on the hand", () => {
    avatar.updatePose(makePose({ pointerHit: { x: 0, y: 1, z: -2 } }), 4);

    expect(avatar._hitMarkerActor.getScale()[0]).toBeCloseTo(
      avatar._headActor.getScale()[0]
    );
  });

  it("defaults to unit scale when no vrScale is supplied", () => {
    avatar.updatePose(makePose());
    expect(avatar._headActor.getScale()[0]).toBeCloseTo(1);
  });

  it("adds every actor to the renderer (vtk.js freezes actors — stashing state on one aborts create)", () => {
    // Regression: _makeRay used to do `actor._lineSource = lineSource`, and
    // vtk.js Object.freeze()s every publicAPI, so create() threw before a
    // single actor was added and no avatar body ever reached the scene.
    // head, 2 hands, ray, hit marker, activity halo
    expect(renderer._actors).toHaveLength(6);
    expect(renderer._actors).toContain(avatar._hitMarkerActor);
    expect(renderer._actors).toContain(avatar._activityHaloActor);
    expect(avatar._pointerLineSource).toBeTruthy();
  });

  it("terminates the ray AT the hit point when pointerHit is set", () => {
    const hit = { x: 3, y: -2, z: 9 };
    avatar.updatePose(makePose({ pointerHit: hit }));

    const line = avatar._pointerLineSource;
    expect(line.getPoint1()).toEqual([0, 1, 0]);
    expect(line.getPoint2()).toEqual([3, -2, 9]);
    expect(avatar._pointerRayActor.getVisibility()).toBe(true);
  });

  it("falls back to origin + direction * RAY_LENGTH when there is no hit", () => {
    avatar.updatePose(makePose({ pointerHit: null }));

    const p2 = avatar._pointerLineSource.getPoint2();
    expect(p2[0]).toBeCloseTo(0, 6);
    expect(p2[1]).toBeCloseTo(1, 6);
    expect(p2[2]).toBeLessThan(0); // pushed out along -Z
    expect(p2[2]).not.toBe(0);
  });

  it("shows the hit marker at the hit point", () => {
    avatar.updatePose(makePose({ pointerHit: { x: 3, y: -2, z: 9 } }));

    expect(avatar._hitMarkerActor.getVisibility()).toBe(true);
    expect(avatar._hitMarkerActor.getPosition()).toEqual([3, -2, 9]);
  });

  it("hides the hit marker when the pointer is absent, and when it hits nothing", () => {
    avatar.updatePose(makePose({ pointer: null, pointerHit: null }));
    expect(avatar._hitMarkerActor.getVisibility()).toBe(false);
    expect(avatar._pointerRayActor.getVisibility()).toBe(false);

    avatar.updatePose(makePose({ pointerHit: null }));
    expect(avatar._hitMarkerActor.getVisibility()).toBe(false);
    expect(avatar._pointerRayActor.getVisibility()).toBe(true);
  });

  it("scales the marker by the LOCAL viewer's 1/vrScale so it reads a constant physical size", () => {
    avatar.updatePose(makePose({ pointerHit: { x: 0, y: 0, z: 0 } }), 4);
    expect(avatar._hitMarkerActor.getScale()).toEqual([0.25, 0.25, 0.25]);

    avatar.updatePose(makePose({ pointerHit: { x: 0, y: 0, z: 0 } }), 0.5);
    expect(avatar._hitMarkerActor.getScale()).toEqual([2, 2, 2]);

    // Missing/zero scale must not produce Infinity
    avatar.updatePose(makePose({ pointerHit: { x: 0, y: 0, z: 0 } }));
    expect(avatar._hitMarkerActor.getScale()).toEqual([1, 1, 1]);
  });

  it("never lets the marker become a VR pick target", () => {
    // VTKInstanceHandler._getVRPickTargets filters by pickability, and the VR
    // renderer IS the desktop renderer — a pickable marker sitting exactly on
    // the surface would absorb every probe/measure/teleport hit.
    expect(avatar._hitMarkerActor.getPickable()).toBe(false);
  });

  it("tints the avatar from the hsl user colour instead of the shared salmon fallback", () => {
    const head = avatar._headActor.getProperty().getColor();
    // hsl(210,70%,60%) → blue-dominant, definitively not [1, 0.42, 0.42]
    expect(head[2]).toBeGreaterThan(head[0]);
    expect(head[0]).not.toBeCloseTo(1.0, 3);
  });

  it("removes the marker from the renderer on dispose", () => {
    const marker = avatar._hitMarkerActor;
    avatar.dispose(renderer);
    expect(renderer.removeActor).toHaveBeenCalledWith(marker);
    expect(avatar._hitMarkerActor).toBeNull();
  });
});
