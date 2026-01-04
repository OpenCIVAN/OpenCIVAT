/**
 * @file Toast.stories.jsx
 * @description Storybook stories for Toast notification components.
 * Demonstrates all toast variants, action buttons, and the toast store.
 */

import React from "react";
import { Toast } from "./Toast";
import { ToastContainer } from "./ToastContainer";
import { toast, useToastStore } from "@UI/react/store/toastStore";

export default {
    title: "Molecules/Toast",
    component: Toast,
    parameters: {
        layout: "centered",
    },
    argTypes: {
        type: {
            control: "select",
            options: ["info", "success", "warning", "error"],
            description: "Toast severity type",
        },
        message: {
            control: "text",
            description: "Toast message content",
        },
        actionLabel: {
            control: "text",
            description: "Optional action button label",
        },
        dismissible: {
            control: "boolean",
            description: "Show dismiss button",
        },
        onDismiss: { action: "dismissed" },
        onAction: { action: "action clicked" },
    },
};

// ============================================================================
// BASIC VARIANTS
// ============================================================================

export const Info = {
    args: {
        id: "toast-info",
        type: "info",
        message: "New version available. Refresh to update.",
        dismissible: true,
    },
};

export const Success = {
    args: {
        id: "toast-success",
        type: "success",
        message: "File uploaded successfully!",
        dismissible: true,
    },
};

export const Warning = {
    args: {
        id: "toast-warning",
        type: "warning",
        message: "Connection unstable. Some features may be limited.",
        dismissible: true,
    },
};

export const Error = {
    args: {
        id: "toast-error",
        type: "error",
        message: "Failed to save changes. Please try again.",
        dismissible: true,
    },
};

// ============================================================================
// WITH ACTION BUTTON
// ============================================================================

export const WithAction = {
    args: {
        id: "toast-action",
        type: "info",
        message: "View moved to trash",
        actionLabel: "Undo",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Toast with an action button that allows users to undo an operation.",
            },
        },
    },
};

export const ErrorWithRetry = {
    args: {
        id: "toast-retry",
        type: "error",
        message: "Upload failed: Network error",
        actionLabel: "Retry",
        dismissible: true,
    },
    parameters: {
        docs: {
            description: {
                story: "Error toast with a retry action button.",
            },
        },
    },
};

export const SuccessWithView = {
    args: {
        id: "toast-view",
        type: "success",
        message: "Recording saved",
        actionLabel: "View",
        dismissible: true,
    },
};

// ============================================================================
// VARIATIONS
// ============================================================================

export const LongMessage = {
    args: {
        id: "toast-long",
        type: "info",
        message:
            "This is a much longer message that demonstrates how the toast handles extended text content that might wrap to multiple lines in the UI. The toast should handle this gracefully.",
        dismissible: true,
    },
};

export const NotDismissible = {
    args: {
        id: "toast-persistent",
        type: "warning",
        message: "Processing... Please wait.",
        dismissible: false,
    },
    parameters: {
        docs: {
            description: {
                story: "Toast without a dismiss button. Useful for ongoing operations.",
            },
        },
    },
};

export const WithActionNotDismissible = {
    args: {
        id: "toast-action-only",
        type: "error",
        message: "Session expired",
        actionLabel: "Sign In",
        dismissible: false,
    },
    parameters: {
        docs: {
            description: {
                story: "Error toast that can only be dismissed by clicking the action button.",
            },
        },
    },
};

// ============================================================================
// INTERACTIVE DEMO
// ============================================================================

/**
 * Interactive demo showing how to use the toast store.
 */
export const InteractiveDemo = {
    render: () => {
        const showInfo = () => {
            toast.info("This is an info message");
        };

        const showSuccess = () => {
            toast.success("Operation completed successfully!");
        };

        const showWarning = () => {
            toast.warning("Please review before proceeding");
        };

        const showError = () => {
            toast.error("Something went wrong");
        };

        const showWithAction = () => {
            toast.info("View moved to trash", {
                actionLabel: "Undo",
                onAction: () => console.log("Undo clicked!"),
                duration: 5000,
            });
        };

        const showPersistent = () => {
            toast.error("Connection lost", {
                duration: 0,
                actionLabel: "Retry",
                onAction: () => console.log("Retry clicked!"),
            });
        };

        const clearAll = () => {
            toast.dismissAll();
        };

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ color: "#fff", margin: 0 }}>Toast Demo</h3>
                <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                    Click buttons to show toasts. They appear in the bottom-right corner.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button onClick={showInfo} style={buttonStyle}>
                        Info
                    </button>
                    <button onClick={showSuccess} style={buttonStyle}>
                        Success
                    </button>
                    <button onClick={showWarning} style={buttonStyle}>
                        Warning
                    </button>
                    <button onClick={showError} style={buttonStyle}>
                        Error
                    </button>
                    <button onClick={showWithAction} style={buttonStyle}>
                        With Action
                    </button>
                    <button onClick={showPersistent} style={buttonStyle}>
                        Persistent
                    </button>
                    <button onClick={clearAll} style={{ ...buttonStyle, background: "#333" }}>
                        Clear All
                    </button>
                </div>
                <ToastContainer />
            </div>
        );
    },
    parameters: {
        layout: "padded",
        docs: {
            description: {
                story:
                    "Interactive demo showing how to use the toast store. Click buttons to trigger different toast types.",
            },
        },
    },
};

// Button style for demo
const buttonStyle = {
    padding: "8px 16px",
    background: "#2a2a2a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "13px",
    cursor: "pointer",
};

// ============================================================================
// STACKED TOASTS
// ============================================================================

/**
 * Demo showing multiple stacked toasts.
 */
export const StackedToasts = {
    render: () => {
        const showMultiple = () => {
            toast.info("First notification");
            setTimeout(() => toast.success("Second notification"), 200);
            setTimeout(() => toast.warning("Third notification"), 400);
            setTimeout(() => toast.error("Fourth notification"), 600);
        };

        const showMany = () => {
            for (let i = 1; i <= 7; i++) {
                setTimeout(() => {
                    toast.info(`Notification ${i} of 7`);
                }, i * 150);
            }
        };

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ color: "#fff", margin: 0 }}>Stacked Toasts Demo</h3>
                <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                    Maximum 5 toasts visible. Oldest are auto-dismissed when limit exceeded.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={showMultiple} style={buttonStyle}>
                        Show 4 Toasts
                    </button>
                    <button onClick={showMany} style={buttonStyle}>
                        Show 7 Toasts (test limit)
                    </button>
                    <button onClick={() => toast.dismissAll()} style={buttonStyle}>
                        Clear All
                    </button>
                </div>
                <ToastContainer />
            </div>
        );
    },
    parameters: {
        layout: "padded",
        docs: {
            description: {
                story:
                    "Demo showing toast stacking behavior. Maximum 5 toasts are visible at once.",
            },
        },
    },
};