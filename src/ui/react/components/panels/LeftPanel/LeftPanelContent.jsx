// src/ui/react/components/panels/LeftPanel/LeftPanelContent.jsx
// Expandable content for the left panel
// Renders in ThreeEdgeLayout's left panel content slot
// Supports pop-out to floating panel with space reclamation
//
// IMPORTANT: Uses existing class names from LeftPanel.scss to preserve styles

import React, { useCallback } from 'react';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';

// Tab content components
import { FilesPanelContent } from './tabs/FilesTab';
import { DatasetsPanelContent } from './tabs/DatasetsTab';
import { ViewsPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/ViewsTab';
import { InstanceToolsPanelContent } from './tabs/InstanceToolsTab';
import { LayoutPanelContent } from './tabs/LayoutTab';
import { CursorsPanelContent } from './tabs/CursorsTab';
import { AnnotationsPanelContent } from './tabs/AnnotationsTab';
import { BookmarksFiltersPanelContent } from './tabs/BookmarksFiltersTab';

// Icons for pop-out button
import { ExternalLink } from 'lucide-react';

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
// TAB CONTENT RENDERER
// =============================================================================

/**
 * Render content for a specific tab
 *
 * 6-tab configuration:
 * - files: Project files
 * - datasets: Loaded datasets with views
 * - tools: Instance tools for active instance
 * - layout: Canvas layout configuration
 * - annotations: Global annotations search
 * - bookmarks: Combined bookmarks & filters
 */
function renderTabContent(tabId, workspaceId, navigateToPanel) {
    switch (tabId) {
        case 'files':
            return <FilesPanelContent workspaceId={workspaceId} />;
        case 'datasets':
            return <DatasetsPanelContent workspaceId={workspaceId} />;
        case 'views':
            return <ViewsPanelContent workspaceId={workspaceId} />;
        case 'tools':
            return <InstanceToolsPanelContent workspaceId={workspaceId} />;
        case 'layout':
            return <LayoutPanelContent workspaceId={workspaceId} />;
        case 'cursors':
            return <CursorsPanelContent workspaceId={workspaceId} onNavigateToPanel={navigateToPanel} />;
        case 'annotations':
            return <AnnotationsPanelContent workspaceId={workspaceId} />;
        case 'bookmarks':
            return <BookmarksFiltersPanelContent workspaceId={workspaceId} />;
        default:
            return <PlaceholderContent tab={LEFT_PANEL_TABS[0]} />;
    }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LeftPanelContent - Expandable content for the left panel
 *
 * Rendered inside ThreeEdgeLayout's content row when panel is open.
 * Contains the actual tab content (files, datasets, tools, etc).
 * Supports pop-out to floating window for flexible positioning.
 *
 * Note: Floating panels are rendered at the app level (AllFloatingPanels),
 * not here, so they persist even when the docked panel is closed.
 *
 * @param {string} workspaceId - Current workspace ID
 */
export function LeftPanelContent({ workspaceId = 'default' }) {
    const { activeTab, navigateToPanel } = useLeftPanelContext();
    const { popOutPanel, isPoppedOut } = useFloatingPanels();
    const { setLeftOpen } = useLayoutContext();

    // Get current tab config
    const currentTab = LEFT_PANEL_TABS.find(t => t.id === activeTab) || LEFT_PANEL_TABS[0];
    const Icon = currentTab.icon;

    // Check if current tab is already popped out
    const panelId = `left-${activeTab}`;
    const isCurrentTabFloating = isPoppedOut(panelId);

    // Handle pop-out - close docked panel to reclaim space
    const handlePopOut = useCallback(() => {
        popOutPanel(panelId, {
            title: currentTab.label,
            icon: Icon,
            color: currentTab.color,
            x: 100,
            y: 100,
            width: 400,
            height: 600,
        });
        // Collapse the docked panel to reclaim workspace space
        setLeftOpen(false);
    }, [panelId, currentTab, Icon, popOutPanel, setLeftOpen]);

    // If the current tab is floating, show a message to select another tab
    if (isCurrentTabFloating) {
        return (
            <div
                className="left-panel__content left-panel__content--tab-floating"
                data-active-tab={activeTab}
            >
                <div className="left-panel__floating-notice">
                    <Icon size={20} />
                    <span>{currentTab.label} is floating</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="left-panel__content"
            data-active-tab={activeTab}
            data-color={currentTab.color}
        >
            {/* Mini toolbar with pop-out button */}
            <div className="left-panel__toolbar">
                <button
                    className="left-panel__pop-out-btn"
                    onClick={handlePopOut}
                    title="Pop out to floating window"
                >
                    <ExternalLink size={12} />
                </button>
            </div>

            {/* Tab content - no redundant header, activity bar shows tab */}
            {renderTabContent(activeTab, workspaceId, navigateToPanel)}
        </div>
    );
}

export default LeftPanelContent;