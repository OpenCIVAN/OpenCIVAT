/**
 * StatBadge Component
 *
 * Adaptive icon + text badge for statistics display.
 */
import React from 'react';
import { useMode } from '../../../ModeContext';
import Icon from '../../../Icon/Icon';
import './StatBadge.scss';

export const StatBadge = ({ icon, color, children }) => {
    const { mode, isVR } = useMode();
    const iconWeight = isVR ? 'light' : 'regular';

    return (
        <span className={`stat-badge stat-badge--${mode}`} style={{ color }}>
            {icon && <Icon name={icon} size={isVR ? 16 : 12} weight={iconWeight} />}
            {children}
        </span>
    );
};

export default StatBadge;