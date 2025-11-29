// src/ui/react/components/panels/RightPanel/tabs/RoomsTab.jsx
// Breakout rooms management tab for the right panel
// Allows creating, joining, and managing breakout rooms

import React, { useState, useCallback, useMemo } from 'react';
import {
    Plus,
    Search,
    Users,
    Lock,
    Unlock,
    EyeOff,
    Volume2,
    MessageSquare,
    Layout,
    LogOut,
    UserPlus,
    Crown,
    Settings,
    Trash2,
    X,
    ChevronDown,
    ChevronRight,
    Clock,
    Globe,
    Briefcase,
    User as UserIcon,
} from 'lucide-react';
import { ResizableSectionsContainer } from "@UI/react/components/common/ResizableSections";

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_CURRENT_USER = {
    id: 'current',
    name: 'You',
    color: '#2dd4bf',
};

const SAMPLE_ROOMS = [
    {
        id: 'main',
        name: 'Main Room',
        type: 'project',
        access: 'open',
        hasVoice: true,
        hasText: true,
        isPersistent: true,
        members: [
            { id: 'u1', name: 'Dr. Smith', color: '#fb7185', isOwner: true },
            { id: 'u2', name: 'Dr. Jones', color: '#fbbf24' },
            { id: 'current', name: 'You', color: '#2dd4bf' },
        ],
        isCurrentRoom: true,
    },
    {
        id: 'breakout-1',
        name: 'Tumor Analysis',
        type: 'breakout',
        access: 'open',
        hasVoice: true,
        hasText: true,
        isPersistent: false,
        members: [
            { id: 'u3', name: 'Alice Chen', color: '#60a5fa', isOwner: true },
            { id: 'u4', name: 'Bob Wilson', color: '#c084fc' },
        ],
        isCurrentRoom: false,
    },
    {
        id: 'breakout-2',
        name: 'Private Discussion',
        type: 'breakout',
        access: 'invite',
        hasVoice: false,
        hasText: true,
        isPersistent: false,
        members: [
            { id: 'u1', name: 'Dr. Smith', color: '#fb7185', isOwner: true },
        ],
        isCurrentRoom: false,
    },
    {
        id: 'personal-1',
        name: 'My Scratch Space',
        type: 'personal',
        access: 'invisible',
        hasVoice: false,
        hasText: false,
        isPersistent: true,
        members: [
            { id: 'current', name: 'You', color: '#2dd4bf', isOwner: true },
        ],
        isCurrentRoom: false,
    },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * CurrentRoomIndicator - Shows where the user currently is
 */
function CurrentRoomIndicator({ room, onLeave }) {
    if (!room) return null;

    const getTypeIcon = () => {
        switch (room.type) {
            case 'project': return Globe;
            case 'breakout': return Briefcase;
            case 'personal': return UserIcon;
            default: return Layout;
        }
    };

    const TypeIcon = getTypeIcon();

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

/**
 * RoomCard - Individual room display
 */
function RoomCard({ room, onJoin, onLeave, onSettings, onDelete }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getAccessIcon = () => {
        switch (room.access) {
            case 'open': return Unlock;
            case 'invite': return Lock;
            case 'invisible': return EyeOff;
            default: return Unlock;
        }
    };

    const getTypeIcon = () => {
        switch (room.type) {
            case 'project': return Globe;
            case 'breakout': return Briefcase;
            case 'personal': return UserIcon;
            default: return Layout;
        }
    };

    const AccessIcon = getAccessIcon();
    const TypeIcon = getTypeIcon();

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

/**
 * CreateRoomForm - Inline form for creating new rooms
 */
function CreateRoomForm({ onSubmit, onCancel }) {
    const [name, setName] = useState('');
    const [access, setAccess] = useState('open');
    const [hasVoice, setHasVoice] = useState(true);
    const [hasText, setHasText] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit({ name, access, hasVoice, hasText });
        }
    };

    return (
        <form className="create-room-form" onSubmit={handleSubmit}>
            <div className="create-room-form__header">
                <span>Create Breakout Room</span>
                <button type="button" onClick={onCancel}>
                    <X size={14} />
                </button>
            </div>

            <div className="create-room-form__field">
                <label>Room Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Deep Dive Discussion"
                    autoFocus
                />
            </div>

            <div className="create-room-form__field">
                <label>Access</label>
                <div className="create-room-form__access-options">
                    <button
                        type="button"
                        className={access === 'open' ? 'active' : ''}
                        onClick={() => setAccess('open')}
                    >
                        <Unlock size={12} />
                        Open
                    </button>
                    <button
                        type="button"
                        className={access === 'invite' ? 'active' : ''}
                        onClick={() => setAccess('invite')}
                    >
                        <Lock size={12} />
                        Invite Only
                    </button>
                    <button
                        type="button"
                        className={access === 'invisible' ? 'active' : ''}
                        onClick={() => setAccess('invisible')}
                    >
                        <EyeOff size={12} />
                        Private
                    </button>
                </div>
            </div>

            <div className="create-room-form__field">
                <label>Features</label>
                <div className="create-room-form__features">
                    <label className="create-room-form__checkbox">
                        <input
                            type="checkbox"
                            checked={hasVoice}
                            onChange={(e) => setHasVoice(e.target.checked)}
                        />
                        <Volume2 size={12} />
                        Voice Chat
                    </label>
                    <label className="create-room-form__checkbox">
                        <input
                            type="checkbox"
                            checked={hasText}
                            onChange={(e) => setHasText(e.target.checked)}
                        />
                        <MessageSquare size={12} />
                        Text Chat
                    </label>
                </div>
            </div>

            <div className="create-room-form__actions">
                <button type="button" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" disabled={!name.trim()}>
                    Create Room
                </button>
            </div>
        </form>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RoomsPanelContent({ workspaceId }) {
    // State
    const [rooms, setRooms] = useState(SAMPLE_ROOMS);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Get current room
    const currentRoom = useMemo(() => {
        return rooms.find(r => r.isCurrentRoom);
    }, [rooms]);

    // Filter rooms by search and group by type
    const groupedRooms = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const filtered = rooms.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.members.some(m => m.name.toLowerCase().includes(query))
        );

        return {
            project: filtered.filter(r => r.type === 'project'),
            breakout: filtered.filter(r => r.type === 'breakout'),
            personal: filtered.filter(r => r.type === 'personal'),
        };
    }, [rooms, searchQuery]);

    // Handlers
    const handleJoinRoom = useCallback((roomId) => {
        setRooms(prev => prev.map(r => ({
            ...r,
            isCurrentRoom: r.id === roomId,
            members: r.id === roomId && !r.members.find(m => m.id === 'current')
                ? [...r.members, SAMPLE_CURRENT_USER]
                : r.members,
        })));
    }, []);

    const handleLeaveRoom = useCallback((roomId) => {
        // When leaving, go back to main room
        setRooms(prev => prev.map(r => ({
            ...r,
            isCurrentRoom: r.id === 'main',
            members: r.id === roomId
                ? r.members.filter(m => m.id !== 'current')
                : r.members,
        })));
    }, []);

    const handleCreateRoom = useCallback((config) => {
        const newRoom = {
            id: `breakout-${Date.now()}`,
            name: config.name,
            type: 'breakout',
            access: config.access,
            hasVoice: config.hasVoice,
            hasText: config.hasText,
            isPersistent: false,
            members: [{ ...SAMPLE_CURRENT_USER, isOwner: true }],
            isCurrentRoom: false,
        };
        setRooms(prev => [...prev, newRoom]);
        setShowCreateForm(false);
    }, []);

    const handleDeleteRoom = useCallback((roomId) => {
        setRooms(prev => prev.filter(r => r.id !== roomId));
    }, []);

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

                    {/* Project Rooms */}
                    {groupedRooms.project.length > 0 && (
                        <div className="rooms-list__group">
                            <div className="rooms-list__group-header">
                                <Globe size={12} />
                                Project Rooms
                            </div>
                            {groupedRooms.project.map(room => (
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
                    )}

                    {/* Breakout Rooms */}
                    {groupedRooms.breakout.length > 0 && (
                        <div className="rooms-list__group">
                            <div className="rooms-list__group-header">
                                <Briefcase size={12} />
                                Breakout Rooms
                            </div>
                            {groupedRooms.breakout.map(room => (
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
                    )}

                    {/* Personal Spaces */}
                    {groupedRooms.personal.length > 0 && (
                        <div className="rooms-list__group">
                            <div className="rooms-list__group-header">
                                <UserIcon size={12} />
                                Personal Spaces
                            </div>
                            {groupedRooms.personal.map(room => (
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
                    )}

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
            <ResizableSectionContainer sections={sections} />
        </div>
    );
}

export default RoomsPanelContent;