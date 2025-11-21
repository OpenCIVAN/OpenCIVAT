import React, { useRef, useEffect, useState } from "react";
import { createPortal } from 'react-dom';
import {
    ChevronDown, Maximize2, Trash2, AlertCircle
} from 'lucide-react';

import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";
import { instanceManager } from "@Core/instances/instanceManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { SliderMenuOption } from '@UI/react/components/workspace/SliderMenuOption.jsx';
import { CameraViewGridPicker } from '@UI/react/components/workspace/CameraViewGridPicker.jsx';
import { SliderWithPresets } from '@UI/react/components/workspace/SliderWithPresets.jsx';
import { ColorSwatchGrid } from '@UI/react/components/workspace/ColorSwatchGrid.jsx';
import { PositionGridPicker } from '@UI/react/components/workspace/PositionGridPicker.jsx';

// ✅ NEW: Import managers
import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";

import "@UI/react/components/workspace/InstanceViewport.css";

/**
 * InstanceViewport
 * 
 * ✅ UPDATED: Now uses ViewConfiguration layer
 * 
 * Props:
 * - viewConfigId: ViewConfiguration ID (replaces datasetId)
 * - type: Instance type ('vtk', 'plotly', etc.)
 * - isRemote: Whether this is a remote instance
 * - remoteInstanceId: The instance ID from Y.js
 * - ownerUserName: Name of user who created this
 * - onDelete: Callback when instance should be deleted
 */
export function InstanceViewport({
    viewConfigId,        // ✅ Changed from datasetId
    type = 'vtk',
    isRemote = false,
    remoteInstanceId = null,
    ownerUserName = null,
    onDelete
}) {
    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    const containerRef = useRef(null);
    const initOnce = useRef(false);

    const [actualInstanceId, setActualInstanceId] = useState(
        isRemote ? remoteInstanceId : null
    );
    const [initialized, setInitialized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null); 
    const [activeDropdown, setActiveDropdown] = useState(null);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // =========================================================================

    useEffect(() => {
        if (initOnce.current || !containerRef.current) return;

        initOnce.current = true;

        const initialize = async () => {
            try {
                if (isRemote) {
                    console.log(`🔗 Remote instance already has ID: ${remoteInstanceId}`);
                    setActualInstanceId(remoteInstanceId);
                    setInitialized(true);
                    return;
                }

                console.log(`🎨 Creating new local instance (type: ${type})`);

                // ✅ UPDATED: Store viewConfigId in options
                const instanceId = await workspaceManager.createInstance(
                    containerRef.current,
                    type,
                    { viewConfigId }  // Pass viewConfigId to instance
                );

                setActualInstanceId(instanceId);
                setInitialized(true);

                setActiveInstance(instanceId);
                console.log(`✅ Instance created: ${instanceId}`);

            } catch (err) {
                console.error(`❌ Failed to initialize instance:`, err);
                setError({
                    message: err.message || 'Initialization failed',
                    canRetry: true,
                });
            }
        };

        initialize();
    }, [isRemote, remoteInstanceId, type, viewConfigId]);

    // =========================================================================
    // TOOLS LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId) return;

        const loadTools = () => {
            try {
                const toolsList = workspaceManager.getInstanceTools(actualInstanceId);
                console.log(`🔧 Loaded ${toolsList.length} tools for instance ${actualInstanceId}`);
                setTools(toolsList);
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
    }, [actualInstanceId, initialized]);

    // =========================================================================
    // ✅ NEW: VIEW CONFIGURATION LOADING
    // This replaces the old dataset loading logic
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !viewConfigId) {
            setLoading(false);
            return;
        }

        const loadView = async () => {
            try {
                // STEP 1: Get the ViewConfiguration
                const view = viewConfigurationManager.getView(viewConfigId);
                if (!view) {
                    throw new Error(`ViewConfiguration ${viewConfigId} not found`);
                }

                console.log(`📋 Loading view ${viewConfigId}`);

                // STEP 2: Get the Dataset from the view
                const dataset = datasetManager.getDataset(view.datasetId);
                if (!dataset) {
                    throw new Error(`Dataset ${view.datasetId} not found for view`);
                }

                console.log(`📊 Loading dataset ${dataset.filename} via view`);

                // STEP 3: Get the instance
                const instance = workspaceManager.getInstance(actualInstanceId);
                if (!instance) {
                    throw new Error(`Instance ${actualInstanceId} not found`);
                }

                // STEP 4: Get the handler
                const handler = instance.handler;
                if (!handler) {
                    throw new Error('Instance handler not available');
                }

                setLoading(true);

                // STEP 5: Load the data
                console.log(`📊 Loading data into instance ${actualInstanceId}`);
                await handler.loadData(instance.instanceData, dataset, null);

                // STEP 6: Apply saved camera state if it exists
                if (view.camera && handler.applyCameraState) {
                    console.log(`📷 Applying saved camera state from view`);
                    handler.applyCameraState(actualInstanceId, view.camera);
                }

                // STEP 7: Apply filters if any
                if (view.filters && view.filters.length > 0) {
                    console.log(`🎨 Applying ${view.filters.length} filter(s) from view`);
                    // TODO: Implement filter application
                }

                // STEP 8: Restore widgets if any
                if (view.widgets && view.widgets.length > 0) {
                    console.log(`🔧 Restoring ${view.widgets.length} widget(s) from view`);
                    // TODO: Implement widget restoration
                }

                // Update header info
                const newHeaderInfo = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(newHeaderInfo);

                setLoading(false);
                console.log(`✅ View loaded successfully`);

            } catch (error) {
                const errorMessage = error.message || 'Unknown error occurred';
                console.error(`❌ Failed to load view:`, error);

                // Get dataset info for error display
                let datasetName = 'Unknown';
                try {
                    const view = viewConfigurationManager.getView(viewConfigId);
                    if (view) {
                        const dataset = datasetManager.getDataset(view.datasetId);
                        datasetName = dataset?.filename || 'Unknown';
                    }
                } catch (e) {
                    console.warn('Could not get dataset name for error display');
                }

                setError({
                    message: errorMessage,
                    viewConfigId: viewConfigId,
                    datasetName: datasetName,
                });
                setLoading(false);
            }
        };

        loadView();
    }, [initialized, actualInstanceId, viewConfigId]);

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

        return `Instance ${actualInstanceId ? actualInstanceId.slice(-6) : '...'}`;
    };

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (!document.fullscreenElement) {
                containerRef.current.parentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    };


    // =========================================================================
    // TOOLBAR RENDERING
    // =========================================================================

    /**
 * Render individual menu option
 * UPDATED to support 'custom' type for sliders
 */
    const renderMenuOption = (option, optIndex, menuId) => {
        // Handle separator
        if (option.type === 'separator') {
            return (
                <div
                    key={`menu-sep-${menuId}-${optIndex}`}
                    className="menu-separator"
                />
            );
        }

        // =====================================================================
        // HEADER (for section labels like "Quick Presets")
        // =====================================================================
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

        // =====================================================================
        // ✅ CAMERA GRID - UI layer interprets the plain object
        // =====================================================================
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

        // =====================================================================
        // ✅ POSITION GRID - For widget positioning
        // =====================================================================
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

        // =====================================================================
        // ✅ COLOR SWATCH GRID - UI layer interprets the plain object
        // =====================================================================
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

        // =====================================================================
        // ✅ SLIDER WITH PRESETS - UI layer interprets the plain object
        // =====================================================================
        if (option.type === 'slider-with-presets') {
            const IconComponent = getToolIcon(option.icon);

            return (
                <SliderWithPresets
                    key={option.id}
                    icon={IconComponent ? <IconComponent size={14} /> : null}
                    label={option.label}
                    value={option.value}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    formatValue={option.formatValue}
                    presets={option.presets}
                    onChange={option.onChange}
                    disabled={option.disabled}
                    disabledReason={option.disabledReason}
                />
            );
        }

        // =====================================================================
        // SLIDER - Convert plain object to React component
        // =====================================================================
        if (option.type === 'slider') {
            // Resolve icon string to React component
            const IconComponent = getToolIcon(option.icon);

            return (
                <SliderMenuOption
                    key={option.id || `slider-${menuId}-${optIndex}`}
                    icon={IconComponent ? <IconComponent size={14} /> : null}
                    label={option.label}
                    description={option.description}
                    value={option.value}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    onChange={option.onChange}
                    formatValue={option.formatValue}
                    presets={option.presets}
                    disabled={option.disabled}
                />
            );
        }


        // =====================================================================
        // BUTTON - Regular clickable option
        // =====================================================================
        const OptionIcon = getToolIcon(option.id, option.icon);

        return (
            <button
                key={option.id || `option-${menuId}-${optIndex}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (option.onClick) {
                        option.onClick();
                    }
                }}
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

    /**
     * Render individual tool button
     * UPDATED with smart dropdown positioning
     */
    const renderTool = (tool, index) => {
        // Separator
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

        // Menu with dropdown
        if (tool.type === 'menu') {
            return (
                <div
                    key={tool.id || `menu-${index}`}
                    className="toolbar-menu"
                    onMouseEnter={() => setOpenMenuId(tool.id)}
                    onMouseLeave={() => setOpenMenuId(null)}
                >
                    <button
                        className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        {IconComponent && <IconComponent size={18} strokeWidth={2} />}
                        <ChevronDown size={10} className="menu-indicator" />

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

                    {isOpen && tool.options && tool.options.length > 0 && (
                        <div className="toolbar-menu-dropdown">
                            {tool.options.map((option, optIndex) =>
                                renderMenuOption(option, optIndex, tool.id)
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // Simple button
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
    // MAIN RENDER
    // =========================================================================

    return (
        <div
            className="instance-viewport"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '4px',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div className="instance-viewport__header">
                <div className="instance-viewport__header-title">
                    {getDisplayName()}
                </div>
                <div className="instance-viewport__header-actions">
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

            {/* Toolbar */}
            {tools.length > 0 && (
                <div className="instance-viewport__toolbar">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>
            )}

            {/* Content */}
            <div
                ref={containerRef}
                className="instance-viewport__content"
                style={{
                    flex: 1,
                    position: 'relative',
                    backgroundColor: '#0a0a0a',
                }}
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
                        <div>{error.message}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                            View: {error.viewConfigId?.slice(0, 12)}...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}