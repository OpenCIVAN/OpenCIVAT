// src/core/instances/types/vtk/VTKInstanceHandler.js
// Complete VTK handler implementation with proper interface

import { InstanceTypeHandler } from "@Core/instances/types/InstanceTypeInterface.js";
import { ViewStateAdapter } from "@Core/instances/ViewStateAdapter.js";
import { instanceTools } from "@VTK/vtkInstanceTools.js";
import { VTKReductionFeature } from "@VTK/features/VTKReductionFeature";
import { vtkOrientationWidget } from "@VTK/widgets/orientation/VTKOrientationWidget";
import { vtkInstanceCursors } from "@VTK/collaboration/VTKInstanceCursors.js";
import { viewConfigurationManager } from "@Init/appInitializer.js";

import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import "@kitware/vtk.js/Rendering/Profiles/Geometry";

/**
 * VTKInstanceHandler
 *
 * Reference implementation of the InstanceTypeHandler interface.
 * This handler manages VTK.js-based 3D visualization instances.
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Lazy initialization - Don't create WebGL context until data loads
 * 2. Clean separation - VTK logic stays in this handler, never leaks to core
 * 3. Complete interface - Implements ALL methods from InstanceTypeHandler
 * 4. Single source of truth - getSupportedFileTypes() declares all capabilities
 * 5. Handler-owned parsing - VTK-specific file parsing lives here, not in DatasetManager
 */
export class VTKInstanceHandler extends InstanceTypeHandler {
  constructor() {
    super();
    this.instances = new Map(); // instanceId -> instance data
    this.reductionFeature = new VTKReductionFeature();
    this._isApplyingRemoteState = false;
  }

  // ===========================================================================
  // REQUIRED INTERFACE METHODS
  // ===========================================================================

  /**
   * Return the unique type identifier
   */
  getType() {
    return "vtk";
  }

  /**
   * Return human-readable display name
   */
  getDisplayName() {
    return "VTK 3D Visualization";
  }

  /**
   * SINGLE SOURCE OF TRUTH: Declare all file types this handler supports
   *
   * This replaces the scattered capability checks throughout the old code.
   * Now there's one place to add support for new formats, and all the
   * capability queries (canHandle, canExtractMetadata, etc.) automatically work.
   */
  getSupportedFileTypes() {
    return [
      {
        extension: "vtp",
        mimeType: "application/vnd.vtk.polydata+xml",
        displayName: "VTK PolyData (XML)",
        capabilities: {
          canRender: true,
          canExtractMetadata: true, // We can read XML headers quickly
          canExport: false,
        },
        priority: 10,
      },
      {
        extension: "vti",
        mimeType: "application/vnd.vtk.imagedata+xml",
        displayName: "VTK Image Data (XML)",
        capabilities: {
          canRender: true,
          canExtractMetadata: true,
          canExport: false,
        },
        priority: 10,
      },
      {
        extension: "vtu",
        mimeType: "application/vnd.vtk.unstructuredgrid+xml",
        displayName: "VTK Unstructured Grid (XML)",
        capabilities: {
          canRender: true,
          canExtractMetadata: true,
          canExport: false,
        },
        priority: 10,
      },
      {
        extension: "vtk",
        mimeType: "application/vnd.vtk",
        displayName: "VTK Legacy Format",
        capabilities: {
          canRender: true,
          canExtractMetadata: false, // Legacy format is harder to parse quickly
          canExport: false,
        },
        priority: 8, // Lower priority than XML formats
      },
      {
        extension: "stl",
        mimeType: "model/stl",
        displayName: "STL Model",
        capabilities: {
          canRender: true,
          canExtractMetadata: false, // Could implement later
          canExport: false,
        },
        priority: 5,
      },
    ];
  }

  /**
   * Initialize a new VTK instance with LAZY rendering
   */
  async initialize(containerElement, options = {}) {
    const { instanceId, datasetId, viewConfigId } = options;

    console.log(
      `🎨 VTK Handler: Initializing instance ${instanceId} (lazy mode)`
    );

    const stateAdapter = new ViewStateAdapter(instanceId, "vtk");
    console.log(`📡 Created stateAdapter for ${instanceId}`);

    const instanceData = {
      instanceId,
      container: containerElement,
      datasetId,
      viewConfigId,
      stateAdapter,

      // VTK objects will be created lazily
      sceneObjects: null,
      renderer: null,
      renderWindow: null,
      glWindow: null,
      interactor: null,
      camera: null,

      initialized: false,
      hasData: false,

      // Tool state managed by this handler
      activeTools: new Set(), // Track which tools are active

      // DON'T create actors/widgets here - let vtkInstanceTools handle it
      actors: new Map(),
      widgets: new Map(),
      annotations: new Map(),
      cursors: new Map(),
    };

    this.instances.set(instanceId, instanceData);

    // Create placeholder
    const placeholder = document.createElement("div");
    placeholder.className = "vtk-placeholder";
    placeholder.style.cssText = `
        width: 100%; height: 100%; display: flex; align-items: center;
        justify-content: center; background: #1a1a1a; color: #666;
        font-family: system-ui, -apple-system, sans-serif;
    `;
    placeholder.innerHTML = "<div>Ready for data...</div>";
    containerElement.appendChild(placeholder);
    instanceData.placeholder = placeholder;

    vtkInstanceCursors.setupInstanceCursors(
      instanceData.instanceId,
      containerElement
    );
    console.log(`✅ Cursors initialized for ${instanceData.instanceId}`);

    console.log(`✅ VTK instance ${instanceId} created (awaiting data)`);
    return instanceData;
  }

  /**
   * Clean up instance resources
   */
  async cleanup(instanceData) {
    const { instanceId } = instanceData;

    console.log(`🧹 VTK Handler: Cleaning up instance ${instanceId}`);

    // CLEAN UP FEATURES FIRST (before sceneObjects are destroyed)
    await this.reductionFeature.cleanup(instanceId);
    vtkOrientationWidget.cleanup(instanceId);

    vtkInstanceCursors.cleanupInstance(instanceId);
    console.log(`✅ Cursors cleaned up for ${instanceId}`);

    // Clean up instance tools
    instanceTools.cleanupTools(instanceId);

    // Clean up the state adapter
    if (instanceData.stateAdapter) {
      instanceData.stateAdapter.destroy();
    }

    // Only clean up if VTK was initialized
    if (instanceData.initialized && instanceData.sceneObjects) {
      // Clean up resize observer
      if (instanceData.resizeObserver) {
        instanceData.resizeObserver.disconnect();
      }

      // Clean up VTK objects
      const { openGLRenderWindow, interactor, renderWindow } =
        instanceData.sceneObjects;

      if (interactor) {
        interactor.unbindEvents();
      }

      if (openGLRenderWindow) {
        openGLRenderWindow.delete();
      }

      if (renderWindow) {
        renderWindow.delete();
      }
    }

    // Remove placeholder if it exists
    if (instanceData.placeholder) {
      instanceData.placeholder.remove();
    }

    // Clear container
    if (instanceData.container) {
      instanceData.container.innerHTML = "";
    }

    // Remove from instances map
    this.instances.delete(instanceId);

    console.log(`✅ Instance ${instanceId} cleaned up`);
  }

  /**
   * Load data into this VTK instance
   *
   * This method handles both the initial pipeline setup (if needed) and the
   * actual data loading. The lazy initialization pattern means we don't create
   * the expensive WebGL context until we actually have data to display.
   */
  // src/core/instances/types/vtk/VTKInstanceHandler.js
  // This is the SIMPLIFIED version - no file type extraction needed!

  /**
   * Load data into this VTK instance (SIMPLIFIED)
   *
   * Notice how much cleaner this is - we simply trust that dataset.fileType
   * is populated and ready to use. No extraction, no parsing filename strings.
   *
   * This is the power of properly architected data layers: each layer does its
   * job once, stores the result, and subsequent layers just read what they need.
   */
  async loadData(instanceData, dataset, data) {
    const { instanceId } = instanceData;

    console.log(
      `📊 VTK Handler: Loading dataset ${dataset.id} into instance ${instanceId}`
    );

    // Validate file type
    const fileType = dataset.fileType;

    if (!fileType) {
      throw new Error(
        `Dataset ${dataset.filename} is missing fileType property. ` +
          `This indicates a bug in dataset creation.`
      );
    }

    console.log(`  📋 File type: ${fileType}`);

    if (!this.canHandle(fileType)) {
      const supported = this.getSupportedFileTypes()
        .filter((t) => t.capabilities.canRender)
        .map((t) => t.extension.toUpperCase())
        .join(", ");

      throw new Error(
        `VTK handler cannot display ${fileType.toUpperCase()} files. ` +
          `Supported formats: ${supported}`
      );
    }

    // Get the dataset manager
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager) {
      throw new Error("DatasetManager not available");
    }

    // Check if we have cached parsed data
    let polydata;
    const cached = datasetManager.getCachedParsedData(dataset.id, "vtk");

    if (cached) {
      console.log(`  ✓ Using cached VTK polydata`);
      polydata = cached.data;
    } else {
      console.log(`  ⏳ Parsing ${fileType.toUpperCase()} file...`);

      // Try to get the raw file
      let rawFile = datasetManager.getRawFile(dataset.id);

      // If rawFile is null, try to fetch it
      if (!rawFile) {
        console.log(`  📥 Raw file not in memory, attempting to fetch...`);

        // Try public path first (for samples)
        if (dataset.publicPath) {
          console.log(`  🌐 Fetching from public path: ${dataset.publicPath}`);

          try {
            // Update status to show we're fetching
            dataset.setFileStatus("fetching");
            datasetManager._emit("datasetUpdated", dataset);

            const response = await fetch(dataset.publicPath);

            if (!response.ok) {
              throw new Error(
                `Failed to fetch ${dataset.filename}: ${response.status} ${response.statusText}`
              );
            }

            const blob = await response.blob();
            rawFile = new File([blob], dataset.filename, {
              type: "application/octet-stream",
            });

            // Store it back in the dataset for future use
            dataset.setFileStatus("available", rawFile);

            // Also store in cache so we don't fetch again
            try {
              await datasetManager.storageProvider.storeFile(rawFile);
              console.log(`  ✓ File fetched and cached successfully`);
            } catch (cacheError) {
              console.warn(`  ⚠️ File fetched but caching failed:`, cacheError);
              // Continue anyway - we have the file in memory
            }

            // Notify that dataset was updated
            datasetManager._emit("datasetUpdated", dataset);
          } catch (fetchError) {
            dataset.setFileStatus("fetch-failed");
            datasetManager._emit("datasetUpdated", dataset);

            throw new Error(
              `Failed to fetch ${dataset.filename} from ${dataset.publicPath}: ${fetchError.message}`
            );
          }
        } else {
          // No public path - mark as needing upload
          dataset.setFileStatus("needs-upload");
          datasetManager._emit("datasetUpdated", dataset);

          throw new Error(
            `Dataset ${dataset.filename} is not available. ` +
              `The file was loaded in a previous session and is no longer in cache. ` +
              `Please re-upload this file to visualize it.`
          );
        }
      }

      // Now we should have rawFile - parse it
      if (!rawFile) {
        throw new Error(`Failed to obtain file for ${dataset.filename}`);
      }

      // Parse the file
      polydata = await this.parseVTKFile(rawFile);

      // Extract metadata for caching
      const bounds = polydata.getBounds();
      const metadata = {
        pointCount: polydata.getPoints().getNumberOfPoints(),
        cellCount: polydata.getPolys().getNumberOfCells(),
        bounds: {
          xMin: bounds[0],
          xMax: bounds[1],
          yMin: bounds[2],
          yMax: bounds[3],
          zMin: bounds[4],
          zMax: bounds[5],
        },
      };

      // Cache the parsed data for reuse
      datasetManager.cacheParsedData(dataset.id, "vtk", polydata, metadata);

      console.log(`  ✓ Parsed and cached`);
      console.log(`    Points: ${metadata.pointCount.toLocaleString()}`);
    }

    // Initialize VTK pipeline if this is the first data load
    if (!instanceData.sceneObjects) {
      console.log(`  🎨 First data load - initializing VTK pipeline...`);

      // DIAGNOSTIC: Check if stateAdapter exists before initializing pipeline
      if (!instanceData.stateAdapter) {
        console.error(
          "❌ CRITICAL: stateAdapter missing before pipeline init!"
        );
        console.log("instanceData keys:", Object.keys(instanceData));
      }

      const pipelineObjects = this._initializeVTKPipeline(instanceData);
      instanceData.sceneObjects = pipelineObjects;
      instanceData.initialized = true;

      // Remove the placeholder now that we have real rendering
      if (instanceData.placeholder) {
        instanceData.placeholder.remove();
        instanceData.placeholder = null;
      }
    }

    const { renderer, renderWindow, mapper, actor } = instanceData.sceneObjects;

    // Load the geometry
    mapper.setInputData(polydata);

    // Add actor if not already in scene
    const actorsInScene = renderer.getActors();
    if (!actorsInScene.includes(actor)) {
      renderer.addActor(actor);
    }

    // Mark that we have data
    instanceData.hasData = true;

    // Initialize reduction feature (needs sceneObjects)
    await this.reductionFeature.initialize(instanceId, {
      sceneObjects: instanceData.sceneObjects,
    });

    // Initialize orientation widget (starts enabled by default)
    vtkOrientationWidget.initialize(instanceId, instanceData.sceneObjects, {
      enabled: true,
      corner: "BOTTOM_RIGHT",
      viewportSize: 0.1,
      minPixelSize: 80,
      maxPixelSize: 280,
    });

    // Mark that orientation is active in instanceTools
    instanceTools.initializeOrientationWidget(instanceId);

    console.log(`✅ Features initialized for instance ${instanceId}`);

    // Position camera and render
    renderer.resetCamera();
    renderWindow.render();

    // Emit event so React knows tools are now available
    console.log(
      `📢 Emitting tools-updated event after pipeline initialization`
    );
    this._emitToolsUpdate(instanceId);

    console.log(`✅ VTK Handler: Dataset loaded and rendered`);
  }

  /**
   * Parse a VTK format file into polydata
   * This is VTK-specific logic that belongs in the VTK handler, not DatasetManager
   */
  async parseVTKFile(file) {
    const arrayBuffer = await file.arrayBuffer();

    // Use appropriate reader based on file type
    const reader = vtkXMLPolyDataReader.newInstance();
    reader.parseAsArrayBuffer(arrayBuffer);

    const polydata = reader.getOutputData(0);

    if (!polydata) {
      throw new Error("Failed to parse VTK file - no output data");
    }

    return polydata;
  }

  // ===========================================================================
  // CAPABILITY METHODS
  // These now use the interface defaults that query getSupportedFileTypes()
  // ===========================================================================

  /**
   * NOTE: We removed the custom canExtractMetadata() implementation!
   *
   * The interface provides a default implementation that queries
   * getSupportedFileTypes(), so we don't need to override it.
   * The interface method will automatically return true for vtp/vti/vtu
   * and false for vtk/stl based on our capability declarations above.
   */

  /**
   * NOTE: We removed the custom canHandle() implementation too!
   *
   * Same reason - the interface provides this as a convenience method.
   * It queries getSupportedFileTypes() and checks the canRender capability.
   */

  /**
   * Check if this handler can work with a specific dataset object
   *
   * This is different from canHandle() because it operates on dataset objects
   * rather than just file extensions. The default implementation just calls
   * canHandle(dataset.fileType), which is perfect for VTK, so we can actually
   * remove this method entirely and use the interface default.
   *
   * I'm leaving it here commented out to show that we COULD override it if
   * we needed more sophisticated logic (like checking file size or metadata).
   */
  // canHandleDataset(dataset) {
  //   // Use the default from interface which calls this.canHandle(dataset.fileType)
  //   return super.canHandleDataset(dataset);
  // }

  /**
   * Extract metadata from VTK files by reading just the headers
   * This is much faster than full parsing because we don't process all the data
   *
   * NOTE: The interface's canExtractMetadata() will check if we can extract
   * metadata for a given file type before calling this method. We don't need
   * to check capabilities again here - just do the extraction.
   */
  async extractMetadata(file, fileType) {
    console.log(`📋 VTK Handler: Extracting metadata from ${fileType} file`);

    try {
      // For VTK XML formats (VTP, VTI, VTU), we can read the XML header
      // without parsing all the point data
      if (["vtp", "vti", "vtu"].includes(fileType.toLowerCase())) {
        return await this._extractXMLMetadata(file);
      }

      // For legacy VTK format, we'd read the binary header
      // This is marked as canExtractMetadata: false in our declarations,
      // so this code path shouldn't actually be reached. But we'll keep
      // it as a fallback.
      if (fileType.toLowerCase() === "vtk") {
        return await this._extractLegacyVTKMetadata(file);
      }

      return null;
    } catch (error) {
      console.warn(
        `⚠️ VTK Handler: Could not extract metadata:`,
        error.message
      );
      return null;
    }
  }

  // ===========================================================================
  // UI INTEGRATION METHODS
  // ===========================================================================

  /**
   * Helper: Check if instance has valid data for operations
   */
  _getInstanceCapabilities(instanceData) {
    const instanceId = instanceData.instanceId;
    const instanceState = this.instances.get(instanceId);

    // CRITICAL: Check if instance is initialized AND has data
    // During initialization, these will be false, so all buttons disabled
    // After data loads, these become true, toolbar refreshes, buttons enable
    const isInitialized = instanceData?.initialized || false;
    const hasData = instanceData?.hasData || false;

    // Only check for data details if we're initialized with data
    if (!isInitialized || !hasData) {
      return {
        hasData: false,
        hasScalarData: false,
        hasGeometry: false,
        canUseColormap: false,
        canUseMeasurement: false,
        canUseClipping: false,
        canUseWidgets: false,
      };
    }

    // Now we know we have initialized VTK with data, safe to check details
    let hasScalarData = false;
    let hasGeometry = false;

    if (instanceState?.sceneObjects?.mapper) {
      try {
        const mapper = instanceState.sceneObjects.mapper;
        const inputData = mapper.getInputData();

        if (inputData) {
          // Check for scalar data
          const pointData = inputData.getPointData();
          const scalars = pointData?.getScalars();
          hasScalarData = scalars !== null && scalars !== undefined;

          // Check for geometry
          const points = inputData.getPoints();
          hasGeometry =
            points !== null &&
            points !== undefined &&
            points.getNumberOfPoints() > 0;
        }
      } catch (error) {
        console.warn("Error checking data capabilities:", error);
        hasScalarData = false;
        hasGeometry = false;
      }
    }

    return {
      hasData: true,
      hasScalarData,
      hasGeometry,
      canUseColormap: hasScalarData,
      canUseMeasurement: hasGeometry,
      canUseClipping: hasGeometry,
      canUseWidgets: hasGeometry,
    };
  }

  /**
   * Get tools for this instance type
   * Returns dynamic tools based on instance statet
   *
   * @param {Object} instanceData - Complete instance data object
   * @returns {Array<Object>} Tool definitions for toolbar
   */
  getTools(instanceData) {
    if (!instanceData) return [];

    const instanceId = instanceData.instanceId;
    const tools = [];

    // 🆕 GET INSTANCE CAPABILITIES
    const caps = this._getInstanceCapabilities(instanceData);

    // ========================================================================
    // CAMERA VIEWS MENU
    // ========================================================================
    tools.push({
      id: "views",
      type: "menu",
      icon: "camera",
      label: "Views",
      description: "Standard camera views",
      disabled: !caps.hasData,
      options: [
        // =======================================================================
        // ✅ NEW: Camera Grid Component
        // =======================================================================
        {
          type: "camera-grid",
          id: "camera-grid-main",
          disabled: !caps.hasData,
          // Define all views with proper structure
          views: [
            // Row 1: Top row
            {
              id: "top",
              label: "Top",
              icon: "camera",
            },
            {
              id: "isometric",
              label: "Iso",
              icon: "box",
              special: true, // Special styling for isometric view
            },
            // null creates empty cell in top-right

            // Row 2: Middle row
            {
              id: "left",
              label: "Left",
              icon: "square",
            },
            {
              id: "reset",
              label: "Reset",
              icon: "maximize-2",
              special: true, // Special styling for reset
            },
            {
              id: "right",
              label: "Right",
              icon: "square",
            },

            // Row 3: Bottom row
            {
              id: "bottom",
              label: "Bottom",
              icon: "camera",
            },
            {
              id: "front",
              label: "Front",
              icon: "camera",
            },
            {
              id: "back",
              label: "Back",
              icon: "camera",
            },
          ],
          // Single callback handles all views
          onViewSelect: (viewId) => {
            if (!caps.hasData) return;

            // Handle reset separately
            if (viewId === "reset") {
              instanceTools.resetCamera(instanceId);
            } else {
              // All other views use setCameraView
              instanceTools.setCameraView(instanceId, viewId);
            }

            // Trigger re-render
            this._emitToolsUpdate(instanceId);

            console.log(`📷 Camera switched to: ${viewId}`);
          },
        },
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // MEASUREMENT WIDGETS MENU (Following plugin pattern)
    // ========================================================================
    const lineActive =
      instanceTools.isWidgetActive?.(instanceId, "line") || false;
    const angleActive =
      instanceTools.isWidgetActive?.(instanceId, "angle") || false;
    const planeActive =
      instanceTools.isWidgetActive?.(instanceId, "plane") || false;

    tools.push({
      id: "widgets",
      type: "menu",
      icon: "transform",
      label: "Widgets",
      description: caps.canUseWidgets
        ? "Interactive measurement and manipulation tools"
        : "Widgets require loaded geometry",
      disabled: !caps.canUseWidgets,
      options: [
        {
          id: "widget-line",
          icon: "ruler",
          label: "Line Measurement",
          description: "Measure distance between two points",
          active: lineActive,
          disabled: !caps.canUseMeasurement,
          onClick: () => {
            console.log("🎯 Line measurement clicked");
            // FIX: Use correct method name
            instanceTools.toggleRulerMeasurement?.(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "widget-angle",
          icon: "triangle",
          label: "Angle Measurement",
          description: "Measure angle between three points",
          active: angleActive,
          disabled: !caps.canUseMeasurement,
          onClick: () => {
            console.log("🎯 Angle measurement clicked");
            // FIX: Use correct method name
            instanceTools.toggleAngleMeasurement?.(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "widget-clip",
          icon: "scissors",
          label: "Clipping Plane",
          description: "Cut away parts of the data",
          active: planeActive,
          disabled: !caps.canUseClipping,
          onClick: () => {
            console.log("🎯 Clipping plane clicked");
            instanceTools.toggleClippingPlane?.(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        {
          id: "clear-widgets",
          icon: "x",
          label: "Clear All Widgets",
          description: "Remove all active widgets",
          disabled: !caps.canUseWidgets,
          onClick: () => {
            console.log("🎯 Clear all widgets clicked");
            // Clean up all widgets
            instanceTools.toggleRulerMeasurement?.(instanceId); // Disable if active
            instanceTools.toggleAngleMeasurement?.(instanceId); // Disable if active
            instanceTools.toggleClippingPlane?.(instanceId); // Disable if active
            this._emitToolsUpdate(instanceId);
          },
        },
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // DIMENSIONALITY REDUCTION MENU (Feature pattern)
    // ========================================================================
    const reductionState = this.reductionFeature.getState(instanceId);
    const hasReduction = this.reductionFeature.hasReduction(instanceId);
    const currentMethod = reductionState?.method || null;
    const currentComponents = hasReduction
      ? this.reductionFeature.getCurrentComponents(instanceId)
      : null;

    tools.push({
      id: "reduction",
      type: "menu",
      icon: "layers",
      label: "Dimensionality Reduction",
      description: "Reduce high-dimensional data for visualization",
      disabled: !caps.hasData, // 🆕 Disable if no data
      active: hasReduction,
      disabled: !caps.hasData, // 🆕 Individual disable
      options: [
        {
          id: "pca",
          icon: "trend",
          label: "PCA",
          description: "Principal Component Analysis",
          active: currentMethod === "pca",
          onClick: async () => {
            console.log("🎯 PCA clicked");
            await this.reductionFeature.toggleReduction(instanceId, "pca");
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "tsne",
          icon: "network",
          label: "t-SNE",
          description: "t-Distributed Stochastic Neighbor Embedding",
          active: currentMethod === "tsne",
          disabled: !caps.hasData, // 🆕 Individual disable
          onClick: async () => {
            console.log("🎯 t-SNE clicked");
            await this.reductionFeature.toggleReduction(instanceId, "tsne");
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "umap",
          icon: "network",
          label: "UMAP",
          description: "Uniform Manifold Approximation and Projection",
          active: currentMethod === "umap",
          disabled: !caps.hasData, // 🆕 Individual disable
          onClick: async () => {
            console.log("🎯 UMAP clicked");
            await this.reductionFeature.toggleReduction(instanceId, "umap");
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        {
          id: "dimension-2d",
          icon: "square",
          label: "2D Projection",
          description: "Reduce to 2 dimensions",
          active: hasReduction && currentComponents === 2,
          disabled: !hasReduction,
          onClick: async () => {
            console.log("🎯 2D projection clicked");
            await this.reductionFeature.setComponents(instanceId, 2);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "dimension-3d",
          icon: "cube",
          label: "3D Projection",
          description: "Reduce to 3 dimensions",
          active: hasReduction && currentComponents === 3,
          disabled: !hasReduction,
          onClick: async () => {
            console.log("🎯 3D projection clicked");
            await this.reductionFeature.setComponents(instanceId, 3);
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        {
          id: "restore",
          icon: "refresh",
          label: "Restore Original",
          description: "Remove dimensionality reduction",
          disabled: !hasReduction,
          onClick: async () => {
            console.log("🎯 Restore original clicked");
            await this.reductionFeature.restoreOriginal(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // 🆕 APPEARANCE MENU - Representation & Opacity
    // ========================================================================
    // Get current values with safe defaults
    const currentOpacity = caps.hasData
      ? instanceTools.getOpacity(instanceId)
      : 1.0; // ✅ 1.0 = 100% opacity

    const currentRepresentation = caps.hasData
      ? instanceTools.getRepresentation(instanceId)
      : "surface";

    const currentPointSize = caps.hasData
      ? instanceTools.getPointSize?.(instanceId) || 5
      : 5;

    const currentLineWidth = caps.hasData
      ? instanceTools.getLineWidth?.(instanceId) || 2
      : 2;

    tools.push({
      id: "appearance",
      type: "menu",
      icon: "eye",
      label: "Appearance",
      description: "Visual properties",
      disabled: !caps.hasData,
      options: [
        // Opacity slider with presets
        {
          type: "slider-with-presets",
          id: "opacity-slider",
          icon: "circle",
          label: "Opacity",
          value: currentOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          formatValue: (val) => `${Math.round(val * 100)}%`,
          presets: [0, 0.25, 0.5, 0.75, 1.0],
          disabled: !caps.hasData,
          disabledReason: caps.hasData
            ? undefined
            : "Load data to adjust opacity",
          onChange: (value) => {
            if (!caps.hasData) return;
            instanceTools.setOpacity?.(instanceId, value);
            this._emitToolsUpdate(instanceId);
          },
        },

        { type: "separator" },

        { type: "header", label: "REPRESENTATION" },

        // Representation mode buttons with active state
        {
          id: "rep-surface",
          icon: "box",
          label: "Surface",
          description: "Solid surface rendering",
          active: currentRepresentation === "surface", // ← FIX: Show active
          disabled: !caps.hasData,
          onClick: () => {
            if (!caps.hasData) return;
            instanceTools.setRepresentation?.(instanceId, "surface");
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "rep-wireframe",
          icon: "grid-3x3",
          label: "Wireframe",
          description: "Wireframe rendering",
          active: currentRepresentation === "wireframe", // ← FIX: Show active
          disabled: !caps.hasData,
          onClick: () => {
            if (!caps.hasData) return;
            instanceTools.setRepresentation?.(instanceId, "wireframe");
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "rep-points",
          icon: "circle",
          label: "Points",
          description: "Point cloud rendering",
          active: currentRepresentation === "points", // ← FIX: Show active
          disabled: !caps.hasData,
          onClick: () => {
            if (!caps.hasData) return;
            instanceTools.setRepresentation?.(instanceId, "points");
            this._emitToolsUpdate(instanceId);
          },
        },

        // FIX 3: Conditionally show point size slider only in points mode
        ...(currentRepresentation === "points" && caps.hasData
          ? [
              { type: "separator" },
              {
                type: "slider",
                id: "point-size-slider",
                label: "Point Size",
                icon: "circle",
                value: currentPointSize,
                min: 1,
                max: 20,
                step: 0.5,
                formatValue: (val) => `${val.toFixed(1)}px`,
                presets: [1, 5, 10, 15, 20],
                description: "Size of rendered points",
                disabled: false,
                onChange: (value) => {
                  instanceTools.setPointSize?.(instanceId, value);
                  this._emitToolsUpdate(instanceId);
                },
              },
            ]
          : []),

        // FIX 4: Conditionally show line width slider only in wireframe mode
        ...(currentRepresentation === "wireframe" && caps.hasData
          ? [
              { type: "separator" },
              {
                type: "slider",
                id: "line-width-slider",
                label: "Line Width",
                icon: "minus",
                value: currentLineWidth,
                min: 1,
                max: 10,
                step: 0.5,
                formatValue: (val) => `${val.toFixed(1)}px`,
                presets: [1, 2, 5, 10],
                description: "Width of wireframe lines",
                disabled: false,
                onChange: (value) => {
                  instanceTools.setLineWidth?.(instanceId, value);
                  this._emitToolsUpdate(instanceId);
                },
              },
            ]
          : []),
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // CLIPPING MENU with position slider
    // ========================================================================
    const clipState = instanceTools.getClipState?.(instanceId) || {
      active: false,
      position: 50,
    };
    const isClipping = clipState.active;
    const clipPosition = clipState.position;

    tools.push({
      id: "clipping",
      type: "menu",
      icon: "scissors",
      label: "Clipping",
      description: caps.canUseClipping
        ? "Cut away data"
        : "Not available for this data",
      active: isClipping,
      disabled: !caps.canUseClipping,
      options: [
        // Toggle clipping
        {
          id: "clip-toggle",
          icon: isClipping ? "toggle-right" : "toggle-left",
          label: isClipping ? "Disable Clipping" : "Enable Clipping",
          description: isClipping
            ? "Remove clipping plane"
            : "Add clipping plane",
          disabled: !caps.canUseClipping,
          onClick: () => {
            if (!caps.canUseClipping) return;
            instanceTools.toggleClippingPlane?.(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },

        // FIX 6: Conditionally show slider only when clipping is active
        ...(isClipping && caps.canUseClipping
          ? [
              { type: "separator" },
              {
                type: "slider",
                id: "clip-position-slider",
                label: "Clip Position",
                icon: "move",
                value: clipPosition,
                min: 0,
                max: 100,
                step: 1,
                formatValue: (val) => `${val}%`,
                presets: [0, 25, 50, 75, 100],
                description: "Position along clipping axis",
                onChange: (value) => {
                  // FIX: Just store the value, don't try to call setPosition
                  instanceTools.setClipPosition?.(instanceId, value);
                  this._emitToolsUpdate(instanceId);
                },
              },
            ]
          : []),

        // Reset button (only show when clipping is active)
        ...(isClipping
          ? [
              { type: "separator" },
              {
                id: "clip-reset",
                icon: "rotate-ccw",
                label: "Reset Clipping",
                description: "Remove clipping plane",
                disabled: !caps.canUseClipping,
                onClick: () => {
                  if (!caps.canUseClipping) return;
                  instanceTools.resetClipping?.(instanceId);
                  this._emitToolsUpdate(instanceId);
                },
              },
            ]
          : []),
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // 🆕 COLORMAP MENU (extracted from old visualization menu)
    // ========================================================================
    const currentColormap = caps.canUseColormap
      ? instanceTools.getCurrentColormap?.(instanceId) || "viridis"
      : "viridis";

    tools.push({
      id: "colormap",
      type: "menu",
      icon: "droplet",
      label: "Colormap",
      description: caps.canUseColormap
        ? "Color transfer functions"
        : "Colormap requires scalar data",
      disabled: !caps.canUseColormap,
      options: [
        {
          type: "color-swatch-grid",
          id: "colormap-grid",
          disabled: !caps.canUseColormap,
          currentColormap: currentColormap,
          colormaps: [
            {
              id: "rainbow",
              name: "Rainbow",
              gradient:
                "linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)",
            },
            {
              id: "viridis",
              name: "Viridis",
              gradient:
                "linear-gradient(90deg, #440154, #31688e, #35b779, #fde724)",
            },
            {
              id: "plasma",
              name: "Plasma",
              gradient:
                "linear-gradient(90deg, #0d0887, #7e03a8, #cc4778, #f89540, #f0f921)",
            },
            {
              id: "hot",
              name: "Hot",
              gradient:
                "linear-gradient(90deg, #000000, #ff0000, #ffff00, #ffffff)",
            },
            {
              id: "cool",
              name: "Cool",
              gradient: "linear-gradient(90deg, #00ffff, #0000ff, #ff00ff)",
            },
            {
              id: "grayscale",
              name: "Grayscale",
              gradient: "linear-gradient(90deg, #000000, #ffffff)",
            },
            {
              id: "turbo",
              name: "Turbo",
              gradient:
                "linear-gradient(90deg, #30123b, #1ae4b6, #faba39, #7a0403)",
            },
            {
              id: "magma",
              name: "Magma",
              gradient:
                "linear-gradient(90deg, #000004, #731f57, #f1605d, #fcfdbf)",
            },
            {
              id: "inferno",
              name: "Inferno",
              gradient:
                "linear-gradient(90deg, #000004, #57106e, #f98e09, #fcffa4)",
            },
          ],
          onColormapChange: (colormapId) => {
            if (!caps.canUseColormap) return;
            instanceTools.setColorMap(instanceId, colormapId);
            this._emitToolsUpdate(instanceId);
            console.log(`🎨 Colormap changed to: ${colormapId}`);
          },
        },
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // ORIENTATION WIDGET TOGGLE (Following plugin pattern)
    // ========================================================================
    const orientationEnabled = instanceTools.isWidgetActive(
      instanceId,
      "orientation"
    );

    // Get current configuration
    const currentConfig = vtkOrientationWidget.getConfig?.(instanceId) || {
      viewportSize: 0.1,
      corner: "BOTTOM_RIGHT",
    };

    // Calculate current size percentage (convert viewportSize to 0-100)
    const currentSizePercent = currentConfig.viewportSize * 100;

    tools.push({
      id: "orientation",
      type: "menu",
      icon: "compass",
      label: "Orientation",
      description: "Orientation cube controls",
      active: orientationEnabled,
      options: [
        // ========================================================================
        // Show/Hide Toggle Button
        // ========================================================================
        {
          id: "orientation-toggle",
          icon: orientationEnabled ? "eye" : "eye-off",
          label: orientationEnabled ? "Hide Cube" : "Show Cube",
          description: orientationEnabled
            ? "Hide orientation cube"
            : "Show orientation cube",
          active: orientationEnabled,
          onClick: () => {
            instanceTools.toggleOrientation?.(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },

        { type: "separator" },

        // ========================================================================
        // Size Slider with Presets (only show when enabled)
        // ========================================================================
        ...(orientationEnabled
          ? [
              {
                type: "slider-with-presets",
                id: "orientation-size-slider",
                icon: "maximize-2",
                label: "Widget Size",
                value: currentSizePercent,
                min: 5,
                max: 20,
                step: 1,
                formatValue: (val) => `${val}%`,
                presets: [6, 8, 10, 12, 15],
                disabled: false,
                onChange: (value) => {
                  // Convert percentage to decimal
                  const viewportSize = value / 100;

                  // Calculate pixel bounds based on percentage
                  const minPixelSize = value * 8; // 8px per percent
                  const maxPixelSize = value * 25; // 25px per percent

                  vtkOrientationWidget.updateConfig?.(instanceId, {
                    viewportSize: viewportSize,
                    minPixelSize: Math.max(60, minPixelSize),
                    maxPixelSize: Math.min(400, maxPixelSize),
                  });

                  instanceTools.forceRender?.(instanceId);
                  this._emitToolsUpdate(instanceId);
                },
              },
            ]
          : []),

        // ========================================================================
        // Position Grid (only show when enabled)
        // ========================================================================
        ...(orientationEnabled
          ? [
              { type: "separator" },
              {
                type: "header",
                label: "POSITION",
              },
              {
                type: "position-grid",
                id: "orientation-position-grid",
                currentPosition: currentConfig.corner,
                positions: [
                  {
                    id: "TOP_LEFT",
                    label: "Top Left",
                    icon: "corner-up-left",
                  },
                  {
                    id: "TOP_RIGHT",
                    label: "Top Right",
                    icon: "corner-up-right",
                  },
                  {
                    id: "BOTTOM_LEFT",
                    label: "Bottom Left",
                    icon: "corner-down-left",
                  },
                  {
                    id: "BOTTOM_RIGHT",
                    label: "Bottom Right",
                    icon: "corner-down-right",
                  },
                ],
                onPositionChange: (positionId) => {
                  vtkOrientationWidget.updateConfig?.(instanceId, {
                    corner: positionId,
                  });
                  instanceTools.forceRender?.(instanceId);
                  this._emitToolsUpdate(instanceId);
                  console.log(`📍 Orientation widget moved to: ${positionId}`);
                },
              },
            ]
          : []),
      ],
    });

    console.log(`✅ Built ${tools.length} tools for instance ${instanceId}`);
    return tools;
  }

  /**
   * Force a render (useful after widget config changes)
   */
  forceRender(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (tools?.sceneObjects?.renderWindow) {
      tools.sceneObjects.renderWindow.render();
    }
  }

  // ===========================================================================
  // 🧪 TESTING IN BROWSER CONSOLE
  // ===========================================================================

  /*
To test if tools are working, open browser console and run:

// 1. Check if handler exists
window.CIA.vtkInstanceHandler

// 2. Get an instance
const instances = Array.from(window.CIA.vtkInstanceHandler.instances.values());
console.log('Instances:', instances);

// 3. Get tools for first instance
const firstInstance = instances[0];
const tools = window.CIA.vtkInstanceHandler.getTools(firstInstance);
console.log('Tools:', tools);

// 4. You should see:
// - Camera menu with 7 options
// - Widgets menu with 4 options
// - Axes toggle button
// = Total of 5 items (3 tools + 2 separators)
*/

  // ===========================================================================
  // ADD this helper method
  // ===========================================================================

  /**
   * Emit event that tools changed (triggers React re-render)
   */
  _emitToolsUpdate(instanceId) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cia:tools-updated", {
          detail: { instanceId },
        })
      );
    }
  }

  /**
   * Get header info for display
   */
  getHeaderInfo(instanceData) {
    const stats = [];
    const indicators = [];

    if (instanceData?.hasData && instanceData.datasetId) {
      // Get dataset info if available
      const datasetManager = window.CIA?.datasetManager;
      if (datasetManager) {
        const dataset = datasetManager.getDataset(instanceData.datasetId);

        // Check if we have cached parsed data with metadata
        const cached = datasetManager.getCachedParsedData(
          instanceData.datasetId,
          "vtk"
        );
        if (cached?.metadata) {
          stats.push({
            label: "Points",
            value: cached.metadata.pointCount?.toLocaleString() || "0",
          });

          if (cached.metadata.bounds) {
            const bounds = cached.metadata.bounds;
            const dimensions = [
              bounds.xMax - bounds.xMin,
              bounds.yMax - bounds.yMin,
              bounds.zMax - bounds.zMin,
            ];
            stats.push({
              label: "Size",
              value: dimensions.map((d) => d.toFixed(1)).join(" × "),
            });
          }
        }
      }
    }

    if (instanceData?.initialized) {
      indicators.push({
        id: "vtk-active",
        label: "VTK",
        color: "#4CAF50",
      });
    }

    if (instanceData?.annotations?.size > 0) {
      indicators.push({
        id: "annotations",
        label: `${instanceData.annotations.size} annotations`,
        color: "#FFA726",
      });
    }

    return { stats, indicators };
  }

  // ===========================================================================
  // PRIVATE METADATA EXTRACTION HELPERS
  // ===========================================================================

  /**
   * Extract metadata from VTK XML formats by reading just the XML structure
   * This reads the beginning of the file to get counts without loading all data
   */
  async _extractXMLMetadata(file) {
    // Read just the first chunk of the file (enough to get the XML structure)
    // Most VTP files have the metadata in the first few KB
    const chunkSize = 10000; // Read first 10KB
    const blob = file.slice(0, chunkSize);
    const text = await blob.text();

    // Parse as XML to extract metadata from tags
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error("Failed to parse XML header");
    }

    // Extract metadata from XML structure
    // VTP files have structure like: <VTKFile><PolyData><Piece NumberOfPoints="142573" ...>
    const piece = xmlDoc.querySelector("Piece");

    if (!piece) {
      return { format: "vtp", estimated: true };
    }

    const metadata = {
      format: "vtp",
      pointCount: parseInt(piece.getAttribute("NumberOfPoints") || "0"),
      cellCount:
        parseInt(piece.getAttribute("NumberOfVerts") || "0") +
        parseInt(piece.getAttribute("NumberOfLines") || "0") +
        parseInt(piece.getAttribute("NumberOfStrips") || "0") +
        parseInt(piece.getAttribute("NumberOfPolys") || "0"),
      estimated: false,
    };

    // Estimate memory usage (rough approximation)
    // Each point is roughly 3 floats (x,y,z) = 12 bytes
    // Each cell is roughly 4 ints = 16 bytes
    const estimatedBytes = metadata.pointCount * 12 + metadata.cellCount * 16;
    metadata.estimatedMemory = this._formatBytes(estimatedBytes);

    // Check for data arrays (these appear in PointData and CellData sections)
    const dataArrayNames = [];
    const pointData = xmlDoc.querySelector("PointData");
    if (pointData) {
      const arrays = pointData.querySelectorAll("DataArray");
      arrays.forEach((arr) => {
        const name = arr.getAttribute("Name");
        if (name) dataArrayNames.push(name);
      });
    }

    if (dataArrayNames.length > 0) {
      metadata.dataArrays = dataArrayNames;
    }

    console.log(
      `  ✓ Extracted: ${metadata.pointCount} points, ${metadata.cellCount} cells`
    );

    return metadata;
  }

  /**
   * Extract metadata from legacy binary VTK files
   * This would read the binary header structure
   */
  async _extractLegacyVTKMetadata(file) {
    // Legacy VTK format has a text header followed by binary data
    // This is more complex to parse and less common, so for now return basic info
    return {
      format: "vtk",
      estimated: true,
      note: "Legacy VTK format - full parsing required for detailed metadata",
    };
  }

  /**
   * Format bytes into human-readable size
   */
  _formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }

  // ===========================================================================
  // COLLABORATION METHODS
  // ===========================================================================

  /**
   * Set cursor visibility for remote users
   */
  async setCursorVisibility(instanceData, visible, users = []) {
    if (!instanceData?.initialized) return;

    if (visible) {
      // Create cursor actors for each user
      users.forEach((user) => {
        if (!instanceData.cursors.has(user.id)) {
          const cursorActor = this._createCursorActor(user.color);
          instanceData.cursors.set(user.id, cursorActor);
          instanceData.sceneObjects.renderer.addActor(cursorActor);
        }
      });
    } else {
      // Remove all cursors
      instanceData.cursors.forEach((actor) => {
        instanceData.sceneObjects.renderer.removeActor(actor);
      });
      instanceData.cursors.clear();
    }

    instanceData.sceneObjects.renderWindow.render();
  }

  /**
   * Update cursor position for a user
   */
  async updateCursor(instanceData, userId, cursorData) {
    if (!instanceData?.initialized) return;

    const cursorActor = instanceData.cursors.get(userId);
    if (cursorActor && cursorData.position) {
      // Project 2D screen position to 3D world position
      // This is simplified - real implementation would use picker
      cursorActor.setPosition(cursorData.position);
      instanceData.sceneObjects.renderWindow.render();
    }
  }

  /**
   * Set annotation visibility
   */
  async setAnnotationVisibility(instanceData, visible, annotations = []) {
    if (!instanceData?.initialized) return;

    if (visible) {
      // Create annotation actors
      annotations.forEach((annotation) => {
        if (!instanceData.annotations.has(annotation.id)) {
          const annotationActor = this._createAnnotationActor(annotation);
          instanceData.annotations.set(annotation.id, annotationActor);
          instanceData.sceneObjects.renderer.addActor(annotationActor);
        }
      });
    } else {
      // Remove all annotations
      instanceData.annotations.forEach((actor) => {
        instanceData.sceneObjects.renderer.removeActor(actor);
      });
      instanceData.annotations.clear();
    }

    instanceData.sceneObjects.renderWindow.render();
  }

  /**
   * Sync camera state from another user
   */
  async syncCamera(instanceData, cameraState) {
    if (!instanceData?.initialized || !cameraState) return;

    const camera = instanceData.sceneObjects.camera;
    camera.setPosition(cameraState.position);
    camera.setFocalPoint(cameraState.focalPoint);
    camera.setViewUp(cameraState.viewUp);
    instanceData.sceneObjects.renderWindow.render();
  }

  /**
   * Get current VTK state for synchronization
   */
  async getSharedState(instanceData) {
    return instanceData.stateAdapter?.getState() || null;
  }

  /**
   * Helper to extract current VTK state
   * This replaces your getSharedState() method's internal logic
   */
  _getCurrentVTKState(instanceData) {
    if (!instanceData.sceneObjects) return {};

    const state = {};

    // Camera state
    const camera = instanceData.sceneObjects.camera;
    if (camera) {
      state.camera = {
        position: camera.getPosition(),
        focalPoint: camera.getFocalPoint(),
        viewUp: camera.getViewUp(),
        parallelScale: camera.getParallelScale(),
        // 🆕 ADD THESE for proper zoom synchronization:
        clippingRange: camera.getClippingRange(),
        viewAngle: camera.getViewAngle(),
      };
    }

    // Actor/visualization properties
    const actor = instanceData.sceneObjects.actor;
    if (actor) {
      const property = actor.getProperty();
      state.visualization = {
        opacity: property.getOpacity(),
        representation: property.getRepresentation(),
      };
    }

    // 🆕 ADD REDUCTION STATE: Include dimensionality reduction state
    const instanceId = instanceData.instanceId;
    const reductionState = this.reductionFeature.getState(instanceId);
    if (reductionState) {
      state.reduction = {
        method: reductionState.method,
        components: reductionState.components,
        isApplied: reductionState.isApplied,
      };
    }

    return state;
  }

  /**
   * Apply remote VTK state
   */
  async applySharedState(instanceData, state, sourceUserId) {
    // Guard against applying state before VTK is initialized
    if (!instanceData?.sceneObjects) {
      console.warn("Cannot apply state: VTK not initialized yet");
      return;
    }

    // Set flag to prevent sync loops
    this._isApplyingRemoteState = true;

    try {
      console.log(
        `🔥 VTK Handler: Applying remote state from user ${sourceUserId}`
      );

      // Apply camera state
      if (state.camera) {
        const camera = instanceData.sceneObjects.camera;
        camera.setPosition(...state.camera.position);
        camera.setFocalPoint(...state.camera.focalPoint);
        camera.setViewUp(...state.camera.viewUp);
        if (state.camera.parallelScale !== undefined) {
          camera.setParallelScale(state.camera.parallelScale);
        }
        // 🆕 ADD THESE zoom-related properties:
        if (state.camera.clippingRange) {
          camera.setClippingRange(...state.camera.clippingRange);
        }

        if (state.camera.viewAngle !== undefined) {
          camera.setViewAngle(state.camera.viewAngle);
        }

        // Reset clipping range for the new camera position
        instanceData.sceneObjects.renderer.resetCameraClippingRange();
      }

      // Apply visualization properties
      if (state.visualization && instanceData.sceneObjects.actor) {
        const property = instanceData.sceneObjects.actor.getProperty();

        if (state.visualization.opacity !== undefined) {
          property.setOpacity(state.visualization.opacity);
        }

        if (state.visualization.representation !== undefined) {
          property.setRepresentation(state.visualization.representation);
        }
      }

      // 🆕 Apply reduction state
      if (state.reduction) {
        const instanceId = instanceData.instanceId;
        const currentReductionState =
          this.reductionFeature.getState(instanceId);

        // Check if we need to update the reduction state
        const needsUpdate =
          !currentReductionState ||
          currentReductionState.method !== state.reduction.method ||
          currentReductionState.components !== state.reduction.components ||
          currentReductionState.isApplied !== state.reduction.isApplied;

        if (needsUpdate) {
          if (state.reduction.isApplied && state.reduction.method) {
            // Apply the reduction (skipSync to avoid infinite loop)
            console.log(
              `📥 Applying remote reduction: ${state.reduction.method} (${state.reduction.components}D)`
            );
            await this.reductionFeature.applyReduction(
              instanceId,
              state.reduction.method,
              state.reduction.components,
              { skipSync: true }
            );
          } else {
            // Restore original (no reduction) (skipSync to avoid infinite loop)
            console.log(
              `📥 Restoring original data (remote user removed reduction)`
            );
            await this.reductionFeature.restoreOriginal(instanceId, {
              skipSync: true,
            });
          }
        }
      }

      // Apply widget states (when implemented)
      // if (state.widgets) {
      //   this._applyWidgetStates(instanceData, state.widgets);
      // }

      // Apply filter states (when implemented)
      // if (state.filters) {
      //   this._applyFilterStates(instanceData, state.filters);
      // }

      // Trigger render to show the changes
      if (instanceData.sceneObjects.renderWindow) {
        instanceData.sceneObjects.renderWindow.render();
      }
    } catch (error) {
      console.error("❌ VTK Handler: Failed to apply remote state:", error);
    } finally {
      // Always clear the flag, even if there was an error
      this._isApplyingRemoteState = false;
    }
  }

  /**
   * Apply camera state from a ViewConfiguration
   */
  applyCameraState(instanceId, cameraState) {
    const instanceData = this.instances.get(instanceId);
    if (!instanceData?.sceneObjects?.camera) {
      console.warn(
        `⚠️ Cannot apply camera state - instance ${instanceId} not initialized`
      );
      return;
    }

    this._isApplyingRemoteState = true;

    try {
      const camera = instanceData.sceneObjects.camera;

      if (cameraState.position) camera.setPosition(...cameraState.position);
      if (cameraState.focalPoint)
        camera.setFocalPoint(...cameraState.focalPoint);
      if (cameraState.viewUp) camera.setViewUp(...cameraState.viewUp);
      if (cameraState.parallelScale)
        camera.setParallelScale(cameraState.parallelScale);
      if (cameraState.clippingRange)
        camera.setClippingRange(...cameraState.clippingRange);
      if (cameraState.viewAngle) camera.setViewAngle(cameraState.viewAngle);

      instanceData.sceneObjects.renderWindow.render();

      console.log(`📷 Applied camera state to instance ${instanceId}`);
    } finally {
      this._isApplyingRemoteState = false;
    }
  }

  // ===========================================================================
  // VR SUPPORT
  // ===========================================================================

  /**
   * Check if this instance type supports VR
   */
  supportsInstanceVR() {
    return true; // VTK supports VR through WebXR
  }

  /**
   * Get VR capabilities
   */
  getVRCapabilities() {
    return {
      instanceVR: true,
      applicationVR: false,

      requirements: {
        controllers: true,
        handTracking: false,
        roomScale: true,
        minFPS: 90,
      },

      optional: {
        eyeTracking: false,
        haptics: true,
        spatialAudio: false,
      },
    };
  }

  /**
   * Enter VR mode for this instance
   */
  async enterInstanceVR(instanceData, xrSession) {
    console.log("🥽 Entering VR for VTK instance", instanceData.instanceId);
    // TODO: Implement WebXR integration
    // This would set up stereo rendering and controller input
    return {};
  }

  /**
   * Update VR state
   */
  async updateInstanceVR(instanceData, vrData, frame) {
    // TODO: Update controller positions, head tracking, etc.
  }

  /**
   * Called when application enters VR mode
   */
  async onApplicationVREnter(instanceData, vrContext) {
    // TODO: Prepare instance for VR (optimize rendering, etc.)
    return null;
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Initialize the VTK rendering pipeline for this instance
   *
   * CRITICAL: The order of operations here matters! VTK.js requires
   * each component to be fully connected before moving to the next.
   *
   * @private
   */
  _initializeVTKPipeline(instanceData) {
    const { container } = instanceData;

    console.log(
      `🎨 Initializing VTK rendering pipeline for ${instanceData.instanceId}`
    );

    // Clear the container to ensure clean slate (removes placeholder)
    container.innerHTML = "";

    // =========================================================================
    // PHASE 1: Create the rendering core (renderer + render window)
    // =========================================================================

    // Create the renderer (manages the 3D scene)
    const renderer = vtkRenderer.newInstance();
    renderer.setBackground(0.1, 0.1, 0.1);

    // Create the abstract render window (manages renderers and views)
    const renderWindow = vtkRenderWindow.newInstance();
    renderWindow.addRenderer(renderer);

    // =========================================================================
    // PHASE 2: Create and connect the OpenGL view (WebGL rendering context)
    // THIS MUST HAPPEN BEFORE INTERACTOR INITIALIZATION
    // =========================================================================

    // Create the OpenGL render window (creates WebGL context)
    const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();
    openGLRenderWindow.setContainer(container);

    // CRITICAL: Connect the OpenGL window to the render window
    // This must happen BEFORE we create/initialize the interactor
    renderWindow.addView(openGLRenderWindow);

    // Set the size based on container dimensions
    const { width, height } = container.getBoundingClientRect();
    openGLRenderWindow.setSize(width, height);

    // =========================================================================
    // PHASE 3: Create and initialize the interactor (mouse/keyboard handling)
    // THIS REQUIRES THE VIEW TO BE ALREADY CONNECTED
    // =========================================================================

    // Create the interactor
    const interactor = vtkRenderWindowInteractor.newInstance();

    // CRITICAL: Set the view BEFORE calling initialize()
    interactor.setView(openGLRenderWindow);

    // Now it's safe to initialize because the view is connected
    interactor.initialize();

    // Set up the interaction style (how mouse movements control camera)
    const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(interactorStyle);

    // Bind DOM events to the container
    interactor.bindEvents(container);

    // =========================================================================
    // PHASE 4: Create rendering components (camera, mapper, actor)
    // =========================================================================

    // Get the camera reference from the renderer
    const camera = renderer.getActiveCamera();

    // Listen for camera modifications and publish through adapter
    camera.onModified(() => {
      if (!this._isApplyingRemoteState && instanceData.viewConfigId) {
        const cameraState = {
          position: camera.getPosition(),
          focalPoint: camera.getFocalPoint(),
          viewUp: camera.getViewUp(),
          parallelScale: camera.getParallelScale(),
          clippingRange: camera.getClippingRange(),
          viewAngle: camera.getViewAngle(),
        };

        viewConfigurationManager.updateCamera(
          instanceData.viewConfigId,
          cameraState
        );
      }
      // Only publish if we're not applying remote state
      if (!this._isApplyingRemoteState && instanceData.stateAdapter) {
        const cameraState = {
          position: camera.getPosition(),
          focalPoint: camera.getFocalPoint(),
          viewUp: camera.getViewUp(),
          parallelScale: camera.getParallelScale(),
          clippingRange: camera.getClippingRange(),
          viewAngle: camera.getViewAngle(),
        };

        // Publish through adapter instead of directly to Y.js
        instanceData.stateAdapter.updateState(
          {
            camera: cameraState,
          },
          "local"
        );
      } else if (!instanceData.stateAdapter) {
        // This helps us debug if something went wrong
        console.warn(
          "⚠️ Camera modified but stateAdapter is missing - state not synced"
        );
      }
    });

    // When user stops interacting, publish the final state
    const publishStateAfterInteraction = () => {
      // CRITICAL: Add the same defensive checks here
      if (!this._isApplyingRemoteState && instanceData.stateAdapter) {
        // Get complete state and publish it
        const state = this._getCurrentVTKState(instanceData);
        instanceData.stateAdapter.updateState(state, "local");
      } else if (!instanceData.stateAdapter) {
        // This should help us understand if something's still wrong
        console.warn(
          "⚠️ Interaction ended but stateAdapter is missing - state not synced"
        );
      }
    };

    // Bind to interaction end events
    interactor.onEndAnimation(publishStateAfterInteraction);

    // Create mapper (converts data to renderable primitives)
    const mapper = vtkMapper.newInstance();

    // Create actor (represents an object in the scene)
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.setPickable(true);

    // =========================================================================
    // PHASE 5: Set up responsive resizing
    // =========================================================================

    // Handle container resize events
    const resizeObserver = new ResizeObserver(() => {
      // Safety check: only resize if objects still exist and aren't deleted
      if (openGLRenderWindow && !openGLRenderWindow.isDeleted()) {
        const { width, height } = container.getBoundingClientRect();
        openGLRenderWindow.setSize(width, height);
        renderWindow.render();
      }
    });
    resizeObserver.observe(container);

    // Return all the scene objects that need to be tracked
    const sceneObjects = {
      renderer,
      renderWindow,
      openGLRenderWindow,
      camera,
      interactor,
      interactorStyle,
      mapper,
      actor,
      resizeObserver,
    };

    // Initialize the tools manager
    instanceTools.initializeTools(instanceData.instanceId, sceneObjects);

    console.log(`✅ VTK pipeline initialized for ${instanceData.instanceId}`);
    return sceneObjects;
  }

  /**
   * Create a cursor actor for a user
   */
  _createCursorActor(color) {
    // TODO: Create a sphere or arrow actor with the user's color
    const actor = vtkActor.newInstance();
    // Set up actor with user color
    return actor;
  }

  /**
   * Create an annotation actor
   */
  _createAnnotationActor(annotation) {
    // TODO: Create annotation visualization
    const actor = vtkActor.newInstance();
    // Set up actor with annotation data
    return actor;
  }
}

// Create and export singleton instance
export const vtkInstanceHandler = new VTKInstanceHandler();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.vtkInstanceHandler = vtkInstanceHandler;
}
