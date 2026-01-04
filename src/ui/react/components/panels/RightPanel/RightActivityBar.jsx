// src/ui/react/components/panels/RightPanel/RightActivityBar.jsx
// Activity bar icons for the right panel
// Renders in ThreeEdgeLayout's right activity bar slot
//
// Uses TabButton molecule with etched variant for consistent styling

import React from 'react';
import { TabButton } from '@UI/react/components/molecules';
import { useRightPanelContext, RIGHT_PANEL_TABS } from './RightPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
import './RightPanel.scss';

// =============================================================================
// RIGHT ACTIVITY BAR
// =============================================================================

/**
 * RightActivityBar - Vertical icon navigation for panel tabs
 * Fixed width (48px), always visible even when panel is collapsed.
 *
 * Uses TabButton molecule with etched variant for the recessed button style.
 * Uses LayoutContext from ThreeEdgeLayout to control panel open/close state.
 */
export function RightActivityBar() {
    const { activeTab, setActiveTab } = useRightPanelContext();
    const { rightOpen: isOpen, setRightOpen } = useLayoutContext();

    // Toggle the panel open/closed
    const onToggle = () => setRightOpen(!isOpen);

    // Handle tab click - if clicking active tab, toggle panel
    const handleTabClick = (tabId) => {
        if (tabId === activeTab) {
            // Clicking active tab toggles the panel
            onToggle();
        } else {
            // Clicking different tab - switch to it and ensure panel is open
            setActiveTab(tabId);
            if (!isOpen) {
                setRightOpen(true);
            }
        }
    };

    // Get active tab's color for the indicator line
    const activeTabConfig = RIGHT_PANEL_TABS.find(tab => tab.id === activeTab);
    const activeColor = activeTabConfig?.color || 'pink';

    return (
        // data-color attribute controls the colored indicator line on the activity bar
        <div className="right-panel__activity-bar" data-color={activeColor}>
            {/* Tab buttons */}
            <div className="right-panel__activity-tabs">
                {RIGHT_PANEL_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <div key={tab.id} className="right-panel__activity-btn-wrapper">
                            <TabButton
                                icon={tab.icon}
                                label={tab.label}
                                color={tab.color}
                                variant="etched"
                                iconOnly
                                active={isActive}
                                onClick={() => handleTabClick(tab.id)}
                            />
                            {/* "Soon" badge for unimplemented tabs */}
                            {tab.implemented === false && (
                                <span className="right-panel__activity-badge">Soon</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Spacer pushes toggle to bottom */}
            <div className="right-panel__activity-spacer" />

            {/* Toggle panel button at bottom */}
            <TabButton
                icon={isOpen ? 'panelRightClose' : 'chevronLeft'}
                label={isOpen ? 'Collapse Panel' : 'Expand Panel'}
                variant="etched"
                iconOnly
                onClick={onToggle}
                className="right-panel__toggle-btn"
            />
        </div>
    );
}

export default RightActivityBar;