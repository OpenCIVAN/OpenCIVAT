import { CameraViewGridPicker } from "./CameraViewGridPicker";

export default {
    title: "Molecules/CameraViewGridPicker",
    component: CameraViewGridPicker,
    parameters: { layout: "centered" },
    argTypes: {
        onViewChange: { action: "view-changed" },
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "20px", background: "#1a1a2e" }}>
                <Story />
            </div>
        ),
    ],
};

const defaultViews = [
    { id: "top", icon: "camera", label: "Top" },
    { id: "isometric", icon: "box", label: "Iso", special: true },
    { id: "left", icon: "camera", label: "Left" },
    { id: "reset", icon: "maximize-2", label: "Reset", special: true },
    { id: "right", icon: "camera", label: "Right" },
    { id: "bottom", icon: "camera", label: "Bottom" },
    { id: "front", icon: "camera", label: "Front" },
    { id: "back", icon: "camera", label: "Back" },
];

export const Default = {
    args: {
        views: defaultViews,
    },
};

export const Disabled = {
    args: {
        views: defaultViews,
        disabled: true,
    },
};
