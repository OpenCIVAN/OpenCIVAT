// src/ui/react/components/workspace/SliderMenuOption.stories.jsx
import React, { useState } from "react";
import { Icon } from '@UI/react/components/atoms/Icon';
import { SliderMenuOption } from "./SliderMenuOption";

export default {
    title: "Molecules/SliderMenuOption",
    component: SliderMenuOption,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div
                style={{
                    width: "280px",
                    padding: "16px",
                    background: "#1a1a1f",
                    borderRadius: "8px",
                    border: "1px solid #333",
                }}
            >
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
        const [value, setValue] = useState(0.5);
        return (
            <SliderMenuOption
                label="Opacity"
                value={value}
                onChange={setValue}
            />
        );
    },
};

export const WithIcon = {
    render: () => {
        const [value, setValue] = useState(0.75);
        return (
            <SliderMenuOption
                icon={<Icon name="circle" size={14} />}
                label="Opacity"
                value={value}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
            />
        );
    },
};

export const WithDescription = {
    render: () => {
        const [value, setValue] = useState(0.5);
        return (
            <SliderMenuOption
                icon={<Icon name="sun" size={14} />}
                label="Brightness"
                description="Adjust the brightness of the visualization"
                value={value}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
            />
        );
    },
};

export const WithPresets = {
    render: () => {
        const [value, setValue] = useState(0.5);
        return (
            <SliderMenuOption
                icon={<Icon name="circle" size={14} />}
                label="Opacity"
                value={value}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val * 100)}%`}
                presets={[0, 0.25, 0.5, 0.75, 1.0]}
            />
        );
    },
};

export const CustomRange = {
    render: () => {
        const [value, setValue] = useState(50);
        return (
            <SliderMenuOption
                icon={<Icon name="volume2" size={14} />}
                label="Volume"
                value={value}
                min={0}
                max={100}
                step={1}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val)}%`}
            />
        );
    },
};

export const Disabled = {
    render: () => (
        <SliderMenuOption
            icon={<Icon name="layers" size={14} />}
            label="Layer Depth"
            value={0.5}
            onChange={() => { }}
            disabled={true}
            formatValue={(val) => `${Math.round(val * 100)}%`}
        />
    ),
};

// =============================================================================
// PRACTICAL EXAMPLES
// =============================================================================

export const PointSizeSlider = {
    render: () => {
        const [value, setValue] = useState(5);
        return (
            <SliderMenuOption
                icon={<Icon name="circle" size={14} />}
                label="Point Size"
                description="Size of points in point cloud"
                value={value}
                min={1}
                max={20}
                step={0.5}
                onChange={setValue}
                formatValue={(val) => `${val.toFixed(1)}px`}
            />
        );
    },
};

export const ZoomSlider = {
    render: () => {
        const [value, setValue] = useState(1);
        return (
            <SliderMenuOption
                icon={<Icon name="maximize" size={14} />}
                label="Zoom Level"
                value={value}
                min={0.1}
                max={5}
                step={0.1}
                onChange={setValue}
                formatValue={(val) => `${val.toFixed(1)}x`}
                presets={[0.5, 1, 2, 3, 5]}
            />
        );
    },
};

export const RotationSlider = {
    render: () => {
        const [value, setValue] = useState(0);
        return (
            <SliderMenuOption
                icon={<Icon name="rotateCcw" size={14} />}
                label="Rotation"
                value={value}
                min={0}
                max={360}
                step={1}
                onChange={setValue}
                formatValue={(val) => `${Math.round(val)}°`}
                presets={[0, 90, 180, 270, 360]}
            />
        );
    },
};

// =============================================================================
// IN MENU CONTEXT
// =============================================================================

export const InMenuContext = {
    render: () => {
        const [opacity, setOpacity] = useState(0.8);
        const [pointSize, setPointSize] = useState(5);
        const [brightness, setBrightness] = useState(1);

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {/* Menu Header */}
                <div
                    style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #333",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#e0e0e0",
                        marginBottom: "4px",
                    }}
                >
                    Appearance Settings
                </div>

                <SliderMenuOption
                    icon={<Icon name="circle" size={14} />}
                    label="Opacity"
                    value={opacity}
                    onChange={setOpacity}
                    formatValue={(val) => `${Math.round(val * 100)}%`}
                />

                <div style={{ height: "1px", background: "#333", margin: "4px 0" }} />

                <SliderMenuOption
                    icon={<Icon name="circle" size={14} />}
                    label="Point Size"
                    value={pointSize}
                    min={1}
                    max={20}
                    step={0.5}
                    onChange={setPointSize}
                    formatValue={(val) => `${val.toFixed(1)}px`}
                />

                <div style={{ height: "1px", background: "#333", margin: "4px 0" }} />

                <SliderMenuOption
                    icon={<Icon name="sun" size={14} />}
                    label="Brightness"
                    value={brightness}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={setBrightness}
                    formatValue={(val) => `${Math.round(val * 100)}%`}
                />

                {/* Current Values Display */}
                <div
                    style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "#2a2a2f",
                        borderRadius: "4px",
                        fontSize: "11px",
                        color: "#808080",
                    }}
                >
                    <div>Opacity: {(opacity * 100).toFixed(0)}%</div>
                    <div>Point Size: {pointSize.toFixed(1)}px</div>
                    <div>Brightness: {(brightness * 100).toFixed(0)}%</div>
                </div>
            </div>
        );
    },
};

// =============================================================================
// INTERACTIVE DEMO
// =============================================================================

export const InteractiveDemo = {
    render: () => {
        const [value, setValue] = useState(0.5);

        return (
            <div>
                <SliderMenuOption
                    icon={<Icon name="circle" size={14} />}
                    label="Interactive Slider"
                    description="Drag to see real-time updates"
                    value={value}
                    onChange={setValue}
                    formatValue={(val) => `${Math.round(val * 100)}%`}
                    presets={[0, 0.25, 0.5, 0.75, 1.0]}
                />

                {/* Visual feedback */}
                <div
                    style={{
                        marginTop: "16px",
                        height: "60px",
                        background: `rgba(76, 175, 80, ${value})`,
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: value > 0.5 ? "#000" : "#fff",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "background 0.1s",
                    }}
                >
                    Opacity: {Math.round(value * 100)}%
                </div>

                <p
                    style={{
                        marginTop: "12px",
                        fontSize: "11px",
                        color: "#666",
                        textAlign: "center",
                    }}
                >
                    Updates are throttled during drag for performance
                </p>
            </div>
        );
    },
};