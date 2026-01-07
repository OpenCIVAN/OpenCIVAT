/**
 * @file SecondaryHeader.jsx
 * @deprecated This component has been replaced by canvas-embedded chrome components.
 * Use the new canvas chrome components instead:
 * - CanvasHeader: Navigation (back, home, breadcrumb, viewport nav, grid size)
 * - CanvasToolbar: Actions (view mode, history, subset, active view, actions)
 * - CanvasStatusBar: Info (canvas size, viewport size, render mode, sync status)
 *
 * These are now rendered inside CanvasWorkspace, not in ThreeEdgeLayout.
 * See: src/ui/react/components/workspace/Canvas/
 *
 * @description Secondary header bar with workspace context and navigation.
 * Height: 56px (18px label bar + 40px content) | z-index: 90
 *
 * This component manages its own internal zones rather than receiving
 * zone content from the parent. This makes it self-contained and easier
 * to reason about.
 *
 * IMPORTANT: This component uses useViewContextLogic internally for
 * navigation and view props. It must be rendered inside a LayoutPanelProvider.
 *
 * Layout (with label bar above):
 * ┌─────────────────┬──────────────────────────────────────┬─────────────────┐
 * │  WORKSPACE      │  NAVIGATION  │  FLOW  │  MODE        │  ROOM           │
 * ├─────────────────┼──────────────────────────────────────┼─────────────────┤
 * │  [Selector]     │  NavBlock | FlowDir | Edit | View    │  Room+Presence  │
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
 *   // Flow direction
 *   flowDirection="row"
 *   onFlowDirectionChange={handleFlowChange}
 *   // Edit mode
 *   isEditMode={isEditMode}
 *   activeTool={activeTool}
 *   onToolChange={handleToolChange}
 *   onToggleEditMode={handleToggleEditMode}
 *   // Room props
 *   room={currentRoom}
 *   members={roomMembers}
 * />
 */

import React, { memo } from 'react';

// Shared bar components (from common bars/ folder)
import {
    WorkspaceSelector,
    RoomPresenceIndicator,
    CanvasSizeDisplay,
    ViewportSizeDisplay
} from '@UI/react/components/bars';

// Common components
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms/Button';

// Hook for navigation and view logic - uses LayoutPanelContext internally
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic';

import './SecondaryHeader.scss';

// =============================================================================
// ZONE LABEL BAR COMPONENT
// =============================================================================

/**
 * Displays zone labels above the content row.
 * Each label aligns with its corresponding zone below.
 */
const ZoneLabelBar = memo(function ZoneLabelBar({ labels }) {
    return (
        <div className="secondary-header__label-bar">
            {labels.map((zone, i) => (
                <div
                    key={i}
                    className={`secondary-header__label ${zone.className || ''}`}
                    style={{
                        flex: zone.flex,
                        minWidth: zone.minWidth,
                        width: zone.width,
                        '--zone-color': zone.color,
                    }}
                >
                    {zone.label && (
                        <span className="secondary-header__label-text">
                            {zone.label}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
});

// =============================================================================
// CONSTANTS
// =============================================================================

// Zone labels configuration - class names must match zone widths exactly
const HEADER_ZONE_LABELS = [
    { label: 'Workspace', color: 'var(--color-accent-purple)', className: 'secondary-header__label--workspace' },
    { label: 'Navigation', color: 'var(--color-accent-blue)', className: 'secondary-header__label--navigation' },
    { label: 'Flow', color: 'var(--color-accent-teal)', className: 'secondary-header__label--flow' },
    { label: 'Size', color: 'var(--color-accent-green)', className: 'secondary-header__label--size' },
    { label: 'Room', color: 'var(--color-accent-cyan)', className: 'secondary-header__label--room' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Secondary Header bar component.
 * Manages its own internal zones for workspace, navigation, flow, size, and room context.
 *
 * Navigation props are obtained from useViewContextLogic hook,
 * which must be called inside LayoutPanelProvider context.
 */
function SecondaryHeader({
    // Workspace props (passed from parent)
    workspace,
    workspaces = [],
    onWorkspaceChange,
    onCreateWorkspace,

    // Flow direction (passed from parent)
    flowDirection = 'row',
    onFlowDirectionChange,

    // Canvas props (moved from footer)
    canvasSize = { cols: 3, rows: 3 },
    canvasPlacements = [],
    onCanvasSizeChange,

    // Viewport props (moved from footer)
    viewportSize = { cols: 3, rows: 3 },
    onViewportSizeChange,

    // Room props (passed from parent)
    room,
    members = [],
    availableRooms = [],
    onRoomChange,
    onOpenRoomsPanel,
    onCreateRoom,

    className = '',
}) {
    // Get navigation logic from context (MUST be inside LayoutPanelProvider)
    const {
        canvasPosition,
        isAtOrigin,
        onNavigate,
        onHome,
        onBookmark,
    } = useViewContextLogic();

    return (
        <div className={`secondary-header ${className}`}>
            {/* Zone Label Bar - displays above content */}
            <ZoneLabelBar labels={HEADER_ZONE_LABELS} />

            {/* Content Row */}
            <div className="secondary-header__content">
                {/* ================================================================= */}
                {/* WORKSPACE ZONE */}
                {/* ================================================================= */}
                <div className="secondary-header__zone secondary-header__zone--workspace">
                    <WorkspaceSelector
                        workspace={workspace}
                        workspaces={workspaces}
                        onSelect={onWorkspaceChange}
                        onCreate={onCreateWorkspace}
                    />
                </div>

                {/* ================================================================= */}
                {/* NAVIGATION ZONE (single row like v3) */}
                {/* ================================================================= */}
                <div className="secondary-header__zone secondary-header__zone--navigation">
                    {/* Bookmarks button */}
                    <IconButton
                        icon="bookmark"
                        label="Bookmarks"
                        size="sm"
                        onClick={onBookmark}
                        className="secondary-header__nav-btn secondary-header__nav-btn--bookmark"
                    />

                    {/* Home button */}
                    <IconButton
                        icon="home"
                        label="Home"
                        size="sm"
                        active={isAtOrigin}
                        onClick={onHome}
                        className="secondary-header__nav-btn"
                    />

                    {/* Arrow buttons group */}
                    <div className="secondary-header__arrow-group">
                        <button
                            type="button"
                            className="secondary-header__arrow-btn"
                            onClick={() => onNavigate('left')}
                            title="Left"
                        >
                            <Icon name="chevronLeft" size={12} />
                        </button>
                        <button
                            type="button"
                            className="secondary-header__arrow-btn"
                            onClick={() => onNavigate('up')}
                            title="Up"
                        >
                            <Icon name="chevronUp" size={12} />
                        </button>
                        <button
                            type="button"
                            className="secondary-header__arrow-btn"
                            onClick={() => onNavigate('down')}
                            title="Down"
                        >
                            <Icon name="chevronDown" size={12} />
                        </button>
                        <button
                            type="button"
                            className="secondary-header__arrow-btn"
                            onClick={() => onNavigate('right')}
                            title="Right"
                        >
                            <Icon name="chevronRight" size={12} />
                        </button>
                    </div>

                    {/* Position display */}
                    <div className="secondary-header__position">
                        <span className="secondary-header__position-value">{canvasPosition?.col ?? 0}</span>
                        <span className="secondary-header__position-sep">,</span>
                        <span className="secondary-header__position-value">{canvasPosition?.row ?? 0}</span>
                    </div>
                </div>

                {/* ================================================================= */}
                {/* FLOW ZONE (row/column toggle with icons) */}
                {/* ================================================================= */}
                <div className="secondary-header__zone secondary-header__zone--flow">
                    <div className="secondary-header__flow-toggle">
                        <button
                            type="button"
                            className={`secondary-header__flow-btn ${flowDirection === 'row' ? 'secondary-header__flow-btn--active' : ''}`}
                            onClick={() => onFlowDirectionChange?.('row')}
                        >
                            <Icon name="arrowRight" size={12} />
                            <span>Row</span>
                        </button>
                        <button
                            type="button"
                            className={`secondary-header__flow-btn ${flowDirection === 'column' ? 'secondary-header__flow-btn--active' : ''}`}
                            onClick={() => onFlowDirectionChange?.('column')}
                        >
                            <Icon name="arrowDown" size={12} />
                            <span>Col</span>
                        </button>
                    </div>
                </div>

                {/* ================================================================= */}
                {/* SIZE ZONE (canvas + viewport) */}
                {/* ================================================================= */}
                <div className="secondary-header__zone secondary-header__zone--size">
                    <CanvasSizeDisplay
                        size={canvasSize}
                        placements={canvasPlacements}
                        onChange={onCanvasSizeChange}
                        compact
                    />
                    <ViewportSizeDisplay
                        size={viewportSize}
                        maxSize={canvasSize}
                        onChange={onViewportSizeChange}
                        compact
                    />
                </div>

                {/* ================================================================= */}
                {/* ROOM ZONE */}
                {/* ================================================================= */}
                <div className="secondary-header__zone secondary-header__zone--room">
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
        </div>
    );
}

export default memo(SecondaryHeader);
export { SecondaryHeader };