// src/core/vr/ui/__tests__/vrColor.test.js
// getUserColor() hands out hsl(), but the avatar's old parser understood only
// #rrggbb — so every remote participant rendered in the identical salmon
// fallback and users could not tell each other apart. These tests pin the
// formats that actually reach VTK.
import { describe, it, expect } from "vitest";

import { cssColorToRgb01, FALLBACK_RGB01 } from "../vrColor.js";

const isFallback = (rgb) =>
  rgb[0] === FALLBACK_RGB01[0] &&
  rgb[1] === FALLBACK_RGB01[1] &&
  rgb[2] === FALLBACK_RGB01[2];

describe("cssColorToRgb01", () => {
  it("parses hsl() — the format getUserColor() actually returns — to a real colour, NOT the fallback", () => {
    const rgb = cssColorToRgb01("hsl(210, 70%, 60%)");

    expect(isFallback(rgb)).toBe(false);
    // hsl(210,70%,60%) is a mid blue: blue dominant, red weakest.
    expect(rgb[2]).toBeGreaterThan(rgb[1]);
    expect(rgb[1]).toBeGreaterThan(rgb[0]);
    for (const c of rgb) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it("gives distinct results for distinct hues (the actual bug: every avatar looked identical)", () => {
    const a = cssColorToRgb01("hsl(10, 70%, 60%)");
    const b = cssColorToRgb01("hsl(140, 70%, 60%)");
    const c = cssColorToRgb01("hsl(260, 70%, 60%)");

    expect(a).not.toEqual(b);
    expect(b).not.toEqual(c);
    expect(a).not.toEqual(c);
  });

  it("converts known hsl anchors exactly", () => {
    expect(cssColorToRgb01("hsl(0, 100%, 50%)")).toEqual([1, 0, 0]);
    expect(cssColorToRgb01("hsl(120, 100%, 50%)")).toEqual([0, 1, 0]);
    expect(cssColorToRgb01("hsl(240, 100%, 50%)")).toEqual([0, 0, 1]);
    // Zero saturation is grey at any hue
    const grey = cssColorToRgb01("hsl(200, 0%, 50%)");
    expect(grey[0]).toBeCloseTo(0.5, 5);
    expect(grey[0]).toBe(grey[1]);
    expect(grey[1]).toBe(grey[2]);
  });

  it("accepts hsla() and space-separated modern syntax", () => {
    const comma = cssColorToRgb01("hsla(210, 70%, 60%, 0.5)");
    const space = cssColorToRgb01("hsl(210 70% 60% / 0.5)");
    const plain = cssColorToRgb01("hsl(210, 70%, 60%)");

    expect(comma).toEqual(plain);
    expect(space).toEqual(plain);
  });

  it("still handles the hex forms the avatar always supported", () => {
    const rgb = cssColorToRgb01("#ff6b6b");
    expect(rgb[0]).toBeCloseTo(1, 5);
    expect(rgb[1]).toBeCloseTo(0x6b / 255, 5);
    expect(rgb[2]).toBeCloseTo(0x6b / 255, 5);

    // shorthand + uppercase + alpha suffix
    expect(cssColorToRgb01("#f00")).toEqual([1, 0, 0]);
    expect(cssColorToRgb01("#FF0000")).toEqual([1, 0, 0]);
    expect(cssColorToRgb01("#ff000080")).toEqual([1, 0, 0]);
  });

  it("handles rgb() and rgba(), numeric and percentage channels", () => {
    expect(cssColorToRgb01("rgb(255, 0, 0)")).toEqual([1, 0, 0]);
    expect(cssColorToRgb01("rgba(0, 255, 0, 0.4)")).toEqual([0, 1, 0]);
    expect(cssColorToRgb01("rgb(100%, 0%, 0%)")).toEqual([1, 0, 0]);
    const half = cssColorToRgb01("rgb(128 128 128)");
    expect(half[0]).toBeCloseTo(128 / 255, 5);
  });

  it("returns the fallback without throwing for garbage input", () => {
    const garbage = [
      "not-a-color",
      "rebeccapurple", // named colours need a DOM round-trip; out of scope
      "hsl(nope, 70%, 60%)",
      "rgb(1,2)",
      "#12345",
      "",
      "   ",
      null,
      undefined,
      42,
      {},
      [],
    ];

    for (const value of garbage) {
      expect(() => cssColorToRgb01(/** @type {any} */ (value))).not.toThrow();
      expect(cssColorToRgb01(/** @type {any} */ (value))).toEqual(FALLBACK_RGB01);
    }
  });

  it("clamps out-of-range channels rather than emitting invalid VTK colours", () => {
    const rgb = cssColorToRgb01("rgb(999, -20, 0)");
    expect(rgb[0]).toBe(1);
    expect(rgb[1]).toBe(0);
    // Hue wraps rather than falling back
    expect(cssColorToRgb01("hsl(-120, 100%, 50%)")).toEqual([0, 0, 1]);
  });
});
