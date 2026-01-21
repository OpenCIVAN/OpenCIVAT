// ToolsSubtab.jsx
// Enhanced Tools list subtab for InstanceToolsTab with categorized sections
//
// Per spec: Tools organized into Navigation, Representation, Widgets, Appearance

import React, { useState, useMemo, useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { SectionNavGroup } from '@UI/react/components/organisms';
import { Toggle } from '@UI/react/components/atoms/Toggle';
import { Slider } from '@UI/react/components/atoms/Slider';

// =============================================================================
// TOOL CATEGORY DEFINITIONS (per spec)
// =============================================================================

const TOOL_CATEGORIES = {
    navigation: {
        id: 'navigation',
        label: 'Navigation',
        icon: 'navigation',
        color: 'blue',
        description: 'Camera and view controls',
        // Tool IDs that belong to this category
        toolIds: ['views', 'camera', 'reset', 'fit', 'ortho', 'iso'],
    },
    representation: {
        id: 'representation',
        label: 'Representation',
        icon: 'eye',
        color: 'purple',
        description: 'Visual rendering options',
        toolIds: ['appearance', 'colormap', 'opacity', 'representation'],
    },
    widgets: {
        id: 'widgets',
        label: 'Widgets',
        icon: 'ruler',
        color: 'amber',
        description: 'Interactive measurement tools',
        toolIds: ['widgets', 'clipping', 'measurement'],
    },
    appearance: {
        id: 'appearance',
        label: 'Scene',
        icon: 'palette',
        color: 'pink',
        description: 'Scene and display settings',
        toolIds: ['orientation', 'axes', 'grid', 'background', 'reduction'],
    },
};

// =============================================================================
// CATEGORIZE TOOLS UTILITY
// =============================================================================

function categorizeTools(tools) {
    const categorized = {
        navigation: [],
        representation: [],
        widgets: [],
        appearance: [],
        uncategorized: [],
    };

    for (const tool of tools) {
        // Skip separators and tools without labels
        if (tool.type === 'separator') continue;
        if (!tool.label && !tool.id) continue;

        let assigned = false;
        for (const [catId, catConfig] of Object.entries(TOOL_CATEGORIES)) {
            if (catConfig.toolIds.some(id => tool.id?.includes(id))) {
                categorized[catId].push(tool);
                assigned = true;
                break;
            }
        }

        if (!assigned) {
            categorized.uncategorized.push(tool);
        }
    }

    return categorized;
}

// =============================================================================
// CAMERA GRID COMPONENT
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
        <div className="camera-grid">
            {gridViews.map((view, index) => {
                if (!view) {
                    return <div key={index} className="camera-grid__cell camera-grid__cell--empty" />;
                }

                return (
                    <button
                        key={view.id}
                        className={`camera-grid__cell ${view.special ? 'camera-grid__cell--special' : ''}`}
                        onClick={() => !disabled && onViewSelect?.(view.id)}
                        title={view.label}
                        disabled={disabled}
                    >
                        <Icon name={view.icon || 'camera'} size={14} />
                        <span>{view.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// SLIDER WITH PRESETS COMPONENT
// =============================================================================

function SliderWithPresets({ icon, label, value, min, max, step, presets, formatValue, disabled, disabledReason, onChange }) {
    const displayValue = formatValue ? formatValue(value) : value;

    return (
        <div className={`slider-control ${disabled ? 'slider-control--disabled' : ''}`}>
            <div className="slider-control__header">
                <Icon name={icon || 'sliders'} size={12} />
                <span className="slider-control__label">{label}</span>
                <span className="slider-control__value">{displayValue}</span>
            </div>
            <input
                type="range"
                className="slider-control__slider"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange?.(parseFloat(e.target.value))}
            />
            {presets && presets.length > 0 && (
                <div className="slider-control__presets">
                    {presets.map((preset, index) => (
                        <button
                            key={index}
                            className={`slider-control__preset ${value === preset ? 'slider-control__preset--active' : ''}`}
                            onClick={() => !disabled && onChange?.(preset)}
                            disabled={disabled}
                        >
                            {formatValue ? formatValue(preset) : preset}
                        </button>
                    ))}
                </div>
            )}
            {disabled && disabledReason && (
                <div className="slider-control__disabled-reason">{disabledReason}</div>
            )}
        </div>
    );
}

// =============================================================================
// COLORMAP GRID COMPONENT
// =============================================================================

function ColormapGrid({ colormaps, currentColormap, onColormapChange, disabled }) {
    if (!colormaps || colormaps.length === 0) return null;

    return (
        <div className="colormap-grid">
            {colormaps.map(cmap => (
                <button
                    key={cmap.id}
                    className={`colormap-grid__item ${currentColormap === cmap.id ? 'colormap-grid__item--active' : ''}`}
                    onClick={() => !disabled && onColormapChange?.(cmap.id)}
                    disabled={disabled}
                    title={cmap.name}
                >
                    <div
                        className="colormap-grid__swatch"
                        style={{ background: cmap.gradient }}
                    />
                    <span className="colormap-grid__name">{cmap.name}</span>
                </button>
            ))}
        </div>
    );
}

// =============================================================================
// TOOL OPTION ITEM COMPONENT
// =============================================================================

function ToolOptionItem({ option, onClose }) {
    const isActive = option.active || false;
    const isDisabled = option.disabled || false;

    const handleClick = () => {
        if (isDisabled) return;
        option.onClick?.();
        onClose?.();
    };

    if (option.type === 'separator') {
        return <div className="tool-option__separator" />;
    }

    if (option.type === 'header') {
        return <div className="tool-option__header">{option.label}</div>;
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

    if (option.type === 'color-swatch-grid') {
        return (
            <ColormapGrid
                colormaps={option.colormaps}
                currentColormap={option.currentColormap}
                onColormapChange={option.onColormapChange}
                disabled={option.disabled}
            />
        );
    }

    if (option.type === 'color-picker') {
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            ] : [0, 0, 0];
        };

        const rgbToHex = (rgb) => {
            if (!rgb || rgb.length < 3) return '#000000';
            const r = Math.round(rgb[0] * 255);
            const g = Math.round(rgb[1] * 255);
            const b = Math.round(rgb[2] * 255);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

        return (
            <div className="tool-option tool-option--color-picker">
                <Icon name={option.icon || 'palette'} size={14} />
                <div className="tool-option__content">
                    <span className="tool-option__label">{option.label}</span>
                </div>
                <input
                    type="color"
                    className="tool-option__color-input"
                    value={rgbToHex(option.value)}
                    onChange={(e) => option.onChange?.(hexToRgb(e.target.value))}
                    disabled={option.disabled}
                />
            </div>
        );
    }

    return (
        <button
            className={`tool-option ${isActive ? 'tool-option--active' : ''} ${isDisabled ? 'tool-option--disabled' : ''}`}
            onClick={handleClick}
            disabled={isDisabled}
        >
            <Icon name={option.icon || 'circle'} size={14} />
            <div className="tool-option__content">
                <span className="tool-option__label">{option.label}</span>
                {option.description && (
                    <span className="tool-option__desc">{option.description}</span>
                )}
            </div>
            {isActive && <span className="tool-option__active-dot" />}
        </button>
    );
}

// =============================================================================
// TOOL MENU COMPONENT (Expandable menu within a category)
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
                <Icon name={tool.icon || 'circle'} size={14} />
                <div className="tool-menu__header-content">
                    <span className="tool-menu__title">{tool.label}</span>
                    {tool.description && !expanded && (
                        <span className="tool-menu__hint">{tool.description}</span>
                    )}
                </div>
                <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} />
            </button>
            {expanded && tool.options && (
                <div className="tool-menu__options">
                    {tool.options.map((option, index) => (
                        <ToolOptionItem
                            key={option.id || index}
                            option={option}
                            onClose={() => {}}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// TOOL BUTTON COMPONENT (Single action tool)
// =============================================================================

function ToolButton({ tool, onClick }) {
    const isActive = tool.active || false;
    const isDisabled = tool.disabled || false;

    return (
        <button
            className={`tool-button ${isActive ? 'tool-button--active' : ''} ${isDisabled ? 'tool-button--disabled' : ''}`}
            onClick={() => !isDisabled && onClick?.(tool)}
            title={tool.description || tool.label}
            disabled={isDisabled}
        >
            <Icon name={tool.icon || 'circle'} size={16} />
            <span>{tool.label}</span>
        </button>
    );
}

// =============================================================================
// TOOL CATEGORY CONTENT COMPONENT
// =============================================================================

function ToolCategoryContent({ tools, expandedMenus, onToggleMenu }) {
    if (!tools || tools.length === 0) return null;

    return (
        <div className="tool-category__list">
            {tools.map((tool, index) => {
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

                return (
                    <ToolButton
                        key={tool.id || index}
                        tool={tool}
                        onClick={() => tool.onClick?.()}
                    />
                );
            })}
        </div>
    );
}

// =============================================================================
// MAIN TOOLS LIST COMPONENT
// =============================================================================

// Color map for categories
const CATEGORY_COLORS = {
    navigation: '#60a5fa', // blue
    representation: '#c084fc', // purple
    widgets: '#fbbf24', // amber
    appearance: '#f472b6', // pink
    advanced: '#9ca3af', // gray
};

export function ToolsList({ tools, expandedMenus, onToggleMenu }) {
    // Categorize tools
    const categorized = useMemo(() => categorizeTools(tools || []), [tools]);

    // Build sections for SectionNavGroup
    const toolSections = useMemo(() => {
        const sections = [];

        // Navigation Category
        if (categorized.navigation.length > 0) {
            sections.push({
                id: 'navigation',
                icon: TOOL_CATEGORIES.navigation.icon,
                label: TOOL_CATEGORIES.navigation.label,
                color: CATEGORY_COLORS.navigation,
                itemCount: categorized.navigation.length,
                content: (
                    <ToolCategoryContent
                        tools={categorized.navigation}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        }

        // Representation Category
        if (categorized.representation.length > 0) {
            sections.push({
                id: 'representation',
                icon: TOOL_CATEGORIES.representation.icon,
                label: TOOL_CATEGORIES.representation.label,
                color: CATEGORY_COLORS.representation,
                itemCount: categorized.representation.length,
                content: (
                    <ToolCategoryContent
                        tools={categorized.representation}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        }

        // Widgets Category
        if (categorized.widgets.length > 0) {
            sections.push({
                id: 'widgets',
                icon: TOOL_CATEGORIES.widgets.icon,
                label: TOOL_CATEGORIES.widgets.label,
                color: CATEGORY_COLORS.widgets,
                itemCount: categorized.widgets.length,
                content: (
                    <ToolCategoryContent
                        tools={categorized.widgets}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        }

        // Appearance Category
        if (categorized.appearance.length > 0) {
            sections.push({
                id: 'appearance',
                icon: TOOL_CATEGORIES.appearance.icon,
                label: TOOL_CATEGORIES.appearance.label,
                color: CATEGORY_COLORS.appearance,
                itemCount: categorized.appearance.length,
                content: (
                    <ToolCategoryContent
                        tools={categorized.appearance}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        }

        // Uncategorized (Advanced)
        if (categorized.uncategorized.length > 0) {
            sections.push({
                id: 'advanced',
                icon: 'settings',
                label: 'Advanced',
                color: CATEGORY_COLORS.advanced,
                itemCount: categorized.uncategorized.length,
                content: (
                    <ToolCategoryContent
                        tools={categorized.uncategorized}
                        expandedMenus={expandedMenus}
                        onToggleMenu={onToggleMenu}
                    />
                ),
            });
        }

        return sections;
    }, [categorized, expandedMenus, onToggleMenu]);

    if (!tools || tools.length === 0) {
        return (
            <div className="tools-list__empty">
                <Icon name="wrench" size={24} />
                <span>No tools available</span>
                <p>Load data to see tools</p>
            </div>
        );
    }

    return (
        <div className="tools-list">
            <SectionNavGroup
                sections={toolSections}
                defaultSectionId="navigation"
                size="sm"
            />
        </div>
    );
}

export default ToolsList;
