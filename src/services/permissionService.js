// src/services/permissionService.js
// Client-side permission service for workspace/room access control.
// Fetches the user's effective role from the server, caches it in memory,
// and exposes synchronous hasPermission() checks for UI gating.
//
// USAGE:
//   import { permissionService, PERMISSIONS } from '@Services/permissionService.js';
//   await permissionService.fetchWorkspaceRole(workspaceId);
//   const can = permissionService.hasPermission(workspaceId, PERMISSIONS.ANNOTATION_CREATE);

import { apiClient } from '@Services/apiClient.js';
import { config } from '@Core/config/clientConfig.js';
import { auth as log } from '@Utils/logger.js';

// =============================================================================
// PERMISSION CONSTANTS
// Manually kept in sync with server/src/utils/permissions.js
// =============================================================================

export const PERMISSIONS = Object.freeze({
  WORKSPACE_READ:              'workspace:read',
  WORKSPACE_UPDATE:            'workspace:update',
  WORKSPACE_MANAGE_MEMBERS:    'workspace:manage_members',
  WORKSPACE_DELETE:            'workspace:delete',
  ROOM_READ:                   'room:read',
  ROOM_CREATE:                 'room:create',
  ROOM_UPDATE:                 'room:update',
  ROOM_DELETE:                 'room:delete',
  ROOM_MANAGE_MEMBERS:         'room:manage_members',
  ROOM_JOIN:                   'room:join',
  ROOM_LEAVE:                  'room:leave',
  VIEW_READ:                   'view:read',
  VIEW_CREATE:                 'view:create',
  VIEW_UPDATE:                 'view:update',
  VIEW_DELETE:                 'view:delete',
  VIEW_CONTROL_CAMERA:         'view:control_camera',
  VIEW_MODIFY_CONFIGURATION:   'view:modify_configuration',
  ANNOTATION_CREATE:           'annotation:create',
  ANNOTATION_UPDATE:           'annotation:update',
  ANNOTATION_DELETE:           'annotation:delete',
  DATASET_READ:                'dataset:read',
  DATASET_UPLOAD:              'dataset:upload',
  DATASET_DELETE:              'dataset:delete',
  BREAKOUT_CREATE:             'breakout:create',
  BREAKOUT_MERGE:              'breakout:merge',
  BREAKOUT_DELETE:             'breakout:delete',
});

// =============================================================================
// ROLE → PERMISSION MAPPING
// Mirrors server/src/utils/permissions.js — update both together.
// =============================================================================

const _OWNER_PERMS = new Set(Object.values(PERMISSIONS));

const _ADMIN_PERMS = new Set([
  PERMISSIONS.WORKSPACE_READ,
  PERMISSIONS.WORKSPACE_UPDATE,
  PERMISSIONS.WORKSPACE_MANAGE_MEMBERS,
  PERMISSIONS.ROOM_READ,
  PERMISSIONS.ROOM_CREATE,
  PERMISSIONS.ROOM_UPDATE,
  PERMISSIONS.ROOM_DELETE,
  PERMISSIONS.ROOM_MANAGE_MEMBERS,
  PERMISSIONS.ROOM_JOIN,
  PERMISSIONS.ROOM_LEAVE,
  PERMISSIONS.VIEW_READ,
  PERMISSIONS.VIEW_CREATE,
  PERMISSIONS.VIEW_UPDATE,
  PERMISSIONS.VIEW_DELETE,
  PERMISSIONS.VIEW_CONTROL_CAMERA,
  PERMISSIONS.VIEW_MODIFY_CONFIGURATION,
  PERMISSIONS.ANNOTATION_CREATE,
  PERMISSIONS.ANNOTATION_UPDATE,
  PERMISSIONS.ANNOTATION_DELETE,
  PERMISSIONS.DATASET_READ,
  PERMISSIONS.DATASET_UPLOAD,
  PERMISSIONS.BREAKOUT_CREATE,
  PERMISSIONS.BREAKOUT_MERGE,
  PERMISSIONS.BREAKOUT_DELETE,
]);

const _EDITOR_PERMS = new Set([
  PERMISSIONS.WORKSPACE_READ,
  PERMISSIONS.ROOM_READ,
  PERMISSIONS.ROOM_JOIN,
  PERMISSIONS.ROOM_LEAVE,
  PERMISSIONS.VIEW_READ,
  PERMISSIONS.VIEW_CREATE,
  PERMISSIONS.VIEW_UPDATE,
  PERMISSIONS.VIEW_CONTROL_CAMERA,
  PERMISSIONS.VIEW_MODIFY_CONFIGURATION,
  PERMISSIONS.ANNOTATION_CREATE,
  PERMISSIONS.ANNOTATION_UPDATE,
  PERMISSIONS.DATASET_READ,
  PERMISSIONS.DATASET_UPLOAD,
  PERMISSIONS.BREAKOUT_CREATE,
]);

const _VIEWER_PERMS = new Set([
  PERMISSIONS.WORKSPACE_READ,
  PERMISSIONS.ROOM_READ,
  PERMISSIONS.ROOM_JOIN,
  PERMISSIONS.ROOM_LEAVE,
  PERMISSIONS.VIEW_READ,
  PERMISSIONS.DATASET_READ,
]);

const _OBSERVER_PERMS = new Set([
  PERMISSIONS.WORKSPACE_READ,
  PERMISSIONS.VIEW_READ,
  PERMISSIONS.DATASET_READ,
]);

const ROLE_PERMISSIONS = {
  owner:    _OWNER_PERMS,
  admin:    _ADMIN_PERMS,
  editor:   _EDITOR_PERMS,
  member:   _EDITOR_PERMS, // alias — same Set as editor
  viewer:   _VIEWER_PERMS,
  observer: _OBSERVER_PERMS,
};

// =============================================================================
// SERVICE
// =============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class PermissionService {
  /** @type {Map<string, { role: string, fetchedAt: number }>} */
  #cache = new Map();

  /**
   * Fetch (and cache) the calling user's effective role in the given workspace.
   * In dev bypass mode, returns 'owner' immediately without an HTTP call.
   * On server error, fails safe to 'viewer'.
   * @param {string} workspaceId
   * @returns {Promise<string>} Role string e.g. 'owner'|'admin'|'editor'|'viewer'
   */
  async fetchWorkspaceRole(workspaceId) {
    if (!workspaceId) return 'viewer';

    const cached = this.#cache.get(workspaceId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.role;
    }

    // Dev bypass: grant full access without HTTP round-trip
    const isDevMode = config.devBypassAuth === true || config.devBypassAuth === 'true';
    if (isDevMode) {
      this.#cache.set(workspaceId, { role: 'owner', fetchedAt: Date.now() });
      return 'owner';
    }

    try {
      const data = await apiClient.get(`/workspaces/${workspaceId}/my-permission`);
      const role = data?.role || 'viewer';
      this.#cache.set(workspaceId, { role, fetchedAt: Date.now() });
      return role;
    } catch (err) {
      log.warn(`[permissions] Failed to fetch role for workspace ${workspaceId}:`, err?.message);
      // Fail safe — treat as viewer rather than throwing
      return 'viewer';
    }
  }

  /**
   * Synchronous check against the currently cached role.
   * Returns false if the role has not been fetched yet.
   * @param {string} workspaceId
   * @param {string} permission  e.g. PERMISSIONS.ANNOTATION_CREATE
   * @returns {boolean}
   */
  hasPermission(workspaceId, permission) {
    if (!workspaceId || !permission) return false;

    const isDevMode = config.devBypassAuth === true || config.devBypassAuth === 'true';
    if (isDevMode) return true;

    const cached = this.#cache.get(workspaceId);
    if (!cached) return false;

    const perms = ROLE_PERMISSIONS[cached.role];
    return perms ? perms.has(permission) : false;
  }

  /**
   * Return the cached role string for a workspace, or null if not fetched.
   * @param {string} workspaceId
   * @returns {string|null}
   */
  getCachedRole(workspaceId) {
    return this.#cache.get(workspaceId)?.role ?? null;
  }

  /**
   * Invalidate cached role for a workspace.
   * Call this when a role:changed WebSocket event arrives.
   * @param {string} workspaceId
   */
  invalidate(workspaceId) {
    this.#cache.delete(workspaceId);
  }

  /** Invalidate all cached roles (call on logout). */
  invalidateAll() {
    this.#cache.clear();
  }

  /**
   * Fetch the effective permission set for the current user in a project.
   * Uses GET /api/projects/:projectId/my-permissions which incorporates
   * the project role + JSONB overrides from project_members.permissions.
   *
   * @param {string} projectId
   * @returns {Promise<Set<string>>}
   */
  async fetchProjectPermissions(projectId) {
    if (!projectId) return new Set();

    const isDevMode = config.devBypassAuth === true || config.devBypassAuth === 'true';
    if (isDevMode) {
      return new Set(Object.values(PERMISSIONS));
    }

    try {
      const data = await apiClient.get(`/projects/${projectId}/rooms/my-permissions`);
      return new Set(data?.permissions || []);
    } catch (err) {
      log.warn(`[permissions] Failed to fetch project permissions for ${projectId}:`, err?.message);
      return new Set();
    }
  }

  /**
   * Check if the user has a specific permission in a project.
   * Requires fetchProjectPermissions to have been called first.
   * This is a best-effort check — use fetchProjectPermissions for a fresh check.
   *
   * @param {string} projectId
   * @param {string} permission
   * @returns {boolean}
   */
  hasProjectPermission(projectId, permission) {
    const isDevMode = config.devBypassAuth === true || config.devBypassAuth === 'true';
    if (isDevMode) return true;
    // Project permissions are not cached in this service — use fetchProjectPermissions result directly
    return false;
  }
}

export const permissionService = new PermissionService();
