// ----------------------------------------------------------------------------
// Robust User Presence System
// Tracks who's online, their status, and manages heartbeats
// ----------------------------------------------------------------------------

import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { awareness } from "@Collaboration/yjs/yjsSetup.js";
import { presence as log } from "@Utils/logger.js";

// Store the current room and workspace IDs
// These are updated by the RoomSelector and WorkspaceSelector components
let currentRoomId = null;
let currentWorkspaceId = null;

class PresenceSystem {
  constructor() {
    this.awareness = awareness;
    this.localPresence = null;
    this.presenceListeners = [];
    this.statusListeners = [];
    this.roomChangeListeners = [];
    this.workspaceChangeListeners = [];
    this.heartbeatInterval = null;
    this._initialized = false;

    // Store handler references for cleanup
    this.presenceChangeHandler = null;
    this.beforeUnloadHandler = null;
  }

  /**
   * Initialize presence system
   * This is called during Phase 2, after Y.js provider is ready
   */
  async initialize() {
    if (this._initialized) {
      log.warn("Presence system already initialized");
      return;
    }

    const userId = getUserId();
    const userName = getUserName();

    if (!userId || !userName) {
      log.error("Cannot initialize presence without user ID and name");
      return;
    }

    // Set initial presence
    this.localPresence = {
      userId: userId,
      userName: userName,
      userColor: getUserColor(),
      status: "active",
      cursor: null,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      // Room and workspace tracking (Space Navigation system)
      roomId: currentRoomId,
      workspaceId: currentWorkspaceId,
      // Voice state
      inVoice: false,
      voiceRoomId: null,
      isMuted: false,
      isSpeaking: false,
    };

    // Set local presence state in awareness
    this.awareness.setLocalState(this.localPresence);

    // Listen for presence changes from other users
    // Using arrow function to make argument passing explicit
    this.presenceChangeHandler = (changes) => {
      this.handlePresenceChange(changes);
    };
    this.awareness.on("change", this.presenceChangeHandler);

    // Start heartbeat to keep presence alive
    this.startHeartbeat();

    // Track user activity for idle detection
    this.setupActivityTracking();

    // Cleanup on page unload to remove presence
    this.beforeUnloadHandler = () => {
      this.destroy();
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);

    this._initialized = true;
    log.info("Presence system initialized");
    log.debug("My presence:", this.localPresence);
  }

  /**
   * Update my presence information
   */
  async updateMyPresence(updates) {
    log.trace("Updating my presence:", {
      userId: getUserId(),
      userName: getUserName(),
      sessionId: this.sessionId, // If you track sessions
    });
    if (!this.localPresence || !this.awareness) {
      log.warn("Cannot update presence - not initialized");
      return;
    }

    // Merge updates with current presence
    Object.assign(this.localPresence, updates, {
      lastSeen: Date.now(),
    });

    // Sync to awareness (which syncs to other users via Y.js)
    this.awareness.setLocalState(this.localPresence);

    // Notify local listeners so React components can update
    this.notifyPresenceListeners();

    log.trace("Presence updated:", this.localPresence);
  }

  /**
   * Shorthand for updating presence
   */
  setPresence(updates) {
    this.updateMyPresence(updates);
  }

  /**
   * Update user status (active, idle, away)
   */
  updateStatus(status) {
    log.debug("Status update:", status);
    this.setPresence({ status, lastSeen: Date.now() });
    this.notifyStatusListeners(status);
  }

  // ==========================================================================
  // ROOM & WORKSPACE METHODS (Space Navigation)
  // ==========================================================================

  /**
   * Set the current room ID
   * Called when user joins/switches rooms
   */
  setRoom(roomId) {
    const previousRoomId = currentRoomId;
    currentRoomId = roomId;

    log.info("Room changed:", { from: previousRoomId, to: roomId });

    this.setPresence({ roomId });
    this.notifyRoomChangeListeners(roomId, previousRoomId);
  }

  /**
   * Get the current room ID
   */
  getRoom() {
    return currentRoomId;
  }

  /**
   * Set the current workspace ID
   * Called when user switches workspaces
   */
  setWorkspace(workspaceId) {
    const previousWorkspaceId = currentWorkspaceId;
    currentWorkspaceId = workspaceId;

    log.debug("Workspace changed:", {
      from: previousWorkspaceId,
      to: workspaceId,
    });

    this.setPresence({ workspaceId });
    this.notifyWorkspaceChangeListeners(workspaceId, previousWorkspaceId);
  }

  /**
   * Get the current workspace ID
   */
  getWorkspace() {
    return currentWorkspaceId;
  }

  /**
   * Get all users in a specific room
   */
  getUsersInRoom(roomId) {
    return this.getOnlineUsers().filter((user) => user.roomId === roomId);
  }

  /**
   * Get all users viewing a specific workspace
   */
  getUsersInWorkspace(workspaceId) {
    return this.getOnlineUsers().filter(
      (user) => user.workspaceId === workspaceId
    );
  }

  /**
   * Get count of users in a room (for display in room selector)
   */
  getRoomUserCount(roomId) {
    return this.getUsersInRoom(roomId).length;
  }

  /**
   * Listen for room changes
   */
  onRoomChange(callback) {
    this.roomChangeListeners.push(callback);
    return () => {
      this.roomChangeListeners = this.roomChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Listen for workspace changes
   */
  onWorkspaceChange(callback) {
    this.workspaceChangeListeners.push(callback);
    return () => {
      this.workspaceChangeListeners = this.workspaceChangeListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Notify room change listeners
   */
  notifyRoomChangeListeners(newRoomId, oldRoomId) {
    this.roomChangeListeners.forEach((callback) => {
      try {
        callback(newRoomId, oldRoomId);
      } catch (error) {
        log.error("Error in room change listener:", error);
      }
    });
  }

  /**
   * Notify workspace change listeners
   */
  notifyWorkspaceChangeListeners(newWorkspaceId, oldWorkspaceId) {
    this.workspaceChangeListeners.forEach((callback) => {
      try {
        callback(newWorkspaceId, oldWorkspaceId);
      } catch (error) {
        log.error("Error in workspace change listener:", error);
      }
    });
  }

  // ==========================================================================
  // VOICE STATE METHODS
  // ==========================================================================

  /**
   * Update voice state
   */
  updateVoiceState(voiceState) {
    this.setPresence({
      inVoice: voiceState.inVoice ?? this.localPresence?.inVoice,
      voiceRoomId: voiceState.voiceRoomId ?? this.localPresence?.voiceRoomId,
      isMuted: voiceState.isMuted ?? this.localPresence?.isMuted,
      isSpeaking: voiceState.isSpeaking ?? this.localPresence?.isSpeaking,
    });
  }

  /**
   * Set whether user is speaking (for visual indicators)
   */
  setSpeaking(isSpeaking) {
    this.setPresence({ isSpeaking });
  }

  /**
   * Get users in voice for a specific room
   */
  getUsersInVoice(voiceRoomId) {
    return this.getOnlineUsers().filter(
      (user) => user.inVoice && user.voiceRoomId === voiceRoomId
    );
  }

  /**
   * Get all online users including yourself
   * Deduplicates users by userId (handles multiple tabs from same user)
   */
  getOnlineUsers() {
    if (!this.awareness) {
      log.warn("Cannot get users - presence not initialized");
      return [];
    }

    const currentUserId = getUserId();
    // Use a Map to deduplicate by userId, keeping the most recent entry
    const userMap = new Map();

    // awareness.getStates() returns a Map of clientId → state
    this.awareness.getStates().forEach((state, clientId) => {
      if (state && state.userId) {
        const existingUser = userMap.get(state.userId);

        // Keep the entry with the most recent lastSeen timestamp
        // This ensures we show the most active tab's state
        if (
          !existingUser ||
          (state.lastSeen || 0) > (existingUser.lastSeen || 0)
        ) {
          userMap.set(state.userId, {
            clientId,
            ...state,
            isYou: state.userId === currentUserId,
          });
        }
      }
    });

    // Convert map to array
    const users = Array.from(userMap.values());

    // Sort: current user first, then by join time
    users.sort((a, b) => {
      if (a.isYou) return -1;
      if (b.isYou) return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });

    return users;
  }

  /**
   * Get all users except yourself
   */
  getOtherUsers() {
    return this.getOnlineUsers().filter((user) => !user.isYou);
  }

  /**
   * Handle presence changes from awareness system
   * This fires when users join, leave, or update their presence
   */
  handlePresenceChange(changes) {
    const { added, updated, removed } = changes;

    // Enhanced logging
    if (added.length > 0) {
      const names = added.map(
        (id) => this.awareness.getStates().get(id)?.userName || "Unknown"
      );
      log.debug("Users joined:", names);
    }
    if (removed.length > 0) {
      log.debug("Users left:", removed.length, "users");
    }
    if (updated.length > 0) {
      log.debug("Users updated:", updated.length, "users");
    }

    // CRITICAL: Always get fresh user list and notify ALL listeners
    const users = this.getOnlineUsers();
    log.debug(
      "Broadcasting to",
      this.presenceListeners.length,
      "listeners with",
      users.length,
      "users"
    );
    this.notifyPresenceListeners(users);
  }

  /**
   * Start heartbeat to keep presence alive
   * This prevents the server from thinking we disconnected
   */
  startHeartbeat() {
    // Send heartbeat every 10 seconds to keep presence alive
    this.heartbeatInterval = setInterval(() => {
      if (this.localPresence) {
        this.setPresence({ lastSeen: Date.now() });
      }
    }, 10000);

    log.debug("Heartbeat started");
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      log.debug("Heartbeat stopped");
    }
  }

  /**
   * Setup activity tracking for idle detection
   * Automatically marks user as idle after 5 minutes, away after 15 minutes
   */
  setupActivityTracking() {
    let idleTimeout = null;
    let awayTimeout = null;

    const markActive = () => {
      // Only update if status actually changed (avoid unnecessary network traffic)
      if (this.localPresence?.status !== "active") {
        this.updateStatus("active");
      }

      // Clear any pending idle/away timers
      clearTimeout(idleTimeout);
      clearTimeout(awayTimeout);

      // Set idle after 5 minutes of inactivity
      idleTimeout = setTimeout(() => {
        this.updateStatus("idle");

        // Set away after 15 minutes total (10 more minutes after idle)
        awayTimeout = setTimeout(() => {
          this.updateStatus("away");
        }, 10 * 60 * 1000);
      }, 5 * 60 * 1000);
    };

    // Track various user activity events
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(event, markActive, { passive: true });
    });
    // Mark as active immediately on setup
    markActive();

    log.debug("Activity tracking enabled");
  }

  /**
   * Listen for presence changes (users joining/leaving/updating)
   * Returns a cleanup function to remove the listener
   */
  onPresenceChange(callback) {
    this.presenceListeners.push(callback);

    // Immediately call with current users so UI can render initial state
    const users = this.getOnlineUsers();
    callback(users);

    // Return cleanup function
    return () => {
      this.presenceListeners = this.presenceListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Listen for status changes (active, idle, away)
   * Returns a cleanup function
   */
  onStatusChange(callback) {
    this.statusListeners.push(callback);

    // Return cleanup function
    return () => {
      this.statusListeners = this.statusListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Notify all presence listeners with updated user list
   */
  notifyPresenceListeners(users) {
    // If no users provided, get current list
    const userList = users || this.getOnlineUsers();

    this.presenceListeners.forEach((callback) => {
      try {
        callback(userList);
      } catch (error) {
        log.error("Error in presence listener:", error);
      }
    });
  }

  /**
   * Notify all status listeners
   */
  notifyStatusListeners(status) {
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        log.error("Error in status listener:", error);
      }
    });
  }

  /**
   * Clean up presence system
   * Called when user closes tab or disconnects
   */
  destroy() {
    log.debug("Destroying presence system");

    // Stop heartbeat
    this.stopHeartbeat();

    // Remove our presence from awareness
    if (this.awareness) {
      this.awareness.setLocalState(null);
    }

    // Remove event listeners
    if (this.presenceChangeHandler) {
      this.awareness.off("change", this.presenceChangeHandler);
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }

    // Clear listeners
    this.presenceListeners = [];
    this.statusListeners = [];
    this.roomChangeListeners = [];
    this.workspaceChangeListeners = [];

    // Reset room/workspace IDs
    currentRoomId = null;
    currentWorkspaceId = null;

    this._initialized = false;
  }
}

export const presenceSystem = new PresenceSystem();
