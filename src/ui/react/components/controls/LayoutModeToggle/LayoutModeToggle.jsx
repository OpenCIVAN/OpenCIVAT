// src/ui/react/components/controls/LayoutModeToggle/LayoutModeToggle.jsx
// Toggle between Normal, Isolation, and Subset layout modes
// Designed for use in SecondaryBottomBar left zone

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { useLayoutModeToggle, LAYOUT_MODES, LAYOUT_MODE_INFO } from './LayoutModeToggle.logic.js';
import './LayoutModeToggle.scss';

/**
 * Mode button configuration
 */
const MODE_CONFIG = {
    [LAYOUT_MODES.NORMAL]: {
        icon: 'grid3x3',
        label: 'Normal',
        title: 'Normal View - Standard grid layout',
    },
    [LAYOUT_MODES.ISOLATION]: {
        icon: 'maximize2',
        label: 'Isolation',
        title: 'Isolation Mode - Focus on single cell',
    },
    [LAYOUT_MODES.SUBSET]: {
        icon: 'layers',
        label: 'Subset',
        title: 'Subset Mode - Filtered cell view',
    },
};

/**
 * LayoutModeToggle - Switches between Normal, Isolation, and Subset modes
 *
 * Features:
 * - Visual toggle with icons and optional labels
 * - Distinct accent colors per mode
 * - Compact mode for collapsed panels
 * - Keyboard accessible
 *
 * @param {Object} props
 * @param {string} props.mode - Current mode ('normal' | 'isolation' | 'subset')
 * @param {Function} props.onModeChange - Callback when mode changes
 * @param {boolean} props.compact - Compact mode (icons only, no labels)
 * @param {boolean} props.disabled - Disable the entire toggle
 * @param {string[]} props.disabledModes - Array of specific modes to disable
 * @param {string} props.className - Additional CSS classes
 */
export function LayoutModeToggle({
    mode: controlledMode,
    onModeChange,
    compact = false,
    disabled = false,
    disabledModes = [],
    className = '',
}) {
    const {
        mode,
        setMode,
        isModeActive,
        isModeDisabled,
    } = useLayoutModeToggle({
        initialMode: controlledMode,
        onModeChange,
        disabledModes,
    });

    const handleModeChange = (newMode) => {
        if (disabled || isModeDisabled(newMode)) return;
        setMode(newMode);
    };

    const classNames = [
        'layout-mode-toggle',
        disabled && 'layout-mode-toggle--disabled',
        compact && 'layout-mode-toggle--compact',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} role="radiogroup" aria-label="Layout mode">
            {Object.entries(MODE_CONFIG).map(([modeKey, config]) => {
                const isActive = isModeActive(modeKey);
                const isDisabled = disabled || isModeDisabled(modeKey);

                const buttonClassNames = [
                    'layout-mode-toggle__btn',
                    `layout-mode-toggle__btn--${modeKey}`,
                    isActive && 'layout-mode-toggle__btn--active',
                    isDisabled && 'layout-mode-toggle__btn--disabled',
                ].filter(Boolean).join(' ');

                return (
                    <button
                        key={modeKey}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        className={buttonClassNames}
                        onClick={() => handleModeChange(modeKey)}
                        disabled={isDisabled}
                        title={config.title}
                    >
                        <Icon
                            name={config.icon}
                            size={compact ? 14 : 12}
                            className="layout-mode-toggle__icon"
                        />
                        {!compact && (
                            <span className="layout-mode-toggle__label">
                                {config.label}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * LayoutModeIndicator - Read-only display of current mode
 * Use when you just want to show the mode without allowing changes
 */
export function LayoutModeIndicator({ mode, compact = false }) {
    const config = MODE_CONFIG[mode] || MODE_CONFIG[LAYOUT_MODES.NORMAL];

    return (
        <div
            className={`layout-mode-indicator layout-mode-indicator--${mode} ${compact ? 'layout-mode-indicator--compact' : ''}`}
        >
            <Icon name={config.icon} size={12} className="layout-mode-indicator__icon" />
            {!compact && (
                <span className="layout-mode-indicator__label">{config.label}</span>
            )}
        </div>
    );
}

export { LAYOUT_MODES, LAYOUT_MODE_INFO };