/**
 * @file SecondaryHeader.jsx
 * @description Secondary header bar with workspace context and navigation.
 * Height: 48px | z-index: 90
 *
 * This component manages its own internal zones rather than receiving
 * zone content from the parent. This makes it self-contained and easier
 * to reason about.
 *
 * IMPORTANT: This component uses useSecondaryHeaderLogic internally for
 * navigation and view props. It must be rendered inside a LayoutPanelProvider.
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
 *   // View mode
 *   viewMode="normal"
 *   onViewModeChange={handleViewModeChange}
 *   // Room props
 *   room={currentRoom}
 *   members={roomMembers}
 * />
 */

import React, { memo } from 'react';
import { LayoutGrid, Maximize2, Layers } from 'lucide-react';

// Shared bar components (from common bars/ folder)
import { StackedNavBlock, ActiveViewSelector, SegmentedToggle, WorkspaceSelector, RoomPresenceIndicator } from '@UI/react/components/bars';

// Hook for navigation and view logic - uses LayoutPanelContext internally
import { useSecondaryHeaderLogic } from '@UI/react/hooks/useSecondaryHeaderLogic';

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
 *
 * Navigation and view props are obtained from useSecondaryHeaderLogic hook,
 * which must be called inside LayoutPanelProvider context.
 */
function SecondaryHeader({
    // Workspace props (passed from parent)
    workspace,
    workspaces = [],
    onWorkspaceChange,
    onCreateWorkspace,

    // View mode (passed from parent)
    viewMode = 'normal',
    onViewModeChange,

    // Room props (passed from parent)
    room,
    members = [],
    availableRooms = [],
    onRoomChange,
    onOpenRoomsPanel,
    onCreateRoom,

    className = '',
}) {
    // Get navigation and view logic from context (MUST be inside LayoutPanelProvider)
    const {
        canvasPosition,
        isAtOrigin,
        onNavigate,
        onHome,
        onBookmark,
        activeView,
        onCanvasViews,
        availableViews,
        onSelectView,
        onPlaceView,
    } = useSecondaryHeaderLogic();

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