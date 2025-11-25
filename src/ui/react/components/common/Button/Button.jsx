// src/ui/react/components/common/Button/Button.jsx
// Atomic button component with all glass variants

import React from "react";
import "./Button.scss";

/**
 * Button Component
 *
 * Atomic button with multiple variants matching the glassmorphism design system.
 *
 * @param {string} variant - 'default' | 'primary' | 'accent' | 'ghost' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Take full container width
 * @param {boolean} disabled - Disabled state
 * @param {React.ReactNode} icon - Optional leading icon
 * @param {React.ReactNode} iconRight - Optional trailing icon
 * @param {string} className - Additional classes
 */
export function Button({
    children,
    variant = "default",
    size = "md",
    fullWidth = false,
    disabled = false,
    icon = null,
    iconRight = null,
    className = "",
    type = "button",
    onClick,
    ...props
}) {
    const classNames = [
        "btn",
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && "btn--full-width",
        disabled && "btn--disabled",
        className,
    ].filter(Boolean).join(" ");

    return (
        <button
            type={type}
            className={classNames}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {icon && <span className="btn__icon btn__icon--left">{icon}</span>}
            {children && <span className="btn__text">{children}</span>}
            {iconRight && <span className="btn__icon btn__icon--right">{iconRight}</span>}
        </button>
    );
}

/**
 * IconButton Component
 *
 * Square button for icons only (toolbar buttons, etc.)
 */
export function IconButton({
    children,
    variant = "default",
    size = "md",
    active = false,
    disabled = false,
    className = "",
    tooltip = null,
    onClick,
    ...props
}) {
    const classNames = [
        "icon-btn",
        `icon-btn--${variant}`,
        `icon-btn--${size}`,
        active && "icon-btn--active",
        disabled && "icon-btn--disabled",
        className,
    ].filter(Boolean).join(" ");

    return (
        <button
            type="button"
            className={classNames}
            disabled={disabled}
            onClick={onClick}
            aria-label={tooltip}
            {...props}
        >
            {children}
            {tooltip && <span className="icon-btn__tooltip">{tooltip}</span>}
        </button>
    );
}

/**
 * ButtonGroup Component
 *
 * Container for grouped buttons (like a toolbar segment)
 */
export function ButtonGroup({ children, className = "" }) {
    return (
        <div className={`btn-group ${className}`}>
            {children}
        </div>
    );
}

export default Button;