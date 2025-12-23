/**
 * GridCell Component
 *
 * Individual cell in the grid layout preview.
 * Renders placements or empty cells with various states.
 *
 * @param {Object} cell - Cell data { row, col, type, placement }
 * @param {boolean} isSelected - Whether cell is selected (for merging)
 * @param {boolean} isViewport - Whether cell is current viewport location
 * @param {boolean} isHomepoint - Whether cell is the homepoint
 * @param {boolean} hasOverlap - Whether placement overlaps with another
 * @param {Array} collaborators - Collaborators viewing this cell
 * @param {boolean} isDragging - Whether this cell's placement is being dragged
 * @param {boolean} isDropTarget - Whether this is the current drop target
 * @param {boolean} isExternalDropTarget - Whether external item is hovering over this cell
 * @param {boolean} canSpawn - Whether clicking can spawn a new view
 * @param {boolean} isEditMode - Whether in edit mode
 * @param {function} onClick - Click handler
 * @param {function} onDragStart - Drag start handler
 * @param {function} onDragOver - Drag over handler
 * @param {function} onDrop - Drop handler
 * @param {function} onFollow - Follow collaborator handler
 */

import { memo, useCallback } from 'react';
import { Plus, Home, AlertTriangle } from 'lucide-react';
import { CollaboratorAvatar } from './CollaboratorAvatar';
import './GridCell.scss';

// Instance color mapping
const INSTANCE_COLORS = {
    blue: '#60a5fa',
    green: '#34d399',
    pink: '#fb7185',
    amber: '#fbbf24',
    teal: '#7dd3fc',
    purple: '#c084fc',
    indigo: '#a78bfa',
    red: '#f87171',
};

export const GridCell = memo(function GridCell({
    cell,
    isSelected = false,
    isViewport = false,
    isHomepoint = false,
    hasOverlap = false,
    collaborators = [],
    isDragging = false,
    isDropTarget = false,
    isExternalDropTarget = false,
    canSpawn = false,
    isEditMode = false,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
    onFollow,
}) {
    const { row, col, type, placement } = cell;

    const handleDragStart = useCallback((e) => {
        if (!isEditMode || !placement) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', placement.id);
        onDragStart?.();
    }, [isEditMode, placement, onDragStart]);

    const handleDragOver = useCallback((e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver?.();
    }, [isEditMode, onDragOver]);

    const handleDrop = useCallback((e) => {
        if (!isEditMode) return;
        e.preventDefault();
        onDrop?.();
    }, [isEditMode, onDrop]);

    const instanceColor = placement?.color
        ? INSTANCE_COLORS[placement.color] || placement.color
        : INSTANCE_COLORS.blue;

    const cellStyle = placement
        ? {
            '--instance-color': instanceColor,
            gridColumn: placement.colSpan > 1 ? `span ${placement.colSpan}` : undefined,
            gridRow: placement.rowSpan > 1 ? `span ${placement.rowSpan}` : undefined,
        }
        : {};

    const classNames = [
        'grid-cell',
        `grid-cell--${type}`,
        isSelected && 'grid-cell--selected',
        isViewport && 'grid-cell--viewport',
        isHomepoint && 'grid-cell--homepoint',
        hasOverlap && 'grid-cell--overlap',
        isDragging && 'grid-cell--dragging',
        isDropTarget && 'grid-cell--drop-target',
        isExternalDropTarget && 'grid-cell--external-drop-target',
        canSpawn && 'grid-cell--spawnable',
        isEditMode && 'grid-cell--edit-mode',
        collaborators.length > 0 && 'grid-cell--has-collaborators',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            style={cellStyle}
            onClick={onClick}
            draggable={isEditMode && !!placement}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            data-row={row}
            data-col={col}
        >
            {type === 'placement' && placement && (
                <>
                    {/* Placement content */}
                    <div className="grid-cell__content">
                        <span className="grid-cell__name">
                            {placement.name || `View ${placement.id}`}
                        </span>
                        {placement.rowSpan > 1 || placement.colSpan > 1 ? (
                            <span className="grid-cell__size">
                                {placement.rowSpan}×{placement.colSpan}
                            </span>
                        ) : null}
                    </div>

                    {/* Overlap warning */}
                    {hasOverlap && (
                        <div className="grid-cell__overlap-indicator">
                            <AlertTriangle size={12} />
                        </div>
                    )}
                </>
            )}

            {type === 'empty' && (
                <div className="grid-cell__empty">
                    {isEditMode && (
                        <Plus size={12} className="grid-cell__add-icon" />
                    )}
                </div>
            )}

            {/* Homepoint marker */}
            {isHomepoint && (
                <div className="grid-cell__homepoint-marker">
                    <Home size={10} />
                </div>
            )}

            {/* Collaborator avatars */}
            {collaborators.length > 0 && (
                <div className="grid-cell__collaborators">
                    {collaborators.slice(0, 3).map((collab, index) => (
                        <CollaboratorAvatar
                            key={collab.id}
                            collaborator={collab}
                            size="sm"
                            onFollow={() => onFollow?.(collab)}
                            style={{ zIndex: 3 - index }}
                        />
                    ))}
                    {collaborators.length > 3 && (
                        <span className="grid-cell__collab-more">
                            +{collaborators.length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Position badge */}
            <span className="grid-cell__position">
                {row + 1},{col + 1}
            </span>
        </div>
    );
});

export default GridCell;