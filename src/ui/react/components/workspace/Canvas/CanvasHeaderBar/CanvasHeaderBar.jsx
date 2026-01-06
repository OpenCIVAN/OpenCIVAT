// src/ui/react/components/workspace/Canvas/CanvasHeaderBar/CanvasHeaderBar.jsx
// Canvas header bar with room, workspace, edit tools, flow, size, and canvas mode
//
// Based on canvas-chrome-v12.jsx SecondaryHeader spec
// Height: 62px (18px label bar + 44px content bar)
// Layout: Room | Workspace | Edit Tools | (spacer) | Flow | Size | Canvas Mode

import React, { memo, useState, useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import './CanvasHeaderBar.scss';

// =============================================================================
// ZONE DEFINITIONS (per canvas-chrome-v12 spec)
// =============================================================================

const ZONES = {
    room: { width: 140, label: 'Room' },
    workspace: { width: 130, label: 'Workspace' },
    editTools: { width: 'auto', label: 'Edit' },
    flow: { width: 65, label: 'Flow' },
    size: { width: 130, label: 'Size' },
    canvasMode: { width: 'auto', label: 'Canvas' },
};

// =============================================================================
// ZONE LABEL BAR
// =============================================================================

const ZoneLabelBar = memo(function ZoneLabelBar() {
    return (
        <div className="canvas-header-bar__label-bar">
            {/* Left zones */}
            <div className="canvas-header-bar__label" style={{ width: ZONES.room.width }}>
                {ZONES.room.label}
            </div>
            <div className="canvas-header-bar__label-separator" />
            <div className="canvas-header-bar__label" style={{ width: ZONES.workspace.width }}>
                {ZONES.workspace.label}
            </div>
            <div className="canvas-header-bar__label-separator" />
            <div className="canvas-header-bar__label">
                {ZONES.editTools.label}
            </div>

            {/* Spacer */}
            <div className="canvas-header-bar__label-spacer" />

            {/* Right zones */}
            <div className="canvas-header-bar__label canvas-header-bar__label--center" style={{ width: ZONES.flow.width }}>
                {ZONES.flow.label}
            </div>
            <div className="canvas-header-bar__label-separator" />
            <div className="canvas-header-bar__label canvas-header-bar__label--center" style={{ width: ZONES.size.width }}>
                {ZONES.size.label}
            </div>
            <div className="canvas-header-bar__label-separator" />
            <div className="canvas-header-bar__label canvas-header-bar__label--center">
                {ZONES.canvasMode.label}
            </div>
        </div>
    );
});

// =============================================================================
// ROOM ZONE
// =============================================================================

const RoomZone = memo(function RoomZone({
    room = { id: 'default', name: 'Main Room' },
    rooms = [],
    collaborators = [],
    onRoomChange,
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="canvas-header-bar__zone" style={{ width: ZONES.room.width }}>
            <div className="canvas-header-bar__dropdown-container">
                <button
                    type="button"
                    className={`canvas-header-bar__room-btn ${isOpen ? 'canvas-header-bar__room-btn--open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icon name="doorOpen" size={14} className="canvas-header-bar__room-icon" />
                    <span className="canvas-header-bar__room-name">{room.name}</span>

                    {/* Collaborator avatars */}
                    {collaborators.length > 0 && (
                        <div className="canvas-header-bar__avatars">
                            {collaborators.slice(0, 3).map((c, i) => (
                                <div
                                    key={c.id}
                                    className="canvas-header-bar__avatar"
                                    style={{ background: c.color, marginLeft: i > 0 ? -5 : 0 }}
                                    title={c.name}
                                >
                                    {c.name.charAt(0)}
                                </div>
                            ))}
                            {collaborators.length > 3 && (
                                <div className="canvas-header-bar__avatar canvas-header-bar__avatar--more">
                                    +{collaborators.length - 3}
                                </div>
                            )}
                        </div>
                    )}

                    <Icon name="chevronDown" size={10} className="canvas-header-bar__chevron" />
                </button>

                {isOpen && rooms.length > 0 && (
                    <div className="canvas-header-bar__dropdown">
                        <div className="canvas-header-bar__dropdown-header">Switch Room</div>
                        <div className="canvas-header-bar__dropdown-list">
                            {rooms.map(r => (
                                <button
                                    key={r.id}
                                    type="button"
                                    className={`canvas-header-bar__dropdown-item ${r.id === room.id ? 'canvas-header-bar__dropdown-item--active' : ''}`}
                                    onClick={() => { onRoomChange?.(r); setIsOpen(false); }}
                                >
                                    <Icon name="doorOpen" size={14} />
                                    <span className="canvas-header-bar__dropdown-item-name">{r.name}</span>
                                    {r.memberCount && (
                                        <span className="canvas-header-bar__dropdown-item-count">{r.memberCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// WORKSPACE ZONE
// =============================================================================

const WorkspaceZone = memo(function WorkspaceZone({
    workspace = { id: 'default', name: 'My Workspace' },
    workspaces = [],
    onWorkspaceChange,
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="canvas-header-bar__zone" style={{ width: ZONES.workspace.width }}>
            <div className="canvas-header-bar__dropdown-container">
                <button
                    type="button"
                    className={`canvas-header-bar__workspace-btn ${isOpen ? 'canvas-header-bar__workspace-btn--open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icon name="folder" size={14} className="canvas-header-bar__workspace-icon" />
                    <span className="canvas-header-bar__workspace-name">{workspace.name}</span>
                    <Icon name="chevronDown" size={10} className="canvas-header-bar__chevron" />
                </button>

                {isOpen && workspaces.length > 0 && (
                    <div className="canvas-header-bar__dropdown">
                        <div className="canvas-header-bar__dropdown-header">Switch Workspace</div>
                        <div className="canvas-header-bar__dropdown-list">
                            {workspaces.map(w => (
                                <button
                                    key={w.id}
                                    type="button"
                                    className={`canvas-header-bar__dropdown-item ${w.id === workspace.id ? 'canvas-header-bar__dropdown-item--active' : ''}`}
                                    onClick={() => { onWorkspaceChange?.(w); setIsOpen(false); }}
                                >
                                    <Icon name="folder" size={14} />
                                    <span className="canvas-header-bar__dropdown-item-name">{w.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// FLOW ZONE (Row/Column direction)
// =============================================================================

const FlowZone = memo(function FlowZone({
    flowDirection = 'row',
    onFlowDirectionChange,
}) {
    return (
        <div className="canvas-header-bar__zone canvas-header-bar__zone--center" style={{ width: ZONES.flow.width }}>
            <div className="canvas-header-bar__flow-toggle">
                <button
                    type="button"
                    className={`canvas-header-bar__flow-btn ${flowDirection === 'row' ? 'canvas-header-bar__flow-btn--active' : ''}`}
                    onClick={() => onFlowDirectionChange?.('row')}
                    title="Flow: Row"
                >
                    <Icon name="arrowRight" size={12} />
                </button>
                <button
                    type="button"
                    className={`canvas-header-bar__flow-btn ${flowDirection === 'column' ? 'canvas-header-bar__flow-btn--active' : ''}`}
                    onClick={() => onFlowDirectionChange?.('column')}
                    title="Flow: Column"
                >
                    <Icon name="arrowDown" size={12} />
                </button>
            </div>
        </div>
    );
});

// =============================================================================
// SIZE ZONE (Canvas size + Viewport size)
// =============================================================================

const SizeZone = memo(function SizeZone({
    canvasSize = { cols: 10, rows: 10 },
    viewportSize = { cols: 3, rows: 3 },
    onCanvasSizeClick,
    onViewportSizeClick,
}) {
    return (
        <div className="canvas-header-bar__zone canvas-header-bar__zone--center" style={{ width: ZONES.size.width }}>
            <div className="canvas-header-bar__size-buttons">
                <button
                    type="button"
                    className="canvas-header-bar__size-btn canvas-header-bar__size-btn--canvas"
                    onClick={onCanvasSizeClick}
                    title="Canvas Grid Size"
                >
                    <Icon name="grid" size={12} />
                    <span>{canvasSize.cols}×{canvasSize.rows}</span>
                </button>

                <button
                    type="button"
                    className="canvas-header-bar__size-btn canvas-header-bar__size-btn--viewport"
                    onClick={onViewportSizeClick}
                    title="Viewport Size"
                >
                    <Icon name="maximize" size={12} />
                    <span>{viewportSize.cols}×{viewportSize.rows}</span>
                </button>
            </div>
        </div>
    );
});

// =============================================================================
// EDIT TOOLS ZONE
// =============================================================================

const EDIT_TOOLS = [
    { id: 'select', icon: 'mousePointer', label: 'Select', title: 'Select Tool' },
    { id: 'pan', icon: 'hand', label: 'Pan', title: 'Pan Tool' },
];

const EditToolsZone = memo(function EditToolsZone({
    activeTool = 'select',
    onToolChange,
    mergeMode = false,
    onMergeModeChange,
    editMode = false,
    onEditModeChange,
    compact = false,
}) {
    return (
        <div className={`canvas-header-bar__zone canvas-header-bar__edit-zone ${compact ? 'canvas-header-bar__edit-zone--compact' : ''}`}>
            {/* Tool selection */}
            <div className="canvas-header-bar__tool-group">
                {EDIT_TOOLS.map(tool => (
                    <button
                        key={tool.id}
                        type="button"
                        className={`canvas-header-bar__tool-btn ${activeTool === tool.id ? 'canvas-header-bar__tool-btn--active' : ''}`}
                        onClick={() => onToolChange?.(tool.id)}
                        title={tool.title}
                    >
                        <Icon name={tool.icon} size={12} />
                        {!compact && <span className="canvas-header-bar__tool-label">{tool.label}</span>}
                    </button>
                ))}
            </div>

            <div className="canvas-header-bar__tool-separator" />

            {/* Merge mode */}
            <button
                type="button"
                className={`canvas-header-bar__tool-btn canvas-header-bar__tool-btn--merge ${mergeMode ? 'canvas-header-bar__tool-btn--active' : ''}`}
                onClick={() => onMergeModeChange?.(!mergeMode)}
                title="Merge Cells"
            >
                <Icon name="combine" size={12} />
                {!compact && <span className="canvas-header-bar__tool-label">Merge</span>}
            </button>

            <div className="canvas-header-bar__tool-separator" />

            {/* Edit mode toggle */}
            <button
                type="button"
                className={`canvas-header-bar__tool-btn canvas-header-bar__tool-btn--edit ${editMode ? 'canvas-header-bar__tool-btn--active' : ''}`}
                onClick={() => onEditModeChange?.(!editMode)}
                title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            >
                <Icon name="pencil" size={12} />
                {!compact && <span className="canvas-header-bar__tool-label">Edit</span>}
            </button>
        </div>
    );
});

// =============================================================================
// CANVAS MODE ZONE (Docked/Float/Fullscreen) - Responsive
// =============================================================================

const CANVAS_MODE_OPTIONS = [
    { id: 'docked', icon: 'dock', label: 'Dock', title: 'Docked Mode' },
    { id: 'floating', icon: 'windowRestore', label: 'Float', title: 'Floating Mode' },
    { id: 'fullscreen', icon: 'maximize', label: 'Full', title: 'Fullscreen Mode' },
];

const CanvasModeZone = memo(function CanvasModeZone({
    canvasMode = 'docked',
    onCanvasModeChange,
    compact = false,
}) {
    return (
        <div className={`canvas-header-bar__zone canvas-header-bar__zone--center ${compact ? 'canvas-header-bar__zone--compact' : ''}`}>
            <div className="canvas-header-bar__canvas-mode">
                {CANVAS_MODE_OPTIONS.map(mode => (
                    <button
                        key={mode.id}
                        type="button"
                        className={`canvas-header-bar__mode-btn ${canvasMode === mode.id ? 'canvas-header-bar__mode-btn--active' : ''}`}
                        onClick={() => onCanvasModeChange?.(mode.id)}
                        title={mode.title}
                    >
                        <Icon name={mode.icon} size={12} />
                        {!compact && <span className="canvas-header-bar__mode-label">{mode.label}</span>}
                    </button>
                ))}
            </div>
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasHeaderBar - Top bar for canvas workspace
 *
 * Based on canvas-chrome-v12.jsx SecondaryHeader spec
 * Height: 62px (18px label bar + 44px content bar)
 *
 * Zones:
 * - Room: Room selector with collaborator avatars
 * - Workspace: Workspace/project selector
 * - Edit Tools: Select/Pan/Merge/Edit mode controls
 * - Flow: Row/Column flow direction toggle
 * - Size: Canvas and viewport size buttons
 * - Canvas Mode: Docked/Float/Fullscreen toggle (responsive)
 */
export function CanvasHeaderBar({
    // Room
    room,
    rooms = [],
    collaborators = [],
    onRoomChange,

    // Workspace
    workspace,
    workspaces = [],
    onWorkspaceChange,

    // Edit tools
    activeTool = 'select',
    onToolChange,
    mergeMode = false,
    onMergeModeChange,
    editMode = false,
    onEditModeChange,

    // Flow
    flowDirection = 'row',
    onFlowDirectionChange,

    // Size
    canvasSize = { cols: 10, rows: 10 },
    viewportSize = { cols: 3, rows: 3 },
    onCanvasSizeClick,
    onViewportSizeClick,

    // Canvas mode
    canvasMode = 'docked',
    onCanvasModeChange,
    compactMode = false,

    className = '',
}) {
    return (
        <div className={`canvas-header-bar ${className}`}>
            {/* Zone Label Bar */}
            <ZoneLabelBar />

            {/* Content Bar */}
            <div className="canvas-header-bar__content-bar">
                {/* Room Zone */}
                <RoomZone
                    room={room}
                    rooms={rooms}
                    collaborators={collaborators}
                    onRoomChange={onRoomChange}
                />

                <div className="canvas-header-bar__divider" />

                {/* Workspace Zone */}
                <WorkspaceZone
                    workspace={workspace}
                    workspaces={workspaces}
                    onWorkspaceChange={onWorkspaceChange}
                />

                <div className="canvas-header-bar__divider" />

                {/* Edit Tools Zone */}
                <EditToolsZone
                    activeTool={activeTool}
                    onToolChange={onToolChange}
                    mergeMode={mergeMode}
                    onMergeModeChange={onMergeModeChange}
                    editMode={editMode}
                    onEditModeChange={onEditModeChange}
                    compact={compactMode}
                />

                {/* Spacer */}
                <div className="canvas-header-bar__spacer" />

                {/* Flow Zone */}
                <FlowZone
                    flowDirection={flowDirection}
                    onFlowDirectionChange={onFlowDirectionChange}
                />

                <div className="canvas-header-bar__divider" />

                {/* Size Zone */}
                <SizeZone
                    canvasSize={canvasSize}
                    viewportSize={viewportSize}
                    onCanvasSizeClick={onCanvasSizeClick}
                    onViewportSizeClick={onViewportSizeClick}
                />

                <div className="canvas-header-bar__divider" />

                {/* Canvas Mode Zone */}
                <CanvasModeZone
                    canvasMode={canvasMode}
                    onCanvasModeChange={onCanvasModeChange}
                    compact={compactMode}
                />
            </div>
        </div>
    );
}

export default memo(CanvasHeaderBar);
