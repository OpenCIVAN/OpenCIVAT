// src/ui/react/components/panels/LeftPanel/LeftActivityBar.jsx
// Activity bar icons for the left panel
// Renders in ThreeEdgeLayout's left activity bar slot
//
// IMPORTANT: Uses existing class names from LeftPanel.scss to preserve styles

import React from 'react';
import { PanelLeftClose, ChevronRight } from 'lucide-react';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';
// Uses existing styles from LeftPanel.scss - no separate SCSS needed
import './LeftPanel.scss';

// =============================================================================
// LEFT ACTIVITY BAR
// =============================================================================

/**
 * LeftActivityBar - Vertical icon navigation for panel tabs
 * Fixed width (48px), always visible even when panel is collapsed.
 *
 * Props are injected by ThreeEdgeLayout via React.cloneElement:
 * @param {boolean} isOpen - Whether the panel content is expanded
 * @param {Function} onToggle - Callback to toggle panel open/closed
 */
export function LeftActivityBar({ isOpen, onToggle }) {
    const { activeTab, setActiveTab } = useLeftPanelContext();

    // Handle tab click - if clicking active tab, toggle panel
    const handleTabClick = (tabId) => {
        if (tabId === activeTab) {
            // Clicking active tab toggles the panel
            onToggle?.();
        } else {
            // Clicking different tab - switch to it and ensure panel is open
            setActiveTab(tabId);
            if (!isOpen) {
                onToggle?.();
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
                    const Icon = tab.icon;
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
                            <Icon size={18} />
                            {!tab.implemented && (
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
                {isOpen ? <PanelLeftClose size={18} /> : <ChevronRight size={18} />}
            </button>
        </div>
    );
}

export default LeftActivityBar;