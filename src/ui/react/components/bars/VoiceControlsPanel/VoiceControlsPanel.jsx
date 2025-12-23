/**
 * @file VoiceControlsPanel.jsx
 * @description Tinted panel containing voice controls.
 * Features a subtle blue tint and left accent border.
 * Lives in shared bars/ folder for flexibility.
 * 
 * @example
 * <VoiceControlsPanel
 *   isMuted={false}
 *   isDeafened={false}
 *   isInChannel={true}
 *   currentChannel={channel}
 *   channels={allChannels}
 *   onToggleMute={handleMute}
 *   onToggleDeafen={handleDeafen}
 *   onJoinLeave={handleJoinLeave}
 *   onChangeChannel={handleChangeChannel}
 *   onOpenSettings={handleOpenSettings}
 * />
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import './VoiceControlsPanel.scss';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const VoiceButton = memo(function VoiceButton({ icon, label, active, accent, onClick, grouped }) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            type="button"
            className={`voice-controls-panel__btn ${active ? 'voice-controls-panel__btn--active' : ''} ${grouped ? 'voice-controls-panel__btn--grouped' : ''}`}
            style={{ '--btn-accent': accent }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            title={label}
            aria-label={label}
            data-hovered={hovered}
        >
            <Icon name={icon} size={14} />
        </button>
    );
});

const ChannelSelector = memo(function ChannelSelector({ currentChannel, channels = [], onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSelect = useCallback((channel) => {
        onSelect?.(channel.id);
        setIsOpen(false);
    }, [onSelect]);

    return (
        <div className="voice-controls-panel__channel-selector" ref={containerRef}>
            <button
                type="button"
                className="voice-controls-panel__channel-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <Icon name="headset" size={12} className="voice-controls-panel__channel-icon" />
                <div className="voice-controls-panel__channel-info">
                    <span className="voice-controls-panel__channel-label">Voice Channel</span>
                    <span className="voice-controls-panel__channel-name">
                        {currentChannel?.name || 'Not connected'}
                    </span>
                </div>
                <Icon name="chevronDown" size={10} className="voice-controls-panel__channel-chevron" />
            </button>

            {isOpen && channels.length > 0 && (
                <div className="voice-controls-panel__channel-dropdown">
                    {channels.map((channel) => {
                        const isActive = currentChannel?.id === channel.id;
                        return (
                            <button
                                key={channel.id}
                                type="button"
                                className={`voice-controls-panel__channel-item ${isActive ? 'voice-controls-panel__channel-item--active' : ''}`}
                                onClick={() => handleSelect(channel)}
                            >
                                <Icon name="headset" size={12} className="voice-controls-panel__channel-item-icon" />
                                <span className="voice-controls-panel__channel-item-name">{channel.name}</span>
                                {channel.participantCount !== undefined && (
                                    <span className="voice-controls-panel__channel-item-count">
                                        <Icon name="users" size={10} />
                                        {channel.participantCount}
                                    </span>
                                )}
                                {isActive && <Icon name="check" size={12} className="voice-controls-panel__channel-item-check" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function VoiceControlsPanel({
    isMuted = false,
    isDeafened = false,
    isInChannel = false,
    currentChannel,
    channels = [],
    onToggleMute,
    onToggleDeafen,
    onJoinLeave,
    onChangeChannel,
    onOpenSettings,
    className = '',
}) {
    return (
        <div className={`voice-controls-panel ${className}`}>
            <div className="voice-controls-panel__buttons">
                <VoiceButton
                    icon={isMuted ? 'micOff' : 'mic'}
                    label={isMuted ? 'Unmute' : 'Mute'}
                    active={!isMuted && isInChannel}
                    accent={isMuted ? 'var(--color-accent-red)' : 'var(--color-accent-green)'}
                    onClick={onToggleMute}
                    grouped
                />
                <VoiceButton
                    icon={isDeafened ? 'headsetOff' : 'headset'}
                    label={isDeafened ? 'Undeafen' : 'Deafen'}
                    active={!isDeafened && isInChannel}
                    accent={isDeafened ? 'var(--color-accent-red)' : 'var(--color-text-tertiary)'}
                    onClick={onToggleDeafen}
                    grouped
                />
                <div className="voice-controls-panel__divider" />
                <VoiceButton
                    icon={isInChannel ? 'joinVoice' : 'leaveVoice'}
                    label={isInChannel ? 'Leave Channel' : 'Join Channel'}
                    accent={isInChannel ? 'var(--color-accent-red)' : 'var(--color-accent-green)'}
                    onClick={onJoinLeave}
                    grouped
                />
            </div>

            <ChannelSelector
                currentChannel={currentChannel}
                channels={channels}
                onSelect={onChangeChannel}
            />

            <VoiceButton icon='settings' label="Voice Settings" onClick={onOpenSettings} />
        </div>
    );
}

export default memo(VoiceControlsPanel);
export { VoiceControlsPanel };