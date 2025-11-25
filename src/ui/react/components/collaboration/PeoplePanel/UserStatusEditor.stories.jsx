import { UserStatusEditor } from "./UserStatusEditor";

export default {
    title: "Collaboration/UserStatusEditor",
    component: UserStatusEditor,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        currentStatus: {
            control: "select",
            options: ["online", "idle", "away", "dnd"],
        },
        onSave: { action: "saved" },
        onClose: { action: "closed" },
    },
    decorators: [
        (Story) => (
            <div style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000"
            }}>
                <Story />
            </div>
        ),
    ],
};

export const Default = {
    args: {
        currentStatus: "online",
        currentMessage: "",
    },
};

export const WithExistingMessage = {
    args: {
        currentStatus: "online",
        currentMessage: "Working on the new feature",
    },
};

export const IdleStatus = {
    args: {
        currentStatus: "idle",
        currentMessage: "Be right back",
    },
};

export const AwayStatus = {
    args: {
        currentStatus: "away",
        currentMessage: "At lunch",
    },
};

export const DoNotDisturb = {
    args: {
        currentStatus: "dnd",
        currentMessage: "Deep work - no interruptions please",
    },
};