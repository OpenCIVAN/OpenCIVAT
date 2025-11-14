// src/ui/react/components/workspace/InstanceViewport.jsx
// Generic instance container with proper local/remote handling

import React, { useRef, useEffect, useState } from "react";
// Import all the Lucide icons you'll need
import {
    // Reduction & Analysis
    BarChart3,      // Dimensionality reduction, PCA, t-SNE, UMAP
    TrendingUp,     // Alternative for reduction algorithms
    GitBranch,      // Alternative for PCA (branching paths)
    Network,        // Alternative for t-SNE/UMAP (network graphs)

    // Dimensions & Geometry
    Box,            // 3D objects, 3D projection
    Square,         // 2D projection
    Layers,         // Multiple dimensions
    Maximize2,      // Fullscreen
    Minimize2,      // Minimize

    // Camera & View
    Camera,         // Camera controls
    Video,          // Alternative camera icon
    Focus,          // Camera focus/fit
    ZoomIn,         // Zoom in
    ZoomOut,        // Zoom out

    // Tools & Editing
    Scissors,       // Clipping plane
    Ruler,          // Measurements, distance
    Triangle,       // Angle measurements
    Wand2,          // Transform tools
    Move,           // Move/translate
    RotateCw,       // Rotate
    RotateCcw,      // Restore/undo/reset

    // Visibility & Display
    Eye,            // Visibility on
    EyeOff,         // Visibility off
    Sun,            // Brightness/lighting
    Palette,        // Color mapping
    Contrast,       // Contrast adjustment

    // Annotations & Communication
    MessageSquare,  // Annotations, comments
    Plus,           // Add annotation
    Edit3,          // Edit annotation
    Trash2,         // Delete

    // Data & Files
    Database,       // Dataset
    FileText,       // File info
    Download,       // Export
    Upload,         // Import

    // Actions
    Play,           // Start/apply
    Pause,          // Pause
    RefreshCw,      // Refresh/reload
    Check,          // Confirm/done
    X,              // Cancel/close

    // Indicators
    ChevronDown,    // Dropdown menu indicator
    ChevronRight,   // Expand
    Info,           // Information
    AlertCircle,    // Warning/error
    Settings,       // Settings/properties
    Sliders,        // Properties/adjustments
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
     * Master icon mapping for all tools
     * Maps string IDs to Lucide React components
     *
     * NAMING CONVENTION:
     * - Use descriptive IDs like 'reduction', 'pca', 'camera-reset'
     * - Keep IDs consistent across features
     * - Document alternatives in comments
     */
    const TOOL_ICON_MAP = {
        // ========================================================================
        // DIMENSIONALITY REDUCTION
        // ========================================================================
        'reduction': BarChart3,          // Main reduction menu
        'pca': TrendingUp,               // PCA - shows upward trend/linear
        'tsne': Network,                 // t-SNE - shows network/clustering  
        'umap': Network,                 // UMAP - shows network/manifold
        'restore': RotateCcw,            // Restore original data

        // ========================================================================
        // DIMENSIONS & PROJECTIONS
        // ========================================================================
        'dimensions': Layers,            // Dimension selector menu
        'dimension-2d': Square,          // 2D projection
        'dimension-3d': Box,             // 3D projection
        'toggle-2d-3d': Layers,          // Toggle between 2D/3D

        // ========================================================================
        // CAMERA CONTROLS
        // ========================================================================
        'camera': Camera,                // Camera menu
        'camera-reset': Focus,           // Reset camera to fit all
        'camera-top': Camera,            // Top view
        'camera-front': Camera,          // Front view
        'camera-side': Camera,           // Side view
        'camera-isometric': Camera,      // Isometric view
        'zoom-in': ZoomIn,               // Zoom in
        'zoom-out': ZoomOut,             // Zoom out

        // ========================================================================
        // ANALYSIS TOOLS
        // ========================================================================
        'clipping': Scissors,            // Clipping plane
        'clip-x': Scissors,              // Clip X axis
        'clip-y': Scissors,              // Clip Y axis
        'clip-z': Scissors,              // Clip Z axis

        'measurements': Ruler,           // Measurements menu
        'measure-distance': Ruler,       // Distance measurement
        'measure-angle': Triangle,       // Angle measurement
        'measure-area': Square,          // Area measurement

        // ========================================================================
        // TRANSFORM TOOLS
        // ========================================================================
        'transform': Wand2,              // Transform menu
        'translate': Move,               // Move/translate
        'rotate': RotateCw,              // Rotate
        'scale': Maximize2,              // Scale

        // ========================================================================
        // VISIBILITY & DISPLAY
        // ========================================================================
        'visibility': Eye,               // Visibility menu
        'show': Eye,                     // Show object
        'hide': EyeOff,                  // Hide object
        'lighting': Sun,                 // Lighting controls
        'colormap': Palette,             // Color mapping
        'contrast': Contrast,            // Contrast adjustment
        'wireframe': Box,                // Wireframe mode
        'solid': Box,                    // Solid mode

        // ========================================================================
        // ANNOTATIONS
        // ========================================================================
        'annotations': MessageSquare,    // Annotations menu
        'add-annotation': Plus,          // Add new annotation
        'edit-annotation': Edit3,        // Edit annotation
        'delete-annotation': Trash2,     // Delete annotation

        // ========================================================================
        // DATA & EXPORT
        // ========================================================================
        'dataset-info': Database,        // Dataset information
        'file-info': FileText,           // File metadata
        'export': Download,              // Export view/data
        'import': Upload,                // Import data

        // ========================================================================
        // PROPERTIES & SETTINGS
        // ========================================================================
        'properties': Sliders,           // Properties panel
        'settings': Settings,            // Settings menu
        'info': Info,                    // Information

        // ========================================================================
        // ACTIONS
        // ========================================================================
        'apply': Check,                  // Apply changes
        'cancel': X,                     // Cancel
        'refresh': RefreshCw,            // Refresh/reload
        'fullscreen': Maximize2,         // Fullscreen mode
        'minimize': Minimize2,           // Exit fullscreen
        'delete': Trash2,                // Delete instance

        // ========================================================================
        // FALLBACK
        // ========================================================================
        'default': Box,                  // Default icon for unmapped tools
    };

    // ============================================================================
    // ICON SELECTION GUIDE FOR FEATURE DEVELOPERS
    // ============================================================================

    /*
    WHEN CHOOSING ICONS FOR YOUR FEATURE:
    
    1. **Check the map first** - Use existing mappings when possible
    2. **Be semantic** - Icon should represent the action/concept
    3. **Be consistent** - Similar tools should use similar icons
    4. **Add new mappings** - If you need a new icon, add it to TOOL_ICON_MAP
    
    GOOD PRACTICES:
    
    ✅ Use TrendingUp for PCA (linear trend)
    ✅ Use Network for t-SNE/UMAP (network/manifold)
    ✅ Use Focus for "reset camera" (focusing)
    ✅ Use Layers for dimension selector (multiple layers)

    AVOID:

    ❌ Using random icons that don't relate to the action
    ❌ Using same icon for very different actions
    ❌ Forgetting to add your icon to the map

    EXAMPLES OF GOOD ICON CHOICES:

    - Analysis/Stats: BarChart3, TrendingUp, PieChart
    - Geometry: Box (3D), Square (2D), Circle, Triangle
    - Actions: Play, Pause, RefreshCw, Check, X
    - View: Eye, Camera, Focus, ZoomIn, ZoomOut
    - Edit: Edit3, Wand2, Move, RotateCw, Scissors
    - Organization: Layers, Folder, File, Database
    */

    /**
     * Get Lucide icon component for a tool
     *
     * @param {string} toolId - The tool's ID
     * @param {string} toolIcon - Optional explicit icon ID from tool definition
     * @returns {React.Component} Lucide icon component
     */
    const getToolIcon = (toolId, toolIcon) => {
        // Priority 1: Explicit icon provided by tool
        if (toolIcon && TOOL_ICON_MAP[toolIcon]) {
            return TOOL_ICON_MAP[toolIcon];
        }

        // Priority 2: Map by tool ID
        if (TOOL_ICON_MAP[toolId]) {
            return TOOL_ICON_MAP[toolId];
        }

        // Priority 3: Default fallback
        console.warn(`⚠️ No icon mapping for tool: ${toolId}, using default`);
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
    // ============================================================================
    // SIMPLIFIED renderTool - Lucide Icons Only
    // Replace the renderTool function in InstanceViewport.jsx
    // ============================================================================

    /**
     * Render a tool from the handler as an icon button with tooltip
     * 
     * SIMPLIFIED: Only handles Lucide React components (no emoji/text logic)
     * 
     * Handles three types of tools:
     * 1. Separator - visual divider between tool groups
     * 2. Menu - dropdown menu with multiple options  
     * 3. Button - simple click action
     */
    const renderTool = (tool, index) => {
        // ========================================================================
        // TYPE 1: SEPARATOR
        // ========================================================================
        if (tool.type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}
                    className="toolbar-separator"
                />
            );
        }

        // Get the Lucide icon component
        const IconComponent = getToolIcon(tool.id, tool.icon);

        // ========================================================================
        // TYPE 2: MENU (dropdown with options)
        // ========================================================================
        if (tool.type === 'menu') {
            return (
                <div key={tool.id || `menu-${index}`} className="toolbar-menu">
                    <button
                        className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                        aria-haspopup="true"
                    >
                        {/* Main icon */}
                        <IconComponent size={18} strokeWidth={2} />

                        {/* Dropdown indicator */}
                        <ChevronDown size={10} className="menu-indicator" />

                        {/* Tooltip */}
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
                    {tool.options && tool.options.length > 0 && (
                        <div className="toolbar-menu-dropdown">
                            {tool.options.map((option, optIndex) => {
                                // Handle separators in dropdown
                                if (option.type === 'separator') {
                                    return (
                                        <div
                                            key={`menu-sep-${optIndex}`}
                                            className="menu-separator"
                                        />
                                    );
                                }

                                // Get option icon
                                const OptionIcon = getToolIcon(option.id, option.icon);

                                return (
                                    <button
                                        key={option.id || `option-${optIndex}`}
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
                                        {/* Option icon */}
                                        <OptionIcon size={14} className="option-icon" />

                                        {/* Option text */}
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
                    )}
                </div>
            );
        }

        // ========================================================================
        // TYPE 3: SIMPLE BUTTON
        // ========================================================================
        return (
            <button
                key={tool.id || `tool-${index}`}
                onClick={tool.onClick}
                className={`toolbar-icon-btn ${tool.active ? 'active' : ''}`}
                disabled={tool.disabled}
                aria-label={tool.label}
                title={tool.label}
            >
                {/* Icon */}
                <IconComponent size={18} strokeWidth={2} />

                {/* Tooltip */}
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

    // ============================================================================
    // USAGE NOTES FOR CONTRIBUTORS
    // ============================================================================

    /*
    IF YOU'RE ADDING A NEW FEATURE:

    1. Return tools from your feature's getTools() method:
       {
           id: 'my-tool',
           icon: 'my-icon-id',  // String ID that maps to Lucide component
           label: 'My Tool',
           onClick: () => myAction()
       }

    2. Add your icon to TOOL_ICON_MAP in InstanceViewport.jsx:
       const TOOL_ICON_MAP = {
           ...existing mappings,
           'my-icon-id': SomeLucideIcon,
       }

    3. That's it! The rendering layer handles everything else.

    EXAMPLE - Adding a "Filter" feature:

    In your FilterFeature.js:
    ```javascript
    getTools(instanceId) {
        return [
            {
                id: 'filter-range',
                icon: 'filter',  // Will map to Filter from lucide-react
                label: 'Filter by Range',
                onClick: () => this.openFilterDialog(instanceId)
            }
        ];
    }
    ```

    In InstanceViewport.jsx:
    ```javascript
    import { Filter } from 'lucide-react';

    const TOOL_ICON_MAP = {
        ...existing,
        'filter': Filter,
    }
    ```

    Done! Your feature now has a consistent, professional icon.
    */




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