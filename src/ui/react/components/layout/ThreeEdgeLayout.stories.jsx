// src/ui/react/components/layout/ThreeEdgeLayout.stories.jsx
import React, { useState } from "react";
import { Files, Users, Settings, Play, Folder, MessageSquare } from "lucide-react";
import { ThreeEdgeLayout, LayoutContext } from "./ThreeEdgeLayout";
import "./ThreeEdgeLayout.scss";

export default {
    title: "Layout/ThreeEdgeLayout",
    component: ThreeEdgeLayout,
    parameters: {
        layout: "fullscreen",
    },
};

// =============================================================================
// MOCK PANELS FOR STORIES
// =============================================================================

const MockLeftPanel = ({ isCollapsed, onToggle, side }) => (
    <div
        style={{
            height: "100%",
            background: "#1a1a1f",
            display: "flex",
            flexDirection: "column",
        }}
    >
        {isCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "16px" }}>
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
                    <Files size={20} />
                </button>
                <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}>
                    <Folder size={20} />
                </button>
                <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}>
                    <Settings size={20} />
                </button>
            </div>
        ) : (
            <>
                <div style={{ padding: "16px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>Files</h3>
                    <button
                        onClick={onToggle}
                        style={{ background: "none", border: "none", color: "#808080", cursor: "pointer" }}
                    >
                        ←
                    </button>
                </div>
                <div style={{ padding: "16px", color: "#808080", fontSize: "13px" }}>
                    <p>Sample files panel content</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
                        <li style={{ padding: "8px", background: "#2a2a2f", borderRadius: "4px", marginBottom: "4px" }}>dataset_1.vtp</li>
                        <li style={{ padding: "8px", background: "#2a2a2f", borderRadius: "4px", marginBottom: "4px" }}>dataset_2.vtp</li>
                        <li style={{ padding: "8px", background: "#2a2a2f", borderRadius: "4px" }}>sample_data.csv</li>
                    </ul>
                </div>
            </>
        )}
    </div>
);

const MockCenterPanel = () => (
    <div
        style={{
            height: "100%",
            background: "#0a0a0f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#404040",
        }}
    >
        <div style={{ textAlign: "center" }}>
            <Play size={48} strokeWidth={1} />
            <p style={{ marginTop: "16px", fontSize: "14px" }}>Workspace Area</p>
            <p style={{ fontSize: "12px", color: "#333" }}>Visualization instances appear here</p>
        </div>
    </div>
);

const MockRightPanel = ({ isCollapsed, onToggle, side }) => (
    <div
        style={{
            height: "100%",
            background: "#1a1a1f",
            display: "flex",
            flexDirection: "column",
        }}
    >
        {isCollapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: "16px" }}>
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
                    <Users size={20} />
                </button>
                <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer", padding: "8px" }}>
                    <MessageSquare size={20} />
                </button>
            </div>
        ) : (
            <>
                <div style={{ padding: "16px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>Collaboration</h3>
                    <button
                        onClick={onToggle}
                        style={{ background: "none", border: "none", color: "#808080", cursor: "pointer" }}
                    >
                        →
                    </button>
                </div>
                <div style={{ padding: "16px", color: "#808080", fontSize: "13px" }}>
                    <p>Online Users (3)</p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#4CAF50" }} />
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2196F3" }} />
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FF9800" }} />
                    </div>
                </div>
            </>
        )}
    </div>
);

const MockTopBar = () => (
    <div
        style={{
            height: "48px",
            background: "#1a1a1f",
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            color: "#e0e0e0",
            fontSize: "14px",
        }}
    >
        <span style={{ fontWeight: "600" }}>CIA Web</span>
        <span style={{ marginLeft: "auto", color: "#808080", fontSize: "12px" }}>Room: default-room</span>
    </div>
);

const MockBottomBar = () => (
    <div
        style={{
            height: "24px",
            background: "#1a1a1f",
            borderTop: "1px solid #333",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            color: "#808080",
            fontSize: "11px",
        }}
    >
        <span>Connected</span>
        <span style={{ marginLeft: "auto" }}>v1.0.0</span>
    </div>
);

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                leftPanel={<MockLeftPanel />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<MockRightPanel />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

export const WithoutTopBar = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                leftPanel={<MockLeftPanel />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<MockRightPanel />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

export const WithoutBottomBar = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                leftPanel={<MockLeftPanel />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<MockRightPanel />}
            />
        </div>
    ),
};

export const CenterOnly = {
    render: () => (
        <div style={{ height: "100vh" }}>
            <ThreeEdgeLayout
                topBar={<MockTopBar />}
                leftPanel={<div style={{ height: "100%", background: "#1a1a1f" }} />}
                centerPanel={<MockCenterPanel />}
                rightPanel={<div style={{ height: "100%", background: "#1a1a1f" }} />}
                bottomBar={<MockBottomBar />}
            />
        </div>
    ),
};

// Interactive demo showing panel collapsing
export const InteractiveDemo = {
    render: () => {
        return (
            <div style={{ height: "100vh" }}>
                <ThreeEdgeLayout
                    topBar={<MockTopBar />}
                    leftPanel={<MockLeftPanel />}
                    centerPanel={
                        <div style={{ height: "100%", background: "#0a0a0f", padding: "24px", color: "#808080" }}>
                            <h2 style={{ color: "#e0e0e0", marginBottom: "16px" }}>Interactive Demo</h2>
                            <p>Try the following:</p>
                            <ul style={{ lineHeight: "2" }}>
                                <li>Click the collapse buttons in panel headers</li>
                                <li>Drag the panel dividers to resize</li>
                                <li>Click icons in collapsed panels to expand</li>
                            </ul>
                            <p style={{ marginTop: "24px", fontSize: "12px", color: "#666" }}>
                                Panel state persists to localStorage automatically.
                            </p>
                        </div>
                    }
                    rightPanel={<MockRightPanel />}
                    bottomBar={<MockBottomBar />}
                />
            </div>
        );
    },
};