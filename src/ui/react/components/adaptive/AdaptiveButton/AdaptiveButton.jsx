/**
 * Adaptive Button Component
 *
 * VR-first button with proper touch targets.
 * Desktop: 32px height, VR: 56px height
 */
import React from 'react';
import { useMode } from '../ModeContext';
import Icon from '../Icon/Icon';
import './AdaptiveButton.scss';

const AdaptiveButton = ({
    children,
    icon,
    iconPosition = 'left',
    variant = 'secondary',
    size = 'default',
    disabled = false,
    active = false,
    fullWidth = false,
    onClick,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();

    const buttonStyle = {
        '--button-height': `${size === 'large' ? tokens.buttonHeightLg : tokens.buttonHeight}px`,
        '--button-padding': `${tokens.padding}px`,
        '--button-font-size': `${size === 'large' ? tokens.fontSizeLg : tokens.fontSize}px`,
        '--button-gap': `${tokens.gap}px`,
    };

    const iconWeight = mode === 'vr' ? 'light' : 'regular';

    return (
        <button
            className={`
        adaptive-button
        adaptive-button--${mode}
        adaptive-button--${variant}
        ${size === 'large' ? 'adaptive-button--large' : ''}
        ${active ? 'adaptive-button--active' : ''}
        ${fullWidth ? 'adaptive-button--full-width' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={buttonStyle}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {icon && iconPosition === 'left' && (
                <Icon name={icon} weight={iconWeight} />
            )}
            {children && <span className="adaptive-button__label">{children}</span>}
            {icon && iconPosition === 'right' && (
                <Icon name={icon} weight={iconWeight} />
            )}
        </button>
    );
};

export default AdaptiveButton;