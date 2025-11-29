// src/ui/react/components/panels/LeftPanel/tabs/DatasetsTab.jsx
// Datasets tab content for the unified left panel
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

// =============================================================================
// DATASET TYPE UTILITIES (Handler-based)
// =============================================================================

const getDatasetTypeConfig = (fileType) => {
    const displayInfo = getFileTypeDisplayInfo(fileType);

    if (displayInfo) {
        // Get icon component from Lucide by name
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

// Helper to extract file type from filename
const getFileTypeFromName = (filename) => {
    if (!filename) return null;
    const parts = filename.split('.');
    if (parts.length < 2) return null;
    // Handle .nii.gz style extensions
    if (parts.length >= 3 && parts[parts.length - 1] === 'gz') {
        return parts[parts.length - 2];
    }
    return parts[parts.length - 1].toLowerCase();
};

// =============================================================================
// VIEW ITEM
// =============================================================================

function ViewItem({ view, isInSharedSection = false }) {
    const [isHovered, setIsHovered] = useState(false);
    const isActive = view.status === 'active';
    const inDifferentWorkspace = view.workspace && view.workspace !== 'personal';

    return (
        <div
            className={`tree-item tree-item--view ${isActive ? 'active' : ''}`}
            style={{
                background: isActive
                    ? `rgba(var(--view-color-rgb, 96,165,250), 0.08)`
                    : isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderLeftColor: isActive ? view.instanceColor : 'transparent',
                opacity: inDifferentWorkspace && isInSharedSection ? 0.7 : 1,
                '--view-color': view.instanceColor,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Status dot */}
            <Circle
                size={8}
                fill={isActive ? view.instanceColor : 'none'}
                style={{ color: isActive ? view.instanceColor : 'var(--color-text-muted)' }}
            />

            {/* View name */}
            <span className="item-name">
                {view.name}
                {view.sharedBy && (
                    <span className="view-shared-by"> • from {view.sharedBy}</span>
                )}
            </span>

            {/* Badges and indicators */}
            <div className="view-indicators">
                {/* Shared badge (in Active section) */}
                {view.isShared && !isInSharedSection && (
                    <Users
                        size={9}
                        className="indicator-icon indicator-icon--shared"
                        title={view.sharedBy ? `From ${view.sharedBy}` : `Shared with ${view.sharedWith?.length}`}
                    />
                )}

                {/* Saved indicator */}
                {view.savedByUser && (
                    <Save size={9} className="indicator-icon indicator-icon--saved" />
                )}

                {/* Filter count badge */}
                {view.filters?.length > 0 && (
                    <span className="badge badge--count">{view.filters.length}</span>
                )}

                {/* Last active time (for inactive views) */}
                {!isActive && view.lastActive && (
                    <span className="item-meta">{view.lastActive}</span>
                )}

                {/* Workspace badge (in shared section) */}
                {inDifferentWorkspace && isInSharedSection && (
                    <span className="badge badge--workspace">{view.workspaceName}</span>
                )}
            </div>

            {/* More actions button */}
            {isHovered && (
                <button className="tree-item__more-btn">
                    <MoreHorizontal size={12} />
                </button>
            )}
        </div>
    );
}

// =============================================================================
// DATASET ITEM
// =============================================================================

function DatasetItem({ dataset, views, isExpanded, onToggle, isInSharedSection = false }) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, colorClass, color } = getDatasetTypeConfig(dataset.fileType);
    const activeCount = views.filter(v => v.status === 'active').length;

    if (views.length === 0) return null;

    return (
        <>
            {/* Dataset row */}
            <div
                className="tree-item tree-item--folder"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onToggle}
            >
                {/* Expand/collapse chevron */}
                <span className="chevron">
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
    const { states: sectionStates, toggleSection } = useSectionStates({
        active: { expanded: true, flexGrow: 2 },
        inactive: { expanded: false, flexGrow: 1 },
        shared: { expanded: true, flexGrow: 1 },
    });

    // Dataset expansion state
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());

    // Get datasets from DatasetManager
    const loadedDatasets = useDatasets();

    // Transform to UI format with views
    const datasets = useMemo(() => {
        return loadedDatasets.map(ds => ({
            id: ds.id,
            name: ds.name,
            fileType: getFileTypeFromName(ds.name),
            annotations: ds.annotations?.length || 0,
            pointCount: ds.pointCount,
            cellCount: ds.cellCount,
            uploadedByName: ds.uploadedByName,
            views: [
                // For now, create a default view per dataset
                // TODO: Connect to ViewConfigurationManager for real views
                {
                    id: `view-${ds.id}`,
                    name: 'Default View',
                    workspace: workspaceId || 'personal',
                    status: ds.hasPolydata || ds.isAnalyzed ? 'active' : 'inactive',
                    instanceColor: '#60a5fa',
                    filters: [],
                    isShared: false,
                }
            ],
        }));
    }, [loadedDatasets, workspaceId]);

    // Auto-expand datasets when they load
    useMemo(() => {
        if (datasets.length > 0 && expandedDatasets.size === 0) {
            setExpandedDatasets(new Set(datasets.map(ds => ds.id)));
        }
    }, [datasets.length]);

    // View filtering functions
    const getActiveViews = useCallback((ds) =>
        ds.views.filter(v => v.status === 'active'),
        []);

    const getInactiveViews = useCallback((ds) =>
        ds.views.filter(v => v.status === 'inactive'),
        []);

    const getSharedViews = useCallback((ds) =>
        ds.views.filter(v => v.isShared && v.sharedBy),
        []);

    // Count totals
    const counts = useMemo(() => ({
        active: datasets.reduce((sum, ds) => sum + getActiveViews(ds).length, 0),
        inactive: datasets.reduce((sum, ds) => sum + getInactiveViews(ds).length, 0),
        shared: datasets.reduce((sum, ds) => sum + getSharedViews(ds).length, 0),
        total: datasets.length,
    }), [datasets, getActiveViews, getInactiveViews, getSharedViews]);

    // Handlers
    const toggleFilter = useCallback((key) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const toggleDataset = useCallback((id) => {
        setExpandedDatasets(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    return (
        <div className="datasets-tab">
            {/* Header */}
            <div className="panel-header">
                <Database size={14} className="panel-header__icon file-icon--dicom" />
                <span className="panel-header__title">Datasets</span>
                <span className="panel-header__count">{counts.total}</span>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search datasets & views..."
                    />
                    {searchQuery && (
                        <button
                            className="clear-button"
                            onClick={() => setSearchQuery('')}
                        >
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
                    color="muted"
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
                <div className="panel-toolbar__spacer" />
                <button className="panel-header__action-btn" title="Filter options">
                    <Filter size={12} />
                </button>
            </div>

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Active views - scoped to current workspace */}
                <ResizableSection id="active" icon={Eye} iconColorClass="icon-green" label="Active" count={counts.active}>
                    {datasets.filter(ds => getActiveViews(ds).length > 0).length === 0 ? (
                        <div className="resizable-section__empty">
                            No active views in this workspace
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

                {/* Inactive views - global */}
                <ResizableSection id="inactive" icon={Archive} iconColorClass="icon-muted" label="Inactive" count={counts.inactive}>
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
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <FolderOpen size={11} />
                    <span>Load Dataset</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Clean up">
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