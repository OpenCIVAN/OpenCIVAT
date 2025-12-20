import { UserAvatar, UserAvatarGroup } from "./UserAvatar";

export default {
    title: "Collaboration/UserAvatar",
    component: UserAvatar,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        size: {
            control: "select",
            options: ["xs", "sm", "md", "lg"],
        },
        showBorder: {
            control: "boolean",
        },
    },
};

// Single Avatar Stories
export const Default = {
    args: {
        userName: "Beth Smith",
        size: "md",
    },
};

export const SingleName = {
    args: {
        userName: "Claude",
        size: "md",
    },
};

export const WithCustomColor = {
    args: {
        userName: "Alex Johnson",
        color: "#9C27B0",
        size: "md",
    },
};

export const WithBorder = {
    args: {
        userName: "Sam Wilson",
        showBorder: true,
        size: "md",
    },
};

// Size Variants
export const Sizes = {
    render: () => (
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <UserAvatar userName="User" size="xs" />
            <UserAvatar userName="User" size="sm" />
            <UserAvatar userName="User" size="md" />
            <UserAvatar userName="User" size="lg" />
        </div>
    ),
};

// Avatar Group Stories
export const Group = {
    render: () => (
        <UserAvatarGroup
            users={[
                { userName: "Beth Smith", userColor: "#F44336" },
                { userName: "Claude AI", userColor: "#2196F3" },
                { userName: "Sam Wilson", userColor: "#4CAF50" },
            ]}
            max={3}
            size="sm"
        />
    ),
};

export const GroupWithOverflow = {
    render: () => (
        <UserAvatarGroup
            users={[
                { userName: "Beth Smith", userColor: "#F44336" },
                { userName: "Claude AI", userColor: "#2196F3" },
                { userName: "Sam Wilson", userColor: "#4CAF50" },
                { userName: "Alex Johnson", userColor: "#9C27B0" },
                { userName: "Jordan Lee", userColor: "#FF9800" },
                { userName: "Casey Brown", userColor: "#00BCD4" },
            ]}
            max={3}
            size="sm"
        />
    ),
};

// All Color Variants
export const ColorVariants = {
    render: () => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack"].map(name => (
                <UserAvatar key={name} userName={name} size="md" />
            ))}
        </div>
    ),
};