// src/services/__tests__/serverSync.metrics.test.js
// Verifies that annotation:*/filter:* WS broadcasts feed sync-latency
// samples into metricsService, and that missing/malformed timestamps are a
// safe no-op (instrumentation must never break the broadcast handling).
import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("@Core/config/clientConfig.js", () => ({
  config: {
    apiBaseUrl: "http://localhost:3001/api",
    defaultSessionId: "test-session",
  },
}));

vi.mock("@Core/session/sessionManager.js", () => ({
  sessionManager: {
    getProjectId: vi.fn().mockReturnValue("project-1"),
    getUserId: vi.fn().mockReturnValue("user-me"),
    setUserInfo: vi.fn(),
  },
}));

vi.mock("@Services/authService.js", () => ({
  authService: { getToken: vi.fn(), onAuthChange: vi.fn() },
}));

vi.mock("@UI/react/store/computeJobStore.js", () => ({
  useComputeJobStore: { getState: vi.fn().mockReturnValue({}) },
}));

vi.mock("@UI/react/store/toastStore.js", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

vi.mock("@Services/syncService.js", () => ({
  saveSyncWatermark: vi.fn(),
}));

import { serverSync } from "../serverSync.js";
import { metricsService } from "../metrics/metricsService.js";

function deliver(message) {
  serverSync._handleMessage(JSON.stringify(message));
}

describe("serverSync sync-latency instrumentation", () => {
  beforeEach(() => {
    metricsService.clear();
    metricsService.setEnabled(true);
    serverSync.setAnnotationManager({ handleServerBroadcast: vi.fn() });
    serverSync._setupDefaultHandlers();
  });

  test("annotation:created records latency from msg.timestamp", () => {
    const timestamp = new Date(Date.now() - 30).toISOString();
    deliver({
      type: "annotation:created",
      fileId: "file-1",
      annotation: { id: "ann-1" },
      timestamp,
    });

    const summary = metricsService.getSummary("annotation-created");
    expect(summary.count).toBe(1);
    expect(summary.mean).toBeGreaterThanOrEqual(0);
  });

  test("annotation:updated and annotation:deleted record their own categories", () => {
    deliver({
      type: "annotation:updated",
      annotation: { id: "ann-2" },
      timestamp: new Date().toISOString(),
    });
    deliver({
      type: "annotation:deleted",
      annotationId: "ann-2",
      timestamp: new Date().toISOString(),
    });

    expect(metricsService.getSummary("annotation-updated").count).toBe(1);
    expect(metricsService.getSummary("annotation-deleted").count).toBe(1);
  });

  test("filter:* events record latency when a timestamp is present", () => {
    deliver({
      type: "filter:created",
      filter: { id: "f-1" },
      timestamp: new Date().toISOString(),
    });
    expect(metricsService.getSummary("filter-created").count).toBe(1);
  });

  test("missing timestamp is a safe no-op (no sample recorded, no throw)", () => {
    expect(() =>
      deliver({ type: "annotation:created", fileId: "file-1", annotation: { id: "ann-3" } })
    ).not.toThrow();
    expect(metricsService.getSummary("annotation-created").count).toBe(0);
  });

  test("malformed timestamp does not throw and does not record", () => {
    expect(() =>
      deliver({
        type: "annotation:updated",
        annotation: { id: "ann-4" },
        timestamp: "not-a-real-date",
      })
    ).not.toThrow();
    // Date.parse("not-a-real-date") is NaN, recordFromOrigin should ignore it
    expect(metricsService.getSummary("annotation-updated").count).toBe(0);
  });

  test("existing annotation broadcast behavior (forwarding + events) is unaffected", () => {
    const listener = vi.fn();
    window.addEventListener("ws:annotation:created", listener);

    deliver({
      type: "annotation:created",
      fileId: "file-1",
      annotation: { id: "ann-5" },
      actorUserId: "user-other",
      timestamp: new Date().toISOString(),
    });

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("ws:annotation:created", listener);
  });
});
