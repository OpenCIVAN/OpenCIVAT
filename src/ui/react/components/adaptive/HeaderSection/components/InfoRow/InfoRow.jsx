/**
 * InfoRow Component
 *
 * Adaptive label/value row with optional icon.
 */
import React from 'react';
import { useMode } from '../../../ModeContext';
import Icon from '../../../Icon/Icon';
import './InfoRow.scss';

export const InfoRow = ({ icon, label, value, color, subtle = false }) => {
    const { mode, isVR } = useMode();
    const iconWeight = isVR ? 'light' : 'regular';

    return (
        <div className={`info-row info-row--${mode}`}>
            {icon && (
                <Icon
                    name={icon}
                    size={isVR ? 20 : 14}
                    weight={iconWeight}
                    className="info-row__icon"
                    style={{ color }}
                />
            )}
            {label && <span className="info-row__label">{label}</span>}
            <span className={`info-row__value ${subtle ? 'info-row__value--subtle' : ''}`}>
                {value}
            </span>
        </div>
    );
};

export default InfoRow;