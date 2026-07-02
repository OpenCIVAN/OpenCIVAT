// src/utils/__tests__/permissions.test.js
// Unit tests for the frontend permission service.
// No HTTP calls — apiClient is mocked.

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Mock deps before importing the module ───────────────────────────────────

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { devBypassAuth: false },
}));

vi.mock('@Utils/logger.js', () => ({
  auth: { warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Import after mocks are in place ────────────────────────────────────────

import { PERMISSIONS, permissionService } from '../../services/permissionService.js';
import { apiClient } from '@Services/apiClient.js';
import { config } from '@Core/config/clientConfig.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WS_ID = '11111111-1111-1111-1111-111111111111';
const WS_ID_2 = '22222222-2222-2222-2222-222222222222';

function resetCache() {
  permissionService.invalidateAll();
}

// ============================================================================
// PERMISSIONS constant
// ============================================================================

describe('PERMISSIONS constants (frontend)', () => {
  test('all values are non-empty strings with colon', () => {
    for (const [key, value] of Object.entries(PERMISSIONS)) {
      expect(typeof value).toBe('string');
      expect(value).toContain(':');
    }
  });

  test('is frozen', () => {
    expect(Object.isFrozen(PERMISSIONS)).toBe(true);
  });

  test('ANNOTATION_CREATE is defined', () => {
    expect(PERMISSIONS.ANNOTATION_CREATE).toBe('annotation:create');
  });

  test('BREAKOUT_MERGE is defined', () => {
    expect(PERMISSIONS.BREAKOUT_MERGE).toBe('breakout:merge');
  });
});

// ============================================================================
// permissionService.hasPermission (synchronous, cache-based)
// ============================================================================

describe('permissionService.hasPermission()', () => {
  beforeEach(() => {
    resetCache();
    config.devBypassAuth = false;
  });

  test('returns false when no role is cached', () => {
    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });

  test('returns false for null workspaceId', () => {
    expect(permissionService.hasPermission(null, PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });

  test('returns true for owner on any permission', async () => {
    apiClient.get.mockResolvedValueOnce({ role: 'owner', workspaceId: WS_ID, userId: 'u1' });
    await permissionService.fetchWorkspaceRole(WS_ID);

    for (const perm of Object.values(PERMISSIONS)) {
      expect(permissionService.hasPermission(WS_ID, perm)).toBe(true);
    }
  });

  test('viewer cannot annotate or upload', async () => {
    apiClient.get.mockResolvedValueOnce({ role: 'viewer', workspaceId: WS_ID, userId: 'u1' });
    await permissionService.fetchWorkspaceRole(WS_ID);

    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.ANNOTATION_CREATE)).toBe(false);
    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.DATASET_UPLOAD)).toBe(false);
  });

  test('viewer can read workspace and view', async () => {
    apiClient.get.mockResolvedValueOnce({ role: 'viewer', workspaceId: WS_ID, userId: 'u1' });
    await permissionService.fetchWorkspaceRole(WS_ID);

    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.WORKSPACE_READ)).toBe(true);
    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.VIEW_READ)).toBe(true);
    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.DATASET_READ)).toBe(true);
  });

  test('member can create annotations (editor alias)', async () => {
    apiClient.get.mockResolvedValueOnce({ role: 'member', workspaceId: WS_ID, userId: 'u1' });
    await permissionService.fetchWorkspaceRole(WS_ID);

    expect(permissionService.hasPermission(WS_ID, PERMISSIONS.ANNOTATION_CREATE)).toBe(true);
  });

  test('in dev bypass mode, always returns true', async () => {
    config.devBypassAuth = true;
    // No cache needed in bypass mode
    expect(permissionService.hasPermission(WS_ID_2, PERMISSIONS.WORKSPACE_DELETE)).toBe(true);
  });
});

// ============================================================================
// permissionService.fetchWorkspaceRole()
// ============================================================================

describe('permissionService.fetchWorkspaceRole()', () => {
  beforeEach(() => {
    resetCache();
    config.devBypassAuth = false;
    vi.clearAllMocks();
  });

  test('returns role from API response', async () => {
    apiClient.get.mockResolvedValueOnce({ role: 'editor', workspaceId: WS_ID, userId: 'u1' });
    const role = await permissionService.fetchWorkspaceRole(WS_ID);
    expect(role).toBe('editor');
  });

  test('caches result — second call does not hit API', async () => {
    apiClient.get.mockResolvedValueOnce({ role: 'viewer' });
    await permissionService.fetchWorkspaceRole(WS_ID);
    await permissionService.fetchWorkspaceRole(WS_ID);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  test('returns viewer on API error (fail-safe)', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Network error'));
    const role = await permissionService.fetchWorkspaceRole(WS_ID);
    expect(role).toBe('viewer');
  });

  test('dev bypass returns owner without API call', async () => {
    config.devBypassAuth = true;
    const role = await permissionService.fetchWorkspaceRole(WS_ID);
    expect(role).toBe('owner');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  test('empty workspaceId returns viewer', async () => {
    const role = await permissionService.fetchWorkspaceRole('');
    expect(role).toBe('viewer');
  });

  test('invalidate clears cache for specific workspace', async () => {
    apiClient.get.mockResolvedValue({ role: 'admin' });
    await permissionService.fetchWorkspaceRole(WS_ID);
    permissionService.invalidate(WS_ID);
    await permissionService.fetchWorkspaceRole(WS_ID);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
