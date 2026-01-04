/**
 * @file RightPanelContent.jsx
 * @description Expandable content for the right panel.
 * Renders in ThreeEdgeLayout's right panel content slot.
 * Supports pop-out to floating panel with space reclamation.
 *
 * Uses centralized tab rendering from RightPanelContext.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registry.
 */

import React, { useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

import {
    useRightPanelContext,
    RIGHT_PANEL_TABS,
    renderRightPanelTabContent
} from './RightPanelContext';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';

// Ensure tab components are registered
import './RightPanelTabRegistry';

// Uses existing styles from RightPanel.scss
import './RightPanel.scss';

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
 * @param {Object} props
 * @param {string} [props.workspaceId='default'] - Current workspace ID
 * @param {string} [props.roomId] - Current room ID (for filtering presence)
 * @param {string} [props.roomName] - Current room name (for voice chat display)
 */
export function RightPanelContent({ workspaceId = 'default', roomId, roomName }) {
    const { activeTab } = useRightPanelContext();
    const { popOutPanel, isPoppedOut } = useFloatingPanels();
    const { setRightOpen } = useLayoutContext();

    // Get current tab config from the single source of truth
    const currentTab = RIGHT_PANEL_TABS.find(t => t.id === activeTab);
    const iconName = currentTab?.icon;

    // Check if current tab is already popped out
    const panelId = `right-${activeTab}`;
    const isCurrentTabFloating = isPoppedOut(panelId);

    // Handle pop-out - close docked panel to reclaim space
    const handlePopOut = useCallback(() => {
        popOutPanel(panelId, {
            title: currentTab?.label,
            icon: iconName,
            color: currentTab?.color,
            // Position on the right side of screen
            x: window.innerWidth - 500,
            y: 100,
            width: 400,
            height: 600,
        });
        // Collapse the docked panel to reclaim workspace space
        setRightOpen(false);
    }, [panelId, currentTab, iconName, popOutPanel, setRightOpen]);

    // If the current tab is floating, show a message to select another tab
    if (isCurrentTabFloating) {
        return (
            <div
                className="right-panel__content right-panel__content--tab-floating"
                data-color={currentTab?.color}
            >
                <div className="right-panel__floating-notice">
                    {iconName && <Icon name={iconName} size={20} />}
                    <span>{currentTab?.label} is floating</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="right-panel__content"
            data-active-tab={activeTab}
            data-color={currentTab?.color}
        >
            {/* Mini toolbar with pop-out button - matches left panel pattern */}
            <div className="right-panel__toolbar">
                <button
                    className="right-panel__pop-out-btn"
                    onClick={handlePopOut}
                    title="Pop out to floating window"
                >
                    <Icon name="externalLink" size={12} />
                </button>
            </div>

            {/*
             * Tab content - rendered via centralized registry
             * Each tab component has its own header (panel-header)
             * NO switch statement here - all routing handled by renderRightPanelTabContent
             */}
            {renderRightPanelTabContent(activeTab, {
                workspaceId,
                roomId,
                roomName,
                projectId: workspaceId, // For SettingsTab
            })}
        </div>
    );
}

export default RightPanelContent;