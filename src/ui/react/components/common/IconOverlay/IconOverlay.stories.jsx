// src/ui/react/components/common/IconOverlay.stories.jsx
import React from "react";
import { Mic, Video, Compass, Eye, Wifi, Volume2, Bell } from "lucide-react";
import { IconOverlay, SlashedIcon, createSlashedIcon } from "./IconOverlay";
import "./IconOverlay.scss";

export default {
    title: "Atoms/IconOverlay",
    component: IconOverlay,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "40px", background: "#0a0a0f", color: "#e0e0e0" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// ICON OVERLAY STORIES
// =============================================================================

export const Default = {
    render: () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <SlashedIcon icon={Mic} size={24} />
            <span style={{ fontSize: "12px", color: "#808080" }}>Mic Off</span>
        </div>
    ),
};

export const SlashedIcons = {
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Mic size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Mic On</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon={Mic} size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Mic Off</span>
                </div>
            </div>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Video size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Video On</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon={Video} size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Video Off</span>
                </div>
            </div>
            <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Eye size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Visible</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon={Eye} size={24} />
                    <span style={{ fontSize: "11px", color: "#808080" }}>Hidden</span>
                </div>
            </div>
        </div>
    ),
};

export const Sizes = {
    render: () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <SlashedIcon icon={Mic} size={14} />
            <SlashedIcon icon={Mic} size={18} />
            <SlashedIcon icon={Mic} size={24} />
            <SlashedIcon icon={Mic} size={32} />
        </div>
    ),
};

export const StrokeWidths = {
    render: () => (
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon={Compass} size={24} strokeWidth={1} />
                <span style={{ fontSize: "10px", color: "#666" }}>1px</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon={Compass} size={24} strokeWidth={1.5} />
                <span style={{ fontSize: "10px", color: "#666" }}>1.5px</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon={Compass} size={24} strokeWidth={2} />
                <span style={{ fontSize: "10px", color: "#666" }}>2px</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <SlashedIcon icon={Compass} size={24} strokeWidth={2.5} />
                <span style={{ fontSize: "10px", color: "#666" }}>2.5px</span>
            </div>
        </div>
    ),
};

export const AllCommonIcons = {
    render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
            {[Mic, Video, Compass, Eye, Wifi, Volume2, Bell].map((Icon, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedIcon icon={Icon} size={24} />
                    <span style={{ fontSize: "10px", color: "#666" }}>{Icon.displayName || Icon.name}</span>
                </div>
            ))}
        </div>
    ),
};

// =============================================================================
// USAGE IN BUTTONS
// =============================================================================

export const InButtonContext = {
    render: () => (
        <div style={{ display: "flex", gap: "12px" }}>
            <button
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#e0e0e0",
                    cursor: "pointer",
                }}
            >
                <Mic size={16} />
                <span>Unmuted</span>
            </button>
            <button
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "#3a2020",
                    border: "1px solid #ff4444",
                    borderRadius: "4px",
                    color: "#ff8888",
                    cursor: "pointer",
                }}
            >
                <SlashedIcon icon={Mic} size={16} />
                <span>Muted</span>
            </button>
        </div>
    ),
};

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export const CreateSlashedIconFactory = {
    render: () => {
        const SlashedCompass = createSlashedIcon(Compass);
        const SlashedWifi = createSlashedIcon(Wifi);

        return (
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedCompass size={24} />
                    <span style={{ fontSize: "10px", color: "#666" }}>Factory created</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <SlashedWifi size={24} />
                    <span style={{ fontSize: "10px", color: "#666" }}>Factory created</span>
                </div>
            </div>
        );
    },
};