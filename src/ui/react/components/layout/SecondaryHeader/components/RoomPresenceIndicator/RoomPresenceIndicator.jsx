/**
 * @file RoomPresenceIndicator.jsx
 * @description Shows current room with dropdown to switch rooms.
 * 
 * ENHANCED VERSION - Matches "Current Location" styling with:
 * - "Currently In" label
 * - Room type icon
 * - Room name
 * - Member avatars
 * - Dropdown to switch rooms
 * - Chevron indicator
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Globe,
    GitBranch,
    User,
    ChevronDown,
    Users,
    Lock,
    Plus,
    Check
} from 'lucide-react';
import { Tooltip } from '@UI/react/components/common/Tooltip';

import './RoomPresenceIndicator.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_AVATARS = 4;

const ROOM_TYPES = {
    main: { icon: Globe, color: 'blue', label: 'Main Room' },
    breakout: { icon: GitBranch, color: 'purple', label: 'Breakout' },
    personal: { icon: User, color: 'green', label: 'Personal Space' },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Room presence indicator with dropdown for room switching.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.room] - Current room object { id, name, type, isLocked }
 * @param {Array} [props.members] - Array of room members { id, name, color, avatar, status }
 * @param {Array} [props.availableRooms] - List of rooms user can switch to
 * @param {Function} [props.onRoomChange] - Callback when room is selected
 * @param {Function} [props.onClick] - Callback when clicked (opens rooms panel)
 * @param {Function} [props.onCreateRoom] - Callback to create new room
 */
export function RoomPresenceIndicator({
    room,
    members = [],
    availableRooms = [],
    onRoomChange,
    onClick,
    onCreateRoom,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Get room type config
    const roomType = room?.type || 'main';
    const typeConfig = ROOM_TYPES[roomType] || ROOM_TYPES.main;
    const RoomIcon = typeConfig.icon;

    // Visible members (max 4)
    const visibleMembers = members.slice(0, MAX_AVATARS);
    const overflowCount = members.length - MAX_AVATARS;

    // Close dropdown when clicking outside
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

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleTriggerClick = () => {
        // If we have available rooms, show dropdown
        // Otherwise, just call onClick to open rooms panel
        if (availableRooms.length > 0 || onCreateRoom) {
            setIsOpen(!isOpen);
        } else {
            onClick?.();
        }
    };

    const handleRoomSelect = (selectedRoom) => {
        onRoomChange?.(selectedRoom.id, selectedRoom.name);
        setIsOpen(false);
    };

    const handleCreateRoom = () => {
        onCreateRoom?.();
        setIsOpen(false);
    };

    // Group rooms by type
    const groupedRooms = availableRooms.reduce((acc, r) => {
        const type = r.type || 'main';
        if (!acc[type]) acc[type] = [];
        acc[type].push(r);
        return acc;
    }, {});

    return (
        <div className="room-presence" ref={containerRef}>
            {/* Trigger Button */}
            <button
                className="room-presence__trigger"
                onClick={handleTriggerClick}
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                data-color={typeConfig.color}
            >
                {/* Label + Room Info */}
                <div className="room-presence__info">
                    <span className="room-presence__label">Currently In</span>
                    <div className="room-presence__room">
                        <RoomIcon size={12} className="room-presence__icon" />
                        <span className="room-presence__name">
                            {room?.name || 'Main Room'}
                        </span>
                        {room?.isLocked && (
                            <Lock size={10} className="room-presence__lock" />
                        )}
                    </div>
                </div>

                {/* Member Avatars */}
                {members.length > 0 && (
                    <div className="room-presence__avatars">
                        {visibleMembers.map((member, index) => (
                            <Tooltip key={member.id} content={member.name}>
                                <div
                                    className="room-presence__avatar"
                                    style={{
                                        zIndex: MAX_AVATARS - index,
                                        backgroundColor: member.color || '#60a5fa',
                                    }}
                                >
                                    {member.avatar ? (
                                        <img src={member.avatar} alt={member.name} />
                                    ) : (
                                        <span>{member.name?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                            </Tooltip>
                        ))}
                        {overflowCount > 0 && (
                            <Tooltip content={`${overflowCount} more member${overflowCount > 1 ? 's' : ''}`}>
                                <div className="room-presence__avatar room-presence__avatar--overflow">
                                    +{overflowCount}
                                </div>
                            </Tooltip>
                        )}
                    </div>
                )}

                {/* Chevron */}
                <ChevronDown
                    size={12}
                    className={`room-presence__chevron ${isOpen ? 'room-presence__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="room-presence__dropdown" role="listbox">
                    {/* Main Rooms */}
                    {groupedRooms.main?.length > 0 && (
                        <div className="room-presence__section">
                            <div className="room-presence__section-header" data-color="blue">
                                <Globe size={10} />
                                <span>Project Rooms</span>
                            </div>
                            {groupedRooms.main.map((r) => {
                                const isActive = room?.id === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        className={`room-presence__item ${isActive ? 'room-presence__item--active' : ''}`}
                                        onClick={() => handleRoomSelect(r)}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        <Globe size={12} className="room-presence__item-icon" />
                                        <span className="room-presence__item-name">{r.name}</span>
                                        {r.memberCount !== undefined && (
                                            <span className="room-presence__item-count">
                                                <Users size={10} />
                                                {r.memberCount}
                                            </span>
                                        )}
                                        {isActive && <Check size={12} className="room-presence__item-check" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Breakout Rooms */}
                    {groupedRooms.breakout?.length > 0 && (
                        <div className="room-presence__section">
                            <div className="room-presence__section-header" data-color="purple">
                                <GitBranch size={10} />
                                <span>Breakout Rooms</span>
                            </div>
                            {groupedRooms.breakout.map((r) => {
                                const isActive = room?.id === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        className={`room-presence__item ${isActive ? 'room-presence__item--active' : ''}`}
                                        onClick={() => handleRoomSelect(r)}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        <GitBranch size={12} className="room-presence__item-icon" />
                                        <span className="room-presence__item-name">{r.name}</span>
                                        {r.isLocked && <Lock size={10} className="room-presence__item-lock" />}
                                        {r.memberCount !== undefined && (
                                            <span className="room-presence__item-count">
                                                <Users size={10} />
                                                {r.memberCount}
                                            </span>
                                        )}
                                        {isActive && <Check size={12} className="room-presence__item-check" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Personal Spaces */}
                    {groupedRooms.personal?.length > 0 && (
                        <div className="room-presence__section">
                            <div className="room-presence__section-header" data-color="green">
                                <User size={10} />
                                <span>Personal Spaces</span>
                            </div>
                            {groupedRooms.personal.map((r) => {
                                const isActive = room?.id === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        className={`room-presence__item ${isActive ? 'room-presence__item--active' : ''}`}
                                        onClick={() => handleRoomSelect(r)}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        <User size={12} className="room-presence__item-icon" />
                                        <span className="room-presence__item-name">{r.name}</span>
                                        {isActive && <Check size={12} className="room-presence__item-check" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {availableRooms.length === 0 && !onCreateRoom && (
                        <div className="room-presence__empty">
                            No other rooms available
                        </div>
                    )}

                    {/* View All / Create Actions */}
                    <div className="room-presence__actions">
                        {onClick && (
                            <button
                                className="room-presence__action-btn"
                                onClick={() => { onClick(); setIsOpen(false); }}
                                type="button"
                            >
                                <Users size={12} />
                                <span>View All Rooms</span>
                            </button>
                        )}
                        {onCreateRoom && (
                            <button
                                className="room-presence__action-btn room-presence__action-btn--primary"
                                onClick={handleCreateRoom}
                                type="button"
                            >
                                <Plus size={12} />
                                <span>Create Room</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoomPresenceIndicator;