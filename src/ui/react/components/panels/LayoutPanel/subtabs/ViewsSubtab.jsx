/**
 * ViewsSubtab Component
 *
 * Views management content for the Layout Panel.
 * Drag-ready structure for future reordering and canvas drops.
 *
 * Features:
 * - Search bar with clear button
 * - Filter chips (Shared, Linked) + Group toggle
 * - Draggable view items for reposition on canvas/minimap
 * - Groups with collapsible headers when grouping enabled
 */

import React, { memo, useCallback, useState } from 'react';
import { Search, X, Database, GripVertical } from 'lucide-react';
import { ViewItem } from '../components/ViewItem/ViewItem';
import { FilterChips } from '../components/FilterChips';
import './ViewsSubtab.scss';

export const ViewsSubtab = memo(function ViewsSubtab({ logic }) {
    const {
        cells,
        filteredCells,
        groupedCells,
        groupByDataset,
        expandedViewId,
        toggleViewExpanded,
        searchQuery,
        setSearchQuery,
        activeFilters,
        toggleFilter,
        clearFilters,
        setGroupByDataset,
        closeView,
        resizeView,
    } = logic;

    // Local drag state for visual feedback
    const [draggedId, setDraggedId] = useState(null);

    // ==========================================================================
    // SEARCH HANDLERS
    // ==========================================================================

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, [setSearchQuery]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, [setSearchQuery]);

    // ==========================================================================
    // VIEW ACTION HANDLERS
    // ==========================================================================

    const handleViewAction = useCallback((viewId, action) => {
        switch (action) {
            case 'close':
                closeView(viewId);
                break;
            case 'duplicate':
                console.log('Duplicate view:', viewId);
                // TODO: Implement duplicate
                break;
            case 'save':
                console.log('Save view:', viewId);
                // TODO: Implement save
                break;
            case 'share':
                console.log('Share view:', viewId);
                // TODO: Implement share
                break;
            default:
                console.log('View action:', viewId, action);
        }
    }, [closeView]);

    const handleSizeChange = useCallback((viewId, size) => {
        resizeView(viewId, size.colSpan, size.rowSpan);
    }, [resizeView]);

    // ==========================================================================
    // DRAG HANDLERS
    // ==========================================================================

    /**
     * Start dragging a view item
     * Sets data transfer payload for canvas/minimap drops
     */
    const handleDragStart = useCallback((e, cell) => {
        // Set drag data for canvas/minimap to consume
        const dragData = {
            type: 'view-item',
            viewId: cell.id,
            placementId: cell.id,
            sourceRow: cell.row,
            sourceCol: cell.col,
            rowSpan: cell.rowSpan || 1,
            colSpan: cell.colSpan || 1,
            title: cell.title || cell.name,
            color: cell.color || cell.instanceColor,
        };

        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.setData('text/plain', cell.id); // Fallback
        e.dataTransfer.effectAllowed = 'move';

        // Set local state for styling
        setDraggedId(cell.id);

        document.body.classList.add('dragging-view-item');
        if (dropMode === 'replace') {
            document.body.classList.add('drop-mode-replace');
        }

        // Optional: Set custom drag image
        // const dragImage = e.target.cloneNode(true);
        // e.dataTransfer.setDragImage(dragImage, 0, 0);
    }, []);

    /**
     * End drag - cleanup
     */
    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        document.body.classList.remove('dragging-view-item', 'drop-mode-replace');
    }, []);

    // ==========================================================================
    // DERIVED STATE
    // ==========================================================================

    const hasActiveFilters = activeFilters.length > 0 || searchQuery;
    const totalCount = cells?.length || 0;
    const filteredCount = filteredCells?.length || 0;

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div className="views-subtab">
            {/* Search Bar */}
            <div className="views-subtab__search">
                <Search size={12} className="views-subtab__search-icon" />
                <input
                    type="text"
                    placeholder="Search views..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="views-subtab__search-input"
                />
                {searchQuery && (
                    <button
                        className="views-subtab__search-clear"
                        onClick={handleClearSearch}
                        title="Clear search"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="views-subtab__filters">
                <FilterChips
                    activeFilters={activeFilters}
                    onToggle={toggleFilter}
                />

                <button
                    className={`views-subtab__group-btn ${groupByDataset ? 'views-subtab__group-btn--active' : ''}`}
                    onClick={() => setGroupByDataset(!groupByDataset)}
                    title={groupByDataset ? 'Disable grouping' : 'Group by dataset'}
                >
                    <Database size={9} />
                    <span>Group</span>
                </button>

                {hasActiveFilters && (
                    <button
                        className="views-subtab__clear-btn"
                        onClick={() => {
                            clearFilters();
                            setSearchQuery('');
                        }}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* View Count */}
            <div className="views-subtab__count">
                {filteredCount === totalCount
                    ? `${totalCount} view${totalCount !== 1 ? 's' : ''}`
                    : `${filteredCount} of ${totalCount} views`
                }
            </div>

            {/* View List */}
            <div className="views-subtab__list">
                {groupByDataset && groupedCells ? (
                    // Grouped view
                    groupedCells.map((group) => (
                        <div key={group.groupId} className="views-subtab__group">
                            {/* Group Header - only render if groupName exists */}
                            {group.groupName && (
                                <div className="views-subtab__group-header">
                                    <Database size={10} className="views-subtab__group-icon" />
                                    <span className="views-subtab__group-name">{group.groupName}</span>
                                    <span className="views-subtab__group-count">
                                        ({group.cells.length})
                                    </span>
                                </div>
                            )}

                            {/* Draggable View Items */}
                            {group.cells.map((cell) => (
                                <div
                                    key={cell.id}
                                    className={`views-subtab__item-wrapper ${draggedId === cell.id ? 'views-subtab__item-wrapper--dragging' : ''
                                        }`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, cell)}
                                    onDragEnd={handleDragEnd}
                                >
                                    {/* Drag Handle */}
                                    <div className="views-subtab__drag-handle">
                                        <GripVertical size={10} />
                                    </div>

                                    {/* View Item */}
                                    <ViewItem
                                        view={cell}
                                        isExpanded={expandedViewId === cell.id}
                                        onToggleExpand={toggleViewExpanded}
                                        onAction={handleViewAction}
                                        onSizeChange={handleSizeChange}
                                    />
                                </div>
                            ))}
                        </div>
                    ))) : (
                    // Flat list (no grouping)
                    filteredCells.map((cell) => (
                        <ViewItem
                            key={cell.id}
                            view={cell}
                            isExpanded={expandedViewId === cell.id}
                            onToggleExpand={toggleViewExpanded}
                            onAction={handleViewAction}
                            onSizeChange={handleSizeChange}
                        />
                    ))
                )}

                {/* Empty State */}
                {filteredCount === 0 && (
                    <div className="views-subtab__empty">
                        <span className="views-subtab__empty-text">
                            {hasActiveFilters ? 'No views match filters' : 'No views open'}
                        </span>
                        {hasActiveFilters && (
                            <button
                                className="views-subtab__empty-action"
                                onClick={() => {
                                    clearFilters();
                                    setSearchQuery('');
                                }}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

export default ViewsSubtab;