// src/core/session/sessionManager.js
// Centralized management of session identity and routing
// This is the single source of truth for "which room am I in?"
import { config } from "@Core/config/clientConfig.js";
import { auth as log } from "@Utils/logger.js";

class SessionManager {
  constructor() {
    this.roomId = null;
    this.roomName = null;
    this.userId = null;
    this.sessionStartedAt = null;
  }

  /**
   * Initialize session from URL or default.
   * Synchronous — preserves existing call sites.
   * Does NOT validate room access; use initializeFromURLAsync for hardened startup.
   */
  initializeFromURL() {
    this.roomId = this._resolveRoomFromURL();
    return this.roomId;
  }

  /**
   * Resolve room identity from available sources in priority order:
   *   1. URL path  (/rooms/{id})
   *   2. URL query  (?room=...)
   *   3. localStorage  (cia_last_room)
   *   4. config default
   *
   * Does NOT write to localStorage — caller is responsible.
   * @private
   */
  _resolveRoomFromURL() {
    // 1. URL path
    const pathMatch = window.location.pathname.match(/^\/rooms\/([^/]+)/);
    if (pathMatch) {
      this.roomName = pathMatch[1];
      log.info(`Session resolved from URL path: ${pathMatch[1]}`);
      return pathMatch[1];
    }

    // 2. URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      this.roomName = roomParam;
      log.info(`Session resolved from query param: ${roomParam}`);
      return roomParam;
    }

    // 3. localStorage
    const savedRoom = localStorage.getItem("cia_last_room");
    if (savedRoom) {
      this.roomName = savedRoom;
      log.info(`Session resolved from localStorage: ${savedRoom}`);
      return savedRoom;
    }

    // 4. Default
    this.roomName = "Demo Project";
    log.info(`Session resolved to default room: ${config.defaultSessionId}`);
    return config.defaultSessionId;
  }

  /**
   * Initialize session from URL with server-side room access validation.
   * Validates the resolved room against the API; falls back to the project's
   * main room if the room is inaccessible (403/404) or deleted.
   * localStorage is updated ONLY after successful validation.
   *
   * Call this instead of initializeFromURL() from authenticated startup flows.
   *
   * @param {string|null} [projectId]  Optional project UUID for main-room fallback.
   * @returns {Promise<string>} The validated (or fallback) room ID.
   */
  async initializeFromURLAsync(projectId) {
    const resolvedRoomId = this._resolveRoomFromURL();

    if (!resolvedRoomId || !projectId) {
      this.roomId = resolvedRoomId || config.defaultSessionId;
      return this.roomId;
    }

    try {
      const headers = this._cachedToken
        ? { Authorization: `Bearer ${this._cachedToken}` }
        : {};

      const resp = await fetch(
        `/api/projects/${projectId}/rooms/${resolvedRoomId}`,
        { headers }
      );

      if (!resp.ok) {
        log.warn(
          `Room ${resolvedRoomId} not accessible (${resp.status}), ` +
          `falling back to main room for project ${projectId}`
        );
        const mainRoom = await this._fetchMainRoom(projectId);
        this.roomId = mainRoom?.id || config.defaultSessionId;
        this.roomName = mainRoom?.name || "Main Room";
        // Do NOT persist the unauthorized room to localStorage
        return this.roomId;
      }

      // Validated — safe to persist
      this.roomId = resolvedRoomId;
      localStorage.setItem("cia_last_room", resolvedRoomId);
      return this.roomId;
    } catch (err) {
      // Network error — proceed with unvalidated room (offline-friendly)
      log.warn("Room validation request failed (network?):", err?.message);
      this.roomId = resolvedRoomId;
      return this.roomId;
    }
  }

  /**
   * Fetch the main room for a project from the server.
   * @private
   * @param {string} projectId
   * @returns {Promise<{id: string, name: string}|null>}
   */
  async _fetchMainRoom(projectId) {
    try {
      const headers = this._cachedToken
        ? { Authorization: `Bearer ${this._cachedToken}` }
        : {};
      const resp = await fetch(
        `/api/projects/${projectId}/rooms`,
        { headers }
      );
      if (!resp.ok) return null;
      const rooms = await resp.json();
      const list = Array.isArray(rooms) ? rooms : rooms?.rooms ?? [];
      return list.find((r) => r.is_main || r.room_type === "main") ?? null;
    } catch {
      return null;
    }
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
    log.debug(`Room display name updated: ${displayName}`);
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
    log.info(`Switching to room: ${newRoomId}`);
    window.location.reload();
  }

  /**
   * Generate a fresh UUID-based session and navigate to it.
   * Creates a shareable /rooms/{uuid} URL and reloads the page.
   * @returns {string} The new session ID
   */
  generateNewSession() {
    const newId = (window.crypto || crypto).randomUUID();
    log.info(`Generating new session: ${newId}`);
    this.switchRoom(newId);
    return newId;
  }

  /*
   * Get current user ID
   * Returns CIA Admin user ID if not set (for development)
   * Note: System user (000001) is reserved for automated processes
   */
  getUserId() {
    return this.userId || "00000000-0000-0000-0000-000000000002";
  }

  /**
   * Get current user email
   * Returns CIA Admin email if not set (for development)
   */
  getUserEmail() {
    return this.userEmail || "admin@cia-web.local";
  }

  /**
   * Set user info (called after authentication)
   */
  setUserInfo(userId, email) {
    this.userId = userId;
    this.userEmail = email;
    log.debug(`User info set: ${email} (${userId})`);
  }

  /**
   * Set the cached auth token (called by authService on auth success/refresh)
   */
  setToken(token) {
    this._cachedToken = token;
  }

  /**
   * Get the current auth token (cached for sync access)
   * This is used by CanvasManager and other services for authenticated API calls
   */
  getToken() {
    return this._cachedToken || null;
  }

  /**
   * Clear session (useful for logout or switching contexts)
   */
  clearSession() {
    this.roomId = null;
    this.roomName = null;
    this.userId = null;
    this.userEmail = null;
    this._cachedToken = null;
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
