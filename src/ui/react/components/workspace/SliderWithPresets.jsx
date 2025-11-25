// src/ui/react/components/workspace/SliderWithPresets.jsx
// Enhanced slider with integrated presets directly underneath

import React, { useState, useEffect, useRef } from 'react';
import './SliderWithPresets.scss';

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
    const isDraggingRef = useRef(false);
    const isInteractingRef = useRef(false); // Tracks any user interaction
    const lastEmittedValueRef = useRef(value);
    const syncTimeoutRef = useRef(null);

    // Only sync external value when NOT interacting and value actually changed externally
    useEffect(() => {
        // Clear any pending sync
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        // Don't sync while user is interacting
        if (isInteractingRef.current) {
            return;
        }

        // Only sync if this is truly an external change (not our own emission bouncing back)
        const isExternalChange = Math.abs(value - lastEmittedValueRef.current) > step / 2;

        if (isExternalChange || Math.abs(value - localValue) > step / 2) {
            // Small delay to avoid race conditions with throttled onChange
            syncTimeoutRef.current = setTimeout(() => {
                if (!isInteractingRef.current) {
                    setLocalValue(value);
                    lastEmittedValueRef.current = value;
                }
            }, 100);
        }
    }, [value, step, localValue]);

    const emitChange = (newValue) => {
        if (!onChange || disabled) return;

        // Emit immediately - no throttling during drag, just update
        onChange(newValue);
        lastEmittedValueRef.current = newValue;
    };

    const handleChange = (e) => {
        if (disabled) return;
        const newValue = parseFloat(e.target.value);
        setLocalValue(newValue);

        // Only emit on change, not throttled - let React handle batching
        emitChange(newValue);
    };

    const handleMouseDown = () => {
        if (disabled) return;
        isDraggingRef.current = true;
        isInteractingRef.current = true;

        // Clear any pending sync when starting interaction
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;

        // Emit final value
        if (onChange && !disabled) {
            onChange(localValue);
            lastEmittedValueRef.current = localValue;
        }

        // Delay clearing interaction flag to avoid sync race
        setTimeout(() => {
            isInteractingRef.current = false;
        }, 150);
    };

    const handlePresetClick = (presetValue) => {
        if (disabled) return;
        isInteractingRef.current = true;
        setLocalValue(presetValue);
        if (onChange) {
            onChange(presetValue);
            lastEmittedValueRef.current = presetValue;
        }
        // Clear interaction flag after a delay
        setTimeout(() => {
            isInteractingRef.current = false;
        }, 150);
    };

    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
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