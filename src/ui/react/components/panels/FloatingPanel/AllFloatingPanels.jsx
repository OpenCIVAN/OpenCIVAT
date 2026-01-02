/**
 * @file AllFloatingPanels.jsx
 * @description Renders all floating panels at the app level.
 * This component should be placed inside FloatingPanelProvider.
 * 
 * Uses centralized tab rendering from panel contexts.
 * NO LOCAL SWITCH STATEMENTS - all tabs render through the registries.
 */

import React, { useCallback } from "react";
import { FloatingPanel } from "./FloatingPanel";
import { useFloatingPanels } from "./FloatingPanelContext";
import { useLayoutContext } from "@UI/react/components/layout/ThreeEdgeLayout";

// Import centralized renderers and tab configs
import {
    LEFT_PANEL_TABS,
    renderLeftPanelTabContent,
} from "@UI/react/components/panels/LeftPanel/LeftPanelContext";
import {
    RIGHT_PANEL_TABS,
    renderRightPanelTabContent,
} from "@UI/react/components/panels/RightPanel/RightPanelContext";

// Ensure tab components are registered
import "@UI/react/components/panels/LeftPanel/LeftPanelTabRegistry";
import "@UI/react/components/panels/RightPanel/RightPanelTabRegistry";

// ScratchPad floating panel
import { ScratchPadFloating, SCRATCHPAD_PANEL_ID } from "./ScratchPadFloating";

// Instance Tools floating panel
import { InstanceToolsFloating, INSTANCE_TOOLS_PANEL_ID } from "./InstanceToolsFloating";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AllFloatingPanels - Renders floating versions of panel tabs
 *
 * Placed at the app level to ensure panels persist even when docked panels close.
 * Uses centralized renderers - no local switch statements.
 *
 * Now also renders:
 * - ScratchPad (independent floating panel, not tied to docked tabs)
 */
export function AllFloatingPanels() {
    const {
        floatingPanels,
        dockPanel,
        updatePanelPosition,
        updatePanelSize,
        bringToFront,
    } = useFloatingPanels();

    const { setLeftOpen, setRightOpen } = useLayoutContext();

    // Handle docking a panel
    const handleDock = useCallback(
        (panelId) => {
            dockPanel(panelId);

            // Re-open the corresponding docked panel
            if (panelId.startsWith("left-")) {
                setLeftOpen(true);
            } else if (panelId.startsWith("right-")) {
                setRightOpen(true);
            }
        },
        [dockPanel, setLeftOpen, setRightOpen]
    );

    // Render a panel from registry
    const renderPanelContent = useCallback((panelId, panelState) => {
        // Left panel tabs
        if (panelId.startsWith("left-")) {
            const tabId = panelId.replace("left-", "");
            return renderLeftPanelTabContent(tabId, {});
        }

        // Right panel tabs
        if (panelId.startsWith("right-")) {
            const tabId = panelId.replace("right-", "");
            return renderRightPanelTabContent(tabId, {});
        }

        // Custom content provided at popOut time
        if (panelState.content) {
            return panelState.content;
        }

        return null;
    }, []);

    return (
        <>
            {/* Render all floating panels from registry (left/right panel tabs) */}
            {Object.entries(floatingPanels)
                .filter(([id]) => id !== SCRATCHPAD_PANEL_ID && id !== INSTANCE_TOOLS_PANEL_ID) // Handled separately
                .map(([panelId, panelState]) => {
                    // Find tab config for icon/color
                    let tabConfig = null;
                    if (panelId.startsWith("left-")) {
                        const tabId = panelId.replace("left-", "");
                        tabConfig = LEFT_PANEL_TABS.find((t) => t.id === tabId);
                    } else if (panelId.startsWith("right-")) {
                        const tabId = panelId.replace("right-", "");
                        tabConfig = RIGHT_PANEL_TABS.find((t) => t.id === tabId);
                    }

                    return (
                        <FloatingPanel
                            key={panelId}
                            id={panelId}
                            title={panelState.title || tabConfig?.label || panelId}
                            icon={panelState.icon || tabConfig?.icon}
                            color={panelState.color || tabConfig?.color || "blue"}
                            x={panelState.x}
                            y={panelState.y}
                            width={panelState.width}
                            height={panelState.height}
                            zIndex={panelState.zIndex}
                            minimized={panelState.minimized}
                            onClose={() => handleDock(panelId)}
                            onDrag={(x, y) => updatePanelPosition(panelId, x, y)}
                            onResize={(w, h) => updatePanelSize(panelId, w, h)}
                            onFocus={() => bringToFront(panelId)}
                        >
                            {renderPanelContent(panelId, panelState)}
                        </FloatingPanel>
                    );
                })}

            {/* ScratchPad - Independent floating panel */}
            <ScratchPadFloating />

            {/* Instance Tools - Floating panel for viewport tools */}
            <InstanceToolsFloating />
        </>
    );
}

export default AllFloatingPanels;