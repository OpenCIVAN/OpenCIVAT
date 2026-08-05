// src/services/__tests__/followService.test.js
// Covers: followed-user camera filtering, VR head-pose derived camera,
// auto-unfollow suppression window, CustomEvent contracts, quaternion helper.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { sync: mkLog(), app: mkLog(), createLogger: () => mkLog() };
});

// Capture the onCameraChange subscriber so tests can feed camera updates.
let cameraChangeCb = null;
vi.mock("@Collaboration/yjs/yjsObservers.js", () => ({
  onCameraChange: vi.fn((cb) => {
    cameraChangeCb = cb;
    return () => {
      cameraChangeCb = null;
    };
  }),
}));

const mockApplySharedState = vi.fn();
const mockActiveInstance = {
  handler: { applySharedState: mockApplySharedState },
  instanceData: { instanceId: "inst-1" },
};
vi.mock("@Core/instances/workspaceManager.js", () => ({
  workspaceManager: {
    getActiveInstance: vi.fn(() => mockActiveInstance),
  },
}));

import followService, {
  rotateVectorByQuaternion,
} from "../followService.js";
import cameraSharePolicy from "@Core/session/cameraSharePolicy.js";

const IDENTITY_Q = { x: 0, y: 0, z: 0, w: 1 };
// 90° about Y: (x,y,z,w) = (0, sin45, 0, cos45)
const Y90_Q = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 };

describe("rotateVectorByQuaternion", () => {
  it("identity quaternion returns the input vector", () => {
    expect(rotateVectorByQuaternion([1, 2, 3], IDENTITY_Q)).toEqual([1, 2, 3]);
  });

  it("rotates -Z forward to -X under 90° about Y", () => {
    const [x, y, z] = rotateVectorByQuaternion([0, 0, -1], Y90_Q);
    expect(x).toBeCloseTo(-1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it("leaves the rotation axis unchanged", () => {
    const [x, y, z] = rotateVectorByQuaternion([0, 1, 0], Y90_Q);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });
});

describe("followService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApplySharedState.mockClear();
    followService.init();
    followService.unfollow();
    cameraSharePolicy.setCameraShared(true);
  });

  afterEach(() => {
    followService.unfollow();
    vi.useRealTimers();
  });

  it("applies only the followed user's camera updates", () => {
    followService.follow("user-a", { userName: "Alice" });

    cameraChangeCb({ viewId: "v1", camera: { position: [1, 2, 3] }, userId: "user-b" });
    expect(mockApplySharedState).not.toHaveBeenCalled();

    cameraChangeCb({ viewId: "v1", camera: { position: [4, 5, 6] }, userId: "user-a" });
    expect(mockApplySharedState).toHaveBeenCalledWith(
      mockActiveInstance.instanceData,
      { camera: { position: [4, 5, 6] } },
      "user-a"
    );
  });

  it("does nothing when not following", () => {
    cameraChangeCb({ viewId: "v1", camera: {}, userId: "user-a" });
    expect(mockApplySharedState).not.toHaveBeenCalled();
  });

  it("derives a first-person camera from a VR head pose event", () => {
    followService.follow("vr-user");

    window.dispatchEvent(
      new CustomEvent("cia:vr-participant-update", {
        detail: {
          odUserId: "vr-user",
          data: {
            headPose: {
              position: { x: 1, y: 2, z: 3 },
              orientation: IDENTITY_Q,
            },
          },
        },
      })
    );

    expect(mockApplySharedState).toHaveBeenCalledTimes(1);
    const applied = mockApplySharedState.mock.calls[0][1].camera;
    expect(applied.position).toEqual([1, 2, 3]);
    // Identity orientation looks down -Z with +Y up
    expect(applied.focalPoint[2]).toBeCloseTo(2); // z - 1
    expect(applied.viewUp[1]).toBeCloseTo(1);
  });

  it("converts the head pose through the SENDER's own vrScale/vrOrigin, not identity", () => {
    followService.follow("vr-user");

    window.dispatchEvent(
      new CustomEvent("cia:vr-participant-update", {
        detail: {
          odUserId: "vr-user",
          data: {
            headPose: {
              position: { x: 2, y: 0, z: 0 },
              orientation: IDENTITY_Q,
            },
            vrScale: 2.0, // sender is zoomed in 2x
            vrOrigin: [10, 0, 0],
          },
        },
      })
    );

    const applied = mockApplySharedState.mock.calls[0][1].camera;
    // dataPos = xrPos/vrScale + vrOrigin = 2/2 + 10 = 11
    expect(applied.position[0]).toBeCloseTo(11);
    // focal distance also divides by vrScale (1.0 / 2.0 = 0.5); identity
    // orientation looks down -Z, so focalPoint.z = position.z - 0.5
    expect(applied.focalPoint[0]).toBeCloseTo(11);
    expect(applied.focalPoint[2]).toBeCloseTo(-0.5);
  });

  it("ignores VR pose events from other users", () => {
    followService.follow("vr-user");
    window.dispatchEvent(
      new CustomEvent("cia:vr-participant-update", {
        detail: {
          odUserId: "someone-else",
          data: { headPose: { position: { x: 0, y: 0, z: 0 }, orientation: IDENTITY_Q } },
        },
      })
    );
    expect(mockApplySharedState).not.toHaveBeenCalled();
  });

  it("auto-unfollows when the user moves their own camera outside the suppression window", () => {
    followService.follow("user-a");

    // Follow-applied camera at t=0
    cameraChangeCb({ viewId: "v1", camera: {}, userId: "user-a" });

    // Echo of that application 100ms later — must NOT unfollow
    vi.advanceTimersByTime(100);
    window.dispatchEvent(new CustomEvent("cia:camera-changed"));
    expect(followService.isFollowing("user-a")).toBe(true);

    // Real user gesture 1s later — must unfollow
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new CustomEvent("cia:camera-changed"));
    expect(followService.isFollowing()).toBe(false);
  });

  it("emits onChange and cia:following-changed on follow/unfollow", () => {
    const cb = vi.fn();
    const windowCb = vi.fn();
    const unsub = followService.onChange(cb);
    window.addEventListener("cia:following-changed", windowCb);

    followService.follow("user-a", { userName: "Alice" });
    expect(cb).toHaveBeenCalledWith({ followedUserId: "user-a", userName: "Alice" });

    followService.unfollow();
    expect(cb).toHaveBeenCalledWith({ followedUserId: null, userName: null });
    expect(windowCb).toHaveBeenCalledTimes(2);

    unsub();
    window.removeEventListener("cia:following-changed", windowCb);
  });

  it("honors the cia:follow-user CustomEvent contract (start/toggle/stop)", () => {
    window.dispatchEvent(
      new CustomEvent("cia:follow-user", { detail: { userId: "user-a", action: "start" } })
    );
    expect(followService.isFollowing("user-a")).toBe(true);

    // Same user again = toggle off
    window.dispatchEvent(
      new CustomEvent("cia:follow-user", { detail: { userId: "user-a", action: "start" } })
    );
    expect(followService.isFollowing()).toBe(false);

    followService.follow("user-b");
    window.dispatchEvent(
      new CustomEvent("cia:follow-user", { detail: { action: "stop" } })
    );
    expect(followService.isFollowing()).toBe(false);
  });

  it("maps cia:camera-sync-mode onto the camera share policy", () => {
    window.dispatchEvent(
      new CustomEvent("cia:camera-sync-mode", { detail: { mode: "independent" } })
    );
    expect(cameraSharePolicy.isCameraShared()).toBe(false);

    window.dispatchEvent(
      new CustomEvent("cia:camera-sync-mode", { detail: { mode: "shared" } })
    );
    expect(cameraSharePolicy.isCameraShared()).toBe(true);
  });

  it("sets the follow override on the share policy while applying", () => {
    const seen = [];
    mockApplySharedState.mockImplementation(() => {
      seen.push(cameraSharePolicy.getFollowOverride());
    });

    followService.follow("user-a");
    cameraChangeCb({ viewId: "v1", camera: {}, userId: "user-a" });

    expect(seen).toEqual([true]);
    expect(cameraSharePolicy.getFollowOverride()).toBe(false);
  });
});
