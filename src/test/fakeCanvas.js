// src/test/fakeCanvas.js
//
// Shared fake Canvas2D context for tests that exercise a VRTextBillboard (or
// any other canvas-texture-based) rendering path. jsdom has no real <canvas>
// 2D context by default (the `canvas` npm package isn't installed), so any
// code that calls document.createElement("canvas").getContext("2d") needs
// this stubbed in via:
//
//   vi.spyOn(HTMLCanvasElement.prototype, "getContext")
//     .mockImplementation(() => createFakeCtx());
//
// Extracted from VTKVRSpatialUI.integration.test.js so every test exercising
// a canvas-texture path (that integration test, VTKAnnotationLinesFeature's
// label billboards, and any future caller) shares one implementation instead
// of re-deriving it.

import { vi } from "vitest";

/** Fresh fake 2D context per canvas -- mirrors real getContext("2d") semantics closely enough to run the code. */
export function createFakeCtx() {
  return {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    textAlign: "",
    textBaseline: "",
    measureText: vi.fn((str) => ({ width: Math.max(1, String(str).length * 10) })),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fill: vi.fn(),
    // Rounded-card path drawing (see VTKVRSpatialUI._roundRectPath / _drawCard).
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    // Group accent bar: clipped fillRect over the rounded card (_drawCard).
    clip: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn((_x, _y, w, h) => ({
      data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
    })),
  };
}

export default createFakeCtx;
