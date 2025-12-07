// src/ui/react/components/panels/FloatingPanel/AllFloatingPanels.jsx
// Renders all floating panels at the app level
// This component should be placed inside FloatingPanelProvider

import React, { useCallback } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { useFloatingPanels } from './FloatingPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';

// Left panel tab content components
import { FilesPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/FilesTab';
import { DatasetsPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/DatasetsTab';
import { InstanceToolsPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/InstanceToolsTab';
import { LayoutPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/LayoutTab';
import { AnnotationsPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/AnnotationsTab';
import { CursorsPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/CursorsTab';
import { BookmarksFiltersPanelContent } from '@UI/react/components/panels/LeftPanel/tabs/BookmarksFiltersTab';
import { LEFT_PANEL_TABS } from '@UI/react/components/panels/LeftPanel/LeftPanelContext';

// Right panel tab content components
import { PeoplePanelContent } from '@UI/react/components/panels/RightPanel/tabs/PeopleTab';
import { RoomsPanelContent } from '@UI/react/components/panels/RightPanel/tabs/RoomsTab';
import { ChatPanelContent } from '@UI/react/components/panels/RightPanel/tabs/ChatTab';
import { VoicePanelContent } from '@UI/react/components/panels/RightPanel/tabs/VoiceTab';
import { NotesPanelContent } from '@UI/react/components/panels/RightPanel/tabs/NotesTab';
import { RecordingsPanelContent } from '@UI/react/components/panels/RightPanel/tabs/RecordingsTab';
import { ActivityPanelContent } from '@UI/react/components/panels/RightPanel/tabs/ActivityTab';
import { RIGHT_PANEL_TABS } from '@UI/react/components/panels/RightPanel/RightPanelContext';

/**
 * Render content for a left panel tab
 */
function renderLeftTabContent(tabId, workspaceId) {
    switch (tabId) {
        case 'files':
            return <FilesPanelContent workspaceId={workspaceId} />;
        case 'datasets':
            return <DatasetsPanelContent workspaceId={workspaceId} />;
        case 'tools':
            return <InstanceToolsPanelContent workspaceId={workspaceId} />;
        case 'layout':
            return <LayoutPanelContent workspaceId={workspaceId} />;
        case 'annotations':
            return <AnnotationsPanelContent workspaceId={workspaceId} />;
        case 'cursors':
            return <CursorsPanelContent workspaceId={workspaceId} />;
        case 'bookmarks':
            return <BookmarksFiltersPanelContent workspaceId={workspaceId} />;
        default:
            return <div>Unknown tab: {tabId}</div>;
    }
}

/**
 * Render content for a right panel tab
 */
function renderRightTabContent(tabId, workspaceId, roomName) {
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
            return <div>Unknown tab: {tabId}</div>;
    }
}

/**
 * AllFloatingPanels - Renders all floating panels at the app level
 *
 * This should be placed inside FloatingPanelProvider but outside of
 * ThreeEdgeLayout so floating panels persist even when docked panels are closed.
 *
 * @param {string} workspaceId - Current workspace ID
 * @param {string} roomName - Current room name (for voice chat)
 */
export function AllFloatingPanels({ workspaceId = 'default', roomName }) {
    const { floatingPanels, dockPanel } = useFloatingPanels();
    const { setLeftOpen, setRightOpen } = useLayoutContext();

    // Handle docking - re-open the appropriate panel
    const handleDock = useCallback((panelId) => {
        dockPanel(panelId);
        // Re-open the docked panel when docking a floating one
        if (panelId.startsWith('left-')) {
            setLeftOpen(true);
        } else if (panelId.startsWith('right-')) {
            setRightOpen(true);
        }
    }, [dockPanel, setLeftOpen, setRightOpen]);

    const panels = Object.values(floatingPanels);

    if (panels.length === 0) {
        return null;
    }

    return (
        <>
            {panels.map(panel => {
                const isLeftPanel = panel.id.startsWith('left-');
                const tabId = isLeftPanel
                    ? panel.id.replace('left-', '')
                    : panel.id.replace('right-', '');

                // Get tab config for icon and color
                const tabConfig = isLeftPanel
                    ? LEFT_PANEL_TABS.find(t => t.id === tabId)
                    : RIGHT_PANEL_TABS.find(t => t.id === tabId);

                const Icon = tabConfig?.icon;
                const color = tabConfig?.color || 'blue';
                const title = tabConfig?.label || tabId;

                // Render content based on panel type
                const content = isLeftPanel
                    ? renderLeftTabContent(tabId, workspaceId)
                    : renderRightTabContent(tabId, workspaceId, roomName);

                return (
                    <FloatingPanel
                        key={panel.id}
                        panelId={panel.id}
                        title={title}
                        icon={Icon}
                        color={color}
                        onDock={() => handleDock(panel.id)}
                    >
                        {content}
                    </FloatingPanel>
                );
            })}
        </>
    );
}

export default AllFloatingPanels;