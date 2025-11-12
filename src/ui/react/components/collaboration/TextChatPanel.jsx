import React, { useState, useEffect, useRef } from "react";

import { textChat } from "@Collaboration/communication/textChat.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { provider } from "@Collaboration/yjs/yjsSetup.js";

export function TextChatPanel() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const currentUserId = getUserId();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const refreshMessages = () => {
    const allMessages = textChat.getMessages();
    console.log("📨 Refreshing messages, count:", allMessages.length);
    setMessages([...allMessages]); // ✅ Force new array reference for React
    setIsLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    // Initialize text chat system
    textChat.initialize();

    // ✅ CRITICAL FIX: Use textChat's event system instead of direct Y.js observer
    // This properly triggers React state updates
    const handleNewMessage = (message) => {
      console.log("📬 New message received:", message);
      // Force re-fetch all messages to ensure React sees the change
      setMessages([...textChat.getMessages()]);
      setTimeout(scrollToBottom, 50);
    };

    const handleDelete = () => {
      console.log("🗑️ Message deleted");
      setMessages([...textChat.getMessages()]);
    };

    // Subscribe to textChat events
    textChat.onMessage(handleNewMessage);
    textChat.onDelete(handleDelete);

    // Wait for Y.js to sync before initial load
    let syncTimeout;

    const handleSync = (synced) => {
      if (synced) {
        console.log("🔄 Y.js synced, loading initial messages...");
        clearTimeout(syncTimeout);
        setTimeout(() => {
          refreshMessages();
        }, 500);
      }
    };

    provider.on("sync", handleSync);

    // Fallback timeout
    syncTimeout = setTimeout(() => {
      console.log("⏰ Sync timeout, loading messages anyway");
      refreshMessages();
    }, 3000);

    // Cleanup
    return () => {
      provider.off("sync", handleSync);
      clearTimeout(syncTimeout);
      // Note: textChat doesn't have offMessage/offDelete methods yet
      // We should add them, but for now this is safe since the component
      // will just receive extra updates when unmounted
    };
  }, []);

  const handleSend = () => {
    const value = inputValue.trim();
    if (value) {
      try {
        textChat.sendMessage(value);
        setInputValue(""); // Clear immediately
        inputRef.current?.focus();
        // No need to manually update state - the onMessage callback will handle it
      } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Check console for details.");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = (messageId) => {
    if (confirm("Delete this message for everyone?")) {
      textChat.deleteMessage(messageId);
      // State will update via onDelete callback
    }
  };

  return (
    <div style={{
      padding: "10px",
      backgroundColor: "#2a2a2a",
      borderRadius: "6px",
      marginBottom: "10px",
      border: "1px solid #333"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
        paddingBottom: "8px",
        borderBottom: "1px solid #444"
      }}>
        <h4 style={{
          margin: 0,
          fontSize: "13px",
          fontWeight: "600",
          textTransform: "uppercase",
          color: "#e0e0e0"
        }}>
          💬 Text Chat
        </h4>

        {isLoading && (
          <span style={{ fontSize: "11px", color: "#666" }}>
            Syncing...
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          maxHeight: "200px",
          overflowY: "auto",
          backgroundColor: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "8px",
          marginBottom: "8px"
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            color: "#666",
            fontStyle: "italic",
            padding: "20px",
            textAlign: "center",
            fontSize: "12px"
          }}>
            {isLoading ? "Loading messages..." : "No messages yet. Start chatting!"}
          </div>
        ) : (
          messages.map((message) => {
            const timestamp = new Date(message.timestamp).toLocaleTimeString();
            const isOwnMessage = message.userId === currentUserId;

            return (
              <div
                key={message.id}
                style={{
                  borderLeft: `3px solid ${message.userColor || "#2196F3"}`,
                  padding: "8px",
                  marginBottom: "8px",
                  backgroundColor: isOwnMessage ? "rgba(76, 175, 80, 0.15)" : "#242424",
                  borderRadius: "3px",
                  position: "relative",
                  fontSize: "12px",
                  border: "1px solid #333"
                }}
              >
                <div style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#999",
                  marginBottom: "4px"
                }}>
                  {message.userName} - {timestamp}
                  {isOwnMessage && (
                    <span style={{
                      color: "#81C784",
                      fontSize: "10px",
                      marginLeft: "4px"
                    }}>
                      (You)
                    </span>
                  )}
                </div>

                <div style={{
                  color: "#e0e0e0",
                  lineHeight: "1.4",
                  wordWrap: "break-word"
                }}>
                  {message.text}
                </div>

                {isOwnMessage && (
                  <button
                    onClick={() => handleDelete(message.id)}
                    title="Delete this message"
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      fontSize: "14px",
                      lineHeight: "1",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "8px",
            border: "1px solid #444",
            backgroundColor: "#1a1a1a",
            color: "#e0e0e0",
            borderRadius: "3px",
            fontSize: "12px",
            outline: "none",
            opacity: isLoading ? 0.5 : 1
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "3px",
            fontSize: "12px",
            fontWeight: "500",
            cursor: isLoading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            opacity: isLoading ? 0.5 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}