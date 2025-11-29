// src/ui/react/components/workspace/CanvasCell.jsx
// Individual cell in the canvas grid
//
// Renders different content types:
// - view: ViewConfiguration (renders InstanceWindow)
// - notes: NotesBlock (renders markdown)
// - image: ImageBlock (renders image)
// - empty: Empty slot placeholder

import React, { memo } from 'react';
import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
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
    selectionMode = false,
    onClick,
    onDoubleClick,
}) {
    const isEmpty = !placement || placement.content.type === PlacementContentType.EMPTY;
    const contentType = placement?.content?.type || 'empty';

    // Build class names
    const classNames = [
        'canvas-cell',
        `canvas-cell--${contentType}`,
        isEmpty && 'canvas-cell--empty',
        isSelected && 'canvas-cell--selected',
        selectionMode && 'canvas-cell--selectable',
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

    // Render content based on type
    const renderContent = () => {
        if (isEmpty) {
            return (
                <div className="canvas-cell__empty-content">
                    <span className="canvas-cell__position">
                        {row}, {col}
                    </span>
                    <span className="canvas-cell__drop-hint">Drop view here</span>
                </div>
            );
        }

        switch (contentType) {
            case PlacementContentType.VIEW:
                return (
                    <ViewPlaceholder
                        viewId={placement.content.viewConfigurationId}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
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
 * ViewPlaceholder - Placeholder for view content
 * In real implementation, this would render an InstanceWindow
 */
function ViewPlaceholder({ viewId, rowSpan, colSpan }) {
    return (
        <div className="canvas-cell__view-placeholder">
            <div className="canvas-cell__view-header">
                <span className="canvas-cell__view-icon">📊</span>
                <span className="canvas-cell__view-title">View</span>
            </div>
            <div className="canvas-cell__view-body">
                <div className="canvas-cell__view-preview">
                    {/* Placeholder for actual VTK/visualization rendering */}
                    <div className="canvas-cell__preview-box">
                        <span>View: {viewId?.slice(0, 8)}...</span>
                        <span className="canvas-cell__preview-size">
                            {colSpan}×{rowSpan}
                        </span>
                    </div>
                </div>
            </div>
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