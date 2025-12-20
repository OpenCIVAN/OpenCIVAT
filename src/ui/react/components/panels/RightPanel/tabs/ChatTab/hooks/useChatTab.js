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
 * Hook for ChatTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @returns {Object} Chat state and handlers
 */
export function useChatTab(options = {}) {
  const { workspaceId } = options;

  // State
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Current user
  const currentUserId = getUserId();

  // Refresh messages from textChat
  const refreshMessages = useCallback(() => {
    const allMessages = textChat.getMessages();
    log.debug("Chat refreshing messages, count:", allMessages.length);
    setMessages([...allMessages]);
  }, []);

  // Initialize chat and set up listeners
  useEffect(() => {
    // Initialize the textChat system
    textChat.initialize();

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

    // Handlers
    handleSend,
    handleDelete,

    // Actions
    refreshMessages,
  };
}

export default useChatTab;
