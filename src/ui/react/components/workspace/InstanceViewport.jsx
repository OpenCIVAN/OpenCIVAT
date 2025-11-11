// src/ui/react/components/workspace/InstanceViewport.jsx
// Enhanced instance viewport with tools integration

import React, { useRef, useEffect, useState } from "react";
import {
    Maximize2,
    Minimize2,
    RotateCw,
    Grid,
    Palette,
    Ruler,
    Scissors,
    Pin,
    Copy,
    Trash2,
    Settings
} from "lucide-react";

import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { datasetManager } from "@Core/datasets/datasetManager.js";

export function InstanceViewport({
    instanceId,
    instanceName,
    datasetId,
    onDelete,
    onDuplicate
}) {
    const containerRef = useRef(null);
    const [initialized, setInitialized] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState(null);
    const [showControls, setShowControls] = useState(true);
    const [opacity, setOpacity] = useState(1);
    const [pointSize, setPointSize] = useState(1);
    const [colorMap, setColorMap] = useState('rainbow');
    const initOnce = useRef(false);

    // Initialize the VTK scene once
    useEffect(() => {
        if (containerRef.current && !initOnce.current) {
            initOnce.current = true;

            console.log(`🎨 Initializing enhanced instance viewport: ${instanceId}`);

            try {
                // Add instance ID to container for cursor tracking
                containerRef.current.setAttribute('data-instance-id', instanceId);
                containerRef.current.classList.add('instance-viewport');

                // Create the instance (hooks in appInitializer will enhance it)
                workspaceManager.createInstance(containerRef.current, {
                    instanceId: instanceId
                });

                setInitialized(true);
                console.log(`✅ Enhanced instance viewport initialized: ${instanceId}`);

            } catch (error) {
                console.error(`❌ Failed to initialize instance viewport:`, error);
            }
        }

        return () => {
            // Cleanup will be handled by workspaceManager
        };
    }, [instanceId]);

    // Load dataset when it changes and scene is ready
    useEffect(() => {
        if (!initialized || !datasetId) {
            setHasData(false);
            return;
        }

        setLoading(true);
        console.log(`📊 Loading dataset ${datasetId} into instance ${instanceId}`);

        const loadDataset = async () => {
            const dataset = datasetManager.getDatasetSync(datasetId);

            if (!dataset) {
                console.warn(`⚠️ Dataset ${datasetId} not found in manager`);
                setLoading(false);
                return;
            }

            if (!dataset.polydata) {
                console.warn(`⚠️ Dataset ${datasetId} has no polydata yet - waiting...`);

                // Set up a listener for when it loads
                const checkInterval = setInterval(() => {
                    const updatedDataset = datasetManager.getDatasetSync(datasetId);
                    if (updatedDataset?.polydata) {
                        clearInterval(checkInterval);
                        workspaceManager.loadDatasetIntoInstance(instanceId, datasetId, updatedDataset.polydata);
                        setHasData(true);
                        setLoading(false);
                    }
                }, 500);

                // Clean up after 30 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    setLoading(false);
                }, 30000);
                return;
            }

            try {
                console.log(`🎨 Loading ${dataset.polydata.getPoints().getNumberOfPoints()} points into instance`);
                workspaceManager.loadDatasetIntoInstance(instanceId, datasetId, dataset.polydata);
                setHasData(true);
            } catch (error) {
                console.error(`❌ Failed to load dataset:`, error);
            } finally {
                setLoading(false);
            }
        };

        loadDataset();
    }, [initialized, datasetId, instanceId]);

    // Tool handlers using the global instanceTools if available
    const callToolMethod = (methodName, ...args) => {
        if (window.CIA?.instanceTools) {
            try {
                return window.CIA.instanceTools[methodName](instanceId, ...args);
            } catch (error) {
                console.warn(`Tool method ${methodName} failed:`, error);
            }
        }
    };

    const handleResetCamera = () => {
        callToolMethod('resetCamera');
    };

    const handleSetView = (view) => {
        callToolMethod('setCameraView', view);
    };

    const handleToggleWireframe = () => {
        callToolMethod('toggleWireframe');
    };

    const handleToggleTool = (toolName) => {
        if (activeTool === toolName) {
            callToolMethod('disableAllTools');
            setActiveTool(null);
        } else {
            // Disable previous tool
            if (activeTool) {
                callToolMethod('disableAllTools');
            }

            // Enable new tool
            switch (toolName) {
                case 'distance':
                    callToolMethod('enableDistanceMeasurement');
                    break;
                case 'angle':
                    callToolMethod('enableAngleMeasurement');
                    break;
                case 'clip':
                    callToolMethod('enableClippingPlane');
                    break;
                case 'annotate':
                    if (window.CIA?.instanceCollaboration) {
                        window.CIA.instanceCollaboration.setAnnotationMode(instanceId, true);
                    }
                    break;
            }
            setActiveTool(toolName);
        }
    };

    const handleColorMapChange = (preset) => {
        setColorMap(preset);
        callToolMethod('setColorMap', preset);
    };

    const handleOpacityChange = (value) => {
        setOpacity(value);
        callToolMethod('setOpacity', value);
    };

    const handlePointSizeChange = (value) => {
        setPointSize(value);
        callToolMethod('setPointSize', value);
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

    // Get dataset name for display
    const dataset = datasetId ? datasetManager.getDatasetSync(datasetId) : null;
    const displayName = instanceName || dataset?.name || `Instance ${instanceId.slice(-6)}`;

    return (
        <div className="enhanced-instance-container">
            <div className="instance-header">
                <h3 className="instance-title">{displayName}</h3>

                <div className="instance-controls">
                    {/* View controls */}
                    <div className="control-group">
                        <button
                            onClick={handleResetCamera}
                            title="Reset Camera"
                            className="control-btn"
                        >
                            <RotateCw size={16} />
                        </button>

                        <select
                            onChange={(e) => handleSetView(e.target.value)}
                            className="control-select"
                            defaultValue=""
                        >
                            <option value="" disabled>View</option>
                            <option value="front">Front</option>
                            <option value="back">Back</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                        </select>
                    </div>

                    {/* Visualization controls */}
                    {hasData && (
                        <div className="control-group">
                            <button
                                onClick={handleToggleWireframe}
                                title="Toggle Wireframe"
                                className="control-btn"
                            >
                                <Grid size={16} />
                            </button>

                            <select
                                onChange={(e) => handleColorMapChange(e.target.value)}
                                value={colorMap}
                                className="control-select"
                                title="Color Map"
                            >
                                <option value="rainbow">Rainbow</option>
                                <option value="grayscale">Grayscale</option>
                                <option value="hot">Hot</option>
                                <option value="cool">Cool</option>
                            </select>

                            <div className="slider-container" title="Opacity">
                                <span className="slider-label">O:</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={opacity}
                                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                                    className="control-slider"
                                />
                            </div>

                            <div className="slider-container" title="Point Size">
                                <span className="slider-label">P:</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={pointSize}
                                    onChange={(e) => handlePointSizeChange(parseInt(e.target.value))}
                                    className="control-slider"
                                />
                            </div>
                        </div>
                    )}

                    {/* Tools */}
                    {hasData && window.CIA?.instanceTools && (
                        <div className="control-group">
                            <button
                                onClick={() => handleToggleTool('distance')}
                                className={`control-btn ${activeTool === 'distance' ? 'active' : ''}`}
                                title="Distance Measurement"
                            >
                                <Ruler size={16} />
                            </button>

                            <button
                                onClick={() => handleToggleTool('clip')}
                                className={`control-btn ${activeTool === 'clip' ? 'active' : ''}`}
                                title="Clipping Plane"
                            >
                                <Scissors size={16} />
                            </button>

                            <button
                                onClick={() => handleToggleTool('annotate')}
                                className={`control-btn ${activeTool === 'annotate' ? 'active' : ''}`}
                                title="Add Annotation"
                            >
                                <Pin size={16} />
                            </button>
                        </div>
                    )}

                    {/* Instance actions */}
                    <div className="control-group">
                        <button
                            onClick={handleFullscreen}
                            className="control-btn"
                            title="Fullscreen"
                        >
                            <Maximize2 size={16} />
                        </button>

                        <button
                            onClick={onDuplicate}
                            className="control-btn"
                            title="Duplicate Instance"
                        >
                            <Copy size={16} />
                        </button>

                        <button
                            onClick={onDelete}
                            className="control-btn danger"
                            title="Delete Instance"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="instance-viewport-wrapper">
                <div
                    ref={containerRef}
                    className="instance-viewport-container"
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        background: '#1a1a1a'
                    }}
                />

                {loading && (
                    <div className="instance-overlay loading">
                        <div className="loading-spinner" />
                        <p>Loading dataset...</p>
                    </div>
                )}

                {!hasData && !loading && initialized && (
                    <div className="instance-overlay empty">
                        <p>No dataset loaded</p>
                        <p className="hint">Select a file from the Files panel</p>
                    </div>
                )}

                {activeTool && (
                    <div className="tool-indicator">
                        {activeTool === 'distance' && '📏 Distance Tool'}
                        {activeTool === 'angle' && '📐 Angle Tool'}
                        {activeTool === 'clip' && '✂️ Clipping Plane'}
                        {activeTool === 'annotate' && '📍 Click to Annotate'}
                    </div>
                )}
            </div>
        </div>
    );
}