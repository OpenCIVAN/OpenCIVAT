/**
 * Adaptive Option List Component
 *
 * Selectable list for single/multi-select options.
 */
import React from 'react';
import { useMode } from '../ModeContext';
import Icon from '../Icon/Icon';
import './AdaptiveOptionList.scss';

const AdaptiveOptionList = ({
    options = [],
    value,
    onChange,
    multiple = false,
    disabled = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();

    const listStyle = {
        '--item-height': `${tokens.buttonHeight}px`,
        '--padding': `${tokens.padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
    };

    const iconWeight = mode === 'vr' ? 'light' : 'regular';

    const isSelected = (optionValue) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    const handleSelect = (optionValue) => {
        if (disabled) return;

        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            onChange?.(newValues);
        } else {
            onChange?.(optionValue);
        }
    };

    return (
        <div
            className={`
        adaptive-option-list
        adaptive-option-list--${mode}
        ${disabled ? 'adaptive-option-list--disabled' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={listStyle}
            role="listbox"
            aria-multiselectable={multiple}
            {...props}
        >
            {options.map((option) => {
                const selected = isSelected(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={option.disabled || disabled}
                        className={`
              adaptive-option-list__item
              ${selected ? 'adaptive-option-list__item--selected' : ''}
            `.trim()}
                        onClick={() => handleSelect(option.value)}
                    >
                        {option.icon && (
                            <Icon name={option.icon} weight={iconWeight} />
                        )}
                        <span className="adaptive-option-list__label">{option.label}</span>
                        {selected && (
                            <Icon
                                name="check"
                                weight={iconWeight}
                                className="adaptive-option-list__check"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default AdaptiveOptionList;