// src/core/data/managers/__tests__/ViewConfigurationManager.conflict.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks for heavy dependencies
// ============================================================================

vi.mock('@Utils/logger.js', () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return {
    view: mkLog(), viewGroup: mkLog(), annotation: mkLog(), sync: mkLog(),
    presence: mkLog(), app: mkLog(), wsa: mkLog(),
    createLogger: () => mkLog(),
  };
});

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { defaultSessionId: 'project-1' },
  default: { defaultSessionId: 'project-1' },
}));

vi.mock('@Core/session/sessionManager.js', () => ({
  sessionManager: { getProjectId: vi.fn().mockReturnValue('project-1') },
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn().mockReturnValue('user-1'),
  getUserName: vi.fn().mockReturnValue('Test User'),
}));

vi.mock('@Collaboration/yjs/yjsSetup.js', () => ({
  ydoc: { getMap: vi.fn().mockReturnValue({ set: vi.fn() }), clientID: 1 },
}));

vi.mock('@Core/instances/types/instanceTypeRegistry.js', () => ({
  instanceTypeRegistry: { get: vi.fn() },
}));

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(), post: vi.fn(), get: vi.fn() }
}));

import { ViewConfigurationManager } from '../ViewConfigurationManager.js';
import { apiClient as mockApiClient } from '@Services/apiClient.js';

// ============================================================================
// Helpers
// ============================================================================

function makeManager() {
  // Use 1 not 0: syncThrottleMs uses || fallback so 0 would become 100ms default
  const mgr = new ViewConfigurationManager({ syncThrottleMs: 1 });
  mgr._projectId = 'project-1';
  return mgr;
}

function makeView(overrides = {}) {
  return {
    id: 'view-1',
    name: 'Test View',
    revision: 3,
    pendingServerSync: false,
    hasConflict: false,
    conflict: null,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ViewConfigurationManager conflict handling', () => {
  let mgr;

  beforeEach(() => {
    mgr = makeManager();
    vi.clearAllMocks();
  });

  test('sends base_revision in PUT request', async () => {
    const view = makeView({ revision: 5 });
    mgr._viewConfigs.set(view.id, view);

    mockApiClient.put.mockResolvedValueOnce({ view: { ...view, revision: 6 } });

    // Trigger sync directly
    mgr._syncToServer(view);
    // Wait for the 0ms timeout
    await new Promise((r) => setTimeout(r, 10));

    expect(mockApiClient.put).toHaveBeenCalledWith(
      `/views/${view.id}`,
      expect.objectContaining({ base_revision: 5 })
    );
  });

  test('updates view.revision from server response', async () => {
    const view = makeView({ revision: 3 });
    mgr._viewConfigs.set(view.id, view);

    mockApiClient.put.mockResolvedValueOnce({ view: { ...view, revision: 4 } });

    mgr._syncToServer(view);
    await new Promise((r) => setTimeout(r, 10));

    expect(view.revision).toBe(4);
    expect(view.pendingServerSync).toBe(false);
  });

  test('surfaces 409 as conflict on view and dispatches window event', async () => {
    const view = makeView({ revision: 2 });
    mgr._viewConfigs.set(view.id, view);

    const conflictError = {
      status: 409,
      details: {
        serverRevision: 5,
        serverObject: { ...view, revision: 5, name: 'Server Version' },
        updatedBy: 'user-2',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    mockApiClient.put.mockRejectedValueOnce(conflictError);

    const conflictEvents = [];
    window.addEventListener('cia:sync-conflict', (e) => conflictEvents.push(e.detail));

    const emittedConflicts = [];
    mgr.on('conflictDetected', (c) => emittedConflicts.push(c));

    mgr._syncToServer(view);
    await new Promise((r) => setTimeout(r, 20));

    expect(view.hasConflict).toBe(true);
    expect(view.conflict).toBeDefined();
    expect(view.conflict.serverRevision).toBe(5);
    expect(view.conflict.clientBaseRevision).toBe(2);
    expect(emittedConflicts).toHaveLength(1);
    expect(conflictEvents).toHaveLength(1);
    expect(conflictEvents[0].entityId).toBe(view.id);

    window.removeEventListener('cia:sync-conflict', () => {});
  });

  test('skips sync when view.hasConflict is true', async () => {
    const view = makeView({ hasConflict: true });
    mgr._viewConfigs.set(view.id, view);

    mgr._syncToServer(view);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  test('resolveConflictUseServer clears conflict and adopts server state', () => {
    const view = makeView({
      revision: 2,
      hasConflict: true,
      conflict: {
        serverObject: { id: 'view-1', name: 'Server Name', revision: 5, server_version: 1 },
      },
    });
    mgr._viewConfigs.set(view.id, view);

    mgr.resolveConflictUseServer(view.id);

    expect(view.hasConflict).toBe(false);
    expect(view.conflict).toBeNull();
    expect(view.name).toBe('Server Name');
    expect(view.revision).toBe(5);
  });

  test('resolveConflictOverwrite sends force_overwrite: true', async () => {
    const view = makeView({
      revision: 2,
      hasConflict: true,
      conflict: { serverRevision: 5, serverObject: {} },
    });
    mgr._viewConfigs.set(view.id, view);

    mockApiClient.put.mockResolvedValueOnce({ view: { ...view, revision: 6 } });

    await mgr.resolveConflictOverwrite(view.id);

    expect(mockApiClient.put).toHaveBeenCalledWith(
      `/views/${view.id}`,
      expect.objectContaining({ force_overwrite: true })
    );
    expect(view.hasConflict).toBe(false);
    expect(view.revision).toBe(6);
  });

  test('clientObject in conflict is a deep copy — subsequent local mutations do not corrupt it', async () => {
    const nestedCamera = { position: [0, 0, 5], fov: 60 };
    const view = makeView({ revision: 3, camera: nestedCamera });
    mgr._viewConfigs.set(view.id, view);

    const conflictError = {
      status: 409,
      details: {
        serverRevision: 5,
        serverObject: { ...view, revision: 5 },
        updatedBy: 'user-2',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };
    mockApiClient.put.mockRejectedValueOnce(conflictError);

    mgr._syncToServer(view);
    await new Promise((r) => setTimeout(r, 20));

    // Verify conflict was set
    expect(view.hasConflict).toBe(true);

    // Mutate the original view's nested object after conflict was captured
    view.camera.fov = 999;

    // The clientObject in the conflict should NOT reflect the mutation
    const capturedCamera = view.conflict.clientObject.camera;
    // clientObject is in server format (snake_case) from _clientToServerFormat
    // camera key should exist and its fov should still be 60 (original value)
    expect(capturedCamera).toBeDefined();
    if (capturedCamera && typeof capturedCamera === 'object') {
      // The captured value must not have been mutated to 999
      expect(capturedCamera.fov).not.toBe(999);
    }
  });
});
