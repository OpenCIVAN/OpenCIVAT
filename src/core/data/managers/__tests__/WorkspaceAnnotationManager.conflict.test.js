// src/core/data/managers/__tests__/WorkspaceAnnotationManager.conflict.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@Utils/logger.js', () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return {
    wsa: mkLog(), annotation: mkLog(), view: mkLog(), viewGroup: mkLog(),
    sync: mkLog(), presence: mkLog(), app: mkLog(),
    createLogger: () => mkLog(),
  };
});

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(), post: vi.fn(), get: vi.fn() }
}));

// Import AFTER mocks
import WorkspaceAnnotationManager from '../WorkspaceAnnotationManager.js';
import { apiClient as mockApiClient } from '@Services/apiClient.js';

// ============================================================================
// Helpers
// ============================================================================

function makeManager() {
  return new WorkspaceAnnotationManager();
}

function makeAnnotation(overrides = {}) {
  return {
    id: 'wa-1',
    type: 'arrow',
    project_id: 'proj-1',
    revision: 3,
    visibility: 'project',
    z_index: 0,
    path_data: { points: [] },
    text_content: 'Hello',
    hasConflict: false,
    conflict: null,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('WorkspaceAnnotationManager', () => {
  let mgr;

  beforeEach(() => {
    mgr = makeManager();
    vi.clearAllMocks();
  });

  // ── Registration ──────────────────────────────────────────────────────────

  test('registerAnnotation stores annotation with revision', () => {
    const ann = makeAnnotation();
    mgr.registerAnnotation(ann);
    const stored = mgr.getAnnotation('wa-1');
    expect(stored).not.toBeNull();
    expect(stored.revision).toBe(3);
    expect(stored.hasConflict).toBe(false);
  });

  test('registerAnnotation updates existing entry', () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 1 }));
    mgr.registerAnnotation(makeAnnotation({ revision: 2, text_content: 'Updated' }));
    expect(mgr.getAnnotation('wa-1').revision).toBe(2);
    expect(mgr.getAnnotation('wa-1').text_content).toBe('Updated');
  });

  test('getAnnotation returns null for unknown id', () => {
    expect(mgr.getAnnotation('nonexistent')).toBeNull();
  });

  // ── updateWorkspaceAnnotation — success ───────────────────────────────────

  test('sends base_revision in PUT request', async () => {
    const ann = makeAnnotation({ revision: 5 });
    mgr.registerAnnotation(ann);

    mockApiClient.put.mockResolvedValueOnce({ id: 'wa-1', revision: 6 });

    await mgr.updateWorkspaceAnnotation('wa-1', { text_content: 'New' });

    expect(mockApiClient.put).toHaveBeenCalledWith(
      '/workspace-annotations/wa-1',
      expect.objectContaining({ base_revision: 5, text_content: 'New' })
    );
  });

  test('updates stored revision after successful PUT', async () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 5 }));
    mockApiClient.put.mockResolvedValueOnce({ id: 'wa-1', revision: 6 });

    await mgr.updateWorkspaceAnnotation('wa-1', { text_content: 'New' });

    expect(mgr.getAnnotation('wa-1').revision).toBe(6);
  });

  // ── updateWorkspaceAnnotation — 409 conflict ──────────────────────────────

  test('409 sets hasConflict and dispatches cia:sync-conflict', async () => {
    const ann = makeAnnotation({ revision: 3 });
    mgr.registerAnnotation(ann);

    const conflictError = {
      status: 409,
      details: {
        serverRevision: 5,
        serverObject: { id: 'wa-1', revision: 5, text_content: 'Server version' },
        updatedBy: 'user-b',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    mockApiClient.put.mockRejectedValueOnce(conflictError);

    const events = [];
    window.addEventListener('cia:sync-conflict', (e) => events.push(e.detail));

    const result = await mgr.updateWorkspaceAnnotation('wa-1', { text_content: 'My edit' });

    expect(result).toBeNull();
    const stored = mgr.getAnnotation('wa-1');
    expect(stored.hasConflict).toBe(true);
    expect(stored.conflict).toBeDefined();
    expect(stored.conflict.entityType).toBe('workspace_annotation');
    expect(stored.conflict.entityId).toBe('wa-1');
    expect(stored.conflict.clientBaseRevision).toBe(3);
    expect(stored.conflict.serverRevision).toBe(5);
    expect(events).toHaveLength(1);
    expect(events[0].entityType).toBe('workspace_annotation');

    window.removeEventListener('cia:sync-conflict', () => {});
  });

  test('skips update when annotation has unresolved conflict', async () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 3 }));
    // Set conflict state directly (registerAnnotation always resets hasConflict)
    const stored = mgr._annotations.get('wa-1');
    stored.hasConflict = true;
    stored.conflict = { entityType: 'workspace_annotation', entityId: 'wa-1' };

    const result = await mgr.updateWorkspaceAnnotation('wa-1', { text_content: 'Blocked' });
    expect(result).toBeNull();
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  test('re-throws non-conflict errors', async () => {
    mgr.registerAnnotation(makeAnnotation());
    mockApiClient.put.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    await expect(mgr.updateWorkspaceAnnotation('wa-1', {})).rejects.toBeDefined();
  });

  // ── applyDeltaEvent ───────────────────────────────────────────────────────

  test('applyDeltaEvent snapshot registers annotation from server data', async () => {
    const event = {
      id: 20, entity_type: 'workspace_annotation', entity_id: 'wa-1',
      operation: 'update', payload_type: 'snapshot', next_revision: 4,
      snapshot: { id: 'wa-1', type: 'arrow', revision: 4, text_content: 'Snap' },
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getAnnotation('wa-1').text_content).toBe('Snap');
    expect(mgr.getAnnotation('wa-1').revision).toBe(4);
  });

  test('applyDeltaEvent patch applies changed fields', async () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 3, visibility: 'public', z_index: 0 }));

    const event = {
      id: 20, entity_type: 'workspace_annotation', entity_id: 'wa-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/visibility', value: 'private' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getAnnotation('wa-1').visibility).toBe('private');
    expect(mgr.getAnnotation('wa-1').revision).toBe(4);
  });

  test('applyDeltaEvent tombstone removes annotation', async () => {
    mgr.registerAnnotation(makeAnnotation());
    const event = {
      id: 20, entity_type: 'workspace_annotation', entity_id: 'wa-1',
      operation: 'delete', payload_type: 'tombstone', next_revision: 4,
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getAnnotation('wa-1')).toBeNull();
  });

  test('applyDeltaEvent patch with missing local state returns false', async () => {
    const event = {
      id: 20, entity_type: 'workspace_annotation', entity_id: 'wa-missing',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/visibility', value: 'private' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(false);
  });

  test('applyDeltaEvent patch is idempotent when already at revision', async () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 5, visibility: 'public' }));
    const event = {
      id: 20, entity_type: 'workspace_annotation', entity_id: 'wa-1',
      operation: 'update', payload_type: 'patch', next_revision: 4,
      patch: [{ op: 'replace', path: '/visibility', value: 'private' }],
    };
    const ok = await mgr.applyDeltaEvent(event);
    expect(ok).toBe(true);
    expect(mgr.getAnnotation('wa-1').visibility).toBe('public'); // not changed
  });

  // ── resolveConflictUseServer ──────────────────────────────────────────────

  test('resolveConflictUseServer adopts server state and clears conflict', () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 3 }));
    // Set conflict state directly (registerAnnotation always resets hasConflict)
    const stored = mgr._annotations.get('wa-1');
    stored.hasConflict = true;
    stored.conflict = {
      serverObject: { id: 'wa-1', revision: 5, text_content: 'Server text', visibility: 'public' },
    };

    mgr.resolveConflictUseServer('wa-1');

    expect(stored.hasConflict).toBe(false);
    expect(stored.conflict).toBeNull();
    expect(stored.revision).toBe(5);
    expect(stored.text_content).toBe('Server text');
  });

  test('resolveConflictUseServer is a no-op when no conflict', () => {
    mgr.registerAnnotation(makeAnnotation());
    mgr.resolveConflictUseServer('wa-1'); // should not throw
    expect(mgr.getAnnotation('wa-1').hasConflict).toBe(false);
  });

  // ── resolveConflictOverwrite ──────────────────────────────────────────────

  test('resolveConflictOverwrite sends force_overwrite: true', async () => {
    mgr.registerAnnotation(makeAnnotation({ revision: 3 }));
    // Set conflict state directly (registerAnnotation always resets hasConflict)
    const stored = mgr._annotations.get('wa-1');
    stored.hasConflict = true;
    stored.conflict = {
      serverRevision: 5,
      clientObject: { text_content: 'My changes', base_revision: 3 },
    };

    mockApiClient.put.mockResolvedValueOnce({ id: 'wa-1', revision: 6 });

    await mgr.resolveConflictOverwrite('wa-1');

    expect(mockApiClient.put).toHaveBeenCalledWith(
      '/workspace-annotations/wa-1',
      expect.objectContaining({ force_overwrite: true })
    );
    expect(stored.hasConflict).toBe(false);
  });
});
