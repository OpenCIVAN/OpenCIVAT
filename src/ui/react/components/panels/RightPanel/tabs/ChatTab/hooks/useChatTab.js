/**
 * @file useChatTab.js
 * @description Logic hook for ChatTab component.
 * Separates data fetching, state management, and Y.js integration from presentation.
 *
 * @example
 * const {
 *   messages,
 *   isLoading,
 *   isSynced,
 *   currentUserId,
 *   handleSend,
 *   handleDelete,
 * } = useChatTab({ workspaceId });
 */

import { useState, useCallback, useEffect } from "react";

import { sync as log } from "@Utils/logger.js";
import { textChat } from "@Collaboration/communication/textChat.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { provider } from "@Collaboration/yjs/yjsSetup.js";

/**
 * Chat subtab configuration
 */
export const CHAT_SUBTABS = [
  { id: "room", label: "Room", icon: "home", color: "blue" },
  { id: "project", label: "Project", icon: "globe", color: "green" },
  { id: "dm", label: "DMs", icon: "messageSquare", color: "purple" },
];

/**
 * Hook for ChatTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @param {string} [options.roomId] - Current room ID (auto-detected from workspace)
 * @param {string} [options.projectId] - Current project ID
 * @returns {Object} Chat state and handlers
 */
export function useChatTab(options = {}) {
  const { workspaceId, roomId: initialRoomId, projectId, defaultSubtab = "room" } = options;

  // State
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [activeSubtab, setActiveSubtab] = useState(defaultSubtab);
  const [currentRoomId, setCurrentRoomId] = useState(initialRoomId || 'global');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Current user
  const currentUserId = getUserId();

  // Refresh messages from textChat
  const refreshMessages = useCallback(() => {
    const allMessages = textChat.getMessages();
    log.debug("Chat refreshing messages, count:", allMessages.length);
    setMessages([...allMessages]);
  }, []);

  // Fetch available rooms for the project
  const fetchRooms = useCallback(async () => {
    if (!projectId) return;

    setIsLoadingRooms(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/rooms`);
      if (response.ok) {
        const rooms = await response.json();
        setAvailableRooms(rooms);
        log.debug("Loaded rooms:", rooms.length);
      }
    } catch (error) {
      log.error("Failed to fetch rooms:", error);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [projectId]);

  // Switch to a different room
  const switchRoom = useCallback((roomId) => {
    log.info("Switching to room:", roomId);
    setCurrentRoomId(roomId);
    textChat.setRoom(roomId);
    refreshMessages();
  }, [refreshMessages]);

  // Fetch rooms when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchRooms();
    }
  }, [projectId, fetchRooms]);

  // Calculate the appropriate room ID based on active subtab
  const getSubtabRoomId = useCallback(() => {
    switch (activeSubtab) {
      case 'room':
        return initialRoomId || 'global';
      case 'project':
        return projectId ? `project_${projectId}` : 'global';
      case 'dm':
        // DM room is handled separately in ChatTab component
        return currentRoomId;
      default:
        return 'global';
    }
  }, [activeSubtab, initialRoomId, projectId, currentRoomId]);

  // Switch room when roomId prop changes
  useEffect(() => {
    if (initialRoomId && initialRoomId !== currentRoomId && activeSubtab === 'room') {
      switchRoom(initialRoomId);
    }
  }, [initialRoomId, activeSubtab]);

  // Switch room when subtab changes
  useEffect(() => {
    const targetRoomId = getSubtabRoomId();
    if (targetRoomId && targetRoomId !== currentRoomId && activeSubtab !== 'dm') {
      log.info(`Switching to ${activeSubtab} chat:`, targetRoomId);
      switchRoom(targetRoomId);
    }
  }, [activeSubtab, getSubtabRoomId]);

  // Initialize chat and set up listeners
  useEffect(() => {
    // Initialize the textChat system with current room
    textChat.initialize(currentRoomId);

    // Handle new messages
    const handleNewMessage = (message) => {
      log.debug("Chat: New message received:", message.userName);
      setMessages([...textChat.getMessages()]);
    };

    // Handle message deletion
    const handleDeleteEvent = () => {
      log.debug("Chat: Message deleted");
      setMessages([...textChat.getMessages()]);
    };

    // Subscribe to textChat events
    textChat.onMessage(handleNewMessage);
    textChat.onDelete(handleDeleteEvent);

    // Wait for Y.js to sync
    let syncTimeout;

    const handleSync = (synced) => {
      if (synced) {
        log.info("Chat: Y.js synced, loading messages...");
        clearTimeout(syncTimeout);
        setIsSynced(true);
        setTimeout(() => {
          refreshMessages();
          setIsLoading(false);
        }, 500);
      }
    };

    // Check if already synced
    try {
      provider.on("sync", handleSync);

      // If provider is already synced, trigger immediately
      if (provider.synced) {
        handleSync(true);
      }
    } catch (e) {
      log.warn("Chat: Provider not ready yet, will wait for sync");
    }

    // Fallback timeout
    syncTimeout = setTimeout(() => {
      log.debug("Chat: Sync timeout, loading messages anyway");
      refreshMessages();
      setIsLoading(false);
    }, 3000);

    // Cleanup
    return () => {
      try {
        provider.off("sync", handleSync);
      } catch (e) {
        // Provider may not be available
      }
      clearTimeout(syncTimeout);
      textChat.offMessage(handleNewMessage);
      textChat.offDelete(handleDeleteEvent);
    };
  }, [refreshMessages]);

  // Handle sending a message
  const handleSend = useCallback((text) => {
    try {
      textChat.sendMessage(text);
      log.debug("Chat: Message sent:", text.substring(0, 50));
      // Messages will update via the onMessage callback
    } catch (error) {
      log.error("Chat: Error sending message:", error);
    }
  }, []);

  // Handle deleting a message
  const handleDelete = useCallback((messageId) => {
    if (confirm("Delete this message for everyone?")) {
      textChat.deleteMessage(messageId);
    }
  }, []);

  return {
    // State
    messages,
    isLoading,
    isSynced,
    currentUserId,

    // Room state
    currentRoomId,
    availableRooms,
    isLoadingRooms,

    // Subtab state
    activeSubtab,
    setActiveSubtab,
    subtabs: CHAT_SUBTABS,

    // Handlers
    handleSend,
    handleDelete,
    switchRoom,

    // Actions
    refreshMessages,
    fetchRooms,
  };
}

export default useChatTab;
