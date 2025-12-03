// src/ui/react/components/panels/LeftPanel/LeftPanelContent.jsx
// Expandable content for the left panel
// Renders in ThreeEdgeLayout's left panel content slot
//
// IMPORTANT: Uses existing class names from LeftPanel.scss to preserve styles

import React, { useCallback } from 'react';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';

// Tab content components
import { FilesPanelContent } from './tabs/FilesTab';
import { DatasetsPanelContent } from './tabs/DatasetsTab';
import { InstanceToolsPanelContent } from './tabs/InstanceToolsTab';
import { LayoutPanelContent } from './tabs/LayoutTab';
import { AnnotationsPanelContent } from './tabs/AnnotationsTab';
import { CursorsPanelContent } from './tabs/CursorsTab';
import { SavedFiltersPanelContent } from './tabs/SavedFiltersTab';
import { BookmarksPanelContent } from './tabs/BookmarksTab';

// Uses existing styles from LeftPanel.scss
import './LeftPanel.scss';

// =============================================================================
// PLACEHOLDER CONTENT
// =============================================================================

/**
 * PlaceholderContent - Shown for unimplemented tabs
 */
function PlaceholderContent({ tab }) {
    const Icon = tab.icon;

    return (
        <div className="left-panel__placeholder">
            <Icon size={32} className="left-panel__placeholder-icon" data-color={tab.color} />
            <h3 className="left-panel__placeholder-title">{tab.label}</h3>
            <p className="left-panel__placeholder-text">
                This tab is coming soon. It will contain {tab.label.toLowerCase()}
                management features.
            </p>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LeftPanelContent - Expandable content for the left panel
 *
 * Rendered inside ThreeEdgeLayout's content row when panel is open.
 * Contains the actual tab content (files, datasets, tools, etc).
 *
 * @param {string} workspaceId - Current workspace ID
 */
export function LeftPanelContent({ workspaceId = 'default' }) {
    const { activeTab, navigateToPanel } = useLeftPanelContext();

    // Get current tab config
    const currentTab = LEFT_PANEL_TABS.find(t => t.id === activeTab) || LEFT_PANEL_TABS[0];

    // Render tab content based on active tab
    const renderContent = useCallback(() => {
        switch (activeTab) {
            case 'files':
                return <FilesPanelContent workspaceId={workspaceId} />;
            case 'datasets':
                return <DatasetsPanelContent workspaceId={workspaceId} />;
            case 'instance-tools':
                return <InstanceToolsPanelContent workspaceId={workspaceId} />;
            case 'layout':
                return <LayoutPanelContent workspaceId={workspaceId} />;
            case 'annotations':
                return <AnnotationsPanelContent workspaceId={workspaceId} />;
            case 'cursors':
                return <CursorsPanelContent workspaceId={workspaceId} onNavigateToPanel={navigateToPanel} />;
            case 'filters':
                return <SavedFiltersPanelContent workspaceId={workspaceId} />;
            case 'bookmarks':
                return <BookmarksPanelContent workspaceId={workspaceId} />;
            default:
                return <PlaceholderContent tab={LEFT_PANEL_TABS[0]} />;
        }
    }, [activeTab, workspaceId, navigateToPanel]);

    return (
        // Uses existing .left-panel__content class from LeftPanel.scss
        <div
            className="left-panel__content"
            data-active-tab={activeTab}
            data-color={currentTab.color}
        >
            {renderContent()}
        </div>
    );
}

export default LeftPanelContent;