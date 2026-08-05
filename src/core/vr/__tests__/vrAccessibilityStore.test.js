// src/core/vr/__tests__/vrAccessibilityStore.test.js
// readVRAccessibilitySettings must never throw, and must fall back to
// defaults for every failure mode: empty storage, invalid JSON, and a
// localStorage that throws on access (some embedded/private-browsing
// contexts do this).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import {
  VR_A11Y_STORAGE_KEY,
  DEFAULT_VR_A11Y_SETTINGS,
  readVRAccessibilitySettings,
} from "../vrAccessibilityStore.js";

describe("vrAccessibilityStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses the same storage key VRAccessibilityContext.jsx persists to", () => {
    expect(VR_A11Y_STORAGE_KEY).toBe("cia-vr-accessibility-settings");
  });

  it("returns defaults when localStorage is empty", () => {
    expect(readVRAccessibilitySettings()).toEqual(DEFAULT_VR_A11Y_SETTINGS);
  });

  it("returns defaults when localStorage holds invalid JSON", () => {
    localStorage.setItem(VR_A11Y_STORAGE_KEY, "{not valid json");
    expect(readVRAccessibilitySettings()).toEqual(DEFAULT_VR_A11Y_SETTINGS);
  });

  it("returns defaults (and does not throw) when localStorage.getItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: access denied");
    });
    expect(() => readVRAccessibilitySettings()).not.toThrow();
    expect(readVRAccessibilitySettings()).toEqual(DEFAULT_VR_A11Y_SETTINGS);
    spy.mockRestore();
  });

  it("returns defaults (and does not throw) when localStorage is unavailable", () => {
    // Simulate SSR/non-browser environments where localStorage doesn't exist.
    vi.stubGlobal("localStorage", undefined);
    try {
      expect(() => readVRAccessibilitySettings()).not.toThrow();
      expect(readVRAccessibilitySettings()).toEqual(DEFAULT_VR_A11Y_SETTINGS);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("merges a stored partial movement setting over the defaults", () => {
    localStorage.setItem(VR_A11Y_STORAGE_KEY, JSON.stringify({ movement: { snapTurn: "off" } }));
    const result = readVRAccessibilitySettings();
    expect(result.movement).toEqual({ snapTurn: "off" });
    // Sections the stored blob omits still come back fully defaulted.
    expect(result.input).toEqual(DEFAULT_VR_A11Y_SETTINGS.input);
  });

  it("merges a stored dominantHand over the defaults", () => {
    localStorage.setItem(
      VR_A11Y_STORAGE_KEY,
      JSON.stringify({ input: { dominantHand: "left" } })
    );
    const result = readVRAccessibilitySettings();
    expect(result.input.dominantHand).toBe("left");
    expect(result.movement).toEqual(DEFAULT_VR_A11Y_SETTINGS.movement);
  });

  it("ignores a stored value with no usable movement section", () => {
    localStorage.setItem(VR_A11Y_STORAGE_KEY, JSON.stringify({ visual: { uiScale: 1.2 } }));
    const result = readVRAccessibilitySettings();
    expect(result.movement).toEqual(DEFAULT_VR_A11Y_SETTINGS.movement);
  });
});
