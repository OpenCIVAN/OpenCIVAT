// src/ui/react/components/panels/LeftPanel/LeftPanelContext.jsx
// Shared state between LeftActivityBar and LeftPanelContent
// since they render in different DOM locations in ThreeEdgeLayout

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
    FolderOpen,
    Database,
    Wrench,
    LayoutGrid,
    MapPin,
    Bookmark,
    Users,
} from 'lucide-react';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

/**
 * Tab definitions with icons and colors
 * Each tab has:
 * - id: Unique identifier
 * - icon: Lucide icon component
 * - label: Display name (for tooltips)
 * - color: Accent color variable name from tokens
 * - implemented: Whether the tab content is ready
 *
 * 6-tab configuration per spec:
 * - Files: Project files with grid/list views and thumbnails
 * - Datasets: Loaded datasets with views tree
 * --- divider ---
 * - Instance Tools: Tools for the active instance
 * - Layout: Workspace layout presets
 * --- divider ---
 * - Annotations: Global annotations search/filter
 * - Bookmarks & Filters: Combined bookmarks and saved filter presets
 */
export const LEFT_PANEL_TABS = [
    { id: 'files', icon: FolderOpen, label: 'Files', color: 'blue', implemented: true },
    { id: 'datasets', icon: Database, label: 'Datasets', color: 'teal', implemented: true },
    { id: 'tools', icon: Wrench, label: 'Instance Tools', color: 'amber', implemented: true },
    { id: 'layout', icon: LayoutGrid, label: 'Layout', color: 'green', implemented: true },
    { id: 'annotations', icon: MapPin, label: 'Annotations', color: 'pink', implemented: true },
    { id: 'cursors', icon: Users, label: 'Cursors', color: 'purple', implemented: true },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks & Filters', color: 'indigo', implemented: true },
];

/**
 * Dividers appear after these tabs for visual grouping
 */
export const LEFT_PANEL_DIVIDERS_AFTER = ['datasets', 'layout'];

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Context shape
 */
const LeftPanelContext = createContext({
    activeTab: 'files',
    setActiveTab: () => { },
    navigateToPanel: () => { },
});

/**
 * LeftPanelProvider - Wraps the app to provide shared state
 *
 * @example
 * <LeftPanelProvider>
 *   <ThreeEdgeLayout
 *     leftActivityBar={<LeftActivityBar />}
 *     leftPanelContent={<LeftPanelContent />}
 *   />
 * </LeftPanelProvider>
 */
export function LeftPanelProvider({ children, defaultTab = 'files' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Navigate to a specific panel/tab (used for cross-panel links)
    const navigateToPanel = useCallback((panelId) => {
        const tab = LEFT_PANEL_TABS.find(t => t.id === panelId);
        if (tab) {
            setActiveTab(panelId);
        }
    }, []);

    // Dispatch tab change events for other components (e.g., InstanceViewport)
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('cia:left-panel-tab-change', {
            detail: { tabId: activeTab, isInstanceToolsActive: activeTab === 'tools' }
        }));
    }, [activeTab]);

    // Listen for instance tools open event (from wrench button in InstanceViewport)
    useEffect(() => {
        const handleOpenInstanceTools = () => {
            setActiveTab('tools');
        };

        window.addEventListener('cia:open-instance-tools', handleOpenInstanceTools);
        return () => {
            window.removeEventListener('cia:open-instance-tools', handleOpenInstanceTools);
        };
    }, []);

    const value = {
        activeTab,
        setActiveTab,
        navigateToPanel,
    };

    return (
        <LeftPanelContext.Provider value={value}>
            {children}
        </LeftPanelContext.Provider>
    );
}

/**
 * Hook to access left panel state
 *
 * @example
 * const { activeTab, setActiveTab, navigateToPanel } = useLeftPanelContext();
 */
export function useLeftPanelContext() {
    const context = useContext(LeftPanelContext);
    if (!context) {
        throw new Error('useLeftPanelContext must be used within a LeftPanelProvider');
    }
    return context;
}