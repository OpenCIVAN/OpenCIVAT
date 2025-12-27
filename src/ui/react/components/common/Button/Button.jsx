/**
 * @file Button.jsx
 * @description Comprehensive button component for CIA Web.
 * Provides consistent button styling across the entire application,
 * used in modals, toolbars, panels, and forms.
 *
 * Features:
 * - Multiple variants: primary, secondary, danger, ghost, link
 * - Three sizes: sm, md, lg
 * - Loading state with spinner
 * - Icon support (left and right positions)
 * - Full width option
 * - Built-in tooltip support
 * - Full accessibility support
 * - Ref forwarding for focus management
 *
 * @example
 * // Primary button with icon (string name)
 * <Button variant="primary" icon="save" onClick={handleSave}>
 *   Save Changes
 * </Button>
 *
 * @example
 * // Loading state
 * <Button variant="primary" loading>
 *   Saving...
 * </Button>
 *
 * @example
 * // Danger button
 * <Button variant="danger" icon="delete">
 *   Delete
 * </Button>
 */

import React, { forwardRef, memo, useCallback } from 'react';
import { Icon, IconLoader } from '@UI/react/components/common/Icon';
import './Button.scss';

/**
 * @typedef {Object} ButtonProps
 * @property {'primary'|'secondary'|'danger'|'ghost'|'link'} [variant='primary'] - Button style variant
 * @property {'sm'|'md'|'lg'} [size='md'] - Button size
 * @property {string} [icon] - Icon name string to show before label (e.g., "save", "delete")
 * @property {string} [iconRight] - Icon name string to show after label
 * @property {boolean} [iconOnly=false] - If true, renders as icon button (requires icon prop)
 * @property {boolean} [loading=false] - Show loading spinner, disable button
 * @property {boolean} [disabled=false] - Disable button
 * @property {boolean} [fullWidth=false] - Expand to full container width
 * @property {'button'|'submit'|'reset'} [type='button'] - HTML button type
 * @property {string} [className] - Additional CSS classes
 * @property {React.ReactNode} children - Button label
 * @property {() => void} [onClick] - Click handler
 * @property {string} [tooltip] - Tooltip text on hover
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Icon sizes mapped to button sizes.
 */
const BUTTON_ICON_SIZES = {
    sm: 14,
    md: 16,
    lg: 18
};

/**
 * Button component with multiple variants and features.
 * Uses forwardRef for focus management integration.
 *
 * @param {ButtonProps} props - Component props
 * @param {React.Ref} ref - Forwarded ref
 * @returns {React.ReactElement} The rendered button
 */
const Button = forwardRef(function Button(
    {
        children,
        variant = 'primary',
        size = 'md',
        icon,           // Now a string like "save", not a component
        iconRight,      // Now a string like "chevronRight"
        iconOnly = false,
        loading = false,
        disabled = false,
        fullWidth = false,
        type = 'button',
        className = '',
        onClick,
        tooltip,
        testId,
        ...props
    },
    ref
) {
    // Determine if button should be disabled
    const isDisabled = disabled || loading;

    // Get icon size based on button size
    const iconSize = BUTTON_ICON_SIZES[size] || BUTTON_ICON_SIZES.md;

    // Build class names
    const classNames = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full-width',
        loading && 'btn--loading',
        isDisabled && 'btn--disabled',
        iconOnly && 'btn--icon-only',
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
            type={type}
            className={classNames}
            disabled={isDisabled}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-busy={loading}
            aria-disabled={isDisabled}
            title={tooltip}
            data-testid={testId}
            {...props}
        >
            {/* Loading spinner */}
            {loading && (
                <IconLoader className="btn__spinner" size={iconSize} aria-hidden={true} />
            )}

            {/* Left icon */}
            {!loading && icon && (
                <Icon name={icon} size={iconSize} className="btn__icon btn__icon--left" aria-hidden={true} />
            )}

            {/* Button label */}
            {children && (
                <span className="btn__label">{children}</span>
            )}

            {/* Right icon */}
            {!loading && iconRight && (
                <Icon name={iconRight} size={iconSize} className="btn__icon btn__icon--right" aria-hidden={true} />
            )}
        </button>
    );
});

// Memoize to prevent unnecessary re-renders
export default memo(Button);
export { Button };