// src/core/data/managers/__tests__/ViewGroupManager.deltaApply.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks — no top-level variables inside vi.mock factories (hoisting safe)
// ============================================================================

vi.mock('@Utils/logger.js', () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return {
    viewGroup: mkLog(), annotation: mkLog(), view: mkLog(), sync: mkLog(),
    presence: mkLog(), app: mkLog(), wsa: mkLog(),
    createLogger: () => mkLog(),
  };
});

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(), post: vi.fn(), get: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

vi.mock('@Core/session/sessionManager.js', () => ({
  sessionManager: { getProjectId: vi.fn(() => 'proj-1') }
}));

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { apiBaseUrl: '/api', defaultSessionId: 'proj-1', debugEnabled: false },
  default: { apiBaseUrl: '/api', defaultSessionId: 'proj-1', debugEnabled: false },
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn(() => 'user-1'),
  getUserName: vi.fn(() => 'Test'),
}));

vi.mock('@Utils/jsonPatch.js', () => ({
  patch: vi.fn((base, ops) => {
    const result = { ...base };
    for (const op of ops) {
      const key = op.path.slice(1);
      if (op.op === 'replace' || op.op === 'add') result[key] = op.value;
      else if (op.op === 'remove') delete result[key];
    }
    return result;
  }),
  diff: vi.fn(),
}));

import ViewGroupManager from '../ViewGroupManager.js';

// ============================================================================
// Helpers
// ============================================================================

function makeManager() {
  return new ViewGroupManager();
}

// Minimal server-format viewgroup row (what fromServerResponse expects)
function makeServerVg(overrides = {}) {
  return {
    id: 'vg-1',
    name: 'Test Group',
    color: '#3b82f6',
    layout_id: 'single',
    slots: [],
    link: null,
    canvas_position: { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
    owner_id: 'user-1',
    owner_name: 'Test',
    workspace_id: 'ws-1',
    visibility: 'project',
    shared_with: [],
    revision: 3,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ViewGroupManager.applyDeltaEvent', () => {
  let mgr;

  beforeEach(() => {
    vi.clearAllMocks();
    mgr = makeManager();
    // Pre-load via snapshot path (uses fromServerResponse internally)
    mgr._handleRemoteCreated(makeServerVg());
  });

  // ── Tombstone ──────────────────────────────────────────────────────────────

  test('tombstone removes viewgroup from local state', async () => {
    expect(mgr.getViewGroup('vg-1')).not.toBeNull();

    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'delete', payload_type: 'tombstone', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getViewGroup('vg-1')).toBeNull();
  });

  test('tombstone is a no-op when viewgroup not in local state', async () => {
    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-unknown',
      operation: 'delete', payload_type: 'tombstone', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getViewGroup('vg-1')).not.toBeNull(); // others unaffected
  });

  // ── Snapshot ───────────────────────────────────────────────────────────────

  test('snapshot event updates viewgroup from server data', async () => {
    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'update', payload_type: 'snapshot', next_revision: 4,
      snapshot: makeServerVg({ name: 'Updated Group', revision: 4 }),
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    const updated = mgr.getViewGroup('vg-1');
    expect(updated?.name).toBe('Updated Group');
    expect(updated?.revision).toBe(4);
  });

  // ── Patch ──────────────────────────────────────────────────────────────────

  test('patch event applies name change', async () => {
    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/name', value: 'Patched Name' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    const updated = mgr.getViewGroup('vg-1');
    expect(updated?.name).toBe('Patched Name');
  });

  test('patch event applies layout change', async () => {
    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/layout_id', value: 'side-by-side' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getViewGroup('vg-1')?.layoutId).toBe('side-by-side');
  });

  test('patch event with missing local viewgroup returns false', async () => {
    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-missing',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/name', value: 'X' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
  });

  test('duplicate patch (already at next_revision) is idempotent', async () => {
    // Set revision to 5
    const vg = mgr.getViewGroup('vg-1');
    if (vg) vg.revision = 5;

    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/name', value: 'Old Name' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getViewGroup('vg-1')?.name).toBe('Test Group'); // unchanged
  });

  test('failed patch (applyPatch throws) returns false', async () => {
    const { patch } = await import('@Utils/jsonPatch.js');
    patch.mockImplementationOnce(() => { throw new Error('bad ops'); });

    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/name', value: 'X' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
  });

  // ── Unknown format ─────────────────────────────────────────────────────────

  test('event with neither patch nor snapshot returns false', async () => {
    const event = {
      id: 10, entity_type: 'viewgroup', entity_id: 'vg-1',
      operation: 'update', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
  });
});
