// src/ui/react/components/panels/LeftPanel/LeftActivityBar.jsx
// Activity bar icons for the left panel
// Renders in ThreeEdgeLayout's left activity bar slot
//
// IMPORTANT: Uses existing class names from LeftPanel.scss to preserve styles
// FIX: Changed `!tab.implemented` to `tab.implemented === false` to only show
//      "Soon" badge when explicitly marked as not implemented

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
// Uses existing styles from LeftPanel.scss - no separate SCSS needed
import './LeftPanel.scss';

// =============================================================================
// LEFT ACTIVITY BAR
// =============================================================================

/**
 * LeftActivityBar - Vertical icon navigation for panel tabs
 * Fixed width (48px), always visible even when panel is collapsed.
 *
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
        // Uses existing .left-panel__activity-bar class from LeftPanel.scss
        // data-color attribute controls the colored indicator line on the activity bar
        <div className="left-panel__activity-bar" data-color={activeColor}>
            {/* Tab buttons */}
            <div className="left-panel__activity-tabs">
                {LEFT_PANEL_TABS.map((tab) => {
                    const iconName = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            className={`left-panel__activity-btn ${isActive ? 'active' : ''}`}
                            data-color={tab.color}
                            onClick={() => handleTabClick(tab.id)}
                            title={tab.label}
                            aria-label={tab.label}
                            aria-selected={isActive}
                        >
                            <Icon name={iconName} size={18} />
                            {/* FIX: Only show "Soon" if explicitly set to false */}
                            {tab.implemented === false && (
                                <span className="left-panel__activity-badge">Soon</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Spacer pushes toggle to bottom */}
            <div className="left-panel__activity-spacer" />

            {/* Toggle panel button at bottom */}
            <button
                className="left-panel__activity-btn left-panel__toggle-btn"
                onClick={onToggle}
                title={isOpen ? 'Collapse Panel' : 'Expand Panel'}
                aria-label={isOpen ? 'Collapse Panel' : 'Expand Panel'}
            >
                {isOpen ? <Icon name="panelLeftClose" size={18} /> : <Icon name="chevronRight" size={18} />}
            </button>
        </div>
    );
}

export default LeftActivityBar;