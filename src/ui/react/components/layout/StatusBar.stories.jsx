import React from "react";

// Mock StatusBar for Storybook (avoids external dependencies)
function MockStatusBar({ phase = 2, ready = true, instanceCount = 3, datasetCount = 5 }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 16px",
            background: "rgba(255,255,255,0.05)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: "12px",
            color: "#999"
        }}>
            <div style={{ display: "flex", gap: "16px" }}>
                <span>{ready ? "🟢 Ready" : "🟡 Loading"}</span>
                <span>Instances: {instanceCount}</span>
                <span>Datasets: {datasetCount}</span>
            </div>
            <div>Phase: {phase}/3</div>
        </div>
    );
}

export default {
    title: "Layout/StatusBar",
    component: MockStatusBar,
    parameters: { layout: "fullscreen" },
    decorators: [
        (Story) => (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1a1a2e" }}>
                <Story />
            </div>
        ),
    ],
};

export const Ready = {
    args: {
        ready: true,
        phase: 3,
        instanceCount: 4,
        datasetCount: 2,
    },
};

export const Loading = {
    args: {
        ready: false,
        phase: 1,
        instanceCount: 0,
        datasetCount: 0,
    },
};
