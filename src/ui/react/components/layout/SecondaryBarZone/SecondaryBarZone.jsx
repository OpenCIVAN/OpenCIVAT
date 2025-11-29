// src/ui/react/components/layout/SecondaryBarZone/SecondaryBarZone.jsx
// Reusable zone component for secondary bars
// Provides consistent styling and behavior for left/center/right zones

import React from 'react';
import { useLayoutContext } from '../ThreeEdgeLayout/ThreeEdgeLayout.jsx';
import { SECONDARY_BAR_MIN_WIDTHS } from '../ThreeEdgeLayout/ThreeEdgeLayout.logic.js';
import './SecondaryBarZone.scss';

/**
 * SecondaryBarZone - A zone within a secondary bar that aligns with panel widths
 * 
 * Three zone types:
 * - left: Aligns with left panel, has minimum width when collapsed
 * - center: Flexible, fills remaining space
 * - right: Aligns with right panel, has minimum width when collapsed
 * 
 * @param {Object} props
 * @param {'left' | 'center' | 'right'} props.position - Zone position
 * @param {React.ReactNode} props.children - Zone content
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.minWidth - Override minimum width (for left/right zones)
 * @param {boolean} props.noBorder - Remove border (useful for custom styling)
 * @param {Object} props.style - Additional inline styles
 * 
 * @example
 * // Basic usage - zones auto-connect to layout context
 * <SecondaryBar>
 *   <SecondaryBarZone position="left">
 *     <WorkspaceSelector />
 *   </SecondaryBarZone>
 *   <SecondaryBarZone position="center">
 *     <ViewModeControls />
 *   </SecondaryBarZone>
 *   <SecondaryBarZone position="right">
 *     <PresenceAvatars />
 *   </SecondaryBarZone>
 * </SecondaryBar>
 * 
 * @example
 * // With explicit dimensions (when not using context)
 * <SecondaryBarZone 
 *   position="left" 
 *   panelWidth={320} 
 *   panelOpen={true}
 * >
 *   <WorkspaceSelector />
 * </SecondaryBarZone>
 */
export function SecondaryBarZone({
    position,
    children,
    className = '',
    minWidth,
    noBorder = false,
    style = {},
    // Allow explicit override of layout values (useful for stories/testing)
    panelWidth,
    panelOpen,
}) {
    // Get layout context for automatic width calculation
    const layoutContext = useLayoutContext();

    // Calculate zone width based on position
    const zoneWidth = React.useMemo(() => {
        if (position === 'center') return undefined; // Center uses flex: 1

        const isLeft = position === 'left';

        // Use explicit props if provided, otherwise use context
        const width = panelWidth ?? (isLeft ? layoutContext.leftPanelWidth : layoutContext.rightPanelWidth);
        const isOpen = panelOpen ?? (isLeft ? layoutContext.leftPanelOpen : layoutContext.rightPanelOpen);
        const defaultMinWidth = isLeft ? SECONDARY_BAR_MIN_WIDTHS.left : SECONDARY_BAR_MIN_WIDTHS.right;
        const effectiveMinWidth = minWidth ?? defaultMinWidth;

        // When panel is open, match its width
        // When collapsed, use minimum width to keep controls usable
        return isOpen ? width : effectiveMinWidth;
    }, [position, panelWidth, panelOpen, layoutContext, minWidth]);

    // Build class names
    const classNames = [
        'secondary-bar-zone',
        `secondary-bar-zone--${position}`,
        noBorder && 'secondary-bar-zone--no-border',
        className,
    ].filter(Boolean).join(' ');

    // Build styles
    const zoneStyle = {
        ...style,
        ...(zoneWidth !== undefined && { width: zoneWidth }),
    };

    return (
        <div className={classNames} style={zoneStyle}>
            {children}
        </div>
    );
}

/**
 * SecondaryBar - Container for secondary bar zones
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - SecondaryBarZone components
 * @param {'top' | 'bottom'} props.position - Bar position (affects border direction)
 * @param {number} props.height - Bar height in pixels
 * @param {string} props.className - Additional CSS classes
 */
export function SecondaryBar({
    children,
    position = 'top',
    height = 36,
    className = '',
}) {
    const classNames = [
        'secondary-bar',
        `secondary-bar--${position}`,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            style={{ height }}
        >
            {children}
        </div>
    );
}

/**
 * SecondaryBarDivider - Visual divider between elements within a zone
 */
export function SecondaryBarDivider({ height = 16 }) {
    return (
        <div
            className="secondary-bar-divider"
            style={{ height }}
        />
    );
}

/**
 * SecondaryBarSpacer - Flexible spacer to push elements apart
 */
export function SecondaryBarSpacer() {
    return <div className="secondary-bar-spacer" />;
}