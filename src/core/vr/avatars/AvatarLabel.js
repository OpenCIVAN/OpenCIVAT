// src/core/vr/avatars/AvatarLabel.js
// Floating name label above an avatar's head using a canvas-texture billboard

import { vr as log } from '@Utils/logger.js';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPlaneSource from '@kitware/vtk.js/Filters/Sources/PlaneSource';
import vtkTexture from '@kitware/vtk.js/Rendering/Core/Texture';
// Shared with the spatial menu and every tool label — see
// src/core/vr/ui/VRTextBillboard.js. roundRectPath in particular replaces the
// native ctx.roundRect this file used to call, which jsdom does not implement
// (so any test touching _redraw threw).
import { roundRectPath, uploadCanvasTexture } from '@Core/vr/ui/VRTextBillboard.js';

const LABEL_W = 256;
const LABEL_H = 64;
const LABEL_WORLD_WIDTH = 0.32;  // meters wide in VR
const LABEL_WORLD_HEIGHT = 0.08; // meters tall
const LABEL_Y_OFFSET = 0.28;     // meters above head center
// "EDITING" badge drawn at the right edge when the user is manipulating the
// shared data (see setActivity).
const BADGE_W = 66;
const BADGE_H = 26;

/**
 * Renders a 3D name label in VR space.
 * Implemented as a textured plane in VTK.js.
 * Label is oriented to face world -Z; works best when viewers approach from that direction.
 */
export class AvatarLabel {
  constructor() {
    this._actor = null;
    this._texture = null;
    this._canvas = null;
    this._ctx = null;
    this._displayName = '';
    this._color = '#ffffff';
    this._speaking = false;
    // What this user is manipulating ('dataset' | 'filter' | null) — drives the
    // amber badge drawn on the right of the name. Presence-rate, see
    // SimpleAvatarFallback.setActivity.
    this._activity = null;
    this._renderer = null;
    // Local viewer's 1/vrScale. The plane is authored in physical metres but
    // lives in scene units, so without this the name tag grows and shrinks
    // with the viewer's zoom. See setScale.
    this._scale = 1;
  }

  /**
   * @param {object} renderer - VTK.js renderer
   * @param {string} displayName
   * @param {string} color - hex color string
   */
  create(renderer, displayName, color) {
    this._renderer = renderer;
    this._displayName = displayName;
    this._color = color || '#ffffff';

    this._canvas = document.createElement('canvas');
    this._canvas.width = LABEL_W;
    this._canvas.height = LABEL_H;
    this._ctx = this._canvas.getContext('2d');

    this._texture = vtkTexture.newInstance();
    this._texture.setInterpolate(true);

    const hw = LABEL_WORLD_WIDTH / 2;
    const planeSource = vtkPlaneSource.newInstance({
      origin: [-hw, 0, 0],
      point1: [hw, 0, 0],
      point2: [-hw, LABEL_WORLD_HEIGHT, 0],
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(planeSource.getOutputPort());

    this._actor = vtkActor.newInstance();
    this._actor.setMapper(mapper);
    this._actor.addTexture(this._texture);
    this._actor.getProperty().setOpacity(1.0);
    this._actor.setVisibility(false);
    // The VR renderer IS the desktop renderer, and VR raycasting
    // (VTKInstanceHandler._getVRPickTargets) filters candidates by
    // pickability — an unpickable-by-default name-label billboard would
    // otherwise stand between the user and the data and absorb probe/
    // measure/teleport hits.
    this._actor.setPickable(false);

    renderer.addActor(this._actor);

    this._redraw();

    log.debug('AvatarLabel created for:', displayName);
  }

  /**
   * Hold a constant apparent size regardless of the local viewer's zoom.
   *
   * LABEL_WORLD_WIDTH/HEIGHT/Y_OFFSET are authored in physical metres, but the
   * actor lives in scene units, which are physical metres divided by the local
   * viewer's vrScale. Without this the peer's name tag balloons when you zoom
   * into a detail and shrinks to nothing at room scale.
   *
   * @param {number} scale - the local viewer's 1/vrScale
   */
  setScale(scale) {
    const s = scale || 1;
    this._scale = s;
    this._actor?.setScale(s, s, s);
  }

  /**
   * Position the label above the head.
   * @param {number} x
   * @param {number} y - head Y in scene space
   * @param {number} z
   */
  setPosition(x, y, z) {
    // The vertical offset is a physical-metre quantity too, so it has to track
    // the same scale as the plane or the tag drifts off the head when zoomed.
    this._actor?.setPosition(x, y + LABEL_Y_OFFSET * this._scale, z);
  }

  /** Face the label toward a world-space point (local user's head). */
  faceToward(tx, ty, tz) {
    if (!this._actor) return;
    const pos = this._actor.getPosition();
    const dx = tx - pos[0];
    const dz = tz - pos[2];
    const yaw = Math.atan2(dx, dz) * (180 / Math.PI);
    this._actor.setOrientation(0, yaw, 0);
  }

  /** @param {boolean} speaking */
  setSpeaking(speaking) {
    if (this._speaking === speaking) return;
    this._speaking = speaking;
    this._redraw();
  }

  /**
   * Show/hide the "changing the data" badge. Dirty-checked like setSpeaking —
   * _redraw() ends in a GPU texture upload, so it must only run on an actual
   * change.
   * @param {string|null} activity
   */
  setActivity(activity) {
    const next = activity || null;
    if (this._activity === next) return;
    this._activity = next;
    this._redraw();
  }

  setVisible(visible) {
    this._actor?.setVisibility(visible);
  }

  /** Remove from renderer and free resources. */
  dispose(renderer) {
    if (this._actor) {
      (renderer || this._renderer)?.removeActor(this._actor);
    }
    this._actor = null;
    this._texture = null;
    this._canvas = null;
    this._ctx = null;
  }

  // ---------------------------------------------------------------------------

  _redraw() {
    const ctx = this._ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, LABEL_W, LABEL_H);

    // Background
    const bg = this._speaking ? 'rgba(60,220,120,0.85)' : 'rgba(20,20,20,0.82)';
    ctx.fillStyle = bg;
    roundRectPath(ctx, 2, 2, LABEL_W - 4, LABEL_H - 4, 10);
    ctx.fill();

    // Border (speaking highlight)
    if (this._speaking) {
      ctx.strokeStyle = '#3dec78';
      ctx.lineWidth = 3;
      roundRectPath(ctx, 2, 2, LABEL_W - 4, LABEL_H - 4, 10);
      ctx.stroke();
    }

    // Color swatch
    ctx.fillStyle = this._color;
    ctx.beginPath();
    ctx.arc(22, LABEL_H / 2, 9, 0, Math.PI * 2);
    ctx.fill();

    // Name text. The badge (when present) eats into the width available for
    // the name, so the truncation budget shrinks with it rather than letting
    // a long name run underneath the badge.
    const badgeW = this._activity ? BADGE_W : 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const maxW = LABEL_W - 48 - badgeW;
    const text = this._truncate(ctx, this._displayName, maxW);
    ctx.fillText(text, 40, LABEL_H / 2);

    // Activity badge: this person is changing the shared data right now. Amber,
    // matching the roster's holder card and the head halo, so the three read as
    // one signal.
    if (this._activity) {
      const bx = LABEL_W - BADGE_W - 8;
      const by = (LABEL_H - BADGE_H) / 2;
      ctx.fillStyle = 'rgba(255,183,72,0.95)';
      roundRectPath(ctx, bx, by, BADGE_W, BADGE_H, 8);
      ctx.fill();
      ctx.fillStyle = '#241703';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EDITING', bx + BADGE_W / 2, LABEL_H / 2);
    }

    this._uploadTexture();
  }

  _truncate(ctx, text, maxWidth) {
    let t = text;
    while (ctx.measureText(t).width > maxWidth && t.length > 1) {
      t = t.slice(0, -1);
    }
    return t === text ? text : t + '…';
  }

  _uploadTexture() {
    uploadCanvasTexture(this._canvas, this._ctx, this._texture);
  }
}

export default AvatarLabel;
