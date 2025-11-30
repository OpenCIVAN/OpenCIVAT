// src/ui/react/hooks/useWorkspaces.js
// Hook for managing workspace selection and state
// Connects to WorkspaceManager and provides React-friendly interface

import { useState, useEffect, useCallback, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";
import { workspaceManager } from "@Core/data/managers/WorkspaceManager.js";
import { WorkspaceType } from "@Core/data/models/Workspace.js";

/**
 * Transform workspace model to UI-friendly format
 * @param {Workspace} workspace - Workspace model
 * @returns {Object} UI workspace object
 */
function transformWorkspace(workspace) {
  if (!workspace) return null;

  // Map workspace type to color
  const typeColors = {
    [WorkspaceType.PROJECT]: "#60a5fa", // Blue
    [WorkspaceType.BREAKOUT]: "#c084fc", // Purple
    [WorkspaceType.PERSONAL]: "#34d399", // Green
  };

  return {
    id: workspace.getEffectiveId(),
    localId: workspace.localId,
    name: workspace.name,
    description: workspace.description,
    type: workspace.type,
    color: typeColors[workspace.type] || "#60a5fa",
    ownerId: workspace.ownerId,
    createdBy: workspace.createdBy,
    members: workspace.members,
    memberCount: workspace.members?.length || 0,
    canvasIds: workspace.canvasIds,
    activeCanvasId: workspace.activeCanvasId,
    isArchived: workspace.isArchived,
    isPending: workspace.isPending,
    // Breakout-specific
    expiresAt: workspace.expiresAt,
    isExpired: workspace.isExpired?.() || false,
    projectId: workspace.projectId,
  };
}

/**
 * useWorkspaces - Main hook for workspace management
 *
 * @param {Object} options
 * @param {string} options.userId - Current user ID
 * @param {string} options.projectId - Current project ID (optional)
 * @returns {Object} Workspace state and actions
 */
export function useWorkspaces({ userId, projectId } = {}) {
  // State
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load workspaces on mount and when userId changes
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadWorkspaces = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get or create personal workspace
        let personal = workspaceManager.getPersonalWorkspace(userId);
        if (!personal) {
          personal = await workspaceManager.createPersonalWorkspace(userId);
        }

        // Get all workspaces
        const allWorkspaces = [];

        // Add personal
        if (personal) {
          allWorkspaces.push(transformWorkspace(personal));
        }

        // Add project workspaces
        const projects = workspaceManager.getProjectWorkspaces();
        projects.forEach((ws) => {
          allWorkspaces.push(transformWorkspace(ws));
        });

        // Add breakouts for current project
        if (projectId) {
          const breakouts = workspaceManager.getBreakoutsForProject(projectId);
          breakouts.forEach((ws) => {
            allWorkspaces.push(transformWorkspace(ws));
          });
        }

        setWorkspaces(allWorkspaces);

        // Set current workspace to active or personal
        const activeWs = workspaceManager.getActiveWorkspace();
        if (activeWs) {
          setCurrentWorkspaceId(activeWs.getEffectiveId());
        } else if (personal) {
          setCurrentWorkspaceId(personal.getEffectiveId());
          workspaceManager.setActiveWorkspace(personal.getEffectiveId());
        }
      } catch (err) {
        log.error("Failed to load workspaces:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaces();
  }, [userId, projectId]);

  // Subscribe to workspace changes
  useEffect(() => {
    const handleChange = (event, data) => {
      log.debug("Workspace event:", event, data);

      // Refresh workspace list on changes
      const refreshWorkspaces = () => {
        const allWorkspaces = [];

        const personal = workspaceManager.getPersonalWorkspace(userId);
        if (personal) allWorkspaces.push(transformWorkspace(personal));

        const projects = workspaceManager.getProjectWorkspaces();
        projects.forEach((ws) => allWorkspaces.push(transformWorkspace(ws)));

        if (projectId) {
          const breakouts = workspaceManager.getBreakoutsForProject(projectId);
          breakouts.forEach((ws) => allWorkspaces.push(transformWorkspace(ws)));
        }

        setWorkspaces(allWorkspaces);
      };

      switch (event) {
        case "workspace:created":
        case "workspace:updated":
        case "workspace:deleted":
        case "workspace:confirmed":
        case "workspace:breakout-merged":
          refreshWorkspaces();
          break;
        case "workspace:activated":
          setCurrentWorkspaceId(data.workspace?.getEffectiveId());
          break;
      }
    };

    const unsubscribe = workspaceManager.subscribe(handleChange);
    return unsubscribe;
  }, [userId, projectId]);

  // Get current workspace object
  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === currentWorkspaceId) || null;
  }, [workspaces, currentWorkspaceId]);

  // Group workspaces by type
  const groupedWorkspaces = useMemo(
    () => ({
      project: workspaces.filter((w) => w.type === WorkspaceType.PROJECT),
      breakout: workspaces.filter((w) => w.type === WorkspaceType.BREAKOUT),
      personal: workspaces.filter((w) => w.type === WorkspaceType.PERSONAL),
    }),
    [workspaces]
  );

  // Actions
  const selectWorkspace = useCallback((workspaceId) => {
    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (workspace) {
      workspaceManager.setActiveWorkspace(workspaceId);
      setCurrentWorkspaceId(workspaceId);
    }
  }, []);

  const createBreakout = useCallback(
    async (name, expiresInHours = 2) => {
      if (!projectId || !userId) {
        throw new Error("Cannot create breakout: missing projectId or userId");
      }

      const breakout = await workspaceManager.createBreakout(
        projectId,
        name,
        userId,
        expiresInHours
      );

      return transformWorkspace(breakout);
    },
    [projectId, userId]
  );

  const createProjectWorkspace = useCallback(
    async (name, description = "") => {
      if (!userId) {
        throw new Error("Cannot create workspace: missing userId");
      }

      const project = await workspaceManager.createProjectWorkspace(
        name,
        userId,
        description
      );

      return transformWorkspace(project);
    },
    [userId]
  );

  const deleteWorkspace = useCallback(async (workspaceId) => {
    await workspaceManager.deleteWorkspace(workspaceId);
  }, []);

  const mergeBreakout = useCallback(async (breakoutId) => {
    await workspaceManager.mergeBreakoutToProject(breakoutId);
  }, []);

  return {
    // State
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    groupedWorkspaces,
    isLoading,
    error,

    // Actions
    selectWorkspace,
    createBreakout,
    createProjectWorkspace,
    deleteWorkspace,
    mergeBreakout,
  };
}

/**
 * useWorkspacePresence - Get users in a specific workspace
 *
 * @param {string} workspaceId - Workspace ID to get presence for
 * @returns {Object} Users in the workspace
 */
export function useWorkspacePresence(workspaceId) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!workspaceId) {
      setUsers([]);
      return;
    }

    // Import dynamically to avoid circular deps
    import("@Collaboration/presence/presenceSystem.js").then(
      ({ presenceSystem }) => {
        const handlePresenceChange = (allUsers) => {
          // Filter users by workspace
          const workspaceUsers = allUsers.filter(
            (user) => user.workspaceId === workspaceId || !user.workspaceId
          );
          setUsers(workspaceUsers);
        };

        const cleanup = presenceSystem.onPresenceChange(handlePresenceChange);
        return cleanup;
      }
    );
  }, [workspaceId]);

  return {
    users,
    count: users.length,
    visibleUsers: users.slice(0, 4),
    overflowCount: Math.max(0, users.length - 4),
  };
}

export default useWorkspaces;
