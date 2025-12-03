// src/ui/react/components/panels/RightPanel/RightPanelContent.jsx
// Expandable content for the right panel
// Renders in ThreeEdgeLayout's right panel content slot
//
// IMPORTANT: Uses existing class names from RightPanel.scss to preserve styles

import React from 'react';
import { useRightPanelContext, RIGHT_PANEL_TABS } from './RightPanelContext';

// Tab content components
import { PeoplePanelContent } from './tabs/PeopleTab';
import { RoomsPanelContent } from './tabs/RoomsTab';
import { ChatPanelContent } from './tabs/ChatTab';
import { VoicePanelContent } from './tabs/VoiceTab';
import { NotesPanelContent } from './tabs/NotesTab';
import { RecordingsPanelContent } from './tabs/RecordingsTab';
import { ActivityPanelContent } from './tabs/ActivityTab';

// Uses existing styles from RightPanel.scss - no separate SCSS needed
import './RightPanel.scss';

// =============================================================================
// TAB CONTENT RENDERER
// =============================================================================

/**
 * Renders the appropriate content based on active tab
 */
function TabContent({ activeTab, workspaceId, roomName }) {
    switch (activeTab) {
        case 'people':
            return <PeoplePanelContent workspaceId={workspaceId} />;
        case 'rooms':
            return <RoomsPanelContent workspaceId={workspaceId} />;
        case 'chat':
            return <ChatPanelContent workspaceId={workspaceId} />;
        case 'voice':
            return <VoicePanelContent workspaceId={workspaceId} roomName={roomName} />;
        case 'notes':
            return <NotesPanelContent workspaceId={workspaceId} />;
        case 'recording':
            return <RecordingsPanelContent workspaceId={workspaceId} />;
        case 'activity':
            return <ActivityPanelContent workspaceId={workspaceId} />;
        default:
            return <PlaceholderContent tabId={activeTab} />;
    }
}

/**
 * Placeholder for unimplemented tabs
 */
function PlaceholderContent({ tabId }) {
    const tabConfig = RIGHT_PANEL_TABS.find(t => t.id === tabId);
    const Icon = tabConfig?.icon;

    return (
        // Uses existing class names from RightPanel.scss
        <div className="right-panel__placeholder">
            {Icon && (
                <div
                    className="right-panel__placeholder-icon"
                    data-color={tabConfig?.color}
                >
                    <Icon size={32} />
                </div>
            )}
            <div className="right-panel__placeholder-title">
                {tabConfig?.label || 'Unknown'}
            </div>
            <div className="right-panel__placeholder-text">
                This panel is coming soon
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RightPanelContent - Expandable content for the right panel
 *
 * Rendered inside ThreeEdgeLayout's content row when panel is open.
 * Contains the actual tab content (people, chat, voice, etc).
 *
 * @param {string} workspaceId - Current workspace ID
 * @param {string} roomName - Current room name (for voice chat)
 */
export function RightPanelContent({ workspaceId = 'default', roomName }) {
    const { activeTab } = useRightPanelContext();
    const tabConfig = RIGHT_PANEL_TABS.find(t => t.id === activeTab);

    return (
        // Uses existing .right-panel__content class from RightPanel.scss
        <div
            className="right-panel__content"
            data-color={tabConfig?.color}
        >
            <TabContent
                activeTab={activeTab}
                workspaceId={workspaceId}
                roomName={roomName}
            />
        </div>
    );
}

export default RightPanelContent;