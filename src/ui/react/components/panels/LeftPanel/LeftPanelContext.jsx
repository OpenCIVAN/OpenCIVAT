/**
 * @file LeftPanelContext.jsx
 * @description Shared state for Left Panel tabs.
 * Provides active tab state and navigation between activity bar and content.
 *
 * Tab Order (per spec):
 * 1. Files (blue) - DATA SOURCES
 * 2. Datasets (teal) - DATA SOURCES
 * --- divider ---
 * 3. Views (purple) - VISUALIZATION
 * 4. Instance Tools (amber) - VISUALIZATION
 * 5. Layout (green) - VISUALIZATION
 * --- divider ---
 * 6. Annotations (pink) - SPATIAL & STATE
 * 7. Bookmarks & Filters (indigo) - SPATIAL & STATE
 * --- divider ---
 * 8. Cursors (cyan) - PRESENCE
 *
 * @see Left_Panel_Design_Specification.docx - Section 2 Tab Structure
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from 'react';
import {
    FolderOpen, // Files
    Database, // Datasets
    Eye, // Views (NEW - per spec uses 👁)
    Wrench, // Instance Tools
    LayoutGrid, // Layout
    MapPin, // Annotations
    Bookmark, // Bookmarks & Filters
    MousePointer2, // Cursors (Changed from Users per spec 🎯)
} from 'lucide-react';

// =============================================================================
// TAB CONFIGURATION - Per Left_Panel_Design_Specification.docx
// =============================================================================

/**
 * Tab definitions matching specification Section 2
 */
export const LEFT_PANEL_TABS = [
    // DATA SOURCES
    {
        id: 'files',
        icon: FolderOpen,
        label: 'Files',
        color: 'blue',
        group: 'data',
        implemented: true,
    },
    {
        id: 'datasets',
        icon: Database,
        label: 'Datasets',
        color: 'teal',
        group: 'data',
        implemented: true,
    },
    // VISUALIZATION
    {
        id: 'views',
        icon: Eye,
        label: 'Views',
        color: 'purple',
        group: 'visualization',
        implemented: true,
    },
    {
        id: 'tools',
        icon: Wrench,
        label: 'Instance Tools',
        color: 'amber',
        group: 'visualization',
        implemented: true,
    },
    {
        id: 'layout',
        icon: LayoutGrid,
        label: 'Layout',
        color: 'green',
        group: 'visualization',
        implemented: true,
    },
    // SPATIAL & STATE
    {
        id: 'annotations',
        icon: MapPin,
        label: 'Annotations',
        color: 'pink',
        group: 'spatial',
        implemented: true,
    },
    {
        id: 'bookmarks',
        icon: Bookmark,
        label: 'Bookmarks & Filters',
        color: 'indigo',
        group: 'spatial',
        implemented: true,
    },
    // PRESENCE (future VR expansion)
    {
        id: 'cursors',
        icon: MousePointer2,
        label: 'Cursors',
        color: 'cyan',
        group: 'presence',
        implemented: true,
    },
];

/**
 * Dividers appear after these tabs (per spec Section 2)
 * - After Datasets (separates DATA SOURCES from VISUALIZATION)
 * - After Layout (separates VISUALIZATION from SPATIAL & STATE)
 * - After Bookmarks & Filters (separates from Cursors for VR expansion)
 */
export const LEFT_PANEL_DIVIDERS_AFTER = ['datasets', 'layout', 'bookmarks'];

/**
 * Keyboard shortcuts for tabs (per spec Section 13)
 */
export const LEFT_PANEL_SHORTCUTS = {
    f: 'files',
    d: 'datasets',
    v: 'views',
    i: 'tools',
    l: 'layout',
    a: 'annotations',
    'shift+b': 'bookmarks',
    // 'u': 'upload' - action, not tab
};

// =============================================================================
// CONTEXT
// =============================================================================

const LeftPanelContext = createContext({
    activeTab: 'files',
    setActiveTab: () => { },
    navigateToPanel: () => { },
});

/**
 * LeftPanelProvider - Provides shared state for Left Panel
 */
export function LeftPanelProvider({ children, defaultTab = 'files' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Navigate to a specific panel/tab
    const navigateToPanel = useCallback((panelId) => {
        const tab = LEFT_PANEL_TABS.find((t) => t.id === panelId);
        if (tab) {
            setActiveTab(panelId);
        }
    }, []);

    // Dispatch tab change events for other components (e.g., InstanceViewport)
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('cia:left-panel-tab-change', {
                detail: { tabId: activeTab, isInstanceToolsActive: activeTab === 'tools' },
            })
        );
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

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.shiftKey
                ? `shift+${e.key.toLowerCase()}`
                : e.key.toLowerCase();
            const tabId = LEFT_PANEL_SHORTCUTS[key];

            if (tabId) {
                e.preventDefault();
                setActiveTab(tabId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
        throw new Error(
            'useLeftPanelContext must be used within a LeftPanelProvider'
        );
    }
    return context;
}

export default LeftPanelContext;