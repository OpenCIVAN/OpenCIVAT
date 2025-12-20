/**
 * @file SecondaryFooter.jsx
 * @description Secondary footer bar with instance context and voice controls.
 * Height: 36px | z-index: 90
 *
 * Layout:
 * - Left: Popout buttons (Navigator, Scratchpad)
 * - Center: Instance selector, View mode, Canvas size
 * - Right: Voice quick controls
 *
 * @example
 * <SecondaryFooter
 *   activeInstance={instance}
 *   voiceState={voiceState}
 *   onToggleMute={handleMute}
 * />
 */

import React from 'react';
import { PopoutButtons } from './components/PopoutButtons';
import { InstanceSelector } from './components/InstanceSelector';
import { ViewModeToggle } from './components/ViewModeToggle';
import { CanvasSizeDisplay } from './components/CanvasSizeDisplay';
import { VoiceQuickControls } from './components/VoiceQuickControls';

import './SecondaryFooter.scss';

/**
 * Secondary Footer bar component.
 *
 * @param {Object} props - Component props
 * @param {Array} [props.openPopouts] - List of open popout IDs
 * @param {Function} [props.onTogglePopout] - Callback to toggle popout
 * @param {Object} [props.activeInstance] - Currently active instance
 * @param {Array} [props.onCanvasViews] - Views currently on canvas
 * @param {Array} [props.availableViews] - Views available to place
 * @param {Function} [props.onSelectInstance] - Callback when instance is selected
 * @param {Function} [props.onPlaceView] - Callback to place a view
 * @param {string} [props.viewMode] - Current view mode ('normal', 'isolation', 'subset')
 * @param {Function} [props.onViewModeChange] - Callback when view mode changes
 * @param {Object} [props.canvasSize] - Canvas dimensions {cols, rows}
 * @param {Function} [props.onCanvasSizeChange] - Callback when canvas size changes
 * @param {Object} [props.voiceState] - Voice state object
 * @param {Array} [props.voiceChannels] - Available voice channels
 * @param {Function} [props.onToggleMute] - Callback to toggle mute
 * @param {Function} [props.onToggleDeafen] - Callback to toggle deafen
 * @param {Function} [props.onJoinLeaveVoice] - Callback to join/leave voice
 * @param {Function} [props.onChangeVoiceChannel] - Callback to change voice channel
 * @param {Function} [props.onOpenVoiceSettings] - Callback to open voice settings
 */
export function SecondaryFooter({
    // Popouts
    openPopouts = [],
    onTogglePopout,
    // Instance
    activeInstance = null,
    onCanvasViews = [],
    availableViews = [],
    onSelectInstance,
    onPlaceView,
    // View Mode
    viewMode = 'normal',
    onViewModeChange,
    // Canvas Size
    canvasSize = { cols: 2, rows: 2 },
    onCanvasSizeChange,
    // Voice
    voiceState = {},
    voiceChannels = [],
    onToggleMute,
    onToggleDeafen,
    onJoinLeaveVoice,
    onChangeVoiceChannel,
    onOpenVoiceSettings,
}) {
    return (
        <div className="secondary-footer" role="toolbar" aria-label="Instance toolbar">
            {/* Left Zone - Popouts */}
            <div className="secondary-footer__left">
                <PopoutButtons
                    openPopouts={openPopouts}
                    onToggle={onTogglePopout}
                />
            </div>

            {/* Center Zone */}
            <div className="secondary-footer__center">
                <InstanceSelector
                    activeInstance={activeInstance}
                    onCanvasViews={onCanvasViews}
                    availableViews={availableViews}
                    onSelectInstance={onSelectInstance}
                    onPlaceView={onPlaceView}
                />

                <div className="secondary-footer__divider" />

                <ViewModeToggle
                    mode={viewMode}
                    onChange={onViewModeChange}
                />

                <div className="secondary-footer__divider" />

                <CanvasSizeDisplay
                    size={canvasSize}
                    onChange={onCanvasSizeChange}
                />
            </div>

            {/* Right Zone - Voice */}
            <div className="secondary-footer__right">
                <VoiceQuickControls
                    isMuted={voiceState.isMuted}
                    isDeafened={voiceState.isDeafened}
                    isInChannel={voiceState.isInChannel}
                    currentChannel={voiceState.currentChannel}
                    channels={voiceChannels}
                    onToggleMute={onToggleMute}
                    onToggleDeafen={onToggleDeafen}
                    onJoinLeave={onJoinLeaveVoice}
                    onChangeChannel={onChangeVoiceChannel}
                    onOpenSettings={onOpenVoiceSettings}
                />
            </div>
        </div>
    );
}

export default SecondaryFooter;