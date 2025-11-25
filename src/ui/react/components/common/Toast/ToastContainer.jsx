// src/ui/react/components/common/Toast/ToastContainer.jsx
import React from "react";
import { useToastStore } from "@UI/react/store/toastStore.js";
import { Toast } from "./Toast.jsx";
import "./Toast.scss";

export function ToastContainer() {
    const toasts = useToastStore((state) => state.toasts);
    const removeToast = useToastStore((state) => state.removeToast);

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <Toast key={t.id} {...t} onDismiss={removeToast} />
            ))}
        </div>
    );
}
