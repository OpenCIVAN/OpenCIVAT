// ViewSettingsModal.jsx
// Stub modal for view settings - alternative to SlidingPanel for cramped spaces

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Link2, Camera, Filter, Maximize2, Palette, Save } from 'lucide-react';

/**
 * ViewSettingsModal - Modal for configuring view settings
 *
 * This is a stub modal that will be expanded with more settings.
 * Provides an alternative to the SlidingPanel when space is cramped.
 */
export function ViewSettingsModal({
    view,
    onClose,
    // Link configuration (same as SlidingPanel)
    linkConfig = {},
    availableViews = [],
    onLinkPropertyChange,
    onToggleAllLinks,
    // Size
    onSizeChange,
}) {
    if (!view) return null;

    // Check if any properties are linked
    const hasActiveLinks = Object.values(linkConfig).some(c => c?.enabled && c?.parentId);
    const linkCount = Object.values(linkConfig).filter(c => c?.enabled && c?.parentId).length;

    const modalContent = (
        <div className="view-settings-modal-backdrop" onClick={onClose}>
            <div className="view-settings-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="view-settings-modal__header">
                    <div className="view-settings-modal__icon">
                        <Settings size={20} />
                    </div>
                    <div className="view-settings-modal__title-area">
                        <h3 className="view-settings-modal__title">
                            {view.name || 'View Settings'}
                        </h3>
                        <span className="view-settings-modal__subtitle">
                            Configure view properties
                        </span>
                    </div>
                    <button className="view-settings-modal__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="view-settings-modal__content">
                    {/* View Size Section */}
                    <div className="view-settings-modal__section">
                        <div className="view-settings-modal__section-header">
                            <Maximize2 size={14} />
                            <span>Canvas Size</span>
                        </div>
                        <div className="view-settings-modal__size-grid">
                            {[1, 2, 3].map(rows => (
                                [1, 2, 3].map(cols => (
                                    <button
                                        key={`${rows}x${cols}`}
                                        className={`view-settings-modal__size-btn ${view.rowSpan === rows && view.colSpan === cols
                                                ? 'view-settings-modal__size-btn--active'
                                                : ''
                                            }`}
                                        onClick={() => onSizeChange?.({ rows, cols })}
                                    >
                                        {rows}×{cols}
                                    </button>
                                ))
                            ))}
                        </div>
                    </div>

                    {/* Link Properties Section */}
                    <div className="view-settings-modal__section">
                        <div className="view-settings-modal__section-header">
                            <Link2 size={14} />
                            <span>Link Properties</span>
                            {hasActiveLinks && (
                                <span className="view-settings-modal__badge">{linkCount} linked</span>
                            )}
                        </div>

                        {availableViews.length === 0 ? (
                            <div className="view-settings-modal__empty">
                                No other views available to link to
                            </div>
                        ) : (
                            <div className="view-settings-modal__link-list">
                                {/* Camera Link */}
                                <div className="view-settings-modal__link-item">
                                    <Camera size={12} />
                                    <span>Camera</span>
                                    <select
                                        className="view-settings-modal__link-select"
                                        value={linkConfig.camera?.parentId || ''}
                                        onChange={(e) => onLinkPropertyChange?.('camera', {
                                            enabled: !!e.target.value,
                                            parentId: e.target.value || null
                                        })}
                                    >
                                        <option value="">Not linked</option>
                                        {availableViews.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filters Link */}
                                <div className="view-settings-modal__link-item">
                                    <Filter size={12} />
                                    <span>Filters</span>
                                    <select
                                        className="view-settings-modal__link-select"
                                        value={linkConfig.filters?.parentId || ''}
                                        onChange={(e) => onLinkPropertyChange?.('filters', {
                                            enabled: !!e.target.value,
                                            parentId: e.target.value || null
                                        })}
                                    >
                                        <option value="">Not linked</option>
                                        {availableViews.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Color Map Link */}
                                <div className="view-settings-modal__link-item">
                                    <Palette size={12} />
                                    <span>Color Map</span>
                                    <select
                                        className="view-settings-modal__link-select"
                                        value={linkConfig.colorMap?.parentId || ''}
                                        onChange={(e) => onLinkPropertyChange?.('colorMap', {
                                            enabled: !!e.target.value,
                                            parentId: e.target.value || null
                                        })}
                                    >
                                        <option value="">Not linked</option>
                                        {availableViews.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Placeholder for future settings */}
                    <div className="view-settings-modal__section view-settings-modal__section--placeholder">
                        <div className="view-settings-modal__section-header">
                            <Save size={14} />
                            <span>More Settings</span>
                        </div>
                        <div className="view-settings-modal__placeholder">
                            Additional view settings will be available here
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="view-settings-modal__footer">
                    <button
                        className="view-settings-modal__btn view-settings-modal__btn--secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default ViewSettingsModal;