// ----------------------------------------------------------------------------
// Text Chat System (Yjs-based)
// ----------------------------------------------------------------------------

import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { generateTextChatId } from "@Utils/idGenerator.js";

class TextChat {
  constructor() {
    this.messages = null;
    this.messageListeners = [];
    this.clearListeners = [];
    this.deleteListeners = [];
    this.maxMessages = 100;
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.messages = ydoc.getArray("chatMessages");

    // Listen for ALL changes (add, delete, update)
    this.messages.observe((event) => {
      // Check what changed
      event.changes.delta.forEach((change) => {
        // New messages added
        if (change.insert) {
          change.insert.forEach((message) => {
            this.notifyListeners(message);
          });
        }

        // Messages deleted
        if (change.delete) {
          // Notify that messages were deleted
          this.notifyDeleteListeners();
        }

        // Messages retained (no action needed)
        if (change.retain) {
          // No action needed
        }
      });

      // If entire array was cleared
      if (
        this.messages.length === 0 &&
        event.changes.delta.some((d) => d.delete)
      ) {
        this.notifyClearListeners();
      }
    });

    console.log("💬 Text chat initialized");
  }

  sendMessage(text) {
    if (!text || !text.trim()) {
      return;
    }

    const message = {
      id: generateTextChatId(),
      userId: getUserId(),
      userName: getUserName(),
      userColor: getUserColor(getUserId()),
      text: text.trim(),
      timestamp: Date.now(),
    };

    this.messages.push([message]);

    // Limit message history
    if (this.messages.length > this.maxMessages) {
      this.messages.delete(0, this.messages.length - this.maxMessages);
    }

    return message;
  }

  getMessages() {
    if (!this.messages) return [];
    return this.messages.toArray();
  }

  clearMessages() {
    if (this.messages) {
      this.messages.delete(0, this.messages.length);
    }
  }

  deleteMessage(messageId) {
    if (!this.messages) return;

    const messages = this.messages.toArray();
    const index = messages.findIndex((msg) => msg.id === messageId);

    if (index !== -1) {
      this.messages.delete(index, 1);
      console.log("💬 Message deleted:", messageId);
      return true;
    }
    return false;
  }

  onMessage(callback) {
    this.messageListeners.push(callback);
  }

  onClear(callback) {
    this.clearListeners.push(callback);
  }

  onDelete(callback) {
    // ← Add this
    this.deleteListeners.push(callback);
  }

  notifyListeners(message) {
    this.messageListeners.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error("Error in message listener:", error);
      }
    });
  }

  notifyClearListeners() {
    this.clearListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in clear listener:", error);
      }
    });
  }

  notifyDeleteListeners() {
    this.deleteListeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in delete listener:", error);
      }
    });
  }
}

export const textChat = new TextChat();
