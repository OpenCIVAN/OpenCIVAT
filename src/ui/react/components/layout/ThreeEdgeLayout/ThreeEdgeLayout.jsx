// src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.jsx
// Main layout orchestrator for the three-edge panel system
// CSS Grid layout with separated activity bars and panel content

import React, { useMemo, cloneElement } from 'react';
import { useLayoutState, usePanelPersistence, PANEL_CONSTRAINTS, useResizeHandler } from './ThreeEdgeLayout.logic.js';
import './ThreeEdgeLayout.scss';

/**
 * ThreeEdgeLayout - Main application layout container
 *
 * CSS Grid layout with separated activity bars and panel content:
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                              TOP BAR                                  │
 * ├────────┬──────────┬─────────────────────┬─────────────┬──────────────┤
 * │        │ SEC-TOP  │   SEC-TOP-CENTER    │  SEC-TOP    │              │
 * │  LEFT  │  LEFT    │                     │   RIGHT     │    RIGHT     │
 * │  ACT   ├──────────┼─────────────────────┼─────────────┤    ACT       │
 * │  BAR   │  LEFT    │                     │   RIGHT     │    BAR       │
 * │        │  PANEL   │   WORKSPACE GRID    │   PANEL     │              │
 * │        ├──────────┼─────────────────────┼─────────────┤              │
 * │        │ SEC-BOT  │   SEC-BOT-CENTER    │  SEC-BOT    │              │
 * │        │  LEFT    │                     │   RIGHT     │              │
 * ├────────┴──────────┴─────────────────────┴─────────────┴──────────────┤
 * │                            STATUS BAR                                 │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Activity bars span full height (always visible)
 * - Panels collapse to activity bars (48px)
 * - Drag-to-resize with constraints
 * - State persists across sessions
 *
 * @example
 * <ThreeEdgeLayout
 *   topBar={<TopBar />}
 *   leftActivityBar={<LeftActivityBar />}
 *   leftPanelContent={<LeftPanelContent />}
 *   secondaryTopBarZones={{ left: ..., center: ..., right: ... }}
 *   centerPanel={<WorkspaceGrid />}
 *   secondaryBottomBarZones={{ left: ..., center: ..., right: ... }}
 *   rightPanelContent={<RightPanelContent />}
 *   rightActivityBar={<RightActivityBar />}
 *   bottomBar={<StatusBar />}
 * />
 */
export function ThreeEdgeLayout({
    topBar,
    centerPanel,
    bottomBar,
    leftActivityBar,
    leftPanelContent,
    rightActivityBar,
    rightPanelContent,
    secondaryTopBarZones,    // { left, center, right }
    secondaryBottomBarZones, // { left, center, right }
    children, // Additional content rendered inside LayoutContext (e.g., floating panels)
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

    return (
        <LayoutContext.Provider value={contextValue}>
            <GridZonesLayout
                topBar={topBar}
                leftActivityBar={leftActivityBar}
                leftPanelContent={leftPanelContent}
                rightActivityBar={rightActivityBar}
                rightPanelContent={rightPanelContent}
                secondaryTopBarZones={secondaryTopBarZones}
                secondaryBottomBarZones={secondaryBottomBarZones}
                centerPanel={centerPanel}
                bottomBar={bottomBar}
                leftOpen={leftOpen}
                setLeftOpen={setLeftOpen}
                rightOpen={rightOpen}
                setRightOpen={setRightOpen}
                leftWidth={leftWidth}
                setLeftWidth={setLeftWidth}
                rightWidth={rightWidth}
                setRightWidth={setRightWidth}
            />
            {/* Render children inside LayoutContext (e.g., floating panels) */}
            {children}
        </LayoutContext.Provider>
    );
}

// =============================================================================
// GRID ZONES LAYOUT
// =============================================================================

/**
 * Calculate the CSS custom properties for the grid layout
 * 
 * @param {boolean} leftOpen - Whether left panel is open
 * @param {boolean} rightOpen - Whether right panel is open
 * @param {number} leftWidth - Left panel total width (including activity bar)
 * @param {number} rightWidth - Right panel total width (including activity bar)
 * @returns {Object} CSS custom properties object
 */
function useGridStyles(leftOpen, rightOpen, leftWidth, rightWidth) {
    return useMemo(() => {
        // Activity bar widths (fixed)
        const leftActivityWidth = PANEL_CONSTRAINTS.left.collapsed;
        const rightActivityWidth = PANEL_CONSTRAINTS.right.collapsed;

        // Content widths (what's left after activity bar)
        // When collapsed, content width is 0
        const leftContentWidth = leftOpen
            ? Math.max(0, leftWidth - leftActivityWidth)
            : 0;
        const rightContentWidth = rightOpen
            ? Math.max(0, rightWidth - rightActivityWidth)
            : 0;

        return {
            '--left-activity-width': `${leftActivityWidth}px`,
            '--right-activity-width': `${rightActivityWidth}px`,
            '--left-content-width': `${leftContentWidth}px`,
            '--right-content-width': `${rightContentWidth}px`,
            // Minimum widths for secondary bar zones
            '--sec-bar-left-min': leftOpen ? `${leftWidth}px` : '180px',
            '--sec-bar-right-min': rightOpen ? `${rightWidth}px` : '180px',
        };
    }, [leftOpen, rightOpen, leftWidth, rightWidth]);
}

/**
 * GridZonesLayout - The grid-based layout implementation
 * 
 * Uses CSS Grid with dynamic custom properties to handle panel expansion/collapse.
 * The key insight is that the center workspace column uses `minmax(300px, 1fr)`
 * which allows it to grow when the side panels collapse.
 */
function GridZonesLayout({
    topBar,
    leftActivityBar,
    leftPanelContent,
    rightActivityBar,
    rightPanelContent,
    secondaryTopBarZones,
    secondaryBottomBarZones,
    centerPanel,
    bottomBar,
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    leftWidth,
    setLeftWidth,
    rightWidth,
    setRightWidth,
}) {
    // Resize handlers for the panels
    const { isResizing: leftResizing, handleMouseDown: leftMouseDown } = useResizeHandler('left', setLeftWidth);
    const { isResizing: rightResizing, handleMouseDown: rightMouseDown } = useResizeHandler('right', setRightWidth);

    // Calculate CSS custom properties
    const gridStyles = useGridStyles(leftOpen, rightOpen, leftWidth, rightWidth);

    // Build className with collapsed states
    const layoutClassName = [
        'three-edge-layout',
        'three-edge-layout--grid-zones',
        !leftOpen && 'three-edge-layout--left-collapsed',
        !rightOpen && 'three-edge-layout--right-collapsed',
    ].filter(Boolean).join(' ');

    // Extract secondary bar zone content
    const secTopLeft = secondaryTopBarZones?.left || null;
    const secTopCenter = secondaryTopBarZones?.center || null;
    const secTopRight = secondaryTopBarZones?.right || null;
    const secBotLeft = secondaryBottomBarZones?.left || null;
    const secBotCenter = secondaryBottomBarZones?.center || null;
    const secBotRight = secondaryBottomBarZones?.right || null;

    return (
        <div className={layoutClassName} style={gridStyles}>
            {/* Row 1: Top Bar (spans all columns) */}
            {topBar && (
                <div className="three-edge-layout__top">
                    {topBar}
                </div>
            )}

            {/* Row 2: Secondary Top Bar - spans between activity bars */}
            {(secTopLeft || secTopCenter || secTopRight) && (
                <div className="three-edge-layout__sec-top">
                    <div className="three-edge-layout__sec-top-left">
                        {secTopLeft}
                    </div>
                    <div className="three-edge-layout__sec-top-center">
                        {secTopCenter}
                    </div>
                    <div className="three-edge-layout__sec-top-right">
                        {secTopRight}
                    </div>
                </div>
            )}

            {/* Row 3: Main Content Area */}

            {/* Left Activity Bar (always visible) */}
            <div className="three-edge-layout__left-activity">
                {leftActivityBar}
            </div>

            {/* Left Panel Content (hidden when collapsed) */}
            {leftOpen && (
                <div className="three-edge-layout__left-panel">
                    {leftPanelContent}
                    {/* Resize handle on right edge */}
                    <div
                        className={`grid-resize-handle grid-resize-handle--left ${leftResizing ? 'grid-resize-handle--active' : ''}`}
                        onMouseDown={leftMouseDown}
                    />
                </div>
            )}

            {/* Center Workspace (EXPANDS when panels collapse!) */}
            <div className="three-edge-layout__workspace">
                {centerPanel}
            </div>

            {/* Right Panel Content (hidden when collapsed) */}
            {rightOpen && (
                <div className="three-edge-layout__right-panel">
                    {/* Resize handle on left edge */}
                    <div
                        className={`grid-resize-handle grid-resize-handle--right ${rightResizing ? 'grid-resize-handle--active' : ''}`}
                        onMouseDown={rightMouseDown}
                    />
                    {rightPanelContent}
                </div>
            )}

            {/* Right Activity Bar (always visible) */}
            <div className="three-edge-layout__right-activity">
                {rightActivityBar}
            </div>

            {/* Row 4: Secondary Bottom Bar - spans between activity bars */}
            {(secBotLeft || secBotCenter || secBotRight) && (
                <div className="three-edge-layout__sec-bot">
                    <div className="three-edge-layout__sec-bot-left">
                        {secBotLeft}
                    </div>
                    <div className="three-edge-layout__sec-bot-center">
                        {secBotCenter}
                    </div>
                    <div className="three-edge-layout__sec-bot-right">
                        {secBotRight}
                    </div>
                </div>
            )}

            {/* Row 5: Status Bar (spans all columns) */}
            {bottomBar && (
                <div className="three-edge-layout__bottom">
                    {bottomBar}
                </div>
            )}
        </div>
    );
}


export { GridZonesLayout, useGridStyles };

// =============================================================================
// LAYOUT CONTEXT
// =============================================================================

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