/**
 * @file ThemeToggle.jsx
 * @description Toggle button for switching between light and dark themes.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTheme } from '@UI/react/hooks/useTheme';

/**
 * Theme toggle button.
 * Uses the useTheme hook to manage dark/light mode switching.
 */
export function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            className="header__icon-btn"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            type="button"
        >
            {isDark ? <Icon name="sun" size={18} /> : <Icon name="moon" size={18} />}
        </button>
    );
}

export default ThemeToggle;
