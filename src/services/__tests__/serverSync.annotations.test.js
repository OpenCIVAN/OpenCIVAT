// src/services/__tests__/serverSync.annotations.test.js
// Verifies that annotation:* and filter:* server broadcasts are forwarded to
// AnnotationManager and re-dispatched as ws:* window CustomEvents for hooks.
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

function deliver(message) {
  serverSync._handleMessage(JSON.stringify(message));
}

describe("serverSync annotation/filter broadcast wiring", () => {
  let annotationManager;

  beforeEach(() => {
    annotationManager = { handleServerBroadcast: vi.fn() };
    serverSync.setAnnotationManager(annotationManager);
    serverSync._setupDefaultHandlers();
  });

  test("annotation:created forwards to AnnotationManager and dispatches ws event", () => {
    const listener = vi.fn();
    window.addEventListener("ws:annotation:created", listener);

    const msg = {
      type: "annotation:created",
      fileId: "file-1",
      annotation: { id: "ann-1", type: "point" },
      actorUserId: "user-other",
    };
    deliver(msg);

    expect(annotationManager.handleServerBroadcast).toHaveBeenCalledWith(
      "annotation:created",
      expect.objectContaining({ fileId: "file-1" })
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.annotation.id).toBe("ann-1");

    window.removeEventListener("ws:annotation:created", listener);
  });

  test("annotation:created from self is skipped (echo dedup)", () => {
    deliver({
      type: "annotation:created",
      fileId: "file-1",
      annotation: { id: "ann-2" },
      actorUserId: "user-me",
    });

    expect(annotationManager.handleServerBroadcast).not.toHaveBeenCalled();
  });

  test("annotation:updated and :deleted forward to AnnotationManager", () => {
    deliver({
      type: "annotation:updated",
      fileId: "file-1",
      annotation: { id: "ann-3" },
    });
    deliver({
      type: "annotation:deleted",
      fileId: "file-1",
      annotationId: "ann-3",
    });

    expect(annotationManager.handleServerBroadcast).toHaveBeenCalledWith(
      "annotation:updated",
      expect.objectContaining({ annotation: { id: "ann-3" } })
    );
    expect(annotationManager.handleServerBroadcast).toHaveBeenCalledWith(
      "annotation:deleted",
      expect.objectContaining({ annotationId: "ann-3" })
    );
  });

  test("filter events dispatch ws:filter:* window events", () => {
    const created = vi.fn();
    const deleted = vi.fn();
    window.addEventListener("ws:filter:created", created);
    window.addEventListener("ws:filter:deleted", deleted);

    deliver({ type: "filter:created", filter: { id: "f-1", name: "High P" } });
    deliver({ type: "filter:deleted", filterId: "f-1" });

    expect(created).toHaveBeenCalledTimes(1);
    expect(created.mock.calls[0][0].detail.filter.id).toBe("f-1");
    expect(deleted).toHaveBeenCalledTimes(1);

    window.removeEventListener("ws:filter:created", created);
    window.removeEventListener("ws:filter:deleted", deleted);
  });

  test("missing annotationManager does not throw", () => {
    serverSync.setAnnotationManager(null);
    expect(() =>
      deliver({
        type: "annotation:created",
        fileId: "file-1",
        annotation: { id: "ann-4" },
      })
    ).not.toThrow();
  });
});
