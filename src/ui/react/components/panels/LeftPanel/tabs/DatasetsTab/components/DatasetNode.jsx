/**
 * @file DatasetNode.jsx
 * @description Tree node representing a loaded dataset in the Datasets tab.
 * Shows dataset info with expandable child views.
 *
 * Features:
 * - Type icon based on file type/handler
 * - Dataset name with view count badge
 * - Handler type indicator
 * - File size and load timestamp
 * - Expandable to show child views
 * - Context menu for dataset actions
 * - Settings modal access
 *
 * @see Left_Panel_Design_Specification.docx - Section 5.3 Dataset Node
 *
 * @example
 * <DatasetNode
 *   dataset={dataset}
 *   views={views}
 *   isExpanded={true}
 *   onToggle={handleToggle}
 * />
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon, getLucideIcon } from '@UI/react/components/common/Icon';
import { Tooltip } from '@UI/react/components/common/Tooltip';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { formatFileSize, formatRelativeTime } from '@Utils/formatters.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';
import './DatasetNode.scss';

/**
 * @typedef {Object} Dataset
 * @property {string} id - Dataset ID
 * @property {string} name - Display name
 * @property {string} filename - Original filename
 * @property {string} fileType - File extension/type
 * @property {number} fileSize - Size in bytes
 * @property {string} loadedAt - ISO timestamp
 * @property {string} handlerType - Handler that loaded this
 */

/**
 * @typedef {Object} DatasetNodeProps
 * @property {Dataset} dataset - Dataset data
 * @property {Array} views - Child views
 * @property {boolean} isExpanded - Whether node is expanded
 * @property {() => void} onToggle - Toggle expansion
 * @property {(datasetId: string) => void} [onCreateView] - Create view handler
 * @property {(datasetId: string) => void} [onUnload] - Unload dataset handler
 * @property {React.ReactNode} children - Child view items
 */

/**
 * Get icon component for dataset type
 * @param {string} fileType - File type extension
 * @returns {React.ComponentType} Icon component
 */
function getDatasetIcon(fileType) {
    const displayInfo = getFileTypeDisplayInfo(fileType);
    if (displayInfo?.icon) {
        return getLucideIcon(displayInfo.icon);
    }
    return getLucideIcon('Database');
}

/**
 * Dataset tree node component.
 *
 * @param {DatasetNodeProps} props - Component props
 * @returns {React.ReactElement} The rendered node
 */
export const DatasetNode = memo(function DatasetNode({
    dataset,
    views = [],
    isExpanded,
    onToggle,
    onCreateView,
    onUnload,
    children,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const TypeIcon = getDatasetIcon(dataset.fileType);
    const displayInfo = getFileTypeDisplayInfo(dataset.fileType);
    const viewCount = views.length;
    const activeViewCount = views.filter((v) => v.status === 'active').length;

    // Format file size
    const sizeDisplay = dataset.fileSize ? formatFileSize(dataset.fileSize) : '';

    // Format loaded time
    const loadedDisplay = dataset.loadedAt
        ? formatRelativeTime(new Date(dataset.loadedAt))
        : '';

    // Handle context menu
    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(true);
    }, []);

    // Close menu
    const handleCloseMenu = useCallback(() => {
        setMenuOpen(false);
    }, []);

    // Menu actions
    const handleCreateView = useCallback(
        (e) => {
            e?.stopPropagation();
            onCreateView?.(dataset.id);
            setMenuOpen(false);
        },
        [dataset.id, onCreateView]
    );

    const handleOpenSettings = useCallback(
        (e) => {
            e?.stopPropagation();
            setShowSettingsModal(true);
            setMenuOpen(false);
        },
        []
    );

    const handleUnload = useCallback(
        (e) => {
            e?.stopPropagation();
            onUnload?.(dataset.id);
            setMenuOpen(false);
        },
        [dataset.id, onUnload]
    );

    return (
        <div className="dataset-node">
            {/* Header row */}
            <div
                className={`dataset-node__header ${isExpanded ? 'dataset-node__header--expanded' : ''}`}
                onClick={onToggle}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    if (!menuOpen) setMenuOpen(false);
                }}
            >
                {/* Expand/collapse chevron */}
                <span className="dataset-node__chevron">
                    {isExpanded ? <Icon name="chevronDown" size={10} /> : <Icon name="chevronRight" size={10} />}
                </span>

                {/* Type icon */}
                <Tooltip content={displayInfo?.label || dataset.fileType?.toUpperCase() || 'Dataset'}>
                    <span
                        className="dataset-node__icon"
                        style={{ color: displayInfo?.color }}
                    >
                        <TypeIcon size={14} />
                    </span>
                </Tooltip>

                {/* Name and info */}
                <div className="dataset-node__info">
                    <span className="dataset-node__name">
                        {dataset.name || dataset.filename || 'Untitled'}
                    </span>
                    <span className="dataset-node__meta">
                        {sizeDisplay}
                        {sizeDisplay && viewCount > 0 && ' • '}
                        {viewCount > 0 && (
                            <>
                                {viewCount} view{viewCount !== 1 ? 's' : ''}
                                {activeViewCount > 0 && ` (${activeViewCount} active)`}
                            </>
                        )}
                        {loadedDisplay && (
                            <span className="dataset-node__time"> • {loadedDisplay}</span>
                        )}
                    </span>
                </div>

                {/* View count badge */}
                {viewCount > 0 && (
                    <span className="dataset-node__badge">{viewCount}</span>
                )}

                {/* Actions (show on hover) */}
                {isHovered && (
                    <div className="dataset-node__actions">
                        <Tooltip content="Create View">
                            <button
                                className="dataset-node__action"
                                onClick={handleCreateView}
                            >
                                <Icon name="add" size={12} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Settings">
                            <button
                                className="dataset-node__action"
                                onClick={handleOpenSettings}
                            >
                                <Icon name="settings" size={12} />
                            </button>
                        </Tooltip>
                        <button
                            className="dataset-node__action"
                            onClick={handleContextMenu}
                        >
                            <Icon name="moreHorizontal" size={12} />
                        </button>
                    </div>
                )}

                {/* Context menu */}
                {menuOpen && (
                    <>
                        <div className="dataset-node__menu-backdrop" onClick={handleCloseMenu} />
                        <div className="dataset-node__menu">
                            <button className="dataset-node__menu-item" onClick={handleCreateView}>
                                <Icon name="add" size={12} />
                                <span>Create View</span>
                            </button>
                            <button className="dataset-node__menu-item" onClick={handleOpenSettings}>
                                <Icon name="settings" size={12} />
                                <span>Dataset Settings</span>
                            </button>
                            <div className="dataset-node__menu-divider" />
                            <button className="dataset-node__menu-item" onClick={(e) => e.stopPropagation()}>
                                <Icon name="download" size={12} />
                                <span>Download</span>
                            </button>
                            <button className="dataset-node__menu-item" onClick={(e) => e.stopPropagation()}>
                                <Icon name="share2" size={12} />
                                <span>Share</span>
                            </button>
                            <div className="dataset-node__menu-divider" />
                            <button
                                className="dataset-node__menu-item dataset-node__menu-item--danger"
                                onClick={handleUnload}
                            >
                                <Icon name="delete" size={12} />
                                <span>Unload Dataset</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Child views */}
            {isExpanded && children && (
                <div className="dataset-node__children">{children}</div>
            )}

            {/* Settings Modal */}
            <DatasetSettingsModal
                isOpen={showSettingsModal}
                dataset={dataset}
                views={views}
                onClose={() => setShowSettingsModal(false)}
                onCreateView={onCreateView}
                onUnloadDataset={onUnload}
            />
        </div>
    );
});

export default DatasetNode;