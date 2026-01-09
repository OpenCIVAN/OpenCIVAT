/**
 * @file LinkConnectionLinesOverlay.jsx
 * @description SVG overlay showing connection lines between linked viewports.
 *
 * Renders lines between linked viewports. Can show:
 * - All links
 * - Links for a specific property
 * - Links for a specific view (on hover)
 *
 * Line styles:
 * - Curved (bezier) - default, elegant
 * - Straight - simple, clear
 * - Orthogonal - follows grid, technical
 */

import React, { memo, useMemo } from 'react';
import { useLinkIndicators, LINK_COLORS } from '@UI/react/context/LinkIndicatorsContext';
import './CanvasLinkIndicators.scss';

/**
 * LinkConnectionLinesOverlay - SVG overlay showing link connections
 *
 * @param {Object} props
 * @param {Array} [props.syncGroups=[]] - Array of SyncGroup objects
 * @param {string} [props.highlightViewId] - View to highlight connections for
 * @param {string} [props.highlightProperty] - Property to highlight
 */
export const LinkConnectionLinesOverlay = memo(function LinkConnectionLinesOverlay({
    syncGroups = [],
    highlightViewId,
    highlightProperty,
}) {
    const { settings, viewportRects } = useLinkIndicators();

    if (!settings.showConnectionLines) {
        return null;
    }

    // Calculate lines for each sync group
    const lines = useMemo(() => {
        const result = [];

        for (const group of syncGroups) {
            const hubRect = viewportRects.get(group.hubViewId);
            if (!hubRect) continue;

            const hubCenter = {
                x: hubRect.left + hubRect.width / 2,
                y: hubRect.top + hubRect.height / 2,
            };

            // Check if this group should be highlighted
            const isHighlighted =
                !highlightViewId ||
                group.hubViewId === highlightViewId ||
                group.members?.has?.(highlightViewId);

            const isPropertyHighlighted =
                !highlightProperty || group.property === highlightProperty;

            const opacity = isHighlighted && isPropertyHighlighted ? 1 : 0.2;
            const color = LINK_COLORS[group.property];

            // Create line from hub to each member
            const members = group.members instanceof Map
                ? Array.from(group.members.entries())
                : Object.entries(group.members || {});

            for (const [memberId, membership] of members) {
                const memberRect = viewportRects.get(memberId);
                if (!memberRect) continue;

                const memberCenter = {
                    x: memberRect.left + memberRect.width / 2,
                    y: memberRect.top + memberRect.height / 2,
                };

                result.push({
                    id: `${group.id}-${memberId}`,
                    from: hubCenter,
                    to: memberCenter,
                    color,
                    opacity,
                    mode: membership?.mode || 'sync',
                    property: group.property,
                });
            }
        }

        return result;
    }, [syncGroups, viewportRects, highlightViewId, highlightProperty]);

    if (lines.length === 0) {
        return null;
    }

    return (
        <svg className="link-connection-lines-overlay">
            <defs>
                {/* Arrow marker for directional links */}
                <marker
                    id="linkArrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                >
                    <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
                </marker>

                {/* Glow filter */}
                <filter
                    id="linkLineGlow"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                >
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {lines.map((line) => (
                <LinkConnectionLine
                    key={line.id}
                    from={line.from}
                    to={line.to}
                    color={line.color}
                    opacity={line.opacity}
                    mode={line.mode}
                    style={settings.lineStyle}
                />
            ))}
        </svg>
    );
});

/**
 * LinkConnectionLine - Single connection line between two points
 */
const LinkConnectionLine = memo(function LinkConnectionLine({
    from,
    to,
    color,
    opacity = 1,
    mode = 'sync',
    style = 'curved',
}) {
    // Calculate path based on style
    const pathD = useMemo(() => {
        if (style === 'straight') {
            return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
        }

        if (style === 'orthogonal') {
            const midX = (from.x + to.x) / 2;
            return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
        }

        // curved (bezier)
        const dx = to.x - from.x;
        const cx1 = from.x + dx * 0.4;
        const cy1 = from.y;
        const cx2 = to.x - dx * 0.4;
        const cy2 = to.y;
        return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
    }, [from, to, style]);

    // Arrow marker for directional modes
    const showArrow = mode === 'follow' || mode === 'broadcast';

    // Line style based on mode
    const strokeDasharray = mode === 'follow' ? '6 4' : 'none';

    return (
        <g style={{ color, opacity }}>
            {/* Glow under line */}
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeOpacity="0.2"
                filter="url(#linkLineGlow)"
            />

            {/* Main line */}
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                markerEnd={showArrow ? 'url(#linkArrow)' : undefined}
            />
        </g>
    );
});

export default LinkConnectionLinesOverlay;
