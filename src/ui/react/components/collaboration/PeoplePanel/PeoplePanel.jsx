// src/ui/react/components/collaboration/PeoplePanel/PeoplePanel.jsx
// Complete collaboration hub with user tree, breakout rooms, and status management

import React, { useState, useMemo } from "react";
import {
    Search,
    ChevronDown,
    ChevronRight,
    Circle,
    Users,
    Mic,
    MicOff,
    MessageSquare,
    Layout,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    Plus,
    LogOut,
    Settings,
    Clock,
    Moon,
    Coffee,
    XCircle,
    Edit3,
    Check,
    X,
    Volume2,
    VolumeX,
    UserPlus,
    Crown,
    MoreHorizontal
} from "lucide-react";

import { usePeoplePanel } from "./usePeoplePanel.js";
import { CreateRoomModal } from "./CreateRoomModal.jsx";
import { UserStatusEditor } from "./UserStatusEditor.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

import "./PeoplePanel.scss";

// =============================================================================
// STATUS CONFIGURATIONS
// =============================================================================

const STATUS_CONFIG = {
    online: { icon: Circle, color: "var(--status-online)", label: "Online", fill: true },
    idle: { icon: Clock, color: "var(--status-idle)", label: "Idle", fill: false },
    away: { icon: Coffee, color: "var(--status-away)", label: "Away", fill: false },
    dnd: { icon: XCircle, color: "var(--status-dnd)", label: "Do Not Disturb", fill: false },
    offline: { icon: Circle, color: "var(--status-offline)", label: "Offline", fill: false },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PeoplePanel() {
    // ---------------------------------------------------------------------------
    // STATE & HOOKS
    // ---------------------------------------------------------------------------

    const {
        // Current user
        currentUser,
        currentRoom,

        // User lists (grouped by status)
        onlineUsers,
        idleUsers,
        awayUsers,
        offlineUsers,

        // Breakout rooms
        breakoutRooms,

        // Actions
        updateMyStatus,
        updateMyStatusMessage,
        joinRoom,
        leaveRoom,
        requestRoomInvite,
        createRoom,
    } = usePeoplePanel();

    // Local UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSections, setExpandedSections] = useState({
        online: true,
        idle: true,
        away: false,
        offline: false,
        rooms: true,
    });
    const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
    const [showStatusEditor, setShowStatusEditor] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // ---------------------------------------------------------------------------
    // FILTERING
    // ---------------------------------------------------------------------------

    const filterBySearch = (items, keys = ["userName", "statusMessage"]) => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item =>
            keys.some(key => item[key]?.toLowerCase().includes(query))
        );
    };

    const filteredOnline = useMemo(() => filterBySearch(onlineUsers), [onlineUsers, searchQuery]);
    const filteredIdle = useMemo(() => filterBySearch(idleUsers), [idleUsers, searchQuery]);
    const filteredAway = useMemo(() => filterBySearch(awayUsers), [awayUsers, searchQuery]);
    const filteredOffline = useMemo(() => filterBySearch(offlineUsers), [offlineUsers, searchQuery]);
    const filteredRooms = useMemo(() =>
        filterBySearch(breakoutRooms, ["name", "description"]),
        [breakoutRooms, searchQuery]
    );

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleCreateRoom = (roomConfig) => {
        createRoom(roomConfig);
        setShowCreateRoomModal(false);
    };

    // ---------------------------------------------------------------------------
    // RENDER HELPERS
    // ---------------------------------------------------------------------------

    const renderStatusIcon = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
        const IconComponent = config.icon;
        return (
            <IconComponent
                size={10}
                color={config.color}
                fill={config.fill ? config.color : "none"}
                className="user-status-icon"
            />
        );
    };

    const renderUserRow = (user, options = {}) => {
        const { showLastSeen = false, showRoom = false } = options;
        const isYou = user.isYou;

        return (
            <div
                key={user.userId || user.odbc}
                className={`people-panel__user-row ${isYou ? "people-panel__user-row--you" : ""}`}
                onClick={() => !isYou && setSelectedUser(user)}
            >
                <UserAvatar
                    userName={user.userName}
                    color={user.userColor}
                    size="sm"
                />

                <div className="people-panel__user-info">
                    <div className="people-panel__user-name">
                        {renderStatusIcon(user.status)}
                        <span>{user.userName}</span>
                        {isYou && <span className="people-panel__you-badge">(You)</span>}
                        {user.isRoomOwner && <Crown size={12} className="people-panel__crown" />}
                    </div>

                    {user.statusMessage && (
                        <div className="people-panel__user-status-message">
                            {user.statusMessage}
                        </div>
                    )}

                    {showLastSeen && user.lastSeen && (
                        <div className="people-panel__user-last-seen">
                            Last seen: {formatLastSeen(user.lastSeen)}
                        </div>
                    )}

                    {showRoom && user.currentRoom && (
                        <div className="people-panel__user-room">
                            📍 {user.currentRoom}
                        </div>
                    )}
                </div>

                <div className="people-panel__user-indicators">
                    {user.inVoice && (
                        user.isMuted
                            ? <MicOff size={14} className="indicator--muted" />
                            : <Mic size={14} className="indicator--voice" />
                    )}
                </div>

                {isYou && (
                    <button
                        className="people-panel__edit-status-btn"
                        onClick={(e) => { e.stopPropagation(); setShowStatusEditor(true); }}
                        title="Edit your status"
                    >
                        <Edit3 size={14} />
                    </button>
                )}
            </div>
        );
    };

    const renderUserSection = (title, users, sectionKey, options = {}) => {
        const isExpanded = expandedSections[sectionKey];
        const count = users.length;

        if (count === 0 && !options.showEmpty) return null;

        return (
            <div className="people-panel__section">
                <button
                    className="people-panel__section-header"
                    onClick={() => toggleSection(sectionKey)}
                >
                    <span className="people-panel__section-chevron">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="people-panel__section-title">{title}</span>
                    <span className="people-panel__section-count">({count})</span>
                </button>

                {isExpanded && (
                    <div className="people-panel__section-content">
                        {count === 0 ? (
                            <div className="people-panel__empty-section">
                                No users {title.toLowerCase()}
                            </div>
                        ) : (
                            users.map(user => renderUserRow(user, options))
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderBreakoutRoom = (room) => {
        const isCurrentRoom = currentRoom?.id === room.id;
        const canJoin = room.access === "open" || room.members?.some(m => m.odbc === currentUser?.odbc);
        const isInvisible = room.access === "invisible" && !canJoin;

        // Don't show invisible rooms user can't access
        if (isInvisible) return null;

        return (
            <div
                key={room.id}
                className={`people-panel__room ${isCurrentRoom ? "people-panel__room--current" : ""}`}
            >
                <div className="people-panel__room-header">
                    <div className="people-panel__room-icon">
                        {room.hasVoice && <Volume2 size={14} />}
                        {!room.hasVoice && room.hasText && <MessageSquare size={14} />}
                        {!room.hasVoice && !room.hasText && <Layout size={14} />}
                    </div>

                    <div className="people-panel__room-info">
                        <div className="people-panel__room-name">
                            {room.access === "invite" && <Lock size={12} />}
                            {room.access === "open" && <Unlock size={12} />}
                            {room.access === "invisible" && <EyeOff size={12} />}
                            <span>{room.name}</span>
                            {room.isPersistent && (
                                <span className="people-panel__room-badge people-panel__room-badge--persistent">
                                    Persistent
                                </span>
                            )}
                        </div>
                        <div className="people-panel__room-members-preview">
                            {room.members?.slice(0, 3).map(m => m.userName).join(", ")}
                            {room.members?.length > 3 && ` +${room.members.length - 3} more`}
                            {(!room.members || room.members.length === 0) && "Empty"}
                        </div>
                    </div>

                    <div className="people-panel__room-actions">
                        {isCurrentRoom ? (
                            <button
                                className="people-panel__room-btn people-panel__room-btn--leave"
                                onClick={() => leaveRoom(room.id)}
                                title="Leave room"
                            >
                                <LogOut size={14} />
                            </button>
                        ) : canJoin ? (
                            <button
                                className="people-panel__room-btn people-panel__room-btn--join"
                                onClick={() => joinRoom(room.id)}
                                title="Join room"
                            >
                                Join
                            </button>
                        ) : (
                            <button
                                className="people-panel__room-btn people-panel__room-btn--request"
                                onClick={() => requestRoomInvite(room.id)}
                                title="Request invite"
                            >
                                <UserPlus size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ---------------------------------------------------------------------------
    // MAIN RENDER
    // ---------------------------------------------------------------------------

    return (
        <div className="people-panel">
            {/* Current Room Context */}
            {currentRoom && (
                <div className="people-panel__current-room">
                    <div className="people-panel__current-room-info">
                        <span className="people-panel__current-room-label">Currently in:</span>
                        <span className="people-panel__current-room-name">{currentRoom.name}</span>
                    </div>
                    <button
                        className="people-panel__current-room-leave"
                        onClick={() => leaveRoom(currentRoom.id)}
                        title="Leave current room"
                    >
                        <LogOut size={14} />
                        <span>Leave</span>
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="people-panel__search">
                <Search size={14} className="people-panel__search-icon" />
                <input
                    type="text"
                    placeholder="Search people or rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="people-panel__search-input"
                />
                {searchQuery && (
                    <button
                        className="people-panel__search-clear"
                        onClick={() => setSearchQuery("")}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="people-panel__content">
                {/* Room Members Section */}
                <div className="people-panel__group">
                    <div className="people-panel__group-header">
                        <Users size={14} />
                        <span>Room Members</span>
                    </div>

                    {renderUserSection("Online", filteredOnline, "online", { showRoom: true })}
                    {renderUserSection("Idle", filteredIdle, "idle", { showRoom: true })}
                    {renderUserSection("Away", filteredAway, "away", { showRoom: true })}
                    {renderUserSection("Offline", filteredOffline, "offline", {
                        showLastSeen: true,
                        showEmpty: true
                    })}
                </div>

                {/* Breakout Rooms Section */}
                <div className="people-panel__group">
                    <div className="people-panel__group-header">
                        <Layout size={14} />
                        <span>Breakout Rooms</span>
                        <button
                            className="people-panel__create-room-btn"
                            onClick={() => setShowCreateRoomModal(true)}
                            title="Create breakout room"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="people-panel__rooms-list">
                        {filteredRooms.length === 0 ? (
                            <div className="people-panel__empty-rooms">
                                <Layout size={24} strokeWidth={1.5} />
                                <p>No breakout rooms</p>
                                <span>Create one to collaborate in smaller groups</span>
                            </div>
                        ) : (
                            filteredRooms.map(room => renderBreakoutRoom(room))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCreateRoomModal && (
                <CreateRoomModal
                    onClose={() => setShowCreateRoomModal(false)}
                    onCreate={handleCreateRoom}
                    availableUsers={[...onlineUsers, ...idleUsers, ...awayUsers]}
                />
            )}

            {showStatusEditor && (
                <UserStatusEditor
                    currentStatus={currentUser?.status || "online"}
                    currentMessage={currentUser?.statusMessage || ""}
                    onSave={(status, message) => {
                        updateMyStatus(status);
                        updateMyStatusMessage(message);
                        setShowStatusEditor(false);
                    }}
                    onClose={() => setShowStatusEditor(false)}
                />
            )}
        </div>
    );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatLastSeen(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

export default PeoplePanel;