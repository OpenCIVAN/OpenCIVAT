// src/ui/react/components/navigation/RoomSelector/RoomSelector.jsx
// Room selector dropdown for Space Navigation system
// Shows current room with online count, allows switching rooms

import React, { memo } from 'react';
import {
    Home,
    ChevronDown,
    Users,
    Plus,
    Settings,
    LogOut,
    Trash2,
} from 'lucide-react';
import { useRoomSelector } from './RoomSelector.logic.js';
import { useRoomUserCount } from '@UI/react/hooks/useRoomPresence.js';
import { CreateRoomModal } from '@UI/react/components/modals/CreateRoomModal';
import './RoomSelector.scss';

/**
 * RoomItem - A single room in the dropdown list
 * Uses div instead of button to avoid nesting issues with delete button
 */
const RoomItem = memo(function RoomItem({
    room,
    isSelected,
    onSelect,
    onDelete,
    showActions = false,
}) {
    const onlineCount = useRoomUserCount(room.id);
    const isMain = room.room_type === 'main';

    return (
        <div
            className={`room-item ${isSelected ? 'room-item--selected' : ''}`}
            onClick={() => onSelect(room.id, room.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(room.id, room.name);
                }
            }}
        >
            <div className="room-item__indicator">
                {isSelected && <span className="room-item__dot" />}
            </div>
            <span className="room-item__name">{room.name}</span>
            <span className="room-item__count">({onlineCount})</span>

            {showActions && !isMain && (
                <button
                    className="room-item__delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(room.id);
                    }}
                    title="Delete room"
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
});

/**
 * RoomSelector - Main dropdown component
 */
export const RoomSelector = memo(function RoomSelector({
    projectId,
    onRoomChange,
    compact = false,
}) {
    const {
        isOpen,
        showCreateModal,
        currentRoom,
        mainRoom,
        breakoutRooms,
        loading,
        toggleOpen,
        closeDropdown,
        selectRoom,
        createRoom,
        deleteRoom,
        openCreateModal,
        closeCreateModal,
    } = useRoomSelector({ projectId, onRoomChange });

    const onlineCount = useRoomUserCount(currentRoom?.id);

    if (loading && !currentRoom) {
        return (
            <div className="room-selector room-selector--loading">
                <span>Loading...</span>
            </div>
        );
    }

    return (
        <div className="room-selector">
            {/* Trigger Button */}
            <button
                className={`room-selector__trigger ${compact ? 'room-selector__trigger--compact' : ''}`}
                onClick={toggleOpen}
            >
                <Home size={14} className="room-selector__icon" />
                {!compact && (
                    <>
                        <span className="room-selector__name">
                            {currentRoom?.name || 'Select Room'}
                        </span>
                        <span className="room-selector__count">({onlineCount})</span>
                    </>
                )}
                <ChevronDown
                    size={12}
                    className={`room-selector__chevron ${isOpen ? 'room-selector__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="room-selector__backdrop" onClick={closeDropdown} />
                    <div className="room-selector__dropdown">
                        {/* Main Room */}
                        {mainRoom && (
                            <RoomItem
                                room={mainRoom}
                                isSelected={currentRoom?.id === mainRoom.id}
                                onSelect={selectRoom}
                                onDelete={deleteRoom}
                            />
                        )}

                        {/* Breakout Rooms */}
                        {breakoutRooms.length > 0 && (
                            <>
                                <div className="room-selector__divider" />
                                {breakoutRooms.map((room) => (
                                    <RoomItem
                                        key={room.id}
                                        room={room}
                                        isSelected={currentRoom?.id === room.id}
                                        onSelect={selectRoom}
                                        onDelete={deleteRoom}
                                        showActions={room.my_role === 'admin'}
                                    />
                                ))}
                            </>
                        )}

                        {/* Actions */}
                        <div className="room-selector__divider" />
                        <button
                            className="room-selector__action"
                            onClick={openCreateModal}
                        >
                            <Plus size={12} />
                            <span>Create Breakout Room</span>
                        </button>

                        {/* Room Settings - show only for room admins */}
                        {currentRoom?.my_role === 'admin' && (
                            <button className="room-selector__action">
                                <Settings size={12} />
                                <span>Room Settings</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Create Room Modal */}
            {showCreateModal && (
                <CreateRoomModal
                    isOpen={showCreateModal}
                    onClose={closeCreateModal}
                    onCreate={createRoom}
                    availableUsers={[]} // Add if needed
                />
            )}
        </div>
    );
});

export default RoomSelector;