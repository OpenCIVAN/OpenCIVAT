// ----------------------------------------------------------------------------
// Robust User Presence System
// Tracks who's online, their status, and manages heartbeats
// ----------------------------------------------------------------------------

import { provider } from "./yjsSetup.js";
import { getUserId, getUserName, getUserColor } from "./userManagement.js";

class PresenceSystem {
  constructor() {
    this.awareness = null;
    this.localPresence = null;
    this.presenceListeners = [];
    this.statusListeners = [];
    this.heartbeatInterval = null;
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    // Use Y.js Awareness API for presence
    this.awareness = provider.awareness;

    // Set initial presence
    this.setPresence({
      userId: getUserId(),
      userName: getUserName(),
      userColor: getUserColor(getUserId()),
      status: "active",
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    });

    // Listen for presence changes (joins/leaves/updates)
    this.awareness.on("change", this.handlePresenceChange.bind(this));

    // Start heartbeat to keep presence alive
    this.startHeartbeat();

    // Track user activity for idle detection
    this.setupActivityTracking();

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.destroy();
    });

    console.log("👥 Presence system initialized");
    console.log("👤 My presence:", this.localPresence);
  }

  updateMyPresence(updates) {
    if (!this.localPresence || !this.awareness) {
      console.warn("⚠️ Cannot update presence - not initialized");
      return;
    }

    // Update local presence object
    Object.assign(this.localPresence, updates, {
      lastSeen: Date.now(),
    });

    // Sync to Y.js
    this.awareness.setLocalState(this.localPresence);

    console.log("👤 Presence updated:", this.localPresence);

    // CRITICAL: Notify listeners so React re-renders
    this.notifyPresenceListeners();
  }

  setPresence(updates) {
    const current = this.awareness.getLocalState() || {};
    this.localPresence = {
      ...current,
      ...updates,
      lastSeen: Date.now(),
    };
    this.awareness.setLocalState(this.localPresence);
  }

  updateStatus(status) {
    console.log("📊 Status update:", status);
    this.setPresence({ status, lastSeen: Date.now() });
    this.notifyStatusListeners(status);
  }

  getOnlineUsers() {
    const users = [];
    this.awareness.getStates().forEach((state, clientId) => {
      if (state && state.userId) {
        users.push({
          clientId,
          ...state,
          isYou: state.userId === getUserId(),
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

    // Notify all listeners with current user list
    const users = this.getOnlineUsers();
    this.notifyPresenceListeners(users);
  }

  startHeartbeat() {
    // Send heartbeat every 10 seconds to keep presence alive
    this.heartbeatInterval = setInterval(() => {
      this.setPresence({ lastSeen: Date.now() });
    }, 10000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  setupActivityTracking() {
    let idleTimeout = null;
    let awayTimeout = null;

    const markActive = () => {
      // Only update if status changed
      if (this.localPresence?.status !== "active") {
        this.updateStatus("active");
      }

      // Clear timers
      clearTimeout(idleTimeout);
      clearTimeout(awayTimeout);

      // Set idle after 5 minutes of inactivity
      idleTimeout = setTimeout(() => {
        this.updateStatus("idle");

        // Set away after 15 minutes total
        awayTimeout = setTimeout(() => {
          this.updateStatus("away");
        }, 10 * 60 * 1000); // 10 more minutes
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Track user activity
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

    // Initial mark as active
    markActive();
  }

  onPresenceChange(callback) {
    this.presenceListeners.push(callback);

    // Immediately call with current users
    const users = this.getOnlineUsers();
    callback(users);

    return () => {
      // Return cleanup function
      this.presenceListeners = this.presenceListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);

    return () => {
      this.statusListeners = this.statusListeners.filter(
        (cb) => cb !== callback
      );
    };
  }

  notifyPresenceListeners(users) {
    this.presenceListeners.forEach((callback) => {
      try {
        callback(users);
      } catch (error) {
        console.error("Error in presence listener:", error);
      }
    });
  }

  notifyStatusListeners(status) {
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("Error in status listener:", error);
      }
    });
  }

  destroy() {
    console.log("👋 Destroying presence system");
    this.stopHeartbeat();
    if (this.awareness) {
      this.awareness.setLocalState(null);
    }
  }
}

export const presenceSystem = new PresenceSystem();
