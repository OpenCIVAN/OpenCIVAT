/**
 * @file InstanceSelector.jsx
 * @description Dropdown for selecting active instance.
 *
 * Sections:
 * - ON CANVAS: Views currently placed (click to focus)
 * - AVAILABLE VIEWS: Views not yet placed (click to place)
 */

// src/ui/react/components/layout/SecondaryFooter/components/InstanceSelector/InstanceSelector.jsx
// Dropdown for selecting active instance
//
// FIXED:
// - Shows view name (primary) + dataset name (secondary)
// - Matches Instance Tools tab indicator styling
// - Better visual hierarchy
// - Color-coded dot for active instance

import React, { useState, useMemo } from 'react';
import { ChevronDown, Search, Monitor, Plus } from 'lucide-react';
import { Dropdown } from '@UI/react/components/common/Dropdown';

import './InstanceSelector.scss';

/**
 * Instance selector dropdown component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.activeInstance] - Currently active instance
 * @param {string} [props.activeInstance.id] - Instance ID
 * @param {string} [props.activeInstance.name] - View name (primary display)
 * @param {string} [props.activeInstance.datasetName] - Dataset name (secondary display)
 * @param {string} [props.activeInstance.color] - Instance color (hex)
 * @param {string} [props.activeInstance.type] - Handler type (vtk, chart, etc.)
 * @param {Array} [props.onCanvasViews] - Views currently on canvas
 * @param {Array} [props.availableViews] - Views available to place
 * @param {Function} [props.onSelectInstance] - Callback when instance is selected
 * @param {Function} [props.onPlaceView] - Callback to place a view
 */
export function InstanceSelector({
    activeInstance,
    onCanvasViews = [],
    availableViews = [],
    onSelectInstance,
    onPlaceView,
}) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter views by search (searches both name and dataset name)
    const filteredOnCanvas = useMemo(() => {
        if (!searchTerm) return onCanvasViews;
        const term = searchTerm.toLowerCase();
        return onCanvasViews.filter((v) =>
            v.name?.toLowerCase().includes(term) ||
            v.datasetName?.toLowerCase().includes(term)
        );
    }, [onCanvasViews, searchTerm]);

    const filteredAvailable = useMemo(() => {
        if (!searchTerm) return availableViews;
        const term = searchTerm.toLowerCase();
        return availableViews.filter((v) =>
            v.name?.toLowerCase().includes(term) ||
            v.datasetName?.toLowerCase().includes(term)
        );
    }, [availableViews, searchTerm]);

    // Has any content to show?
    const hasContent = filteredOnCanvas.length > 0 || filteredAvailable.length > 0;

    return (
        <Dropdown
            trigger={
                <button
                    className={`instance-selector__trigger ${activeInstance ? 'instance-selector__trigger--active' : ''}`}
                    type="button"
                    style={activeInstance ? { '--instance-color': activeInstance.color } : undefined}
                >
                    {activeInstance ? (
                        <>
                            {/* Color dot */}
                            <span
                                className="instance-selector__dot"
                                style={{ backgroundColor: activeInstance.color }}
                            />
                            {/* Text content */}
                            <span className="instance-selector__content">
                                <span className="instance-selector__name">
                                    {activeInstance.name}
                                </span>
                                <span className="instance-selector__dataset">
                                    {activeInstance.datasetName}
                                </span>
                            </span>
                        </>
                    ) : (
                        <>
                            <Monitor size={14} className="instance-selector__icon--muted" />
                            <span className="instance-selector__empty-text">
                                No Active Instance
                            </span>
                        </>
                    )}
                    <ChevronDown size={14} className="instance-selector__chevron" />
                </button>
            }
            placement="top-start"
        >
            <div className="instance-selector__dropdown">
                {/* Search */}
                <div className="instance-selector__search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search views..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* On Canvas Section */}
                {filteredOnCanvas.length > 0 && (
                    <div className="instance-selector__section">
                        <div className="instance-selector__section-header">
                            ON CANVAS ({filteredOnCanvas.length})
                        </div>
                        {filteredOnCanvas.map((view) => (
                            <button
                                key={view.id}
                                className={`instance-selector__item ${view.id === activeInstance?.id || view.id === activeInstance?.viewId
                                        ? 'instance-selector__item--active'
                                        : ''
                                    }`}
                                onClick={() => onSelectInstance?.(view.id)}
                                type="button"
                                style={{ '--item-color': view.color }}
                            >
                                <span
                                    className="instance-selector__item-dot"
                                    style={{ backgroundColor: view.color }}
                                />
                                <span className="instance-selector__item-content">
                                    <span className="instance-selector__item-name">
                                        {view.name}
                                    </span>
                                    <span className="instance-selector__item-dataset">
                                        {view.datasetName}
                                    </span>
                                </span>
                                <span className="instance-selector__item-position">
                                    ({view.position?.col}, {view.position?.row})
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Available Views Section */}
                {filteredAvailable.length > 0 && (
                    <div className="instance-selector__section">
                        <div className="instance-selector__section-header">
                            AVAILABLE ({filteredAvailable.length})
                        </div>
                        {filteredAvailable.map((view) => (
                            <button
                                key={view.id}
                                className="instance-selector__item instance-selector__item--available"
                                onClick={() => onPlaceView?.(view.id)}
                                type="button"
                            >
                                <span className="instance-selector__item-content">
                                    <span className="instance-selector__item-name">
                                        {view.name}
                                    </span>
                                    <span className="instance-selector__item-dataset">
                                        {view.datasetName}
                                    </span>
                                </span>
                                <span className="instance-selector__item-action">
                                    <Plus size={12} />
                                    Place
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!hasContent && (
                    <div className="instance-selector__empty">
                        {searchTerm ? (
                            <>No views matching "{searchTerm}"</>
                        ) : (
                            <>
                                <Monitor size={24} />
                                <span>No views available</span>
                                <span className="instance-selector__empty-hint">
                                    Create a view from a dataset to get started
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Dropdown>
    );
}

export default InstanceSelector;