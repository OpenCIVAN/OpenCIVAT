// src/core/vr/avatars/SimpleAvatarFallback.js
// Procedural avatar using VTK.js geometry — no external model files required.
// Pattern follows VRControllerRenderer.js.

import { vr as log } from '@Utils/logger.js';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
import { AvatarLabel } from './AvatarLabel.js';
import { cssColorToRgb01 } from '@Core/vr/ui/vrColor.js';

const HEAD_RADIUS = 0.12;
const HAND_RADIUS = 0.04;
const SPEAKING_RADIUS = 0.15; // slightly larger ring when speaking
const RAY_LENGTH = 0.8; // meters
// Radius of the dot dropped where a remote user's ray meets the geometry.
// Expressed in PHYSICAL metres and rescaled per frame by the LOCAL viewer's
// 1/vrScale (see updatePose) so it reads the same apparent size whether the
// viewer is inspecting the dataset at room scale or zoomed into a detail.
const HIT_MARKER_RADIUS_M = 0.02;
// Halo ring drawn around the head of whoever is currently manipulating the
// shared data. A ring (a flat, wide, low-resolution sphere) rather than a
// second opaque sphere so it reads as an annotation on the avatar instead of
// changing the avatar's silhouette.
const ACTIVITY_HALO_RADIUS = HEAD_RADIUS * 1.6;
const ACTIVITY_HALO_COLOR = [1.0, 0.72, 0.28]; // amber — matches the roster's holder card

/**
 * Lightweight procedural avatar for VR presence.
 * Renders head sphere, left/right hand spheres, a pointer ray, and a name label.
 * All positions must be in VTK scene space — caller is responsible for coordinate transform.
 */
export class SimpleAvatarFallback {
  constructor() {
    this._renderer = null;
    this._userInfo = null;
    this._actors = [];
    this._headActor = null;
    this._leftHandActor = null;
    this._rightHandActor = null;
    this._pointerRayActor = null;
    // Held here, NOT stashed on the actor: vtk.js Object.freeze()s every
    // publicAPI it hands back from newInstance (macros2.js), so assigning
    // `actor._lineSource` throws a TypeError in strict mode — which aborted
    // create() before a single actor reached the renderer, so no avatar body
    // has ever been added to the scene.
    this._pointerLineSource = null;
    this._hitMarkerActor = null;
    this._label = new AvatarLabel();
    this._speaking = false;
    // What this user is currently manipulating ('dataset' | 'filter' | null).
    // Presence-rate, not frame-rate: written only when AvatarNetworkSync
    // delivers a changed presence payload (see setActivity).
    this._activity = null;
    this._activityHaloActor = null;
  }

  /**
   * @param {object} renderer - VTK.js renderer
   * @param {import('./AvatarTypes.js').AvatarUserInfo} userInfo
   */
  create(renderer, userInfo) {
    this._renderer = renderer;
    this._userInfo = userInfo;

    // getUserColor() hands out `hsl(h, 70%, 60%)`, so this MUST go through the
    // full CSS parser — a hex-only one made every participant the same colour.
    const [r, g, b] = cssColorToRgb01(userInfo.color);

    // Head sphere
    this._headActor = this._makeSphere(HEAD_RADIUS, r, g, b, 0.9);
    // Hands — slightly desaturated tint
    this._leftHandActor = this._makeSphere(HAND_RADIUS, r * 0.6 + 0.4, g * 0.6 + 0.4, b, 0.85);
    this._rightHandActor = this._makeSphere(HAND_RADIUS, r, g * 0.6 + 0.4, b * 0.6 + 0.4, 0.85);

    // Pointer ray (line from right hand forward)
    this._pointerRayActor = this._makeRay(r, g, b);

    // Dot marking where that ray meets the shared geometry. Unlit so it reads
    // as a flat UI dot against any surface shading, and never a pick target
    // (see the setPickable note below).
    this._hitMarkerActor = this._makeSphere(HIT_MARKER_RADIUS_M, r, g, b, 0.95);
    this._hitMarkerActor.getProperty().setLighting(false);

    // "This person is changing the data right now" halo. Hidden until
    // setActivity() turns it on. Wireframe + unlit so it never occludes the
    // head it surrounds.
    this._activityHaloActor = this._makeSphere(
      ACTIVITY_HALO_RADIUS,
      ACTIVITY_HALO_COLOR[0],
      ACTIVITY_HALO_COLOR[1],
      ACTIVITY_HALO_COLOR[2],
      0.5
    );
    this._activityHaloActor.getProperty().setLighting(false);
    this._activityHaloActor.getProperty().setRepresentation(1); // wireframe

    for (const a of [
      this._headActor,
      this._leftHandActor,
      this._rightHandActor,
      this._pointerRayActor,
      this._hitMarkerActor,
      this._activityHaloActor,
    ]) {
      a.setVisibility(false);
      // The VR renderer IS the desktop renderer, and VR raycasting
      // (VTKInstanceHandler._getVRPickTargets) filters candidates by
      // pickability — an unpickable-by-default avatar body would otherwise
      // stand between the user and the data and absorb probe/measure/
      // teleport hits.
      a.setPickable(false);
      renderer.addActor(a);
      this._actors.push(a);
    }

    // Name label
    this._label.create(renderer, userInfo.displayName, userInfo.color);

    log.debug('SimpleAvatarFallback created for:', userInfo.userId);
  }

  /**
   * Update positions from a scene-space pose (already coordinate-transformed).
   *
   * @param {import('./AvatarTypes.js').AvatarPose} pose - Positions in VTK scene space
   * @param {number} [localVrScale=1] - the LOCAL viewer's vrScale, used to hold
   *   the avatar at a constant apparent size. Every POSITION on `pose` is
   *   already in scene space and must not be rescaled here — only actor sizes.
   */
  updatePose(pose, localVrScale = 1) {
    if (!pose) return;

    // Constant apparent size for the whole avatar. Every source below is
    // authored in PHYSICAL metres (HEAD_RADIUS, HAND_RADIUS, the halo, the
    // label plane), but scene units are physical metres divided by the local
    // viewer's vrScale. Previously only the hit marker compensated, so a peer's
    // body silently disagreed with their own pointer dot: at detail zoom the
    // head ballooned to cover the dataset, and at room scale it shrank away.
    // Two headsets at different scales saw each other at different sizes.
    const s = 1 / (localVrScale || 1);

    if (pose.head?.position) {
      const { x, y, z } = pose.head.position;
      this._headActor.setPosition(x, y, z);
      this._headActor.setScale(s, s, s);
      this._headActor.setVisibility(true);
      this._label.setScale(s);
      this._label.setPosition(x, y, z);
      this._label.setVisible(true);
      // The halo rides the head; whether it is SHOWN is owned by setActivity.
      this._activityHaloActor?.setPosition(x, y, z);
      this._activityHaloActor?.setScale(s, s, s);
      this._activityHaloActor?.setVisibility(!!this._activity);
    }

    if (pose.leftHand?.visible && pose.leftHand?.position) {
      const { x, y, z } = pose.leftHand.position;
      this._leftHandActor.setPosition(x, y, z);
      this._leftHandActor.setScale(s, s, s);
      this._leftHandActor.setVisibility(true);
    } else {
      this._leftHandActor.setVisibility(false);
    }

    if (pose.rightHand?.visible && pose.rightHand?.position) {
      const { x, y, z } = pose.rightHand.position;
      this._rightHandActor.setPosition(x, y, z);
      this._rightHandActor.setScale(s, s, s);
      this._rightHandActor.setVisibility(true);
    } else {
      this._rightHandActor.setVisibility(false);
    }

    // Pointer ray. `pose.pointerHit` (when the sender's ray actually met the
    // geometry) is already in shared scene/data space — see
    // RemoteAvatarController._toScenePose — so it is used verbatim as the ray's
    // far end. Terminating there instead of at a fixed RAY_LENGTH is what makes
    // two users agree on the point being discussed.
    const hit = pose.pointerHit || null;
    if (pose.pointer?.visible && pose.pointer?.origin && pose.pointer?.direction) {
      const { x: ox, y: oy, z: oz } = pose.pointer.origin;
      const { x: dx, y: dy, z: dz } = pose.pointer.direction;
      const lineSource = this._pointerLineSource;
      lineSource.setPoint1(ox, oy, oz);
      if (hit) {
        lineSource.setPoint2(hit.x, hit.y, hit.z);
      } else {
        lineSource.setPoint2(ox + dx * RAY_LENGTH, oy + dy * RAY_LENGTH, oz + dz * RAY_LENGTH);
      }
      this._pointerRayActor.setVisibility(true);

      if (hit) {
        this._hitMarkerActor.setPosition(hit.x, hit.y, hit.z);
        // Constant apparent size: the sphere source is authored at
        // HIT_MARKER_RADIUS_M physical metres, and scene units are physical
        // metres divided by the local viewer's vrScale. Same `s` as the body
        // above — they must agree or the dot detaches from the pointing hand.
        this._hitMarkerActor.setScale(s, s, s);
        this._hitMarkerActor.setVisibility(true);
      } else {
        this._hitMarkerActor.setVisibility(false);
      }
    } else {
      this._pointerRayActor.setVisibility(false);
      this._hitMarkerActor.setVisibility(false);
    }
  }

  /**
   * Orient the label toward a scene-space point (local user's head).
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  faceLabelToward(x, y, z) {
    this._label.faceToward(x, y, z);
  }

  /** @param {boolean} speaking */
  setSpeaking(speaking) {
    if (this._speaking === speaking) return;
    this._speaking = speaking;
    this._label.setSpeaking(speaking);
    // Pulse head opacity as subtle speaking cue
    this._headActor.getProperty().setOpacity(speaking ? 1.0 : 0.9);
  }

  /**
   * Mark this avatar as the one currently changing the shared data.
   *
   * Driven at PRESENCE rate (AvatarNetworkSync.sendLocalPresence →
   * RemoteAvatarController.receivePresence), never per frame: the halo is a
   * pre-built actor whose visibility flips, and the label repaints only on an
   * actual change, so the cost of a manipulation starting or stopping is one
   * canvas repaint — not a per-frame draw.
   *
   * @param {string|null} target - e.g. 'dataset' | 'filter'; null clears it
   */
  setActivity(target) {
    const next = target || null;
    if (this._activity === next) return;
    this._activity = next;
    this._activityHaloActor?.setVisibility(!!next);
    this._label.setActivity(next);
  }

  setVisible(visible) {
    for (const a of this._actors) a.setVisibility(visible);
    // The halo is conditional on activity, so a blanket show must not reveal
    // it for an idle avatar.
    this._activityHaloActor?.setVisibility(visible && !!this._activity);
    this._label.setVisible(visible);
  }

  /** Remove all VTK actors from renderer. */
  dispose(renderer) {
    const r = renderer || this._renderer;
    for (const a of this._actors) r?.removeActor(a);
    this._label.dispose(r);
    this._actors = [];
    this._headActor = null;
    this._leftHandActor = null;
    this._rightHandActor = null;
    this._pointerRayActor = null;
    this._pointerLineSource = null;
    this._hitMarkerActor = null;
    this._activityHaloActor = null;
    this._activity = null;
  }

  // ---------------------------------------------------------------------------

  _makeSphere(radius, r, g, b, opacity = 1.0) {
    const source = vtkSphereSource.newInstance({
      radius,
      phiResolution: 14,
      thetaResolution: 14,
    });
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(source.getOutputPort());
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(r, g, b);
    actor.getProperty().setOpacity(opacity);
    return actor;
  }

  _makeRay(r, g, b) {
    const lineSource = vtkLineSource.newInstance({
      point1: [0, 0, 0],
      point2: [0, 0, -RAY_LENGTH],
    });
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(lineSource.getOutputPort());
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.getProperty().setColor(r, g, b);
    actor.getProperty().setOpacity(0.55);
    actor.getProperty().setLineWidth(2);
    // See the constructor: the source cannot live on the frozen actor.
    this._pointerLineSource = lineSource;
    return actor;
  }

}

export default SimpleAvatarFallback;
