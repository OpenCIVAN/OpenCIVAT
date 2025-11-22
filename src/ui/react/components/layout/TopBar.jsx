// src/ui/react/components/layout/TopBar.jsx
import React from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import "@UI/react/components/layout/TopBar.scss";

export function TopBar({ username }) {
    const roomId = sessionManager.getRoomId();

    return (
        <div className="top-bar">
            <div className="top-bar__logo">
                <span className="logo-text">CIA Web</span>
                <span className="logo-subtitle">Collaborative Immersive Analytics</span>
            </div>

            <div className="top-bar__center">
                <span className="room-indicator">
                    Room: <strong>{roomId}</strong>
                </span>
            </div>

            <div className="top-bar__user">
                <span className="user-indicator">
                    👤 {username}
                </span>
            </div>
        </div>
    );
}