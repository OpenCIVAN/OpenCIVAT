// src/ui/react/components/panels/LeftPanel/LeftActivityBar.jsx
// Activity bar icons for the left panel
// Renders in ThreeEdgeLayout's left activity bar slot
//
// Uses TabButton molecule with etched variant for consistent styling

import React, { useState, useEffect, useCallback } from 'react';
import { TabButton } from '@UI/react/components/molecules';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
import { useNavigatorButton } from '@UI/react/components/panels/LayoutPanel';
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
 *
 * Bottom section includes Nav, Notes, and Ops buttons (moved from SecondaryFooter)
 */
export function LeftActivityBar() {
    const { activeTab, setActiveTab } = useLeftPanelContext();
    const { leftOpen: isOpen, setLeftOpen } = useLayoutContext();

    // Navigator state from context
    const { isFloating: navigatorOpen, toggleNavigator } = useNavigatorButton();

    // Track scratchpad and canvasOps state via events
    const [scratchpadOpen, setScratchpadOpen] = useState(false);
    const [canvasOpsOpen, setCanvasOpsOpen] = useState(false);

    // Listen for popout state changes from main app
    useEffect(() => {
        const handlePopoutChange = (e) => {
            const { popoutId, isOpen } = e.detail || {};
            if (popoutId === 'scratchpad') setScratchpadOpen(isOpen);
            if (popoutId === 'canvasOps') setCanvasOpsOpen(isOpen);
        };

        window.addEventListener('cia:popout-state-change', handlePopoutChange);
        return () => window.removeEventListener('cia:popout-state-change', handlePopoutChange);
    }, []);

    // Toggle popouts via events
    const toggleScratchpad = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:toggle-popout', { detail: { popoutId: 'scratchpad' } }));
    }, []);

    const toggleCanvasOps = useCallback(() => {
        window.dispatchEvent(new CustomEvent('cia:toggle-popout', { detail: { popoutId: 'canvasOps' } }));
    }, []);

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

            {/* Spacer pushes bottom items down */}
            <div className="left-panel__activity-spacer" />

            {/* Bottom items: Nav, Notes, Ops */}
            <div className="left-panel__activity-bottom">
                <TabButton
                    icon="map"
                    label="Navigator"
                    color="teal"
                    variant="etched"
                    iconOnly
                    active={navigatorOpen}
                    onClick={toggleNavigator}
                />
                <TabButton
                    icon="stickyNote"
                    label="Notes"
                    color="amber"
                    variant="etched"
                    iconOnly
                    active={scratchpadOpen}
                    onClick={toggleScratchpad}
                />
                <TabButton
                    icon="sliders"
                    label="Canvas Operations"
                    color="blue"
                    variant="etched"
                    iconOnly
                    active={canvasOpsOpen}
                    onClick={toggleCanvasOps}
                />

                <div className="left-panel__activity-divider" />
            </div>

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