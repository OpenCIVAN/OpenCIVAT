// src/core/instances/types/vtk/VTKInstanceHandler.js
// Complete VTK handler implementation with proper interface

import { InstanceTypeHandler } from "@Core/instances/types/InstanceTypeInterface.js";
import { ViewStateAdapter } from "@Core/instances/ViewStateAdapter.js";
import { instanceTools } from "@VTK/vtkInstanceTools.js";
import { VTKReductionFeature } from "@VTK/features/VTKReductionFeature";
import { vtkOrientationWidget } from "@VTK/widgets/orientation/VTKOrientationWidget";
import { vtkInstanceCursors } from "@VTK/collaboration/VTKInstanceCursors.js";

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
    const { instanceId, datasetId } = options;

    console.log(
      `🎨 VTK Handler: Initializing instance ${instanceId} (lazy mode)`
    );

    const stateAdapter = new ViewStateAdapter(instanceId, "vtk");
    console.log(`📡 Created stateAdapter for ${instanceId}`);

    const instanceData = {
      instanceId,
      container: containerElement,
      datasetId,
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
      disabled: !caps.hasData, // 🆕 Disable if no data
      options: [
        {
          id: "view-front",
          icon: "camera",
          label: "Front View",
          onClick: () => instanceTools.setCameraView(instanceId, "front"),
        },
        {
          id: "view-back",
          icon: "camera",
          label: "Back View",
          onClick: () => instanceTools.setCameraView(instanceId, "back"),
        },
        {
          id: "view-top",
          icon: "camera",
          label: "Top View",
          onClick: () => instanceTools.setCameraView(instanceId, "top"),
        },
        {
          id: "view-bottom",
          icon: "camera",
          label: "Bottom View",
          onClick: () => instanceTools.setCameraView(instanceId, "bottom"),
        },
        {
          id: "view-left",
          icon: "camera",
          label: "Left View",
          onClick: () => instanceTools.setCameraView(instanceId, "left"),
        },
        {
          id: "view-right",
          icon: "camera",
          label: "Right View",
          onClick: () => instanceTools.setCameraView(instanceId, "right"),
        },
        { type: "separator" },
        {
          id: "reset-camera",
          icon: "refresh",
          label: "Reset Camera",
          onClick: () => instanceTools.resetCamera(instanceId),
        },
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // MEASUREMENT WIDGETS MENU (Following plugin pattern)
    // ========================================================================
    const lineActive = instanceTools.isWidgetActive(instanceId, "line");
    const angleActive = instanceTools.isWidgetActive(instanceId, "angle");
    const planeActive = instanceTools.isWidgetActive(instanceId, "plane");

    tools.push({
      id: "widgets",
      type: "menu",
      icon: "transform",
      label: "Widgets",
      description: caps.canUseWidgets
        ? "Interactive measurement and manipulation tools"
        : "Widgets require loaded geometry", // 🆕 Helpful message
      disabled: !caps.canUseWidgets, // 🆕 Disable if no geometry
      options: [
        {
          id: "widget-line",
          icon: "ruler",
          label: "Line Measurement",
          description: "Measure distance between two points",
          active: lineActive,
          disabled: !caps.canUseMeasurement, // 🆕 Individual disable
          onClick: () => {
            console.log("🎯 Line measurement clicked");
            instanceTools.toggleDistanceMeasurement(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "widget-angle",
          icon: "triangle",
          label: "Angle Measurement",
          description: "Measure angle between three points",
          active: angleActive,
          disabled: !caps.canUseMeasurement, // 🆕 Individual disable
          onClick: () => {
            console.log("🎯 Angle measurement clicked");
            instanceTools.toggleAngleMeasurement(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "widget-clip",
          icon: "clip",
          label: "Clipping Plane",
          description: "Cut away parts of the data",
          active: planeActive,
          disabled: !caps.canUseClipping, // 🆕 Individual disable
          onClick: () => {
            console.log("🎯 Clipping plane clicked");
            instanceTools.toggleClippingPlane(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        {
          id: "clear-widgets",
          icon: "delete",
          label: "Clear All Widgets",
          description: "Remove all active widgets",
          disabled: !instanceTools.hasActiveWidgets(instanceId),
          onClick: () => {
            console.log("🎯 Clear all widgets clicked");
            instanceTools.disableMeasurementTools(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        {
          id: "show-measurements",
          icon: "pencil-ruler",
          label: "Show Measurements",
          description: "View all recorded measurements",
          onClick: () => {
            const measurements = instanceTools.getMeasurements(instanceId);
            console.log("📊 Measurements:", measurements);
            // TODO: Show in UI panel
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
    const currentRep = caps.hasData
      ? instanceTools.getRepresentation(instanceId)
      : "surface";
    const currentOpacity = caps.hasData
      ? instanceTools.getOpacity(instanceId)
      : 1.0;

    tools.push({
      id: "appearance",
      type: "menu",
      icon: "palette",
      label: "Appearance",
      description: caps.hasData
        ? "Surface rendering and transparency"
        : "Appearance requires loaded data",
      disabled: !caps.hasData,
      options: [
        // Representation modes
        {
          id: "rep-surface",
          icon: "box",
          label: "Surface",
          description: "Solid surface rendering",
          active: currentRep === "surface",
          onClick: () => {
            instanceTools.setRepresentation(instanceId, "surface");
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "rep-wireframe",
          icon: "grid-3x3",
          label: "Wireframe",
          description: "Show mesh edges",
          active: currentRep === "wireframe",
          onClick: () => {
            instanceTools.setRepresentation(instanceId, "wireframe");
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "rep-points",
          icon: "points",
          label: "Points",
          description: "Show individual vertices",
          active: currentRep === "points",
          onClick: () => {
            instanceTools.setRepresentation(instanceId, "points");
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        // Opacity presets
        {
          id: "opacity-100",
          icon: "circle",
          label: "Opaque (100%)",
          description: "Fully solid",
          active: currentOpacity === 1.0,
          onClick: () => {
            instanceTools.setOpacity(instanceId, 1.0);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "opacity-75",
          icon: "circle",
          label: "75% Opacity",
          description: "Slightly transparent",
          active: Math.abs(currentOpacity - 0.75) < 0.01,
          onClick: () => {
            instanceTools.setOpacity(instanceId, 0.75);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "opacity-50",
          icon: "circle-dashed",
          label: "50% Opacity",
          description: "Half transparent",
          active: Math.abs(currentOpacity - 0.5) < 0.01,
          onClick: () => {
            instanceTools.setOpacity(instanceId, 0.5);
            this._emitToolsUpdate(instanceId);
          },
        },
        {
          id: "opacity-25",
          icon: "circle-dashed",
          label: "25% Opacity",
          description: "Very transparent",
          active: Math.abs(currentOpacity - 0.25) < 0.01,
          onClick: () => {
            instanceTools.setOpacity(instanceId, 0.25);
            this._emitToolsUpdate(instanceId);
          },
        },
      ],
    });

    tools.push({ type: "separator" });

    // ========================================================================
    // 🆕 COLORMAP MENU (extracted from old visualization menu)
    // ========================================================================
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
          id: "colormap-rainbow",
          icon: "palette",
          label: "Rainbow",
          onClick: () => instanceTools.setColorMap(instanceId, "rainbow"),
          disabled: !caps.canUseColormap,
        },
        {
          id: "colormap-grayscale",
          icon: "palette",
          label: "Grayscale",
          onClick: () => instanceTools.setColorMap(instanceId, "grayscale"),
          disabled: !caps.canUseColormap,
        },
        {
          id: "colormap-hot",
          icon: "palette",
          label: "Hot",
          onClick: () => instanceTools.setColorMap(instanceId, "hot"),
          disabled: !caps.canUseColormap,
        },
        {
          id: "colormap-cool",
          icon: "palette",
          label: "Cool",
          onClick: () => instanceTools.setColorMap(instanceId, "cool"),
          disabled: !caps.canUseColormap,
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

    tools.push({
      id: "orientation",
      type: "menu",
      icon: "compass",
      label: "Orientation",
      description: "Orientation cube controls",
      active: orientationEnabled,
      options: [
        // Toggle on/off
        {
          id: "orientation-toggle",
          icon: orientationEnabled ? "compass" : "compass-off",
          label: orientationEnabled ? "Hide Cube" : "Show Cube",
          onClick: () => {
            instanceTools.toggleOrientation(instanceId);
            this._emitToolsUpdate(instanceId);
          },
        },
        { type: "separator" },
        // Size presets
        {
          id: "size-small",
          icon: "minimize-2",
          label: "Small Size",
          description: "8% of viewport",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              viewportSize: 0.08,
              minPixelSize: 60,
              maxPixelSize: 200,
            });
            instanceTools.forceRender(instanceId);
          },
        },
        {
          id: "size-medium",
          icon: "square",
          label: "Medium Size",
          description: "10% of viewport (default)",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              viewportSize: 0.1,
              minPixelSize: 80,
              maxPixelSize: 280,
            });
            instanceTools.forceRender(instanceId);
          },
        },
        {
          id: "size-large",
          icon: "maximize-2",
          label: "Large Size",
          description: "15% of viewport",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              viewportSize: 0.15,
              minPixelSize: 120,
              maxPixelSize: 400,
            });
            instanceTools.forceRender(instanceId);
          },
        },
        { type: "separator" },
        // Corner positions
        {
          id: "corner-br",
          icon: "corner-down-right",
          label: "Bottom Right",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              corner: "BOTTOM_RIGHT",
            });
            instanceTools.forceRender(instanceId);
          },
        },
        {
          id: "corner-bl",
          icon: "corner-down-left",
          label: "Bottom Left",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              corner: "BOTTOM_LEFT",
            });
            instanceTools.forceRender(instanceId);
          },
        },
        {
          id: "corner-tr",
          icon: "corner-up-right",
          label: "Top Right",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              corner: "TOP_RIGHT",
            });
            instanceTools.forceRender(instanceId);
          },
        },
        {
          id: "corner-tl",
          icon: "corner-up-left",
          label: "Top Left",
          onClick: () => {
            vtkOrientationWidget.updateConfig(instanceId, {
              corner: "TOP_LEFT",
            });
            instanceTools.forceRender(instanceId);
          },
        },
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
      // Only publish if we're not applying remote state
      if (!this._isApplyingRemoteState && instanceData.stateAdapter) {
        const cameraState = {
          position: camera.getPosition(),
          focalPoint: camera.getFocalPoint(),
          viewUp: camera.getViewUp(),
          parallelScale: camera.getParallelScale(),
          // 🆕 ADD THESE for proper zoom synchronization:
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
