// src/ui/react/components/organisms/__tests__/ConflictResolutionDialog.test.jsx
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@UI/react/components/atoms/Button', () => ({
  Button: ({ children, onClick, disabled, title, ...rest }) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  ),
}));

vi.mock('@Utils/jsonPatch.js', () => ({
  diff: vi.fn(() => []),
  canAutoMergeSafe: vi.fn(() => true),
  merge: vi.fn((base) => base),
  VIEW_SAFE_MERGE_FIELDS: new Set(['camera', 'name']),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(),
}));
vi.mock('@UI/react/store/toastStore', () => ({
  toast: toastMock,
}));

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { put: vi.fn(() => Promise.resolve({})) },
}));

vi.mock('@Utils/conflictStrategies.js', () => ({
  CONFLICT_STRATEGIES: {
    view_configuration: {
      displayName: 'View Configuration',
      entityLabel: 'view',
      supportsDuplication: true,
      safeFields: new Set(['camera', 'name']),
      identityFields: new Set(['dataset_id', 'project_id']),
      resolverId: 'viewConfigurationManager',
      mergeWarning: 'Cannot auto-merge layout fields',
      duplicationUnsupportedReason: null,
    },
    annotation: {
      displayName: 'Annotation',
      entityLabel: 'annotation',
      supportsDuplication: false,
      safeFields: new Set(['visibility']),
      resolverId: 'annotationManager',
      mergeWarning: 'Position/text cannot be auto-merged',
      duplicationUnsupportedReason: 'Annotations need re-positioning',
    },
    viewgroup: {
      displayName: 'View Group',
      entityLabel: 'view group',
      supportsDuplication: false,
      safeFields: new Set(['name', 'color']),
      resolverId: 'viewGroupManager',
      mergeWarning: 'Layout cannot be auto-merged',
      duplicationUnsupportedReason: 'Duplication needs manual slot mapping',
    },
  },
}));

import { ConflictResolutionDialog } from '../ConflictResolutionDialog.jsx';
import { diff, canAutoMergeSafe } from '@Utils/jsonPatch.js';

// ============================================================================
// Helpers
// ============================================================================

function makeConflict(overrides = {}) {
  return {
    entityType: 'view_configuration',
    entityId: 'view-1',
    clientBaseRevision: 2,
    serverRevision: 5,
    serverObject: { id: 'view-1', name: 'Server Version', revision: 5 },
    clientObject: { id: 'view-1', name: 'My Version', revision: 2 },
    updatedBy: 'user-2',
    updatedAt: '2024-06-01T12:00:00Z',
    ...overrides,
  };
}

function makeManager() {
  return {
    resolveConflictUseServer: vi.fn(),
    resolveConflictOverwrite: vi.fn(),
    resolveConflictSaveAsCopy: vi.fn(),
  };
}

function dispatchConflict(conflict) {
  act(() => {
    window.dispatchEvent(new CustomEvent('cia:sync-conflict', { detail: conflict }));
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('ConflictResolutionDialog — generic behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    diff.mockReturnValue([]);
    canAutoMergeSafe.mockReturnValue(true);
    window.CIA = {};
  });

  afterEach(() => {
    delete window.CIA;
  });

  test('is not visible before any conflict event', () => {
    render(<ConflictResolutionDialog />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('renders when cia:sync-conflict fires for view_configuration', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/View Configuration Conflict/i)).toBeTruthy();
  });

  test('renders for annotation entityType with correct title', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({ entityType: 'annotation' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Annotation Conflict/i)).toBeTruthy();
  });

  test('renders for viewgroup entityType with correct title', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({ entityType: 'viewgroup', entityId: 'vg-1' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/View Group Conflict/i)).toBeTruthy();
  });

  test('does not render for unknown entity types', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({ entityType: 'unknown_entity' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('projects serverObject down to clientObject\'s keys before diffing, so DB-only fields (id, revision, timestamps) never appear as phantom overlaps', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({
      clientObject: { camera: { fov: 60 }, name: 'Mine' },
      serverObject: {
        id: 'view-1',
        revision: 9,
        created_at: '2024-06-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
        camera: { fov: 75 },
        name: 'Mine',
      },
    }));

    // First diff() call is serverDiff = diff(clientObject, serverObjectForDiff).
    const [baseArg, nextArg] = diff.mock.calls[0];
    expect(baseArg).toEqual({ camera: { fov: 60 }, name: 'Mine' });
    // serverObjectForDiff must be projected to clientObject's key set only —
    // id/revision/created_at/updated_at must not leak in as comparison noise.
    expect(Object.keys(nextArg).sort()).toEqual(['camera', 'name']);
    expect(nextArg.camera).toEqual({ fov: 75 });
    expect(nextArg.name).toBe('Mine');
  });

  test('excludes identityFields (dataset_id/project_id) from the diff entirely, even when they differ', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({
      clientObject: { dataset_id: 'builtin-lungs', project_id: 'proj-1', camera: { fov: 60 } },
      serverObject: { dataset_id: null, project_id: null, camera: { fov: 75 } },
    }));

    const [baseArg, nextArg] = diff.mock.calls[0];
    // Neither side of the diff should carry dataset_id/project_id at all —
    // built-in datasets are null server-side by design, not a real conflict.
    expect(baseArg).not.toHaveProperty('dataset_id');
    expect(baseArg).not.toHaveProperty('project_id');
    expect(nextArg).not.toHaveProperty('dataset_id');
    expect(nextArg).not.toHaveProperty('project_id');
    expect(Object.keys(nextArg)).toEqual(['camera']);
  });

  test('"Use server version" calls resolveConflictUseServer', async () => {
    const mgr = makeManager();
    window.CIA.viewConfigurationManager = mgr;

    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/use server version/i)); });
    expect(mgr.resolveConflictUseServer).toHaveBeenCalledWith('view-1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('"Keep mine" shows confirmation step on first click', async () => {
    window.CIA.viewConfigurationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/keep mine \(overwrite\)/i)); });
    expect(screen.getByText(/overwrites server/i)).toBeTruthy();
  });

  test('"Keep mine" calls overwrite on second click', async () => {
    const mgr = makeManager();
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/keep mine \(overwrite\)/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/confirm: keep mine/i)); });
    expect(mgr.resolveConflictOverwrite).toHaveBeenCalledWith('view-1');
  });

  test('"Save as copy" is available for view_configuration (supportsDuplication: true)', () => {
    window.CIA.viewConfigurationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    const copyBtn = screen.getByText(/save mine as new copy/i);
    expect(copyBtn.closest('button')).toHaveProperty('disabled', false);
  });

  test('"Save as copy" is disabled for annotation (supportsDuplication: false)', () => {
    window.CIA.annotationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({ entityType: 'annotation' }));

    const unavailBtn = screen.getByText(/save as copy \(unavailable\)/i);
    expect(unavailBtn.closest('button')).toHaveProperty('disabled', true);
  });

  test('"Save as copy" is disabled for viewgroup (supportsDuplication: false)', () => {
    window.CIA.viewGroupManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({ entityType: 'viewgroup', entityId: 'vg-1' }));

    const unavailBtn = screen.getByText(/save as copy \(unavailable\)/i);
    expect(unavailBtn.closest('button')).toHaveProperty('disabled', true);
  });

  test('Merge button enabled when canAutoMergeSafe returns true', () => {
    canAutoMergeSafe.mockReturnValue(true);
    window.CIA.viewConfigurationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    const mergeBtn = screen.getByText(/merge \(safe/i);
    expect(mergeBtn.closest('button')).toHaveProperty('disabled', false);
  });

  test('Merge button disabled when canAutoMergeSafe returns false', () => {
    canAutoMergeSafe.mockReturnValue(false);
    window.CIA.viewConfigurationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    const mergeBtn = screen.getByText(/merge \(unavailable/i);
    expect(mergeBtn.closest('button')).toHaveProperty('disabled', true);
  });

  test('Merge uses entity-specific safe fields via strategy', () => {
    window.CIA.annotationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict({ entityType: 'annotation' }));

    // canAutoMergeSafe should be called with annotation's safeFields
    expect(canAutoMergeSafe).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.objectContaining({ has: expect.any(Function) }) // annotation safeFields Set
    );
  });

  test('dismiss button closes dialog', () => {
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());
    expect(screen.getByRole('dialog')).toBeTruthy();

    act(() => { fireEvent.click(screen.getByLabelText(/close conflict dialog/i)); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // ==========================================================================
  // Toast feedback (gap fix: resolution outcome was previously silent)
  // ==========================================================================

  test('"Use server version" shows a success toast on success', async () => {
    const mgr = makeManager();
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/use server version/i)); });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/server version/i));
  });

  test('"Use server version" shows an error toast when the resolver throws', async () => {
    const mgr = makeManager();
    mgr.resolveConflictUseServer.mockImplementation(() => { throw new Error('boom'); });
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/use server version/i)); });
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/boom/));
    // Dialog still dismisses so the user is not stuck
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('"Keep mine" (confirmed) shows a success toast', async () => {
    const mgr = makeManager();
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/keep mine \(overwrite\)/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/confirm: keep mine/i)); });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/kept and pushed/i));
  });

  test('"Keep mine" (confirmed) shows an error toast when overwrite rejects', async () => {
    const mgr = makeManager();
    mgr.resolveConflictOverwrite.mockRejectedValue(new Error('network down'));
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/keep mine \(overwrite\)/i)); });
    await act(async () => { fireEvent.click(screen.getByText(/confirm: keep mine/i)); });
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/network down/));
  });

  test('"Save as copy" shows a success toast', async () => {
    const mgr = makeManager();
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/save mine as new copy/i)); });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/saved as a new/i));
  });

  test('Merge failure shows an error toast and keeps dialog open for manual resolution', async () => {
    canAutoMergeSafe.mockReturnValue(true);
    const { apiClient } = await import('@Services/apiClient.js');
    apiClient.put.mockRejectedValueOnce(new Error('server rejected merge'));
    window.CIA.viewConfigurationManager = makeManager();

    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/merge \(safe/i)); });
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/auto-merge failed/i));
    // Dialog stays open (unlike other actions) so the user can pick another resolution
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  test('Merge success shows a success toast', async () => {
    canAutoMergeSafe.mockReturnValue(true);
    const { apiClient } = await import('@Services/apiClient.js');
    apiClient.put.mockResolvedValueOnce({});
    window.CIA.viewConfigurationManager = makeManager();

    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    await act(async () => { fireEvent.click(screen.getByText(/merge \(safe/i)); });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/merged independent changes/i));
  });

  // ==========================================================================
  // Field-level conflict summary (UX polish: show what actually conflicts)
  // ==========================================================================

  test('shows which fields changed on each side', () => {
    diff.mockImplementation((a, b) => {
      // server diff: base(client) -> server
      if (b?.name === 'Server Version') return [{ path: '/name', op: 'replace' }];
      // client diff: base(server) -> client
      if (b?.name === 'My Version') return [{ path: '/camera', op: 'replace' }];
      return [];
    });
    window.CIA.viewConfigurationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    expect(screen.getByText(/their changes:/i)).toBeTruthy();
    expect(screen.getByText(/your changes:/i)).toBeTruthy();
  });

  test('flags overlapping fields edited by both sides', () => {
    diff.mockImplementation(() => [{ path: '/name', op: 'replace' }]);
    window.CIA.viewConfigurationManager = makeManager();
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    expect(screen.getByText(/overlapping field/i)).toBeTruthy();
  });

  test('shows an "applying resolution" status while resolving', async () => {
    const mgr = makeManager();
    let resolveOverwrite;
    mgr.resolveConflictOverwrite.mockReturnValue(new Promise((res) => { resolveOverwrite = res; }));
    window.CIA.viewConfigurationManager = mgr;
    render(<ConflictResolutionDialog />);
    dispatchConflict(makeConflict());

    fireEvent.click(screen.getByText(/keep mine \(overwrite\)/i));
    fireEvent.click(screen.getByText(/confirm: keep mine/i));

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByLabelText(/close conflict dialog/i)).toBeDisabled();

    await act(async () => { resolveOverwrite(); });
  });
});
