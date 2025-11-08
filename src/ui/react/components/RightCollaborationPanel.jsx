import React from 'react';
import { PeoplePanel } from './PeoplePanel.jsx';
import { VoiceChatPanel } from './VoiceChatPanel.jsx';
import { TextChatPanel } from './TextChatPanel.jsx';

export function RightCollaborationPanel({ roomName }) {
  return (
    <div style={{
      width: '300px',
      backgroundColor: '#242424',
      borderLeft: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {/* Section Header */}
      <div style={{
        padding: '15px',
        borderBottom: '1px solid #333',
        fontSize: '13px',
        fontWeight: '600',
        textTransform: 'uppercase',
        color: '#4CAF50',
        letterSpacing: '0.5px'
      }}>
        Collaboration
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px'
      }}>
        <PeoplePanel />
        <VoiceChatPanel roomName={roomName} />
        <TextChatPanel />
      </div>
    </div>
  );
}