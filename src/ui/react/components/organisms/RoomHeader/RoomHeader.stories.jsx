/**
 * @file RoomHeader.stories.jsx
 * @description Storybook stories for RoomHeader component
 */

import React, { useState } from 'react';
import { RoomHeader } from './RoomHeader';

export default {
    title: 'Organisms/RoomHeader',
    component: RoomHeader,
    parameters: {
        layout: 'fullscreen',
        backgrounds: { default: 'dark' },
    },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_ROOMS = [
    { id: 'r1', name: 'Lab Meeting', color: '#a855f7', usersOnline: 5 },
    { id: 'r2', name: 'Analysis Session', color: '#3b82f6', usersOnline: 2 },
    { id: 'r3', name: 'Personal', color: '#22c55e', usersOnline: 1 },
    { id: 'r4', name: 'Tumor Review', color: '#f59e0b', usersOnline: 3 },
    { id: 'r5', name: 'Research Group', color: '#ec4899', usersOnline: 8 },
];

// =============================================================================
// STORIES
// =============================================================================

/**
 * Default state - viewing room, not in voice
 */
export const Default = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState(null);
        const [isMuted, setIsMuted] = useState(false);

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onSwitchVoice={(roomId) => {
                        setVoiceRoomId(roomId);
                        setViewingRoomId(roomId);
                    }}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={3}
                    onOpenChat={() => console.log('Open chat')}
                    onCreateRoom={() => console.log('Create room')}
                />
            </div>
        );
    },
};

/**
 * In voice - viewing same room as voice
 */
export const InVoiceSameRoom = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState('r1');
        const [isMuted, setIsMuted] = useState(false);

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onSwitchVoice={(roomId) => {
                        setVoiceRoomId(roomId);
                        setViewingRoomId(roomId);
                    }}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={0}
                    onOpenChat={() => console.log('Open chat')}
                />
            </div>
        );
    },
};

/**
 * In voice - viewing different room than voice
 */
export const InVoiceDifferentRoom = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r2');
        const [voiceRoomId, setVoiceRoomId] = useState('r1');
        const [isMuted, setIsMuted] = useState(false);

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onSwitchVoice={(roomId) => {
                        setVoiceRoomId(roomId);
                        setViewingRoomId(roomId);
                    }}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={12}
                    onOpenChat={() => console.log('Open chat')}
                />
            </div>
        );
    },
};

/**
 * Muted state
 */
export const Muted = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState('r1');
        const [isMuted, setIsMuted] = useState(true);

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onSwitchVoice={(roomId) => {
                        setVoiceRoomId(roomId);
                        setViewingRoomId(roomId);
                    }}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={0}
                    onOpenChat={() => console.log('Open chat')}
                />
            </div>
        );
    },
};

/**
 * With overflow rooms (more than 3)
 */
export const WithOverflow = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState(null);

        return (
            <div style={{ background: '#0a0a0f' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onSwitchVoice={(roomId) => {
                        setVoiceRoomId(roomId);
                        setViewingRoomId(roomId);
                    }}
                    isMuted={false}
                    onToggleMute={() => {}}
                    unreadMessages={99}
                    onOpenChat={() => console.log('Open chat')}
                />
                <div style={{ padding: 16, color: '#666', fontSize: 12 }}>
                    Click "+2 more" to see overflow dropdown
                </div>
            </div>
        );
    },
};

/**
 * Interactive demo
 */
export const Interactive = {
    render: () => {
        const [viewingRoomId, setViewingRoomId] = useState('r1');
        const [voiceRoomId, setVoiceRoomId] = useState(null);
        const [isMuted, setIsMuted] = useState(false);
        const [unreadMessages, setUnreadMessages] = useState(5);

        return (
            <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
                <RoomHeader
                    rooms={MOCK_ROOMS}
                    viewingRoomId={viewingRoomId}
                    voiceRoomId={voiceRoomId}
                    onSelectRoom={setViewingRoomId}
                    onJoinVoice={(roomId) => setVoiceRoomId(roomId)}
                    onLeaveVoice={() => setVoiceRoomId(null)}
                    onSwitchVoice={(roomId) => {
                        setVoiceRoomId(roomId);
                        setViewingRoomId(roomId);
                    }}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    unreadMessages={unreadMessages}
                    onOpenChat={() => setUnreadMessages(0)}
                    onCreateRoom={() => alert('Create room clicked')}
                />

                {/* State display */}
                <div style={{ padding: 24, color: '#888', fontSize: 12 }}>
                    <h3 style={{ color: '#fff', marginBottom: 12 }}>Current State:</h3>
                    <p>Viewing Room: <strong style={{ color: '#22d3ee' }}>{viewingRoomId}</strong></p>
                    <p>Voice Room: <strong style={{ color: '#22c55e' }}>{voiceRoomId || 'None'}</strong></p>
                    <p>Muted: <strong style={{ color: isMuted ? '#ef4444' : '#22c55e' }}>{isMuted ? 'Yes' : 'No'}</strong></p>
                    <p>Unread: <strong style={{ color: '#ec4899' }}>{unreadMessages}</strong></p>
                </div>
            </div>
        );
    },
};
