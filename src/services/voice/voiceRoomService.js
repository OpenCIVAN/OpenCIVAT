// src/services/voice/voiceRoomService.js
// Enhanced Voice Room Service with multi-room support
//
// This is the production-ready voice room service that handles:
// - Multiple rooms (main room, breakout rooms)
// - Participant tracking with speaking indicators
// - Mute/deafen controls
// - Connection state management
// - Event-driven architecture for React integration
//
// Usage:
//   import { voiceRoomService } from '@Services/voice/voiceRoomService.js';
//   await voiceRoomService.initialize();
//   await voiceRoomService.joinRoom('main-room');
//   voiceRoomService.onParticipantUpdate(callback);

import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import { ws as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import { authService } from "@Services/authService.js";
import {
  getDefaultMockUser,
  getMockUser,
  getStoredMockUserId,
} from "@Config/mockUsers.js";

/**
 * Connection status enum
 */
export const VoiceConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
};

/**
 * Voice Room Service
 *
 * Manages LiveKit voice rooms with full participant tracking and state management.
 */
class VoiceRoomService {
  constructor() {
    // LiveKit room instance
    this.room = null;

    // Current state
    this.connectionState = VoiceConnectionState.DISCONNECTED;
    this.currentRoomName = null;
    this.isMuted = false;
    this.isDeafened = false;
    this._isInitialized = false;
    this._initializePromise = null;
    this._joinPromise = null;
    this._joinRoomName = null;
    this._leavePromise = null;

    // Participants (including self)
    this.participants = new Map();

    // Event listeners
    this._listeners = {
      connectionChange: new Set(),
      localStateChange: new Set(),
      participantUpdate: new Set(),
      participantJoined: new Set(),
      participantLeft: new Set(),
      activeSpeakerChange: new Set(),
      error: new Set(),
    };

    // Auto-detect same-origin proxy URLs on HTTPS to avoid mixed content.
    const voiceUrls = this._resolveVoiceUrls();

    this.config = {
      tokenServerUrl: voiceUrls.tokenServerUrl,
      livekitUrl: voiceUrls.livekitUrl,
      autoMuteOnJoin: false,
      reconnectAttempts: 3,
    };

    // Audio elements for remote participants
    this._audioElements = new Map();
  }

  _resolveVoiceUrls() {
    const configuredLiveKitUrl = config.liveKitUrl || "ws://localhost:7880";
    const configuredTokenUrl =
      config.liveKitTokenUrl || "http://localhost:3002";

    if (typeof window === "undefined" || window.location.protocol !== "https:") {
      return {
        livekitUrl: configuredLiveKitUrl,
        tokenServerUrl: configuredTokenUrl,
      };
    }

    const isLocalLiveKit =
      configuredLiveKitUrl === "ws://localhost:7880" ||
      configuredLiveKitUrl === "ws://127.0.0.1:7880";
    const isLocalToken =
      configuredTokenUrl === "http://localhost:3002" ||
      configuredTokenUrl === "http://127.0.0.1:3002";

    const wsOrigin = window.location.origin.replace(/^http/, "ws");

    return {
      livekitUrl: isLocalLiveKit ? wsOrigin : configuredLiveKitUrl,
      tokenServerUrl: isLocalToken ? "/voice-token" : configuredTokenUrl,
    };
  }

  /**
   * Initialize the voice room service
   * @returns {Promise<boolean>}
   */
  async initialize() {
    if (this._isInitialized) {
      return true;
    }

    if (this._initializePromise) {
      return this._initializePromise;
    }

    this._initializePromise = this._initialize();
    try {
      return await this._initializePromise;
    } finally {
      this._initializePromise = null;
    }
  }

  async _initialize() {
    log.debug("VoiceRoomService initializing...");

    // Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      log.error("Browser does not support getUserMedia");
      return false;
    }

    // Pre-check microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Release immediately
      log.debug("Microphone permission granted");
    } catch (error) {
      log.warn("Microphone permission not granted:", error.message);
      // Don't fail - we'll request again when joining
    }

    log.info("VoiceRoomService initialized");
    this._isInitialized = true;
    return true;
  }

  /**
   * Get a token from the token server
   * @param {string} roomName - Room to join
   * @param {string} userName - User's display name
   * @returns {Promise<string>} JWT token
   */
  async getToken(roomName, userName) {
    log.debug(`Fetching token for room: ${roomName}, user: ${userName}`);

    const authToken = await authService.getAccessToken();
    const headers = { "Content-Type": "application/json" };
    const participantIdentity = this._getParticipantIdentity(
      this._getVoiceUserId(authToken)
    );

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    headers["x-voice-participant-id"] = participantIdentity;

    if (this._isDevBypass()) {
      Object.assign(headers, this._getDevUserHeaders(userName));
    }

    const response = await fetch(`${this.config.tokenServerUrl}/token`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        roomName,
        userName,
        participantIdentity,
        ...this._getDevUserBody(userName),
      }),
    });

    if (!response.ok) {
      throw new Error(`Token server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.token) {
      throw new Error("No token in response");
    }

    if (data.identity) {
      log.debug("Received LiveKit identity:", data.identity);
    }

    return data.token;
  }

  _isDevBypass() {
    return config.devBypassAuth === true || config.devBypassAuth === "true";
  }

  _getDevUser() {
    const storedId = getStoredMockUserId();
    return storedId ? getMockUser(storedId) || getDefaultMockUser() : getDefaultMockUser();
  }

  _getVoiceUserId(authToken = null) {
    if (this._isDevBypass()) {
      return this._getDevUser().id;
    }
    const authUser = authService.getUser?.();
    return (
      authUser?.id ||
      authUser?.sub ||
      authUser?.externalId ||
      this._getUserIdFromToken(authToken) ||
      "voice-user"
    );
  }

  _getUserIdFromToken(token) {
    if (!token || typeof atob === "undefined") return null;
    try {
      const [, payload] = token.split(".");
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "="
      );
      const decoded = JSON.parse(atob(padded));
      return decoded.sub || null;
    } catch (error) {
      log.warn("Unable to read voice user id from token:", error.message);
      return null;
    }
  }

  _getDevUserHeaders(fallbackName) {
    const user = this._getDevUser();
    const participantIdentity = this._getParticipantIdentity(user.id);
    return {
      "x-user-id": user.id,
      "x-user-email": user.email,
      "x-user-name": user.name || fallbackName || "CIA Admin",
      "x-voice-participant-id": participantIdentity,
    };
  }

  _getDevUserBody(fallbackName) {
    if (!this._isDevBypass()) return {};
    const user = this._getDevUser();
    const participantIdentity = this._getParticipantIdentity(user.id);
    return {
      userId: user.id,
      userEmail: user.email,
      userName: user.name || fallbackName || "CIA Admin",
      participantIdentity,
    };
  }

  _getParticipantIdentity(userId) {
    const baseUserId = userId || "voice-user";
    return `${baseUserId}:${this._getVoiceClientId()}`;
  }

  _getVoiceClientId() {
    if (this._voiceClientId) return this._voiceClientId;

    const storageKey = "cia:voice-client-id";
    let clientId = null;

    try {
      clientId = window.sessionStorage?.getItem(storageKey);
      if (!clientId) {
        clientId = this._createClientId();
        window.sessionStorage?.setItem(storageKey, clientId);
      }
    } catch (error) {
      log.warn("Unable to persist voice client id:", error.message);
      clientId = this._createClientId();
    }

    this._voiceClientId = clientId;
    return clientId;
  }

  _createClientId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Join a voice room
   * @param {string} roomName - Room name to join
   * @param {string} userName - User's display name
   * @returns {Promise<void>}
   */
  async joinRoom(roomName, userName) {
    if (this._leavePromise) {
      await this._leavePromise.catch(() => {});
    }

    if (this._joinPromise) {
      if (this._joinRoomName === roomName) {
        return this._joinPromise;
      }
      await this._joinPromise.catch(() => {});
    }

    this._joinRoomName = roomName;
    this._joinPromise = this._joinRoom(roomName, userName);
    try {
      return await this._joinPromise;
    } finally {
      this._joinPromise = null;
      this._joinRoomName = null;
    }
  }

  async _joinRoom(roomName, userName) {
    if (this.connectionState === VoiceConnectionState.CONNECTED) {
      if (this.currentRoomName === roomName) {
        log.debug("Already in this room");
        return;
      }
      // Leave current room first
      await this._leaveRoom({ waitForJoin: false });
    }

    this._setConnectionState(VoiceConnectionState.CONNECTING);

    try {
      // Get token
      const token = await this.getToken(roomName, userName);

      // Create room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Audio quality settings
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Set up event listeners before connecting
      this._setupRoomEventListeners();

      // Connect to room
      await this.room.connect(this.config.livekitUrl, token);

      this.currentRoomName = roomName;
      this._setConnectionState(VoiceConnectionState.CONNECTED);

      // Enable microphone (starts muted if configured)
      if (this.config.autoMuteOnJoin) {
        await this.room.localParticipant.setMicrophoneEnabled(false);
        this.isMuted = true;
      } else {
        await this.room.localParticipant.setMicrophoneEnabled(true);
        this.isMuted = false;
      }
      this._emitLocalStateChange();

      // Add self to participants
      this._updateParticipant(this.room.localParticipant, true);

      // Add existing remote participants.
      this._getRemoteParticipants().forEach((participant) => {
        this._updateParticipant(participant, false);
      });

      log.info(`Joined voice room: ${roomName}`);

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent("cia:voice-room-joined", {
          detail: { roomName, participantCount: this.participants.size },
        })
      );
    } catch (error) {
      log.error("Failed to join room:", error);
      await this._cleanupFailedJoin();
      this._setConnectionState(VoiceConnectionState.ERROR);
      this._emit("error", error);
      throw error;
    }
  }

  /**
   * Leave the current voice room
   */
  async leaveRoom() {
    if (this._leavePromise) {
      return this._leavePromise;
    }

    this._leavePromise = this._leaveRoom();
    try {
      return await this._leavePromise;
    } finally {
      this._leavePromise = null;
    }
  }

  async _leaveRoom({ waitForJoin = true } = {}) {
    if (waitForJoin && this._joinPromise) {
      await this._joinPromise.catch(() => {});
    }

    if (!this.room) return;

    log.debug("Leaving voice room...");

    // Clean up audio elements
    this._audioElements.forEach((el, id) => {
      el.remove();
    });
    this._audioElements.clear();

    // Disconnect
    await this.room.disconnect();
    this.room = null;

    // Clear state
    this.participants.clear();
    this.currentRoomName = null;
    this.isMuted = true;
    this.isDeafened = false;
    this._emitLocalStateChange();

    this._setConnectionState(VoiceConnectionState.DISCONNECTED);

    log.info("Left voice room");

    // Dispatch event
    window.dispatchEvent(new CustomEvent("cia:voice-room-left"));
  }

  /**
   * Toggle microphone mute
   * @returns {boolean} New mute state
   */
  async toggleMute() {
    if (!this.room || this.connectionState !== VoiceConnectionState.CONNECTED) {
      log.warn("Cannot toggle mute: not connected");
      return this.isMuted;
    }

    this.isMuted = !this.isMuted;
    await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);

    // Update self in participants
    this._updateParticipant(this.room.localParticipant, true);

    log.debug(`Microphone ${this.isMuted ? "muted" : "unmuted"}`);
    this._emitLocalStateChange();
    return this.isMuted;
  }

  /**
   * Set mute state explicitly
   * @param {boolean} muted - Mute state
   */
  async setMuted(muted) {
    if (this.isMuted === muted) return this.isMuted;
    await this.toggleMute();
    return this.isMuted;
  }

  /**
   * Toggle deafen (mute all incoming audio)
   * @returns {boolean} New deafen state
   */
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;

    // Mute/unmute all audio elements
    this._audioElements.forEach((el) => {
      el.muted = this.isDeafened;
    });

    log.debug(`Audio ${this.isDeafened ? "deafened" : "undeafened"}`);
    this._emitLocalStateChange();
    return this.isDeafened;
  }

  /**
   * Set participant volume
   * @param {string} participantId - Participant ID
   * @param {number} volume - Volume level (0-1)
   */
  setParticipantVolume(participantId, volume) {
    const audioEl = this._audioElements.get(participantId);
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  /**
   * Set up LiveKit room event listeners
   * @private
   */
  _setupRoomEventListeners() {
    if (!this.room) return;

    // Connection state changes
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      log.debug("Connection state changed:", state);
      switch (state) {
        case ConnectionState.Connected:
          this._setConnectionState(VoiceConnectionState.CONNECTED);
          break;
        case ConnectionState.Reconnecting:
          this._setConnectionState(VoiceConnectionState.RECONNECTING);
          break;
        case ConnectionState.Disconnected:
          this._setConnectionState(VoiceConnectionState.DISCONNECTED);
          break;
      }
    });

    // Participant joined
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      log.debug("Participant joined:", participant.identity);
      this._updateParticipant(participant, false);
      this._emit(
        "participantJoined",
        this._formatParticipant(participant, false)
      );
    });

    // Participant left
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      log.debug("Participant left:", participant.identity);
      this.participants.delete(participant.sid);
      this._cleanupParticipantAudio(participant.sid);
      this._emit("participantLeft", {
        id: participant.sid,
        name: participant.identity,
      });
    });

    // Track subscribed (audio from remote participant)
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          this._attachAudioTrack(track, participant);
        }
      }
    );

    // Track unsubscribed
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          this._cleanupParticipantAudio(participant.sid);
        }
      }
    );

    // Active speakers changed
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerIds = speakers.map((s) => s.sid);

      // Update all participants' speaking state
      this.participants.forEach((p, id) => {
        const wasSpeaking = p.isSpeaking;
        p.isSpeaking = speakerIds.includes(id);
        if (wasSpeaking !== p.isSpeaking) {
          this._emit("participantUpdate", p);
        }
      });

      this._emit("activeSpeakerChange", speakerIds);
    });

    // Mute state changed
    this.room.on(RoomEvent.TrackMuted, (publication, participant) => {
      this._updateParticipant(
        participant,
        participant === this.room.localParticipant
      );
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      this._updateParticipant(
        participant,
        participant === this.room.localParticipant
      );
    });
  }

  _getRemoteParticipants() {
    if (!this.room) return [];

    if (this.room.remoteParticipants instanceof Map) {
      return Array.from(this.room.remoteParticipants.values());
    }

    if (this.room.participants instanceof Map) {
      return Array.from(this.room.participants.values());
    }

    if (this.room.participants && typeof this.room.participants === "object") {
      return Object.values(this.room.participants);
    }

    return [];
  }

  async _cleanupFailedJoin() {
    if (!this.room) return;

    try {
      await this.room.disconnect();
    } catch (disconnectError) {
      log.warn("Failed to clean up voice room after join error:", disconnectError.message);
    }

    this.room = null;
    this.currentRoomName = null;
    this.participants.clear();
  }

  /**
   * Attach audio track to DOM
   * @private
   */
  _attachAudioTrack(track, participant) {
    const audioElement = track.attach();
    audioElement.id = `voice-audio-${participant.sid}`;
    audioElement.muted = this.isDeafened;
    document.body.appendChild(audioElement);
    this._audioElements.set(participant.sid, audioElement);
    log.debug(`Attached audio for: ${participant.identity}`);
  }

  /**
   * Clean up participant audio element
   * @private
   */
  _cleanupParticipantAudio(participantId) {
    const el = this._audioElements.get(participantId);
    if (el) {
      el.remove();
      this._audioElements.delete(participantId);
    }
  }

  // =========================================================================
  // Participant Management
  // =========================================================================

  /**
   * Update participant in the map
   * @private
   */
  _updateParticipant(participant, isLocal) {
    const formatted = this._formatParticipant(participant, isLocal);
    this.participants.set(participant.sid, formatted);
    this._emit("participantUpdate", formatted);
  }

  /**
   * Format participant for external use
   * @private
   */
  _formatParticipant(participant, isLocal) {
    return {
      id: participant.sid,
      identity: participant.identity,
      name: participant.name || participant.identity,
      isLocal,
      isMuted: !participant.isMicrophoneEnabled,
      isSpeaking: participant.isSpeaking || false,
      // Add color based on identity hash for consistency
      color: this._getParticipantColor(participant.identity),
    };
  }

  /**
   * Generate consistent color for participant
   * @private
   */
  _getParticipantColor(identity) {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#FF9800",
      "#E91E63",
      "#9C27B0",
      "#00BCD4",
    ];
    let hash = 0;
    for (let i = 0; i < identity.length; i++) {
      hash = identity.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Get all participants
   * @returns {Array} Participant list
   */
  getParticipants() {
    return Array.from(this.participants.values());
  }

  // =========================================================================
  // Event Emitter
  // =========================================================================

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback) {
    this._listeners.connectionChange.add(callback);
    return () => this._listeners.connectionChange.delete(callback);
  }

  /**
   * Subscribe to local mute/deafen state changes
   */
  onLocalStateChange(callback) {
    this._listeners.localStateChange.add(callback);
    return () => this._listeners.localStateChange.delete(callback);
  }

  /**
   * Subscribe to participant updates
   */
  onParticipantUpdate(callback) {
    this._listeners.participantUpdate.add(callback);
    return () => this._listeners.participantUpdate.delete(callback);
  }

  /**
   * Subscribe to participant joined events
   */
  onParticipantJoined(callback) {
    this._listeners.participantJoined.add(callback);
    return () => this._listeners.participantJoined.delete(callback);
  }

  /**
   * Subscribe to participant left events
   */
  onParticipantLeft(callback) {
    this._listeners.participantLeft.add(callback);
    return () => this._listeners.participantLeft.delete(callback);
  }

  /**
   * Subscribe to active speaker changes
   */
  onActiveSpeakerChange(callback) {
    this._listeners.activeSpeakerChange.add(callback);
    return () => this._listeners.activeSpeakerChange.delete(callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback) {
    this._listeners.error.add(callback);
    return () => this._listeners.error.delete(callback);
  }

  _emit(event, data) {
    this._listeners[event]?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        log.error(`Error in ${event} listener:`, e);
      }
    });
  }

  _setConnectionState(state) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this._emit("connectionChange", state);
    }
  }

  _emitLocalStateChange() {
    this._emit("localStateChange", {
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
    });
  }

  // =========================================================================
  // Status
  // =========================================================================

  isConnected() {
    return this.connectionState === VoiceConnectionState.CONNECTED;
  }

  getCurrentRoom() {
    return this.currentRoomName;
  }

  getConnectionState() {
    return this.connectionState;
  }
}

// Singleton instance
export const voiceRoomService = new VoiceRoomService();
export default voiceRoomService;
