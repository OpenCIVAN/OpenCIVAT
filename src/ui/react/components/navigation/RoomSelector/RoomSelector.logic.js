// src/ui/react/components/navigation/RoomSelector/RoomSelector.logic.js
// Logic hook for RoomSelector component
//
// REFACTORED: Uses useAsyncData and useAsyncMutation
// Before: ~200 lines | After: ~150 lines

import { useCallback, useMemo, useState } from "react";
import { config } from "@Core/config/clientConfig.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import {
  useRoomUserCount,
  useRoomActions,
} from "@UI/react/hooks/useRoomPresence.js";
import { createLogger } from "@Utils/logger.js";

import { useAsyncData, useAsyncMutation } from "@UI/react/hooks/useAsyncData";
import { useServerSyncEvents } from "@UI/react/hooks/useWebSocketEvents";

const log = createLogger("rooms");

/**
 * useRooms - Fetch and manage rooms list from server
 *
 * @param {string} projectId - Project ID to fetch rooms for
 * @returns {Object} Rooms data and actions
 */
export function useRooms(projectId) {
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";

  // ---------------------------------------------------------------------------
  // FETCH ROOMS
  // ---------------------------------------------------------------------------

  const fetchRooms = useCallback(
    async (signal) => {
      if (!projectId) return [];

      const response = await fetch(`${apiBase}/projects/${projectId}/rooms`, {
        signal,
        headers: {
          "x-user-id": "00000000-0000-0000-0000-000000000001", // TODO: Get from auth
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }

      const data = await response.json();
      return data.rooms || [];
    },
    [apiBase, projectId]
  );

  const {
    data: rooms,
    isLoading,
    error,
    refetch,
  } = useAsyncData(fetchRooms, [projectId], {
    initialData: [],
    enabled: !!projectId,
  });

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("room", {
    onCreate: () => refetch(),
    onUpdate: () => refetch(),
    onDelete: () => refetch(),
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: createRoom, isLoading: isCreating } = useAsyncMutation(
    async ({ name, description, isPublic = true }) => {
      const response = await fetch(`${apiBase}/projects/${projectId}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "00000000-0000-0000-0000-000000000001",
        },
        body: JSON.stringify({ name, description, isPublic }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const newRoom = await response.json();
      log.info(`Room created: ${newRoom.id}`);
      return newRoom;
    },
    { onSuccess: refetch }
  );

  const { mutate: joinRoom, isLoading: isJoining } = useAsyncMutation(
    async (roomId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/rooms/${roomId}/join`,
        {
          method: "POST",
          headers: {
            "x-user-id": "00000000-0000-0000-0000-000000000001",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to join room");
      }

      log.info(`Joined room: ${roomId}`);
      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: leaveRoom, isLoading: isLeaving } = useAsyncMutation(
    async (roomId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/rooms/${roomId}/leave`,
        {
          method: "POST",
          headers: {
            "x-user-id": "00000000-0000-0000-0000-000000000001",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to leave room");
      }

      log.info(`Left room: ${roomId}`);
      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: deleteRoom, isLoading: isDeletingRoom } = useAsyncMutation(
    async (roomId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/rooms/${roomId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": "00000000-0000-0000-0000-000000000001",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      log.info(`Room deleted: ${roomId}`);
      return { id: roomId };
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    rooms,
    isLoading,
    error,

    // Mutation states
    isCreating,
    isJoining,
    isLeaving,
    isDeletingRoom,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    refetch,
  };
}

/**
 * useRoomSelector - Combined hook for RoomSelector component
 *
 * Combines room fetching with presence and current room state
 *
 * @param {string} projectId - Project ID
 * @param {string} currentRoomId - Currently selected room ID
 * @returns {Object} Complete room selector state
 */
export function useRoomSelector(options = {}) {
  const { projectId, currentRoomId, onRoomChange } = options;

  // Validate projectId is a string, not an object
  const validProjectId = typeof projectId === "string" ? projectId : null;

  // Also add state for dropdown open/close and create modal
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    rooms,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    refetch,
    isCreating,
    isJoining,
  } = useRooms(validProjectId);

  // Get user counts for each room
  const roomUserCounts = useRoomUserCount();

  // Room actions from presence system
  const { setRoom } = useRoomActions();

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.id === currentRoomId) || null;
  }, [rooms, currentRoomId]);

  const otherRooms = useMemo(() => {
    return rooms.filter((r) => r.id !== currentRoomId);
  }, [rooms, currentRoomId]);

  // Rooms with user counts
  const roomsWithPresence = useMemo(() => {
    return rooms.map((room) => ({
      ...room,
      userCount: roomUserCounts[room.id] || 0,
      isCurrent: room.id === currentRoomId,
    }));
  }, [rooms, roomUserCounts, currentRoomId]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSwitchRoom = useCallback(
    async (roomId) => {
      if (roomId === currentRoomId) return;

      try {
        // Join the room on server
        await joinRoom(roomId);

        // Update presence system
        setRoom(roomId);
      } catch (err) {
        log.error("Failed to switch room:", err);
        throw err;
      }
    },
    [currentRoomId, joinRoom, setRoom]
  );

  const handleCreateRoom = useCallback(
    async (name, description, isPublic) => {
      const newRoom = await createRoom({ name, description, isPublic });

      // Optionally switch to new room
      if (newRoom?.id) {
        handleSwitchRoom(newRoom.id);
      }

      return newRoom;
    },
    [createRoom, handleSwitchRoom]
  );

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);
  const closeDropdown = useCallback(() => setIsOpen(false), []);
  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);

  const selectRoom = useCallback(
    async (roomId, roomName) => {
      closeDropdown();
      await handleSwitchRoom(roomId);
      onRoomChange?.(roomId, roomName);
    },
    [closeDropdown, handleSwitchRoom, onRoomChange]
  );

  // Computed values for main/breakout separation
  const mainRoom = useMemo(
    () => rooms.find((r) => r.room_type === "main"),
    [rooms]
  );
  const breakoutRooms = useMemo(
    () => rooms.filter((r) => r.room_type !== "main"),
    [rooms]
  );

  // Return the full state object that RoomSelector.jsx expects:
  return {
    // UI State
    isOpen,
    showCreateModal,
    loading: isLoading,

    // Data
    rooms: roomsWithPresence,
    currentRoom,
    mainRoom,
    breakoutRooms,
    otherRooms,
    error,

    // Mutation states
    isCreating,
    isJoining,

    // Actions
    toggleOpen,
    closeDropdown,
    selectRoom,
    createRoom: handleCreateRoom,
    deleteRoom,
    openCreateModal,
    closeCreateModal,
    switchRoom: handleSwitchRoom,
    leaveRoom,
    refetch,
  };
}

export default useRooms;
