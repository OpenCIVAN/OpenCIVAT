// src/ui/react/components/panels/LeftPanel/tabs/SavedFiltersTab.jsx
// Saved Filters tab content for the unified left panel
//
// Features:
// - Shows saved filter presets with search and filtering
// - Filter types: colormap, threshold, clip, opacity, composite
// - Star/favorite filters, sharing, and quick apply
// - VS Code-style collapsible sections

import React, { useState, useCallback, useMemo } from 'react';
import {
    SlidersHorizontal,
    Search,
    X,
    ChevronDown,
    ChevronRight,
    Star,
    StarOff,
    Trash2,
    Copy,
    Share2,
    Play,
    Upload,
    Download,
    Plus,
    Palette,
    Sliders,
    Scissors,
    CircleDot,
    Filter,
    Users,
} from 'lucide-react';
import { ui as log } from '@Utils/logger.js';

// =============================================================================
// FILTER TYPE ICONS
// =============================================================================

const FILTER_TYPE_ICONS = {
    colormap: Palette,
    threshold: Sliders,
    clip: Scissors,
    opacity: CircleDot,
    composite: Filter,
};

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_FILTERS = [
    {
        id: 'f1',
        name: 'Bone View',
        type: 'composite',
        description: 'Colormap + threshold for bone visualization',
        components: ['colormap', 'threshold', 'opacity'],
        starred: true,
        shared: false,
        createdBy: 'You',
        usageCount: 24,
    },
    {
        id: 'f2',
        name: 'Soft Tissue',
        type: 'composite',
        description: 'Low threshold with pink colormap',
        components: ['colormap', 'threshold'],
        starred: true,
        shared: true,
        createdBy: 'You',
        usageCount: 18,
    },
    {
        id: 'f3',
        name: 'MIP Preset',
        type: 'composite',
        description: 'Maximum intensity projection settings',
        components: ['opacity', 'colormap'],
        starred: false,
        shared: false,
        createdBy: 'You',
        usageCount: 7,
    },
    {
        id: 'f4',
        name: "Dr. Smith's Tumor View",
        type: 'composite',
        description: 'Optimized for tumor visualization',
        components: ['colormap', 'threshold', 'clip'],
        starred: false,
        shared: true,
        createdBy: 'Dr. Smith',
        usageCount: 12,
    },
    {
        id: 'f5',
        name: 'Quick Clip X',
        type: 'clip',
        description: 'Sagittal clip plane preset',
        components: ['clip'],
        starred: false,
        shared: false,
        createdBy: 'You',
        usageCount: 3,
    },
];

// =============================================================================
// FILTER ITEM
// =============================================================================

function FilterItem({ filter, isSelected, onSelect, onToggleStar, onApply }) {
    const TypeIcon = FILTER_TYPE_ICONS[filter.type] || Filter;

    return (
        <div
            className={`filter-item ${isSelected ? 'filter-item--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : filter.id)}
        >
            <div className="filter-item__main">
                {/* Star toggle */}
                <button
                    className={`filter-item__star ${filter.starred ? 'filter-item__star--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onToggleStar(filter.id); }}
                >
                    {filter.starred ? <Star size={12} fill="currentColor" /> : <StarOff size={12} />}
                </button>

                {/* Type icon */}
                <span className="filter-item__type-icon">
                    <TypeIcon size={14} />
                </span>

                {/* Content */}
                <div className="filter-item__content">
                    <div className="filter-item__name">
                        {filter.name}
                        {filter.shared && <Share2 size={9} className="filter-item__shared-icon" />}
                    </div>
                    <div className="filter-item__description">{filter.description}</div>
                </div>

                {/* Quick apply button */}
                <button
                    className="filter-item__apply-btn"
                    onClick={(e) => { e.stopPropagation(); onApply(filter.id); }}
                >
                    <Play size={10} />
                    Apply
                </button>
            </div>

            {/* Expanded details */}
            {isSelected && (
                <div className="filter-item__expanded">
                    {/* Components */}
                    <div className="filter-item__components">
                        {filter.components.map(comp => {
                            const CompIcon = FILTER_TYPE_ICONS[comp] || Filter;
                            return (
                                <span key={comp} className="filter-item__component">
                                    <CompIcon size={10} />
                                    {comp}
                                </span>
                            );
                        })}
                    </div>

                    {/* Metadata */}
                    <div className="filter-item__meta">
                        <span>Created by {filter.createdBy}</span>
                        <span>Used {filter.usageCount} times</span>
                    </div>

                    {/* Actions */}
                    <div className="filter-item__actions">
                        <button className="filter-item__action-btn" data-color="blue">
                            <Copy size={10} /> Duplicate
                        </button>
                        <button className="filter-item__action-btn" data-color="pink">
                            <Share2 size={10} /> {filter.shared ? 'Unshare' : 'Share'}
                        </button>
                        {filter.createdBy === 'You' && (
                            <button className="filter-item__action-btn filter-item__action-btn--icon">
                                <Trash2 size={10} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// FILTER TABS
// =============================================================================

function FilterTabs({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'all', label: 'All', icon: null },
        { id: 'starred', label: 'Starred', icon: Star },
        { id: 'shared', label: 'Shared', icon: Users },
    ];

    return (
        <div className="filter-tabs">
            {tabs.map(tab => {
                const TabIcon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        className={`filter-tabs__btn ${activeTab === tab.id ? 'filter-tabs__btn--active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {TabIcon && <TabIcon size={10} />}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SavedFiltersPanelContent({ workspaceId }) {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [filters, setFilters] = useState(SAMPLE_FILTERS);

    // Toggle star
    const toggleStar = useCallback((filterId) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, starred: !f.starred } : f
        ));
    }, []);

    // Apply filter
    const applyFilter = useCallback((filterId) => {
        log.debug('Applying filter:', filterId);
        // TODO: Apply filter to current instance
    }, []);

    // Filter list
    const filteredFilters = useMemo(() => {
        return filters.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'all' ||
                (activeTab === 'starred' && f.starred) ||
                (activeTab === 'shared' && f.shared);
            return matchesSearch && matchesTab;
        });
    }, [filters, searchQuery, activeTab]);

    const myFilters = filteredFilters.filter(f => f.createdBy === 'You');
    const sharedWithMe = filteredFilters.filter(f => f.createdBy !== 'You');

    return (
        <div className="saved-filters-tab">
            {/* Header */}
            <div className="panel-header">
                <SlidersHorizontal size={14} className="panel-header__icon file-icon--amber" />
                <span className="panel-header__title">Saved Filters</span>
                <span className="panel-header__count">{filters.length} presets</span>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search filters..."
                    />
                    {searchQuery && (
                        <button
                            className="clear-button"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="panel-toolbar">
                <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Content */}
            <div className="saved-filters-tab__content">
                {/* My Filters */}
                {myFilters.length > 0 && (
                    <div className="saved-filters-tab__section">
                        <div className="saved-filters-tab__section-header">My Filters</div>
                        {myFilters.map(filter => (
                            <FilterItem
                                key={filter.id}
                                filter={filter}
                                isSelected={selectedFilter === filter.id}
                                onSelect={setSelectedFilter}
                                onToggleStar={toggleStar}
                                onApply={applyFilter}
                            />
                        ))}
                    </div>
                )}

                {/* Shared with Me */}
                {sharedWithMe.length > 0 && (
                    <div className="saved-filters-tab__section">
                        <div className="saved-filters-tab__section-header">Shared with Me</div>
                        {sharedWithMe.map(filter => (
                            <FilterItem
                                key={filter.id}
                                filter={filter}
                                isSelected={selectedFilter === filter.id}
                                onSelect={setSelectedFilter}
                                onToggleStar={toggleStar}
                                onApply={applyFilter}
                            />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {filteredFilters.length === 0 && (
                    <div className="saved-filters-tab__empty">
                        No filters found
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <Plus size={11} />
                    <span>Save Current</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon">
                    <Upload size={11} />
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon">
                    <Download size={11} />
                </button>
            </div>
        </div>
    );
}

export default SavedFiltersPanelContent;