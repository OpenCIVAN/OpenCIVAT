// src/core/instances/types/vtk/collaboration/__tests__/VTKRemoteVRRays.test.js
// Remote VR controller rays on desktop: add/update/remove lifecycle, stale
// sweep, view scoping via vrCursorSync callbacks.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { cursor: mkLog(), sync: mkLog(), app: mkLog(), vr: mkLog(), createLogger: () => mkLog() };
});

vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "local-user"),
  getUserName: vi.fn(() => "Local"),
  getUserColor: vi.fn(() => "hsl(120, 70%, 60%)"),
}));

// Fake vrCursorSync: capture the per-view callback so tests can feed cursors.
const callbacks = new Map(); // viewId -> Set<cb>
const mockInitialize = vi.fn();
vi.mock("@Core/vr/VRCursorSync.js", () => ({
  vrCursorSync: {
    initialize: (...args) => mockInitialize(...args),
    onRemoteCursor: vi.fn((viewId, cb) => {
      if (!callbacks.has(viewId)) callbacks.set(viewId, new Set());
      callbacks.get(viewId).add(cb);
      return () => callbacks.get(viewId)?.delete(cb);
    }),
  },
}));

import { VTKRemoteVRRays } from "../VTKRemoteVRRays.js";

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

function vrCursor(overrides = {}) {
  return {
    mode: "vr-controller",
    viewId: "view-1",
    rayOrigin: { x: 0, y: 0, z: 0 },
    rayDirection: { x: 0, y: 0, z: -1 },
    hand: "right",
    userName: "VR User",
    userColor: "#ff0000",
    timestamp: Date.now(),
    ...overrides,
  };
}

function emit(viewId, userId, data) {
  for (const cb of callbacks.get(viewId) || []) cb(userId, data);
}

describe("VTKRemoteVRRays", () => {
  let rays;
  let sceneObjects;

  beforeEach(() => {
    vi.useFakeTimers();
    callbacks.clear();
    mockInitialize.mockClear();
    rays = new VTKRemoteVRRays();
    sceneObjects = makeSceneObjects();
  });

  afterEach(() => {
    rays.detach("inst-1");
    vi.useRealTimers();
  });

  it("initializes vrCursorSync (render-side observers) on attach", () => {
    rays.attach("inst-1", sceneObjects, "view-1");
    expect(mockInitialize).toHaveBeenCalledWith("local-user", "Local", expect.any(String));
  });

  it("adds a colored line actor for a remote VR cursor and removes it on null", () => {
    rays.attach("inst-1", sceneObjects, "view-1");

    emit("view-1", "vr-user", vrCursor());
    expect(sceneObjects.renderer._actors.length).toBe(1);
    expect(sceneObjects.renderWindow.render).toHaveBeenCalled();

    emit("view-1", "vr-user", null);
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("updates the existing actor's line on subsequent cursor updates (no actor churn)", () => {
    rays.attach("inst-1", sceneObjects, "view-1");

    emit("view-1", "vr-user", vrCursor());
    const actor = sceneObjects.renderer._actors[0];

    emit("view-1", "vr-user", vrCursor({ rayOrigin: { x: 1, y: 1, z: 1 } }));
    expect(sceneObjects.renderer._actors.length).toBe(1);
    expect(sceneObjects.renderer._actors[0]).toBe(actor);
  });

  it("ignores non-vr-controller cursor modes (desktop cursors)", () => {
    rays.attach("inst-1", sceneObjects, "view-1");
    emit("view-1", "desktop-user", vrCursor({ mode: "desktop" }));
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("removes stale rays after the timeout sweep", () => {
    rays.attach("inst-1", sceneObjects, "view-1");
    emit("view-1", "vr-user", vrCursor());
    expect(sceneObjects.renderer._actors.length).toBe(1);

    // No updates for > 2s → sweep removes the frozen ray
    vi.advanceTimersByTime(3500);
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("detach removes actors and unsubscribes", () => {
    rays.attach("inst-1", sceneObjects, "view-1");
    emit("view-1", "vr-user", vrCursor());
    expect(sceneObjects.renderer._actors.length).toBe(1);

    rays.detach("inst-1");
    expect(sceneObjects.renderer._actors.length).toBe(0);

    // Post-detach events must not resurrect actors
    emit("view-1", "vr-user", vrCursor());
    expect(sceneObjects.renderer._actors.length).toBe(0);
  });

  it("attach without renderer or viewConfigId is a safe no-op", () => {
    expect(() => rays.attach("inst-1", null, "view-1")).not.toThrow();
    expect(() => rays.attach("inst-1", sceneObjects, null)).not.toThrow();
    expect(callbacks.size).toBe(0);
  });
});
