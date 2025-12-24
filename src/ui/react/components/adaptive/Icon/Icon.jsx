/**
 * Adaptive Icon Component
 *
 * Renders stroke-based icons that adapt weight based on mode.
 * VR mode uses thinner strokes despite larger sizes for elegance.
 */
import React from 'react';
import { useMode } from '../ModeContext';
import { iconPaths } from './iconPaths';
import './Icon.scss';

const Icon = ({
    name,
    size,
    weight = 'regular',
    color = 'currentColor',
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();

    const path = iconPaths[name];
    if (!path) {
        console.warn(`Icon "${name}" not found`);
        return null;
    }

    const iconSize = size || tokens.iconSize;
    const strokeWidth = tokens.iconWeight[weight];

    return (
        <svg
            className={`adaptive-icon adaptive-icon--${mode} ${className}`}
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d={path} />
        </svg>
    );
};

export default Icon;