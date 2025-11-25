import React from "react";

// Mock TopBar for Storybook (avoids sessionManager dependency)
function MockTopBar({ username = "Beth Smith", roomId = "main-room-123" }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
        }}>
            <div>
                <span style={{ fontWeight: 600, color: "#e0e0e0" }}>CIA Web</span>
                <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>
                    Collaborative Immersive Analytics
                </span>
            </div>
            <div style={{ color: "#999" }}>
                Room: <strong style={{ color: "#e0e0e0" }}>{roomId}</strong>
            </div>
            <div style={{ color: "#999" }}>
                👤 {username}
            </div>
        </div>
    );
}

export default {
    title: "Layout/TopBar",
    component: MockTopBar,
    parameters: { layout: "fullscreen" },
    decorators: [
        (Story) => (
            <div style={{ background: "#1a1a2e" }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        username: "Beth Smith",
        roomId: "main-room-123",
    },
};

export const LongUsername = {
    args: {
        username: "Dr. Alexandra Thompson-Richardson",
        roomId: "analysis-session-456",
    },
};
