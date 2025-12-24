/**
 * @file VoiceControls.jsx
 * @description Main voice control buttons (mute, deafen, leave).
 */

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { VoiceConnectionState } from '@Services/voice/voiceRoomService.js';

/**
 * @typedef {Object} VoiceControlsProps
 * @property {string} connectionState - Current connection state
 * @property {boolean} muted - Whether mic is muted
 * @property {boolean} deafened - Whether audio is deafened
 * @property {function} onToggleMute - Callback to toggle mute
 * @property {function} onToggleDeafen - Callback to toggle deafen
 * @property {function} onJoin - Callback to join voice
 * @property {function} onLeave - Callback to leave voice
 */

/**
 * Voice controls component.
 * Displays mute/deafen/leave buttons or join button.
 *
 * @param {VoiceControlsProps} props - Component props
 * @returns {React.ReactElement} The rendered controls
 */
export function VoiceControls({
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
                    <Icon name="radio" size={16} />
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
                {muted ? <Icon name="micOff" size={18} /> : <Icon name="mic" size={18} />}
            </button>

            <button
                className={`voice-controls__btn ${deafened ? 'voice-controls__btn--active' : ''}`}
                onClick={onToggleDeafen}
                title={deafened ? 'Undeafen' : 'Deafen'}
            >
                {deafened ? <Icon name="headphoneOff" size={18} /> : <Icon name="headphones" size={18} />}
            </button>

            <button
                className="voice-controls__btn voice-controls__btn--leave"
                onClick={onLeave}
                title="Leave Voice"
            >
                <Icon name="phoneOff" size={18} />
            </button>

            <button className="voice-controls__btn" title="Voice Settings">
                <Icon name="settings" size={18} />
            </button>
        </div>
    );
}

export default VoiceControls;