/**
 * @file SecondaryFooter.jsx
 * @description Secondary footer bar with editing tools, view context, and voice controls.
 * Height: 90px (18px label bar + 72px content) | z-index: 90
 *
 * This component manages its own internal zones rather than receiving
 * zone content from the parent.
 *
 * Layout (with label bar):
 * ┌──────────────┬──────────┬─────────┬────────────────────┬─────────────────────┐
 * │  PANELS      │ EDITING  │ HISTORY │   VIEW CONTEXT     │      VOICE          │  ← Label Bar
 * ├──────────────┼──────────┼─────────┼────────────────────┼─────────────────────┤
 * │  Popouts     │ EditBlk  │ Undo/Rd │ Mode + ViewSelect  │  VoiceControls      │  ← Content
 * └──────────────┴──────────┴─────────┴────────────────────┴─────────────────────┘
 *
 * @example
 * <SecondaryFooter
 *   isEditMode={true}
 *   activeTool="select"
 *   viewMode="normal"
 *   onViewModeChange={handleViewModeChange}
 *   isMuted={false}
 *   isInChannel={true}
 * />
 */

import React, { useCallback, memo } from 'react';

// Shared bar components (from common bars/ folder)
import {
    LabeledIconButton,
    VoiceControlsPanel,
    ViewContextBlock
} from '@UI/react/components/bars';

// Common UI components
import { ButtonGroup, IconButton } from '@UI/react/components/common/Button';
import { Icon } from '@UI/react/components/common/Icon';

// Navigator hook for toggling the floating canvas navigator
import { useNavigatorButton } from '@UI/react/components/panels/LayoutPanel';

// Hook for view logic
import { useSecondaryHeaderLogic } from '@UI/react/hooks/useSecondaryHeaderLogic';

import './SecondaryFooter.scss';

// =============================================================================
// ZONE LABEL BAR COMPONENT
// =============================================================================

/**
 * Displays zone labels above the content row.
 */
const ZoneLabelBar = memo(function ZoneLabelBar({ labels }) {
    return (
        <div className="secondary-footer__label-bar">
            {labels.map((zone, i) => (
                <div
                    key={i}
                    className={`secondary-footer__label ${zone.className || ''}`}
                    style={{
                        flex: zone.flex,
                        minWidth: zone.minWidth,
                        width: zone.width,
                        '--zone-color': zone.color,
                    }}
                >
                    {zone.label && (
                        <span className="secondary-footer__label-text">
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

// Icons are now string names for the Icon component
const FLOW_OPTIONS = [
    { value: 'row', icon: 'arrowRight', label: 'Row Flow', accent: 'var(--color-accent-blue)' },
    { value: 'column', icon: 'arrowDown', label: 'Column Flow', accent: 'var(--color-accent-blue)' },
];

const EDIT_TOOLS = [
    { id: 'select', icon: 'select', label: 'Select', accent: 'var(--color-accent-blue)' },
    { id: 'pan', icon: 'pan_tool', label: 'Pan', accent: 'var(--color-accent-teal)' },
    { id: 'merge', icon: 'merge', label: 'Merge Cells', accent: 'var(--color-accent-purple)' },
];

// Zone labels configuration - class names must match zone widths exactly
const FOOTER_ZONE_LABELS = [
    { label: 'Panels', color: 'var(--color-accent-teal)', className: 'secondary-footer__label--panels' },
    { label: 'Editing', color: 'var(--color-accent-amber)', className: 'secondary-footer__label--editing' },
    { label: 'History', color: 'var(--color-text-muted)', className: 'secondary-footer__label--history' },
    { label: 'View Context', color: 'var(--color-accent-purple)', className: 'secondary-footer__label--view-context' },
    { label: 'Voice', color: 'var(--color-accent-blue)', className: 'secondary-footer__label--voice' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Secondary Footer bar component.
 * Manages its own internal zones for popouts, edit tools, view context, and voice controls.
 */
function SecondaryFooter({
    // Popout props (scratchpad and canvasOps still use passed props)
    scratchpadOpen = false,
    canvasOpsOpen = false,
    onToggleScratchpad,
    onToggleCanvasOps,

    // Edit props
    isEditMode = false,
    activeTool = 'select',
    onToolChange,
    onToggleEditMode,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,

    // View mode props (for ViewContextBlock)
    viewMode = 'normal',
    onViewModeChange,

    // Voice props
    isMuted = false,
    isDeafened = false,
    isInChannel = false,
    isJoiningVoice = false,
    currentChannel,
    voiceChannels = [],
    onToggleMute,
    onToggleDeafen,
    onJoinLeaveVoice,
    onChangeVoiceChannel,
    onOpenVoiceSettings,

    className = '',
}) {
    // Navigator uses its own context-based hook
    const { isFloating: navigatorOpen, toggleNavigator } = useNavigatorButton();

    // Get view logic from context
    const {
        activeView,
        onCanvasViews,
        availableViews,
        onSelectView,
        onPlaceView,
        onViewAction,
        subsetIds,
        onSubsetChange,
        onUpdateLink,
    } = useSecondaryHeaderLogic();

    // Handle tool selection - auto-enable edit mode
    const handleToolChange = useCallback((toolId) => {
        onToolChange?.(toolId);
        if (!isEditMode) {
            onToggleEditMode?.();
        }
    }, [onToolChange, isEditMode, onToggleEditMode]);

    return (
        <div className={`secondary-footer ${className}`}>
            {/* Zone Label Bar - displays above content */}
            <ZoneLabelBar labels={FOOTER_ZONE_LABELS} />

            {/* Content Row */}
            <div className="secondary-footer__content">
                {/* ================================================================= */}
                {/* PANELS ZONE: Popout Buttons */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--panels">
                    <LabeledIconButton
                        icon="map"
                        label="Nav"
                        active={navigatorOpen}
                        accent="var(--color-accent-teal)"
                        onClick={toggleNavigator}
                    />
                    <LabeledIconButton
                        icon="stickyNote"
                        label="Notes"
                        active={scratchpadOpen}
                        accent="var(--color-accent-amber)"
                        onClick={onToggleScratchpad}
                    />
                    <LabeledIconButton
                        icon="sliders"
                        label="Ops"
                        active={canvasOpsOpen}
                        accent="var(--color-accent-blue)"
                        onClick={onToggleCanvasOps}
                    />
                </div>

                <div className="secondary-footer__divider secondary-footer__divider--tall" />

                {/* ================================================================= */}
                {/* EDITING ZONE: Edit Mode Toggle + Tools (v3 stacked style) */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--editing">
                    <div className="secondary-footer__edit-block">
                        {/* Edit toggle button - custom styled */}
                        <button
                            type="button"
                            className="secondary-footer__edit-toggle"
                            data-active={isEditMode}
                            onClick={onToggleEditMode}
                        >
                            <Icon name="edit" size={12} />
                            <span>{isEditMode ? 'Editing' : 'Edit'}</span>
                        </button>
                        {/* Tool buttons row */}
                        <ButtonGroup gap="xs">
                            {EDIT_TOOLS.map((tool) => (
                                <IconButton
                                    key={tool.id}
                                    icon={tool.icon}
                                    label={tool.label}
                                    active={isEditMode && activeTool === tool.id}
                                    size="sm"
                                    disabled={!isEditMode}
                                    onClick={() => handleToolChange(tool.id)}
                                    data-tool={tool.id}
                                />
                            ))}
                        </ButtonGroup>
                    </div>
                </div>

                <div className="secondary-footer__divider secondary-footer__divider--tall" />

                {/* ================================================================= */}
                {/* HISTORY ZONE: Undo/Redo */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--history">
                    <ButtonGroup gap="xs">
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
                </div>

                <div className="secondary-footer__divider secondary-footer__divider--tall" />

                {/* ================================================================= */}
                {/* VIEW CONTEXT ZONE: ViewContextBlock (two rows) */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--view-context">
                    <ViewContextBlock
                        viewMode={viewMode}
                        onModeChange={onViewModeChange}
                        activeView={activeView}
                        onCanvasViews={onCanvasViews}
                        availableViews={availableViews}
                        onSelectView={onSelectView}
                        onViewAction={onViewAction}
                        subsetIds={subsetIds}
                        onSubsetChange={onSubsetChange}
                        onUpdateLink={onUpdateLink}
                    />
                </div>

                <div className="secondary-footer__divider secondary-footer__divider--tall" />

                {/* ================================================================= */}
                {/* VOICE ZONE: Voice Controls (tinted panel) */}
                {/* ================================================================= */}
                <VoiceControlsPanel
                    isMuted={isMuted}
                    isDeafened={isDeafened}
                    isInChannel={isInChannel}
                    isJoining={isJoiningVoice}
                    currentChannel={currentChannel}
                    channels={voiceChannels}
                    onToggleMute={onToggleMute}
                    onToggleDeafen={onToggleDeafen}
                    onJoinLeave={onJoinLeaveVoice}
                    onChangeChannel={onChangeVoiceChannel}
                    onOpenSettings={onOpenVoiceSettings}
                    className="secondary-footer__zone secondary-footer__zone--voice"
                />
            </div>
        </div>
    );
}

export default memo(SecondaryFooter);
export { SecondaryFooter };