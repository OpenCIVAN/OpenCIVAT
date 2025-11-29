// src/ui/react/components/workspace/WorkspaceGrid.stories.jsx
import React, { useState } from "react";
import { Plus, X, Maximize2, MoreVertical, Eye, Trash2, Copy, Settings } from "lucide-react";

export default {
    title: "Workspace/WorkspaceGrid",
    parameters: {
        layout: "fullscreen",
    },
};

// =============================================================================
// MOCK INSTANCE VIEWPORT
// =============================================================================

const MockInstanceViewport = ({ title, onDelete, color = "#4CAF50", isEmpty = false }) => (
    <div
        style={{
            height: "100%",
            minHeight: "200px",
            background: "#1a1a1f",
            borderRadius: "8px",
            border: "1px solid #333",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
        }}
    >
        {/* Instance Header */}
        <div
            style={{
                padding: "8px 12px",
                background: "#2a2a2f",
                borderBottom: "1px solid #333",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                    style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: color,
                    }}
                />
                <span style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "500" }}>
                    {title}
                </span>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
                <button
                    style={{
                        padding: "4px",
                        background: "transparent",
                        border: "none",
                        color: "#808080",
                        cursor: "pointer",
                        borderRadius: "2px",
                    }}
                    title="Maximize"
                >
                    <Maximize2 size={14} />
                </button>
                <button
                    style={{
                        padding: "4px",
                        background: "transparent",
                        border: "none",
                        color: "#808080",
                        cursor: "pointer",
                        borderRadius: "2px",
                    }}
                    title="More options"
                >
                    <MoreVertical size={14} />
                </button>
                <button
                    onClick={onDelete}
                    style={{
                        padding: "4px",
                        background: "transparent",
                        border: "none",
                        color: "#808080",
                        cursor: "pointer",
                        borderRadius: "2px",
                    }}
                    title="Close"
                >
                    <X size={14} />
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div
            style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#404040",
                fontSize: "13px",
            }}
        >
            {isEmpty ? (
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
                    <div>Drop a dataset here</div>
                </div>
            ) : (
                <div style={{ textAlign: "center" }}>
                    <div
                        style={{
                            width: "100px",
                            height: "100px",
                            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px",
                        }}
                    >
                        <div
                            style={{
                                width: "60px",
                                height: "60px",
                                background: color,
                                borderRadius: "50%",
                                opacity: 0.3,
                            }}
                        />
                    </div>
                    <div style={{ color: "#808080" }}>Visualization</div>
                </div>
            )}
        </div>
    </div>
);

// =============================================================================
// MOCK WORKSPACE GRID
// =============================================================================

const MockWorkspaceGrid = ({ initialInstances = [] }) => {
    const [instances, setInstances] = useState(initialInstances);

    const addInstance = () => {
        if (instances.length >= 9) return;
        const colors = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#E91E63", "#00BCD4"];
        const newInstance = {
            key: `instance-${Date.now()}`,
            title: `Dataset ${instances.length + 1}`,
            color: colors[instances.length % colors.length],
            isEmpty: false,
        };
        setInstances([...instances, newInstance]);
    };

    const removeInstance = (key) => {
        setInstances(instances.filter((i) => i.key !== key));
    };

    const getGridClass = () => {
        const count = instances.length;
        if (count === 0) return "";
        if (count === 1) return "grid-1";
        if (count === 2) return "grid-2";
        if (count <= 4) return "grid-4";
        if (count <= 6) return "grid-6";
        return "grid-9";
    };

    const getGridStyles = () => {
        const count = instances.length;
        if (count === 0) return {};
        if (count === 1) return { gridTemplateColumns: "1fr" };
        if (count === 2) return { gridTemplateColumns: "1fr 1fr" };
        if (count <= 4) return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" };
        if (count <= 6) return { gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr" };
        return { gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr" };
    };

    return (
        <div
            style={{
                height: "100%",
                background: "#0a0a0f",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#e0e0e0", fontWeight: "500" }}>
                        Workspace
                    </span>
                    <span style={{ fontSize: "12px", color: "#808080" }}>
                        ({instances.length})
                    </span>
                </div>
                <button
                    onClick={addInstance}
                    disabled={instances.length >= 9}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: instances.length >= 9 ? "#333" : "#4CAF50",
                        color: instances.length >= 9 ? "#666" : "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: instances.length >= 9 ? "not-allowed" : "pointer",
                    }}
                >
                    <Plus size={14} />
                    Add Instance
                </button>
            </div>

            {/* Grid or Empty State */}
            {instances.length === 0 ? (
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#808080",
                        gap: "16px",
                    }}
                >
                    <div style={{ fontSize: "48px" }}>🎨</div>
                    <div style={{ fontSize: "16px", color: "#e0e0e0" }}>
                        No visualization windows open
                    </div>
                    <div style={{ fontSize: "13px", maxWidth: "300px", textAlign: "center" }}>
                        Click a dataset from the Files panel to create a window with that data,
                        or click "Add Instance" above to create an empty window.
                    </div>
                    <button
                        onClick={addInstance}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "10px 20px",
                            background: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            marginTop: "8px",
                        }}
                    >
                        <Plus size={16} />
                        Create Instance
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        flex: 1,
                        padding: "12px",
                        display: "grid",
                        gap: "12px",
                        ...getGridStyles(),
                    }}
                >
                    {instances.map((instance) => (
                        <MockInstanceViewport
                            key={instance.key}
                            title={instance.title}
                            color={instance.color}
                            isEmpty={instance.isEmpty}
                            onDelete={() => removeInstance(instance.key)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const Empty = {
    render: () => (
        <div style={{ height: "500px" }}>
            <MockWorkspaceGrid initialInstances={[]} />
        </div>
    ),
};

export const SingleInstance = {
    render: () => (
        <div style={{ height: "500px" }}>
            <MockWorkspaceGrid
                initialInstances={[
                    { key: "1", title: "Brain Scan Data", color: "#4CAF50" },
                ]}
            />
        </div>
    ),
};

export const TwoInstances = {
    render: () => (
        <div style={{ height: "500px" }}>
            <MockWorkspaceGrid
                initialInstances={[
                    { key: "1", title: "Brain Scan Data", color: "#4CAF50" },
                    { key: "2", title: "Heart Model", color: "#2196F3" },
                ]}
            />
        </div>
    ),
};

export const FourInstances = {
    render: () => (
        <div style={{ height: "600px" }}>
            <MockWorkspaceGrid
                initialInstances={[
                    { key: "1", title: "Brain Scan", color: "#4CAF50" },
                    { key: "2", title: "Heart Model", color: "#2196F3" },
                    { key: "3", title: "Lung Tissue", color: "#FF9800" },
                    { key: "4", title: "Neural Network", color: "#9C27B0" },
                ]}
            />
        </div>
    ),
};

export const SixInstances = {
    render: () => (
        <div style={{ height: "600px" }}>
            <MockWorkspaceGrid
                initialInstances={[
                    { key: "1", title: "Dataset 1", color: "#4CAF50" },
                    { key: "2", title: "Dataset 2", color: "#2196F3" },
                    { key: "3", title: "Dataset 3", color: "#FF9800" },
                    { key: "4", title: "Dataset 4", color: "#9C27B0" },
                    { key: "5", title: "Dataset 5", color: "#E91E63" },
                    { key: "6", title: "Dataset 6", color: "#00BCD4" },
                ]}
            />
        </div>
    ),
};

export const NineInstances = {
    render: () => (
        <div style={{ height: "700px" }}>
            <MockWorkspaceGrid
                initialInstances={
                    Array.from({ length: 9 }, (_, i) => (
                        {
                            key: `${i + 1}`,
                            title: `Dataset ${i + 1}`,
                            color: ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#E91E63", "#00BCD4", "#CDDC39", "#607D8B", "#795548"][i],
                        }
                    ))}
            />
        </div>
    ),
};

export const Interactive = {
    render: () => (
        <div style={{ height: "600px" }}>
            <MockWorkspaceGrid
                initialInstances={[
                    { key: "1", title: "Sample Dataset", color: "#4CAF50" },
                ]}
            />
        </div>
    ),
};

export const WithEmptyInstance = {
    render: () => (
        <div style={{ height: "500px" }}>
            <MockWorkspaceGrid
                initialInstances={[
                    { key: "1", title: "Brain Scan Data", color: "#4CAF50" },
                    { key: "2", title: "Empty Window", color: "#808080", isEmpty: true },
                ]}
            />
        </div>
    ),
};

// =============================================================================
// INSTANCE HIGHLIGHT DEMO
// =============================================================================

export const HighlightedInstance = {
    render: () => (
        <div style={{ height: "500px" }}>
            <div
                style={{
                    height: "100%",
                    background: "#0a0a0f",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #333",
                        fontSize: "14px",
                        color: "#e0e0e0",
                    }}
                >
                    Workspace (2)
                </div>
                <div
                    style={{
                        flex: 1,
                        padding: "12px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                    }}
                >
                    {/* Normal Instance */}
                    <MockInstanceViewport
                        title="Normal Instance"
                        color="#4CAF50"
                        onDelete={() => { }}
                    />

                    {/* Highlighted Instance */}
                    <div
                        style={{
                            animation: "highlight-pulse 2s ease-in-out",
                            borderRadius: "8px",
                            boxShadow: "0 0 0 3px #4CAF50, 0 0 20px rgba(76, 175, 80, 0.3)",
                        }}
                    >
                        <MockInstanceViewport
                            title="Highlighted Instance"
                            color="#4CAF50"
                            onDelete={() => { }}
                        />
                    </div>
                </div>
                <style>{`
                    @keyframes highlight-pulse {
                        0%, 100% { box-shadow: 0 0 0 3px #4CAF50, 0 0 20px rgba(76, 175, 80, 0.3); }
                        50% { box-shadow: 0 0 0 3px #4CAF50, 0 0 40px rgba(76, 175, 80, 0.5); }
                    }
                `}</style>
            </div>
        </div>
    ),
};