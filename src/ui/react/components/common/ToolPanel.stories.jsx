import { ToolPanel } from "./ToolPanel";

export default {
    title: "Common/ToolPanel",
    component: ToolPanel,
    parameters: {
        layout: "fullscreen",
    },
    argTypes: {
        isOpen: {
            control: "boolean",
        },
        onClose: { action: "closed" },
    },
    decorators: [
        (Story) => (
            <div style={{ height: "500px", position: "relative", background: "#000" }}>
                <Story />
            </div>
        ),
    ],
};

export const Open = {
    args: {
        isOpen: true,
        title: "File Explorer",
        icon: "📁",
        children: (
            <div style={{ color: "#e0e0e0" }}>
                <p>Panel content goes here.</p>
                <ul style={{ paddingLeft: "20px", marginTop: "10px" }}>
                    <li>Item 1</li>
                    <li>Item 2</li>
                    <li>Item 3</li>
                </ul>
            </div>
        ),
    },
};

export const Closed = {
    args: {
        isOpen: false,
        title: "File Explorer",
        icon: "📁",
        children: <div>Hidden content</div>,
    },
};

export const SettingsPanel = {
    args: {
        isOpen: true,
        title: "Settings",
        icon: "⚙️",
        children: (
            <div style={{ color: "#e0e0e0" }}>
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>Theme</label>
                    <select style={{ width: "100%", padding: "8px", background: "#333", color: "#fff", border: "1px solid #444" }}>
                        <option>Dark</option>
                        <option>Light</option>
                    </select>
                </div>
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>Language</label>
                    <select style={{ width: "100%", padding: "8px", background: "#333", color: "#fff", border: "1px solid #444" }}>
                        <option>English</option>
                        <option>Spanish</option>
                    </select>
                </div>
            </div>
        ),
    },
};