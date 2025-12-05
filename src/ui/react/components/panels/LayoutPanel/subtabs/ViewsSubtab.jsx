/**
 * ViewsSubtab Component
 *
 * Views management content for the Layout Panel.
 * Drag-ready structure for canvas drops with dataset grouping.
 *
 * Features:
 * - Search bar with clear button
 * - Filter chips (Shared, Linked) + Group toggle
 * - Dataset groups with action buttons (spawn new, close all)
 * - Draggable dataset headers (creates independent view)
 * - Draggable view items (creates linked copy)
 * - Uses ViewItem component for child views
 */

import React, { memo, useCallback, useState } from 'react';
import {
    Search,
    X,
    Database,
    GripVertical,
    Filter,
    Plus,
    XCircle,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
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
        dropMode,
        // New functions for dataset/view operations
        createViewForDataset,
        createLinkedView,
        closeAllViewsForDataset,
    } = logic;

    // Local drag state for visual feedback
    const [draggedId, setDraggedId] = useState(null);
    const [dragType, setDragType] = useState(null); // 'dataset' or 'view'
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

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
    // GROUP COLLAPSE HANDLERS
    // ==========================================================================

    const toggleGroupCollapsed = useCallback((groupName) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    }, []);

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
    // DATASET ACTION HANDLERS
    // ==========================================================================

    const handleSpawnNewView = useCallback((datasetId, datasetName) => {
        console.log('Spawn new view for dataset:', datasetId, datasetName);
        if (createViewForDataset) {
            createViewForDataset(datasetId);
        } else {
            // Fallback: dispatch event
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: {
                    datasetId,
                    spawnNew: true,
                }
            }));
        }
    }, [createViewForDataset]);

    const handleCloseAllViews = useCallback((datasetId, views) => {
        console.log('Close all views for dataset:', datasetId);
        if (closeAllViewsForDataset) {
            closeAllViewsForDataset(datasetId);
        } else {
            // Fallback: close each view individually
            views.forEach(view => closeView(view.id));
        }
    }, [closeAllViewsForDataset, closeView]);

    // ==========================================================================
    // DRAG HANDLERS - DATASET (creates independent view)
    // ==========================================================================

    const handleDatasetDragStart = useCallback((e, datasetId, datasetName) => {
        const dragData = {
            type: 'dataset',
            datasetId,
            datasetName,
            createMode: 'independent', // Creates new independent view
        };

        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.setData('text/plain', datasetId);
        e.dataTransfer.effectAllowed = 'copy';

        setDraggedId(datasetId);
        setDragType('dataset');

        document.body.classList.add('dragging-dataset');
    }, []);

    // ==========================================================================
    // DRAG HANDLERS - VIEW (creates linked copy)
    // ==========================================================================

    const handleViewDragStart = useCallback((e, cell) => {
        const dragData = {
            type: 'view-item',
            viewId: cell.id,
            placementId: cell.id,
            viewConfigurationId: cell.viewConfigurationId,
            sourceRow: cell.row,
            sourceCol: cell.col,
            rowSpan: cell.rowSpan || 1,
            colSpan: cell.colSpan || 1,
            title: cell.title || cell.name,
            color: cell.color || cell.instanceColor,
            datasetId: cell.datasetId,
            createMode: 'linked', // Creates linked copy
        };

        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.setData('text/plain', cell.id);
        e.dataTransfer.effectAllowed = 'move';

        setDraggedId(cell.id);
        setDragType('view');

        document.body.classList.add('dragging-view-item');
        if (dropMode === 'replace') {
            document.body.classList.add('drop-mode-replace');
        }
    }, [dropMode]);

    /**
     * End drag - cleanup
     */
    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        setDragType(null);
        document.body.classList.remove('dragging-view-item', 'dragging-dataset', 'drop-mode-replace');
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
                <Filter size={10} className="views-subtab__filter-icon" />
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
                    // Grouped view - iterate over object entries
                    Object.entries(groupedCells).map(([groupName, groupCells]) => {
                        const isCollapsed = collapsedGroups.has(groupName);
                        const datasetId = groupCells[0]?.datasetId;

                        return (
                            <div key={groupName} className="views-subtab__group">
                                {/* Group Header - Draggable dataset */}
                                {groupName !== 'ungrouped' && (
                                    <div
                                        className={`views-subtab__group-header ${draggedId === datasetId && dragType === 'dataset' ? 'views-subtab__group-header--dragging' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDatasetDragStart(e, datasetId, groupName)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        {/* Drag handle */}
                                        <div className="views-subtab__group-drag">
                                            <GripVertical size={10} />
                                        </div>

                                        {/* Collapse toggle */}
                                        <button
                                            className="views-subtab__group-toggle"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleGroupCollapsed(groupName);
                                            }}
                                        >
                                            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                                        </button>

                                        <Database size={10} className="views-subtab__group-icon" />
                                        <span className="views-subtab__group-name">{groupName}</span>
                                        <span className="views-subtab__group-count">
                                            ({groupCells.length})
                                        </span>

                                        {/* Action buttons */}
                                        <div className="views-subtab__group-actions">
                                            <button
                                                className="views-subtab__group-action"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSpawnNewView(datasetId, groupName);
                                                }}
                                                title="New view"
                                            >
                                                <Plus size={10} />
                                            </button>
                                            <button
                                                className="views-subtab__group-action views-subtab__group-action--danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCloseAllViews(datasetId, groupCells);
                                                }}
                                                title="Close all views"
                                            >
                                                <XCircle size={10} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Draggable View Items */}
                                {!isCollapsed && groupCells.map((cell) => (
                                    <div
                                        key={cell.id}
                                        className={`views-subtab__item-wrapper ${draggedId === cell.id && dragType === 'view' ? 'views-subtab__item-wrapper--dragging' : ''
                                            }`}
                                        draggable
                                        onDragStart={(e) => handleViewDragStart(e, cell)}
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
                        );
                    })) : (
                    // Flat list (no grouping) with drag support
                    filteredCells?.map((cell) => (
                        <div
                            key={cell.id}
                            className={`views-subtab__item-wrapper ${draggedId === cell.id ? 'views-subtab__item-wrapper--dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleViewDragStart(e, cell)}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="views-subtab__drag-handle">
                                <GripVertical size={10} />
                            </div>
                            <ViewItem
                                view={cell}
                                isExpanded={expandedViewId === cell.id}
                                onToggleExpand={toggleViewExpanded}
                                onAction={handleViewAction}
                                onSizeChange={handleSizeChange}
                            />
                        </div>
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