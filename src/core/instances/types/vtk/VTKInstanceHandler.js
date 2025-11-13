// src/core/instances/types/vtk/VTKInstanceHandler.js
// Complete VTK handler implementation with proper interface

import { InstanceTypeHandler } from "@Core/instances/types/InstanceTypeInterface.js";
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

    // Create instance data structure WITHOUT initializing VTK yet
    const instanceData = {
      instanceId,
      container: containerElement,
      datasetId,

      // VTK objects will be created lazily
      sceneObjects: null,
      renderer: null,
      renderWindow: null,
      glWindow: null,
      interactor: null,
      camera: null,

      // State flags
      initialized: false,
      hasData: false,

      // Actors and widgets
      actors: new Map(),
      widgets: new Map(),
      annotations: new Map(),
      cursors: new Map(),

      // Tools this instance provides
      tools: this._createTools(),
    };

    // Store the instance
    this.instances.set(instanceId, instanceData);

    // Create a placeholder div to show loading state
    const placeholder = document.createElement("div");
    placeholder.className = "vtk-placeholder";
    placeholder.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: #666;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    placeholder.innerHTML = "<div>Ready for data...</div>";
    containerElement.appendChild(placeholder);

    // Store placeholder reference for removal later
    instanceData.placeholder = placeholder;

    console.log(`✅ VTK instance ${instanceId} created (awaiting data)`);

    return instanceData;
  }

  /**
   * Clean up instance resources
   */
  async cleanup(instanceData) {
    const { instanceId } = instanceData;

    console.log(`🧹 VTK Handler: Cleaning up instance ${instanceId}`);

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
  async loadData(instanceData, dataset, data) {
    const { instanceId } = instanceData;

    console.log(
      `📊 VTK Handler: Loading dataset ${dataset.id} into instance ${instanceId}`
    );

    // Check if we support this file type
    if (!this.canHandle(dataset.fileType)) {
      const supported = this.getSupportedFileTypes()
        .filter((t) => t.capabilities.canRender)
        .map((t) => t.extension.toUpperCase())
        .join(", ");

      throw new Error(
        `VTK handler cannot display ${dataset.fileType} files. ` +
          `Supported formats: ${supported}`
      );
    }

    // Get the dataset manager
    const datasetManager = window.CIA?.datasetManager;
    if (!datasetManager) {
      throw new Error("DatasetManager not available");
    }

    let polydata;
    const cached = datasetManager.getCachedParsedData(dataset.id, "vtk");

    if (cached) {
      console.log(`  ✓ Using cached VTK polydata`);
      polydata = cached.data;
    } else {
      console.log(`  ⏳ Parsing ${dataset.fileType.toUpperCase()} file...`);

      // CRITICAL FIX: Get the raw file, fetching if necessary
      let rawFile = datasetManager.getRawFile(dataset.id);

      // If rawFile is null, we need to fetch it
      if (!rawFile) {
        console.log(`  📥 Raw file not in memory, fetching...`);

        // Check if this is a public file (sample from /vtp_files/)
        if (dataset.publicPath) {
          console.log(`  🌐 Fetching from public path: ${dataset.publicPath}`);
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
          dataset.rawFile = rawFile;

          console.log(`  ✓ File fetched successfully`);
        } else {
          // This is an uploaded file - we'd need to get it from storage provider
          // For now, throw a helpful error
          throw new Error(
            `Dataset ${dataset.filename} has no raw file and no public path. ` +
              `This dataset was loaded in a previous session and the file is not available. ` +
              `Please re-upload the file.`
          );
        }
      }

      // Now we have the raw file, parse it
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

    // Now we have polydata - proceed with VTK rendering
    if (!instanceData.sceneObjects) {
      console.log(`  🎨 First data load - initializing VTK pipeline...`);
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

    // Position camera and render
    renderer.resetCamera();
    renderWindow.render();

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
   * Get tools available for this instance
   */
  getTools(instanceData) {
    return instanceData?.tools || this._createTools();
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
   * Get current camera state
   */
  async getCameraState(instanceData) {
    if (!instanceData?.initialized) return null;

    const camera = instanceData.sceneObjects.camera;
    return {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
    };
  }

  /**
   * Get current VTK state for synchronization
   */
  async getSharedState(instanceData) {
    // Don't sync while applying remote state (prevents loops)
    if (this._isApplyingRemoteState) {
      return null;
    }

    // Only sync if VTK pipeline is initialized
    if (!instanceData?.sceneObjects) {
      return null;
    }

    const state = {};

    // Extract camera state
    const camera = instanceData.sceneObjects.camera;
    if (camera) {
      state.camera = {
        position: camera.getPosition(),
        focalPoint: camera.getFocalPoint(),
        viewUp: camera.getViewUp(),
        parallelScale: camera.getParallelScale(),
      };
    }

    // Extract actor properties (opacity, color, etc.)
    const actor = instanceData.sceneObjects.actor;
    if (actor) {
      const property = actor.getProperty();
      state.visualization = {
        opacity: property.getOpacity(),
        representation: property.getRepresentation(), // wireframe vs surface
        // Add more as you implement them:
        // colorMap: this._currentColorMap,
        // pointSize: property.getPointSize(),
      };
    }

    // Extract widget states (when you implement widgets)
    // state.widgets = this._getWidgetStates(instanceData);

    // Extract filter states (when you implement filters)
    // state.filters = this._getFilterStates(instanceData);

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

    console.log(`✅ VTK pipeline initialized for ${instanceData.instanceId}`);

    // Return all the scene objects that need to be tracked
    return {
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
  }

  /**
   * Create the tools array
   */
  _createTools() {
    return [
      {
        id: "reset-camera",
        type: "button",
        icon: "Maximize2",
        label: "Reset Camera",
        onClick: (instanceData) => this.resetCamera(instanceData),
      },
      {
        type: "separator",
      },
      {
        id: "toggle-axes",
        type: "button",
        icon: "Axis3d",
        label: "Toggle Axes",
        onClick: (instanceData) => this.toggleAxes(instanceData),
      },
      {
        id: "measure",
        type: "button",
        icon: "Ruler",
        label: "Measure",
        onClick: (instanceData) => this.toggleMeasureTool(instanceData),
      },
      {
        id: "clip",
        type: "button",
        icon: "Scissors",
        label: "Clipping Plane",
        onClick: (instanceData) => this.toggleClipTool(instanceData),
      },
    ];
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

  // ===========================================================================
  // TOOL IMPLEMENTATIONS
  // ===========================================================================

  resetCamera(instanceData) {
    if (instanceData?.sceneObjects?.renderer) {
      instanceData.sceneObjects.renderer.resetCamera();
      instanceData.sceneObjects.renderWindow.render();
    }
  }

  toggleAxes(instanceData) {
    // TODO: Implement orientation marker toggle
    console.log("Toggle axes for", instanceData.instanceId);
  }

  toggleMeasureTool(instanceData) {
    // TODO: Implement measure tool
    console.log("Toggle measure tool for", instanceData.instanceId);
  }

  toggleClipTool(instanceData) {
    // TODO: Implement clipping plane
    console.log("Toggle clipping for", instanceData.instanceId);
  }
}

// Create and export singleton instance
export const vtkInstanceHandler = new VTKInstanceHandler();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.vtkInstanceHandler = vtkInstanceHandler;
}
