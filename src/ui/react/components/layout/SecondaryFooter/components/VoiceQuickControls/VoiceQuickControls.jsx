/**
 * @file VoiceQuickControls.jsx
 * @description Quick voice controls for mic, deafen, channel.
 */

import React from 'react';
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Phone,
    PhoneOff,
    DoorOpen,
    Settings,
    ChevronDown,
} from 'lucide-react';
import { Dropdown } from '@UI/react/components/common/Dropdown';
import { Tooltip } from '@UI/react/components/common/Tooltip';

import './VoiceQuickControls.scss';

/**
 * Voice quick controls component.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.isMuted] - Whether mic is muted
 * @param {boolean} [props.isDeafened] - Whether user is deafened
 * @param {boolean} [props.isInChannel] - Whether in a voice channel
 * @param {Object} [props.currentChannel] - Current voice channel
 * @param {Array} [props.channels] - Available voice channels
 * @param {Function} [props.onToggleMute] - Callback to toggle mute
 * @param {Function} [props.onToggleDeafen] - Callback to toggle deafen
 * @param {Function} [props.onJoinLeave] - Callback to join/leave voice
 * @param {Function} [props.onChangeChannel] - Callback to change channel
 * @param {Function} [props.onOpenSettings] - Callback to open voice settings
 */
export function VoiceQuickControls({
    isMuted = false,
    isDeafened = false,
    isInChannel = false,
    currentChannel = null,
    channels = [],
    onToggleMute,
    onToggleDeafen,
    onJoinLeave,
    onChangeChannel,
    onOpenSettings,
}) {
    return (
        <div className="voice-quick-controls">
            {/* Mic Toggle */}
            <Tooltip content={isMuted ? 'Unmute' : 'Mute'}>
                <button
                    className={`voice-quick-controls__btn ${isMuted ? 'off' : 'on'
                        }`}
                    onClick={onToggleMute}
                    data-state={isMuted ? 'muted' : 'active'}
                    type="button"
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
            </Tooltip>

            {/* Deafen Toggle */}
            <Tooltip content={isDeafened ? 'Undeafen' : 'Deafen'}>
                <button
                    className={`voice-quick-controls__btn ${isDeafened ? 'off' : ''
                        }`}
                    onClick={onToggleDeafen}
                    data-state={isDeafened ? 'deafened' : 'normal'}
                    type="button"
                    aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
                >
                    {isDeafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
            </Tooltip>

            {/* Join/Leave */}
            <Tooltip content={isInChannel ? 'Leave channel' : 'Join channel'}>
                <button
                    className={`voice-quick-controls__btn ${isInChannel ? 'in-channel' : ''
                        }`}
                    onClick={onJoinLeave}
                    data-state={isInChannel ? 'connected' : 'disconnected'}
                    type="button"
                    aria-label={isInChannel ? 'Leave voice channel' : 'Join voice channel'}
                >
                    {isInChannel ? <PhoneOff size={16} /> : <Phone size={16} />}
                </button>
            </Tooltip>

            {/* Room Selector */}
            <Dropdown
                trigger={
                    <button className="voice-quick-controls__room-btn" type="button">
                        <DoorOpen size={14} />
                        <span>{currentChannel?.name || 'Select'}</span>
                        <ChevronDown size={12} />
                    </button>
                }
                placement="top-end"
            >
                <div className="voice-quick-controls__room-list">
                    {channels.length === 0 ? (
                        <div className="voice-quick-controls__empty">
                            No channels available
                        </div>
                    ) : (
                        channels.map((channel) => (
                            <button
                                key={channel.id}
                                className={`voice-quick-controls__room-item ${channel.id === currentChannel?.id
                                        ? 'active'
                                        : ''
                                    }`}
                                onClick={() => onChangeChannel?.(channel.id)}
                                type="button"
                            >
                                <span>{channel.name}</span>
                                <span className="voice-quick-controls__room-count">
                                    {channel.participantCount || 0}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </Dropdown>

            {/* Settings */}
            <Tooltip content="Voice settings">
                <button
                    className="voice-quick-controls__btn"
                    onClick={onOpenSettings}
                    type="button"
                    aria-label="Voice settings"
                >
                    <Settings size={16} />
                </button>
            </Tooltip>
        </div>
    );
}

export default VoiceQuickControls;