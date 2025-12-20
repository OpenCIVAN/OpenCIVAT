/**
 * @file VoiceQuickControls.jsx
 * @description Quick voice controls for mic, deafen, channel.
 */

// =============================================================================
// ENHANCED VoiceQuickControls - More Obvious Voice Status
// File: src/ui/react/components/layout/SecondaryFooter/components/VoiceQuickControls/VoiceQuickControls.jsx
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Phone,
    PhoneOff,
    ChevronDown,
    Settings,
    Headphones,
} from 'lucide-react';
import { Tooltip } from '@UI/react/components/common/Tooltip';
import { Dropdown } from '@UI/react/components/common/Dropdown';
import './VoiceQuickControls.scss';

/**
 * VoiceQuickControls - Voice controls with OBVIOUS connection status
 * 
 * Key UX improvements:
 * - Large, color-coded status indicator
 * - "Not in Voice" vs "In Voice: [Channel]" text
 * - Prominent Join/Leave button
 * - Entire section changes color based on state
 */
export function VoiceQuickControls({
    isMuted = false,
    isDeafened = false,
    isInChannel = false,
    currentChannel = null,
    channels = [],
    participantCount = 0,
    onToggleMute,
    onToggleDeafen,
    onJoinLeave,
    onChangeChannel,
    onOpenSettings,
}) {
    const [showChannelPicker, setShowChannelPicker] = useState(false);

    // Determine overall status
    const statusClass = isInChannel
        ? (isMuted ? 'voice-controls--muted' : 'voice-controls--connected')
        : 'voice-controls--disconnected';

    const handleJoinLeave = useCallback(() => {
        onJoinLeave?.();
    }, [onJoinLeave]);

    const handleChannelSelect = useCallback((channelId) => {
        onChangeChannel?.(channelId);
        setShowChannelPicker(false);
    }, [onChangeChannel]);

    return (
        <div className={`voice-controls ${statusClass}`}>
            {/* Status Indicator - PROMINENT */}
            <div className="voice-controls__status">
                {isInChannel ? (
                    <>
                        <div className="voice-controls__status-dot voice-controls__status-dot--connected" />
                        <div className="voice-controls__status-info">
                            <span className="voice-controls__status-label">In Voice</span>
                            <span className="voice-controls__status-channel">
                                {currentChannel?.name || 'Unknown Channel'}
                                {participantCount > 0 && (
                                    <span className="voice-controls__participant-count">
                                        ({participantCount})
                                    </span>
                                )}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="voice-controls__status-dot voice-controls__status-dot--disconnected" />
                        <span className="voice-controls__status-text">Not in Voice</span>
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="voice-controls__divider" />

            {/* Controls - Only show if in channel */}
            {isInChannel && (
                <>
                    {/* Mute Button */}
                    <Tooltip content={isMuted ? 'Unmute' : 'Mute'}>
                        <button
                            className={`voice-controls__btn ${isMuted ? 'voice-controls__btn--active voice-controls__btn--muted' : ''}`}
                            onClick={onToggleMute}
                            aria-pressed={isMuted}
                            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                        >
                            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    </Tooltip>

                    {/* Deafen Button */}
                    <Tooltip content={isDeafened ? 'Undeafen' : 'Deafen'}>
                        <button
                            className={`voice-controls__btn ${isDeafened ? 'voice-controls__btn--active voice-controls__btn--deafened' : ''}`}
                            onClick={onToggleDeafen}
                            aria-pressed={isDeafened}
                            aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
                        >
                            {isDeafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                    </Tooltip>

                    <div className="voice-controls__divider" />
                </>
            )}

            {/* Join/Leave Button - ALWAYS VISIBLE AND PROMINENT */}
            <Tooltip content={isInChannel ? 'Leave Voice' : 'Join Voice'}>
                <button
                    className={`voice-controls__join-leave ${isInChannel ? 'voice-controls__join-leave--leave' : 'voice-controls__join-leave--join'}`}
                    onClick={handleJoinLeave}
                    aria-label={isInChannel ? 'Leave voice channel' : 'Join voice channel'}
                >
                    {isInChannel ? (
                        <>
                            <PhoneOff size={14} />
                            <span>Leave</span>
                        </>
                    ) : (
                        <>
                            <Phone size={14} />
                            <span>Join</span>
                        </>
                    )}
                </button>
            </Tooltip>

            {/* Channel Picker */}
            {channels.length > 0 && (
                <Dropdown
                    trigger={
                        <button
                            className="voice-controls__channel-picker"
                            aria-label="Select voice channel"
                        >
                            <ChevronDown size={14} />
                        </button>
                    }
                    placement="top-end"
                >
                    <div className="voice-controls__channel-menu">
                        <div className="voice-controls__channel-header">
                            Voice Channels
                        </div>
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                className={`voice-controls__channel-item ${currentChannel?.id === channel.id ? 'voice-controls__channel-item--active' : ''}`}
                                onClick={() => handleChannelSelect(channel.id)}
                            >
                                <Headphones size={14} />
                                <span className="voice-controls__channel-name">{channel.name}</span>
                                {channel.participantCount > 0 && (
                                    <span className="voice-controls__channel-count">
                                        {channel.participantCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </Dropdown>
            )}

            {/* Settings */}
            <Tooltip content="Voice Settings">
                <button
                    className="voice-controls__btn voice-controls__btn--settings"
                    onClick={onOpenSettings}
                    aria-label="Voice settings"
                >
                    <Settings size={14} />
                </button>
            </Tooltip>
        </div>
    );
}

export default VoiceQuickControls;