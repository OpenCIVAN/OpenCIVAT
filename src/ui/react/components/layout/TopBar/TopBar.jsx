// src/ui/react/components/layout/TopBar/TopBar.jsx
// Enhanced TopBar with mode toggle (Desktop/VR), room info, and user controls

import React, { useState } from 'react';
import {
    Monitor,
    Glasses,
    Lock,
    Unlock,
    Bell,
    Settings,
    HelpCircle,
} from 'lucide-react';

import { sessionManager } from '@Core/session/sessionManager.js';
import './TopBar.scss';

/**
 * ModeToggle - Switch between Desktop and VR modes
 */
function ModeToggle({ mode, onModeChange }) {
    return (
        <div className="mode-toggle">
            <button
                className={`mode-toggle__btn ${mode === 'desktop' ? 'active' : ''}`}
                onClick={() => onModeChange('desktop')}
            >
                <Monitor size={12} />
                <span>Desktop</span>
            </button>
            <button
                className={`mode-toggle__btn ${mode === 'vr' ? 'active' : ''}`}
                onClick={() => onModeChange('vr')}
            >
                <Glasses size={12} />
                <span>VR</span>
            </button>
        </div>
    );
}

/**
 * RoomIndicator - Shows current room with lock status
 */
function RoomIndicator({ roomName, isLocked = true }) {
    return (
        <div className="room-indicator">
            <span className="room-indicator__name">{roomName}</span>
            {isLocked ? (
                <Lock size={12} className="room-indicator__lock" />
            ) : (
                <Unlock size={12} className="room-indicator__lock room-indicator__lock--unlocked" />
            )}
        </div>
    );
}

/**
 * UserAvatar - Current user avatar with voice status indicator
 */
function UserAvatar({ username, userColor, inVoice = false }) {
    const initial = (username || 'U')[0].toUpperCase();

    return (
        <div
            className={`user-avatar ${inVoice ? 'in-voice' : ''}`}
            style={{ '--user-color': userColor }}
            title={username}
        >
            {initial}
        </div>
    );
}

/**
 * TopBar - Main application header
 */
export function TopBar({
    username,
    userColor = '#2dd4bf',
    inVoice = false,
    roomName,
    isRoomLocked = true,
    mode = 'desktop',
    onModeChange,
    canvasMode,
    onToggleCanvasMode,
}) {
    const roomId = roomName || sessionManager.getRoomId?.() || 'Brain Study Room';

    return (
        <div className="top-bar">
            {/* Left: Logo + Mode Toggle */}
            <div className="top-bar__left">
                <div className="top-bar__logo">
                    <div className="top-bar__logo-icon">CIA</div>
                </div>

                <ModeToggle mode={mode} onModeChange={onModeChange} />
            </div>

            {/* Center: Room Name */}
            <div className="top-bar__center">
                <RoomIndicator roomName={roomId} isLocked={isRoomLocked} />

                {/* Canvas mode toggle (dev feature) */}
                {onToggleCanvasMode && (
                    <button
                        className={`top-bar__canvas-toggle ${canvasMode ? 'active' : ''}`}
                        onClick={onToggleCanvasMode}
                        title={canvasMode ? 'Switch to Classic Grid' : 'Switch to New Canvas'}
                    >
                        {canvasMode ? 'New Canvas' : 'Classic Grid'}
                    </button>
                )}
            </div>

            {/* Right: Notifications + Settings + User Avatar */}
            <div className="top-bar__right">
                <button className="top-bar__icon-btn" title="Notifications">
                    <Bell size={16} />
                </button>
                <button className="top-bar__icon-btn" title="Help">
                    <HelpCircle size={16} />
                </button>
                <button className="top-bar__icon-btn" title="Settings">
                    <Settings size={16} />
                </button>

                <UserAvatar
                    username={username}
                    userColor={userColor}
                    inVoice={inVoice}
                />
            </div>
        </div>
    );
}

export default TopBar;