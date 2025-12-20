/**
 * @file IconButton.jsx
 * @description Square icon button component for CIA Web.
 * Used in toolbars, panels, and anywhere icon-only actions are needed.
 *
 * Features:
 * - Square shape optimized for icons
 * - Multiple variants: primary, secondary, danger, ghost
 * - Three sizes: sm, md, lg
 * - Active/pressed state for toggleable buttons
 * - Loading state with spinner
 * - Built-in tooltip support
 * - Full accessibility with required label
 * - Ref forwarding for focus management
 *
 * @example
 * // Basic icon button (no visual tooltip, just aria-label)
 * <IconButton
 *   icon={Settings}
 *   label="Settings"
 *   onClick={openSettings}
 * />
 *
 * @example
 * // With built-in tooltip (uses label text)
 * <IconButton
 *   icon={Download}
 *   label="Download file"
 *   tooltip={true}
 *   variant="primary"
 * />
 *
 * @example
 * // With custom tooltip text
 * <IconButton
 *   icon={Save}
 *   label="Save"
 *   tooltip="Save changes (Ctrl+S)"
 * />
 *
 * @example
 * // Toggle button with active state
 * <IconButton
 *   icon={Grid}
 *   label="Grid view"
 *   active={viewMode === 'grid'}
 *   onClick={() => setViewMode('grid')}
 * />
 */

import React, { forwardRef, memo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import './Button.scss';

/**
 * @typedef {Object} IconButtonProps
 * @property {React.ComponentType} icon - Lucide icon component (required)
 * @property {string} label - Accessible label (required for a11y)
 * @property {'primary'|'secondary'|'danger'|'ghost'} [variant='ghost'] - Button style
 * @property {'sm'|'md'|'lg'} [size='md'] - Button size
 * @property {boolean} [active=false] - Show active/pressed state
 * @property {boolean} [loading=false] - Show loading spinner
 * @property {boolean} [disabled=false] - Disable button
 * @property {string|boolean} [tooltip] - Tooltip text, or true to use label, or false/omit to disable
 * @property {string} [className] - Additional CSS classes
 * @property {() => void} [onClick] - Click handler
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Icon sizes mapped to button sizes.
 */
const ICON_SIZES = {
    sm: 14,
    md: 18,
    lg: 20
};

/**
 * Square icon button component.
 * Uses forwardRef for focus management integration.
 *
 * @param {IconButtonProps} props - Component props
 * @param {React.Ref} ref - Forwarded ref
 * @returns {React.ReactElement} The rendered icon button
 */
const IconButton = forwardRef(function IconButton(
    {
        icon: Icon,
        label,
        variant = 'ghost',
        size = 'md',
        active = false,
        loading = false,
        disabled = false,
        tooltip,
        className = '',
        onClick,
        testId,
        ...props
    },
    ref
) {
    // Determine if button should be disabled
    const isDisabled = disabled || loading;

    // Get icon size based on button size
    const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

    // Tooltip is opt-in: pass string for custom text, true to use label, false/omit to disable
    // This prevents double tooltips when using the Tooltip wrapper component
    const tooltipText = tooltip === true ? label : (typeof tooltip === 'string' ? tooltip : null);

    // Build class names
    const classNames = [
        'icon-btn',
        `icon-btn--${variant}`,
        `icon-btn--${size}`,
        active && 'icon-btn--active',
        loading && 'icon-btn--loading',
        isDisabled && 'icon-btn--disabled',
        className
    ].filter(Boolean).join(' ');

    /**
     * Handle click events.
     * Prevents click when loading or disabled.
     */
    const handleClick = useCallback((event) => {
        if (isDisabled) {
            event.preventDefault();
            return;
        }
        if (onClick) {
            onClick(event);
        }
    }, [isDisabled, onClick]);

    /**
     * Handle keyboard events for accessibility.
     */
    const handleKeyDown = useCallback((event) => {
        if (isDisabled) return;

        // Trigger click on Enter or Space
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (onClick) {
                onClick(event);
            }
        }
    }, [isDisabled, onClick]);

    return (
        <button
            ref={ref}
            type="button"
            className={classNames}
            disabled={isDisabled}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={label}
            aria-pressed={active}
            aria-busy={loading}
            aria-disabled={isDisabled}
            data-testid={testId}
            {...props}
        >
            {loading ? (
                <Loader2 className="icon-btn__spinner" size={iconSize} aria-hidden="true" />
            ) : (
                Icon && <Icon size={iconSize} aria-hidden="true" />
            )}
            {tooltipText && <span className="icon-btn__tooltip">{tooltipText}</span>}
        </button>
    );
});

// Memoize to prevent unnecessary re-renders
export default memo(IconButton);
export { IconButton };