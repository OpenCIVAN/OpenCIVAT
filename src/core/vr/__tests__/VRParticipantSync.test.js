// src/core/vr/__tests__/VRParticipantSync.test.js
// Synchronicity hardening: pointer serialization, joinedAt stability across
// repeated remote updates, and local-only eviction of stale participants.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

const { mockYMaps } = vi.hoisted(() => ({ mockYMaps: new Map() }));
vi.mock("@Collaboration/yjs/yjsSetup.js", () => ({
  ydoc: {
    getMap: (name) => {
      if (!mockYMaps.has(name)) {
        const store = new Map();
        mockYMaps.set(name, {
          _store: store,
          get: (k) => store.get(k),
          set: (k, v) => store.set(k, v),
          delete: (k) => store.delete(k),
          forEach: (fn) => store.forEach(fn),
          observe: vi.fn(),
          unobserve: vi.fn(),
        });
      }
      return mockYMaps.get(name);
    },
  },
}));

vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: vi.fn(() => "local-user"),
}));

import {
  VRParticipantSync,
  POSE_THROTTLE_MS,
  PARTICIPANT_STALE_MS,
  PARTICIPANT_GONE_MS,
} from "../VRParticipantSync.js";
import {
  VRExplorationSession,
  PARTICIPATION_MODE,
} from "@Core/data/models/VRExplorationSession.js";

function makeSession() {
  const session = new VRExplorationSession({ id: "vrsession_test" });
  session.addParticipant("local-user", "Me", "#ff0000", PARTICIPATION_MODE.VR_EXPLORER);
  return session;
}

describe("VRExplorationSession.upsertParticipant", () => {
  it("preserves joinedAt across repeated updates (addParticipant would reset it)", async () => {
    const session = new VRExplorationSession({ id: "s" });
    const first = session.upsertParticipant("u1", "Alice", "#111111", PARTICIPATION_MODE.VR_EXPLORER);
    const joinedAt = first.joinedAt;

    await new Promise((r) => setTimeout(r, 5));
    session.upsertParticipant("u1", "Alice", "#111111", PARTICIPATION_MODE.VR_EXPLORER);
    session.upsertParticipant("u1", "Alice", "#111111", PARTICIPATION_MODE.VR_EXPLORER);

    const after = session.getParticipant("u1");
    expect(session.participants).toHaveLength(1);
    expect(after).toBe(first); // same object, not recreated
    expect(after.joinedAt).toBe(joinedAt);

    // Contrast: addParticipant is the destructive path this exists to avoid.
    const replaced = session.addParticipant("u1", "Alice", "#111111");
    expect(replaced).not.toBe(first);
  });

  it("updates fields in place and refreshes lastActiveAt", () => {
    const session = new VRExplorationSession({ id: "s" });
    session.upsertParticipant("u1", "Alice", "#111111", PARTICIPATION_MODE.DESKTOP_OBSERVER);
    const p = session.upsertParticipant("u1", "Alicia", "#222222", PARTICIPATION_MODE.VR_EXPLORER);

    expect(p.userName).toBe("Alicia");
    expect(p.userColor).toBe("#222222");
    expect(p.mode).toBe(PARTICIPATION_MODE.VR_EXPLORER);
    expect(p.permissions.canAnnotate).toBe(true); // permissions follow the mode
  });

  it("leaves the existing mode alone when the update omits one", () => {
    const session = new VRExplorationSession({ id: "s" });
    session.upsertParticipant("u1", "Alice", "#111", PARTICIPATION_MODE.VR_EXPLORER);
    session.upsertParticipant("u1", "Alice", "#111", undefined);

    expect(session.getParticipant("u1").mode).toBe(PARTICIPATION_MODE.VR_EXPLORER);
  });
});

describe("VRParticipantSync", () => {
  let session;
  /** @type {VRParticipantSync} */
  let sync;
  let leaveEvents;
  let onLeave;

  beforeEach(() => {
    mockYMaps.clear();
    session = makeSession();
    sync = new VRParticipantSync(session);
    sync.start();

    leaveEvents = [];
    onLeave = (e) => leaveEvents.push(e.detail.odUserId);
    window.addEventListener("cia:vr-participant-left", onLeave);
  });

  afterEach(() => {
    window.removeEventListener("cia:vr-participant-left", onLeave);
  });

  it("names the pose throttle and keeps it at 20 Hz", () => {
    // Coupled to RemoteAvatarController's LERP_ALPHA — see the constant's docs.
    expect(POSE_THROTTLE_MS).toBe(50);
    expect(sync._throttleMs).toBe(POSE_THROTTLE_MS);
  });

  it("serializes the pointer and the surface hit onto the wire payload", () => {
    sync.updateLocalState({
      headPose: { position: { x: 0, y: 1.6, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      vrScale: 2,
      vrOrigin: [1, 0, 1],
      pointer: {
        origin: { x: 0.1, y: 1.4, z: -0.2 },
        direction: { x: 0, y: 0, z: -1 },
        hand: "left",
      },
      pointerHit: { x: 9, y: 8, z: 7 },
    });

    const data = sync.getParticipantState("local-user");
    expect(data.pointer).toEqual({
      origin: { x: 0.1, y: 1.4, z: -0.2 },
      direction: { x: 0, y: 0, z: -1 },
      hand: "left",
      visible: true,
    });
    expect(data.pointerHit).toEqual({ x: 9, y: 8, z: 7 });
  });

  it("sends a null pointer rather than a half-built one", () => {
    sync.updateLocalState({
      headPose: { position: { x: 0, y: 1.6, z: 0 } },
      pointer: { origin: { x: 0, y: 0, z: 0 }, direction: null },
    });

    const data = sync.getParticipantState("local-user");
    expect(data.pointer).toBeNull();
    expect(data.pointerHit).toBeNull();
  });

  it("upserts on remote updates so joinedAt survives repeated pose packets", async () => {
    sync._handleParticipantUpdate("remote-1", {
      odUserId: "remote-1",
      userName: "Bob",
      userColor: "hsl(30, 70%, 60%)",
      mode: PARTICIPATION_MODE.VR_EXPLORER,
      vrScale: 1,
      timestamp: Date.now(),
    });
    const joinedAt = session.getParticipant("remote-1").joinedAt;

    await new Promise((r) => setTimeout(r, 5));
    for (let i = 0; i < 5; i++) {
      sync._handleParticipantUpdate("remote-1", {
        odUserId: "remote-1",
        userName: "Bob",
        userColor: "hsl(30, 70%, 60%)",
        mode: PARTICIPATION_MODE.VR_EXPLORER,
        vrScale: 1 + i,
        timestamp: Date.now(),
      });
    }

    const p = session.getParticipant("remote-1");
    expect(session.participants.filter((x) => x.odUserId === "remote-1")).toHaveLength(1);
    expect(p.joinedAt).toBe(joinedAt);
    expect(p.vrScale).toBe(5);
  });

  it("KEEPS a merely-stale peer — a network stall must not evict them", () => {
    // The regression this whole group exists for. A peer silent for longer than
    // PARTICIPANT_STALE_MS used to be removed outright: their avatar actors were
    // torn down and their roster row vanished, then both were rebuilt when the
    // next pose packet arrived. Over a tunnel a 10 s gap is an ordinary hiccup,
    // so peers visibly popped in and out of the world. Staleness is now a
    // DISPLAY state (getRemoteParticipants reports isStale; the roster greys the
    // row) and only a full PARTICIPANT_GONE_MS silence actually removes anyone.
    const now = Date.now();
    sync._yParticipants.set("stalled-user", {
      odUserId: "stalled-user",
      timestamp: now - PARTICIPANT_STALE_MS - 1,
    });
    session.addParticipant("stalled-user", "Stalled", "#333");

    const evicted = sync.sweepStaleParticipants(now);

    expect(evicted).toEqual([]);
    expect(leaveEvents).toEqual([]);
    expect(session.getParticipant("stalled-user")).toBeDefined();
  });

  it("dispatches cia:vr-participant-left for entries older than PARTICIPANT_GONE_MS", () => {
    const now = Date.now();
    const map = sync._yParticipants;
    map.set("fresh-user", { odUserId: "fresh-user", timestamp: now - 1000 });
    map.set("gone-user", { odUserId: "gone-user", timestamp: now - PARTICIPANT_GONE_MS - 1 });
    session.addParticipant("gone-user", "Ghost", "#333");

    const evicted = sync.sweepStaleParticipants(now);

    expect(evicted).toEqual(["gone-user"]);
    expect(leaveEvents).toEqual(["gone-user"]);
    expect(session.getParticipant("gone-user")).toBeUndefined();
    expect(session.getParticipant("local-user")).toBeDefined();
  });

  it("does NOT delete the Y.js key — N clients would race on the same delete", () => {
    const now = Date.now();
    sync._yParticipants.set("gone-user", {
      odUserId: "gone-user",
      timestamp: now - PARTICIPANT_GONE_MS - 1,
    });

    sync.sweepStaleParticipants(now);

    // Present locally-evicted, still in the shared map: pruning is the host's job.
    expect(sync._yParticipants.get("gone-user")).toBeDefined();
  });

  it("announces a departed peer only once, and re-arms if they come back", () => {
    const now = Date.now();
    sync._yParticipants.set("gone-user", {
      odUserId: "gone-user",
      timestamp: now - PARTICIPANT_GONE_MS - 1,
    });

    sync.sweepStaleParticipants(now);
    sync.sweepStaleParticipants(now + 1000);
    sync.sweepStaleParticipants(now + 2000);
    expect(leaveEvents).toEqual(["gone-user"]);

    // They write again → the latch clears and a later absence re-announces.
    sync._yParticipants.set("gone-user", { odUserId: "gone-user", timestamp: now + 3000 });
    sync.sweepStaleParticipants(now + 3000);
    sync.sweepStaleParticipants(now + 3000 + PARTICIPANT_GONE_MS + 1);
    expect(leaveEvents).toEqual(["gone-user", "gone-user"]);
  });

  it("never evicts the local user, however old their own last write is", () => {
    const now = Date.now();
    sync._yParticipants.set("local-user", { odUserId: "local-user", timestamp: 0 });

    expect(sync.sweepStaleParticipants(now)).toEqual([]);
    expect(leaveEvents).toEqual([]);
  });
});
