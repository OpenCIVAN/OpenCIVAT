/**
 * @file InstanceSelector.jsx
 * @description Dropdown for selecting active instance.
 *
 * Sections:
 * - ON CANVAS: Views currently placed (click to focus)
 * - AVAILABLE VIEWS: Views not yet placed (click to place)
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Dropdown } from '@UI/react/components/common/Dropdown';

import './InstanceSelector.scss';

/**
 * Instance selector dropdown component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.activeInstance] - Currently active instance
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

    // Display text for trigger
    const displayText = useMemo(() => {
        if (!activeInstance) return 'No active instance';
        if (activeInstance.count > 1) return `${activeInstance.count} instances`;
        return activeInstance.name;
    }, [activeInstance]);

    // Filter views by search
    const filteredOnCanvas = useMemo(() => {
        if (!searchTerm) return onCanvasViews;
        const term = searchTerm.toLowerCase();
        return onCanvasViews.filter((v) =>
            v.name.toLowerCase().includes(term)
        );
    }, [onCanvasViews, searchTerm]);

    const filteredAvailable = useMemo(() => {
        if (!searchTerm) return availableViews;
        const term = searchTerm.toLowerCase();
        return availableViews.filter((v) =>
            v.name.toLowerCase().includes(term)
        );
    }, [availableViews, searchTerm]);

    return (
        <Dropdown
            trigger={
                <button className="instance-selector__trigger" type="button">
                    <span
                        className="instance-selector__dot"
                        style={{
                            backgroundColor:
                                activeInstance?.color || 'transparent',
                            opacity: activeInstance ? 1 : 0.3,
                        }}
                    />
                    <span
                        className={`instance-selector__text ${!activeInstance ? 'muted' : ''
                            }`}
                    >
                        {displayText}
                    </span>
                    <ChevronDown size={14} />
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

                {/* On Canvas */}
                {filteredOnCanvas.length > 0 && (
                    <div className="instance-selector__section">
                        <div className="instance-selector__section-header">
                            ON CANVAS
                        </div>
                        {filteredOnCanvas.map((view) => (
                            <button
                                key={view.id}
                                className={`instance-selector__item ${view.id === activeInstance?.id
                                        ? 'active'
                                        : ''
                                    }`}
                                onClick={() => onSelectInstance?.(view.id)}
                                type="button"
                            >
                                <span
                                    className="instance-selector__item-dot"
                                    style={{ backgroundColor: view.color }}
                                />
                                <span className="instance-selector__item-name">
                                    {view.name}
                                </span>
                                <span className="instance-selector__item-position">
                                    ({view.position?.col}, {view.position?.row})
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Available Views */}
                {filteredAvailable.length > 0 && (
                    <div className="instance-selector__section">
                        <div className="instance-selector__section-header">
                            AVAILABLE VIEWS
                        </div>
                        {filteredAvailable.map((view) => (
                            <button
                                key={view.id}
                                className="instance-selector__item instance-selector__item--available"
                                onClick={() => onPlaceView?.(view.id)}
                                type="button"
                            >
                                <span className="instance-selector__item-name">
                                    {view.name}
                                </span>
                                <span className="instance-selector__item-action">
                                    Place
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {filteredOnCanvas.length === 0 &&
                    filteredAvailable.length === 0 && (
                        <div className="instance-selector__empty">
                            No views found
                        </div>
                    )}
            </div>
        </Dropdown>
    );
}

export default InstanceSelector;