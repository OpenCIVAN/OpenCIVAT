// src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.jsx
// Individual cell in the canvas grid - Updated December 10, 2025
//
// ARCHITECTURE:
// - Supports progressive UI degradation via renderMode prop
// - Four render modes: full, compact, thumbnail, snapshot
// - No minimum sizes - cells scale with viewport
// - Isolation mode click handling for tiny cells
//
// FIXES (Dec 10, 2025):
// - Removed portal for radial menu - now positioned relative to cell
// - Added X button toggle when menu is open
// - Added click outside to close menu
// - Fixed double border on empty cells

import React, { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    Plus,
    X,
    LayoutGrid,
    FileImage,
    FileText,
    Box,
    ZoomIn,
} from 'lucide-react';
import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
import { InstanceViewport } from '@UI/react/components/workspace/InstanceViewport';
import { ProgressiveLoader } from '@UI/react/components/common/ThumbnailPreview';
import { RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import './CanvasCell.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Content type options for the radial menu - positioned in cross pattern
const CONTENT_OPTIONS = [
    { type: 'view', icon: Box, label: 'Add View', color: 'blue' },
    { type: 'notes', icon: FileText, label: 'Add Notes', color: 'amber' },
    { type: 'image', icon: FileImage, label: 'Add Image', color: 'teal' },
    { type: 'grid', icon: LayoutGrid, label: 'Add Grid', color: 'purple' },
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
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
            case RENDER_MODES.COMPACT:
                return {
                    showToolbar: true,
                    showHeader: true,
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'full',
                    showTooltipOnHover: false,
                };
            case RENDER_MODES.THUMBNAIL:
                return {
                    showToolbar: false,
                    showHeader: true,
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'thumbnail',
                    showTooltipOnHover: true,
                };
            case RENDER_MODES.SNAPSHOT:
                return {
                    showToolbar: false,
                    showHeader: false,
                    showHeaderButtons: false,
                    showCoords: false,
                    showSizeBadge: false,
                    renderContent: 'snapshot',
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

        if (!onDrop || !isEmpty) return;

        try {
            // Try ViewItem format first (from datasets tab - x-viewitem MIME type)
            let data = e.dataTransfer.getData('application/x-viewitem');
            if (data) {
                const parsed = JSON.parse(data);
                console.log('ViewItem drop (x-viewitem):', parsed);
                onDrop(row, col, { viewConfigId: parsed.id, ...parsed });
                return;
            }

            // Fall back to generic JSON (from files tab or other sources)
            data = e.dataTransfer.getData('application/json');
            if (data) {
                const parsed = JSON.parse(data);
                console.log('JSON drop:', parsed);

                // Determine what type of data this is
                if (parsed.type === 'dataset') {
                    onDrop(row, col, { datasetId: parsed.datasetId, ...parsed });
                } else if (parsed.type === 'view-item' || parsed.type === 'view') {
                    // Accept BOTH 'view-item' and 'view' types
                    onDrop(row, col, { viewConfigId: parsed.viewId || parsed.id, ...parsed });
                } else if (parsed.type === 'file' || parsed.path || parsed.isFile) {
                    // File from FilesTab - check type OR legacy path/isFile fields
                    onDrop(row, col, { ...parsed, isFile: true });
                } else {
                    // Unknown format - pass through
                    console.warn('Unknown drop data format:', parsed);
                    onDrop(row, col, parsed);
                }
                return;
            }

            console.warn('No recognized data format in drop');
        } catch (err) {
            console.error('Failed to parse dropped data:', err);
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
    // HELPER FUNCTIONS
    // ==========================================================================

    const getDisplayName = useCallback(() => {
        if (isEmpty) return `Empty [${row}, ${col}]`;
        if (contentType === 'view') return placement.content?.name || 'View';
        if (contentType === 'notes') return 'Notes';
        if (contentType === 'image') return 'Image';
        return `Cell [${row}, ${col}]`;
    }, [isEmpty, contentType, placement, row, col]);

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
                        <span>Unknown content type: {contentType}</span>
                        {onRemove && (
                            <button
                                className="canvas-cell__close-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                title="Remove invalid cell"
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    borderRadius: 4,
                                    padding: '4px 8px',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                <X size={14} />
                                Remove
                            </button>
                        )}
                    </div>
                );
        }
    };

    // ==========================================================================
    // MAIN RENDER
    // ==========================================================================

    return (
        <div
            className={classNames}
            data-row={row}
            data-col={col}
            data-content-type={contentType}
            data-render-mode={renderMode}
            style={{
                '--cell-width': `${cellSize.width}px`,
                '--cell-height': `${cellSize.height}px`,
            }}
            onClick={handleClick}
            onDoubleClick={onDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Selection checkbox (for edit mode) */}
            {selectionMode && (
                <div className="canvas-cell__selection-overlay">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onSelect?.(e);
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
// EMPTY PLACEHOLDER - With Radial Menu (No Portal)
// =============================================================================

function EmptyPlaceholder({ row, col, renderMode, inEditMode, onAddClick }) {
    const [showRadial, setShowRadial] = useState(false);
    const containerRef = useRef(null);
    const radialRadius = 55; // Distance from center to options

    // Close menu when clicking outside
    useEffect(() => {
        if (!showRadial) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowRadial(false);
            }
        };

        // Small delay to prevent immediate close from the same click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRadial]);

    // Close on escape key
    useEffect(() => {
        if (!showRadial) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowRadial(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showRadial]);

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

    const handleCenterClick = (e) => {
        e.stopPropagation();
        setShowRadial(!showRadial);
    };

    return (
        <div ref={containerRef} className="canvas-cell__empty-container">
            {/* Center button - Plus or X */}
            <button
                className={`canvas-cell__add-btn ${showRadial ? 'canvas-cell__add-btn--active' : ''}`}
                onClick={handleCenterClick}
                title={showRadial ? 'Close menu' : 'Add content'}
            >
                {showRadial ? <X size={20} /> : <Plus size={20} />}
            </button>

            {/* Radial options - positioned around center button */}
            {showRadial && (
                <div className="canvas-cell__radial-options">
                    {CONTENT_OPTIONS.map((option, index) => {
                        const { type, icon: Icon, label, color } = option;
                        // Position in a cross pattern: right, bottom, left, top
                        const angles = [0, 90, 180, 270];
                        const angle = angles[index];
                        const rad = (angle * Math.PI) / 180;
                        const x = Math.cos(rad) * radialRadius;
                        const y = Math.sin(rad) * radialRadius;

                        return (
                            <button
                                key={type}
                                className={`canvas-cell__radial-option canvas-cell__radial-option--${color}`}
                                style={{
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                    animationDelay: `${index * 0.04}s`,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOptionClick(type);
                                }}
                                title={label}
                            >
                                <Icon size={18} />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Position indicator - bottom right corner */}
            <div className="canvas-cell__position-badge">
                [{row}, {col}]
            </div>
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