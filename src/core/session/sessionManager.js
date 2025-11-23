// src/core/session/sessionManager.js
// Centralized management of session identity and routing
// This is the single source of truth for "which room am I in?"
import { config } from "@Core/config/clientConfig.js";

class SessionManager {
  constructor() {
    this.roomId = null;
    this.roomName = null;
    this.userId = null;
    this.sessionStartedAt = null;
  }

  /**
   * Initialize session from URL or default
   * This should be called once during application startup, before Y.js connects
   */
  initializeFromURL() {
    // The room identity can come from several sources, checked in priority order:

    // 1. URL path parameter (future: /rooms/project-123)
    const pathMatch = window.location.pathname.match(/^\/rooms\/([^\/]+)/);
    if (pathMatch) {
      this.roomId = pathMatch[1];
      this.roomName = this.roomId; // For now, ID and name are the same
      console.log(`🏠 Session initialized from URL path: ${this.roomId}`);
      return this.roomId;
    }

    // 2. URL query parameter (?room=analytics-project)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      this.roomId = roomParam;
      this.roomName = roomParam;
      console.log(`🏠 Session initialized from query param: ${this.roomId}`);
      return this.roomId;
    }

    // 3. localStorage (for returning users)
    const savedRoom = localStorage.getItem("cia_last_room");
    if (savedRoom) {
      this.roomId = savedRoom;
      this.roomName = savedRoom;
      console.log(`🏠 Session initialized from localStorage: ${this.roomId}`);
      return this.roomId;
    }

    // 4. Default room (for development/testing)
    // Use demo project ID from config (server-compatible UUID)
    this.roomId = config.defaultSessionId;
    this.roomName = "Demo Project";
    console.log(`🏠 Session initialized with default room: ${this.roomId}`);

    return this.roomId;
  }

  /**
   * Get the current room ID
   * This is what gets passed to Y.js WebsocketProvider
   */
  getRoomId() {
    if (!this.roomId) {
      throw new Error(
        "Session not initialized - call initializeFromURL() first"
      );
    }
    return this.roomId;
  }

  /**
   * Get the display name for the current room
   * This is what gets shown in the UI
   */
  getRoomName() {
    return this.roomName || this.roomId;
  }

  /**
   * Update the room name (display name only, doesn't change the room)
   * Useful when you fetch project metadata from a server later
   */
  setRoomDisplayName(displayName) {
    this.roomName = displayName;
    console.log(`🏷️ Room display name updated: ${displayName}`);
  }

  /**
   * Save current room to localStorage so returning users go to the same room
   */
  saveCurrentRoomToStorage() {
    if (this.roomId) {
      localStorage.setItem("cia_last_room", this.roomId);
    }
  }

  /**
   * Navigate to a different room (this will reload the page)
   * In the future, this might use client-side routing instead
   */
  switchRoom(newRoomId) {
    // Save the new room as the last visited room
    localStorage.setItem("cia_last_room", newRoomId);

    // Update URL to reflect new room
    const newUrl = `/rooms/${newRoomId}`;
    window.history.pushState({}, "", newUrl);

    // For now, we need to reload to reconnect Y.js
    // In the future, you might implement hot room switching
    console.log(`🔄 Switching to room: ${newRoomId}`);
    window.location.reload();
  }

  /*
   * Get current user ID
   * Returns demo user ID if not set (for development)
   */
  getUserId() {
    return this.userId || "00000000-0000-0000-0000-000000000001";
  }

  /**
   * Get current user email
   * Returns demo email if not set (for development)
   */
  getUserEmail() {
    return this.userEmail || "demo@cia-web.local";
  }

  /**
   * Set user info (called after authentication)
   */
  setUserInfo(userId, email) {
    this.userId = userId;
    this.userEmail = email;
    console.log(`👤 User info set: ${email} (${userId})`);
  }

  /**
   * Clear session (useful for logout or switching contexts)
   */
  clearSession() {
    this.roomId = null;
    this.roomName = null;
    this.userId = null;
    this.userEmail = null;
    localStorage.removeItem("cia_last_room");
  }

  /**
   * Get complete session info for debugging
   */
  getSessionInfo() {
    return {
      roomId: this.roomId,
      roomName: this.roomName,
      userId: this.userId,
      sessionStartedAt: this.sessionStartedAt,
      url: window.location.href,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Convenience export for backward compatibility
export function getRoomName() {
  return sessionManager.getRoomName();
}
