/**
 * @file ViewContextBlock.jsx
 * @description View context block for the secondary footer.
 * Handles view mode toggle, active view selection, and mode-specific context.
 *
 * Layout:
 * Row 1: [Mode Toggle] | [Active View Selector (flex)] | [Quick Actions]
 * Row 2: [Mode Indicator] | [Contextual Info based on mode]
 *
 * @example
 * <ViewContextBlock
 *   viewMode="normal"
 *   onModeChange={handleModeChange}
 *   activeView={activeView}
 *   onCanvasViews={canvasViews}
 *   availableViews={availableViews}
 *   onSelectView={handleSelectView}
 * />
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms/Button';
import './ViewContextBlock.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_MODES = [
    { id: 'normal', icon: 'grid', color: 'var(--color-accent-blue)', label: 'Normal' },
    { id: 'focus', icon: 'focus', color: 'var(--color-accent-amber)', label: 'Focus' },
    { id: 'subset', icon: 'compare', color: 'var(--color-accent-purple)', label: 'Subset' },
];

const VIEW_TYPE_ICONS = {
    volume: 'cube',
    slice: 'slice',
    chart: 'chart',
    points: 'scatterChart',
    mesh: 'box',
    '3d': 'box',
    default: 'eye',
};

const SORT_OPTIONS = [
    { id: 'name', label: 'Name A→Z' },
    { id: 'name-desc', label: 'Name Z→A' },
    { id: 'type', label: 'By Type' },
    { id: 'position', label: 'By Position' },
];

// Smart linking: some link types require same dataset, others work across any views
const LINK_TYPES = [
    {
        id: 'camera',
        icon: 'camera',
        label: 'Camera',
        color: 'var(--color-accent-teal)',
        requiresSameDataset: false, // Camera sync works across any views
        description: 'Sync view position and rotation',
    },
    {
        id: 'filters',
        icon: 'filter',
        label: 'Filters',
        color: 'var(--color-accent-amber)',
        requiresSameDataset: true, // Filters are data-specific
        description: 'Sync filter criteria',
    },
    {
        id: 'cursors',
        icon: 'crosshair',
        label: 'Cursors',
        color: 'var(--color-accent-purple)',
        requiresSameDataset: true, // Cursor position on data points
        description: 'Sync cursor/selection position',
    },
    {
        id: 'widgets',
        icon: 'ruler',
        label: 'Widgets',
        color: 'var(--color-accent-pink)',
        requiresSameDataset: true, // Measurements are data-bound
        description: 'Sync measurement widgets',
    },
    {
        id: 'colorMaps',
        icon: 'palette',
        label: 'Colors',
        color: 'var(--color-accent-cyan)',
        requiresSameDataset: true, // Color mapping is data-specific
        description: 'Sync color schemes',
    },
    {
        id: 'annotationDisplay',
        icon: 'edit',
        label: 'Annotations',
        color: 'var(--color-accent-orange)',
        requiresSameDataset: true, // Annotations are typically data-bound
        description: 'Sync annotation visibility',
    },
];

// Link direction modes matching LINK_MODES from ViewConfiguration
const LINK_DIRECTIONS = [
    { id: 'follow', icon: '←', label: 'Follow', description: 'Receive updates from target' },
    { id: 'bidirectional', icon: '↔', label: 'Sync', description: 'Two-way synchronization' },
    { id: 'broadcast', icon: '→', label: 'Broadcast', description: 'Push updates to target' },
];

const DIRECTION_LABELS = {
    follow: { icon: '←', label: 'Following' },
    bidirectional: { icon: '↔', label: 'Synced' },
    broadcast: { icon: '→', label: 'Broadcasting' },
};

// =============================================================================
// VIEW HUB FLYOUT
// =============================================================================

const ViewHubFlyout = memo(function ViewHubFlyout({
    views,
    available,
    activeView,
    isSubset,
    onSelect,
    onAction,
    onClose,
}) {
    const [search, setSearch] = useState('');
    const [typeFilters, setTypeFilters] = useState([]);
    const [sortBy, setSortBy] = useState('name');
    const [showFilters, setShowFilters] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Get all unique types from both lists
    const allTypes = useMemo(() => {
        const types = new Set([...views, ...available].map((v) => v.type).filter(Boolean));
        return Array.from(types);
    }, [views, available]);

    // Toggle type filter
    const toggleTypeFilter = useCallback((type) => {
        setTypeFilters((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    }, []);

    // Filter views by search and type
    const filterViews = useCallback(
        (arr) =>
            arr.filter((v) => {
                const matchesSearch =
                    !search || v.name?.toLowerCase().includes(search.toLowerCase());
                const matchesType = typeFilters.length === 0 || typeFilters.includes(v.type);
                return matchesSearch && matchesType;
            }),
        [search, typeFilters]
    );

    // Sort views
    const sortViews = useCallback(
        (arr) =>
            [...arr].sort((a, b) => {
                switch (sortBy) {
                    case 'name':
                        return (a.name || '').localeCompare(b.name || '');
                    case 'name-desc':
                        return (b.name || '').localeCompare(a.name || '');
                    case 'type':
                        return (a.type || '').localeCompare(b.type || '');
                    case 'position':
                        return (
                            ((a.position?.row || 0) * 10 + (a.position?.col || 0)) -
                            ((b.position?.row || 0) * 10 + (b.position?.col || 0))
                        );
                    default:
                        return 0;
                }
            }),
        [sortBy]
    );

    const filtered = sortViews(filterViews(views));
    const filteredAvail = sortViews(filterViews(available));
    const hasActiveFilters = typeFilters.length > 0 || search;

    const handleClearFilters = useCallback(() => {
        setTypeFilters([]);
        setSearch('');
    }, []);

    return (
        <div className="view-hub-flyout">
            {/* Subset mode header */}
            {isSubset && (
                <div className="view-hub-flyout__subset-header">
                    <Icon name="layers" size={12} />
                    <div className="view-hub-flyout__subset-info">
                        <span className="view-hub-flyout__subset-label">Subset Mode Active</span>
                        <span className="view-hub-flyout__subset-count">
                            Showing {views.length} views in subset
                        </span>
                    </div>
                </div>
            )}

            {/* Search + Filter + Sort */}
            <div className="view-hub-flyout__toolbar">
                <div className="view-hub-flyout__search">
                    <Icon name="search" size={12} className="view-hub-flyout__search-icon" />
                    <input
                        type="text"
                        placeholder="Search views..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="view-hub-flyout__search-input"
                        autoFocus
                    />
                    {search && (
                        <button
                            type="button"
                            className="view-hub-flyout__search-clear"
                            onClick={() => setSearch('')}
                        >
                            <Icon name="close" size={10} />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className={`view-hub-flyout__filter-btn ${showFilters || typeFilters.length > 0 ? 'view-hub-flyout__filter-btn--active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Icon name="filter" size={12} />
                    {typeFilters.length > 0 && (
                        <span className="view-hub-flyout__filter-badge">{typeFilters.length}</span>
                    )}
                </button>

                <div className="view-hub-flyout__sort-wrapper">
                    <button
                        type="button"
                        className={`view-hub-flyout__sort-btn ${showSortMenu ? 'view-hub-flyout__sort-btn--active' : ''}`}
                        onClick={() => setShowSortMenu(!showSortMenu)}
                    >
                        <Icon name="arrowUpDown" size={12} />
                    </button>
                    {showSortMenu && (
                        <div className="view-hub-flyout__sort-menu">
                            <div className="view-hub-flyout__sort-header">Sort by</div>
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`view-hub-flyout__sort-option ${sortBy === option.id ? 'view-hub-flyout__sort-option--active' : ''}`}
                                    onClick={() => {
                                        setSortBy(option.id);
                                        setShowSortMenu(false);
                                    }}
                                >
                                    <span className="view-hub-flyout__sort-check">
                                        {sortBy === option.id && <Icon name="check" size={10} />}
                                    </span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Type filters */}
            {showFilters && allTypes.length > 0 && (
                <div className="view-hub-flyout__type-filters">
                    {allTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            className={`view-hub-flyout__type-pill ${typeFilters.includes(type) ? 'view-hub-flyout__type-pill--active' : ''}`}
                            onClick={() => toggleTypeFilter(type)}
                        >
                            <Icon name={VIEW_TYPE_ICONS[type] || VIEW_TYPE_ICONS.default} size={10} />
                            {type}
                        </button>
                    ))}
                    {typeFilters.length > 0 && (
                        <button
                            type="button"
                            className="view-hub-flyout__type-clear"
                            onClick={() => setTypeFilters([])}
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* View lists */}
            <div className="view-hub-flyout__list">
                {/* On Canvas section */}
                <div className="view-hub-flyout__section">
                    <div className="view-hub-flyout__section-header">
                        <span>
                            {isSubset ? 'In Subset' : 'On Canvas'} ({filtered.length}
                            {hasActiveFilters && ` of ${views.length}`})
                        </span>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="view-hub-flyout__clear-filters"
                                onClick={handleClearFilters}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <div className="view-hub-flyout__section-items">
                        {filtered.length === 0 ? (
                            <div className="view-hub-flyout__empty">
                                {hasActiveFilters ? 'No views match filters' : 'No views on canvas'}
                            </div>
                        ) : (
                            filtered.map((v) => {
                                const isActive = activeView?.id === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className={`view-hub-flyout__item ${isActive ? 'view-hub-flyout__item--active' : ''}`}
                                        onClick={() => {
                                            onSelect(v);
                                            onClose();
                                        }}
                                    >
                                        <span
                                            className="view-hub-flyout__item-dot"
                                            style={{ background: v.color }}
                                        />
                                        <div className="view-hub-flyout__item-info">
                                            <div className="view-hub-flyout__item-name">{v.name}</div>
                                            <div className="view-hub-flyout__item-meta">
                                                <Icon
                                                    name={VIEW_TYPE_ICONS[v.type] || VIEW_TYPE_ICONS.default}
                                                    size={10}
                                                />
                                                <span>{v.type}</span>
                                                {v.position && (
                                                    <span className="view-hub-flyout__item-position">
                                                        {v.position.col},{v.position.row}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Show close button for all views except in subset mode */}
                                        {!isSubset && (
                                            <button
                                                type="button"
                                                className="view-hub-flyout__item-remove"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAction?.('remove', v);
                                                }}
                                                title="Remove from canvas"
                                            >
                                                <Icon name="close" size={10} />
                                            </button>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Available section - Always show in normal mode */}
                {!isSubset && (
                    <div className="view-hub-flyout__section view-hub-flyout__section--available">
                        <div className="view-hub-flyout__section-header">
                            <span>Available ({filteredAvail.length})</span>
                            <button
                                type="button"
                                className="view-hub-flyout__new-view"
                                onClick={() => onAction?.('create', null)}
                            >
                                <Icon name="add" size={10} /> New View
                            </button>
                        </div>
                        <div className="view-hub-flyout__section-items">
                            {filteredAvail.length === 0 ? (
                                <div className="view-hub-flyout__empty">
                                    {hasActiveFilters ? 'No views match filters' : 'No available views'}
                                </div>
                            ) : (
                                filteredAvail.map((v) => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className="view-hub-flyout__item view-hub-flyout__item--available"
                                        onClick={() => {
                                            onAction?.('place', v);
                                            onSelect(v);
                                            onClose();
                                        }}
                                    >
                                        <span
                                            className="view-hub-flyout__item-dot"
                                            style={{ background: v.color }}
                                        />
                                        <div className="view-hub-flyout__item-info">
                                            <div className="view-hub-flyout__item-name">{v.name}</div>
                                            <div className="view-hub-flyout__item-meta">
                                                <Icon
                                                    name={VIEW_TYPE_ICONS[v.type] || VIEW_TYPE_ICONS.default}
                                                    size={10}
                                                />
                                                <span>{v.type}</span>
                                            </div>
                                        </div>
                                        <span className="view-hub-flyout__item-add">
                                            <Icon name="add" size={10} /> Place
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// SUBSET PICKER DROPDOWN
// =============================================================================

const SubsetPickerDropdown = memo(function SubsetPickerDropdown({
    views,
    selectedIds,
    onToggle,
    onClose,
}) {
    // Select all views
    const handleSelectAll = useCallback(() => {
        views.forEach((view) => {
            if (!selectedIds.includes(view.id)) {
                onToggle(view.id);
            }
        });
    }, [views, selectedIds, onToggle]);

    // Clear all except first (keep at least one)
    const handleClear = useCallback(() => {
        if (selectedIds.length <= 1) return;
        const firstId = selectedIds[0];
        selectedIds.forEach((id) => {
            if (id !== firstId) {
                onToggle(id);
            }
        });
    }, [selectedIds, onToggle]);

    return (
        <div className="subset-picker-dropdown">
            {/* Header */}
            <div className="subset-picker-dropdown__header">
                <div className="subset-picker-dropdown__title">Select Subset Views</div>
                <span className="subset-picker-dropdown__count">{selectedIds.length} selected</span>
            </div>

            {/* View list */}
            <div className="subset-picker-dropdown__list">
                {views.length === 0 ? (
                    <div className="subset-picker-dropdown__empty">No views on canvas</div>
                ) : (
                    views.map((view) => {
                        const isSelected = selectedIds.includes(view.id);
                        return (
                            <button
                                key={view.id}
                                type="button"
                                className={`subset-picker-dropdown__item ${isSelected ? 'subset-picker-dropdown__item--selected' : ''}`}
                                onClick={() => onToggle(view.id)}
                            >
                                {/* Checkbox */}
                                <span
                                    className={`subset-picker-dropdown__checkbox ${isSelected ? 'subset-picker-dropdown__checkbox--checked' : ''}`}
                                >
                                    {isSelected && <Icon name="check" size={12} />}
                                </span>

                                {/* Color dot */}
                                <span
                                    className="subset-picker-dropdown__dot"
                                    style={{ background: view.color }}
                                />

                                {/* View info */}
                                <div className="subset-picker-dropdown__info">
                                    <div className="subset-picker-dropdown__name">{view.name}</div>
                                    <div className="subset-picker-dropdown__meta">
                                        <Icon
                                            name={VIEW_TYPE_ICONS[view.type] || VIEW_TYPE_ICONS.default}
                                            size={10}
                                        />
                                        <span>{view.type}</span>
                                        {view.position && (
                                            <span className="subset-picker-dropdown__position">
                                                {view.position.col},{view.position.row}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="subset-picker-dropdown__footer">
                <span className="subset-picker-dropdown__footer-count">
                    {selectedIds.length} of {views.length} in subset
                </span>
                <div className="subset-picker-dropdown__footer-actions">
                    <button
                        type="button"
                        className="subset-picker-dropdown__footer-btn subset-picker-dropdown__footer-btn--select"
                        onClick={handleSelectAll}
                        disabled={selectedIds.length === views.length}
                    >
                        Select All
                    </button>
                    <button
                        type="button"
                        className="subset-picker-dropdown__footer-btn subset-picker-dropdown__footer-btn--clear"
                        onClick={handleClear}
                        disabled={selectedIds.length <= 1}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
});

// =============================================================================
// LINKS DROPDOWN
// =============================================================================

const LinksDropdown = memo(function LinksDropdown({
    activeView,
    allViews,
    onUpdateLink,
    onClose,
    triggerRef, // Reference to the trigger button for positioning
}) {
    const [expandedLink, setExpandedLink] = useState(null);
    const dropdownRef = useRef(null);

    // Calculate position from trigger
    const getPosition = () => {
        if (!triggerRef?.current) return { top: 100, left: 100 };
        const rect = triggerRef.current.getBoundingClientRect();
        let top = rect.top - 400;
        let left = rect.left + rect.width / 2 - 160;
        if (left < 8) left = 8;
        if (left + 320 > window.innerWidth - 8) left = window.innerWidth - 328;
        if (top < 8) top = rect.bottom + 8;
        return { top, left };
    };
    const pos = getPosition();

    const links = activeView?.links || {};
    const otherViews = allViews.filter((v) => v.id !== activeView?.id);

    // Smart filtering: check if a view shares the same dataset
    const viewSharesDataset = useCallback((view) => {
        if (!activeView?.datasetId || !view?.datasetId) return false;
        return activeView.datasetId === view.datasetId;
    }, [activeView?.datasetId]);

    // Get compatible views for a link type
    const getCompatibleViews = useCallback((linkType) => {
        if (!linkType.requiresSameDataset) {
            return { compatible: otherViews, incompatible: [] };
        }
        const compatible = otherViews.filter(viewSharesDataset);
        const incompatible = otherViews.filter((v) => !viewSharesDataset(v));
        return { compatible, incompatible };
    }, [otherViews, viewSharesDataset]);

    // Count views with same dataset
    const sameDatasetCount = useMemo(() => {
        return otherViews.filter(viewSharesDataset).length;
    }, [otherViews, viewSharesDataset]);

    // Handle view selection - applies link immediately
    const handleViewSelect = useCallback((linkTypeId, viewId, currentDirection) => {
        onUpdateLink?.(linkTypeId, viewId, currentDirection || 'bidirectional');
    }, [onUpdateLink]);

    // Handle direction change - applies immediately
    const handleDirectionChange = useCallback((linkTypeId, targetViewId, newDirection) => {
        onUpdateLink?.(linkTypeId, targetViewId, newDirection);
    }, [onUpdateLink]);

    return createPortal(
        <>
            <div className="links-dropdown__backdrop" onClick={onClose} />
            <div
                ref={dropdownRef}
                className="links-dropdown"
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    width: 320,
                    zIndex: 99999,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="links-dropdown__header">
                    <div className="links-dropdown__header-label">Links for</div>
                    <div className="links-dropdown__header-view">
                        {activeView ? (
                            <>
                                <span className="links-dropdown__header-dot" style={{ background: activeView.color }} />
                                <span className="links-dropdown__header-name">{activeView.name}</span>
                            </>
                        ) : (
                            <span className="links-dropdown__header-name">No view selected</span>
                        )}
                    </div>
                    {activeView?.datasetName && (
                        <div className="links-dropdown__header-dataset">
                            <Icon name="file" size={10} />
                            <span>{activeView.datasetName}</span>
                            {sameDatasetCount > 0 && (
                                <span className="links-dropdown__header-dataset-count">{sameDatasetCount} shared</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="links-dropdown__list">
                    {LINK_TYPES.map((linkType) => {
                        const link = links[linkType.id];
                        const isExpanded = expandedLink === linkType.id;
                        // Hub model: targets is an array of all synced view IDs
                        const syncedViewIds = link?.targets || [];
                        const syncedViews = syncedViewIds.map(id => allViews.find(v => v.id === id)).filter(Boolean);
                        const isSynced = syncedViews.length > 0;
                        const { compatible, incompatible } = getCompatibleViews(linkType);
                        const hasCompatibleViews = compatible.length > 0;
                        const hasIncompatibleViews = incompatible.length > 0;

                        return (
                            <div key={linkType.id} className="links-dropdown__item">
                                <button
                                    type="button"
                                    className={`links-dropdown__item-header ${isExpanded ? 'links-dropdown__item-header--expanded' : ''}`}
                                    onClick={() => setExpandedLink(isExpanded ? null : linkType.id)}
                                >
                                    <span className="links-dropdown__item-icon" style={{ color: isSynced ? linkType.color : undefined }}>
                                        <Icon name={linkType.icon} size={12} />
                                    </span>
                                    <span className="links-dropdown__item-label">{linkType.label}</span>

                                    {linkType.requiresSameDataset && (
                                        <span className="links-dropdown__item-requires-dataset" title="Requires same dataset">
                                            <Icon name="database" size={10} />
                                        </span>
                                    )}

                                    {isSynced ? (
                                        <div className="links-dropdown__item-synced">
                                            <span className="links-dropdown__item-direction" style={{ color: linkType.color }}>↔</span>
                                            <div className="links-dropdown__item-targets">
                                                {syncedViews.slice(0, 3).map((view, idx) => (
                                                    <span
                                                        key={view.id}
                                                        className="links-dropdown__item-target-dot"
                                                        style={{ background: view.color, marginLeft: idx > 0 ? '-4px' : 0 }}
                                                        title={view.name}
                                                    />
                                                ))}
                                                {syncedViews.length > 3 && (
                                                    <span className="links-dropdown__item-more">+{syncedViews.length - 3}</span>
                                                )}
                                            </div>
                                            <span className="links-dropdown__item-count">{syncedViews.length} synced</span>
                                        </div>
                                    ) : (
                                        <span className="links-dropdown__item-empty">
                                            {linkType.requiresSameDataset && !hasCompatibleViews ? 'No compatible views' : 'Not synced'}
                                        </span>
                                    )}
                                    <Icon
                                        name="chevronRight"
                                        size={10}
                                        className={`links-dropdown__item-chevron ${isExpanded ? 'links-dropdown__item-chevron--expanded' : ''}`}
                                    />
                                </button>

                                {isExpanded && (
                                    <div className="links-dropdown__expand">
                                        <div className="links-dropdown__expand-desc">{linkType.description}</div>

                                        {/* Currently synced views */}
                                        {isSynced && (
                                            <div className="links-dropdown__expand-section">
                                                <div className="links-dropdown__expand-label">Synced with:</div>
                                                <div className="links-dropdown__synced-list">
                                                    {syncedViews.map((view) => (
                                                        <div key={view.id} className="links-dropdown__synced-item">
                                                            <span className="links-dropdown__view-dot" style={{ background: view.color }} />
                                                            <span className="links-dropdown__view-name">{view.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="links-dropdown__unlink-btn"
                                                    onClick={() => onUpdateLink?.(linkType.id, null, null)}
                                                >
                                                    <Icon name="linkOff" size={12} />
                                                    <span>Leave sync group</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Add more views to sync group */}
                                        <div className="links-dropdown__expand-section">
                                            <div className="links-dropdown__expand-label">
                                                {isSynced ? 'Add to sync:' : 'Sync with:'}
                                                {linkType.requiresSameDataset && (
                                                    <span className="links-dropdown__expand-label-note">(same dataset)</span>
                                                )}
                                            </div>
                                            <div className="links-dropdown__expand-views">
                                                {compatible.length === 0 && incompatible.length === 0 && (
                                                    <div className="links-dropdown__expand-empty">No other views available</div>
                                                )}

                                                {compatible.length === 0 && incompatible.length > 0 && linkType.requiresSameDataset && (
                                                    <div className="links-dropdown__expand-empty">
                                                        <Icon name="alert" size={12} />
                                                        No views with same dataset
                                                    </div>
                                                )}

                                                {compatible.map((view) => {
                                                    const isAlreadySynced = syncedViewIds.includes(view.id);
                                                    return (
                                                        <button
                                                            key={view.id}
                                                            type="button"
                                                            className={`links-dropdown__view-option ${isAlreadySynced ? 'links-dropdown__view-option--selected' : ''}`}
                                                            onClick={() => !isAlreadySynced && handleViewSelect(linkType.id, view.id, 'bidirectional')}
                                                            disabled={isAlreadySynced}
                                                        >
                                                            <span className={`links-dropdown__view-radio ${isAlreadySynced ? 'links-dropdown__view-radio--selected' : ''}`} />
                                                            <span className="links-dropdown__view-dot" style={{ background: view.color }} />
                                                            <div className="links-dropdown__view-info">
                                                                <span className="links-dropdown__view-name">{view.name}</span>
                                                                {view.datasetName && <span className="links-dropdown__view-dataset">{view.datasetName}</span>}
                                                            </div>
                                                            {isAlreadySynced ? (
                                                                <span className="links-dropdown__view-synced-badge">synced</span>
                                                            ) : viewSharesDataset(view) ? (
                                                                <span className="links-dropdown__view-same-dataset" title="Same dataset">
                                                                    <Icon name="check" size={10} />
                                                                </span>
                                                            ) : null}
                                                        </button>
                                                    );
                                                })}

                                                {hasIncompatibleViews && linkType.requiresSameDataset && (
                                                    <>
                                                        <div className="links-dropdown__expand-divider">
                                                            <span>Different datasets</span>
                                                        </div>
                                                        {incompatible.map((view) => (
                                                            <div
                                                                key={view.id}
                                                                className="links-dropdown__view-option links-dropdown__view-option--disabled"
                                                                title={`Cannot link: ${view.name} uses a different dataset`}
                                                            >
                                                                <span className="links-dropdown__view-radio links-dropdown__view-radio--disabled" />
                                                                <span className="links-dropdown__view-dot" style={{ background: view.color, opacity: 0.4 }} />
                                                                <div className="links-dropdown__view-info">
                                                                    <span className="links-dropdown__view-name">{view.name}</span>
                                                                    {view.datasetName && <span className="links-dropdown__view-dataset">{view.datasetName}</span>}
                                                                </div>
                                                                <span className="links-dropdown__view-incompatible">
                                                                    <Icon name="alert" size={10} />
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>,
        document.body
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function ViewContextBlock({
    viewMode = 'normal',
    onModeChange,
    activeView,
    onCanvasViews = [],
    availableViews = [],
    onSelectView,
    onViewAction,
    onUpdateLink,
    subsetIds = [],
    onSubsetChange,
    onSnapshot,
    onDuplicate,
    onOpenSettings,
    className = '',
}) {
    const [showHub, setShowHub] = useState(false);
    const [showLinks, setShowLinks] = useState(false);
    const [showSubset, setShowSubset] = useState(false);
    const hubRef = useRef(null);
    const linksRef = useRef(null);
    const linksBtnRef = useRef(null);
    const subsetRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (hubRef.current && !hubRef.current.contains(e.target)) {
                setShowHub(false);
            }
            // For links, also check if click is on the portal dropdown
            if (linksRef.current && !linksRef.current.contains(e.target)) {
                const isOnDropdown = e.target.closest('.links-dropdown') || e.target.closest('.links-dropdown__backdrop');
                if (!isOnDropdown) {
                    setShowLinks(false);
                }
            }
            if (subsetRef.current && !subsetRef.current.contains(e.target)) {
                setShowSubset(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ESC to exit focus mode
    useEffect(() => {
        if (viewMode !== 'focus') return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onModeChange?.('normal');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, onModeChange]);

    const isSubset = viewMode === 'subset';
    const subsetViews = isSubset
        ? onCanvasViews.filter((v) => subsetIds.includes(v.id))
        : onCanvasViews;

    const currentMode = VIEW_MODES.find((m) => m.id === viewMode) || VIEW_MODES[0];

    const handleViewSelect = useCallback(
        (view) => {
            onSelectView?.(view);
        },
        [onSelectView]
    );

    // Toggle a view in the subset
    const handleSubsetToggle = useCallback(
        (viewId) => {
            const newSubsetIds = subsetIds.includes(viewId)
                ? subsetIds.filter((id) => id !== viewId)
                : [...subsetIds, viewId];
            onSubsetChange?.(newSubsetIds);
        },
        [subsetIds, onSubsetChange]
    );

    // Count active links for badge
    const activeLinkCount = useMemo(() => {
        if (!activeView?.links) return 0;
        return Object.values(activeView.links).filter((link) => link !== null).length;
    }, [activeView?.links]);

    // Quick action handlers
    const handleSnapshot = useCallback(() => {
        if (!activeView) return;
        if (onSnapshot) {
            onSnapshot(activeView);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(
                new CustomEvent('cia:view-snapshot', {
                    detail: { viewId: activeView.id, view: activeView },
                })
            );
        }
    }, [activeView, onSnapshot]);

    const handleDuplicate = useCallback(() => {
        if (!activeView) return;
        if (onDuplicate) {
            onDuplicate(activeView);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(
                new CustomEvent('cia:view-duplicate', {
                    detail: { viewId: activeView.id, view: activeView },
                })
            );
        }
    }, [activeView, onDuplicate]);

    const handleOpenSettings = useCallback(() => {
        if (!activeView) return;
        if (onOpenSettings) {
            onOpenSettings(activeView);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(
                new CustomEvent('cia:view-settings', {
                    detail: { viewId: activeView.id, view: activeView },
                })
            );
        }
    }, [activeView, onOpenSettings]);

    // Views available for linking (same as subset views for consistency)
    const viewsForLinks = isSubset ? subsetViews : onCanvasViews;

    return (
        <div className={`view-context-block ${className}`}>
            {/* Column-based layout for vertical alignment */}

            {/* Mode Column: Toggle + Indicator */}
            <div className="view-context-block__column view-context-block__column--mode">
                <div className="view-context-block__mode-toggle">
                    {VIEW_MODES.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className={`view-context-block__mode-btn ${viewMode === m.id ? 'view-context-block__mode-btn--active' : ''}`}
                            style={{ '--mode-color': m.color }}
                            onClick={() => onModeChange?.(m.id)}
                            title={m.label}
                        >
                            <Icon name={m.icon} size={12} />
                        </button>
                    ))}
                </div>
                <div
                    className="view-context-block__mode-indicator"
                    style={{ '--mode-color': currentMode.color }}
                >
                    <Icon name={currentMode.icon} size={10} />
                    <span>
                        {viewMode === 'normal' && 'All Views'}
                        {viewMode === 'focus' && 'Focus'}
                        {viewMode === 'subset' && 'Compare'}
                    </span>
                </div>
            </div>

            <div className="view-context-block__divider view-context-block__divider--full" />

            {/* View Column: Selector + Context Info */}
            <div className="view-context-block__column view-context-block__column--view">
                <div ref={hubRef} className="view-context-block__view-selector">
                    <button
                        type="button"
                        className={`view-context-block__view-btn ${showHub ? 'view-context-block__view-btn--open' : ''}`}
                        style={{ '--view-color': currentMode.color }}
                        onClick={() => setShowHub(!showHub)}
                    >
                        <span
                            className="view-context-block__view-dot"
                            style={{ background: activeView?.color || 'var(--color-text-muted)' }}
                        />
                        <div className="view-context-block__view-info">
                            <div className="view-context-block__view-label">Active View</div>
                            <div className="view-context-block__view-name">
                                {activeView?.name || 'Select view...'}
                            </div>
                        </div>
                        {activeView?.type && (
                            <Icon
                                name={VIEW_TYPE_ICONS[activeView.type] || VIEW_TYPE_ICONS.default}
                                size={12}
                                className="view-context-block__view-type-icon"
                            />
                        )}
                        <Icon
                            name={showHub ? 'chevronUp' : 'chevronDown'}
                            size={10}
                            className="view-context-block__view-chevron"
                        />
                    </button>

                    {showHub && (
                        <ViewHubFlyout
                            views={subsetViews}
                            available={isSubset ? [] : availableViews}
                            activeView={activeView}
                            isSubset={isSubset}
                            onSelect={handleViewSelect}
                            onAction={onViewAction}
                            onClose={() => setShowHub(false)}
                        />
                    )}
                </div>

                {/* Contextual content below view selector */}
                <div className="view-context-block__context-content">
                    {viewMode === 'normal' && (
                        <div className="view-context-block__normal-info">
                            {activeView?.position && (
                                <span className="view-context-block__position">
                                    {activeView.position.col},{activeView.position.row}
                                </span>
                            )}
                            <span className="view-context-block__view-count">
                                {onCanvasViews.length} views on canvas
                            </span>
                        </div>
                    )}

                    {viewMode === 'focus' && (
                        <span className="view-context-block__escape-hint">
                            Press <kbd>Esc</kbd> to exit
                        </span>
                    )}

                    {viewMode === 'subset' && (
                        <div ref={subsetRef} className="view-context-block__subset-wrapper">
                            <button
                                type="button"
                                className={`view-context-block__subset-btn ${showSubset ? 'view-context-block__subset-btn--open' : ''}`}
                                onClick={() => setShowSubset(!showSubset)}
                            >
                                <Icon name="layers" size={10} />
                                <span>{subsetIds.length} in subset</span>
                                <div className="view-context-block__subset-dots">
                                    {subsetViews.slice(0, 4).map((v, i) => (
                                        <span
                                            key={v.id}
                                            className="view-context-block__subset-dot"
                                            style={{ background: v.color, marginLeft: i > 0 ? '-4px' : 0 }}
                                        />
                                    ))}
                                </div>
                                <Icon
                                    name={showSubset ? 'chevronUp' : 'chevronDown'}
                                    size={10}
                                    className="view-context-block__subset-chevron"
                                />
                            </button>

                            {showSubset && (
                                <SubsetPickerDropdown
                                    views={onCanvasViews}
                                    selectedIds={subsetIds}
                                    onToggle={handleSubsetToggle}
                                    onClose={() => setShowSubset(false)}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="view-context-block__divider view-context-block__divider--full" />

            {/* Links Column */}
            <div className="view-context-block__column view-context-block__column--links">
                <div ref={linksRef} className="view-context-block__links-wrapper">
                    <button
                        ref={linksBtnRef}
                        type="button"
                        className={`view-context-block__links-btn ${showLinks ? 'view-context-block__links-btn--open' : ''}`}
                        onClick={() => setShowLinks(!showLinks)}
                    >
                        <Icon name="link" size={12} />
                        <span>Links</span>
                        {activeLinkCount > 0 && (
                            <span className="view-context-block__links-badge">{activeLinkCount}</span>
                        )}
                        <Icon
                            name={showLinks ? 'chevronUp' : 'chevronDown'}
                            size={10}
                        />
                    </button>

                    {showLinks && (
                        <LinksDropdown
                            activeView={activeView}
                            allViews={viewsForLinks}
                            onUpdateLink={onUpdateLink}
                            onClose={() => setShowLinks(false)}
                            triggerRef={linksBtnRef}
                        />
                    )}
                </div>
            </div>

            <div className="view-context-block__divider view-context-block__divider--full" />

            {/* Actions Column */}
            <div className="view-context-block__column view-context-block__column--actions">
                <div className="view-context-block__quick-actions">
                    <IconButton
                        icon="camera"
                        label="Snapshot"
                        size="sm"
                        disabled={!activeView}
                        onClick={handleSnapshot}
                    />
                    <IconButton
                        icon="copy"
                        label="Duplicate"
                        size="sm"
                        disabled={!activeView}
                        onClick={handleDuplicate}
                    />
                    <IconButton
                        icon="settings"
                        label="Settings"
                        size="sm"
                        disabled={!activeView}
                        onClick={handleOpenSettings}
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(ViewContextBlock);
export { ViewContextBlock };
