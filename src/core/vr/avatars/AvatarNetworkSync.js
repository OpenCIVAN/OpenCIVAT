// src/core/vr/avatars/AvatarNetworkSync.js
// Y.js adapter for the avatar system.
//
// RESPONSIBILITIES:
// - Metadata sync (avatarUrl, isSpeaking, displayName, color) via yAvatars map
// - Remote pose reception via cia:vr-participant-update custom event
//   (pose is already sent by VRParticipantSync — do NOT duplicate that path)
// - Remote leave detection via cia:vr-participant-left custom event
//
// What this does NOT do:
// - Send pose data (VRParticipantSync owns that)
// - Create Y.js maps (yjsSetup.js owns that)

import { vr as log } from '@Utils/logger.js';
import {
  yAvatars,
  syncAvatarToYjs,
} from '@Collaboration/yjs/yjsSetup.js';
import { getUserId } from '@Collaboration/presence/userManagement.js';

export class AvatarNetworkSync {
  constructor() {
    this._remotePoseCb = null;
    this._remotePresenceCb = null;
    this._remoteLeaveCb = null;

    this._yjsObserverCleanup = null;
    this._updateEventHandler = null;
    this._leaveEventHandler = null;

    this._localUserId = null;
    this._lastSentPresence = null;
  }

  /**
   * Start listening for remote avatar events.
   */
  initialize() {
    this._localUserId = getUserId();

    // Remote POSE updates arrive as custom window events dispatched by VRParticipantSync
    this._updateEventHandler = (e) => this._onParticipantUpdate(e.detail);
    this._leaveEventHandler = (e) => this._onParticipantLeft(e.detail);
    window.addEventListener('cia:vr-participant-update', this._updateEventHandler);
    window.addEventListener('cia:vr-participant-left', this._leaveEventHandler);

    // Remote PRESENCE (metadata) via Y.js avatar map
    const observer = (event) => {
      const myId = this._localUserId;
      event.changes.keys.forEach((change, userId) => {
        if (userId === myId) return;
        const data = yAvatars.get(userId);
        if (!data) return;
        try {
          this._remotePresenceCb?.(userId, data);
        } catch (err) {
          log.error('AvatarNetworkSync presence callback error:', err);
        }
      });
    };
    yAvatars.observe(observer);
    this._yjsObserverCleanup = () => yAvatars.unobserve(observer);

    // Replay whatever is ALREADY in the map. Y.Map.observe fires only on
    // CHANGES, so a peer who joined before us and has no reason to rewrite
    // their entry would never deliver their displayName/color — and
    // AvatarManager._onRemotePose then falls back to a truncated hex user id
    // in default grey. Whoever enters the session second is exactly the case
    // that hits this, i.e. it shows up the moment a second headset joins.
    this._replayPresenceSnapshot();

    log.debug('AvatarNetworkSync initialized');
  }

  /**
   * Deliver the current yAvatars contents to the presence callback, as though
   * each entry had just changed. Called once at initialize().
   * @private
   */
  _replayPresenceSnapshot() {
    const myId = this._localUserId;
    let replayed = 0;
    yAvatars.forEach((data, userId) => {
      if (!data || userId === myId) return;
      try {
        this._remotePresenceCb?.(userId, data);
        replayed += 1;
      } catch (err) {
        log.error('AvatarNetworkSync presence snapshot error:', err);
      }
    });
    if (replayed > 0) {
      log.debug(`AvatarNetworkSync: replayed ${replayed} existing avatar presence entries`);
    }
  }

  /**
   * Broadcast local user avatar metadata (not pose).
   *
   * `sessionId` is carried because `yAvatars` is ROOM-global, not session-
   * scoped: without it, a peer exploring a different VR session in the same
   * room shows up as an avatar in your scene. AvatarManager._onRemotePresence
   * filters on it.
   *
   * `activity` ('dataset' | 'filter' | null) rides here rather than on the pose
   * channel deliberately: who is manipulating changes a few times a minute, and
   * this method already short-circuits on an unchanged payload, so it costs one
   * Y.js write per transition instead of one per frame at the pose rate.
   *
   * @param {{ avatarUrl?: string, displayName: string, color: string,
   *   isSpeaking?: boolean, sessionId?: string|null,
   *   activity?: string|null }} state
   */
  sendLocalPresence(state) {
    const userId = this._localUserId;
    if (!userId) return;

    // Skip if nothing changed
    const serialized = JSON.stringify(state);
    if (serialized === this._lastSentPresence) return;
    this._lastSentPresence = serialized;

    syncAvatarToYjs(userId, {
      displayName: state.displayName,
      color: state.color,
      avatarUrl: state.avatarUrl || null,
      isSpeaking: state.isSpeaking || false,
      sessionId: state.sessionId || null,
      activity: state.activity || null,
    });
  }

  /**
   * Register callback for remote pose updates.
   * @param {function(string, import('./AvatarTypes.js').AvatarPose): void} callback
   */
  onRemotePose(callback) {
    this._remotePoseCb = callback;
  }

  /**
   * Register callback for remote presence/metadata updates.
   * @param {function(string, object): void} callback
   */
  onRemotePresence(callback) {
    this._remotePresenceCb = callback;
  }

  /**
   * Register callback for when a remote user leaves.
   * @param {function(string): void} callback
   */
  onRemoteLeave(callback) {
    this._remoteLeaveCb = callback;
  }

  dispose() {
    window.removeEventListener('cia:vr-participant-update', this._updateEventHandler);
    window.removeEventListener('cia:vr-participant-left', this._leaveEventHandler);
    this._yjsObserverCleanup?.();
    this._remotePoseCb = null;
    this._remotePresenceCb = null;
    this._remoteLeaveCb = null;
    this._lastSentPresence = null;
    log.debug('AvatarNetworkSync disposed');
  }

  // ---------------------------------------------------------------------------

  _onParticipantUpdate(detail) {
    const userId = detail?.odUserId;
    if (!userId || userId === this._localUserId) return;

    const data = detail?.data;
    if (!data) return;

    // Reconstruct AvatarPose from VRParticipantSync serialized format
    const pose = this._toPose(data);
    if (pose) {
      try {
        this._remotePoseCb?.(userId, pose);
      } catch (err) {
        log.error('AvatarNetworkSync pose callback error:', err);
      }
    }
  }

  _onParticipantLeft(detail) {
    const userId = detail?.odUserId;
    if (!userId || userId === this._localUserId) return;
    try {
      this._remoteLeaveCb?.(userId);
    } catch (err) {
      log.error('AvatarNetworkSync leave callback error:', err);
    }
  }

  /**
   * Convert VRParticipantSync serialized data to AvatarPose.
   * @private
   */
  _toPose(data) {
    if (!data.headPose?.position) return null;

    const toLimb = (p, visible) => ({
      position: p?.position || null,
      orientation: p?.orientation || null,
      visible: !!(visible && p?.position),
    });

    // Pointer origin/direction ride in the SENDER's XR metres, exactly like the
    // limb poses above — RemoteAvatarController._toScenePose converts them with
    // the sender's vrScale/vrOrigin. A pointer missing either half is not
    // renderable as a ray, so it is reported invisible rather than half-built.
    const ptr = data.pointer;
    const pointer =
      ptr?.origin && ptr?.direction
        ? {
            origin: ptr.origin,
            direction: ptr.direction,
            hand: ptr.hand === 'left' ? 'left' : 'right',
            visible: ptr.visible !== false,
          }
        : { origin: null, direction: null, visible: false };

    return {
      head: toLimb(data.headPose, true),
      leftHand: toLimb(data.leftHandPose, true),
      rightHand: toLimb(data.rightHandPose, true),
      pointer,
      // The surface hit is NOT in the sender's XR space: it is a point on the
      // shared geometry, already in data space and identical for every viewer.
      // Passed straight through, and deliberately NOT re-transformed downstream.
      pointerHit: data.pointerHit || null,
      timestamp: data.timestamp || Date.now(),
      // Sender's own vrScale/vrOrigin — the poses above are in THIS
      // sender's physical XR space, and must be converted to data space
      // using their transform, not the local viewer's own.
      vrScale: typeof data.vrScale === 'number' ? data.vrScale : 1.0,
      vrOrigin: Array.isArray(data.vrOrigin) ? data.vrOrigin : [0, 0, 0],
    };
  }
}

export default AvatarNetworkSync;
