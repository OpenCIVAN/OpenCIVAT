/**
 * ViewItem Component
 * Location: src/ui/react/components/common/ViewItem/ViewItem.jsx
 *
 * Full-featured view item component for active/placed views.
 * Includes: thumbnail, status icons, sliding panel on hover, context menu, drag support.
 *
 * @module ViewItem
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { SlidingPanel } from './components/SlidingPanel';
import { ViewItemContextMenu } from './components/ViewItemContextMenu';
import { ViewSettingsModal } from '@UI/react/components/modals/ViewSettingsModal';
import { Thumbnail } from '@UI/react/components/common/Thumbnail';
import './ViewItem.scss';

// =============================================================================
// STATUS ICON CONFIGURATION
// =============================================================================

const STATUS_ICONS = {
    starredWorkspace: { icon: 'folder', color: 'purple', tooltip: 'Saved to Workspace' },
    starredPersonal: { icon: 'globe', color: 'amber', tooltip: 'Saved to Personal' },
    hasSavedState: { icon: 'save', color: 'amber', tooltip: 'Has saved state' },
    isShared: { icon: 'users', color: 'pink', tooltip: 'Shared' },
    isLocked: { icon: 'unlock', color: 'amber', tooltip: 'Locked' },
    hasLinks: { icon: 'link', color: 'teal', tooltip: 'Linked properties' },
    hasFilters: { icon: 'filter', color: 'purple', tooltip: 'Active filters' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ViewItem = memo(function ViewItem({
    view,
    isActive = false,
    isSelected = false,
    isDragging = false,
    showPosition = false,
    availableViews = [],
    dataset = null,
    sharedUsers = [],
    // Event handlers
    onSelect,
    onClose,
    onTrash,
    onRename,
    onDragStart,
    onDragEnd,
    onNavigate,
    onPlaceOnCanvas,
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onShare,
    onUpdateSharing,
    onDuplicate,
    onLock,
    onSizeChange,
    onLinkPropertyChange,
    onAnnotationFilterChange,
    onDisplayOptionChange,
    className = '',
}) {
    // =========================================================================
    // LOCAL STATE
    // =========================================================================

    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(view?.name || '');
    const [contextMenu, setContextMenu] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const itemRef = useRef(null);
    const inputRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    // =========================================================================
    // DERIVED STATE
    // =========================================================================

    const isPlaced = view?.status === 'active' || view?.position != null;

    // Build status icons array
    const statusIcons = [];
    if (view?.starredWorkspace) statusIcons.push({ ...STATUS_ICONS.starredWorkspace, key: 'workspace' });
    if (view?.starredPersonal) statusIcons.push({ ...STATUS_ICONS.starredPersonal, key: 'personal' });
    if (view?.hasSavedState) statusIcons.push({ ...STATUS_ICONS.hasSavedState, key: 'saved' });
    if (view?.isShared) statusIcons.push({ ...STATUS_ICONS.isShared, key: 'shared' });
    if (view?.isLocked) statusIcons.push({ ...STATUS_ICONS.isLocked, key: 'locked' });
    if (view?.linkedCount > 0) statusIcons.push({ ...STATUS_ICONS.hasLinks, key: 'links', count: view.linkedCount });
    if (view?.filterCount > 0) statusIcons.push({ ...STATUS_ICONS.hasFilters, key: 'filters', count: view.filterCount });

    // Get dataset info
    const datasetInfo = dataset || view?.dataset || {
        name: view?.datasetName || view?.name?.replace('View of ', '') || 'Unknown',
        type: view?.instanceType || 'vtk',
    };

    // =========================================================================
    // HOVER HANDLING
    // =========================================================================

    const handleMouseEnter = useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 150);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleStartEditing = useCallback(() => {
        setEditedName(view?.name || '');
        setIsEditing(true);
    }, [view?.name]);

    const handleFinishEditing = useCallback(() => {
        if (editedName.trim() && editedName !== view?.name) {
            onRename?.(view.id, editedName.trim());
        }
        setIsEditing(false);
    }, [editedName, view?.name, view?.id, onRename]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleFinishEditing();
        } else if (e.key === 'Escape') {
            setEditedName(view?.name || '');
            setIsEditing(false);
        }
    }, [handleFinishEditing, view?.name]);

    const handleClose = useCallback(() => {
        onClose?.(view.id);
    }, [view?.id, onClose]);

    const handleTrash = useCallback(() => {
        onTrash?.(view.id);
    }, [view?.id, onTrash]);

    const handleOpenSettings = useCallback(() => {
        setShowSettingsModal(true);
        setContextMenu(null);
    }, []);

    const handlePlaceOnCanvas = useCallback(() => {
        onPlaceOnCanvas?.(view.id);
    }, [view?.id, onPlaceOnCanvas]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // =========================================================================
    // DRAG HANDLING
    // =========================================================================

    const handleDragStart = useCallback((e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-viewitem', JSON.stringify({
            id: view.id,
            name: view.name,
            color: view.color,
            datasetId: view.datasetId,
            rowSpan: view.rowSpan || 1,
            colSpan: view.colSpan || 1,
        }));
        onDragStart?.(e, view.id);
    }, [view, onDragStart]);

    // =========================================================================
    // RENDER
    // =========================================================================

    const itemClasses = [
        'view-item',
        isActive && 'view-item--active',
        isSelected && 'view-item--selected',
        isDragging && 'view-item--dragging',
        !isPlaced && 'view-item--not-placed',
        isHovered && 'view-item--panel-open',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={itemClasses}
            ref={itemRef}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Main Row */}
            <div
                className="view-item__row"
                onContextMenu={handleContextMenu}
                onClick={() => onSelect?.(view.id)}
            >
                {/* Drag Handle */}
                <div
                    className="view-item__drag-handle"
                    onMouseDown={(e) => onDragStart?.(e, view.id)}
                    onMouseUp={onDragEnd}
                >
                    <Icon name="gripVertical" size={14} />
                </div>

                {/* Thumbnail with Status Ring */}
                <div className="view-item__thumbnail-wrapper">
                    <Thumbnail
                        viewId={view.id}
                        size="xs"
                        instanceType={view.instanceType || datasetInfo?.type || 'vtk'}
                    />
                    <div
                        className={`view-item__status-ring ${isPlaced ? 'view-item__status-ring--active' : ''}`}
                        style={isPlaced ? { borderColor: view.color } : undefined}
                    />
                </div>

                {/* Name */}
                <div className="view-item__name-container">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="view-item__name-input"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onBlur={handleFinishEditing}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="view-item__name"
                            onDoubleClick={handleStartEditing}
                        >
                            {view.name}
                        </span>
                    )}
                </div>

                {/* Status Icons (when not hovered) */}
                {!isHovered && statusIcons.length > 0 && (
                    <div className="view-item__status-icons">
                        {statusIcons.slice(0, 3).map(({ icon, color, key, count }) => (
                            <span key={key} className={`view-item__status-icon view-item__status-icon--${color}`}>
                                <Icon name={icon} size={12} />
                                {count > 1 && <span className="view-item__status-count">{count}</span>}
                            </span>
                        ))}
                        {statusIcons.length > 3 && (
                            <span className="view-item__status-more">+{statusIcons.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Position Badge */}
                {showPosition && view.position && (
                    <div
                        className="view-item__position"
                        style={{ '--view-color': view.color }}
                    >
                        [{view.position.row + 1},{view.position.col + 1}]
                    </div>
                )}

                {/* Hover Actions */}
                {isHovered && (
                    <div className="view-item__hover-actions">
                        <button
                            className="view-item__action-btn"
                            onClick={(e) => { e.stopPropagation(); handleOpenSettings(); }}
                            title="Settings"
                        >
                            <Icon name="settings" size={12} />
                        </button>
                        {isPlaced ? (
                            <button
                                className="view-item__action-btn view-item__action-btn--warning"
                                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                title="Remove from Canvas"
                            >
                                <Icon name="close" size={12} />
                            </button>
                        ) : (
                            <button
                                className="view-item__action-btn view-item__action-btn--success"
                                onClick={(e) => { e.stopPropagation(); handlePlaceOnCanvas(); }}
                                title="Place on Canvas"
                            >
                                <Icon name="layers" size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Sliding Panel (on hover) */}
            <SlidingPanel
                view={view}
                isOpen={isHovered}
                availableViews={availableViews}
                onStarWorkspace={() => onStarWorkspace?.(view.id)}
                onStarPersonal={() => onStarPersonal?.(view.id)}
                onSaveState={() => onSaveState?.(view.id)}
                onLoadState={() => onLoadState?.(view.id)}
                onShare={() => onShare?.(view.id)}
                onDuplicate={() => onDuplicate?.(view.id)}
                onLock={() => onLock?.(view.id)}
                onSizeChange={(size) => onSizeChange?.(view.id, size)}
                onLinkPropertyChange={(props) => onLinkPropertyChange?.(view.id, props)}
            />

            {/* Context Menu */}
            {contextMenu && (
                <ViewItemContextMenu
                    view={view}
                    position={contextMenu}
                    isPlaced={isPlaced}
                    onClose={handleCloseContextMenu}
                    onSelect={() => { onSelect?.(view.id); handleCloseContextMenu(); }}
                    onRename={() => { handleStartEditing(); handleCloseContextMenu(); }}
                    onDuplicate={() => { onDuplicate?.(view.id); handleCloseContextMenu(); }}
                    onShare={() => { onShare?.(view.id); handleCloseContextMenu(); }}
                    onTrash={() => { handleTrash(); handleCloseContextMenu(); }}
                    onSettings={handleOpenSettings}
                    onPlaceOnCanvas={() => { handlePlaceOnCanvas(); handleCloseContextMenu(); }}
                    onRemoveFromCanvas={() => { handleClose(); handleCloseContextMenu(); }}
                    onNavigate={() => { onNavigate?.(view.id); handleCloseContextMenu(); }}
                />
            )}

            {/* Settings Modal */}
            <ViewSettingsModal
                isOpen={showSettingsModal}
                view={view}
                dataset={datasetInfo}
                sharedUsers={sharedUsers}
                onClose={() => setShowSettingsModal(false)}
                onRename={(newName) => onRename?.(view.id, newName)}
                onShare={onShare}
                onUpdateSharing={onUpdateSharing}
                onSizeChange={(size) => onSizeChange?.(view.id, size)}
                onLinkPropertyChange={(props) => onLinkPropertyChange?.(view.id, props)}
                onAnnotationFilterChange={(filters) => onAnnotationFilterChange?.(view.id, filters)}
                onDisplayOptionChange={(opts) => onDisplayOptionChange?.(view.id, opts)}
            />
        </div>
    );
});

export default ViewItem;