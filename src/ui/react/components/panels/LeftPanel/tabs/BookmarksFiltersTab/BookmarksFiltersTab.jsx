// tabs/BookmarksFiltersTab/BookmarksFiltersTab.jsx
// Combined Bookmarks & Filters tab content for the unified left panel
//
// Features:
// - Sub-tabs for Bookmarks and Filters
// - Scope filtering (Project | Room | Personal)
// - Search across both types
// - Collapsible sections grouped by scope

import React, { useState, useCallback, useMemo } from 'react';
import {
    Bookmark,
    Search,
    X,
    ChevronDown,
    ChevronRight,
    Plus,
    Loader2,
    AlertCircle,
    Sliders,
} from 'lucide-react';
import { ui as log } from '@Utils/logger.js';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { getScopeChips, getScopeConfig } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/constants.js';
import { ScopedSection } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/components/ScopedSection';
import { BookmarkItem } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/components/BookmarkItem';
import { FilterItem } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/components/FilterItem';
import './BookmarksFiltersTab.scss';

// Build chips with counts
const scopeChips = useMemo(() => [
    {
        id: 'project', label: 'Project', icon: Globe, color: 'amber',
        count: counts.project
    },
    {
        id: 'room', label: 'This Room', icon: Users, color: 'teal',
        count: counts.room
    },
    {
        id: 'personal', label: 'Personal', icon: UserCircle, color: 'blue',
        count: counts.personal
    },
], [counts]);

// =============================================================================
// SUB-TABS (dark etched style)
// =============================================================================

function SubTabs({ activeTab, onTabChange }) {
    return (
        <div className="bf-sub-tabs">
            <button
                className={`bf-sub-tabs__btn ${activeTab === 'bookmarks' ? 'bf-sub-tabs__btn--active' : ''}`}
                data-color="purple"
                onClick={() => onTabChange('bookmarks')}
            >
                <Bookmark size={12} />
                Bookmarks
            </button>
            <button
                className={`bf-sub-tabs__btn ${activeTab === 'filters' ? 'bf-sub-tabs__btn--active' : ''}`}
                data-color="amber"
                onClick={() => onTabChange('filters')}
            >
                <Sliders size={12} />
                Filters
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookmarksFiltersPanelContent({ workspaceId }) {
    // Sub-tab state
    const [activeSubTab, setActiveSubTab] = useState('bookmarks');

    // Scope filters - all active by default
    const [activeScopes, setActiveScopes] = useState(['project', 'room', 'personal']);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Section expansion
    const [expandedSections, setExpandedSections] = useState({
        project: true,
        room: true,
        personal: true,
    });

        // Build scope chips for ChipGroup 
    const scopeChips = useMemo(() => {
        const counts = activeSubTab === 'bookmarks' ? bookmarkCounts : filterCounts;
        return getScopeChips(counts);
    }, [activeSubTab, bookmarkCounts, filterCounts]);

    // Bookmarks hook
    const {
        bookmarks,
        isLoading: bookmarksLoading,
        error: bookmarksError,
        deleteBookmark,
        togglePin: toggleBookmarkPin,
        navigateToBookmark,
        getThumbnailUrl,
        refetch: refetchBookmarks,
    } = useBookmarks({ workspaceId });

    // Filters hook
    const {
        filters,
        isLoading: filtersLoading,
        error: filtersError,
        deleteFilter,
        togglePin: toggleFilterPin,
        applyFilter,
        refetch: refetchFilters,
    } = useFilters({ workspaceId });

    // Toggle scope
    const toggleScope = useCallback((scope) => {
        setActiveScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
    }, []);

    // Toggle section
    const toggleSection = useCallback((scope) => {
        setExpandedSections(prev => ({
            ...prev,
            [scope]: !prev[scope]
        }));
    }, []);

    // Filter and group bookmarks
    const filteredBookmarks = useMemo(() => {
        return bookmarks.filter(b => {
            const matchesScope = activeScopes.includes(b.scope || 'personal');
            const matchesSearch = !searchQuery ||
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.datasetName && b.datasetName.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesScope && matchesSearch;
        });
    }, [bookmarks, activeScopes, searchQuery]);

    const bookmarksByScope = useMemo(() => ({
        project: filteredBookmarks.filter(b => b.scope === 'project'),
        room: filteredBookmarks.filter(b => b.scope === 'room' || b.scope === 'workspace'),
        personal: filteredBookmarks.filter(b => b.scope === 'personal' || !b.scope),
    }), [filteredBookmarks]);

    // Filter and group filters
    const filteredFilters = useMemo(() => {
        return filters.filter(f => {
            const matchesScope = activeScopes.includes(f.scope || 'personal');
            const matchesSearch = !searchQuery ||
                f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesScope && matchesSearch;
        });
    }, [filters, activeScopes, searchQuery]);

    const filtersByScope = useMemo(() => ({
        project: filteredFilters.filter(f => f.scope === 'project'),
        room: filteredFilters.filter(f => f.scope === 'room' || f.scope === 'workspace'),
        personal: filteredFilters.filter(f => f.scope === 'personal' || !f.scope),
    }), [filteredFilters]);

    // Counts for scope chips
    const bookmarkCounts = useMemo(() => ({
        project: bookmarks.filter(b => b.scope === 'project').length,
        room: bookmarks.filter(b => b.scope === 'room' || b.scope === 'workspace').length,
        personal: bookmarks.filter(b => b.scope === 'personal' || !b.scope).length,
    }), [bookmarks]);

    const filterCounts = useMemo(() => ({
        project: filters.filter(f => f.scope === 'project').length,
        room: filters.filter(f => f.scope === 'room' || f.scope === 'workspace').length,
        personal: filters.filter(f => f.scope === 'personal' || !f.scope).length,
    }), [filters]);

    // Handlers
    const handleNavigate = useCallback((bookmarkId) => {
        const bookmark = navigateToBookmark(bookmarkId);
        if (bookmark) {
            log.debug('Navigating to bookmark:', bookmarkId, bookmark);
        }
    }, [navigateToBookmark]);

    const handleApplyFilter = useCallback((filterId) => {
        const filterConfig = applyFilter(filterId);
        if (filterConfig) {
            log.debug('Applying filter:', filterId, filterConfig);
            window.dispatchEvent(new CustomEvent('cia:apply-filter', {
                detail: { filterId, filterConfig },
            }));
        }
    }, [applyFilter]);

    const handleDeleteBookmark = useCallback(async (bookmarkId) => {
        if (window.confirm('Delete this bookmark?')) {
            try {
                await deleteBookmark(bookmarkId);
            } catch (err) {
                log.error('Failed to delete bookmark:', err);
            }
        }
    }, [deleteBookmark]);

    const handleDeleteFilter = useCallback(async (filterId) => {
        if (window.confirm('Delete this filter?')) {
            try {
                await deleteFilter(filterId);
            } catch (err) {
                log.error('Failed to delete filter:', err);
            }
        }
    }, [deleteFilter]);

    // Loading/error states
    const isLoading = activeSubTab === 'bookmarks' ? bookmarksLoading : filtersLoading;
    const error = activeSubTab === 'bookmarks' ? bookmarksError : filtersError;
    const refetch = activeSubTab === 'bookmarks' ? refetchBookmarks : refetchFilters;
    const isEmpty = activeSubTab === 'bookmarks'
        ? filteredBookmarks.length === 0
        : filteredFilters.length === 0;

    return (
        <div className="bookmarks-filters-tab">
            {/* Header */}
            <div className="bookmarks-filters-tab__header">
                <Bookmark size={14} className="icon-purple" />
                <span className="bookmarks-filters-tab__title">Bookmarks & Filters</span>
            </div>

            {/* Sub-tabs */}
            <SubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />

            {/* Scope chips */}
            <div className="bookmarks-filters-tab__scope-bar">
                <ChipGroup
                    chips={scopeChips}
                    activeChips={activeScopes}
                    onToggle={toggleScope}
                    size="sm"
                />
            </div>

            {/* Search */}
            <div className="bookmarks-filters-tab__search">
                <div className="search-input">
                    <Search size={12} className="search-input__icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeSubTab}...`}
                    />
                    {searchQuery && (
                        <button className="search-input__clear" onClick={() => setSearchQuery('')}>
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="bookmarks-filters-tab__loading">
                    <Loader2 size={24} className="spin" />
                    <span>Loading {activeSubTab}...</span>
                </div>
            )}

            {/* Error */}
            {error && !isLoading && (
                <div className="bookmarks-filters-tab__error">
                    <AlertCircle size={24} />
                    <span>Failed to load {activeSubTab}</span>
                    <button className="retry-btn" onClick={refetch}>Retry</button>
                </div>
            )}

            {/* Content */}
            {!isLoading && !error && (
                <div className="bookmarks-filters-tab__content">
                    {activeSubTab === 'bookmarks' ? (
                        <>
                            {Object.entries(bookmarksByScope).map(([scope, items]) => (
                                <ScopedSection
                                    key={scope}
                                    scope={scope}
                                    items={items}
                                    isExpanded={expandedSections[scope]}
                                    onToggle={() => toggleSection(scope)}
                                    renderItem={(bookmark) => (
                                        <BookmarkItem
                                            key={bookmark.id}
                                            bookmark={bookmark}
                                            onNavigate={handleNavigate}
                                            onTogglePin={toggleBookmarkPin}
                                            onDelete={handleDeleteBookmark}
                                            getThumbnailUrl={getThumbnailUrl}
                                        />
                                    )}
                                />
                            ))}
                        </>
                    ) : (
                        <>
                            {Object.entries(filtersByScope).map(([scope, items]) => (
                                <ScopedSection
                                    key={scope}
                                    scope={scope}
                                    items={items}
                                    isExpanded={expandedSections[scope]}
                                    onToggle={() => toggleSection(scope)}
                                    renderItem={(filter) => (
                                        <FilterItem
                                            key={filter.id}
                                            filter={filter}
                                            onApply={handleApplyFilter}
                                            onTogglePin={toggleFilterPin}
                                            onDelete={handleDeleteFilter}
                                        />
                                    )}
                                />
                            ))}
                        </>
                    )}

                    {/* Empty state */}
                    {isEmpty && (
                        <div className="bookmarks-filters-tab__empty">
                            {searchQuery
                                ? `No ${activeSubTab} match your search`
                                : `No ${activeSubTab} yet`}
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="bookmarks-filters-tab__footer">
                <button
                    className="bookmarks-filters-tab__add-btn"
                    onClick={() => {
                        if (activeSubTab === 'bookmarks') {
                            log.info('Create new bookmark');
                        } else {
                            log.info('Create new filter');
                        }
                    }}
                >
                    <Plus size={11} />
                    <span>New {activeSubTab === 'bookmarks' ? 'Bookmark' : 'Filter'}</span>
                </button>
            </div>
        </div>
    );
}

export default BookmarksFiltersPanelContent;