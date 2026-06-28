// src/core/capabilities/__tests__/ClientCapabilityProfile.test.js
// DR2: Unit tests for ClientCapabilityProfile capability detection and comparison.

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  buildClientCapabilityProfile,
  compareRenderCapabilities,
  CONSISTENCY_STATUS,
} from '@Core/capabilities/ClientCapabilityProfile.js';

// ─── Mock browser globals ─────────────────────────────────────────────────────

function mockWebGL({ gl = true, gl2 = true, xr = false } = {}) {
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: (type) => {
        if (type === 'webgl')  return gl  ? {} : null;
        if (type === 'webgl2') return gl2 ? {} : null;
        return null;
      },
    }),
  });
  vi.stubGlobal('navigator', xr ? { xr: {} } : {});
  vi.stubGlobal('OffscreenCanvas', undefined);
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mockWebGL();
});

// ─── buildClientCapabilityProfile ────────────────────────────────────────────

describe('buildClientCapabilityProfile', () => {
  test('returns expected shape with WebGL2 available', () => {
    mockWebGL({ gl: true, gl2: true });
    const profile = buildClientCapabilityProfile();
    expect(profile).toMatchObject({
      hasWebGL:          true,
      hasWebGL2:         true,
      hasWebXR:          false,
      hasOffscreenCanvas: false,
      renderMode:        'local',
      deviceClass:       'desktop',
    });
    expect(Array.isArray(profile.supportedFormats)).toBe(true);
    expect(profile.supportedFormats).toContain('vtp');
  });

  test('renderMode override is applied', () => {
    const profile = buildClientCapabilityProfile({ renderMode: 'remote' });
    expect(profile.renderMode).toBe('remote');
  });

  test('deviceClass is hmd when xr present', () => {
    mockWebGL({ xr: true });
    const profile = buildClientCapabilityProfile();
    expect(profile.deviceClass).toBe('hmd');
  });

  test('hasWebGL2 false when WebGL2 unavailable', () => {
    mockWebGL({ gl: true, gl2: false });
    const profile = buildClientCapabilityProfile();
    expect(profile.hasWebGL2).toBe(false);
  });
});

// ─── compareRenderCapabilities ────────────────────────────────────────────────

const makeProfile = (overrides = {}) =>
  buildClientCapabilityProfile(overrides);

describe('compareRenderCapabilities', () => {
  test('returns UNKNOWN when viewConfig is null', () => {
    expect(compareRenderCapabilities(null, new Map(), makeProfile())).toBe(CONSISTENCY_STATUS.UNKNOWN);
  });

  test('returns UNKNOWN when clientProfile is null', () => {
    const vc = { datasetRefs: [{ datasetId: 'ds-1' }] };
    expect(compareRenderCapabilities(vc, new Map(), null)).toBe(CONSISTENCY_STATUS.UNKNOWN);
  });

  test('returns UNKNOWN when datasetRefs is empty', () => {
    const vc = { datasetRefs: [] };
    expect(compareRenderCapabilities(vc, new Map(), makeProfile())).toBe(CONSISTENCY_STATUS.UNKNOWN);
  });

  test('returns COMPATIBLE_UNVERIFIED when datasetRef has no contentHash', () => {
    const vc = { datasetRefs: [{ datasetId: 'ds-1', contentHash: null }] };
    const res = new Map([['ds-1', { status: 'unverified' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.COMPATIBLE_UNVERIFIED);
  });

  test('returns CONSISTENT when contentHash is present and verified', () => {
    const vc = { datasetRefs: [{ datasetId: 'ds-1', contentHash: 'abc123', format: 'vtp' }] };
    const res = new Map([['ds-1', { status: 'verified' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.CONSISTENT);
  });

  test('returns INCOMPATIBLE when resolution status is hash_mismatch', () => {
    const vc = { datasetRefs: [{ datasetId: 'ds-1', contentHash: 'abc', format: 'vtp' }] };
    const res = new Map([['ds-1', { status: 'hash_mismatch' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.INCOMPATIBLE);
  });

  test('returns INCOMPATIBLE when dataset is missing', () => {
    const vc = { datasetRefs: [{ datasetId: 'ds-1' }] };
    const res = new Map([['ds-1', { status: 'missing' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.INCOMPATIBLE);
  });

  test('returns INCOMPATIBLE when format is not in supportedFormats', () => {
    const vc = { datasetRefs: [{ datasetId: 'ds-1', format: 'exotic_format' }] };
    const res = new Map([['ds-1', { status: 'unverified' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.INCOMPATIBLE);
  });

  test('returns INCOMPATIBLE when WebGL2 required but unavailable', () => {
    mockWebGL({ gl: true, gl2: false });
    const vc = {
      datasetRefs:   [{ datasetId: 'ds-1', format: 'vtp' }],
      compatibility: { requiresWebGL2: true },
    };
    const res = new Map([['ds-1', { status: 'unverified' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.INCOMPATIBLE);
  });

  test('returns DEGRADED when WebXR required but unavailable', () => {
    mockWebGL({ xr: false });
    const vc = {
      datasetRefs:   [{ datasetId: 'ds-1', format: 'vtp' }],
      compatibility: { requiresWebXR: true },
    };
    const res = new Map([['ds-1', { status: 'unverified' }]]);
    expect(compareRenderCapabilities(vc, res, makeProfile())).toBe(CONSISTENCY_STATUS.DEGRADED);
  });

  test('returns DEGRADED when local render required but profile is remote', () => {
    const vc = {
      datasetRefs:   [{ datasetId: 'ds-1', format: 'vtp' }],
      compatibility: { requiresLocalRender: true },
    };
    const res = new Map([['ds-1', { status: 'unverified' }]]);
    const profile = makeProfile({ renderMode: 'remote' });
    expect(compareRenderCapabilities(vc, res, profile)).toBe(CONSISTENCY_STATUS.DEGRADED);
  });

  test('Apple Vision Pro thin-client (renderMode=remote) passes without INCOMPATIBLE for normal view', () => {
    // A view with no local-render requirement should not be INCOMPATIBLE for a remote client
    const vc = {
      datasetRefs:   [{ datasetId: 'ds-1', format: 'vtp' }],
      compatibility: {},
    };
    const res     = new Map([['ds-1', { status: 'unverified' }]]);
    const profile = makeProfile({ renderMode: 'remote', deviceClass: 'hmd' });
    const status  = compareRenderCapabilities(vc, res, profile);
    expect([CONSISTENCY_STATUS.CONSISTENT, CONSISTENCY_STATUS.COMPATIBLE_UNVERIFIED]).toContain(status);
  });
});
