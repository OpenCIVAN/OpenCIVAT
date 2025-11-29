// src/ui/react/components/layout/SecondaryTopBar/SecondaryTopBar.jsx
// Secondary bar below main TopBar with workspace selector, controls, and presence
// Refactored: Uses SecondaryBar and SecondaryBarZone for consistent layout

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
    X,
} from 'lucide-react';

import { useSecondaryTopBar, VIEW_MODES, WORKSPACE_TYPES } from './SecondaryTopBar.logic.js';
import {
    SecondaryBar,
    SecondaryBarZone,
    SecondaryBarDivider,
    SecondaryBarSpacer,
} from '../SecondaryBarZone';
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
 * ViewModeButtons - Toggle between Normal, Isolation, and Subset views
 */
function ViewModeButtons({ viewMode, onModeChange }) {
    return (
        <div className="view-mode-buttons">
            <button
                className={`view-mode-buttons__btn ${viewMode === VIEW_MODES.NORMAL ? 'view-mode-buttons__btn--active' : ''}`}
                onClick={() => onModeChange(VIEW_MODES.NORMAL)}
                title="Normal View"
            >
                <Grid3X3 size={12} />
                <span>Normal</span>
            </button>
            <button
                className={`view-mode-buttons__btn ${viewMode === VIEW_MODES.ISOLATION ? 'view-mode-buttons__btn--active' : ''}`}
                onClick={() => onModeChange(VIEW_MODES.ISOLATION)}
                title="Isolation Mode"
            >
                <Maximize2 size={12} />
                <span>Isolation</span>
            </button>
            <button
                className={`view-mode-buttons__btn ${viewMode === VIEW_MODES.SUBSET ? 'view-mode-buttons__btn--active' : ''}`}
                onClick={() => onModeChange(VIEW_MODES.SUBSET)}
                title="Subset Mode"
            >
                <Layers size={12} />
                <span>Subset</span>
            </button>
        </div>
    );
}

/**
 * WorkspacePresence - Shows users in current workspace
 */
function WorkspacePresence({
    visibleUsers,
    overflowCount,
    totalCount,
    isHovering,
    onHoverChange,
}) {
    if (totalCount === 0) return null;

    return (
        <div
            className="workspace-presence"
            onMouseEnter={() => onHoverChange(true)}
            onMouseLeave={() => onHoverChange(false)}
        >
            <div className="workspace-presence__avatars">
                {visibleUsers.map((user, index) => (
                    <div
                        key={user.userId}
                        className="workspace-presence__avatar"
                        style={{
                            '--user-color': user.userColor,
                            '--avatar-offset': `${index * -8}px`,
                        }}
                        title={user.userName}
                    >
                        {user.userName.charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
            {overflowCount > 0 && (
                <span className="workspace-presence__overflow">+{overflowCount}</span>
            )}

            {/* Hover tooltip with full user list */}
            {isHovering && totalCount > 0 && (
                <div className="workspace-presence__tooltip">
                    <div className="workspace-presence__tooltip-header">
                        {totalCount} {totalCount === 1 ? 'user' : 'users'} in workspace
                    </div>
                    {/* Could add full user list here */}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SecondaryTopBar - Main component
 *
 * Layout:
 * - Left Zone: Workspace selector dropdown
 * - Center Zone: View mode buttons, layout actions, sharing
 * - Right Zone: Workspace presence (users in this workspace)
 */
export function SecondaryTopBar({
    // Workspace data
    workspaces = [],
    initialWorkspaceId,
    onWorkspaceChange,

    // Controlled workspace selector state (for keyboard shortcuts)
    workspaceSelectorOpen,
    onWorkspaceSelectorOpenChange,

    // View mode
    initialViewMode = VIEW_MODES.NORMAL,
    onViewModeChange,

    // Actions
    onAddCell,
    onResetLayout,
    onLinkViews,
    onShare,

    // Panel dimensions (passed from ThreeEdgeLayout)
    leftPanelWidth = 280,
    rightPanelWidth = 280,
    leftPanelOpen = true,
    rightPanelOpen = true,
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
        onAddCell: onAddCell,
        onResetLayout: onResetLayout,
        onLinkViews: onLinkViews,
        onShare: onShare,
    });

    // Use controlled state if provided, otherwise use internal state
    const isOpen = workspaceSelectorOpen !== undefined
        ? workspaceSelectorOpen
        : workspace.isOpen;

    const handleToggle = () => {
        if (onWorkspaceSelectorOpenChange) {
            onWorkspaceSelectorOpenChange(!isOpen);
        } else {
            workspace.toggleDropdown();
        }
    };

    const handleClose = () => {
        if (onWorkspaceSelectorOpenChange) {
            onWorkspaceSelectorOpenChange(false);
        } else {
            workspace.closeDropdown();
        }
    };

    return (
        <SecondaryBar position="top" height={36}>
            {/* Left Zone - Workspace Selector */}
            <SecondaryBarZone
                position="left"
                panelWidth={leftPanelWidth}
                panelOpen={leftPanelOpen}
            >
                <WorkspaceSelector
                    currentWorkspace={workspace.currentWorkspace}
                    isOpen={isOpen}
                    searchQuery={workspace.searchQuery}
                    groupedWorkspaces={workspace.groupedWorkspaces}
                    onToggle={handleToggle}
                    onSelect={(id) => {
                        workspace.selectWorkspace(id);
                        handleClose();
                    }}
                    onSearchChange={workspace.setSearchQuery}
                    onClose={handleClose}
                    compact={!leftPanelOpen}
                />
            </SecondaryBarZone>

            {/* Center Zone - Workspace Controls */}
            <SecondaryBarZone position="center">
                {/* View Mode Toggle */}
                <ViewModeButtons
                    viewMode={viewMode.viewMode}
                    onModeChange={viewMode.setViewMode}
                />

                <SecondaryBarDivider />

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
            </SecondaryBarZone>

            {/* Right Zone - Workspace Presence */}
            <SecondaryBarZone
                position="right"
                panelWidth={rightPanelWidth}
                panelOpen={rightPanelOpen}
            >
                <WorkspacePresence
                    visibleUsers={presence.visibleUsers}
                    overflowCount={presence.overflowCount}
                    totalCount={presence.totalCount}
                    isHovering={presence.isHovering}
                    onHoverChange={presence.setIsHovering}
                />
            </SecondaryBarZone>
        </SecondaryBar>
    );
}

export default SecondaryTopBar;