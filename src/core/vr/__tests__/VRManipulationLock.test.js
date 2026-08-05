// src/core/vr/__tests__/VRManipulationLock.test.js
// The data-manipulation token: exactly one participant at a time may push
// shared visualization patches. Exercised against the REAL Y.js doc (the map
// IS the protocol here — mocking it would test nothing), with two lock
// instances standing in for two headsets on the same session.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

const mockUserId = vi.fn(() => "host-1");
const mockUserName = vi.fn(() => "Hostess");
vi.mock("@Collaboration/presence/userManagement.js", () => ({
  getUserId: (...a) => mockUserId(...a),
  getUserName: (...a) => mockUserName(...a),
  getUserColor: vi.fn(() => "#ff0000"),
}));

import {
  VRManipulationLock,
  MANIP_STALE_MS,
  REQUEST_TTL_MS,
} from "../VRManipulationLock.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";

/** Session stub — the lock only ever reads id / ownerUserId / ownerUserName. */
function makeSession(id) {
  return { id, ownerUserId: "host-1", ownerUserName: "Hostess" };
}

/** Run `fn` as a different user, restoring the identity afterwards. */
function as(userId, userName, fn) {
  mockUserId.mockReturnValue(userId);
  mockUserName.mockReturnValue(userName);
  try {
    return fn();
  } finally {
    mockUserId.mockReturnValue("host-1");
    mockUserName.mockReturnValue("Hostess");
  }
}

let sessionSeq = 0;

describe("VRManipulationLock", () => {
  let sessionId;
  let host;
  let peer;

  beforeEach(() => {
    // A fresh map name per test: the shared ydoc is a module singleton, so
    // reusing an id would leak one test's holder into the next.
    sessionId = `test-session-${++sessionSeq}`;
    mockUserId.mockReturnValue("host-1");
    mockUserName.mockReturnValue("Hostess");

    host = new VRManipulationLock(makeSession(sessionId));
    host.start();

    peer = new VRManipulationLock(makeSession(sessionId));
    peer.start();
  });

  afterEach(() => {
    // stop() writes as whoever getUserId() currently reports; force the host
    // identity so a test that left `as()` mid-flight can't corrupt teardown.
    mockUserId.mockReturnValue("host-1");
    try { peer.stop(); } catch { /* already stopped */ }
    try { host.stop(); } catch { /* already stopped */ }
    ydoc.getMap(`vr-manipulation-${sessionId}`).clear();
  });

  it("the host claim writes a holder record everyone can see", () => {
    expect(host.claimAsHost()).toBe(true);

    const holder = peer.getHolder();
    expect(holder).toMatchObject({
      holderUserId: "host-1",
      holderUserName: "Hostess",
      grantedBy: "host-1",
    });
    expect(typeof holder.heartbeat).toBe("number");
    expect(host.isHeldByMe()).toBe(true);
  });

  it("a non-holder cannot manipulate while a live holder exists", () => {
    host.claimAsHost();

    as("peer-2", "Bob", () => {
      expect(peer.isHost()).toBe(false);
      expect(peer.isHeldByMe()).toBe(false);
      expect(peer.canManipulate()).toBe(false);
    });

    expect(host.canManipulate()).toBe(true);
  });

  it("canManipulate() fails OPEN when nobody holds the token", () => {
    // No claim at all: an unheld session behaves exactly as it did before the
    // token existed, so a host that never claimed can't brick the session.
    as("peer-2", "Bob", () => {
      expect(peer.canManipulate()).toBe(true);
    });
  });

  it("grantTo transfers the token to another participant", () => {
    host.claimAsHost();
    expect(host.grantTo("peer-2", "Bob")).toBe(true);

    expect(host.isHeldByMe()).toBe(false);
    expect(host.canManipulate()).toBe(false);

    as("peer-2", "Bob", () => {
      expect(peer.isHeldByMe()).toBe(true);
      expect(peer.canManipulate()).toBe(true);
    });
    expect(peer.getHolder()).toMatchObject({
      holderUserId: "peer-2",
      holderUserName: "Bob",
      grantedBy: "host-1",
    });
  });

  it("a bystander cannot grant a token they do not hold", () => {
    host.claimAsHost();
    host.grantTo("peer-2", "Bob");

    as("peer-3", "Carol", () => {
      expect(peer.grantTo("peer-3", "Carol")).toBe(false);
    });
    expect(peer.getHolder().holderUserId).toBe("peer-2");
  });

  it("a stale holder reads as absent, and ONLY the host writes the reclaim", () => {
    host.claimAsHost();
    host.grantTo("peer-2", "Bob");

    // Age the holder past MANIP_STALE_MS without touching the clock, by
    // rewriting the record the way a lapsed heartbeat would leave it.
    const yLock = ydoc.getMap(`vr-manipulation-${sessionId}`);
    const stale = { ...yLock.get("holder"), heartbeat: Date.now() - MANIP_STALE_MS - 1000 };
    yLock.set("holder", stale);

    // Reads: absent for everyone, so nobody is blocked by a ghost.
    expect(host.getHolder()).toBeNull();
    as("peer-3", "Carol", () => {
      expect(peer.getHolder()).toBeNull();
      expect(peer.canManipulate()).toBe(true);
      // ...and a NON-host's upkeep tick writes nothing. This is the anti-race
      // invariant: N clients must not all try to name a new holder at once.
      peer.heartbeat();
      expect(yLock.get("holder").holderUserId).toBe("peer-2");
    });

    // The host, and only the host, reclaims.
    host.heartbeat();
    expect(yLock.get("holder").holderUserId).toBe("host-1");
    expect(host.isHeldByMe()).toBe(true);
  });

  it("requests are visible to the holder and expire after REQUEST_TTL_MS", () => {
    host.claimAsHost();

    as("peer-2", "Bob", () => {
      expect(peer.requestControl()).toBe(true);
    });

    expect(host.getRequests()).toEqual([
      { userId: "peer-2", userName: "Bob", atMs: expect.any(Number) },
    ]);

    // Age the request past its TTL.
    const yLock = ydoc.getMap(`vr-manipulation-${sessionId}`);
    yLock.set("requests", {
      "peer-2": { userName: "Bob", atMs: Date.now() - REQUEST_TTL_MS - 1000 },
    });

    expect(host.getRequests()).toEqual([]);
  });

  it("approveRequest hands the token over and clears the request", () => {
    host.claimAsHost();
    as("peer-2", "Bob", () => peer.requestControl());

    expect(host.approveRequest("peer-2")).toBe(true);
    expect(host.getHolder().holderUserId).toBe("peer-2");
    expect(host.getRequests()).toEqual([]);
  });

  it("denyRequest drops the request without moving the token", () => {
    host.claimAsHost();
    as("peer-2", "Bob", () => peer.requestControl());

    expect(host.denyRequest("peer-2")).toBe(true);
    expect(host.getRequests()).toEqual([]);
    expect(host.getHolder().holderUserId).toBe("host-1");
  });

  it("release() returns the token to the host", () => {
    host.claimAsHost();
    host.grantTo("peer-2", "Bob");

    as("peer-2", "Bob", () => {
      expect(peer.release()).toBe(true);
    });

    expect(host.getHolder()).toMatchObject({
      holderUserId: "host-1",
      grantedBy: "peer-2",
    });
    expect(host.isHeldByMe()).toBe(true);
  });

  it("release() is refused for anyone who is not the current holder", () => {
    host.claimAsHost();
    host.grantTo("peer-2", "Bob");

    as("peer-3", "Carol", () => {
      expect(peer.release()).toBe(false);
    });
    expect(host.getHolder().holderUserId).toBe("peer-2");
  });

  it("onChange fires on holder changes and unsubscribes cleanly", () => {
    const seen = [];
    const off = peer.onChange((state) => seen.push(state));

    host.claimAsHost();
    expect(seen.at(-1)?.holder?.holderUserId).toBe("host-1");

    off();
    host.grantTo("peer-2", "Bob");
    expect(seen.at(-1)?.holder?.holderUserId).toBe("host-1"); // no further calls
  });

  it("rekey moves to the new map and vacates the old one", () => {
    host.claimAsHost();
    const oldMap = ydoc.getMap(`vr-manipulation-${sessionId}`);

    const newId = `${sessionId}-winner`;
    host.rekey(newId);

    expect(oldMap.get("holder")).toBeUndefined();
    expect(host.getHolder()).toBeNull();

    host.claimAsHost();
    expect(ydoc.getMap(`vr-manipulation-${newId}`).get("holder").holderUserId).toBe("host-1");

    ydoc.getMap(`vr-manipulation-${newId}`).clear();
  });

  it("stop() vacates a token we hold so nobody waits out MANIP_STALE_MS", () => {
    host.claimAsHost();
    host.stop();
    expect(peer.getHolder()).toBeNull();
  });

  it("never throws before start() or after stop()", () => {
    const bare = new VRManipulationLock(makeSession("never-started"));
    expect(() => bare.getHolder()).not.toThrow();
    expect(bare.getHolder()).toBeNull();
    expect(bare.canManipulate()).toBe(true);
    expect(bare.getRequests()).toEqual([]);
    expect(bare.claimAsHost()).toBe(false);
    expect(bare.requestControl()).toBe(false);
    expect(bare.release()).toBe(false);
    expect(bare.heartbeat()).toBe(false);
    expect(() => bare.stop()).not.toThrow();
  });
});
