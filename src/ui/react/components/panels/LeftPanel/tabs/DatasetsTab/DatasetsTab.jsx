// src/ui/react/components/panels/LeftPanel/tabs/DatasetsTab/DatasetsTab.jsx
// Datasets tab - simplified without subtabs
//
// Shows a tree view of loaded datasets with their views.
// No subtabs - just the dataset tree with expand/collapse.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Database,
    Search,
    X,
    ChevronDown,
    ChevronRight,
    Plus,
    RefreshCw,
    Trash2,
    Settings,
    Eye,
    EyeOff,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { EmptyState } from '@UI/react/components/common/EmptyState';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { dataset as log } from '@Utils/logger.js';
import { ViewItem } from './ViewItem/ViewItem.jsx';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';

import './DatasetsTab.scss';

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
// DATASET ITEM COMPONENT
// =============================================================================

function DatasetItem({
    dataset,
    views,
    isExpanded,
    onToggle,
    onCreateView,
    onUnload,
    onSettings,
    onViewSelect,
    onViewClose,
    onViewTrash,
    onViewRename,
    onViewPlace,
}) {
    const typeConfig = getDatasetTypeConfig(dataset.fileType);
    const Icon = typeConfig.icon;
    const activeViews = views.filter(v => v.isOnCanvas);
    const inactiveViews = views.filter(v => !v.isOnCanvas && v.status !== 'trashed');

    return (
        <div className="datasets-tab__dataset">
            {/* Dataset Header */}
            <button
                className="datasets-tab__dataset-header"
                onClick={onToggle}
                style={{ '--dataset-color': typeConfig.color || '#60a5fa' }}
            >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Icon size={14} className="datasets-tab__dataset-icon" style={{ color: typeConfig.color }} />
                <span className="datasets-tab__dataset-name">{dataset.name || dataset.filename}</span>
                <span className="datasets-tab__dataset-count">{views.length}</span>

                {/* Quick actions */}
                <div className="datasets-tab__dataset-actions" onClick={e => e.stopPropagation()}>
                    <button
                        className="datasets-tab__action-btn"
                        onClick={onCreateView}
                        title="Create View"
                    >
                        <Plus size={12} />
                    </button>
                    <button
                        className="datasets-tab__action-btn"
                        onClick={onSettings}
                        title="Settings"
                    >
                        <Settings size={12} />
                    </button>
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="datasets-tab__dataset-content">
                    {views.length === 0 ? (
                        <div className="datasets-tab__empty-views">
                            <span>No views</span>
                            <button onClick={onCreateView}>
                                <Plus size={10} /> Create View
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Active Views */}
                            {activeViews.length > 0 && (
                                <div className="datasets-tab__view-group">
                                    <div className="datasets-tab__view-group-header">
                                        <Eye size={10} />
                                        <span>On Canvas ({activeViews.length})</span>
                                    </div>
                                    {activeViews.map(view => (
                                        <ViewItem
                                            key={view.id}
                                            view={view}
                                            onSelect={onViewSelect}
                                            onClose={onViewClose}
                                            onTrash={onViewTrash}
                                            onRename={onViewRename}
                                            showPosition
                                            compact
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Inactive Views */}
                            {inactiveViews.length > 0 && (
                                <div className="datasets-tab__view-group">
                                    <div className="datasets-tab__view-group-header">
                                        <EyeOff size={10} />
                                        <span>Not Placed ({inactiveViews.length})</span>
                                    </div>
                                    {inactiveViews.map(view => (
                                        <ViewItem
                                            key={view.id}
                                            view={view}
                                            onSelect={onViewPlace}
                                            onTrash={onViewTrash}
                                            onRename={onViewRename}
                                            variant="inactive"
                                            compact
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DatasetsPanelContent({ workspaceId }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedDatasets, setExpandedDatasets] = useState({});
    const [settingsDataset, setSettingsDataset] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Get datasets from hook
    const { datasets, loading, error, refresh } = useDatasets({ workspaceId });

    // =========================================================================
    // COMPUTE VIEWS PER DATASET
    // =========================================================================

    const datasetsWithViews = useMemo(() => {
        const viewManager = getViewConfigurationManager();
        const placements = canvasManager?.getPlacements?.() || [];

        if (!viewManager || !datasets) return [];

        // Get placed view IDs
        const placedViewIds = new Set();
        placements.forEach(p => {
            const viewId = p.content?.viewConfigurationId || p.content?.viewId || p.viewId;
            if (viewId) placedViewIds.add(viewId);
        });

        // Get all views
        const allViews = viewManager.getAllViews?.() || [];

        // Group views by dataset
        return datasets
            .filter(dataset => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (dataset.name || dataset.filename || '').toLowerCase().includes(query);
            })
            .map(dataset => {
                const datasetViews = allViews
                    .filter(v => v.datasetId === dataset.id && v.status !== 'trashed')
                    .map(view => {
                        const placement = placements.find(p =>
                            (p.content?.viewConfigurationId || p.content?.viewId || p.viewId) === view.id
                        );
                        return {
                            id: view.id,
                            name: view.name || 'Untitled View',
                            color: view.color?.hex || view.color || '#60a5fa',
                            status: view.status,
                            isOnCanvas: placedViewIds.has(view.id),
                            position: placement ? { row: placement.row, col: placement.col } : null,
                        };
                    });

                return {
                    ...dataset,
                    views: datasetViews,
                };
            });
    }, [datasets, searchQuery, refreshKey]);

    // =========================================================================
    // EVENT SUBSCRIPTIONS
    // =========================================================================

    useEffect(() => {
        const handleRefresh = () => setRefreshKey(k => k + 1);

        window.addEventListener('cia:view-placed', handleRefresh);
        window.addEventListener('cia:view-removed', handleRefresh);
        window.addEventListener('cia:close-view', handleRefresh);

        const viewManager = getViewConfigurationManager();
        if (viewManager?.on) {
            viewManager.on('viewCreated', handleRefresh);
            viewManager.on('viewUpdated', handleRefresh);
            viewManager.on('viewTrashed', handleRefresh);
            viewManager.on('viewRenamed', handleRefresh);
        }

        return () => {
            window.removeEventListener('cia:view-placed', handleRefresh);
            window.removeEventListener('cia:view-removed', handleRefresh);
            window.removeEventListener('cia:close-view', handleRefresh);

            if (viewManager?.off) {
                viewManager.off('viewCreated', handleRefresh);
                viewManager.off('viewUpdated', handleRefresh);
                viewManager.off('viewTrashed', handleRefresh);
                viewManager.off('viewRenamed', handleRefresh);
            }
        };
    }, []);

    // Auto-expand datasets
    useEffect(() => {
        const initial = {};
        datasetsWithViews.forEach(d => {
            if (d.views.length > 0 && expandedDatasets[d.id] === undefined) {
                initial[d.id] = true;
            }
        });
        if (Object.keys(initial).length > 0) {
            setExpandedDatasets(prev => ({ ...prev, ...initial }));
        }
    }, [datasetsWithViews]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const toggleDataset = useCallback((datasetId) => {
        setExpandedDatasets(prev => ({ ...prev, [datasetId]: !prev[datasetId] }));
    }, []);

    const handleCreateView = useCallback((datasetId) => {
        log.debug('Create view for dataset:', datasetId);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId, spawnNew: true }
        }));
    }, []);

    const handleViewSelect = useCallback((viewId) => {
        window.dispatchEvent(new CustomEvent('cia:instance-focused', {
            detail: { viewId }
        }));
    }, []);

    const handleViewPlace = useCallback((viewId) => {
        const viewManager = getViewConfigurationManager();
        viewManager?.activateView?.(viewId);

        const nextCell = canvasManager?.getNextAvailableCell?.() || { row: 0, col: 0 };
        canvasManager?.placeView?.(viewId, nextCell.row, nextCell.col);

        window.dispatchEvent(new CustomEvent('cia:view-placed', {
            detail: { viewId, row: nextCell.row, col: nextCell.col }
        }));
    }, []);

    const handleViewClose = useCallback((viewId) => {
        canvasManager?.removeViewPlacements?.(viewId);
        getViewConfigurationManager()?.deactivateView?.(viewId);
        window.dispatchEvent(new CustomEvent('cia:close-view', { detail: { viewId } }));
    }, []);

    const handleViewTrash = useCallback((viewId) => {
        canvasManager?.removeViewPlacements?.(viewId);
        getViewConfigurationManager()?.trashView?.(viewId);
    }, []);

    const handleViewRename = useCallback((viewId, newName) => {
        getViewConfigurationManager()?.renameView?.(viewId, newName);
    }, []);

    const handleUnloadDataset = useCallback((datasetId) => {
        log.debug('Unload dataset:', datasetId);
        getDatasetManager()?.unloadDataset?.(datasetId);
    }, []);

    // =========================================================================
    // RENDER
    // =========================================================================

    // Loading state
    if (loading) {
        return (
            <div className="datasets-tab datasets-tab--loading">
                <div className="panel-header panel-header--teal">
                    <Database size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Datasets</span>
                </div>
                <div className="datasets-tab__loading">
                    <RefreshCw size={24} className="spin" />
                    <span>Loading datasets...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="datasets-tab datasets-tab--error">
                <div className="panel-header panel-header--teal">
                    <Database size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Datasets</span>
                </div>
                <EmptyState
                    icon={Database}
                    title="Failed to load datasets"
                    description={error.message}
                    action={{ label: 'Retry', onClick: refresh }}
                />
            </div>
        );
    }

    return (
        <div className="datasets-tab">
            {/* Header */}
            <div className="panel-header panel-header--teal">
                <Database size={14} className="panel-header__icon" />
                <span className="panel-header__title">Datasets</span>
                <span className="panel-header__count">{datasetsWithViews.length}</span>
            </div>

            {/* Search */}
            <div className="datasets-tab__toolbar">
                <div className="datasets-tab__search">
                    <Search size={12} />
                    <input
                        type="text"
                        placeholder="Search datasets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Dataset List */}
            <div className="datasets-tab__content">
                {datasetsWithViews.length === 0 ? (
                    <EmptyState
                        icon={Database}
                        title="No datasets loaded"
                        description="Upload or open a file from the Files tab"
                        size="md"
                    />
                ) : (
                    <div className="datasets-tab__list">
                        {datasetsWithViews.map(dataset => (
                            <DatasetItem
                                key={dataset.id}
                                dataset={dataset}
                                views={dataset.views}
                                isExpanded={expandedDatasets[dataset.id]}
                                onToggle={() => toggleDataset(dataset.id)}
                                onCreateView={() => handleCreateView(dataset.id)}
                                onUnload={() => handleUnloadDataset(dataset.id)}
                                onSettings={() => setSettingsDataset(dataset)}
                                onViewSelect={handleViewSelect}
                                onViewClose={handleViewClose}
                                onViewTrash={handleViewTrash}
                                onViewRename={handleViewRename}
                                onViewPlace={handleViewPlace}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Settings Modal */}
            {settingsDataset && (
                <DatasetSettingsModal
                    isOpen={true}
                    dataset={settingsDataset}
                    onClose={() => setSettingsDataset(null)}
                    onUnloadDataset={() => {
                        handleUnloadDataset(settingsDataset.id);
                        setSettingsDataset(null);
                    }}
                />
            )}
        </div>
    );
}

export default DatasetsPanelContent;