// src/ui/react/components/layout/ThreeEdgeLayout.jsx
// Main layout orchestrator for the three-edge panel system
// Provides left panel, center workspace, and right panel with resize capabilities

import React from 'react';
import { ResizablePanel } from '@UI/react/components/layout/ResizablePanel';
import { useLayoutState, usePanelPersistence } from '@UI/react/components/layout/ThreeEdgeLayout.logic';
import '@UI/react/components/layout/layout.scss';

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
 * 
 * @example
 * <ThreeEdgeLayout
 *   leftPanel={<DatasetsPanel />}
 *   centerPanel={<WorkspaceGrid />}
 *   rightPanel={<CollaborationPanel />}
 * />
 */
export function ThreeEdgeLayout({
    leftPanel,
    centerPanel,
    rightPanel,
    topBar,
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

    return (
        <div className="three-edge-layout">
            {/* Top Bar (Header) */}
            {topBar && (
                <div className="three-edge-layout__top">
                    {topBar}
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

            {/* Bottom Bar (Status) */}
            {bottomBar && (
                <div className="three-edge-layout__bottom">
                    {bottomBar}
                </div>
            )}
        </div>
    );
}

/**
 * Context for panels to access layout state
 * Allows child components to trigger panel actions
 */
export const LayoutContext = React.createContext({
    leftOpen: true,
    setLeftOpen: () => { },
    rightOpen: true,
    setRightOpen: () => { },
    leftWidth: 320,
    rightWidth: 340
});

/**
 * Hook for child components to access layout state
 * 
 * @example
 * const { leftOpen, setLeftOpen } = useLayoutContext();
 */
export function useLayoutContext() {
    return React.useContext(LayoutContext);
}