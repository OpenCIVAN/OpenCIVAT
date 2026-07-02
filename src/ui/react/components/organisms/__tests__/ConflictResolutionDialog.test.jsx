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
  VIEW_SAFE_MERGE_FIELDS: new Set(['camera', 'name']),
}));

vi.mock('@Utils/conflictStrategies.js', () => ({
  CONFLICT_STRATEGIES: {
    view_configuration: {
      displayName: 'View Configuration',
      entityLabel: 'view',
      supportsDuplication: true,
      safeFields: new Set(['camera', 'name']),
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
});
