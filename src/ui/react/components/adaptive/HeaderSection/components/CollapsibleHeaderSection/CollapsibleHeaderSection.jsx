/**
 * CollapsibleHeaderSection Component
 *
 * Adaptive collapsible section with colored header for the right panel.
 * VR-first, desktop-friendly - automatically scales for VR with larger
 * touch targets and refined icon weights.
 */
import React, { useState } from 'react';
import { useMode } from '../../../ModeContext';
import Icon from '../../../Icon/Icon';
import './CollapsibleHeaderSection.scss';

export const CollapsibleHeaderSection = ({
    icon,
    title,
    color = 'default',
    defaultExpanded = true,
    children,
    actions,
    className = '',
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const { mode, tokens, isVR } = useMode();

    // Icon weight adapts to mode
    const iconWeight = isVR ? 'light' : 'regular';

    // CSS custom properties from tokens
    const style = {
        '--header-height': `${tokens.buttonHeight}px`,
        '--padding': `${tokens.padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${isVR ? 14 : 11}px`,
        '--icon-size': `${isVR ? 18 : 11}px`,
        '--chevron-size': `${isVR ? 14 : 10}px`,
    };

    return (
        <div
            className={`
        collapsible-header-section
        collapsible-header-section--${mode}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            data-expanded={isExpanded}
            data-color={color}
            style={style}
        >
            <button
                type="button"
                className="collapsible-header-section__header"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <span className="collapsible-header-section__chevron">
                    <Icon name="chevronDown" size={isVR ? 14 : 10} weight={iconWeight} />
                </span>
                {icon && (
                    <Icon
                        name={icon}
                        size={isVR ? 18 : 11}
                        weight={iconWeight}
                        className="collapsible-header-section__icon"
                    />
                )}
                <span className="collapsible-header-section__title">{title}</span>
                {actions && (
                    <div
                        className="collapsible-header-section__actions"
                        onClick={e => e.stopPropagation()}
                    >
                        {actions}
                    </div>
                )}
            </button>

            {isExpanded && (
                <div className="collapsible-header-section__content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleHeaderSection;