// src/ui/react/components/collaboration/PeoplePanel/usePeoplePanel.js
// Logic hook for PeoplePanel - separates business logic from presentation

import { useState, useEffect, useCallback, useMemo } from "react";
import { presence as log } from "@Utils/logger.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";
import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes default (will be configurable)
const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "mousedown",
  "touchstart",
  "scroll",
];

// =============================================================================
// MOCK DATA FOR DEVELOPMENT
// Remove when backend is connected
// =============================================================================

const MOCK_OFFLINE_USERS = [
  {
    odbc: "offline-1",
    userName: "Eve",
    userColor: "#9C27B0",
    lastSeen: Date.now() - 2 * 3600000,
  },
  {
    odbc: "offline-2",
    userName: "Frank",
    userColor: "#FF5722",
    lastSeen: Date.now() - 86400000,
  },
  {
    odbc: "offline-3",
    userName: "Grace",
    userColor: "#00BCD4",
    lastSeen: Date.now() - 3 * 86400000,
  },
];

const MOCK_BREAKOUT_ROOMS = [
  {
    id: "room-main",
    name: "Main Room",
    description: "Primary collaboration space",
    access: "open",
    hasVoice: true,
    hasText: true,
    hasWorkspace: true,
    isPersistent: true,
    members: [],
    ownerId: null,
  },
  {
    id: "room-analysis",
    name: "Data Analysis",
    description: "Focused analysis work",
    access: "invite",
    hasVoice: true,
    hasText: true,
    hasWorkspace: true,
    isPersistent: true,
    members: [],
    ownerId: "user-1",
  },
];

// =============================================================================
// MAIN HOOK
// =============================================================================

export function usePeoplePanel() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Current user state
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(MOCK_BREAKOUT_ROOMS[0]);

  // All users from presence system
  const [allUsers, setAllUsers] = useState([]);

  // Offline users (from auth system - stub for now)
  const [offlineUsers, setOfflineUsers] = useState(MOCK_OFFLINE_USERS);

  // Breakout rooms
  const [breakoutRooms, setBreakoutRooms] = useState(MOCK_BREAKOUT_ROOMS);

  // Idle detection
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(IDLE_TIMEOUT_MS);

  // ---------------------------------------------------------------------------
  // PRESENCE SYSTEM INTEGRATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    log.debug("usePeoplePanel: Setting up presence listener");

    const cleanup = presenceSystem.onPresenceChange((onlineUsers) => {
      log.debug(
        "usePeoplePanel: Received presence update",
        onlineUsers.length,
        "users"
      );
      setAllUsers(onlineUsers);

      // Find current user
      const me = onlineUsers.find((u) => u.isYou);
      if (me) {
        setCurrentUser(me);
      }
    });

    // Get initial users
    const initialUsers = presenceSystem.getOnlineUsers();
    setAllUsers(initialUsers);

    const me = initialUsers.find((u) => u.isYou);
    if (me) {
      setCurrentUser(me);
    }

    return cleanup;
  }, []);

  // ---------------------------------------------------------------------------
  // IDLE DETECTION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());

      // If user was idle, set them back to online
      if (currentUser?.status === "idle") {
        updateMyStatus("online");
      }
    };

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for idle periodically
    const idleCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      if (
        timeSinceActivity >= idleTimeoutMs &&
        currentUser?.status === "online"
      ) {
        log.debug("User idle - auto-updating status");
        updateMyStatus("idle");
      }
    }, 30000); // Check every 30 seconds

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(idleCheckInterval);
    };
  }, [lastActivityTime, idleTimeoutMs, currentUser?.status]);

  // ---------------------------------------------------------------------------
  // USER GROUPING
  // ---------------------------------------------------------------------------

  const { onlineUsers, idleUsers, awayUsers, dndUsers } = useMemo(() => {
    const online = [];
    const idle = [];
    const away = [];
    const dnd = [];

    allUsers.forEach((user) => {
      switch (user.status) {
        case "idle":
          idle.push(user);
          break;
        case "away":
          away.push(user);
          break;
        case "dnd":
          dnd.push(user);
          break;
        case "online":
        default:
          online.push(user);
          break;
      }
    });

    // Sort each group: current user first, then alphabetically
    const sortUsers = (users) =>
      users.sort((a, b) => {
        if (a.isYou) return -1;
        if (b.isYou) return 1;
        return (a.userName || "").localeCompare(b.userName || "");
      });

    return {
      onlineUsers: sortUsers(online),
      idleUsers: sortUsers(idle),
      awayUsers: sortUsers(away),
      dndUsers: sortUsers(dnd),
    };
  }, [allUsers]);

  // ---------------------------------------------------------------------------
  // STATUS ACTIONS
  // ---------------------------------------------------------------------------

  const updateMyStatus = useCallback((status) => {
    log.debug("Updating my status to:", status);

    // Update in presence system
    if (presenceSystem && typeof presenceSystem.updateStatus === "function") {
      presenceSystem.updateStatus(status);
    } else if (
      presenceSystem &&
      typeof presenceSystem.setPresence === "function"
    ) {
      presenceSystem.setPresence({ status });
    }

    // Optimistic local update
    setCurrentUser((prev) => (prev ? { ...prev, status } : null));
  }, []);

  const updateMyStatusMessage = useCallback((statusMessage) => {
    log.debug("Updating my status message to:", statusMessage);

    // Update in presence system
    if (presenceSystem && typeof presenceSystem.setPresence === "function") {
      presenceSystem.setPresence({ statusMessage });
    }

    // Optimistic local update
    setCurrentUser((prev) => (prev ? { ...prev, statusMessage } : null));
  }, []);

  // ---------------------------------------------------------------------------
  // ROOM ACTIONS (STUBS)
  // ---------------------------------------------------------------------------

  const joinRoom = useCallback(
    (roomId) => {
      log.debug("Joining room:", roomId);
      const room = breakoutRooms.find((r) => r.id === roomId);
      if (room) {
        setCurrentRoom(room);

        // TODO: Actually join the room via Y.js/backend
        // - Switch Y.js document/subdoc
        // - Update presence to show room
        // - Connect to voice if room has voice
      }
    },
    [breakoutRooms]
  );

  const leaveRoom = useCallback(
    (roomId) => {
      log.debug("Leaving room:", roomId);

      // Go back to main room
      const mainRoom =
        breakoutRooms.find((r) => r.id === "room-main") || breakoutRooms[0];
      setCurrentRoom(mainRoom);

      // TODO: Actually leave the room
      // - Switch back to main Y.js document
      // - Update presence
      // - Disconnect from voice if connected
    },
    [breakoutRooms]
  );

  const requestRoomInvite = useCallback((roomId) => {
    log.debug("Requesting invite to room:", roomId);

    // TODO: Send invite request
    // - Create notification for room owner
    // - Show pending state in UI
    log.warn(`Invite request sent for room ${roomId}. This is a stub!`);
  }, []);

  const createRoom = useCallback(
    (roomConfig) => {
      log.debug("Creating room:", roomConfig);

      const newRoom = {
        id: `room-${Date.now()}`,
        name: roomConfig.name,
        description: roomConfig.description || "",
        access: roomConfig.access || "open",
        hasVoice: roomConfig.hasVoice || false,
        hasText: roomConfig.hasText || false,
        hasWorkspace: roomConfig.hasWorkspace || false,
        isPersistent: roomConfig.isPersistent || false,
        members: roomConfig.initialMembers || [],
        ownerId: getUserId(),
      };

      setBreakoutRooms((prev) => [...prev, newRoom]);

      // Auto-join if user wants to
      if (roomConfig.autoJoin) {
        joinRoom(newRoom.id);
      }

      // TODO: Actually create room
      // - Create Y.js subdoc for room
      // - Store in database if persistent
      // - Notify invited users

      return newRoom;
    },
    [joinRoom]
  );

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  const updateIdleTimeout = useCallback((minutes) => {
    setIdleTimeoutMs(minutes * 60 * 1000);
    // TODO: Persist to user preferences
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Current user
    currentUser,
    currentRoom,

    // User lists (grouped by status)
    onlineUsers,
    idleUsers,
    awayUsers: [...awayUsers, ...dndUsers], // Combine for display
    offlineUsers,

    // Breakout rooms
    breakoutRooms,

    // Actions
    updateMyStatus,
    updateMyStatusMessage,
    joinRoom,
    leaveRoom,
    requestRoomInvite,
    createRoom,

    // Settings
    idleTimeoutMs,
    updateIdleTimeout,
  };
}

export default usePeoplePanel;
