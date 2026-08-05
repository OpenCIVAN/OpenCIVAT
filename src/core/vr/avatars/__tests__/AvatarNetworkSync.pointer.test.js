// src/core/vr/avatars/__tests__/AvatarNetworkSync.pointer.test.js
// _toPose used to hardcode `pointer: { visible: false }`, which is why remote
// pointer rays never rendered in VR no matter what the sender broadcast.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

const { mockSyncAvatar, mockYAvatars } = vi.hoisted(() => ({
  mockSyncAvatar: vi.fn(),
  // forEach mirrors the real Y.Map API — AvatarNetworkSync.initialize replays
  // the existing map so a peer who joined first still delivers their
  // name/colour (observe alone fires only on CHANGES).
  mockYAvatars: {
    observe: vi.fn(),
    unobserve: vi.fn(),
    get: vi.fn(),
    forEach: vi.fn(),
  },
}));
vi.mock("@Collaboration/yjs/yjsSetup.js", () => ({
  yAvatars: mockYAvatars,
  syncAvatarToYjs: (...args) => mockSyncAvatar(...args),
}));

vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "local-user"),
}));

import { AvatarNetworkSync } from "../AvatarNetworkSync.js";

const HEAD = { position: { x: 0, y: 1.6, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } };

function makeData(overrides = {}) {
  return {
    odUserId: "remote-1",
    headPose: HEAD,
    timestamp: 1234,
    vrScale: 2,
    vrOrigin: [1, 0, 1],
    ...overrides,
  };
}

describe("AvatarNetworkSync._toPose — pointer + surface hit", () => {
  /** @type {AvatarNetworkSync} */
  let sync;

  beforeEach(() => {
    mockSyncAvatar.mockClear();
    sync = new AvatarNetworkSync();
  });

  it("maps a wire pointer through to the avatar pose", () => {
    const pose = sync._toPose(
      makeData({
        pointer: {
          origin: { x: 0.1, y: 1.4, z: -0.2 },
          direction: { x: 0, y: 0, z: -1 },
          hand: "left",
          visible: true,
        },
      })
    );

    expect(pose.pointer).toEqual({
      origin: { x: 0.1, y: 1.4, z: -0.2 },
      direction: { x: 0, y: 0, z: -1 },
      hand: "left",
      visible: true,
    });
  });

  it("defaults the hand to right and keeps visible true when the sender omitted the flag", () => {
    const pose = sync._toPose(
      makeData({
        pointer: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
      })
    );

    expect(pose.pointer.hand).toBe("right");
    expect(pose.pointer.visible).toBe(true);
  });

  it("reports the pointer invisible unless BOTH origin and direction are present", () => {
    const noPointer = sync._toPose(makeData());
    expect(noPointer.pointer).toEqual({ origin: null, direction: null, visible: false });

    const originOnly = sync._toPose(
      makeData({ pointer: { origin: { x: 0, y: 0, z: 0 }, direction: null } })
    );
    expect(originOnly.pointer.visible).toBe(false);

    const directionOnly = sync._toPose(
      makeData({ pointer: { origin: null, direction: { x: 0, y: 0, z: -1 } } })
    );
    expect(directionOnly.pointer.visible).toBe(false);
  });

  it("passes pointerHit through as a sibling field (it is data space, not XR space)", () => {
    const hit = { x: 5, y: 6, z: 7 };
    const pose = sync._toPose(
      makeData({
        pointer: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
        pointerHit: hit,
      })
    );

    expect(pose.pointerHit).toEqual(hit);
    // Explicitly NOT folded into pointer — RemoteAvatarController._toScenePose
    // transforms pointer.origin but must leave pointerHit alone.
    expect(pose.pointer.hit).toBeUndefined();
  });

  it("carries the sender's own transform alongside, unchanged by the pointer work", () => {
    const pose = sync._toPose(makeData({ pointerHit: { x: 1, y: 1, z: 1 } }));
    expect(pose.vrScale).toBe(2);
    expect(pose.vrOrigin).toEqual([1, 0, 1]);
    expect(pose.pointerHit).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("defaults pointerHit to null when absent", () => {
    expect(sync._toPose(makeData()).pointerHit).toBeNull();
  });
});

describe("AvatarNetworkSync.sendLocalPresence — session scoping", () => {
  beforeEach(() => {
    mockSyncAvatar.mockClear();
  });

  it("carries sessionId so room-global yAvatars entries can be filtered by session", () => {
    const sync = new AvatarNetworkSync();
    sync.initialize();
    sync.sendLocalPresence({
      displayName: "Alice",
      color: "hsl(210, 70%, 60%)",
      sessionId: "vrsession_a",
    });

    expect(mockSyncAvatar).toHaveBeenCalledWith(
      "local-user",
      expect.objectContaining({ sessionId: "vrsession_a" })
    );
  });

  it("sends null rather than undefined when there is no session id", () => {
    const sync = new AvatarNetworkSync();
    sync.initialize();
    sync.sendLocalPresence({ displayName: "Alice", color: "#ff0000" });

    expect(mockSyncAvatar).toHaveBeenCalledWith(
      "local-user",
      expect.objectContaining({ sessionId: null })
    );
  });
});

describe("AvatarNetworkSync.initialize — existing-peer presence snapshot", () => {
  beforeEach(() => {
    mockYAvatars.forEach.mockReset();
  });

  /** Drive the mocked Y.Map forEach from a plain object. */
  function seedMap(entries) {
    mockYAvatars.forEach.mockImplementation((cb) => {
      for (const [userId, data] of Object.entries(entries)) cb(data, userId);
    });
  }

  it("delivers peers who were ALREADY in the map before we joined", () => {
    // Y.Map.observe fires only on CHANGES. A peer who joined first and has no
    // reason to rewrite their entry therefore never triggered the observer, so
    // their displayName/color never arrived and AvatarManager fell back to a
    // truncated hex user id in default grey. Whoever enters second hit this —
    // i.e. it appeared the moment a second headset joined.
    seedMap({
      "remote-1": { displayName: "Alice", color: "#ff0000" },
      "remote-2": { displayName: "Bob", color: "#00ff00" },
    });

    const sync = new AvatarNetworkSync();
    const seen = [];
    sync.onRemotePresence((userId, state) => seen.push([userId, state.displayName]));
    sync.initialize();

    expect(seen).toEqual([
      ["remote-1", "Alice"],
      ["remote-2", "Bob"],
    ]);
  });

  it("skips our own entry in the snapshot", () => {
    seedMap({
      "local-user": { displayName: "Me", color: "#ffffff" },
      "remote-1": { displayName: "Alice", color: "#ff0000" },
    });

    const sync = new AvatarNetworkSync();
    const seen = [];
    sync.onRemotePresence((userId) => seen.push(userId));
    sync.initialize();

    expect(seen).toEqual(["remote-1"]);
  });

  it("survives an empty map and a throwing callback", () => {
    seedMap({});
    const empty = new AvatarNetworkSync();
    expect(() => empty.initialize()).not.toThrow();

    seedMap({ "remote-1": { displayName: "Alice", color: "#ff0000" } });
    const throwing = new AvatarNetworkSync();
    throwing.onRemotePresence(() => {
      throw new Error("renderer blew up");
    });
    // One bad peer must not abort initialize and leave the observer unregistered.
    expect(() => throwing.initialize()).not.toThrow();
    expect(mockYAvatars.observe).toHaveBeenCalled();
  });
});
