// src/ui/react/components/panels/RightPanel/RightActivityBar.jsx
// Activity bar icons for the right panel
// Renders in ThreeEdgeLayout's right activity bar slot
//
// IMPORTANT: Uses existing class names from RightPanel.scss to preserve styles

import React from 'react';
import { PanelRightClose, ChevronLeft } from 'lucide-react';
import { useRightPanelContext, RIGHT_PANEL_TABS } from './RightPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
// Uses existing styles from RightPanel.scss - no separate SCSS needed
import './RightPanel.scss';

// =============================================================================
// RIGHT ACTIVITY BAR
// =============================================================================

/**
 * RightActivityBar - Vertical icon navigation for panel tabs
 * Fixed width (48px), always visible even when panel is collapsed.
 *
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
        // Uses existing .right-panel__activity-bar class from RightPanel.scss
        // data-color attribute controls the colored indicator line on the activity bar
        <div className="right-panel__activity-bar" data-color={activeColor}>
            {/* Tab buttons */}
            <div className="right-panel__activity-tabs">
                {RIGHT_PANEL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            className={`right-panel__activity-btn ${isActive ? 'active' : ''}`}
                            data-color={tab.color}
                            onClick={() => handleTabClick(tab.id)}
                            title={tab.label}
                            aria-label={tab.label}
                            aria-selected={isActive}
                        >
                            <Icon size={18} />
                            {!tab.implemented && (
                                <span className="right-panel__activity-badge">Soon</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Spacer pushes toggle to bottom */}
            <div className="right-panel__activity-spacer" />

            {/* Toggle panel button at bottom */}
            <button
                className="right-panel__activity-btn right-panel__toggle-btn"
                onClick={onToggle}
                title={isOpen ? 'Collapse Panel' : 'Expand Panel'}
                aria-label={isOpen ? 'Collapse Panel' : 'Expand Panel'}
            >
                {isOpen ? <PanelRightClose size={18} /> : <ChevronLeft size={18} />}
            </button>
        </div>
    );
}

export default RightActivityBar;