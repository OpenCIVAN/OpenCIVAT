// src/services/followService.js
// Follow-user service — mirror a collaborator's viewpoint onto the local view.
//
// Two follow targets:
//  1. Desktop target: apply the followed user's broadcast camera (from Y.js
//     yCameras, surfaced via yjsObservers.onCameraChange) to the local active
//     instance's camera.
//  2. VR target (first-person spectate): if the followed user publishes a VR
//     head pose (surfaced via the 'cia:vr-participant-update' window event that
//     VRParticipantSync dispatches), derive a camera from position + orientation
//     quaternion and apply it. Falls back to broadcast-camera follow otherwise
//     (see note in _onVrParticipantUpdate).
//
// NO React imports. Singleton.

import { onCameraChange } from "@Collaboration/yjs/yjsObservers.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import cameraSharePolicy from "@Core/session/cameraSharePolicy.js";
import { sync as log } from "@Utils/logger.js";

// Window after a self-applied camera during which the 'cia:camera-changed'
// event is treated as a follow echo (not a user gesture) and does NOT unfollow.
const SELF_APPLY_SUPPRESS_MS = 300;

// Focal-point distance used when deriving a camera from a VR head pose.
const VR_FOCAL_DISTANCE = 1.0;

/**
 * Rotate a 3-vector by a unit quaternion. Pure helper (exported for tests).
 * Quaternion is { x, y, z, w }. Formula: v' = q * v * q⁻¹, expanded to the
 * standard v + 2*cross(q.xyz, cross(q.xyz, v) + w*v).
 * @param {[number, number, number]} v
 * @param {{x:number,y:number,z:number,w:number}} q
 * @returns {[number, number, number]}
 */
export function rotateVectorByQuaternion(v, q) {
  const [vx, vy, vz] = v;
  const { x, y, z, w } = q;

  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);

  // v' = v + w * t + cross(q.xyz, t)
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

class FollowService {
  constructor() {
    /** @type {string|null} */
    this._followedUserId = null;
    /** @type {string|null} */
    this._followedUserName = null;

    /** Timestamp (ms) of the most recent self-applied camera. */
    this._applyingAt = 0;

    /** @type {Set<(state: {followedUserId: string|null, userName: string|null}) => void>} */
    this._listeners = new Set();

    /** @type {(() => void)|null} */
    this._cameraUnsub = null;

    this._boundCameraChanged = this._onCameraChanged.bind(this);
    this._boundVrUpdate = this._onVrParticipantUpdate.bind(this);
    this._boundFollowUser = this._onFollowUserEvent.bind(this);
    this._boundSyncMode = this._onCameraSyncModeEvent.bind(this);

    this._wired = false;
  }

  /**
   * Wire up all subscriptions. Idempotent; safe to call from app init or lazily
   * on first follow(). Split out so tests can construct without side effects.
   */
  init() {
    if (this._wired) return;
    this._wired = true;

    // Real-time broadcast camera feed (desktop target).
    this._cameraUnsub = onCameraChange((update) =>
      this._onRemoteCamera(update)
    );

    if (typeof window !== "undefined") {
      window.addEventListener("cia:camera-changed", this._boundCameraChanged);
      window.addEventListener(
        "cia:vr-participant-update",
        this._boundVrUpdate
      );
      window.addEventListener("cia:follow-user", this._boundFollowUser);
      window.addEventListener("cia:camera-sync-mode", this._boundSyncMode);
    }

    log.debug("followService initialized");
  }

  /**
   * Tear down subscriptions (mainly for tests / hot reload).
   */
  dispose() {
    if (this._cameraUnsub) {
      this._cameraUnsub();
      this._cameraUnsub = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "cia:camera-changed",
        this._boundCameraChanged
      );
      window.removeEventListener(
        "cia:vr-participant-update",
        this._boundVrUpdate
      );
      window.removeEventListener("cia:follow-user", this._boundFollowUser);
      window.removeEventListener("cia:camera-sync-mode", this._boundSyncMode);
    }
    this._wired = false;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Start following a user's viewpoint.
   * @param {string} userId
   * @param {{ userName?: string }} [opts]
   */
  follow(userId, opts = {}) {
    if (!userId) return;
    this.init();
    if (this._followedUserId === userId) return;

    this._followedUserId = userId;
    this._followedUserName = opts.userName || null;
    log.debug(`followService: now following ${userId}`);
    this._emit();
  }

  /**
   * Stop following.
   */
  unfollow() {
    if (!this._followedUserId) return;
    log.debug(`followService: stopped following ${this._followedUserId}`);
    this._followedUserId = null;
    this._followedUserName = null;
    this._emit();
  }

  /** @returns {string|null} */
  getFollowedUserId() {
    return this._followedUserId;
  }

  /**
   * @param {string} [userId] optional — check if following this specific user.
   * @returns {boolean}
   */
  isFollowing(userId) {
    if (userId) return this._followedUserId === userId;
    return this._followedUserId !== null;
  }

  /**
   * Subscribe to follow-state changes.
   * @param {(state: {followedUserId: string|null, userName: string|null}) => void} cb
   * @returns {() => void} unsubscribe
   */
  onChange(cb) {
    if (typeof cb !== "function") return () => {};
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  // -------------------------------------------------------------------------
  // Internal — remote camera application
  // -------------------------------------------------------------------------

  /**
   * Broadcast camera feed handler (desktop target).
   * @param {{ viewId: string, camera: object, userId: string }} update
   * @private
   */
  _onRemoteCamera(update) {
    if (!this._followedUserId) return;
    if (!update || update.userId !== this._followedUserId) return;
    if (!update.camera) return;
    this._applyCameraToActiveView(update.camera);
  }

  /**
   * VR participant pose feed handler (VR first-person spectate).
   *
   * VR-target resolution: rather than trying to discover the followed user's VR
   * session id (`vr-participants-{sessionId}` — only cleanly discoverable from
   * inside that session via VRExplorationManager), we consume the
   * 'cia:vr-participant-update' window event that VRParticipantSync already
   * dispatches for every remote participant. This crosses the VR-session
   * boundary without any coupling. If the followed user is NOT publishing a VR
   * head pose, this handler no-ops and the desktop broadcast-camera path above
   * remains the active fallback.
   * @param {CustomEvent} e
   * @private
   */
  _onVrParticipantUpdate(e) {
    if (!this._followedUserId) return;
    const detail = e?.detail;
    if (!detail || detail.odUserId !== this._followedUserId) return;

    const headPose = detail.data?.headPose;
    if (!headPose?.position || !headPose?.orientation) return;

    const camera = this._cameraFromHeadPose(headPose);
    if (camera) this._applyCameraToActiveView(camera);
  }

  /**
   * Derive a VTK camera from a serialized VR head pose.
   * position = headPose.position
   * focalPoint = position + rotate([0,0,-1], orientation) * distance
   * viewUp = rotate([0,1,0], orientation)
   * @param {{position:{x,y,z}, orientation:{x,y,z,w}}} headPose
   * @returns {object|null}
   * @private
   */
  _cameraFromHeadPose(headPose) {
    try {
      const p = headPose.position;
      const q = headPose.orientation;
      const position = [p.x, p.y, p.z];

      const forward = rotateVectorByQuaternion([0, 0, -1], q);
      const up = rotateVectorByQuaternion([0, 1, 0], q);

      const focalPoint = [
        position[0] + forward[0] * VR_FOCAL_DISTANCE,
        position[1] + forward[1] * VR_FOCAL_DISTANCE,
        position[2] + forward[2] * VR_FOCAL_DISTANCE,
      ];

      return { position, focalPoint, viewUp: up };
    } catch (err) {
      log.warn("followService: failed to derive camera from head pose", err);
      return null;
    }
  }

  /**
   * Apply a camera to the local active instance via the handler's
   * applySharedState. Sets the self-apply timestamp + policy follow-override so
   * the personal-mode apply guard lets this through.
   * @param {object} camera
   * @private
   */
  _applyCameraToActiveView(camera) {
    const inst = workspaceManager?.getActiveInstance?.();
    if (!inst?.handler || !inst?.instanceData) return;
    if (typeof inst.handler.applySharedState !== "function") return;

    this._applyingAt = Date.now();
    cameraSharePolicy.setFollowOverride(true);
    try {
      inst.handler.applySharedState(
        inst.instanceData,
        { camera },
        this._followedUserId
      );
    } catch (err) {
      log.warn("followService: failed to apply followed camera", err);
    } finally {
      cameraSharePolicy.setFollowOverride(false);
    }
  }

  // -------------------------------------------------------------------------
  // Internal — auto-unfollow
  // -------------------------------------------------------------------------

  /**
   * The instance handler dispatches 'cia:camera-changed' ~100ms after any
   * camera change, including follow-applied ones (that path is NOT covered by
   * the handler's _isApplyingRemoteState echo guard). We treat a change within
   * SELF_APPLY_SUPPRESS_MS of a self-apply as an echo; anything later is a real
   * user gesture and triggers auto-unfollow.
   * @private
   */
  _onCameraChanged() {
    if (!this._followedUserId) return;
    if (Date.now() - this._applyingAt <= SELF_APPLY_SUPPRESS_MS) return;
    log.debug("followService: user moved own camera — auto-unfollow");
    this.unfollow();
  }

  // -------------------------------------------------------------------------
  // Internal — window CustomEvent contracts (from CursorsTab)
  // -------------------------------------------------------------------------

  /**
   * 'cia:follow-user' — detail: { userId, action: 'start' } | { action: 'stop' }.
   * @param {CustomEvent} e
   * @private
   */
  _onFollowUserEvent(e) {
    const detail = e?.detail || {};
    if (detail.action === "stop") {
      this.unfollow();
      return;
    }
    if (!detail.userId) return;
    // Toggle: following the same user again stops following.
    if (this._followedUserId === detail.userId) {
      this.unfollow();
    } else {
      this.follow(detail.userId, { userName: detail.userName });
    }
  }

  /**
   * 'cia:camera-sync-mode' — detail: { mode }. mode 'follow' is a no-op here
   * (follow target comes from 'cia:follow-user'); any other mode maps onto the
   * camera share policy: 'independent'/'personal' → personal, else shared.
   * @param {CustomEvent} e
   * @private
   */
  _onCameraSyncModeEvent(e) {
    const mode = e?.detail?.mode;
    if (!mode || mode === "follow") return;
    const personal = mode === "independent" || mode === "personal";
    cameraSharePolicy.setCameraShared(!personal);
  }

  // -------------------------------------------------------------------------

  /** @private */
  _emit() {
    const state = {
      followedUserId: this._followedUserId,
      userName: this._followedUserName,
    };
    this._listeners.forEach((cb) => {
      try {
        cb(state);
      } catch {
        // never let a listener break the emit loop
      }
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cia:following-changed", { detail: state })
      );
    }
  }
}

export const followService = new FollowService();
export default followService;
