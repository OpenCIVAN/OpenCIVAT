/**
 * @file ViewsTab.jsx
 * @description Centralized view management tab for the Left Panel.
 * Create, organize, place, and manage all ViewConfigurations in the workspace.
 *
 * Features:
 * - Canvas Navigator (shared with Layout, in Views mode)
 * - Three sections: On Canvas, Not Placed, Recently Deleted
 * - View creation from datasets
 * - Drag-and-drop placement
 * - View lifecycle management (activate, deactivate, trash, restore)
 *
 * @see Left_Panel_Design_Specification.docx - Section 6 Views Tab
 *
 * @example
 * <ViewsTab workspaceId="ws-1" />
 */
// src/ui/react/components/panels/LeftPanel/tabs/ViewsTab/ViewsTab.jsx
// Views tab with subtabs for different viewing modes
//
// Subtabs:
// - List: Simple flat list of all views
// - By Status: Grouped by On Canvas / Not Placed / Recently Deleted
// - By Dataset: Grouped by parent dataset
// - Grid: Visual thumbnail grid

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Eye,
    List,
    Layers,
    Grid3X3,
    Database,
    Plus,
    Search,
    X,
    EyeOff,
    Trash2,
    Clock,
    RotateCcw,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { EmptyState } from '@UI/react/components/common/EmptyState';
import { ViewItem } from '../DatasetsTab/ViewItem/ViewItem';
import { getViewConfigurationManager, getDatasetManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { view as log } from '@Utils/logger.js';

import './ViewsTab.scss';

// =============================================================================
// SUBTAB CONFIGURATION
// =============================================================================

const SUBTABS = [
    { id: 'list', label: 'List', icon: List, color: 'blue' },
    { id: 'byStatus', label: 'By Status', icon: Layers, color: 'purple' },
    { id: 'byDataset', label: 'By Dataset', icon: Database, color: 'teal' },
    { id: 'grid', label: 'Grid', icon: Grid3X3, color: 'amber' },
];

// =============================================================================
// FILTER CHIPS
// =============================================================================

const VIEW_FILTERS = [
    { id: 'all', label: 'All', color: 'gray' },
    { id: 'active', label: 'Active', color: 'green' },
    { id: 'shared', label: 'Shared', color: 'pink' },
    { id: 'linked', label: 'Linked', color: 'teal' },
];

// =============================================================================
// LIST SUBTAB
// =============================================================================

function ListSubtab({ views, onSelect, onClose, onTrash, onRestore, onRename }) {
    if (views.length === 0) {
        return (
            <EmptyState
                icon={Eye}
                title="No views yet"
                description="Create a view from a dataset to get started"
                size="md"
            />
        );
    }

    return (
        <div className="views-tab__list">
            {views.map((view) => (
                <ViewItem
                    key={view.id}
                    view={view}
                    onSelect={onSelect}
                    onClose={onClose}
                    onTrash={onTrash}
                    onRestore={onRestore}
                    onRename={onRename}
                    showPosition={view.isOnCanvas}
                    showDataset
                />
            ))}
        </div>
    );
}

// =============================================================================
// BY STATUS SUBTAB
// =============================================================================

function ByStatusSubtab({
    onCanvasViews,
    notPlacedViews,
    trashedViews,
    onSelect,
    onClose,
    onTrash,
    onRestore,
    onPlace,
    onPermanentDelete,
    onRename,
}) {
    const [expandedSections, setExpandedSections] = useState({
        onCanvas: true,
        notPlaced: true,
        trashed: false,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="views-tab__sections">
            {/* On Canvas */}
            <div className="views-tab__section">
                <button
                    className="views-tab__section-header"
                    onClick={() => toggleSection('onCanvas')}
                >
                    {expandedSections.onCanvas ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Eye size={12} className="views-tab__section-icon views-tab__section-icon--green" />
                    <span>On Canvas</span>
                    <span className="views-tab__section-count">{onCanvasViews.length}</span>
                </button>
                {expandedSections.onCanvas && (
                    <div className="views-tab__section-content">
                        {onCanvasViews.length === 0 ? (
                            <div className="views-tab__section-empty">No views on canvas</div>
                        ) : (
                            onCanvasViews.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    onSelect={onSelect}
                                    onClose={onClose}
                                    onTrash={onTrash}
                                    onRename={onRename}
                                    showPosition
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Not Placed */}
            <div className="views-tab__section">
                <button
                    className="views-tab__section-header"
                    onClick={() => toggleSection('notPlaced')}
                >
                    {expandedSections.notPlaced ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <EyeOff size={12} className="views-tab__section-icon views-tab__section-icon--gray" />
                    <span>Not Placed</span>
                    <span className="views-tab__section-count">{notPlacedViews.length}</span>
                </button>
                {expandedSections.notPlaced && (
                    <div className="views-tab__section-content">
                        {notPlacedViews.length === 0 ? (
                            <div className="views-tab__section-empty">All views are placed</div>
                        ) : (
                            notPlacedViews.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    onSelect={onPlace}
                                    onTrash={onTrash}
                                    onRename={onRename}
                                    variant="inactive"
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Recently Deleted */}
            <div className="views-tab__section">
                <button
                    className="views-tab__section-header"
                    onClick={() => toggleSection('trashed')}
                >
                    {expandedSections.trashed ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Trash2 size={12} className="views-tab__section-icon views-tab__section-icon--red" />
                    <span>Recently Deleted</span>
                    <span className="views-tab__section-count">{trashedViews.length}</span>
                </button>
                {expandedSections.trashed && (
                    <div className="views-tab__section-content">
                        {trashedViews.length === 0 ? (
                            <div className="views-tab__section-empty">No deleted views</div>
                        ) : (
                            trashedViews.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    variant="deleted"
                                    onRestore={onRestore}
                                    onPermanentDelete={onPermanentDelete}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// BY DATASET SUBTAB
// =============================================================================

function ByDatasetSubtab({
    viewsByDataset,
    onSelect,
    onClose,
    onTrash,
    onPlace,
    onRename,
}) {
    const [expandedDatasets, setExpandedDatasets] = useState({});

    const toggleDataset = (datasetId) => {
        setExpandedDatasets(prev => ({ ...prev, [datasetId]: !prev[datasetId] }));
    };

    // Auto-expand datasets with views
    useEffect(() => {
        const initialExpanded = {};
        viewsByDataset.forEach(group => {
            if (group.views.length > 0) {
                initialExpanded[group.datasetId] = true;
            }
        });
        setExpandedDatasets(initialExpanded);
    }, [viewsByDataset]);

    if (viewsByDataset.length === 0) {
        return (
            <EmptyState
                icon={Database}
                title="No datasets loaded"
                description="Load a dataset from the Files tab"
                size="md"
            />
        );
    }

    return (
        <div className="views-tab__datasets">
            {viewsByDataset.map((group) => (
                <div key={group.datasetId} className="views-tab__dataset-group">
                    <button
                        className="views-tab__dataset-header"
                        onClick={() => toggleDataset(group.datasetId)}
                        style={{ '--dataset-color': group.color || '#60a5fa' }}
                    >
                        {expandedDatasets[group.datasetId] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <Database size={12} className="views-tab__dataset-icon" />
                        <span className="views-tab__dataset-name">{group.datasetName}</span>
                        <span className="views-tab__dataset-count">{group.views.length}</span>
                    </button>
                    {expandedDatasets[group.datasetId] && (
                        <div className="views-tab__dataset-views">
                            {group.views.length === 0 ? (
                                <div className="views-tab__section-empty">No views for this dataset</div>
                            ) : (
                                group.views.map((view) => (
                                    <ViewItem
                                        key={view.id}
                                        view={view}
                                        onSelect={view.isOnCanvas ? onSelect : onPlace}
                                        onClose={onClose}
                                        onTrash={onTrash}
                                        onRename={onRename}
                                        showPosition={view.isOnCanvas}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// GRID SUBTAB
// =============================================================================

function GridSubtab({ views, onSelect, onClose, onPlace }) {
    if (views.length === 0) {
        return (
            <EmptyState
                icon={Grid3X3}
                title="No views to display"
                description="Create views from datasets"
                size="md"
            />
        );
    }

    return (
        <div className="views-tab__grid">
            {views.map((view) => (
                <button
                    key={view.id}
                    className={`views-tab__grid-item ${view.isOnCanvas ? 'views-tab__grid-item--active' : ''}`}
                    onClick={() => view.isOnCanvas ? onSelect(view.id) : onPlace(view.id)}
                    style={{ '--view-color': view.color || '#60a5fa' }}
                >
                    <div className="views-tab__grid-thumbnail">
                        {/* Placeholder for thumbnail */}
                        <Eye size={24} />
                    </div>
                    <div className="views-tab__grid-info">
                        <span className="views-tab__grid-name">{view.name}</span>
                        <span className="views-tab__grid-dataset">{view.datasetName}</span>
                    </div>
                    {view.isOnCanvas && (
                        <span className="views-tab__grid-position">
                            ({view.position?.col}, {view.position?.row})
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ViewsPanelContent({ workspaceId }) {
    const [activeSubtab, setActiveSubtab] = useState('byStatus');
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // =========================================================================
    // DATA FETCHING
    // =========================================================================

    const { allViews, onCanvasViews, notPlacedViews, trashedViews, viewsByDataset } = useMemo(() => {
        const viewManager = getViewConfigurationManager();
        const datasetManager = getDatasetManager();
        const placements = canvasManager?.getPlacements?.() || [];

        if (!viewManager) {
            return { allViews: [], onCanvasViews: [], notPlacedViews: [], trashedViews: [], viewsByDataset: [] };
        }

        const allViewsRaw = viewManager.getAllViews?.() || [];

        // Get placed view IDs
        const placedViewIds = new Set();
        placements.forEach(p => {
            const viewId = p.content?.viewConfigurationId || p.content?.viewId || p.viewId;
            if (viewId) placedViewIds.add(viewId);
        });

        // Process views
        const processed = allViewsRaw.map(view => {
            const dataset = view.datasetId ? datasetManager?.getDataset?.(view.datasetId) : null;
            const placement = placements.find(p =>
                (p.content?.viewConfigurationId || p.content?.viewId || p.viewId) === view.id
            );

            return {
                id: view.id,
                name: view.name || 'Untitled View',
                datasetId: view.datasetId,
                datasetName: dataset?.name || 'Unknown Dataset',
                color: view.color?.hex || view.color || '#60a5fa',
                status: view.status || 'active',
                isOnCanvas: placedViewIds.has(view.id),
                isActive: view.isActive || placedViewIds.has(view.id),
                position: placement ? { row: placement.row, col: placement.col } : null,
                isShared: view.isShared || false,
                isLinked: view.linkedTo?.length > 0,
            };
        });

        // Filter by search
        let filtered = processed;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = processed.filter(v =>
                v.name.toLowerCase().includes(query) ||
                v.datasetName.toLowerCase().includes(query)
            );
        }

        // Filter by chip filter
        if (activeFilter !== 'all') {
            filtered = filtered.filter(v => {
                switch (activeFilter) {
                    case 'active': return v.isOnCanvas;
                    case 'shared': return v.isShared;
                    case 'linked': return v.isLinked;
                    default: return true;
                }
            });
        }

        // Categorize
        const onCanvas = filtered.filter(v => v.isOnCanvas && v.status !== 'trashed');
        const notPlaced = filtered.filter(v => !v.isOnCanvas && v.status !== 'trashed');
        const trashed = filtered.filter(v => v.status === 'trashed');

        // Group by dataset
        const datasetGroups = new Map();
        filtered.filter(v => v.status !== 'trashed').forEach(view => {
            const key = view.datasetId || 'unknown';
            if (!datasetGroups.has(key)) {
                const dataset = view.datasetId ? datasetManager?.getDataset?.(view.datasetId) : null;
                datasetGroups.set(key, {
                    datasetId: key,
                    datasetName: view.datasetName,
                    color: dataset?.color || '#60a5fa',
                    views: [],
                });
            }
            datasetGroups.get(key).views.push(view);
        });

        return {
            allViews: filtered.filter(v => v.status !== 'trashed'),
            onCanvasViews: onCanvas,
            notPlacedViews: notPlaced,
            trashedViews: trashed,
            viewsByDataset: Array.from(datasetGroups.values()),
        };
    }, [searchQuery, activeFilter, refreshKey]);

    // =========================================================================
    // EVENT SUBSCRIPTIONS
    // =========================================================================

    useEffect(() => {
        const refresh = () => setRefreshKey(k => k + 1);

        window.addEventListener('cia:view-placed', refresh);
        window.addEventListener('cia:view-removed', refresh);
        window.addEventListener('cia:close-view', refresh);
        window.addEventListener('cia:placement-added', refresh);
        window.addEventListener('cia:placement-removed', refresh);

        const viewManager = getViewConfigurationManager();
        if (viewManager?.on) {
            viewManager.on('viewCreated', refresh);
            viewManager.on('viewUpdated', refresh);
            viewManager.on('viewTrashed', refresh);
            viewManager.on('viewRestored', refresh);
            viewManager.on('viewDeleted', refresh);
            viewManager.on('viewRenamed', refresh);
        }

        return () => {
            window.removeEventListener('cia:view-placed', refresh);
            window.removeEventListener('cia:view-removed', refresh);
            window.removeEventListener('cia:close-view', refresh);
            window.removeEventListener('cia:placement-added', refresh);
            window.removeEventListener('cia:placement-removed', refresh);

            if (viewManager?.off) {
                viewManager.off('viewCreated', refresh);
                viewManager.off('viewUpdated', refresh);
                viewManager.off('viewTrashed', refresh);
                viewManager.off('viewRestored', refresh);
                viewManager.off('viewDeleted', refresh);
                viewManager.off('viewRenamed', refresh);
            }
        };
    }, []);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleSelect = useCallback((viewId) => {
        log.debug('Select view:', viewId);
        window.dispatchEvent(new CustomEvent('cia:instance-focused', {
            detail: { viewId }
        }));
    }, []);

    const handlePlace = useCallback((viewId) => {
        log.debug('Place view:', viewId);
        const viewManager = getViewConfigurationManager();
        viewManager?.activateView?.(viewId);

        const nextCell = canvasManager?.getNextAvailableCell?.() || { row: 0, col: 0 };
        canvasManager?.placeView?.(viewId, nextCell.row, nextCell.col);

        window.dispatchEvent(new CustomEvent('cia:view-placed', {
            detail: { viewId, row: nextCell.row, col: nextCell.col }
        }));
    }, []);

    const handleClose = useCallback((viewId) => {
        log.debug('Close view:', viewId);
        canvasManager?.removeViewPlacements?.(viewId);
        getViewConfigurationManager()?.deactivateView?.(viewId);
        window.dispatchEvent(new CustomEvent('cia:close-view', { detail: { viewId } }));
    }, []);

    const handleTrash = useCallback((viewId) => {
        log.debug('Trash view:', viewId);
        canvasManager?.removeViewPlacements?.(viewId);
        getViewConfigurationManager()?.trashView?.(viewId);
    }, []);

    const handleRestore = useCallback((viewId) => {
        log.debug('Restore view:', viewId);
        getViewConfigurationManager()?.restoreView?.(viewId);
    }, []);

    const handlePermanentDelete = useCallback((viewId) => {
        log.debug('Permanent delete view:', viewId);
        getViewConfigurationManager()?.deleteView?.(viewId);
    }, []);

    const handleRename = useCallback((viewId, newName) => {
        log.debug('Rename view:', viewId, newName);
        getViewConfigurationManager()?.renameView?.(viewId, newName);
    }, []);

    const handleCreateView = useCallback(() => {
        window.dispatchEvent(new CustomEvent('open:create-view'));
    }, []);

    // =========================================================================
    // RENDER SUBTAB CONTENT
    // =========================================================================

    const renderContent = () => {
        switch (activeSubtab) {
            case 'list':
                return (
                    <ListSubtab
                        views={allViews}
                        onSelect={handleSelect}
                        onClose={handleClose}
                        onTrash={handleTrash}
                        onRestore={handleRestore}
                        onRename={handleRename}
                    />
                );
            case 'byStatus':
                return (
                    <ByStatusSubtab
                        onCanvasViews={onCanvasViews}
                        notPlacedViews={notPlacedViews}
                        trashedViews={trashedViews}
                        onSelect={handleSelect}
                        onClose={handleClose}
                        onTrash={handleTrash}
                        onRestore={handleRestore}
                        onPlace={handlePlace}
                        onPermanentDelete={handlePermanentDelete}
                        onRename={handleRename}
                    />
                );
            case 'byDataset':
                return (
                    <ByDatasetSubtab
                        viewsByDataset={viewsByDataset}
                        onSelect={handleSelect}
                        onClose={handleClose}
                        onTrash={handleTrash}
                        onPlace={handlePlace}
                        onRename={handleRename}
                    />
                );
            case 'grid':
                return (
                    <GridSubtab
                        views={allViews}
                        onSelect={handleSelect}
                        onClose={handleClose}
                        onPlace={handlePlace}
                    />
                );
            default:
                return null;
        }
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <div className="views-tab">
            {/* Header */}
            <div className="panel-header panel-header--purple">
                <Eye size={14} className="panel-header__icon" />
                <span className="panel-header__title">Views</span>
                <span className="panel-header__count">{allViews.length}</span>
            </div>

            {/* Subtabs */}
            <div className="views-tab__tabs">
                {SUBTABS.map(({ id, label, icon: Icon, color }) => (
                    <button
                        key={id}
                        className={`views-tab__tab ${activeSubtab === id ? 'views-tab__tab--active' : ''}`}
                        onClick={() => setActiveSubtab(id)}
                        data-color={color}
                    >
                        <Icon size={12} />
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="views-tab__toolbar">
                <div className="views-tab__search">
                    <Search size={12} />
                    <input
                        type="text"
                        placeholder="Search views..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                            <X size={10} />
                        </button>
                    )}
                </div>
                <ChipGroup
                    chips={VIEW_FILTERS}
                    activeChips={[activeFilter]}
                    onToggle={setActiveFilter}
                    size="xs"
                />
            </div>

            {/* Content */}
            <div className="views-tab__content">
                {renderContent()}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button
                    className="panel-footer__btn panel-footer__btn--primary"
                    onClick={handleCreateView}
                >
                    <Plus size={11} />
                    <span>New View</span>
                </button>
            </div>
        </div>
    );
}

export default ViewsPanelContent;