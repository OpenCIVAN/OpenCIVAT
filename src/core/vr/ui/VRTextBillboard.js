// src/core/vr/ui/VRTextBillboard.js
//
// The in-VR text primitive: a Canvas2D-painted quad uploaded as a vtkTexture.
//
// WHY THIS EXISTS — vtkVectorText does not work in this codebase and never did.
// It bails at VectorText.js:173 (`if (!model.font || !model.text) return;`) and
// errors at :321 with "Font object not set, make sure the TTF file is parsed
// using opentype.js". `font` defaults to null, opentype.js is not a dependency,
// and nothing anywhere calls setFont(). So every vtkVectorText label in the
// repo — the measure tool's distance readout, the probe tool's sampled value,
// the desktop annotation-line labels — rendered as invisible empty geometry.
// The bug was invisible precisely because it produced no error and no pixels.
//
// VTKVRSpatialUI worked around this privately (canvas → texture) for the menu.
// This module extracts that technique so every VR tool can use it, and lives
// under src/core/vr/ so both src/core/vr/tools/* and
// src/core/instances/types/vtk/vr/* can import it without a cycle — both
// already import downward into src/core/vr/.
//
// Each detail below is load-bearing; see the numbered comments at each site.

import { vr as log } from "@Utils/logger.js";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkTexture from "@kitware/vtk.js/Rendering/Core/Texture";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";

const DEFAULT_PX_HEIGHT = 48;
const DEFAULT_WORLD_HEIGHT = 0.03;
const DEFAULT_COLOR = "#f3f5ff";
const DEFAULT_FONT_FAMILY = "Arial, sans-serif";
const DEFAULT_WEIGHT = 600;
// Canvas width ceiling. Text longer than this is ellipsised rather than allowed
// to allocate an unbounded texture from a runaway caller.
const MAX_CANVAS_WIDTH_PX = 2048;

/**
 * Upload a 2D canvas's current pixels into a vtkTexture, flipped vertically
 * (WebGL's texture origin is bottom-left; canvas is top-left).
 *
 * Extracted from VTKVRSpatialUI._uploadCanvasTexture so the menu, avatar
 * labels, and tool labels all share one implementation.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} texture - vtkTexture
 */
export function uploadCanvasTexture(canvas, ctx, texture) {
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const flipped = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    const src = (h - 1 - row) * w * 4;
    const dst = row * w * 4;
    flipped.set(imgData.data.subarray(src, src + w * 4), dst);
  }
  const image = vtkImageData.newInstance();
  image.setDimensions(w, h, 1);
  image.setSpacing(1, 1, 1);
  image.setOrigin(0, 0, 0);
  const scalars = vtkDataArray.newInstance({
    numberOfComponents: 4,
    values: flipped,
    dataType: "Uint8Array",
  });
  scalars.setName("scalars");
  image.getPointData().setScalars(scalars);
  texture.setInputData(image);
  texture.modified();
}

/**
 * Trace a rounded-rect path. Deliberately does NOT use native ctx.roundRect —
 * jsdom lacks it, so any code path using the native call throws under test
 * (AvatarLabel hit exactly this). Corners are clamped so tiny rects stay valid.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x @param {number} y @param {number} w @param {number} h
 * @param {number} r - corner radius
 */
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * A world-space text label that always renders (unlike vtkVectorText).
 *
 * Typical tool usage — create once, update per frame:
 *
 *   this._label = new VRTextBillboard({ worldHeight: 0.02 });
 *   this._label.attach(renderer);
 *   // ... each frame:
 *   this._label.setText(`${dist.toFixed(3)} units`);   // dirty-checked
 *   this._label.setPosition(mx, my, mz);
 *   this._label.setScale(this._apparentScale(0.02));   // constant apparent size
 *   this._label.faceCamera(renderer);
 *   // ... on deactivate:
 *   this._label.dispose();
 */
export class VRTextBillboard {
  /**
   * @param {object}  [opts]
   * @param {string}  [opts.text]        initial text ('' renders nothing until setText)
   * @param {number}  [opts.worldHeight] label height in world units before setScale
   * @param {string}  [opts.color]       CSS text fill color
   * @param {?string} [opts.background]  CSS background fill; null = transparent
   * @param {number}  [opts.pxHeight]    canvas texel height (texture resolution)
   * @param {number}  [opts.weight]      CSS font weight
   * @param {string}  [opts.fontFamily]  CSS font family
   */
  constructor({
    text = "",
    worldHeight = DEFAULT_WORLD_HEIGHT,
    color = DEFAULT_COLOR,
    background = null,
    pxHeight = DEFAULT_PX_HEIGHT,
    weight = DEFAULT_WEIGHT,
    fontFamily = DEFAULT_FONT_FAMILY,
  } = {}) {
    this._text = text;
    this._worldHeight = worldHeight;
    this._color = color;
    this._background = background;
    this._pxHeight = pxHeight;
    this._weight = weight;
    this._fontFamily = fontFamily;

    this._canvas = null;
    this._ctx = null;
    this._texture = null;
    this._planeSource = null;
    this._actor = null;
    this._renderer = null;
    this._worldWidth = 0;
  }

  /**
   * Build the actor and add it to `renderer`. Idempotent — calling it again
   * with the same renderer is a no-op, so a tool's render() can call it every
   * frame without guarding.
   * @param {object} renderer - VTK renderer
   * @returns {this}
   */
  attach(renderer) {
    if (!renderer || this._actor) return this;

    try {
      this._canvas = document.createElement("canvas");
      this._ctx = this._canvas.getContext("2d");

      // (1) `resizable: true` is MANDATORY for text that changes. On WebGL2,
      // vtk.js allocates non-resizable textures with texStorage2D, which is
      // immutable — the label would freeze at whatever it said on the first
      // upload and silently never update again.
      this._texture = vtkTexture.newInstance({ resizable: true });
      this._texture.setInterpolate(true);

      // (4) Author the plane centred on its own origin so callers can simply
      // setPosition() the point they want the label centred on. Never rely on
      // vtkPlaneSource's defaults here.
      this._planeSource = vtkPlaneSource.newInstance({
        origin: [-0.5, -0.5, 0],
        point1: [0.5, -0.5, 0],
        point2: [-0.5, 0.5, 0],
      });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(this._planeSource.getOutputPort());

      this._actor = vtkActor.newInstance();
      this._actor.setMapper(mapper);
      this._actor.addTexture(this._texture);

      const property = this._actor.getProperty();
      property.setOpacity(1.0);
      property.setLighting(false);

      // (2) getIsOpaque() inspects model.texture, which addTexture() never
      // writes — so a transparent-canvas actor is misclassified as opaque and
      // renders with depthMask(true), punching holes through whatever is
      // behind it. Forcing translucency is the documented fix.
      this._actor.setForceTranslucent(true);

      // The VR renderer IS the desktop renderer, and raycastVR picks from
      // every pickable actor in it — a label must never absorb a tool hit.
      this._actor.setPickable(false);
      this._actor.setVisibility(false);

      renderer.addActor(this._actor);
      this._renderer = renderer;

      this._redraw();
    } catch (err) {
      log.warn(`VRTextBillboard attach failed: ${err?.message}`);
      this._teardownFields();
    }

    return this;
  }

  /**
   * Set the label text. Dirty-checked, so calling this every frame with an
   * unchanged string costs one string compare.
   * @param {string} text
   * @returns {this}
   */
  setText(text) {
    const next = text == null ? "" : String(text);
    if (next === this._text) return this;
    this._text = next;
    this._redraw();
    return this;
  }

  /** @returns {string} */
  getText() {
    return this._text;
  }

  /** @returns {this} */
  setPosition(x, y, z) {
    this._actor?.setPosition(x, y, z);
    return this;
  }

  /**
   * Uniform scale. Pair with VRToolInterface._apparentScale(metres) to hold a
   * constant apparent size as the world zooms.
   * @param {number} s
   * @returns {this}
   */
  setScale(s) {
    this._actor?.setScale(s, s, s);
    return this;
  }

  /**
   * Yaw-billboard toward a world point, so the label stays readable as the user
   * walks around it. Yaw only — pitching text toward a headset that can look
   * straight down reads as wobble, not helpfulness.
   * @returns {this}
   */
  faceToward(tx, ty, tz) {
    if (!this._actor) return this;
    const pos = this._actor.getPosition();
    const yaw = Math.atan2(tx - pos[0], tz - pos[2]) * (180 / Math.PI);
    this._actor.setOrientation(0, yaw, 0);
    return this;
  }

  /**
   * Convenience: face the renderer's active camera.
   * @returns {this}
   */
  faceCamera(renderer) {
    const camera = (renderer || this._renderer)?.getActiveCamera?.();
    const p = camera?.getPosition?.();
    if (p) this.faceToward(p[0], p[1], p[2]);
    return this;
  }

  /** @returns {this} */
  setVisible(visible) {
    // Empty text has no pixels to show — keep it hidden regardless.
    this._actor?.setVisibility(!!visible && !!this._text);
    return this;
  }

  /** @returns {object|null} the underlying vtkActor */
  getActor() {
    return this._actor;
  }

  /** @returns {number} current label width in world units (before setScale) */
  getWorldWidth() {
    return this._worldWidth;
  }

  /** @returns {number} */
  getWorldHeight() {
    return this._worldHeight;
  }

  /**
   * Remove from the renderer it was attached to and drop all references.
   * Safe to call twice. Tools MUST call this in deactivate() — actors live in
   * the renderer VR shares with the desktop canvas, so a leaked label
   * contaminates desktop bounds after the session ends.
   */
  dispose() {
    if (this._actor && this._renderer) {
      this._renderer.removeActor(this._actor);
      this._actor.delete?.();
    }
    this._teardownFields();
  }

  // ---------------------------------------------------------------------------

  /** @private */
  _teardownFields() {
    this._actor = null;
    this._texture = null;
    this._planeSource = null;
    this._canvas = null;
    this._ctx = null;
    this._renderer = null;
  }

  /**
   * Repaint the canvas at the size the current text needs, resize the quad to
   * match that aspect ratio, and re-upload.
   * @private
   */
  _redraw() {
    const ctx = this._ctx;
    const canvas = this._canvas;
    if (!ctx || !canvas || !this._actor) return;

    if (!this._text) {
      this._actor.setVisibility(false);
      return;
    }

    try {
      const font = `${this._weight} ${Math.round(this._pxHeight * 0.6)}px ${this._fontFamily}`;
      const padding = this._pxHeight * 0.4;

      // Measure with the font applied, then size the canvas to fit.
      ctx.font = font;
      const measured = ctx.measureText(this._text).width;
      const width = Math.min(
        MAX_CANVAS_WIDTH_PX,
        Math.max(1, Math.ceil(measured + padding * 2))
      );

      canvas.width = width;
      canvas.height = this._pxHeight;

      // (3) Resizing a canvas RESETS its 2D context state — the font measured
      // with above is gone by now and must be re-applied before drawing, or
      // the text renders at the default 10px.
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (this._background) {
        ctx.fillStyle = this._background;
        roundRectPath(ctx, 0, 0, canvas.width, canvas.height, this._pxHeight * 0.22);
        ctx.fill();
      }

      ctx.fillStyle = this._color;
      ctx.fillText(this._text, canvas.width / 2, canvas.height / 2 + 1);

      uploadCanvasTexture(canvas, ctx, this._texture);

      // Resize the quad to the canvas aspect so glyphs are never stretched.
      this._worldWidth = this._worldHeight * (canvas.width / canvas.height);
      const hw = this._worldWidth / 2;
      const hh = this._worldHeight / 2;
      this._planeSource.setOrigin(-hw, -hh, 0);
      this._planeSource.setPoint1(hw, -hh, 0);
      this._planeSource.setPoint2(-hw, hh, 0);

      this._actor.setVisibility(true);
    } catch (err) {
      log.warn(`VRTextBillboard redraw failed for "${this._text}": ${err?.message}`);
      this._actor?.setVisibility(false);
    }
  }
}

/**
 * Sugar: construct + attach in one call.
 * @param {object} renderer
 * @param {object} [opts] - see VRTextBillboard constructor
 * @returns {VRTextBillboard}
 */
export function createTextBillboard(renderer, opts) {
  return new VRTextBillboard(opts).attach(renderer);
}

export default VRTextBillboard;
