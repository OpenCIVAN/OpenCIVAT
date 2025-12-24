/**
 * @file RoomCard.jsx
 * @description Individual room display with expandable details.
 */

import React, { useState } from 'react';
import { Icon } from '@UI/react/components/common/Icon';

/**
 * Get access icon for room
 */
function getAccessIcon(access) {
    switch (access) {
        case 'open': return 'unlock';
        case 'invite': return 'lock';
        case 'invisible': return 'eyeOff';
        default: return 'unlock';
    }
}

/**
 * Get type icon for room
 */
function getTypeIcon(type) {
    switch (type) {
        case 'project': return 'globe';
        case 'breakout': return 'briefcase';
        case 'personal': return 'user';
        default: return 'layout';
    }
}

/**
 * @typedef {Object} RoomCardProps
 * @property {Object} room - Room data
 * @property {function} onJoin - Callback to join room
 * @property {function} onLeave - Callback to leave room
 * @property {function} onSettings - Callback to open settings
 * @property {function} onDelete - Callback to delete room
 */

/**
 * Room card component.
 * Displays room with expandable member list.
 *
 * @param {RoomCardProps} props - Component props
 * @returns {React.ReactElement} The rendered card
 */
export function RoomCard({ room, onJoin, onLeave, onSettings, onDelete }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const accessIconName = getAccessIcon(room.access);
    const typeIconName = getTypeIcon(room.type);

    return (
        <div className={`room-card ${room.isCurrentRoom ? 'room-card--current' : ''}`}>
            <div
                className="room-card__header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="room-card__type-icon" data-type={room.type}>
                    <Icon name={typeIconName} size={14} />
                </div>

                <div className="room-card__info">
                    <div className="room-card__name">
                        <Icon name={accessIconName} size={12} className="room-card__access-icon" />
                        <span>{room.name}</span>
                        {room.isPersistent && (
                            <span className="room-card__badge">Persistent</span>
                        )}
                    </div>
                    <div className="room-card__meta">
                        <span className="room-card__member-count">
                            <Icon name="users" size={10} />
                            {room.members.length}
                        </span>
                        {room.hasVoice && <Icon name="volume" size={10} />}
                        {room.hasText && <Icon name="messageSquare" size={10} />}
                    </div>
                </div>

                <div className="room-card__actions">
                    {room.isCurrentRoom ? (
                        <span className="room-card__current-badge">Current</span>
                    ) : (
                        <button
                            className="room-card__join-btn"
                            onClick={(e) => { e.stopPropagation(); onJoin(room.id); }}
                        >
                            Join
                        </button>
                    )}
                    <span className="room-card__chevron">
                        {isExpanded ? <Icon name="chevronDown" size={12} /> : <Icon name="chevronRight" size={12} />}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="room-card__expanded">
                    <div className="room-card__members">
                        <div className="room-card__members-label">Members</div>
                        <div className="room-card__members-list">
                            {room.members.map(member => (
                                <div key={member.id} className="room-card__member">
                                    <div
                                        className="room-card__member-avatar"
                                        style={{ '--member-color': member.color }}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="room-card__member-name">
                                        {member.name}
                                        {member.isOwner && <Icon name="crown" size={10} />}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="room-card__footer">
                        {room.isCurrentRoom && room.type !== 'project' && (
                            <button
                                className="room-card__footer-btn room-card__footer-btn--leave"
                                onClick={() => onLeave(room.id)}
                            >
                                <Icon name="logout" size={12} />
                                Leave Room
                            </button>
                        )}
                        <button
                            className="room-card__footer-btn"
                            onClick={() => onSettings(room.id)}
                        >
                            <Icon name="settings" size={12} />
                            Settings
                        </button>
                        {room.type !== 'project' && (
                            <button
                                className="room-card__footer-btn room-card__footer-btn--delete"
                                onClick={() => onDelete(room.id)}
                            >
                                <Icon name="delete" size={12} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoomCard;