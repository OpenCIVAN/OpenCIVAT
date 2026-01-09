/**
 * @file SyncPulseRipple.jsx
 * @description Animated ripple effect when a view receives a sync event.
 * Shows a brief colored pulse emanating from the border with optional user attribution.
 */

import React, { memo } from 'react';
import './CanvasLinkIndicators.scss';

/**
 * SyncPulseRipple - Animated ripple effect on sync events
 *
 * @param {Object} props
 * @param {string} props.color - Color of the pulse
 * @param {string} [props.userName] - Optional user name to show in attribution toast
 */
export const SyncPulseRipple = memo(function SyncPulseRipple({ color, userName }) {
    return (
        <>
            {/* Ripple animation */}
            <div
                className="sync-pulse-ripple"
                style={{ borderColor: color }}
            />

            {/* Inner glow */}
            <div
                className="sync-pulse-glow"
                style={{
                    background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
                }}
            />

            {/* User attribution toast */}
            {userName && (
                <div
                    className="sync-pulse-attribution"
                    style={{ backgroundColor: color }}
                >
                    <span className="sync-pulse-attribution__arrow">↓</span>
                    <span className="sync-pulse-attribution__name">{userName}</span>
                </div>
            )}
        </>
    );
});

export default SyncPulseRipple;
