/**
 * InactiveViewItem Component
 * Location: src/ui/react/components/common/ViewItem/InactiveViewItem.jsx
 *
 * Simplified view item for views that are NOT currently placed on canvas.
 * Clicking places the view on canvas. No sliding panel - just essential info.
 *
 * @module InactiveViewItem
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import {
    GripVertical,
    LayoutGrid,
    Trash2,
    Folder,
    Globe,
    Users,
    Link2,
} from 'lucide-react';
import { Thumbnail } from '@UI/react/components/common/Thumbnail';
import './ViewItem.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const InactiveViewItem = memo(function InactiveViewItem({
    view,
    isSelected = false,
    isDragging = false,
    // Event handlers
    onPlace,
    onTrash,
    onSelect,
    onDragStart,
    onDragEnd,
    className = '',
}) {
    const [isHovered, setIsHovered] = useState(false);

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleClick = useCallback(() => {
        // Primary action: place on canvas
        onPlace?.(view.id);
    }, [view?.id, onPlace]);

    const handleTrash = useCallback((e) => {
        e.stopPropagation();
        onTrash?.(view.id);
    }, [view?.id, onTrash]);

    const handleDragStart = useCallback((e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-viewitem', JSON.stringify({
            id: view.id,
            name: view.name,
            color: view.color,
            datasetId: view.datasetId,
            rowSpan: view.rowSpan || 1,
            colSpan: view.colSpan || 1,
            isInactive: true,
        }));
        onDragStart?.(e, view.id);
    }, [view, onDragStart]);

    // =========================================================================
    // DERIVED STATE
    // =========================================================================

    // Build minimal status indicators
    const hasStars = view?.starredWorkspace || view?.starredPersonal;
    const hasSharing = view?.isShared || view?.linkedCount > 0;

    // =========================================================================
    // RENDER
    // =========================================================================

    const itemClasses = [
        'view-item',
        'view-item--inactive',
        isSelected && 'view-item--selected',
        isDragging && 'view-item--dragging',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={itemClasses}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
            <div className="view-item__row">
                {/* Drag Handle */}
                <div className="view-item__drag-handle">
                    <GripVertical size={14} />
                </div>

                {/* Thumbnail (dimmed for inactive) */}
                <div className="view-item__thumbnail-wrapper">
                    <Thumbnail
                        viewId={view.id}
                        size="xs"
                        instanceType={view.instanceType || 'vtk'}
                    />
                    {/* Dashed ring indicates not placed */}
                    <div className="view-item__status-ring view-item__status-ring--inactive" />
                </div>

                {/* Name */}
                <div className="view-item__name-container">
                    <span className="view-item__name view-item__name--muted">
                        {view.name}
                    </span>
                </div>

                {/* Minimal status indicators */}
                {!isHovered && (hasStars || hasSharing) && (
                    <div className="view-item__status-icons view-item__status-icons--minimal">
                        {view.starredWorkspace && <Folder size={10} className="icon-purple" />}
                        {view.starredPersonal && <Globe size={10} className="icon-amber" />}
                        {view.isShared && <Users size={10} className="icon-pink" />}
                        {view.linkedCount > 0 && <Link2 size={10} className="icon-teal" />}
                    </div>
                )}

                {/* Hover Actions */}
                {isHovered && (
                    <div className="view-item__hover-actions">
                        <button
                            className="view-item__action-btn view-item__action-btn--success"
                            onClick={(e) => { e.stopPropagation(); handleClick(); }}
                            title="Place on Canvas"
                        >
                            <LayoutGrid size={12} />
                        </button>
                        <button
                            className="view-item__action-btn view-item__action-btn--danger"
                            onClick={handleTrash}
                            title="Move to Trash"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default InactiveViewItem;