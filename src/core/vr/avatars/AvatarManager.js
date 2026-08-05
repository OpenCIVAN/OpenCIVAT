// src/core/vr/avatars/AvatarManager.js
// Central coordinator for the VR avatar subsystem.
//
// One instance is created per VR exploration session and disposed when the
// session ends. VRExplorationManager drives the lifecycle.

import { vr as log } from '@Utils/logger.js';
import { getUserId, getUserName, getUserColor } from '@Collaboration/presence/userManagement.js';
import { LocalAvatarController } from './LocalAvatarController.js';
import { RemoteAvatarController } from './RemoteAvatarController.js';
import { AvatarNetworkSync } from './AvatarNetworkSync.js';
import { VRMAvatar } from './VRMAvatar.js';

export class AvatarManager {
  constructor() {
    this._renderer = null;
    this._session = null;
    this._vrContext = null;

    this._localController = new LocalAvatarController();
    this._networkSync = new AvatarNetworkSync();
    this._remotes = new Map(); // userId -> RemoteAvatarController

    this._localUserInfo = null;
    this._localAvatarUrl = null;
    this._enabled = true;
    // yAvatars is ROOM-global, not per VR session — see _onRemotePresence.
    this._sessionId = null;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Initialize the avatar system for an active VR session.
   *
   * @param {object} renderer - VTK.js renderer (from vrContext.sceneObjects.renderer)
   * @param {object} session - VRExplorationSession
   * @param {object} vrContext - Live vrContext from VRExplorationManager
   *   (vrContext.vrScale and vrContext.vrOrigin are updated in-place each frame)
   */
  initialize(renderer, session, vrContext) {
    this._renderer = renderer;
    this._session = session;
    this._vrContext = vrContext;
    this._sessionId = session?.id || null;

    this._localUserInfo = {
      userId: getUserId(),
      displayName: getUserName(),
      color: getUserColor(),
      avatarUrl: this._localAvatarUrl,
      isSpeaking: false,
      // 'dataset' | 'filter' | null — see setLocalActivity.
      activity: null,
      isLocal: true,
    };

    // Wire network sync callbacks
    this._networkSync.onRemotePose((userId, pose) => this._onRemotePose(userId, pose));
    this._networkSync.onRemotePresence((userId, state) => this._onRemotePresence(userId, state));
    this._networkSync.onRemoteLeave((userId) => this.removeRemoteUser(userId));
    this._networkSync.initialize();

    // Broadcast local metadata so remotes can show our name/color/url
    this._broadcastPresence();

    // Add any participants that were already in the session when we joined.
    //
    // This used to guard on `session.getParticipants` — a method
    // VRExplorationSession does not have (the array is `session.participants`;
    // the query helpers are getVRParticipants()/getDesktopParticipants()). The
    // whole branch was dead, so a joiner created ZERO remote controllers here
    // and only materialised peers when their first pose packet happened to
    // land — up to a full send interval of an empty room, and forever if a peer
    // was idle enough not to be sending.
    for (const p of Array.isArray(session?.participants) ? session.participants : []) {
      if (!p?.odUserId || p.odUserId === this._localUserInfo.userId) continue;
      this.addRemoteUser({
        userId: p.odUserId,
        displayName: p.userName,
        color: p.userColor,
      });
    }

    log.info('AvatarManager initialized for session:', session?.id);
  }

  /**
   * Update avatars for the current frame.
   * Called by VRExplorationManager._onFrame() after gathering inputState.
   *
   * @param {number} deltaTime - seconds since last frame
   * @param {object} inputState - from VRExplorationManager._gatherInputState()
   */
  update(deltaTime, inputState) {
    if (!this._enabled) return;

    // Extract and throttle local pose
    this._localController.update(inputState);

    // Compute local head position in scene space for label orientation
    const localPose = this._localController.getLatestPose();
    let localHeadScene = null;
    if (localPose?.head?.position) {
      const { x, y, z } = localPose.head.position;
      const { vrScale = 1, vrOrigin = [0, 0, 0] } = this._vrContext || {};
      localHeadScene = [
        x / vrScale + vrOrigin[0],
        y / vrScale + vrOrigin[1],
        z / vrScale + vrOrigin[2],
      ];
    }

    // Update all remote avatars
    for (const remote of this._remotes.values()) {
      remote.update(deltaTime, localHeadScene);
    }
  }

  /**
   * Set the local user's VRM avatar URL.
   * Pass null to revert to procedural fallback.
   * @param {string|null} url
   */
  setLocalAvatarUrl(url) {
    this._localAvatarUrl = url;
    if (this._localUserInfo) {
      this._localUserInfo.avatarUrl = url;
      this._broadcastPresence();
    }
  }

  /**
   * Set the local user's speaking state and re-broadcast presence so remote
   * clients pulse this user's avatar head. No-op if unchanged.
   * @param {boolean} speaking
   */
  setLocalSpeaking(speaking) {
    if (!this._localUserInfo) return;
    if (this._localUserInfo.isSpeaking === speaking) return;
    this._localUserInfo.isSpeaking = speaking;
    this._broadcastPresence();
  }

  /**
   * Mark this user as the one currently changing the shared data, so every
   * other headset sees a halo + "EDITING" badge on their avatar.
   *
   * Called from VRExplorationManager._signalManipulation (and its idle timer),
   * i.e. at manipulation-event rate — NOT per frame. No-op if unchanged, and
   * sendLocalPresence additionally drops an unchanged payload, so a stream of
   * repeated signals costs nothing on the wire.
   *
   * @param {string|null} target - 'dataset' | 'filter' | null
   */
  setLocalActivity(target) {
    if (!this._localUserInfo) return;
    const next = target || null;
    if (this._localUserInfo.activity === next) return;
    this._localUserInfo.activity = next;
    this._broadcastPresence();
  }

  /**
   * Broadcast the full current local metadata (name/color/url/isSpeaking) so no
   * individual field update clobbers the others.
   * @private
   */
  _broadcastPresence() {
    if (!this._localUserInfo) return;
    this._networkSync.sendLocalPresence({
      displayName: this._localUserInfo.displayName,
      color: this._localUserInfo.color,
      avatarUrl: this._localUserInfo.avatarUrl || null,
      isSpeaking: this._localUserInfo.isSpeaking || false,
      sessionId: this._sessionId,
      activity: this._localUserInfo.activity || null,
    });
  }

  /**
   * @param {import('./AvatarTypes.js').AvatarUserInfo} userInfo
   */
  addRemoteUser(userInfo) {
    if (this._remotes.has(userInfo.userId)) return;

    const controller = new RemoteAvatarController(userInfo);
    controller.initialize(this._renderer, this._vrContext);
    this._remotes.set(userInfo.userId, controller);

    log.debug('Remote avatar added:', userInfo.userId, userInfo.displayName);
  }

  /**
   * @param {string} userId
   */
  removeRemoteUser(userId) {
    const controller = this._remotes.get(userId);
    if (!controller) return;
    controller.dispose();
    this._remotes.delete(userId);
    log.debug('Remote avatar removed:', userId);
  }

  setEnabled(enabled) {
    this._enabled = enabled;
    for (const remote of this._remotes.values()) {
      remote._avatar?.setVisible(enabled);
    }
  }

  dispose() {
    for (const remote of this._remotes.values()) remote.dispose();
    this._remotes.clear();
    this._localController.dispose();
    this._networkSync.dispose();
    this._renderer = null;
    this._session = null;
    this._vrContext = null;
    this._sessionId = null;
    log.debug('AvatarManager disposed');
  }

  // ===========================================================================
  // PRIVATE
  // ===========================================================================

  _onRemotePose(userId, pose) {
    let controller = this._remotes.get(userId);
    if (!controller) {
      // Auto-create avatar for new remote user (metadata arrives later via yAvatars)
      controller = new RemoteAvatarController({
        userId,
        displayName: userId.slice(0, 8),
        color: '#888888',
      });
      controller.initialize(this._renderer, this._vrContext);
      this._remotes.set(userId, controller);
    }
    controller.receivePose(pose);
  }

  _onRemotePresence(userId, data) {
    // yAvatars is the ROOM-global avatar map, not a per-session one: a peer
    // exploring a DIFFERENT VR session on the same view/room writes into it
    // too, and would otherwise be spawned into our scene. Only reject on a
    // positive mismatch — a peer that predates the sessionId field (or a
    // session with no id yet) still gets an avatar rather than vanishing.
    if (this._sessionId && data?.sessionId && data.sessionId !== this._sessionId) {
      return;
    }

    let controller = this._remotes.get(userId);
    if (!controller) {
      this.addRemoteUser({
        userId,
        displayName: data.displayName || userId.slice(0, 8),
        color: data.color || '#888888',
        avatarUrl: data.avatarUrl || null,
      });
      controller = this._remotes.get(userId);
    }

    controller?.receivePresence({
      userInfo: {
        userId,
        displayName: data.displayName,
        color: data.color,
        avatarUrl: data.avatarUrl,
      },
      speaking: data.isSpeaking || false,
      activity: data.activity || null,
    });
  }
}

export default AvatarManager;
