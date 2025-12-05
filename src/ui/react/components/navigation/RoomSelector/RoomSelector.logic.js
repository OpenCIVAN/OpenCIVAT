// src/ui/react/components/navigation/RoomSelector/RoomSelector.logic.js
// Logic hook for RoomSelector component

import { useState, useEffect, useCallback, useMemo } from "react";
import { config } from "@Core/config/clientConfig.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import {
  useRoomUserCount,
  useRoomActions,
} from "@UI/react/hooks/useRoomPresence.js";
import { createLogger } from "@Utils/logger.js";

const log = createLogger("rooms");

/**
 * useRooms - Fetch and manage rooms list from server
 */
export function useRooms(projectId) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rooms from server
  const fetchRooms = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${config.apiUrl}/projects/${projectId}/rooms`,
        {
          headers: {
            "x-user-id": "00000000-0000-0000-0000-000000000001", // TODO: Get from auth
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }

      const data = await response.json();
      setRooms(data.rooms || []);
      setError(null);
    } catch (err) {
      log.error("Error fetching rooms:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Create a new breakout room
  const createRoom = useCallback(
    async (name, description, isPublic = true) => {
      if (!projectId) return null;

      try {
        const response = await fetch(
          `${config.apiUrl}/projects/${projectId}/rooms`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": "00000000-0000-0000-0000-000000000001",
            },
            body: JSON.stringify({ name, description, isPublic }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to create room");
        }

        const newRoom = await response.json();
        setRooms((prev) => [...prev, newRoom]);
        return newRoom;
      } catch (err) {
        log.error("Error creating room:", err);
        throw err;
      }
    },
    [projectId]
  );

  // Join a room
  const joinRoom = useCallback(
    async (roomId) => {
      if (!projectId) return;

      try {
        const response = await fetch(
          `${config.apiUrl}/projects/${projectId}/rooms/${roomId}/join`,
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

        // Update room membership in local state
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, is_member: true } : r))
        );
      } catch (err) {
        log.error("Error joining room:", err);
        throw err;
      }
    },
    [projectId]
  );

  // Leave a room
  const leaveRoom = useCallback(
    async (roomId) => {
      if (!projectId) return;

      try {
        const response = await fetch(
          `${config.apiUrl}/projects/${projectId}/rooms/${roomId}/leave`,
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

        // Update room membership in local state
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, is_member: false } : r))
        );
      } catch (err) {
        log.error("Error leaving room:", err);
        throw err;
      }
    },
    [projectId]
  );

  // Delete a room
  const deleteRoom = useCallback(
    async (roomId) => {
      if (!projectId) return;

      try {
        const response = await fetch(
          `${config.apiUrl}/projects/${projectId}/rooms/${roomId}`,
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

        // Remove from local state
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
      } catch (err) {
        log.error("Error deleting room:", err);
        throw err;
      }
    },
    [projectId]
  );

  return {
    rooms,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    refetch: fetchRooms,
  };
}

/**
 * useRoomSelector - Main hook for RoomSelector component
 */
export function useRoomSelector({ projectId, onRoomChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const { rooms, loading, createRoom, joinRoom, deleteRoom, refetch } =
    useRooms(projectId);
  const { setRoom } = useRoomActions();

  // Get current room from presence or default to main room
  useEffect(() => {
    const savedRoomId = presenceSystem.getRoom();
    if (savedRoomId) {
      setCurrentRoomId(savedRoomId);
      // Also notify parent of the saved room
      const savedRoom = rooms.find((r) => r.id === savedRoomId);
      if (savedRoom && onRoomChange) {
        onRoomChange(savedRoomId, savedRoom.name);
      }
    } else if (rooms.length > 0) {
      // Default to main room
      const mainRoom = rooms.find((r) => r.room_type === "main");
      if (mainRoom) {
        handleSelectRoom(mainRoom.id, mainRoom.name);
      }
    }
  }, [rooms]);

  // Current room object
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.id === currentRoomId) || null;
  }, [rooms, currentRoomId]);

  // Separate main room from breakout rooms
  const { mainRoom, breakoutRooms } = useMemo(() => {
    const main = rooms.find((r) => r.room_type === "main");
    const breakouts = rooms.filter((r) => r.room_type !== "main");
    return { mainRoom: main, breakoutRooms: breakouts };
  }, [rooms]);

  // Toggle dropdown
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Select a room
  const handleSelectRoom = useCallback(
    (roomId, roomName) => {
      log.info("Selecting room:", roomId, roomName);
      setCurrentRoomId(roomId);
      setRoom(roomId); // Update presence
      setIsOpen(false);

      // Callback for parent components - pass both id and name
      if (onRoomChange) {
        onRoomChange(roomId, roomName);
      }
    },
    [setRoom, onRoomChange]
  );

  // Create room handler
  const handleCreateRoom = useCallback(
    async (name, description, isPublic) => {
      try {
        const newRoom = await createRoom(name, description, isPublic);
        setShowCreateModal(false);
        // Auto-join and select the new room
        if (newRoom) {
          handleSelectRoom(newRoom.id, newRoom.name);
        }
        return newRoom;
      } catch (err) {
        throw err;
      }
    },
    [createRoom, handleSelectRoom]
  );

  // Open create modal
  const openCreateModal = useCallback(() => {
    setShowCreateModal(true);
    setIsOpen(false);
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  return {
    // State
    isOpen,
    showCreateModal,
    currentRoom,
    mainRoom,
    breakoutRooms,
    loading,

    // Actions
    toggleOpen,
    closeDropdown,
    selectRoom: handleSelectRoom,
    createRoom: handleCreateRoom,
    deleteRoom,
    openCreateModal,
    closeCreateModal,
    refetch,
  };
}

export default useRoomSelector;
