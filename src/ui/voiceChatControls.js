// ----------------------------------------------------------------------------
// Voice Chat Controls UI
// ----------------------------------------------------------------------------

import { voiceChat } from "../collaboration/voiceChat.js";
import { getUserName } from "../collaboration/userManagement.js";
import { logSuccess, logInfo, logWarning, logProgress } from "./logging.js";

let currentRoomName = null;

export function addVoiceChatControls(roomName) {
  currentRoomName = roomName;
  const controlTable = document.querySelector("table");

  if (!controlTable) {
    console.error('Control table not found');
    return;
  }

  // Voice Chat Header Row
  const headerRow = document.createElement("tr");
  const headerCell = document.createElement("td");
  const headerContainer = document.createElement("div");
  headerContainer.style.cssText = `
    background: #2196F3; 
    color: white; 
    padding: 8px; 
    border-radius: 4px; 
    font-weight: bold; 
    text-align: center;
    margin-top: 10px;
  `;
  headerContainer.textContent = "🎤 Voice Chat";
  headerCell.appendChild(headerContainer);
  headerRow.appendChild(headerCell);
  controlTable.appendChild(headerRow);

  // Join/Leave Button Row
  const joinRow = document.createElement("tr");
  const joinCell = document.createElement("td");
  
  const joinButton = document.createElement("button");
  joinButton.id = "voice-join-button";
  joinButton.textContent = "🎤 Join Voice Chat";
  joinButton.style.cssText = `
    width: 100%;
    background: #4CAF50; 
    color: white; 
    border: none; 
    padding: 12px; 
    border-radius: 4px; 
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: background 0.2s;
  `;
  
  joinButton.addEventListener("mouseover", () => {
    if (!voiceChat.isConnected) {
      joinButton.style.background = "#45a049";
    }
  });
  
  joinButton.addEventListener("mouseout", () => {
    if (!voiceChat.isConnected) {
      joinButton.style.background = "#4CAF50";
    } else {
      joinButton.style.background = "#f44336";
    }
  });

  joinButton.addEventListener("click", async () => {
    if (!voiceChat.isConnected) {
      // Join voice chat
      joinButton.disabled = true;
      joinButton.textContent = "Connecting...";
      joinButton.style.background = "#999";
      
      try {
        const userName = getUserName();
        logProgress(`Connecting to voice chat as ${userName}...`);
        await voiceChat.connect(currentRoomName, userName);
        
        joinButton.textContent = "🔇 Leave Voice Chat";
        joinButton.style.background = "#f44336";
        joinButton.disabled = false;
        
        logSuccess("✅ Voice chat connected!");
        
        // Show mute button
        const muteButton = document.getElementById("voice-mute-button");
        if (muteButton) {
          muteButton.style.display = "block";
        }
        
      } catch (error) {
        logWarning("Failed to connect to voice chat: " + error.message);
        joinButton.textContent = "🎤 Join Voice Chat (Retry)";
        joinButton.style.background = "#4CAF50";
        joinButton.disabled = false;
      }
    } else {
      // Leave voice chat
      voiceChat.disconnect();
      joinButton.textContent = "🎤 Join Voice Chat";
      joinButton.style.background = "#4CAF50";
      
      // Hide mute button
      const muteButton = document.getElementById("voice-mute-button");
      if (muteButton) {
        muteButton.style.display = "none";
      }
      
      logInfo("Left voice chat");
    }
  });

  joinCell.appendChild(joinButton);
  joinRow.appendChild(joinCell);
  controlTable.appendChild(joinRow);

  // Connection Status Row
  const statusRow = document.createElement("tr");
  const statusCell = document.createElement("td");
  const statusContainer = document.createElement("div");
  statusContainer.style.cssText = `
    display: flex; 
    gap: 8px; 
    align-items: center; 
    padding: 6px;
    background: #f5f5f5;
    border-radius: 4px;
  `;

  const statusIndicator = document.createElement("div");
  statusIndicator.id = "voice-status-indicator";
  statusIndicator.style.cssText = `
    width: 12px; 
    height: 12px; 
    border-radius: 50%;
    background: #999;
    transition: background 0.3s, box-shadow 0.3s;
  `;

  const statusText = document.createElement("span");
  statusText.id = "voice-status-text";
  statusText.style.cssText = "font-size: 12px; color: #666; font-weight: 500;";
  statusText.textContent = 'Not connected';

  statusContainer.appendChild(statusIndicator);
  statusContainer.appendChild(statusText);
  statusCell.appendChild(statusContainer);
  statusRow.appendChild(statusCell);
  controlTable.appendChild(statusRow);

  // Mute/Unmute Button Row (hidden until connected)
  const muteRow = document.createElement("tr");
  const muteCell = document.createElement("td");
  const muteContainer = document.createElement("div");
  muteContainer.style.cssText = "display: flex; gap: 8px; align-items: center;";

  const muteButton = document.createElement("button");
  muteButton.id = "voice-mute-button";
  muteButton.textContent = '🔇 Mute';
  muteButton.style.cssText = `
    flex: 1; 
    background: #f44336; 
    color: white; 
    border: none; 
    padding: 8px; 
    border-radius: 4px; 
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: none;
  `;

  muteButton.addEventListener("click", async () => {
    if (!voiceChat.isConnected) {
      logWarning("Voice chat not connected");
      return;
    }

    try {
      const isMuted = await voiceChat.toggleMute();
      muteButton.textContent = isMuted ? '🎤 Unmute' : '🔇 Mute';
      muteButton.style.background = isMuted ? '#4CAF50' : '#f44336';
      logInfo(isMuted ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error) {
      logWarning('Failed to toggle mute: ' + error.message);
    }
  });

  // Keyboard shortcut hint
  const shortcutHint = document.createElement("span");
  shortcutHint.style.cssText = "font-size: 11px; color: #666;";
  shortcutHint.textContent = "Press M";

  muteContainer.appendChild(muteButton);
  muteContainer.appendChild(shortcutHint);
  muteCell.appendChild(muteContainer);
  muteRow.appendChild(muteCell);
  controlTable.appendChild(muteRow);

  // Voice Participants List Row
  const participantsRow = document.createElement("tr");
  const participantsCell = document.createElement("td");
  const participantsContainer = document.createElement("div");
  participantsContainer.style.cssText = `
    background: #f5f5f5; 
    padding: 8px; 
    border-radius: 4px;
    font-size: 11px; 
    max-height: 80px; 
    overflow-y: auto; 
    border: 1px solid #ddd;
  `;

  const participantsTitle = document.createElement("div");
  participantsTitle.textContent = "In Voice Chat:";
  participantsTitle.style.cssText = "font-weight: bold; margin-bottom: 4px;";

  const participantsList = document.createElement("div");
  participantsList.id = "voice-participants-list";
  participantsList.textContent = "Not connected";
  participantsList.style.cssText = "color: #999; font-style: italic;";

  participantsContainer.appendChild(participantsTitle);
  participantsContainer.appendChild(participantsList);
  participantsCell.appendChild(participantsContainer);
  participantsRow.appendChild(participantsCell);
  controlTable.appendChild(participantsRow);

  // Add keyboard shortcut
  document.addEventListener("keydown", (e) => {
    if (e.key === 'm' || e.key === 'M') {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (voiceChat.isConnected) {
          muteButton.click();
        }
      }
    }
  });

  // Update status periodically
  setInterval(() => {
    updateVoiceStatus();
  }, 500);

  logSuccess("Voice chat controls added");
}

function updateVoiceStatus() {
  const statusIndicator = document.getElementById("voice-status-indicator");
  const statusText = document.getElementById("voice-status-text");
  
  if (statusIndicator && statusText) {
    const isConnected = voiceChat.isConnected;
    statusIndicator.style.background = isConnected ? '#4CAF50' : '#999';
    statusIndicator.style.boxShadow = isConnected ? `0 0 8px #4CAF50` : 'none';
    statusText.textContent = isConnected ? 'Connected' : 'Not connected';
    statusText.style.color = isConnected ? '#333' : '#666';
  }

  const participantsListDiv = document.getElementById("voice-participants-list");
  if (!participantsListDiv) return;

  if (!voiceChat.isConnected) {
    participantsListDiv.innerHTML = "";
    participantsListDiv.textContent = "Not connected";
    participantsListDiv.style.color = "#999";
    participantsListDiv.style.fontStyle = "italic";
    return;
  }

  const participants = voiceChat.getParticipants();

  participantsListDiv.innerHTML = "";
  participantsListDiv.style.fontStyle = "normal";

  // Add local user
  const localItem = document.createElement("div");
  localItem.style.cssText = `
    display: flex; 
    align-items: center; 
    gap: 6px;
    margin-bottom: 2px; 
    padding: 2px 4px;
    border-radius: 3px; 
    background: rgba(33, 150, 243, 0.1);
  `;

  const localIndicator = document.createElement("div");
  localIndicator.style.cssText = `
    width: 8px; 
    height: 8px; 
    border-radius: 50%;
    background: ${voiceChat.isMuted ? '#999' : '#4CAF50'};
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  `;

  const localName = document.createElement("span");
  localName.textContent = "You" + (voiceChat.isMuted ? " (muted)" : "");
  localName.style.cssText = "color: #333; font-weight: 500;";

  localItem.appendChild(localIndicator);
  localItem.appendChild(localName);
  participantsListDiv.appendChild(localItem);

  // Add remote participants
  participants.forEach((participant) => {
    const participantItem = document.createElement("div");
    participantItem.style.cssText = `
      display: flex; 
      align-items: center; 
      gap: 6px;
      margin-bottom: 2px; 
      padding: 2px 4px;
      border-radius: 3px; 
      background: rgba(0,0,0,0.05);
    `;

    const participantIndicator = document.createElement("div");
    participantIndicator.style.cssText = `
      width: 8px; 
      height: 8px; 
      border-radius: 50%;
      background: #4CAF50;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;

    const participantName = document.createElement("span");
    participantName.textContent = participant.identity;
    participantName.style.cssText = "color: #333;";

    participantItem.appendChild(participantIndicator);
    participantItem.appendChild(participantName);
    participantsListDiv.appendChild(participantItem);
  });

  if (participants.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.textContent = "No other participants";
    emptyMessage.style.cssText = "color: #999; font-style: italic; margin-top: 4px;";
    participantsListDiv.appendChild(emptyMessage);
  }
}