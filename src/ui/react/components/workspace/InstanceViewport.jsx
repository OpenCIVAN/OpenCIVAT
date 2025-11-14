// src/ui/react/components/workspace/InstanceViewport.jsx
// Generic instance container with proper local/remote handling

import React, { useRef, useEffect, useState } from "react";
import {
    BarChart3,      // Dimensionality Reduction
    Camera,         // Camera controls
    Scissors,       // Clipping plane
    Eye,            // Visibility
    Ruler,          // Measurements
    MessageSquare,  // Annotations
    Box,            // 3D/2D toggle
    RotateCcw,      // Reset/Restore
    Maximize2,      // Fullscreen
    Trash2,         // Delete
    ChevronDown,    // Dropdown indicator
    AlertCircle
} from 'lucide-react';
import { instanceManager } from "@Core/instances/instanceManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import "./InstanceViewport.css";

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

    // DOM reference for rendering container
    const containerRef = useRef(null);

    // Prevent double initialization in React StrictMode
    const initOnce = useRef(false);

    // The actual instance ID (generated for local, provided for remote)
    const [actualInstanceId, setActualInstanceId] = useState(
        isRemote ? remoteInstanceId : null
    );

    // Has the handler been initialized?
    const [initialized, setInitialized] = useState(false);

    // Is a dataset currently loading?
    const [loading, setLoading] = useState(false);

    // Tools provided by the handler
    const [tools, setTools] = useState([]);

    // Header information from the handler
    const [headerInfo, setHeaderInfo] = useState({ stats: [], indicators: [] });

    // Error state
    const [error, setError] = useState(null);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // =========================================================================

    useEffect(() => {
        // Guard against double initialization
        if (!containerRef.current || initOnce.current) return;

        initOnce.current = true;

        console.log(`🎨 InstanceViewport: Initializing`);
        console.log(`   Mode: ${isRemote ? 'remote' : 'local'}`);
        if (isRemote) {
            console.log(`   Remote ID: ${remoteInstanceId}`);
            console.log(`   Owner: ${ownerUserName}`);
        }
        if (datasetId) {
            console.log(`   Dataset: ${datasetId}`);
        }

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
                    console.log(`   Generated ID: ${instanceId}`);
                }

                // Set the instance ID immediately
                setActualInstanceId(instanceId);

                // Get tools and header info directly (no setTimeout needed)
                const instanceTools = workspaceManager.getInstanceTools(instanceId);
                console.log(`   Handler provided ${instanceTools.length} tools`);
                setTools(instanceTools);

                const header = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(header);

                // Mark as initialized - this will trigger the data loading effect
                setInitialized(true);
                console.log(`✅ Instance ready: ${instanceId}`);

            } catch (error) {
                console.error(`❌ Failed to initialize instance:`, error);
                setError(error.message);
            }
        };

        createInstance();

        // Cleanup when component unmounts
        return () => {
            if (actualInstanceId && initOnce.current) {
                console.log(`🧹 InstanceViewport: Cleaning up ${actualInstanceId}`);
                instanceManager.deleteInstance(actualInstanceId);
            }
        };
    }, []); // Empty deps - run exactly once

    // =========================================================================
    // DATASET LOADING
    // This handles loading data into the instance after it's initialized
    // =========================================================================

    useEffect(() => {
        // Guard clauses - don't proceed unless everything is ready
        if (!initialized) {
            console.log(`   ⏸️ Waiting for initialization...`);
            return;
        }

        if (!actualInstanceId) {
            console.log(`   ⏸️ Waiting for instance ID...`);
            return;
        }

        if (!datasetId) {
            setLoading(false);
            return;
        }

        console.log(`📊 Dataset loading effect triggered`);
        console.log(`   Instance: ${actualInstanceId}`);
        console.log(`   Dataset: ${datasetId}`);
        console.log(`   Initialized: ${initialized}`);

        const loadDataset = async () => {
            try {
                // Get the dataset
                const datasetManager = window.CIA?.datasetManager;
                if (!datasetManager) {
                    throw new Error('DatasetManager not initialized');
                }

                const dataset = datasetManager.getDataset(datasetId);
                if (!dataset) {
                    console.warn(`⚠️ Dataset ${datasetId} not found`);
                    return;
                }

                // Get the instance
                const instance = workspaceManager.getInstance(actualInstanceId);
                if (!instance) {
                    console.warn(`⚠️ Instance ${actualInstanceId} not found`);
                    return;
                }

                // Get the handler from the global registry
                const registry = window.CIA?.vtkInstanceHandler;
                if (!registry) {
                    throw new Error('VTK handler not available');
                }

                setLoading(true);
                console.log(`📊 Loading dataset ${dataset.filename} into instance`);

                // Load the data through the handler
                await registry.loadData(instance.instanceData, dataset, null);

                // Update header with stats
                const newHeaderInfo = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(newHeaderInfo);

                setLoading(false);
                console.log(`✅ Dataset loaded successfully`);

            } catch (error) {
                // Now we can access dataset because it was declared outside the try block
                const errorMessage = error.message || 'Unknown error occurred';
                console.error(`❌ Failed to load dataset:`, error);
                setError(error.message);

                // Build rich error state with information about what can be done
                // We have access to dataset here because we declared it in the outer scope
                // Create rich error state
                const dataset = window.CIA?.datasetManager?.getDataset(datasetId);
                setError({
                    message: errorMessage,
                    datasetId: datasetId,
                    datasetName: dataset?.filename || 'Unknown dataset',
                    // Check if the dataset has a way to automatically fetch the file
                    canAutoFetch: dataset?.canAutoFetch?.() || false,
                    // Determine if this is a "needs reupload" situation
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

    /**
     * Get display name for this instance
     */
    const getDisplayName = () => {
        // For remote instances, show the owner's name
        if (isRemote && ownerUserName) {
            if (datasetId) {
                const datasetManager = window.CIA?.datasetManager;
                const dataset = datasetManager?.getDataset(datasetId);
                const filename = dataset?.filename || 'Unknown';
                return `${ownerUserName}'s view of ${filename}`;
            }
            return `${ownerUserName}'s view`;
        }

        // For local instances, show the dataset name
        if (datasetId) {
            const datasetManager = window.CIA?.datasetManager;
            const dataset = datasetManager?.getDataset(datasetId);
            return dataset?.filename || `Dataset ${datasetId.slice(0, 8)}`;
        }

        return `Instance ${actualInstanceId ? actualInstanceId.slice(-6) : '...'}`;
    };

    /**
     * Toggle fullscreen mode
     */
    const handleFullscreen = () => {
        if (containerRef.current) {
            if (!document.fullscreenElement) {
                containerRef.current.parentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    };

    // ============================================================================
    // Icon Mapping Helper
    // ============================================================================

    /**
     * Maps tool IDs to Lucide icons
     * Add new mappings here as you create more features
     */
    const TOOL_ICON_MAP = {
        // Reduction tools
        'reduction': BarChart3,
        'pca': BarChart3,
        'tsne': BarChart3,
        'umap': BarChart3,
        'dimensions': Box,
        'restore': RotateCcw,

        // Camera tools
        'camera': Camera,
        'camera-reset': Camera,
        'camera-fit': Camera,

        // Analysis tools
        'clipping': Scissors,
        'measurements': Ruler,
        'measure-distance': Ruler,
        'measure-angle': Ruler,

        // Display tools
        'visibility': Eye,
        'annotations': MessageSquare,

        // Default fallback
        'default': Box,
    };

    /**
 * Get Lucide icon component for a tool
 */
    const getToolIcon = (toolId, toolIcon) => {
        // If tool provides explicit icon string, try to map it
        if (typeof toolIcon === 'string') {
            return TOOL_ICON_MAP[toolIcon] || TOOL_ICON_MAP['default'];
        }

        // Try mapping by tool ID
        if (TOOL_ICON_MAP[toolId]) {
            return TOOL_ICON_MAP[toolId];
        }

        // Default fallback
        return TOOL_ICON_MAP['default'];
    };


    /**
     * Render a tool from the handler
     * Now renders compact icon-only buttons with rich tooltips
     */
    /**
     * Render a tool from the handler as an icon button with tooltip
     * 
     * This handles three types of tools:
     * 1. Separator - visual divider between tool groups
     * 2. Menu - dropdown menu with multiple options
     * 3. Button - simple click action
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

        // Get the icon component
        const IconComponent = getToolIcon(tool.id, tool.icon);

        // Menu-type tool (has dropdown options)
        if (tool.type === 'menu') {
            return (
                <div key={tool.id || `menu-${index}`} className="toolbar-menu">
                    <button
                        className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                    >
                        <IconComponent size={18} strokeWidth={2} />
                        <ChevronDown size={10} className="menu-indicator" />

                        {/* Rich Tooltip */}
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

                    {/* Dropdown menu */}
                    <div className="toolbar-menu-dropdown">
                        {tool.options?.map((option, optIndex) => {
                            // Skip separators in menu
                            if (option.type === 'separator') {
                                return (
                                    <div
                                        key={`menu-sep-${optIndex}`}
                                        className="menu-separator"
                                    />
                                );
                            }

                            const OptionIcon = getToolIcon(option.id, option.icon);

                            return (
                                <button
                                    key={option.id || `option-${optIndex}`}
                                    onClick={option.onClick}
                                    className={`menu-option ${option.active ? 'active' : ''}`}
                                    disabled={option.disabled}
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
                        })}
                    </div>
                </div>
            );
        }

        // Regular button tool
        return (
            <button
                key={tool.id || `tool-${index}`}
                onClick={tool.onClick}
                className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                disabled={tool.disabled}
                aria-label={tool.label}
            >
                <IconComponent size={18} strokeWidth={2} />

                {/* Rich Tooltip */}
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

                    {/* Stats from handler */}
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

                    {/* Indicators from handler */}
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

                {/* Actions */}
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

            {/* Toolbar - Dynamically rendered from handler tools */}
            {initialized && tools.length > 0 && (
                <div className="instance-toolbar">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>
            )}

            {/* Viewport Container */}
            <div className="viewport-wrapper">
                {/* The handler renders into this container */}
                <div
                    ref={containerRef}
                    className="viewport-container"
                />

                {/* Loading overlay */}
                {loading && (
                    <div className="viewport-overlay loading">
                        <div className="loading-spinner" />
                        <p>Loading dataset...</p>
                    </div>
                )}

                {/* Enhanced Error overlay */}
                {error && (
                    <div className="viewport-overlay error">
                        <AlertCircle size={48} color="#f44336" />
                        <h3 className="error-title">Unable to Load Dataset</h3>
                        <p className="error-message">{error.message}</p>

                        <div className="error-actions">
                            {error.canAutoFetch && (
                                <button
                                    onClick={() => {
                                        setError(null);
                                        // The effect will automatically re-run and try fetching
                                    }}
                                    className="error-action-primary"
                                >
                                    Try Fetching Again
                                </button>
                            )}

                            {error.needsReupload && !error.canAutoFetch && (
                                <button
                                    onClick={() => {
                                        // Emit event that Files panel can listen to
                                        window.dispatchEvent(new CustomEvent('requestDatasetReupload', {
                                            detail: {
                                                datasetId: error.datasetId,
                                                datasetName: error.datasetName
                                            }
                                        }));
                                        setError(null);
                                    }}
                                    className="error-action-primary"
                                >
                                    Upload File
                                </button>
                            )}

                            <button
                                onClick={() => setError(null)}
                                className="error-action-secondary"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty state */}
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