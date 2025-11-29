// src/ui/react/components/panels/RightPanel/index.jsx
// Unified Right Panel with VS Code-style Activity Bar
//
// Features:
// - Activity bar with icon tabs (fixed width, right-aligned)
// - Tab content fills remaining space
// - Tabs: People, Chat, Voice, Notes, Recording, Activity
// - Matches left panel styling patterns
// - Toggle button at bottom of activity bar

import React, { useState, useCallback, useMemo } from 'react';
import {
    Users,
    Briefcase,
    MessageSquare,
    Mic2,
    FileText,
    Video,
    Activity,
    PanelRightClose,
    ChevronLeft,
} from 'lucide-react';

// Tab content components
import { PeoplePanelContent } from './tabs/PeopleTab';
import { RoomsPanelContent } from './tabs/RoomsTab';
import { ChatPanelContent } from './tabs/ChatTab';
import { VoicePanelContent } from './tabs/VoiceTab';
import { NotesPanelContent } from './tabs/NotesTab';
import { RecordingsPanelContent } from './tabs/RecordingsTab';
import { ActivityPanelContent } from './tabs/ActivityTab';

import './RightPanel.scss';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

/**
 * Right panel tabs configuration
 * Order: People, Rooms, Chat, Voice, Notes, Recording, Activity
 */
const TABS = [
    { id: 'people', icon: Users, label: 'People', color: 'pink', implemented: true },
    { id: 'rooms', icon: Briefcase, label: 'Rooms', color: 'purple', implemented: true },
    { id: 'chat', icon: MessageSquare, label: 'Chat', color: 'blue', implemented: true },
    { id: 'voice', icon: Mic2, label: 'Voice', color: 'green', implemented: true },
    { id: 'notes', icon: FileText, label: 'Notes', color: 'teal', implemented: true },
    { id: 'recording', icon: Video, label: 'Recording', color: 'red', implemented: true },
    { id: 'activity', icon: Activity, label: 'Activity', color: 'amber', implemented: true },
];

// =============================================================================
// ACTIVITY BAR
// =============================================================================

function ActivityBar({ tabs, activeTab, onTabChange, onTogglePanel, isPanelOpen }) {
    // Handle tab click - if clicking active tab, toggle panel
    const handleTabClick = (tabId) => {
        if (tabId === activeTab) {
            // Clicking active tab toggles the panel
            onTogglePanel?.();
        } else {
            // Clicking different tab - switch to it and ensure panel is open
            onTabChange(tabId);
            if (!isPanelOpen) {
                onTogglePanel?.();
            }
        }
    };

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
                            onClick={() => handleTabClick(tab.id)}
                            title={tab.label}
                            aria-label={tab.label}
                            aria-selected={isActive}
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

            {/* Toggle panel button at bottom */}
            <button
                className="right-panel__activity-btn right-panel__toggle-btn"
                onClick={onTogglePanel}
                title={isPanelOpen ? 'Collapse Panel' : 'Expand Panel'}
                aria-label={isPanelOpen ? 'Collapse Panel' : 'Expand Panel'}
            >
                {isPanelOpen ? <PanelRightClose size={18} /> : <ChevronLeft size={18} />}
            </button>
        </div>
    );
}

// =============================================================================
// TAB CONTENT RENDERER
// =============================================================================

function TabContent({ activeTab, workspaceId }) {
    switch (activeTab) {
        case 'people':
            return <PeoplePanelContent workspaceId={workspaceId} />;
        case 'rooms':
            return <RoomsPanelContent workspaceId={workspaceId} />;
        case 'chat':
            return <ChatPanelContent workspaceId={workspaceId} />;
        case 'voice':
            return <VoicePanelContent workspaceId={workspaceId} />;
        case 'notes':
            return <NotesPanelContent workspaceId={workspaceId} />;
        case 'recording':
            return <RecordingsPanelContent workspaceId={workspaceId} />;
        case 'activity':
            return <ActivityPanelContent workspaceId={workspaceId} />;
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

/**
 * RightPanel - Main unified right panel component
 *
 * Note: This component receives props from ResizablePanel via React.cloneElement:
 * - isCollapsed: boolean - Whether panel is collapsed
 * - onToggle: function - Callback to toggle panel
 * - side: string - Always 'right' for this panel
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Current workspace ID from context
 * @param {boolean} props.isCollapsed - Whether panel is collapsed (from ResizablePanel)
 * @param {Function} props.onToggle - Callback to toggle panel (from ResizablePanel)
 * @param {string} props.side - Panel side, always 'right' (from ResizablePanel)
 */
export function RightPanel({
    workspaceId = 'default',
    initialTab = 'people',
    // These props come from ResizablePanel via React.cloneElement
    isCollapsed = false,
    onToggle,
    side = 'right',
}) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Get active tab config
    const activeTabConfig = useMemo(() => {
        return TABS.find(t => t.id === activeTab) || TABS[0];
    }, [activeTab]);

    // Handle tab change
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    return (
        <div className="right-panel" data-collapsed={isCollapsed}>
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
                onTabChange={handleTabChange}
                onTogglePanel={onToggle}
                isPanelOpen={!isCollapsed}
            />
        </div>
    );
}

export default RightPanel;