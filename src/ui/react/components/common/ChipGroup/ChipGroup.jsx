// src/ui/react/components/common/ChipGroup/ChipGroup.jsx
// Multi-select chip/toggle group component
//
// Use cases:
// - Scope filters (Project | Room | Personal)
// - Type filters (Point | Ruler | Region | Note)
// - Any multi-select toggle group
//
// For single-select tab navigation, use PillBar instead.

import React, { memo, useCallback } from 'react';
import './ChipGroup.scss';

/**
 * ChipGroup - Multi-select toggle chips
 *
 * @param {Array} chips - Array of chip objects: { id, label, icon?, color?, count?, disabled? }
 * @param {Array} activeChips - Array of active chip IDs (multi-select)
 * @param {function} onToggle - Callback when chip is toggled (receives chip id)
 * @param {string} size - Size variant: 'sm' | 'md' (default: 'md')
 * @param {boolean} allowEmpty - Allow deselecting all chips (default: true)
 * @param {string} className - Additional CSS class
 */
export const ChipGroup = memo(function ChipGroup({
    chips = [],
    activeChips = [],
    onToggle,
    size = 'md',
    allowEmpty = true,
    className = '',
}) {
    const handleToggle = useCallback((chipId, disabled) => {
        if (disabled) return;

        // If allowEmpty is false, prevent deselecting the last chip
        if (!allowEmpty && activeChips.length === 1 && activeChips.includes(chipId)) {
            return;
        }

        onToggle?.(chipId);
    }, [onToggle, activeChips, allowEmpty]);

    return (
        <div className={`chip-group chip-group--${size} ${className}`} role="group">
            {chips.map((chip) => {
                const isActive = activeChips.includes(chip.id);
                const Icon = chip.icon;

                return (
                    <button
                        key={chip.id}
                        type="button"
                        className={`chip-group__chip ${isActive ? 'chip-group__chip--active' : ''} ${chip.disabled ? 'chip-group__chip--disabled' : ''}`}
                        onClick={() => handleToggle(chip.id, chip.disabled)}
                        disabled={chip.disabled}
                        aria-pressed={isActive}
                        data-color={chip.color}
                    >
                        {Icon && (
                            <span className="chip-group__chip-icon">
                                <Icon size={size === 'sm' ? 10 : 12} />
                            </span>
                        )}
                        <span className="chip-group__chip-label">{chip.label}</span>
                        {chip.count !== undefined && chip.count > 0 && (
                            <span className="chip-group__chip-count">{chip.count}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
});

/**
 * Chip - Individual chip for composable usage
 *
 * @param {string} id - Chip identifier
 * @param {string} label - Display label
 * @param {Component} icon - Lucide icon component
 * @param {number} count - Optional count badge
 * @param {boolean} isActive - Whether chip is selected
 * @param {boolean} disabled - Whether chip is disabled
 * @param {string} color - Color variant (blue, green, pink, amber, teal, purple)
 * @param {function} onClick - Click handler
 * @param {string} size - Size variant
 */
export const Chip = memo(function Chip({
    id,
    label,
    icon: Icon,
    count,
    isActive = false,
    disabled = false,
    color,
    onClick,
    size = 'md',
}) {
    return (
        <button
            type="button"
            className={`chip-group__chip ${isActive ? 'chip-group__chip--active' : ''} ${disabled ? 'chip-group__chip--disabled' : ''}`}
            onClick={() => !disabled && onClick?.(id)}
            disabled={disabled}
            aria-pressed={isActive}
            data-color={color}
        >
            {Icon && (
                <span className="chip-group__chip-icon">
                    <Icon size={size === 'sm' ? 10 : 12} />
                </span>
            )}
            <span className="chip-group__chip-label">{label}</span>
            {count !== undefined && count > 0 && (
                <span className="chip-group__chip-count">{count}</span>
            )}
        </button>
    );
});

/**
 * useChipGroup - Hook for managing chip group state
 *
 * @param {Array} initialActive - Initially active chip IDs
 * @param {Object} options - { allowEmpty: boolean }
 * @returns {Object} { activeChips, toggle, setActive, selectAll, clearAll, isActive }
 */
export function useChipGroup(initialActive = [], options = {}) {
    const { allowEmpty = true } = options;
    const [activeChips, setActiveChips] = React.useState(initialActive);

    const toggle = useCallback((chipId) => {
        setActiveChips(prev => {
            const isCurrentlyActive = prev.includes(chipId);

            // Prevent empty selection if not allowed
            if (!allowEmpty && isCurrentlyActive && prev.length === 1) {
                return prev;
            }

            return isCurrentlyActive
                ? prev.filter(id => id !== chipId)
                : [...prev, chipId];
        });
    }, [allowEmpty]);

    const setActive = useCallback((chipIds) => {
        setActiveChips(Array.isArray(chipIds) ? chipIds : [chipIds]);
    }, []);

    const selectAll = useCallback((allChipIds) => {
        setActiveChips(allChipIds);
    }, []);

    const clearAll = useCallback(() => {
        if (allowEmpty) {
            setActiveChips([]);
        }
    }, [allowEmpty]);

    const isActive = useCallback((chipId) => {
        return activeChips.includes(chipId);
    }, [activeChips]);

    return {
        activeChips,
        toggle,
        setActive,
        selectAll,
        clearAll,
        isActive,
    };
}

export default ChipGroup;