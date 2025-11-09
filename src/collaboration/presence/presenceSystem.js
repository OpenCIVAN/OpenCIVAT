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

class PresenceSystem {
  constructor() {
    this.awareness = awareness;
    this.localPresence = null;
    this.presenceListeners = [];
    this.statusListeners = [];
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
      console.warn("⚠️ Presence system already initialized");
      return;
    }

    const userId = getUserId();
    const userName = getUserName();

    if (!userId || !userName) {
      console.error("❌ Cannot initialize presence without user ID and name");
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
    console.log("✅ Presence system initialized");
    console.log("👤 My presence:", this.localPresence);
  }

  /**
   * Update my presence information
   */
  async updateMyPresence(updates) {
    if (!this.localPresence || !this.awareness) {
      console.warn("⚠️ Cannot update presence - not initialized");
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

    console.log("👤 Presence updated:", this.localPresence);
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
    console.log("📊 Status update:", status);
    this.setPresence({ status, lastSeen: Date.now() });
    this.notifyStatusListeners(status);
  }

  /**
   * Get all online users including yourself
   */
  getOnlineUsers() {
    if (!this.awareness) {
      console.warn("⚠️ Cannot get users - presence not initialized");
      return [];
    }

    const users = [];
    const currentUserId = getUserId();

    // awareness.getStates() returns a Map of clientId → state
    this.awareness.getStates().forEach((state, clientId) => {
      if (state && state.userId) {
        users.push({
          clientId,
          ...state,
          isYou: state.userId === currentUserId,
        });
      }
    });

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

    // Log changes for debugging
    if (added.length > 0) {
      console.log("👋 Users joined:", added.length);
    }
    if (removed.length > 0) {
      console.log("👋 Users left:", removed.length);
    }
    if (updated.length > 0) {
      console.log("🔄 Users updated:", updated.length);
    }

    // Get current user list and notify all listeners
    const users = this.getOnlineUsers();
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

    console.log("💓 Heartbeat started");
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log("💓 Heartbeat stopped");
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

    console.log("🎯 Activity tracking enabled");
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
        console.error("Error in presence listener:", error);
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
        console.error("Error in status listener:", error);
      }
    });
  }

  /**
   * Clean up presence system
   * Called when user closes tab or disconnects
   */
  destroy() {
    console.log("👋 Destroying presence system");

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

    this._initialized = false;
  }
}

export const presenceSystem = new PresenceSystem();
