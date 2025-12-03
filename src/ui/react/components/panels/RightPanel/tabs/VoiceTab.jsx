// src/ui/react/components/panels/RightPanel/tabs/VoiceTab.jsx
// Voice chat controls and participant management
// Displays voice channel status, participants, and audio controls

import React, { useState, useEffect, useCallback } from 'react';
import {
    Mic,
    MicOff,
    Headphones,
    HeadphoneOff,
    Volume2,
    PhoneOff,
    Radio,
    Settings,
    ChevronDown,
    Circle,
    Plus,
} from 'lucide-react';
import { ResizableSections } from '@UI/react/components/common/ResizableSections';
import { voiceRoomService, VoiceConnectionState } from '@Services/voice/voiceRoomService.js';
import { getUserName } from '@Collaboration/presence/userManagement.js';
import { toast } from '@UI/react/store/toastStore.js';

// Default voice channels/rooms
const DEFAULT_CHANNELS = [
    { id: 'main', name: 'Main Room', participants: 0 },
    { id: 'breakout-1', name: 'Breakout 1', participants: 0 },
    { id: 'breakout-2', name: 'Breakout 2', participants: 0 },
    { id: 'breakout-3', name: 'Breakout 3', participants: 0 },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * VoiceControls - Main voice control buttons
 */
function VoiceControls({
    connectionState,
    muted,
    deafened,
    onToggleMute,
    onToggleDeafen,
    onLeave,
    onJoin
}) {
    const isConnected = connectionState === VoiceConnectionState.CONNECTED;
    const isConnecting = connectionState === VoiceConnectionState.CONNECTING;
    const isReconnecting = connectionState === VoiceConnectionState.RECONNECTING;

    if (!isConnected && !isReconnecting) {
        return (
            <div className="voice-controls voice-controls--disconnected">
                <button
                    className="voice-controls__join-btn"
                    onClick={onJoin}
                    disabled={isConnecting}
                >
                    <Radio size={16} />
                    <span>{isConnecting ? 'Connecting...' : 'Join Voice'}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="voice-controls">
            {isReconnecting && (
                <div className="voice-controls__status">Reconnecting...</div>
            )}
            <button
                className={`voice-controls__btn ${muted ? 'voice-controls__btn--active' : ''}`}
                onClick={onToggleMute}
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
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
 * ChannelSelector - Dropdown to select voice channel/room
 */
function ChannelSelector({ channels, currentChannel, onSelect, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const current = channels.find(c => c.id === currentChannel) || channels[0];

    return (
        <div className="channel-selector">
            <button
                className="channel-selector__trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <Radio size={14} className="channel-selector__icon" />
                <span className="channel-selector__name">{current?.name || 'Select Room'}</span>
                {current?.participants > 0 && (
                    <span className="channel-selector__count">{current.participants}</span>
                )}
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
                                {channel.participants > 0 && (
                                    <span className="channel-selector__option-count">{channel.participants}</span>
                                )}
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
function ParticipantCard({ participant, onAdjustVolume }) {
    return (
        <div className={`participant-card ${participant.isSpeaking ? 'participant-card--speaking' : ''}`}>
            <div
                className="participant-card__avatar"
                style={{ '--user-color': participant.color }}
            >
                {(participant.name || participant.identity || '?').charAt(0).toUpperCase()}
                {participant.isSpeaking && (
                    <div className="participant-card__speaking-indicator">
                        <Circle size={8} />
                    </div>
                )}
            </div>

            <div className="participant-card__info">
                <div className="participant-card__name">
                    {participant.name || participant.identity}
                    {participant.isLocal && <span className="participant-card__you"> (You)</span>}
                </div>
                <div className="participant-card__status">
                    {participant.isMuted && <MicOff size={10} />}
                    {!participant.isMuted && (
                        <span className="participant-card__status-text">
                            {participant.isSpeaking ? 'Speaking' : 'Connected'}
                        </span>
                    )}
                </div>
            </div>

            {!participant.isLocal && (
                <div className="participant-card__actions">
                    <button
                        className="participant-card__volume-btn"
                        title="Adjust volume"
                        onClick={() => onAdjustVolume?.(participant.id)}
                    >
                        <Volume2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VoicePanelContent({
    workspaceId,
    channels: propChannels,
}) {
    // Use provided channels or default
    const channels = propChannels?.length > 0 ? propChannels : DEFAULT_CHANNELS;

    // Voice state from service
    const [connectionState, setConnectionState] = useState(voiceRoomService.getConnectionState());
    const [muted, setMuted] = useState(voiceRoomService.isMuted);
    const [deafened, setDeafened] = useState(voiceRoomService.isDeafened);
    const [currentChannel, setCurrentChannel] = useState(voiceRoomService.getCurrentRoom() || channels[0]?.id);
    const [participants, setParticipants] = useState([]);

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
            if ((e.key === 'm' || e.key === 'M') && !e.target.matches('input, textarea')) {
                if (connectionState === VoiceConnectionState.CONNECTED) {
                    e.preventDefault();
                    handleToggleMute();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [connectionState]);

    // Handlers
    const handleJoin = useCallback(async () => {
        try {
            const userName = getUserName();
            const roomId = currentChannel || channels[0]?.id || 'main';
            await voiceRoomService.joinRoom(roomId, userName);
            setMuted(voiceRoomService.isMuted);
            toast.success(`Joined ${channels.find(c => c.id === roomId)?.name || roomId}`);
        } catch (error) {
            toast.error('Failed to join voice. Make sure LiveKit is running.');
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

    const handleChannelSelect = useCallback(async (channelId) => {
        setCurrentChannel(channelId);

        // If already connected, switch rooms
        if (connectionState === VoiceConnectionState.CONNECTED) {
            try {
                const userName = getUserName();
                await voiceRoomService.joinRoom(channelId, userName);
                toast.success(`Switched to ${channels.find(c => c.id === channelId)?.name || channelId}`);
            } catch (error) {
                toast.error('Failed to switch rooms');
            }
        }
    }, [connectionState, channels]);

    const handleAdjustVolume = useCallback((participantId) => {
        // TODO: Open volume slider for this participant
        console.log('Adjust volume for:', participantId);
    }, []);

    const isConnected = connectionState === VoiceConnectionState.CONNECTED;

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

export default VoicePanelContent;