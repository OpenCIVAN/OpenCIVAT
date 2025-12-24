// LayersSubtab.jsx
// Layers visibility subtab for InstanceToolsTab
//
// FIXED: Now accepts activeInstance and manages layers state internally

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';

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
                {enabled ? <Icon name="eye" size={14} /> : <Icon name="eyeOff" size={14} />}
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
                <Icon name="chevronRight" size={14} />
            </button>
        </div>
    );
}

// =============================================================================
// DEFAULT LAYERS STATE
// =============================================================================

const DEFAULT_LAYERS = {
    cursors: { enabled: true, count: 0, total: 0 },
    annotations: { enabled: true, count: 0, total: 0 },
    widgets: { enabled: true, count: 0, total: 0 },
};

// =============================================================================
// LAYERS SUBTAB CONTENT
// =============================================================================

export function LayersSubtab({ activeInstance, layers: externalLayers, onToggleLayer: externalToggle }) {
    // Internal state if not provided externally
    const [internalLayers, setInternalLayers] = useState(DEFAULT_LAYERS);

    // Use external layers if provided, otherwise internal
    const layers = externalLayers || internalLayers;

    // Toggle handler
    const handleToggleLayer = useCallback((layerName) => {
        if (externalToggle) {
            externalToggle(layerName);
        } else {
            setInternalLayers(prev => ({
                ...prev,
                [layerName]: {
                    ...prev[layerName],
                    enabled: !prev[layerName].enabled,
                },
            }));

            // TODO: Actually toggle layer visibility on the instance
            // if (activeInstance?.instanceId) {
            //     workspaceManager.toggleLayer?.(activeInstance.instanceId, layerName);
            // }
        }
    }, [externalToggle, activeInstance]);

    // Safe access with defaults
    const cursors = layers?.cursors || DEFAULT_LAYERS.cursors;
    const annotations = layers?.annotations || DEFAULT_LAYERS.annotations;
    const widgets = layers?.widgets || DEFAULT_LAYERS.widgets;

    return (
        <div className="layers-subtab">
            <div className="layers-subtab__info">
                Master visibility controls for this instance. Click arrow to open full management panel.
            </div>
            <div className="layers-subtab__list">
                <LayerToggle
                    icon={Users}
                    label="Remote Cursors"
                    enabled={cursors.enabled}
                    count={cursors.count}
                    total={cursors.total}
                    onToggle={() => handleToggleLayer('cursors')}
                />
                <LayerToggle
                    icon={MapPin}
                    label="Annotations"
                    enabled={annotations.enabled}
                    count={annotations.count}
                    total={annotations.total}
                    onToggle={() => handleToggleLayer('annotations')}
                />
                <LayerToggle
                    icon={Box}
                    label="Widgets"
                    enabled={widgets.enabled}
                    count={widgets.count}
                    total={widgets.total}
                    onToggle={() => handleToggleLayer('widgets')}
                />
            </div>
        </div>
    );
}

export default LayersSubtab;