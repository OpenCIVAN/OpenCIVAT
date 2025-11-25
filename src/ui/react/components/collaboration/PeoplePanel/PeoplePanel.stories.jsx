// src/ui/react/components/collaboration/PeoplePanel/PeoplePanel.stories.jsx
import React, { useState } from "react";
import {
    Search,
    ChevronDown,
    ChevronRight,
    Circle,
    Users,
    Mic,
    MicOff,
    Layout,
    Lock,
    Unlock,
    Plus,
    LogOut,
    Clock,
    Coffee,
    XCircle,
    Edit3,
    Crown,
} from "lucide-react";
import { UserAvatar } from "./UserAvatar.jsx";
import "./PeoplePanel.scss";

export default {
    title: "Collaboration/PeoplePanel",
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ width: "320px", height: "600px", background: "#0a0a0f" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_USERS = {
    online: [
        { odbc: "user-1", userName: "Alice Chen", userColor: "#4CAF50", status: "online", isYou: true, inVoice: true, isMuted: false },
        { odbc: "user-2", userName: "Bob Smith", userColor: "#2196F3", status: "online", statusMessage: "Analyzing dataset 5", inVoice: true, isMuted: true },
        { odbc: "user-3", userName: "Carol Davis", userColor: "#FF9800", status: "online", inVoice: false },
    ],
    idle: [
        { odbc: "user-4", userName: "David Lee", userColor: "#9C27B0", status: "idle", statusMessage: "BRB in 5" },
    ],
    away: [
        { odbc: "user-5", userName: "Eva Martinez", userColor: "#E91E63", status: "away", statusMessage: "In a meeting" },
    ],
    offline: [
        { odbc: "user-6", userName: "Frank Wilson", userColor: "#607D8B", status: "offline", lastSeen: Date.now() - 3600000 },
        { odbc: "user-7", userName: "Grace Kim", userColor: "#795548", status: "offline", lastSeen: Date.now() - 86400000 },
    ],
};

const MOCK_ROOMS = [
    { id: "room-1", name: "Main Room", access: "open", hasVoice: true, members: MOCK_USERS.online.slice(0, 2), isPersistent: true },
    { id: "room-2", name: "Data Analysis", access: "invite", hasVoice: true, members: [MOCK_USERS.online[2]], isPersistent: false },
];

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG = {
    online: { icon: Circle, color: "#4CAF50", fill: true },
    idle: { icon: Clock, color: "#FF9800", fill: false },
    away: { icon: Coffee, color: "#808080", fill: false },
    dnd: { icon: XCircle, color: "#f44336", fill: false },
    offline: { icon: Circle, color: "#404040", fill: false },
};

// =============================================================================
// MOCK COMPONENT (simplified without hooks)
// =============================================================================

const MockPeoplePanel = ({
    onlineUsers = MOCK_USERS.online,
    idleUsers = MOCK_USERS.idle,
    awayUsers = MOCK_USERS.away,
    offlineUsers = MOCK_USERS.offline,
    rooms = MOCK_ROOMS,
    currentRoom = MOCK_ROOMS[0],
    showCurrentRoom = false,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSections, setExpandedSections] = useState({
        online: true,
        idle: true,
        away: false,
        offline: false,
    });

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const renderStatusIcon = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
        const IconComponent = config.icon;
        return (
            <IconComponent
                size={10}
                color={config.color}
                fill={config.fill ? config.color : "none"}
            />
        );
    };

    const renderUserRow = (user) => (
        <div
            key={user.odbc}
            className={`people-panel__user-row ${user.isYou ? "people-panel__user-row--you" : ""}`}
        >
            <UserAvatar userName={user.userName} color={user.userColor} size="sm" />
            <div className="people-panel__user-info">
                <div className="people-panel__user-name">
                    {renderStatusIcon(user.status)}
                    <span>{user.userName}</span>
                    {user.isYou && <span className="people-panel__you-badge">(You)</span>}
                    {user.isRoomOwner && <Crown size={12} className="people-panel__crown" />}
                </div>
                {user.statusMessage && (
                    <div className="people-panel__user-status-message">{user.statusMessage}</div>
                )}
            </div>
            <div className="people-panel__user-indicators">
                {user.inVoice && (
                    user.isMuted
                        ? <MicOff size={14} className="indicator--muted" />
                        : <Mic size={14} className="indicator--voice" />
                )}
            </div>
            {user.isYou && (
                <button className="people-panel__edit-status-btn" title="Edit your status">
                    <Edit3 size={14} />
                </button>
            )}
        </div>
    );

    const renderSection = (title, users, sectionKey) => {
        const isExpanded = expandedSections[sectionKey];
        if (users.length === 0) return null;

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
                    <span className="people-panel__section-count">({users.length})</span>
                </button>
                {isExpanded && (
                    <div className="people-panel__section-content">
                        {users.map(renderUserRow)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="people-panel">
            {/* Current Room Context */}
            {showCurrentRoom && currentRoom && (
                <div className="people-panel__current-room">
                    <div className="people-panel__current-room-info">
                        <span className="people-panel__current-room-label">Currently in:</span>
                        <span className="people-panel__current-room-name">{currentRoom.name}</span>
                    </div>
                    <button className="people-panel__current-room-leave" title="Leave current room">
                        <LogOut size={14} />
                        <span>Leave</span>
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="people-panel__search">
                <Search size={14} className="people-panel__search-icon" />
                <input
                    type="text"
                    placeholder="Search people or rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="people-panel__search-input"
                />
            </div>

            {/* Content */}
            <div className="people-panel__content">
                <div className="people-panel__group">
                    <div className="people-panel__group-header">
                        <Users size={14} />
                        <span>Room Members</span>
                    </div>
                    {renderSection("Online", onlineUsers, "online")}
                    {renderSection("Idle", idleUsers, "idle")}
                    {renderSection("Away", awayUsers, "away")}
                    {renderSection("Offline", offlineUsers, "offline")}
                </div>

                <div className="people-panel__group">
                    <div className="people-panel__group-header">
                        <Layout size={14} />
                        <span>Breakout Rooms</span>
                        <button className="people-panel__create-room-btn" title="Create breakout room">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="people-panel__rooms-list">
                        {rooms.map((room) => (
                            <div key={room.id} className={`people-panel__room ${room.id === currentRoom?.id ? "people-panel__room--current" : ""}`}>
                                <div className="people-panel__room-header">
                                    <div className="people-panel__room-icon">
                                        {room.access === "invite" ? <Lock size={14} /> : <Unlock size={14} />}
                                    </div>
                                    <div className="people-panel__room-info">
                                        <div className="people-panel__room-name">
                                            <span>{room.name}</span>
                                            {room.isPersistent && (
                                                <span className="people-panel__room-badge people-panel__room-badge--persistent">
                                                    Persistent
                                                </span>
                                            )}
                                        </div>
                                        <div className="people-panel__room-members-preview">
                                            {room.members?.map((m) => m.userName).join(", ") || "Empty"}
                                        </div>
                                    </div>
                                    <div className="people-panel__room-actions">
                                        {room.id === currentRoom?.id ? (
                                            <button className="people-panel__room-btn people-panel__room-btn--leave">
                                                <LogOut size={14} />
                                            </button>
                                        ) : (
                                            <button className="people-panel__room-btn people-panel__room-btn--join">
                                                Join
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    render: () => <MockPeoplePanel />,
};

export const WithCurrentRoom = {
    render: () => <MockPeoplePanel showCurrentRoom={true} />,
};

export const FewOnlineUsers = {
    render: () => (
        <MockPeoplePanel
            onlineUsers={[MOCK_USERS.online[0]]}
            idleUsers={[]}
            awayUsers={[]}
            offlineUsers={MOCK_USERS.offline}
        />
    ),
};

export const ManyUsers = {
    render: () => (
        <MockPeoplePanel
            onlineUsers={[
                ...MOCK_USERS.online,
                { odbc: "user-8", userName: "Henry Johnson", userColor: "#00BCD4", status: "online" },
                { odbc: "user-9", userName: "Ivy Brown", userColor: "#8BC34A", status: "online" },
                { odbc: "user-10", userName: "Jack Taylor", userColor: "#CDDC39", status: "online" },
            ]}
            idleUsers={MOCK_USERS.idle}
            awayUsers={MOCK_USERS.away}
            offlineUsers={MOCK_USERS.offline}
        />
    ),
};

export const NoBreakoutRooms = {
    render: () => (
        <MockPeoplePanel rooms={[]} />
    ),
};

export const AllSectionsExpanded = {
    render: () => {
        const AllExpanded = () => {
            const [expandedSections] = useState({
                online: true,
                idle: true,
                away: true,
                offline: true,
            });

            return (
                <MockPeoplePanel
                    onlineUsers={MOCK_USERS.online}
                    idleUsers={MOCK_USERS.idle}
                    awayUsers={MOCK_USERS.away}
                    offlineUsers={MOCK_USERS.offline}
                />
            );
        };
        return <AllExpanded />;
    },
};

export const VoiceIndicators = {
    render: () => (
        <MockPeoplePanel
            onlineUsers={[
                { odbc: "user-1", userName: "Speaking", userColor: "#4CAF50", status: "online", inVoice: true, isMuted: false },
                { odbc: "user-2", userName: "Muted", userColor: "#2196F3", status: "online", inVoice: true, isMuted: true },
                { odbc: "user-3", userName: "Not in Voice", userColor: "#FF9800", status: "online", inVoice: false },
            ]}
            idleUsers={[]}
            awayUsers={[]}
            offlineUsers={[]}
        />
    ),
};

export const StatusMessages = {
    render: () => (
        <MockPeoplePanel
            onlineUsers={[
                { odbc: "user-1", userName: "Alice", userColor: "#4CAF50", status: "online", statusMessage: "Working on the neural network model", isYou: true },
                { odbc: "user-2", userName: "Bob", userColor: "#2196F3", status: "online", statusMessage: "Reviewing pull request #42" },
            ]}
            idleUsers={[
                { odbc: "user-3", userName: "Carol", userColor: "#FF9800", status: "idle", statusMessage: "Lunch break - back in 30" },
            ]}
            awayUsers={[
                { odbc: "user-4", userName: "David", userColor: "#9C27B0", status: "away", statusMessage: "In a meeting until 3pm" },
            ]}
            offlineUsers={[]}
        />
    ),
};