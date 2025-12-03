// src/ui/react/components/layout/SecondaryTopBar/SecondaryTopBar.jsx
// Secondary bar components: WorkspaceSelector, WorkspacePresence, and center content

import React, { useRef } from 'react';
import {
    ChevronDown,
    Search,
    Plus,
    RotateCcw,
    Link2,
    Share2,
    Globe,
    Briefcase,
    User,
    Check,
    X,
    Mic,
} from 'lucide-react';

import { useSecondaryTopBar, WORKSPACE_TYPES } from './SecondaryTopBar.logic.js';
import { SecondaryBarSpacer } from '../SecondaryBarZone';
import { PortalPopover } from '../../common/PortalPopover';
import './SecondaryTopBar.scss';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

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
    compact = false,
}) {
    if (!currentWorkspace) return null;

    const Icon = getWorkspaceIcon(currentWorkspace.type);

    return (
        <div className="workspace-selector">
            <button
                className={`workspace-selector__trigger ${compact ? 'workspace-selector__trigger--compact' : ''}`}
                onClick={onToggle}
                style={{ '--workspace-color': currentWorkspace.color }}
            >
                <Icon size={14} className="workspace-selector__icon" />
                {!compact && (
                    <div className="workspace-selector__info">
                        <span className="workspace-selector__name">{currentWorkspace.name}</span>
                    </div>
                )}
                <ChevronDown
                    size={12}
                    className={`workspace-selector__chevron ${isOpen ? 'workspace-selector__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="workspace-selector__backdrop" onClick={onClose} />

                    {/* Dropdown Panel */}
                    <div className="workspace-selector__dropdown">
                        {/* Search */}
                        <div className="workspace-selector__search">
                            <Search size={12} className="workspace-selector__search-icon" />
                            <input
                                type="text"
                                placeholder="Search workspaces..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="workspace-selector__search-input"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    className="workspace-selector__search-clear"
                                    onClick={() => onSearchChange('')}
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>

                        {/* Workspace Groups */}
                        <div className="workspace-selector__groups">
                            {/* Project Workspaces */}
                            {groupedWorkspaces.project?.length > 0 && (
                                <WorkspaceGroup
                                    label="Project Workspaces"
                                    workspaces={groupedWorkspaces.project}
                                    currentId={currentWorkspace.id}
                                    onSelect={onSelect}
                                />
                            )}

                            {/* Breakout Rooms */}
                            {groupedWorkspaces.breakout?.length > 0 && (
                                <WorkspaceGroup
                                    label="Breakout Rooms"
                                    workspaces={groupedWorkspaces.breakout}
                                    currentId={currentWorkspace.id}
                                    onSelect={onSelect}
                                />
                            )}

                            {/* Personal Workspaces */}
                            {groupedWorkspaces.personal?.length > 0 && (
                                <WorkspaceGroup
                                    label="Personal"
                                    workspaces={groupedWorkspaces.personal}
                                    currentId={currentWorkspace.id}
                                    onSelect={onSelect}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * WorkspaceGroup - A group of workspaces in the dropdown
 */
function WorkspaceGroup({ label, workspaces, currentId, onSelect }) {
    return (
        <div className="workspace-group">
            <div className="workspace-group__label">{label}</div>
            {workspaces.map((ws) => {
                const Icon = getWorkspaceIcon(ws.type);
                const isSelected = ws.id === currentId;

                return (
                    <button
                        key={ws.id}
                        className={`workspace-group__item ${isSelected ? 'workspace-group__item--selected' : ''}`}
                        onClick={() => onSelect(ws.id)}
                        style={{ '--workspace-color': ws.color }}
                    >
                        <Icon size={14} className="workspace-group__item-icon" />
                        <span className="workspace-group__item-name">{ws.name}</span>
                        {isSelected && <Check size={12} className="workspace-group__item-check" />}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * WorkspacePresence - Shows users in current workspace with Portal popover
 * Uses PortalPopover to render popover at document.body level, escaping overflow constraints
 */
function WorkspacePresence({
    visibleUsers,
    allUsers = [],
    overflowCount,
    totalCount,
    isHovering,
    onHoverChange,
    maxVisible = 3,
}) {
    const anchorRef = useRef(null);

    if (totalCount === 0) return null;

    // Use allUsers if provided, otherwise just use visibleUsers for the full list
    const usersForPopover = allUsers.length > 0 ? allUsers : visibleUsers;

    return (
        <div
            ref={anchorRef}
            className="workspace-presence"
            onMouseEnter={() => onHoverChange(true)}
            onMouseLeave={() => onHoverChange(false)}
        >
            {/* Avatar stack */}
            <div className="workspace-presence__avatars">
                {visibleUsers.map((user, index) => (
                    <div
                        key={user.userId}
                        className="workspace-presence__avatar"
                        style={{
                            '--user-color': user.userColor,
                            zIndex: visibleUsers.length - index,
                        }}
                        title={user.userName}
                    >
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.userName} />
                        ) : (
                            <span>{user.userName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                ))}
                {overflowCount > 0 && (
                    <div className="workspace-presence__overflow">
                        +{overflowCount}
                    </div>
                )}
            </div>

            {/* Portal Popover - escapes container overflow */}
            <PortalPopover
                anchorRef={anchorRef}
                isOpen={isHovering}
                position="below"
                align="end"
            >
                <div className="presence-popover">
                    <div className="presence-popover__header">
                        In This Workspace ({totalCount})
                    </div>
                    <div className="presence-popover__list">
                        {usersForPopover.map(user => (
                            <div key={user.userId} className="presence-popover__user">
                                <div
                                    className="presence-popover__avatar"
                                    style={{ '--user-color': user.userColor }}
                                >
                                    {user.userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="presence-popover__info">
                                    <span className="presence-popover__name">{user.userName}</span>
                                    <span className="presence-popover__status">
                                        {user.isInVoice && (
                                            <Mic size={10} className="presence-popover__voice-icon" />
                                        )}
                                        {user.currentView || 'Viewing workspace'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PortalPopover>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SecondaryTopBar - Center zone content only
 *
 * Renders layout actions and sharing controls for the center zone.
 * WorkspaceSelector (left) and WorkspacePresence (right) are now
 * passed directly to ThreeEdgeLayout zone props.
 */
export function SecondaryTopBar({
    // Actions
    onAddCell,
    onResetLayout,
    onLinkViews,
    onShare,
}) {
    const { actions } = useSecondaryTopBar({
        onAddCell,
        onResetLayout,
        onLinkViews,
        onShare,
    });

    return (
        <div className="secondary-top-bar__center">
            {/* Layout Actions */}
            <button
                className="secondary-bar-action"
                onClick={actions.addCell}
            >
                <Plus size={10} />
                <span>Add Cell</span>
            </button>

            <button
                className="secondary-bar-action secondary-bar-action--icon"
                onClick={actions.resetLayout}
                title="Reset Layout"
            >
                <RotateCcw size={12} />
            </button>

            <SecondaryBarSpacer />

            {/* Sharing Actions */}
            <button
                className="secondary-bar-action"
                onClick={actions.linkViews}
            >
                <Link2 size={12} />
                <span>Link Views</span>
            </button>

            <button
                className="secondary-bar-action secondary-bar-action--primary"
                onClick={actions.share}
            >
                <Share2 size={12} />
                <span>Share</span>
            </button>
        </div>
    );
}

export default SecondaryTopBar;

// Export zone components for use in grid layout
export { WorkspaceSelector, WorkspacePresence };