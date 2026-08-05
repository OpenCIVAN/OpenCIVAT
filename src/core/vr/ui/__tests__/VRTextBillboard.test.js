// src/core/vr/ui/__tests__/VRTextBillboard.test.js
//
// Covers the shared in-VR text primitive that replaces vtkVectorText (which
// silently rendered nothing in this codebase — no font is ever supplied and
// opentype.js is not installed).
//
// The tests below deliberately pin the four non-obvious implementation details
// that each correspond to a real, already-documented failure mode:
//   1. resizable texture      — else WebGL2 texStorage2D freezes dynamic text
//   2. setForceTranslucent    — else transparent labels punch depth holes
//   3. font re-applied after canvas resize — else text renders at default 10px
//   4. roundRectPath not ctx.roundRect     — else jsdom throws
// plus actor lifecycle, since a leaked actor contaminates the desktop renderer
// VR shares.
//
// jsdom has no real Canvas 2D context, so we stub just enough of it to run the
// real code (same idiom as VTKVRSpatialUI.integration.test.js).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import {
  VRTextBillboard,
  createTextBillboard,
  roundRectPath,
  uploadCanvasTexture,
} from "../VRTextBillboard.js";

/** Fake 2D context that records the font in effect at each fillText call. */
function createFakeCtx() {
  const ctx = {
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    fontAtFillText: [],
    measureText: vi.fn((str) => ({ width: Math.max(1, String(str).length * 10) })),
    fillText: vi.fn(function (...args) {
      ctx.fontAtFillText.push(ctx.font);
      return args;
    }),
    clearRect: vi.fn(),
    fill: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn((_x, _y, w, h) => ({
      data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
    })),
  };
  return ctx;
}

function makeRenderer() {
  return {
    addActor: vi.fn(),
    removeActor: vi.fn(),
    getActiveCamera: vi.fn(() => ({ getPosition: () => [0, 0, 10] })),
  };
}

describe("VRTextBillboard", () => {
  let getContextSpy;

  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => createFakeCtx());
  });

  afterEach(() => {
    getContextSpy.mockRestore();
  });

  describe("attach", () => {
    it("adds exactly one actor to the renderer", () => {
      const renderer = makeRenderer();
      const label = new VRTextBillboard({ text: "12.480 units" }).attach(renderer);

      expect(renderer.addActor).toHaveBeenCalledTimes(1);
      expect(label.getActor()).toBeTruthy();
    });

    it("is idempotent — a tool's render() may call it every frame", () => {
      const renderer = makeRenderer();
      const label = new VRTextBillboard({ text: "x" });
      label.attach(renderer);
      label.attach(renderer);
      label.attach(renderer);

      expect(renderer.addActor).toHaveBeenCalledTimes(1);
    });

    it("marks the actor unpickable so it never absorbs a tool raycast", () => {
      // VR shares the desktop renderer and raycastVR picks from every pickable
      // actor in it — a label in front of the data would steal the hit.
      const label = new VRTextBillboard({ text: "x" }).attach(makeRenderer());
      expect(label.getActor().getPickable()).toBe(false);
    });

    it("forces translucency so transparent text does not punch depth holes", () => {
      // getIsOpaque() inspects model.texture, which addTexture() never writes.
      const label = new VRTextBillboard({ text: "x" }).attach(makeRenderer());
      expect(label.getActor().getForceTranslucent()).toBe(true);
    });

    it("survives a renderer-less / failing attach without throwing", () => {
      expect(() => new VRTextBillboard({ text: "x" }).attach(null)).not.toThrow();
      expect(new VRTextBillboard({ text: "x" }).attach(null).getActor()).toBeNull();
    });
  });

  describe("setText", () => {
    it("shows text and sizes the quad to the canvas aspect ratio", () => {
      const label = new VRTextBillboard({ worldHeight: 0.02 }).attach(makeRenderer());
      label.setText("1.234 units");

      expect(label.getText()).toBe("1.234 units");
      expect(label.getActor().getVisibility()).toBe(true);
      // Wider text than tall => world width exceeds world height.
      expect(label.getWorldWidth()).toBeGreaterThan(label.getWorldHeight());
    });

    it("re-applies the font AFTER resizing the canvas", () => {
      // Assigning canvas.width resets the 2D context, wiping ctx.font. If the
      // font is not re-applied, fillText draws at the default 10px.
      const label = new VRTextBillboard({ text: "hello" }).attach(makeRenderer());
      const ctx = label._ctx;

      expect(ctx.fontAtFillText.length).toBeGreaterThan(0);
      for (const font of ctx.fontAtFillText) {
        expect(font).not.toBe("");
        expect(font).toMatch(/px/);
      }
    });

    it("is dirty-checked — same text does not repaint", () => {
      const label = new VRTextBillboard({ text: "same" }).attach(makeRenderer());
      const before = label._ctx.fillText.mock.calls.length;

      label.setText("same");
      expect(label._ctx.fillText.mock.calls.length).toBe(before);

      label.setText("different");
      expect(label._ctx.fillText.mock.calls.length).toBeGreaterThan(before);
    });

    it("hides the actor for empty text rather than rendering a blank quad", () => {
      const label = new VRTextBillboard({ text: "visible" }).attach(makeRenderer());
      expect(label.getActor().getVisibility()).toBe(true);

      label.setText("");
      expect(label.getActor().getVisibility()).toBe(false);

      // setVisible(true) must not resurrect an empty label.
      label.setVisible(true);
      expect(label.getActor().getVisibility()).toBe(false);
    });

    it("uses a resizable texture so changing text is not frozen by texStorage2D", () => {
      const label = new VRTextBillboard({ text: "first" }).attach(makeRenderer());
      expect(label._texture.getResizable()).toBe(true);
    });
  });

  describe("billboarding", () => {
    it("faceToward yaws only — no pitch or roll", () => {
      const label = new VRTextBillboard({ text: "x" }).attach(makeRenderer());
      label.setPosition(0, 0, 0);
      label.faceToward(10, 99, 0); // far above, to the +X side

      const [pitch, yaw, roll] = label.getActor().getOrientation();
      expect(pitch).toBe(0);
      expect(roll).toBe(0);
      expect(yaw).toBeCloseTo(90); // atan2(dx=10, dz=0) => 90deg
    });

    it("faceCamera reads the renderer's active camera position", () => {
      const renderer = makeRenderer();
      const label = new VRTextBillboard({ text: "x" }).attach(renderer);
      label.setPosition(0, 0, 0);
      label.faceCamera(renderer);

      expect(renderer.getActiveCamera).toHaveBeenCalled();
      expect(label.getActor().getOrientation()[1]).toBeCloseTo(0); // camera at +Z
    });

    it("setScale applies uniformly (pairs with _apparentScale)", () => {
      const label = new VRTextBillboard({ text: "x" }).attach(makeRenderer());
      label.setScale(3);
      expect(label.getActor().getScale()).toEqual([3, 3, 3]);
    });
  });

  describe("dispose", () => {
    it("removes the actor from the renderer it attached to", () => {
      const renderer = makeRenderer();
      const label = new VRTextBillboard({ text: "x" }).attach(renderer);
      const actor = label.getActor();

      label.dispose();

      expect(renderer.removeActor).toHaveBeenCalledWith(actor);
      expect(label.getActor()).toBeNull();
    });

    it("is safe to call twice", () => {
      const renderer = makeRenderer();
      const label = new VRTextBillboard({ text: "x" }).attach(renderer);
      label.dispose();

      expect(() => label.dispose()).not.toThrow();
      expect(renderer.removeActor).toHaveBeenCalledTimes(1);
    });

    it("leaves mutators inert after disposal rather than throwing", () => {
      const label = new VRTextBillboard({ text: "x" }).attach(makeRenderer());
      label.dispose();

      expect(() => {
        label.setText("later").setPosition(1, 2, 3).setScale(2).faceToward(0, 0, 1).setVisible(true);
      }).not.toThrow();
    });
  });

  describe("createTextBillboard", () => {
    it("constructs and attaches in one call", () => {
      const renderer = makeRenderer();
      const label = createTextBillboard(renderer, { text: "sugar" });

      expect(label).toBeInstanceOf(VRTextBillboard);
      expect(renderer.addActor).toHaveBeenCalledTimes(1);
      expect(label.getText()).toBe("sugar");
    });
  });

  describe("roundRectPath", () => {
    it("traces a closed path without native ctx.roundRect (jsdom lacks it)", () => {
      const ctx = createFakeCtx();
      expect(ctx.roundRect).toBeUndefined();

      roundRectPath(ctx, 0, 0, 100, 50, 8);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4);
    });

    it("clamps the radius so degenerate rects stay valid", () => {
      const ctx = createFakeCtx();
      expect(() => roundRectPath(ctx, 0, 0, 4, 2, 999)).not.toThrow();
    });
  });

  describe("uploadCanvasTexture", () => {
    it("flips rows vertically for WebGL's bottom-left texture origin", () => {
      const w = 2;
      const h = 2;
      // Row 0 = red, row 1 = blue. After the flip, row 0 must be blue.
      const data = new Uint8ClampedArray([
        255, 0, 0, 255, 255, 0, 0, 255, // top row (red)
        0, 0, 255, 255, 0, 0, 255, 255, // bottom row (blue)
      ]);
      const ctx = { getImageData: () => ({ data }) };
      const texture = { setInputData: vi.fn(), modified: vi.fn() };

      uploadCanvasTexture({ width: w, height: h }, ctx, texture);

      expect(texture.setInputData).toHaveBeenCalledTimes(1);
      expect(texture.modified).toHaveBeenCalledTimes(1);

      const image = texture.setInputData.mock.calls[0][0];
      const values = image.getPointData().getScalars().getData();
      expect(Array.from(values.slice(0, 4))).toEqual([0, 0, 255, 255]); // blue first
    });
  });
});
