// src/ui/react/components/auth/DevModeBanner.jsx
// Development mode warning banner

import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import "./DevModeBanner.scss";

/** Storage key for dismissed state */
const DISMISSED_KEY = "cia_dev_banner_dismissed";

/**
 * DevModeBanner - Warning banner shown when running in development mode
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether to show the banner
 * @param {string} props.message - Optional custom message
 */
export function DevModeBanner({
    visible = true,
    message = "Development Mode - Authentication Bypassed",
}) {
    const [isDismissed, setIsDismissed] = useState(false);

    // Check if banner was dismissed this session
    useEffect(() => {
        const dismissed = sessionStorage.getItem(DISMISSED_KEY);
        if (dismissed === "true") {
            setIsDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem(DISMISSED_KEY, "true");
    };

    if (!visible || isDismissed) {
        return null;
    }

    return (
        <div className="dev-mode-banner">
            <div className="dev-mode-banner__content">
                <AlertTriangle size={16} className="dev-mode-banner__icon" />
                <span className="dev-mode-banner__message">{message}</span>
            </div>
            <button
                className="dev-mode-banner__dismiss"
                onClick={handleDismiss}
                title="Dismiss (will reappear on refresh)"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default DevModeBanner;