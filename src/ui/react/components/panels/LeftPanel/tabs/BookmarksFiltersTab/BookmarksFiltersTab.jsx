/**
 * @file BookmarksFiltersTab.jsx
 * @description Combined Bookmarks & Filters tab with extracted subtabs.
 *
 * Features:
 * - Sub-tabs for Bookmarks and Filters
 * - Scope filtering (Project | Room | Personal)
 * - Search across both types
 * - Extracted subtab components for separation of concerns
 *
 * @see Left_Panel_Design_Specification.docx - Sections 9-10
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { getScopeChips } from './constants';
import { BookmarksSubtab } from './subtabs/BookmarksSubtab';
import { FiltersSubtab } from './subtabs/FiltersSubtab';
import { useBookmarks } from '@UI/react/hooks/useBookmarks.js';
import { useFilters } from '@UI/react/hooks/useFilters.js';
import './BookmarksFiltersTab.scss';

// =============================================================================
// SUB-TABS (dark etched style)
// =============================================================================

/**
 * SubTabs component for switching between Bookmarks and Filters.
 *
 * @param {Object} props
 * @param {'bookmarks' | 'filters'} props.activeTab - Active subtab
 * @param {Function} props.onTabChange - Tab change handler
 */
function SubTabs({ activeTab, onTabChange }) {
    return (
        <div className="bf-sub-tabs">
            <button
                className={`bf-sub-tabs__btn ${activeTab === 'bookmarks' ? 'bf-sub-tabs__btn--active' : ''}`}
                data-color="purple"
                onClick={() => onTabChange('bookmarks')}
            >
                <Icon name="bookmark" size={12} />
                Bookmarks
            </button>
            <button
                className={`bf-sub-tabs__btn ${activeTab === 'filters' ? 'bf-sub-tabs__btn--active' : ''}`}
                data-color="amber"
                onClick={() => onTabChange('filters')}
            >
                <Icon name="sliders" size={12} />
                Filters
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * BookmarksFiltersPanelContent component.
 *
 * Main container for the Bookmarks & Filters tab, managing:
 * - Subtab switching
 * - Scope filtering
 * - Search functionality
 * - Add button behavior
 *
 * @param {Object} props
 * @param {Object} props.currentCameraState - Current camera state for bookmark capture
 * @param {string[]} props.activeFilterIds - Currently active filter IDs
 * @param {Object} props.currentFilterConfig - Current filter configuration
 */
export function BookmarksFiltersPanelContent({
    currentCameraState,
    activeFilterIds = [],
    currentFilterConfig,
}) {
    // Sub-tab state
    const [activeSubTab, setActiveSubTab] = useState('bookmarks');

    // Scope filter state - all selected by default
    const [activeScopes, setActiveScopes] = useState(['project', 'room', 'personal']);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Editor state (controlled from parent for add button)
    const [showEditor, setShowEditor] = useState(false);

    // Get data for scope counts
    const { bookmarks } = useBookmarks();
    const { filters } = useFilters();

    // Calculate scope counts
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

    // Toggle scope filter
    const toggleScope = useCallback((scope) => {
        setActiveScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
    }, []);

    // Generate scope chips with counts
    const scopeChips = useMemo(() => {
        const counts = activeSubTab === 'bookmarks' ? bookmarkCounts : filterCounts;
        return getScopeChips(counts);
    }, [activeSubTab, bookmarkCounts, filterCounts]);

    // Handle add button
    const handleAdd = useCallback(() => {
        setShowEditor(true);
    }, []);

    return (
        <div className="bookmarks-filters-tab">
            {/* Header - ALL CAPS like other tabs */}
            <div className="panel-header panel-header--indigo">
                <Icon name="bookmark" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Bookmarks & Filters</span>
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
                    <Icon name="search" size={12} className="search-input__icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeSubTab}...`}
                    />
                    {searchQuery && (
                        <button className="search-input__clear" onClick={() => setSearchQuery('')}>
                            <Icon name="close" size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Subtab Content */}
            {activeSubTab === 'bookmarks' ? (
                <BookmarksSubtab
                    activeScopes={activeScopes}
                    searchQuery={searchQuery}
                    currentCameraState={currentCameraState}
                    activeFilterIds={activeFilterIds}
                />
            ) : (
                <FiltersSubtab
                    activeScopes={activeScopes}
                    searchQuery={searchQuery}
                    currentFilterConfig={currentFilterConfig}
                />
            )}

            {/* Footer - Add button */}
            <div className="bookmarks-filters-tab__footer">
                <button
                    className="bookmarks-filters-tab__add-btn"
                    onClick={handleAdd}
                >
                    <Icon name="add" size={12} />
                    {activeSubTab === 'bookmarks' ? 'Add Bookmark' : 'Save Current Filter'}
                </button>
            </div>
        </div>
    );
}

export default BookmarksFiltersPanelContent;