// src/ui/react/components/workspace/SliderWithPresets.jsx
// Enhanced slider with integrated presets directly underneath

import React, { useState, useEffect, useRef } from 'react';

/**
 * SliderWithPresets
 * 
 * Combines slider + preset buttons in compact vertical layout.
 * Shows clear visual disabled state.
 * Presets appear directly under slider (not separate section).
 * 
 * VISUAL DISABLED STATE:
 * - Slider track is red/warning color
 * - "DISABLED" badge shown
 * - Clear explanation text
 * - Thumb is locked icon
 */
export function SliderWithPresets({
    icon,
    label,
    value,
    min = 0,
    max = 1,
    step = 0.01,
    onChange,
    formatValue = (val) => val.toFixed(2),
    presets = null,
    disabled = false,
    disabledReason = "Not available",
}) {
    const [localValue, setLocalValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const throttleTimerRef = useRef(null);
    const lastEmittedValueRef = useRef(value);

    useEffect(() => {
        if (!isDragging) {
            setLocalValue(value);
            lastEmittedValueRef.current = value;
        }
    }, [value, isDragging]);

    const emitChange = (newValue) => {
        if (!onChange || disabled) return;

        if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
        }

        if (!isDragging) {
            onChange(newValue);
            lastEmittedValueRef.current = newValue;
        } else {
            throttleTimerRef.current = setTimeout(() => {
                onChange(newValue);
                lastEmittedValueRef.current = newValue;
            }, 50);
        }
    };

    const handleChange = (e) => {
        if (disabled) return;
        const newValue = parseFloat(e.target.value);
        setLocalValue(newValue);
        emitChange(newValue);
    };

    const handleMouseDown = () => {
        if (disabled) return;
        setIsDragging(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);

        if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
        }

        if (onChange && !disabled && localValue !== lastEmittedValueRef.current) {
            onChange(localValue);
            lastEmittedValueRef.current = localValue;
        }
    };

    const handlePresetClick = (presetValue) => {
        if (disabled) return;
        setLocalValue(presetValue);
        if (onChange) {
            onChange(presetValue);
            lastEmittedValueRef.current = presetValue;
        }
    };

    useEffect(() => {
        return () => {
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
    }, []);

    const progress = ((localValue - min) / (max - min)) * 100;

    return (
        <div className={`slider-with-presets ${disabled ? 'disabled' : ''}`}>
            {/* Header with label and value */}
            <div className="slider-header">
                <div className="slider-label-group">
                    {icon && <span className="slider-icon">{icon}</span>}
                    <span className="slider-label">{label}</span>
                    {disabled && (
                        <span className="slider-disabled-badge">DISABLED</span>
                    )}
                </div>
                <span className="slider-value">
                    {formatValue(localValue)}
                </span>
            </div>

            {/* Slider track */}
            <div className="slider-track-container">
                <input
                    type="range"
                    className="slider-input"
                    min={min}
                    max={max}
                    step={step}
                    value={localValue}
                    onChange={handleChange}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleMouseUp}
                    disabled={disabled}
                    style={{ '--slider-progress': `${progress}%` }}
                />
            </div>

            {/* Presets directly under slider */}
            {presets && presets.length > 0 && (
                <div className="slider-presets-row">
                    {presets.map((preset, index) => {
                        const isActive = Math.abs(localValue - preset) < step * 2;
                        return (
                            <button
                                key={index}
                                className={`preset-btn ${isActive ? 'active' : ''}`}
                                onClick={() => handlePresetClick(preset)}
                                disabled={disabled}
                                title={formatValue(preset)}
                            >
                                {formatValue(preset)}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Disabled reason (only shown when disabled) */}
            {disabled && disabledReason && (
                <div className="slider-disabled-reason">{disabledReason}</div>
            )}
        </div>
    );
}

/* ============================================================================
   KEY IMPROVEMENTS:
   
   1. **Clear Disabled State**:
      - Red track color (not just grey)
      - "DISABLED" badge
      - Red thumb
      - Explanation text
      
   2. **Integrated Presets**:
      - Buttons directly under slider
      - No separate section needed
      - Active preset highlighted
      - Compact horizontal row
      
   3. **Space Efficient**:
      - ~30% less vertical space
      - Presets and slider together
      - No redundant sections
      
   4. **Better UX**:
      - Can't miss that it's disabled
      - Preset buttons feel related to slider
      - Quick value selection
      - Clear visual hierarchy
   ============================================================================ */