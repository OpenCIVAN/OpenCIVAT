// src/ui/react/hooks/usePermissions.js
// React hook for workspace permission awareness.
// Fetches the current user's role for a workspace and exposes
// synchronous permission checks for UI gating.
//
// USAGE:
//   const { permissions, hasPermission, role, loading } = usePermissions(workspaceId);
//   if (!permissions.canCreateAnnotation) return null;

import { useState, useEffect, useCallback, useMemo } from 'react';
import { permissionService, PERMISSIONS } from '@Services/permissionService.js';

/**
 * Hook for permission-aware UI in a specific workspace context.
 *
 * Fetches the current user's effective role on mount (or when workspaceId changes).
 * Subscribes to 'ws:workspace:role-changed' window events emitted by the
 * WebSocket event bridge so role changes propagate immediately.
 *
 * @param {string|null} workspaceId  The workspace to check permissions for.
 * @returns {{
 *   role: string|null,
 *   loading: boolean,
 *   hasPermission: (permission: string) => boolean,
 *   permissions: {
 *     canEdit: boolean,
 *     canDelete: boolean,
 *     canManageMembers: boolean,
 *     canCreateView: boolean,
 *     canDeleteView: boolean,
 *     canModifyViewConfiguration: boolean,
 *     canCreateAnnotation: boolean,
 *     canUpdateAnnotation: boolean,
 *     canDeleteAnnotation: boolean,
 *     canCreateBreakout: boolean,
 *     canMergeBreakout: boolean,
 *     canUploadDataset: boolean,
 *     canDeleteDataset: boolean,
 *     canCreateRoom: boolean,
 *     canDeleteRoom: boolean,
 *     canManageRoomMembers: boolean,
 *   }
 * }}
 */
export function usePermissions(workspaceId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch role on mount and whenever workspaceId changes
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      setRole(null);
      return;
    }

    let mounted = true;
    setLoading(true);

    permissionService.fetchWorkspaceRole(workspaceId).then((r) => {
      if (mounted) {
        setRole(r);
        setLoading(false);
      }
    });

    // Listen for server-pushed role changes dispatched by the WS event bridge
    const handleRoleChange = (e) => {
      if (!e.detail?.workspaceId || e.detail.workspaceId !== workspaceId) return;
      permissionService.invalidate(workspaceId);
      permissionService.fetchWorkspaceRole(workspaceId).then((r) => {
        if (mounted) setRole(r);
      });
    };

    window.addEventListener('ws:workspace:role-changed', handleRoleChange);

    return () => {
      mounted = false;
      window.removeEventListener('ws:workspace:role-changed', handleRoleChange);
    };
  }, [workspaceId]);

  /** Synchronous permission check against the currently cached role. */
  const hasPermission = useCallback(
    (permission) => {
      if (!workspaceId) return false;
      return permissionService.hasPermission(workspaceId, permission);
    },
    [workspaceId, role] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Convenience booleans so callers don't need to import PERMISSIONS
  const permissions = useMemo(
    () => ({
      canEdit:                  hasPermission(PERMISSIONS.WORKSPACE_UPDATE),
      canDelete:                hasPermission(PERMISSIONS.WORKSPACE_DELETE),
      canManageMembers:         hasPermission(PERMISSIONS.WORKSPACE_MANAGE_MEMBERS),
      canCreateView:            hasPermission(PERMISSIONS.VIEW_CREATE),
      canDeleteView:            hasPermission(PERMISSIONS.VIEW_DELETE),
      canModifyViewConfiguration: hasPermission(PERMISSIONS.VIEW_MODIFY_CONFIGURATION),
      canCreateAnnotation:      hasPermission(PERMISSIONS.ANNOTATION_CREATE),
      canUpdateAnnotation:      hasPermission(PERMISSIONS.ANNOTATION_UPDATE),
      canDeleteAnnotation:      hasPermission(PERMISSIONS.ANNOTATION_DELETE),
      canCreateBreakout:        hasPermission(PERMISSIONS.BREAKOUT_CREATE),
      canMergeBreakout:         hasPermission(PERMISSIONS.BREAKOUT_MERGE),
      canUploadDataset:         hasPermission(PERMISSIONS.DATASET_UPLOAD),
      canDeleteDataset:         hasPermission(PERMISSIONS.DATASET_DELETE),
      canCreateRoom:            hasPermission(PERMISSIONS.ROOM_CREATE),
      canDeleteRoom:            hasPermission(PERMISSIONS.ROOM_DELETE),
      canManageRoomMembers:     hasPermission(PERMISSIONS.ROOM_MANAGE_MEMBERS),
    }),
    // Intentionally includes role so booleans recompute when role changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission, role]
  );

  return { role, loading, hasPermission, permissions };
}

export default usePermissions;
