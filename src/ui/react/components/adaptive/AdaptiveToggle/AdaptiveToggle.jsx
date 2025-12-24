/**
 * Adaptive Toggle Component
 *
 * Switch/toggle control that scales for VR.
 */
import React from 'react';
import { useMode } from '../ModeContext';
import './AdaptiveToggle.scss';

const AdaptiveToggle = ({
    checked = false,
    onChange,
    label,
    disabled = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();

    // Scale toggle size based on mode
    const toggleWidth = mode === 'vr' ? 56 : 40;
    const toggleHeight = mode === 'vr' ? 32 : 22;
    const knobSize = mode === 'vr' ? 26 : 18;

    const toggleStyle = {
        '--toggle-width': `${toggleWidth}px`,
        '--toggle-height': `${toggleHeight}px`,
        '--knob-size': `${knobSize}px`,
        '--label-font-size': `${tokens.fontSize}px`,
        '--gap': `${tokens.gap}px`,
    };

    const handleClick = () => {
        if (!disabled && onChange) {
            onChange(!checked);
        }
    };

    return (
        <div
            className={`
        adaptive-toggle
        adaptive-toggle--${mode}
        ${disabled ? 'adaptive-toggle--disabled' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={toggleStyle}
        >
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={handleClick}
                className={`adaptive-toggle__track ${checked ? 'adaptive-toggle__track--checked' : ''}`}
                {...props}
            >
                <span className="adaptive-toggle__knob" />
            </button>
            {label && (
                <span className="adaptive-toggle__label" onClick={handleClick}>
                    {label}
                </span>
            )}
        </div>
    );
};

export default AdaptiveToggle;