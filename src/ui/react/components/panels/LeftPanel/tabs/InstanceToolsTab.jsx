// src/ui/react/components/panels/LeftPanel/tabs/InstanceToolsTab.jsx
// Instance tools tab content for the unified left panel
//
// Features:
// - Shows tools for the currently focused instance
// - Tools/Layers sub-tabs
// - Navigation, visualization, widget, and annotation tools
// - Widget configuration when selected
// - VS Code-style collapsible sections

import React, { useState, useCallback } from 'react';
import {
    Wrench,
    Layers,
    MousePointer,
    Move,
    RotateCcw,
    ZoomIn,
    Palette,
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
} from 'lucide-react';

// =============================================================================
// TOOLS CONFIGURATION
// =============================================================================

const TOOL_CATEGORIES = {
    navigation: {
        label: 'Navigation',
        tools: [
            { id: 'select', icon: MousePointer, label: 'Select' },
            { id: 'pan', icon: Move, label: 'Pan' },
            { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
            { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
        ]
    },
    visualization: {
        label: 'Visualization',
        tools: [
            { id: 'colormap', icon: Palette, label: 'Colormap', hasDropdown: true },
            { id: 'opacity', icon: CircleDot, label: 'Opacity', hasSlider: true },
            { id: 'threshold', icon: Sliders, label: 'Threshold' },
        ]
    },
    widgets: {
        label: 'Widgets',
        tools: [
            { id: 'clip', icon: Scissors, label: 'Clip Plane' },
            { id: 'slice', icon: Grid3X3, label: 'Slice' },
            { id: 'measure', icon: Ruler, label: 'Measure' },
            { id: 'orientation', icon: Compass, label: 'Orientation' },
            { id: 'axis', icon: Crosshair, label: 'Axis Actor' },
        ]
    },
    annotations: {
        label: 'Add Annotation',
        note: '(to dataset)',
        tools: [
            { id: 'point', icon: MapPin, label: 'Point' },
            { id: 'ruler', icon: Ruler, label: 'Ruler' },
            { id: 'region', icon: Square, label: 'Region' },
            { id: 'note', icon: MessageSquare, label: 'Note' },
        ]
    },
};

// Sample focused instance
const FOCUSED_INSTANCE = {
    id: 'inst-1',
    name: 'Main Analysis',
    type: 'vtk',
    dataset: 'Brain_Scan_001.nii',
    color: 'blue',
};

// Sample active widgets
const SAMPLE_WIDGETS = [
    { id: 'w1', name: 'Orientation', visible: true },
    { id: 'w2', name: 'Axis Actor', visible: true },
    { id: 'w3', name: 'Clip Plane A', visible: true, selected: true },
    { id: 'w4', name: 'Clip Plane B', visible: false },
];

// Sample layer state
const SAMPLE_LAYERS = {
    cursors: { enabled: true, opacity: 1.0, count: 3, total: 5 },
    annotations: { enabled: true, opacity: 1.0, count: 12, total: 45 },
    segmentations: { enabled: true, opacity: 0.7, count: 2, total: 3 },
};

// =============================================================================
// TOOL BUTTON
// =============================================================================

function ToolButton({ tool, isActive, onClick }) {
    const Icon = tool.icon;
    return (
        <button
            className={`tool-button ${isActive ? 'tool-button--active' : ''}`}
            onClick={onClick}
            title={tool.label}
        >
            <Icon size={16} />
            {tool.hasDropdown && (
                <ChevronDown size={8} className="tool-button__dropdown-indicator" />
            )}
        </button>
    );
}

// =============================================================================
// TOOL SECTION
// =============================================================================

function ToolSection({ category, categoryKey, activeTool, onToolSelect, expanded, onToggle }) {
    return (
        <div className="tool-section">
            <div
                className="tool-section__header"
                onClick={onToggle}
            >
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span className="tool-section__label">{category.label}</span>
                {category.note && <span className="tool-section__note">{category.note}</span>}
            </div>
            {expanded && (
                <div className="tool-section__tools">
                    {category.tools.map(tool => (
                        <ToolButton
                            key={tool.id}
                            tool={tool}
                            isActive={activeTool === tool.id}
                            onClick={() => onToolSelect(tool.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// WIDGET LIST ITEM
// =============================================================================

function WidgetListItem({ widget, isSelected, onSelect, onToggleVisibility }) {
    return (
        <div
            className={`widget-list-item ${isSelected ? 'widget-list-item--selected' : ''}`}
            onClick={() => onSelect(widget.id)}
        >
            <button
                className="widget-list-item__visibility"
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(widget.id); }}
            >
                {widget.visible ? (
                    <Eye size={12} style={{ color: 'var(--color-accent-green)' }} />
                ) : (
                    <EyeOff size={12} />
                )}
            </button>
            <span className={`widget-list-item__dot ${widget.visible ? 'widget-list-item__dot--active' : ''}`} />
            <span className="widget-list-item__name">{widget.name}</span>
            <ChevronRight size={12} className="widget-list-item__arrow" />
        </div>
    );
}

// =============================================================================
// WIDGET CONFIG PANEL
// =============================================================================

function WidgetConfigPanel({ widget }) {
    if (!widget) return null;

    return (
        <div className="widget-config">
            <div className="widget-config__header">
                <Scissors size={14} style={{ color: 'var(--color-accent-purple)' }} />
                <span className="widget-config__title">{widget.name}</span>
                <button className="widget-config__delete">
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Position controls */}
            <div className="widget-config__section">
                <span className="widget-config__section-label">Position</span>
                <div className="widget-config__position-inputs">
                    {['X', 'Y', 'Z'].map(axis => (
                        <div key={axis} className="widget-config__input-group">
                            <span className="widget-config__input-label">{axis}</span>
                            <input
                                type="number"
                                defaultValue={axis === 'X' ? '0.5' : '0'}
                                step="0.1"
                                className="widget-config__input"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Normal direction */}
            <div className="widget-config__section">
                <span className="widget-config__section-label">Normal Direction</span>
                <div className="widget-config__direction-buttons">
                    {['+X', '-X', '+Y', '-Y', '+Z', '-Z'].map((dir, i) => (
                        <button
                            key={dir}
                            className={`widget-config__dir-btn ${i === 0 ? 'widget-config__dir-btn--active' : ''}`}
                        >
                            {dir}
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="widget-config__actions">
                <button className="widget-config__action-btn" data-color="blue">
                    <FlipHorizontal size={12} /> Flip
                </button>
                <button className="widget-config__action-btn" data-color="amber">
                    <RotateCcw size={12} /> Reset
                </button>
                <button className="widget-config__action-btn" data-color="green">
                    <Copy size={12} /> Duplicate
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// LAYER TOGGLE
// =============================================================================

function LayerToggle({ icon: Icon, label, layer, onToggle, onOpacityChange }) {
    return (
        <div className="layer-toggle">
            <button
                className={`layer-toggle__btn ${layer.enabled ? 'layer-toggle__btn--active' : ''}`}
                onClick={onToggle}
            >
                {layer.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <div className="layer-toggle__info">
                <div className="layer-toggle__label">
                    <Icon size={14} />
                    {label}
                </div>
                {layer.count !== undefined && (
                    <span className="layer-toggle__count">
                        {layer.count} visible / {layer.total} total
                    </span>
                )}
            </div>
            {layer.opacity !== undefined && (
                <div className="layer-toggle__opacity">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={layer.opacity * 100}
                        onChange={(e) => onOpacityChange?.(e.target.value / 100)}
                    />
                    <span>{Math.round(layer.opacity * 100)}%</span>
                </div>
            )}
            <button className="layer-toggle__manage">
                <ChevronRight size={14} />
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InstanceToolsPanelContent({ workspaceId }) {
    // State
    const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'layers'
    const [activeTool, setActiveTool] = useState('select');
    const [selectedWidget, setSelectedWidget] = useState('w3');
    const [widgets, setWidgets] = useState(SAMPLE_WIDGETS);
    const [layers, setLayers] = useState(SAMPLE_LAYERS);
    const [expandedSections, setExpandedSections] = useState({
        navigation: true,
        visualization: true,
        widgets: true,
        annotations: false,
        presets: false,
    });

    // Toggle section
    const toggleSection = useCallback((key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // Toggle widget visibility
    const toggleWidgetVisibility = useCallback((widgetId) => {
        setWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, visible: !w.visible } : w
        ));
    }, []);

    // Toggle layer
    const toggleLayer = useCallback((layerKey) => {
        setLayers(prev => ({
            ...prev,
            [layerKey]: { ...prev[layerKey], enabled: !prev[layerKey].enabled }
        }));
    }, []);

    const selectedWidgetData = widgets.find(w => w.id === selectedWidget);
    const activeWidgetCount = widgets.filter(w => w.visible).length;

    return (
        <div className="instance-tools-tab">
            {/* Focused Instance Header */}
            <div className="instance-tools-tab__instance-header" style={{ '--instance-color': `var(--color-accent-${FOCUSED_INSTANCE.color})` }}>
                <Monitor size={14} />
                <div className="instance-tools-tab__instance-info">
                    <span className="instance-tools-tab__instance-name">{FOCUSED_INSTANCE.name}</span>
                    <span className="instance-tools-tab__instance-dataset">{FOCUSED_INSTANCE.dataset}</span>
                </div>
                <span className="instance-tools-tab__instance-type">{FOCUSED_INSTANCE.type.toUpperCase()}</span>
            </div>

            {/* Tab Bar */}
            <div className="instance-tools-tab__tabs">
                <button
                    className={`instance-tools-tab__tab ${activeTab === 'tools' ? 'instance-tools-tab__tab--active' : ''}`}
                    onClick={() => setActiveTab('tools')}
                >
                    <Wand2 size={14} /> Tools
                </button>
                <button
                    className={`instance-tools-tab__tab ${activeTab === 'layers' ? 'instance-tools-tab__tab--active' : ''}`}
                    onClick={() => setActiveTab('layers')}
                >
                    <Layers size={14} /> Layers
                </button>
            </div>

            {/* Content */}
            <div className="instance-tools-tab__content">
                {activeTab === 'tools' ? (
                    <>
                        {/* Tool Sections */}
                        {Object.entries(TOOL_CATEGORIES).map(([key, category]) => (
                            <ToolSection
                                key={key}
                                categoryKey={key}
                                category={category}
                                activeTool={activeTool}
                                onToolSelect={setActiveTool}
                                expanded={expandedSections[key]}
                                onToggle={() => toggleSection(key)}
                            />
                        ))}

                        {/* Active Widgets Section (inside widgets category) */}
                        {expandedSections.widgets && (
                            <div className="active-widgets-section">
                                <div className="active-widgets-section__header">
                                    Active Widgets ({activeWidgetCount})
                                </div>
                                {widgets.filter(w => w.visible).map(widget => (
                                    <WidgetListItem
                                        key={widget.id}
                                        widget={widget}
                                        isSelected={selectedWidget === widget.id}
                                        onSelect={setSelectedWidget}
                                        onToggleVisibility={toggleWidgetVisibility}
                                    />
                                ))}
                                {selectedWidgetData && <WidgetConfigPanel widget={selectedWidgetData} />}
                            </div>
                        )}

                        {/* Presets Section */}
                        <div className="tool-section">
                            <div
                                className="tool-section__header"
                                onClick={() => toggleSection('presets')}
                            >
                                {expandedSections.presets ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                <span className="tool-section__label">Presets</span>
                            </div>
                            {expandedSections.presets && (
                                <div className="presets-grid">
                                    {['Bone View', 'Soft Tissue', 'MIP', 'Custom 1'].map(preset => (
                                        <button key={preset} className="preset-btn">
                                            {preset}
                                        </button>
                                    ))}
                                    <button className="preset-btn preset-btn--save">
                                        <Plus size={12} /> Save Current
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Layers Tab Content */
                    <>
                        <div className="layers-tab__info">
                            Master visibility controls for this instance. Click arrow to open full management panel.
                        </div>
                        <LayerToggle
                            icon={Users}
                            label="Collaborator Cursors"
                            layer={layers.cursors}
                            onToggle={() => toggleLayer('cursors')}
                        />
                        <LayerToggle
                            icon={PenTool}
                            label="Annotations"
                            layer={layers.annotations}
                            onToggle={() => toggleLayer('annotations')}
                        />

                        {/* Widgets quick list */}
                        <div className="layer-toggle layer-toggle--widgets">
                            <button
                                className={`layer-toggle__btn ${widgets.some(w => w.visible) ? 'layer-toggle__btn--active' : ''}`}
                            >
                                <Eye size={14} />
                            </button>
                            <div className="layer-toggle__info">
                                <div className="layer-toggle__label">
                                    <Compass size={14} />
                                    Widgets
                                </div>
                            </div>
                            <span className="layer-toggle__count-inline">
                                {activeWidgetCount} / {widgets.length}
                            </span>
                        </div>
                        <div className="widgets-quick-list">
                            {widgets.map(widget => (
                                <div key={widget.id} className="widgets-quick-list__item">
                                    <button
                                        className="widgets-quick-list__visibility"
                                        onClick={() => toggleWidgetVisibility(widget.id)}
                                    >
                                        {widget.visible ? (
                                            <Eye size={12} style={{ color: 'var(--color-accent-green)' }} />
                                        ) : (
                                            <EyeOff size={12} />
                                        )}
                                    </button>
                                    <span className={`widgets-quick-list__name ${widget.visible ? '' : 'widgets-quick-list__name--hidden'}`}>
                                        {widget.name}
                                    </span>
                                    <button
                                        className="widgets-quick-list__config"
                                        onClick={() => {
                                            setActiveTab('tools');
                                            setExpandedSections(prev => ({ ...prev, widgets: true }));
                                            setSelectedWidget(widget.id);
                                        }}
                                    >
                                        <Settings size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <LayerToggle
                            icon={Box}
                            label="Segmentation Masks"
                            layer={layers.segmentations}
                            onToggle={() => toggleLayer('segmentations')}
                        />
                    </>
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