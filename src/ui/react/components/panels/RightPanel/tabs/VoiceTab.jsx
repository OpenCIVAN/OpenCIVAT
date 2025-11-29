// src/ui/react/components/panels/RightPanel/tabs/VoiceTab.jsx
// Voice chat controls and participant management
// Displays voice channel status, participants, and audio controls

import React, { useState, useCallback } from 'react';
import {
    Mic,
    MicOff,
    Headphones,
    HeadphoneOff,
    Volume2,
    VolumeX,
    PhoneOff,
    Radio,
    Settings,
    ChevronDown,
    Circle,
} from 'lucide-react';
import { ResizableSectionsContainer } from "@UI/react/components/common/ResizableSections";

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_VOICE_CHANNELS = [
    { id: 'main', name: 'Main Room', participants: 3, active: true },
    { id: 'breakout-1', name: 'Breakout 1', participants: 2, active: false },
    { id: 'breakout-2', name: 'Breakout 2', participants: 0, active: false },
];

const SAMPLE_PARTICIPANTS = [
    { id: 'u1', name: 'Dr. Smith', color: '#fb7185', speaking: true, muted: false, deafened: false },
    { id: 'u2', name: 'Dr. Jones', color: '#fbbf24', speaking: false, muted: true, deafened: false },
    { id: 'u3', name: 'Alice Chen', color: '#2dd4bf', speaking: false, muted: false, deafened: false },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * VoiceControls - Main voice control buttons
 */
function VoiceControls({ inVoice, muted, deafened, onToggleMute, onToggleDeafen, onLeave, onJoin }) {
    if (!inVoice) {
        return (
            <div className="voice-controls voice-controls--disconnected">
                <button className="voice-controls__join-btn" onClick={onJoin}>
                    <Radio size={16} />
                    <span>Join Voice</span>
                </button>
            </div>
        );
    }

    return (
        <div className="voice-controls">
            <button
                className={`voice-controls__btn ${muted ? 'voice-controls__btn--active' : ''}`}
                onClick={onToggleMute}
                title={muted ? 'Unmute' : 'Mute'}
            >
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
                className={`voice-controls__btn ${deafened ? 'voice-controls__btn--active' : ''}`}
                onClick={onToggleDeafen}
                title={deafened ? 'Undeafen' : 'Deafen'}
            >
                {deafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
            </button>

            <button
                className="voice-controls__btn voice-controls__btn--leave"
                onClick={onLeave}
                title="Leave Voice"
            >
                <PhoneOff size={18} />
            </button>

            <button className="voice-controls__btn" title="Voice Settings">
                <Settings size={18} />
            </button>
        </div>
    );
}

/**
 * ChannelSelector - Dropdown to select voice channel
 */
function ChannelSelector({ channels, currentChannel, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = channels.find(c => c.id === currentChannel) || channels[0];

    return (
        <div className="channel-selector">
            <button
                className="channel-selector__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Radio size={14} className="channel-selector__icon" />
                <span className="channel-selector__name">{current?.name}</span>
                <span className="channel-selector__count">{current?.participants}</span>
                <ChevronDown size={12} className={`channel-selector__chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="channel-selector__backdrop" onClick={() => setIsOpen(false)} />
                    <div className="channel-selector__dropdown">
                        {channels.map(channel => (
                            <button
                                key={channel.id}
                                className={`channel-selector__option ${channel.id === currentChannel ? 'active' : ''}`}
                                onClick={() => {
                                    onSelect(channel.id);
                                    setIsOpen(false);
                                }}
                            >
                                <Radio size={12} />
                                <span className="channel-selector__option-name">{channel.name}</span>
                                <span className="channel-selector__option-count">{channel.participants}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * ParticipantCard - Shows a voice participant with status
 */
function ParticipantCard({ participant, onAdjustVolume, onMute }) {
    const [volume, setVolume] = useState(100);

    return (
        <div className={`participant-card ${participant.speaking ? 'participant-card--speaking' : ''}`}>
            <div
                className="participant-card__avatar"
                style={{ '--user-color': participant.color }}
            >
                {participant.name.charAt(0).toUpperCase()}
                {participant.speaking && (
                    <div className="participant-card__speaking-indicator">
                        <Circle size={8} />
                    </div>
                )}
            </div>

            <div className="participant-card__info">
                <div className="participant-card__name">{participant.name}</div>
                <div className="participant-card__status">
                    {participant.muted && <MicOff size={10} />}
                    {participant.deafened && <HeadphoneOff size={10} />}
                    {!participant.muted && !participant.deafened && (
                        <span className="participant-card__status-text">Connected</span>
                    )}
                </div>
            </div>

            <div className="participant-card__actions">
                <button
                    className="participant-card__volume-btn"
                    title="Adjust volume"
                >
                    <Volume2 size={14} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VoicePanelContent({ workspaceId }) {
    // Voice state
    const [inVoice, setInVoice] = useState(true);
    const [muted, setMuted] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [currentChannel, setCurrentChannel] = useState('main');

    // Handlers
    const handleJoin = useCallback(() => {
        setInVoice(true);
    }, []);

    const handleLeave = useCallback(() => {
        setInVoice(false);
    }, []);

    const handleToggleMute = useCallback(() => {
        setMuted(prev => !prev);
    }, []);

    const handleToggleDeafen = useCallback(() => {
        setDeafened(prev => !prev);
    }, []);

    // Section definitions
    const sections = [
        {
            id: 'controls',
            title: 'Voice Controls',
            defaultHeight: 120,
            minHeight: 100,
            content: (
                <div className="voice-section">
                    <ChannelSelector
                        channels={SAMPLE_VOICE_CHANNELS}
                        currentChannel={currentChannel}
                        onSelect={setCurrentChannel}
                    />
                    <VoiceControls
                        inVoice={inVoice}
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
            title: `Participants (${SAMPLE_PARTICIPANTS.length})`,
            defaultHeight: 300,
            minHeight: 150,
            content: (
                <div className="participants-list">
                    {SAMPLE_PARTICIPANTS.map(participant => (
                        <ParticipantCard
                            key={participant.id}
                            participant={participant}
                        />
                    ))}
                </div>
            ),
        },
    ];

    return (
        <div className="voice-panel">
            <ResizableSectionsContainer sections={sections} />
        </div>
    );
}

export default VoicePanelContent;