/**
 * @file ActiveViewSelector.jsx
 * @description Dropdown selector for the currently active view/instance.
 * Features "ACTIVE VIEW" label and colored dot indicator.
 * 
 * @example
 * <ActiveViewSelector
 *   activeView={currentView}
 *   onCanvasViews={viewsOnCanvas}
 *   availableViews={availableViews}
 *   onSelect={handleSelectView}
 *   onPlace={handlePlaceView}
 * />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Plus, MapPin, Eye } from 'lucide-react';

import './ActiveViewSelector.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_COLORS = [
    '#60a5fa', // Blue
    '#34d399', // Green
    '#2dd4bf', // Teal
    '#fb7185', // Pink
    '#c084fc', // Purple
    '#fbbf24', // Amber
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a consistent color for a view based on its ID.
 */
const getViewColor = (viewId, index = 0) => {
    if (!viewId) return VIEW_COLORS[0];
    const hash = viewId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return VIEW_COLORS[(hash + index) % VIEW_COLORS.length];
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Active view selector with dropdown.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.activeView] - Currently active view { id, name, type, position }
 * @param {Array} [props.onCanvasViews] - Views currently placed on canvas
 * @param {Array} [props.availableViews] - Views available but not placed
 * @param {Function} [props.onSelect] - Callback when a view is selected (viewId)
 * @param {Function} [props.onPlace] - Callback to place an available view
 * @param {string} [props.className] - Additional CSS class
 */
export function ActiveViewSelector({
    activeView,
    onCanvasViews = [],
    availableViews = [],
    onSelect,
    onPlace,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Get color for active view
    const activeViewColor = activeView ? getViewColor(activeView.id) : VIEW_COLORS[0];

    // Filter views by search query
    const filterViews = useCallback((views) => {
        if (!searchQuery.trim()) return views;
        const query = searchQuery.toLowerCase();
        return views.filter((v) => v.name.toLowerCase().includes(query));
    }, [searchQuery]);

    const filteredOnCanvas = filterViews(onCanvasViews);
    const filteredAvailable = filterViews(availableViews);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Handle view selection
    const handleSelect = useCallback((view) => {
        onSelect?.(view.id);
        setIsOpen(false);
        setSearchQuery('');
    }, [onSelect]);

    // Handle placing an available view
    const handlePlace = useCallback((view) => {
        onPlace?.(view.id);
        setIsOpen(false);
        setSearchQuery('');
    }, [onPlace]);

    // Display text
    const displayName = activeView?.name || 'No active view';
    const hasActiveView = !!activeView;

    return (
        <div className={`active-view-selector ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                className={`active-view-selector__trigger ${hasActiveView ? '' : 'active-view-selector__trigger--empty'}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{ '--view-color': activeViewColor }}
            >
                {/* Colored dot indicator */}
                <span
                    className="active-view-selector__dot"
                    style={{ background: hasActiveView ? activeViewColor : 'transparent' }}
                />

                {/* Label and name */}
                <div className="active-view-selector__info">
                    <span className="active-view-selector__label">Active View</span>
                    <span className="active-view-selector__name">{displayName}</span>
                </div>

                {/* Chevron */}
                <ChevronDown size={10} className="active-view-selector__chevron" />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="active-view-selector__dropdown" role="listbox">
                    {/* Search input - fixed at top */}
                    {(onCanvasViews.length > 3 || availableViews.length > 0) && (
                        <div className="active-view-selector__search">
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search views..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="active-view-selector__search-input"
                            />
                        </div>
                    )}

                    {/* Scrollable content area */}
                    <div className="active-view-selector__content">
                        {/* On Canvas section */}
                        {filteredOnCanvas.length > 0 && (
                            <div className="active-view-selector__section">
                                <div className="active-view-selector__section-header">
                                    <MapPin size={10} />
                                    <span>On Canvas</span>
                                </div>
                                {filteredOnCanvas.map((view, index) => {
                                    const isActive = activeView?.id === view.id;
                                    const viewColor = getViewColor(view.id, index);

                                    return (
                                        <button
                                            key={view.id}
                                            type="button"
                                            className={`active-view-selector__item ${isActive ? 'active-view-selector__item--active' : ''}`}
                                            onClick={() => handleSelect(view)}
                                            role="option"
                                            aria-selected={isActive}
                                            style={{ '--view-color': viewColor }}
                                        >
                                            <span
                                                className="active-view-selector__item-dot"
                                                style={{ background: viewColor }}
                                            />
                                            <span className="active-view-selector__item-name">{view.name}</span>
                                            {view.position && (
                                                <span className="active-view-selector__item-position">
                                                    {view.position.col}, {view.position.row}
                                                </span>
                                            )}
                                            {isActive && <Check size={12} className="active-view-selector__item-check" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Available Views section */}
                        {filteredAvailable.length > 0 && (
                            <div className="active-view-selector__section">
                                <div className="active-view-selector__section-header">
                                    <Eye size={10} />
                                    <span>Available to Place</span>
                                </div>
                                {filteredAvailable.map((view, index) => {
                                    const viewColor = getViewColor(view.id, index + onCanvasViews.length);

                                    return (
                                        <button
                                            key={view.id}
                                            type="button"
                                            className="active-view-selector__item active-view-selector__item--available"
                                            onClick={() => handlePlace(view)}
                                            role="option"
                                            aria-selected={false}
                                            style={{ '--view-color': viewColor }}
                                        >
                                            <Plus size={12} className="active-view-selector__item-icon" />
                                            <span className="active-view-selector__item-name">{view.name}</span>
                                            <span className="active-view-selector__item-type">{view.type}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty state */}
                        {filteredOnCanvas.length === 0 && filteredAvailable.length === 0 && (
                            <div className="active-view-selector__empty">
                                {searchQuery ? 'No matching views' : 'No views available'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ActiveViewSelector;