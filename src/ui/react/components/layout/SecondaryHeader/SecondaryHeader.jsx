/**
 * @file SecondaryHeader.jsx
 * @description Secondary header bar with workspace context and navigation.
 * Height: 48px | z-index: 90
 *
 * This component manages its own internal zones rather than receiving
 * zone content from the parent. This makes it self-contained and easier
 * to reason about.
 *
 * Layout:
 * ┌─────────────────┬──────────────────────────────────────┬─────────────────┐
 * │  LEFT ZONE      │           CENTER ZONE                │   RIGHT ZONE    │
 * │  Workspace      │  NavBlock | ActiveView | ViewMode    │  Room+Presence  │
 * └─────────────────┴──────────────────────────────────────┴─────────────────┘
 *
 * @example
 * <SecondaryHeader
 *   // Workspace props
 *   workspace={currentWorkspace}
 *   workspaces={workspaces}
 *   onWorkspaceChange={handleWorkspaceChange}
 *   // Navigation props
 *   canvasPosition={{ col: 0, row: 0 }}
 *   onNavigate={handleNavigate}
 *   // View props
 *   activeView={currentView}
 *   viewMode="normal"
 *   // Room props
 *   room={currentRoom}
 *   members={roomMembers}
 * />
 */

import React, { memo } from 'react';
import { LayoutGrid, Maximize2, Layers } from 'lucide-react';

// Shared bar components (from common bars/ folder)
import { StackedNavBlock, ActiveViewSelector, SegmentedToggle, WorkspaceSelector, RoomPresenceIndicator } from '@UI/react/components/bars';

import './SecondaryHeader.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_MODE_OPTIONS = [
    { value: 'normal', icon: LayoutGrid, label: 'Normal View', accent: 'var(--color-accent-blue)' },
    { value: 'isolation', icon: Maximize2, label: 'Isolation Mode', accent: 'var(--color-accent-amber)' },
    { value: 'subset', icon: Layers, label: 'Subset Mode', accent: 'var(--color-accent-purple)' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Secondary Header bar component.
 * Manages its own internal zones for workspace, navigation, and room context.
 */
function SecondaryHeader({
    // Workspace props
    workspace,
    workspaces = [],
    onWorkspaceChange,
    onCreateWorkspace,

    // Navigation props
    canvasPosition = { col: 0, row: 0 },
    isAtOrigin = true,
    onNavigate,
    onHome,
    onBookmark,

    // View props
    activeView,
    onCanvasViews = [],
    availableViews = [],
    onSelectView,
    onPlaceView,
    viewMode = 'normal',
    onViewModeChange,

    // Room props
    room,
    members = [],
    availableRooms = [],
    onRoomChange,
    onOpenRoomsPanel,
    onCreateRoom,

    className = '',
}) {
    return (
        <div className={`secondary-header ${className}`}>
            {/* ================================================================= */}
            {/* LEFT ZONE: Workspace Selector */}
            {/* ================================================================= */}
            <div className="secondary-header__zone secondary-header__zone--left">
                <WorkspaceSelector
                    workspace={workspace}
                    workspaces={workspaces}
                    onSelect={onWorkspaceChange}
                    onCreate={onCreateWorkspace}
                />
            </div>

            {/* ================================================================= */}
            {/* CENTER ZONE: Navigation + View Context */}
            {/* ================================================================= */}
            <div className="secondary-header__zone secondary-header__zone--center">
                <StackedNavBlock
                    position={canvasPosition}
                    isAtOrigin={isAtOrigin}
                    onNavigate={onNavigate}
                    onHome={onHome}
                    onBookmark={onBookmark}
                />

                <div className="secondary-header__divider" />

                <ActiveViewSelector
                    activeView={activeView}
                    onCanvasViews={onCanvasViews}
                    availableViews={availableViews}
                    onSelect={onSelectView}
                    onPlace={onPlaceView}
                />

                <SegmentedToggle
                    options={VIEW_MODE_OPTIONS}
                    value={viewMode}
                    onChange={onViewModeChange}
                />
            </div>

            {/* ================================================================= */}
            {/* RIGHT ZONE: Room + Presence */}
            {/* ================================================================= */}
            <div className="secondary-header__zone secondary-header__zone--right">
                <RoomPresenceIndicator
                    room={room}
                    members={members}
                    availableRooms={availableRooms}
                    onRoomChange={onRoomChange}
                    onClick={onOpenRoomsPanel}
                    onCreateRoom={onCreateRoom}
                />
            </div>
        </div>
    );
}

export default memo(SecondaryHeader);
export { SecondaryHeader };