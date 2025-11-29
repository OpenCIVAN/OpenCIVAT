// src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.jsx
// Main layout orchestrator for the three-edge panel system
// Provides left panel, center workspace, and right panel with resize capabilities
// Updated: Added secondary bar slots with zone-aligned layout

import React, { useMemo } from 'react';
import { ResizablePanel } from '@UI/react/components/layout/ResizablePanel';
import { useLayoutState, usePanelPersistence, PANEL_CONSTRAINTS } from './ThreeEdgeLayout.logic.js';
import './ThreeEdgeLayout.scss';

/**
 * ThreeEdgeLayout - Main application layout container
 * 
 * Manages three resizable panels:
 * - Left: Datasets, Files, Quick Access
 * - Center: WorkspaceGrid (main visualization area)
 * - Right: Collaboration features (chat, presence, etc.)
 * 
 * Features:
 * - Panels collapse to activity bars (48px)
 * - Drag-to-resize with constraints
 * - State persists across sessions
 * - Smooth animations
 * - Secondary bars with zones aligned to panel widths
 * 
 * @example
 * <ThreeEdgeLayout
 *   topBar={<TopBar />}
 *   secondaryTopBar={<SecondaryTopBar />}
 *   leftPanel={<DatasetsPanel />}
 *   centerPanel={<WorkspaceGrid />}
 *   rightPanel={<CollaborationPanel />}
 *   secondaryBottomBar={<SecondaryBottomBar />}
 *   bottomBar={<StatusBar />}
 * />
 */
export function ThreeEdgeLayout({
    topBar,
    secondaryTopBar,
    leftPanel,
    centerPanel,
    rightPanel,
    secondaryBottomBar,
    bottomBar
}) {
    // Layout state management
    const {
        leftOpen,
        setLeftOpen,
        rightOpen,
        setRightOpen,
        leftWidth,
        setLeftWidth,
        rightWidth,
        setRightWidth
    } = useLayoutState();

    // Persist state to localStorage
    usePanelPersistence({
        leftOpen,
        rightOpen,
        leftWidth,
        rightWidth
    });

    // Calculate actual widths for secondary bar zones
    const layoutDimensions = useMemo(() => ({
        leftPanelWidth: leftOpen ? leftWidth : PANEL_CONSTRAINTS.left.collapsed,
        rightPanelWidth: rightOpen ? rightWidth : PANEL_CONSTRAINTS.right.collapsed,
        leftPanelOpen: leftOpen,
        rightPanelOpen: rightOpen,
    }), [leftOpen, leftWidth, rightOpen, rightWidth]);

    // Context value for child components
    const contextValue = useMemo(() => ({
        leftOpen,
        setLeftOpen,
        rightOpen,
        setRightOpen,
        leftWidth,
        rightWidth,
        ...layoutDimensions
    }), [leftOpen, setLeftOpen, rightOpen, setRightOpen, leftWidth, rightWidth, layoutDimensions]);

    // Clone secondary bars with layout dimensions
    const renderSecondaryBar = (bar, position) => {
        if (!bar) return null;

        return React.cloneElement(bar, {
            leftPanelWidth: layoutDimensions.leftPanelWidth,
            rightPanelWidth: layoutDimensions.rightPanelWidth,
            leftPanelOpen: layoutDimensions.leftPanelOpen,
            rightPanelOpen: layoutDimensions.rightPanelOpen,
        });
    };

    return (
        <LayoutContext.Provider value={contextValue}>
            <div className="three-edge-layout">
                {/* Top Bar (Header) */}
                {topBar && (
                    <div className="three-edge-layout__top">
                        {topBar}
                    </div>
                )}

                {/* Secondary Top Bar (Workspace selector, controls) */}
                {secondaryTopBar && (
                    <div className="three-edge-layout__secondary-top">
                        {renderSecondaryBar(secondaryTopBar, 'top')}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="three-edge-layout__main">
                    {/* Left Panel */}
                    <ResizablePanel
                        side="left"
                        isOpen={leftOpen}
                        onToggle={() => setLeftOpen(!leftOpen)}
                        width={leftWidth}
                        onWidthChange={setLeftWidth}
                    >
                        {leftPanel}
                    </ResizablePanel>

                    {/* Center Panel (Workspace) */}
                    <div className="three-edge-layout__center">
                        {centerPanel}
                    </div>

                    {/* Right Panel */}
                    <ResizablePanel
                        side="right"
                        isOpen={rightOpen}
                        onToggle={() => setRightOpen(!rightOpen)}
                        width={rightWidth}
                        onWidthChange={setRightWidth}
                    >
                        {rightPanel}
                    </ResizablePanel>
                </div>

                {/* Secondary Bottom Bar (Canvas position, voice controls) */}
                {secondaryBottomBar && (
                    <div className="three-edge-layout__secondary-bottom">
                        {renderSecondaryBar(secondaryBottomBar, 'bottom')}
                    </div>
                )}

                {/* Bottom Bar (Status) */}
                {bottomBar && (
                    <div className="three-edge-layout__bottom">
                        {bottomBar}
                    </div>
                )}
            </div>
        </LayoutContext.Provider>
    );
}

/**
 * Context for panels to access layout state
 * Allows child components to trigger panel actions and access dimensions
 * 
 * @property {boolean} leftOpen - Is left panel expanded
 * @property {Function} setLeftOpen - Toggle left panel
 * @property {boolean} rightOpen - Is right panel expanded
 * @property {Function} setRightOpen - Toggle right panel
 * @property {number} leftWidth - Current left panel width (when expanded)
 * @property {number} rightWidth - Current right panel width (when expanded)
 * @property {number} leftPanelWidth - Actual current width (accounts for collapsed state)
 * @property {number} rightPanelWidth - Actual current width (accounts for collapsed state)
 * @property {boolean} leftPanelOpen - Alias for leftOpen
 * @property {boolean} rightPanelOpen - Alias for rightOpen
 */
export const LayoutContext = React.createContext({
    leftOpen: true,
    setLeftOpen: () => { },
    rightOpen: true,
    setRightOpen: () => { },
    leftWidth: PANEL_CONSTRAINTS.left.default,
    rightWidth: PANEL_CONSTRAINTS.right.default,
    leftPanelWidth: PANEL_CONSTRAINTS.left.default,
    rightPanelWidth: PANEL_CONSTRAINTS.right.default,
    leftPanelOpen: true,
    rightPanelOpen: true,
});

/**
 * Hook for child components to access layout state
 * 
 * @example
 * const { leftOpen, setLeftOpen, leftPanelWidth } = useLayoutContext();
 */
export function useLayoutContext() {
    return React.useContext(LayoutContext);
}