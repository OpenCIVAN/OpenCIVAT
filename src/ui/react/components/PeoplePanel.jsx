import React, { useState, useEffect } from 'react';
import { presenceSystem } from '../../../collaboration/presenceSystem.js';
import { voiceChat } from '../../../collaboration/voiceChat.js';

export function PeoplePanel() {
  const [users, setUsers] = useState([]);
  const [isConnectedToVoice, setIsConnectedToVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Update user list from presence system
  useEffect(() => {
    const cleanup = presenceSystem.onPresenceChange((onlineUsers) => {
      console.log('👥 People panel updating with', onlineUsers.length, 'users');
      setUsers(onlineUsers);
    });

    return cleanup;
  }, []);

  // Update voice status
  useEffect(() => {
    const updateVoiceStatus = () => {
      setIsConnectedToVoice(voiceChat.isConnected);
      setIsMuted(voiceChat.isMuted);
    };

    // Poll for voice status
    const interval = setInterval(updateVoiceStatus, 500);
    updateVoiceStatus();

    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = () => {
    voiceChat.toggleMute();
    setIsMuted(voiceChat.isMuted);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'idle': return '🟡';
      case 'away': return '⚫';
      default: return '👤';
    }
  };

  return (
    <div style={{
      padding: '10px',
      backgroundColor: '#2a2a2a',
      borderRadius: '6px',
      marginBottom: '10px',
      border: '1px solid #333'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid #444'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: '600',
          textTransform: 'uppercase',
          color: '#e0e0e0'
        }}>
          👥 Online ({users.length})
        </h4>
      </div>

      {/* Voice Status */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '10px',
        padding: '6px',
        backgroundColor: isConnectedToVoice ? 'rgba(76, 175, 80, 0.15)' : '#1a1a1a',
        borderRadius: '3px',
        fontSize: '12px',
        border: '1px solid #333'
      }}>
        <span style={{ flex: 1, color: isConnectedToVoice ? '#81C784' : '#999' }}>
          {isConnectedToVoice ? (isMuted ? '🔇 Muted' : '🎤 In voice') : 'Not in voice'}
        </span>
        {isConnectedToVoice && (
          <button
            onClick={handleToggleMute}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '500',
              backgroundColor: isMuted ? '#f44336' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>

      {/* User List */}
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {users.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '20px',
            fontSize: '12px'
          }}>
            No users online
          </div>
        ) : (
          users.map(user => (
            <div
              key={user.clientId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                marginBottom: '4px',
                backgroundColor: user.isYou ? 'rgba(76, 175, 80, 0.15)' : '#1a1a1a',
                borderLeft: `3px solid ${user.userColor}`,
                borderRadius: '3px',
                fontSize: '13px',
                border: '1px solid #333'
              }}
            >
              <span style={{ fontSize: '14px' }}>{getStatusIcon(user.status)}</span>
              <span style={{ flex: 1, color: '#e0e0e0' }}>{user.userName}</span>
              {user.isYou && (
                <span style={{
                  color: '#81C784',
                  fontSize: '10px',
                  fontWeight: '500'
                }}>
                  (You)
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}