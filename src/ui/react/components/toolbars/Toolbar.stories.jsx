// src/ui/react/components/toolbars/Toolbar.stories.jsx
import React, { useState } from "react";
import {
    Move,
    ZoomIn,
    RotateCcw,
    Crosshair,
    Square,
    Circle,
    Pencil,
    Eraser,
    MousePointer,
    Hand,
    Eye,
    EyeOff,
    Layers,
    Grid3x3,
    Camera,
    Download,
    Settings,
    Maximize,
} from "lucide-react";

export default {
    title: "Workspace/Toolbar",
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "40px", background: "#0a0a0f" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK TOOLBAR (since original is minimal)
// =============================================================================

const MockToolbar = ({
    windowId = "window-1",
    orientation = "horizontal",
    tools = [],
    activeTool = null,
    onToolSelect = () => { },
}) => {
    const [active, setActive] = useState(activeTool);

    const handleSelect = (toolId) => {
        setActive(toolId);
        onToolSelect(toolId);
    };

    const isVertical = orientation === "vertical";

    return (
        <div
            className="toolbar"
            data-window={windowId}
            style={{
                display: "flex",
                flexDirection: isVertical ? "column" : "row",
                gap: "4px",
                padding: "6px",
                background: "#1a1a1f",
                borderRadius: "6px",
                border: "1px solid #333",
            }}
        >
            {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = active === tool.id;

                return (
                    <button
                        key={tool.id}
                        onClick={() => handleSelect(tool.id)}
                        title={tool.label}
                        style={{
                            padding: "8px",
                            background: isActive ? "#4CAF50" : "transparent",
                            border: "1px solid",
                            borderColor: isActive ? "#4CAF50" : "transparent",
                            borderRadius: "4px",
                            color: isActive ? "white" : "#808080",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s",
                        }}
                    >
                        <Icon size={18} />
                    </button>
                );
            })}
        </div>
    );
};

// =============================================================================
// TOOL SETS
// =============================================================================

const NAVIGATION_TOOLS = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan" },
    { id: "zoom", icon: ZoomIn, label: "Zoom" },
    { id: "rotate", icon: RotateCcw, label: "Rotate" },
];

const ANNOTATION_TOOLS = [
    { id: "point", icon: Crosshair, label: "Point" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "freehand", icon: Pencil, label: "Freehand" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
];

const VIEW_TOOLS = [
    { id: "visibility", icon: Eye, label: "Toggle Visibility" },
    { id: "layers", icon: Layers, label: "Layers" },
    { id: "grid", icon: Grid3x3, label: "Grid" },
    { id: "fullscreen", icon: Maximize, label: "Fullscreen" },
];

const ACTION_TOOLS = [
    { id: "camera", icon: Camera, label: "Screenshot" },
    { id: "download", icon: Download, label: "Export" },
    { id: "settings", icon: Settings, label: "Settings" },
];

// =============================================================================
// STORIES
// =============================================================================

export const NavigationToolbar = {
    render: () => (
        <MockToolbar
            windowId="nav-window"
            tools={NAVIGATION_TOOLS}
            activeTool="select"
        />
    ),
};

export const AnnotationToolbar = {
    render: () => (
        <MockToolbar
            windowId="annotation-window"
            tools={ANNOTATION_TOOLS}
            activeTool="point"
        />
    ),
};

export const ViewToolbar = {
    render: () => (
        <MockToolbar
            windowId="view-window"
            tools={VIEW_TOOLS}
        />
    ),
};

export const VerticalToolbar = {
    render: () => (
        <MockToolbar
            windowId="vertical-window"
            orientation="vertical"
            tools={NAVIGATION_TOOLS}
            activeTool="pan"
        />
    ),
};

export const CombinedToolbar = {
    render: () => {
        const allTools = [
            ...NAVIGATION_TOOLS,
            { id: "separator-1", isSeparator: true },
            ...ANNOTATION_TOOLS,
            { id: "separator-2", isSeparator: true },
            ...ACTION_TOOLS,
        ];

        const [active, setActive] = useState("select");

        return (
            <div
                style={{
                    display: "flex",
                    gap: "4px",
                    padding: "6px",
                    background: "#1a1a1f",
                    borderRadius: "6px",
                    border: "1px solid #333",
                }}
            >
                {allTools.map((tool, index) => {
                    if (tool.isSeparator) {
                        return (
                            <div
                                key={tool.id}
                                style={{
                                    width: "1px",
                                    background: "#333",
                                    margin: "4px 2px",
                                }}
                            />
                        );
                    }

                    const Icon = tool.icon;
                    const isActive = active === tool.id;

                    return (
                        <button
                            key={tool.id}
                            onClick={() => setActive(tool.id)}
                            title={tool.label}
                            style={{
                                padding: "8px",
                                background: isActive ? "#4CAF50" : "transparent",
                                border: "1px solid",
                                borderColor: isActive ? "#4CAF50" : "transparent",
                                borderRadius: "4px",
                                color: isActive ? "white" : "#808080",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.15s",
                            }}
                        >
                            <Icon size={18} />
                        </button>
                    );
                })}
            </div>
        );
    },
};

// =============================================================================
// IN WINDOW CONTEXT
// =============================================================================

export const InWindowContext = {
    render: () => (
        <div
            style={{
                width: "400px",
                height: "300px",
                background: "#0a0a0f",
                border: "1px solid #333",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Window Header */}
            <div
                style={{
                    padding: "8px 12px",
                    background: "#1a1a1f",
                    borderBottom: "1px solid #333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <span style={{ fontSize: "12px", color: "#e0e0e0" }}>
                    Instance Window
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        style={{
                            padding: "4px",
                            background: "transparent",
                            border: "none",
                            color: "#808080",
                            cursor: "pointer",
                        }}
                    >
                        <Maximize size={14} />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ padding: "4px 8px", borderBottom: "1px solid #333" }}>
                <MockToolbar
                    windowId="context-window"
                    tools={NAVIGATION_TOOLS}
                    activeTool="select"
                />
            </div>

            {/* Content Area */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#404040",
                    fontSize: "14px",
                }}
            >
                Visualization Area
            </div>
        </div>
    ),
};

// =============================================================================
// FLOATING TOOLBAR
// =============================================================================

export const FloatingToolbar = {
    render: () => (
        <div
            style={{
                position: "relative",
                width: "400px",
                height: "300px",
                background: "#0a0a0f",
                border: "1px solid #333",
                borderRadius: "8px",
            }}
        >
            {/* Floating toolbar */}
            <div
                style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                }}
            >
                <MockToolbar
                    windowId="floating-window"
                    orientation="vertical"
                    tools={NAVIGATION_TOOLS}
                    activeTool="pan"
                />
            </div>

            {/* Content */}
            <div
                style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#404040",
                }}
            >
                Floating toolbar on left
            </div>
        </div>
    ),
};

// =============================================================================
// WITH TOGGLE STATES
// =============================================================================

export const ToggleButtons = {
    render: () => {
        const [visibility, setVisibility] = useState(true);
        const [gridVisible, setGridVisible] = useState(false);

        return (
            <div
                style={{
                    display: "flex",
                    gap: "4px",
                    padding: "6px",
                    background: "#1a1a1f",
                    borderRadius: "6px",
                    border: "1px solid #333",
                }}
            >
                <button
                    onClick={() => setVisibility(!visibility)}
                    title={visibility ? "Hide" : "Show"}
                    style={{
                        padding: "8px",
                        background: visibility ? "rgba(76, 175, 80, 0.2)" : "transparent",
                        border: "1px solid",
                        borderColor: visibility ? "#4CAF50" : "transparent",
                        borderRadius: "4px",
                        color: visibility ? "#4CAF50" : "#808080",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {visibility ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>

                <button
                    onClick={() => setGridVisible(!gridVisible)}
                    title={gridVisible ? "Hide Grid" : "Show Grid"}
                    style={{
                        padding: "8px",
                        background: gridVisible ? "rgba(33, 150, 243, 0.2)" : "transparent",
                        border: "1px solid",
                        borderColor: gridVisible ? "#2196F3" : "transparent",
                        borderRadius: "4px",
                        color: gridVisible ? "#2196F3" : "#808080",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Grid3x3 size={18} />
                </button>

                <div style={{ width: "1px", background: "#333", margin: "4px 2px" }} />

                <button
                    style={{
                        padding: "8px",
                        background: "transparent",
                        border: "1px solid transparent",
                        borderRadius: "4px",
                        color: "#808080",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Camera size={18} />
                </button>
            </div>
        );
    },
};