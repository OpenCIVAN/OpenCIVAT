// src/ui/react/components/panels/LeftPanel/tabs/DatasetsTab.jsx
// Datasets tab content for the unified left panel
//
// Features:
// - Two subtabs: "By Dataset" (tree view) and "By Canvas" (flat position list)
// - "By Dataset": Tree structure with datasets and their views grouped by dataset parent
// - "By Canvas": Flat list of views sorted by canvas position (row or column) + unplaced views section
// - Active/Inactive/Shared view filtering with centered chips
// - Uses Layout tab subtab styling

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Database,
    Search,
    X,
    Filter,
    Eye,
    Archive,
    Users,
    ChevronDown,
    ChevronRight,
    Circle,
    FolderOpen,
    RefreshCw,
    Trash2,
    MoreHorizontal,
    Save,
    Layers,
    Grid3X3,
    Rows3,
    Columns3,
    GripVertical,
    RotateCcw,
    Plus,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { viewConfigurationManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { dataset as log } from '@Utils/logger.js';
import { ViewItem } from './ViewItem/ViewItem.jsx';
import './DatasetsTab.scss';

// =============================================================================
// SUBTAB CONFIGURATION
// =============================================================================

const SUBTABS = [
    { id: 'byDataset', label: 'By Dataset', icon: Layers, color: 'teal' },
    { id: 'byCanvas', label: 'By Canvas', icon: Grid3X3, color: 'blue' },
];

// =============================================================================
// DATASET TYPE UTILITIES
// =============================================================================

const getDatasetTypeConfig = (fileType) => {
    const displayInfo = getFileTypeDisplayInfo(fileType);

    if (displayInfo) {
        const iconName = displayInfo.icon.charAt(0).toUpperCase() + displayInfo.icon.slice(1);
        const IconComponent = LucideIcons[iconName] || LucideIcons.Box;

        return {
            icon: IconComponent,
            color: displayInfo.color,
            colorClass: null,
        };
    }

    return { icon: LucideIcons.Database, colorClass: 'file-icon--default', color: null };
};

// =============================================================================
// FILTER CHIPS CONFIGURATION
// =============================================================================

const getFilterChips = (counts) => [
    { id: 'active', label: 'Active', icon: Eye, color: 'green', count: counts.active },
    { id: 'inactive', label: 'Inactive', icon: Archive, color: 'gray', count: counts.inactive },
    { id: 'shared', label: 'Shared', icon: Users, color: 'pink', count: counts.shared },
];

// =============================================================================
// VIEW ITEM WRAPPER (for tree list) - Uses full-featured ViewItem component
// =============================================================================

function DatasetViewItemWrapper({ view, datasetId }) {
    const isActive = view.status === 'active';

    // Handle view selection
    const handleSelect = useCallback((viewId) => {
        log.debug(`Selecting view ${viewId}`);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { viewId, datasetId, spawnNew: false }
        }));
    }, [datasetId]);

    // Handle view close (deactivate - remove from canvas but keep in list)
    const handleClose = useCallback(async (viewId) => {
        log.debug(`Closing view ${viewId} (deactivating)`);
        // Remove from canvas first
        await canvasManager?.removeViewPlacements?.(viewId);
        // Deactivate the view - marks as inactive, keeps in list
        viewConfigurationManager?.deactivateView?.(viewId);
        // Dispatch event for any listening components
        window.dispatchEvent(new CustomEvent('cia:close-view', {
            detail: { viewId }
        }));
    }, []);

    // Handle view trash (move to Recently Deleted)
    const handleTrash = useCallback(async (viewId) => {
        log.debug(`Trashing view ${viewId}`);
        // Remove from canvas first (if placed)
        await canvasManager?.removeViewPlacements?.(viewId);
        // Move to Recently Deleted (status = 'trashed')
        viewConfigurationManager?.trashView?.(viewId);
    }, []);

    // Handle view rename
    const handleRename = useCallback((viewId, newName) => {
        log.debug(`Renaming view ${viewId} to ${newName}`);
        viewConfigurationManager?.renameView?.(viewId, newName);
    }, []);

    // Handle navigate to position
    const handleNavigate = useCallback((position) => {
        log.debug(`Navigating to position`, position);
        window.dispatchEvent(new CustomEvent('cia:navigate-to-cell', {
            detail: { row: position.row, col: position.col }
        }));
    }, []);

    // Handle spawn new instance
    const handleSpawn = useCallback((viewId) => {
        log.debug(`Spawning new instance from view ${viewId}`);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { viewId, datasetId, spawnNew: true }
        }));
    }, [datasetId]);

    return (
        <ViewItem
            view={view}
            isActive={isActive}
            filterCount={view.filters?.length || 0}
            onSelect={handleSelect}
            onClose={handleClose}
            onTrash={handleTrash}
            onRename={handleRename}
            onNavigate={handleNavigate}
            onSpawn={handleSpawn}
            className="datasets-tab__view-item"
        />
    );
}

// =============================================================================
// DATASET PARENT (expandable group)
// =============================================================================

function DatasetParent({ dataset, views, isExpanded, onToggle }) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, color, colorClass } = getDatasetTypeConfig(dataset.fileType);
    const activeCount = views.filter(v => v.status === 'active').length;

    // Create a new view for this dataset
    const handleCreateView = useCallback((e) => {
        e?.stopPropagation();
        log.debug(`Creating new view for dataset ${dataset.id}`);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId: dataset.id, spawnNew: true }
        }));
    }, [dataset.id]);

    const handleClick = useCallback((e) => {
        if (e.shiftKey) {
            // Shift+click always creates a new view
            handleCreateView(e);
        } else {
            onToggle();
        }
    }, [handleCreateView, onToggle]);

    return (
        <div className="dataset-parent">
            <div
                className={`dataset-parent__header ${isExpanded ? 'dataset-parent__header--expanded' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleClick}
            >
                <span className="dataset-parent__chevron" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>
                <TypeIcon size={12} className="dataset-parent__icon" style={color ? { color } : undefined} />
                <span className="dataset-parent__name">{dataset.name}</span>
                <span className="dataset-parent__count">
                    <span className={activeCount > 0 ? 'text-green' : ''}>{activeCount}</span>/{views.length}
                </span>
                {isHovered && (
                    <>
                        <button
                            className="dataset-parent__add-btn"
                            onClick={handleCreateView}
                            title="Create new view"
                        >
                            <Plus size={12} />
                        </button>
                        <button className="dataset-parent__more-btn" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal size={12} />
                        </button>
                    </>
                )}
            </div>

            {isExpanded && (
                <div className="dataset-parent__children">
                    {views.length > 0 ? (
                        views.map(view => (
                            <DatasetViewItemWrapper key={view.id} view={view} datasetId={dataset.id} />
                        ))
                    ) : (
                        <div className="dataset-parent__empty">
                            <button
                                className="dataset-parent__create-view-btn"
                                onClick={handleCreateView}
                            >
                                <Plus size={12} />
                                <span>Create View</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// CANVAS VIEW ITEM WRAPPER (for position list) - Uses full-featured ViewItem
// =============================================================================

function CanvasViewItemWrapper({ view, dataset }) {
    const isActive = view.status === 'active';

    // Handle view selection
    const handleSelect = useCallback((viewId) => {
        log.debug(`Selecting view ${viewId}`);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { viewId, datasetId: dataset?.id, spawnNew: false }
        }));
    }, [dataset?.id]);

    // Handle view close (deactivate - remove from canvas but keep in list)
    const handleClose = useCallback(async (viewId) => {
        log.debug(`Closing view ${viewId} (deactivating)`);
        // Remove from canvas first
        await canvasManager?.removeViewPlacements?.(viewId);
        // Deactivate the view - marks as inactive, keeps in list
        viewConfigurationManager?.deactivateView?.(viewId);
        // Dispatch event for any listening components
        window.dispatchEvent(new CustomEvent('cia:close-view', {
            detail: { viewId }
        }));
    }, []);

    // Handle view trash (move to Recently Deleted)
    const handleTrash = useCallback(async (viewId) => {
        log.debug(`Trashing view ${viewId}`);
        // Remove from canvas first (if placed)
        await canvasManager?.removeViewPlacements?.(viewId);
        // Move to Recently Deleted (status = 'trashed')
        viewConfigurationManager?.trashView?.(viewId);
    }, []);

    // Handle view rename
    const handleRename = useCallback((viewId, newName) => {
        log.debug(`Renaming view ${viewId} to ${newName}`);
        viewConfigurationManager?.renameView?.(viewId, newName);
    }, []);

    // Handle navigate to position
    const handleNavigate = useCallback((position) => {
        log.debug(`Navigating to position`, position);
        window.dispatchEvent(new CustomEvent('cia:navigate-to-cell', {
            detail: { row: position.row, col: position.col }
        }));
    }, []);

    // Handle spawn new instance
    const handleSpawn = useCallback((viewId) => {
        log.debug(`Spawning new instance from view ${viewId}`);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { viewId, datasetId: dataset?.id, spawnNew: true }
        }));
    }, [dataset?.id]);

    return (
        <ViewItem
            view={view}
            isActive={isActive}
            filterCount={view.filters?.length || 0}
            onSelect={handleSelect}
            onClose={handleClose}
            onTrash={handleTrash}
            onRename={handleRename}
            onNavigate={handleNavigate}
            onSpawn={handleSpawn}
            className="datasets-tab__view-item datasets-tab__view-item--canvas"
        />
    );
}

// =============================================================================
// SORT TOGGLE
// =============================================================================

function SortToggle({ sortBy, onSortChange }) {
    return (
        <div className="datasets-sort-toggle">
            <span className="datasets-sort-toggle__label">Sort:</span>
            <button
                className={`datasets-sort-toggle__btn ${sortBy === 'row' ? 'datasets-sort-toggle__btn--active' : ''}`}
                onClick={() => onSortChange('row')}
            >
                <Rows3 size={12} />
                Row
            </button>
            <button
                className={`datasets-sort-toggle__btn ${sortBy === 'column' ? 'datasets-sort-toggle__btn--active' : ''}`}
                onClick={() => onSortChange('column')}
            >
                <Columns3 size={12} />
                Col
            </button>
        </div>
    );
}

// =============================================================================
// DEFAULT SECTION STATES
// =============================================================================

const DEFAULT_CANVAS_SECTIONS = {
    placed: { expanded: true, flexGrow: 2 },
    unplaced: { expanded: true, flexGrow: 1 },
    trashed: { expanded: false, flexGrow: 1 },
};

// =============================================================================
// MAIN DATASETS TAB CONTENT
// =============================================================================

export function DatasetsPanelContent({ workspaceId }) {
    // Subtab state
    const [activeSubTab, setActiveSubTab] = useState('byDataset');
    const [canvasSortBy, setCanvasSortBy] = useState('row');
    const [activeFilters, setActiveFilters] = useState(['active', 'inactive', 'shared']);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());

    // Refresh counter to trigger re-computation when views are updated
    const [viewRefreshCounter, setViewRefreshCounter] = useState(0);

    // Listen for view update events to trigger refresh
    useEffect(() => {
        const handleViewUpdate = () => {
            setViewRefreshCounter(c => c + 1);
        };

        viewConfigurationManager?.on?.('viewUpdated', handleViewUpdate);
        viewConfigurationManager?.on?.('viewDeactivated', handleViewUpdate);
        viewConfigurationManager?.on?.('viewActivated', handleViewUpdate);
        viewConfigurationManager?.on?.('viewTrashed', handleViewUpdate);
        viewConfigurationManager?.on?.('viewRestored', handleViewUpdate);

        return () => {
            viewConfigurationManager?.off?.('viewUpdated', handleViewUpdate);
            viewConfigurationManager?.off?.('viewDeactivated', handleViewUpdate);
            viewConfigurationManager?.off?.('viewActivated', handleViewUpdate);
            viewConfigurationManager?.off?.('viewTrashed', handleViewUpdate);
            viewConfigurationManager?.off?.('viewRestored', handleViewUpdate);
        };
    }, []);

    // Section states for canvas view - destructure resizeSection for drag resizing
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates(DEFAULT_CANVAS_SECTIONS);

    // Get datasets from DatasetManager
    const loadedDatasets = useDatasets();

    // Get real views from ViewConfigurationManager
    // Filter out trashed/archived views - they're shown in "Recently Deleted" section
    const getViewsForDataset = useCallback((datasetId) => {
        try {
            const views = viewConfigurationManager?.getViewsForDataset?.(datasetId) || [];
            return views
                .filter(v => v.status !== 'trashed' && v.status !== 'archived')
                .map(v => ({
                    id: v.id,
                    name: v.name || 'Untitled View',
                    datasetId: datasetId,
                    workspace: v.workspaceId || 'personal',
                    // Use actual status, fall back to activeInstanceCount check for legacy views
                    status: v.status === 'active' || v.activeInstanceCount > 0 ? 'active' : 'inactive',
                    instanceColor: v.camera?.color || '#60a5fa',
                    filters: v.filters || [],
                    isShared: v.scope === 'shared' || v.scope === 'project',
                    sharedBy: v.createdBy,
                    position: v.gridPosition || null,
                }));
        } catch (e) {
            log.warn('Failed to get views:', e);
            return [];
        }
    }, []);

    // Transform datasets - no more placeholder views, show actual 0/0 when empty
    const datasets = useMemo(() => {
        return loadedDatasets.map(ds => {
            const views = getViewsForDataset(ds.id);

            return {
                id: ds.id,
                name: ds.name,
                fileType: ds.fileType,
                annotations: ds.annotations?.length || 0,
                views,
            };
        });
    }, [loadedDatasets, getViewsForDataset, viewRefreshCounter]);

    // Flatten all views
    const allViews = useMemo(() => {
        return datasets.flatMap(ds => ds.views.map(v => ({ ...v, dataset: ds })));
    }, [datasets]);

    // Filter helpers
    const filters = useMemo(() => ({
        active: activeFilters.includes('active'),
        inactive: activeFilters.includes('inactive'),
        shared: activeFilters.includes('shared'),
    }), [activeFilters]);

    // Apply filters to views
    const filterViews = useCallback((views) => {
        return views.filter(v => {
            if (v.status === 'active' && !filters.active) return false;
            if (v.status === 'inactive' && !v.isShared && !filters.inactive) return false;
            if (v.isShared && !filters.shared) return false;
            return true;
        });
    }, [filters]);

    // Get filtered views for a dataset
    const getFilteredViews = useCallback((ds) => filterViews(ds.views), [filterViews]);

    // Count helpers
    const counts = useMemo(() => ({
        active: datasets.reduce((sum, ds) => sum + ds.views.filter(v => v.status === 'active').length, 0),
        inactive: datasets.reduce((sum, ds) => sum + ds.views.filter(v => v.status === 'inactive' && !v.isShared).length, 0),
        shared: datasets.reduce((sum, ds) => sum + ds.views.filter(v => v.isShared).length, 0),
    }), [datasets]);

    const filterChips = useMemo(() => getFilterChips(counts), [counts]);

    const toggleFilter = useCallback((filterId) => {
        setActiveFilters(prev =>
            prev.includes(filterId) ? prev.filter(id => id !== filterId) : [...prev, filterId]
        );
    }, []);

    const toggleDataset = useCallback((datasetId) => {
        setExpandedDatasets(prev => {
            const next = new Set(prev);
            next.has(datasetId) ? next.delete(datasetId) : next.add(datasetId);
            return next;
        });
    }, []);

    const handleLoadDataset = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:open-file-picker'));
    }, []);

    // Search filtered datasets
    const filteredDatasets = useMemo(() => {
        if (!searchQuery) return datasets;
        const q = searchQuery.toLowerCase();
        return datasets.filter(ds =>
            ds.name.toLowerCase().includes(q) ||
            ds.views.some(v => v.name.toLowerCase().includes(q))
        );
    }, [datasets, searchQuery]);

    // Get trashed views from ViewConfigurationManager
    const [trashedViews, setTrashedViews] = useState([]);

    useEffect(() => {
        // Initial load
        const loadTrashedViews = () => {
            try {
                const trashed = viewConfigurationManager?.getTrashedViews?.() || [];
                setTrashedViews(trashed);
            } catch (e) {
                log.warn('Failed to get trashed views:', e);
                setTrashedViews([]);
            }
        };

        loadTrashedViews();

        // Listen for view trash/restore events
        const handleViewTrashed = () => loadTrashedViews();
        const handleViewRestored = () => loadTrashedViews();
        const handleViewDeleted = () => loadTrashedViews();

        viewConfigurationManager?.on?.('viewTrashed', handleViewTrashed);
        viewConfigurationManager?.on?.('viewRestored', handleViewRestored);
        viewConfigurationManager?.on?.('viewDeleted', handleViewDeleted);

        return () => {
            viewConfigurationManager?.off?.('viewTrashed', handleViewTrashed);
            viewConfigurationManager?.off?.('viewRestored', handleViewRestored);
            viewConfigurationManager?.off?.('viewDeleted', handleViewDeleted);
        };
    }, []);

    // Canvas position views - placed (active instances on canvas) and unplaced (no active instance)
    // FIXED: Check for active status (has instance on canvas), not just position data
    const { placedViews, unplacedViews } = useMemo(() => {
        let filtered = filterViews(allViews);

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(v =>
                v.name.toLowerCase().includes(q) || v.dataset?.name.toLowerCase().includes(q)
            );
        }

        // Views are "on canvas" if they have an active instance (status === 'active')
        // Views are "not placed" if they are inactive (not trashed, not active)
        // Filter out placeholder views - they're only for the "By Dataset" tree view
        const placed = filtered.filter(v => v.status === 'active' && !v.isPlaceholder);
        const unplaced = filtered.filter(v => v.status === 'inactive' && !v.isPlaceholder);

        // Sort placed views by position if available
        placed.sort((a, b) => {
            const posA = a.position || { row: 999, col: 999 };
            const posB = b.position || { row: 999, col: 999 };
            if (canvasSortBy === 'row') {
                return posA.row !== posB.row ? posA.row - posB.row : posA.col - posB.col;
            }
            return posA.col !== posB.col ? posA.col - posB.col : posA.row - posB.row;
        });

        return { placedViews: placed, unplacedViews: unplaced };
    }, [allViews, filterViews, searchQuery, canvasSortBy]);

    return (
        <div className="datasets-tab">
            {/* Header */}
            <div className="panel-header panel-header--teal">
                <Database size={14} className="panel-header__icon" />
                <span className="panel-header__title">Datasets</span>
            </div>

            {/* Subtabs - Layout tab style */}
            <div className="datasets-tab__tabs">
                {SUBTABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    const badge = tab.id === 'byCanvas' ? placedViews.length : null;

                    return (
                        <button
                            key={tab.id}
                            className={`datasets-tab__tab ${isActive ? 'datasets-tab__tab--active' : ''}`}
                            data-color={tab.color}
                            onClick={() => setActiveSubTab(tab.id)}
                        >
                            <Icon size={12} />
                            <span>{tab.label}</span>
                            {badge !== null && badge > 0 && (
                                <span className="datasets-tab__tab-badge">{badge}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filter chips - centered */}
            <div className="datasets-tab__filter-bar">
                <ChipGroup
                    chips={filterChips}
                    activeChips={activeFilters}
                    onToggle={toggleFilter}
                    size="sm"
                />
            </div>

            {/* Search */}
            <div className="datasets-tab__search">
                <Search size={12} className="datasets-tab__search-icon" />
                <input
                    className="datasets-tab__search-input"
                    type="text"
                    placeholder={activeSubTab === 'byDataset' ? 'Search datasets...' : 'Search views...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="datasets-tab__search-clear" onClick={() => setSearchQuery('')}>
                        <X size={10} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="datasets-tab__content">
                {activeSubTab === 'byDataset' ? (
                    /* BY DATASET - Simple tree list grouped by dataset */
                    <div className="datasets-tab__list">
                        {filteredDatasets.length === 0 ? (
                            <div className="datasets-tab__empty">
                                <Database size={32} />
                                <h3>No datasets loaded</h3>
                                <p>Load a dataset to get started</p>
                            </div>
                        ) : (
                            filteredDatasets.map(ds => {
                                const views = getFilteredViews(ds);
                                if (views.length === 0) return null;
                                return (
                                    <DatasetParent
                                        key={ds.id}
                                        dataset={ds}
                                        views={views}
                                        isExpanded={expandedDatasets.has(ds.id)}
                                        onToggle={() => toggleDataset(ds.id)}
                                    />
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* BY CANVAS - Resizable sections for placed/unplaced */
                    <ResizableSectionsContainer
                        className="datasets-tab__canvas-sections"
                        sectionStates={sectionStates}
                        onSectionToggle={toggleSection}
                        onSectionResize={resizeSection}
                    >
                        {/* Placed Views */}
                        <ResizableSection id="placed" icon={Grid3X3} iconColorClass="icon-blue" label="On Canvas" count={placedViews.length}>
                            <SortToggle sortBy={canvasSortBy} onSortChange={setCanvasSortBy} />
                            {placedViews.length === 0 ? (
                                <div className="resizable-section__empty">
                                    No views placed on canvas
                                </div>
                            ) : (
                                <div className="datasets-tab__canvas-list">
                                    {placedViews.map(view => (
                                        <CanvasViewItemWrapper key={view.id} view={view} dataset={view.dataset} />
                                    ))}
                                </div>
                            )}
                        </ResizableSection>

                        {/* Unplaced Views */}
                        <ResizableSection id="unplaced" icon={Archive} iconColorClass="icon-gray" label="Not Placed" count={unplacedViews.length}>
                            {unplacedViews.length === 0 ? (
                                <div className="resizable-section__empty">
                                    All views are on the canvas
                                </div>
                            ) : (
                                <div className="datasets-tab__canvas-list">
                                    {unplacedViews.map(view => (
                                        <CanvasViewItemWrapper key={view.id} view={view} dataset={view.dataset} />
                                    ))}
                                </div>
                            )}
                        </ResizableSection>

                        <ResizableSection
                            id="trashed"
                            icon={Trash2}
                            iconColorClass="icon-muted"
                            label="Recently Deleted"
                            count={trashedViews.length}
                            badge={trashedViews.length > 0 ? trashedViews.length : null}
                        >
                            {trashedViews.length === 0 ? (
                                <div className="resizable-section__empty">
                                    No recently deleted views
                                </div>
                            ) : (
                                trashedViews.map(view => (
                                    <TrashedViewItem
                                        key={view.id}
                                        view={view}
                                        onRestore={() => viewConfigurationManager.restoreView(view.id)}
                                        onPermanentDelete={() => viewConfigurationManager.permanentlyDeleteView(view.id)}
                                    />
                                ))
                            )}
                        </ResizableSection>
                    </ResizableSectionsContainer>
                )}
            </div>

            {/* Footer - fixed at bottom */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary" onClick={handleLoadDataset}>
                    <FolderOpen size={11} />
                    <span>Load Dataset</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Clean up unused views">
                    <Trash2 size={11} />
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Refresh">
                    <RefreshCw size={11} />
                </button>
            </div>
        </div>
    );
}

function TrashedViewItem({ view, onRestore, onPermanentDelete }) {
    // Handle permanent delete - must close any instances first
    const handlePermanentDelete = useCallback(async () => {
        // Close any lingering instances by removing from canvas
        await canvasManager?.removeViewPlacements?.(view.id);
        // Dispatch close event for any listening components
        window.dispatchEvent(new CustomEvent('cia:close-view', {
            detail: { viewId: view.id }
        }));
        // Now permanently delete the view
        onPermanentDelete();
    }, [view.id, onPermanentDelete]);

    return (
        <div className="trashed-view-item">
            <div className="trashed-view-item__info">
                <span className="trashed-view-item__name">{view.name}</span>
                <span className="trashed-view-item__expires">
                    Expires in {view.expiresInHours}h
                </span>
            </div>
            <div className="trashed-view-item__actions">
                <button
                    onClick={onRestore}
                    className="trashed-view-item__restore"
                    title="Restore view"
                >
                    <RotateCcw size={12} />
                </button>
                <button
                    onClick={handlePermanentDelete}
                    className="trashed-view-item__delete"
                    title="Delete permanently"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
}

export default DatasetsPanelContent;