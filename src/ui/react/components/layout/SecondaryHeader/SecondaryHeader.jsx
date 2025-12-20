/**
 * @file SecondaryHeader.jsx
 * @description Secondary header bar with workspace context and navigation.
 * Height: 44px | z-index: 90
 *
 * Layout:
 * - Left: Workspace Selector, Room + Presence
 * - Center/Right: Flow Direction, Edit Tools (contextual), Canvas Nav
 *
 * @example
 * <SecondaryHeader
 *   workspace={currentWorkspace}
 *   room={currentRoom}
 *   members={roomMembers}
 *   isEditMode={isEditMode}
 * />
 */

import React from 'react';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { RoomPresenceIndicator } from './components/RoomPresenceIndicator';
import { FlowDirectionToggle } from './components/FlowDirectionToggle';
import { EditToolbar } from './components/EditToolbar';
import { CanvasNavigation } from './components/CanvasNavigation';

import './SecondaryHeader.scss';

/**
 * Secondary Header bar component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.workspace] - Current workspace
 * @param {Array} [props.workspaces] - List of available workspaces
 * @param {Function} [props.onWorkspaceChange] - Callback when workspace is selected
 * @param {Function} [props.onCreateWorkspace] - Callback to create new workspace
 * @param {Object} [props.room] - Current room
 * @param {Array} [props.members] - Room members
 * @param {Function} [props.onOpenRoomsPanel] - Callback to open rooms panel
 * @param {string} [props.flowDirection] - Flow direction ('row' or 'column')
 * @param {Function} [props.onFlowDirectionChange] - Callback when flow direction changes
 * @param {boolean} [props.isEditMode] - Whether edit mode is active
 * @param {string} [props.activeTool] - Currently active edit tool
 * @param {Function} [props.onToolChange] - Callback when tool is selected
 * @param {Function} [props.onToggleEditMode] - Callback to toggle edit mode
 * @param {boolean} [props.canUndo] - Whether undo is available
 * @param {boolean} [props.canRedo] - Whether redo is available
 * @param {Function} [props.onUndo] - Undo callback
 * @param {Function} [props.onRedo] - Redo callback
 * @param {Object} [props.canvasPosition] - Current canvas position {col, row}
 * @param {boolean} [props.isAtOrigin] - Whether at origin position
 * @param {Function} [props.onNavigateHome] - Callback to navigate home
 * @param {Function} [props.onNavigateDirection] - Callback to navigate direction
 * @param {Function} [props.onOpenBookmarks] - Callback to open bookmarks
 */
export function SecondaryHeader({
    // Workspace
    workspace = null,
    workspaces = [],
    onWorkspaceChange,
    onCreateWorkspace,
    // Room & Presence
    room = null,
    members = [],
    onOpenRoomsPanel,
    // Flow Direction
    flowDirection = 'row',
    onFlowDirectionChange,
    // Edit Mode
    isEditMode = false,
    activeTool = 'select',
    onToolChange,
    onToggleEditMode,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    // Canvas Navigation
    canvasPosition = { col: 0, row: 0 },
    isAtOrigin = true,
    onNavigateHome,
    onNavigateDirection,
    onOpenBookmarks,
}) {
    return (
        <div className="secondary-header" role="toolbar" aria-label="Workspace toolbar">
            {/* Left Zone */}
            <div className="secondary-header__left">
                <WorkspaceSelector
                    workspace={workspace}
                    workspaces={workspaces}
                    onSelect={onWorkspaceChange}
                    onCreate={onCreateWorkspace}
                />
                <RoomPresenceIndicator
                    room={room}
                    members={members}
                    onClick={onOpenRoomsPanel}
                />
            </div>

            {/* Right Zone */}
            <div className="secondary-header__right">
                <FlowDirectionToggle
                    direction={flowDirection}
                    onChange={onFlowDirectionChange}
                />

                <div className="secondary-header__divider" />

                <EditToolbar
                    isEditMode={isEditMode}
                    activeTool={activeTool}
                    onToolChange={onToolChange}
                    onToggleEditMode={onToggleEditMode}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                />

                <div className="secondary-header__divider" />

                <CanvasNavigation
                    position={canvasPosition}
                    isAtOrigin={isAtOrigin}
                    onHome={onNavigateHome}
                    onMove={onNavigateDirection}
                    onBookmark={onOpenBookmarks}
                />
            </div>
        </div>
    );
}

export default SecondaryHeader;