// src/ui/react/components/layout/TopBar/TopBar.jsx
// Enhanced TopBar with mode toggle (Desktop/VR), room info, and user controls

import React, { useState } from 'react';
import {
    Lock,
    Unlock,
    Bell,
    Settings,
    HelpCircle,
} from 'lucide-react';

import { sessionManager } from '@Core/session/sessionManager.js';
import { ViewModeToggle } from '@UI/react/components/controls/ViewModeToggle';
import './TopBar.scss';


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
    canvasMode,
    onToggleCanvasMode,
    // View mode props (Desktop/VR toggle)
    viewMode = 'desktop',
    onViewModeChange,
    vrAvailable = true,
}) {
    const roomId = roomName || sessionManager.getRoomId?.() || 'Brain Study Room';

    return (
        <div className="top-bar">
            {/* Left: Logo */}
            <div className="top-bar__left">
                <div className="top-bar__logo">
                    <div className="top-bar__logo-icon">CIA</div>
                </div>
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

            {/* Right: View Mode Toggle + Notifications + Settings + User Avatar */}
            <div className="top-bar__right">
                {/* View Mode Toggle (Desktop/VR) */}
                <ViewModeToggle
                    mode={viewMode}
                    onModeChange={onViewModeChange}
                    vrAvailable={vrAvailable}
                    compact={false}
                />

                <div className="top-bar__divider" />

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