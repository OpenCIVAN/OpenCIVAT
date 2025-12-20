/**
 * @file CurrentRoomIndicator.jsx
 * @description Shows the user's current room location.
 */

import React from 'react';
import { Globe, Layout, LogOut, User as UserIcon } from 'lucide-react';

/**
 * Get icon for room type
 */
function getTypeIcon(type) {
    switch (type) {
        case 'project': return Globe;
        case 'breakout': return Layout;
        case 'personal': return UserIcon;
        default: return Layout;
    }
}

/**
 * @typedef {Object} CurrentRoomIndicatorProps
 * @property {Object} room - Current room object
 * @property {function} onLeave - Callback to leave room
 */

/**
 * Current room indicator component.
 * Shows where the user currently is.
 *
 * @param {CurrentRoomIndicatorProps} props - Component props
 * @returns {React.ReactElement|null} The rendered indicator
 */
export function CurrentRoomIndicator({ room, onLeave }) {
    if (!room) return null;

    const TypeIcon = getTypeIcon(room.type);

    return (
        <div className="current-room-indicator">
            <div className="current-room-indicator__info">
                <div className="current-room-indicator__label">Currently in</div>
                <div className="current-room-indicator__name">
                    <TypeIcon size={14} />
                    <span>{room.name}</span>
                </div>
            </div>
            {room.type !== 'project' && (
                <button
                    className="current-room-indicator__leave"
                    onClick={onLeave}
                    title="Leave room"
                >
                    <LogOut size={14} />
                    Leave
                </button>
            )}
        </div>
    );
}

export default CurrentRoomIndicator;