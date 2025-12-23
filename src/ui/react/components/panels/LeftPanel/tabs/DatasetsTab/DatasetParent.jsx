// DatasetParent.jsx
// Parent/folder node for a dataset in the tree view

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { DatasetSettingsModal } from '@UI/react/components/modals/DatasetSettingsModal';

/**
 * Get display configuration for a dataset based on its file type
 */
const getDatasetTypeConfig = (fileType) => {
    const displayInfo = getFileTypeDisplayInfo(fileType);

    if (displayInfo) {
        const iconName = displayInfo.icon.charAt(0).toUpperCase() + displayInfo.icon.slice(1);
        const IconComponent = LucideIcons[iconName] || LucideIcons.Database;

        return {
            icon: IconComponent,
            color: displayInfo.color,
        };
    }

    return { icon: LucideIcons.Database, color: null };
};

/**
 * DatasetParent - Tree node representing a loaded dataset
 *
 * @param {Object} dataset - Dataset object from DatasetManager
 * @param {boolean} isExpanded - Whether the node is expanded
 * @param {Function} onToggle - Toggle expansion callback
 * @param {React.ReactNode} children - Child view items
 * @param {Array} views - Views associated with this dataset
 * @param {Function} onCreateView - Callback to create a new view
 * @param {Function} onUnloadDataset - Callback to unload the dataset
 */
export function DatasetParent({
    dataset,
    isExpanded,
    onToggle,
    children,
    viewCount = 0,
    views = [],
    onCreateView,
    onUnloadDataset,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const typeConfig = getDatasetTypeConfig(dataset.fileType);
    const Icon = typeConfig.icon;

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        // TODO: Open context menu for dataset actions
    }, []);

    return (
        <div className="dataset-parent">
            <div
                className={`dataset-parent__header ${isExpanded ? 'dataset-parent__header--expanded' : ''}`}
                onClick={onToggle}
                onContextMenu={handleContextMenu}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <span className="dataset-parent__chevron">
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>

                <span
                    className="dataset-parent__icon"
                    style={typeConfig.color ? { color: typeConfig.color } : undefined}
                >
                    <Icon size={14} />
                </span>

                <span className="dataset-parent__name">
                    {dataset.filename || dataset.name || 'Untitled'}
                </span>

                <span className="dataset-parent__count">
                    {viewCount}
                </span>

                {isHovered && (
                    <>
                        <button
                            className="dataset-parent__settings-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSettingsModal(true);
                            }}
                            title="Dataset settings"
                        >
                            <Settings size={12} />
                        </button>
                        <button
                            className="dataset-parent__more-btn"
                            onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }}
                        >
                            <MoreHorizontal size={12} />
                        </button>
                    </>
                )}
            </div>

            {isExpanded && children && (
                <div className="dataset-parent__children">
                    {children}
                </div>
            )}

            {/* Settings Modal */}
            <DatasetSettingsModal
                isOpen={showSettingsModal}
                dataset={dataset}
                views={views}
                onClose={() => setShowSettingsModal(false)}
                onCreateView={onCreateView}
                onUnloadDataset={onUnloadDataset}
            />
        </div>
    );
}

export default DatasetParent;