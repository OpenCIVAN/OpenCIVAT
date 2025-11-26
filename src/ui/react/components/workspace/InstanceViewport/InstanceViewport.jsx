// src/ui/react/components/workspace/InstanceViewport.jsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from 'react-dom';
import { ChevronDown, Maximize2, Trash2, AlertCircle, ZoomIn, ZoomOut, RotateCcw, Move, LayoutGrid } from 'lucide-react';

import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { SliderMenuOption } from '@UI/react/components/workspace/Sliders/SliderMenuOption';
import { CameraViewGridPicker } from '@UI/react/components/workspace/Pickers/CameraViewGridPicker';
import { SliderWithPresets } from '@UI/react/components/workspace/Sliders/SliderWithPresets';
import { ColorSwatchGrid } from '@UI/react/components/workspace/Pickers/ColorSwatchGrid';
import { PositionGridPicker } from '@UI/react/components/workspace/Pickers/PositionGridPicker';

import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";

import "./InstanceViewport.scss";

/**
 * InstanceViewport
 * 
 * A viewport component that displays a ViewConfiguration using a handler.
 * Instances start TYPELESS and determine their type when data is loaded.
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
    // STATE
    // =========================================================================

    const containerRef = useRef(null);
    const initOnce = useRef(false);
    const instanceIdRef = useRef(null); // Track instanceId for cleanup
    const menuButtonRefs = useRef(new Map()); // Track button positions for portal positioning
    const toolbarHideTimeout = useRef(null);

    const [actualInstanceId, setActualInstanceId] = useState(
        isRemote ? remoteInstanceId : null
    );
    const [initialized, setInitialized] = useState(false);
    const [instanceType, setInstanceType] = useState(null);
    const [hasData, setHasData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

    // Auto-hide toolbar state
    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [toolbarPinned, setToolbarPinned] = useState(false);

    // Status bar info
    const [statusInfo, setStatusInfo] = useState({
        zoomLevel: 100,
        cameraMode: 'orbit',
        dataPoints: null,
        dimensions: null
    });

    // Span picker state
    const [showSpanPicker, setShowSpanPicker] = useState(false);
    const spanPickerRef = useRef(null);

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

            // Get toolbar bounds to avoid overlap
            const toolbar = buttonElement.closest('.instance-viewport__toolbar');
            const toolbarRect = toolbar?.getBoundingClientRect();

            // Estimate dropdown size (will be adjusted by actual element)
            const dropdownWidth = 260;
            const dropdownHeight = 240;

            let x, y;

            // STRATEGY 1: Try positioning to the LEFT of the toolbar
            x = rect.left - dropdownWidth - 12; // 12px gap
            y = toolbarRect ? toolbarRect.top : rect.top;

            // If no room on left, try RIGHT side
            if (x < 10) {
                x = rect.right + 12;
            }

            // If STILL no room, position BELOW toolbar (fallback)
            if (x + dropdownWidth > viewportWidth - 10) {
                x = rect.left;
                y = rect.bottom + 8;
            }

            // Ensure dropdown stays within viewport vertically
            if (y < 10) {
                y = 10;
            }

            if (y + dropdownHeight > viewportHeight - 10) {
                y = viewportHeight - dropdownHeight - 10;
            }

            setDropdownPosition({ x, y, buttonWidth: rect.width });
        };

        updatePosition();

        // Update position on scroll or resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        // Click away handler - close dropdown when clicking outside
        const handleClickAway = (e) => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

            // Don't close if clicking the button or inside the dropdown
            if (
                buttonElement?.contains(e.target) ||
                dropdownElement?.contains(e.target)
            ) {
                return;
            }

            setOpenMenuId(null);
        };

        // Use capture phase to catch clicks before they bubble
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
                console.log(`🎨 Creating typeless instance (view: ${viewConfigId || 'none'})`);

                const instanceId = await workspaceManager.createInstance(
                    containerRef.current,
                    null,
                    { viewConfigId: viewConfigId }
                );

                // Store in ref for cleanup (avoids stale closure)
                instanceIdRef.current = instanceId;
                setActualInstanceId(instanceId);
                setInitialized(true);
                setActiveInstance(instanceId);

                // Activate the view to mark it as in use
                if (viewConfigId) {
                    viewConfigurationManager.activateView(viewConfigId);
                }

                const instanceHeader = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(instanceHeader);

                console.log(`✅ Typeless instance ${instanceId} created`);

            } catch (err) {
                console.error(`❌ Instance initialization failed:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initialize();

        return () => {
            // Use ref instead of state to get the correct instanceId
            if (instanceIdRef.current) {
                console.log(`🧹 Cleaning up instance ${instanceIdRef.current}`);
                workspaceManager.deleteInstance(instanceIdRef.current);
            }
        };
    }, [viewConfigId]); // Removed actualInstanceId - not needed, initOnce guards re-init

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !viewConfigId) return;

        const loadViewData = async () => {
            try {
                console.log(`📊 Loading view ${viewConfigId} into instance ${actualInstanceId}`);

                const viewConfig = viewConfigurationManager.getView(viewConfigId);
                if (!viewConfig) {
                    console.warn(`View ${viewConfigId} not found`);
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

                    console.log(`✅ Instance ${actualInstanceId} is now type: ${instance.type}`);
                }

            } catch (err) {
                console.error(`❌ Failed to load view data:`, err);
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
                console.log(`🔧 Loaded ${toolsList.length} tools for ${instanceType} instance`);
                setTools(toolsList);

                const updatedHeader = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(updatedHeader);
            } catch (err) {
                console.warn(`⚠️ Failed to load tools:`, err);
            }
        };

        loadTools();

        const handleToolsUpdate = (event) => {
            if (event.detail?.instanceId === actualInstanceId) {
                console.log(`🔄 Tools updated for ${actualInstanceId}, refreshing toolbar`);
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

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        }
    };

    // =========================================================================
    // TOOLBAR VISIBILITY (Auto-hide feature)
    // =========================================================================

    const showToolbar = useCallback(() => {
        if (toolbarHideTimeout.current) {
            clearTimeout(toolbarHideTimeout.current);
            toolbarHideTimeout.current = null;
        }
        setToolbarVisible(true);
    }, []);

    const hideToolbar = useCallback(() => {
        if (toolbarPinned || openMenuId) return; // Don't hide if pinned or menu open

        toolbarHideTimeout.current = setTimeout(() => {
            setToolbarVisible(false);
        }, 800); // Delay before hiding
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

    // Close span picker on click outside
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
    // STATUS BAR HELPERS
    // =========================================================================

    const getDataInfo = () => {
        if (!hasData || !viewConfigId) return null;

        try {
            const view = viewConfigurationManager.getView(viewConfigId);
            if (view?.datasetId) {
                const dataset = datasetManager.getDataset(view.datasetId);
                if (dataset) {
                    return {
                        points: dataset.pointCount || dataset.numPoints,
                        dimensions: dataset.dimensions,
                        type: dataset.type || instanceType
                    };
                }
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    const formatNumber = (num) => {
        if (!num) return '—';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    // =========================================================================
    // TOOLBAR RENDERING
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
                    className="toolbar-separator"
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
                        // Only close if not moving to the dropdown
                        const relatedTarget = e.relatedTarget;
                        const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

                        if (!dropdownElement || !dropdownElement.contains(relatedTarget)) {
                            // Small delay to allow mouse to reach dropdown
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
                        className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        {IconComponent && <IconComponent size={18} strokeWidth={2} />}
                        <ChevronDown size={8} className="menu-indicator" />

                        <div className="toolbar-tooltip">
                            <div className="tooltip-title">{tool.label}</div>
                            {tool.description && (
                                <div className="tooltip-desc">{tool.description}</div>
                            )}
                            {tool.shortcut && (
                                <div className="tooltip-shortcut">{tool.shortcut}</div>
                            )}
                        </div>
                    </button>

                    {/* RENDER DROPDOWN VIA PORTAL */}
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
                                // Close when mouse leaves dropdown
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
                className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                disabled={tool.disabled}
                aria-label={tool.label}
            >
                {IconComponent && <IconComponent size={18} strokeWidth={2} />}
                <div className="toolbar-tooltip">
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
    // MAIN RENDER - NO INLINE STYLES
    // =========================================================================

    const dataInfo = getDataInfo();

    return (
        <div className="instance-viewport">
            {/* Header with hover zone for auto-hide toolbar */}
            <div
                className="instance-viewport__header"
                onMouseEnter={showToolbar}
                onMouseLeave={hideToolbar}
            >
                <div className="instance-viewport__header-title">
                    {getDisplayName()}
                </div>
                <div className="instance-viewport__header-actions">
                    {/* Span size picker */}
                    {onChangeSpan && (
                        <div className="span-picker-wrapper" ref={spanPickerRef}>
                            <button
                                onClick={() => setShowSpanPicker(!showSpanPicker)}
                                className={`instance-viewport__header-button ${showSpanPicker ? 'active' : ''}`}
                                title={`Window size: ${currentSpan}`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            {showSpanPicker && (
                                <div className="span-picker-dropdown">
                                    <div className="span-picker-grid">
                                        {[
                                            { id: '1x1', label: '1×1', cols: 1, rows: 1 },
                                            { id: '2x1', label: '2×1', cols: 2, rows: 1 },
                                            { id: '1x2', label: '1×2', cols: 1, rows: 2 },
                                            { id: '2x2', label: '2×2', cols: 2, rows: 2 },
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
                    <button
                        onClick={handleFullscreen}
                        className="instance-viewport__header-button"
                        title="Fullscreen"
                    >
                        <Maximize2 size={14} />
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="instance-viewport__header-button"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Auto-hide toolbar - slides down from header */}
            {tools.length > 0 && (
                <div
                    className={`instance-viewport__toolbar instance-viewport__toolbar--autohide ${toolbarVisible || toolbarPinned ? 'visible' : ''} ${toolbarPinned ? 'pinned' : ''}`}
                    onMouseEnter={showToolbar}
                    onMouseLeave={hideToolbar}
                >
                    {tools.map((tool, index) => renderTool(tool, index))}

                    {/* Pin button */}
                    <button
                        className={`toolbar-pin-btn ${toolbarPinned ? 'active' : ''}`}
                        onClick={toggleToolbarPin}
                        title={toolbarPinned ? 'Unpin toolbar' : 'Pin toolbar'}
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v8M12 18v4M5 12h14" />
                            {toolbarPinned && <circle cx="12" cy="12" r="3" fill="currentColor" />}
                        </svg>
                    </button>
                </div>
            )}

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

            {/* Status bar at bottom */}
            {hasData && (
                <div className="instance-viewport__statusbar">
                    <div className="statusbar__section statusbar__section--left">
                        {instanceType && (
                            <span className="statusbar__badge statusbar__badge--type">
                                {instanceType}
                            </span>
                        )}
                        {dataInfo?.points && (
                            <span className="statusbar__info">
                                <span className="statusbar__label">Points:</span>
                                <span className="statusbar__value">{formatNumber(dataInfo.points)}</span>
                            </span>
                        )}
                        {dataInfo?.dimensions && (
                            <span className="statusbar__info">
                                <span className="statusbar__label">Dims:</span>
                                <span className="statusbar__value">
                                    {Array.isArray(dataInfo.dimensions)
                                        ? dataInfo.dimensions.join(' × ')
                                        : dataInfo.dimensions}
                                </span>
                            </span>
                        )}
                    </div>

                    <div className="statusbar__section statusbar__section--center">
                        {/* Zoom controls */}
                        <div className="statusbar__controls">
                            <button className="statusbar__control-btn" title="Zoom out">
                                <ZoomOut size={12} />
                            </button>
                            <span className="statusbar__zoom-level">
                                {statusInfo.zoomLevel}%
                            </span>
                            <button className="statusbar__control-btn" title="Zoom in">
                                <ZoomIn size={12} />
                            </button>
                            <button className="statusbar__control-btn" title="Reset view">
                                <RotateCcw size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="statusbar__section statusbar__section--right">
                        <span className="statusbar__info statusbar__info--mode">
                            <Move size={10} />
                            <span>{statusInfo.cameraMode}</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}