/**
 * @file ViewsTab.jsx
 * @description Centralized view management tab for the Left Panel.
 * Create, organize, place, and manage all ViewConfigurations in the workspace.
 *
 * Features:
 * - Canvas Navigator (shared with Layout tab, in Views mode)
 * - Multiple view modes: List, By Status, By Dataset, Grid
 * - Three sections: On Canvas, Not Placed, Recently Deleted
 * - View creation from datasets
 * - Drag-and-drop placement
 * - View lifecycle management (activate, deactivate, trash, restore)
 *
 * @see Left_Panel_Design_Specification.docx - Section 6 Views Tab
 *
 * @example
 * <ViewsPanelContent workspaceId="ws-1" />
 */

import React, { useMemo, useCallback, useContext } from 'react';
import {
    Eye,
    EyeOff,
    Trash2,
    Plus,
    Search,
    X,
    Grid3X3,
    Layers,
    Clock,
    LayoutList,
    LayoutGrid,
    Database,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates,
} from '@UI/react/components/common/ResizableSections';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { EmptyState } from '@UI/react/components/common/EmptyState';
import { ViewItem, InactiveViewItem, TrashedViewItem } from '@UI/react/components/common/ViewItem';
import {
    CanvasNavigator,
    useLayoutPanelContext,
    useLayoutPanel,
} from '@UI/react/components/panels/LayoutPanel';
import { useViewsTab, VIEW_MODES } from './hooks/useViewsTab';
import './ViewsTab.scss';

// =============================================================================
// FILTER CONFIGURATION
// =============================================================================

const VIEW_FILTERS = [
    { id: 'active', label: 'Active', color: 'green' },
    { id: 'inactive', label: 'Inactive', color: 'gray' },
    { id: 'shared', label: 'Shared', color: 'pink' },
    { id: 'linked', label: 'Linked', color: 'teal' },
];

// =============================================================================
// VIEW MODE BUTTONS
// =============================================================================

const VIEW_MODE_OPTIONS = [
    { id: VIEW_MODES.BY_STATUS, icon: LayoutList, label: 'By Status' },
    { id: VIEW_MODES.BY_DATASET, icon: Database, label: 'By Dataset' },
    { id: VIEW_MODES.LIST, icon: Layers, label: 'List' },
    { id: VIEW_MODES.GRID, icon: LayoutGrid, label: 'Grid' },
];

// =============================================================================
// DEFAULT SECTION STATES
// =============================================================================

const DEFAULT_SECTIONS = {
    navigator: { expanded: true, flexGrow: 0 },
    onCanvas: { expanded: true, flexGrow: 2 },
    notPlaced: { expanded: true, flexGrow: 1 },
    deleted: { expanded: false, flexGrow: 1 },
};

// =============================================================================
// ACTIVE VIEW ITEM WRAPPER
// =============================================================================

function ActiveViewItemWrapper({ view, handlers }) {
    return (
        <ViewItem
            view={view}
            isActive={true}
            showPosition={true}
            onSelect={handlers.handleSelectView}
            onClose={handlers.handleRemoveFromCanvas}
            onTrash={handlers.handleTrashView}
            onRename={handlers.handleRenameView}
            onNavigate={handlers.handleNavigateToView}
            onSizeChange={handlers.handleResizeView}
        />
    );
}

// =============================================================================
// DATASET GROUP COMPONENT
// =============================================================================

function DatasetGroup({ dataset, views, isExpanded, onToggle, handlers }) {
    const activeCount = views.filter(v => v.status === 'active').length;

    return (
        <div className="views-tab__dataset-group">
            <button
                className="views-tab__dataset-header"
                onClick={onToggle}
            >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Database size={12} className="icon-teal" />
                <span className="views-tab__dataset-name">{dataset.name}</span>
                <span className="views-tab__dataset-counts">
                    <span className="views-tab__dataset-active">{activeCount}</span>
                    /
                    <span className="views-tab__dataset-total">{views.length}</span>
                </span>
            </button>

            {isExpanded && (
                <div className="views-tab__dataset-views">
                    {views.map(view => (
                        view.status === 'active' ? (
                            <ActiveViewItemWrapper
                                key={view.id}
                                view={view}
                                handlers={handlers}
                            />
                        ) : (
                            <InactiveViewItem
                                key={view.id}
                                view={view}
                                onPlace={handlers.handlePlaceView}
                                onTrash={handlers.handleTrashView}
                            />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ViewsPanelContent({ workspaceId }) {
    // =========================================================================
    // HOOKS
    // =========================================================================

    // Get layout panel context for CanvasNavigator
    // Note: useLayoutPanel must be called unconditionally (React hooks rules)
    // When context exists, we use context.logic; otherwise use standalone
    const layoutContext = useLayoutPanelContext();

    // Create standalone logic - this is always called but may not be used
    // Pass workspaceId for canvas initialization
    const standaloneLogic = useLayoutPanel({ canvasId: workspaceId });

    // Prefer context logic if available, fall back to standalone
    const layoutLogic = layoutContext?.logic || standaloneLogic;

    const {
        views,
        onCanvasViews,
        notPlacedViews,
        recentlyDeletedViews,
        viewsByDataset,
        searchQuery,
        setSearchQuery,
        activeFilters,
        toggleFilter,
        viewMode,
        setViewMode,
        expandedDatasets,
        toggleDatasetExpanded,
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleCreateView,
        handleSelectView,
        handleNavigateToView,
        handleRenameView,
        handleResizeView,
    } = useViewsTab({ workspaceId });

    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates(DEFAULT_SECTIONS);

    // Bundle handlers for passing to child components
    const handlers = useMemo(() => ({
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleSelectView,
        handleNavigateToView,
        handleRenameView,
        handleResizeView,
    }), [
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleSelectView,
        handleNavigateToView,
        handleRenameView,
        handleResizeView,
    ]);

    // =========================================================================
    // RENDER HELPERS
    // =========================================================================

    const renderByStatusContent = () => (
        <ResizableSectionsContainer
            className="views-tab__sections"
            sectionStates={sectionStates}
            onSectionToggle={toggleSection}
            onSectionResize={resizeSection}
        >
            {/* Canvas Navigator */}
            <ResizableSection
                id="navigator"
                icon={Grid3X3}
                iconColorClass="icon-purple"
                label="Canvas Navigator"
                collapsible
            >
                <CanvasNavigator
                    isDocked={true}
                    logic={layoutLogic}

                />
            </ResizableSection>

            {/* On Canvas Section */}
            <ResizableSection
                id="onCanvas"
                icon={Eye}
                iconColorClass="icon-green"
                label="On Canvas"
                count={onCanvasViews.length}
            >
                {onCanvasViews.length === 0 ? (
                    <EmptyState
                        icon={Eye}
                        title="No views on canvas"
                        description="Drag views here or click to place"
                        size="sm"
                    />
                ) : (
                    <div className="views-tab__list">
                        {onCanvasViews.map(view => (
                            <ActiveViewItemWrapper
                                key={view.id}
                                view={view}
                                handlers={handlers}
                            />
                        ))}
                    </div>
                )}
            </ResizableSection>

            {/* Not Placed Section */}
            <ResizableSection
                id="notPlaced"
                icon={EyeOff}
                iconColorClass="icon-gray"
                label="Not Placed"
                count={notPlacedViews.length}
            >
                {notPlacedViews.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="All views are placed"
                        description="Create new views from Datasets tab"
                        size="sm"
                    />
                ) : (
                    <div className="views-tab__list">
                        {notPlacedViews.map(view => (
                            <InactiveViewItem
                                key={view.id}
                                view={view}
                                onPlace={handlePlaceView}
                                onTrash={handleTrashView}
                            />
                        ))}
                    </div>
                )}
            </ResizableSection>

            {/* Recently Deleted Section */}
            <ResizableSection
                id="deleted"
                icon={Trash2}
                iconColorClass="icon-red"
                label="Recently Deleted"
                count={recentlyDeletedViews.length}
                badge={recentlyDeletedViews.length > 0 ? '!' : undefined}
            >
                {recentlyDeletedViews.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="No deleted views"
                        description="Deleted views appear here for 30 days"
                        size="sm"
                    />
                ) : (
                    <div className="views-tab__list">
                        {recentlyDeletedViews.map(view => (
                            <TrashedViewItem
                                key={view.id}
                                view={view}
                                onRestore={handleRestoreView}
                                onPermanentDelete={handlePermanentDelete}
                            />
                        ))}
                    </div>
                )}
            </ResizableSection>
        </ResizableSectionsContainer>
    );

    const renderByDatasetContent = () => (
        <div className="views-tab__by-dataset">
            {/* Canvas Navigator at top */}
            <div className="views-tab__navigator-container">
                <CanvasNavigator isDocked={true} logic={layoutLogic} />
            </div>

            {/* Dataset groups */}
            <div className="views-tab__dataset-list">
                {viewsByDataset.length === 0 ? (
                    <EmptyState
                        icon={Database}
                        title="No views"
                        description="Load a dataset to create views"
                        size="sm"
                    />
                ) : (
                    viewsByDataset.map(group => (
                        <DatasetGroup
                            key={group.id}
                            dataset={group}
                            views={group.views}
                            isExpanded={expandedDatasets.has(group.id)}
                            onToggle={() => toggleDatasetExpanded(group.id)}
                            handlers={handlers}
                        />
                    ))
                )}
            </div>

            {/* Recently Deleted (collapsible) */}
            {recentlyDeletedViews.length > 0 && (
                <div className="views-tab__trash-section">
                    <div className="views-tab__trash-header">
                        <Trash2 size={12} className="icon-red" />
                        <span>Recently Deleted ({recentlyDeletedViews.length})</span>
                    </div>
                    <div className="views-tab__trash-list">
                        {recentlyDeletedViews.map(view => (
                            <TrashedViewItem
                                key={view.id}
                                view={view}
                                onRestore={handleRestoreView}
                                onPermanentDelete={handlePermanentDelete}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderListContent = () => (
        <div className="views-tab__flat-list">
            {/* Canvas Navigator at top */}
            <div className="views-tab__navigator-container">
                <CanvasNavigator isDocked={true} logic={layoutLogic} />
            </div>

            {/* All views in a flat list */}
            <div className="views-tab__list views-tab__list--scrollable">
                {views.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No views"
                        description="Load a dataset to create views"
                        size="sm"
                    />
                ) : (
                    views.map(view => (
                        view.status === 'active' ? (
                            <ActiveViewItemWrapper
                                key={view.id}
                                view={view}
                                handlers={handlers}
                            />
                        ) : (
                            <InactiveViewItem
                                key={view.id}
                                view={view}
                                onPlace={handlePlaceView}
                                onTrash={handleTrashView}
                            />
                        )
                    ))
                )}
            </div>
        </div>
    );

    const renderGridContent = () => (
        <div className="views-tab__grid-view">
            {/* Canvas Navigator takes priority */}
            <div className="views-tab__navigator-container views-tab__navigator-container--large">
                <CanvasNavigator isDocked={true} logic={layoutLogic} />
            </div>

            {/* Compact view list below */}
            <div className="views-tab__grid-list">
                {views.map(view => (
                    <div
                        key={view.id}
                        className={`views-tab__grid-item ${view.status === 'active' ? 'views-tab__grid-item--active' : ''}`}
                        style={{ '--view-color': view.color }}
                        onClick={() => view.status === 'active' ? handleSelectView(view.id) : handlePlaceView(view.id)}
                        title={view.name}
                    >
                        <span className="views-tab__grid-item-name">{view.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

    return (
        <div className="views-tab">
            {/* Header */}
            <div className="panel-header panel-header--purple">
                <Layers size={14} className="panel-header__icon" />
                <span className="panel-header__title">Views</span>
            </div>

            {/* Search and Filters */}
            <div className="views-tab__toolbar">
                {/* Search */}
                <div className="views-tab__search">
                    <Search size={12} className="views-tab__search-icon" />
                    <input
                        type="text"
                        className="views-tab__search-input"
                        placeholder="Search views..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="views-tab__search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>

                {/* View Mode Toggle */}
                <div className="views-tab__mode-toggle">
                    {VIEW_MODE_OPTIONS.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            className={`views-tab__mode-btn ${viewMode === id ? 'views-tab__mode-btn--active' : ''}`}
                            onClick={() => setViewMode(id)}
                            title={label}
                        >
                            <Icon size={12} />
                        </button>
                    ))}
                </div>

                {/* Filter Chips */}
                <div className="views-tab__filters">
                    <ChipGroup
                        chips={VIEW_FILTERS}
                        activeChips={activeFilters}
                        onToggle={toggleFilter}
                        size="sm"
                    />
                </div>
            </div>

            {/* Content - varies by view mode */}
            <div className="views-tab__content">
                {viewMode === VIEW_MODES.BY_STATUS && renderByStatusContent()}
                {viewMode === VIEW_MODES.BY_DATASET && renderByDatasetContent()}
                {viewMode === VIEW_MODES.LIST && renderListContent()}
                {viewMode === VIEW_MODES.GRID && renderGridContent()}
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