// ============================================================================
// src/ui/react/hooks/useRoomWorkspaceTransition.js
// ============================================================================

import { useState, useCallback } from "react";

/**
 * useRoomWorkspaceTransition - Manages room changes with workspace picker
 *
 * @param {Object} options
 * @param {string} options.currentRoomId - Current room ID
 * @param {Function} options.onRoomChange - Callback when room change completes
 * @param {Function} options.onWorkspaceChange - Callback when workspace changes
 */
export function useRoomWorkspaceTransition({
  currentRoomId,
  onRoomChange,
  onWorkspaceChange,
}) {
  const [pendingRoom, setPendingRoom] = useState(null);

  // Called by RoomSelector when user picks a room
  const initiateRoomChange = useCallback(
    (roomId, roomName) => {
      if (roomId === currentRoomId) return;
      setPendingRoom({ roomId, roomName });
    },
    [currentRoomId]
  );

  // User picked a workspace - complete transition
  const confirmWithWorkspace = useCallback(
    (workspaceId) => {
      if (!pendingRoom) return;

      onRoomChange?.(pendingRoom.roomId, pendingRoom.roomName);
      onWorkspaceChange?.(workspaceId);
      setPendingRoom(null);
    },
    [pendingRoom, onRoomChange, onWorkspaceChange]
  );

  // User chose to keep current workspace
  const confirmKeepWorkspace = useCallback(() => {
    if (!pendingRoom) return;

    onRoomChange?.(pendingRoom.roomId, pendingRoom.roomName);
    setPendingRoom(null);
  }, [pendingRoom, onRoomChange]);

  // Auto-enter (no workspaces, auto-created one)
  const autoEnter = useCallback(
    (roomId, roomName) => {
      onRoomChange?.(roomId, roomName);
      setPendingRoom(null);
    },
    [onRoomChange]
  );

  // Cancel - don't switch room
  const cancel = useCallback(() => {
    setPendingRoom(null);
  }, []);

  return {
    pendingRoom,
    isPickerOpen: !!pendingRoom,
    initiateRoomChange,
    confirmWithWorkspace,
    confirmKeepWorkspace,
    autoEnter,
    cancel,
  };
}

export default useRoomWorkspaceTransition;
