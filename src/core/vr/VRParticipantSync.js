// src/core/vr/VRParticipantSync.js
// Synchronizes participant states via Y.js for real-time presence

import { vr as log } from '@Utils/logger.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';
import { getUserId } from '@Collaboration/presence/userManagement.js';

/**
 * Pose broadcast period. 20 Hz.
 *
 * BUDGET: 4 users x 20 Hz x ~400 B of serialized pose ≈ 32 kB/s of Y.js
 * traffic — comfortable on a LAN, and the payload is small enough that adding
 * the pointer (~9 more numbers) does not change the order of magnitude.
 *
 * COUPLED CONSTANT: RemoteAvatarController's LERP_ALPHA = 0.22 settles a pose
 * in roughly 100 ms at 90 fps, which is ~2 send intervals — smoothing that just
 * covers the gap between packets without visible lag. Changing either number
 * alone desyncs the smoothing from the send rate: a slower send rate with the
 * same alpha snaps, a faster one wastes bandwidth on frames the LERP swallows.
 */
export const POSE_THROTTLE_MS = 50;

/**
 * A participant whose last write is older than this is treated as STALE:
 * greyed out in the roster and faded by the renderers, but still present.
 * Deliberately >2x the 5 s staleness the renderers use to fade an avatar.
 */
export const PARTICIPANT_STALE_MS = 10000;

/**
 * How long a participant may stay silent before we drop them entirely.
 *
 * A graceful exit does NOT wait for this: leaving VR deletes the peer's own
 * key (see stop()/rekey()), which every other client sees as a Y.js 'delete'
 * and handles immediately. This timeout is only the backstop for an UNGRACEFUL
 * departure — crash, headset sleep, browser killed — which leaves the key
 * behind with nobody to remove it.
 *
 * It used to be PARTICIPANT_STALE_MS, i.e. a peer was destroyed after 10 s of
 * silence. That is well within a normal hiccup once traffic runs over a tunnel
 * or a congested LAN: the avatar's actors were torn down and the roster row
 * vanished, then both were rebuilt from scratch when the next pose packet
 * landed. Generous here because the cost of waiting is one greyed row, while
 * the cost of being wrong is a peer visibly popping out of the world.
 */
export const PARTICIPANT_GONE_MS = 60000;

/** How often the stale sweep may run (it walks the whole map). */
const STALE_SWEEP_INTERVAL_MS = 1000;

export class VRParticipantSync {
  constructor(session) {
    this._session = session;
    this._yParticipants = null;
    this._localUserId = getUserId();
    this._updateInterval = null;
    this._observers = [];
    this._throttleMs = POSE_THROTTLE_MS;
    this._lastUpdateTime = 0;
    this._lastSweepTime = 0;
    // Users we have already announced as stale — without this the sweep
    // re-dispatches a leave event every second for the same absent peer.
    this._staleNotified = new Set();
  }

  start() {
    // Get or create Y.js map for this session
    this._yParticipants = ydoc.getMap(`vr-participants-${this._session.id}`);

    // Set up observer for remote updates
    const observer = (event) => {
      event.changes.keys.forEach((change, odUserId) => {
        if (odUserId === this._localUserId) return;

        if (change.action === 'delete') {
          this._handleParticipantLeft(odUserId);
        } else {
          const data = this._yParticipants.get(odUserId);
          this._handleParticipantUpdate(odUserId, data);
        }
      });
    };

    this._yParticipants.observe(observer);
    this._observers.push(() => this._yParticipants.unobserve(observer));

    log.debug('VRParticipantSync started');
  }

  stop() {
    // Clear observers
    this._observers.forEach(cleanup => cleanup());
    this._observers = [];

    // Remove self from Y.js
    if (this._yParticipants) {
      this._yParticipants.delete(this._localUserId);
    }

    // Stop update interval
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }

    log.debug('VRParticipantSync stopped');
  }

  /**
   * Re-key onto a different Y.js session id (session convergence — see
   * VRExplorationManager.startExploration). Two clients can claim the shared
   * `vr-sessions` registry slot for the same view "simultaneously"; Y.js Map
   * last-writer-wins means only one sessionId survives, and every other
   * client has to abandon its own `vr-participants-<oldId>` map and move to
   * `vr-participants-<newId>` — otherwise it stays invisible to the winner.
   *
   * @param {string} newSessionId
   */
  rekey(newSessionId) {
    if (!newSessionId || newSessionId === this._session.id) return;

    // Remove our own entry from the OLD map before abandoning it — otherwise
    // a stale copy of us lingers there until PARTICIPANT_STALE_MS evicts it.
    if (this._yParticipants) {
      this._yParticipants.delete(this._localUserId);
    }

    // Same cleanup stop() does for observers, without touching the update
    // interval or re-logging "stopped" (this is a re-key, not a teardown).
    this._observers.forEach(cleanup => cleanup());
    this._observers = [];

    this._session.id = newSessionId;
    this.start();

    log.debug(`VRParticipantSync re-keyed to session ${newSessionId}`);
  }

  /**
   * Update local participant state (call every frame or throttled)
   */
  updateLocalState(state) {
    if (!this._yParticipants) return;

    // Throttle updates
    const now = Date.now();
    if (now - this._lastUpdateTime < this._throttleMs) {
      return;
    }
    this._lastUpdateTime = now;

    // Piggy-back the stale sweep on the (already throttled) send tick rather
    // than adding a second timer to the frame loop.
    if (now - this._lastSweepTime >= STALE_SWEEP_INTERVAL_MS) {
      this._lastSweepTime = now;
      this.sweepStaleParticipants(now);
    }

    const participant = this._session.getParticipant(this._localUserId);
    if (!participant) return;

    const data = {
      odUserId: this._localUserId,
      userName: participant.userName,
      userColor: participant.userColor,
      mode: participant.mode,
      vrScale: state.vrScale || participant.vrScale,
      // Data-space offset alongside vrScale so remote viewers can convert
      // this user's own-XR-space poses into the shared data-space frame
      // (each participant's WebXR reference space is physically distinct).
      vrOrigin: state.vrOrigin || participant.vrOrigin || [0, 0, 0],
      scaleVisibility: participant.scaleVisibility,
      timestamp: now,

      // Pose data
      headPose: state.headPose ? this._serializePose(state.headPose) : null,
      leftHandPose: state.leftHandPose ? this._serializePose(state.leftHandPose) : null,
      rightHandPose: state.rightHandPose ? this._serializePose(state.rightHandPose) : null,

      // Pointer ray. origin/direction are in THIS sender's XR metres, like the
      // poses above; the receiver converts them with the transform carried on
      // this same payload (RemoteAvatarController._toScenePose).
      pointer: this._serializePointer(state.pointer),
      // ...whereas pointerHit is the point where that ray met the SHARED
      // geometry. It is already in data space and identical for every viewer,
      // so it must never be re-transformed on receipt.
      pointerHit: this._serializePoint(state.pointerHit),

      // Cursor (for desktop participants)
      cursorPosition: state.cursorPosition || null,
      cursorTarget: state.cursorTarget || null,
    };

    this._yParticipants.set(this._localUserId, data);
  }

  /**
   * Broadcast participant metadata change
   */
  broadcastParticipant(participant) {
    if (!this._yParticipants) return;

    const existing = this._yParticipants.get(participant.odUserId) || {};
    this._yParticipants.set(participant.odUserId, {
      ...existing,
      mode: participant.mode,
      permissions: participant.permissions,
      vrScale: participant.vrScale,
      scaleVisibility: participant.scaleVisibility,
      controllingUserId: participant.controllingUserId,
      controlledByUserId: participant.controlledByUserId,
    });
  }

  /**
   * Get all remote participant states
   */
  getRemoteParticipants() {
    if (!this._yParticipants) return [];

    const participants = [];
    this._yParticipants.forEach((data, odUserId) => {
      if (odUserId !== this._localUserId) {
        participants.push({
          ...data,
          isStale: Date.now() - data.timestamp > 5000,
        });
      }
    });

    return participants;
  }

  /**
   * Get a specific participant's state
   */
  getParticipantState(odUserId) {
    if (!this._yParticipants) return null;
    return this._yParticipants.get(odUserId);
  }

  /**
   * Drop participants who have been silent longer than PARTICIPANT_GONE_MS.
   *
   * Silence between PARTICIPANT_STALE_MS and PARTICIPANT_GONE_MS is NOT a
   * removal: getRemoteParticipants() already reports isStale from the same
   * timestamps, so the roster greys the row (VRSpatialMenuModel disables stale
   * entries) and the avatar controller fades the body on its own timer. Both
   * recover instantly when packets resume, with no actor churn. Only a peer
   * that has gone quiet for a full minute — i.e. crashed rather than stalled —
   * is actually removed.
   *
   * LOCAL ONLY — deliberately does NOT delete the Y.js key. Every client runs
   * this sweep on the same shared map, so writing the delete here would have N
   * clients racing to remove the same entry (and re-broadcasting N identical
   * updates). Pruning the shared map is the session host's job.
   *
   * @param {number} [nowMs]
   * @returns {string[]} userIds newly reported as gone
   */
  sweepStaleParticipants(nowMs = Date.now()) {
    if (!this._yParticipants) return [];

    const evicted = [];
    this._yParticipants.forEach((data, odUserId) => {
      if (odUserId === this._localUserId) return;

      const timestamp = data?.timestamp || 0;
      if (nowMs - timestamp <= PARTICIPANT_GONE_MS) {
        // Present, or merely stale — either way still a participant. Re-arm
        // the one-shot notification.
        this._staleNotified.delete(odUserId);
        return;
      }
      if (this._staleNotified.has(odUserId)) return;

      this._staleNotified.add(odUserId);
      evicted.push(odUserId);
      this._handleParticipantLeft(odUserId);
    });

    return evicted;
  }

  _handleParticipantUpdate(odUserId, data) {
    if (!data) return;

    // upsert, NOT addParticipant: addParticipant removes-then-appends, which
    // resets joinedAt on every remote pose packet. Host promotion picks the
    // lowest joinedAt, so a resetting timestamp makes that ordering meaningless.
    const participant = this._session?.upsertParticipant?.(
      data.odUserId || odUserId,
      data.userName,
      data.userColor,
      data.mode
    );

    if (participant) {
      if (data.vrScale !== undefined) participant.vrScale = data.vrScale;
      if (data.scaleVisibility !== undefined) participant.scaleVisibility = data.scaleVisibility;
      participant.lastActiveAt = data.timestamp || Date.now();
    }

    // They wrote, so they are not gone — clear any stale eviction latch.
    this._staleNotified.delete(odUserId);

    // Dispatch event for renderers
    window.dispatchEvent(new CustomEvent('cia:vr-participant-update', {
      detail: { odUserId, data }
    }));
  }

  _handleParticipantLeft(odUserId) {
    this._session.removeParticipant(odUserId);

    window.dispatchEvent(new CustomEvent('cia:vr-participant-left', {
      detail: { odUserId }
    }));
  }

  /**
   * @param {{origin?:object, direction?:object, hand?:string}|null|undefined} pointer
   * @returns {{origin:object, direction:object, hand:'left'|'right', visible:boolean}|null}
   * @private
   */
  _serializePointer(pointer) {
    const origin = this._serializePoint(pointer?.origin);
    const direction = this._serializePoint(pointer?.direction);
    if (!origin || !direction) return null;

    return {
      origin,
      direction,
      hand: pointer.hand === 'left' ? 'left' : 'right',
      visible: true,
    };
  }

  /**
   * @param {{x:number,y:number,z:number}|null|undefined} p
   * @returns {{x:number,y:number,z:number}|null}
   * @private
   */
  _serializePoint(p) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
      return null;
    }
    return { x: p.x, y: p.y, z: p.z };
  }

  _serializePose(pose) {
    if (!pose) return null;

    return {
      position: pose.position ? {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
      } : null,
      orientation: pose.orientation ? {
        x: pose.orientation.x,
        y: pose.orientation.y,
        z: pose.orientation.z,
        w: pose.orientation.w,
      } : null,
    };
  }
}

export default VRParticipantSync;
