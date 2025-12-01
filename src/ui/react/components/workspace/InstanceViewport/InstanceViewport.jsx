// src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from 'react-dom';
import {
    ChevronDown, Maximize2, Minimize2, Trash2, AlertCircle, ZoomIn, ZoomOut,
    RotateCcw, Move, LayoutGrid, Wrench, MoreHorizontal, Settings,
    Glasses, Box, BarChart3, Layers, MousePointer2, Scan, Minus, Plus,
    Pencil, Eye, Palette, Users, Undo2, Redo2, Copy, X
} from 'lucide-react';

import { instance as log } from "@Utils/logger.js";
import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { SliderMenuOption } from '@UI/react/components/workspace/Sliders/SliderMenuOption';
import { CameraViewGridPicker } from '@UI/react/components/workspace/Pickers/CameraViewGridPicker';
import { SliderWithPresets } from '@UI/react/components/workspace/Sliders/SliderWithPresets';
import { ColorSwatchGrid } from '@UI/react/components/workspace/Pickers/ColorSwatchGrid';
import { PositionGridPicker } from '@UI/react/components/workspace/Pickers/PositionGridPicker';

import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";

import { useInstanceSize, getConstraintMessage } from './useInstanceSize';
import { TOOL_GROUPS, GLOBAL_TOOLS, HISTORY_TOOLS, NAV_TOOLS, CORNER_TOOLS, GEAR_DROPDOWN_ITEMS, getTierConfig } from './ToolbarTiers';

import "./InstanceViewport.scss";

// ============================================================================
// INSTANCE TYPE ICONS
// ============================================================================

const INSTANCE_TYPE_ICONS = {
    vtk: Box,
    chart: BarChart3,
    plot: BarChart3,
    image: Layers,
    default: Box,
};

const getInstanceTypeIcon = (type) => {
    return INSTANCE_TYPE_ICONS[type] || INSTANCE_TYPE_ICONS.default;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * TopToolbar - Overlay toolbar at top of content area
 * Slides down on hover, contains tiered tool display
 */
function TopToolbar({
    tools,
    uiMode,
    visible,
    pinned,
    onTogglePin,
    openMenuId,
    setOpenMenuId,
    dropdownPosition,
    menuButtonRefs,
    onShowToolbar,
    onHideToolbar,
    renderTool,
    onOpenInstanceTools,
}) {
    const tierConfig = getTierConfig(uiMode);

    return (
        <div
            className={`instance-viewport__toolbar-overlay ${visible || pinned ? 'instance-viewport__toolbar-overlay--visible' : ''} ${pinned ? 'instance-viewport__toolbar-overlay--pinned' : ''}`}
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
            <div className="instance-toolbar">
                {/* Tool Groups */}
                <div className="instance-toolbar__groups">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>

                {/* History Tools (Undo/Redo) */}
                {tierConfig.showHistoryButtons && (
                    <div className="instance-toolbar__history">
                        <div className="instance-toolbar__separator" />
                        <button
                            className="instance-toolbar__tool-button"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            className="instance-toolbar__tool-button"
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>
                )}

                {/* Global Tools - Always visible */}
                <div className="instance-toolbar__global-tools">
                    <div className="instance-toolbar__separator" />
                    <button
                        className="instance-toolbar__tool-button instance-toolbar__tool-button--primary"
                        onClick={onOpenInstanceTools}
                        title="Instance Tools (I)"
                    >
                        <Wrench size={16} />
                    </button>
                    <button
                        className="instance-toolbar__tool-button"
                        title="More options"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </div>

                {/* Pin Button */}
                <button
                    className={`instance-toolbar__pin-button ${pinned ? 'active' : ''}`}
                    onClick={onTogglePin}
                    title={pinned ? 'Unpin toolbar' : 'Pin toolbar'}
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v8M12 18v4M5 12h14" />
                        {pinned && <circle cx="12" cy="12" r="3" fill="currentColor" />}
                    </svg>
                </button>
            </div>
        </div>
    );
}

/**
 * BottomNavBar - Navigation bar at bottom of content area
 * Slides up on focus/click, contains zoom and navigation controls
 */
function BottomNavBar({
    visible,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onZoomChange,
    onFit,
    onOneToOne,
    onResetView,
    navMode,
    onNavModeChange,
}) {
    return (
        <div className={`instance-viewport__navbar-overlay ${visible ? 'instance-viewport__navbar-overlay--visible' : ''}`}>
            <div className="instance-navbar">
                {/* Navigation Mode Buttons */}
                <div className="instance-navbar__nav-buttons">
                    <button
                        className={`instance-navbar__nav-button ${navMode === 'pan' ? 'active' : ''}`}
                        onClick={() => onNavModeChange('pan')}
                        title="Pan"
                    >
                        <Move size={16} />
                    </button>
                    <button
                        className={`instance-navbar__nav-button ${navMode === 'zoom' ? 'active' : ''}`}
                        onClick={() => onNavModeChange('zoom')}
                        title="Zoom"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        className={`instance-navbar__nav-button ${navMode === 'rotate' ? 'active' : ''}`}
                        onClick={() => onNavModeChange('rotate')}
                        title="Rotate"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                {/* Zoom Display with +/- */}
                <div className="instance-navbar__zoom-display">
                    <button
                        className="instance-navbar__zoom-button"
                        onClick={() => onZoomChange(zoomLevel - 10)}
                        title="Zoom out 10%"
                    >
                        <Minus size={12} />
                    </button>
                    <span className="instance-navbar__zoom-value">{zoomLevel}%</span>
                    <button
                        className="instance-navbar__zoom-button"
                        onClick={() => onZoomChange(zoomLevel + 10)}
                        title="Zoom in 10%"
                    >
                        <Plus size={12} />
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="instance-navbar__quick-actions">
                    <button
                        className="instance-navbar__action-button"
                        onClick={onOneToOne}
                        title="1:1 Scale"
                    >
                        1:1
                    </button>
                    <button
                        className="instance-navbar__action-button"
                        onClick={onFit}
                        title="Fit to view"
                    >
                        <Scan size={14} />
                        Fit
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * CornerControls - Fallback controls for small viewports
 * Shows three buttons in top-right corner
 */
function CornerControls({
    onOpenInstanceTools,
    onVRMode,
    onSettings,
    constraintMessage,
}) {
    return (
        <div className="instance-viewport__corner-controls">
            <button
                className="instance-viewport__corner-button"
                onClick={onOpenInstanceTools}
                title="Instance Tools"
            >
                <Wrench size={16} />
            </button>
            <button
                className="instance-viewport__corner-button"
                onClick={onVRMode}
                title="VR Mode"
            >
                <Glasses size={16} />
            </button>
            <button
                className="instance-viewport__corner-button"
                onClick={onSettings}
                title="Settings"
            >
                <Settings size={16} />
            </button>
        </div>
    );
}

/**
 * GearOnlyDropdown - Minimal controls for super tiny viewports
 * Single gear button with dropdown
 */
function GearOnlyDropdown({
    open,
    onToggle,
    onOpenInstanceTools,
    onVRMode,
    onMaximize,
    onDuplicate,
    onClose,
}) {
    return (
        <div className="instance-viewport__gear-dropdown">
            <button
                className={`instance-viewport__gear-button ${open ? 'active' : ''}`}
                onClick={onToggle}
                title="Options"
            >
                <Settings size={16} />
            </button>
            {open && (
                <div className="instance-viewport__gear-menu">
                    <button
                        className="instance-viewport__gear-item instance-viewport__gear-item--primary"
                        onClick={onOpenInstanceTools}
                    >
                        <Wrench size={14} />
                        Instance Tools
                    </button>
                    <button className="instance-viewport__gear-item" onClick={onVRMode}>
                        <Glasses size={14} />
                        VR Mode
                    </button>
                    <button className="instance-viewport__gear-item" onClick={onMaximize}>
                        <Maximize2 size={14} />
                        Maximize
                    </button>
                    <button className="instance-viewport__gear-item" onClick={onDuplicate}>
                        <Copy size={14} />
                        Duplicate
                    </button>
                    <div className="instance-viewport__gear-separator" />
                    <button className="instance-viewport__gear-item instance-viewport__gear-item--danger" onClick={onClose}>
                        <X size={14} />
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * TooSmallNotice - Subtle banner for undersized viewports
 */
function TooSmallNotice({ constraintMessage, onOpenTools }) {
    if (!constraintMessage) return null;

    return (
        <div className="instance-viewport__size-notice">
            <span className="instance-viewport__size-notice-text">
                {constraintMessage}
            </span>
            <button
                className="instance-viewport__size-notice-button"
                onClick={onOpenTools}
            >
                Tools
            </button>
        </div>
    );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to RGB string for rgba() usage in CSS
 */
const hexToRgb = (hex) => {
    if (!hex) return '255, 255, 255';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '255, 255, 255';
};

/**
 * HeaderBar - Blended dark header with instance label badge
 */
function HeaderBar({
    displayName,
    instanceType,
    instanceColor,
    isFullscreen,
    onFullscreen,
    onDelete,
    onChangeSpan,
    currentSpan,
    showSpanPicker,
    setShowSpanPicker,
    spanPickerRef,
    onShowToolbar,
    onHideToolbar,
}) {
    const TypeIcon = getInstanceTypeIcon(instanceType);
    const colorHex = instanceColor?.hex || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);

    return (
        <div
            className="instance-viewport__header"
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
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
                    {displayName}
                </span>
            </div>

            {/* Right Controls */}
            <div className="instance-viewport__header-controls">
                {/* Instance Type Icon */}
                {instanceType && (
                    <div
                        className="instance-viewport__type-icon"
                        title={`Type: ${instanceType}`}
                    >
                        <TypeIcon size={12} />
                    </div>
                )}

                {/* Span size picker */}
                {onChangeSpan && (
                    <div className="span-picker-wrapper" ref={spanPickerRef}>
                        <button
                            onClick={() => setShowSpanPicker(!showSpanPicker)}
                            className={`instance-viewport__header-button ${showSpanPicker ? 'active' : ''}`}
                            title={`Window size: ${currentSpan}`}
                        >
                            <LayoutGrid size={12} />
                        </button>
                        {showSpanPicker && (
                            <div className="span-picker-dropdown">
                                <div className="span-picker-grid">
                                    {[
                                        { id: '1x1', label: '1x1', cols: 1, rows: 1 },
                                        { id: '2x1', label: '2x1', cols: 2, rows: 1 },
                                        { id: '1x2', label: '1x2', cols: 1, rows: 2 },
                                        { id: '2x2', label: '2x2', cols: 2, rows: 2 },
                                    ].map((size) => (
                                        <button
                                            key={size.id}
                                            className={`span-picker-option ${currentSpan === size.id ? 'active' : ''}`}
                                            onClick={() => {
                                                onChangeSpan(size.id);
                                                setShowSpanPicker(false);
                                            }}
                                            title={size.label}
                                        >
                                            <div className="span-preview" style={{
                                                gridTemplateColumns: `repeat(2, 1fr)`,
                                                gridTemplateRows: `repeat(2, 1fr)`
                                            }}>
                                                <div className={`span-cell active`} style={{
                                                    gridColumn: `span ${size.cols}`,
                                                    gridRow: `span ${size.rows}`
                                                }} />
                                                {size.id !== '2x2' && <div className="span-cell" />}
                                                {size.id === '1x1' && (
                                                    <>
                                                        <div className="span-cell" />
                                                        <div className="span-cell" />
                                                    </>
                                                )}
                                                {size.id === '2x1' && <div className="span-cell" style={{ gridColumn: 'span 2' }} />}
                                                {size.id === '1x2' && <div className="span-cell" />}
                                            </div>
                                            <span className="span-label">{size.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Settings button */}
                <button
                    className="instance-viewport__header-button"
                    title="Settings"
                >
                    <Settings size={12} />
                </button>

                {/* Fullscreen toggle */}
                <button
                    onClick={onFullscreen}
                    className="instance-viewport__header-button"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>

                {/* Delete button */}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="instance-viewport__header-button instance-viewport__header-button--danger"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceViewport
 *
 * A viewport component that displays a ViewConfiguration using a handler.
 * Features overlay toolbars with size constraints and graceful degradation.
 */
export function InstanceViewport({
    viewConfigId = null,
    isRemote = false,
    remoteInstanceId = null,
    ownerUserName = null,
    onDelete,
    onChangeSpan,
    currentSpan = '1x1'
}) {
    // =========================================================================
    // REFS
    // =========================================================================

    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const initOnce = useRef(false);
    const instanceIdRef = useRef(null);
    const menuButtonRefs = useRef(new Map());
    const toolbarHideTimeout = useRef(null);
    const spanPickerRef = useRef(null);

    // =========================================================================
    // STATE
    // =========================================================================

    const [actualInstanceId, setActualInstanceId] = useState(
        isRemote ? remoteInstanceId : null
    );
    const [initialized, setInitialized] = useState(false);
    const [instanceType, setInstanceType] = useState(null);
    const [instanceColor, setInstanceColor] = useState(null);
    const [hasData, setHasData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

    // Toolbar visibility state
    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [toolbarPinned, setToolbarPinned] = useState(false);

    // Bottom nav bar state
    const [navbarVisible, setNavbarVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Zoom and navigation state
    const [zoomLevel, setZoomLevel] = useState(100);
    const [navMode, setNavMode] = useState('orbit');

    // Span picker state
    const [showSpanPicker, setShowSpanPicker] = useState(false);

    // Gear dropdown state (for gear-only mode)
    const [gearDropdownOpen, setGearDropdownOpen] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // =========================================================================
    // SIZE TRACKING
    // =========================================================================

    const {
        width,
        height,
        uiMode,
        constraintReason,
        constraintMessage,
        isConstrained,
        showFullToolbars
    } = useInstanceSize(viewportRef);

    // =========================================================================
    // DROPDOWN POSITIONING & CLICK AWAY
    // =========================================================================

    useEffect(() => {
        if (!openMenuId) return;

        const updatePosition = () => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            if (!buttonElement) return;

            const rect = buttonElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const toolbar = buttonElement.closest('.instance-toolbar');
            const toolbarRect = toolbar?.getBoundingClientRect();

            const dropdownWidth = 260;
            const dropdownHeight = 240;

            let x, y;

            // Try positioning to the LEFT of the toolbar
            x = rect.left - dropdownWidth - 12;
            y = toolbarRect ? toolbarRect.top : rect.top;

            // If no room on left, try RIGHT side
            if (x < 10) {
                x = rect.right + 12;
            }

            // If STILL no room, position BELOW toolbar
            if (x + dropdownWidth > viewportWidth - 10) {
                x = rect.left;
                y = rect.bottom + 8;
            }

            // Ensure dropdown stays within viewport vertically
            if (y < 10) y = 10;
            if (y + dropdownHeight > viewportHeight - 10) {
                y = viewportHeight - dropdownHeight - 10;
            }

            setDropdownPosition({ x, y, buttonWidth: rect.width });
        };

        updatePosition();

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        const handleClickAway = (e) => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

            if (
                buttonElement?.contains(e.target) ||
                dropdownElement?.contains(e.target)
            ) {
                return;
            }

            setOpenMenuId(null);
        };

        document.addEventListener('mousedown', handleClickAway, true);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('mousedown', handleClickAway, true);
        };
    }, [openMenuId]);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // =========================================================================

    useEffect(() => {
        if (initOnce.current || !containerRef.current) return;

        initOnce.current = true;

        const initialize = async () => {
            try {
                setLoading(true);
                log.debug(`Creating typeless instance (view: ${viewConfigId || 'none'})`);

                const instanceId = await workspaceManager.createInstance(
                    containerRef.current,
                    null,
                    { viewConfigId: viewConfigId }
                );

                instanceIdRef.current = instanceId;
                setActualInstanceId(instanceId);
                setInitialized(true);
                setActiveInstance(instanceId);

                // Get the assigned color
                const color = workspaceManager.getInstanceColor(instanceId);
                setInstanceColor(color);

                if (viewConfigId) {
                    viewConfigurationManager.activateView(viewConfigId);
                }

                const instanceHeader = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(instanceHeader);

                log.info(`Typeless instance ${instanceId} created with color ${color?.name}`);

            } catch (err) {
                log.error(`Instance initialization failed:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initialize();

        return () => {
            if (instanceIdRef.current) {
                log.debug(`Cleaning up instance ${instanceIdRef.current}`);
                workspaceManager.deleteInstance(instanceIdRef.current);
            }

            if (viewConfigId) {
                viewConfigurationManager.deactivateView(viewConfigId);
            }
        };
    }, [viewConfigId]);

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !viewConfigId) return;

        const loadViewData = async () => {
            try {
                log.debug(`Loading view ${viewConfigId} into instance ${actualInstanceId}`);

                const viewConfig = viewConfigurationManager.getView(viewConfigId);
                if (!viewConfig) {
                    log.warn(`View ${viewConfigId} not found`);
                    return;
                }

                if (viewConfig.datasetId) {
                    await workspaceManager.loadDataIntoInstance(
                        actualInstanceId,
                        viewConfig.datasetId
                    );

                    const instance = workspaceManager.getInstance(actualInstanceId);
                    setInstanceType(instance.type);
                    setHasData(true);

                    log.info(`Instance ${actualInstanceId} is now type: ${instance.type}`);
                }

            } catch (err) {
                log.error(`Failed to load view data:`, err);
                setError(err.message);
            }
        };

        loadViewData();
    }, [initialized, actualInstanceId, viewConfigId]);

    // =========================================================================
    // TOOLS LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !instanceType) return;

        const loadTools = () => {
            try {
                const toolsList = workspaceManager.getInstanceTools(actualInstanceId);
                log.debug(`Loaded ${toolsList.length} tools for ${instanceType} instance`);
                setTools(toolsList);

                const updatedHeader = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(updatedHeader);
            } catch (err) {
                log.warn(`Failed to load tools:`, err);
            }
        };

        loadTools();

        const handleToolsUpdate = (event) => {
            if (event.detail?.instanceId === actualInstanceId) {
                log.debug(`Tools updated for ${actualInstanceId}, refreshing toolbar`);
                const updatedTools = workspaceManager.getInstanceTools(actualInstanceId);
                setTools(updatedTools);
            }
        };

        window.addEventListener('cia:tools-updated', handleToolsUpdate);
        return () => window.removeEventListener('cia:tools-updated', handleToolsUpdate);
    }, [actualInstanceId, initialized, instanceType]);

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    const getDisplayName = () => {
        if (isRemote && ownerUserName) {
            if (viewConfigId) {
                try {
                    const view = viewConfigurationManager.getView(viewConfigId);
                    if (view) {
                        const dataset = datasetManager.getDataset(view.datasetId);
                        const filename = dataset?.filename || 'Unknown';
                        return `${ownerUserName}'s view of ${filename}`;
                    }
                } catch (e) {
                    return `${ownerUserName}'s view`;
                }
            }
            return `${ownerUserName}'s view`;
        }

        if (viewConfigId) {
            try {
                const view = viewConfigurationManager.getView(viewConfigId);
                if (view) {
                    const dataset = datasetManager.getDataset(view.datasetId);
                    return dataset?.filename || view.name || 'View';
                }
            } catch (e) {
                return `View ${viewConfigId.slice(0, 8)}`;
            }
        }

        return `Instance ${actualInstanceId ? actualInstanceId.slice(0, 12) : 'Loading'}...`;
    };

    const handleFullscreen = useCallback(() => {
        if (!viewportRef.current) return;

        if (document.fullscreenElement === viewportRef.current) {
            // Exit fullscreen
            document.exitFullscreen?.();
        } else {
            // Enter fullscreen
            viewportRef.current.requestFullscreen?.();
        }
    }, []);

    // Listen for fullscreen changes (e.g., user presses Esc)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === viewportRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // =========================================================================
    // TOOLBAR VISIBILITY
    // =========================================================================

    const showToolbar = useCallback(() => {
        if (toolbarHideTimeout.current) {
            clearTimeout(toolbarHideTimeout.current);
            toolbarHideTimeout.current = null;
        }
        setToolbarVisible(true);
    }, []);

    const hideToolbar = useCallback(() => {
        if (toolbarPinned || openMenuId) return;

        toolbarHideTimeout.current = setTimeout(() => {
            setToolbarVisible(false);
        }, 800);
    }, [toolbarPinned, openMenuId]);

    const toggleToolbarPin = useCallback(() => {
        setToolbarPinned(prev => !prev);
    }, []);

    // Keep toolbar visible when menu is open
    useEffect(() => {
        if (openMenuId) {
            showToolbar();
        }
    }, [openMenuId, showToolbar]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (toolbarHideTimeout.current) {
                clearTimeout(toolbarHideTimeout.current);
            }
        };
    }, []);

    // =========================================================================
    // NAVBAR VISIBILITY (focus-based)
    // =========================================================================

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        setNavbarVisible(true);
        if (actualInstanceId) {
            setActiveInstance(actualInstanceId);
        }
    }, [actualInstanceId]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // Delay hiding navbar to allow for interaction
        setTimeout(() => {
            setNavbarVisible(false);
        }, 300);
    }, []);

    // =========================================================================
    // ZOOM CONTROLS
    // =========================================================================

    const handleZoomChange = useCallback((newZoom) => {
        const clampedZoom = Math.max(10, Math.min(500, newZoom));
        setZoomLevel(clampedZoom);
        // TODO: Apply zoom to actual view
    }, []);

    const handleZoomIn = useCallback(() => {
        handleZoomChange(zoomLevel + 10);
    }, [zoomLevel, handleZoomChange]);

    const handleZoomOut = useCallback(() => {
        handleZoomChange(zoomLevel - 10);
    }, [zoomLevel, handleZoomChange]);

    const handleFit = useCallback(() => {
        setZoomLevel(100);
        // TODO: Fit view to content
    }, []);

    const handleOneToOne = useCallback(() => {
        setZoomLevel(100);
        // TODO: Set 1:1 scale
    }, []);

    const handleResetView = useCallback(() => {
        setZoomLevel(100);
        setNavMode('orbit');
        // TODO: Reset camera
    }, []);

    // =========================================================================
    // INSTANCE TOOLS PANEL
    // =========================================================================

    const handleOpenInstanceTools = useCallback(() => {
        // TODO: Emit event to open Instance Tools panel in left sidebar
        window.dispatchEvent(new CustomEvent('cia:open-instance-tools', {
            detail: { instanceId: actualInstanceId }
        }));
    }, [actualInstanceId]);

    // =========================================================================
    // SPAN PICKER CLICK OUTSIDE
    // =========================================================================

    useEffect(() => {
        if (!showSpanPicker) return;

        const handleClickOutside = (e) => {
            if (spanPickerRef.current && !spanPickerRef.current.contains(e.target)) {
                setShowSpanPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSpanPicker]);

    // =========================================================================
    // GEAR DROPDOWN CLICK OUTSIDE
    // =========================================================================

    useEffect(() => {
        if (!gearDropdownOpen) return;

        const handleClickOutside = (e) => {
            const gearDropdown = document.querySelector('.instance-viewport__gear-dropdown');
            if (gearDropdown && !gearDropdown.contains(e.target)) {
                setGearDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [gearDropdownOpen]);

    // =========================================================================
    // TOOL RENDERING
    // =========================================================================

    const renderMenuOption = (option, optIndex, menuId) => {
        if (option.type === 'separator') {
            return (
                <div
                    key={`menu-sep-${menuId}-${optIndex}`}
                    className="menu-separator"
                />
            );
        }

        if (option.type === 'header') {
            return (
                <div
                    key={option.id || `header-${menuId}-${optIndex}`}
                    className="menu-header"
                >
                    {option.label}
                </div>
            );
        }

        if (option.type === 'camera-grid') {
            return (
                <CameraViewGridPicker
                    key={option.id}
                    views={option.views}
                    disabled={option.disabled}
                    onViewChange={option.onViewSelect}
                />
            );
        }

        if (option.type === 'position-grid') {
            return (
                <PositionGridPicker
                    key={option.id}
                    positions={option.positions}
                    currentPosition={option.currentPosition}
                    disabled={option.disabled}
                    onPositionChange={option.onPositionChange}
                />
            );
        }

        if (option.type === 'color-swatch-grid') {
            return (
                <ColorSwatchGrid
                    key={option.id}
                    colormaps={option.colormaps}
                    currentColormap={option.currentColormap}
                    disabled={option.disabled}
                    onColormapChange={option.onColormapChange}
                />
            );
        }

        if (option.type === 'slider-with-presets') {
            const IconComponent = getToolIcon(option.icon);

            return (
                <SliderWithPresets
                    key={option.id}
                    icon={IconComponent ? <IconComponent size={14} /> : null}
                    label={option.label}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    value={option.value}
                    presets={option.presets}
                    unit={option.unit}
                    disabled={option.disabled}
                    onChange={option.onChange}
                />
            );
        }

        if (option.type === 'slider') {
            return (
                <SliderMenuOption
                    key={option.id}
                    label={option.label}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    value={option.value}
                    unit={option.unit}
                    disabled={option.disabled}
                    onChange={option.onChange}
                />
            );
        }

        const OptionIcon = getToolIcon(option.id, option.icon);

        return (
            <button
                key={option.id || `option-${menuId}-${optIndex}`}
                onClick={option.onClick}
                className={`menu-option ${option.active ? 'active' : ''}`}
                disabled={option.disabled}
                aria-label={option.label}
            >
                <OptionIcon size={14} className="option-icon" />
                <div className="option-text">
                    <span className="option-label">{option.label}</span>
                    {option.description && (
                        <span className="option-description">
                            {option.description}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    const renderTool = (tool, index) => {
        if (tool.type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}
                    className="instance-toolbar__separator"
                />
            );
        }

        const IconComponent = getToolIcon(tool.id, tool.icon);
        const isOpen = openMenuId === tool.id;

        if (tool.type === 'menu') {
            return (
                <div
                    key={tool.id || `menu-${index}`}
                    className="toolbar-menu"
                    onMouseEnter={() => setOpenMenuId(tool.id)}
                    onMouseLeave={(e) => {
                        const relatedTarget = e.relatedTarget;
                        const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

                        if (!dropdownElement || !dropdownElement.contains(relatedTarget)) {
                            setTimeout(() => {
                                const stillHoveringDropdown = document.querySelector('.toolbar-menu-dropdown--portal:hover');
                                if (!stillHoveringDropdown) {
                                    setOpenMenuId(null);
                                }
                            }, 100);
                        }
                    }}
                >
                    <button
                        ref={(el) => {
                            if (el) menuButtonRefs.current.set(tool.id, el);
                        }}
                        className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                        <ChevronDown size={8} className="instance-toolbar__menu-indicator" />

                        <div className="instance-toolbar__tooltip">
                            <div className="tooltip-title">{tool.label}</div>
                            {tool.description && (
                                <div className="tooltip-desc">{tool.description}</div>
                            )}
                            {tool.shortcut && (
                                <div className="tooltip-shortcut">{tool.shortcut}</div>
                            )}
                        </div>
                    </button>

                    {isOpen && tool.options && tool.options.length > 0 && createPortal(
                        <div
                            className="toolbar-menu-dropdown toolbar-menu-dropdown--portal"
                            style={{
                                position: 'fixed',
                                left: `${dropdownPosition.x}px`,
                                top: `${dropdownPosition.y}px`,
                                minWidth: '220px',
                            }}
                            onMouseEnter={() => setOpenMenuId(tool.id)}
                            onMouseLeave={() => {
                                setTimeout(() => {
                                    const hoveringButton = menuButtonRefs.current.get(tool.id)?.matches(':hover');
                                    if (!hoveringButton) {
                                        setOpenMenuId(null);
                                    }
                                }, 100);
                            }}
                        >
                            {tool.options.map((option, optIndex) =>
                                renderMenuOption(option, optIndex, tool.id)
                            )}
                        </div>,
                        document.body
                    )}
                </div>
            );
        }

        return (
            <button
                key={tool.id || `tool-${index}`}
                onClick={tool.onClick}
                className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
                disabled={tool.disabled}
                aria-label={tool.label}
            >
                {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                <div className="instance-toolbar__tooltip">
                    <div className="tooltip-title">{tool.label}</div>
                    {tool.description && (
                        <div className="tooltip-desc">{tool.description}</div>
                    )}
                    {tool.shortcut && (
                        <div className="tooltip-shortcut">{tool.shortcut}</div>
                    )}
                </div>
            </button>
        );
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    const displayName = getDisplayName();
    const colorHex = instanceColor?.hex || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);

    return (
        <div
            ref={viewportRef}
            className={`instance-viewport instance-viewport--${uiMode} ${isFocused ? 'instance-viewport--active' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
            tabIndex={0}
            onFocus={handleFocus}
            onBlur={handleBlur}
        >
            {/* Header - ALWAYS visible so users can always close the instance */}
            <HeaderBar
                displayName={displayName}
                instanceType={instanceType}
                instanceColor={instanceColor}
                isFullscreen={isFullscreen}
                onFullscreen={handleFullscreen}
                onDelete={onDelete}
                onChangeSpan={onChangeSpan}
                currentSpan={currentSpan}
                showSpanPicker={showSpanPicker}
                setShowSpanPicker={setShowSpanPicker}
                spanPickerRef={spanPickerRef}
                onShowToolbar={showToolbar}
                onHideToolbar={hideToolbar}
            />

            {/* Top Toolbar - Overlay that slides down on hover */}
            {showFullToolbars && tools.length > 0 && (
                <TopToolbar
                    tools={tools}
                    uiMode={uiMode}
                    visible={toolbarVisible}
                    pinned={toolbarPinned}
                    onTogglePin={toggleToolbarPin}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    dropdownPosition={dropdownPosition}
                    menuButtonRefs={menuButtonRefs}
                    onShowToolbar={showToolbar}
                    onHideToolbar={hideToolbar}
                    renderTool={renderTool}
                    onOpenInstanceTools={handleOpenInstanceTools}
                />
            )}

            {/* Content Area */}
            <div
                ref={containerRef}
                className="instance-viewport__content"
                onMouseEnter={() => actualInstanceId && setActiveInstance(actualInstanceId)}
            >
                {loading && (
                    <div className="instance-viewport__loading">
                        Loading view...
                    </div>
                )}
                {error && (
                    <div className="instance-viewport__error">
                        <AlertCircle size={24} />
                        <div className="error-message">{error}</div>
                    </div>
                )}
            </div>

            {/* Bottom Nav Bar - Overlay that slides up on focus */}
            {showFullToolbars && hasData && (
                <BottomNavBar
                    visible={navbarVisible || isFocused}
                    zoomLevel={zoomLevel}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomChange={handleZoomChange}
                    onFit={handleFit}
                    onOneToOne={handleOneToOne}
                    onResetView={handleResetView}
                    navMode={navMode}
                    onNavModeChange={setNavMode}
                />
            )}

            {/* Corner Controls - For small viewports */}
            {uiMode === 'corner-controls' && (
                <>
                    <CornerControls
                        onOpenInstanceTools={handleOpenInstanceTools}
                        onVRMode={() => { }}
                        onSettings={() => { }}
                        constraintMessage={constraintMessage}
                    />
                    <TooSmallNotice
                        constraintMessage={constraintMessage}
                        onOpenTools={handleOpenInstanceTools}
                    />
                </>
            )}

            {/* Gear Only Dropdown - For super tiny viewports */}
            {uiMode === 'gear-only' && (
                <GearOnlyDropdown
                    open={gearDropdownOpen}
                    onToggle={() => setGearDropdownOpen(!gearDropdownOpen)}
                    onOpenInstanceTools={handleOpenInstanceTools}
                    onVRMode={() => { }}
                    onMaximize={handleFullscreen}
                    onDuplicate={() => { }}
                    onClose={onDelete}
                />
            )}
        </div>
    );
}