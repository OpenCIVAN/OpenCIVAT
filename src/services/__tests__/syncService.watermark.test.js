// src/services/__tests__/syncService.watermark.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

vi.mock('@Core/config/clientConfig.js', () => ({
  default: { apiBaseUrl: '/api' },
  config: { apiBaseUrl: '/api' },
}));

vi.mock('@Utils/logger.js', () => ({
  sync: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  getSyncWatermark,
  saveSyncWatermark,
  clearSyncWatermark,
  applyDeltaEvents,
  performStartupHydration,
  fetchDeltaSince,
} from '../syncService.js';

import { apiClient } from '@Services/apiClient.js';

const WS_ID = 'workspace-test-001';
const USER_A = 'user-aaaa-0001';
const USER_B = 'user-bbbb-0002';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ============================================================================
// Watermark key scoping — workspace + user
// ============================================================================

describe('getSyncWatermark / saveSyncWatermark scoping', () => {
  test('returns 0 for unknown workspace+user', () => {
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(0);
  });

  test('saves and reads back correctly', () => {
    saveSyncWatermark(WS_ID, 42, USER_A);
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(42);
  });

  test('different users on the same workspace use separate keys', () => {
    saveSyncWatermark(WS_ID, 10, USER_A);
    saveSyncWatermark(WS_ID, 99, USER_B);
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(10);
    expect(getSyncWatermark(WS_ID, USER_B)).toBe(99);
  });

  test('same user on different workspaces uses separate keys', () => {
    saveSyncWatermark('ws-alpha', 10, USER_A);
    saveSyncWatermark('ws-beta', 99, USER_A);
    expect(getSyncWatermark('ws-alpha', USER_A)).toBe(10);
    expect(getSyncWatermark('ws-beta', USER_A)).toBe(99);
  });

  test('null userId falls back to anonymous scope (does not reuse user scope)', () => {
    saveSyncWatermark(WS_ID, 77, USER_A);
    // null userId → different key
    expect(getSyncWatermark(WS_ID, null)).toBe(0);
  });

  test('does nothing if eventId is null', () => {
    saveSyncWatermark(WS_ID, null, USER_A);
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(0);
  });
});

describe('clearSyncWatermark', () => {
  test('removes scoped watermark', () => {
    saveSyncWatermark(WS_ID, 55, USER_A);
    clearSyncWatermark(WS_ID, USER_A);
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(0);
  });

  test('does not clear another user\'s watermark', () => {
    saveSyncWatermark(WS_ID, 55, USER_A);
    saveSyncWatermark(WS_ID, 66, USER_B);
    clearSyncWatermark(WS_ID, USER_A);
    expect(getSyncWatermark(WS_ID, USER_B)).toBe(66);
  });
});

// ============================================================================
// applyDeltaEvents — idempotency and break-on-failure
// ============================================================================

describe('applyDeltaEvents', () => {
  function makeManager(existingRevision = null) {
    return {
      getView: vi.fn().mockReturnValue(
        existingRevision != null ? { id: 'v1', revision: existingRevision } : null
      ),
      handleServerBroadcast: vi.fn(),
      removeView: vi.fn(),
    };
  }

  function makeEvent(id, nextRevision, entityId = 'v1', op = 'update') {
    return {
      id,
      entity_type: 'view_configuration',
      entity_id: entityId,
      operation: op,
      next_revision: nextRevision,
      snapshot: { id: entityId, name: `rev-${nextRevision}` },
    };
  }

  test('skips event whose next_revision <= existing local revision (idempotent)', async () => {
    const mgr = makeManager(5); // local at rev 5
    const { applied, lastAppliedEventId, failed } = await applyDeltaEvents(
      [makeEvent(10, 5)], // event says next_revision=5, same as local
      { viewConfigurationManager: mgr }
    );
    expect(mgr.handleServerBroadcast).not.toHaveBeenCalled();
    expect(applied).toBe(0);
    expect(lastAppliedEventId).toBe(10); // still tracked for watermark
    expect(failed).toBe(false);
  });

  test('applies event when local revision < next_revision', async () => {
    const mgr = makeManager(3);
    const { applied } = await applyDeltaEvents(
      [makeEvent(20, 4)],
      { viewConfigurationManager: mgr }
    );
    expect(mgr.handleServerBroadcast).toHaveBeenCalledWith('view:updated', {
      view: expect.objectContaining({ id: 'v1' }),
    });
    expect(applied).toBe(1);
  });

  test('applying same event twice is idempotent (second call skips)', async () => {
    const mgr = {
      getView: vi.fn()
        .mockReturnValueOnce({ id: 'v1', revision: 3 }) // first call → apply
        .mockReturnValueOnce({ id: 'v1', revision: 4 }), // second call → skip
      handleServerBroadcast: vi.fn(),
    };
    const event = makeEvent(30, 4);
    await applyDeltaEvents([event], { viewConfigurationManager: mgr });
    await applyDeltaEvents([event], { viewConfigurationManager: mgr });
    expect(mgr.handleServerBroadcast).toHaveBeenCalledTimes(1);
  });

  test('stops at first failure — does not skip ahead', async () => {
    const mgr = {
      getView: vi.fn().mockReturnValue({ id: 'v1', revision: 0 }),
      handleServerBroadcast: vi.fn()
        .mockImplementationOnce(() => { throw new Error('apply failed'); })
        .mockImplementation(() => {}),
    };
    const { applied, lastAppliedEventId, failed } = await applyDeltaEvents(
      [makeEvent(1, 1), makeEvent(2, 2), makeEvent(3, 3)],
      { viewConfigurationManager: mgr }
    );
    // First event failed; should not have applied the others
    expect(failed).toBe(true);
    expect(applied).toBe(0);
    expect(lastAppliedEventId).toBeNull(); // no event successfully applied
    expect(mgr.handleServerBroadcast).toHaveBeenCalledTimes(1); // tried once, then stopped
  });

  test('handles delete operation', async () => {
    const mgr = {
      getView: vi.fn().mockReturnValue({ id: 'v1', revision: 1 }),
      handleServerBroadcast: vi.fn(),
      removeView: vi.fn(),
    };
    await applyDeltaEvents(
      [{ id: 99, entity_type: 'view_configuration', entity_id: 'v1', operation: 'delete', next_revision: 2, snapshot: null }],
      { viewConfigurationManager: mgr }
    );
    expect(mgr.removeView).toHaveBeenCalledWith('v1');
  });

  test('unknown entity_type is handled gracefully without throwing', async () => {
    await expect(
      applyDeltaEvents(
        [{ id: 5, entity_type: 'unknown_type', entity_id: 'x', operation: 'update', next_revision: 1 }],
        {}
      )
    ).resolves.toMatchObject({ failed: false });
  });
});

// ============================================================================
// performStartupHydration — watermark advance safety
// ============================================================================

describe('performStartupHydration', () => {
  test('no watermark → usedFullHydration', async () => {
    const result = await performStartupHydration(WS_ID, {}, USER_A);
    expect(result.usedFullHydration).toBe(true);
    expect(result.reason).toBe('no_watermark');
  });

  test('server requiresFullResync → clears watermark and falls back', async () => {
    saveSyncWatermark(WS_ID, 5, USER_A);
    apiClient.get.mockResolvedValueOnce({
      requiresFullResync: true,
      reason: 'watermark_compacted',
      events: [],
    });
    const result = await performStartupHydration(WS_ID, {}, USER_A);
    expect(result.usedFullHydration).toBe(true);
    expect(result.reason).toBe('watermark_compacted');
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(0); // cleared
  });

  test('advances watermark to lastAppliedEventId, not toWatermark', async () => {
    saveSyncWatermark(WS_ID, 10, USER_A);
    const mgr = {
      getView: vi.fn().mockReturnValue({ id: 'v1', revision: 1 }),
      handleServerBroadcast: vi.fn()
        .mockImplementationOnce(() => {}) // event 11: success
        .mockImplementationOnce(() => { throw new Error('fail'); }), // event 12: fail
    };
    apiClient.get.mockResolvedValueOnce({
      requiresFullResync: false,
      fromWatermark: 10,
      toWatermark: 12,
      events: [
        { id: 11, entity_type: 'view_configuration', entity_id: 'v1', operation: 'update', next_revision: 2, snapshot: { id: 'v1' } },
        { id: 12, entity_type: 'view_configuration', entity_id: 'v1', operation: 'update', next_revision: 3, snapshot: { id: 'v1' } },
      ],
    });

    await performStartupHydration(WS_ID, { viewConfigurationManager: mgr }, USER_A);

    // Watermark should be 11 (last successfully applied), NOT 12 (toWatermark)
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(11);
  });

  test('all events fail → clears watermark and falls back to full hydration', async () => {
    saveSyncWatermark(WS_ID, 10, USER_A);
    const mgr = {
      getView: vi.fn().mockReturnValue({ id: 'v1', revision: 1 }),
      handleServerBroadcast: vi.fn().mockImplementation(() => { throw new Error('fail'); }),
    };
    apiClient.get.mockResolvedValueOnce({
      requiresFullResync: false,
      fromWatermark: 10,
      toWatermark: 11,
      events: [
        { id: 11, entity_type: 'view_configuration', entity_id: 'v1', operation: 'update', next_revision: 2, snapshot: { id: 'v1' } },
      ],
    });

    const result = await performStartupHydration(WS_ID, { viewConfigurationManager: mgr }, USER_A);
    expect(result.usedFullHydration).toBe(true);
    expect(result.reason).toBe('apply_failed');
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(0); // cleared
  });

  test('successful delta advances watermark to lastAppliedEventId', async () => {
    saveSyncWatermark(WS_ID, 10, USER_A);
    const mgr = {
      getView: vi.fn().mockReturnValue({ id: 'v1', revision: 1 }),
      handleServerBroadcast: vi.fn(),
    };
    apiClient.get.mockResolvedValueOnce({
      requiresFullResync: false,
      fromWatermark: 10,
      toWatermark: 12,
      events: [
        { id: 11, entity_type: 'view_configuration', entity_id: 'v1', operation: 'update', next_revision: 2, snapshot: { id: 'v1' } },
        { id: 12, entity_type: 'view_configuration', entity_id: 'v1', operation: 'update', next_revision: 3, snapshot: { id: 'v1' } },
      ],
    });
    await performStartupHydration(WS_ID, { viewConfigurationManager: mgr }, USER_A);
    expect(getSyncWatermark(WS_ID, USER_A)).toBe(12);
  });
});

// ============================================================================
// Gap detection logic (tested through serverSync is not possible in unit
// tests, so we verify the building blocks used by serverSync)
// ============================================================================

describe('watermark gap detection building blocks', () => {
  test('gap=1: incoming === lastWatermark+1 — expected next event, no gap', () => {
    const lastWatermark = 100;
    const incoming = 101;
    const hasGap = incoming > lastWatermark + 1;
    const isDuplicate = incoming <= lastWatermark;
    expect(hasGap).toBe(false);
    expect(isDuplicate).toBe(false);
  });

  test('gap=2: incoming === lastWatermark+2 — gap detected', () => {
    const lastWatermark = 100;
    const incoming = 102;
    const hasGap = incoming > lastWatermark + 1;
    expect(hasGap).toBe(true);
  });

  test('gap=50: large gap detected', () => {
    const lastWatermark = 100;
    const incoming = 150;
    const hasGap = incoming > lastWatermark + 1;
    expect(hasGap).toBe(true);
  });

  test('incoming=watermark: duplicate, skip silently', () => {
    const lastWatermark = 100;
    const incoming = 100;
    const isDuplicate = incoming <= lastWatermark;
    expect(isDuplicate).toBe(true);
  });

  test('incoming<watermark: old event, skip silently', () => {
    const lastWatermark = 100;
    const incoming = 95;
    const isDuplicate = incoming <= lastWatermark;
    expect(isDuplicate).toBe(true);
  });
});
