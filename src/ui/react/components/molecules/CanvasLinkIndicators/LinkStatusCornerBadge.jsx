/**
 * @file LinkStatusCornerBadge.jsx
 * @description Compact link status indicator positioned in viewport corner.
 *
 * Shows:
 * - Number of linked properties
 * - Hub status (star)
 * - Quick property icons on hover
 * - Click to open Link Manager
 */

import React, { memo, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
    useLinkIndicators,
    LINK_COLORS,
    ROLE_COLORS,
    PROPERTY_ICONS,
} from '@UI/react/context/LinkIndicatorsContext';
import './CanvasLinkIndicators.scss';

/**
 * LinkStatusCornerBadge - Minimal link indicator in viewport corner
 *
 * @param {Object} props
 * @param {string} props.viewId - Unique view identifier
 * @param {string[]} [props.linkedProperties=[]] - Array of linked property names
 * @param {boolean} [props.isHub=false] - Whether this view is a hub
 * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'} [props.position='bottom-left'] - Corner position
 * @param {Function} [props.onClick] - Click handler to open Link Manager
 */
export const LinkStatusCornerBadge = memo(function LinkStatusCornerBadge({
    viewId,
    linkedProperties = [],
    isHub = false,
    position = 'bottom-left',
    onClick,
}) {
    const { settings } = useLinkIndicators();
    const [isHovered, setIsHovered] = useState(false);

    if (!settings.showCornerBadges || linkedProperties.length === 0) {
        return null;
    }

    // Primary color (first linked property or hub color)
    const primaryColor = isHub
        ? ROLE_COLORS.hub
        : LINK_COLORS[linkedProperties[0]];

    const classNames = [
        'link-status-corner-badge',
        `link-status-corner-badge--${position}`,
        isHovered && 'link-status-corner-badge--expanded',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={classNames}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ borderColor: `${primaryColor}50` }}
        >
            {/* Hub star */}
            {isHub && (
                <span
                    className="link-status-corner-badge__hub-star"
                    style={{ color: ROLE_COLORS.hub }}
                >
                    ★
                </span>
            )}

            {/* Link icon + count */}
            <span
                className="link-status-corner-badge__count"
                style={{ color: primaryColor }}
            >
                <Icon name="link" size={10} />
                <span>{linkedProperties.length}</span>
            </span>

            {/* Expanded: show property icons */}
            {isHovered && (
                <div className="link-status-corner-badge__properties">
                    {linkedProperties.map((prop) => (
                        <Icon
                            key={prop}
                            name={PROPERTY_ICONS[prop]}
                            size={10}
                            title={prop}
                            style={{ color: LINK_COLORS[prop] }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default LinkStatusCornerBadge;
