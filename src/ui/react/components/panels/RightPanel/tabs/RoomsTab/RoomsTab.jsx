/**
 * @file RoomsTab.jsx
 * @description Breakout rooms management for spatial organization.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Room list with project, breakout, and personal rooms
 * - Current location indicator
 * - Create new breakout rooms
 * - Join/leave rooms with voice integration
 * - Room settings and permissions
 *
 * @see Right_Panel_Design_Specification.md - Rooms Tab section
 *
 * @example
 * <RoomsTab workspaceId="ws-1" />
 */

import React from 'react';
import { Plus, Globe, Layout, Search, X } from 'lucide-react';
import { ResizableSections } from '@UI/react/components/common/ResizableSections';

import { useRoomsTab } from './hooks/useRoomsTab';
import { CurrentRoomIndicator } from './components/CurrentRoomIndicator';
import { RoomCard } from './components/RoomCard';
import { CreateRoomForm } from './components/CreateRoomForm';

import './RoomsTab.scss';

// =============================================================================
// ROOM GROUP ICONS
// =============================================================================

const GROUP_ICONS = {
    project: Globe,
    breakout: Layout,
    personal: Layout,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} RoomsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Rooms tab component.
 * Provides breakout room management and navigation.
 *
 * @param {RoomsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function RoomsTab({ workspaceId }) {
    const {
        rooms,
        currentRoom,
        searchQuery,
        setSearchQuery,
        showCreateForm,
        setShowCreateForm,
        groupedRooms,
        handleJoinRoom,
        handleLeaveRoom,
        handleCreateRoom,
        handleDeleteRoom,
    } = useRoomsTab();

    // Section definitions
    const sections = [
        {
            id: 'current',
            title: 'Current Location',
            defaultHeight: 80,
            minHeight: 60,
            content: (
                <CurrentRoomIndicator
                    room={currentRoom}
                    onLeave={() => handleLeaveRoom(currentRoom?.id)}
                />
            ),
        },
        {
            id: 'rooms',
            title: `Rooms (${rooms.length})`,
            defaultHeight: 400,
            minHeight: 200,
            headerActions: (
                <button
                    className="rooms-section__create-btn"
                    onClick={() => setShowCreateForm(true)}
                    title="Create breakout room"
                >
                    <Plus size={14} />
                </button>
            ),
            content: (
                <div className="rooms-list">
                    {/* Search */}
                    <div className="rooms-list__search">
                        <Search size={12} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search rooms..."
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}>
                                <X size={10} />
                            </button>
                        )}
                    </div>

                    {/* Create form */}
                    {showCreateForm && (
                        <CreateRoomForm
                            onSubmit={handleCreateRoom}
                            onCancel={() => setShowCreateForm(false)}
                        />
                    )}

                    {/* Room groups */}
                    {['project', 'breakout', 'personal'].map(type => {
                        const roomsOfType = groupedRooms[type];
                        if (roomsOfType.length === 0) return null;

                        const GroupIcon = GROUP_ICONS[type];
                        const labels = {
                            project: 'Project Rooms',
                            breakout: 'Breakout Rooms',
                            personal: 'Personal Spaces',
                        };

                        return (
                            <div key={type} className="rooms-list__group">
                                <div className="rooms-list__group-header">
                                    <GroupIcon size={12} />
                                    {labels[type]}
                                </div>
                                {roomsOfType.map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        onJoin={handleJoinRoom}
                                        onLeave={handleLeaveRoom}
                                        onSettings={() => { }}
                                        onDelete={handleDeleteRoom}
                                    />
                                ))}
                            </div>
                        );
                    })}

                    {/* Empty state */}
                    {rooms.length === 0 && (
                        <div className="rooms-list__empty">
                            <Layout size={24} />
                            <span>No rooms available</span>
                            <button onClick={() => setShowCreateForm(true)}>
                                <Plus size={12} />
                                Create Room
                            </button>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="rooms-panel">
            <ResizableSections sections={sections} />
        </div>
    );
}

// Export with both names for backwards compatibility
export { RoomsTab as RoomsPanelContent };
export default RoomsTab;