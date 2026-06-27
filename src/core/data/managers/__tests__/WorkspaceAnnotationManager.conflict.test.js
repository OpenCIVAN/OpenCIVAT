// src/core/data/managers/__tests__/WorkspaceAnnotationManager.conflict.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@Utils/logger.js', () => ({
  wsa: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

const mockApiClient = { put: vi.fn(), post: vi.fn(), get: vi.fn() };
vi.mock('@Services/apiClient.js', () => ({ apiClient: mockApiClient }));

// Import AFTER mocks
import WorkspaceAnnotationManager from '../WorkspaceAnnotationManager.js';

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
    mgr.registerAnnotation(makeAnnotation({ hasConflict: true, conflict: {} }));
    const result = await mgr.updateWorkspaceAnnotation('wa-1', { text_content: 'Blocked' });
    expect(result).toBeNull();
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  test('re-throws non-conflict errors', async () => {
    mgr.registerAnnotation(makeAnnotation());
    mockApiClient.put.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    await expect(mgr.updateWorkspaceAnnotation('wa-1', {})).rejects.toBeDefined();
  });

  // ── resolveConflictUseServer ──────────────────────────────────────────────

  test('resolveConflictUseServer adopts server state and clears conflict', () => {
    mgr.registerAnnotation(makeAnnotation({
      revision: 3,
      hasConflict: true,
      conflict: {
        serverObject: { id: 'wa-1', revision: 5, text_content: 'Server text', visibility: 'public' },
      },
    }));

    mgr.resolveConflictUseServer('wa-1');

    const stored = mgr.getAnnotation('wa-1');
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
    mgr.registerAnnotation(makeAnnotation({
      revision: 3,
      hasConflict: true,
      conflict: {
        serverRevision: 5,
        clientObject: { text_content: 'My changes', base_revision: 3 },
      },
    }));

    mockApiClient.put.mockResolvedValueOnce({ id: 'wa-1', revision: 6 });

    await mgr.resolveConflictOverwrite('wa-1');

    expect(mockApiClient.put).toHaveBeenCalledWith(
      '/workspace-annotations/wa-1',
      expect.objectContaining({ force_overwrite: true })
    );
    expect(mgr.getAnnotation('wa-1').hasConflict).toBe(false);
  });
});
