// src/services/replayService.js
// =============================================================================
// Session Replay Service
// =============================================================================
//
// Replays the history of collaborative sync_events for a workspace as a
// scrubbable/playable timeline.
//
// SOURCE OF TRUTH: GET /api/workspaces/:id/replay-events — the append-only
// sync_events log, paged by cursor (event id), ordered ascending.
//
// READ-ONLY CONTRACT:
//   Replay MUST NOT write to the server or broadcast to Y.js. It applies events
//   purely locally by reusing syncService.applyDeltaEvents, which routes each
//   event through each manager's remote-application path (handleServerBroadcast
//   / applyDeltaEvent). Those paths mutate local state and emit UI events only —
//   they never call the API or ws.send. While replaying we additionally set a
//   suppression flag (window.__CIA_REPLAY_ACTIVE__ + a service flag) so any
//   outgoing-sync guard that checks it can bail out, mirroring the
//   _isApplyingRemoteState pattern used inside VTKInstanceHandler.
//
// STATE MODEL:
//   Events are snapshot-based upserts, so applying them is idempotent and
//   order-dependent only in the forward direction. Position is an index into
//   the buffered event array.
//     - seek forward  → apply events (position .. target]
//     - seek backward → rebuild from start: re-apply events [0 .. target]
//       (cheap because snapshot application is idempotent; this is the
//       "rebuild from start / nearest snapshot" strategy)
//   On enterReplay we record the live watermark; on exitReplay we converge
//   local managers back to live head by applying the full buffered set, then
//   clear the suppression flag.
//
// PLAYBACK:
//   play() advances through events on a timer. Speed multipliers 0.5/1/2/5x
//   scale the inter-event delay, which is derived from the real created_at
//   gaps (clamped) so playback feels like the original session.

import { api as log } from "@Utils/logger.js";
import { apiClient } from "@Services/apiClient.js";
import { applyDeltaEvents } from "@Services/syncService.js";
import { serverSync } from "@Services/serverSync.js";
import { eventBus } from "@Core/events/EventBus.js";

// Replay-specific bus event names (namespaced; not part of core BUS_EVENTS).
export const REPLAY_EVENTS = {
  LOADED: "replay:loaded",
  STATE_CHANGED: "replay:stateChanged", // { position, total, playing, speed }
  POSITION_CHANGED: "replay:positionChanged", // { position, event }
  ENTERED: "replay:entered",
  EXITED: "replay:exited",
  ERROR: "replay:error",
};

export const REPLAY_SPEEDS = [0.5, 1, 2, 5];

// Timer pacing: derived from real created_at gaps, clamped to a sane range so
// long idle gaps don't stall playback and bursts don't flash by.
const MIN_STEP_MS = 120;
const MAX_STEP_MS = 2000;
const PAGE_LIMIT = 200;

class ReplayService {
  constructor() {
    this._workspaceId = null;
    this._events = []; // buffered, ordered ascending by id
    this._position = -1; // index of last-applied event; -1 = nothing applied
    this._playing = false;
    this._speed = 1;
    this._timer = null;
    this._inReplayMode = false;
    this._entryWatermark = null; // live watermark captured on enter
    this._loading = false;

    // Suppression flag: mirrors the _isApplyingRemoteState guard. Any outgoing
    // sync code can check replayService.isSuppressingSync() (or the window flag)
    // to avoid echoing replayed changes back to the server / Y.js.
    this._suppressSync = false;
  }

  // ---- Introspection -------------------------------------------------------

  isInReplayMode() {
    return this._inReplayMode;
  }

  isSuppressingSync() {
    return this._suppressSync;
  }

  getState() {
    return {
      workspaceId: this._workspaceId,
      position: this._position,
      total: this._events.length,
      playing: this._playing,
      speed: this._speed,
      inReplayMode: this._inReplayMode,
      currentEvent: this._position >= 0 ? this._events[this._position] : null,
    };
  }

  getEvents() {
    return this._events;
  }

  // ---- Loading -------------------------------------------------------------

  /**
   * Fetch all replay events for a workspace, following the cursor until
   * exhausted. Buffers them in ascending id order.
   *
   * @param {string} workspaceId
   * @param {object} [opts]
   * @param {string} [opts.from]  ISO lower bound
   * @param {string} [opts.to]    ISO upper bound
   * @param {string[]} [opts.entityTypes]
   * @returns {Promise<object[]>} buffered events
   */
  async load(workspaceId, opts = {}) {
    if (!workspaceId) throw new Error("replayService.load: workspaceId required");
    this._loading = true;
    this._workspaceId = workspaceId;
    this._events = [];
    this._position = -1;

    try {
      let cursor = 0;
      let guard = 0;
      // Follow the cursor across pages. Guard against runaway loops.
      for (;;) {
        const page = await this._fetchPage(workspaceId, cursor, opts);
        const events = page.events || [];
        this._events.push(...events);
        if (!page.hasMore || page.nextCursor == null) break;
        cursor = page.nextCursor;
        if (++guard > 10000) {
          log.warn("replay load: page guard tripped, stopping");
          break;
        }
      }

      log.info(
        `replay: loaded ${this._events.length} events for workspace ${workspaceId}`
      );
      eventBus.emit(REPLAY_EVENTS.LOADED, {
        total: this._events.length,
      });
      this._emitState();
      return this._events;
    } catch (err) {
      log.error("replay load failed:", err.message);
      eventBus.emit(REPLAY_EVENTS.ERROR, { message: err.message });
      throw err;
    } finally {
      this._loading = false;
    }
  }

  async _fetchPage(workspaceId, cursor, opts = {}) {
    const params = new URLSearchParams();
    params.set("cursor", String(cursor));
    params.set("limit", String(PAGE_LIMIT));
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    if (opts.entityTypes && opts.entityTypes.length) {
      params.set("entityTypes", opts.entityTypes.join(","));
    }
    return apiClient.get(
      `/workspaces/${encodeURIComponent(workspaceId)}/replay-events?${params.toString()}`
    );
  }

  // ---- Replay mode lifecycle ----------------------------------------------

  /**
   * Enter replay mode: snapshot the live watermark and raise the suppression
   * flag so outgoing sync is muted while events are applied locally.
   */
  enterReplay() {
    if (this._inReplayMode) return;
    this._inReplayMode = true;
    this._suppressSync = true;
    if (typeof window !== "undefined") {
      window.__CIA_REPLAY_ACTIVE__ = true;
    }
    // Capture the live watermark for reference (restore reconverges anyway).
    this._entryWatermark = serverSync?._lastWatermark ?? null;
    this._position = -1;
    log.info("replay: entered replay mode");
    eventBus.emit(REPLAY_EVENTS.ENTERED, { workspaceId: this._workspaceId });
    this._emitState();
  }

  /**
   * Exit replay mode: converge local managers back to live head by applying
   * the full buffered event set, then clear the suppression flag.
   */
  async exitReplay() {
    if (!this._inReplayMode) return;
    this.pause();

    try {
      // Converge to the final (live) state by applying everything.
      if (this._events.length > 0) {
        await applyDeltaEvents(this._events, this._managers(), null);
      }
    } catch (err) {
      log.warn("replay: restore convergence failed:", err.message);
    }

    this._position = this._events.length - 1;
    this._inReplayMode = false;
    this._suppressSync = false;
    if (typeof window !== "undefined") {
      window.__CIA_REPLAY_ACTIVE__ = false;
    }
    log.info("replay: exited replay mode (restored to live head)");
    eventBus.emit(REPLAY_EVENTS.EXITED, { workspaceId: this._workspaceId });
    this._emitState();
  }

  // ---- Transport: play / pause / seek / speed ------------------------------

  play() {
    if (!this._inReplayMode) this.enterReplay();
    if (this._playing) return;
    if (this._position >= this._events.length - 1) {
      // At the end — restart from the beginning.
      this.seek(-1);
    }
    this._playing = true;
    this._emitState();
    this._scheduleNext();
  }

  pause() {
    this._playing = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._emitState();
  }

  togglePlay() {
    if (this._playing) this.pause();
    else this.play();
  }

  /**
   * Set playback speed. Accepts 0.5 | 1 | 2 | 5. Re-paces an active timer.
   */
  setSpeed(speed) {
    if (!REPLAY_SPEEDS.includes(speed)) {
      log.warn(`replay: ignoring invalid speed ${speed}`);
      return;
    }
    this._speed = speed;
    this._emitState();
    if (this._playing) {
      if (this._timer) clearTimeout(this._timer);
      this._scheduleNext();
    }
  }

  getSpeed() {
    return this._speed;
  }

  /**
   * Seek to an absolute event index (position). -1 means "before the first
   * event" (empty local state relative to replay start).
   *
   * Forward seeks apply the intervening events. Backward seeks rebuild from the
   * start (idempotent snapshot application), satisfying the "rebuild from start
   * / nearest snapshot" semantics.
   *
   * @param {number} target  index in [-1, events.length-1]
   */
  async seek(target) {
    if (!this._inReplayMode) this.enterReplay();
    const clamped = Math.max(-1, Math.min(target, this._events.length - 1));

    if (clamped < this._position) {
      // Backward: rebuild from the beginning up to the target.
      this._position = -1;
      if (clamped >= 0) {
        await this._applyRange(0, clamped);
      }
    } else if (clamped > this._position) {
      // Forward: apply the newly-crossed events.
      await this._applyRange(this._position + 1, clamped);
    }

    this._position = clamped;
    this._emitPosition();
    this._emitState();
  }

  /**
   * Advance exactly one event (used by the timer and step controls).
   */
  async stepForward() {
    if (this._position >= this._events.length - 1) return false;
    await this._applyRange(this._position + 1, this._position + 1);
    this._position += 1;
    this._emitPosition();
    this._emitState();
    return true;
  }

  // ---- Internals -----------------------------------------------------------

  /**
   * Apply events in the inclusive index range [start, end] through the
   * read-only delta engine.
   */
  async _applyRange(start, end) {
    if (start > end) return;
    const slice = this._events.slice(start, end + 1);
    if (slice.length === 0) return;
    // Ensure suppression is raised even if applied outside enter/exit.
    const priorSuppress = this._suppressSync;
    this._suppressSync = true;
    if (typeof window !== "undefined") window.__CIA_REPLAY_ACTIVE__ = true;
    try {
      await applyDeltaEvents(slice, this._managers(), null);
    } finally {
      this._suppressSync = priorSuppress;
      if (typeof window !== "undefined") {
        window.__CIA_REPLAY_ACTIVE__ = priorSuppress;
      }
    }
  }

  _managers() {
    // Read the live manager singletons from serverSync (read-only access).
    return {
      viewConfigurationManager: serverSync?.viewConfigurationManager || null,
      annotationManager: serverSync?.annotationManager || null,
      viewGroupManager: serverSync?.viewGroupManager || null,
      workspaceAnnotationManager:
        serverSync?.workspaceAnnotationManager || null,
    };
  }

  _scheduleNext() {
    if (!this._playing) return;
    const delay = this._stepDelay();
    this._timer = setTimeout(async () => {
      const advanced = await this.stepForward();
      if (!advanced) {
        // Reached the end.
        this.pause();
        return;
      }
      this._scheduleNext();
    }, delay);
  }

  /**
   * Compute the delay before applying the NEXT event, from the real created_at
   * gap between the current and next event, scaled by speed and clamped.
   */
  _stepDelay() {
    const cur = this._events[this._position];
    const next = this._events[this._position + 1];
    let gapMs = 800; // default when timestamps are missing
    if (cur && next && cur.created_at && next.created_at) {
      const a = new Date(cur.created_at).getTime();
      const b = new Date(next.created_at).getTime();
      if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
        gapMs = b - a;
      }
    }
    const scaled = gapMs / this._speed;
    return Math.max(MIN_STEP_MS, Math.min(MAX_STEP_MS, scaled));
  }

  _emitState() {
    eventBus.emit(REPLAY_EVENTS.STATE_CHANGED, this.getState());
  }

  _emitPosition() {
    eventBus.emit(REPLAY_EVENTS.POSITION_CHANGED, {
      position: this._position,
      event: this._position >= 0 ? this._events[this._position] : null,
    });
  }

  /**
   * Full teardown: pause, exit replay mode, clear buffers.
   */
  async reset() {
    this.pause();
    if (this._inReplayMode) await this.exitReplay();
    this._events = [];
    this._position = -1;
    this._workspaceId = null;
    this._entryWatermark = null;
  }
}

export const replayService = new ReplayService();

// Debug access (mirrors window.CIA.syncService).
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.replayService = replayService;
}
