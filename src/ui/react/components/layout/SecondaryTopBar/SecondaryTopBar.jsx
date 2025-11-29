// src/ui/react/components/layout/SecondaryTopBar/SecondaryTopBar.jsx
// Secondary bar below main TopBar with workspace selector, controls, and presence

import React from 'react';
import {
    ChevronDown,
    Search,
    Grid3X3,
    Maximize2,
    Layers,
    Plus,
    RotateCcw,
    Link2,
    Share2,
    Globe,
    Briefcase,
    User,
    Check,
    Radio,
} from 'lucide-react';

import { useSecondaryTopBar, VIEW_MODES, WORKSPACE_TYPES } from './SecondaryTopBar.logic.js';
import './SecondaryTopBar.scss';

/**
 * Get icon component for workspace type
 */
const getWorkspaceIcon = (type) => {
    switch (type) {
        case WORKSPACE_TYPES.PROJECT: return Globe;
        case WORKSPACE_TYPES.BREAKOUT: return Briefcase;
        case WORKSPACE_TYPES.PERSONAL: return User;
        default: return Globe;
    }
};

/**
 * WorkspaceSelector - Dropdown for selecting workspace
 */
function WorkspaceSelector({
    currentWorkspace,
    isOpen,
    searchQuery,
    groupedWorkspaces,
    onToggle,
    onSelect,
    onSearchChange,
    onClose,
}) {
    if (!currentWorkspace) return null;

    const Icon = getWorkspaceIcon(currentWorkspace.type);

    return (
        <div className="workspace-selector">
            <button
                className="workspace-selector__trigger"
                onClick={onToggle}
                style={{ '--workspace-color': currentWorkspace.color }}
            >
                <Icon size={14} className="workspace-selector__icon" />
                <div className="workspace-selector__info">
                    <span className="workspace-selector__name">{currentWorkspace.name}</span>
                </div>
                <ChevronDown
                    size={12}
                    className={`workspace-selector__chevron ${isOpen ? 'open' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div className="workspace-selector__backdrop" onClick={onClose} />
                    <div className="workspace-selector__dropdown">
                        {/* Search */}
                        <div className="workspace-selector__search">
                            <Search size={12} className="workspace-selector__search-icon" />
                            <input
                                type="text"
                                placeholder="Search workspaces..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Grouped workspaces */}
                        {Object.entries(groupedWorkspaces).map(([type, workspaces]) => (
                            workspaces.length > 0 && (
                                <div key={type} className="workspace-selector__group">
                                    <div className="workspace-selector__group-label">
                                        {type === 'project' && 'Project Rooms'}
                                        {type === 'breakout' && 'Breakout Rooms'}
                                        {type === 'personal' && 'Personal'}
                                    </div>
                                    {workspaces.map(ws => {
                                        const WsIcon = getWorkspaceIcon(ws.type);
                                        const isSelected = ws.id === currentWorkspace.id;
                                        return (
                                            <button
                                                key={ws.id}
                                                className={`workspace-selector__item ${isSelected ? 'selected' : ''}`}
                                                onClick={() => onSelect(ws.id)}
                                                style={{ '--workspace-color': ws.color }}
                                            >
                                                <WsIcon size={12} className="workspace-selector__item-icon" />
                                                <span className="workspace-selector__item-name">{ws.name}</span>
                                                {isSelected && (
                                                    <span className="workspace-selector__item-badge">CURRENT</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * ViewModeButtons - Toggle between view modes
 */
function ViewModeButtons({ viewMode, onModeChange }) {
    const modes = [
        { id: VIEW_MODES.NORMAL, icon: Grid3X3, label: 'Normal' },
        { id: VIEW_MODES.ISOLATION, icon: Maximize2, label: 'Isolation', color: 'var(--color-accent-purple)' },
        { id: VIEW_MODES.SUBSET, icon: Layers, label: 'Subset', color: 'var(--color-accent-green)' },
    ];

    return (
        <div className="view-mode-buttons">
            {modes.map(mode => (
                <button
                    key={mode.id}
                    className={`view-mode-button ${viewMode === mode.id ? 'active' : ''}`}
                    onClick={() => onModeChange(mode.id)}
                    style={mode.color ? { '--mode-color': mode.color } : undefined}
                >
                    <mode.icon size={12} />
                    <span>{mode.label}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * WorkspacePresence - Avatar stack showing users in workspace
 */
function WorkspacePresence({
    visibleUsers,
    overflowCount,
    totalCount,
    currentWorkspace,
    isHovering,
    onHoverChange,
}) {
    return (
        <div
            className="workspace-presence"
            onMouseEnter={() => onHoverChange(true)}
            onMouseLeave={() => onHoverChange(false)}
        >
            <span className="workspace-presence__count">
                {totalCount} in workspace
            </span>

            <div className="workspace-presence__avatars">
                {visibleUsers.map((user, idx) => (
                    <div
                        key={user.userId || idx}
                        className={`workspace-presence__avatar ${user.inVoice ? 'in-voice' : ''}`}
                        style={{
                            '--user-color': user.userColor || '#666',
                            '--stack-index': visibleUsers.length - idx,
                        }}
                    >
                        {(user.userName || 'U')[0].toUpperCase()}
                    </div>
                ))}
                {overflowCount > 0 && (
                    <div className="workspace-presence__overflow">
                        +{overflowCount}
                    </div>
                )}
            </div>

            {/* Hover tooltip */}
            {isHovering && (
                <div className="workspace-presence__tooltip">
                    <div className="workspace-presence__tooltip-header">
                        IN "{currentWorkspace?.name?.toUpperCase()}"
                    </div>
                    {visibleUsers.map((user, idx) => (
                        <div key={user.userId || idx} className="workspace-presence__tooltip-user">
                            <div
                                className="workspace-presence__tooltip-avatar"
                                style={{ '--user-color': user.userColor || '#666' }}
                            >
                                {(user.userName || 'U')[0].toUpperCase()}
                            </div>
                            <span className="workspace-presence__tooltip-name">
                                {user.userName || 'Unknown'}
                                {user.isYou && ' (you)'}
                            </span>
                            {user.inVoice && <Radio size={10} className="workspace-presence__tooltip-voice" />}
                        </div>
                    ))}
                    <div className="workspace-presence__tooltip-footer">
                        → View all {totalCount} online
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * SecondaryTopBar - Main component
 */
export function SecondaryTopBar({
    workspaces = [],
    initialWorkspaceId,
    initialViewMode,
    leftPanelWidth = 280,
    rightPanelWidth = 280,
    leftPanelOpen = true,
    rightPanelOpen = true,
    onWorkspaceChange,
    onViewModeChange,
    onAddCell,
    onResetLayout,
    onLinkViews,
    onShare,
}) {
    const {
        workspace,
        viewMode,
        presence,
        actions,
    } = useSecondaryTopBar({
        workspaces,
        initialWorkspaceId,
        initialViewMode,
        onWorkspaceChange,
        onViewModeChange,
        onAddCell,
        onResetLayout,
        onLinkViews,
        onShare,
    });

    // Calculate zone widths based on panel states
    const leftZoneWidth = leftPanelOpen ? leftPanelWidth : 180;
    const rightZoneWidth = rightPanelOpen ? rightPanelWidth : 180;

    return (
        <div className="secondary-top-bar">
            {/* Left Zone - Workspace Selector */}
            <div
                className="secondary-top-bar__zone secondary-top-bar__zone--left"
                style={{ width: leftZoneWidth }}
            >
                <WorkspaceSelector
                    currentWorkspace={workspace.currentWorkspace}
                    isOpen={workspace.isOpen}
                    searchQuery={workspace.searchQuery}
                    groupedWorkspaces={workspace.groupedWorkspaces}
                    onToggle={workspace.toggleDropdown}
                    onSelect={workspace.selectWorkspace}
                    onSearchChange={workspace.setSearchQuery}
                    onClose={workspace.closeDropdown}
                />
            </div>

            {/* Center Zone - Workspace Controls */}
            <div className="secondary-top-bar__zone secondary-top-bar__zone--center">
                {/* View Mode Toggle */}
                <ViewModeButtons
                    viewMode={viewMode.viewMode}
                    onModeChange={viewMode.setViewMode}
                />

                <div className="secondary-top-bar__divider" />

                {/* Layout Actions */}
                <button
                    className="secondary-top-bar__action"
                    onClick={actions.addCell}
                >
                    <Plus size={10} />
                    Add Cell
                </button>

                <button
                    className="secondary-top-bar__action secondary-top-bar__action--icon"
                    onClick={actions.resetLayout}
                    title="Reset Layout"
                >
                    <RotateCcw size={12} />
                </button>

                <div className="secondary-top-bar__spacer" />

                {/* Sharing Actions */}
                <button
                    className="secondary-top-bar__action"
                    onClick={actions.linkViews}
                >
                    <Link2 size={12} />
                    Link Views
                </button>

                <button
                    className="secondary-top-bar__action secondary-top-bar__action--primary"
                    onClick={actions.share}
                >
                    <Share2 size={12} />
                    Share
                </button>
            </div>

            {/* Right Zone - Workspace Presence */}
            <div
                className="secondary-top-bar__zone secondary-top-bar__zone--right"
                style={{ width: rightZoneWidth }}
            >
                <WorkspacePresence
                    visibleUsers={presence.visibleUsers}
                    overflowCount={presence.overflowCount}
                    totalCount={presence.totalCount}
                    currentWorkspace={workspace.currentWorkspace}
                    isHovering={presence.isHovering}
                    onHoverChange={presence.setIsHovering}
                />
            </div>
        </div>
    );
}

export default SecondaryTopBar;