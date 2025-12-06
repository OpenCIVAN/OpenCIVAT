// src/ui/react/components/auth/Bootstrap.jsx
// Gate-keeping layer that handles authentication, username collection, and Phase 2 initialization

import React, { useState, useEffect, useRef } from "react";
import { auth as log } from "@Utils/logger.js";
import { hasUserName, getUserName, setUserName, getUserId } from "@Collaboration/presence/userManagement.js";
import { initializePhase2 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { authService } from "@Services/authService.js";
import { config } from "@Core/config/clientConfig.js";
import { CIAWebApp } from "@UI/react/CIAWebApp.jsx";
import { toast } from "@UI/react/store/toastStore.js";
import { ToastContainer } from "@UI/react/components/common/Toast";
import { LoginButton } from "@UI/react/components/auth/LoginButton.jsx";
import { DevModeBanner } from "@UI/react/components/auth/DevModeBanner.jsx";

import "@UI/react/components/auth/Bootstrap.scss";

/**
 * Bootstrap Component
 *
 * Gate-keeping layer handling:
 * 1. Authentication checks (Keycloak SSO)
 * 2. Username collection/validation
 * 3. Phase 2 initialization (user services)
 * 4. License validation (future)
 * 5. Feature flags (future)
 */
export function Bootstrap() {
    const [bootstrapState, setBootstrapState] = useState('checking');
    const [username, setUsername] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [serverDevModeEnabled, setServerDevModeEnabled] = useState(false);
    const [isDevMode, setIsDevMode] = useState(false);

    const initializationStarted = useRef(false);
    const phase2Complete = useRef(false);

    // Check if client-side dev bypass mode is enabled
    const isDevBypass = config.devBypassAuth === true || config.devBypassAuth === "true";

    useEffect(() => {
        checkPrerequisites();

        if (window.hideLoadingScreen) {
            window.hideLoadingScreen();
        }
    }, []);

    async function checkPrerequisites() {
        log.debug("Bootstrap: Checking prerequisites...");

        try {
            // Step 0: Check if server has dev mode enabled
            log.debug("Bootstrap: Checking server dev mode...");
            const serverDevMode = await authService.checkServerDevMode();
            setServerDevModeEnabled(serverDevMode);
            if (serverDevMode) {
                log.info("Bootstrap: Server dev mode is enabled");
            }

            // Step 1: Initialize auth service and check authentication
            log.debug("Bootstrap: Initializing auth service...");
            await authService.initialize();

            const isAuthenticated = authService.isAuthenticated();
            log.debug(`Bootstrap: Auth status - authenticated: ${isAuthenticated}, devBypass: ${isDevBypass}`);

            // If not authenticated and not in dev bypass mode, show login
            if (!isAuthenticated && !isDevBypass) {
                log.debug("Bootstrap: Authentication required");
                setBootstrapState('login');
                return;
            }

            // Step 2: Get username from auth or existing storage
            if (isAuthenticated && !isDevBypass) {
                // Use name from auth token
                const authUser = authService.getUser();
                const authName = authUser?.name || authUser?.username || authUser?.email?.split('@')[0];
                if (authName) {
                    log.info(`Bootstrap: Using authenticated username: ${authName}`);
                    setUserName(authName);
                    setUsername(authName);
                    setBootstrapState('initializing');
                    await runPhase2Initialization(authName);
                    return;
                }
            }

            // Step 3: Check for existing username (dev mode or fallback)
            if (hasUserName()) {
                const existingName = getUserName();
                log.info(`Bootstrap: Found existing username: ${existingName}`);
                setUsername(existingName);

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

    async function handleUsernameSubmit(event) {
        event.preventDefault();

        const trimmedName = username.trim();

        if (!trimmedName) {
            toast.info("Please enter a username");
            return;
        }

        if (trimmedName.length > 20) {
            toast.info("Username must be 20 characters or less");
            return;
        }

        log.info(`Bootstrap: Setting username: ${trimmedName}`);
        setUserName(trimmedName);
        setBootstrapState('initializing');
        await runPhase2Initialization(trimmedName);
    }

    async function handleDevLogin() {
        log.info("Bootstrap: Dev login requested");
        try {
            await authService.loginAsDev();
            setIsDevMode(true);

            // Get dev user info
            const devUser = authService.getUser();
            const devName = devUser?.name || devUser?.username || 'Developer';
            setUserName(devName);
            setUsername(devName);

            setBootstrapState('initializing');
            await runPhase2Initialization(devName);
        } catch (error) {
            log.error("Bootstrap: Dev login failed:", error);
            setErrorMessage(`Dev login failed: ${error.message}`);
            setBootstrapState('error');
        }
    }

    async function runPhase2Initialization(validatedUsername) {
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

            setBootstrapState('ready');
        } catch (error) {
            log.error("Bootstrap: Phase 2 initialization failed:", error);
            setErrorMessage(`Failed to initialize user services: ${error.message}`);
            setBootstrapState('error');
        }
    }

    function handleRetry() {
        initializationStarted.current = false;
        phase2Complete.current = false;
        setErrorMessage(null);
        setBootstrapState('checking');
        checkPrerequisites();
    }

    // RENDER
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
    } else if (bootstrapState === 'login') {
        content = (
            <div className="bootstrap-login">
                <div className="login-card">
                    <h1>Welcome to CIA Web</h1>
                    <p className="subtitle">Collaborative Immersive Analytics Platform</p>
                    <p className="description">
                        Sign in to access your collaborative workspace
                    </p>

                    <LoginButton variant="full" />

                    {serverDevModeEnabled && (
                        <div className="dev-login-section">
                            <div className="divider">
                                <span>or</span>
                            </div>
                            <button
                                className="dev-login-button"
                                onClick={handleDevLogin}
                            >
                                Continue as Dev User
                            </button>
                            <p className="dev-login-info">
                                Development mode - authentication bypassed
                            </p>
                        </div>
                    )}

                    <div className="login-info">
                        <p>You will be redirected to your organization's login page</p>
                    </div>
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
                        Room: {sessionManager?.getRoomId() || 'default-analytics-room'}
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
        // FIX: Pass projectId from sessionManager
        content = (
            <>
                {isDevMode && <DevModeBanner />}
                <CIAWebApp
                    username={username}
                    userId={getUserId()}
                    projectId={sessionManager.getRoomId()}
                />
            </>
        );
    }

    return (
        <>
            {content}
            <ToastContainer />
        </>
    );
}