/**
 * Toggle Component
 *
 * Switch/toggle control that adapts for VR/desktop modes.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import './Toggle.scss';

export const Toggle = ({
    checked = false,
    onChange,
    label,
    disabled = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useAdaptive();

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
            className={`toggle toggle--${mode} ${disabled ? 'toggle--disabled' : ''} ${className}`.trim()}
            style={toggleStyle}
        >
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={handleClick}
                className={`toggle__track ${checked ? 'toggle__track--checked' : ''}`}
                {...props}
            >
                <span className="toggle__knob" />
            </button>
            {label && (
                <span className="toggle__label" onClick={handleClick}>
                    {label}
                </span>
            )}
        </div>
    );
};

export default Toggle;
