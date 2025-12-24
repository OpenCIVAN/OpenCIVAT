/**
 * @file SecondaryFooter.jsx
 * @description Secondary footer bar with editing tools and voice controls.
 * Height: 36px | z-index: 90
 *
 * This component manages its own internal zones rather than receiving
 * zone content from the parent.
 *
 * Layout:
 * ┌─────────────────┬──────────────────────────────────────┬─────────────────────┐
 * │  LEFT ZONE      │           CENTER ZONE                │   RIGHT ZONE        │
 * │  Nav/Scratchpad │  Flow | EditTools | Undo | Size      │  Voice (tinted)     │
 * └─────────────────┴──────────────────────────────────────┴─────────────────────┘
 *
 * @example
 * <SecondaryFooter
 *   navigatorOpen={false}
 *   flowDirection="row"
 *   isEditMode={true}
 *   activeTool="select"
 *   voiceState={voiceState}
 * />
 */

import React, { useCallback, memo } from 'react';

// Shared bar components (from common bars/ folder)
import {
    CanvasSizeDisplay,
    LabeledIconButton,
    SegmentedToggle,
    VoiceControlsPanel
} from '@UI/react/components/bars';

// Common UI components
import { ButtonGroup, IconButton } from '@UI/react/components/common/Button';

import './SecondaryFooter.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Icons are now string names for the Icon component
const FLOW_OPTIONS = [
    { value: 'row', icon: 'arrowRight', label: 'Row Flow', accent: 'var(--color-accent-blue)' },
    { value: 'column', icon: 'arrowDown', label: 'Column Flow', accent: 'var(--color-accent-blue)' },
];

const EDIT_TOOLS = [
    { id: 'select', icon: 'mousePointer', label: 'Select', accent: 'var(--color-accent-blue)' },
    { id: 'pan', icon: 'hand', label: 'Pan', accent: 'var(--color-accent-teal)' },
    { id: 'merge', icon: 'combine', label: 'Merge Cells', accent: 'var(--color-accent-purple)' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Secondary Footer bar component.
 * Manages its own internal zones for popouts, edit tools, and voice controls.
 */
function SecondaryFooter({
    // Popout props
    navigatorOpen = false,
    scratchpadOpen = false,
    onToggleNavigator,
    onToggleScratchpad,

    // Flow/Edit props
    flowDirection = 'row',
    onFlowDirectionChange,
    isEditMode = false,
    activeTool = 'select',
    onToolChange,
    onToggleEditMode,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,

    // Canvas props
    canvasSize = { cols: 3, rows: 3 },
    onCanvasSizeChange,

    // Voice props
    isMuted = false,
    isDeafened = false,
    isInChannel = false,
    currentChannel,
    voiceChannels = [],
    onToggleMute,
    onToggleDeafen,
    onJoinLeaveVoice,
    onChangeVoiceChannel,
    onOpenVoiceSettings,

    className = '',
}) {
    // Handle tool selection - auto-enable edit mode
    const handleToolChange = useCallback((toolId) => {
        onToolChange?.(toolId);
        if (!isEditMode) {
            onToggleEditMode?.();
        }
    }, [onToolChange, isEditMode, onToggleEditMode]);

    return (
        <div className={`secondary-footer ${className}`}>
            {/* ================================================================= */}
            {/* LEFT ZONE: Popout Buttons */}
            {/* ================================================================= */}
            <div className="secondary-footer__zone secondary-footer__zone--left">
                <LabeledIconButton
                    icon="map"
                    label="Navigator"
                    active={navigatorOpen}
                    accent="var(--color-accent-teal)"
                    onClick={onToggleNavigator}
                />
                <LabeledIconButton
                    icon="stickyNote"
                    label="Scratchpad"
                    active={scratchpadOpen}
                    accent="var(--color-accent-amber)"
                    onClick={onToggleScratchpad}
                />
            </div>

            {/* ================================================================= */}
            {/* CENTER ZONE: Flow + Edit Tools + Undo/Redo + Canvas Size */}
            {/* ================================================================= */}
            <div className="secondary-footer__zone secondary-footer__zone--center">
                {/* Flow Direction */}
                <SegmentedToggle
                    options={FLOW_OPTIONS}
                    value={flowDirection}
                    onChange={onFlowDirectionChange}
                />

                <div className="secondary-footer__divider" />

                {/* Edit Tools */}
                <ButtonGroup gap="sm">
                    {EDIT_TOOLS.map((tool) => (
                        <IconButton
                            key={tool.id}
                            icon={tool.icon}
                            label={tool.label}
                            active={isEditMode && activeTool === tool.id}
                            size="sm"
                            onClick={() => handleToolChange(tool.id)}
                        />
                    ))}
                    <div className="secondary-footer__divider secondary-footer__divider--small" />
                    <IconButton
                        icon="pencil"
                        label="Toggle Edit Mode"
                        active={isEditMode}
                        size="sm"
                        onClick={onToggleEditMode}
                    />
                </ButtonGroup>

                <div className="secondary-footer__divider" />

                {/* Undo/Redo */}
                <ButtonGroup gap="sm">
                    <IconButton
                        icon="undo"
                        label="Undo"
                        size="sm"
                        disabled={!canUndo}
                        onClick={onUndo}
                    />
                    <IconButton
                        icon="redo"
                        label="Redo"
                        size="sm"
                        disabled={!canRedo}
                        onClick={onRedo}
                    />
                </ButtonGroup>

                <div className="secondary-footer__divider" />

                {/* Canvas Size */}
                <CanvasSizeDisplay
                    cols={canvasSize.cols}
                    rows={canvasSize.rows}
                    onClick={onCanvasSizeChange}
                />
            </div>

            {/* ================================================================= */}
            {/* RIGHT ZONE: Voice Controls (tinted panel) */}
            {/* ================================================================= */}
            <VoiceControlsPanel
                isMuted={isMuted}
                isDeafened={isDeafened}
                isInChannel={isInChannel}
                currentChannel={currentChannel}
                channels={voiceChannels}
                onToggleMute={onToggleMute}
                onToggleDeafen={onToggleDeafen}
                onJoinLeave={onJoinLeaveVoice}
                onChangeChannel={onChangeVoiceChannel}
                onOpenSettings={onOpenVoiceSettings}
                className="secondary-footer__zone secondary-footer__zone--right"
            />
        </div>
    );
}

export default memo(SecondaryFooter);
export { SecondaryFooter };