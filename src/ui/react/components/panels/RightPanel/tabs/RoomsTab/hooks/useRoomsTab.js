/**
 * @file useRoomsTab.js
 * @description Logic hook for RoomsTab component.
 * Handles room state, filtering, and room operations.
 *
 * @example
 * const {
 *   rooms,
 *   currentRoom,
 *   groupedRooms,
 *   handleJoinRoom,
 *   handleCreateRoom,
 * } = useRoomsTab();
 */

import { useState, useCallback, useMemo } from "react";

/**
 * Sample current user
 */
const SAMPLE_CURRENT_USER = {
  id: "current",
  name: "You",
  color: "#2dd4bf",
};

/**
 * Sample rooms data
 */
const SAMPLE_ROOMS = [
  {
    id: "main",
    name: "Main Room",
    type: "project",
    access: "open",
    hasVoice: true,
    hasText: true,
    isPersistent: true,
    members: [
      { id: "u1", name: "Dr. Smith", color: "#fb7185", isOwner: true },
      { id: "u2", name: "Dr. Jones", color: "#fbbf24" },
      { id: "current", name: "You", color: "#2dd4bf" },
    ],
    isCurrentRoom: true,
  },
  {
    id: "breakout-1",
    name: "Tumor Analysis",
    type: "breakout",
    access: "open",
    hasVoice: true,
    hasText: true,
    isPersistent: false,
    members: [
      { id: "u3", name: "Alice Chen", color: "#60a5fa", isOwner: true },
      { id: "u4", name: "Bob Wilson", color: "#c084fc" },
    ],
    isCurrentRoom: false,
  },
  {
    id: "breakout-2",
    name: "Private Discussion",
    type: "breakout",
    access: "invite",
    hasVoice: false,
    hasText: true,
    isPersistent: false,
    members: [{ id: "u1", name: "Dr. Smith", color: "#fb7185", isOwner: true }],
    isCurrentRoom: false,
  },
  {
    id: "personal-1",
    name: "My Scratch Space",
    type: "personal",
    access: "invisible",
    hasVoice: false,
    hasText: false,
    isPersistent: true,
    members: [{ id: "current", name: "You", color: "#2dd4bf", isOwner: true }],
    isCurrentRoom: false,
  },
];

/**
 * Hook for RoomsTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @returns {Object} Rooms state and handlers
 */
export function useRoomsTab(options = {}) {
  // State
  const [rooms, setRooms] = useState(SAMPLE_ROOMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get current room
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.isCurrentRoom);
  }, [rooms]);

  // Filter rooms by search and group by type
  const groupedRooms = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.members.some((m) => m.name.toLowerCase().includes(query))
    );

    return {
      project: filtered.filter((r) => r.type === "project"),
      breakout: filtered.filter((r) => r.type === "breakout"),
      personal: filtered.filter((r) => r.type === "personal"),
    };
  }, [rooms, searchQuery]);

  // Handlers
  const handleJoinRoom = useCallback((roomId) => {
    setRooms((prev) =>
      prev.map((r) => ({
        ...r,
        isCurrentRoom: r.id === roomId,
        members:
          r.id === roomId && !r.members.find((m) => m.id === "current")
            ? [...r.members, SAMPLE_CURRENT_USER]
            : r.members,
      }))
    );
  }, []);

  const handleLeaveRoom = useCallback((roomId) => {
    // When leaving, go back to main room
    setRooms((prev) =>
      prev.map((r) => ({
        ...r,
        isCurrentRoom: r.id === "main",
        members:
          r.id === roomId
            ? r.members.filter((m) => m.id !== "current")
            : r.members,
      }))
    );
  }, []);

  const handleCreateRoom = useCallback((config) => {
    const newRoom = {
      id: `breakout-${Date.now()}`,
      name: config.name,
      type: "breakout",
      access: config.access,
      hasVoice: config.hasVoice,
      hasText: config.hasText,
      isPersistent: false,
      members: [{ ...SAMPLE_CURRENT_USER, isOwner: true }],
      isCurrentRoom: false,
    };
    setRooms((prev) => [...prev, newRoom]);
    setShowCreateForm(false);
  }, []);

  const handleDeleteRoom = useCallback((roomId) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  return {
    // Data
    rooms,
    currentRoom,
    groupedRooms,

    // Search state
    searchQuery,
    setSearchQuery,

    // Create form state
    showCreateForm,
    setShowCreateForm,

    // Handlers
    handleJoinRoom,
    handleLeaveRoom,
    handleCreateRoom,
    handleDeleteRoom,
  };
}

export default useRoomsTab;
