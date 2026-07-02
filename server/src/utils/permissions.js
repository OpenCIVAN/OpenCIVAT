// server/src/utils/permissions.js
// Centralized permission model for workspace/room/project access control.
// Pure functions — no Express imports, no side effects.

const PERMISSIONS = Object.freeze({
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

// owner > admin > editor/member > viewer > observer
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

// member is an alias for editor (backward-compat with room_members.role = 'member')
const ROLE_PERMISSIONS = {
  owner:    _OWNER_PERMS,
  admin:    _ADMIN_PERMS,
  editor:   _EDITOR_PERMS,
  member:   _EDITOR_PERMS,   // same Set reference — equal by design
  viewer:   _VIEWER_PERMS,
  observer: _OBSERVER_PERMS,
};

/**
 * Does this role have this permission?
 * @param {string|null} role
 * @param {string} permission
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.has(permission) : false;
}

/**
 * Resolve the effective role for a user in the given context.
 *
 * Priority waterfall:
 *   1. workspaceId  → workspace_members.permission  (also checks workspaces.owner_id)
 *   2. roomId       → room_members.role
 *   3. projectId    → project_members.role
 *
 * Returns one of: 'owner'|'admin'|'editor'|'member'|'viewer'|'observer'|null
 *
 * @param {import('pg').Pool} pool
 * @param {{ workspaceId?: string, roomId?: string, projectId?: string }} context
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getRoleForUser(pool, { workspaceId, roomId, projectId }, userId) {
  if (!userId) return null;

  try {
    if (workspaceId) {
      const result = await pool.query(
        `SELECT
           CASE
             WHEN w.owner_id = $2 THEN 'owner'
             ELSE wm.permission
           END AS role
         FROM workspaces w
         LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
         WHERE w.id = $1
           AND (w.owner_id = $2 OR wm.user_id = $2)`,
        [workspaceId, userId]
      );
      if (result.rows.length > 0) return result.rows[0].role || null;
      return null;
    }

    if (roomId) {
      const result = await pool.query(
        `SELECT rm.role
         FROM room_members rm
         WHERE rm.room_id = $1 AND rm.user_id = $2`,
        [roomId, userId]
      );
      if (result.rows.length > 0) return result.rows[0].role || null;
      return null;
    }

    if (projectId) {
      const result = await pool.query(
        `SELECT pm.role
         FROM project_members pm
         WHERE pm.project_id = $1 AND pm.user_id = $2`,
        [projectId, userId]
      );
      if (result.rows.length > 0) return result.rows[0].role || null;
      return null;
    }
  } catch (err) {
    // Let caller decide how to handle DB errors
    throw err;
  }

  return null;
}

/**
 * Compute the effective permission Set for a user in a project.
 *
 * Base permissions come from the project role (admin/member/viewer).
 * The `project_members.permissions` JSONB can add or remove specific permissions:
 *
 *   { "grant": ["annotation:create"], "deny": ["dataset:delete"] }
 *
 * Unknown permission strings in the JSONB are ignored (no error).
 *
 * @param {import('pg').Pool} pool
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<Set<string>>}  Effective permission set (empty Set if non-member).
 */
async function getEffectivePermissions(pool, projectId, userId) {
  if (!pool || !projectId || !userId) return new Set(_VIEWER_PERMS);

  const result = await pool.query(
    `SELECT role, permissions FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (!result.rows.length) return new Set();

  const { role, permissions: jsonb } = result.rows[0];
  const base = new Set(ROLE_PERMISSIONS[role] || _VIEWER_PERMS);

  const overrides =
    jsonb && typeof jsonb === 'object' && !Array.isArray(jsonb) ? jsonb : {};

  const allPermValues = new Set(Object.values(PERMISSIONS));

  for (const perm of overrides.grant || []) {
    if (allPermValues.has(perm)) base.add(perm);
    // Unknown keys silently ignored
  }
  for (const perm of overrides.deny || []) {
    base.delete(perm);
  }

  return base;
}

/**
 * Check whether at least one other admin would remain in a workspace or project
 * if `excludeUserId` were removed or downgraded.
 *
 * Prevents the last admin from being removed, locking out the workspace.
 *
 * For workspaces: counts workspace_members with permission IN ('owner','editor')
 *   OR workspaces.owner_id — excluding excludeUserId.
 * For projects: counts project_members with role = 'admin' — excluding excludeUserId.
 *
 * @param {import('pg').Pool} pool
 * @param {{ workspaceId?: string, projectId?: string }} context
 * @param {string} excludeUserId  The user being removed/downgraded
 * @returns {Promise<boolean>}  true = safe (another admin exists); false = LAST_ADMIN
 */
async function hasRemainingAdmin(pool, { workspaceId, projectId }, excludeUserId) {
  try {
    if (workspaceId) {
      // Another workspace member with owner/editor permission
      const memberResult = await pool.query(
        `SELECT 1 FROM workspace_members
         WHERE workspace_id = $1 AND user_id != $2 AND permission IN ('owner', 'editor')
         LIMIT 1`,
        [workspaceId, excludeUserId]
      );
      if (memberResult.rows.length > 0) return true;

      // Or the workspace owner_id is a different user
      const ownerResult = await pool.query(
        `SELECT 1 FROM workspaces WHERE id = $1 AND owner_id IS NOT NULL AND owner_id != $2 LIMIT 1`,
        [workspaceId, excludeUserId]
      );
      return ownerResult.rows.length > 0;
    }

    if (projectId) {
      const result = await pool.query(
        `SELECT 1 FROM project_members
         WHERE project_id = $1 AND user_id != $2 AND role = 'admin'
         LIMIT 1`,
        [projectId, excludeUserId]
      );
      return result.rows.length > 0;
    }
  } catch {
    // Conservative: allow the operation if DB check fails
    return true;
  }

  return true; // No context provided — allow
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getRoleForUser,
  getEffectivePermissions,
  hasRemainingAdmin,
};
