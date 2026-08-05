// src/core/vr/avatars/RemoteAvatarController.js
// Manages a single remote user's avatar in the VR scene.
// Handles visual representation, pose interpolation, stale detection,
// and VR-space → scene-space coordinate transform.

import { vr as log } from '@Utils/logger.js';
import { SimpleAvatarFallback } from './SimpleAvatarFallback.js';
import { VRMAvatar } from './VRMAvatar.js';

const STALE_TIMEOUT_MS = 5000;
const LERP_ALPHA = 0.22; // per-frame interpolation factor at 90fps (~100ms settle)

export class RemoteAvatarController {
  /**
   * @param {import('./AvatarTypes.js').AvatarUserInfo} userInfo
   */
  constructor(userInfo) {
    this._userInfo = userInfo;
    this._renderer = null;
    this._vrContext = null; // local viewer's vrContext; NOT used for pose conversion (see _toScenePose)

    this._avatar = null;    // SimpleAvatarFallback or VRMAvatar
    this._usingVRM = false;

    this._targetPose = null;  // latest received pose (VR space)
    this._smoothPose = null;  // current interpolated pose (scene space)

    this._lastUpdateTime = 0;
    this._stale = false;
    this._visible = true;
  }

  /**
   * @param {object} renderer - VTK.js renderer
   * @param {object} vrContext - local viewer's vrContext, kept for future use;
   *   pose placement uses the REMOTE user's own vrScale/vrOrigin instead (see
   *   _toScenePose)
   */
  initialize(renderer, vrContext) {
    this._renderer = renderer;
    this._vrContext = vrContext;

    this._avatar = new SimpleAvatarFallback();
    this._avatar.create(renderer, this._userInfo);

    log.debug('RemoteAvatarController initialized for:', this._userInfo.userId);
  }

  /**
   * Receive a new pose update from the network (VR space positions).
   * @param {import('./AvatarTypes.js').AvatarPose} pose
   */
  receivePose(pose) {
    this._targetPose = pose;
    this._lastUpdateTime = Date.now();

    if (this._stale) {
      this._stale = false;
      this._avatar.setVisible(true);
    }
  }

  /**
   * Receive presence metadata (speaking state, avatarUrl, etc.)
   * @param {import('./AvatarTypes.js').AvatarPresenceState} state
   */
  receivePresence(state) {
    if (state.speaking !== undefined) {
      this._avatar.setSpeaking(!!state.speaking);
    }

    // Who is changing the shared data. Guarded on the method's presence: the
    // VRM avatar path has no halo/badge, and an older peer's payload has no
    // `activity` field at all — in both cases the marker simply doesn't show.
    if (state.activity !== undefined) {
      this._avatar.setActivity?.(state.activity || null);
    }

    const newUrl = state.userInfo?.avatarUrl;
    if (newUrl && newUrl !== this._userInfo.avatarUrl) {
      this._userInfo = { ...this._userInfo, avatarUrl: newUrl };
      this._loadVRMAvatar(newUrl);
    }
  }

  /**
   * Called every frame by AvatarManager.
   * @param {number} deltaTime - seconds since last frame
   * @param {number[]} localHeadScenePos - [x, y, z] local user head in scene space
   */
  update(deltaTime, localHeadScenePos) {
    const now = Date.now();

    // Stale check
    if (this._lastUpdateTime && now - this._lastUpdateTime > STALE_TIMEOUT_MS) {
      if (!this._stale) {
        this._stale = true;
        this._avatar.setVisible(false);
        log.debug('RemoteAvatar stale:', this._userInfo.userId);
      }
      return;
    }

    if (!this._targetPose) return;

    // Interpolate toward target
    this._smoothPose = this._interpolate(this._smoothPose, this._targetPose, deltaTime);

    // Transform VR space → scene space
    const scenePose = this._toScenePose(this._smoothPose);

    // The LOCAL viewer's vrScale (not the sender's) — the avatar uses it only
    // to keep the surface-hit marker a constant apparent size for THIS viewer.
    this._avatar.updatePose(scenePose, this._vrContext?.vrScale || 1);

    // Orient label to face local user
    if (localHeadScenePos) {
      this._avatar.faceLabelToward(...localHeadScenePos);
    }
  }

  /**
   * Switch to a VRM avatar from a URL.
   * Falls back to SimpleAvatarFallback on failure.
   * @param {string} url
   */
  async _loadVRMAvatar(url) {
    if (this._usingVRM) return;

    const vrm = new VRMAvatar();
    vrm.onFail((err) => {
      log.warn('VRM load failed for remote user, keeping fallback:', err.message);
      vrm.dispose(this._renderer);
    });
    vrm.onLoad(() => {
      // Swap out the fallback
      this._avatar.dispose(this._renderer);
      this._avatar = vrm;
      this._usingVRM = true;
    });

    await vrm.load(url, this._userInfo, this._renderer);
  }

  dispose() {
    this._avatar?.dispose(this._renderer);
    this._avatar = null;
  }

  // ---------------------------------------------------------------------------

  /**
   * Lerp position, slerp orientation toward target.
   * @private
   */
  _interpolate(current, target, deltaTime) {
    if (!current) return this._clonePose(target);

    const alpha = Math.min(1, LERP_ALPHA + deltaTime * 3);

    return {
      head: this._interpLimb(current.head, target.head, alpha),
      leftHand: this._interpLimb(current.leftHand, target.leftHand, alpha),
      rightHand: this._interpLimb(current.rightHand, target.rightHand, alpha),
      pointer: target.pointer, // don't interpolate pointer — snappy is better
      pointerHit: target.pointerHit, // same: a lagging hit dot reads as wrong, not smooth
      timestamp: target.timestamp,
      // Sender's transform — always take the latest, no interpolation
      // (it changes in discrete steps via isolation/scale presets, not
      // something that benefits from smoothing like position does).
      vrScale: target.vrScale,
      vrOrigin: target.vrOrigin,
    };
  }

  _interpLimb(cur, tgt, alpha) {
    if (!cur?.position || !tgt?.position) return tgt;
    return {
      position: this._lerpVec3(cur.position, tgt.position, alpha),
      orientation: cur.orientation && tgt.orientation
        ? this._slerpQuat(cur.orientation, tgt.orientation, alpha)
        : tgt.orientation,
      visible: tgt.visible,
    };
  }

  _lerpVec3(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  _slerpQuat(a, b, t) {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    // Ensure shortest path
    const bFlip = dot < 0 ? { x: -b.x, y: -b.y, z: -b.z, w: -b.w } : b;
    dot = Math.abs(dot);

    if (dot > 0.9995) {
      // Very close — linear is fine
      return this._normalizeQuat({
        x: a.x + (bFlip.x - a.x) * t,
        y: a.y + (bFlip.y - a.y) * t,
        z: a.z + (bFlip.z - a.z) * t,
        w: a.w + (bFlip.w - a.w) * t,
      });
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);
    const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return {
      x: a.x * s0 + bFlip.x * s1,
      y: a.y * s0 + bFlip.y * s1,
      z: a.z * s0 + bFlip.z * s1,
      w: a.w * s0 + bFlip.w * s1,
    };
  }

  _normalizeQuat(q) {
    const len = Math.sqrt(q.x ** 2 + q.y ** 2 + q.z ** 2 + q.w ** 2) || 1;
    return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
  }

  /**
   * Convert a pose from WebXR local-floor space (meters) to VTK scene space.
   *
   * Uses the REMOTE USER's OWN vrScale/vrOrigin (carried on the pose since
   * AvatarNetworkSync._toPose), not this local viewer's this._vrContext —
   * each participant has an independent WebXR session/reference space, so
   * a remote user's head/hand positions are only meaningful once converted
   * through THEIR transform. Falls back to identity if a pose predates this
   * fields being broadcast.
   * @private
   */
  _toScenePose(pose) {
    if (!pose) return null;
    const vrScale = typeof pose.vrScale === 'number' ? pose.vrScale : 1.0;
    const vrOrigin = Array.isArray(pose.vrOrigin) ? pose.vrOrigin : [0, 0, 0];

    const toScene = (p) =>
      p
        ? {
            x: p.x / vrScale + vrOrigin[0],
            y: p.y / vrScale + vrOrigin[1],
            z: p.z / vrScale + vrOrigin[2],
          }
        : null;

    const toSceneLimb = (limb) =>
      limb
        ? { ...limb, position: toScene(limb.position) }
        : null;

    const toScenePointer = (ptr) => {
      if (!ptr) return null;
      return {
        ...ptr,
        origin: toScene(ptr.origin),
        // direction is a unit vector — no translation/scale needed
        direction: ptr.direction,
      };
    };

    return {
      head: toSceneLimb(pose.head),
      leftHand: toSceneLimb(pose.leftHand),
      rightHand: toSceneLimb(pose.rightHand),
      pointer: toScenePointer(pose.pointer),
      // pointerHit passes through UNTOUCHED — no /vrScale, no +vrOrigin. Unlike
      // head/hand/pointer.origin, it is not a point in the sender's physical XR
      // space: it is a point ON THE SHARED GEOMETRY, produced by the sender's
      // raycast against data-space actors, so it already IS scene space and is
      // numerically identical for every participant. Running it through toScene()
      // would offset every remote user's highlight by their own transform —
      // exactly the disagreement this feature exists to remove. (Mirrors the
      // `direction` note just above: not every field on a pose is XR-metric.)
      pointerHit: pose.pointerHit || null,
      timestamp: pose.timestamp,
    };
  }

  _clonePose(pose) {
    return JSON.parse(JSON.stringify(pose));
  }
}

export default RemoteAvatarController;
