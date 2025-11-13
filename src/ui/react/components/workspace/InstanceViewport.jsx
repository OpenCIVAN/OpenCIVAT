// src/ui/react/components/workspace/InstanceViewport.jsx
// Generic instance container with proper local/remote handling

import React, { useRef, useEffect, useState } from "react";
import { Maximize2, Copy, Trash2, AlertCircle } from "lucide-react";
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
                await registry.loadData(instance, dataset, null);

                // Update header with stats
                const newHeaderInfo = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(newHeaderInfo);

                setLoading(false);
                console.log(`✅ Dataset loaded successfully`);

            } catch (error) {
                console.error(`❌ Failed to load dataset:`, error);
                setError(error.message);
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

    /**
     * Render a tool from the handler
     */
    const renderTool = (tool, index) => {
        if (tool.type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}
                    className="toolbar-separator"
                />
            );
        }

        if (tool.type === 'menu') {
            return (
                <div key={tool.id || `menu-${index}`} className="toolbar-menu">
                    <button
                        className={`toolbar-btn ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                    >
                        {tool.icon && <span className="tool-icon">{tool.icon}</span>}
                        <span className="tool-label">{tool.label}</span>
                        <span className="menu-arrow">▼</span>
                    </button>

                    <div className="toolbar-menu-dropdown">
                        {tool.options?.map((option, optIndex) => (
                            <button
                                key={option.id || `option-${optIndex}`}
                                onClick={option.onClick}
                                className={`menu-option ${option.active ? 'active' : ''}`}
                                disabled={option.disabled}
                            >
                                {option.icon && <span className="option-icon">{option.icon}</span>}
                                <span className="option-label">{option.label}</span>
                                {option.description && (
                                    <span className="option-description">{option.description}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <button
                key={tool.id || `tool-${index}`}
                onClick={tool.onClick}
                className={`toolbar-btn ${tool.active ? 'active' : ''}`}
                title={tool.description || tool.label}
                disabled={tool.disabled}
            >
                {tool.icon && <span className="tool-icon">{tool.icon}</span>}
                <span className="tool-label">{tool.label}</span>
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

                {/* Error overlay */}
                {error && (
                    <div className="viewport-overlay error">
                        <AlertCircle size={48} color="#f44336" />
                        <p className="error-message">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="error-dismiss"
                        >
                            Dismiss
                        </button>
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