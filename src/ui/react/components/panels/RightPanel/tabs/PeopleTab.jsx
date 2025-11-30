// src/ui/react/components/panels/RightPanel/tabs/PeopleTab.jsx
// People tab connected to real Y.js presence system
// Shows online users from the presence system instead of mock data

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
    Crown,
    Globe,
    User as UserIcon,
    Briefcase,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";
import { usePresence } from '@UI/react/hooks/usePresence.js';
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
// MAIN COMPONENT
// =============================================================================

export function PeoplePanelContent({ workspaceId }) {
    // Get real presence data from Y.js
    const { users, currentUser, onlineCount, usersByStatus, isInitialized } = usePresence();

    // Local UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        online: { expanded: true, flexGrow: 2 },
        offline: { expanded: false, flexGrow: 1 },
    });

    // Filter users by search
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(u =>
            u.userName?.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Group by status
    const activeUsers = filteredUsers.filter(u => u.status === 'active' || u.status === 'online');
    const idleUsers = filteredUsers.filter(u => u.status === 'idle');
    const awayUsers = filteredUsers.filter(u => u.status === 'away');

    log.trace('PeopleTab render:', { total: users.length, active: activeUsers.length });

    return (
        <div className="people-tab">
            {/* Header */}
            <div className="panel-header">
                <Users size={14} className="panel-header__icon" style={{ color: '#f472b6' }} />
                <span className="panel-header__title">People</span>
                <span className="panel-header__count">{onlineCount} online</span>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search people..."
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

            {/* User Sections */}
            <ResizableSectionsContainer
                className="people-tab__sections"
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Online/Active Users */}
                <ResizableSection
                    id="online"
                    icon={Users}
                    iconColorClass="icon-green"
                    label="Online"
                    count={activeUsers.length + idleUsers.length}
                >
                    {activeUsers.length === 0 && idleUsers.length === 0 ? (
                        <EmptyState message="No users online" />
                    ) : (
                        <>
                            {/* Active users first */}
                            {activeUsers.map(user => (
                                <MemberRow
                                    key={user.clientId}
                                    user={user}
                                    isSelected={selectedMember === user.clientId}
                                    onSelect={setSelectedMember}
                                />
                            ))}
                            {/* Then idle users */}
                            {idleUsers.map(user => (
                                <MemberRow
                                    key={user.clientId}
                                    user={user}
                                    isSelected={selectedMember === user.clientId}
                                    onSelect={setSelectedMember}
                                />
                            ))}
                        </>
                    )}
                </ResizableSection>

                {/* Away Users */}
                <ResizableSection
                    id="offline"
                    icon={Coffee}
                    iconColorClass="icon-muted"
                    label="Away"
                    count={awayUsers.length}
                >
                    {awayUsers.length === 0 ? (
                        <EmptyState message="No users away" />
                    ) : (
                        awayUsers.map(user => (
                            <MemberRow
                                key={user.clientId}
                                user={user}
                                isSelected={selectedMember === user.clientId}
                                onSelect={setSelectedMember}
                            />
                        ))
                    )}
                </ResizableSection>
            </ResizableSectionsContainer>

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