// ----------------------------------------------------------------------------
// Voice Chat System (LiveKit-based)
// ----------------------------------------------------------------------------

import { Room } from "livekit-client";

class VoiceChat {
  constructor() {
    this.room = null;
    this.isConnected = false;
    this.isMuted = false;
  }

  async getDevToken(roomName, userName) {
    // Use HTTP not HTTPS for local token server
    const TOKEN_SERVER = "http://localhost:3001";

    console.log("   Fetching token from:", TOKEN_SERVER);

    try {
      const response = await fetch(`${TOKEN_SERVER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, userName }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("   ✅ Token received");
        console.log("🐛 DEBUG data:", data);
        console.log("🐛 DEBUG data.token:", data.token);
        console.log("🐛 DEBUG typeof data.token:", typeof data.token);
        return data.token;
      } else {
        console.error("   ❌ Token server error:", response.status);
      }
    } catch (error) {
      console.error("   ❌ Token server not reachable:", error.message);
    }

    throw new Error("Could not get token from server");
  }

  async connect(roomName, userName) {
    try {
      console.log("🔌 Connecting to voice chat...");

      const token = await this.getDevToken(roomName, userName);

      this.room = new Room();
      this.setupEventListeners();

      // Use local LiveKit server
      const LIVEKIT_URL = "ws://localhost:7880";

      // DEBUG: Log token to verify it's a string, not an object
      console.log("🐛 DEBUG: Token type:", typeof token);
      console.log("🐛 DEBUG: Token value:", token);
      console.log("🐛 DEBUG: Token is string?", typeof token === "string");

      await this.room.connect(LIVEKIT_URL, token);

      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.isMuted = false;

      this.isConnected = true;
      console.log("✅ Voice chat connected!");
    } catch (error) {
      console.error("❌ Failed to connect:", error);
      this.isConnected = false;
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.room) return;

    this.room.on("participantConnected", (participant) => {
      console.log("👤 Participant joined:", participant.identity);
    });

    this.room.on("participantDisconnected", (participant) => {
      console.log("👋 Participant left:", participant.identity);
    });

    this.room.on("trackSubscribed", (track, publication, participant) => {
      if (track.kind === "audio") {
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        console.log("🔊 Audio track subscribed from:", participant.identity);
      }
    });
  }

  async toggleMute() {
    if (!this.room || !this.isConnected) {
      console.warn("Not connected to voice chat");
      return;
    }

    try {
      this.isMuted = !this.isMuted;
      await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
      console.log(`🎤 Microphone ${this.isMuted ? "muted" : "unmuted"}`);
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }

  disconnect() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
      this.isConnected = false;
      this.isMuted = false;
      console.log("Voice chat disconnected");
    }
  }
}

export const voiceChat = new VoiceChat();
