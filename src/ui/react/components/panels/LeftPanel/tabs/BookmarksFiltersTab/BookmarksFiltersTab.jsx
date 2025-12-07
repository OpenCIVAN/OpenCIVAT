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
    Globe,
    Users,
    UserCircle,
} from 'lucide-react';
import { ui as log } from '@Utils/logger.js';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { getScopeChips, getScopeConfig } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/constants.js';
import { ScopedSection } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/components/ScopedSection';
import { BookmarkItem } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/components/BookmarkItem';
import { FilterItem } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab/components/FilterItem';
import { useBookmarks } from '@UI/react/hooks/useBookmarks.js';
import { useFilters } from '@UI/react/hooks/useFilters.js';
import './BookmarksFiltersTab.scss';

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

export function BookmarksFiltersPanelContent() {
    // Sub-tab state
    const [activeSubTab, setActiveSubTab] = useState('bookmarks');

    // Scope filter state - all selected by default
    const [activeScopes, setActiveScopes] = useState(['project', 'room', 'personal']);

    // Section expansion state
    const [expandedSections, setExpandedSections] = useState({
        project: true,
        room: true,
        personal: true,
    });

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Hooks for data
    const {
        bookmarks,
        loading: bookmarksLoading,
        error: bookmarksError,
        refetch: refetchBookmarks,
        deleteBookmark,
        navigateToBookmark,
    } = useBookmarks();

    const {
        filters,
        loading: filtersLoading,
        error: filtersError,
        refetch: refetchFilters,
        applyFilter,
        deleteFilter,
    } = useFilters();

    // Toggle scope filter
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

    const scopeChips = useMemo(() => {
        const counts = activeSubTab === 'bookmarks' ? bookmarkCounts : filterCounts;
        return getScopeChips(counts);
    }, [activeSubTab, bookmarkCounts, filterCounts]);

    // Handlers
    const handleBookmarkNavigate = useCallback(async (bookmark) => {
        try {
            await navigateToBookmark(bookmark.id);
        } catch (err) {
            log.error('Failed to navigate to bookmark:', err);
        }
    }, [navigateToBookmark]);

    const handleBookmarkDelete = useCallback(async (bookmarkId) => {
        if (window.confirm('Delete this bookmark?')) {
            try {
                await deleteBookmark(bookmarkId);
            } catch (err) {
                log.error('Failed to delete bookmark:', err);
            }
        }
    }, [deleteBookmark]);

    const handleFilterApply = useCallback(async (filter) => {
        try {
            await applyFilter(filter.id);
        } catch (err) {
            log.error('Failed to apply filter:', err);
        }
    }, [applyFilter]);

    const handleFilterDelete = useCallback(async (filterId) => {
        if (window.confirm('Delete this saved filter?')) {
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
            {/* Header - proper styling with purple icon */}
            <div className="bookmarks-filters-tab__header">
                <Bookmark size={14} className="icon-purple" />
                <span className="bookmarks-filters-tab__title">Saved</span>
            </div>

            {/* Sub-tabs */}
            <SubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />

            {/* Scope chips - centered */}
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
                        // Bookmarks content
                        isEmpty ? (
                            <div className="bookmarks-filters-tab__empty">
                                No bookmarks found
                            </div>
                        ) : (
                            <>
                                {activeScopes.includes('project') && bookmarksByScope.project.length > 0 && (
                                    <ScopedSection
                                        scope="project"
                                        count={bookmarksByScope.project.length}
                                        expanded={expandedSections.project}
                                        onToggle={() => toggleSection('project')}
                                    >
                                        {bookmarksByScope.project.map(bookmark => (
                                            <BookmarkItem
                                                key={bookmark.id}
                                                bookmark={bookmark}
                                                onNavigate={handleBookmarkNavigate}
                                                onDelete={handleBookmarkDelete}
                                            />
                                        ))}
                                    </ScopedSection>
                                )}
                                {activeScopes.includes('room') && bookmarksByScope.room.length > 0 && (
                                    <ScopedSection
                                        scope="room"
                                        count={bookmarksByScope.room.length}
                                        expanded={expandedSections.room}
                                        onToggle={() => toggleSection('room')}
                                    >
                                        {bookmarksByScope.room.map(bookmark => (
                                            <BookmarkItem
                                                key={bookmark.id}
                                                bookmark={bookmark}
                                                onNavigate={handleBookmarkNavigate}
                                                onDelete={handleBookmarkDelete}
                                            />
                                        ))}
                                    </ScopedSection>
                                )}
                                {activeScopes.includes('personal') && bookmarksByScope.personal.length > 0 && (
                                    <ScopedSection
                                        scope="personal"
                                        count={bookmarksByScope.personal.length}
                                        expanded={expandedSections.personal}
                                        onToggle={() => toggleSection('personal')}
                                    >
                                        {bookmarksByScope.personal.map(bookmark => (
                                            <BookmarkItem
                                                key={bookmark.id}
                                                bookmark={bookmark}
                                                onNavigate={handleBookmarkNavigate}
                                                onDelete={handleBookmarkDelete}
                                            />
                                        ))}
                                    </ScopedSection>
                                )}
                            </>
                        )
                    ) : (
                        // Filters content
                        isEmpty ? (
                            <div className="bookmarks-filters-tab__empty">
                                No saved filters found
                            </div>
                        ) : (
                            <>
                                {activeScopes.includes('project') && filtersByScope.project.length > 0 && (
                                    <ScopedSection
                                        scope="project"
                                        count={filtersByScope.project.length}
                                        expanded={expandedSections.project}
                                        onToggle={() => toggleSection('project')}
                                    >
                                        {filtersByScope.project.map(filter => (
                                            <FilterItem
                                                key={filter.id}
                                                filter={filter}
                                                onApply={handleFilterApply}
                                                onDelete={handleFilterDelete}
                                            />
                                        ))}
                                    </ScopedSection>
                                )}
                                {activeScopes.includes('room') && filtersByScope.room.length > 0 && (
                                    <ScopedSection
                                        scope="room"
                                        count={filtersByScope.room.length}
                                        expanded={expandedSections.room}
                                        onToggle={() => toggleSection('room')}
                                    >
                                        {filtersByScope.room.map(filter => (
                                            <FilterItem
                                                key={filter.id}
                                                filter={filter}
                                                onApply={handleFilterApply}
                                                onDelete={handleFilterDelete}
                                            />
                                        ))}
                                    </ScopedSection>
                                )}
                                {activeScopes.includes('personal') && filtersByScope.personal.length > 0 && (
                                    <ScopedSection
                                        scope="personal"
                                        count={filtersByScope.personal.length}
                                        expanded={expandedSections.personal}
                                        onToggle={() => toggleSection('personal')}
                                    >
                                        {filtersByScope.personal.map(filter => (
                                            <FilterItem
                                                key={filter.id}
                                                filter={filter}
                                                onApply={handleFilterApply}
                                                onDelete={handleFilterDelete}
                                            />
                                        ))}
                                    </ScopedSection>
                                )}
                            </>
                        )
                    )}
                </div>
            )}

            {/* Footer - Add button */}
            <div className="bookmarks-filters-tab__footer">
                <button className="bookmarks-filters-tab__add-btn">
                    <Plus size={12} />
                    {activeSubTab === 'bookmarks' ? 'Add Bookmark' : 'Save Current Filter'}
                </button>
            </div>
        </div>
    );
}

export default BookmarksFiltersPanelContent;