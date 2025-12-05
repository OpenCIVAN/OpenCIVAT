// src/ui/react/components/panels/RightPanel/tabs/PeopleTab.jsx
// People tab with Room/Workspace subtabs for Space Navigation system
// Shows users filtered by room or workspace context

import React, { useState, useCallback, useMemo } from 'react';
import {
    Users,
    Search,
    X,
    UserPlus,
    Settings,
    Coffee,
    Circle,
    Mic,
    MicOff,
    Headphones,
    MoreHorizontal,
    Hand,
    MessageSquare,
    Eye,
    EyeOff,
    Crown,
    Globe,
    User as UserIcon,
    Briefcase,
    ChevronDown,
    ChevronRight,
    Home,
    Layout,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";
import { usePresence } from '@UI/react/hooks/usePresence.js';
import { useRoomPresence, useWorkspacePresence } from '@UI/react/hooks/useRoomPresence.js';
import { createLogger } from '@Utils/logger.js';

const log = createLogger('presence');

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG = {
    active: { icon: Circle, color: '#4ade80', fill: true, label: 'Active' },
    online: { icon: Circle, color: '#4ade80', fill: true, label: 'Online' },
    idle: { icon: Circle, color: '#fbbf24', fill: true, label: 'Idle' },
    away: { icon: Circle, color: '#94a3b8', fill: false, label: 'Away' },
    dnd: { icon: Circle, color: '#ef4444', fill: true, label: 'Do Not Disturb' },
    offline: { icon: Circle, color: '#475569', fill: false, label: 'Offline' },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * UserAvatar - User avatar with status indicator
 */
function UserAvatar({ userName, color, status = 'active', size = 'md' }) {
    const initial = (userName || 'U')[0].toUpperCase();
    const sizeMap = { sm: 28, md: 32, lg: 40 };
    const dimension = sizeMap[size] || sizeMap.md;
    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

    return (
        <div
            className="user-avatar"
            style={{
                width: dimension,
                height: dimension,
                borderRadius: '50%',
                background: color || '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: dimension * 0.4,
                fontWeight: 600,
                position: 'relative',
                flexShrink: 0,
            }}
        >
            {initial}
            {/* Status indicator */}
            <div
                style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: statusConfig.fill ? statusConfig.color : 'transparent',
                    border: `2px solid ${statusConfig.color}`,
                    boxShadow: '0 0 0 2px var(--color-bg-secondary, #1a1a1a)',
                }}
            />
        </div>
    );
}

/**
 * MemberRow - Individual user row
 */
function MemberRow({ user, isSelected, onSelect }) {
    const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.active;

    return (
        <div
            className={`member-row ${isSelected ? 'member-row--selected' : ''} ${user.isYou ? 'member-row--you' : ''}`}
            onClick={() => onSelect?.(user.clientId)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'background 0.15s ease',
            }}
        >
            <UserAvatar
                userName={user.userName}
                color={user.userColor}
                status={user.status}
                size="sm"
            />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary, #e0e0e0)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {user.userName}
                    </span>
                    {user.isYou && (
                        <span style={{
                            fontSize: '9px',
                            padding: '2px 4px',
                            background: 'rgba(96,165,250,0.2)',
                            color: '#60a5fa',
                            borderRadius: '3px',
                            fontWeight: 600,
                        }}>
                            YOU
                        </span>
                    )}
                </div>
                <div style={{
                    fontSize: '10px',
                    color: 'var(--color-text-muted, #666)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    <Circle
                        size={6}
                        fill={statusConfig.fill ? statusConfig.color : 'none'}
                        color={statusConfig.color}
                    />
                    {statusConfig.label}
                </div>
            </div>

            {/* Voice indicators */}
            {user.inVoice && (
                <div style={{ display: 'flex', gap: '4px' }}>
                    {user.isMuted ? (
                        <MicOff size={12} style={{ color: '#ef4444' }} />
                    ) : (
                        <Mic size={12} style={{ color: '#4ade80' }} />
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * EmptyState - Shown when no users
 */
function EmptyState({ message }) {
    return (
        <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--color-text-muted, #666)',
            fontSize: '12px',
        }}>
            {message}
        </div>
    );
}

// =============================================================================
// SUBTAB COMPONENTS
// =============================================================================

/**
 * SubtabToggle - Toggle between Room and Workspace subtabs
 */
function SubtabToggle({ activeTab, onChange }) {
    return (
        <div className="subtab-toggle" style={{
            display: 'flex',
            gap: '2px',
            padding: '4px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            margin: '8px 12px',
        }}>
            <button
                className={`subtab-btn ${activeTab === 'room' ? 'subtab-btn--active' : ''}`}
                onClick={() => onChange('room')}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: activeTab === 'room' ? 'rgba(96,165,250,0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: activeTab === 'room' ? '#60a5fa' : 'var(--color-text-muted, #666)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}
            >
                <Home size={12} />
                Room
            </button>
            <button
                className={`subtab-btn ${activeTab === 'workspace' ? 'subtab-btn--active' : ''}`}
                onClick={() => onChange('workspace')}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    background: activeTab === 'workspace' ? 'rgba(45,212,191,0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: activeTab === 'workspace' ? '#2dd4bf' : 'var(--color-text-muted, #666)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}
            >
                <Layout size={12} />
                Workspace
            </button>
        </div>
    );
}

/**
 * RoomSubtab - Shows users in current room
 */
function RoomSubtab({ roomId, searchQuery, selectedMember, onSelectMember }) {
    const { users, inVoice, notInVoice, onlineCount } = useRoomPresence(roomId);

    const filteredInVoice = useMemo(() => {
        if (!searchQuery.trim()) return inVoice;
        const query = searchQuery.toLowerCase();
        return inVoice.filter(u => u.userName?.toLowerCase().includes(query));
    }, [inVoice, searchQuery]);

    const filteredNotInVoice = useMemo(() => {
        if (!searchQuery.trim()) return notInVoice;
        const query = searchQuery.toLowerCase();
        return notInVoice.filter(u => u.userName?.toLowerCase().includes(query));
    }, [notInVoice, searchQuery]);

    const { states: sectionStates, toggleSection } = useSectionStates({
        voice: { expanded: true, flexGrow: 1 },
        room: { expanded: true, flexGrow: 2 },
    });

    return (
        <ResizableSectionsContainer
            className="people-tab__sections"
            sectionStates={sectionStates}
            onSectionToggle={toggleSection}
        >
            {/* In Voice */}
            <ResizableSection
                id="voice"
                icon={Mic}
                iconColorClass="icon-green"
                label="In Voice"
                count={filteredInVoice.length}
            >
                {filteredInVoice.length === 0 ? (
                    <EmptyState message="No one in voice" />
                ) : (
                    filteredInVoice.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            showVoice
                        />
                    ))
                )}
            </ResizableSection>

            {/* In Room (not voice) */}
            <ResizableSection
                id="room"
                icon={Users}
                iconColorClass="icon-blue"
                label="In Room"
                count={filteredNotInVoice.length}
            >
                {filteredNotInVoice.length === 0 ? (
                    <EmptyState message="No other users in room" />
                ) : (
                    filteredNotInVoice.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            showWorkspace
                        />
                    ))
                )}
            </ResizableSection>
        </ResizableSectionsContainer>
    );
}

/**
 * WorkspaceSubtab - Shows users viewing current workspace
 */
function WorkspaceSubtab({ workspaceId, searchQuery, selectedMember, onSelectMember }) {
    const { users, otherUsers, onlineCount } = useWorkspacePresence(workspaceId);
    const [showMyCursor, setShowMyCursor] = useState(true);
    const [showAllCursors, setShowAllCursors] = useState(true);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(u => u.userName?.toLowerCase().includes(query));
    }, [users, searchQuery]);

    return (
        <div className="workspace-subtab">
            {/* User List */}
            <div className="workspace-subtab__users">
                <div style={{
                    padding: '8px 12px',
                    fontSize: '10px',
                    color: 'var(--color-text-muted, #666)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    Viewing This Workspace ({filteredUsers.length})
                </div>

                {filteredUsers.length === 0 ? (
                    <EmptyState message="No one else viewing this workspace" />
                ) : (
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {filteredUsers.map(user => (
                            <MemberRow
                                key={user.clientId || user.userId}
                                user={user}
                                isSelected={selectedMember === (user.clientId || user.userId)}
                                onSelect={onSelectMember}
                                showCursor
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Cursor Settings */}
            <div className="cursor-settings" style={{
                padding: '12px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0,0,0,0.1)',
            }}>
                <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted, #666)',
                    marginBottom: '8px',
                }}>
                    Cursor Settings
                </div>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary, #999)',
                    cursor: 'pointer',
                    marginBottom: '6px',
                }}>
                    <input
                        type="checkbox"
                        checked={showMyCursor}
                        onChange={(e) => setShowMyCursor(e.target.checked)}
                    />
                    Show my cursor to others
                </label>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary, #999)',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={showAllCursors}
                        onChange={(e) => setShowAllCursors(e.target.checked)}
                    />
                    Show all cursors
                </label>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PeoplePanelContent({ workspaceId, roomId }) {
    // Get real presence data from Y.js
    const { users, currentUser, onlineCount, usersByStatus, isInitialized } = usePresence();

    // Local UI state
    const [activeSubtab, setActiveSubtab] = useState('room');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);

    log.trace('PeopleTab render:', { total: users.length, subtab: activeSubtab });

    return (
        <div className="people-tab" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div className="panel-header">
                <Users size={14} className="panel-header__icon" style={{ color: '#f472b6' }} />
                <span className="panel-header__title">People</span>
                <span className="panel-header__count">{onlineCount} online</span>
            </div>

            {/* Subtab Toggle */}
            <SubtabToggle activeTab={activeSubtab} onChange={setActiveSubtab} />

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={activeSubtab === 'room' ? 'Search in room...' : 'Search in workspace...'}
                    />
                    {searchQuery && (
                        <button className="clear-button" onClick={() => setSearchQuery('')}>
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Connection Status */}
            {!isInitialized && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(251,191,36,0.1)',
                    borderBottom: '1px solid rgba(251,191,36,0.2)',
                    fontSize: '11px',
                    color: '#fbbf24',
                    textAlign: 'center',
                }}>
                    Connecting to presence server...
                </div>
            )}

            {/* Subtab Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeSubtab === 'room' ? (
                    <RoomSubtab
                        roomId={roomId}
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={setSelectedMember}
                    />
                ) : (
                    <WorkspaceSubtab
                        workspaceId={workspaceId}
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={setSelectedMember}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <UserPlus size={11} />
                    <span>Invite</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Raise Hand">
                    <Hand size={11} />
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Settings">
                    <Settings size={11} />
                </button>
            </div>
        </div>
    );
}

export default PeoplePanelContent;