// src/ui/react/components/layout/SecondaryTopBar/SecondaryTopBar.logic.js
// Headless logic for the secondary top bar
// Manages workspace selection, view modes, and workspace controls

import { useState, useCallback, useMemo, useEffect } from "react";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

/**
 * View mode options for the workspace
 */
export const VIEW_MODES = {
  NORMAL: "normal",
  ISOLATION: "isolation",
  SUBSET: "subset",
};

/**
 * Workspace types for categorization
 */
export const WORKSPACE_TYPES = {
  PROJECT: "project",
  BREAKOUT: "breakout",
  PERSONAL: "personal",
};

/**
 * useWorkspaceSelector - Manages workspace selection state
 *
 * @param {Object} options
 * @param {Array} options.workspaces - Available workspaces
 * @param {string} options.initialWorkspaceId - Initial selected workspace
 * @param {Function} options.onWorkspaceChange - Callback when workspace changes
 * @returns {Object} Workspace selector state and actions
 */
export function useWorkspaceSelector({
  workspaces = [],
  initialWorkspaceId = null,
  onWorkspaceChange,
} = {}) {
  const [selectedId, setSelectedId] = useState(initialWorkspaceId);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current workspace object
  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === selectedId) || workspaces[0] || null;
  }, [workspaces, selectedId]);

  // Filter workspaces by search query
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter((w) => w.name.toLowerCase().includes(query));
  }, [workspaces, searchQuery]);

  // Group workspaces by type
  const groupedWorkspaces = useMemo(() => {
    return {
      project: filteredWorkspaces.filter(
        (w) => w.type === WORKSPACE_TYPES.PROJECT
      ),
      breakout: filteredWorkspaces.filter(
        (w) => w.type === WORKSPACE_TYPES.BREAKOUT
      ),
      personal: filteredWorkspaces.filter(
        (w) => w.type === WORKSPACE_TYPES.PERSONAL
      ),
    };
  }, [filteredWorkspaces]);

  // Select workspace handler
  const selectWorkspace = useCallback(
    (workspaceId) => {
      setSelectedId(workspaceId);
      setIsOpen(false);
      setSearchQuery("");
      onWorkspaceChange?.(workspaceId);
    },
    [onWorkspaceChange]
  );

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) setSearchQuery(""); // Clear search when opening
  }, [isOpen]);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
  }, []);

  return {
    // State
    currentWorkspace,
    isOpen,
    searchQuery,
    filteredWorkspaces,
    groupedWorkspaces,

    // Actions
    selectWorkspace,
    toggleDropdown,
    closeDropdown,
    setSearchQuery,
  };
}

/**
 * useViewMode - Manages the workspace view mode
 *
 * @param {Object} options
 * @param {string} options.initialMode - Initial view mode
 * @param {Function} options.onModeChange - Callback when mode changes
 * @returns {Object} View mode state and actions
 */
export function useViewMode({
  initialMode = VIEW_MODES.NORMAL,
  onModeChange,
} = {}) {
  const [viewMode, setViewMode] = useState(initialMode);

  const changeMode = useCallback(
    (mode) => {
      if (Object.values(VIEW_MODES).includes(mode)) {
        setViewMode(mode);
        onModeChange?.(mode);
      }
    },
    [onModeChange]
  );

  return {
    viewMode,
    setViewMode: changeMode,
    isNormal: viewMode === VIEW_MODES.NORMAL,
    isIsolation: viewMode === VIEW_MODES.ISOLATION,
    isSubset: viewMode === VIEW_MODES.SUBSET,
  };
}

/**
 * useWorkspacePresence - Gets users in the current workspace
 *
 * @param {string} workspaceId - Current workspace ID
 * @returns {Object} Presence state for workspace
 */
export function useWorkspacePresence(workspaceId) {
  const [users, setUsers] = useState([]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    const handlePresenceUpdate = (allUsers) => {
      // Filter users by workspace
      // In real implementation, users would have workspaceId in their presence
      const workspaceUsers = allUsers.filter(
        (u) => u.workspaceId === workspaceId || !u.workspaceId
      );
      setUsers(workspaceUsers);
    };

    // Subscribe to presence updates
    const cleanup = presenceSystem.onPresenceChange(handlePresenceUpdate);

    return cleanup;
  }, [workspaceId]);

  // Split into visible avatars and overflow count
  const visibleUsers = users.slice(0, 4);
  const overflowCount = Math.max(0, users.length - 4);

  return {
    users,
    visibleUsers,
    overflowCount,
    totalCount: users.length,
    isHovering,
    setIsHovering,
  };
}

/**
 * useSecondaryTopBar - Combined hook for all secondary top bar state
 *
 * @param {Object} options - Configuration options
 * @returns {Object} All secondary top bar state and actions
 */
export function useSecondaryTopBar({
  workspaces = [],
  initialWorkspaceId = null,
  initialViewMode = VIEW_MODES.NORMAL,
  onWorkspaceChange,
  onViewModeChange,
  onAddCell,
  onResetLayout,
  onLinkViews,
  onShare,
} = {}) {
  // Workspace selector state
  const workspaceSelector = useWorkspaceSelector({
    workspaces,
    initialWorkspaceId,
    onWorkspaceChange,
  });

  // View mode state
  const viewModeState = useViewMode({
    initialMode: initialViewMode,
    onModeChange: onViewModeChange,
  });

  // Presence for current workspace
  const presence = useWorkspacePresence(workspaceSelector.currentWorkspace?.id);

  // Action handlers (pass-through to parent callbacks)
  const actions = useMemo(
    () => ({
      addCell: () => onAddCell?.(),
      resetLayout: () => onResetLayout?.(),
      linkViews: () => onLinkViews?.(),
      share: () => onShare?.(),
    }),
    [onAddCell, onResetLayout, onLinkViews, onShare]
  );

  return {
    workspace: workspaceSelector,
    viewMode: viewModeState,
    presence,
    actions,
  };
}
