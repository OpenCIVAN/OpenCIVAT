// src/services/__tests__/visualizationSyncService.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';

vi.mock('@Init/appInitializer.js', () => ({
  getViewConfigurationManager: vi.fn(),
}));

vi.mock('@Collaboration/yjs/yjsSetup.js', () => ({
  syncCameraToYjs: vi.fn(),
  syncVisualizationToYjs: vi.fn(),
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn().mockReturnValue('user-1'),
}));

vi.mock('@Core/data/managers/WorkspaceManager.js', () => ({
  workspaceManager: { getActiveWorkspace: vi.fn() },
}));

vi.mock('@Services/permissionService.js', () => ({
  permissionService: {
    getCachedRole: vi.fn(),
    fetchWorkspaceRole: vi.fn().mockResolvedValue('editor'),
    hasPermission: vi.fn(),
  },
  PERMISSIONS: { VIEW_MODIFY_CONFIGURATION: 'view:modify_configuration' },
}));

import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { syncCameraToYjs, syncVisualizationToYjs } from '@Collaboration/yjs/yjsSetup.js';
import { workspaceManager } from '@Core/data/managers/WorkspaceManager.js';
import { permissionService } from '@Services/permissionService.js';
import {
  pushSharedCameraUpdate,
  pushSharedVisualizationUpdate,
  pushSharedWidgetToggle,
  resolveActiveWorkspaceId,
  canModifyActiveView,
} from '../visualizationSyncService.js';

function mockActiveWorkspace(id) {
  workspaceManager.getActiveWorkspace.mockReturnValue(
    id ? { getEffectiveId: () => id } : null
  );
}

describe('visualizationSyncService', () => {
  let mockManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockManager = {
      updateCamera: vi.fn(),
      updateVisualization: vi.fn(),
      getView: vi.fn(),
      updateWidget: vi.fn(),
      addWidget: vi.fn(),
    };
    getViewConfigurationManager.mockReturnValue(mockManager);
  });

  describe('resolveActiveWorkspaceId', () => {
    test('returns the active workspace id', () => {
      mockActiveWorkspace('ws-1');
      expect(resolveActiveWorkspaceId()).toBe('ws-1');
    });

    test('returns null when no workspace is active', () => {
      mockActiveWorkspace(null);
      expect(resolveActiveWorkspaceId()).toBeNull();
    });
  });

  describe('permission gating', () => {
    test('canModifyActiveView is false with no active workspace', () => {
      mockActiveWorkspace(null);
      expect(canModifyActiveView()).toBe(false);
    });

    test('canModifyActiveView reflects permissionService.hasPermission', () => {
      mockActiveWorkspace('ws-1');
      permissionService.getCachedRole.mockReturnValue('editor');
      permissionService.hasPermission.mockReturnValue(true);

      expect(canModifyActiveView()).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledWith('ws-1', 'view:modify_configuration');
    });

    test('kicks off a background role fetch when nothing is cached yet', () => {
      mockActiveWorkspace('ws-2');
      permissionService.getCachedRole.mockReturnValue(null);
      permissionService.hasPermission.mockReturnValue(false);

      canModifyActiveView();

      expect(permissionService.fetchWorkspaceRole).toHaveBeenCalledWith('ws-2');
    });
  });

  describe('pushSharedCameraUpdate', () => {
    test('pushes to Y.js and the manager when permitted', () => {
      mockActiveWorkspace('ws-1');
      permissionService.getCachedRole.mockReturnValue('editor');
      permissionService.hasPermission.mockReturnValue(true);

      const result = pushSharedCameraUpdate('view-1', { position: [0, 0, 5] });

      expect(syncCameraToYjs).toHaveBeenCalledWith('view-1', 'user-1', { position: [0, 0, 5] });
      expect(mockManager.updateCamera).toHaveBeenCalledWith('view-1', { position: [0, 0, 5] });
      expect(result).toEqual({ persisted: true });
    });

    test('does not push when permission is denied', () => {
      mockActiveWorkspace('ws-1');
      permissionService.getCachedRole.mockReturnValue('viewer');
      permissionService.hasPermission.mockReturnValue(false);

      const result = pushSharedCameraUpdate('view-1', { position: [0, 0, 5] });

      expect(syncCameraToYjs).not.toHaveBeenCalled();
      expect(mockManager.updateCamera).not.toHaveBeenCalled();
      expect(result).toEqual({ persisted: false, reason: 'permission-denied' });
    });

    test('no-ops when there is no active view', () => {
      const result = pushSharedCameraUpdate(null, { position: [0, 0, 5] });
      expect(result).toEqual({ persisted: false, reason: 'no-active-view' });
      expect(syncCameraToYjs).not.toHaveBeenCalled();
    });
  });

  describe('pushSharedVisualizationUpdate', () => {
    test('pushes to Y.js and the manager when permitted', () => {
      mockActiveWorkspace('ws-1');
      permissionService.getCachedRole.mockReturnValue('editor');
      permissionService.hasPermission.mockReturnValue(true);

      const result = pushSharedVisualizationUpdate('view-1', { opacity: 0.5 });

      expect(syncVisualizationToYjs).toHaveBeenCalledWith('view-1', 'user-1', { opacity: 0.5 });
      expect(mockManager.updateVisualization).toHaveBeenCalledWith('view-1', { opacity: 0.5 });
      expect(result).toEqual({ persisted: true });
    });

    test('does not push when permission is denied', () => {
      mockActiveWorkspace('ws-1');
      permissionService.getCachedRole.mockReturnValue('viewer');
      permissionService.hasPermission.mockReturnValue(false);

      const result = pushSharedVisualizationUpdate('view-1', { opacity: 0.5 });

      expect(syncVisualizationToYjs).not.toHaveBeenCalled();
      expect(mockManager.updateVisualization).not.toHaveBeenCalled();
      expect(result.persisted).toBe(false);
    });
  });

  describe('pushSharedWidgetToggle', () => {
    beforeEach(() => {
      mockActiveWorkspace('ws-1');
      permissionService.getCachedRole.mockReturnValue('editor');
      permissionService.hasPermission.mockReturnValue(true);
    });

    test('calls updateWidget when a widget of that type already exists', () => {
      mockManager.getView.mockReturnValue({
        widgets: [{ id: 'w1', type: 'line', active: false }],
      });

      pushSharedWidgetToggle('view-1', 'line', true);

      expect(mockManager.updateWidget).toHaveBeenCalledWith('view-1', 'w1', { active: true });
      expect(mockManager.addWidget).not.toHaveBeenCalled();
    });

    test('calls addWidget when no widget of that type exists yet', () => {
      mockManager.getView.mockReturnValue({ widgets: [] });

      pushSharedWidgetToggle('view-1', 'angle', true);

      expect(mockManager.addWidget).toHaveBeenCalledWith('view-1', { type: 'angle', active: true });
      expect(mockManager.updateWidget).not.toHaveBeenCalled();
    });

    test('does not push when permission is denied', () => {
      permissionService.hasPermission.mockReturnValue(false);

      pushSharedWidgetToggle('view-1', 'plane', true);

      expect(mockManager.getView).not.toHaveBeenCalled();
      expect(mockManager.addWidget).not.toHaveBeenCalled();
      expect(mockManager.updateWidget).not.toHaveBeenCalled();
    });
  });
});
