// The in-VR menu computes all its geometry in physical (XR) metres, then maps
// the final actor placements into the data-space renderer the VR camera draws
// (dataPos = xrPos/vrScale + vrOrigin). This is what keeps the panel at a fixed
// physical size/distance regardless of dataset zoom — and what fixes it being
// invisible (thrown far away and tiny) on Apple Vision Pro when auto-fit scale
// is far from 1.
import { describe, it, expect } from "vitest";
import { VRSpatialUI } from "../VTKVRSpatialUI.js";

describe("VRSpatialUI._toData", () => {
  it("defaults to an identity map before a transform is latched", () => {
    const ui = new VRSpatialUI();
    expect(ui._toData([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("applies dataPos = xrPos/vrScale + vrOrigin", () => {
    const ui = new VRSpatialUI();
    ui._vrScale = 2;
    ui._vrOrigin = [10, 20, 30];
    expect(ui._toData([2, 4, -6])).toEqual([11, 22, 27]);
  });

  it("a physical panel point stays a fixed physical distance after the round-trip", () => {
    // The VR camera renders dataPos back to xrShown = (dataPos - vrOrigin)*vrScale.
    // Feeding a physical point through _toData and back must reproduce it, so the
    // panel appears where it was authored (≈1.2 m in front) at any scale.
    const ui = new VRSpatialUI();
    ui._vrScale = 0.05; // heavily zoomed-out dataset
    ui._vrOrigin = [3, -1, 8];
    const physical = [0.1, 1.4, -1.2];
    const data = ui._toData(physical);
    const shown = [
      (data[0] - ui._vrOrigin[0]) * ui._vrScale,
      (data[1] - ui._vrOrigin[1]) * ui._vrScale,
      (data[2] - ui._vrOrigin[2]) * ui._vrScale,
    ];
    expect(shown[0]).toBeCloseTo(physical[0]);
    expect(shown[1]).toBeCloseTo(physical[1]);
    expect(shown[2]).toBeCloseTo(physical[2]);
  });
});
