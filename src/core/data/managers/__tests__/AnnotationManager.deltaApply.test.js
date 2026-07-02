// src/core/data/managers/__tests__/AnnotationManager.deltaApply.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks — must be hoisted (no top-level variable references inside factories)
// ============================================================================

vi.mock('@Utils/logger.js', () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return {
    annotation: mkLog(), view: mkLog(), viewGroup: mkLog(), sync: mkLog(),
    presence: mkLog(), app: mkLog(), wsa: mkLog(),
    createLogger: () => mkLog(),
  };
});

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(), post: vi.fn(), get: vi.fn(), delete: vi.fn() }
}));

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { apiBaseUrl: '/api', debugEnabled: false },
  default: { apiBaseUrl: '/api', debugEnabled: false },
}));

vi.mock('@Core/session/sessionManager.js', () => ({
  sessionManager: { getProjectId: vi.fn(() => 'proj-1') }
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn(() => 'user-1'),
  getUserName: vi.fn(() => 'Test'),
  getUserColor: vi.fn(() => '#ff0000'),
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
  canAutoMergeSafe: vi.fn(() => false),
}));

import { AnnotationManager } from '../AnnotationManager.js';
import { apiClient as mockApiClient } from '@Services/apiClient.js';

// ============================================================================
// Helpers
// ============================================================================

function makeManager() {
  const mockDatasetManager = {
    getDataset: vi.fn(),
    getAllDatasets: vi.fn(() => []),
  };
  return new AnnotationManager(mockDatasetManager);
}

function makeAnnotation(overrides = {}) {
  return {
    id: 'ann-1',
    datasetId: 'ds-1',
    text: 'Hello',
    type: 'point',
    position: [1, 2, 3],
    normal: null,
    visibility: 'public',
    tags: [],
    sharedWith: [],
    metadata: {},
    ownership: 'individual',
    groupId: null,
    groupName: null,
    contributors: [],
    creationContext: { mode: 'desktop' },
    createdBy: 'user-1',
    createdAt: 1000,
    modifiedBy: null,
    modifiedAt: null,
    revision: 3,
    hasConflict: false,
    conflict: null,
    ...overrides,
  };
}

function makeDataset(annotations = []) {
  const annMap = new Map(annotations.map(a => [a.id, a]));
  return {
    id: 'ds-1',
    getAnnotation: vi.fn(id => annMap.get(id) || null),
    removeAnnotation: vi.fn(id => annMap.delete(id)),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('AnnotationManager.applyDeltaEvent', () => {
  let mgr;
  let ann;
  let dataset;

  beforeEach(() => {
    vi.clearAllMocks();
    mgr = makeManager();
    ann = makeAnnotation();
    dataset = makeDataset([ann]);
    mgr._datasetManager.getAllDatasets.mockReturnValue([dataset]);
    mgr._datasetManager.getDataset.mockReturnValue(dataset);
  });

  // ── Tombstone ──────────────────────────────────────────────────────────────

  test('tombstone removes annotation from dataset', async () => {
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'delete', payload_type: 'tombstone', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(dataset.removeAnnotation).toHaveBeenCalledWith('ann-1');
  });

  test('tombstone is a no-op when annotation not in local state', async () => {
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-unknown',
      operation: 'delete', payload_type: 'tombstone', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(dataset.removeAnnotation).not.toHaveBeenCalled();
  });

  // ── Snapshot ───────────────────────────────────────────────────────────────

  test('snapshot event routes through handleServerBroadcast with fileId mapped', async () => {
    const broadcastSpy = vi.spyOn(mgr, 'handleServerBroadcast');
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'update', payload_type: 'snapshot', next_revision: 4,
      snapshot: { id: 'ann-1', dataset_id: 'ds-1', text: 'Updated', revision: 4 },
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(broadcastSpy).toHaveBeenCalledWith(
      'annotation:updated',
      expect.objectContaining({
        annotation: expect.objectContaining({ fileId: 'ds-1', text: 'Updated' }),
      })
    );
  });

  // ── Patch ──────────────────────────────────────────────────────────────────

  test('patch event applies text change to local annotation', async () => {
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/text', value: 'Patched text' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(ann.text).toBe('Patched text');
    expect(ann.revision).toBe(4);
  });

  test('patch event applies visibility change', async () => {
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/visibility', value: 'private' }],
    };
    await mgr.applyDeltaEvent(event);
    expect(ann.visibility).toBe('private');
  });

  test('patch event with missing local annotation returns false', async () => {
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-missing',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/text', value: 'X' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
  });

  test('duplicate patch (already at next_revision) is idempotent and returns true', async () => {
    ann.revision = 5;
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/text', value: 'Old text' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(ann.text).toBe('Hello'); // not changed
  });

  test('failed patch (applyPatch throws) returns false', async () => {
    const { patch } = await import('@Utils/jsonPatch.js');
    patch.mockImplementationOnce(() => { throw new Error('corrupt ops'); });

    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/text', value: 'X' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
    // Annotation should be unchanged after failed patch
    expect(ann.revision).toBe(3);
  });

  // ── Unknown format ─────────────────────────────────────────────────────────

  test('event with neither patch nor snapshot returns false', async () => {
    const event = {
      id: 10, entity_type: 'annotation', entity_id: 'ann-1',
      operation: 'update', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
  });
});
