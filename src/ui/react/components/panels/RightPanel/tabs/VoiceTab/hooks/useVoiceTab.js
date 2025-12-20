/**
 * @file useVoiceTab.js
 * @description Logic hook for VoiceTab component.
 * Handles LiveKit integration, voice state, and keyboard shortcuts.
 *
 * @example
 * const {
 *   connectionState,
 *   isConnected,
 *   muted,
 *   participants,
 *   handleJoin,
 *   handleToggleMute,
 * } = useVoiceTab({ channels });
 */

import { useState, useEffect, useCallback } from "react";
import {
  voiceRoomService,
  VoiceConnectionState,
} from "@Services/voice/voiceRoomService.js";
import { getUserName } from "@Collaboration/presence/userManagement.js";
import { toast } from "@UI/react/store/toastStore.js";

/**
 * Default voice channels
 */
export const DEFAULT_CHANNELS = [
  { id: "main", name: "Main Room", participants: 0 },
  { id: "breakout-1", name: "Breakout 1", participants: 0 },
  { id: "breakout-2", name: "Breakout 2", participants: 0 },
  { id: "breakout-3", name: "Breakout 3", participants: 0 },
];

/**
 * Hook for VoiceTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {Array} [options.channels] - Available channels
 * @returns {Object} Voice state and handlers
 */
export function useVoiceTab(options = {}) {
  const { channels: propChannels } = options;

  // Use provided channels or default
  const channels = propChannels?.length > 0 ? propChannels : DEFAULT_CHANNELS;

  // Voice state from service
  const [connectionState, setConnectionState] = useState(
    voiceRoomService.getConnectionState()
  );
  const [muted, setMuted] = useState(voiceRoomService.isMuted);
  const [deafened, setDeafened] = useState(voiceRoomService.isDeafened);
  const [currentChannel, setCurrentChannel] = useState(
    voiceRoomService.getCurrentRoom() || channels[0]?.id
  );
  const [participants, setParticipants] = useState([]);

  const isConnected = connectionState === VoiceConnectionState.CONNECTED;

  // Subscribe to voice service events
  useEffect(() => {
    // Initialize service
    voiceRoomService.initialize();

    // Subscribe to connection changes
    const unsubConnection = voiceRoomService.onConnectionChange((state) => {
      setConnectionState(state);
      if (state === VoiceConnectionState.CONNECTED) {
        setCurrentChannel(voiceRoomService.getCurrentRoom());
      }
    });

    // Subscribe to participant updates
    const unsubParticipant = voiceRoomService.onParticipantUpdate(() => {
      setParticipants(voiceRoomService.getParticipants());
    });

    // Subscribe to participant joined/left
    const unsubJoined = voiceRoomService.onParticipantJoined(() => {
      setParticipants(voiceRoomService.getParticipants());
    });

    const unsubLeft = voiceRoomService.onParticipantLeft(() => {
      setParticipants(voiceRoomService.getParticipants());
    });

    // Subscribe to errors
    const unsubError = voiceRoomService.onError((error) => {
      toast.error(`Voice error: ${error.message}`);
    });

    // Sync initial state
    setParticipants(voiceRoomService.getParticipants());

    return () => {
      unsubConnection();
      unsubParticipant();
      unsubJoined();
      unsubLeft();
      unsubError();
    };
  }, []);

  // Keyboard shortcut for mute (M key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === "m" || e.key === "M") &&
        !e.target.matches("input, textarea")
      ) {
        if (connectionState === VoiceConnectionState.CONNECTED) {
          e.preventDefault();
          handleToggleMute();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [connectionState]);

  // Handlers
  const handleJoin = useCallback(async () => {
    try {
      const userName = getUserName();
      const roomId = currentChannel || channels[0]?.id || "main";
      await voiceRoomService.joinRoom(roomId, userName);
      setMuted(voiceRoomService.isMuted);
      toast.success(
        `Joined ${channels.find((c) => c.id === roomId)?.name || roomId}`
      );
    } catch (error) {
      toast.error("Failed to join voice. Make sure LiveKit is running.");
    }
  }, [currentChannel, channels]);

  const handleLeave = useCallback(async () => {
    await voiceRoomService.leaveRoom();
    setParticipants([]);
  }, []);

  const handleToggleMute = useCallback(async () => {
    const newMuted = await voiceRoomService.toggleMute();
    setMuted(newMuted);
  }, []);

  const handleToggleDeafen = useCallback(() => {
    const newDeafened = voiceRoomService.toggleDeafen();
    setDeafened(newDeafened);
  }, []);

  const handleChannelSelect = useCallback(
    async (channelId) => {
      setCurrentChannel(channelId);

      // If already connected, switch rooms
      if (connectionState === VoiceConnectionState.CONNECTED) {
        try {
          const userName = getUserName();
          await voiceRoomService.joinRoom(channelId, userName);
          toast.success(
            `Switched to ${
              channels.find((c) => c.id === channelId)?.name || channelId
            }`
          );
        } catch (error) {
          toast.error("Failed to switch rooms");
        }
      }
    },
    [connectionState, channels]
  );

  const handleAdjustVolume = useCallback((participantId) => {
    // TODO: Open volume slider for this participant
    console.log("Adjust volume for:", participantId);
  }, []);

  return {
    // Data
    channels,

    // Connection state
    connectionState,
    isConnected,
    muted,
    deafened,
    currentChannel,
    participants,

    // Handlers
    handleJoin,
    handleLeave,
    handleToggleMute,
    handleToggleDeafen,
    handleChannelSelect,
    handleAdjustVolume,
  };
}

export default useVoiceTab;
