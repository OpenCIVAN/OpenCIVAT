import { PositionGridPicker } from "./PositionGridPicker";

export default {
    title: "Workspace/PositionGridPicker",
    component: PositionGridPicker,
    parameters: { layout: "centered" },
    argTypes: {
        onPositionChange: { action: "position-changed" },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "20px", background: "#1a1a2e" }}>
                <Story />
            </div>
        ),
    ],
};

const defaultPositions = [
    { id: "TOP_LEFT", icon: "corner-up-left", label: "Top Left" },
    { id: "TOP_RIGHT", icon: "corner-up-right", label: "Top Right" },
    { id: "BOTTOM_LEFT", icon: "corner-down-left", label: "Bottom Left" },
    { id: "BOTTOM_RIGHT", icon: "corner-down-right", label: "Bottom Right" },
];

export const Default = {
    args: {
        positions: defaultPositions,
        currentPosition: null,
    },
};

export const WithSelection = {
    args: {
        positions: defaultPositions,
        currentPosition: "TOP_LEFT",
    },
};

export const Disabled = {
    args: {
        positions: defaultPositions,
        currentPosition: "BOTTOM_RIGHT",
        disabled: true,
    },
};
