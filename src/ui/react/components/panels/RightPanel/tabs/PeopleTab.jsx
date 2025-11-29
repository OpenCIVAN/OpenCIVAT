// src/ui/react/components/panels/RightPanel/tabs/PeopleTab.jsx
// People/Presence tab for the unified right panel
//
// Features:
// - Online members grouped by workspace
// - Status indicators (Active, Idle, Presenting, etc.)
// - Voice/Video indicators
// - Follow and message actions
// - Voice connection status

import React, { useState, useCallback } from 'react';
import {
    Users,
    Search,
    ChevronRight,
    ChevronDown,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Hand,
    Crown,
    UserPlus,
    Settings,
    MessageSquare,
    Phone,
    PhoneOff,
    Zap,
    Moon,
    Coffee,
    Monitor,
    Globe,
    UserCircle,
    Briefcase,
    Eye,
    Radio,
    Star,
    X,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '../../LeftPanel/components/ResizableSections';

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG = {
    active: { icon: Zap, color: 'green', label: 'Active' },
    idle: { icon: Moon, color: 'amber', label: 'Idle' },
    away: { icon: Coffee, color: 'muted', label: 'Away' },
    presenting: { icon: Monitor, color: 'purple', label: 'Presenting' },
    recording: { icon: Zap, color: 'red', label: 'Recording' },
};

const WORKSPACE_CONFIG = {
    personal: { icon: UserCircle, color: 'green', label: 'Personal' },
    project: { icon: Globe, color: 'blue', label: 'Project Room' },
    breakout: { icon: Briefcase, color: 'purple', label: 'Team Breakout' },
};

const ROLE_ICONS = {
    owner: Crown,
    editor: Star,
    viewer: Eye,
};

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_MEMBERS = [
    {
        id: 'me',
        name: 'You',
        email: 'you@example.com',
        color: 'green',
        status: 'active',
        workspace: 'personal',
        isMe: true,
        role: 'owner',
        mic: true,
        video: false,
        handRaised: false,
    },
    {
        id: 'u1',
        name: 'Dr. Sarah Smith',
        email: 'sarah@hospital.org',
        color: 'pink',
        status: 'active',
        workspace: 'personal',
        isMe: false,
        role: 'editor',
        mic: true,
        video: true,
        handRaised: false,
    },
    {
        id: 'u2',
        name: 'Dr. Michael Jones',
        email: 'mjones@hospital.org',
        color: 'amber',
        status: 'presenting',
        workspace: 'project',
        isMe: false,
        role: 'editor',
        mic: true,
        video: true,
        handRaised: false,
    },
    {
        id: 'u3',
        name: 'Alex Chen',
        email: 'alex@research.edu',
        color: 'purple',
        status: 'active',
        workspace: 'breakout',
        isMe: false,
        role: 'viewer',
        mic: false,
        video: false,
        handRaised: true,
    },
    {
        id: 'u4',
        name: 'Dr. Emily Wilson',
        email: 'ewilson@hospital.org',
        color: 'teal',
        status: 'idle',
        workspace: 'project',
        isMe: false,
        role: 'editor',
        mic: false,
        video: false,
        handRaised: false,
    },
    {
        id: 'u5',
        name: 'Guest User',
        email: 'guest@temp.com',
        color: 'muted',
        status: 'away',
        workspace: null,
        isMe: false,
        role: 'viewer',
        mic: false,
        video: false,
        handRaised: false,
    },
];

// =============================================================================
// VOICE STATUS BAR
// =============================================================================

function VoiceStatusBar({ connected, workspace, onMicToggle, onDisconnect }) {
    const [micOn, setMicOn] = useState(true);

    return (
        <div className={`voice-status-bar ${connected ? 'voice-status-bar--connected' : ''}`}>
            <Phone size={14} className="voice-status-bar__icon" />
            <span className="voice-status-bar__text">
                {connected ? `Voice connected • ${workspace}` : 'Voice disconnected'}
            </span>
            {connected && (
                <>
                    <button
                        className={`voice-status-bar__btn ${micOn ? 'voice-status-bar__btn--active' : ''}`}
                        onClick={() => setMicOn(!micOn)}
                    >
                        {micOn ? <Mic size={10} /> : <MicOff size={10} />}
                    </button>
                    <button
                        className="voice-status-bar__btn voice-status-bar__btn--disconnect"
                        onClick={onDisconnect}
                    >
                        <PhoneOff size={10} />
                    </button>
                </>
            )}
        </div>
    );
}

// =============================================================================
// MEMBER AVATAR
// =============================================================================

function MemberAvatar({ member, size = 32 }) {
    const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const statusConfig = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;

    return (
        <div
            className="member-avatar"
            style={{
                '--member-color': `var(--color-accent-${member.color})`,
                width: size,
                height: size,
                fontSize: size * 0.4,
            }}
        >
            {initials}
            <span
                className={`member-avatar__status member-avatar__status--${statusConfig.color}`}
                style={{ width: size * 0.35, height: size * 0.35 }}
            />
        </div>
    );
}

// =============================================================================
// MEMBER ROW
// =============================================================================

function MemberRow({ member, isSelected, onSelect }) {
    const statusConfig = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;
    const StatusIcon = statusConfig.icon;
    const RoleIcon = ROLE_ICONS[member.role] || Eye;

    return (
        <div
            className={`member-row ${isSelected ? 'member-row--selected' : ''} ${member.isMe ? 'member-row--me' : ''}`}
            style={{ '--member-color': `var(--color-accent-${member.color})` }}
            onClick={() => onSelect(isSelected ? null : member.id)}
        >
            <MemberAvatar member={member} size={32} />

            <div className="member-row__info">
                <div className="member-row__name-row">
                    <span className="member-row__name">{member.name}</span>
                    {member.isMe && <span className="member-row__you-badge">YOU</span>}
                    {member.role === 'owner' && <Crown size={10} className="icon-amber" />}
                    {member.handRaised && <Hand size={12} className="icon-amber" />}
                </div>
                <div className="member-row__status">
                    <StatusIcon size={10} className={`icon-${statusConfig.color}`} />
                    <span>{statusConfig.label}</span>
                </div>
            </div>

            {/* Audio/Video indicators */}
            <div className="member-row__indicators">
                {member.mic ? (
                    <Mic size={12} className="icon-green" />
                ) : (
                    <MicOff size={12} />
                )}
                {member.video && <Video size={12} className="icon-green" />}
            </div>

            {/* Expanded actions */}
            {isSelected && !member.isMe && (
                <div className="member-row__actions">
                    <button className="member-row__action-btn" data-color="blue">
                        <MessageSquare size={10} />
                        Message
                    </button>
                    <button className="member-row__action-btn" data-color="purple">
                        <Radio size={10} />
                        Follow
                    </button>
                    <button className="member-row__action-btn" data-color="teal">
                        <Eye size={10} />
                        View
                    </button>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// WORKSPACE GROUP
// =============================================================================

function WorkspaceGroup({ workspaceKey, members, selectedMember, onSelectMember }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const config = WORKSPACE_CONFIG[workspaceKey];
    const WsIcon = config?.icon || Globe;

    if (members.length === 0) return null;

    return (
        <div className="workspace-group">
            <div
                className={`workspace-group__header ${isExpanded ? 'workspace-group__header--expanded' : ''}`}
                style={{ '--workspace-color': `var(--color-accent-${config?.color || 'blue'})` }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <WsIcon size={14} />
                <span className="workspace-group__label">{config?.label || workspaceKey}</span>
                <span className="workspace-group__count">{members.length}</span>
            </div>

            {isExpanded && (
                <div className="workspace-group__members">
                    {members.map(member => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            isSelected={selectedMember === member.id}
                            onSelect={onSelectMember}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PeoplePanelContent({ workspaceId }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [voiceConnected, setVoiceConnected] = useState(true);

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        online: { expanded: true, flexGrow: 2 },
        offline: { expanded: false, flexGrow: 1 },
    });

    // Filter and group members
    const onlineMembers = SAMPLE_MEMBERS.filter(m => m.status !== 'away' && m.workspace);
    const offlineMembers = SAMPLE_MEMBERS.filter(m => m.status === 'away' || !m.workspace);

    const membersByWorkspace = {
        personal: onlineMembers.filter(m => m.workspace === 'personal'),
        project: onlineMembers.filter(m => m.workspace === 'project'),
        breakout: onlineMembers.filter(m => m.workspace === 'breakout'),
    };

    const onlineCount = onlineMembers.length;

    return (
        <div className="people-tab">
            {/* Header */}
            <div className="panel-header">
                <Users size={14} className="panel-header__icon file-icon--pink" />
                <span className="panel-header__title">People</span>
                <div className="panel-header__online-badge">
                    <span className="panel-header__online-dot" />
                    {onlineCount} online
                </div>
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
                        <button
                            className="clear-button"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Voice Status */}
            <VoiceStatusBar
                connected={voiceConnected}
                workspace="Project Room"
                onDisconnect={() => setVoiceConnected(false)}
            />

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Online Members */}
                <ResizableSection
                    id="online"
                    icon={Users}
                    iconColorClass="icon-green"
                    label="Online"
                    count={onlineCount}
                >
                    {Object.entries(membersByWorkspace).map(([wsKey, members]) => (
                        <WorkspaceGroup
                            key={wsKey}
                            workspaceKey={wsKey}
                            members={members}
                            selectedMember={selectedMember}
                            onSelectMember={setSelectedMember}
                        />
                    ))}
                </ResizableSection>

                {/* Offline Members */}
                <ResizableSection
                    id="offline"
                    icon={Coffee}
                    iconColorClass="icon-muted"
                    label="Offline / Away"
                    count={offlineMembers.length}
                >
                    {offlineMembers.map(member => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            isSelected={selectedMember === member.id}
                            onSelect={setSelectedMember}
                        />
                    ))}
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <UserPlus size={11} />
                    <span>Invite</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon">
                    <Hand size={11} />
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon">
                    <Settings size={11} />
                </button>
            </div>
        </div>
    );
}

export default PeoplePanelContent;