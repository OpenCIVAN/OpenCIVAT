// src/ui/react/components/workspace/WorkspaceTypeIndicator.jsx
// Visual indicator for workspace type
//
// Shows workspace type with icon, color coding, and optional details

import React from 'react';
import { WorkspaceType } from '@Core/data/models/Workspace.js';
import './WorkspaceTypeIndicator.scss';

/**
 * Get workspace type config
 */
const getTypeConfig = (type) => {
    switch (type) {
        case WorkspaceType.PERSONAL:
            return {
                icon: '👤',
                label: 'Personal',
                color: '#6366f1',
                description: 'Your private workspace',
            };
        case WorkspaceType.PROJECT:
            return {
                icon: '📁',
                label: 'Project',
                color: '#10b981',
                description: 'Shared team workspace',
            };
        case WorkspaceType.BREAKOUT:
            return {
                icon: '💬',
                label: 'Breakout',
                color: '#f59e0b',
                description: 'Temporary collaboration space',
            };
        default:
            return {
                icon: '📋',
                label: 'Workspace',
                color: '#888',
                description: 'Workspace',
            };
    }
};

/**
 * WorkspaceTypeIndicator - Shows workspace type
 */
export function WorkspaceTypeIndicator({
    type,
    size = 'medium', // 'small' | 'medium' | 'large'
    showLabel = true,
    showDescription = false,
    className = '',
}) {
    const config = getTypeConfig(type);

    return (
        <div
            className={`workspace-type-indicator workspace-type-indicator--${size} ${className}`}
            style={{ '--type-color': config.color }}
        >
            <span className="workspace-type-indicator__icon">{config.icon}</span>

            {showLabel && (
                <span className="workspace-type-indicator__label">{config.label}</span>
            )}

            {showDescription && (
                <span className="workspace-type-indicator__description">
                    {config.description}
                </span>
            )}
        </div>
    );
}

/**
 * WorkspaceTypeBadge - Compact badge version
 */
export function WorkspaceTypeBadge({ type, className = '' }) {
    const config = getTypeConfig(type);

    return (
        <span
            className={`workspace-type-badge ${className}`}
            style={{ '--type-color': config.color }}
            title={config.description}
        >
            <span className="workspace-type-badge__icon">{config.icon}</span>
            <span className="workspace-type-badge__label">{config.label}</span>
        </span>
    );
}

/**
 * BreakoutTimer - Shows remaining time for breakout workspace
 */
export function BreakoutTimer({ expiresAt, onExpired }) {
    const [timeLeft, setTimeLeft] = React.useState('');
    const [isUrgent, setIsUrgent] = React.useState(false);

    React.useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = new Date();
            const expires = new Date(expiresAt);
            const diff = expires - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                if (onExpired) onExpired();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${seconds}s`);
            }

            setIsUrgent(diff < 5 * 60 * 1000); // Less than 5 minutes
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpired]);

    if (!expiresAt) return null;

    return (
        <span className={`breakout-timer ${isUrgent ? 'breakout-timer--urgent' : ''}`}>
            <span className="breakout-timer__icon">⏱️</span>
            <span className="breakout-timer__time">{timeLeft}</span>
        </span>
    );
}

export default WorkspaceTypeIndicator;