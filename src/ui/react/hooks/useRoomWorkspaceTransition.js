import { useState, useCallback } from "react";

/**
 * useRoomWorkspaceTransition - Manages room changes with workspace picker
 */
export function useRoomWorkspaceTransition({
  currentRoomId,
  onRoomChange,
  onWorkspaceChange,
}) {
  const [pendingRoom, setPendingRoom] = useState(null);

  const initiateRoomChange = useCallback(
    (roomId, roomName) => {
      if (roomId === currentRoomId) return;
      setPendingRoom({ roomId, roomName });
    },
    [currentRoomId]
  );

  const confirmWithWorkspace = useCallback(
    (workspaceId) => {
      if (!pendingRoom) return;
      onRoomChange?.(pendingRoom.roomId, pendingRoom.roomName);
      onWorkspaceChange?.(workspaceId);
      setPendingRoom(null);
    },
    [pendingRoom, onRoomChange, onWorkspaceChange]
  );

  const confirmKeepWorkspace = useCallback(() => {
    if (!pendingRoom) return;
    onRoomChange?.(pendingRoom.roomId, pendingRoom.roomName);
    setPendingRoom(null);
  }, [pendingRoom, onRoomChange]);

  const autoEnter = useCallback(
    (roomId, roomName) => {
      onRoomChange?.(roomId, roomName);
      setPendingRoom(null);
    },
    [onRoomChange]
  );

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
