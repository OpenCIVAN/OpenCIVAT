// src/ui/react/components/workspace/InstanceViewport.jsx
// Generic instance container with proper local/remote handling

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from 'react-dom';
import {
    ChevronDown,    // Dropdown indicator
    Maximize2,      // Fullscreen
    Trash2,         // Delete
    AlertCircle     // Error icon
} from 'lucide-react';

// Import centralized icon registry
import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";

import { instanceManager } from "@Core/instances/instanceManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { SliderMenuOption } from '@UI/react/components/workspace/SliderMenuOption.jsx';
import { CameraViewGridPicker } from '@UI/react/components/workspace/CameraViewGridPicker.jsx';
import { SliderWithPresets } from '@UI/react/components/workspace/SliderWithPresets.jsx';
import { ColorSwatchGrid } from '@UI/react/components/workspace/ColorSwatchGrid.jsx';
import { PositionGridPicker } from '@UI/react/components/workspace/PositionGridPicker.jsx';

import "@UI/react/components/workspace/InstanceViewport.css";

/**
 * InstanceViewport
 *
 * Generic container that can host any visualization type.
 * Handles both local instances (created by this user) and remote instances
 * (created by other users and mirrored locally).
 *
 * Props:
 * - datasetId: Dataset to display (optional)
 * - isRemote: Whether this is a remote instance
 * - remoteInstanceId: The instance ID from Y.js (only for remote instances)
 * - ownerUserName: Name of user who created this (only for remote instances)
 * - onDelete: Callback when instance should be deleted
 */
export function InstanceViewport({
    datasetId,
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
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState({ stats: [], indicators: [] });
    const [error, setError] = useState(null);

    // Track which menu is currently open
    const [openMenuId, setOpenMenuId] = useState(null);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // =========================================================================

    useEffect(() => {
        if (!containerRef.current || initOnce.current) return;
        initOnce.current = true;

        console.log(`🎨 InstanceViewport: Initializing`);
        console.log(`   Mode: ${isRemote ? 'remote' : 'local'}`);

        const createInstance = async () => {
            try {
                let instanceId;

                if (isRemote) {
                    console.log(`🌐 Creating local rendering of remote instance`);
                    await instanceManager.createRemoteInstance(
                        containerRef.current,
                        remoteInstanceId,
                        datasetId
                    );
                    instanceId = remoteInstanceId;
                } else {
                    console.log(`🆕 Creating new local instance`);
                    instanceId = await instanceManager.createInstance(
                        containerRef.current,
                        datasetId
                    );
                }

                setActualInstanceId(instanceId);

                // const instanceTools = workspaceManager.getInstanceTools(instanceId);
                // console.log(`   Handler provided ${instanceTools.length} tools`);
                // setTools(instanceTools);

                const header = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(header);

                setInitialized(true);
                console.log(`✅ Instance ready: ${instanceId}`);

            } catch (error) {
                console.error(`❌ Failed to initialize instance:`, error);
                setError(error.message);
            }
        };

        createInstance();

        // CRITICAL FIX: DO NOT delete instances during component cleanup!
        // Instances are shared state in Y.js and should persist even if the
        // React component unmounts. They should only be deleted when:
        // 1. User explicitly clicks the delete button
        // 2. Session cleanup runs
        // Deleting during cleanup was causing instances to disappear from Y.js
        // during React re-renders, breaking bidirectional sync.
        return () => {
            if (actualInstanceId && initOnce.current) {
                console.log(`🧹 InstanceViewport: Component unmounting (instance ${actualInstanceId} preserved)`);

                // Clean up local rendering only, don't delete from Y.js
                // instanceManager.deleteInstance(actualInstanceId);  ← REMOVED
            }
        };
    }, []);

    // =========================================================================
    // 🔧 USEEFFECT #2: GET INITIAL TOOLS AFTER INITIALIZATION
    // This runs when instance is initialized AND has an ID
    // =========================================================================
    useEffect(() => {
        // Wait until we have both initialized flag AND actualInstanceId
        if (!initialized || !actualInstanceId) {
            console.log(`⏳ Waiting for initialization... initialized=${initialized}, id=${actualInstanceId}`);
            return;
        }

        console.log(`🛠️ Getting initial tools for ${actualInstanceId}`);

        const initialTools = workspaceManager.getInstanceTools(actualInstanceId);
        console.log(`   Found ${initialTools.length} tools`);

        setTools(initialTools);

    }, [initialized, actualInstanceId]);

    // Later, when tools update event fires
    useEffect(() => {
        if (!actualInstanceId) return;

        const handleToolsUpdate = (event) => {
            // Only update if this event is for OUR instance
            if (event.detail?.instanceId === actualInstanceId) {

                const before = tools.length;
                const updatedTools = workspaceManager.getInstanceTools(actualInstanceId);

                console.log('📊 Tools comparison:');
                console.log('  - Array changed?', tools !== updatedTools);
                console.log('  - Length before:', before);
                console.log('  - Length after:', updatedTools.length);
                console.log(`🔄 Tools updated for ${actualInstanceId}, refreshing toolbar`);

                console.log(`   Got ${updatedTools.length} updated tools`);

                setTools(updatedTools);
            }
        };

        // Listen for custom events from VTKInstanceHandler
        window.addEventListener('cia:tools-updated', handleToolsUpdate);

        // Cleanup listener when component unmounts or actualInstanceId changes
        return () => {
            window.removeEventListener('cia:tools-updated', handleToolsUpdate);
        };
    }, [actualInstanceId]);

    // =========================================================================
    // DATASET LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !datasetId) {
            setLoading(false);
            return;
        }

        const loadDataset = async () => {
            try {
                const datasetManager = window.CIA?.datasetManager;
                if (!datasetManager) {
                    throw new Error('DatasetManager not initialized');
                }

                const dataset = datasetManager.getDataset(datasetId);
                if (!dataset) {
                    console.warn(`⚠️ Dataset ${datasetId} not found`);
                    return;
                }

                const instance = workspaceManager.getInstance(actualInstanceId);
                if (!instance) {
                    console.warn(`⚠️ Instance ${actualInstanceId} not found`);
                    return;
                }

                const registry = window.CIA?.vtkInstanceHandler;
                if (!registry) {
                    throw new Error('VTK handler not available');
                }

                setLoading(true);
                console.log(`📊 Loading dataset ${dataset.filename} into instance`);

                await registry.loadData(instance.instanceData, dataset, null);

                const newHeaderInfo = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(newHeaderInfo);

                setLoading(false);
                console.log(`✅ Dataset loaded successfully`);

            } catch (error) {
                const errorMessage = error.message || 'Unknown error occurred';
                console.error(`❌ Failed to load dataset:`, error);

                const dataset = window.CIA?.datasetManager?.getDataset(datasetId);
                setError({
                    message: errorMessage,
                    datasetId: datasetId,
                    datasetName: dataset?.filename || 'Unknown dataset',
                    canAutoFetch: dataset?.canAutoFetch?.() || false,
                    needsReupload: errorMessage.includes('not available') ||
                        errorMessage.includes('no longer in cache') ||
                        errorMessage.includes('re-upload'),
                });

                setLoading(false);
            }
        };

        loadDataset();

    }, [initialized, actualInstanceId, datasetId]);

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    const getDisplayName = () => {
        if (isRemote && ownerUserName) {
            if (datasetId) {
                const datasetManager = window.CIA?.datasetManager;
                const dataset = datasetManager?.getDataset(datasetId);
                const filename = dataset?.filename || 'Unknown';
                return `${ownerUserName}'s view of ${filename}`;
            }
            return `${ownerUserName}'s view`;
        }

        if (datasetId) {
            const datasetManager = window.CIA?.datasetManager;
            const dataset = datasetManager?.getDataset(datasetId);
            return dataset?.filename || `Dataset ${datasetId.slice(0, 8)}`;
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
    // RENDER
    // =========================================================================

    return (
        <div className="instance-container">
            {/* Header */}
            <div className="instance-header">
                <div className="instance-title-section">
                    <h3 className="instance-title">
                        {getDisplayName()}
                        {isRemote && (
                            <span style={{
                                marginLeft: '8px',
                                fontSize: '11px',
                                color: '#4CAF50',
                                fontWeight: 'normal'
                            }}>
                                (shared)
                            </span>
                        )}
                    </h3>

                    {headerInfo.stats && headerInfo.stats.length > 0 && (
                        <div className="instance-stats">
                            {headerInfo.stats.map((stat, idx) => (
                                <span key={idx} className="stat">
                                    <span className="stat-label">{stat.label}:</span>
                                    <span className="stat-value">{stat.value}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {headerInfo.indicators && headerInfo.indicators.length > 0 && (
                        <div className="instance-indicators">
                            {headerInfo.indicators.map((indicator, idx) => (
                                <span
                                    key={idx}
                                    className="indicator"
                                    style={{ color: indicator.color }}
                                >
                                    {indicator.icon && <span>{indicator.icon}</span>}
                                    <span>{indicator.label}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="instance-actions">
                    <button
                        onClick={handleFullscreen}
                        className="action-btn"
                        title="Fullscreen"
                    >
                        <Maximize2 size={16} />
                    </button>

                    <button
                        onClick={onDelete}
                        className="action-btn danger"
                        title="Delete Instance"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            {initialized && tools.length > 0 && (
                <div className="instance-toolbar">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>
            )}

            {/* Viewport */}
            <div className="viewport-wrapper">
                <div ref={containerRef} className="viewport-container" onMouseEnter={() => {
                    if (actualInstanceId) {
                        setActiveInstance(actualInstanceId);
                    }
                }} />

                {loading && (
                    <div className="viewport-overlay loading">
                        <div className="loading-spinner" />
                        <p>Loading dataset...</p>
                    </div>
                )}

                {error && (
                    <div className="viewport-overlay error">
                        <AlertCircle size={48} color="#f44336" />
                        <h3 className="error-title">Unable to Load Dataset</h3>
                        <p className="error-message">{error.message}</p>
                        {/* ... error actions ... */}
                    </div>
                )}

                {!datasetId && !loading && initialized && !error && (
                    <div className="viewport-overlay empty">
                        <p>No dataset loaded</p>
                        <p className="hint">Select a file from the Files panel</p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================================
   USAGE PATTERN FOR OTHER COMPONENTS
   
   To add a new visual picker:
   
   1. In Core (VTKInstanceHandler):
      {
        type: 'my-custom-picker',
        id: 'my-picker',
        data: { ... plain data ... },
        onAction: (value) => { ... plain callback ... }
      }
   
   2. In UI (InstanceViewport renderMenuOption):
      if (option.type === 'my-custom-picker') {
        return <MyCustomPicker {...option} />;
      }
   
   3. Create Component (MyCustomPicker.jsx):
      export function MyCustomPicker({ data, onAction }) {
        // Pure React, receives plain props
      }
   
   This pattern keeps core pure and UI flexible!
   ============================================================================ */