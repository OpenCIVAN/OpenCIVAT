// src/ui/react/components/workspace/CanvasCell.jsx
// Individual cell in the canvas grid
//
// Renders different content types:
// - view: ViewConfiguration (renders InstanceWindow)
// - notes: NotesBlock (renders markdown)
// - image: ImageBlock (renders image)
// - empty: Empty slot placeholder with interactive UI

import React, { memo, useState, useCallback } from 'react';
import { Plus, Grid3X3, LayoutGrid, FileImage, FileText, Box } from 'lucide-react';
import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
import { InstanceViewport } from '@UI/react/components/workspace/InstanceViewport';
import './CanvasCell.scss';

/**
 * CanvasCell - A single cell in the canvas grid
 *
 * Supports spanning across multiple rows/columns.
 * Renders appropriate content based on placement type.
 */
export const CanvasCell = memo(function CanvasCell({
    placement,
    row,
    col,
    gridRow,
    gridCol,
    rowSpan = 1,
    colSpan = 1,
    isSelected = false,
    isHighlighted = false,
    selectionMode = false,
    editMode = false,
    onClick,
    onDoubleClick,
    onDrop,
    onAddContent,
    onRemovePlacement,
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const isEmpty = !placement || placement.content.type === PlacementContentType.EMPTY;
    const contentType = placement?.content?.type || 'empty';

    // Build class names
    const classNames = [
        'canvas-cell',
        `canvas-cell--${contentType}`,
        isEmpty && 'canvas-cell--empty',
        isSelected && 'canvas-cell--selected',
        isHighlighted && 'canvas-cell--highlighted',
        selectionMode && 'canvas-cell--selectable',
        editMode && 'canvas-cell--edit-mode',
        isDragOver && 'canvas-cell--drag-over',
        rowSpan > 1 && 'canvas-cell--row-span',
        colSpan > 1 && 'canvas-cell--col-span',
    ]
        .filter(Boolean)
        .join(' ');

    // Grid positioning style
    const style = {
        gridRow: `${gridRow} / span ${rowSpan}`,
        gridColumn: `${gridCol} / span ${colSpan}`,
    };

    // Drag and drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (isEmpty) {
            setIsDragOver(true);
        }
    }, [isEmpty]);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (onDrop && isEmpty) {
            try {
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    const parsed = JSON.parse(data);
                    onDrop(row, col, parsed);
                }
            } catch (err) {
                console.error('Failed to parse dropped data:', err);
            }
        }
    }, [isEmpty, row, col, onDrop]);

    // Handle add content click
    const handleAddClick = useCallback((type) => {
        if (onAddContent) {
            onAddContent(row, col, type);
        }
    }, [row, col, onAddContent]);

    // Render content based on type
    const renderContent = () => {
        if (isEmpty) {
            return (
                <EmptyPlaceholder
                    row={row}
                    col={col}
                    editMode={editMode}
                    onAddClick={handleAddClick}
                />
            );
        }

        switch (contentType) {
            case PlacementContentType.VIEW:
                return (
                    <ViewContent
                        viewId={placement.content.viewConfigurationId}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        placementId={placement.id}
                        onClose={() => onRemovePlacement?.(placement.id)}
                    />
                );

            case PlacementContentType.NOTES:
                return (
                    <NotesPlaceholder
                        notesId={placement.content.notesBlockId}
                    />
                );

            case PlacementContentType.IMAGE:
                return (
                    <ImagePlaceholder
                        imageId={placement.content.imageBlockId}
                    />
                );

            default:
                return (
                    <div className="canvas-cell__unknown">
                        Unknown content type: {contentType}
                    </div>
                );
        }
    };

    return (
        <div
            className={classNames}
            style={style}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="gridcell"
            aria-selected={isSelected}
            aria-label={isEmpty ? `Empty cell at ${row}, ${col}` : `${contentType} at ${row}, ${col}`}
            data-row={row}
            data-col={col}
            data-placement-id={placement?.id}
        >
            {/* Selection checkbox (visible in selection mode) */}
            {selectionMode && !isEmpty && (
                <div className="canvas-cell__selection-indicator">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }} // Handled by cell click
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select cell at ${row}, ${col}`}
                    />
                </div>
            )}

            {/* Edit mode selection checkbox (for merging) */}
            {editMode && isEmpty && (
                <div className="canvas-cell__edit-select">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick?.();
                        }}
                        aria-label={`Select cell for merge at ${row}, ${col}`}
                    />
                </div>
            )}

            {/* Main content */}
            <div className="canvas-cell__content">
                {renderContent()}
            </div>

            {/* Resize handle (for spanning views) */}
            {!isEmpty && (
                <div className="canvas-cell__resize-handle" title="Drag to resize">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
            )}

            {/* Span indicator */}
            {(rowSpan > 1 || colSpan > 1) && (
                <div className="canvas-cell__span-badge">
                    {colSpan}×{rowSpan}
                </div>
            )}
        </div>
    );
});

/**
 * EmptyPlaceholder - Enhanced placeholder for empty cells
 */
function EmptyPlaceholder({ row, col, editMode, onAddClick }) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className="canvas-cell__empty-content"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Cell position indicator */}
            <span className="canvas-cell__position">
                ({col}, {row})
            </span>

            {/* Quick add button */}
            <div className={`canvas-cell__add-actions ${showActions || editMode ? 'visible' : ''}`}>
                <button
                    className="canvas-cell__add-btn canvas-cell__add-btn--primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddClick?.('view');
                    }}
                    title="Add visualization"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Drop hint */}
            <span className="canvas-cell__drop-hint">
                Drop file or click +
            </span>

            {/* Additional actions on hover */}
            {showActions && (
                <div className="canvas-cell__content-options">
                    <button
                        className="canvas-cell__option-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddClick?.('view');
                        }}
                        title="Add visualization"
                    >
                        <Box size={12} />
                        <span>View</span>
                    </button>
                    <button
                        className="canvas-cell__option-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddClick?.('notes');
                        }}
                        title="Add notes"
                    >
                        <FileText size={12} />
                        <span>Notes</span>
                    </button>
                    <button
                        className="canvas-cell__option-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddClick?.('image');
                        }}
                        title="Add image"
                    >
                        <FileImage size={12} />
                        <span>Image</span>
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * ViewContent - Renders an InstanceViewport for view placements
 */
function ViewContent({ viewId, rowSpan, colSpan, placementId, onClose }) {
    return (
        <div className="canvas-cell__view-content">
            <InstanceViewport
                viewConfigId={viewId}
                isRemote={false}
                currentSpan={`${colSpan}x${rowSpan}`}
                onDelete={onClose}
            />
        </div>
    );
}

/**
 * NotesPlaceholder - Placeholder for notes content
 */
function NotesPlaceholder({ notesId }) {
    return (
        <div className="canvas-cell__notes-placeholder">
            <div className="canvas-cell__notes-header">
                <span className="canvas-cell__notes-icon">📝</span>
                <span className="canvas-cell__notes-title">Notes</span>
            </div>
            <div className="canvas-cell__notes-body">
                <p className="canvas-cell__notes-preview">
                    Notes content preview...
                </p>
            </div>
        </div>
    );
}

/**
 * ImagePlaceholder - Placeholder for image content
 */
function ImagePlaceholder({ imageId }) {
    return (
        <div className="canvas-cell__image-placeholder">
            <div className="canvas-cell__image-header">
                <span className="canvas-cell__image-icon">🖼️</span>
                <span className="canvas-cell__image-title">Image</span>
            </div>
            <div className="canvas-cell__image-body">
                <div className="canvas-cell__image-preview">
                    Image: {imageId?.slice(0, 8)}...
                </div>
            </div>
        </div>
    );
}

export default CanvasCell;