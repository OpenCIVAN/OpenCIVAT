// src/ui/react/components/panels/RightPanel/RightPanelContent.jsx
// Expandable content for the right panel
// Renders in ThreeEdgeLayout's right panel content slot
// Supports pop-out to floating panel with space reclamation
//
// IMPORTANT: Uses existing class names from RightPanel.scss to preserve styles

import React, { useCallback } from 'react';
import { useRightPanelContext, RIGHT_PANEL_TABS } from './RightPanelContext';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';

// Tab content components
import { PeoplePanelContent } from './tabs/PeopleTab';
import { RoomsPanelContent } from './tabs/RoomsTab';
import { ChatPanelContent } from './tabs/ChatTab';
import { VoicePanelContent } from './tabs/VoiceTab';
import { NotesPanelContent } from './tabs/NotesTab';
import { RecordingsPanelContent } from './tabs/RecordingsTab';
import { ActivityPanelContent } from './tabs/ActivityTab';

// Icons for pop-out button
import { ExternalLink } from 'lucide-react';

// Uses existing styles from RightPanel.scss - no separate SCSS needed
import './RightPanel.scss';

// =============================================================================
// TAB CONTENT RENDERER
// =============================================================================

/**
 * Render content for a specific tab
 */
function renderTabContent(tabId, workspaceId, roomName) {
    switch (tabId) {
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
            return <PlaceholderContent tabId={tabId} />;
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
 * Note: Floating panels are rendered at the app level (AllFloatingPanels),
 * not here, so they persist even when the docked panel is closed.
 *
 * @param {string} workspaceId - Current workspace ID
 * @param {string} roomName - Current room name (for voice chat)
 */
export function RightPanelContent({ workspaceId = 'default', roomName }) {
    const { activeTab } = useRightPanelContext();
    const { popOutPanel, isPoppedOut } = useFloatingPanels();
    const { setRightOpen } = useLayoutContext();

    const tabConfig = RIGHT_PANEL_TABS.find(t => t.id === activeTab);
    const Icon = tabConfig?.icon;

    // Check if current tab is already popped out
    const panelId = `right-${activeTab}`;
    const isCurrentTabFloating = isPoppedOut(panelId);

    // Handle pop-out - close docked panel to reclaim space
    const handlePopOut = useCallback(() => {
        popOutPanel(panelId, {
            title: tabConfig?.label,
            icon: Icon,
            color: tabConfig?.color,
            // Position on the right side of screen
            x: window.innerWidth - 500,
            y: 100,
            width: 400,
            height: 600,
        });
        // Collapse the docked panel to reclaim workspace space
        setRightOpen(false);
    }, [panelId, tabConfig, Icon, popOutPanel, setRightOpen]);

    // If the current tab is floating, show a message to select another tab
    if (isCurrentTabFloating) {
        return (
            <div
                className="right-panel__content right-panel__content--tab-floating"
                data-color={tabConfig?.color}
            >
                <div className="right-panel__floating-notice">
                    {Icon && <Icon size={20} />}
                    <span>{tabConfig?.label} is floating</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="right-panel__content"
            data-color={tabConfig?.color}
        >
            {/* Mini toolbar with pop-out button */}
            <div className="right-panel__toolbar">
                <button
                    className="right-panel__pop-out-btn"
                    onClick={handlePopOut}
                    title="Pop out to floating window"
                >
                    <ExternalLink size={12} />
                </button>
            </div>

            {/* Tab content - no redundant header, activity bar shows tab */}
            {renderTabContent(activeTab, workspaceId, roomName)}
        </div>
    );
}

export default RightPanelContent;