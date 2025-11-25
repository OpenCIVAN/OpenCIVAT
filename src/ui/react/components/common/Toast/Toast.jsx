// src/ui/react/components/common/Toast/Toast.jsx
import React from "react";
import { X, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import "./Toast.scss";

const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
};

export function Toast({ id, type, message, onDismiss }) {
    const Icon = icons[type] || Info;

    return (
        <div className={`toast toast--${type}`}>
            <Icon className="toast__icon" size={18} />
            <span className="toast__message">{message}</span>
            <button className="toast__close" onClick={() => onDismiss(id)}>
                <X size={14} />
            </button>
        </div>
    );
}
