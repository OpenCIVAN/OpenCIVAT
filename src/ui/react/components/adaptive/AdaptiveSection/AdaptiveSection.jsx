/**
 * Adaptive Section Component
 *
 * Collapsible section with header, commonly used in panels.
 */
import React, { useState } from 'react';
import { useMode } from '../ModeContext';
import Icon from '../Icon/Icon';
import './AdaptiveSection.scss';

const AdaptiveSection = ({
    title,
    icon,
    defaultExpanded = true,
    collapsible = true,
    children,
    actions,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();
    const [expanded, setExpanded] = useState(defaultExpanded);

    const sectionStyle = {
        '--header-height': `${tokens.buttonHeight}px`,
        '--padding': `${tokens.padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
    };

    const iconWeight = mode === 'vr' ? 'light' : 'regular';

    const handleToggle = () => {
        if (collapsible) {
            setExpanded(!expanded);
        }
    };

    return (
        <div
            className={`
        adaptive-section
        adaptive-section--${mode}
        ${expanded ? 'adaptive-section--expanded' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={sectionStyle}
            {...props}
        >
            <button
                type="button"
                className="adaptive-section__header"
                onClick={handleToggle}
                disabled={!collapsible}
                aria-expanded={expanded}
            >
                <div className="adaptive-section__title-group">
                    {icon && <Icon name={icon} weight={iconWeight} />}
                    <span className="adaptive-section__title">{title}</span>
                </div>
                <div className="adaptive-section__actions">
                    {actions}
                    {collapsible && (
                        <Icon
                            name={expanded ? 'chevronUp' : 'chevronDown'}
                            weight={iconWeight}
                            className="adaptive-section__chevron"
                        />
                    )}
                </div>
            </button>
            {expanded && (
                <div className="adaptive-section__content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default AdaptiveSection;