// src/ui/react/components/panels/LeftPanel/LeftActivityBar.jsx
// Activity bar icons for the left panel
// Renders in ThreeEdgeLayout's left activity bar slot
//
// Uses TabButton molecule with etched variant for consistent styling
// UPDATED: Added peek/preview support for overlay panel system

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TabButton } from '@UI/react/components/molecules';
import { useLeftPanelContext, LEFT_PANEL_TABS } from './LeftPanelContext';
import { useLayoutContext } from '@UI/react/components/layout/ThreeEdgeLayout';
import { useAdaptiveHover } from '@UI/react/hooks/useAdaptiveHover';
import { DwellIndicator } from '@UI/react/components/atoms/DwellIndicator';
import { useScratchPadFloating } from '@UI/react/components/panels/FloatingPanel';
import './LeftPanel.scss';

// =============================================================================
// TAB BUTTON WITH PEEK SUPPORT
// =============================================================================

/**
 * PeekableTabButton - TabButton wrapper with hover peek functionality
 */
function PeekableTabButton({ tab, isActive, isPeeking, onClick, onPeekStart, onPeekEnd, children }) {
    const tabRef = useRef(null);

    const { dwellProgress } = useAdaptiveHover(tabRef, {
        onHoverStart: () => onPeekStart?.(tab.id),
        onHoverEnd: () => onPeekEnd?.(tab.id),
    });

    return (
        <div ref={tabRef} className="left-panel__activity-btn-wrapper" data-hover-id={`left-tab-${tab.id}`}>
            <TabButton
                icon={tab.icon}
                label={tab.label}
                color={tab.color}
                variant="etched"
                iconOnly
                active={isActive || isPeeking}
                onClick={onClick}
                className={isPeeking ? 'peeking' : ''}
            />
            {children}
            <DwellIndicator progress={dwellProgress} size={32} />
        </div>
    );
}

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
    const {
        leftOpen: isOpen,
        setLeftOpen,
        leftPeekingTab,
        startPeek,
        endPeek,
    } = useLayoutContext();

    // Peek handlers for overlay panel preview
    const handlePeekStart = useCallback((tabId) => {
        startPeek?.('left', tabId);
    }, [startPeek]);

    const handlePeekEnd = useCallback((tabId) => {
        endPeek?.('left');
    }, [endPeek]);

    // Scratchpad uses FloatingPanelContext directly
    const { isOpen: scratchpadOpen, toggle: toggleScratchpad } = useScratchPadFloating();

    // Canvas Ops uses the event-based popout system
    const [canvasOpsOpen, setCanvasOpsOpen] = useState(false);

    useEffect(() => {
        const handlePopoutChange = (e) => {
            const { popoutId, isOpen } = e.detail || {};
            if (popoutId === 'canvasOps') setCanvasOpsOpen(isOpen);
        };
        window.addEventListener('cia:popout-state-change', handlePopoutChange);
        return () => window.removeEventListener('cia:popout-state-change', handlePopoutChange);
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

    // SIMPLIFIED MODE: hide tabs that aren't ready yet
    const SIMPLIFIED_HIDDEN_TABS = new Set(['datasets']);

    return (
        // data-color attribute controls the colored indicator line on the activity bar
        <div className="left-panel__activity-bar" data-color={activeColor}>
            {/* Tab buttons */}
            <div className="left-panel__activity-tabs">
                {LEFT_PANEL_TABS.filter(tab => !SIMPLIFIED_HIDDEN_TABS.has(tab.id)).map((tab) => {
                    const isActive = activeTab === tab.id;
                    const isPeeking = leftPeekingTab === tab.id;

                    return (
                        <PeekableTabButton
                            key={tab.id}
                            tab={tab}
                            isActive={isActive}
                            isPeeking={isPeeking}
                            onClick={() => handleTabClick(tab.id)}
                            onPeekStart={handlePeekStart}
                            onPeekEnd={handlePeekEnd}
                        >
                            {/* "Soon" badge for unimplemented tabs */}
                            {tab.implemented === false && (
                                <span className="left-panel__activity-badge">Soon</span>
                            )}
                        </PeekableTabButton>
                    );
                })}
            </div>

            {/* Spacer pushes bottom items down */}
            <div className="left-panel__activity-spacer" />

            {/* SIMPLIFIED MODE: Notes and Canvas Operations hidden until those features are stable */}
            {false && (
            <div className="left-panel__activity-bottom">
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
            )}

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
