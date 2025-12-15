// src/ui/react/components/layout/TopBar/TopBar.jsx
// Enhanced TopBar with mode toggle (Desktop/VR), room info, and user controls
// UPDATED: Integrated UserMenu for authenticated users

import React from 'react';
import {
    Lock,
    Unlock,
    Bell,
    Settings,
    HelpCircle,
} from 'lucide-react';

import { sessionManager } from '@Core/session/sessionManager.js';
import { ViewModeToggle } from '@UI/react/components/controls/ViewModeToggle';
import { useAuth } from '@UI/react/hooks/useAuth.js';
import { UserMenu } from '@UI/react/components/auth/UserMenu.jsx';
import { LoginButton } from '@UI/react/components/auth/LoginButton.jsx';
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
 * - Right: VR/Desktop toggle, notifications, settings, user menu
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
    // Callbacks
    onSettingsClick,
    onProfileClick,
}) {
    const { isAuthenticated, isLoading } = useAuth();
    const roomId = roomName || sessionManager.getRoomId?.() || null;

    return (
        <div className="top-bar">
            {/* Left: Logo */}
            <div className="top-bar__left">
                <div className="top-bar__logo">
                    <div className="top-bar__logo-icon">CIA</div>
                </div>
                {/* Room/Project Name */}
                <div className="top-bar__center">
                    <RoomIndicator
                        roomName={roomId}
                        projectName={projectName}
                        isLocked={isRoomLocked}
                    />
                </div>
            </div>

            {/* Right: Controls */}
            <div className="top-bar__right">
                {/* Desktop/VR Toggle */}
                <ViewModeToggle
                    mode={viewMode}
                    onChange={onViewModeChange}
                    vrAvailable={vrAvailable}
                />

                <div className="top-bar__separator" />

                {/* Notifications */}
                <button className="top-bar__icon-btn" title="Notifications">
                    <Bell size={18} />
                </button>

                {/* Settings */}
                <button className="top-bar__icon-btn" title="Settings" onClick={onSettingsClick}>
                    <Settings size={18} />
                </button>

                {/* Help */}
                <button className="top-bar__icon-btn" title="Help">
                    <HelpCircle size={18} />
                </button>

                {/* User Menu or Login Button */}
                {isLoading ? (
                    <div className="user-avatar user-avatar--loading" />
                ) : isAuthenticated ? (
                    <UserMenu
                        userColor={userColor}
                        inVoice={inVoice}
                        onProfileClick={onProfileClick}
                        onSettingsClick={onSettingsClick}
                    />
                ) : (
                    <LoginButton variant="compact" />
                )}
            </div>
        </div>
    );
}

export default TopBar;