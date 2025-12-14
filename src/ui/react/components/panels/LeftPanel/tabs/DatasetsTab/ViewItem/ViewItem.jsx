/**
 * ViewItem Component (with Thumbnail Integration)
 *
 * Represents a single view in the views list with three UI surfaces:
 * - Main Row: Thumbnail, status icons, quick actions on hover
 * - Sliding Panel: Slides down on hover with quick toggles and size picker
 * - Context Menu: Right-click for actions
 * - Settings Modal: Full configuration (opened via gear icon)
 *
 * @module ViewItem
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    GripVertical,
    X,
    Folder,
    Globe,
    Save,
    Users,
    Link2,
    Lock,
    Filter,
    Settings,
    LayoutGrid,
} from 'lucide-react';
import { SlidingPanel } from './components/SlidingPanel';
import { ViewItemContextMenu } from './components/ViewItemContextMenu';
import { ViewSettingsModal } from './components/ViewSettingsModal';
// ═══════════════════════════════════════════════════════════════════════════════
// NEW: Import Thumbnail component for view previews
// ═══════════════════════════════════════════════════════════════════════════════
import { Thumbnail } from '@UI/react/components/common/Thumbnail';
import './ViewItem.scss';

// Status icon configuration
const STATUS_ICONS = {
    starredWorkspace: { icon: Folder, color: 'purple', tooltip: 'Saved to Workspace' },
    starredPersonal: { icon: Globe, color: 'amber', tooltip: 'Saved to Personal' },
    hasSavedState: { icon: Save, color: 'amber', tooltip: 'Has saved state' },
    isShared: { icon: Users, color: 'pink', tooltip: 'Shared' },
    isLocked: { icon: Lock, color: 'amber', tooltip: 'Locked' },
    hasLinks: { icon: Link2, color: 'teal', tooltip: 'Linked properties' },
    hasFilters: { icon: Filter, color: 'purple', tooltip: 'Active filters' },
};

export const ViewItem = memo(function ViewItem({
    view,
    isActive = false,
    isSelected = false,
    isDragging = false,
    availableViews = [],
    dataset = null,
    sharedUsers = [],
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
    // Local state - single hover state for entire item including panel
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(view.name);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);

    const inputRef = useRef(null);
    const itemRef = useRef(null);

    // Derived state - check multiple ways a view might be "placed" on canvas
    const isPlaced = Boolean(
        view.position != null ||
        view.isActive ||
        view.isPlaced ||
        (view.row != null && view.col != null)
    );

    // Focus input when editing
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Context menu handlers
    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Name editing handlers
    const handleNameSubmit = useCallback(() => {
        if (editValue.trim() && editValue !== view.name) {
            onRename?.(view.id, editValue.trim());
        } else {
            setEditValue(view.name);
        }
        setIsEditing(false);
    }, [editValue, view.name, view.id, onRename]);

    const handleNameKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setEditValue(view.name);
            setIsEditing(false);
        }
    }, [handleNameSubmit, view.name]);

    const handleDoubleClick = useCallback((e) => {
        e.stopPropagation();
        setIsEditing(true);
    }, []);

    const handlePlaceOnCanvas = useCallback(() => {
        onPlaceOnCanvas?.(view.id);
    }, [view.id, onPlaceOnCanvas]);

    // Build status icons to display
    const statusIcons = [];
    if (view.starredWorkspace) statusIcons.push({ ...STATUS_ICONS.starredWorkspace, key: 'workspace' });
    if (view.starredPersonal) statusIcons.push({ ...STATUS_ICONS.starredPersonal, key: 'personal' });
    if (view.hasSavedState) statusIcons.push({ ...STATUS_ICONS.hasSavedState, key: 'saved' });
    if (view.isShared) statusIcons.push({ ...STATUS_ICONS.isShared, key: 'shared' });
    if (view.isLocked) statusIcons.push({ ...STATUS_ICONS.isLocked, key: 'locked' });
    if (view.linkedCount > 0) statusIcons.push({ ...STATUS_ICONS.hasLinks, key: 'links', count: view.linkedCount });
    if (view.filterCount > 0) statusIcons.push({ ...STATUS_ICONS.hasFilters, key: 'filters', count: view.filterCount });

    const itemClasses = [
        'view-item',
        isActive && 'view-item--active',
        isSelected && 'view-item--selected',
        isDragging && 'view-item--dragging',
        !isPlaced && 'view-item--not-placed',
        isHovered && 'view-item--panel-open',
        className,
    ].filter(Boolean).join(' ');

    // Get dataset info from view or prop
    const datasetInfo = dataset || view.dataset || {
        name: view.datasetName || view.name?.replace('View of ', '') || 'Unknown',
        dimensions: view.dimensions || '---',
        size: view.size || '---',
        type: view.instanceType || 'Unknown',
    };

    return (
        <div
            className={itemClasses}
            ref={itemRef}
            draggable
            onDragStart={(e) => {
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
            }}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                    <GripVertical size={14} />
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    NEW: Thumbnail with Status Ring (replaces plain status dot)
                    
                    The thumbnail shows a preview of the view. The status ring
                    around it indicates whether the view is placed on canvas.
                    Falls back to an icon if no thumbnail exists yet.
                ═══════════════════════════════════════════════════════════════ */}
                <div className="view-item__thumbnail-wrapper">
                    <Thumbnail
                        viewId={view.id}
                        size="xs"
                        instanceType={view.instanceType || datasetInfo?.type || 'vtk'}
                    />
                    {/* Status ring shows placement state with view color */}
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
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={handleNameKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="view-item__name"
                            onDoubleClick={handleDoubleClick}
                            title={view.name}
                        >
                            {view.name}
                        </span>
                    )}
                </div>

                {/* Status Icons - only show when NOT hovered */}
                {!isHovered && statusIcons.length > 0 && (
                    <div className="view-item__status-icons">
                        {statusIcons.slice(0, 4).map(({ icon: Icon, color, tooltip, key, count }) => (
                            <span
                                key={key}
                                className="view-item__status-icon"
                                data-color={color}
                                title={tooltip}
                            >
                                <Icon size={12} />
                                {count && <span className="view-item__status-count">{count}</span>}
                            </span>
                        ))}
                        {statusIcons.length > 4 && (
                            <span className="view-item__status-overflow">+{statusIcons.length - 4}</span>
                        )}
                    </div>
                )}

                {/* Position Badge - show if placed */}
                {isPlaced && (
                    <span
                        className="view-item__position-badge"
                        style={{ '--view-color': view.color }}
                    >
                        [{(view.position?.row ?? view.row ?? 0) + 1},{(view.position?.col ?? view.col ?? 0) + 1}]
                    </span>
                )}

                {/* Hover Actions - show when hovered */}
                {isHovered && (
                    <div className="view-item__hover-actions">
                        {/* Place button - only when NOT placed */}
                        {!isPlaced && (
                            <button
                                className="view-item__action-btn view-item__action-btn--place"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaceOnCanvas();
                                }}
                                title="Place on Canvas"
                            >
                                <LayoutGrid size={12} />
                            </button>
                        )}

                        {/* Settings button - always visible on hover */}
                        <button
                            className="view-item__action-btn view-item__action-btn--settings"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSettingsModal(true);
                            }}
                            title="View Settings"
                        >
                            <Settings size={12} />
                        </button>

                        {/* Close/Remove button - ALWAYS visible on hover */}
                        <button
                            className="view-item__action-btn view-item__action-btn--close"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isPlaced) {
                                    onClose?.(view.id);
                                } else {
                                    // Not placed - this could trash or just close
                                    onTrash?.(view.id) || onClose?.(view.id);
                                }
                            }}
                            title={isPlaced ? "Remove from Canvas" : "Close View"}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Sliding Panel */}
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
                onLinkPropertyChange={(prop, targetViewId) => onLinkPropertyChange?.(view.id, prop, targetViewId)}
            />

            {/* Context Menu (Portal) */}
            {contextMenu && createPortal(
                <ViewItemContextMenu
                    view={view}
                    position={contextMenu}
                    isPlaced={isPlaced}
                    onClose={closeContextMenu}
                    onRename={() => {
                        closeContextMenu();
                        setIsEditing(true);
                    }}
                    onNavigate={() => {
                        closeContextMenu();
                        onNavigate?.(view.id);
                    }}
                    onPlace={() => {
                        closeContextMenu();
                        handlePlaceOnCanvas();
                    }}
                    onDuplicate={() => {
                        closeContextMenu();
                        onDuplicate?.(view.id);
                    }}
                    onCloseView={() => {
                        closeContextMenu();
                        onClose?.(view.id);
                    }}
                    onTrash={() => {
                        closeContextMenu();
                        onTrash?.(view.id);
                    }}
                    onOpenSettings={() => {
                        closeContextMenu();
                        setShowSettingsModal(true);
                    }}
                />,
                document.body
            )}

            {/* Settings Modal (Portal) */}
            {showSettingsModal && createPortal(
                <ViewSettingsModal
                    view={view}
                    dataset={datasetInfo}
                    sharedUsers={sharedUsers}
                    onClose={() => setShowSettingsModal(false)}
                    onRename={(newName) => onRename?.(view.id, newName)}
                    onSizeChange={(size) => onSizeChange?.(view.id, size)}
                    onShare={onShare}
                    onUpdateSharing={onUpdateSharing}
                    onDuplicate={() => onDuplicate?.(view.id)}
                    onTrash={() => onTrash?.(view.id)}
                    onLinkPropertyChange={onLinkPropertyChange}
                    onAnnotationFilterChange={onAnnotationFilterChange}
                    onDisplayOptionChange={onDisplayOptionChange}
                />,
                document.body
            )}
        </div>
    );
});

export default ViewItem;