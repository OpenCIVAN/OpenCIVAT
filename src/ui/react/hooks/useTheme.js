/**
 * @file useTheme.js
 * @description Hook for managing light/dark theme switching.
 * Sets `data-theme` attribute on <html> and persists preference in localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cia-theme';
const THEME_EVENT = 'cia:theme-change';

/**
 * Get the initial theme from localStorage or default to 'dark'.
 * This is also called by the inline script in index.html for flash prevention.
 */
function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    // Respect system preference
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
}

/**
 * Apply theme to the document element.
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Hook for theme management.
 * @returns {{ theme: 'dark'|'light', isDark: boolean, toggleTheme: () => void, setTheme: (t: string) => void }}
 */
export function useTheme() {
    const [theme, setThemeState] = useState(() => getInitialTheme());

    // Apply theme on mount and changes
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Listen for theme changes from other components/tabs
    useEffect(() => {
        const handleThemeChange = (e) => {
            if (e.detail?.theme && e.detail.theme !== theme) {
                setThemeState(e.detail.theme);
            }
        };

        // Listen for storage changes from other tabs
        const handleStorage = (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                setThemeState(e.newValue);
            }
        };

        window.addEventListener(THEME_EVENT, handleThemeChange);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener(THEME_EVENT, handleThemeChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, [theme]);

    const setTheme = useCallback((newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        window.dispatchEvent(
            new CustomEvent(THEME_EVENT, { detail: { theme: newTheme } })
        );
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    return {
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
    };
}

export default useTheme;
