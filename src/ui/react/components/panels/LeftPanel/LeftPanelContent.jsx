/**
 * @file LeftPanelContent.jsx
 * @description Expandable content for the left panel.
 * Renders in ThreeEdgeLayout's left panel content slot.
 * Supports pop-out to floating panel with space reclamation.
 *
 * Uses centralized tab rendering from LeftPanelContext.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registry.
 */

import React, { useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

import {
    useLeftPanelContext,
    LEFT_PANEL_TABS,
    renderLeftPanelTabContent
} from './LeftPanelContext';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';

// Ensure tab components are registered
import './LeftPanelTabRegistry';

// Uses existing styles from LeftPanel.scss
import './LeftPanel.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * LeftPanelContent - Expandable content for the left panel
 *
 * Rendered inside ThreeEdgeLayout's content row when panel is open.
 * Contains the actual tab content (files, datasets, tools, etc).
 * Supports pop-out to floating window for flexible positioning.
 *
 * Note: Floating panels are rendered at the app level (AllFloatingPanels),
 * not here, so they persist even when the docked panel is closed.
 *
 * @param {Object} props
 * @param {string} [props.workspaceId='default'] - Current workspace ID
 */
export function LeftPanelContent({ workspaceId = 'default' }) {
    const { activeTab, navigateToPanel } = useLeftPanelContext();
    const { popOutPanel, isPoppedOut } = useFloatingPanels();
    const { setLeftOpen } = useLayoutContext();

    // Get current tab config from the single source of truth
    const currentTab = LEFT_PANEL_TABS.find(t => t.id === activeTab) || LEFT_PANEL_TABS[0];
    const iconName = currentTab.icon;

    // Check if current tab is already popped out
    const panelId = `left-${activeTab}`;
    const isCurrentTabFloating = isPoppedOut(panelId);

    // Handle pop-out - close docked panel to reclaim space
    const handlePopOut = useCallback(() => {
        popOutPanel(panelId, {
            title: currentTab.label,
            icon: iconName,
            color: currentTab.color,
            x: 100,
            y: 100,
            width: 400,
            height: 600,
        });
        // Collapse the docked panel to reclaim workspace space
        setLeftOpen(false);
    }, [panelId, currentTab, iconName, popOutPanel, setLeftOpen]);

    // If the current tab is floating, show a message to select another tab
    if (isCurrentTabFloating) {
        return (
            <div
                className="left-panel__content left-panel__content--tab-floating"
                data-active-tab={activeTab}
            >
                <div className="left-panel__floating-notice">
                    <Icon name={iconName} size={20} />
                    <span>{currentTab.label} is floating</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="left-panel__content"
            data-active-tab={activeTab}
            data-color={currentTab.color}
        >
            {/* Mini toolbar with pop-out button */}
            <div className="left-panel__toolbar">
                <button
                    className="left-panel__pop-out-btn"
                    onClick={handlePopOut}
                    title="Pop out to floating window"
                >
                    <Icon name="externalLink" size={12} />
                </button>
            </div>

            {/* 
             * Tab content - rendered via centralized registry
             * NO switch statement here - all routing handled by renderLeftPanelTabContent
             */}
            {renderLeftPanelTabContent(activeTab, {
                workspaceId,
                onNavigateToPanel: navigateToPanel
            })}
        </div>
    );
}

export default LeftPanelContent;