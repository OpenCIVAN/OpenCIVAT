// src/core/vr/vrAccessibilityStore.js
// Read-only bridge onto the VR accessibility settings that
// src/ui/react/context/VRAccessibilityContext.jsx persists to localStorage.
//
// Core VR code (this directory) must not import from src/ui/react/ — the
// project's dependency direction is UI -> Services -> Managers -> Core ->
// Utils (see CLAUDE.md), and VRAccessibilityContext is a React context under
// UI. There are also multiple startExploration call sites, so threading the
// setting through session config would mean keeping all of them in sync.
// Instead this tiny module owns the shared storage key and a plain read, and
// VRAccessibilityContext imports VR_A11Y_STORAGE_KEY from here (UI importing
// core is the allowed direction) so the two never drift apart.

import { vr as log } from "@Utils/logger.js";

/** Must match the literal VRAccessibilityContext.jsx used to persist settings. */
export const VR_A11Y_STORAGE_KEY = "cia-vr-accessibility-settings";

/**
 * Defaults mirrored from VRAccessibilityContext's DEFAULT_VR_ACCESSIBILITY,
 * limited to the slice core VR code actually reads.
 * @type {{movement: {snapTurn: ('off'|15|30|45|90)}, input: {dominantHand: ('left'|'right')}}}
 */
export const DEFAULT_VR_A11Y_SETTINGS = {
  movement: {
    snapTurn: 45, // 'off' | 15 | 30 | 45 | 90
  },
  input: {
    // Which side the spatial menu prefers when both are equally clear.
    dominantHand: "right", // 'left' | 'right'
  },
};

/**
 * Read the persisted VR accessibility settings, merged over the defaults.
 * Never throws: missing localStorage (SSR/tests), invalid JSON, or a
 * localStorage that throws on access all fall back to the defaults.
 * @returns {{movement: {snapTurn: ('off'|15|30|45|90)}}}
 */
export function readVRAccessibilitySettings() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) {
      return DEFAULT_VR_A11Y_SETTINGS;
    }
    const stored = localStorage.getItem(VR_A11Y_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_VR_A11Y_SETTINGS;
    }
    const parsed = JSON.parse(stored);
    const isObj = (v) => v && typeof v === "object";
    const parsedMovement = isObj(parsed) && isObj(parsed.movement) ? parsed.movement : undefined;
    const parsedInput = isObj(parsed) && isObj(parsed.input) ? parsed.input : undefined;
    return {
      ...DEFAULT_VR_A11Y_SETTINGS,
      ...(isObj(parsed) ? parsed : undefined),
      movement: {
        ...DEFAULT_VR_A11Y_SETTINGS.movement,
        ...parsedMovement,
      },
      input: {
        ...DEFAULT_VR_A11Y_SETTINGS.input,
        ...parsedInput,
      },
    };
  } catch (e) {
    log.warn(`Failed to read VR accessibility settings: ${e?.message}`);
    return DEFAULT_VR_A11Y_SETTINGS;
  }
}

export default readVRAccessibilitySettings;
