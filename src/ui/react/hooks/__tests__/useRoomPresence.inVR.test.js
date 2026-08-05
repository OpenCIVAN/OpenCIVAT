// src/ui/react/hooks/__tests__/useRoomPresence.inVR.test.js
// Phase 4: useRoomPresence must return an `inVR` bucket.
//
// RoomSubtab.jsx has always destructured `inVR` from this hook and guarded its
// "In VR" section on it — but the hook never returned the field, so the section
// could not render under any circumstances. These tests pin the bucket down at
// the hook boundary, where the defect actually was.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockPresence } = vi.hoisted(() => ({
  mockPresence: {
    users: [],
    roomId: "room-1",
    listener: null,
  },
}));

vi.mock("@Collaboration/presence/presenceSystem.js", () => ({
  presenceSystem: {
    getRoom: () => mockPresence.roomId,
    getOnlineUsers: () => mockPresence.users,
    onPresenceChange: (cb) => {
      mockPresence.listener = cb;
      return () => {
        mockPresence.listener = null;
      };
    },
    onRoomChange: () => () => {},
  },
}));

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { createLogger: () => mkLog(), presence: mkLog() };
});

import { useRoomPresence } from "../useRoomPresence.js";

function user(userId, over = {}) {
  return { userId, userName: userId, roomId: "room-1", status: "active", ...over };
}

describe("useRoomPresence — inVR bucket", () => {
  beforeEach(() => {
    mockPresence.users = [];
    mockPresence.roomId = "room-1";
  });

  it("returns an inVR bucket (not undefined) even when nobody is in VR", () => {
    mockPresence.users = [user("alice"), user("bob")];

    const { result } = renderHook(() => useRoomPresence("room-1"));

    expect(result.current.inVR).toEqual([]);
    expect(result.current.vrCount).toBe(0);
  });

  it("populates inVR from presence's inVR flag", () => {
    mockPresence.users = [
      user("alice", { inVR: true, vrSessionId: "s1", vrRole: "host" }),
      user("bob"),
      user("carol", { inVR: true, vrSessionId: "s1", vrRole: "participant" }),
    ];

    const { result } = renderHook(() => useRoomPresence("room-1"));

    expect(result.current.inVR.map((u) => u.userId)).toEqual(["alice", "carol"]);
    expect(result.current.vrCount).toBe(2);
    // The VR bucket is orthogonal to the voice buckets — a headset user who is
    // not in voice must still appear in notInVoice.
    expect(result.current.notInVoice.map((u) => u.userId)).toEqual(["alice", "bob", "carol"]);
  });

  it("only counts users in the requested room", () => {
    mockPresence.users = [
      user("alice", { inVR: true }),
      user("elsewhere", { inVR: true, roomId: "room-2" }),
    ];

    const { result } = renderHook(() => useRoomPresence("room-1"));

    expect(result.current.inVR.map((u) => u.userId)).toEqual(["alice"]);
  });
});
