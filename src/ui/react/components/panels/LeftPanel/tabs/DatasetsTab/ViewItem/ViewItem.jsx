/**
 * ViewItem Component
 *
 * Represents a single view in the views list with expandable sliding panel.
 * Shows status, controls, and linked properties on hover.
 *
 * Main Row (Always Visible):
 * - Drag handle (appears on hover)
 * - Status dot (green=active, hollow=inactive)
 * - Editable name (double-click)
 * - Status icons
 * - Grid position badge
 * - Close button (hover)
 *
 * Sliding Panel (On Hover):
 * - Glassmorphism frosted glass effect
 * - Action buttons grouped by category
 * - Link property toggles
 */

import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    GripVertical,
    X,
    Trash2,
    Folder,
    Globe,
    Save,
    Users,
    Link2,
    Lock,
    Filter,
    MoreHorizontal,
} from 'lucide-react';
import { SlidingPanel } from './components/SlidingPanel';
import './ViewItem.scss';

// Status icon configuration (v3 design)
const STATUS_ICONS = {
    starredWorkspace: { icon: Folder, color: 'purple', tooltip: 'Saved to Workspace' },
    starredPersonal: { icon: Globe, color: 'gold', tooltip: 'Saved to Personal' },
    hasSavedState: { icon: Save, color: 'amber', tooltip: 'Has saved state preset' },
    shared: { icon: Users, color: 'pink', tooltip: 'Shared with collaborators' },
    linked: { icon: Link2, color: 'teal', tooltip: 'Linked properties' },
    locked: { icon: Lock, color: 'amber', tooltip: 'Locked' },
    filtered: { icon: Filter, color: 'purple', tooltip: 'Active filters' },
};

export const ViewItem = memo(function ViewItem({
    view,
    isActive = false,
    isSelected = false,
    isDragging = false,
    linkedCount = 0,
    filterCount = 0,
    linkProperties = {},
    linkedParent = null, // { id, name } - parent view if spawned from another
    linkTarget = null, // { id, name } - current link target
    onSelect,
    onClose,  // Close (deactivate) - remove from canvas, keep in list
    onTrash,  // Trash - move to Recently Deleted
    onRename,
    onDragStart,
    onDragEnd,
    onNavigate,
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onShareView,
    onSpawn, // Creates independent linked copy
    onConfigureLinks,
    onToggleAllLinks,
    onSizeChange,
    onLinkPropertyChange,
    className = '',
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(view.name);
    const [showPanel, setShowPanel] = useState(false);
    const inputRef = useRef(null);
    const itemRef = useRef(null);

    // Handle double-click to edit name
    const handleDoubleClick = useCallback(() => {
        setIsEditing(true);
        setEditValue(view.name);
    }, [view.name]);

    // Handle name edit completion
    const handleEditComplete = useCallback(() => {
        setIsEditing(false);
        if (editValue.trim() && editValue !== view.name) {
            onRename?.(view.id, editValue.trim());
        }
    }, [editValue, view.name, view.id, onRename]);

    // Handle edit key events
    const handleEditKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleEditComplete();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(view.name);
        }
    }, [handleEditComplete, view.name]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Show panel with delay on hover (hide when editing or dragging)
    useEffect(() => {
        let timeout;
        if (isHovered && !isEditing && !isDragging) {
            timeout = setTimeout(() => setShowPanel(true), 200);
        } else {
            setShowPanel(false);
        }
        return () => clearTimeout(timeout);
    }, [isHovered, isEditing, isDragging]);

    // Build status badges (v3 design) - max 3 visible, rest shown as overflow
    const MAX_VISIBLE_BADGES = 3;

    const allBadges = useMemo(() => {
        const badges = [];
        if (view.starredWorkspace) badges.push({ key: 'starredWorkspace', ...STATUS_ICONS.starredWorkspace });
        if (view.starredPersonal) badges.push({ key: 'starredPersonal', ...STATUS_ICONS.starredPersonal });
        if (view.hasSavedState) badges.push({ key: 'hasSavedState', ...STATUS_ICONS.hasSavedState });
        if (view.isShared) badges.push({ key: 'shared', ...STATUS_ICONS.shared });
        if (linkedCount > 0) badges.push({ key: 'linked', ...STATUS_ICONS.linked, count: linkedCount });
        if (view.isLocked) badges.push({ key: 'locked', ...STATUS_ICONS.locked });
        if (filterCount > 0) badges.push({ key: 'filtered', ...STATUS_ICONS.filtered, count: filterCount });
        return badges;
    }, [view.starredWorkspace, view.starredPersonal, view.hasSavedState, view.isShared, view.isLocked, linkedCount, filterCount]);

    const visibleBadges = allBadges.slice(0, MAX_VISIBLE_BADGES);
    const overflowCount = allBadges.length - MAX_VISIBLE_BADGES;
    const overflowBadges = allBadges.slice(MAX_VISIBLE_BADGES);

    const classNames = [
        'view-item',
        isActive && 'view-item--active',
        isSelected && 'view-item--selected',
        isDragging && 'view-item--dragging',
        isHovered && 'view-item--hovered',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={itemRef}
            className={classNames}
            style={{ '--view-color': view.color || '#60a5fa' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect?.(view.id)}
        >
            {/* Main Row */}
            <div className="view-item__main">
                {/* Drag Handle */}
                <div
                    className="view-item__drag-handle"
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copyMove';
                        // Set data for internal reordering
                        e.dataTransfer.setData('text/plain', view.id);
                        // Set data for external drop targets (GridLayoutPreview)
                        e.dataTransfer.setData('application/x-viewitem', JSON.stringify({
                            id: view.id,
                            name: view.name,
                            color: view.color,
                            size: view.size,
                        }));
                        onDragStart?.(view.id);
                    }}
                    onDragEnd={onDragEnd}
                >
                    <GripVertical size={12} />
                </div>

                {/* Status Dot */}
                <div
                    className={`view-item__status-dot ${isActive ? 'view-item__status-dot--active' : ''}`}
                    title={isActive ? 'Active' : 'Inactive'}
                />

                {/* Name */}
                <div className="view-item__name-container">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            className="view-item__name-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditComplete}
                            onKeyDown={handleEditKeyDown}
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

                {/* Status Icons - truncated with overflow indicator */}
                <div className="view-item__status-icons">
                    {visibleBadges.map(({ key, icon: Icon, color, count, tooltip }) => (
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
                    {overflowCount > 0 && (
                        <span
                            className="view-item__status-overflow"
                            title={overflowBadges.map(b => b.tooltip).join(', ')}
                        >
                            +{overflowCount}
                        </span>
                    )}
                </div>

                {/* Grid Position */}
                {view.position && (
                    <span className="view-item__position" onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.(view.position);
                    }}>
                        {view.position.row + 1},{view.position.col + 1}
                    </span>
                )}

                {/* Action Buttons */}
                <div className="view-item__actions">
                    {/* Close Button - deactivate, remove from canvas but keep in list */}
                    <button
                        className="view-item__close-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose?.(view.id);
                        }}
                        title="Close view (remove from canvas)"
                    >
                        <X size={12} />
                    </button>
                    {/* Trash Button - move to Recently Deleted */}
                    <button
                        className="view-item__trash-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTrash?.(view.id);
                        }}
                        title="Delete view"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Sliding Panel */}
            <SlidingPanel
                isVisible={showPanel}
                view={view}
                linkProperties={linkProperties}
                linkedParent={linkedParent}
                linkTarget={linkTarget}
                linkedCount={linkedCount}
                onStarWorkspace={() => onStarWorkspace?.(view.id)}
                onStarPersonal={() => onStarPersonal?.(view.id)}
                onSaveState={() => onSaveState?.(view.id)}
                onLoadState={() => onLoadState?.(view.id)}
                onShareView={() => onShareView?.(view.id)}
                onSpawn={() => onSpawn?.(view.id)}
                onConfigureLinks={() => onConfigureLinks?.(view.id)}
                onToggleAllLinks={(linked) => onToggleAllLinks?.(view.id, linked)}
                onSizeChange={(size) => onSizeChange?.(view.id, size)}
                onLinkPropertyChange={(prop, value) => onLinkPropertyChange?.(view.id, prop, value)}
            />
        </div>
    );
});

export default ViewItem;