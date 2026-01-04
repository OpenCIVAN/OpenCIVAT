/**
 * @file FileItem.jsx
 * @description File item component for list and grid views.
 * 
 * CLEAN MIGRATION: Uses <Icon name={...} /> directly with semantic names.
 */

import React, { useState, memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { FileThumbnail } from './FileThumbnail';

/**
 * Get icon config for a file - returns STRING icon names (not components!)
 * @param {Object} file - File object
 * @returns {{ icon: string, color: string|null, colorClass: string|null }}
 */
export function getFileTypeConfig(file) {
    if (file.isFolder || file.type === 'folder') {
        return { icon: 'folder', color: null, colorClass: 'file-icon--folder' };
    }

    const displayInfo = getFileTypeDisplayInfo(file.fileType);
    if (displayInfo) {
        return {
            icon: displayInfo.icon,  // Already semantic!
            color: displayInfo.color,
            colorClass: null,
        };
    }

    return { icon: 'file', color: null, colorClass: 'file-icon--default' };
}

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
    const { icon, colorClass, color } = getFileTypeConfig(file);
    const isFolder = file.type === 'folder' || file.isFolder;
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
                onClick={() => (isFolder ? onToggleFolder?.(file.id) : onSelect?.(file))}
                onDoubleClick={() => !isFolder && onDoubleClick?.(file)}
                onContextMenu={(e) => onContextMenu?.(e, file)}
            >
                {/* Folder chevron */}
                {isFolder && (
                    <span className="tree-item__chevron">
                        <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={10} />
                    </span>
                )}

                {/* File type icon - uses semantic name directly */}
                <span
                    className={`tree-item__icon ${colorClass || ''}`}
                    style={color ? { color } : undefined}
                >
                    <Icon name={icon} size={14} />
                </span>

                {/* File name */}
                <span className="tree-item__name" title={file.name}>
                    {file.name}
                </span>

                {/* Status indicators */}
                {file.loaded && (
                    <span className="tree-item__loaded-indicator" title="Loaded in workspace">
                        <Icon name="check" size={10} />
                    </span>
                )}

                {/* Hover actions */}
                {isHovered && !isFolder && (
                    <div className="tree-item__actions">
                        <button
                            className={`tree-item__action ${file.starred ? 'starred' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onStar?.(file);
                            }}
                            title={file.starred ? 'Remove star' : 'Add star'}
                        >
                            <Icon name={file.starred ? "star" : "starOutline"} size={12} />
                        </button>
                        <button
                            className="tree-item__action"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMenuClick?.(e, file);
                            }}
                            title="More actions"
                        >
                            <Icon name="moreHorizontal" size={12} />
                        </button>
                    </div>
                )}

                {file.loaded && (
                    <Icon name="circle" size={6} className="status-indicator__dot--active" />
                )}
                <span className="item-meta">
                    {isFolder ? `${file.children?.length || 0}` : file.size}
                </span>
            </div>

            {/* Children if folder is expanded */}
            {isFolder && isExpanded && file.children?.map((child) => (
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
    const { icon, colorClass, color } = getFileTypeConfig(file);

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
                        fallbackIcon={icon}
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
                        <Icon name="star" size={10} />
                    </button>
                    <button
                        className="thumbnail-action"
                        onClick={(e) => onMenuClick?.(e, file)}
                        title="More actions"
                    >
                        <Icon name="moreHorizontal" size={10} />
                    </button>
                </div>
            </div>
            <div className="file-name">{file.name}</div>
            <div className="file-size">{file.size}</div>
        </div>
    );
});

/**
 * FileItem - Main export
 */
export const FileItem = memo(function FileItem({ variant = 'list', ...props }) {
    if (variant === 'grid') {
        return <FileItemGrid {...props} />;
    }
    return <FileItemList {...props} />;
});

export default FileItemList;