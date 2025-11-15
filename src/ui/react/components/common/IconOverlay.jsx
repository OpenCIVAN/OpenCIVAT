// Reusable component to overlay two Lucide icons

import React from 'react';
import './IconOverlay.css';

/**
 * IconOverlay
 * 
 * Overlays two Lucide icons to create composite icons like "disabled" states.
 * Useful for showing "icon with slash" without needing separate off-state icons.
 * 
 * @param {React.Component} baseIcon - The base icon component
 * @param {React.Component} overlayIcon - The icon to overlay (e.g., Slash)
 * @param {number} size - Icon size in pixels
 * @param {number} strokeWidth - Stroke width for both icons
 * @param {string} className - Additional CSS classes
 */
export function IconOverlay({
    baseIcon: BaseIcon,
    overlayIcon: OverlayIcon,
    size = 18,
    strokeWidth = 2,
    className = '',
    overlayColor = 'currentColor',
    baseOpacity = 0.5, // Dim the base icon when overlaid
}) {
    return (
        <span className={`icon-overlay ${className}`}>
            <BaseIcon
                size={size}
                strokeWidth={strokeWidth}
                style={{ opacity: baseOpacity }}
            />
            <OverlayIcon
                size={size}
                strokeWidth={strokeWidth}
                className="overlay-icon"
                style={{ color: overlayColor }}
            />
        </span>
    );
}

/**
 * Pre-built slash overlay for common "disabled" state
 * 
 * @example
 * <SlashedIcon icon={Compass} size={18} />
 */
export function SlashedIcon({ icon: Icon, size = 18, strokeWidth = 2, className = '' }) {
    // Import Slash here to avoid importing it everywhere
    const { Slash } = require('lucide-react');

    return (
        <IconOverlay
            baseIcon={Icon}
            overlayIcon={Slash}
            size={size}
            strokeWidth={strokeWidth}
            className={className}
            baseOpacity={0.5}
        />
    );
}

/**
 * Helper to create a slashed version of any icon
 * Returns a component that can be used in the icon registry
 * 
 * @example
 * import { createSlashedIcon } from './IconOverlay';
 * 
 * const SlashedCompass = createSlashedIcon(Compass);
 * // Use in registry: 'compass-off': SlashedCompass
 */
export function createSlashedIcon(Icon) {
    return (props) => <SlashedIcon icon={Icon} {...props} />;
}