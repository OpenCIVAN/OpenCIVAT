// src/ui/react/components/layout/ActivityBar/ActivityBar.jsx
// Generic activity bar component for side panels
// Can be placed left or right, handles tab selection and collapse toggle

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './ActivityBar.scss';

/**
 * ActivityBar - Vertical icon bar for panel navigation
 *
 * @param {Object} props
 * @param {string} props.side - 'left' or 'right'
 * @param {Array} props.tabs - Array of { id, icon, label, color?, badge? }
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Callback when tab changes
 * @param {boolean} props.isPanelOpen - Whether the panel is expanded
 * @param {Function} props.onTogglePanel - Callback to toggle panel
 * @param {Array} props.dividerAfter - Array of tab IDs after which to show divider
 * @param {Array} props.bottomItems - Array of { id, icon, label, color?, active?, onClick } for bottom section
 */
export function ActivityBar({
    side = 'left',
    tabs = [],
    activeTab,
    onTabChange,
    isPanelOpen = true,
    onTogglePanel,
    dividerAfter = [],
    bottomItems = [],
}) {
    const isLeft = side === 'left';
    const accentColor = isLeft ? 'var(--color-accent-blue)' : 'var(--color-accent-purple)';

    return (
        <div className={`activity-bar activity-bar--${side}`}>
            <div className="activity-bar__tabs">
                {tabs.map((tab, idx) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id && isPanelOpen;
                    const showDivider = dividerAfter.includes(tab.id);

                    return (
                        <React.Fragment key={tab.id}>
                            <button
                                className={`activity-bar__tab ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    onTabChange(tab.id);
                                    if (!isPanelOpen) onTogglePanel?.();
                                }}
                                title={tab.label}
                                style={isActive ? { '--tab-color': tab.color || accentColor } : undefined}
                            >
                                <TabIcon size={18} />
                                {tab.badge > 0 && (
                                    <span
                                        className="activity-bar__badge"
                                        style={tab.badgeColor ? { background: tab.badgeColor } : undefined}
                                    >
                                        {tab.badge > 99 ? '99+' : tab.badge}
                                    </span>
                                )}
                            </button>
                            {showDivider && <div className="activity-bar__divider" />}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="activity-bar__spacer" />

            {/* Bottom items section (Nav, Notes, Ops, etc.) */}
            {bottomItems.length > 0 && (
                <div className="activity-bar__bottom-items">
                    {bottomItems.map((item) => (
                        <button
                            key={item.id}
                            className={`activity-bar__tab activity-bar__tab--bottom ${item.active ? 'active' : ''}`}
                            onClick={item.onClick}
                            title={item.label}
                            style={item.active ? { '--tab-color': item.color || accentColor } : undefined}
                        >
                            <Icon name={item.icon} size={18} />
                        </button>
                    ))}
                    <div className="activity-bar__divider" />
                </div>
            )}

            <button
                className="activity-bar__toggle"
                onClick={onTogglePanel}
                title={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
            >
                {isLeft ? (
                    isPanelOpen ? <Icon name="panelLeftClose" size={18} /> : <Icon name="chevronRight" size={18} />
                ) : (
                    isPanelOpen ? <Icon name="panelRightClose" size={18} /> : <Icon name="chevronLeft" size={18} />
                )}
            </button>
        </div>
    );
}

export default ActivityBar;