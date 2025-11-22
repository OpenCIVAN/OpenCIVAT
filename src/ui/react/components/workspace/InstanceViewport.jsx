// src/ui/react/components/workspace/InstanceViewport.jsx
import React, { useRef, useEffect, useState } from "react";
import { createPortal } from 'react-dom';
import {
    ChevronDown, Maximize2, Trash2, AlertCircle
} from 'lucide-react';

import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { SliderMenuOption } from '@UI/react/components/workspace/SliderMenuOption.jsx';
import { CameraViewGridPicker } from '@UI/react/components/workspace/CameraViewGridPicker.jsx';
import { SliderWithPresets } from '@UI/react/components/workspace/SliderWithPresets.jsx';
import { ColorSwatchGrid } from '@UI/react/components/workspace/ColorSwatchGrid.jsx';
import { PositionGridPicker } from '@UI/react/components/workspace/PositionGridPicker.jsx';

import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";

import "@UI/react/components/workspace/InstanceViewport.scss";

/**
 * InstanceViewport
 * 
 * A viewport component that displays a ViewConfiguration using a handler.
 * Instances start TYPELESS and determine their type when data is loaded.
 * 
 * Props:
 * - viewConfigId: ViewConfiguration ID (optional - can be null for empty instances)
 * - isRemote: Whether this is a remote instance
 * - remoteInstanceId: The instance ID from Y.js
 * - ownerUserName: Name of user who created this
 * - onDelete: Callback when instance should be deleted
 */
export function InstanceViewport({
    viewConfigId = null,
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
    const [instanceType, setInstanceType] = useState(null);  // Type determined when data loads
    const [hasData, setHasData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // Creates a TYPELESS instance. Type determined when data loads.
    // =========================================================================

    useEffect(() => {
        if (initOnce.current || !containerRef.current) return;

        initOnce.current = true;

        const initialize = async () => {
            try {
                setLoading(true);
                console.log(`🎨 Creating typeless instance (view: ${viewConfigId || 'none'})`);

                // Create TYPELESS instance - no handler initialized yet
                const instanceId = await workspaceManager.createInstance(
                    containerRef.current,
                    null,  // ✅ NO TYPE - determined when data loads
                    { viewConfigId: viewConfigId }
                );

                setActualInstanceId(instanceId);
                setInitialized(true);
                setActiveInstance(instanceId);

                // Get initial header info (will show "Empty Instance")
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

        // Cleanup on unmount
        return () => {
            if (actualInstanceId) {
                console.log(`🧹 Cleaning up instance ${actualInstanceId}`);
                workspaceManager.deleteInstance(actualInstanceId);
            }
        };
    }, [viewConfigId]);

    // =========================================================================
    // DATA LOADING
    // If a viewConfigId is provided, load the data after instance is created.
    // This is where the instance determines its type!
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !viewConfigId) return;

        const loadViewData = async () => {
            try {
                console.log(`📊 Loading view ${viewConfigId} into instance ${actualInstanceId}`);

                // Get the view configuration
                const viewConfig = viewConfigurationManager.getView(viewConfigId);
                if (!viewConfig) {
                    console.warn(`View ${viewConfigId} not found`);
                    return;
                }

                // If the view has a dataset, load it
                // THIS is where instance type gets determined!
                if (viewConfig.datasetId) {
                    await workspaceManager.loadDataIntoInstance(
                        actualInstanceId,
                        viewConfig.datasetId
                    );

                    // After loading, instance now has a type!
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
    // Tools only load AFTER instance has a type (i.e., after data is loaded)
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !instanceType) return;

        const loadTools = () => {
            try {
                const toolsList = workspaceManager.getInstanceTools(actualInstanceId);
                console.log(`🔧 Loaded ${toolsList.length} tools for ${instanceType} instance ${actualInstanceId}`);
                setTools(toolsList);

                // Also refresh header info
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
    }, [actualInstanceId, initialized, instanceType]);  // ✅ Depends on instanceType!

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    const handleDelete = () => {
        if (onDelete) {
            onDelete();
        }
    };

    const handleMaximize = () => {
        console.log('Maximize clicked - TODO: implement fullscreen');
    };

    const closeAllMenus = () => {
        setOpenMenuId(null);
        setActiveDropdown(null);
    };

    const toggleMenu = (toolId) => {
        if (openMenuId === toolId) {
            closeAllMenus();
        } else {
            setOpenMenuId(toolId);
            setActiveDropdown(toolId);
        }
    };

    // =========================================================================
    // RENDERING HELPERS
    // =========================================================================

// src/ui/react/components/workspace/InstanceViewport.jsx
// COMPLETE FIX: Handles both renderTool and renderMenuOption properly

/**
 * Render individual tool button (toolbar level)
 * FIX: Only call getToolIcon when icon exists
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

    // ✅ FIX: Only get icon if one is specified
    const IconComponent = (tool.icon || tool.id) 
        ? getToolIcon(tool.id, tool.icon) 
        : null;
    
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
                    {/* ✅ FIX: Only render icon if exists */}
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
            {/* ✅ FIX: Only render icon if exists */}
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

/**
 * Render individual menu option (inside dropdown menus)
 * FIX: Only call getToolIcon when icon property exists
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

    // Handle header
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

    // Handle camera grid
    if (option.type === 'camera-grid') {
        return (
            <CameraViewGridPicker
                key={option.id || `camera-grid-${menuId}-${optIndex}`}
                views={option.views}
                disabled={option.disabled}
                onViewChange={option.onViewSelect}
            />
        );
    }

    // Handle position grid
    if (option.type === 'position-grid') {
        return (
            <PositionGridPicker
                key={option.id || `position-grid-${menuId}-${optIndex}`}
                positions={option.positions}
                currentPosition={option.currentPosition}
                disabled={option.disabled}
                onPositionChange={option.onPositionChange}
            />
        );
    }

    // Handle color swatch grid
    if (option.type === 'color-swatch-grid') {
        return (
            <ColorSwatchGrid
                key={option.id || `color-grid-${menuId}-${optIndex}`}
                colormaps={option.colormaps}
                currentColormap={option.currentColormap}
                disabled={option.disabled}
                onColormapChange={option.onColormapChange}
            />
        );
    }

    // Handle slider with presets
    if (option.type === 'slider-with-presets') {
        // ✅ FIX: Only get icon if one is specified
        const IconComponent = option.icon ? getToolIcon(option.id, option.icon) : null;

        return (
            <SliderWithPresets
                key={option.id || `slider-${menuId}-${optIndex}`}
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

    // Handle slider
    if (option.type === 'slider') {
        // ✅ FIX: Only get icon if one is specified
        const IconComponent = option.icon ? getToolIcon(option.id, option.icon) : null;

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

    // ✅ FIX: Regular button - only get icon if specified
    // Check if icon property exists OR if id might be a valid icon name
    const OptionIcon = option.icon 
        ? getToolIcon(option.id, option.icon)
        : null;

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
            {/* ✅ FIX: Only render icon if one exists */}
            {OptionIcon && <OptionIcon size={14} className="option-icon" />}
            
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
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div className="instance-viewport__header">
                <div className="instance-title-section">
                    <h3 className="instance-title">
                        {instanceType
                            ? (headerInfo?.title || `${instanceType.toUpperCase()} Instance`)
                            : 'Empty Instance'
                        }
                    </h3>
                    {headerInfo?.stats && (
                        <div className="instance-stats">
                            {Object.entries(headerInfo.stats).map(([key, value]) => (
                                <div key={key} className="stat">
                                    <span className="stat-label">{key}:</span>
                                    <span className="stat-value">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="instance-indicators">
                    {isRemote && (
                        <div className="indicator">
                            <span>👤 {ownerUserName}</span>
                        </div>
                    )}
                    {!instanceType && !loading && (
                        <div className="indicator">
                            <span>📭 No data</span>
                        </div>
                    )}
                    {loading && (
                        <div className="indicator">
                            <span>⏳ Loading...</span>
                        </div>
                    )}
                </div>

                <div className="instance-actions">
                    <button
                        className="action-btn"
                        onClick={handleMaximize}
                        title="Maximize"
                    >
                        <Maximize2 size={16} />
                    </button>
                    <button
                        className="action-btn danger"
                        onClick={handleDelete}
                        title="Delete Instance"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Toolbar - ONLY shows if instance has data and type */}
            {hasData && instanceType && tools.length > 0 && (
                <div className="instance-toolbar">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="instance-error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Rendering Container */}
            <div
                ref={containerRef}
                className="instance-container"
                style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                }}
                onClick={() => {
                    if (actualInstanceId) {
                        setActiveInstance(actualInstanceId);
                    }
                }}
            />

            {/* Loading Overlay */}
            {loading && (
                <div className="instance-loading-overlay">
                    <div className="loading-spinner" />
                    <p>Initializing...</p>
                </div>
            )}

            {/* Click outside to close menus */}
            {openMenuId && createPortal(
                <div
                    className="toolbar-menu-backdrop"
                    onClick={closeAllMenus}
                />,
                document.body
            )}
        </div>
    );
}