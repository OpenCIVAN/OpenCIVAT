/**
 * @file ViewportLinkBorder.jsx
 * @description Wraps a viewport with a colored border indicating link status.
 *
 * Visual states:
 * - No links: No special border
 * - Single property linked: Solid color of that property
 * - Multiple properties linked: Gradient border
 * - Hub: Thicker border with subtle glow and star indicator
 * - Syncing: Animated pulse on the border
 */

import React, { memo, useRef, useEffect, useMemo } from 'react';
import {
    useLinkIndicators,
    LINK_COLORS,
    ROLE_COLORS,
} from '@UI/react/context/LinkIndicatorsContext';
import { SyncPulseRipple } from './SyncPulseRipple';
import './CanvasLinkIndicators.scss';

/**
 * Border width values for different states.
 */
const BORDER_WIDTH = {
    default: 2,
    active: 3,
    hub: 4,
};

/**
 * ViewportLinkBorder - Wrapper component with link-indicating border
 *
 * @param {Object} props
 * @param {string} props.viewId - Unique view identifier
 * @param {string[]} [props.linkedProperties=[]] - Array of property names that are linked
 * @param {boolean} [props.isHub=false] - Whether this view is a hub
 * @param {'synced'|'syncing'|'paused'|'broken'} [props.syncStatus='synced'] - Current sync status
 * @param {React.ReactNode} props.children - Child content
 * @param {string} [props.className=''] - Additional CSS class
 */
export const ViewportLinkBorder = memo(function ViewportLinkBorder({
    viewId,
    linkedProperties = [],
    isHub = false,
    syncStatus = 'synced',
    children,
    className = '',
}) {
    const { settings, recentSyncs, registerViewport, unregisterViewport } =
        useLinkIndicators();
    const containerRef = useRef(null);

    // Track position for connection lines
    useEffect(() => {
        if (!containerRef.current) return;

        const updateRect = () => {
            const rect = containerRef.current.getBoundingClientRect();
            registerViewport(viewId, rect);
        };

        updateRect();

        // Update on resize
        const observer = new ResizeObserver(updateRect);
        observer.observe(containerRef.current);

        // Update on scroll (if in scrollable container)
        window.addEventListener('scroll', updateRect, true);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', updateRect, true);
            unregisterViewport(viewId);
        };
    }, [viewId, registerViewport, unregisterViewport]);

    // Check for recent sync (for pulse)
    const recentSync = recentSyncs.get(viewId);
    const isPulsing =
        recentSync &&
        Date.now() - recentSync.timestamp < 2000; // PULSE_DECAY

    // Don't render special border if no links or borders disabled
    if (!settings.showBorders || linkedProperties.length === 0) {
        return (
            <div ref={containerRef} className={className}>
                {children}
            </div>
        );
    }

    // Calculate border style
    const borderStyle = useMemo(() => {
        const propertyCount = linkedProperties.length;

        if (propertyCount === 0) return {};

        const borderWidth = isHub ? BORDER_WIDTH.hub : BORDER_WIDTH.default;

        // Single property: solid color
        if (propertyCount === 1) {
            const color = LINK_COLORS[linkedProperties[0]];

            if (settings.borderStyle === 'glow') {
                return {
                    border: `${borderWidth}px solid ${color}`,
                    boxShadow: `0 0 ${isHub ? 16 : 10}px ${color}40, inset 0 0 ${isHub ? 8 : 4}px ${color}20`,
                };
            }

            if (settings.borderStyle === 'gradient') {
                return {
                    border: `${borderWidth}px solid transparent`,
                    background: `linear-gradient(var(--color-bg-canvas), var(--color-bg-canvas)) padding-box,
                       linear-gradient(135deg, ${color}, ${color}80) border-box`,
                };
            }

            // solid
            return {
                border: `${borderWidth}px solid ${color}`,
            };
        }

        // Multiple properties: gradient border
        const colors = linkedProperties.map((p) => LINK_COLORS[p]);
        const gradientStops = colors
            .map(
                (c, i) =>
                    `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`
            )
            .join(', ');

        return {
            border: `${borderWidth}px solid transparent`,
            background: `linear-gradient(var(--color-bg-canvas), var(--color-bg-canvas)) padding-box,
                   linear-gradient(135deg, ${gradientStops}) border-box`,
            boxShadow: isHub ? `0 0 12px ${colors[0]}30` : 'none',
        };
    }, [linkedProperties, isHub, settings.borderStyle]);

    const classNames = [
        'viewport-link-border',
        isHub && 'viewport-link-border--hub',
        syncStatus && `viewport-link-border--${syncStatus}`,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div ref={containerRef} className={classNames} style={borderStyle}>
            {/* Hub indicator corner */}
            {isHub && (
                <div className="viewport-link-border__hub-corner">
                    <span className="viewport-link-border__hub-star">★</span>
                </div>
            )}

            {/* Sync pulse overlay */}
            {settings.showSyncPulse && isPulsing && (
                <SyncPulseRipple
                    color={LINK_COLORS[recentSync.property]}
                    userName={recentSync.sourceUserName}
                />
            )}

            {children}
        </div>
    );
});

export default ViewportLinkBorder;
