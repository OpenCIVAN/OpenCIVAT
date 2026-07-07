// src/core/instances/types/vtk/__tests__/VTKInstanceHandler.metrics.test.js
//
// Verifies the sync-latency instrumentation hook points added to
// VTKInstanceHandler: applySharedState records an apply-time delta when the
// incoming visualization patch carries a `_syncOriginTs` (stamped by the
// syncVisualizationToYjs wrapper at send time), and is a safe no-op when the
// stamp is absent or malformed.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VTKInstanceHandler } from "../VTKInstanceHandler.js";
import { metricsService } from "@Services/metrics/metricsService.js";

function makeInstanceData(instanceId = "inst-1") {
  const property = {
    setOpacity: vi.fn(),
    setRepresentation: vi.fn(),
  };
  return {
    instanceId,
    imageData: { fake: "imageData" },
    sceneObjects: {
      actor: {
        getProperty: () => property,
      },
      camera: {},
      renderer: { resetCameraClippingRange: vi.fn() },
    },
  };
}

describe("VTKInstanceHandler.applySharedState — sync latency instrumentation", () => {
  let handler;
  let instanceData;

  beforeEach(() => {
    handler = new VTKInstanceHandler();
    instanceData = makeInstanceData();
    metricsService.clear();
    metricsService.setEnabled(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    metricsService.clear();
  });

  it("records an apply-latency sample under 'yjs-visualization' when _syncOriginTs is present", async () => {
    const originTs = Date.now() - 15;
    await handler.applySharedState(
      instanceData,
      { visualization: { opacity: 0.5, _syncOriginTs: originTs } },
      "remote-user"
    );

    const summary = metricsService.getSummary("yjs-visualization");
    expect(summary.count).toBe(1);
    expect(summary.mean).toBeGreaterThanOrEqual(0);
  });

  it("does not record when _syncOriginTs is absent (no throw, no sample)", async () => {
    await expect(
      handler.applySharedState(instanceData, { visualization: { opacity: 0.5 } }, "remote-user")
    ).resolves.not.toThrow();

    expect(metricsService.getSummary("yjs-visualization").count).toBe(0);
  });

  it("does not record and does not throw when _syncOriginTs is malformed", async () => {
    await expect(
      handler.applySharedState(
        instanceData,
        { visualization: { opacity: 0.5, _syncOriginTs: "not-a-number" } },
        "remote-user"
      )
    ).resolves.not.toThrow();

    expect(metricsService.getSummary("yjs-visualization").count).toBe(0);
  });

  it("does not record when there is no visualization state at all (e.g. camera-only update)", async () => {
    instanceData.sceneObjects.camera = {
      setPosition: vi.fn(),
      setFocalPoint: vi.fn(),
      setViewUp: vi.fn(),
    };
    await handler.applySharedState(
      instanceData,
      { camera: { position: [0, 0, 1], focalPoint: [0, 0, 0], viewUp: [0, 1, 0] } },
      "remote-user"
    );

    expect(metricsService.getSummary("yjs-visualization").count).toBe(0);
  });

  it("still applies the visualization state normally alongside instrumentation", async () => {
    const property = instanceData.sceneObjects.actor.getProperty();
    await handler.applySharedState(
      instanceData,
      { visualization: { opacity: 0.75, _syncOriginTs: Date.now() } },
      "remote-user"
    );
    expect(property.setOpacity).toHaveBeenCalledWith(0.75);
  });
});
