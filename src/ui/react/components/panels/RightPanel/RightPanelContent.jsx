// src/ui/react/components/panels/RightPanel/RightPanelContent.jsx
// Expandable content for the right panel
// Renders in ThreeEdgeLayout's right panel content slot
// Supports pop-out to floating panel
//
// IMPORTANT: Uses existing class names from RightPanel.scss to preserve styles

import React, { useCallback } from 'react';
import { useRightPanelContext, RIGHT_PANEL_TABS } from './RightPanelContext';
import { FloatingPanel, usePanelPopOut } from '@UI/react/components/panels/FloatingPanel';

// Tab content components
import { PeoplePanelContent } from './tabs/PeopleTab';
import { RoomsPanelContent } from './tabs/RoomsTab';
import { ChatPanelContent } from './tabs/ChatTab';
import { VoicePanelContent } from './tabs/VoiceTab';
import { NotesPanelContent } from './tabs/NotesTab';
import { RecordingsPanelContent } from './tabs/RecordingsTab';
import { ActivityPanelContent } from './tabs/ActivityTab';

// Icons for pop-out button
import { ExternalLink, Pin } from 'lucide-react';

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
 * Supports pop-out to floating window for flexible positioning.
 *
 * @param {string} workspaceId - Current workspace ID
 * @param {string} roomName - Current room name (for voice chat)
 */
export function RightPanelContent({ workspaceId = 'default', roomName }) {
    const { activeTab } = useRightPanelContext();
    const tabConfig = RIGHT_PANEL_TABS.find(t => t.id === activeTab);
    const Icon = tabConfig?.icon;

    // Pop-out functionality - unique ID per tab
    const panelId = `right-${activeTab}`;
    const { poppedOut, popOut, dock } = usePanelPopOut(panelId, {
        title: tabConfig?.label,
        icon: Icon,
        color: tabConfig?.color,
    });

    // Render tab content
    const renderContent = useCallback(() => (
        <TabContent
            activeTab={activeTab}
            workspaceId={workspaceId}
            roomName={roomName}
        />
    ), [activeTab, workspaceId, roomName]);

    // Handle pop-out click
    const handlePopOut = () => {
        // Position on the right side of screen
        popOut({
            x: window.innerWidth - 500,
            y: 100,
            width: 400,
            height: 600
        });
    };

    // If popped out, render as floating panel
    if (poppedOut) {
        return (
            <>
                {/* Show placeholder in docked position */}
                <div
                    className="right-panel__content right-panel__content--popped-out"
                    data-color={tabConfig?.color}
                >
                    <div className="right-panel__popped-out-placeholder">
                        {Icon && <Icon size={24} />}
                        <span>{tabConfig?.label} (floating)</span>
                        <button
                            className="right-panel__dock-btn"
                            onClick={dock}
                            title="Dock panel"
                        >
                            <Pin size={14} />
                            Dock
                        </button>
                    </div>
                </div>

                {/* Floating panel */}
                <FloatingPanel
                    panelId={panelId}
                    title={tabConfig?.label}
                    icon={Icon}
                    color={tabConfig?.color}
                    onDock={dock}
                >
                    {renderContent()}
                </FloatingPanel>
            </>
        );
    }

    return (
        // Uses existing .right-panel__content class from RightPanel.scss
        <div
            className="right-panel__content"
            data-color={tabConfig?.color}
        >
            {/* Panel header with title and pop-out button */}
            <div className="right-panel__header">
                {Icon && <Icon size={16} className="right-panel__header-icon" />}
                <span className="right-panel__header-title">{tabConfig?.label}</span>
                <button
                    className="right-panel__pop-out-btn"
                    onClick={handlePopOut}
                    title="Pop out panel"
                >
                    <ExternalLink size={14} />
                </button>
            </div>

            {/* Tab content */}
            <div className="right-panel__body">
                {renderContent()}
            </div>
        </div>
    );
}

export default RightPanelContent;