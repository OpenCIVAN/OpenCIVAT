// src/core/session/__tests__/cameraSharePolicy.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";

import cameraSharePolicy, {
  isCameraShared,
  setCameraShared,
  toggleCameraShared,
  onCameraSharedChange,
  setFollowOverride,
  getFollowOverride,
} from "../cameraSharePolicy.js";

describe("cameraSharePolicy", () => {
  beforeEach(() => {
    localStorage.clear();
    setCameraShared(true);
    setFollowOverride(false);
  });

  it("defaults to shared", () => {
    expect(isCameraShared()).toBe(true);
  });

  it("toggles and persists the preference", () => {
    expect(toggleCameraShared()).toBe(false);
    expect(isCameraShared()).toBe(false);
    expect(localStorage.getItem("cia_camera_shared")).toBe("false");

    expect(toggleCameraShared()).toBe(true);
    expect(localStorage.getItem("cia_camera_shared")).toBe("true");
  });

  it("notifies subscribers on change only", () => {
    const cb = vi.fn();
    const unsub = onCameraSharedChange(cb);

    setCameraShared(true); // no change — no emit
    expect(cb).not.toHaveBeenCalled();

    setCameraShared(false);
    expect(cb).toHaveBeenCalledWith(false);

    unsub();
    setCameraShared(true);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("tracks the follow override flag", () => {
    expect(getFollowOverride()).toBe(false);
    setFollowOverride(true);
    expect(getFollowOverride()).toBe(true);
    setFollowOverride(false);
    expect(getFollowOverride()).toBe(false);
  });

  it("default export mirrors the named API", () => {
    expect(cameraSharePolicy.isCameraShared()).toBe(true);
    cameraSharePolicy.setCameraShared(false);
    expect(isCameraShared()).toBe(false);
  });
});
