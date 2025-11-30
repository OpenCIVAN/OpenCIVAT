// src/ui/react/components/panels/LeftPanel/tabs/DatasetsTab.jsx
// Datasets tab content for the unified left panel
//
// FIXES:
// - Defensive handling for useSectionStates to prevent "can't convert undefined to object"
// - Added click handlers to dispatch cia:request-instance events
// - Connected to ViewConfigurationManager for real views
//
// Features:
// - Shows loaded datasets from DatasetManager
// - Active/Inactive/Shared view filtering
// - Tree structure with datasets and their views
// - View status indicators and filter badges
// - Uses ResizableSections for VS Code-style layout

import React, { useState, useCallback, useMemo } from 'react';
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
    Loader,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { viewConfigurationManager } from '@Init/appInitializer.js';
import { dataset as log } from '@Utils/logger.js';

// =============================================================================
// DATASET TYPE UTILITIES (Handler-based)
// =============================================================================

/**
 * Get display configuration for a dataset based on its file type.
 * The fileType comes from the server (validated via magic bytes), not extracted here.
 * 
 * @param {string} fileType - Server-validated file type (e.g., 'vtp', 'nii')
 * @returns {{ icon: Component, color: string|null, colorClass: string|null }}
 */
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

// NOTE: File type extraction removed - server validates and stores fileType
// via magic bytes during upload. Never trust client-side extension parsing.

// =============================================================================
// VIEW ITEM
// =============================================================================

function ViewItem({ view, datasetId, isInSharedSection = false }) {
    const [isHovered, setIsHovered] = useState(false);
    const isActive = view.status === 'active';
    const inDifferentWorkspace = view.workspace && view.workspace !== 'personal';

    // Handle click on view - open in instance or focus existing
    const handleViewClick = useCallback((e) => {
        e.stopPropagation();

        if (e.shiftKey) {
            // Shift+click - spawn new instance for this view
            log.debug(`Spawning new instance for view ${view.id}`);
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: {
                    viewId: view.id,
                    datasetId: datasetId,
                    spawnNew: true
                }
            }));
        } else {
            // Normal click - open view (creates instance if none, focuses if exists)
            log.debug(`Opening view ${view.id}`);
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: {
                    viewId: view.id,
                    datasetId: datasetId,
                    spawnNew: false
                }
            }));
        }
    }, [view.id, datasetId]);

    return (
        <div
            className={`tree-item tree-item--view ${isActive ? 'active' : ''}`}
            style={{
                background: isActive
                    ? `rgba(var(--view-color-rgb, 96,165,250), 0.08)`
                    : isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderLeftColor: isActive ? view.instanceColor || '#60a5fa' : 'transparent',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleViewClick}
            title={`Click to open, Shift+Click for new instance`}
        >
            {/* Indent spacer */}
            <span className="indent" />

            {/* Status indicator */}
            <Circle
                size={6}
                fill={isActive ? 'var(--color-accent-green)' : 'transparent'}
                stroke={isActive ? 'var(--color-accent-green)' : 'var(--color-text-muted)'}
            />

            {/* View name */}
            <span className="item-name">{view.name}</span>

            {/* Filter badges */}
            {view.filters?.length > 0 && (
                <span className="badge badge--filters" title={`${view.filters.length} active filters`}>
                    <Filter size={8} />
                    {view.filters.length}
                </span>
            )}

            {/* Shared indicator */}
            {(view.isShared || isInSharedSection) && (
                <Users size={10} className="icon-muted" title={`Shared by ${view.sharedBy || 'teammate'}`} />
            )}

            {/* Workspace indicator */}
            {inDifferentWorkspace && (
                <span className="badge badge--workspace" title={`In workspace: ${view.workspace}`}>
                    {view.workspace}
                </span>
            )}

            {/* Hover actions */}
            {isHovered && (
                <div className="tree-item__actions">
                    <button className="tree-item__action" title="Save view">
                        <Save size={10} />
                    </button>
                    <button className="tree-item__action" title="More options">
                        <MoreHorizontal size={10} />
                    </button>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// DATASET ITEM (with expandable views)
// =============================================================================

function DatasetItem({ dataset, views, isExpanded, onToggle, isInSharedSection = false }) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, color, colorClass } = getDatasetTypeConfig(dataset.fileType);
    const activeCount = views.filter(v => v.status === 'active').length;

    // Handle click on dataset row
    const handleDatasetClick = useCallback((e) => {
        // If no views exist yet, create first view on click
        if (views.length === 0) {
            log.debug(`Creating first view for dataset ${dataset.id}`);
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: {
                    datasetId: dataset.id,
                    spawnNew: true
                }
            }));
        } else if (e.shiftKey) {
            // Shift+click on dataset - create new view
            log.debug(`Creating new view for dataset ${dataset.id}`);
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: {
                    datasetId: dataset.id,
                    spawnNew: true
                }
            }));
        } else {
            // Normal click - just toggle expansion
            onToggle();
        }
    }, [dataset.id, views.length, onToggle]);

    if (views.length === 0) return null;

    return (
        <>
            {/* Dataset row */}
            <div
                className="tree-item tree-item--folder"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleDatasetClick}
                style={{ cursor: 'pointer' }}
                title={views.length === 0 ? 'Click to create first view' : 'Click to expand, Shift+Click for new view'}
            >
                {/* Expand/collapse chevron */}
                <span className="chevron" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>

                {/* Dataset type icon */}
                <TypeIcon size={12} style={color ? { color } : undefined} className={colorClass || ''} />

                {/* Dataset name */}
                <span className="item-name">{dataset.name}</span>

                {/* Annotation count badge */}
                {dataset.annotations > 0 && (
                    <span className="badge badge--count" title={`${dataset.annotations} annotations`}>
                        {dataset.annotations}
                    </span>
                )}

                {/* View count */}
                <span className="item-meta">
                    <span style={{ color: activeCount > 0 ? 'var(--color-accent-green)' : undefined }}>
                        {activeCount}
                    </span>
                    /{views.length}
                </span>
            </div>

            {/* Views under this dataset */}
            {isExpanded && views.map(view => (
                <ViewItem
                    key={view.id}
                    view={view}
                    datasetId={dataset.id}
                    isInSharedSection={isInSharedSection}
                />
            ))}
        </>
    );
}

// =============================================================================
// FILTER TOGGLE BUTTON
// =============================================================================

function FilterToggle({ icon: Icon, label, color, active, count, onClick }) {
    return (
        <button
            className={`filter-toggle ${active ? 'active' : ''}`}
            data-color={color}
            onClick={onClick}
        >
            <Icon size={10} />
            {count > 0 && <span className="count">{count}</span>}
        </button>
    );
}

// =============================================================================
// DEFAULT SECTION STATES (for fallback)
// =============================================================================

const DEFAULT_SECTION_STATES = {
    active: { expanded: true, flexGrow: 2 },
    inactive: { expanded: false, flexGrow: 1 },
    shared: { expanded: true, flexGrow: 1 },
};

// =============================================================================
// MAIN DATASETS TAB CONTENT
// =============================================================================

export function DatasetsPanelContent({ workspaceId }) {
    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        active: true,
        inactive: true,
        shared: true,
    });

    // Section states (VS Code-style resizable)
    // DEFENSIVE: Handle case where useSectionStates might return undefined
    const sectionStateHook = useSectionStates(DEFAULT_SECTION_STATES);

    // Ensure we always have valid state objects
    const sectionStates = sectionStateHook?.states || DEFAULT_SECTION_STATES;
    const toggleSection = sectionStateHook?.toggleSection || (() => { });

    // Dataset expansion state
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());

    // Get datasets from DatasetManager
    const loadedDatasets = useDatasets();

    // Get real views from ViewConfigurationManager
    const getViewsForDataset = useCallback((datasetId) => {
        try {
            const allViews = viewConfigurationManager?.getAllViews?.() || [];
            return allViews
                .filter(v => v.datasetId === datasetId)
                .map(v => ({
                    id: v.id,
                    name: v.name || 'Untitled View',
                    workspace: v.workspaceId || 'personal',
                    status: v.activeInstanceCount > 0 ? 'active' : 'inactive',
                    instanceColor: v.camera?.color || '#60a5fa',
                    filters: v.filters || [],
                    isShared: v.scope === 'shared' || v.scope === 'project',
                    sharedBy: v.createdBy,
                    lastActive: v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : null,
                }));
        } catch (e) {
            log.warn('Failed to get views:', e);
            return [];
        }
    }, []);

    // Transform to UI format with REAL views (or placeholder if none)
    const datasets = useMemo(() => {
        return loadedDatasets.map(ds => {
            const realViews = getViewsForDataset(ds.id);

            // If no real views exist, create a placeholder "default view"
            // This allows users to click to create their first view
            const views = realViews.length > 0 ? realViews : [{
                id: `placeholder-${ds.id}`,
                name: 'Default View',
                workspace: workspaceId || 'personal',
                status: ds.hasPolydata || ds.isAnalyzed ? 'inactive' : 'inactive',
                instanceColor: '#60a5fa',
                filters: [],
                isShared: false,
                isPlaceholder: true,
            }];

            return {
                id: ds.id,
                name: ds.name,
                fileType: ds.fileType, // Server-validated, not extracted from filename
                annotations: ds.annotations?.length || 0,
                pointCount: ds.pointCount,
                cellCount: ds.cellCount,
                uploadedByName: ds.uploadedByName,
                views,
            };
        });
    }, [loadedDatasets, getViewsForDataset, workspaceId]);

    // Filter helpers
    const getActiveViews = useCallback((ds) =>
        filters.active ? ds.views.filter(v => v.status === 'active') : [],
        [filters.active]);

    const getInactiveViews = useCallback((ds) =>
        filters.inactive ? ds.views.filter(v => v.status === 'inactive' && !v.isShared) : [],
        [filters.inactive]);

    const getSharedViews = useCallback((ds) =>
        filters.shared ? ds.views.filter(v => v.isShared) : [],
        [filters.shared]);

    // Count helpers
    const counts = useMemo(() => ({
        active: datasets.reduce((sum, ds) => sum + ds.views.filter(v => v.status === 'active').length, 0),
        inactive: datasets.reduce((sum, ds) => sum + ds.views.filter(v => v.status === 'inactive' && !v.isShared).length, 0),
        shared: datasets.reduce((sum, ds) => sum + ds.views.filter(v => v.isShared).length, 0),
    }), [datasets]);

    // Toggle filter
    const toggleFilter = useCallback((filterKey) => {
        setFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
    }, []);

    // Toggle dataset expansion
    const toggleDataset = useCallback((datasetId) => {
        setExpandedDatasets(prev => {
            const next = new Set(prev);
            if (next.has(datasetId)) {
                next.delete(datasetId);
            } else {
                next.add(datasetId);
            }
            return next;
        });
    }, []);

    // Load dataset handler
    const handleLoadDataset = useCallback(() => {
        // Dispatch event to open file picker
        window.dispatchEvent(new CustomEvent('cia:open-file-picker'));
    }, []);

    return (
        <div className="datasets-tab">
            {/* Header with search */}
            <div className="panel-header">
                <Database size={14} className="panel-header__icon file-icon--teal" />
                <span className="panel-header__title">Datasets</span>
                <div className="panel-header__search">
                    <Search size={10} />
                    <input
                        type="text"
                        placeholder="Search datasets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-button" onClick={() => setSearchQuery('')}>
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter toggles */}
            <div className="panel-toolbar">
                <FilterToggle
                    icon={Eye}
                    label="Active"
                    color="green"
                    active={filters.active}
                    count={counts.active}
                    onClick={() => toggleFilter('active')}
                />
                <FilterToggle
                    icon={Archive}
                    label="Inactive"
                    color="gray"
                    active={filters.inactive}
                    count={counts.inactive}
                    onClick={() => toggleFilter('inactive')}
                />
                <FilterToggle
                    icon={Users}
                    label="Shared"
                    color="pink"
                    active={filters.shared}
                    count={counts.shared}
                    onClick={() => toggleFilter('shared')}
                />
            </div>

            {/* Resizable sections */}
            <ResizableSectionsContainer
                className="datasets-tab__sections"
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Active Views */}
                <ResizableSection id="active" icon={Eye} iconColorClass="icon-green" label="Active" count={counts.active}>
                    {datasets.filter(ds => getActiveViews(ds).length > 0).length === 0 ? (
                        <div className="resizable-section__empty">
                            No active views - click a dataset to open one
                        </div>
                    ) : (
                        datasets.filter(ds => getActiveViews(ds).length > 0).map(ds => (
                            <DatasetItem
                                key={ds.id}
                                dataset={ds}
                                views={getActiveViews(ds)}
                                isExpanded={expandedDatasets.has(ds.id)}
                                onToggle={() => toggleDataset(ds.id)}
                            />
                        ))
                    )}
                </ResizableSection>

                {/* Inactive Views */}
                <ResizableSection id="inactive" icon={Archive} iconColorClass="icon-gray" label="Inactive" count={counts.inactive}>
                    {datasets.filter(ds => getInactiveViews(ds).length > 0).length === 0 ? (
                        <div className="resizable-section__empty">
                            No inactive views
                        </div>
                    ) : (
                        datasets.filter(ds => getInactiveViews(ds).length > 0).map(ds => (
                            <DatasetItem
                                key={ds.id}
                                dataset={ds}
                                views={getInactiveViews(ds)}
                                isExpanded={expandedDatasets.has(ds.id)}
                                onToggle={() => toggleDataset(ds.id)}
                            />
                        ))
                    )}
                </ResizableSection>

                {/* Shared with Me */}
                <ResizableSection id="shared" icon={Users} iconColorClass="icon-pink" label="Shared" count={counts.shared}>
                    {datasets.filter(ds => getSharedViews(ds).length > 0).length === 0 ? (
                        <div className="resizable-section__empty">
                            No shared views
                        </div>
                    ) : (
                        datasets.filter(ds => getSharedViews(ds).length > 0).map(ds => (
                            <DatasetItem
                                key={ds.id}
                                dataset={ds}
                                views={getSharedViews(ds)}
                                isExpanded={expandedDatasets.has(ds.id)}
                                onToggle={() => toggleDataset(ds.id)}
                                isInSharedSection
                            />
                        ))
                    )}
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
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

export default DatasetsPanelContent;