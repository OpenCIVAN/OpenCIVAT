// src/ui/react/components/layout/TopBar/TopBar.jsx
// Enhanced TopBar with mode toggle (Desktop/VR), room info, and user controls
// UPDATED: Removed canvas mode toggle (moved to LayoutModeToggle in bottom bar)

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
 * RoomIndicator - Shows current room/project with lock status
 * UPDATED: Better handling of room name display
 */
function RoomIndicator({ roomName, projectName, isLocked = true }) {
    // Determine what to display
    const displayName = (() => {
        // If we have a proper room name, use it
        if (roomName && !isUUID(roomName)) {
            return roomName;
        }
        // If we have a project name, use it
        if (projectName) {
            return projectName;
        }
        // If roomName looks like a UUID, format it nicely
        if (roomName && isUUID(roomName)) {
            return `Room ${roomName.split('-')[0]}`;
        }
        // Fallback
        return 'Workspace';
    })();

    return (
        <div className="room-indicator">
            <span className="room-indicator__name">{displayName}</span>
            {isLocked ? (
                <Lock size={12} className="room-indicator__lock" />
            ) : (
                <Unlock size={12} className="room-indicator__lock room-indicator__lock--unlocked" />
            )}
        </div>
    );
}

/**
 * Check if a string looks like a UUID
 */
function isUUID(str) {
    if (!str || typeof str !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
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
 * 
 * Layout:
 * - Left: CIA logo
 * - Center: Room/Project indicator
 * - Right: VR/Desktop toggle, notifications, settings, avatar
 */
export function TopBar({
    username,
    userColor = '#2dd4bf',
    inVoice = false,
    roomName,
    projectName,
    isRoomLocked = true,
    // View mode props (Desktop/VR toggle)
    viewMode = 'desktop',
    onViewModeChange,
    vrAvailable = true,
}) {
    const roomId = roomName || sessionManager.getRoomId?.() || null;

    return (
        <div className="top-bar">
            {/* Left: Logo */}
            <div className="top-bar__left">
                <div className="top-bar__logo">
                    <div className="top-bar__logo-icon">CIA</div>
                </div>
            </div>

            {/* Center: Room/Project Name */}
            <div className="top-bar__center">
                <RoomIndicator
                    roomName={roomId}
                    projectName={projectName}
                    isLocked={isRoomLocked}
                />
                {/* REMOVED: Canvas mode toggle - now in LayoutModeToggle */}
            </div>

            {/* Right: Controls */}
            <div className="top-bar__right">
                {/* Desktop/VR Toggle */}
                <ViewModeToggle
                    mode={viewMode}
                    onChange={onViewModeChange}
                    vrAvailable={vrAvailable}
                />

                {/* Notifications */}
                <button className="top-bar__icon-btn" title="Notifications">
                    <Bell size={18} />
                </button>

                {/* Settings */}
                <button className="top-bar__icon-btn" title="Settings">
                    <Settings size={18} />
                </button>

                {/* Help */}
                <button className="top-bar__icon-btn" title="Help">
                    <HelpCircle size={18} />
                </button>

                {/* User Avatar */}
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