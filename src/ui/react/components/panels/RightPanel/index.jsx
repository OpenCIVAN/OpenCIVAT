// src/ui/react/components/panels/RightPanel/index.jsx
// Unified Right Panel with VS Code-style Activity Bar
//
// Features:
// - Activity bar with icon tabs (fixed width, right-aligned)
// - Tab content fills remaining space
// - Tabs: People, Notes, Chat
// - Matches left panel styling patterns

import React, { useState, useCallback, useMemo } from 'react';
import {
    Users,
    FileText,
    MessageSquare,
    Settings,
} from 'lucide-react';

// Tab content components
import { PeoplePanelContent } from './tabs/PeopleTab';
import { NotesPanelContent } from './tabs/NotesTab';
import { ChatPanelContent } from './tabs/ChatTab';

import './RightPanel.scss';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

/**
 * Right panel tabs configuration
 * - id: Unique identifier
 * - icon: Lucide icon component
 * - label: Display name (for tooltips)
 * - color: Accent color variable name from tokens
 * - implemented: Whether the tab content is ready
 */
const TABS = [
    { id: 'people', icon: Users, label: 'People', color: 'pink', implemented: true },
    { id: 'notes', icon: FileText, label: 'Notes', color: 'teal', implemented: true },
    { id: 'chat', icon: MessageSquare, label: 'Chat', color: 'blue', implemented: true },
];

// =============================================================================
// ACTIVITY BAR
// =============================================================================

function ActivityBar({ tabs, activeTab, onTabChange }) {
    return (
        <div className="right-panel__activity-bar">
            <div className="right-panel__activity-tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            className={`right-panel__activity-btn ${isActive ? 'active' : ''}`}
                            data-color={tab.color}
                            onClick={() => onTabChange(tab.id)}
                            title={tab.label}
                        >
                            <Icon size={18} />
                            {!tab.implemented && (
                                <span className="right-panel__activity-badge">Soon</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="right-panel__activity-spacer" />

            {/* Settings at bottom */}
            <button
                className="right-panel__activity-btn"
                title="Settings"
            >
                <Settings size={18} />
            </button>
        </div>
    );
}

// =============================================================================
// TAB CONTENT RENDERER
// =============================================================================

function TabContent({ activeTab, workspaceId }) {
    // Navigation handler for cross-tab navigation
    const handleNavigateToPanel = useCallback((panelId) => {
        // This would be connected to parent state in real implementation
        console.log('Navigate to panel:', panelId);
    }, []);

    switch (activeTab) {
        case 'people':
            return <PeoplePanelContent workspaceId={workspaceId} />;
        case 'notes':
            return <NotesPanelContent workspaceId={workspaceId} />;
        case 'chat':
            return <ChatPanelContent workspaceId={workspaceId} />;
        default:
            return (
                <div className="right-panel__placeholder">
                    <div className="right-panel__placeholder-icon">
                        {TABS.find(t => t.id === activeTab)?.icon && (
                            React.createElement(TABS.find(t => t.id === activeTab).icon, { size: 32 })
                        )}
                    </div>
                    <div className="right-panel__placeholder-title">
                        {TABS.find(t => t.id === activeTab)?.label || 'Unknown'}
                    </div>
                    <div className="right-panel__placeholder-text">
                        This panel is coming soon
                    </div>
                </div>
            );
    }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RightPanel({
    workspaceId = 'default',
    initialTab = 'people',
    isCollapsed = false,
}) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Get active tab config
    const activeTabConfig = useMemo(() => {
        return TABS.find(t => t.id === activeTab) || TABS[0];
    }, [activeTab]);

    return (
        <div className="right-panel">
            {/* Content panel - hidden when collapsed */}
            {!isCollapsed && (
                <div
                    className="right-panel__content"
                    data-color={activeTabConfig.color}
                >
                    <TabContent
                        activeTab={activeTab}
                        workspaceId={workspaceId}
                    />
                </div>
            )}

            {/* Activity bar - always visible, on the right */}
            <ActivityBar
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    );
}

export default RightPanel;