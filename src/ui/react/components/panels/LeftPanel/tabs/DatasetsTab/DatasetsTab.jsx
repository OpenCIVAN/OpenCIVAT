/**
 * @file DatasetsTab.jsx
 * @description Datasets tab for the Left Panel - SIMPLIFIED VERSION
 * 
 * This version removes the "By Canvas" subtab since that functionality
 * has been moved to the ViewsTab. Now shows only the "By Dataset" tree view.
 *
 * Features:
 * - Dataset tree with expandable nodes
 * - Views grouped under their parent datasets
 * - Filter chips (Active/Inactive/Shared)
 * - View creation from datasets
 * - Storage management
 *
 * @see Left_Panel_Design_Specification.docx - Section 5 Datasets Tab
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Database,
    Search,
    X,
    Eye,
    Archive,
    Users,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    RefreshCw,
    Trash2,
    Plus,
    Settings,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { dataset as log } from '@Utils/logger.js';
import { ViewItem } from '@UI/react/components/common/ViewItem';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import { viewLifecycleService } from '@Services';
import './DatasetsTab.scss';

// =============================================================================
// FILTER CHIPS CONFIGURATION
// =============================================================================

const getFilterChips = (counts) => [
    { id: 'active', label: 'Active', icon: Eye, color: 'green', count: counts.active },
    { id: 'inactive', label: 'Inactive', icon: Archive, color: 'gray', count: counts.inactive },
    { id: 'shared', label: 'Shared', icon: Users, color: 'pink', count: counts.shared },
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
// VIEW ITEM WRAPPER - Provides callbacks for ViewItem
// =============================================================================

function DatasetViewItemWrapper({ view, datasetId }) {
    const isActive = view.status === 'active';

    // Select/focus a view
    const handleSelect = useCallback((viewId) => {
        viewLifecycleService.focusView(viewId);
    }, []);

    // Close view (remove from canvas)
    const handleClose = useCallback(async (viewId) => {
        await viewLifecycleService.removeViewFromCanvas(viewId);
    }, []);

    // Trash view
    const handleTrash = useCallback(async (viewId) => {
        await viewLifecycleService.trashView(viewId);
    }, []);

    // Rename view
    const handleRename = useCallback((viewId, newName) => {
        viewLifecycleService.renameView(viewId, newName);
    }, []);

    // Navigate to view on canvas
    const handleNavigate = useCallback((viewId) => {
        viewLifecycleService.focusView(viewId);
    }, []);

    // Place view on canvas
    const handlePlaceOnCanvas = useCallback(async (viewId) => {
        await viewLifecycleService.placeView(viewId);
    }, []);

    return (
        <ViewItem
            view={view}
            isActive={isActive}
            onSelect={handleSelect}
            onClose={handleClose}
            onTrash={handleTrash}
            onRename={handleRename}
            onNavigate={handleNavigate}
            onPlaceOnCanvas={handlePlaceOnCanvas}
        />
    );
}

// =============================================================================
// DATASET PARENT COMPONENT
// =============================================================================

function DatasetParent({ dataset, views, isExpanded, onToggle }) {
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const typeConfig = getDatasetTypeConfig(dataset.fileType || dataset.type);
    const TypeIcon = typeConfig.icon;

    const activeCount = views.filter(v => v.status === 'active').length;
    const totalCount = views.length;

    const handleCreateView = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:create-view', {
            detail: { datasetId: dataset.id }
        }));
    }, [dataset.id]);

    const handleUnloadDataset = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:unload-dataset', {
            detail: { datasetId: dataset.id }
        }));
    }, [dataset.id]);

    return (
        <div className="dataset-parent">
            {/* Header row */}
            <div className="dataset-parent__header" onClick={onToggle}>
                <button className="dataset-parent__toggle">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>

                <span
                    className={`dataset-parent__icon ${typeConfig.colorClass || ''}`}
                    style={typeConfig.color ? { color: typeConfig.color } : undefined}
                >
                    <TypeIcon size={14} />
                </span>

                <span className="dataset-parent__name">{dataset.name}</span>

                <span className="dataset-parent__count">
                    <span className="dataset-parent__count-active">{activeCount}</span>
                    /
                    <span className="dataset-parent__count-total">{totalCount}</span>
                </span>

                <button
                    className="dataset-parent__settings"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowSettingsModal(true);
                    }}
                    title="Dataset settings"
                >
                    <Settings size={12} />
                </button>
            </div>

            {/* Expanded content - views list */}
            {isExpanded && (
                <div className="dataset-parent__children">
                    {views.length === 0 ? (
                        <div className="dataset-parent__empty">
                            <button
                                className="dataset-parent__create-view-btn"
                                onClick={handleCreateView}
                            >
                                <Plus size={12} />
                                <span>Create View</span>
                            </button>
                        </div>
                    ) : (
                        views.map(view => (
                            <DatasetViewItemWrapper
                                key={view.id}
                                view={view}
                                datasetId={dataset.id}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Settings Modal */}
            <DatasetSettingsModal
                isOpen={showSettingsModal}
                dataset={dataset}
                views={views}
                onClose={() => setShowSettingsModal(false)}
                onCreateView={handleCreateView}
                onUnloadDataset={handleUnloadDataset}
            />
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DatasetsPanelContent({ workspaceId }) {
    // =========================================================================
    // STATE
    // =========================================================================

    const [activeFilters, setActiveFilters] = useState(['active', 'inactive', 'shared']);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());

    // Refresh counter for reactivity
    const [viewRefreshCounter, setViewRefreshCounter] = useState(0);

    // =========================================================================
    // EVENT SUBSCRIPTIONS
    // =========================================================================

    useEffect(() => {
        const handleViewUpdate = () => {
            setViewRefreshCounter(c => c + 1);
        };

        getViewConfigurationManager()?.on?.('viewUpdated', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewDeactivated', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewActivated', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewTrashed', handleViewUpdate);
        getViewConfigurationManager()?.on?.('viewRestored', handleViewUpdate);

        return () => {
            getViewConfigurationManager()?.off?.('viewUpdated', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewDeactivated', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewActivated', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewTrashed', handleViewUpdate);
            getViewConfigurationManager()?.off?.('viewRestored', handleViewUpdate);
        };
    }, []);

    // =========================================================================
    // DATA
    // =========================================================================

    const loadedDatasets = useDatasets();

    // Get views for a dataset (excluding trashed)
    const getViewsForDataset = useCallback((datasetId) => {
        try {
            const views = getViewConfigurationManager()?.getViewsForDataset?.(datasetId) || [];
            return views
                .filter(v => v.status !== 'trashed' && v.status !== 'archived')
                .map(v => {
                    const instanceColor = workspaceManager?.getViewColor?.(v.id);
                    const placement = canvasManager?.getPlacementForView?.(v.id);
                    return {
                        ...v,
                        color: instanceColor || v.color || '#60a5fa',
                        position: placement ? { row: placement.row, col: placement.col } : null,
                        status: v.status === 'active' || placement ? 'active' : 'inactive',
                    };
                });
        } catch (e) {
            log.warn('Failed to get views for dataset:', e);
            return [];
        }
    }, [viewRefreshCounter]);

    // Merge datasets with their views
    const datasets = useMemo(() => {
        return loadedDatasets.map(ds => ({
            ...ds,
            views: getViewsForDataset(ds.id),
        }));
    }, [loadedDatasets, getViewsForDataset]);

    // Filter views by active filters
    const filterViews = useCallback((views) => {
        return views.filter(v => {
            if (v.status === 'active' && !activeFilters.includes('active')) return false;
            if (v.status === 'inactive' && !activeFilters.includes('inactive')) return false;
            if (v.isShared && !activeFilters.includes('shared')) return false;
            return true;
        });
    }, [activeFilters]);

    // Get filtered views for display
    const getFilteredViews = useCallback((dataset) => {
        return filterViews(dataset.views || []);
    }, [filterViews]);

    // Count views for filter chips
    const filterCounts = useMemo(() => {
        let active = 0, inactive = 0, shared = 0;
        datasets.forEach(ds => {
            ds.views?.forEach(v => {
                if (v.status === 'active') active++;
                if (v.status === 'inactive') inactive++;
                if (v.isShared) shared++;
            });
        });
        return { active, inactive, shared };
    }, [datasets]);

    // Search filtered datasets
    const filteredDatasets = useMemo(() => {
        if (!searchQuery) return datasets;
        const q = searchQuery.toLowerCase();
        return datasets.filter(ds =>
            ds.name.toLowerCase().includes(q) ||
            ds.views.some(v => v.name.toLowerCase().includes(q))
        );
    }, [datasets, searchQuery]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const toggleFilter = useCallback((filterId) => {
        setActiveFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(id => id !== filterId)
                : [...prev, filterId]
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

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <div className="datasets-tab">
            {/* Header */}
            <div className="panel-header panel-header--teal">
                <Database size={14} className="panel-header__icon" />
                <span className="panel-header__title">Datasets</span>
            </div>

            {/* Search */}
            <div className="datasets-tab__search-row">
                <div className="datasets-tab__search">
                    <Search size={12} className="datasets-tab__search-icon" />
                    <input
                        type="text"
                        className="datasets-tab__search-input"
                        placeholder="Search datasets and views..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="datasets-tab__search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Chips */}
            <div className="datasets-tab__filters">
                <ChipGroup
                    chips={getFilterChips(filterCounts)}
                    activeChips={activeFilters}
                    onToggle={toggleFilter}
                    size="sm"
                />
            </div>

            {/* Dataset Tree */}
            <div className="datasets-tab__content">
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
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={handleLoadDataset}
                >
                    <FolderOpen size={11} />
                    <span>Load Dataset</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Refresh">
                    <RefreshCw size={11} />
                </button>
            </div>
        </div>
    );
}

export default DatasetsPanelContent;