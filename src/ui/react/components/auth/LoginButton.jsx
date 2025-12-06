// src/ui/react/components/auth/LoginButton.jsx
// Sign In button component for unauthenticated users

import React, { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@UI/react/hooks/useAuth.js";
import "./LoginButton.scss";

/**
 * LoginButton - Displays sign in button when not authenticated
 *
 * @param {Object} props
 * @param {string} props.variant - Button variant: 'default' | 'compact' | 'full'
 * @param {string} props.className - Additional CSS classes
 */
export function LoginButton({ variant = "default", className = "" }) {
    const { login, isLoading: authLoading } = useAuth();
    const [isClicked, setIsClicked] = useState(false);

    const handleLogin = async () => {
        setIsClicked(true);
        try {
            await login();
        } catch (error) {
            setIsClicked(false);
        }
    };

    const isLoading = authLoading || isClicked;

    if (variant === "compact") {
        return (
            <button
                className={`login-button login-button--compact ${className}`}
                onClick={handleLogin}
                disabled={isLoading}
                title="Sign In"
            >
                {isLoading ? (
                    <Loader2 size={16} className="login-button__spinner" />
                ) : (
                    <LogIn size={16} />
                )}
            </button>
        );
    }

    if (variant === "full") {
        return (
            <button
                className={`login-button login-button--full ${className}`}
                onClick={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={18} className="login-button__spinner" />
                        <span>Signing in...</span>
                    </>
                ) : (
                    <>
                        <LogIn size={18} />
                        <span>Sign In with SSO</span>
                    </>
                )}
            </button>
        );
    }

    // Default variant
    return (
        <button
            className={`login-button ${className}`}
            onClick={handleLogin}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 size={16} className="login-button__spinner" />
                    <span>Signing in...</span>
                </>
            ) : (
                <>
                    <LogIn size={16} />
                    <span>Sign In</span>
                </>
            )}
        </button>
    );
}

export default LoginButton;