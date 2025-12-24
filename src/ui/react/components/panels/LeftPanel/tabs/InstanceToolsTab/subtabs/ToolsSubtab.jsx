// ToolsSubtab.jsx
// Tools list subtab for InstanceToolsTab

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { getIcon, ICON_MAP } from '../iconMap.js';

// =============================================================================
// TOOL BUTTON COMPONENT
// =============================================================================

function ToolButton({ tool, onClick }) {
    const Icon = getIcon(tool.icon);
    const isActive = tool.active || false;
    const isDisabled = tool.disabled || false;

    return (
        <button
            className={`tool-button ${isActive ? 'tool-button--active' : ''} ${isDisabled ? 'tool-button--disabled' : ''}`}
            onClick={() => !isDisabled && onClick?.(tool)}
            title={tool.description || tool.label}
            disabled={isDisabled}
        >
            <Icon size={16} />
            {tool.hasDropdown && (
                <Icon name="chevronDown" size={8} className="tool-button__dropdown-indicator" />
            )}
        </button>
    );
}

// =============================================================================
// TOOL MENU ITEM COMPONENT
// =============================================================================

function ToolMenuItem({ option, onClose }) {
    const Icon = getIcon(option.icon);
    const isActive = option.active || false;
    const isDisabled = option.disabled || false;

    const handleClick = () => {
        if (isDisabled) return;
        option.onClick?.();
        onClose?.();
    };

    if (option.type === 'separator') {
        return <div className="tool-menu__separator" />;
    }

    if (option.type === 'header') {
        return <div className="tool-menu__header-label">{option.label}</div>;
    }

    if (option.type === 'camera-grid') {
        return (
            <CameraGridMenu
                views={option.views}
                onViewSelect={(viewId) => {
                    option.onViewSelect?.(viewId);
                    onClose?.();
                }}
                disabled={option.disabled}
            />
        );
    }

    if (option.type === 'slider-with-presets' || option.type === 'slider') {
        return (
            <SliderWithPresets
                icon={option.icon}
                label={option.label}
                value={option.value}
                min={option.min}
                max={option.max}
                step={option.step}
                presets={option.presets}
                formatValue={option.formatValue}
                disabled={option.disabled}
                disabledReason={option.disabledReason}
                onChange={option.onChange}
            />
        );
    }

    return (
        <button
            className={`tool-menu__item ${isActive ? 'tool-menu__item--active' : ''} ${isDisabled ? 'tool-menu__item--disabled' : ''}`}
            onClick={handleClick}
            disabled={isDisabled}
        >
            <Icon size={14} />
            <div className="tool-menu__item-content">
                <span className="tool-menu__item-label">{option.label}</span>
                {option.description && (
                    <span className="tool-menu__item-desc">{option.description}</span>
                )}
            </div>
            {isActive && <span className="tool-menu__item-active-dot" />}
        </button>
    );
}

// =============================================================================
// SLIDER WITH PRESETS COMPONENT
// =============================================================================

function SliderWithPresets({ icon, label, value, min, max, step, presets, formatValue, disabled, disabledReason, onChange }) {
    const Icon = getIcon(icon);
    const displayValue = formatValue ? formatValue(value) : value;

    return (
        <div className={`slider-with-presets ${disabled ? 'slider-with-presets--disabled' : ''}`}>
            <div className="slider-with-presets__header">
                <Icon size={14} />
                <span className="slider-with-presets__label">{label}</span>
                <span className="slider-with-presets__value">{displayValue}</span>
            </div>
            <div className="slider-with-presets__slider-row">
                <input
                    type="range"
                    className="slider-with-presets__slider"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange?.(parseFloat(e.target.value))}
                />
            </div>
            {presets && presets.length > 0 && (
                <div className="slider-with-presets__presets">
                    {presets.map((preset, index) => (
                        <button
                            key={index}
                            className={`slider-with-presets__preset ${value === preset ? 'slider-with-presets__preset--active' : ''}`}
                            onClick={() => !disabled && onChange?.(preset)}
                            disabled={disabled}
                        >
                            {formatValue ? formatValue(preset) : preset}
                        </button>
                    ))}
                </div>
            )}
            {disabled && disabledReason && (
                <div className="slider-with-presets__disabled-reason">{disabledReason}</div>
            )}
        </div>
    );
}

// =============================================================================
// CAMERA GRID MENU COMPONENT
// =============================================================================

function CameraGridMenu({ views, onViewSelect, disabled }) {
    if (!views || views.length === 0) return null;

    const gridViews = [
        views.find(v => v?.id === 'top'),
        views.find(v => v?.id === 'isometric'),
        null,
        views.find(v => v?.id === 'left'),
        views.find(v => v?.id === 'reset'),
        views.find(v => v?.id === 'right'),
        views.find(v => v?.id === 'bottom'),
        views.find(v => v?.id === 'front'),
        views.find(v => v?.id === 'back'),
    ];

    return (
        <div className="camera-grid-menu">
            <div className="camera-grid-menu__label">Camera Views</div>
            <div className="camera-grid-menu__grid">
                {gridViews.map((view, index) => {
                    if (!view) {
                        return <div key={index} className="camera-grid-menu__cell camera-grid-menu__cell--empty" />;
                    }

                    const Icon = getIcon(view.icon);
                    return (
                        <button
                            key={view.id}
                            className={`camera-grid-menu__cell ${view.special ? 'camera-grid-menu__cell--special' : ''}`}
                            onClick={() => !disabled && onViewSelect?.(view.id)}
                            title={view.label}
                            disabled={disabled}
                        >
                            <Icon size={12} />
                            <span>{view.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// TOOL MENU COMPONENT (Expandable)
// =============================================================================

function ToolMenu({ tool, expanded, onToggle }) {
    const isDisabled = tool.disabled || false;
    const hasActiveOption = tool.options?.some(opt => opt.active);

    return (
        <div className={`tool-menu ${expanded ? 'tool-menu--expanded' : ''} ${isDisabled ? 'tool-menu--disabled' : ''}`}>
            <button
                className={`tool-menu__header ${hasActiveOption ? 'tool-menu__header--has-active' : ''}`}
                onClick={() => !isDisabled && onToggle?.()}
                disabled={isDisabled}
            >
                <div className="tool-menu__header-content">
                    <span className="tool-menu__title">{tool.label}</span>
                    {tool.description && !expanded && (
                        <span className="tool-menu__hint">{tool.description}</span>
                    )}
                </div>
                {expanded ? <Icon name="chevronDown" size={12} /> : <Icon name="chevronRight" size={12} />}
            </button>
            {expanded && tool.options && (
                <div className="tool-menu__options">
                    {tool.options.map((option, index) => (
                        <ToolMenuItem
                            key={option.id || index}
                            option={option}
                            onClose={() => { }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// TOOLS LIST COMPONENT
// =============================================================================

export function ToolsList({ tools, expandedMenus, onToggleMenu }) {
    if (!tools || tools.length === 0) {
        return (
            <div className="tools-list__empty">
                <Wrench size={14} />
                <span>No tools available - load data to see tools</span>
            </div>
        );
    }

    return (
        <div className="tools-list">
            {tools.map((tool, index) => {
                if (tool.type === 'separator') {
                    return <div key={index} className="tools-list__separator" />;
                }

                if (tool.type === 'menu') {
                    return (
                        <ToolMenu
                            key={tool.id}
                            tool={tool}
                            expanded={expandedMenus[tool.id]}
                            onToggle={() => onToggleMenu(tool.id)}
                        />
                    );
                }

                // Skip invalid tools (no label or id)
                if (!tool.label && !tool.id) {
                    return null;
                }

                return (
                    <div key={tool.id || index} className="tools-list__item">
                        <ToolButton
                            tool={tool}
                            onClick={() => tool.onClick?.()}
                        />
                        <span className="tools-list__item-label">{tool.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default ToolsList;