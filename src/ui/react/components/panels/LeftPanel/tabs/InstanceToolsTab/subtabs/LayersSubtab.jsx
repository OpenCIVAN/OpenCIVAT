// LayersSubtab.jsx
// Layers visibility subtab for InstanceToolsTab

import React from 'react';
import {
    Users,
    MapPin,
    Box,
    Eye,
    EyeOff,
    ChevronRight,
} from 'lucide-react';

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
// LAYERS SUBTAB CONTENT
// =============================================================================

export function LayersSubtab({ layers, onToggleLayer }) {
    return (
        <div className="layers-subtab">
            <div className="layers-subtab__info">
                Master visibility controls for this instance. Click arrow to open full management panel.
            </div>
            <div className="layers-subtab__list">
                <LayerToggle
                    icon={Users}
                    label="Remote Cursors"
                    enabled={layers.cursors.enabled}
                    count={layers.cursors.count}
                    total={layers.cursors.total}
                    onToggle={() => onToggleLayer('cursors')}
                />
                <LayerToggle
                    icon={MapPin}
                    label="Annotations"
                    enabled={layers.annotations.enabled}
                    count={layers.annotations.count}
                    total={layers.annotations.total}
                    onToggle={() => onToggleLayer('annotations')}
                />
                <LayerToggle
                    icon={Box}
                    label="Widgets"
                    enabled={layers.widgets.enabled}
                    count={layers.widgets.count}
                    total={layers.widgets.total}
                    onToggle={() => onToggleLayer('widgets')}
                />
            </div>
        </div>
    );
}

export default LayersSubtab;