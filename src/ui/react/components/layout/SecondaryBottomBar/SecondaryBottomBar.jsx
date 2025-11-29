// src/ui/react/components/layout/SecondaryBottomBar/SecondaryBottomBar.jsx
// Secondary bar above StatusBar with canvas position, workspace info, and voice controls

import React from 'react';
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
} from 'lucide-react';

import { useSecondaryBottomBar } from './SecondaryBottomBar.logic.js';
import { WORKSPACE_TYPES } from '../SecondaryTopBar/SecondaryTopBar.logic.js';
import './SecondaryBottomBar.scss';

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
 */
function CanvasMinimap({
    positionString,
    sizeString,
    minimapCells,
    canvasSize,
    isHovering,
    onHoverChange,
}) {
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
            {isHovering && (
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
                                className={`canvas-minimap__cell ${cell.inViewport ? 'in-viewport' : ''}`}
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
 * InstanceCounter - Shows number of active instances
 */
function InstanceCounter({ count }) {
    return (
        <div className="instance-counter">
            <Layers size={10} className="instance-counter__icon" />
            <span className="instance-counter__count">{count} instances</span>
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
}) {
    if (!inVoice) {
        return (
            <button className="voice-controls voice-controls--disconnected" onClick={onJoin}>
                <Radio size={12} className="voice-controls__icon" />
                <span>Join Voice</span>
            </button>
        );
    }

    return (
        <div className="voice-controls voice-controls--connected">
            {/* Room indicator */}
            <button
                className="voice-controls__room"
                onClick={onToggleRoomDropdown}
            >
                <Radio size={12} className="voice-controls__room-icon" />
                <span className="voice-controls__room-name">{currentRoom}</span>
                <ChevronDown size={10} className="voice-controls__room-chevron" />
            </button>

            <div className="voice-controls__divider" />

            {/* Mute button */}
            <button
                className={`voice-controls__btn ${muted ? 'active' : ''}`}
                onClick={onToggleMute}
                title={muted ? 'Unmute' : 'Mute'}
            >
                {muted ? <MicOff size={12} /> : <Mic size={12} />}
            </button>

            {/* Deafen button */}
            <button
                className={`voice-controls__btn ${deafened ? 'active' : ''}`}
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

/**
 * SecondaryBottomBar - Main component
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

    // Panel dimensions for zone alignment
    leftPanelWidth = 280,
    rightPanelWidth = 280,
    leftPanelOpen = true,
    rightPanelOpen = true,

    // Left zone label (from left panel)
    leftPanelLabel = '',
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

    // Calculate zone widths based on panel states
    const leftZoneWidth = leftPanelOpen ? leftPanelWidth : 48;
    const rightZoneWidth = rightPanelOpen ? rightPanelWidth : 180;

    return (
        <div className="secondary-bottom-bar">
            {/* Left Zone - Panel label */}
            <div
                className="secondary-bottom-bar__zone secondary-bottom-bar__zone--left"
                style={{ width: leftZoneWidth }}
            >
                {leftPanelOpen && leftPanelLabel && (
                    <span className="secondary-bottom-bar__panel-label">{leftPanelLabel}</span>
                )}
            </div>

            {/* Center Zone - Canvas position, workspace, instances */}
            <div className="secondary-bottom-bar__zone secondary-bottom-bar__zone--center">
                <CanvasMinimap
                    positionString={canvas.positionString}
                    sizeString={canvas.sizeString}
                    minimapCells={canvas.minimapCells}
                    canvasSize={canvas.canvasSize}
                    isHovering={canvas.isHovering}
                    onHoverChange={canvas.setIsHovering}
                />

                <div className="secondary-bottom-bar__divider" />

                <WorkspaceIndicator
                    name={workspace.name}
                    color={workspace.color}
                    type={workspace.type}
                />

                <div className="secondary-bottom-bar__divider" />

                <InstanceCounter count={instanceCount} />
            </div>

            {/* Right Zone - Voice controls */}
            <div
                className="secondary-bottom-bar__zone secondary-bottom-bar__zone--right"
                style={{ width: rightZoneWidth }}
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
                />
            </div>
        </div>
    );
}

export default SecondaryBottomBar;