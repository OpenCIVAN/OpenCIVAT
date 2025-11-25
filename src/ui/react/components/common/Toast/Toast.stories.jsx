import { Toast } from "./Toast";

export default {
    title: "Common/Toast",
    component: Toast,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        type: {
            control: "select",
            options: ["info", "success", "warning", "error"],
        },
        onDismiss: { action: "dismissed" },
    },
};

export const Info = {
    args: {
        id: "1",
        type: "info",
        message: "This is an informational message",
    },
};

export const Success = {
    args: {
        id: "2",
        type: "success",
        message: "Operation completed successfully!",
    },
};

export const Warning = {
    args: {
        id: "3",
        type: "warning",
        message: "Please review before proceeding",
    },
};

export const Error = {
    args: {
        id: "4",
        type: "error",
        message: "Something went wrong. Please try again.",
    },
};

export const LongMessage = {
    args: {
        id: "5",
        type: "info",
        message: "This is a much longer message that demonstrates how the toast handles extended text content that might wrap to multiple lines in the UI.",
    },
};