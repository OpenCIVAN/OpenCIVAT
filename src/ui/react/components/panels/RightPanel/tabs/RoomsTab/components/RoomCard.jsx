/**
 * @file RoomCard.jsx
 * @description Individual room display with expandable details.
 */

import React, { useState } from 'react';
import {
    Users,
    Lock,
    Unlock,
    EyeOff,
    Volume2,
    MessageSquare,
    Layout,
    LogOut,
    Crown,
    Settings,
    Trash2,
    ChevronDown,
    ChevronRight,
    Globe,
    Briefcase,
    User as UserIcon,
} from 'lucide-react';

/**
 * Get access icon for room
 */
function getAccessIcon(access) {
    switch (access) {
        case 'open': return Unlock;
        case 'invite': return Lock;
        case 'invisible': return EyeOff;
        default: return Unlock;
    }
}

/**
 * Get type icon for room
 */
function getTypeIcon(type) {
    switch (type) {
        case 'project': return Globe;
        case 'breakout': return Briefcase;
        case 'personal': return UserIcon;
        default: return Layout;
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

    const AccessIcon = getAccessIcon(room.access);
    const TypeIcon = getTypeIcon(room.type);

    return (
        <div className={`room-card ${room.isCurrentRoom ? 'room-card--current' : ''}`}>
            <div
                className="room-card__header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="room-card__type-icon" data-type={room.type}>
                    <TypeIcon size={14} />
                </div>

                <div className="room-card__info">
                    <div className="room-card__name">
                        <AccessIcon size={12} className="room-card__access-icon" />
                        <span>{room.name}</span>
                        {room.isPersistent && (
                            <span className="room-card__badge">Persistent</span>
                        )}
                    </div>
                    <div className="room-card__meta">
                        <span className="room-card__member-count">
                            <Users size={10} />
                            {room.members.length}
                        </span>
                        {room.hasVoice && <Volume2 size={10} />}
                        {room.hasText && <MessageSquare size={10} />}
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
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
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
                                        {member.isOwner && <Crown size={10} />}
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
                                <LogOut size={12} />
                                Leave Room
                            </button>
                        )}
                        <button
                            className="room-card__footer-btn"
                            onClick={() => onSettings(room.id)}
                        >
                            <Settings size={12} />
                            Settings
                        </button>
                        {room.type !== 'project' && (
                            <button
                                className="room-card__footer-btn room-card__footer-btn--delete"
                                onClick={() => onDelete(room.id)}
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoomCard;