/**
 * StatusDot Component
 *
 * A pulsing status indicator dot that adapts to mode.
 */
import React from 'react';
import { useAdaptive } from '@UI/react/context';
import './StatusDot.scss';

export const StatusDot = ({ color, pulse = false, size }) => {
    const { isVR } = useAdaptive();
    const dotSize = size ?? (isVR ? 10 : 8);

    return (
        <span
            className={`status-dot ${pulse ? 'status-dot--pulse' : ''}`}
            style={{
                '--dot-color': color,
                '--dot-size': `${dotSize}px`,
            }}
        />
    );
};

export default StatusDot;
