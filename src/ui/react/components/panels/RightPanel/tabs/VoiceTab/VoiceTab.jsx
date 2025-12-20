/**
 * @file VoiceTab.jsx
 * @description Voice chat controls and participant management.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Voice channel status and selection
 * - Mute/deafen/leave controls with keyboard shortcuts
 * - Participant list with speaking indicators
 * - Per-participant volume control
 * - LiveKit integration for real-time voice
 *
 * @see Right_Panel_Design_Specification.md - Voice Tab section
 *
 * @example
 * <VoiceTab workspaceId="ws-1" channels={channels} />
 */

import React from 'react';
import { ResizableSections } from '@UI/react/components/common/ResizableSections';

import { useVoiceTab } from './hooks/useVoiceTab';
import { VoiceControls } from './components/VoiceControls';
import { ChannelSelector } from './components/ChannelSelector';
import { ParticipantCard } from './components/ParticipantCard';

import './VoiceTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} VoiceTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {Array} [channels] - Available voice channels
 */

/**
 * Voice tab component.
 * Provides voice chat controls and participant management.
 *
 * @param {VoiceTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function VoiceTab({ workspaceId, channels: propChannels }) {
    const {
        channels,
        connectionState,
        isConnected,
        muted,
        deafened,
        currentChannel,
        participants,
        handleJoin,
        handleLeave,
        handleToggleMute,
        handleToggleDeafen,
        handleChannelSelect,
        handleAdjustVolume,
    } = useVoiceTab({ channels: propChannels });

    // Section definitions
    const sections = [
        {
            id: 'controls',
            title: 'Voice Controls',
            defaultHeight: 140,
            minHeight: 120,
            content: (
                <div className="voice-section">
                    <ChannelSelector
                        channels={channels}
                        currentChannel={currentChannel}
                        onSelect={handleChannelSelect}
                        disabled={false}
                    />
                    <VoiceControls
                        connectionState={connectionState}
                        muted={muted}
                        deafened={deafened}
                        onToggleMute={handleToggleMute}
                        onToggleDeafen={handleToggleDeafen}
                        onJoin={handleJoin}
                        onLeave={handleLeave}
                    />
                </div>
            ),
        },
        {
            id: 'participants',
            title: `Participants (${participants.length})`,
            defaultHeight: 300,
            minHeight: 150,
            content: (
                <div className="participants-list">
                    {!isConnected ? (
                        <div className="voice-panel__empty">
                            Join a voice channel to see participants
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="voice-panel__empty">
                            No other participants yet
                        </div>
                    ) : (
                        participants.map(participant => (
                            <ParticipantCard
                                key={participant.id}
                                participant={participant}
                                onAdjustVolume={handleAdjustVolume}
                            />
                        ))
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="voice-panel">
            <ResizableSections sections={sections} />
        </div>
    );
}

// Export with both names for backwards compatibility
export { VoiceTab as VoicePanelContent };
export default VoiceTab;