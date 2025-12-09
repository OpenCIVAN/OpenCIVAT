// DatasetSettingsModal.jsx
// Stub modal for dataset (parent) settings

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Database, Plus, Eye, Trash2, FileType } from 'lucide-react';

/**
 * DatasetSettingsModal - Modal for configuring dataset-level settings
 *
 * This is a stub modal that will be expanded with more settings as needed.
 * Provides quick actions for the dataset and its views.
 */
export function DatasetSettingsModal({
    dataset,
    views = [],
    onClose,
    onCreateView,
    onUnloadDataset,
}) {
    if (!dataset) return null;

    const activeViews = views.filter(v => v.isActive);

    const modalContent = (
        <div className="dataset-settings-modal-backdrop" onClick={onClose}>
            <div className="dataset-settings-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="dataset-settings-modal__header">
                    <div className="dataset-settings-modal__icon">
                        <Database size={20} />
                    </div>
                    <div className="dataset-settings-modal__title-area">
                        <h3 className="dataset-settings-modal__title">
                            {dataset.filename || dataset.name || 'Dataset Settings'}
                        </h3>
                        <span className="dataset-settings-modal__subtitle">
                            {dataset.fileType || 'Unknown type'} &middot; {views.length} view{views.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <button className="dataset-settings-modal__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="dataset-settings-modal__content">
                    {/* Dataset Info Section */}
                    <div className="dataset-settings-modal__section">
                        <div className="dataset-settings-modal__section-header">
                            <FileType size={14} />
                            <span>Dataset Info</span>
                        </div>
                        <div className="dataset-settings-modal__info-grid">
                            <div className="dataset-settings-modal__info-item">
                                <span className="dataset-settings-modal__info-label">Type</span>
                                <span className="dataset-settings-modal__info-value">
                                    {dataset.fileType || 'Unknown'}
                                </span>
                            </div>
                            <div className="dataset-settings-modal__info-item">
                                <span className="dataset-settings-modal__info-label">Views</span>
                                <span className="dataset-settings-modal__info-value">
                                    {activeViews.length} active / {views.length} total
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Views Section */}
                    <div className="dataset-settings-modal__section">
                        <div className="dataset-settings-modal__section-header">
                            <Eye size={14} />
                            <span>Views</span>
                        </div>
                        {views.length === 0 ? (
                            <div className="dataset-settings-modal__empty">
                                No views created yet
                            </div>
                        ) : (
                            <div className="dataset-settings-modal__view-list">
                                {views.slice(0, 5).map(view => (
                                    <div key={view.id} className="dataset-settings-modal__view-item">
                                        <span
                                            className={`dataset-settings-modal__view-status ${view.isActive ? 'dataset-settings-modal__view-status--active' : ''
                                                }`}
                                        />
                                        <span className="dataset-settings-modal__view-name">
                                            {view.name || 'Untitled View'}
                                        </span>
                                    </div>
                                ))}
                                {views.length > 5 && (
                                    <div className="dataset-settings-modal__view-more">
                                        +{views.length - 5} more view{views.length - 5 !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Placeholder for future settings */}
                    <div className="dataset-settings-modal__section dataset-settings-modal__section--placeholder">
                        <div className="dataset-settings-modal__section-header">
                            <Settings size={14} />
                            <span>More Settings</span>
                        </div>
                        <div className="dataset-settings-modal__placeholder">
                            Additional dataset settings will be available here
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="dataset-settings-modal__footer">
                    <button
                        className="dataset-settings-modal__btn dataset-settings-modal__btn--primary"
                        onClick={() => {
                            onCreateView?.(dataset.id);
                            onClose();
                        }}
                    >
                        <Plus size={14} />
                        Create View
                    </button>
                    <button
                        className="dataset-settings-modal__btn dataset-settings-modal__btn--danger"
                        onClick={() => {
                            onUnloadDataset?.(dataset.id);
                            onClose();
                        }}
                    >
                        <Trash2 size={14} />
                        Unload
                    </button>
                    <button
                        className="dataset-settings-modal__btn dataset-settings-modal__btn--secondary"
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

export default DatasetSettingsModal;