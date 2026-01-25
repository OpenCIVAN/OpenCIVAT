/**
 * @file RoomHeader.jsx
 * @description Room-level navigation bar with voice controls, presence, and chat access.
 *
 * Features:
 * - Room tabs with viewing (eye icon) and voice (mic icon) indicators
 * - Max 3 visible tabs with overflow dropdown
 * - Voice dropdown to switch rooms or leave
 * - Presence indicator showing online users
 * - Chat button with unread badge
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Icon } from '@UI/react/components/atoms';
import { RoomTab } from './RoomTab';
import { VoiceDropdown } from './VoiceDropdown';
import {
    useRoomPrioritization,
    useVoiceState,
    useDropdowns,
} from './RoomHeader.logic';
import './RoomHeader.scss';

/**
 * RoomHeader - Main component
 */
const RoomHeader = memo(function RoomHeader({
    rooms = [],
    viewingRoomId,
    voiceRoomId,
    onSelectRoom,
    onJoinVoice,
    onLeaveVoice,
    onSwitchVoice,
    isMuted = false,
    onToggleMute,
    unreadMessages = 0,
    onOpenChat,
    onCreateRoom,
}) {
    const { visibleRooms, overflowRooms } = useRoomPrioritization(
        rooms,
        viewingRoomId,
        voiceRoomId
    );

    const { voiceRoom, isInVoice, availableVoiceRooms } = useVoiceState(
        rooms,
        voiceRoomId
    );

    const {
        showMoreRooms,
        showVoiceDropdown,
        setShowMoreRooms,
        toggleMoreRooms,
        toggleVoiceDropdown,
        closeAllDropdowns,
    } = useDropdowns();

    const viewingRoom = rooms.find(r => r.id === viewingRoomId);

    const handleRoomSelect = useCallback((roomId) => {
        onSelectRoom?.(roomId);
        closeAllDropdowns();
    }, [onSelectRoom, closeAllDropdowns]);

    const handleJoinVoice = useCallback(() => {
        onJoinVoice?.(viewingRoomId);
    }, [onJoinVoice, viewingRoomId]);

    return (
        <div className="room-header">
            {/* Room Tabs */}
            <div className="room-header__tabs">
                {visibleRooms.map(room => (
                    <RoomTab
                        key={room.id}
                        room={room}
                        viewingRoomId={viewingRoomId}
                        voiceRoomId={voiceRoomId}
                        onSelect={handleRoomSelect}
                    />
                ))}

                {/* Overflow dropdown */}
                {overflowRooms.length > 0 && (
                    <div className="room-header__overflow">
                        <button
                            className="room-header__overflow-trigger"
                            onClick={toggleMoreRooms}
                        >
                            <span>+{overflowRooms.length} more</span>
                            <Icon name="chevronDown" size={12} />
                        </button>

                        {showMoreRooms && (
                            <div className="room-header__overflow-dropdown">
                                {overflowRooms.map(room => (
                                    <button
                                        key={room.id}
                                        className="room-header__overflow-item"
                                        onClick={() => handleRoomSelect(room.id)}
                                    >
                                        <span
                                            className="room-header__overflow-dot"
                                            style={{ background: room.color }}
                                        />
                                        <span>{room.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Create room button */}
                <Button
                    variant="ghost"
                    size="sm"
                    icon="plus"
                    onClick={onCreateRoom}
                    className="room-header__create-btn"
                />
            </div>

            <div className="room-header__spacer" />

            {/* Presence indicator */}
            <div className="room-header__presence">
                <Icon name="users" size={14} />
                <span>{viewingRoom?.usersOnline || 0}</span>
            </div>

            <div className="room-header__separator" />

            {/* Voice controls */}
            <div className="room-header__voice">
                {isInVoice ? (
                    <>
                        <button
                            className="room-header__voice-active"
                            onClick={toggleVoiceDropdown}
                        >
                            <Icon name="mic" size={14} />
                            <span>In: {voiceRoom?.name}</span>
                            <Icon name="chevronDown" size={12} />
                        </button>

                        <VoiceDropdown
                            isOpen={showVoiceDropdown}
                            onClose={() => closeAllDropdowns()}
                            voiceRoom={voiceRoom}
                            availableRooms={availableVoiceRooms}
                            onSwitchVoice={onSwitchVoice}
                            onLeaveVoice={onLeaveVoice}
                        />
                    </>
                ) : (
                    <button
                        className="room-header__voice-join"
                        onClick={handleJoinVoice}
                    >
                        <Icon name="phone" size={14} />
                        <span>Join Voice</span>
                    </button>
                )}

                {/* Mute button when in voice */}
                {isInVoice && (
                    <Button
                        variant={isMuted ? 'danger' : 'ghost'}
                        size="sm"
                        icon={isMuted ? 'micOff' : 'mic'}
                        onClick={onToggleMute}
                        className={`room-header__mute ${isMuted ? 'room-header__mute--muted' : ''}`}
                    />
                )}
            </div>

            <div className="room-header__separator" />

            {/* Chat button */}
            <div className="room-header__chat">
                <Button
                    variant="ghost"
                    size="sm"
                    icon="messageSquare"
                    onClick={onOpenChat}
                    className="room-header__chat-btn"
                />
                {unreadMessages > 0 && (
                    <span className="room-header__chat-badge">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                )}
            </div>
        </div>
    );
});

RoomHeader.propTypes = {
    rooms: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired,
        usersOnline: PropTypes.number,
    })),
    viewingRoomId: PropTypes.string,
    voiceRoomId: PropTypes.string,
    onSelectRoom: PropTypes.func,
    onJoinVoice: PropTypes.func,
    onLeaveVoice: PropTypes.func,
    onSwitchVoice: PropTypes.func,
    isMuted: PropTypes.bool,
    onToggleMute: PropTypes.func,
    unreadMessages: PropTypes.number,
    onOpenChat: PropTypes.func,
    onCreateRoom: PropTypes.func,
};

export { RoomHeader };
export default RoomHeader;
