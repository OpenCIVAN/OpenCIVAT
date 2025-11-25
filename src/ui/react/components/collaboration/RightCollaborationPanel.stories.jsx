// src/ui/react/components/collaboration/RightCollaborationPanel.stories.jsx
import React from "react";
import { RightCollaborationPanel } from "./RightCollaborationPanel";
import "./RightCollaborationPanel.scss";

// Mock the child components to avoid complex dependencies
jest.mock("@UI/react/components/collaboration/PeoplePanel", () => ({
    PeoplePanel: () => (
        <div style={{ padding: "16px", color: "#808080" }}>
            <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#e0e0e0" }}>Online (3)</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {["Alice", "Bob", "Charlie"].map((name) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#2a2a2f", borderRadius: "4px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#4CAF50" }} />
                        <span>{name}</span>
                    </div>
                ))}
            </div>
        </div>
    ),
}));

jest.mock("@UI/react/components/collaboration/TextChatPanel.jsx", () => ({
    TextChatPanel: () => (
        <div style={{ padding: "16px", color: "#808080", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                No messages yet
            </div>
            <input
                type="text"
                placeholder="Type a message..."
                style={{
                    width: "100%",
                    padding: "10px",
                    background: "#2a2a2f",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#e0e0e0",
                }}
            />
        </div>
    ),
}));

jest.mock("@UI/react/components/collaboration/VoiceChatPanel.jsx", () => ({
    VoiceChatPanel: ({ roomName }) => (
        <div style={{ padding: "16px", color: "#808080" }}>
            <div style={{ marginBottom: "12px", color: "#666", fontSize: "12px" }}>
                Room: {roomName}
            </div>
            <button
                style={{
                    width: "100%",
                    padding: "12px",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                }}
            >
                Join Voice Chat
            </button>
        </div>
    ),
}));

export default {
    title: "Collaboration/RightCollaborationPanel",
    component: RightCollaborationPanel,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ width: "340px", height: "600px", background: "#0a0a0f" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// STORIES
// =============================================================================

export const Default = {
    args: {
        roomName: "default-room",
    },
};

export const InDifferentRoom = {
    args: {
        roomName: "analytics-team-room",
    },
};

// Since mocking is complex in Storybook, let's create simplified visual stories
export const PeopleTabActive = {
    render: () => (
        <div style={{ height: "100%", background: "#1a1a1f", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #333", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "#e0e0e0" }}>Collaboration</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
                {["People", "Voice", "Chat", "Activity"].map((tab, index) => (
                    <button
                        key={tab}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: index === 0 ? "#2a2a2f" : "transparent",
                            border: "none",
                            borderBottom: index === 0 ? "2px solid #4CAF50" : "2px solid transparent",
                            color: index === 0 ? "#e0e0e0" : "#808080",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: "16px", overflow: "auto" }}>
                <div style={{ color: "#808080", fontSize: "13px" }}>
                    <div style={{ marginBottom: "16px" }}>
                        <strong style={{ color: "#e0e0e0" }}>Online (3)</strong>
                    </div>
                    {["Alice", "Bob", "Charlie"].map((name, i) => (
                        <div
                            key={name}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "10px",
                                background: "#2a2a2f",
                                borderRadius: "4px",
                                marginBottom: "6px",
                            }}
                        >
                            <div
                                style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: ["#4CAF50", "#2196F3", "#FF9800"][i],
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                }}
                            >
                                {name[0]}
                            </div>
                            <span>{name}</span>
                            {i === 0 && <span style={{ marginLeft: "auto", fontSize: "10px", color: "#666" }}>(You)</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Settings Toggle */}
            <div style={{ padding: "8px", borderTop: "1px solid #333" }}>
                <button
                    style={{
                        width: "100%",
                        padding: "8px",
                        background: "transparent",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "#808080",
                        cursor: "pointer",
                        fontSize: "12px",
                    }}
                >
                    Quick Settings
                </button>
            </div>
        </div>
    ),
};

export const VoiceTabActive = {
    render: () => (
        <div style={{ height: "100%", background: "#1a1a1f", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #333", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "#e0e0e0" }}>Collaboration</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
                {["People", "Voice", "Chat", "Activity"].map((tab, index) => (
                    <button
                        key={tab}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: index === 1 ? "#2a2a2f" : "transparent",
                            border: "none",
                            borderBottom: index === 1 ? "2px solid #4CAF50" : "2px solid transparent",
                            color: index === 1 ? "#e0e0e0" : "#808080",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Voice Content */}
            <div style={{ flex: 1, padding: "16px" }}>
                <div style={{ marginBottom: "16px", textAlign: "center", color: "#666", fontSize: "12px" }}>
                    Room: default-analytics-room
                </div>
                <div
                    style={{
                        padding: "16px",
                        background: "#2a2a2f",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        textAlign: "center",
                        color: "#999",
                    }}
                >
                    ⭕ Not connected
                </div>
                <button
                    style={{
                        width: "100%",
                        padding: "12px",
                        background: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "500",
                    }}
                >
                    Join Voice Chat
                </button>
                <p style={{ marginTop: "12px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                    Click to join voice chat
                </p>
            </div>
        </div>
    ),
};

export const ChatTabActive = {
    render: () => (
        <div style={{ height: "100%", background: "#1a1a1f", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
                <span style={{ fontSize: "14px", color: "#e0e0e0" }}>Collaboration</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
                {["People", "Voice", "Chat", "Activity"].map((tab, index) => (
                    <button
                        key={tab}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: index === 2 ? "#2a2a2f" : "transparent",
                            border: "none",
                            borderBottom: index === 2 ? "2px solid #4CAF50" : "2px solid transparent",
                            color: index === 2 ? "#e0e0e0" : "#808080",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Chat Content */}
            <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column" }}>
                {/* Messages */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ padding: "10px", background: "#2a2a2f", borderRadius: "8px", borderTopLeftRadius: "2px", maxWidth: "80%" }}>
                        <div style={{ fontSize: "11px", color: "#4CAF50", marginBottom: "4px" }}>Alice</div>
                        <div style={{ fontSize: "13px", color: "#e0e0e0" }}>Hey, check out this dataset!</div>
                    </div>
                    <div style={{ padding: "10px", background: "#2a2a2f", borderRadius: "8px", borderTopLeftRadius: "2px", maxWidth: "80%" }}>
                        <div style={{ fontSize: "11px", color: "#2196F3", marginBottom: "4px" }}>Bob</div>
                        <div style={{ fontSize: "13px", color: "#e0e0e0" }}>Looks great, loading it now</div>
                    </div>
                    <div style={{ padding: "10px", background: "#3d5a3d", borderRadius: "8px", borderTopRightRadius: "2px", maxWidth: "80%", alignSelf: "flex-end" }}>
                        <div style={{ fontSize: "13px", color: "#e0e0e0" }}>I'll annotate the cluster region</div>
                    </div>
                </div>

                {/* Input */}
                <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                    <input
                        type="text"
                        placeholder="Type a message..."
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#2a2a2f",
                            border: "1px solid #444",
                            borderRadius: "4px",
                            color: "#e0e0e0",
                            fontSize: "13px",
                        }}
                    />
                </div>
            </div>
        </div>
    ),
};

export const WithQuickSettingsOpen = {
    render: () => (
        <div style={{ height: "100%", background: "#1a1a1f", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
                <span style={{ fontSize: "14px", color: "#e0e0e0" }}>Collaboration</span>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
                {["People", "Voice", "Chat", "Activity"].map((tab, index) => (
                    <button
                        key={tab}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: index === 0 ? "#2a2a2f" : "transparent",
                            border: "none",
                            borderBottom: index === 0 ? "2px solid #4CAF50" : "2px solid transparent",
                            color: index === 0 ? "#e0e0e0" : "#808080",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Main Content - 50% */}
            <div style={{ flex: 1, padding: "12px", overflow: "auto", borderBottom: "1px solid #333" }}>
                <div style={{ fontSize: "12px", color: "#808080" }}>
                    <strong style={{ color: "#e0e0e0" }}>Online (2)</strong>
                    {["Alice", "Bob"].map((name, i) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#2a2a2f", borderRadius: "4px", marginTop: "6px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: ["#4CAF50", "#2196F3"][i] }} />
                            <span>{name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Settings - 50% */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "8px 12px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#e0e0e0" }}>Quick Settings</span>
                    <button style={{ background: "none", border: "none", color: "#808080", cursor: "pointer" }}>▼</button>
                </div>
                <div style={{ padding: "12px", fontSize: "12px", color: "#808080" }}>
                    <div style={{ marginBottom: "12px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked />
                            <span>Show my cursor to others</span>
                        </label>
                    </div>
                    <div>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked />
                            <span>Show all cursors</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    ),
};