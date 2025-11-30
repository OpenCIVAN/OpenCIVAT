// src/ui/react/components/layout/SecondaryBottomBar/SecondaryBottomBar.jsx
// Secondary bar above StatusBar with canvas position, workspace info, and voice controls
// Note: ViewModeToggle has been moved to TopBar
// Refactored: Uses SecondaryBar and SecondaryBarZone for consistent layout

import React, { useState } from 'react';
import {
    Navigation,
    Layers,
    Radio,
    Mic,
    MicOff,
    Headphones,
    PhoneOff,
    ChevronDown,
    Globe,
    Briefcase,
    User,
    Lock,
} from 'lucide-react';

import { useSecondaryBottomBar } from './SecondaryBottomBar.logic.js';
import { WORKSPACE_TYPES } from '../SecondaryTopBar/SecondaryTopBar.logic.js';
import {
    SecondaryBar,
    SecondaryBarZone,
    SecondaryBarDivider,
} from '../SecondaryBarZone';
import './SecondaryBottomBar.scss';

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
 * CanvasMinimap - Hover minimap showing viewport position
 * Only renders when canvas data is available
 */
function CanvasMinimap({
    positionString,
    sizeString,
    minimapCells,
    canvasSize,
    isHovering,
    onHoverChange,
    show = true,
}) {
    // Don't render if no canvas or explicitly hidden
    if (!show || !canvasSize || !positionString) {
        return null;
    }

    return (
        <div
            className="canvas-minimap"
            onMouseEnter={() => onHoverChange(true)}
            onMouseLeave={() => onHoverChange(false)}
        >
            <Navigation size={10} className="canvas-minimap__icon" />
            <span className="canvas-minimap__position">{positionString}</span>
            <span className="canvas-minimap__size">of {sizeString}</span>

            {/* Hover tooltip with visual minimap */}
            {isHovering && minimapCells?.length > 0 && (
                <div className="canvas-minimap__tooltip">
                    <div className="canvas-minimap__tooltip-header">CANVAS POSITION</div>
                    <div
                        className="canvas-minimap__grid"
                        style={{
                            gridTemplateColumns: `repeat(${canvasSize.cols}, 16px)`,
                            gridTemplateRows: `repeat(${canvasSize.rows}, 12px)`,
                        }}
                    >
                        {minimapCells.map((cell, idx) => (
                            <div
                                key={idx}
                                className={`canvas-minimap__cell ${cell.inViewport ? 'canvas-minimap__cell--in-viewport' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="canvas-minimap__tooltip-footer">You are here</div>
                </div>
            )}
        </div>
    );
}

/**
 * WorkspaceIndicator - Shows current workspace in center zone
 */
function WorkspaceIndicator({ name, color, type }) {
    const Icon = getWorkspaceIcon(type);

    return (
        <div className="workspace-indicator" style={{ '--workspace-color': color }}>
            <Icon size={10} className="workspace-indicator__icon" />
            <span className="workspace-indicator__name">{name}</span>
        </div>
    );
}

/**
 * InstanceCounter - Shows number of active instances with hover popover
 */
function InstanceCounter({ count, instances = [] }) {
    const [showPopover, setShowPopover] = useState(false);

    const sharedCount = instances.filter(i => i.isShared).length;
    const privateCount = instances.length - sharedCount;

    // Use provided instances or show basic count
    const hasInstances = instances.length > 0;

    if (count === 0 && !hasInstances) {
        return (
            <div className="instance-counter">
                <Layers size={10} className="instance-counter__icon" />
                <span className="instance-counter__count">No instances</span>
            </div>
        );
    }

    return (
        <div
            className={`instance-counter ${hasInstances ? 'instance-counter--interactive' : ''}`}
            onMouseEnter={() => hasInstances && setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
        >
            <Layers size={10} className="instance-counter__icon" />
            <span className="instance-counter__count">
                {hasInstances ? instances.length : count} instances
            </span>
            {hasInstances && (
                <span className="instance-counter__breakdown">
                    ({sharedCount} shared, {privateCount} private)
                </span>
            )}

            {showPopover && hasInstances && (
                <div className="instance-popover">
                    <div className="instance-popover__header">Open Instances</div>
                    <div className="instance-popover__list">
                        {instances.map(inst => (
                            <div
                                key={inst.id}
                                className="instance-popover__item"
                                style={{ '--instance-color': inst.color }}
                            >
                                {inst.isShared ? (
                                    <Globe size={10} className="instance-popover__icon instance-popover__icon--shared" />
                                ) : (
                                    <Lock size={10} className="instance-popover__icon instance-popover__icon--private" />
                                )}
                                <span className="instance-popover__name">{inst.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * VoiceControls - Voice chat controls for bottom bar
 */
function VoiceControls({
    inVoice,
    muted,
    deafened,
    currentRoom,
    showRoomDropdown,
    onJoin,
    onLeave,
    onToggleMute,
    onToggleDeafen,
    onToggleRoomDropdown,
    compact = false,
}) {
    if (!inVoice) {
        return (
            <button
                className={`voice-controls voice-controls--disconnected ${compact ? 'voice-controls--compact' : ''}`}
                onClick={onJoin}
            >
                <Radio size={12} className="voice-controls__icon" />
                {!compact && <span>Join Voice</span>}
            </button>
        );
    }

    return (
        <div className={`voice-controls voice-controls--connected ${compact ? 'voice-controls--compact' : ''}`}>
            {/* Room indicator */}
            {!compact && (
                <button
                    className="voice-controls__room"
                    onClick={onToggleRoomDropdown}
                >
                    <Radio size={12} className="voice-controls__room-icon" />
                    <span className="voice-controls__room-name">{currentRoom}</span>
                    <ChevronDown size={10} className="voice-controls__room-chevron" />
                </button>
            )}

            {!compact && <div className="voice-controls__divider" />}

            {/* Mute button */}
            <button
                className={`voice-controls__btn ${muted ? 'voice-controls__btn--active' : ''}`}
                onClick={onToggleMute}
                title={muted ? 'Unmute' : 'Mute'}
            >
                {muted ? <MicOff size={12} /> : <Mic size={12} />}
            </button>

            {/* Deafen button */}
            <button
                className={`voice-controls__btn ${deafened ? 'voice-controls__btn--active' : ''}`}
                onClick={onToggleDeafen}
                title={deafened ? 'Undeafen' : 'Deafen'}
            >
                <Headphones size={12} />
            </button>

            {/* Leave button */}
            <button
                className="voice-controls__btn voice-controls__btn--leave"
                onClick={onLeave}
                title="Leave voice"
            >
                <PhoneOff size={12} />
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SecondaryBottomBar - Main component
 *
 * Layout:
 * - Left Zone: (Reserved - ViewModeToggle moved to TopBar)
 * - Center Zone: Canvas position, workspace indicator, instance count
 * - Right Zone: Voice controls
 */
export function SecondaryBottomBar({
    // Canvas props
    canvasSize,
    viewport,
    onViewportChange,

    // Voice props
    initialInVoice = false,
    initialMuted = false,
    initialDeafened = false,
    currentVoiceRoom = 'Main Room',
    onJoinVoice,
    onLeaveVoice,
    onMuteToggle,
    onDeafenToggle,

    // Workspace
    currentWorkspace,

    // Stats
    instanceCount = 0,
    instances = [],

    // Panel dimensions (passed from ThreeEdgeLayout)
    leftPanelWidth = 280,
    rightPanelWidth = 280,
    leftPanelOpen = true,
    rightPanelOpen = true,
}) {
    const {
        canvas,
        voice,
        workspace,
    } = useSecondaryBottomBar({
        canvasSize,
        viewport,
        onViewportChange,
        initialInVoice,
        initialMuted,
        initialDeafened,
        currentVoiceRoom,
        onJoinVoice,
        onLeaveVoice,
        onMuteToggle,
        onDeafenToggle,
        currentWorkspace,
        instanceCount,
    });

    return (
        <SecondaryBar position="bottom" height={28}>
            {/* Left Zone - Reserved for future use */}
            <SecondaryBarZone
                position="left"
                panelWidth={leftPanelWidth}
                panelOpen={leftPanelOpen}
            >
                {/* ViewModeToggle moved to TopBar */}
            </SecondaryBarZone>

            {/* Center Zone - Canvas position, workspace, instances */}
            <SecondaryBarZone position="center">
                <div className="secondary-bottom-bar__center-content">
                    {/* Canvas minimap - only show when canvas mode is active */}
                    {canvasSize && (
                        <>
                            <CanvasMinimap
                                positionString={canvas.positionString}
                                sizeString={canvas.sizeString}
                                minimapCells={canvas.minimapCells}
                                canvasSize={canvas.canvasSize}
                                isHovering={canvas.isHovering}
                                onHoverChange={canvas.setIsHovering}
                                show={!!canvasSize}
                            />
                            <SecondaryBarDivider height={12} />
                        </>
                    )}

                    {/* Workspace indicator - always show if workspace exists */}
                    {currentWorkspace && (
                        <>
                            <WorkspaceIndicator
                                name={workspace.name}
                                color={workspace.color}
                                type={workspace.type}
                            />
                            <SecondaryBarDivider height={12} />
                        </>
                    )}

                    {/* Instance counter with hover popover */}
                    <InstanceCounter
                        count={instanceCount}
                        instances={instances}
                    />
                </div>
            </SecondaryBarZone>

            {/* Right Zone - Voice controls */}
            <SecondaryBarZone
                position="right"
                panelWidth={rightPanelWidth}
                panelOpen={rightPanelOpen}
            >
                <VoiceControls
                    inVoice={voice.inVoice}
                    muted={voice.muted}
                    deafened={voice.deafened}
                    currentRoom={voice.currentRoom}
                    showRoomDropdown={voice.showRoomDropdown}
                    onJoin={voice.joinVoice}
                    onLeave={voice.leaveVoice}
                    onToggleMute={voice.toggleMute}
                    onToggleDeafen={voice.toggleDeafen}
                    onToggleRoomDropdown={voice.toggleRoomDropdown}
                    compact={!rightPanelOpen}
                />
            </SecondaryBarZone>
        </SecondaryBar>
    );
}

export default SecondaryBottomBar;