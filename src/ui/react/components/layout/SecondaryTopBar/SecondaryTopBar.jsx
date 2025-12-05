// src/ui/react/components/layout/SecondaryTopBar/SecondaryTopBar.jsx
// Secondary bar components: WorkspaceSelector, WorkspacePresence, and center content

import React, { useRef, useState } from 'react';
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
    MousePointer2,
    Hand,
    Combine,
    Pencil,
    Undo,
    Redo,
} from 'lucide-react';

import { useSecondaryTopBar, WORKSPACE_TYPES } from './SecondaryTopBar.logic.js';
import { SecondaryBarSpacer, SecondaryBarDivider } from '../SecondaryBarZone';
import { PortalPopover } from '../../common/PortalPopover';
import './SecondaryTopBar.scss';

// Tool definitions
const TOOLS = {
    SELECT: 'select',
    PAN: 'pan',
    MERGE: 'merge',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Convert hex color to RGB values string
 */
const hexToRgb = (hex) => {
    if (!hex) return '96, 165, 250'; // Default blue
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '96, 165, 250';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
};

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
    currentRoomName,
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
                style={{
                    '--workspace-color': currentWorkspace.color,
                    '--workspace-color-rgb': hexToRgb(currentWorkspace.color),
                }}
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

                        {/* Workspace Groups - organized by scope */}
                        <div className="workspace-selector__groups">
                            {/* My Workspaces (Personal) */}
                            {groupedWorkspaces.personal?.length > 0 && (
                                <WorkspaceGroup
                                    label="My Workspaces"
                                    workspaces={groupedWorkspaces.personal}
                                    currentId={currentWorkspace.id}
                                    onSelect={onSelect}
                                />
                            )}

                            {/* Room Workspaces (scoped to current room) */}
                            {groupedWorkspaces.room?.length > 0 && (
                                <WorkspaceGroup
                                    label={currentRoomName ? `${currentRoomName} (Room)` : 'Room Workspaces'}
                                    workspaces={groupedWorkspaces.room}
                                    currentId={currentWorkspace.id}
                                    onSelect={onSelect}
                                />
                            )}

                            {/* Project Workspaces (visible to all) */}
                            {groupedWorkspaces.project?.length > 0 && (
                                <WorkspaceGroup
                                    label="Project"
                                    workspaces={groupedWorkspaces.project}
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
                        style={{
                            '--workspace-color': ws.color,
                            '--workspace-color-rgb': hexToRgb(ws.color),
                        }}
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
    // Tool state (optional - for canvas integration)
    tool,
    onToolChange,
    editMode,
    onEditModeChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}) {
    // Local state for demo if not controlled
    const [localTool, setLocalTool] = useState(TOOLS.SELECT);
    const [localEditMode, setLocalEditMode] = useState(false);

    const activeTool = tool ?? localTool;
    const setActiveTool = onToolChange ?? setLocalTool;
    const isEditMode = editMode ?? localEditMode;
    const toggleEditMode = onEditModeChange ?? (() => setLocalEditMode(!localEditMode));

    const { actions } = useSecondaryTopBar({
        onAddCell,
        onResetLayout,
        onLinkViews,
        onShare,
    });

    return (
        <div className="secondary-top-bar__center">
            {/* Tool Buttons */}
            <div className="bar-btn-group">
                <button
                    className={`bar-tool-btn bar-tool-btn--blue ${activeTool === TOOLS.SELECT ? 'bar-tool-btn--active' : ''}`}
                    onClick={() => setActiveTool(TOOLS.SELECT)}
                    title="Select tool (V)"
                >
                    <MousePointer2 size={14} />
                </button>
                <button
                    className={`bar-tool-btn bar-tool-btn--teal ${activeTool === TOOLS.PAN ? 'bar-tool-btn--active' : ''}`}
                    onClick={() => setActiveTool(TOOLS.PAN)}
                    title="Pan tool (H)"
                >
                    <Hand size={14} />
                </button>
                <button
                    className={`bar-tool-btn bar-tool-btn--purple ${activeTool === TOOLS.MERGE ? 'bar-tool-btn--active' : ''}`}
                    onClick={() => setActiveTool(TOOLS.MERGE)}
                    title="Merge cells (M)"
                >
                    <Combine size={14} />
                </button>
            </div>

            <SecondaryBarDivider height={16} />

            {/* Edit Mode Toggle */}
            <button
                className={`bar-tool-btn bar-tool-btn--amber ${isEditMode ? 'bar-tool-btn--active' : ''}`}
                onClick={toggleEditMode}
                title="Toggle edit mode (E)"
            >
                <Pencil size={14} />
            </button>

            <SecondaryBarDivider height={16} />

            {/* Layout Actions */}
            <button
                className="bar-action-btn bar-action-btn--green"
                onClick={actions.addCell}
                title="Add new cell"
            >
                <Plus size={12} />
                <span>Add</span>
            </button>

            <button
                className="bar-tool-btn"
                onClick={actions.resetLayout}
                title="Reset Layout"
            >
                <RotateCcw size={14} />
            </button>

            <SecondaryBarSpacer />

            {/* Undo/Redo */}
            <div className="bar-btn-group">
                <button
                    className="bar-tool-btn"
                    onClick={onUndo}
                    disabled={canUndo === false}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={14} />
                </button>
                <button
                    className="bar-tool-btn"
                    onClick={onRedo}
                    disabled={canRedo === false}
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo size={14} />
                </button>
            </div>

            <SecondaryBarDivider height={16} />

            {/* Sharing Actions */}
            <button
                className="bar-action-btn bar-action-btn--blue"
                onClick={actions.linkViews}
                title="Link selected views"
            >
                <Link2 size={12} />
                <span>Link</span>
            </button>

            <button
                className="bar-action-btn bar-action-btn--purple"
                onClick={actions.share}
                title="Share workspace"
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