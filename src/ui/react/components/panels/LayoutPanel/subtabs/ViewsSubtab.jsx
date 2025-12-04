/**
 * ViewsSubtab Component
 *
 * Views management content for the Layout Panel.
 * Contains:
 * - Search bar
 * - Filter bar (Shared, Linked chips + Group toggle)
 * - View list with ViewItem components
 */

import React, { memo, useCallback } from 'react';
import { Search, X, Filter, Database } from 'lucide-react';
import { ViewItem } from '../components/ViewItem/ViewItem';
import { FilterChips } from '../components/FilterChips';
import './ViewsSubtab.scss';

// Instance colors for view color coding
const INSTANCE_COLORS = [
    '#60a5fa', // blue
    '#4ade80', // green
    '#f472b6', // pink
    '#fbbf24', // amber
    '#2dd4bf', // teal
    '#a78bfa', // purple
];

export const ViewsSubtab = memo(function ViewsSubtab({ logic }) {
    const {
        cells,
        filteredCells,
        groupedCells,
        expandedViewId,
        toggleViewExpanded,
        searchQuery,
        setSearchQuery,
        activeFilters,
        toggleFilter,
        clearFilters,
        groupByDataset,
        setGroupByDataset,
        closeView,
        resizeView,
    } = logic;

    // Handle search input change
    const handleSearchChange = useCallback(
        (e) => {
            setSearchQuery(e.target.value);
        },
        [setSearchQuery]
    );

    // Handle search clear
    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, [setSearchQuery]);

    // Handle view action
    const handleViewAction = useCallback(
        (viewId, action) => {
            switch (action) {
                case 'close':
                    closeView(viewId);
                    break;
                // Add more actions as needed
                default:
                    console.log('View action:', viewId, action);
            }
        },
        [closeView]
    );

    // Handle size change
    const handleSizeChange = useCallback(
        (viewId, size) => {
            resizeView(viewId, size.colSpan, size.rowSpan);
        },
        [resizeView]
    );

    // Check if any filters are active
    const hasActiveFilters = activeFilters.length > 0 || searchQuery;

    return (
        <div className="views-subtab">
            {/* Search Bar */}
            <div className="views-subtab__search">
                <Search size={12} className="views-subtab__search-icon" />
                <input
                    type="text"
                    className="views-subtab__search-input"
                    placeholder="Search views..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
                {searchQuery && (
                    <button
                        className="views-subtab__search-clear"
                        onClick={handleClearSearch}
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="views-subtab__filter-bar">
                <Filter size={10} className="views-subtab__filter-icon" />

                <FilterChips
                    activeFilters={activeFilters}
                    onToggle={toggleFilter}
                />

                <div className="views-subtab__filter-spacer" />

                {/* Group Toggle */}
                <button
                    className={`views-subtab__group-btn ${groupByDataset ? 'views-subtab__group-btn--active' : ''}`}
                    onClick={() => setGroupByDataset(!groupByDataset)}
                >
                    <Database size={9} />
                    <span>Group</span>
                </button>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <button
                        className="views-subtab__clear-btn"
                        onClick={clearFilters}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* View Count */}
            <div className="views-subtab__count">
                {filteredCells.length} of {cells.length} views
            </div>

            {/* View List */}
            <div className="views-subtab__list">
                {Object.entries(groupedCells).map(([group, groupCells]) => (
                    <div key={group} className="views-subtab__group">
                        {/* Group Header (only when grouping is enabled) */}
                        {groupByDataset && group !== 'ungrouped' && (
                            <div className="views-subtab__group-header">
                                <Database size={10} />
                                <span className="views-subtab__group-name">{group}</span>
                                <span className="views-subtab__group-count">({groupCells.length})</span>
                            </div>
                        )}

                        {/* Views */}
                        {groupCells.map((cell) => (
                            <ViewItem
                                key={cell.id}
                                view={cell}
                                isActive={cell.id === cells[0]?.id} // First cell is active (example)
                                isExpanded={expandedViewId === cell.id}
                                onToggleExpand={toggleViewExpanded}
                                onAction={handleViewAction}
                                onSizeChange={handleSizeChange}
                            />
                        ))}
                    </div>
                ))}

                {/* Empty State */}
                {filteredCells.length === 0 && (
                    <div className="views-subtab__empty">
                        {hasActiveFilters
                            ? 'No views match filters'
                            : 'No views open'}
                    </div>
                )}
            </div>
        </div>
    );
});

export default ViewsSubtab;