// src/ui/react/components/workspace/InstanceViewport.jsx
import React, { useRef, useEffect, useState } from "react";
import { ChevronDown, Maximize2, Trash2, AlertCircle } from 'lucide-react';

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
 */
export function InstanceViewport({
    viewConfigId = null,
    isRemote = false,
    remoteInstanceId = null,
    ownerUserName = null,
    onDelete
}) {
    // =========================================================================
    // STATE
    // =========================================================================

    const containerRef = useRef(null);
    const initOnce = useRef(false);

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

                setActualInstanceId(instanceId);
                setInitialized(true);
                setActiveInstance(instanceId);

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
            if (actualInstanceId) {
                console.log(`🧹 Cleaning up instance ${actualInstanceId}`);
                workspaceManager.deleteInstance(actualInstanceId);
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
        if (containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen();
        }
    };

    // =========================================================================
    // RENDERING HELPERS
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

        if (option.type === 'slider') {
            return (
                <SliderMenuOption
                    key={option.id || `slider-${menuId}-${optIndex}`}
                    {...option}
                />
            );
        }

        if (option.type === 'slider-with-presets') {
            return (
                <SliderWithPresets
                    key={option.id || `slider-preset-${menuId}-${optIndex}`}
                    {...option}
                />
            );
        }

        if (option.type === 'camera-view-grid') {
            return (
                <CameraViewGridPicker
                    key={option.id || `camera-grid-${menuId}-${optIndex}`}
                    {...option}
                />
            );
        }

        if (option.type === 'position-grid') {
            return (
                <PositionGridPicker
                    key={option.id || `pos-grid-${menuId}-${optIndex}`}
                    {...option}
                />
            );
        }

        if (option.type === 'color-swatch-grid') {
            return (
                <ColorSwatchGrid
                    key={option.id || `color-grid-${menuId}-${optIndex}`}
                    {...option}
                />
            );
        }

        const OptionIcon = option.icon ? getToolIcon(option.id, option.icon) : null;

        return (
            <button
                key={option.id || `option-${menuId}-${optIndex}`}
                onClick={(e) => {
                    e.stopPropagation();
                    option.onClick?.();
                }}
                className={`menu-option ${option.active ? 'active' : ''}`}
                disabled={option.disabled}
                aria-label={option.label}
            >
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
        <div className="instance-viewport">
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

            {/* Canvas Container - VTK renders here */}
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
                        <div>{error}</div>
                    </div>
                )}
            </div>
        </div>
    );
}