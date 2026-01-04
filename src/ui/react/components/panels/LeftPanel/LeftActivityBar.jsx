// src/ui/react/components/panels/LeftPanel/LeftActivityBar.jsx
// Activity bar icons for the left panel
// Renders in ThreeEdgeLayout's left activity bar slot
//
// Uses TabButton molecule with etched variant for consistent styling

import React from 'react';
import { TabButton } from '@UI/react/components/molecules';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
import './LeftPanel.scss';

// =============================================================================
// LEFT ACTIVITY BAR
// =============================================================================

/**
 * LeftActivityBar - Vertical icon navigation for panel tabs
 * Fixed width (48px), always visible even when panel is collapsed.
 *
 * Uses TabButton molecule with etched variant for the recessed button style.
 * Uses LayoutContext from ThreeEdgeLayout to control panel open/close state.
 */
export function LeftActivityBar() {
    const { activeTab, setActiveTab } = useLeftPanelContext();
    const { leftOpen: isOpen, setLeftOpen } = useLayoutContext();

    // Toggle the panel open/closed
    const onToggle = () => setLeftOpen(!isOpen);

    // Handle tab click - if clicking active tab, toggle panel
    const handleTabClick = (tabId) => {
        if (tabId === activeTab) {
            // Clicking active tab toggles the panel
            onToggle();
        } else {
            // Clicking different tab - switch to it and ensure panel is open
            setActiveTab(tabId);
            if (!isOpen) {
                setLeftOpen(true);
            }
        }
    };

    // Get active tab's color for the indicator line
    const activeTabConfig = LEFT_PANEL_TABS.find(tab => tab.id === activeTab);
    const activeColor = activeTabConfig?.color || 'blue';

    return (
        // data-color attribute controls the colored indicator line on the activity bar
        <div className="left-panel__activity-bar" data-color={activeColor}>
            {/* Tab buttons */}
            <div className="left-panel__activity-tabs">
                {LEFT_PANEL_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <div key={tab.id} className="left-panel__activity-btn-wrapper">
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
                                <span className="left-panel__activity-badge">Soon</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Spacer pushes toggle to bottom */}
            <div className="left-panel__activity-spacer" />

            {/* Toggle panel button at bottom */}
            <TabButton
                icon={isOpen ? 'panelLeftClose' : 'chevronRight'}
                label={isOpen ? 'Collapse Panel' : 'Expand Panel'}
                variant="etched"
                iconOnly
                onClick={onToggle}
                className="left-panel__toggle-btn"
            />
        </div>
    );
}

export default LeftActivityBar;