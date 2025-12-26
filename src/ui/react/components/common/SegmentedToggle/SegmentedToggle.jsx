/**
 * @file SegmentedToggle.jsx
 * @description Icon-based segmented toggle for mutually exclusive options.
 * Used for Flow Direction (Row/Column), View Mode (Normal/Isolation/Subset), etc.
 * 
 * Features:
 * - Icon-only buttons with tooltips
 * - Accent color per option
 * - Active state with tinted background
 * - Compact design for toolbars
 * 
 * @example
 * <SegmentedToggle
 *   options={[
 *     { value: 'row', icon: arrow_forward, label: 'Row Flow', accent: 'var(--color-accent-blue)' },
 *     { value: 'column', icon: arrow_downward, label: 'Column Flow', accent: 'var(--color-accent-blue)' },
 *   ]}
 *   value="row"
 *   onChange={(value) => setFlowDirection(value)}
 * />
 */

import React, { useState, useCallback, memo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';

import './SegmentedToggle.scss';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} SegmentedOption
 * @property {string} value - Option value
 * @property {React.ComponentType} icon - Lucide icon component
 * @property {string} label - Tooltip/aria-label text
 * @property {string} [accent] - CSS color for active state
 */

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Segmented toggle component for icon-based option selection.
 *
 * @param {Object} props - Component props
 * @param {SegmentedOption[]} props.options - Available options
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback when value changes
 * @param {boolean} [props.disabled] - Whether toggle is disabled
 * @param {string} [props.className] - Additional CSS class
 */
function SegmentedToggle({
    options = [],
    value,
    onChange,
    disabled = false,
    className = '',
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const handleSelect = useCallback((optionValue) => {
        if (!disabled && optionValue !== value) {
            onChange?.(optionValue);
        }
    }, [disabled, value, onChange]);

    return (
        <div
            className={`segmented-toggle ${disabled ? 'segmented-toggle--disabled' : ''} ${className}`}
            role="radiogroup"
        >
            {options.map((option, index) => {
                const isActive = value === option.value;
                const isHovered = hoveredIndex === index;

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={`segmented-toggle__option ${isActive ? 'segmented-toggle__option--active' : ''}`}
                        style={{ '--option-accent': option.accent }}
                        onClick={() => handleSelect(option.value)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        disabled={disabled}
                        role="radio"
                        aria-checked={isActive}
                        aria-label={option.label}
                        title={option.label}
                        data-hovered={isHovered}
                    >
                        <Icon name={option.icon} size={12} />
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default memo(SegmentedToggle);
export { SegmentedToggle };