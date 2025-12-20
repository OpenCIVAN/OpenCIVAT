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

import React, { useMemo } from 'react';
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
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates,
} from '@UI/react/components/common/ResizableSections';
import { ChipGroup } from '@UI/react/components/common/ChipGroup';
import { EmptyState } from '@UI/react/components/common/EmptyState';
import { ViewItem } from '../DatasetsTab/ViewItem/ViewItem';
import { CanvasNavigator } from '@UI/react/components/panels/LayoutPanel';
import { useViewsTab } from './hooks/useViewsTab';
import './ViewsTab.scss';

// =============================================================================
// FILTER CONFIGURATION
// =============================================================================

/**
 * Filter chips for view filtering
 */
const VIEW_FILTERS = [
    { id: 'all', label: 'All', color: 'gray' },
    { id: 'shared', label: 'Shared', color: 'pink' },
    { id: 'linked', label: 'Linked', color: 'teal' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} ViewsTabProps
 * @property {string} workspaceId - Current workspace ID
 */

/**
 * Views tab component for centralized view management.
 *
 * @param {ViewsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function ViewsPanelContent({ workspaceId }) {
    // Tab state
    const {
        views,
        onCanvasViews,
        notPlacedViews,
        recentlyDeletedViews,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        handlePlaceView,
        handleRemoveFromCanvas,
        handleTrashView,
        handleRestoreView,
        handlePermanentDelete,
        handleCreateView,
    } = useViewsTab({ workspaceId });

    // Section states for resizable sections
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates({
        navigator: { expanded: true, flexGrow: 0 },
        onCanvas: { expanded: true, flexGrow: 1 },
        notPlaced: { expanded: true, flexGrow: 1 },
        deleted: { expanded: false, flexGrow: 0 },
    });

    // Filter counts
    const filterCounts = useMemo(
        () => ({
            all: views.length,
            shared: views.filter((v) => v.isShared).length,
            linked: views.filter((v) => v.linkedCount > 0).length,
        }),
        [views]
    );

    return (
        <div className="views-tab">
            {/* Header with search and filters */}
            <div className="panel-header">
                <div className="panel-header__search">
                    <Search size={12} className="panel-header__search-icon" />
                    <input
                        type="text"
                        className="panel-header__search-input"
                        placeholder="Search views..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="panel-header__search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>

                <div className="panel-header__filters">
                    <ChipGroup
                        chips={VIEW_FILTERS.map((f) => ({
                            ...f,
                            count: filterCounts[f.id],
                        }))}
                        activeChips={[activeFilter]}
                        onToggle={setActiveFilter}
                        size="sm"
                    />
                </div>
            </div>

            {/* Content sections */}
            <ResizableSectionsContainer
                className="views-tab__sections"
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
                onSectionResize={resizeSection}
            >
                {/* Canvas Navigator (Views Mode) */}
                <ResizableSection
                    id="navigator"
                    icon={Grid3X3}
                    iconColorClass="icon-purple"
                    label="Canvas Navigator"
                    collapsible
                >
                    <CanvasNavigator workspaceId={workspaceId} mode="views" compact />
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
                            {onCanvasViews.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    onClose={handleRemoveFromCanvas}
                                    onTrash={handleTrashView}
                                    showPosition
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
                            {notPlacedViews.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    onSelect={handlePlaceView}
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
                            {recentlyDeletedViews.map((view) => (
                                <ViewItem
                                    key={view.id}
                                    view={view}
                                    variant="deleted"
                                    onRestore={handleRestoreView}
                                    onPermanentDelete={handlePermanentDelete}
                                />
                            ))}
                        </div>
                    )}
                </ResizableSection>
            </ResizableSectionsContainer>

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