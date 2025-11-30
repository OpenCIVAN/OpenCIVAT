// src/ui/react/Bootstrap.jsx
// Gate-keeping layer that handles authentication, username collection, and Phase 2 initialization
// This component ensures all prerequisites are met before rendering the main application

import React, { useState, useEffect, useRef } from "react";
import { auth as log } from "@Utils/logger.js";
import { hasUserName, getUserName, setUserName, getUserId } from "@Collaboration/presence/userManagement.js";
import { initializePhase2 } from "@Init/appInitializer.js";
import { CIAWebApp } from "@UI/react/CIAWebApp.jsx";
import { toast } from "@UI/react/store/toastStore.js";
import { ToastContainer } from "@UI/react/components/common/Toast";

import "@UI/react/components/auth/Bootstrap.scss";

/**
 * Bootstrap Component
 * 
 * This is the gate-keeping layer of the application. It handles:
 * 1. Authentication checks (future feature)
 * 2. Username collection/validation
 * 3. Phase 2 initialization (user services)
 * 4. License validation (future feature)
 * 5. Feature flags (future feature)
 * 
 * Only after all prerequisites are met does it render the main application.
 * This separation allows contributors to add authentication or other gate-keeping
 * features without modifying the core application.
 */
export function Bootstrap() {
    // State management for the bootstrap process
    const [bootstrapState, setBootstrapState] = useState('checking'); // checking | username | initializing | ready | error
    const [username, setUsername] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);

    // Ref to prevent double initialization in React StrictMode
    const initializationStarted = useRef(false);
    const phase2Complete = useRef(false);

    // STEP 1: Check prerequisites on mount
    useEffect(() => {
        checkPrerequisites();

        // Hide the HTML loading screen once Bootstrap renders
        // This ensures users see the React UI instead of the HTML loading screen
        if (window.hideLoadingScreen) {
            window.hideLoadingScreen();
        }
    }, []);

    /**
     * Check all prerequisites before allowing app access
     * This is where future authentication checks would go
     */
    async function checkPrerequisites() {
        log.debug("Bootstrap: Checking prerequisites...");

        try {
            // FUTURE: Add authentication check here
            // const isAuthenticated = await checkAuthentication();
            // if (!isAuthenticated) {
            //   setBootstrapState('login');
            //   return;
            // }

            // FUTURE: Check license validity
            // const hasValidLicense = await checkLicense();
            // if (!hasValidLicense) {
            //   setBootstrapState('license');
            //   return;
            // }

            // Check for existing username
            if (hasUserName()) {
                const existingName = getUserName();
                log.info(`Bootstrap: Found existing username: ${existingName}`);
                setUsername(existingName);

                // If we already completed Phase 2 in a previous mount, skip to ready
                if (phase2Complete.current) {
                    setBootstrapState('ready');
                } else {
                    setBootstrapState('initializing');
                    await runPhase2Initialization(existingName);
                }
            } else {
                log.debug("Bootstrap: Username required");
                setBootstrapState('username');
            }
        } catch (error) {
            log.error("Bootstrap: Prerequisite check failed:", error);
            setErrorMessage(`System check failed: ${error.message}`);
            setBootstrapState('error');
        }
    }

    /**
     * Handle username submission
     */
    async function handleUsernameSubmit(event) {
        event.preventDefault();

        const trimmedName = username.trim();

        // Validate username
        if (!trimmedName) {
            toast.info("Please enter a username");
            return;
        }

        if (trimmedName.length > 20) {
            toast.info("Username must be 20 characters or less");
            return;
        }

        // FUTURE: Check username against server for uniqueness
        // const isUnique = await checkUsernameUniqueness(trimmedName);
        // if (!isUnique) {
        //   toast.warning("Username already taken in this room");
        //   return;
        // }

        log.info(`Bootstrap: Setting username: ${trimmedName}`);
        setUserName(trimmedName);
        setBootstrapState('initializing');
        await runPhase2Initialization(trimmedName);
    }

    /**
     * Run Phase 2 initialization with the validated username
     */
    async function runPhase2Initialization(validatedUsername) {
        // Prevent double initialization
        if (initializationStarted.current) {
            log.debug("Bootstrap: Phase 2 already started, skipping");
            return;
        }

        initializationStarted.current = true;
        log.debug("Bootstrap: Starting Phase 2 initialization...");

        try {
            await initializePhase2();

            phase2Complete.current = true;
            log.info("Bootstrap: Phase 2 complete, user services ready");

            // FUTURE: Initialize user-specific features here
            // await loadUserPreferences(validatedUsername);
            // await connectToUserChannels(validatedUsername);

            setBootstrapState('ready');
        } catch (error) {
            log.error("Bootstrap: Phase 2 initialization failed:", error);
            setErrorMessage(`Failed to initialize user services: ${error.message}`);
            setBootstrapState('error');
        }
    }

    /**
     * Handle retry after error
     */
    function handleRetry() {
        // Reset state and try again
        initializationStarted.current = false;
        phase2Complete.current = false;
        setErrorMessage(null);
        setBootstrapState('checking');
        checkPrerequisites();
    }

    // RENDER: Different UI based on bootstrap state
    let content = null;

    if (bootstrapState === 'error') {
        content = (
            <div className="bootstrap-error">
                <div className="error-card">
                    <h1>Initialization Error</h1>
                    <p>{errorMessage}</p>
                    <button onClick={handleRetry} className="retry-button">
                        Try Again
                    </button>
                    <button onClick={() => window.location.reload()} className="reload-button">
                        Reload Page
                    </button>
                </div>
            </div>
        );
    } else if (bootstrapState === 'checking') {
        content = (
            <div className="bootstrap-checking">
                <div className="checking-card">
                    <h2>Initializing CIA Web</h2>
                    <div className="checking-spinner" />
                    <p>Checking system requirements...</p>
                </div>
            </div>
        );
    } else if (bootstrapState === 'username') {
        content = (
            <div className="bootstrap-username">
                <div className="username-card">
                    <h1>Welcome to CIA Web</h1>
                    <p className="subtitle">Collaborative Immersive Analytics Platform</p>
                    <p className="description">
                        Enter your name to join the collaborative session
                    </p>

                    <form onSubmit={handleUsernameSubmit} className="username-form">
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            maxLength={20}
                            className="username-input"
                            required
                        />
                        <button type="submit" className="username-submit">
                            Join Session
                        </button>
                    </form>

                    <div className="room-info">
                        Room: {window.sessionManager?.getRoomId() || 'default-analytics-room'}
                    </div>
                </div>
            </div>
        );
    } else if (bootstrapState === 'initializing') {
        content = (
            <div className="bootstrap-initializing">
                <div className="initializing-card">
                    <h2>Setting Up Your Workspace</h2>
                    <div className="progress-bar">
                        <div className="progress-fill" />
                    </div>
                    <p>Initializing collaboration services for {username}...</p>
                    <ul className="initialization-steps">
                        <li className="step-complete">Core services initialized ✓</li>
                        <li className="step-active">Setting up user presence...</li>
                        <li className="step-pending">Connecting to collaboration room</li>
                        <li className="step-pending">Loading workspace</li>
                    </ul>
                </div>
            </div>
        );
    } else if (bootstrapState === 'ready') {
        content = <CIAWebApp username={username} userId={getUserId()} />;
    }

    return (
        <>
            {content}
            <ToastContainer />
        </>
    );
}