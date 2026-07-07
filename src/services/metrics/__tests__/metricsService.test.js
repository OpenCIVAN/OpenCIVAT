// src/services/metrics/__tests__/metricsService.test.js
// Unit tests for the sync-latency metrics module: percentile math, ring
// buffer cap, disabled no-op behavior, and export shape.
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { metricsService } from "../metricsService.js";

describe("metricsService", () => {
  beforeEach(() => {
    metricsService.clear();
    metricsService.setEnabled(true);
  });

  afterEach(() => {
    metricsService.clear();
    metricsService.setEnabled(true);
  });

  describe("record + getSummary percentile math", () => {
    test("returns zeroed summary for an unknown category", () => {
      expect(metricsService.getSummary("nonexistent")).toEqual({
        count: 0,
        mean: 0,
        p50: 0,
        p95: 0,
        max: 0,
      });
    });

    test("computes count/mean/p50/p95/max for a simple sample set", () => {
      // 1..100 ms, evenly spaced — easy to reason about percentiles
      for (let i = 1; i <= 100; i++) {
        metricsService.record("test-cat", i);
      }
      const summary = metricsService.getSummary("test-cat");
      expect(summary.count).toBe(100);
      expect(summary.mean).toBeCloseTo(50.5, 1);
      expect(summary.p50).toBe(50);
      expect(summary.p95).toBe(95);
      expect(summary.max).toBe(100);
    });

    test("single-sample category summary", () => {
      metricsService.record("solo", 42);
      const summary = metricsService.getSummary("solo");
      expect(summary).toEqual({ count: 1, mean: 42, p50: 42, p95: 42, max: 42 });
    });

    test("getSummary() with no category returns a per-category map", () => {
      metricsService.record("a", 10);
      metricsService.record("b", 20);
      const all = metricsService.getSummary();
      expect(Object.keys(all).sort()).toEqual(["a", "b"]);
      expect(all.a.count).toBe(1);
      expect(all.b.count).toBe(1);
    });

    test("ignores non-numeric or non-finite values", () => {
      metricsService.record("bad", NaN);
      metricsService.record("bad", Infinity);
      metricsService.record("bad", "50");
      metricsService.record("bad", null);
      expect(metricsService.getSummary("bad").count).toBe(0);
    });

    test("ignores invalid category names", () => {
      metricsService.record("", 10);
      metricsService.record(null, 10);
      metricsService.record(undefined, 10);
      expect(metricsService.getCategories()).toEqual([]);
    });
  });

  describe("recordFromOrigin", () => {
    test("computes delta from an epoch-ms origin", () => {
      const now = 1_000_000;
      vi.spyOn(Date, "now").mockReturnValue(now);
      metricsService.recordFromOrigin("origin-cat", now - 25);
      expect(metricsService.getSummary("origin-cat")).toMatchObject({
        count: 1,
        mean: 25,
        max: 25,
      });
      vi.restoreAllMocks();
    });

    test("computes delta from an ISO string origin", () => {
      const now = new Date("2026-01-01T00:00:00.100Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);
      metricsService.recordFromOrigin(
        "origin-iso",
        "2026-01-01T00:00:00.000Z"
      );
      expect(metricsService.getSummary("origin-iso").mean).toBeCloseTo(100, 0);
      vi.restoreAllMocks();
    });

    test("silently ignores an unparseable origin", () => {
      expect(() =>
        metricsService.recordFromOrigin("bad-origin", "not-a-date")
      ).not.toThrow();
      expect(metricsService.getSummary("bad-origin").count).toBe(0);
    });
  });

  describe("ring buffer cap", () => {
    test("caps entries per category at the configured max (~5000) and keeps most recent", () => {
      const cap = 5000;
      const total = cap + 250;
      for (let i = 0; i < total; i++) {
        metricsService.record("ring", i);
      }
      const samples = metricsService.getSamples("ring");
      expect(samples.length).toBe(cap);
      // Oldest entries (0..249) should have been evicted; the buffer should
      // start at the 250th recorded value (index 250) since it's a simple
      // FIFO ring buffer.
      expect(samples[0].ms).toBe(total - cap);
      expect(samples[samples.length - 1].ms).toBe(total - 1);
    });
  });

  describe("disabled no-op", () => {
    test("record() is a no-op when disabled", () => {
      metricsService.setEnabled(false);
      metricsService.record("disabled-cat", 10);
      expect(metricsService.getSummary("disabled-cat").count).toBe(0);
      expect(metricsService.isEnabled()).toBe(false);
    });

    test("recordFromOrigin() is a no-op when disabled", () => {
      metricsService.setEnabled(false);
      metricsService.recordFromOrigin("disabled-cat-2", Date.now() - 10);
      expect(metricsService.getSummary("disabled-cat-2").count).toBe(0);
    });

    test("re-enabling resumes recording", () => {
      metricsService.setEnabled(false);
      metricsService.record("toggle", 1);
      metricsService.setEnabled(true);
      metricsService.record("toggle", 2);
      expect(metricsService.getSummary("toggle").count).toBe(1);
    });
  });

  describe("exportJSON shape", () => {
    test("export contains expected top-level keys and per-category summary+samples", () => {
      metricsService.record("annotation-created", 12);
      metricsService.record("annotation-created", 20);
      const exported = metricsService.exportJSON();

      expect(exported).toHaveProperty("exportedAt");
      expect(typeof exported.exportedAt).toBe("string");
      expect(exported).toHaveProperty("enabled", true);
      expect(exported).toHaveProperty("maxEntriesPerCategory", 5000);
      expect(exported.summary["annotation-created"]).toMatchObject({
        count: 2,
      });
      expect(exported.samples["annotation-created"]).toHaveLength(2);
      expect(exported.samples["annotation-created"][0]).toHaveProperty("ms");
      expect(exported.samples["annotation-created"][0]).toHaveProperty("t");
      expect(exported.samples["annotation-created"][0]).toHaveProperty(
        "sameClock"
      );
    });

    test("exportJSON round-trips through JSON.stringify without error", () => {
      metricsService.record("x", 5, { extra: "meta" });
      const json = JSON.stringify(metricsService.exportJSON());
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe("clear()", () => {
    test("clears a single category without affecting others", () => {
      metricsService.record("keep", 1);
      metricsService.record("drop", 2);
      metricsService.clear("drop");
      expect(metricsService.getSummary("drop").count).toBe(0);
      expect(metricsService.getSummary("keep").count).toBe(1);
    });

    test("clears everything when called with no argument", () => {
      metricsService.record("a", 1);
      metricsService.record("b", 2);
      metricsService.clear();
      expect(metricsService.getCategories()).toEqual([]);
    });
  });

  describe("safety — never throws", () => {
    test("record() does not throw even with a malformed meta object", () => {
      expect(() =>
        metricsService.record("safe", 5, { toJSON: () => { throw new Error("boom"); } })
      ).not.toThrow();
    });

    test("downloadExport() returns false outside a browser Blob/document environment", () => {
      const originalBlob = global.Blob;
      // jsdom provides document; simulate missing Blob to hit the fallback path
      // eslint-disable-next-line no-global-assign
      global.Blob = undefined;
      expect(() => metricsService.downloadExport()).not.toThrow();
      expect(metricsService.downloadExport()).toBe(false);
      global.Blob = originalBlob;
    });
  });
});
