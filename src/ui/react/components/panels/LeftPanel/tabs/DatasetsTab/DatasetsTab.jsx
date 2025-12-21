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

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    Database,
    Search,
    X,
    Eye,
    Archive,
    Users,
    ChevronDown,
    FolderOpen,
    RefreshCw,
    Plus,
    Settings,
    MoreHorizontal,
    HardDrive,
    Clock,
    Download,
    Share2,
    Trash2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { dataset as log } from '@Utils/logger.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import { ViewItem } from '@UI/react/components/common/ViewItem';
import { viewLifecycleService } from '@Services';
import { formatFileSize, formatRelativeTime } from '@Utils/formatters.js';
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
            label: displayInfo.label || fileType?.toUpperCase() || 'Data',
        };
    }

    return {
        icon: LucideIcons.Database,
        color: '#6B7280',
        label: fileType?.toUpperCase() || 'Data',
    };
};

// =============================================================================
// VIEW ITEM WRAPPER - Provides callbacks for ViewItem component
// =============================================================================

function DatasetViewItemWrapper({ view }) {
    const isActive = view.status === 'active';

    const handleSelect = useCallback((viewId) => {
        viewLifecycleService.focusView(viewId);
    }, []);

    const handleClose = useCallback(async (viewId) => {
        await viewLifecycleService.removeViewFromCanvas(viewId);
    }, []);

    const handleTrash = useCallback(async (viewId) => {
        await viewLifecycleService.trashView(viewId);
    }, []);

    const handleRename = useCallback((viewId, newName) => {
        viewLifecycleService.renameView(viewId, newName);
    }, []);

    const handleNavigate = useCallback((viewId) => {
        viewLifecycleService.focusView(viewId);
    }, []);

    const handlePlaceOnCanvas = useCallback(async (viewId) => {
        await viewLifecycleService.placeView(viewId);
    }, []);

    return (
        <ViewItem
            view={view}
            isActive={isActive}
            showPosition={true}
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
// DATASET PARENT COMPONENT - Hybrid 2 Design
// =============================================================================

function DatasetParent({ dataset, views, isExpanded, onToggle }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const cardRef = useRef(null);
    const dragImageRef = useRef(null);

    const typeConfig = getDatasetTypeConfig(dataset.fileType || dataset.type);
    const TypeIcon = typeConfig.icon;

    const activeCount = views.filter(v => v.status === 'active').length;
    const totalCount = views.length;

    // Format metadata
    const sizeDisplay = dataset.fileSize ? formatFileSize(dataset.fileSize) : null;
    const loadedDisplay = dataset.loadedAt ? formatRelativeTime(dataset.loadedAt) : null;
    const handlerLabel = typeConfig.label || dataset.handlerType || 'Data';

    // =========================================================================
    // HANDLERS
    // =========================================================================

    // Create view and place on canvas (flow mode - auto finds next cell)
    const handleCreateView = useCallback(async (e) => {
        e?.stopPropagation();
        try {
            await viewLifecycleService.createAndPlaceView(dataset.id, {}, {
                name: `View of ${dataset.name || dataset.filename || 'Dataset'}`,
            });
            log.info(`Created and placed view for dataset: ${dataset.id}`);
        } catch (err) {
            log.error('Failed to create view:', err);
        }
    }, [dataset.id, dataset.name, dataset.filename]);

    const handleOpenSettings = useCallback((e) => {
        e?.stopPropagation();
        setShowSettingsModal(true);
        setMenuOpen(false);
    }, []);

    const handleMoreActions = useCallback((e) => {
        e?.stopPropagation();
        setMenuOpen(!menuOpen);
    }, [menuOpen]);

    const handleCloseMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);

    const handleUnloadDataset = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:unload-dataset', {
            detail: { datasetId: dataset.id }
        }));
        setMenuOpen(false);
    }, [dataset.id]);

    const handleDownload = useCallback((e) => {
        e?.stopPropagation();
        window.dispatchEvent(new CustomEvent('cia:download-dataset', {
            detail: { datasetId: dataset.id }
        }));
        setMenuOpen(false);
    }, [dataset.id]);

    const handleShare = useCallback((e) => {
        e?.stopPropagation();
        window.dispatchEvent(new CustomEvent('cia:share-dataset', {
            detail: { datasetId: dataset.id }
        }));
        setMenuOpen(false);
    }, [dataset.id]);

    // =========================================================================
    // DRAG HANDLERS - For grid mode placement
    // =========================================================================

    const handleDragStart = useCallback((e) => {
        // Set drag data for canvas cells to create a new view
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-dataset', JSON.stringify({
            datasetId: dataset.id,
            datasetName: dataset.name || dataset.filename,
            fileType: dataset.fileType || dataset.type,
            action: 'create-view',
        }));

        // Create custom drag image (collapsed card only)
        if (dragImageRef.current) {
            // Clone the card for drag image
            const dragImage = dragImageRef.current.cloneNode(true);
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.style.left = '-1000px';
            dragImage.style.width = `${cardRef.current?.offsetWidth || 200}px`;
            dragImage.style.opacity = '0.9';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 20, 20);
            // Clean up after a tick
            setTimeout(() => document.body.removeChild(dragImage), 0);
        }

        setIsDragging(true);
    }, [dataset]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div
            className={`dataset-parent ${isHovered ? 'dataset-parent--hovered' : ''} ${isDragging ? 'dataset-parent--dragging' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); if (!menuOpen) setMenuOpen(false); }}
            ref={cardRef}
        >
            <div className="dataset-parent__card">
                {/* Header row with content + action buttons */}
                <div
                    className="dataset-parent__header"
                    draggable
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {/* Main header content (clickable for expand/collapse) */}
                    <div className="dataset-parent__header-content" onClick={onToggle} ref={dragImageRef}>
                        {/* Chevron - centered vertically, rotates on expand */}
                        <span className={`dataset-parent__chevron ${isExpanded ? 'dataset-parent__chevron--expanded' : ''}`}>
                            <ChevronDown size={12} />
                        </span>

                        {/* Type icon with colored background */}
                        <div
                            className="dataset-parent__type-icon"
                            style={{ '--type-color': typeConfig.color || '#6B7280' }}
                        >
                            <TypeIcon size={14} />
                        </div>

                        {/* Name and metadata */}
                        <div className="dataset-parent__info">
                            <span className="dataset-parent__info-name">
                                {dataset.name || dataset.filename || 'Untitled'}
                            </span>
                            <div className="dataset-parent__info-meta">
                                <span
                                    className="dataset-parent__handler-badge"
                                    style={{ '--type-color': typeConfig.color || '#6B7280' }}
                                >
                                    {handlerLabel}
                                </span>
                                {sizeDisplay && (
                                    <span className="dataset-parent__meta-item">
                                        <HardDrive size={8} />
                                        {sizeDisplay}
                                    </span>
                                )}
                                {loadedDisplay && (
                                    <span className="dataset-parent__meta-item">
                                        <Clock size={8} />
                                        {loadedDisplay}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* View count badge */}
                        <div className={`dataset-parent__view-count ${activeCount > 0 ? 'dataset-parent__view-count--has-active' : ''}`}>
                            <span className="dataset-parent__view-count-number">{activeCount}</span>
                            <span className="dataset-parent__view-count-total">of {totalCount}</span>
                        </div>
                    </div>

                    {/* Vertical action buttons */}
                    <div className="dataset-parent__actions">
                        <button
                            className="dataset-parent__actions-btn dataset-parent__actions-btn--create"
                            onClick={handleCreateView}
                            title="Add view to canvas"
                        >
                            <Plus size={11} />
                        </button>
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleOpenSettings}
                            title="Settings"
                        >
                            <Settings size={11} />
                        </button>
                        <button
                            className="dataset-parent__actions-btn"
                            onClick={handleMoreActions}
                            title="More actions"
                        >
                            <MoreHorizontal size={11} />
                        </button>
                    </div>
                </div>

                {/* Context Menu */}
                {menuOpen && (
                    <>
                        <div className="dataset-parent__menu-backdrop" onClick={handleCloseMenu} />
                        <div className="dataset-parent__menu">
                            <button className="dataset-parent__menu-item" onClick={handleCreateView}>
                                <Plus size={12} />
                                <span>Create View</span>
                            </button>
                            <button className="dataset-parent__menu-item" onClick={handleOpenSettings}>
                                <Settings size={12} />
                                <span>Dataset Settings</span>
                            </button>
                            <div className="dataset-parent__menu-divider" />
                            <button className="dataset-parent__menu-item" onClick={handleDownload}>
                                <Download size={12} />
                                <span>Download</span>
                            </button>
                            <button className="dataset-parent__menu-item" onClick={handleShare}>
                                <Share2 size={12} />
                                <span>Share</span>
                            </button>
                            <div className="dataset-parent__menu-divider" />
                            <button
                                className="dataset-parent__menu-item dataset-parent__menu-item--danger"
                                onClick={handleUnloadDataset}
                            >
                                <Trash2 size={12} />
                                <span>Unload Dataset</span>
                            </button>
                        </div>
                    </>
                )}

                {/* Expanded content - views list */}
                {isExpanded && !isDragging && (
                    <div className="dataset-parent__expanded">
                        {views.length > 0 ? (
                            <div className="dataset-parent__views">
                                {views.map(view => (
                                    <DatasetViewItemWrapper key={view.id} view={view} />
                                ))}
                            </div>
                        ) : (
                            <div className="dataset-parent__empty">
                                <Database size={20} />
                                <span>No views created yet</span>
                            </div>
                        )}

                        {/* Footer actions */}
                        <div className="dataset-parent__footer">
                            <button
                                className="dataset-parent__footer-btn dataset-parent__footer-btn--primary"
                                onClick={handleCreateView}
                            >
                                <Plus size={11} />
                                Add View
                            </button>
                            <button
                                className="dataset-parent__footer-btn dataset-parent__footer-btn--secondary"
                                onClick={handleOpenSettings}
                            >
                                <Settings size={11} />
                                Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>

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