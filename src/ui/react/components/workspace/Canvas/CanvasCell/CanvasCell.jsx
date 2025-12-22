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
    MoreVertical,
    MoreHorizontal,
    Wrench,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowLeftRight,
} from 'lucide-react';

// =============================================================================
// DROP ZONE CONSTANTS
// =============================================================================

// Drop zone types per spec
const DROP_ZONES = {
    NONE: 'none',
    PLACE: 'place',      // Empty cell center - green
    SWAP: 'swap',        // Occupied cell center (60%) - blue
    PUSH_UP: 'push-up',      // Top 20% - amber
    PUSH_DOWN: 'push-down',  // Bottom 20% - amber
    PUSH_LEFT: 'push-left',  // Left 20% - amber
    PUSH_RIGHT: 'push-right', // Right 20% - amber
};

// Calculate which drop zone based on mouse position within cell
function getDropZone(e, cellRef, isEmpty) {
    if (!cellRef.current) return DROP_ZONES.NONE;

    const rect = cellRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Calculate relative position (0-1)
    const relX = x / width;
    const relY = y / height;

    // Edge threshold is 20% per spec
    const edgeThreshold = 0.20;

    // Check edges first (push zones)
    if (relY < edgeThreshold) return DROP_ZONES.PUSH_UP;
    if (relY > 1 - edgeThreshold) return DROP_ZONES.PUSH_DOWN;
    if (relX < edgeThreshold) return DROP_ZONES.PUSH_LEFT;
    if (relX > 1 - edgeThreshold) return DROP_ZONES.PUSH_RIGHT;

    // Center zone - Place for empty, Swap for occupied
    return isEmpty ? DROP_ZONES.PLACE : DROP_ZONES.SWAP;
}

import { PlacementContentType } from '@Core/data/models/CanvasPlacement.js';
import { InstanceViewport } from '@UI/react/components/workspace/InstanceViewport';
import { ProgressiveLoader } from '@UI/react/components/common/ThumbnailPreview';
import { RENDER_MODES } from '@UI/react/hooks/useCanvasDimensions.js';
import { Thumbnail } from '@UI/react/components/common/Thumbnail';
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
    activeViewId = null,
    recentViewIds = [],
    onClick,
    onDoubleClick,
    onSelect,
    onDrop,
    onSwap,
    onPush,
    onAddContent,
    onRemove,
}) {
    const [activeDropZone, setActiveDropZone] = useState(DROP_ZONES.NONE);
    const cellRef = useRef(null);
    // Refs for dragover throttling - avoid state updates on every mouse move
    const pendingZoneRef = useRef(DROP_ZONES.NONE);
    const rafIdRef = useRef(null);

    const isEmpty = !placement ||
        !placement.content ||
        placement.content.type === PlacementContentType.EMPTY ||
        placement.content.type === undefined ||
        placement.content.type === null;
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
                    showHeader: false,        // Regular header hidden
                    showMiniHeader: true,     // Show mini header instead
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
                    showMiniHeader: true,     // Show mini header
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
    const isDragOver = activeDropZone !== DROP_ZONES.NONE;
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
        isDragOver && `canvas-cell--drop-zone-${activeDropZone}`,
        rowSpan > 1 && 'canvas-cell--row-span',
        colSpan > 1 && 'canvas-cell--col-span',
    ]
        .filter(Boolean)
        .join(' ');

    // ==========================================================================
    // DRAG AND DROP - With Zone Detection (rAF throttled)
    // ==========================================================================

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        // Calculate which drop zone we're in
        const zone = getDropZone(e, cellRef, isEmpty);

        // Only schedule update if zone actually changed
        if (zone !== pendingZoneRef.current) {
            pendingZoneRef.current = zone;

            // Throttle with rAF - only one update per frame
            if (!rafIdRef.current) {
                rafIdRef.current = requestAnimationFrame(() => {
                    rafIdRef.current = null;
                    setActiveDropZone(pendingZoneRef.current);
                });
            }
        }
    }, [isEmpty]);

    const handleDragLeave = useCallback((e) => {
        // Only clear if leaving the cell entirely (not entering a child)
        if (!cellRef.current?.contains(e.relatedTarget)) {
            // Cancel any pending rAF
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            pendingZoneRef.current = DROP_ZONES.NONE;
            setActiveDropZone(DROP_ZONES.NONE);
        }
    }, []);

    // Parse drop data from drag event (hot path - no logging)
    const parseDropData = useCallback((e) => {
        try {
            // Try dataset format first (from datasets tab)
            let data = e.dataTransfer.getData('application/x-dataset');
            if (data) {
                const parsed = JSON.parse(data);
                return { type: 'dataset', ...parsed };
            }

            // Try ViewItem format (from datasets tab - x-viewitem MIME type)
            data = e.dataTransfer.getData('application/x-viewitem');
            if (data) {
                const parsed = JSON.parse(data);
                return { type: 'view', viewConfigId: parsed.id, ...parsed };
            }

            // Fall back to generic JSON (from files tab or other sources)
            data = e.dataTransfer.getData('application/json');
            if (data) {
                const parsed = JSON.parse(data);

                if (parsed.type === 'dataset') {
                    return { type: 'dataset', datasetId: parsed.datasetId, ...parsed };
                } else if (parsed.type === 'view-item' || parsed.type === 'view') {
                    return { type: 'view', viewConfigId: parsed.viewId || parsed.id, ...parsed };
                } else if (parsed.type === 'file' || parsed.path || parsed.isFile) {
                    return { type: 'file', ...parsed, isFile: true };
                } else {
                    return { type: 'unknown', ...parsed };
                }
            }

            return null;
        } catch (err) {
            // Silent fail - don't log in hot path
            return null;
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const dropZone = activeDropZone;
        setActiveDropZone(DROP_ZONES.NONE);

        const dropData = parseDropData(e);
        if (!dropData) return;

        // Get modifier keys for push behavior
        const modifiers = {
            shift: e.shiftKey,   // Wrap to next row
            ctrl: e.ctrlKey,     // Close last view
            alt: e.altKey,
        };

        // Handle based on drop zone
        switch (dropZone) {
            case DROP_ZONES.PLACE:
                // Place in empty cell
                if (onDrop && isEmpty) {
                    if (dropData.type === 'dataset') {
                        onDrop(row, col, { datasetId: dropData.datasetId, ...dropData });
                    } else if (dropData.type === 'view') {
                        onDrop(row, col, { viewConfigId: dropData.viewConfigId, ...dropData });
                    } else {
                        onDrop(row, col, dropData);
                    }
                }
                break;

            case DROP_ZONES.SWAP:
                // Swap with existing view
                if (onSwap && !isEmpty) {
                    onSwap(row, col, dropData, placement);
                } else if (onDrop) {
                    // Fallback to onDrop if onSwap not provided
                    onDrop(row, col, { ...dropData, action: 'swap', existingPlacement: placement });
                }
                break;

            case DROP_ZONES.PUSH_UP:
            case DROP_ZONES.PUSH_DOWN:
            case DROP_ZONES.PUSH_LEFT:
            case DROP_ZONES.PUSH_RIGHT:
                // Push in direction
                const direction = dropZone.replace('push-', '');
                if (onPush) {
                    onPush(row, col, direction, dropData, modifiers);
                } else if (onDrop) {
                    // Fallback to onDrop with push info
                    onDrop(row, col, { ...dropData, action: 'push', direction, modifiers });
                }
                break;

            default:
                console.warn('Unknown drop zone:', dropZone);
        }
    }, [activeDropZone, parseDropData, isEmpty, row, col, placement, onDrop, onSwap, onPush]);

    // ==========================================================================
    // CLICK HANDLERS
    // ==========================================================================

    // Mousedown activates this view for the 3-tier lifecycle system
    // This ensures the view becomes LIVE before any interaction starts
    const handleMouseDown = useCallback((e) => {
        // Only activate for view placements
        if (contentType === 'view' && placement?.content?.viewConfigurationId) {
            const viewId = placement.content.viewConfigurationId;
            // Dispatch activation event - CanvasGrid listens for this
            window.dispatchEvent(new CustomEvent('cia:instance-focused', {
                detail: { viewId, source: 'cell-mousedown' }
            }));
        }
    }, [contentType, placement?.content?.viewConfigurationId]);

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
                // =================================================================
                // 3-TIER LIFECYCLE SYSTEM for InstanceViewport
                // =================================================================
                // LIVE: Active view (interactive, renders on demand)
                // PAUSED: Recently used views in LRU cache (mounted but paused)
                // COLD: All other views (thumbnail only, no InstanceViewport)
                //
                // This reduces GPU load from N instances to 1 live + max 3 paused.
                // Paused instances don't render or handle events, but resume fast.
                // =================================================================
                const viewId = placement.content.viewConfigurationId;
                const isActiveView = viewId === activeViewId;
                const isWarmCached = recentViewIds.includes(viewId);

                // Determine lifecycle state
                let lifecycle = 'cold';
                if (isActiveView) {
                    lifecycle = 'live';
                } else if (isWarmCached) {
                    lifecycle = 'paused';
                }

                // Mount InstanceViewport for active OR warm-cached views
                // In FULL/COMPACT mode, always mount and run live
                const isThumbnailMode =
                    renderMode === RENDER_MODES.THUMBNAIL ||
                    renderMode === RENDER_MODES.SNAPSHOT;

                const shouldMountViewport =
                    renderMode === RENDER_MODES.FULL ||
                    renderMode === RENDER_MODES.COMPACT ||
                    isActiveView ||
                    isWarmCached;

                // In full/compact mode, always live
                const effectiveLifecycle = isThumbnailMode ? lifecycle : 'live';

                return (
                    <ViewContent
                        viewId={viewId}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        placementId={placement.id}
                        renderMode={renderMode}
                        uiConfig={uiConfig}
                        onClose={() => onRemove?.()}
                        viewName={placement.content?.name || placement.content?.viewName}
                        viewColor={placement.content?.color?.hex || placement.content?.colorHex}
                        shouldMountViewport={shouldMountViewport}
                        isActiveView={isActiveView}
                        lifecycle={effectiveLifecycle}
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
                                className="canvas-cell__remove-invalid-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                title="Remove invalid placement"
                            >
                                <X size={14} />
                                <span>Remove</span>
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
            ref={cellRef}
            className={classNames}
            data-row={row}
            data-col={col}
            data-content-type={contentType}
            data-render-mode={renderMode}
            data-drop-zone={activeDropZone}
            style={{
                '--cell-width': `${cellSize.width}px`,
                '--cell-height': `${cellSize.height}px`,
            }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onDoubleClick={onDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            // Use native title for tooltip in small modes - no React state needed
            title={uiConfig.showTooltipOnHover ? `${getDisplayName()}${rowSpan > 1 || colSpan > 1 ? ` (${colSpan}×${rowSpan})` : ''}` : undefined}
        >
            {/* Drop Zone Overlay - Shows visual feedback during drag */}
            {isDragOver && (
                <DropZoneOverlay zone={activeDropZone} isEmpty={isEmpty} />
            )}

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
        </div>
    );
});

// =============================================================================
// DROP ZONE OVERLAY - Visual feedback during drag
// =============================================================================

function DropZoneOverlay({ zone, isEmpty }) {
    const getZoneConfig = () => {
        switch (zone) {
            case DROP_ZONES.PLACE:
                return {
                    className: 'drop-zone--place',
                    icon: Plus,
                    label: 'Place Here',
                };
            case DROP_ZONES.SWAP:
                return {
                    className: 'drop-zone--swap',
                    icon: ArrowLeftRight,
                    label: 'Swap',
                };
            case DROP_ZONES.PUSH_UP:
                return {
                    className: 'drop-zone--push drop-zone--push-up',
                    icon: ArrowUp,
                    label: 'Push Up',
                };
            case DROP_ZONES.PUSH_DOWN:
                return {
                    className: 'drop-zone--push drop-zone--push-down',
                    icon: ArrowDown,
                    label: 'Push Down',
                };
            case DROP_ZONES.PUSH_LEFT:
                return {
                    className: 'drop-zone--push drop-zone--push-left',
                    icon: ArrowLeft,
                    label: 'Push Left',
                };
            case DROP_ZONES.PUSH_RIGHT:
                return {
                    className: 'drop-zone--push drop-zone--push-right',
                    icon: ArrowRight,
                    label: 'Push Right',
                };
            default:
                return null;
        }
    };

    const config = getZoneConfig();
    if (!config) return null;

    const Icon = config.icon;

    return (
        <div className={`canvas-cell__drop-zone ${config.className}`}>
            <div className="drop-zone__content">
                <Icon size={20} />
                <span className="drop-zone__label">{config.label}</span>
            </div>
        </div>
    );
}

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
// MINI HEADER - For thumbnail/snapshot modes
// =============================================================================

function MiniHeader({ name, color, onClose, onOpenMenu, viewId }) {
    // Use CSS :hover for name reveal - no React state needed
    return (
        <div className="canvas-cell__mini-header">
            <div
                className="canvas-cell__mini-header-dot"
                style={{ backgroundColor: color || '#60a5fa' }}
            />
            {/* Name revealed via CSS :hover on parent - always rendered but hidden */}
            <div className="canvas-cell__mini-header-name">{name || 'View'}</div>
            <div style={{ flex: 1 }} />
            <button
                className="canvas-cell__mini-header-btn"
                onClick={(e) => { e.stopPropagation(); onOpenMenu?.(e); }}
                title="Options"
            >
                <MoreVertical size={12} />
            </button>
            <button
                className="canvas-cell__mini-header-btn canvas-cell__mini-header-close"
                onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                title="Remove from canvas"
            >
                <X size={12} />
            </button>
        </div>
    );
}

// =============================================================================
// COLD VIEW HEADER - Mimics InstanceViewport header for unmounted views
// =============================================================================
// This header gives the illusion of a fully rendered view even when the
// InstanceViewport isn't mounted. It matches the styling of the real header.

function ColdViewHeader({ name, color, onClose }) {
    const colorHex = color || '#60a5fa';
    // Convert hex to RGB for CSS variable
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
            : '96, 165, 250';
    };
    const colorRgb = hexToRgb(colorHex);

    return (
        <div
            className="instance-viewport__header instance-viewport__header--cold"
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
        >
            {/* Left section - Wrench + Label (wrench is decorative for cold views) */}
            <div className="instance-viewport__header-left">
                <button
                    className="instance-viewport__header-button instance-viewport__header-wrench"
                    title="Instance Tools (click to activate view)"
                    disabled
                >
                    <Wrench size={12} />
                </button>

                {/* Instance Label Badge */}
                <div
                    className="instance-viewport__label"
                    style={{
                        '--instance-color': colorHex,
                        '--instance-color-rgb': colorRgb,
                    }}
                >
                    <div className="instance-viewport__label-dot" />
                    <span className="instance-viewport__label-text">
                        {name || 'View'}
                    </span>
                </div>
            </div>

            {/* Right Controls - minimal for cold views */}
            <div className="instance-viewport__header-controls">
                {/* More Menu Button - decorative */}
                <button
                    className="instance-viewport__header-button"
                    title="More options (click to activate view)"
                    disabled
                >
                    <MoreHorizontal size={12} />
                </button>

                {/* Close button - functional */}
                {onClose && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="instance-viewport__header-button"
                        title="Close (view stays in Datasets list)"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// VIEW CONTENT
// =============================================================================

function ViewContent({
    viewId,
    rowSpan,
    colSpan,
    placementId,
    renderMode,
    uiConfig,
    onClose,
    onOpenMenu,
    viewName,
    viewColor,
    shouldMountViewport = true,
    isActiveView = false,
    lifecycle = 'live', // 'live' | 'paused' | 'cold'
}) {
    const [isReady, setIsReady] = useState(false);

    // Determine if we should show thumbnail overlay vs live render
    // Show thumbnail when in thumbnail/snapshot mode AND viewport is not mounted
    const isThumbnailMode =
        uiConfig.renderContent === 'thumbnail' ||
        uiConfig.renderContent === 'snapshot';

    // Show thumbnail overlay unless viewport is mounted AND ready AND live
    // Paused viewports should also show the thumbnail overlay to hide the frozen frame
    const showThumbnailOverlay = isThumbnailMode && !(shouldMountViewport && isReady && lifecycle === 'live');

    // CSS class for crossfade transition when becoming active
    const viewportTransitionClass = isActiveView && isThumbnailMode ? 'canvas-cell__instance-container--activating' : '';

    return (
        <div className="canvas-cell__view-content">
            {/* Mini header for small modes (THUMBNAIL/SNAPSHOT) when viewport is mounted */}
            {uiConfig.showMiniHeader && shouldMountViewport && (
                <MiniHeader
                    name={viewName}
                    color={viewColor}
                    onClose={onClose}
                    onOpenMenu={onOpenMenu}
                    viewId={viewId}
                />
            )}

            {/* Cold view header - shows real header appearance for unmounted viewports */}
            {/* This gives the illusion of a fully rendered view */}
            {isThumbnailMode && !shouldMountViewport && (
                <ColdViewHeader
                    name={viewName}
                    color={viewColor}
                    onClose={onClose}
                />
            )}

            {/* Thumbnail overlay - shows OVER the instance when not active */}
            {/* Fades out when viewport becomes ready and is live */}
            {isThumbnailMode && (
                <div
                    className={`canvas-cell__thumbnail-overlay ${showThumbnailOverlay ? '' : 'canvas-cell__thumbnail-overlay--hidden'}`}
                >
                    <Thumbnail
                        viewId={viewId}
                        size="fill"
                        instanceType="vtk"
                        fallback={
                            <div className="canvas-cell__thumbnail-placeholder">
                                <Box size={uiConfig.renderContent === 'snapshot' ? 16 : 24} />
                            </div>
                        }
                    />
                </div>
            )}

            {/* Mount InstanceViewport when:
                - FULL/COMPACT mode (always render live), OR
                - THUMBNAIL/SNAPSHOT mode AND (active view OR warm-cached)

                Lifecycle states:
                - 'live': Interactive, renders on demand
                - 'paused': Mounted but frozen (no events, no render loop)
                - 'cold': Not mounted at all (thumbnail only)

                This reduces GPU load from N instances to 1 live + 3 paused max */}
            {shouldMountViewport && (
                <div
                    className={`canvas-cell__instance-container ${viewportTransitionClass}`}
                    style={{
                        pointerEvents: showThumbnailOverlay ? 'none' : 'auto',
                    }}
                >
                    <ProgressiveLoader viewId={viewId} isReady={isReady}>
                        <InstanceViewport
                            viewConfigId={viewId}
                            isRemote={false}
                            currentSpan={`${colSpan}x${rowSpan}`}
                            uiMode={renderMode === RENDER_MODES.COMPACT ? 'compact' : 'full'}
                            onReady={() => setIsReady(true)}
                            onClose={onClose}
                            lifecycle={lifecycle}
                        />
                    </ProgressiveLoader>
                </div>
            )}
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