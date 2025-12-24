// src/ui/react/components/controls/ViewModeToggle/ViewModeToggle.jsx
// Toggle between Desktop and VR viewing modes
// Designed for use in SecondaryBottomBar left zone

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { useViewModeToggle, VIEW_MODES } from './ViewModeToggle.logic.js';
import './ViewModeToggle.scss';

/**
 * ViewModeToggle - Switches between Desktop and VR modes
 * 
 * Features:
 * - Visual toggle with icons
 * - Tooltip showing current mode details
 * - VR availability detection
 * - Keyboard accessible
 * 
 * @param {Object} props
 * @param {string} props.mode - Current mode ('desktop' | 'vr')
 * @param {Function} props.onModeChange - Callback when mode changes
 * @param {boolean} props.vrAvailable - Whether VR is available (WebXR support)
 * @param {boolean} props.disabled - Disable the toggle
 * @param {boolean} props.compact - Compact mode (icons only, no labels)
 * @param {string} props.className - Additional CSS classes
 */
export function ViewModeToggle({
    mode: controlledMode,
    onModeChange,
    vrAvailable: controlledVrAvailable,
    disabled = false,
    compact = false,
    className = '',
}) {
    const {
        mode,
        setMode,
        vrAvailable,
        isDesktop,
        isVR,
        canEnterVR,
        vrUnavailableReason,
    } = useViewModeToggle({
        initialMode: controlledMode,
        onModeChange,
        vrAvailable: controlledVrAvailable,
    });

    const handleModeChange = (newMode) => {
        if (disabled) return;
        if (newMode === VIEW_MODES.VR && !canEnterVR) return;
        setMode(newMode);
    };

    const classNames = [
        'view-mode-toggle',
        disabled && 'view-mode-toggle--disabled',
        compact && 'view-mode-toggle--compact',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} role="radiogroup" aria-label="View mode">
            {/* Desktop Button */}
            <button
                type="button"
                role="radio"
                aria-checked={isDesktop}
                className={`view-mode-toggle__btn ${isDesktop ? 'view-mode-toggle__btn--active' : ''}`}
                onClick={() => handleModeChange(VIEW_MODES.DESKTOP)}
                disabled={disabled}
                title="Desktop Mode - Standard 2D interface"
            >
                <Icon name="monitor" size={compact ? 14 : 12} className="view-mode-toggle__icon" />
                {!compact && <span className="view-mode-toggle__label">Desktop</span>}
            </button>

            {/* VR Button */}
            <button
                type="button"
                role="radio"
                aria-checked={isVR}
                className={`view-mode-toggle__btn ${isVR ? 'view-mode-toggle__btn--active' : ''} ${!canEnterVR ? 'view-mode-toggle__btn--unavailable' : ''}`}
                onClick={() => handleModeChange(VIEW_MODES.VR)}
                disabled={disabled || !canEnterVR}
                title={canEnterVR ? "VR Mode - Immersive 3D experience" : vrUnavailableReason}
            >
                <Icon name="glasses" size={compact ? 14 : 12} className="view-mode-toggle__icon" />
                {!compact && <span className="view-mode-toggle__label">VR</span>}
                {!canEnterVR && !compact && (
                    <span className="view-mode-toggle__unavailable-indicator" title={vrUnavailableReason}>
                        !
                    </span>
                )}
            </button>
        </div>
    );
}

/**
 * ViewModeIndicator - Read-only display of current mode
 * Use when you just want to show the mode without allowing changes
 */
export function ViewModeIndicator({ mode, compact = false }) {
    const isVR = mode === VIEW_MODES.VR;
    const iconName = isVR ? 'glasses' : 'monitor';
    const label = isVR ? 'VR Mode' : 'Desktop';

    return (
        <div className={`view-mode-indicator ${compact ? 'view-mode-indicator--compact' : ''}`}>
            <Icon name={iconName} size={12} className="view-mode-indicator__icon" />
            {!compact && <span className="view-mode-indicator__label">{label}</span>}
        </div>
    );
}

export { VIEW_MODES };