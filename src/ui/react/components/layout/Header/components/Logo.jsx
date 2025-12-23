/**
 * @file Logo.jsx
 * @description App logo that navigates to dashboard.
 */

import React from 'react';
import { Hexagon } from 'lucide-react';

/**
 * Logo component that navigates to dashboard on click.
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onNavigate] - Navigation callback
 */
export function Logo({ onNavigate }) {
    const handleClick = () => {
        onNavigate?.('/dashboard');
    };

    return (
        <button
            className="header__logo"
            onClick={handleClick}
            aria-label="Go to dashboard"
            type="button"
        >
            <Hexagon size={28} />
        </button>
    );
}

export default Logo;