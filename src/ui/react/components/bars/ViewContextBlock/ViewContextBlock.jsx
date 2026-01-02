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
import { Icon } from '@UI/react/components/common/Icon';
import { IconButton } from '@UI/react/components/common/Button';
import './ViewContextBlock.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const VIEW_MODES = [
    { id: 'normal', icon: 'grid', color: 'var(--color-accent-blue)', label: 'Normal' },
    { id: 'isolation', icon: 'target', color: 'var(--color-accent-amber)', label: 'Isolation' },
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

const LINK_TYPES = [
    { id: 'camera', icon: 'camera', label: 'Camera', color: 'var(--color-accent-teal)' },
    { id: 'filter', icon: 'filter', label: 'Filters', color: 'var(--color-accent-amber)' },
    { id: 'selection', icon: 'crosshair', label: 'Selection', color: 'var(--color-accent-purple)' },
    { id: 'annotations', icon: 'edit', label: 'Annotations', color: 'var(--color-accent-pink)' },
    { id: 'transforms', icon: 'move', label: 'Transforms', color: 'var(--color-accent-cyan)' },
    { id: 'params', icon: 'sliders', label: 'Parameters', color: 'var(--color-accent-orange)' },
];

const DIRECTION_LABELS = {
    bidirectional: { icon: '↔', label: 'Both' },
    parent: { icon: '→', label: 'Push' },
    child: { icon: '←', label: 'Receive' },
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
                                        {sortBy === option.id && '✓'}
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
                                        {isActive && (
                                            <span className="view-hub-flyout__item-indicator">●</span>
                                        )}
                                        {!isActive && !isSubset && (
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
}) {
    const [expandedLink, setExpandedLink] = useState(null);
    const otherViews = allViews.filter((v) => v.id !== activeView?.id);

    const getViewById = useCallback(
        (id) => allViews.find((v) => v.id === id),
        [allViews]
    );

    if (!activeView) return null;

    // Get links from activeView, default to empty object
    const links = activeView.links || {};

    return (
        <div className="links-dropdown">
            {/* Header */}
            <div className="links-dropdown__header">
                <div className="links-dropdown__header-label">Links for</div>
                <div className="links-dropdown__header-view">
                    <span
                        className="links-dropdown__header-dot"
                        style={{ background: activeView.color }}
                    />
                    <span className="links-dropdown__header-name">{activeView.name}</span>
                </div>
            </div>

            {/* Link Types */}
            <div className="links-dropdown__list">
                {LINK_TYPES.map((linkType) => {
                    const link = links[linkType.id];
                    const isExpanded = expandedLink === linkType.id;
                    const targetView = link ? getViewById(link.target) : null;

                    return (
                        <div key={linkType.id} className="links-dropdown__item">
                            <button
                                type="button"
                                className={`links-dropdown__item-header ${isExpanded ? 'links-dropdown__item-header--expanded' : ''}`}
                                onClick={() => setExpandedLink(isExpanded ? null : linkType.id)}
                            >
                                <span
                                    className="links-dropdown__item-icon"
                                    style={{ color: link ? linkType.color : undefined }}
                                >
                                    <Icon name={linkType.icon} size={12} />
                                </span>
                                <span className="links-dropdown__item-label">{linkType.label}</span>

                                {link && targetView ? (
                                    <>
                                        <span
                                            className="links-dropdown__item-direction"
                                            style={{ color: linkType.color }}
                                        >
                                            {DIRECTION_LABELS[link.direction]?.icon || '↔'}
                                        </span>
                                        <span
                                            className="links-dropdown__item-target-dot"
                                            style={{ background: targetView.color }}
                                        />
                                        <span className="links-dropdown__item-target-name">
                                            {targetView.name}
                                        </span>
                                        <button
                                            type="button"
                                            className="links-dropdown__item-unlink"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateLink?.(linkType.id, null, null);
                                            }}
                                            title="Unlink"
                                        >
                                            <Icon name="close" size={10} />
                                        </button>
                                    </>
                                ) : (
                                    <span className="links-dropdown__item-empty">— Not linked</span>
                                )}
                                <Icon
                                    name="chevronRight"
                                    size={10}
                                    className={`links-dropdown__item-chevron ${isExpanded ? 'links-dropdown__item-chevron--expanded' : ''}`}
                                />
                            </button>

                            {/* Expanded panel */}
                            {isExpanded && (
                                <div className="links-dropdown__expand">
                                    <div className="links-dropdown__expand-section">
                                        <div className="links-dropdown__expand-label">Link to:</div>
                                        <div className="links-dropdown__expand-views">
                                            {otherViews.length === 0 ? (
                                                <div className="links-dropdown__expand-empty">
                                                    No other views available
                                                </div>
                                            ) : (
                                                otherViews.map((view) => {
                                                    const isSelected = link?.target === view.id;
                                                    return (
                                                        <button
                                                            key={view.id}
                                                            type="button"
                                                            className={`links-dropdown__view-option ${isSelected ? 'links-dropdown__view-option--selected' : ''}`}
                                                            style={{
                                                                '--link-color': linkType.color,
                                                            }}
                                                            onClick={() =>
                                                                onUpdateLink?.(
                                                                    linkType.id,
                                                                    view.id,
                                                                    link?.direction || 'bidirectional'
                                                                )
                                                            }
                                                        >
                                                            <span
                                                                className={`links-dropdown__view-radio ${isSelected ? 'links-dropdown__view-radio--selected' : ''}`}
                                                            />
                                                            <span
                                                                className="links-dropdown__view-dot"
                                                                style={{ background: view.color }}
                                                            />
                                                            <span className="links-dropdown__view-name">
                                                                {view.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {link && (
                                        <div className="links-dropdown__expand-section">
                                            <div className="links-dropdown__expand-label">Direction:</div>
                                            <div className="links-dropdown__direction-btns">
                                                {Object.entries(DIRECTION_LABELS).map(([key, value]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        className={`links-dropdown__direction-btn ${link.direction === key ? 'links-dropdown__direction-btn--active' : ''}`}
                                                        style={{ '--link-color': linkType.color }}
                                                        onClick={() =>
                                                            onUpdateLink?.(linkType.id, link.target, key)
                                                        }
                                                    >
                                                        {value.icon} {value.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
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
    const subsetRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (hubRef.current && !hubRef.current.contains(e.target)) {
                setShowHub(false);
            }
            if (linksRef.current && !linksRef.current.contains(e.target)) {
                setShowLinks(false);
            }
            if (subsetRef.current && !subsetRef.current.contains(e.target)) {
                setShowSubset(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ESC to exit isolation mode
    useEffect(() => {
        if (viewMode !== 'isolation') return;

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
            {/* Row 1: Mode Toggle | Active View | Quick Actions */}
            <div className="view-context-block__row view-context-block__row--main">
                {/* Mode Toggle */}
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

                <div className="view-context-block__divider" />

                {/* Active View Selector */}
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

                <div className="view-context-block__divider" />

                {/* Links Button */}
                <div ref={linksRef} className="view-context-block__links-wrapper">
                    <button
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

                    {showLinks && activeView && (
                        <LinksDropdown
                            activeView={activeView}
                            allViews={viewsForLinks}
                            onUpdateLink={onUpdateLink}
                            onClose={() => setShowLinks(false)}
                        />
                    )}
                </div>

                <div className="view-context-block__divider" />

                {/* Quick Actions */}
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

            {/* Row 2: Mode Indicator | Contextual Info */}
            <div className="view-context-block__row view-context-block__row--context">
                {/* Mode indicator */}
                <div
                    className="view-context-block__mode-indicator"
                    style={{ '--mode-color': currentMode.color }}
                >
                    <Icon name={currentMode.icon} size={10} />
                    <span>
                        {viewMode === 'normal' && 'All Views'}
                        {viewMode === 'isolation' && 'Focus'}
                        {viewMode === 'subset' && 'Compare'}
                    </span>
                </div>

                <div className="view-context-block__divider view-context-block__divider--short" />

                {/* Contextual content */}
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

                    {viewMode === 'isolation' && (
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
        </div>
    );
}

export default memo(ViewContextBlock);
export { ViewContextBlock };
