/**
 * @file FileItem.jsx
 * @description File item component for list and grid views.
 * Displays file info with state indicator, actions, and drag support.
 *
 * @example
 * <FileItem file={file} variant="list" onSelect={handleSelect} onStar={handleStar} />
 */

import React, { useState, memo } from 'react';
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    Star,
    MoreHorizontal,
    Circle,
    Folder,
    FileText,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { FileThumbnail } from './FileThumbnail';

/**
 * Get icon and color config for a file type
 * @param {Object} file - File object
 * @returns {Object} Icon config
 */
export const getFileTypeConfig = (file) => {
    if (file.isFolder) {
        return { icon: Folder, colorClass: 'file-icon--folder', color: null };
    }

    const displayInfo = getFileTypeDisplayInfo(file.fileType);

    if (displayInfo) {
        const iconName = displayInfo.icon.charAt(0).toUpperCase() + displayInfo.icon.slice(1);
        const IconComponent = LucideIcons[iconName] || LucideIcons.Box;

        return {
            icon: IconComponent,
            color: displayInfo.color,
            colorClass: null,
        };
    }

    return { icon: FileText, colorClass: 'file-icon--default', color: null };
};

/**
 * @typedef {Object} FileItemProps
 * @property {Object} file - File data object
 * @property {'list'|'grid'} [variant='list'] - Display variant
 * @property {number} [depth=0] - Nesting depth for tree view
 * @property {boolean} [isSelected] - Whether file is selected
 * @property {Set} [expandedFolders] - Set of expanded folder IDs
 * @property {Function} [onSelect] - Selection handler
 * @property {Function} [onStar] - Star toggle handler
 * @property {Function} [onDragStart] - Drag start handler
 * @property {Function} [onContextMenu] - Context menu handler
 * @property {Function} [onMenuClick] - Menu button click handler
 * @property {Function} [onDoubleClick] - Double-click handler
 * @property {Function} [onToggleFolder] - Folder toggle handler
 */

/**
 * List view file item
 */
export const FileItemList = memo(function FileItemList({
    file,
    depth = 0,
    isSelected,
    onSelect,
    onStar,
    onDragStart,
    onContextMenu,
    onMenuClick,
    onDoubleClick,
    expandedFolders,
    onToggleFolder,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, colorClass, color } = getFileTypeConfig(file);
    const isFolder = file.type === 'folder';
    const isExpanded = expandedFolders?.has(file.id);

    return (
        <>
            <div
                className={`tree-item ${isFolder ? 'tree-item--folder' : 'tree-item--file'} ${isSelected ? 'selected' : ''} ${file.loaded ? 'loaded' : ''}`}
                style={{ paddingLeft: 8 + depth * 16 }}
                draggable={!isFolder}
                onDragStart={(e) => !isFolder && onDragStart?.(e, file)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => (isFolder ? onToggleFolder(file.id) : onSelect(file.id))}
                onDoubleClick={(e) => {
                    if (!isFolder) {
                        e.stopPropagation();
                        onDoubleClick?.(file);
                    }
                }}
                onContextMenu={(e) => !isFolder && onContextMenu?.(e, file)}
            >
                {isFolder ? (
                    <span className="chevron">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                ) : (
                    <GripVertical
                        size={10}
                        className="drag-handle"
                        style={{ opacity: isHovered ? 0.6 : 0 }}
                    />
                )}
                <TypeIcon
                    size={14}
                    style={color ? { color } : undefined}
                    className={colorClass || ''}
                />
                <span className="item-name">{file.name}</span>
                {!isFolder && (isHovered || file.starred) && (
                    <button
                        className={`star-btn ${file.starred ? 'star-btn--starred' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStar(file.id);
                        }}
                    >
                        <Star size={10} fill={file.starred ? 'currentColor' : 'none'} />
                    </button>
                )}
                {!isFolder && isHovered && (
                    <button
                        className="menu-btn"
                        onClick={(e) => onMenuClick?.(e, file)}
                        title="More actions"
                    >
                        <MoreHorizontal size={12} />
                    </button>
                )}
                {file.loaded && (
                    <Circle size={6} fill="currentColor" className="status-indicator__dot--active" />
                )}
                <span className="item-meta">
                    {isFolder ? `${file.children?.length || 0}` : file.size}
                </span>
            </div>
            {isFolder &&
                isExpanded &&
                file.children?.map((child) => (
                    <FileItemList
                        key={child.id}
                        file={child}
                        depth={depth + 1}
                        isSelected={isSelected}
                        onSelect={onSelect}
                        onStar={onStar}
                        onDragStart={onDragStart}
                        onContextMenu={onContextMenu}
                        onMenuClick={onMenuClick}
                        onDoubleClick={onDoubleClick}
                        expandedFolders={expandedFolders}
                        onToggleFolder={onToggleFolder}
                    />
                ))}
        </>
    );
});

/**
 * Grid view file item (card)
 */
export const FileItemGrid = memo(function FileItemGrid({
    file,
    isSelected,
    onSelect,
    onStar,
    onDragStart,
    onContextMenu,
    onMenuClick,
    onDoubleClick,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, colorClass, color } = getFileTypeConfig(file);

    if (file.type === 'folder') return null;

    return (
        <div
            className={`file-card ${isSelected ? 'selected' : ''}`}
            draggable
            onDragStart={(e) => onDragStart?.(e, file)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(file.id)}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick?.(file);
            }}
            onContextMenu={(e) => onContextMenu?.(e, file)}
        >
            <div className="thumbnail">
                <div className="thumbnail__preview">
                    <FileThumbnail
                        fileId={file.id}
                        fallbackIcon={TypeIcon}
                        color={color}
                        colorClass={colorClass}
                    />
                </div>
                <div className="thumbnail-actions" style={{ opacity: isHovered ? 1 : 0 }}>
                    <button
                        className="thumbnail-action"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStar(file.id);
                        }}
                    >
                        <Star size={10} fill={file.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        className="thumbnail-action"
                        onClick={(e) => onMenuClick?.(e, file)}
                        title="More actions"
                    >
                        <MoreHorizontal size={10} />
                    </button>
                </div>
            </div>
            <div className="file-name">{file.name}</div>
            <div className="file-size">{file.size}</div>
        </div>
    );
});

export default FileItemList;