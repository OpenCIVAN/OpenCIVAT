import React, { useState, useEffect } from 'react';
import { voiceChat } from '../../../collaboration/voiceChat.js';
import { getUserName } from '../../../collaboration/userManagement.js';

export function VoiceChatPanel({ roomName = 'default-analytics-room' }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Poll voice status
  useEffect(() => {
    const updateStatus = () => {
      setIsConnected(voiceChat.isConnected);
      setIsMuted(voiceChat.isMuted);
    };

    // Initial update
    updateStatus();

    // Poll every second
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for mute (M key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not typing in an input
      if ((e.key === 'm' || e.key === 'M') && !e.target.matches('input, textarea')) {
        if (voiceChat.isConnected) {
          e.preventDefault();
          voiceChat.toggleMute();
          setIsMuted(voiceChat.isMuted);
          console.log('🎤 Mute toggled via keyboard (M)');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleVoice = async () => {
    if (!isConnected) {
      // Connect to voice chat
      try {
        setIsConnecting(true);

        const userName = getUserName();
        await voiceChat.connect(roomName, userName);

        setIsConnected(true);
        console.log('✅ Voice chat connected');
      } catch (error) {
        console.error('❌ Failed to join voice chat:', error);
        alert('Failed to connect to voice chat. Make sure LiveKit and token server are running.');
      } finally {
        setIsConnecting(false);
      }
    } else {
      // Disconnect from voice chat
      voiceChat.disconnect();
      setIsConnected(false);
      console.log('✅ Voice chat disconnected');
    }
  };

  const handleToggleMute = () => {
    voiceChat.toggleMute();
    setIsMuted(voiceChat.isMuted);
  };

  return (
    <div style={{
      padding: '10px',
      backgroundColor: '#2a2a2a',  // ← Changed
      borderRadius: '6px',
      marginBottom: '10px',
      border: '1px solid #333'  // ← Added
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid #444'  // ← Changed
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: '600',
          textTransform: 'uppercase',
          color: '#e0e0e0'  // ← Added
        }}>
          🎤 Voice Chat
        </h4>
      </div>

      {/* Connection Status */}
      <div style={{
        marginBottom: '10px',
        padding: '8px',
        backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.15)' : '#1a1a1a',  // ← Changed
        border: '1px solid #333',  // ← Added
        borderRadius: '3px',
        fontSize: '12px',
        textAlign: 'center',
        color: isConnected ? '#81C784' : '#999'  // ← Changed
      }}>
        {isConnecting ? (
          '🔄 Connecting...'
        ) : isConnected ? (
          isMuted ? '🔇 Connected (Muted)' : '🎤 Connected (Unmuted)'
        ) : (
          '⭕ Not connected'
        )}
      </div>

      {/* Connect/Disconnect Button */}
      <button
        onClick={handleToggleVoice}
        disabled={isConnecting}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '8px',
          backgroundColor: isConnected ? '#f44336' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          opacity: isConnecting ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
      >
        {isConnecting ? 'Connecting...' : isConnected ? 'Leave Voice Chat' : 'Join Voice Chat'}
      </button>

      {/* Mute/Unmute Button */}
      {isConnected && (
        <button
          onClick={handleToggleMute}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isMuted ? '#ff9800' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isMuted ? '🔇 Unmute (Press M)' : '🎤 Mute (Press M)'}
        </button>
      )}

      {/* Help text */}
      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
        {isConnected ? 'Press M to toggle mute' : 'Click to join voice chat'}
      </div>
    </div>
  );
}