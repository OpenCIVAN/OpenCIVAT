// src/ui/react/Bootstrap.jsx
// Minimal component to collect username before full app initialization
// Ensures username is collected before initializing collaboration systems

import React, { useState, useEffect } from "react";

import { hasUserName, getUserName } from "@Collaboration/presence/userManagement.js";
import { initializePhase2 } from "@Init/appInitializer.js";
import { CIAWebApp } from "@UI/react/CIAWebApp.jsx";
import { UsernameModal } from "@UI/react/components/modals/UsernameModal.jsx";

export function Bootstrap({ roomName }) {
    const [username, setUsername] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initializationComplete, setInitializationComplete] = useState(false);
    const [showModal, setShowModal] = useState(true);

    // Check if username already exists (from localStorage)
    useEffect(() => {
        if (hasUserName()) {
            const existingName = getUserName();
            console.log("✅ Username already set:", existingName);
            setUsername(existingName);
            setShowModal(false);
            // Trigger Phase 2 initialization immediately
            handleUsernameSet(existingName);
        }
    }, []);

    const handleUsernameSet = async (name) => {
        console.log("👤 Username set:", name);
        setUsername(name);
        setShowModal(false);
        setIsInitializing(true);

        try {
            // Run Phase 2 initialization with the username
            await initializePhase2(name);

            setInitializationComplete(true);
            setIsInitializing(false);

            console.log("✅ Application fully initialized!");

        } catch (error) {
            console.error("❌ Phase 2 initialization failed:", error);
            setIsInitializing(false);
            alert("Failed to initialize application. Please refresh and try again.");
        }
    };

    // Show username modal if needed
    if (showModal) {
        return (
            <UsernameModal onSubmit={handleUsernameSet} />
            // <div className="bootstrap-container">
            //     <UsernameModal
            //         onSubmit={handleUsernameSet}
            //     />
            // </div>
        );
    }

    // Show loading screen while Phase 2 runs
    if (isInitializing) {
        return (
            <div style={{
            // <div className="bootstrap-container" style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000
            }}>
                <div style={{
                    textAlign: "center",
                    color: "#e0e0e0"
                }}>
                    <div style={{
                        fontSize: "48px",
                        marginBottom: "20px"
                    }}>
                        🔄
                    </div>
                    <h2 style={{
                        margin: "0 0 10px 0",
                        fontSize: "20px",
                        fontWeight: "600"
                    }}>
                        Initializing Collaboration Systems...
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#999"
                    }}>
                        Setting up real-time features for {username}
                    </p>
                    <div style={{
                        marginTop: "30px",
                        width: "40px",
                        height: "40px",
                        border: "4px solid #333",
                        borderTop: "4px solid #4CAF50",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "30px auto 0"
                    }} />
                </div>
            </div>
        );
    }


    // Phase 2 complete - render the full application
    if (initializationComplete) {
        return (
            <CIAWebApp
                roomName={roomName}
                userName={username}
            />
        );
    }

    // Fallback (shouldn't reach here)
    return null;
}