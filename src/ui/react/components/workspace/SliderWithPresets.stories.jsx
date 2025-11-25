import { SliderWithPresets } from "./SliderWithPresets";

export default {
    title: "Workspace/SliderWithPresets",
    component: SliderWithPresets,
    parameters: { layout: "centered" },
    argTypes: {
        onChange: { action: "changed" },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "20px", background: "#1a1a2e", width: "300px" }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        label: "Opacity",
        icon: "🔆",
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
    },
};

export const WithPresets = {
    args: {
        label: "Opacity",
        icon: "🔆",
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        presets: [0, 0.25, 0.5, 0.75, 1],
    },
};

export const Disabled = {
    args: {
        label: "Opacity",
        icon: "🔆",
        value: 0.5,
        disabled: true,
        disabledReason: "Select an instance first",
        presets: [0, 0.25, 0.5, 0.75, 1],
    },
};

export const CustomFormat = {
    args: {
        label: "Threshold",
        icon: "📊",
        value: 128,
        min: 0,
        max: 255,
        step: 1,
        formatValue: (val) => Math.round(val),
        presets: [0, 64, 128, 192, 255],
    },
};
