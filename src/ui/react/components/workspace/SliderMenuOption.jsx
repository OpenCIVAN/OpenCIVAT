// src/ui/react/components/workspace/SliderMenuOption.jsx
// Reusable slider component for dropdown menus

import React, { useState, useEffect, useRef } from 'react';
import './SliderMenuOption.scss';

/**
 * SliderMenuOption - Reusable slider for dropdown menus
 *
 * USAGE PATTERN:
 * Include in any menu's options array:
 * {
 *   type: 'slider',
 *   component: <SliderMenuOption
 *     icon={<Icon size={14} />}
 *     label="Opacity"
 *     value={opacity}
 *     min={0}
 *     max={1}
 *     step={0.01}
 *     onChange={(val) => setOpacity(instanceId, val)}
 *     formatValue={(val) => `${Math.round(val * 100)}%`}
 *   />
 * }
 */
export function SliderMenuOption({
  icon,
  label,
  description,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  formatValue = (val) => val.toFixed(2),
  presets = null,
  disabled = false,
}) {
  const [localValue, setLocalValue] = useState(value);
  const isInteractingRef = useRef(false);
  const lastEmittedValueRef = useRef(value);
  const syncTimeoutRef = useRef(null);

  // Update local value when prop changes (only when not interacting)
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    if (isInteractingRef.current) {
      return;
    }

    // Only sync if this is truly an external change
    const isExternalChange = Math.abs(value - lastEmittedValueRef.current) > step / 2;

    if (isExternalChange || Math.abs(value - localValue) > step / 2) {
      syncTimeoutRef.current = setTimeout(() => {
        if (!isInteractingRef.current) {
          setLocalValue(value);
          lastEmittedValueRef.current = value;
        }
      }, 100);
    }
  }, [value, step, localValue]);

  const handleChange = (e) => {
    if (disabled) return;
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);

    if (onChange) {
      onChange(newValue);
      lastEmittedValueRef.current = newValue;
    }
  };

  const handleMouseDown = () => {
    if (disabled) return;
    isInteractingRef.current = true;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
  };

  const handleMouseUp = () => {
    // Emit final value
    if (onChange && !disabled) {
      onChange(localValue);
      lastEmittedValueRef.current = localValue;
    }

    // Delay clearing interaction flag
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 150);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Calculate progress percentage for gradient
  const progress = ((localValue - min) / (max - min)) * 100;

  return (
    <div
      className="menu-option slider-option"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={label}
    >
      {/* Header with icon, label, and current value */}
      <div className="slider-header">
        <div className="slider-label-group">
          {icon && <span className="slider-icon">{icon}</span>}
          <span className="slider-label">{label}</span>
        </div>
        <span className="slider-value" aria-live="polite">
          {formatValue(localValue)}
        </span>
      </div>

      {/* Slider input */}
      <div className="slider-input-container">
        <input
          type="range"
          className="dropdown-slider"
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
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localValue}
          aria-valuetext={formatValue(localValue)}
        />
      </div>

      {/* Optional preset tick marks */}
      {presets && (
        <div className="slider-presets">
          {presets.map((preset, index) => (
            <div
              key={index}
              className="slider-preset-mark"
              style={{
                opacity: Math.abs(localValue - preset) < step * 2 ? 1 : 0.3
              }}
            />
          ))}
        </div>
      )}

      {/* Optional description */}
      {description && (
        <div className="slider-description">{description}</div>
      )}
    </div>
  );
}

/**
 * Example usage in VTKInstanceHandler.getTools():
 * 
 * {
 *   id: "appearance-menu",
 *   type: "menu",
 *   icon: "eye",
 *   label: "Appearance",
 *   options: [
 *     {
 *       type: 'custom',
 *       component: (
 *         <SliderMenuOption
 *           icon={<Circle size={14} />}
 *           label="Opacity"
 *           value={currentOpacity}
 *           min={0}
 *           max={1}
 *           step={0.01}
 *           onChange={(val) => instanceTools.setOpacity(instanceId, val)}
 *           formatValue={(val) => `${Math.round(val * 100)}%`}
 *           presets={[0, 0.25, 0.5, 0.75, 1.0]}
 *           description="Adjust transparency"
 *         />
 *       )
 *     },
 *     { type: 'separator' },
 *     // ... other options
 *   ]
 * }
 */