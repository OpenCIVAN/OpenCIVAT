// src/ui/react/components/workspace/InstanceViewport.jsx
// Generic instance container that works with ANY visualization type
//through the handler interface. No VTK-specific code.

import React, { useRef, useEffect, useState } from "react";
import { Maximize2, Copy, Trash2, AlertCircle } from "lucide-react";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import "./InstanceViewport.css";

/**
 * InstanceViewport
 * 
 * This is a completely generic container that can host any type of visualization
 * instance (VTK, Plotly, Three.js, custom WebGL, etc.). It works by asking the
 * instance's handler for its tools and then rendering them.
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * This component NEVER knows what type of instance it's hosting. It discovers
 * the instance's capabilities at runtime by asking the handler. This makes the
 * system truly extensible - new instance types can be added without changing
 * any React code.
 * 
 * @param {string} instanceId - Unique identifier for this instance
 * @param {string} datasetId - Optional dataset to display
 * @param {Function} onDelete - Callback when instance should be deleted
 * @param {Function} onDuplicate - Callback when instance should be duplicated
 */
export function InstanceViewport({
    instanceId,
    datasetId,
    onDelete,
    onDuplicate
}) {
    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    // DOM reference to the container where the visualization renders
    const containerRef = useRef(null);

    // Initialization tracking - prevents double initialization in React StrictMode
    const initOnce = useRef(false);

    // Has the handler been initialized and started rendering?
    const [initialized, setInitialized] = useState(false);

    // Is a dataset currently being loaded?
    const [loading, setLoading] = useState(false);

    // Tools provided by the handler - this is the key to extensibility
    // The handler tells us what tools it has, we just render them
    const [tools, setTools] = useState([]);

    // Header information from the handler (stats, indicators, etc.)
    const [headerInfo, setHeaderInfo] = useState({ stats: [], indicators: [] });

    // Error state if initialization fails
    const [error, setError] = useState(null);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // This happens once when the component mounts
    // =========================================================================

    useEffect(() => {
        // Guard against double initialization (React StrictMode calls effects twice)
        if (containerRef.current && !initOnce.current) {
            initOnce.current = true;

            console.log(`🎨 InstanceViewport: Initializing instance ${instanceId}`);

            try {
                // STEP 1: Create the instance through workspaceManager
                workspaceManager.createInstance(containerRef.current, {
                    instanceId: instanceId,
                    type: 'vtk',
                });

                // STEP 2: Poll for instance to be ready
                // WorkspaceManager.createInstance() does async work internally but doesn't
                // return a promise, so we need to poll until the instance is registered
                let attempts = 0;
                const maxAttempts = 10; // Wait up to 1 second (10 attempts × 100ms)

                const checkInstanceReady = () => {
                    const instance = workspaceManager.getInstance(instanceId);

                    if (instance) {
                        // Success! Instance is ready
                        console.log(`✅ Instance ready: ${instanceId}`);

                        // STEP 3: Get tools from handler
                        const instanceTools = workspaceManager.getInstanceTools(instanceId);
                        console.log(`   Handler provided ${instanceTools.length} tools`);
                        setTools(instanceTools);

                        // STEP 4: Get header info from handler
                        const header = workspaceManager.getInstanceHeaderInfo(instanceId);
                        setHeaderInfo(header);

                        setInitialized(true);

                    } else if (attempts < maxAttempts) {
                        // Not ready yet, try again in 100ms
                        attempts++;
                        setTimeout(checkInstanceReady, 100);

                    } else {
                        // Timed out after 1 second
                        throw new Error(`Instance failed to initialize after ${maxAttempts} attempts`);
                    }
                };

                // Start checking
                checkInstanceReady();

            } catch (error) {
                console.error(`❌ Failed to initialize instance viewport:`, error);
                setError(error.message);
            }
        }

        return () => {
            // WorkspaceManager handles cleanup when we delete the instance
        };
    }, [instanceId]);

    // =========================================================================
    // DATASET LOADING
    // This happens when datasetId changes and the instance is ready
    // =========================================================================

    useEffect(() => {
        // Don't try to load if instance isn't initialized yet
        if (!initialized) return;

        // If no dataset specified, leave instance empty
        if (!datasetId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        console.log(`📊 Loading dataset ${datasetId} into instance ${instanceId}`);

        const loadDataset = async () => {
            try {
                const datasetManager = window.CIA?.datasetManager;

                if (!datasetManager) {
                    throw new Error('DatasetManager not initialized');
                }

                const dataset = datasetManager.getDataset(datasetId);

                if (!dataset) {
                    console.warn(`⚠️ Dataset ${datasetId} not found in manager`);
                    setLoading(false);
                    return;
                }

                // Check if polydata is loaded
                if (!dataset.polydata) {
                    console.log(`⏳ Dataset polydata not loaded yet, waiting for load event...`);

                    // Set up listener with correct event structure
                    const handleLoad = (eventData) => {
                        // CRITICAL FIX: eventData is an object { datasetId, dataset }
                        if (eventData && eventData.datasetId === datasetId) {
                            console.log(`✅ Dataset ${datasetId} finished loading`);

                            const updatedDataset = datasetManager.getDataset(datasetId);
                            if (updatedDataset?.polydata) {
                                workspaceManager.loadDatasetIntoInstance(
                                    instanceId,
                                    datasetId,
                                    updatedDataset.polydata
                                );

                                const newHeaderInfo = workspaceManager.getInstanceHeaderInfo(instanceId);
                                setHeaderInfo(newHeaderInfo);

                                setLoading(false);
                            }

                            // Clean up listener
                            datasetManager.off('datasetLoaded', handleLoad);
                        }
                    };

                    datasetManager.on('datasetLoaded', handleLoad);

                    // IMPORTANT: Trigger the load if it hasn't started yet
                    // This handles the case where the dataset exists but polydata isn't loaded
                    if (!dataset.polydata) {
                        console.log(`   Triggering polydata load from cache...`);
                        datasetManager.loadPolydataFromCache(datasetId).catch(error => {
                            console.error(`   Failed to load polydata:`, error);
                            setLoading(false);
                            setError(error.message);
                            datasetManager.off('datasetLoaded', handleLoad);
                        });
                    }

                    // Timeout after 30 seconds
                    setTimeout(() => {
                        datasetManager.off('datasetLoaded', handleLoad);
                        if (loading) {
                            setLoading(false);
                            setError('Dataset loading timed out after 30 seconds');
                        }
                    }, 30000);

                    return;
                }

                // Dataset is loaded, render immediately
                console.log(`📦 Loading ${dataset.polydata.getPoints().getNumberOfPoints()} points`);

                workspaceManager.loadDatasetIntoInstance(
                    instanceId,
                    datasetId,
                    dataset.polydata
                );

                const newHeaderInfo = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(newHeaderInfo);

                setLoading(false);
                console.log(`✅ Dataset loaded into instance`);

            } catch (error) {
                console.error(`❌ Failed to load dataset:`, error);
                setError(error.message);
                setLoading(false);
            }
        };

        loadDataset();
    }, [initialized, datasetId, instanceId]);

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    /**
     * Get a display-friendly name for this instance
     * Uses the dataset filename if available, otherwise shows instance ID
     */
    const getDisplayName = () => {
        if (!datasetId) {
            return `Instance ${instanceId.slice(-6)}`;
        }

        const datasetManager = window.CIA?.datasetManager;
        const dataset = datasetManager?.getDataset(datasetId);
        return dataset?.filename || `Instance ${instanceId.slice(-6)}`;
    };

    /**
     * Toggle fullscreen mode for this instance
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
     * Render a single tool from the handler
     * 
     * This function is generic - it can render any tool type that a handler
     * might provide. The handler defines the tool structure, we just render it.
     */
    const renderTool = (tool, index) => {
        // Separator - just a visual divider
        if (tool.type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}  // Use index instead of random
                    className="toolbar-separator"
                />
            );
        }

        // Menu - a dropdown with options
        if (tool.type === 'menu') {
            return (
                <div key={tool.id} className="toolbar-menu">
                    <button
                        className={`toolbar-btn ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                    >
                        {tool.icon && <span className="tool-icon">{tool.icon}</span>}
                        <span className="tool-label">{tool.label}</span>
                        <span className="menu-arrow">▼</span>
                    </button>

                    {/* Dropdown menu - would be shown on hover/click */}
                    <div className="toolbar-menu-dropdown">
                        {tool.options?.map((option) => (
                            <button
                                key={option.id}
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

        // Default: Simple button
        // THE KEY POINT: We call tool.onClick when the button is clicked
        // We don't know or care what tool.onClick does - that's the handler's business
        return (
            <button
                key={tool.id}
                onClick={tool.onClick}  // ← THIS IS THE MAGIC - handler provides the callback
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
            {/* Header - Shows instance name, stats, and actions */}
            <div className="instance-header">
                <div className="instance-title-section">
                    <h3 className="instance-title">{getDisplayName()}</h3>

                    {/* Stats from handler (e.g., point count, cell count) */}
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

                    {/* Indicators from handler (e.g., "3D View", "VR Mode") */}
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

                {/* Generic instance actions */}
                <div className="instance-actions">
                    <button
                        onClick={handleFullscreen}
                        className="action-btn"
                        title="Fullscreen"
                    >
                        <Maximize2 size={16} />
                    </button>

                    {onDuplicate && (
                        <button
                            onClick={onDuplicate}
                            className="action-btn"
                            title="Duplicate Instance"
                        >
                            <Copy size={16} />
                        </button>
                    )}

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
            {/* THIS IS WHERE THE MAGIC HAPPENS: We render whatever tools the handler gives us */}
            {initialized && tools.length > 0 && (
                <div className="instance-toolbar">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>
            )}

            {/* Viewport Container - Where the actual visualization renders */}
            <div className="viewport-wrapper">
                {/* The handler renders into this container */}
                <div
                    ref={containerRef}
                    className="viewport-container"
                    data-instance-id={instanceId}
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