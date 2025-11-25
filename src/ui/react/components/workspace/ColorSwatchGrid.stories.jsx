import { ColorSwatchGrid } from "./ColorSwatchGrid";

export default {
    title: "Workspace/ColorSwatchGrid",
    component: ColorSwatchGrid,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        currentColormap: {
            control: "select",
            options: ["rainbow", "viridis", "plasma", "hot", "cool", "grayscale", "turbo", "magma", "inferno", null],
        },
        disabled: {
            control: "boolean",
        },
        onColormapChange: { action: "colormap-changed" },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "20px", background: "#1a1a2e", minWidth: "300px" }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        currentColormap: null,
        disabled: false,
    },
};

export const WithSelection = {
    args: {
        currentColormap: "viridis",
        disabled: false,
    },
};

export const RainbowSelected = {
    args: {
        currentColormap: "rainbow",
        disabled: false,
    },
};

export const PlasmaSelected = {
    args: {
        currentColormap: "plasma",
        disabled: false,
    },
};

export const Disabled = {
    args: {
        currentColormap: "hot",
        disabled: true,
    },
};