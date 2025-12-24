/**
 * Adaptive Tabs Component
 *
 * Tab navigation with VR-friendly touch targets.
 */
import React from 'react';
import { useMode } from '../ModeContext';
import Icon from '../Icon/Icon';
import './AdaptiveTabs.scss';

const AdaptiveTabs = ({
    tabs = [],
    activeTab,
    onChange,
    variant = 'default',
    fullWidth = false,
    className = '',
    ...props
}) => {
    const { tokens, mode } = useMode();

    const tabsStyle = {
        '--tab-height': `${tokens.buttonHeight}px`,
        '--padding': `${tokens.padding}px`,
        '--gap': `${tokens.gap}px`,
        '--font-size': `${tokens.fontSize}px`,
    };

    const iconWeight = mode === 'vr' ? 'light' : 'regular';

    return (
        <div
            className={`
        adaptive-tabs
        adaptive-tabs--${mode}
        adaptive-tabs--${variant}
        ${fullWidth ? 'adaptive-tabs--full-width' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={tabsStyle}
            role="tablist"
            {...props}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    disabled={tab.disabled}
                    className={`
            adaptive-tabs__tab
            ${activeTab === tab.id ? 'adaptive-tabs__tab--active' : ''}
          `.trim()}
                    onClick={() => onChange?.(tab.id)}
                >
                    {tab.icon && <Icon name={tab.icon} weight={iconWeight} />}
                    {tab.label && <span className="adaptive-tabs__label">{tab.label}</span>}
                    {tab.count !== undefined && (
                        <span className="adaptive-tabs__count">{tab.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default AdaptiveTabs;