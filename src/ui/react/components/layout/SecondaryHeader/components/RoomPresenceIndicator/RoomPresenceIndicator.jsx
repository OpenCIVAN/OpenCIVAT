/**
 * @file RoomPresenceIndicator.jsx
 * @description Shows current room and member avatars.
 */

import React from 'react';
import { DoorOpen } from 'lucide-react';
import { Tooltip } from '@UI/react/components/common/Tooltip';

import './RoomPresenceIndicator.scss';

const MAX_AVATARS = 4;

/**
 * Room presence indicator showing room name and member avatars.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.room] - Current room object
 * @param {Array} [props.members] - Array of room members
 * @param {Function} [props.onClick] - Callback when clicked
 */
export function RoomPresenceIndicator({ room, members = [], onClick }) {
    const visibleMembers = members.slice(0, MAX_AVATARS);
    const overflowCount = members.length - MAX_AVATARS;

    return (
        <button
            className="room-presence"
            onClick={onClick}
            type="button"
            aria-label={`Room: ${room?.name || 'Main Room'}, ${members.length} members`}
        >
            <DoorOpen size={14} className="room-presence__icon" />
            <span className="room-presence__name">
                {room?.name || 'Main Room'}
            </span>

            {members.length > 0 && (
                <>
                    <span className="room-presence__dot">•</span>
                    <div className="room-presence__avatars">
                        {visibleMembers.map((member, index) => (
                            <Tooltip key={member.id} content={member.name}>
                                <div
                                    className="room-presence__avatar"
                                    style={{
                                        zIndex: MAX_AVATARS - index,
                                        backgroundColor:
                                            member.color || '#60a5fa',
                                    }}
                                >
                                    {member.avatar ? (
                                        <img
                                            src={member.avatar}
                                            alt={member.name}
                                        />
                                    ) : (
                                        <span>
                                            {member.name
                                                ?.charAt(0)
                                                .toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </Tooltip>
                        ))}
                        {overflowCount > 0 && (
                            <Tooltip
                                content={`${overflowCount} more member${overflowCount > 1 ? 's' : ''}`}
                            >
                                <div className="room-presence__overflow">
                                    +{overflowCount}
                                </div>
                            </Tooltip>
                        )}
                    </div>
                </>
            )}
        </button>
    );
}

export default RoomPresenceIndicator;