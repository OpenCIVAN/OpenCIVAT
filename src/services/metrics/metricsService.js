// src/services/metrics/metricsService.js
//
// Lightweight sync-latency metrics for the collaborative sync paths
// (Y.js visualization sync, annotation/filter WS broadcasts, VR presence).
//
// PURPOSE
// -------
// This module exists to produce the latency numbers needed for the CIA Web
// paper's user study (end-to-end sync latency between a "sender" state
// change and a "receiver" applying it). It is intentionally dependency-free
// and side-effect free on import — nothing here can break sync even if the
// metrics code throws, because every public method is wrapped in try/catch
// and fails silently (see `_safe`).
//
// CLOCK SKEW CAVEAT (read before interpreting numbers)
// -----------------------------------------------------
// Several categories (e.g. "annotation", "filter") compute latency as
// `Date.now() - Date.parse(serverTimestamp)`, where `serverTimestamp` was
// stamped by the Node server's wall clock and `Date.now()` is the receiving
// browser's wall clock. If sender and receiver are on DIFFERENT machines,
// their system clocks are almost never perfectly synchronized (NTP drift is
// commonly tens of milliseconds, sometimes more) — so the recorded delta is
// "apparent" latency, not true network+processing latency, and can even be
// negative. For MULTI-TAB / MULTI-WINDOW measurements on the SAME machine
// (e.g. two browser tabs both talking to one local dev server, or two Y.js
// clients in the same OS), sender and receiver share one wall clock, so the
// recorded delta IS a valid latency measurement. When reporting numbers for
// the paper, prefer same-machine multi-tab setups, or record clock-offset
// separately and correct for it if cross-machine measurements are required.
// Each recorded sample carries a `sameClock` hint (see `record`) so summaries
// can be filtered accordingly.
//
// CATEGORIES USED BY THIS CODEBASE
// ---------------------------------
//   "yjs-visualization"  — VTKInstanceHandler syncVisualizationToYjs (send) →
//                           applySharedState (apply). Y.js timestamps
//                           (`lastUpdate`) are produced by the SAME client
//                           runtime clock family (Date.now() on possibly a
//                           different machine, propagated via the Y.js CRDT),
//                           so the same cross-machine caveat applies.
//   "annotation-created" / "annotation-updated" / "annotation-deleted"
//                         — serverSync.js WS broadcast handlers. Origin
//                           timestamp is the server's ISO `msg.timestamp`.
//   "filter-created" / "filter-updated" / "filter-deleted"
//                         — serverSync.js WS broadcast handlers. NOTE: the
//                           filter:* server broadcasts do not currently stamp
//                           a `timestamp` field, so these categories will
//                           usually have no samples until the server is
//                           updated to include one; the hook is a safe no-op
//                           in that case.
//
// API
// ---
//   metricsService.record(category, ms, meta)
//   metricsService.recordFromOrigin(category, originEpochMs, meta) — computes
//     ms = Date.now() - originEpochMs and records it.
//   metricsService.getSummary(category?) → per-category { count, mean, p50,
//     p95, max } map, or a single summary object if `category` is given.
//   metricsService.exportJSON() → plain JSON-serializable object.
//   metricsService.downloadExport(filename?) → triggers a browser download
//     of exportJSON() as a .json blob (no-op outside the browser).
//   metricsService.setEnabled(bool) / metricsService.isEnabled()
//   metricsService.clear(category?)
//
// Debug handle: window.CIA.metrics (mirrors the existing window.CIA.* debug
// pattern set up in src/init/appInitializer.js).
//
// Enabled by default in dev (NODE_ENV !== 'production'); can be toggled at
// runtime via `metricsService.setEnabled(false)` or `window.CIA.metrics.disable()`.
// A per-category ring buffer caps memory usage (~5000 entries per category).

const MAX_ENTRIES_PER_CATEGORY = 5000;

function isDevDefault() {
  try {
    return typeof process !== "undefined"
      ? process.env?.NODE_ENV !== "production"
      : true;
  } catch {
    return true;
  }
}

/**
 * Compute percentile `p` (0-100) from an array of numbers using
 * nearest-rank on a sorted copy. Does not mutate the input.
 * @param {number[]} sortedAsc - already sorted ascending
 * @param {number} p
 */
function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const clamped = Math.min(Math.max(idx, 0), sortedAsc.length - 1);
  return sortedAsc[clamped];
}

class MetricsService {
  constructor() {
    /** @type {Map<string, Array<{ms: number, t: number, sameClock: boolean, meta: object|null}>>} */
    this._buffers = new Map();
    this._enabled = isDevDefault();
    this._maxEntries = MAX_ENTRIES_PER_CATEGORY;
  }

  /**
   * Enable/disable recording at runtime. Disabling does not clear existing data.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = !!enabled;
  }

  isEnabled() {
    return this._enabled;
  }

  /**
   * Record a raw latency sample (milliseconds) for a category.
   * Safe no-op on any internal failure or when disabled.
   * @param {string} category
   * @param {number} ms
   * @param {{sameClock?: boolean, [k:string]: any}} [meta]
   */
  record(category, ms, meta = null) {
    this._safe(() => {
      if (!this._enabled) return;
      if (typeof category !== "string" || !category) return;
      if (typeof ms !== "number" || !isFinite(ms)) return;

      let buf = this._buffers.get(category);
      if (!buf) {
        buf = [];
        this._buffers.set(category, buf);
      }

      buf.push({
        ms,
        t: Date.now(),
        sameClock: meta?.sameClock !== false, // default true unless explicitly marked false
        meta: meta && typeof meta === "object" ? { ...meta } : null,
      });

      // Ring buffer: drop oldest when over cap
      if (buf.length > this._maxEntries) {
        buf.splice(0, buf.length - this._maxEntries);
      }
    });
  }

  /**
   * Convenience helper: record the delta between now and an origin
   * timestamp (epoch ms). Accepts either a number (epoch ms) or an ISO
   * string (server timestamps are ISO strings — see serverSync.js).
   * @param {string} category
   * @param {number|string} origin - epoch ms or ISO date string
   * @param {object} [meta]
   */
  recordFromOrigin(category, origin, meta = null) {
    this._safe(() => {
      if (!this._enabled) return;
      let originMs = origin;
      if (typeof origin === "string") {
        originMs = Date.parse(origin);
      }
      if (typeof originMs !== "number" || !isFinite(originMs)) return;
      const ms = Date.now() - originMs;
      this.record(category, ms, meta);
    });
  }

  /**
   * Compute summary stats for one category, or all categories if omitted.
   * @param {string} [category]
   * @returns {{count:number, mean:number, p50:number, p95:number, max:number}|Object<string, {count:number, mean:number, p50:number, p95:number, max:number}>}
   */
  getSummary(category) {
    const emptySummary = () => ({ count: 0, mean: 0, p50: 0, p95: 0, max: 0 });

    const summarizeOne = (buf) => {
      if (!buf || buf.length === 0) return emptySummary();
      const values = buf.map((e) => e.ms).sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      return {
        count,
        mean: round2(mean),
        p50: round2(percentile(values, 50)),
        p95: round2(percentile(values, 95)),
        max: round2(values[values.length - 1]),
      };
    };

    return this._safe(() => {
      if (category) {
        return summarizeOne(this._buffers.get(category));
      }
      /** @type {Object<string, ReturnType<typeof summarizeOne>>} */
      const result = {};
      for (const [cat, buf] of this._buffers.entries()) {
        result[cat] = summarizeOne(buf);
      }
      return result;
    }, category ? emptySummary() : {});
  }

  /**
   * Raw samples for a category (defensive copy), or empty array on failure.
   * @param {string} category
   */
  getSamples(category) {
    return this._safe(() => {
      const buf = this._buffers.get(category);
      return buf ? buf.map((e) => ({ ...e })) : [];
    }, []);
  }

  /**
   * List of categories that currently have at least one sample.
   */
  getCategories() {
    return this._safe(() => Array.from(this._buffers.keys()), []);
  }

  /**
   * Clear samples for a single category, or everything if omitted.
   * @param {string} [category]
   */
  clear(category) {
    this._safe(() => {
      if (category) {
        this._buffers.delete(category);
      } else {
        this._buffers.clear();
      }
    });
  }

  /**
   * Plain JSON-serializable export: summary + raw samples per category,
   * plus metadata useful for the paper (export time, enabled flag, cap).
   */
  exportJSON() {
    return this._safe(
      () => ({
        exportedAt: new Date().toISOString(),
        enabled: this._enabled,
        maxEntriesPerCategory: this._maxEntries,
        summary: this.getSummary(),
        samples: Object.fromEntries(
          Array.from(this._buffers.entries()).map(([cat, buf]) => [
            cat,
            buf.map((e) => ({ ...e })),
          ])
        ),
      }),
      {
        exportedAt: new Date().toISOString(),
        enabled: this._enabled,
        maxEntriesPerCategory: this._maxEntries,
        summary: {},
        samples: {},
      }
    );
  }

  /**
   * Trigger a browser download of exportJSON() as a .json file.
   * No-op (returns false) outside a browser environment or on failure.
   * @param {string} [filename]
   * @returns {boolean} whether the download was triggered
   */
  downloadExport(filename) {
    return this._safe(() => {
      if (typeof document === "undefined" || typeof Blob === "undefined") {
        return false;
      }
      const data = this.exportJSON();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `cia-sync-metrics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke on next tick to make sure the download has started
      setTimeout(() => URL.revokeObjectURL(url), 0);
      return true;
    }, false);
  }

  /**
   * Internal helper: run `fn`, swallow any error, and return `fallback` (or
   * undefined) if it throws. Every public method funnels through this so
   * instrumentation can never break the caller (sync code).
   * @private
   */
  _safe(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      try {
        // Best-effort console warning; never throw from here either.
        console.warn("[metricsService] internal error (ignored):", err);
      } catch {
        // ignore
      }
      return fallback;
    }
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export const metricsService = new MetricsService();

/**
 * Attach the debug handle to window.CIA.metrics, following the existing
 * window.CIA.* pattern (see src/init/appInitializer.js, src/utils/thumbnailDebug.js).
 * Safe to call multiple times; safe if window/CIA is unavailable (SSR/tests).
 */
export function installMetricsDebugHandle() {
  try {
    if (typeof window === "undefined") return;
    window.CIA = window.CIA || {};
    window.CIA.metrics = {
      summary: (category) => metricsService.getSummary(category),
      categories: () => metricsService.getCategories(),
      samples: (category) => metricsService.getSamples(category),
      export: () => metricsService.exportJSON(),
      download: (filename) => metricsService.downloadExport(filename),
      clear: (category) => metricsService.clear(category),
      enable: () => metricsService.setEnabled(true),
      disable: () => metricsService.setEnabled(false),
      isEnabled: () => metricsService.isEnabled(),
    };
  } catch {
    // never throw from debug wiring
  }
}

// Auto-install the debug handle on import in browser contexts. Wrapped so a
// missing `window` (SSR / test) is a silent no-op.
installMetricsDebugHandle();
