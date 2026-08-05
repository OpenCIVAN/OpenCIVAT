// src/core/vr/VRManipulationLock.js
// A single assignable "who may manipulate the shared data" token for a VR
// exploration session.
//
// WHY NOT VRControlManager: that manager models "a DESKTOP user puppeteers a
// VR user's viewpoint" (establishControl sets mode = DESKTOP_CONTROLLER). This
// is an orthogonal concern — nobody is driving anybody's camera here, we are
// deciding which ONE participant's clip/threshold/glyph/transform patches are
// allowed to reach visualizationSyncService. Folding the two together would
// mean a desktop controller implicitly owning data control, which is not what
// either feature means.
//
// Y.js map `vr-manipulation-<sessionId>`, exactly two keys:
//   "holder"   -> { holderUserId, holderUserName, grantedBy, grantedAt, heartbeat }
//   "requests" -> { [userId]: { userName, atMs } }
//
// Two keys rather than one-key-per-user because both are read as a whole on
// every change; a Y.js Map's last-writer-wins on a single key is precisely the
// arbitration we want for `holder` (two simultaneous grants converge on one
// winner for everybody, instead of two clients each believing they hold it).

import { vr as log } from '@Utils/logger.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';
import { getUserId, getUserName } from '@Collaboration/presence/userManagement.js';

/**
 * A holder whose heartbeat has not been refreshed within this window counts as
 * absent — their headset died, their tab froze, or they left without a clean
 * stop(). Deliberately well above the ~1 Hz heartbeat rate so a couple of
 * dropped ticks never vacate a live holder.
 */
export const MANIP_STALE_MS = 8000;

/** A pending "may I have control?" request older than this is dropped. */
export const REQUEST_TTL_MS = 30000;

/**
 * Floor on holder heartbeat writes. heartbeat() is safe to call every frame;
 * this is what keeps it off the Y.js wire at 72-90 Hz.
 */
export const HEARTBEAT_INTERVAL_MS = 1000;

const HOLDER_KEY = 'holder';
const REQUESTS_KEY = 'requests';

export class VRManipulationLock {
  /**
   * @param {{id: string, ownerUserId?: string, ownerUserName?: string}} session
   *   The live VRExplorationSession. Read (never written) for `id` — which
   *   keys the Y.js map — and `ownerUserId`, which decides who is the host.
   */
  constructor(session) {
    this._session = session;
    this._yLock = null;
    this._observers = [];
    /** @type {Set<Function>} */
    this._listeners = new Set();
    this._lastHeartbeatAt = 0;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  start() {
    this._yLock = ydoc.getMap(`vr-manipulation-${this._session.id}`);
    this._attachObserver();
    log.debug(`VRManipulationLock started on vr-manipulation-${this._session.id}`);
  }

  stop() {
    this._detachObserver();

    // Vacate rather than leave a holder record that every other client has to
    // wait MANIP_STALE_MS to time out. Requests we filed are dropped for the
    // same reason.
    try {
      if (this._yLock) {
        if (this.isHeldByMe()) this._yLock.delete(HOLDER_KEY);
        this._removeRequest(getUserId());
      }
    } catch (err) {
      log.warn(`VRManipulationLock stop failed: ${err?.message}`);
    }

    this._listeners.clear();
    this._yLock = null;
    this._lastHeartbeatAt = 0;
    log.debug('VRManipulationLock stopped');
  }

  /**
   * Re-key onto a different Y.js session id — same contract as
   * VRParticipantSync.rekey / VRControlManager.rekey (see
   * VRExplorationManager._watchVRSessionConvergence). The map is bound in
   * start(), so without this a client that lost the session-id claim race
   * would keep negotiating control on a map nobody else reads.
   *
   * Listeners registered via onChange() survive the re-key deliberately: the
   * subscriber (VRExplorationManager) is unaware the map moved.
   *
   * @param {string} newSessionId
   */
  rekey(newSessionId) {
    if (!newSessionId || newSessionId === this._session.id) return;

    // Vacate the OLD map first, exactly as VRParticipantSync does, so a stale
    // copy of us cannot squat there until MANIP_STALE_MS elapses.
    try {
      if (this._yLock && this.isHeldByMe()) this._yLock.delete(HOLDER_KEY);
      this._removeRequest(getUserId());
    } catch (err) {
      log.warn(`VRManipulationLock rekey cleanup failed: ${err?.message}`);
    }

    this._detachObserver();
    this._session.id = newSessionId;
    this._yLock = ydoc.getMap(`vr-manipulation-${newSessionId}`);
    this._lastHeartbeatAt = 0;
    this._attachObserver();
    this._notify();

    log.info(`VRManipulationLock re-keyed to session ${newSessionId}`);
  }

  /**
   * Subscribe to any holder/request change.
   * @param {(state: {holder: object|null, requests: Array<object>}) => void} cb
   * @returns {() => void} unsubscribe
   */
  onChange(cb) {
    if (typeof cb !== 'function') return () => {};
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  // ===========================================================================
  // READS
  // ===========================================================================

  /** @returns {boolean} true when the local user owns this session. */
  isHost() {
    return !!this._session?.ownerUserId && this._session.ownerUserId === getUserId();
  }

  /**
   * The LIVE holder, or null. A record whose heartbeat lapsed past
   * MANIP_STALE_MS reads as null here (the holder is treated as absent) —
   * this is a pure read, the reclaiming WRITE is host-only, see heartbeat().
   * @returns {{holderUserId:string, holderUserName:string, grantedBy:string,
   *   grantedAt:number, heartbeat:number}|null}
   */
  getHolder() {
    const raw = this._readHolder();
    if (!raw) return null;
    if (Date.now() - (raw.heartbeat || raw.grantedAt || 0) > MANIP_STALE_MS) return null;
    return raw;
  }

  /** @returns {boolean} the local user is the live holder. */
  isHeldByMe() {
    return this.getHolder()?.holderUserId === getUserId();
  }

  /**
   * May the local user push shared data changes right now?
   *
   * True when we hold the token, and ALSO true when nobody live holds it —
   * an unheld session behaves exactly as it did before this feature existed,
   * so a session whose host never claimed (or whose host vanished before a
   * reclaim landed) is never bricked for everyone.
   * @returns {boolean}
   */
  canManipulate() {
    const holder = this.getHolder();
    if (!holder) return true;
    return holder.holderUserId === getUserId();
  }

  /**
   * Pending control requests, expired ones filtered out.
   * @returns {Array<{userId:string, userName:string, atMs:number}>}
   */
  getRequests() {
    const map = this._readRequests();
    const now = Date.now();
    return Object.entries(map)
      .filter(([, r]) => r && now - (r.atMs || 0) <= REQUEST_TTL_MS)
      .map(([userId, r]) => ({ userId, userName: r.userName || userId, atMs: r.atMs || 0 }))
      .sort((a, b) => a.atMs - b.atMs);
  }

  // ===========================================================================
  // WRITES
  // ===========================================================================

  /**
   * The host takes the token. Called once on session start, and again by
   * heartbeat() when the current holder goes stale.
   * @returns {boolean} whether the write happened
   */
  claimAsHost() {
    if (!this._yLock || !this.isHost()) return false;
    this._writeHolder(getUserId(), getUserName(), getUserId());
    return true;
  }

  /**
   * Hand the token to someone else. Permitted for the current holder and for
   * the host (so a host can always take a stuck token back off a peer).
   * @param {string} userId
   * @param {string} [userName]
   * @returns {boolean}
   */
  grantTo(userId, userName) {
    if (!this._yLock || !userId) return false;
    if (!this.isHeldByMe() && !this.isHost()) return false;

    const pending = this._readRequests()[userId];
    this._writeHolder(userId, userName || pending?.userName || userId, getUserId());
    this._removeRequest(userId);
    return true;
  }

  /**
   * Give the token back to the session host. Only the current holder may do
   * this — a bystander calling release() would be able to yank control off
   * whoever has it.
   * @returns {boolean}
   */
  release() {
    if (!this._yLock || !this.isHeldByMe()) return false;

    const hostId = this._session?.ownerUserId;
    if (!hostId || hostId === getUserId()) {
      // We ARE the host (or the session has no host at all): vacate outright
      // rather than re-granting ourselves the token we just gave up.
      this._yLock.delete(HOLDER_KEY);
      return true;
    }
    this._writeHolder(hostId, this._session?.ownerUserName || hostId, getUserId());
    return true;
  }

  /**
   * File a request for control. Idempotent — re-requesting just refreshes the
   * timestamp, which is also how a user keeps a request alive past
   * REQUEST_TTL_MS.
   * @returns {boolean}
   */
  requestControl() {
    if (!this._yLock) return false;
    if (this.isHeldByMe()) return false;

    const next = this._prunedRequests();
    next[getUserId()] = { userName: getUserName(), atMs: Date.now() };
    this._yLock.set(REQUESTS_KEY, next);
    return true;
  }

  /** Grant the token to a requester and clear their request. */
  approveRequest(userId) {
    const pending = this._readRequests()[userId];
    return this.grantTo(userId, pending?.userName);
  }

  /** Drop a request without granting anything. */
  denyRequest(userId) {
    if (!this._yLock || !userId) return false;
    if (!this.isHeldByMe() && !this.isHost()) return false;
    this._removeRequest(userId);
    return true;
  }

  /**
   * Periodic upkeep. Safe to call every frame — everything below is gated on
   * HEARTBEAT_INTERVAL_MS, so at most one Y.js write per second per client.
   *
   * Two jobs:
   *  1. If we hold the token, refresh its heartbeat so nobody reclaims it.
   *  2. If we are the HOST and the recorded holder has gone stale, reclaim.
   *
   * (2) is host-only ON PURPOSE. If every client wrote the reclaim, N clients
   * would race on the same `holder` key the instant a holder dropped, each
   * naming a different winner until Y.js's last-writer-wins settled — with the
   * gate flapping for everyone in between. One writer, one outcome.
   *
   * @returns {boolean} whether anything was written
   */
  heartbeat() {
    if (!this._yLock) return false;

    const now = Date.now();
    if (now - this._lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) return false;
    this._lastHeartbeatAt = now;

    if (this.isHeldByMe()) {
      const current = this._readHolder();
      this._yLock.set(HOLDER_KEY, { ...current, heartbeat: now });
      return true;
    }

    if (!this.isHost()) return false;

    // Host-only housekeeping from here down.
    const raw = this._readHolder();
    const stale = raw && now - (raw.heartbeat || raw.grantedAt || 0) > MANIP_STALE_MS;
    if (stale) {
      log.info(`VRManipulationLock: holder ${raw.holderUserId} went stale — host reclaiming`);
      this.claimAsHost();
      return true;
    }

    // Sweep expired requests so a roster built from getRequests() doesn't have
    // to re-filter forever (and so the Y.js payload stays small).
    const map = this._readRequests();
    const pruned = this._prunedRequests();
    if (Object.keys(map).length !== Object.keys(pruned).length) {
      this._yLock.set(REQUESTS_KEY, pruned);
      return true;
    }

    return false;
  }

  // ===========================================================================
  // INTERNALS
  // ===========================================================================

  /** @private */
  _attachObserver() {
    if (!this._yLock) return;
    const observer = () => this._notify();
    this._yLock.observe(observer);
    this._observers.push(() => {
      try {
        this._yLock?.unobserve(observer);
      } catch {
        /* map already gone */
      }
    });
  }

  /** @private */
  _detachObserver() {
    this._observers.forEach((off) => off());
    this._observers = [];
  }

  /** @private */
  _notify() {
    const state = { holder: this.getHolder(), requests: this.getRequests() };
    for (const cb of this._listeners) {
      try {
        cb(state);
      } catch (err) {
        log.warn(`VRManipulationLock listener threw: ${err?.message}`);
      }
    }
  }

  /** @private Raw holder record, staleness NOT applied. */
  _readHolder() {
    const raw = this._yLock?.get(HOLDER_KEY);
    return raw && typeof raw === 'object' ? raw : null;
  }

  /** @private */
  _readRequests() {
    const raw = this._yLock?.get(REQUESTS_KEY);
    return raw && typeof raw === 'object' ? raw : {};
  }

  /** @private A copy of the requests map with expired entries removed. */
  _prunedRequests() {
    const now = Date.now();
    const out = {};
    for (const [userId, r] of Object.entries(this._readRequests())) {
      if (r && now - (r.atMs || 0) <= REQUEST_TTL_MS) out[userId] = r;
    }
    return out;
  }

  /** @private */
  _removeRequest(userId) {
    if (!this._yLock || !userId) return;
    const map = this._readRequests();
    if (!(userId in map)) return;
    const next = { ...map };
    delete next[userId];
    this._yLock.set(REQUESTS_KEY, next);
  }

  /** @private */
  _writeHolder(holderUserId, holderUserName, grantedBy) {
    const now = Date.now();
    this._yLock.set(HOLDER_KEY, {
      holderUserId,
      holderUserName,
      grantedBy,
      grantedAt: now,
      heartbeat: now,
    });
    // Our own next heartbeat should not be suppressed by a stale throttle
    // stamp left over from before the token moved.
    this._lastHeartbeatAt = holderUserId === getUserId() ? now : 0;
  }
}

export default VRManipulationLock;
