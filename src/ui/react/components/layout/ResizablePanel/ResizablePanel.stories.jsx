// src/ui/react/components/layout/ResizablePanel.stories.jsx
import React, { useState } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { ResizablePanel } from "./ResizablePanel";
import '@UI/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.scss';

export default {
    title: "Layout/ResizablePanel",
    component: ResizablePanel,
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => (
            <div style={{ height: "400px", display: "flex", background: "#0a0a0f" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK PANEL CONTENT
// =============================================================================

const SamplePanelContent = ({ isCollapsed, onToggle, side, title = "Panel" }) => (
    <div
        style={{
            height: "100%",
            background: "#1a1a1f",
            display: "flex",
            flexDirection: "column",
        }}
    >
        {isCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "12px" }}>
                <button
                    onClick={onToggle}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#808080",
                        cursor: "pointer",
                        padding: "8px",
                    }}
                    title="Expand panel"
                >
                    {side === "left" ? <Icon name="chevronRight" size={18} /> : <Icon name="chevronLeft" size={18} />}
                </button>
                <Icon name="files" size={18} style={{ color: "#808080" }} />
                <Icon name="settings" size={18} style={{ color: "#808080" }} />
            </div>
        ) : (
            <>
                <div
                    style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #333",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>{title}</h3>
                    <button
                        onClick={onToggle}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#808080",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                        }}
                        title="Collapse panel"
                    >
                        {side === "left" ? <Icon name="chevronLeft" size={16} /> : <Icon name="chevronRight" size={16} />}
                    </button>
                </div>
                <div style={{ padding: "16px", color: "#808080", fontSize: "13px", flex: 1 }}>
                    <p style={{ margin: "0 0 12px 0" }}>This is the {side} panel content.</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#666" }}>
                        Drag the edge to resize. Click the arrow to collapse.
                    </p>
                </div>
            </>
        )}
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const LeftPanelExpanded = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [width, setWidth] = useState(320);

        return (
            <>
                <ResizablePanel
                    side="left"
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    width={width}
                    onWidthChange={setWidth}
                >
                    <SamplePanelContent title="Left Panel" />
                </ResizablePanel>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#404040" }}>
                    Main Content Area
                </div>
            </>
        );
    },
};

export const LeftPanelCollapsed = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [width, setWidth] = useState(320);

        return (
            <>
                <ResizablePanel
                    side="left"
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    width={width}
                    onWidthChange={setWidth}
                >
                    <SamplePanelContent title="Left Panel" />
                </ResizablePanel>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#404040" }}>
                    Main Content Area
                </div>
            </>
        );
    },
};

export const RightPanelExpanded = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [width, setWidth] = useState(340);

        return (
            <>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#404040" }}>
                    Main Content Area
                </div>
                <ResizablePanel
                    side="right"
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    width={width}
                    onWidthChange={setWidth}
                >
                    <SamplePanelContent title="Right Panel" />
                </ResizablePanel>
            </>
        );
    },
};

export const RightPanelCollapsed = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const [width, setWidth] = useState(340);

        return (
            <>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#404040" }}>
                    Main Content Area
                </div>
                <ResizablePanel
                    side="right"
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    width={width}
                    onWidthChange={setWidth}
                >
                    <SamplePanelContent title="Right Panel" />
                </ResizablePanel>
            </>
        );
    },
};

export const BothPanels = {
    render: () => {
        const [leftOpen, setLeftOpen] = useState(true);
        const [rightOpen, setRightOpen] = useState(true);
        const [leftWidth, setLeftWidth] = useState(280);
        const [rightWidth, setRightWidth] = useState(300);

        return (
            <>
                <ResizablePanel
                    side="left"
                    isOpen={leftOpen}
                    onToggle={() => setLeftOpen(!leftOpen)}
                    width={leftWidth}
                    onWidthChange={setLeftWidth}
                >
                    <SamplePanelContent title="Files" />
                </ResizablePanel>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#404040" }}>
                    Workspace
                </div>
                <ResizablePanel
                    side="right"
                    isOpen={rightOpen}
                    onToggle={() => setRightOpen(!rightOpen)}
                    width={rightWidth}
                    onWidthChange={setRightWidth}
                >
                    <SamplePanelContent title="Collaboration" />
                </ResizablePanel>
            </>
        );
    },
};

export const InteractiveResize = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);
        const [width, setWidth] = useState(320);

        return (
            <>
                <ResizablePanel
                    side="left"
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    width={width}
                    onWidthChange={setWidth}
                >
                    <SamplePanelContent title="Resizable Panel" />
                </ResizablePanel>
                <div style={{ flex: 1, padding: "24px", color: "#808080" }}>
                    <h3 style={{ color: "#e0e0e0", marginTop: 0 }}>Interactive Resize Demo</h3>
                    <p>Current width: <strong style={{ color: "#e0e0e0" }}>{width}px</strong></p>
                    <p>Panel is: <strong style={{ color: isOpen ? "#4CAF50" : "#f44336" }}>{isOpen ? "Expanded" : "Collapsed"}</strong></p>
                    <ul style={{ lineHeight: "2", fontSize: "13px" }}>
                        <li>Drag the right edge to resize (min: 240px, max: 600px)</li>
                        <li>Click the arrow button to collapse/expand</li>
                        <li>Collapsed width is 48px</li>
                    </ul>
                </div>
            </>
        );
    },
};