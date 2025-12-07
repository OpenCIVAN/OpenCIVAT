// src/ui/react/components/panels/LeftPanel/tabs/InstanceToolsTab.jsx
// Instance tools tab content for the unified left panel
//
// Features:
// - Shows tools for the currently focused instance
// - Dynamically updates when active instance changes
// - Renders tools provided by the instance handler
// - Tools/Layers sub-tabs for organization

import React, { useState, useCallback, useEffect } from 'react';
import {
    Wrench,
    Layers,
    MousePointer,
    Move,
    RotateCcw,
    ZoomIn,
    Palette,
    Circle,
    CircleDot,
    Sliders,
    Scissors,
    Grid3X3,
    Ruler,
    Compass,
    Crosshair,
    MapPin,
    Square,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    Settings,
    Save,
    Monitor,
    Users,
    PenTool,
    Box,
    Plus,
    FlipHorizontal,
    Copy,
    Trash2,
    Wand2,
    Camera,
    Triangle,
    X,
    Maximize2,
    BarChart3,
    Activity,
    Network,
    Minus,
    Zap,
    ArrowUpRight,
    User,
    Clock,
} from 'lucide-react';

import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { workspace as log } from '@Utils/logger.js';

// =============================================================================
// ICON MAPPING - Map string icon names to Lucide components
// =============================================================================

const ICON_MAP = {
    'mouse-pointer': MousePointer,
    'move': Move,
    'rotate-ccw': RotateCcw,
    'zoom-in': ZoomIn,
    'palette': Palette,
    'circle': Circle,
    'circle-dot': CircleDot,
    'sliders': Sliders,
    'scissors': Scissors,
    'grid-3x3': Grid3X3,
    'ruler': Ruler,
    'compass': Compass,
    'crosshair': Crosshair,
    'map-pin': MapPin,
    'square': Square,
    'message-square': MessageSquare,
    'eye': Eye,
    'eye-off': EyeOff,
    'settings': Settings,
    'save': Save,
    'monitor': Monitor,
    'users': Users,
    'pen-tool': PenTool,
    'box': Box,
    'plus': Plus,
    'flip-horizontal': FlipHorizontal,
    'copy': Copy,
    'trash-2': Trash2,
    'wand-2': Wand2,
    'camera': Camera,
    'triangle': Triangle,
    'x': X,
    'maximize-2': Maximize2,
    'bar-chart-3': BarChart3,
    'activity': Activity,
    'network': Network,
    'transform': Box, // Widget/transform icon
    'wrench': Wrench,
    'layers': Layers,
    'minus': Minus,
};

function getIcon(iconName) {
    if (!iconName) return Box;
    return ICON_MAP[iconName] || ICON_MAP[iconName.toLowerCase()] || Box;
}

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
                <ChevronDown size={8} className="tool-button__dropdown-indicator" />
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

    // Section header
    if (option.type === 'header') {
        return <div className="tool-menu__header-label">{option.label}</div>;
    }

    // Special handling for camera-grid type
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

    // Slider with presets (supports both 'slider' and 'slider-with-presets' types)
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

    // Organize views into a 3x3 grid
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
    const Icon = getIcon(tool.icon);
    const isDisabled = tool.disabled || false;
    const hasActiveOption = tool.options?.some(opt => opt.active);

    return (
        <div className={`tool-menu ${expanded ? 'tool-menu--expanded' : ''} ${isDisabled ? 'tool-menu--disabled' : ''}`}>
            <button
                className={`tool-menu__header ${hasActiveOption ? 'tool-menu__header--has-active' : ''}`}
                onClick={() => !isDisabled && onToggle?.()}
                disabled={isDisabled}
            >
                <Icon size={14} />
                <span className="tool-menu__title">{tool.label}</span>
                {tool.description && !expanded && (
                    <span className="tool-menu__hint">{tool.description}</span>
                )}
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {expanded && tool.options && (
                <div className="tool-menu__options">
                    {tool.options.map((option, index) => (
                        <ToolMenuItem
                            key={option.id || index}
                            option={option}
                            onClose={() => { }} // Keep menu open after selection
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

function ToolsList({ tools, expandedMenus, onToggleMenu }) {
    if (!tools || tools.length === 0) {
        return (
            <div className="tools-list__empty">
                <Wrench size={24} />
                <p>No tools available</p>
                <span>Load data into an instance to see available tools</span>
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

                // Regular tool button
                return (
                    <div key={tool.id} className="tools-list__item">
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

// =============================================================================
// LAYER TOGGLE COMPONENT
// =============================================================================

function LayerToggle({ icon: Icon, label, enabled, count, total, opacity, onToggle, onOpacityChange }) {
    return (
        <div className="layer-toggle">
            <button
                className={`layer-toggle__btn ${enabled ? 'layer-toggle__btn--active' : ''}`}
                onClick={onToggle}
            >
                {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <div className="layer-toggle__info">
                <div className="layer-toggle__label">
                    <Icon size={14} />
                    {label}
                </div>
                {count !== undefined && (
                    <span className="layer-toggle__count">
                        {count} visible / {total} total
                    </span>
                )}
            </div>
            {opacity !== undefined && (
                <div className="layer-toggle__opacity">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={opacity * 100}
                        onChange={(e) => onOpacityChange?.(e.target.value / 100)}
                    />
                    <span>{Math.round(opacity * 100)}%</span>
                </div>
            )}
            <button className="layer-toggle__manage">
                <ChevronRight size={14} />
            </button>
        </div>
    );
}

// =============================================================================
// INSTANCE ANNOTATIONS SUBTAB
// =============================================================================

// Sample annotations for this instance (will be replaced with real data)
const SAMPLE_INSTANCE_ANNOTATIONS = [
    { id: 'a1', type: 'point', text: 'Tumor marker', createdBy: 'Beth', timestamp: '2h ago' },
    { id: 'a2', type: 'region', text: 'Region of interest', createdBy: 'Alex', timestamp: '1d ago' },
];

function InstanceAnnotationsSubtab({ instanceId, onOpenFullPanel }) {
    return (
        <div className="instance-annotations-subtab">
            <div className="instance-annotations-subtab__info">
                Annotations on this instance only. For all annotations, use the global Annotations panel.
            </div>

            {SAMPLE_INSTANCE_ANNOTATIONS.length === 0 ? (
                <div className="instance-annotations-subtab__empty">
                    <MapPin size={24} />
                    <p>No annotations on this instance</p>
                    <span>Use the annotation tool to add markers</span>
                </div>
            ) : (
                <div className="instance-annotations-subtab__list">
                    {SAMPLE_INSTANCE_ANNOTATIONS.map(ann => (
                        <div key={ann.id} className="instance-annotation-item">
                            <MapPin size={14} className="instance-annotation-item__icon" />
                            <div className="instance-annotation-item__content">
                                <span className="instance-annotation-item__text">{ann.text}</span>
                                <span className="instance-annotation-item__meta">
                                    {ann.type} &middot; by {ann.createdBy}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                className="instance-annotations-subtab__open-full"
                onClick={onOpenFullPanel}
            >
                <ArrowUpRight size={12} />
                Open Full Annotations Panel
            </button>
        </div>
    );
}

// =============================================================================
// NO INSTANCE PLACEHOLDER
// =============================================================================

function NoInstancePlaceholder() {
    return (
        <div className="instance-tools-tab__no-instance">
            <Monitor size={32} />
            <h3>No Instance Selected</h3>
            <p>Click on an instance viewport to select it and see its tools here.</p>
            <p className="instance-tools-tab__no-instance-hint">
                You can also create a new instance by clicking a dataset in the Files panel.
            </p>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InstanceToolsPanelContent({ workspaceId }) {
    // State
    const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'layers' | 'annotations'
    const [activeInstance, setActiveInstance] = useState(null);
    const [tools, setTools] = useState([]);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [layers, setLayers] = useState({
        cursors: { enabled: true, opacity: 1.0, count: 0, total: 0 },
        annotations: { enabled: true, opacity: 1.0, count: 0, total: 0 },
        widgets: { enabled: true, opacity: 1.0, count: 0, total: 0 },
    });

    // Handler to open full annotations panel
    const handleOpenFullAnnotations = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:navigate-to-panel', {
            detail: { panelId: 'annotations' }
        }));
    }, []);

    // Subscribe to workspace changes
    useEffect(() => {
        const updateFromWorkspace = () => {
            const instance = workspaceManager.getActiveInstance();
            setActiveInstance(instance);

            if (instance?.handler && instance?.instanceData) {
                const instanceTools = instance.handler.getTools(instance.instanceData);
                setTools(instanceTools || []);
                log.debug(`Updated tools for instance ${instance.instanceId}:`, instanceTools?.length || 0);
            } else {
                setTools([]);
            }
        };

        // Initial update
        updateFromWorkspace();

        // Subscribe to changes
        workspaceManager.addListener(updateFromWorkspace);

        // Also listen for tools-updated event (dispatched when tool state changes)
        const handleToolsUpdated = (event) => {
            const { instanceId } = event.detail || {};
            const currentInstance = workspaceManager.getActiveInstance();
            if (currentInstance?.instanceId === instanceId) {
                updateFromWorkspace();
            }
        };
        window.addEventListener('cia:tools-updated', handleToolsUpdated);

        return () => {
            workspaceManager.removeListener(updateFromWorkspace);
            window.removeEventListener('cia:tools-updated', handleToolsUpdated);
        };
    }, []);

    // Toggle menu expansion
    const toggleMenu = useCallback((menuId) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    }, []);

    // Toggle layer
    const toggleLayer = useCallback((layerKey) => {
        setLayers(prev => ({
            ...prev,
            [layerKey]: { ...prev[layerKey], enabled: !prev[layerKey].enabled }
        }));
    }, []);

    // Get instance display info
    const instanceInfo = activeInstance ? {
        name: activeInstance.instanceData?.dataset?.filename ||
            activeInstance.instanceData?.dataset?.fileName ||
            `Instance ${activeInstance.instanceId?.slice(0, 8)}`,
        type: activeInstance.type || 'unknown',
        color: activeInstance.color?.name || 'blue',
        dataset: activeInstance.instanceData?.dataset?.filename ||
            activeInstance.instanceData?.dataset?.fileName ||
            'No data loaded',
    } : null;

    // If no active instance, show placeholder
    if (!activeInstance) {
        return (
            <div className="instance-tools-tab">
                <NoInstancePlaceholder />
            </div>
        );
    }

    return (
        <div className="instance-tools-tab">
            {/* Focused Instance Header */}
            <div
                className="instance-tools-tab__instance-header"
                style={{ '--instance-color': activeInstance.color?.hex || 'var(--color-accent-blue)' }}
            >
                <Monitor size={14} />
                <div className="instance-tools-tab__instance-info">
                    <span className="instance-tools-tab__instance-name">{instanceInfo.name}</span>
                    <span className="instance-tools-tab__instance-dataset">{instanceInfo.dataset}</span>
                </div>
                <span className="instance-tools-tab__instance-type">{instanceInfo.type.toUpperCase()}</span>
            </div>

            {/* Tab Bar - 3 subtabs per spec */}
            <div className="instance-tools-tab__tabs">
                <button
                    className={`instance-tools-tab__tab ${activeTab === 'tools' ? 'instance-tools-tab__tab--active' : ''}`}
                    onClick={() => setActiveTab('tools')}
                    data-color="amber"
                >
                    <Zap size={14} /> Tools
                </button>
                <button
                    className={`instance-tools-tab__tab ${activeTab === 'layers' ? 'instance-tools-tab__tab--active' : ''}`}
                    onClick={() => setActiveTab('layers')}
                    data-color="purple"
                >
                    <Layers size={14} /> Layers
                </button>
                <button
                    className={`instance-tools-tab__tab ${activeTab === 'annotations' ? 'instance-tools-tab__tab--active' : ''}`}
                    onClick={() => setActiveTab('annotations')}
                    data-color="pink"
                >
                    <MapPin size={14} /> Annotations
                </button>
            </div>

            {/* Content */}
            <div className="instance-tools-tab__content">
                {activeTab === 'tools' && (
                    <ToolsList
                        tools={tools}
                        expandedMenus={expandedMenus}
                        onToggleMenu={toggleMenu}
                    />
                )}

                {activeTab === 'layers' && (
                    /* Layers Tab Content */
                    <>
                        <div className="layers-tab__info">
                            Master visibility controls for this instance. Click arrow to open full management panel.
                        </div>
                        <LayerToggle
                            icon={Users}
                            label="Remote Cursors"
                            enabled={layers.cursors.enabled}
                            count={layers.cursors.count}
                            total={layers.cursors.total}
                            onToggle={() => toggleLayer('cursors')}
                        />
                        <LayerToggle
                            icon={MapPin}
                            label="Annotations"
                            enabled={layers.annotations.enabled}
                            count={layers.annotations.count}
                            total={layers.annotations.total}
                            onToggle={() => toggleLayer('annotations')}
                        />
                        <LayerToggle
                            icon={Box}
                            label="Widgets"
                            enabled={layers.widgets.enabled}
                            count={layers.widgets.count}
                            total={layers.widgets.total}
                            onToggle={() => toggleLayer('widgets')}
                        />
                    </>
                )}

                {activeTab === 'annotations' && (
                    <InstanceAnnotationsSubtab
                        instanceId={activeInstance?.instanceId}
                        onOpenFullPanel={handleOpenFullAnnotations}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <RotateCcw size={11} />
                    <span>Reset View</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <Save size={11} />
                    <span>Save State</span>
                </button>
            </div>
        </div>
    );
}

export default InstanceToolsPanelContent;