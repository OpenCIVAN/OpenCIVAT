/**
 * @file AllFloatingPanels.jsx
 * @description Renders all floating panels at the app level.
 * This component should be placed inside FloatingPanelProvider.
 * 
 * Uses centralized tab rendering from panel contexts.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registries.
 */

import React, { useCallback } from 'react';
import { FloatingPanel } from './FloatingPanel';
import { useFloatingPanels } from './FloatingPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';

// Import centralized renderers and tab configs
import {
    LEFT_PANEL_TABS,
    renderLeftPanelTabContent
} from '@UI/react/components/panels/LeftPanel/LeftPanelContext';
import {
    RIGHT_PANEL_TABS,
    renderRightPanelTabContent
} from '@UI/react/components/panels/RightPanel/RightPanelContext';

// Ensure tab components are registered
import '@UI/react/components/panels/LeftPanel/LeftPanelTabRegistry';
import '@UI/react/components/panels/RightPanel/RightPanelTabRegistry';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AllFloatingPanels - Renders floating versions of panel tabs
 * 
 * Placed at the app level to ensure panels persist even when docked panels close.
 * Uses centralized renderers - no local switch statements.
 * 
 * @param {Object} props
 * @param {string} [props.workspaceId='default'] - Current workspace ID
 * @param {string} [props.roomId] - Current room ID
 * @param {string} [props.roomName] - Current room name
 */
export function AllFloatingPanels({
    workspaceId = 'default',
    roomId,
    roomName,
}) {
    const { floatingPanels, dockPanel, updatePanelPosition } = useFloatingPanels();
    const { setLeftOpen, setRightOpen } = useLayoutContext();

    // Convert floatingPanels object to array for mapping
    const openPanels = Object.values(floatingPanels || {});

    // Handle dock back to left panel
    const handleDockToLeft = useCallback((panelId) => {
        dockPanel(panelId);
        setLeftOpen(true);
    }, [dockPanel, setLeftOpen]);

    // Handle dock back to right panel
    const handleDockToRight = useCallback((panelId) => {
        dockPanel(panelId);
        setRightOpen(true);
    }, [dockPanel, setRightOpen]);

    // Render content for a panel based on its type
    const renderPanelContent = useCallback((panel) => {
        const [side, tabId] = panel.id.split('-');

        if (side === 'left') {
            // Use centralized left panel renderer
            return renderLeftPanelTabContent(tabId, {
                workspaceId,
                // Note: navigateToPanel not needed in floating context
            });
        } else if (side === 'right') {
            // Use centralized right panel renderer
            return renderRightPanelTabContent(tabId, {
                workspaceId,
                roomId,
                roomName,
                projectId: workspaceId,
            });
        }

        return null;
    }, [workspaceId, roomId, roomName]);

    // Get tab config for a panel
    const getTabConfig = useCallback((panelId) => {
        const [side, tabId] = panelId.split('-');

        if (side === 'left') {
            return LEFT_PANEL_TABS.find(t => t.id === tabId);
        } else if (side === 'right') {
            return RIGHT_PANEL_TABS.find(t => t.id === tabId);
        }

        return null;
    }, []);

    // Determine dock handler based on panel type
    const getDockHandler = useCallback((panelId) => {
        const [side] = panelId.split('-');
        return side === 'left' ? handleDockToLeft : handleDockToRight;
    }, [handleDockToLeft, handleDockToRight]);

    return (
        <>
            {openPanels.map((panel) => {
                const tabConfig = getTabConfig(panel.id);
                const Icon = panel.icon || tabConfig?.icon;

                return (
                    <FloatingPanel
                        key={panel.id}
                        id={panel.id}
                        title={panel.title || tabConfig?.label}
                        icon={Icon}
                        color={panel.color || tabConfig?.color}
                        x={panel.x}
                        y={panel.y}
                        width={panel.width}
                        height={panel.height}
                        onClose={() => dockPanel(panel.id)}
                        onDock={() => getDockHandler(panel.id)(panel.id)}
                        onPositionChange={(x, y) => updatePanelPosition(panel.id, x, y)}
                    >
                        {renderPanelContent(panel)}
                    </FloatingPanel>
                );
            })}
        </>
    );
}

export default AllFloatingPanels;