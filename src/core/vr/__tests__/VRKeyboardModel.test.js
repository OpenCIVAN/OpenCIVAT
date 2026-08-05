// src/core/vr/__tests__/VRKeyboardModel.test.js
// Logic-layer tests for the in-VR spatial keyboard: key layout data, the
// shift tri-state machine, and the draft-line formatter. Mirrors
// VRSpatialMenuModel.test.js's style. No VTK rendering is exercised here —
// this module has no VTK/React/DOM dependency at all.
import { describe, it, expect } from "vitest";

import {
  VR_KEYBOARD_KEYS,
  SHIFT_MAP,
  MAX_ANNOTATION_TEXT,
  shiftChar,
  nextShiftMode,
  consumeShift,
  formatDraftLine,
} from "../VRKeyboardModel.js";

// Cross-file drift guard: VRAnnotationTool.js imports vtk.js, but that's fine
// for a *test* import (precedented by VRAnnotationTool.test.js, which already
// imports the tool directly in jsdom/vitest without mocking vtk.js). The
// module under test must NOT import this itself — see VRKeyboardModel.js's
// comment on DEFAULT_FALLBACK_LABEL for why.
import { ANNOTATION_LABEL_PRESETS } from "../tools/VRAnnotationTool.js";

describe("VR_KEYBOARD_KEYS — ids", () => {
  it("every id is unique", () => {
    const ids = VR_KEYBOARD_KEYS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every id starts with 'kbd-'", () => {
    for (const k of VR_KEYBOARD_KEYS) {
      expect(k.id.startsWith("kbd-")).toBe(true);
    }
  });
});

describe("VR_KEYBOARD_KEYS — row shape", () => {
  const byRow = () => {
    const m = new Map();
    for (const k of VR_KEYBOARD_KEYS) {
      if (!m.has(k.row)) m.set(k.row, []);
      m.get(k.row).push(k);
    }
    return m;
  };

  it("has exactly 6 rows (0-5) with the expected column counts", () => {
    const m = byRow();
    expect([...m.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(m.get(0)).toHaveLength(5);
    expect(m.get(1)).toHaveLength(10);
    expect(m.get(2)).toHaveLength(10);
    expect(m.get(3)).toHaveLength(9);
    expect(m.get(4)).toHaveLength(7);
    expect(m.get(5)).toHaveLength(5);
  });

  it("rows 1-2 are exactly 10 columns; rows 3-4 are unpadded (9, then 7) since punctuation was dropped", () => {
    const m = byRow();
    expect(m.get(1).length).toBe(10);
    expect(m.get(2).length).toBe(10);
    expect(m.get(3).length).toBe(9);
    expect(m.get(4).length).toBe(7);
  });
});

describe("VR_KEYBOARD_KEYS — alphanumeric coverage", () => {
  const chars = VR_KEYBOARD_KEYS.filter((k) => k.kind === "kbd-char").map((k) => k.char);

  it("every letter a-z appears exactly once", () => {
    for (const code of Array.from({ length: 26 }, (_, i) => i)) {
      const letter = String.fromCharCode(97 + code); // 'a'..'z'
      expect(chars.filter((c) => c === letter)).toHaveLength(1);
    }
  });

  it("every digit 0-9 appears exactly once", () => {
    for (let d = 0; d <= 9; d++) {
      expect(chars.filter((c) => c === String(d))).toHaveLength(1);
    }
  });
});

describe("VR_KEYBOARD_KEYS — descriptor shape", () => {
  it("every descriptor has a non-empty label and a kind (guards the render layer's empty-label-returns-null trap)", () => {
    for (const k of VR_KEYBOARD_KEYS) {
      expect(typeof k.label).toBe("string");
      expect(k.label.length).toBeGreaterThan(0);
      expect(typeof k.kind).toBe("string");
      expect(k.kind.length).toBeGreaterThan(0);
    }
  });

  it("every descriptor has a numeric row and a string group (same shape VRSpatialMenuModel lays out)", () => {
    for (const k of VR_KEYBOARD_KEYS) {
      expect(typeof k.row).toBe("number");
      expect(typeof k.group).toBe("string");
      expect(k.group.length).toBeGreaterThan(0);
    }
  });
});

describe("VR_KEYBOARD_KEYS — presets match ANNOTATION_LABEL_PRESETS", () => {
  it("the 5 kbd-preset keys' text matches ANNOTATION_LABEL_PRESETS exactly, in order", () => {
    const presets = VR_KEYBOARD_KEYS.filter((k) => k.kind === "kbd-preset");
    expect(presets).toHaveLength(ANNOTATION_LABEL_PRESETS.length);
    expect(presets.map((k) => k.text)).toEqual([...ANNOTATION_LABEL_PRESETS]);
    expect(presets.map((k) => k.label)).toEqual([...ANNOTATION_LABEL_PRESETS]);
  });

  it("presets are declared as row 0 (top row)", () => {
    const presets = VR_KEYBOARD_KEYS.filter((k) => k.kind === "kbd-preset");
    for (const p of presets) expect(p.row).toBe(0);
  });
});

describe("VR_KEYBOARD_KEYS — irreversible-action accents", () => {
  it("kbd-confirm and kbd-cancel have distinct groups from each other and from the shared KEYS group", () => {
    const confirm = VR_KEYBOARD_KEYS.find((k) => k.id === "kbd-confirm");
    const cancel = VR_KEYBOARD_KEYS.find((k) => k.id === "kbd-cancel");
    expect(confirm.group).not.toBe(cancel.group);
    expect(confirm.group).not.toBe("KEYS");
    expect(cancel.group).not.toBe("KEYS");
  });
});

describe("SHIFT_MAP — totality", () => {
  it("has an entry for every kbd-char key's char", () => {
    const chars = VR_KEYBOARD_KEYS.filter((k) => k.kind === "kbd-char").map((k) => k.char);
    for (const c of chars) {
      expect(Object.prototype.hasOwnProperty.call(SHIFT_MAP, c)).toBe(true);
    }
  });
});

describe("shiftChar", () => {
  it("returns the character unchanged when mode is 'off'", () => {
    expect(shiftChar("q", "off")).toBe("q");
    expect(shiftChar("1", "off")).toBe("1");
  });

  it("returns the shifted character for 'once' and 'lock'", () => {
    expect(shiftChar("q", "once")).toBe("Q");
    expect(shiftChar("q", "lock")).toBe("Q");
    expect(shiftChar("1", "once")).toBe("!");
    expect(shiftChar("9", "lock")).toBe("(");
  });

  it("returns an unknown character unchanged even under an active shift mode", () => {
    expect(shiftChar("ß", "once")).toBe("ß");
    expect(shiftChar("!", "lock")).toBe("!");
  });

  it("passes through non-string input unchanged rather than throwing or returning undefined", () => {
    expect(() => shiftChar(undefined, "once")).not.toThrow();
    expect(shiftChar(undefined, "once")).toBe(undefined);
    expect(shiftChar(null, "lock")).toBe(null);
    expect(shiftChar(5, "once")).toBe(5);
  });
});

describe("nextShiftMode", () => {
  it("cycles off -> once -> lock -> off", () => {
    expect(nextShiftMode("off")).toBe("once");
    expect(nextShiftMode("once")).toBe("lock");
    expect(nextShiftMode("lock")).toBe("off");
  });

  it("defensively resets unrecognized input to 'off'", () => {
    expect(nextShiftMode("garbage")).toBe("off");
    expect(nextShiftMode(undefined)).toBe("off");
  });
});

describe("consumeShift", () => {
  it("'once' is consumed to 'off'", () => {
    expect(consumeShift("once")).toBe("off");
  });
  it("'lock' persists", () => {
    expect(consumeShift("lock")).toBe("lock");
  });
  it("'off' stays 'off'", () => {
    expect(consumeShift("off")).toBe("off");
  });
});

describe("formatDraftLine", () => {
  it("empty text mentions the fallback and ends with the caret", () => {
    const line = formatDraftLine("", { fallback: "Anomaly" });
    expect(line).toContain("Anomaly");
    expect(line.endsWith("▌")).toBe(true);
  });

  it("whitespace-only text is treated as empty", () => {
    const line = formatDraftLine("   ", { fallback: "Max" });
    expect(line).toContain("Max");
  });

  it("falls back to a sane default when no fallback is supplied on empty input", () => {
    expect(() => formatDraftLine("")).not.toThrow();
    const line = formatDraftLine("");
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
    expect(line.endsWith("▌")).toBe(true);
  });

  it("short non-empty text is shown in full with a trailing caret", () => {
    const line = formatDraftLine("hello");
    expect(line).toBe("hello ▌");
  });

  it("clamps long input to roughly the last 44 characters, prefixed with an ellipsis", () => {
    const long = "x".repeat(MAX_ANNOTATION_TEXT);
    const line = formatDraftLine(long);
    expect(line.startsWith("…")).toBe(true);
    expect(line.endsWith("▌")).toBe(true);
    // Strip the leading ellipsis and trailing " ▌" to isolate the shown text.
    const core = line.slice(1, line.length - 2);
    expect(core.length).toBeLessThanOrEqual(44);
    // It must be the TAIL of the original string (most recent typing is what
    // matters while composing).
    expect(long.endsWith(core)).toBe(true);
  });

  it("the caret is always the terminal character", () => {
    expect(formatDraftLine("")).toMatch(/▌$/);
    expect(formatDraftLine("abc")).toMatch(/▌$/);
    expect(formatDraftLine("x".repeat(200))).toMatch(/▌$/);
  });

  it("never throws on null, undefined, or non-string input", () => {
    expect(() => formatDraftLine(null)).not.toThrow();
    expect(() => formatDraftLine(undefined)).not.toThrow();
    expect(() => formatDraftLine(42)).not.toThrow();
    expect(typeof formatDraftLine(null)).toBe("string");
    expect(typeof formatDraftLine(undefined)).toBe("string");
    expect(typeof formatDraftLine(42)).toBe("string");
  });
});
