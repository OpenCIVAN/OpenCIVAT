/**
 * @file LinkIndicatorsSettingsPanel.jsx
 * @description Settings panel for controlling link visualization preferences.
 *
 * Typically shown in:
 * - View menu > Link Display Settings
 * - Workspace Links Hub panel
 * - Right-click context menu
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useLinkIndicators, LINK_COLORS } from '@UI/react/context/LinkIndicatorsContext';
import './CanvasLinkIndicators.scss';

/**
 * Setting row configuration
 */
const SETTING_ROWS = [
    {
        key: 'showBorders',
        label: 'Show link borders',
        desc: 'Colored borders on linked viewports',
    },
    {
        key: 'showConnectionLines',
        label: 'Show connection lines',
        desc: 'SVG lines between linked views',
    },
    {
        key: 'showSyncPulse',
        label: 'Show sync animations',
        desc: 'Pulse effect when views sync',
    },
    {
        key: 'showCornerBadges',
        label: 'Show corner badges',
        desc: 'Compact link status in viewport corner',
    },
    {
        key: 'showInMiniMap',
        label: 'Show in navigator',
        desc: 'Link indicators in minimap',
    },
];

/**
 * LinkIndicatorsSettingsPanel - Settings UI for link visualization
 *
 * @param {Object} props
 * @param {Function} [props.onClose] - Optional callback to close the panel
 */
export const LinkIndicatorsSettingsPanel = memo(function LinkIndicatorsSettingsPanel({
    onClose,
}) {
    const { settings, updateSettings } = useLinkIndicators();

    return (
        <div className="link-indicators-settings">
            {/* Header */}
            <div className="link-indicators-settings__header">
                <h3 className="link-indicators-settings__title">
                    Link Display Settings
                </h3>
                {onClose && (
                    <button
                        className="link-indicators-settings__close"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <Icon name="close" size={14} />
                    </button>
                )}
            </div>

            {/* Toggle options */}
            <div className="link-indicators-settings__options">
                {SETTING_ROWS.map(({ key, label, desc }) => (
                    <label key={key} className="link-indicators-settings__option">
                        <input
                            type="checkbox"
                            checked={settings[key]}
                            onChange={(e) =>
                                updateSettings({ [key]: e.target.checked })
                            }
                        />
                        <div className="link-indicators-settings__option-text">
                            <div className="link-indicators-settings__option-label">
                                {label}
                            </div>
                            <div className="link-indicators-settings__option-desc">
                                {desc}
                            </div>
                        </div>
                    </label>
                ))}
            </div>

            {/* Border style selector */}
            <div className="link-indicators-settings__section">
                <div className="link-indicators-settings__section-label">
                    Border Style
                </div>
                <div className="link-indicators-settings__style-buttons">
                    {['solid', 'glow', 'gradient'].map((style) => (
                        <button
                            key={style}
                            onClick={() => updateSettings({ borderStyle: style })}
                            className={`link-indicators-settings__style-btn ${
                                settings.borderStyle === style
                                    ? 'link-indicators-settings__style-btn--active'
                                    : ''
                            }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>

            {/* Line style selector */}
            <div className="link-indicators-settings__section">
                <div className="link-indicators-settings__section-label">
                    Connection Line Style
                </div>
                <div className="link-indicators-settings__style-buttons">
                    {['curved', 'straight', 'orthogonal'].map((style) => (
                        <button
                            key={style}
                            onClick={() => updateSettings({ lineStyle: style })}
                            className={`link-indicators-settings__style-btn ${
                                settings.lineStyle === style
                                    ? 'link-indicators-settings__style-btn--active'
                                    : ''
                            }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default LinkIndicatorsSettingsPanel;
