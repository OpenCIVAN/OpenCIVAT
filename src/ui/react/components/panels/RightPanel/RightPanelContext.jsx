/**
 * @file RightPanelContext.jsx
 * @description Shared state for Right Panel tabs.
 * Provides active tab state and navigation between activity bar and content.
 *
 * Tab Order (per spec):
 * 1. People (pink) - Presence & Location
 * 2. Voice (green) - Presence & Location
 * 3. Rooms (purple) - Presence & Location
 * --- divider ---
 * 4. Chat (blue) - Communication
 * 5. Activity (amber) - Communication
 * --- divider ---
 * 6. Notes (teal) - Documentation
 * 7. Recording (red) - Documentation
 * --- divider ---
 * 8. Settings (gray)
 *
 * @see Right_Panel_Design_Specification.md
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    Users,
    Mic2,
    DoorOpen,
    MessageSquare,
    Activity,
    FileText,
    Video,
    SlidersHorizontal,
} from 'lucide-react';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

/**
 * Tab configuration matching specification
 * Each tab has:
 * - id: Unique identifier
 * - icon: Lucide icon component
 * - label: Display name (for tooltips)
 * - color: Accent color variable name from tokens
 * - group: Functional grouping for visual organization
 */
export const RIGHT_PANEL_TABS = [
    // PRESENCE & LOCATION
    { id: 'people', icon: Users, label: 'People', color: 'pink', group: 'presence' },
    { id: 'voice', icon: Mic2, label: 'Voice', color: 'green', group: 'presence' },
    { id: 'rooms', icon: DoorOpen, label: 'Rooms', color: 'purple', group: 'presence' },
    // COMMUNICATION
    { id: 'chat', icon: MessageSquare, label: 'Chat', color: 'blue', group: 'communication' },
    { id: 'activity', icon: Activity, label: 'Activity', color: 'amber', group: 'communication' },
    // DOCUMENTATION
    { id: 'notes', icon: FileText, label: 'Notes', color: 'teal', group: 'documentation' },
    { id: 'recording', icon: Video, label: 'Recording', color: 'red', group: 'documentation' },
    // SETTINGS
    { id: 'settings', icon: SlidersHorizontal, label: 'Settings', color: 'gray', group: 'settings' },
];

/**
 * Dividers appear after these tabs (per spec)
 */
export const RIGHT_PANEL_DIVIDERS_AFTER = ['rooms', 'activity', 'recording'];

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Context shape
 */
const RightPanelContext = createContext({
    activeTab: 'people',
    setActiveTab: () => { },
    navigateToPanel: () => { },
});

/**
 * RightPanelProvider - Wraps the app to provide shared state
 * 
 * @example
 * <RightPanelProvider>
 *   <ThreeEdgeLayout
 *     rightActivityBar={<RightActivityBar />}
 *     rightPanelContent={<RightPanelContent />}
 *   />
 * </RightPanelProvider>
 */
export function RightPanelProvider({ children, defaultTab = 'people' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Navigate to a specific panel/tab (used for cross-panel links)
    const navigateToPanel = useCallback((panelId) => {
        const tab = RIGHT_PANEL_TABS.find(t => t.id === panelId);
        if (tab) {
            setActiveTab(panelId);
        }
    }, []);

    const value = {
        activeTab,
        setActiveTab,
        navigateToPanel,
    };

    return (
        <RightPanelContext.Provider value={value}>
            {children}
        </RightPanelContext.Provider>
    );
}

/**
 * Hook to access right panel state
 * 
 * @example
 * const { activeTab, setActiveTab, navigateToPanel } = useRightPanelContext();
 */
export function useRightPanelContext() {
    const context = useContext(RightPanelContext);
    if (!context) {
        throw new Error('useRightPanelContext must be used within a RightPanelProvider');
    }
    return context;
}