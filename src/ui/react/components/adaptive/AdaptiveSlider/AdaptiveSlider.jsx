/**
 * Adaptive Slider Component
 *
 * Range slider with VR-sized track and thumb.
 */
import React, { useRef, useCallback } from 'react';
import { useMode } from '../ModeContext';
import './AdaptiveSlider.scss';

const AdaptiveSlider = ({
    value = 0,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    label,
    showValue = true,
    valueFormatter = (v) => v,
    disabled = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();
    const trackRef = useRef(null);

    // Scale sizes based on mode
    const trackHeight = mode === 'vr' ? 12 : 6;
    const thumbSize = mode === 'vr' ? 32 : 18;

    const percentage = ((value - min) / (max - min)) * 100;

    const sliderStyle = {
        '--track-height': `${trackHeight}px`,
        '--thumb-size': `${thumbSize}px`,
        '--fill-percentage': `${percentage}%`,
        '--label-font-size': `${tokens.fontSize}px`,
        '--gap': `${tokens.gap}px`,
    };

    const handleChange = useCallback((e) => {
        if (onChange && !disabled) {
            onChange(parseFloat(e.target.value));
        }
    }, [onChange, disabled]);

    return (
        <div
            className={`
        adaptive-slider
        adaptive-slider--${mode}
        ${disabled ? 'adaptive-slider--disabled' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={sliderStyle}
        >
            {(label || showValue) && (
                <div className="adaptive-slider__header">
                    {label && <span className="adaptive-slider__label">{label}</span>}
                    {showValue && (
                        <span className="adaptive-slider__value">{valueFormatter(value)}</span>
                    )}
                </div>
            )}
            <div className="adaptive-slider__track-wrapper" ref={trackRef}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className="adaptive-slider__input"
                    {...props}
                />
                <div className="adaptive-slider__track">
                    <div className="adaptive-slider__fill" />
                </div>
            </div>
        </div>
    );
};

export default AdaptiveSlider;