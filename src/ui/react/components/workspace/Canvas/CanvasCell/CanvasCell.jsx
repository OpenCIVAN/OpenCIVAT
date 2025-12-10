// src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.jsx
// Individual cell in the canvas grid - Updated December 2025
//
// ARCHITECTURE:
// - Supports progressive UI degradation via renderMode prop
// - Four render modes: full, compact, thumbnail, snapshot
// - No minimum sizes - cells scale with viewport
// - Isolation mode click handling for tiny cells
//
// Render Mode Behavior:
// - FULL: Full 3D render + complete toolbar + header with all buttons
// - COMPACT: 3D render + reduced toolbar (wrench icon for overflow)
// - THUMBNAIL: SVG thumbnail + minimal header (name only)
// - SNAPSHOT: Static image + tooltip on hover

import React, { memo, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Grid3X3,
    LayoutGrid,
    FileImage,
    FileText,
    Box,
    X,
    ZoomIn,
    Wrench,
} from 'lucide-react';
import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
import { InstanceViewport } from '@UI/react/components/workspace/InstanceViewport';
import { ProgressiveLoader } from '@UI/react/components/common/ThumbnailPreview';
import { RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import './CanvasCell.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTENT_OPTIONS = [
    { type: 'view', icon: Box, label: 'VTK View', angle: 0 },
    { type: 'notes', icon: FileText, label: 'Notes', angle: 90 },
    { type: 'image', icon: FileImage, label: 'Image', angle: 180 },
    { type: 'grid', icon: LayoutGrid, label: 'Sub-Grid', angle: 270 },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasCell - A single cell in the canvas grid
 *
 * Supports:
 * - Spanning across multiple rows/columns
 * - Progressive UI degradation based on renderMode
 * - Isolation mode trigger for small cells
 */
export const CanvasCell = memo(function CanvasCell({
    placement,
    row,
    col,
    renderMode = RENDER_MODES.FULL,
    cellSize = { width: 300, height: 200 },
    isSelected = false,
    isHighlighted = false,
    selectionMode = false,
    inEditMode = false,
    onClick,
    onDoubleClick,
    onSelect,
    onDrop,
    onAddContent,
    onRemove,
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const isEmpty = !placement || placement.content?.type === PlacementContentType.EMPTY;
    const contentType = placement?.content?.type || 'empty';
    const rowSpan = placement?.rowSpan || 1;
    const colSpan = placement?.colSpan || 1;

    // Determine which UI elements to show based on render mode
    const uiConfig = useMemo(() => {
        switch (renderMode) {
            case RENDER_MODES.FULL:
                return {
                    showToolbar: true,
                    showHeader: true,
                    showHeaderButtons: true,
                    showCoords: true,
                    showSizeBadge: true,
                    renderContent: 'full', // Full InstanceViewport
                    showTooltipOnHover: false,
                };
            case RENDER_MODES.COMPACT:
                return {
                    showToolbar: true,      // Compact toolbar with overflow menu
                    showHeader: true,
                    showHeaderButtons: false, // Hide extra buttons
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
            case RENDER_MODES.THUMBNAIL:
                return {
                    showToolbar: false,
                    showHeader: true,       // Minimal header with name only
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'thumbnail', // SVG thumbnail
                    showTooltipOnHover: true,
                };
            case RENDER_MODES.SNAPSHOT:
                return {
                    showToolbar: false,
                    showHeader: false,      // No header
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'snapshot', // Static image
                    showTooltipOnHover: true,
                };
            default:
                return {
                    showToolbar: true,
                    showHeader: true,
                    showHeaderButtons: true,
                    showCoords: true,
                    showSizeBadge: true,
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
        }
    }, [renderMode]);

    // Build class names
    const classNames = [
        'canvas-cell',
        `canvas-cell--${contentType}`,
        `canvas-cell--mode-${renderMode}`,
        isEmpty && 'canvas-cell--empty',
        isSelected && 'canvas-cell--selected',
        isHighlighted && 'canvas-cell--highlighted',
        selectionMode && 'canvas-cell--selectable',
        inEditMode && 'canvas-cell--edit-mode',
        isDragOver && 'canvas-cell--drag-over',
        rowSpan > 1 && 'canvas-cell--row-span',
        colSpan > 1 && 'canvas-cell--col-span',
    ]
        .filter(Boolean)
        .join(' ');

    // ==========================================================================
    // DRAG AND DROP
    // ==========================================================================

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
                // Try ViewItem format first
                let data = e.dataTransfer.getData('application/x-viewitem');
                if (data) {
                    const parsed = JSON.parse(data);
                    onDrop(row, col, { viewConfigId: parsed.id, ...parsed });
                    return;
                }

                // Fall back to generic JSON
                data = e.dataTransfer.getData('application/json');
                if (data) {
                    const parsed = JSON.parse(data);
                    onDrop(row, col, parsed);
                }
            } catch (err) {
                console.error('Failed to parse dropped data:', err);
            }
        }
    }, [isEmpty, row, col, onDrop]);

    // ==========================================================================
    // CLICK HANDLERS
    // ==========================================================================

    const handleClick = useCallback((e) => {
        if (onClick) {
            onClick(e);
        }
    }, [onClick]);

    const handleAddClick = useCallback((type) => {
        if (onAddContent) {
            onAddContent(type);
        }
    }, [onAddContent]);

    // ==========================================================================
    // RENDER FUNCTIONS
    // ==========================================================================

    const renderContent = () => {
        if (isEmpty) {
            return (
                <EmptyPlaceholder
                    row={row}
                    col={col}
                    renderMode={renderMode}
                    inEditMode={inEditMode}
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
                        renderMode={renderMode}
                        uiConfig={uiConfig}
                        onClose={() => onRemove?.()}
                    />
                );

            case PlacementContentType.NOTES:
                return (
                    <NotesPlaceholder
                        notesId={placement.content.notesBlockId}
                        renderMode={renderMode}
                        onClose={() => onRemove?.()}
                    />
                );

            case PlacementContentType.IMAGE:
                return (
                    <ImagePlaceholder
                        imageId={placement.content.imageBlockId}
                        renderMode={renderMode}
                        onClose={() => onRemove?.()}
                    />
                );

            default:
                return (
                    <div className="canvas-cell__unknown">
                        Unknown: {contentType}
                    </div>
                );
        }
    };

    // Get display name for tooltip
    const getDisplayName = () => {
        if (!placement) return `Empty [${row}, ${col}]`;
        if (placement.content?.name) return placement.content.name;
        return `${contentType} [${row}, ${col}]`;
    };

    return (
        <div
            className={classNames}
            onClick={handleClick}
            onDoubleClick={onDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => uiConfig.showTooltipOnHover && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            role="gridcell"
            aria-selected={isSelected}
            aria-label={isEmpty ? `Empty cell at ${row}, ${col}` : `${contentType} at ${row}, ${col}`}
            data-row={row}
            data-col={col}
            data-placement-id={placement?.id}
            data-render-mode={renderMode}
        >
            {/* Selection indicator (in selection mode) */}
            {selectionMode && !isEmpty && (
                <div className="canvas-cell__selection-indicator">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(placement.id);
                        }}
                        aria-label={`Select cell at ${row}, ${col}`}
                    />
                </div>
            )}

            {/* Edit mode selection checkbox */}
            {inEditMode && isEmpty && (
                <div className="canvas-cell__edit-select">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick?.(e);
                        }}
                        aria-label={`Select empty cell at ${row}, ${col}`}
                    />
                </div>
            )}

            {/* Isolation mode indicator (for small cells) */}
            {(renderMode === RENDER_MODES.THUMBNAIL || renderMode === RENDER_MODES.SNAPSHOT) && !isEmpty && (
                <div className="canvas-cell__isolation-hint">
                    <ZoomIn size={12} />
                </div>
            )}

            {/* Content */}
            {renderContent()}

            {/* Coordinates badge (only in full mode) */}
            {uiConfig.showCoords && (
                <div className="canvas-cell__coords">
                    [{row}, {col}]
                </div>
            )}

            {/* Tooltip (for small cells) */}
            {showTooltip && uiConfig.showTooltipOnHover && (
                <div className="canvas-cell__tooltip">
                    {getDisplayName()}
                    {rowSpan > 1 || colSpan > 1 ? ` (${colSpan}×${rowSpan})` : ''}
                </div>
            )}
        </div>
    );
});

// =============================================================================
// EMPTY PLACEHOLDER
// =============================================================================

function EmptyPlaceholder({ row, col, renderMode, inEditMode, onAddClick }) {
    const [showRadial, setShowRadial] = useState(false);
    const [hoveredOption, setHoveredOption] = useState(null);
    const radialRef = useRef(null);
    const buttonRef = useRef(null);
    const radialRadius = 60;

    // Don't show add button in tiny modes
    if (renderMode === RENDER_MODES.SNAPSHOT) {
        return (
            <div className="canvas-cell__empty-minimal">
                <div className="canvas-cell__empty-dot" />
            </div>
        );
    }

    if (renderMode === RENDER_MODES.THUMBNAIL) {
        return (
            <div className="canvas-cell__empty-thumbnail">
                <Plus size={12} />
            </div>
        );
    }

    const handleOptionClick = (type) => {
        setShowRadial(false);
        onAddClick?.(type);
    };

    return (
        <div className="canvas-cell__empty">
            {/* Add button */}
            <button
                ref={buttonRef}
                className="canvas-cell__add-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowRadial(!showRadial);
                }}
                title="Add content"
            >
                <Plus size={20} />
            </button>

            {/* Radial menu */}
            {showRadial && buttonRef.current && createPortal(
                <div
                    ref={radialRef}
                    className="canvas-cell__radial-menu"
                    style={{
                        '--radial-x': `${buttonRef.current.getBoundingClientRect().left + buttonRef.current.offsetWidth / 2}px`,
                        '--radial-y': `${buttonRef.current.getBoundingClientRect().top + buttonRef.current.offsetHeight / 2}px`,
                    }}
                >
                    {/* Center label */}
                    <div className="canvas-cell__radial-center">
                        {hoveredOption || 'Add content'}
                    </div>

                    {/* Options */}
                    {CONTENT_OPTIONS.map((option, index) => {
                        const { type, icon: Icon, label, angle } = option;
                        const rad = (angle * Math.PI) / 180;
                        const x = Math.cos(rad) * radialRadius;
                        const y = Math.sin(rad) * radialRadius;

                        return (
                            <button
                                key={type}
                                className={`canvas-cell__radial-option canvas-cell__radial-option--${type}`}
                                style={{
                                    '--x': `${x}px`,
                                    '--y': `${y}px`,
                                    '--delay': `${index * 0.05}s`,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOptionClick(type);
                                }}
                                onMouseEnter={() => setHoveredOption(label)}
                                onMouseLeave={() => setHoveredOption(null)}
                                title={label}
                            >
                                <Icon size={16} />
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
}

// =============================================================================
// VIEW CONTENT
// =============================================================================

function ViewContent({ viewId, rowSpan, colSpan, placementId, renderMode, uiConfig, onClose }) {
    const [isReady, setIsReady] = useState(false);

    // For thumbnail/snapshot modes, show placeholder instead of full render
    if (uiConfig.renderContent === 'thumbnail') {
        return (
            <div className="canvas-cell__thumbnail-content">
                <ProgressiveLoader viewId={viewId} isReady={false}>
                    {/* Just show the thumbnail, don't load full view */}
                    <div className="canvas-cell__thumbnail-placeholder">
                        <Box size={24} />
                    </div>
                </ProgressiveLoader>
            </div>
        );
    }

    if (uiConfig.renderContent === 'snapshot') {
        return (
            <div className="canvas-cell__snapshot-content">
                <div className="canvas-cell__snapshot-placeholder">
                    <Box size={16} />
                </div>
            </div>
        );
    }

    // Full or compact mode - render actual InstanceViewport
    return (
        <div className="canvas-cell__view-content">
            <ProgressiveLoader viewId={viewId} isReady={isReady}>
                <InstanceViewport
                    viewConfigId={viewId}
                    isRemote={false}
                    currentSpan={`${colSpan}x${rowSpan}`}
                    uiMode={renderMode === RENDER_MODES.COMPACT ? 'compact' : 'full'}
                    onReady={() => setIsReady(true)}
                    onClose={onClose}
                    onTrash={onClose}
                />
            </ProgressiveLoader>
        </div>
    );
}

// =============================================================================
// NOTES PLACEHOLDER
// =============================================================================

function NotesPlaceholder({ notesId, renderMode, onClose }) {
    if (renderMode === RENDER_MODES.SNAPSHOT || renderMode === RENDER_MODES.THUMBNAIL) {
        return (
            <div className="canvas-cell__notes-mini">
                <FileText size={renderMode === RENDER_MODES.SNAPSHOT ? 16 : 20} />
            </div>
        );
    }

    return (
        <div className="canvas-cell__notes-placeholder">
            <div className="canvas-cell__notes-header">
                <span className="canvas-cell__notes-icon">📝</span>
                <span className="canvas-cell__notes-title">Notes</span>
                <button
                    className="canvas-cell__close-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                    title="Remove notes"
                >
                    <X size={14} />
                </button>
            </div>
            <div className="canvas-cell__notes-body">
                <p className="canvas-cell__notes-preview">
                    {notesId ? 'Notes content...' : 'Empty notes - click to edit'}
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// IMAGE PLACEHOLDER
// =============================================================================

function ImagePlaceholder({ imageId, renderMode, onClose }) {
    if (renderMode === RENDER_MODES.SNAPSHOT || renderMode === RENDER_MODES.THUMBNAIL) {
        return (
            <div className="canvas-cell__image-mini">
                <FileImage size={renderMode === RENDER_MODES.SNAPSHOT ? 16 : 20} />
            </div>
        );
    }

    return (
        <div className="canvas-cell__image-placeholder">
            <div className="canvas-cell__image-header">
                <span className="canvas-cell__image-icon">🖼️</span>
                <span className="canvas-cell__image-title">Image</span>
                <button
                    className="canvas-cell__close-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                    title="Remove image"
                >
                    <X size={14} />
                </button>
            </div>
            <div className="canvas-cell__image-body">
                <div className="canvas-cell__image-preview">
                    {imageId ? `Image: ${imageId.slice(0, 8)}...` : 'No image selected'}
                </div>
            </div>
        </div>
    );
}

export default CanvasCell;