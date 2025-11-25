// src/ui/react/components/workspace/SmartTooltip.stories.jsx
import React, { useRef, useState } from "react";
import { Settings, Plus, Trash2, Play, Info } from "lucide-react";
import { SmartTooltip, useSmartTooltip } from "./SmartTooltip";

export default {
    title: "Workspace/SmartTooltip",
    component: SmartTooltip,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "100px", background: "#0a0a0f" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default = {
    render: () => {
        const targetRef = useRef(null);
        const [show, setShow] = useState(false);

        return (
            <>
                <button
                    ref={targetRef}
                    onMouseEnter={() => setShow(true)}
                    onMouseLeave={() => setShow(false)}
                    style={{
                        padding: "10px 16px",
                        background: "#2a2a2f",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "#e0e0e0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Settings size={16} />
                    Hover me
                </button>
                <SmartTooltip targetRef={targetRef} show={show}>
                    Settings
                </SmartTooltip>
            </>
        );
    },
};

export const WithDelay = {
    render: () => {
        const targetRef = useRef(null);
        const [show, setShow] = useState(false);

        return (
            <>
                <button
                    ref={targetRef}
                    onMouseEnter={() => setShow(true)}
                    onMouseLeave={() => setShow(false)}
                    style={{
                        padding: "10px 16px",
                        background: "#2a2a2f",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "#e0e0e0",
                        cursor: "pointer",
                    }}
                >
                    Hover (800ms delay)
                </button>
                <SmartTooltip targetRef={targetRef} show={show} delay={800}>
                    This tooltip has a longer delay
                </SmartTooltip>
            </>
        );
    },
};

export const RichContent = {
    render: () => {
        const targetRef = useRef(null);
        const [show, setShow] = useState(false);

        return (
            <>
                <button
                    ref={targetRef}
                    onMouseEnter={() => setShow(true)}
                    onMouseLeave={() => setShow(false)}
                    style={{
                        padding: "10px 16px",
                        background: "#4CAF50",
                        border: "none",
                        borderRadius: "4px",
                        color: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Play size={16} />
                    Play
                </button>
                <SmartTooltip targetRef={targetRef} show={show}>
                    <div style={{ maxWidth: "200px" }}>
                        <strong style={{ display: "block", marginBottom: "4px" }}>
                            Play Animation
                        </strong>
                        <span style={{ fontSize: "11px", color: "#808080" }}>
                            Start the dataset animation. Press Space to toggle.
                        </span>
                        <div
                            style={{
                                marginTop: "6px",
                                padding: "4px 8px",
                                background: "#333",
                                borderRadius: "2px",
                                fontSize: "10px",
                                fontFamily: "monospace",
                            }}
                        >
                            Shortcut: Space
                        </div>
                    </div>
                </SmartTooltip>
            </>
        );
    },
};

// =============================================================================
// HOOK USAGE
// =============================================================================

export const UsingHook = {
    render: () => {
        const { targetRef, tooltipProps, buttonProps } = useSmartTooltip();

        return (
            <>
                <button
                    ref={targetRef}
                    {...buttonProps}
                    style={{
                        padding: "10px 16px",
                        background: "#2a2a2f",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "#e0e0e0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Info size={16} />
                    Using Hook
                </button>
                <SmartTooltip {...tooltipProps}>
                    This uses the useSmartTooltip hook
                </SmartTooltip>
            </>
        );
    },
};

// =============================================================================
// POSITIONING DEMOS
// =============================================================================

export const PositioningDemo = {
    render: () => {
        const ButtonWithTooltip = ({ position, label }) => {
            const targetRef = useRef(null);
            const [show, setShow] = useState(false);

            const positionStyles = {
                topLeft: { top: "20px", left: "20px" },
                topRight: { top: "20px", right: "20px" },
                bottomLeft: { bottom: "20px", left: "20px" },
                bottomRight: { bottom: "20px", right: "20px" },
                center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
            };

            return (
                <div style={{ position: "absolute", ...positionStyles[position] }}>
                    <button
                        ref={targetRef}
                        onMouseEnter={() => setShow(true)}
                        onMouseLeave={() => setShow(false)}
                        style={{
                            padding: "8px 12px",
                            background: "#2a2a2f",
                            border: "1px solid #444",
                            borderRadius: "4px",
                            color: "#e0e0e0",
                            cursor: "pointer",
                            fontSize: "12px",
                        }}
                    >
                        {label}
                    </button>
                    <SmartTooltip targetRef={targetRef} show={show} delay={200}>
                        Tooltip auto-positions to stay in viewport
                    </SmartTooltip>
                </div>
            );
        };

        return (
            <div
                style={{
                    position: "relative",
                    width: "400px",
                    height: "300px",
                    background: "#1a1a1f",
                    border: "1px solid #333",
                    borderRadius: "8px",
                }}
            >
                <ButtonWithTooltip position="topLeft" label="Top Left" />
                <ButtonWithTooltip position="topRight" label="Top Right" />
                <ButtonWithTooltip position="bottomLeft" label="Bottom Left" />
                <ButtonWithTooltip position="bottomRight" label="Bottom Right" />
                <ButtonWithTooltip position="center" label="Center" />
            </div>
        );
    },
};

// =============================================================================
// TOOLBAR CONTEXT
// =============================================================================

export const InToolbarContext = {
    render: () => {
        const tools = [
            { icon: Plus, label: "Add", shortcut: "A" },
            { icon: Trash2, label: "Delete", shortcut: "Del" },
            { icon: Settings, label: "Settings", shortcut: "S" },
            { icon: Play, label: "Play", shortcut: "Space" },
        ];

        return (
            <div
                style={{
                    display: "flex",
                    gap: "4px",
                    padding: "8px",
                    background: "#1a1a1f",
                    borderRadius: "6px",
                    border: "1px solid #333",
                }}
            >
                {tools.map((tool, index) => {
                    const ToolButton = () => {
                        const targetRef = useRef(null);
                        const [show, setShow] = useState(false);
                        const Icon = tool.icon;

                        return (
                            <>
                                <button
                                    ref={targetRef}
                                    onMouseEnter={() => setShow(true)}
                                    onMouseLeave={() => setShow(false)}
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
                                    <Icon size={18} />
                                </button>
                                <SmartTooltip targetRef={targetRef} show={show} delay={300}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span>{tool.label}</span>
                                        <span
                                            style={{
                                                padding: "2px 6px",
                                                background: "#333",
                                                borderRadius: "2px",
                                                fontSize: "10px",
                                                fontFamily: "monospace",
                                            }}
                                        >
                                            {tool.shortcut}
                                        </span>
                                    </div>
                                </SmartTooltip>
                            </>
                        );
                    };

                    return <ToolButton key={index} />;
                })}
            </div>
        );
    },
};

// =============================================================================
// ALWAYS VISIBLE (FOR STYLING)
// =============================================================================

export const AlwaysVisible = {
    render: () => {
        const targetRef = useRef(null);

        return (
            <>
                <button
                    ref={targetRef}
                    style={{
                        padding: "10px 16px",
                        background: "#2a2a2f",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "#e0e0e0",
                        cursor: "pointer",
                    }}
                >
                    Target Button
                </button>
                <SmartTooltip targetRef={targetRef} show={true} delay={0}>
                    Always visible tooltip for styling preview
                </SmartTooltip>
            </>
        );
    },
};