// src/core/instances/types/vtk/VTKInstanceHandler.js
// Complete VTK handler implementation with proper interface
//
// MANIFEST-DRIVEN ARCHITECTURE (Phase 1):
// File type capabilities are now declared in ./manifest.ts
// The build script generates registry.json from the manifest.
// This handler imports from the manifest for consistency.

import { instance as log } from "@Utils/logger.js";
import { InstanceTypeHandler } from "@Core/instances/types/InstanceTypeInterface.js";
import { ViewStateAdapter } from "@Core/instances/ViewStateAdapter.js";
import { instanceTools } from "@VTK/vtkInstanceTools.js";
import { VTKReductionFeature } from "@VTK/features/VTKReductionFeature";
import { vtkOrientationWidget } from "@VTK/widgets/orientation/VTKOrientationWidget";
import { vtkInstanceCursors } from "@VTK/collaboration/VTKInstanceCursors.js";
import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { syncCameraToYjs } from "@Collaboration/yjs/yjsSetup.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";

// Raycasting and cursor collaboration
import {
  raycastFromScreen,
  raycastFromScreenWithFallback,
  disposeRaycaster,
  worldToScreen,
} from "@VTK/utils/vtkRaycaster.js";
import { vrManager } from "@Core/vr/VRManager.js";
import { vrControllers } from "@VTK/vr/VTKVRController.js";
import {
  updateCursorWorldPosition,
  clearCursorWorldPosition,
  setActiveInstance,
} from "@Collaboration/presence/cursors.js";

// Import manifest data - single source of truth for file type capabilities
// Note: The manifest is TypeScript but gets transpiled. For now, we'll define
// a reference here that will be replaced once the build system is fully set up.
// In the future, this will import from the generated registry.
import vtkManifestData from "./manifest.ts";

import vtkRenderer from "@kitware/vtk.js/Rendering/Core/Renderer";
import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";
import vtkRenderWindowInteractor from "@kitware/vtk.js/Rendering/Core/RenderWindowInteractor";
import vtkInteractorStyleTrackballCamera from "@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera";
import vtkOpenGLRenderWindow from "@kitware/vtk.js/Rendering/OpenGL/RenderWindow";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkConeSource from "@kitware/vtk.js/Filters/Sources/ConeSource";
import vtkCubeSource from "@kitware/vtk.js/Filters/Sources/CubeSource";
import vtkCylinderSource from "@kitware/vtk.js/Filters/Sources/CylinderSource";
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

    // ===========================================================================
    // RENDER INSTRUMENTATION (dev only)
    // ===========================================================================
    // Track renders per instance to verify only LIVE views are rendering
    this._renderCounts = new Map(); // instanceId -> count this second
    this._totalRenders = 0;
    this._lastReportTime = Date.now();

    // Start render reporting interval in dev mode
    if (process.env.NODE_ENV === "development") {
      setInterval(() => this._reportRenderStats(), 1000);
    }
  }

  /**
   * Report render statistics (dev only)
   * Prints per-second summary of renders across all instances
   */
  _reportRenderStats() {
    if (!window.__CIA_DEBUG_RENDER) return;

    const now = Date.now();
    const elapsed = (now - this._lastReportTime) / 1000;

    if (this._totalRenders > 0) {
      const perSecond = Math.round(this._totalRenders / elapsed);
      const breakdown = Array.from(this._renderCounts.entries())
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => `${id.slice(0, 8)}:${count}`)
        .join(", ");

      console.debug(
        `[VTK Renders] ${perSecond}/sec total | ${breakdown || "none"}`
      );
    }

    // Reset counters
    this._totalRenders = 0;
    this._renderCounts.clear();
    this._lastReportTime = now;
  }

  /**
   * Request a render for an instance (gated by isPaused)
   *
   * This is the ONLY way to trigger renders - all direct renderWindow.render()
   * calls should go through this method to enforce the lifecycle system.
   *
   * @param {Object} instanceData - Instance data from initialize()
   * @param {string} reason - Debug label for why render was requested
   * @returns {boolean} True if render was scheduled, false if skipped
   */
  _requestRender(instanceData, reason = "unknown") {
    if (!instanceData?.sceneObjects?.renderWindow) {
      return false;
    }

    // CRITICAL: Do not render paused instances
    if (instanceData.isPaused) {
      instanceData.needsRenderOnResume = true;
      if (window.__CIA_DEBUG_RENDER) {
        log.trace(
          `[SKIP RENDER] ${instanceData.instanceId} (paused) - ${reason}`
        );
      }
      return false;
    }

    // Coalesce multiple render requests per frame
    if (instanceData._pendingRender) {
      return true; // Already scheduled
    }

    instanceData._pendingRender = true;

    requestAnimationFrame(() => {
      instanceData._pendingRender = false;

      // Double-check not paused (could have changed)
      if (instanceData.isPaused) {
        instanceData.needsRenderOnResume = true;
        return;
      }

      try {
        instanceData.sceneObjects.renderWindow.render();

        // Track for instrumentation
        if (process.env.NODE_ENV === "development") {
          this._totalRenders++;
          const count = this._renderCounts.get(instanceData.instanceId) || 0;
          this._renderCounts.set(instanceData.instanceId, count + 1);

          if (window.__CIA_DEBUG_RENDER) {
            log.trace(`[RENDER] ${instanceData.instanceId} - ${reason}`);
          }
        }
      } catch (e) {
        log.warn(`Render failed for ${instanceData.instanceId}: ${e.message}`);
      }
    });

    return true;
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
   * SINGLE SOURCE OF TRUTH: File types this handler supports
   *
   * MANIFEST-DRIVEN: This method now returns data from the manifest.
   * The manifest (./manifest.ts) is the canonical source of truth.
   * Both client (this handler) and server (via registry.json) use the same data.
   *
   * To add support for new formats, edit manifest.ts - NOT this method.
   */
  getSupportedFileTypes() {
    // Return file types from manifest, ensuring the format matches interface expectations
    // The manifest uses TypeScript types, but the structure is compatible
    return vtkManifestData.fileTypes.map((ft) => ({
      extension: ft.extension,
      mimeType: ft.mimeType,
      displayName: ft.displayName,
      icon: ft.icon,
      color: ft.color,
      capabilities: {
        canRender: ft.capabilities.canRender,
        canExtractMetadata: ft.capabilities.canExtractMetadata,
        canExport: ft.capabilities.canExport,
      },
      priority: ft.priority,
    }));
  }

  /**
   * Initialize a new VTK instance with LAZY rendering
   */
  async initialize(containerElement, options = {}) {
    const { instanceId, datasetId, viewConfigId } = options;

    log.info(`Initializing instance ${instanceId} (lazy mode)`);

    const stateAdapter = new ViewStateAdapter(instanceId, "vtk");
    log.debug(`Created stateAdapter for ${instanceId}`);

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
      containerElement,
      null, // sceneObjects not yet available
      instanceData.viewConfigId // Pass viewConfigId for collaborative matching
    );
    log.debug(`Cursors initialized for ${instanceData.instanceId}`);

    log.info(`Instance ${instanceId} created (awaiting data)`);
    return instanceData;
  }

  /**
   * Clean up instance resources
   */
  async cleanup(instanceData) {
    const { instanceId } = instanceData;

    log.info(`Cleaning up instance ${instanceId}`);

    // CLEAN UP FEATURES FIRST (before sceneObjects are destroyed)
    await this.reductionFeature.cleanup(instanceId);
    vtkOrientationWidget.cleanup(instanceId);

    vtkInstanceCursors.cleanupInstance(instanceId);
    log.debug(`Cursors cleaned up for ${instanceId}`);

    // Clean up cursor event listeners
    if (instanceData._cursorHandlers && instanceData.container) {
      const {
        handleMouseMove,
        handleMouseLeave,
        handleMouseEnter,
        handleClick,
        handleContextMenu,
      } = instanceData._cursorHandlers;
      instanceData.container.removeEventListener("mousemove", handleMouseMove);
      instanceData.container.removeEventListener(
        "mouseleave",
        handleMouseLeave
      );
      instanceData.container.removeEventListener(
        "mouseenter",
        handleMouseEnter
      );
      if (handleClick) {
        instanceData.container.removeEventListener("click", handleClick, {
          capture: true,
        });
      }
      if (handleContextMenu) {
        instanceData.container.removeEventListener(
          "contextmenu",
          handleContextMenu
        );
      }
      instanceData._cursorHandlers = null;
      log.debug(`Cursor event listeners removed for ${instanceId}`);
    }

    // Dispose raycaster for this instance
    disposeRaycaster(instanceId);
    log.debug(`Raycaster disposed for ${instanceId}`);

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

    log.info(`Instance ${instanceId} cleaned up`);
  }

  // ===========================================================================
  // LIFECYCLE MANAGEMENT (pause/resume for performance optimization)
  // ===========================================================================

  /**
   * Pause an instance - stops interactions and prevents continuous GPU work
   *
   * PAUSED instances:
   * - Keep their WebGL context and rendered frame visible
   * - Unbind interactor events (no mouse/keyboard input)
   * - Skip camera sync callbacks (no Y.js updates)
   * - Don't receive animation frame updates
   *
   * This enables warm-caching of recently used instances without GPU load.
   *
   * @param {Object} instanceData - Instance data from initialize()
   * @returns {boolean} True if paused successfully
   */
  pauseInstance(instanceData) {
    if (!instanceData || !instanceData.sceneObjects) {
      log.warn(
        `Cannot pause instance ${instanceData?.instanceId}: not initialized`
      );
      return false;
    }

    if (instanceData.isPaused) {
      log.debug(`Instance ${instanceData.instanceId} already paused`);
      return true;
    }

    const { interactor } = instanceData.sceneObjects;
    const { container, instanceId } = instanceData;

    log.debug(`Pausing instance ${instanceId}`);

    // 1. Unbind VTK interactor events (stops mouse/keyboard handling)
    if (interactor) {
      try {
        interactor.unbindEvents();
        log.trace(`Interactor events unbound for ${instanceId}`);
      } catch (e) {
        log.warn(`Failed to unbind interactor events: ${e.message}`);
      }
    }

    // 2. Unbind custom DOM event handlers (cursor broadcasting, raycasting)
    // These are stored in instanceData._domHandlers during initialization
    if (instanceData._domHandlers && container) {
      const handlers = instanceData._domHandlers;
      if (handlers.mousemove)
        container.removeEventListener("mousemove", handlers.mousemove);
      if (handlers.mousedown)
        container.removeEventListener("mousedown", handlers.mousedown);
      if (handlers.mouseleave)
        container.removeEventListener("mouseleave", handlers.mouseleave);
      log.trace(`DOM handlers unbound for ${instanceId}`);
    }

    // 3. Mark as paused (camera.onModified(), _requestRender() check this flag)
    instanceData.isPaused = true;

    // 4. Clear any pending render
    instanceData._pendingRender = false;

    // 5. Add visual indicator class (optional, for debugging)
    if (container) {
      container.classList.add("vtk-instance--paused");
    }

    log.info(`Instance ${instanceId} paused`);
    return true;
  }

  /**
   * Resume an instance - restores interactions and enables GPU updates
   *
   * LIVE instances:
   * - Rebind interactor events for mouse/keyboard input
   * - Resume camera sync callbacks
   * - Force a single render to ensure display is current
   *
   * @param {Object} instanceData - Instance data from initialize()
   * @returns {boolean} True if resumed successfully
   */
  resumeInstance(instanceData) {
    if (!instanceData || !instanceData.sceneObjects) {
      log.warn(
        `Cannot resume instance ${instanceData?.instanceId}: not initialized`
      );
      return false;
    }

    if (!instanceData.isPaused) {
      log.debug(
        `Instance ${instanceData.instanceId} not paused, nothing to resume`
      );
      return true;
    }

    const { interactor, renderer } = instanceData.sceneObjects;
    const { container, instanceId } = instanceData;

    log.debug(`Resuming instance ${instanceId}`);

    // 1. Clear paused flag FIRST (so camera callbacks and renders work)
    instanceData.isPaused = false;

    // 2. Rebind interactor events
    if (interactor && container) {
      try {
        interactor.bindEvents(container);
        log.trace(`Interactor events rebound for ${instanceId}`);
      } catch (e) {
        log.warn(`Failed to rebind interactor events: ${e.message}`);
      }
    }

    // 3. Rebind custom DOM event handlers (cursor broadcasting, etc.)
    if (instanceData._domHandlers && container) {
      const handlers = instanceData._domHandlers;
      if (handlers.mousemove)
        container.addEventListener("mousemove", handlers.mousemove);
      if (handlers.mousedown)
        container.addEventListener("mousedown", handlers.mousedown);
      if (handlers.mouseleave)
        container.addEventListener("mouseleave", handlers.mouseleave);
      log.trace(`DOM handlers rebound for ${instanceId}`);
    }

    // 4. Remove visual indicator class
    if (container) {
      container.classList.remove("vtk-instance--paused");
    }

    // 5. Handle pending resize or state changes while paused
    if (instanceData.needsRenderOnResume) {
      // Reset camera if we have data and size changed while paused
      if (instanceData.hasData && renderer) {
        try {
          renderer.resetCamera();
          log.trace(`Camera reset on resume for ${instanceId}`);
        } catch (e) {
          log.warn(`Failed to reset camera on resume: ${e.message}`);
        }
      }
      instanceData.needsRenderOnResume = false;
    }

    // 6. Request render to ensure display is current (via gated method)
    this._requestRender(instanceData, "resume");

    log.info(`Instance ${instanceId} resumed`);
    return true;
  }

  /**
   * Check if an instance is paused
   * @param {Object} instanceData - Instance data from initialize()
   * @returns {boolean} True if paused
   */
  isInstancePaused(instanceData) {
    return instanceData?.isPaused === true;
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
  /**
   * Load data into an existing VTK instance
   *
   * WORKFLOW:
   * 1. Validate dataset and file type
   * 2. Get raw file from DatasetManager (may trigger fetch)
   * 3. Check for cached parsed data
   * 4. If no cache, parse the file
   * 5. Initialize VTK pipeline if first load
   * 6. Update visualization
   */
  // Fix for the loadData method in src/core/instances/types/vtk/VTKInstanceHandler.js
  // The issue: _initializeVTKPipeline returns sceneObjects, but assignment is missing or incorrect

  async loadData(instanceData, dataset) {
    const instanceId = instanceData.instanceId;

    log.info(`Loading data into instance ${instanceId}`);
    log.debug(`Dataset: ${dataset.filename}`);

    // Validate file type
    const fileType = dataset.fileType;

    if (!fileType) {
      throw new Error(
        `Dataset ${dataset.id} (${dataset.filename}) has no fileType. ` +
          `This indicates a bug in dataset creation.`
      );
    }

    log.debug(`File type: ${fileType}`);

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
      log.debug(`Using cached VTK polydata`);
      polydata = cached.data;
    } else {
      log.debug(`Parsing ${fileType.toUpperCase()} file...`);

      // Get the raw file (DatasetManager handles fetching if needed)
      // Use loadFile() or loadPolydata() depending on what you named it
      const rawFile = await datasetManager.loadFile(dataset.id);

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

      log.debug(`Parsed and cached`);
      log.trace(`Points: ${metadata.pointCount.toLocaleString()}`);
    }

    // Initialize VTK pipeline if this is the first data load
    if (!instanceData.sceneObjects) {
      log.debug(`First data load - initializing VTK pipeline...`);

      // CRITICAL FIX: Make sure to assign the returned sceneObjects!
      const pipelineObjects = this._initializeVTKPipeline(instanceData);

      // DIAGNOSTIC: Log what we got back
      log.trace(
        `Pipeline returned:`,
        pipelineObjects ? "objects" : "null/undefined"
      );

      if (!pipelineObjects) {
        throw new Error("_initializeVTKPipeline returned null or undefined!");
      }

      // Assign it to instanceData
      instanceData.sceneObjects = pipelineObjects;
      instanceData.initialized = true;

      log.debug(`VTK pipeline ready`);

      // DIAGNOSTIC: Verify assignment worked
      log.trace(
        `instanceData.sceneObjects is now:`,
        instanceData.sceneObjects ? "assigned" : "STILL NULL!"
      );
    }

    // Initialize instance tools (needed for widgets and rendering controls)
    // Use instanceData.sceneObjects which is now guaranteed to be set
    instanceTools.initializeTools(instanceId, instanceData.sceneObjects);
    log.debug(`Instance tools initialized`);

    // Initialize orientation widget (always create it, but start enabled)
    // Using smaller sizes for proportional scaling in tight layouts
    vtkOrientationWidget.initialize(instanceId, instanceData.sceneObjects, {
      enabled: true,
      corner: "BOTTOM_RIGHT",
      viewportSize: 0.12,
      minPixelSize: 40,
      maxPixelSize: 100,
    });

    log.debug(`Orientation widget initialized`);

    // CRITICAL: Add safety check before using sceneObjects
    if (!instanceData.sceneObjects) {
      throw new Error(
        `CRITICAL ERROR: instanceData.sceneObjects is null after initialization! ` +
          `This should never happen.`
      );
    }

    // Update the visualization with new data
    log.debug(`Updating visualization...`);

    const { mapper, actor, renderer, renderWindow } = instanceData.sceneObjects;

    // Safety checks for each object
    if (!mapper) throw new Error("mapper is missing from sceneObjects!");
    if (!actor) throw new Error("actor is missing from sceneObjects!");
    if (!renderer) throw new Error("renderer is missing from sceneObjects!");
    if (!renderWindow)
      throw new Error("renderWindow is missing from sceneObjects!");

    // Set the data
    mapper.setInputData(polydata);

    // CRITICAL: Prevent Y.js sync during initial camera setup
    // Without this, resetCamera() broadcasts default position to all users
    this._isApplyingRemoteState = true;

    try {
      // Reset camera to frame the data (default position)
      renderer.resetCamera();

      // Restore saved camera state from ViewConfiguration if reopening an existing view
      if (instanceData.viewConfigId) {
        const viewConfig = getViewConfigurationManager()?.getView(
          instanceData.viewConfigId
        );
        if (viewConfig?.camera) {
          log.debug(
            `Restoring saved camera state for view ${instanceData.viewConfigId}`
          );
          const camera = instanceData.sceneObjects.camera;
          const savedCamera = viewConfig.camera;

          // Apply saved camera state
          if (savedCamera.position) camera.setPosition(...savedCamera.position);
          if (savedCamera.focalPoint)
            camera.setFocalPoint(...savedCamera.focalPoint);
          if (savedCamera.viewUp) camera.setViewUp(...savedCamera.viewUp);
          if (savedCamera.parallelScale)
            camera.setParallelScale(savedCamera.parallelScale);
          if (savedCamera.clippingRange)
            camera.setClippingRange(...savedCamera.clippingRange);
          if (savedCamera.viewAngle) camera.setViewAngle(savedCamera.viewAngle);

          log.debug(`Camera state restored`);
        }
      }
    } finally {
      // Re-enable Y.js sync after initial setup is complete
      this._isApplyingRemoteState = false;
    }

    // Store dataset reference
    instanceData.dataset = dataset;
    instanceData.polydata = polydata;
    instanceData.hasData = true;

    // Mark data as loaded for raycasting/annotation support
    if (instanceData.markDataLoaded) {
      instanceData.markDataLoaded();
    }

    // Render (gated by isPaused)
    this._requestRender(instanceData, "data-loaded");

    log.info(`Data loaded successfully`);
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
    log.debug(`Extracting metadata from ${fileType} file`);

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
      log.warn(`Could not extract metadata:`, error.message);
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
        log.warn("Error checking data capabilities:", error);
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

            log.debug(`Camera switched to: ${viewId}`);
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
            log.debug("Line measurement clicked");
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
            log.debug("Angle measurement clicked");
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
            log.debug("Clipping plane clicked");
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
            log.debug("Clear all widgets clicked");
            // Check CURRENT widget state at click time, not captured values
            const currentLineActive =
              instanceTools.isWidgetActive?.(instanceId, "line") || false;
            const currentAngleActive =
              instanceTools.isWidgetActive?.(instanceId, "angle") || false;
            const currentPlaneActive =
              instanceTools.isWidgetActive?.(instanceId, "plane") || false;

            if (currentLineActive) {
              instanceTools.toggleRulerMeasurement?.(instanceId);
            }
            if (currentAngleActive) {
              instanceTools.toggleAngleMeasurement?.(instanceId);
            }
            if (currentPlaneActive) {
              instanceTools.toggleClippingPlane?.(instanceId);
            }
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
            log.debug("PCA clicked");
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
            log.debug("t-SNE clicked");
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
            log.debug("UMAP clicked");
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
            log.debug("2D projection clicked");
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
            log.debug("3D projection clicked");
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
            log.debug("Restore original clicked");
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
                formatValue: (val) => `${Math.round(val)}%`,
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
            log.debug(`Colormap changed to: ${colormapId}`);
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
                formatValue: (val) => `${Math.round(val)}%`,
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
                  log.debug(`Orientation widget moved to: ${positionId}`);
                },
              },
            ]
          : []),
      ],
    });

    log.debug(`Built ${tools.length} tools for instance ${instanceId}`);
    return tools;
  }

  /**
   * Force a render (useful after widget config changes)
   */
  forceRender(instanceId) {
    const instanceData = this.instances.get(instanceId);
    if (instanceData) {
      this._requestRender(instanceData, "force-render");
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
   * Get formatted metadata string for dataset display in file tree
   */
  getDatasetMetadataString(dataset) {
    if (!dataset) {
      return "Unknown";
    }
    const parts = [];
    // Add point count if available
    if (dataset.pointCount !== undefined && dataset.pointCount !== null) {
      parts.push(`${dataset.pointCount.toLocaleString()} points`);
    }

    // Add file type info
    if (dataset.fileType) {
      const typeConfig = this.getSupportedFileTypes().find(
        (t) => t.extension.toLowerCase() === dataset.fileType.toLowerCase()
      );
      if (typeConfig) {
        parts.push(typeConfig.displayName);
      } else {
        parts.push(dataset.fileType.toUpperCase());
      }
    }
    return parts.length > 0 ? parts.join(" • ") : "VTK Data";
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

    log.trace(
      `Extracted: ${metadata.pointCount} points, ${metadata.cellCount} cells`
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
  // THUMBNAIL RENDERING
  // ===========================================================================

  /**
   * Render a minimal VTK visualization for thumbnail capture
   *
   * This creates ONLY a VTK canvas - no headers, no tools, no instance chrome.
   * Called by the embed page (in headless browser) to capture screenshots.
   *
   * The resulting image should look exactly like the content area of an
   * instance window, enabling progressive loading where the thumbnail
   * appears to be rendered 3D until the live renderer takes over.
   *
   * @param {HTMLElement} container - DOM element to render into
   * @param {string} datasetId - Dataset/file ID to render
   * @param {Object} options - Render options
   * @param {number} [options.width=800] - Width in pixels
   * @param {number} [options.height=600] - Height in pixels
   * @param {Object} [options.camera] - Optional camera state to apply
   * @param {Function} [options.onReady] - Called when ready for screenshot
   * @param {Function} [options.onError] - Called on error
   * @returns {Function} Cleanup function
   */
  renderForThumbnail(container, datasetId, options = {}) {
    const {
      width = 800,
      height = 600,
      camera: savedCamera = null,
      onReady,
      onError,
    } = options;

    // Track state for cleanup
    let vtkObjects = null;
    let mounted = true;

    // API base - embed page may set this globally
    const API_BASE = window.API_BASE_URL || "http://localhost:3001/api";

    // Async render function
    const doRender = async () => {
      try {
        log.info(
          `[Thumbnail] Rendering dataset ${datasetId} at ${width}x${height}`
        );

        // ---------------------------------------------------------------------
        // Step 1: Fetch raw file data via API
        // ---------------------------------------------------------------------
        // Direct API call - no DatasetManager, no auth context needed
        // The thumbnail worker has internal network access to the API

        const response = await fetch(`${API_BASE}/files/${datasetId}/download`);

        if (!response.ok) {
          throw new Error(
            `Fetch failed: ${response.status} ${response.statusText}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!mounted) return;

        log.debug(
          `[Thumbnail] Fetched ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`
        );

        // ---------------------------------------------------------------------
        // Step 2: Parse VTP file
        // ---------------------------------------------------------------------
        const reader = vtkXMLPolyDataReader.newInstance();
        reader.parseAsArrayBuffer(arrayBuffer);
        const polyData = reader.getOutputData(0);

        if (!polyData) {
          throw new Error("Failed to parse file - no output data");
        }

        const pointCount = polyData.getNumberOfPoints();
        if (pointCount === 0) {
          throw new Error("File contains no geometry");
        }

        log.debug(`[Thumbnail] Parsed: ${pointCount.toLocaleString()} points`);
        if (!mounted) return;

        // ---------------------------------------------------------------------
        // Step 3: Create minimal VTK pipeline
        // ---------------------------------------------------------------------
        // Key differences from full instance:
        // - No interactor (no mouse interaction needed)
        // - No widgets (no orientation cube, tools, etc.)
        // - No resize observer (fixed size, render once)
        // - preserveDrawingBuffer: true (CRITICAL for screenshots!)

        const renderer = vtkRenderer.newInstance();
        renderer.setBackground(0.04, 0.04, 0.04); // Match app background

        const renderWindow = vtkRenderWindow.newInstance();
        renderWindow.addRenderer(renderer);

        // CRITICAL: preserveDrawingBuffer must be true for screenshots!
        // Without this, WebGL clears the framebuffer after compositing
        // and canvas.toDataURL() returns black.
        //
        // WebGL context attributes are set at creation time and CANNOT be changed.
        // We must create the canvas ourselves with the right attributes FIRST,
        // then tell VTK.js to use our existing canvas.

        // Step A: Create canvas element
        const glCanvas = document.createElement("canvas");
        glCanvas.width = width;
        glCanvas.height = height;
        glCanvas.style.width = "100%";
        glCanvas.style.height = "100%";
        container.appendChild(glCanvas);

        // Step B: Create WebGL context WITH preserveDrawingBuffer BEFORE VTK.js touches it
        const gl =
          glCanvas.getContext("webgl2", {
            preserveDrawingBuffer: true,
            alpha: true,
            antialias: true,
            depth: true,
            stencil: false,
            premultipliedAlpha: true,
            powerPreference: "default",
          }) ||
          glCanvas.getContext("webgl", {
            preserveDrawingBuffer: true,
            alpha: true,
            antialias: true,
            depth: true,
            stencil: false,
            premultipliedAlpha: true,
            powerPreference: "default",
          });

        if (!gl) {
          throw new Error("Failed to create WebGL context");
        }

        // Verify preserveDrawingBuffer is set
        const attrs = gl.getContextAttributes();
        log.debug(`[Thumbnail] WebGL context attributes:`, attrs);
        if (!attrs?.preserveDrawingBuffer) {
          log.warn("[Thumbnail] WARNING: preserveDrawingBuffer is false!");
        }

        // Step C: Create VTK OpenGL render window and give it our pre-configured canvas
        const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance();

        // Use setCanvas if available (newer VTK.js), otherwise setContainer
        if (typeof openGLRenderWindow.setCanvas === "function") {
          openGLRenderWindow.setCanvas(glCanvas);
          log.debug(
            "[Thumbnail] Using setCanvas() - canvas with preserveDrawingBuffer"
          );
        } else {
          // Fallback: set container but canvas already exists with our context
          openGLRenderWindow.setContainer(container);
          log.debug("[Thumbnail] Using setContainer() - canvas pre-created");
        }

        openGLRenderWindow.setSize(width, height);
        renderWindow.addView(openGLRenderWindow);

        // Create mapper and actor
        const mapper = vtkMapper.newInstance();
        mapper.setInputData(polyData);

        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);

        // Add to scene
        renderer.addActor(actor);

        // Get camera reference
        const camera = renderer.getActiveCamera();

        // ---------------------------------------------------------------------
        // Step 4: Apply camera state
        // ---------------------------------------------------------------------
        if (savedCamera) {
          // Apply saved view camera (for bookmarks/saved views)
          log.debug("[Thumbnail] Applying saved camera state");

          if (savedCamera.position) camera.setPosition(...savedCamera.position);
          if (savedCamera.focalPoint)
            camera.setFocalPoint(...savedCamera.focalPoint);
          if (savedCamera.viewUp) camera.setViewUp(...savedCamera.viewUp);
          if (savedCamera.parallelScale)
            camera.setParallelScale(savedCamera.parallelScale);
          if (savedCamera.clippingRange)
            camera.setClippingRange(...savedCamera.clippingRange);
          if (savedCamera.viewAngle) camera.setViewAngle(savedCamera.viewAngle);
        } else {
          // Default: reset camera to fit data
          renderer.resetCamera();
        }

        // ---------------------------------------------------------------------
        // Step 5: Render and synchronize WebGL
        // ---------------------------------------------------------------------
        renderWindow.render();

        // Store for cleanup
        vtkObjects = {
          renderer,
          renderWindow,
          openGLRenderWindow,
          mapper,
          actor,
          reader,
          camera,
        };

        // ---------------------------------------------------------------------
        // Step 6: Synchronize WebGL for screenshot capture
        // ---------------------------------------------------------------------
        // WebGL commands are asynchronous. After render(), the GPU commands
        // are queued but may not have executed. For screenshot capture, we need
        // to ensure the framebuffer is fully rendered.

        // Get the WebGL context from the VTK OpenGL render window
        const canvas = container.querySelector("canvas");
        if (canvas) {
          const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
          if (gl) {
            // gl.finish() blocks until all queued WebGL commands have completed
            // This ensures the framebuffer has actual content
            gl.finish();
            log.debug("[Thumbnail] WebGL synchronized via gl.finish()");
          }
        }

        // Wait for next animation frame to ensure browser compositing is complete
        // This is the final step to ensure the canvas pixel data is readable
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            // Do a second render to be absolutely sure content is visible
            renderWindow.render();

            // Synchronize again after the second render
            if (canvas) {
              const gl =
                canvas.getContext("webgl2") || canvas.getContext("webgl");
              if (gl) {
                gl.finish();
              }
            }

            // Give browser a moment to composite
            setTimeout(resolve, 50);
          });
        });

        log.info("[Thumbnail] Render complete, signaling ready");

        // Signal ready for screenshot capture
        if (mounted) {
          onReady?.();
        }
      } catch (err) {
        log.error("[Thumbnail] Render failed:", err.message);
        if (mounted) {
          onError?.(err.message);
        }
      }
    };

    // Start render
    doRender();

    // Return cleanup function
    return () => {
      mounted = false;

      if (vtkObjects) {
        try {
          // Delete VTK objects (order matters - children before parents)
          vtkObjects.actor?.delete();
          vtkObjects.mapper?.delete();
          vtkObjects.openGLRenderWindow?.setContainer(null);
          vtkObjects.openGLRenderWindow?.delete();
          vtkObjects.renderWindow?.delete();
          vtkObjects.renderer?.delete();
          vtkObjects.reader?.delete();
        } catch (err) {
          log.warn("[Thumbnail] Cleanup warning:", err.message);
        }
        vtkObjects = null;
      }
    };
  }

  // ===========================================================================
  // COLLABORATION METHODS
  // ===========================================================================

  /**
   * Get VTK-specific default view state
   *
   * This provides the default camera configuration and colormap settings
   * for VTK 3D visualization.
   *
   * @returns {Object} VTK default view state
   */
  getDefaultViewState() {
    return {
      camera: {
        position: [0, 0, 100],
        focalPoint: [0, 0, 0],
        viewUp: [0, 1, 0],
        parallelScale: 1,
        parallelProjection: false,
      },
      colorMaps: {
        active: "rainbow",
        preset: null,
        range: [0, 1],
        opacity: 1.0,
      },
      filters: [],
      widgets: [],
    };
  }

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

    // Only render if not paused
    this._requestRender(instanceData, "cursor-visibility");
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
      // Only render if not paused - visual update deferred to resume
      this._requestRender(instanceData, "cursor-update");
    }
  }

  /**
   * Set annotation visibility
   */
  async setAnnotationVisibility(instanceData, visible, annotations = []) {
    if (!instanceData?.initialized) return;

    log.debug(
      `setAnnotationVisibility: visible=${visible}, annotations=${annotations.length}`
    );

    if (visible && annotations.length > 0) {
      // Calculate marker size based on data bounds
      let markerSize = 0.5; // Default fallback size
      const actor = instanceData.sceneObjects?.actor;
      if (actor?.getBounds) {
        const bounds = actor.getBounds();
        // Calculate diagonal of bounding box
        const dx = bounds[1] - bounds[0];
        const dy = bounds[3] - bounds[2];
        const dz = bounds[5] - bounds[4];
        const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);
        // Marker size = 2% of diagonal (visible but not overwhelming)
        markerSize = Math.max(0.1, diagonal * 0.02);
        log.debug(
          `Annotation marker size: ${markerSize.toFixed(
            3
          )} (diagonal: ${diagonal.toFixed(2)})`
        );
      }

      // Create annotation actors
      annotations.forEach((annotation) => {
        if (!instanceData.annotations.has(annotation.id)) {
          log.debug(
            `Creating annotation actor for: ${
              annotation.id
            } at ${JSON.stringify(annotation.position)}`
          );
          const annotationActor = this._createAnnotationActor(
            annotation,
            markerSize
          );
          // Store both actor and annotation data (VTK actors are frozen, can't attach properties)
          instanceData.annotations.set(annotation.id, {
            actor: annotationActor,
            data: {
              id: annotation.id,
              type: annotation.type,
              text: annotation.text,
              label: annotation.label,
              position: annotation.position,
            },
          });
          instanceData.sceneObjects.renderer.addActor(annotationActor);
        }
      });
      log.info(`Rendered ${instanceData.annotations.size} annotation markers`);
    } else {
      // Remove all annotations
      instanceData.annotations.forEach((entry) => {
        instanceData.sceneObjects.renderer.removeActor(entry.actor);
      });
      instanceData.annotations.clear();
      log.debug(`Cleared all annotation markers`);
    }

    // Only render if not paused - visual update deferred to resume
    this._requestRender(instanceData, "annotation-visibility");
  }

  /**
   * Sync camera state from another user
   */
  async syncCamera(instanceData, cameraState) {
    if (!instanceData?.initialized || !cameraState) return;

    // CRITICAL: Skip camera sync for paused instances
    // This prevents render spam from other users' camera movements
    if (instanceData.isPaused) {
      instanceData.needsRenderOnResume = true;
      return;
    }

    const camera = instanceData.sceneObjects.camera;
    camera.setPosition(cameraState.position);
    camera.setFocalPoint(cameraState.focalPoint);
    camera.setViewUp(cameraState.viewUp);
    this._requestRender(instanceData, "camera-sync");
  }

  /**
   * Raycast from screen coordinates to find 3D world position
   * Used for click-to-annotate functionality
   *
   * @param {Object} instanceData - Instance-specific data with sceneObjects
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {HTMLElement} container - The container element
   * @returns {Object|null} { hit: boolean, position: {x,y,z}, normal: {x,y,z} } or null
   */
  raycastAt(instanceData, screenX, screenY, container) {
    if (!instanceData?.sceneObjects) {
      return null;
    }

    try {
      const result = raycastFromScreen(
        instanceData.sceneObjects,
        screenX,
        screenY,
        container,
        { instanceId: instanceData.instanceId }
      );

      if (result.hit && result.worldPosition) {
        return {
          hit: true,
          position: {
            x: result.worldPosition[0],
            y: result.worldPosition[1],
            z: result.worldPosition[2],
          },
          normal: result.normal
            ? {
                x: result.normal[0],
                y: result.normal[1],
                z: result.normal[2],
              }
            : null,
        };
      }

      return { hit: false, position: null, normal: null };
    } catch (error) {
      log.error(`Raycast error:`, error);
      return null;
    }
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
      log.warn("Cannot apply state: VTK not initialized yet");
      return;
    }

    // Set flag to prevent sync loops
    this._isApplyingRemoteState = true;

    try {
      log.debug(`Applying remote state from user ${sourceUserId}`);

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
            log.debug(
              `Applying remote reduction: ${state.reduction.method} (${state.reduction.components}D)`
            );
            await this.reductionFeature.applyReduction(
              instanceId,
              state.reduction.method,
              state.reduction.components,
              { skipSync: true }
            );
          } else {
            // Restore original (no reduction) (skipSync to avoid infinite loop)
            log.debug(
              `Restoring original data (remote user removed reduction)`
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

      // Trigger render to show the changes (gated by isPaused)
      this._requestRender(instanceData, "remote-state");
    } catch (error) {
      log.error("Failed to apply remote state:", error);
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
      log.warn(
        `Cannot apply camera state - instance ${instanceId} not initialized`
      );
      return;
    }

    // Skip for paused instances
    if (instanceData.isPaused) {
      instanceData.needsRenderOnResume = true;
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

      this._requestRender(instanceData, "apply-camera-state");

      log.debug(`Applied camera state to instance ${instanceId}`);
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
   * Get the WebGL context for this instance
   * Used by VRButton to pass to VRManager
   */
  getWebGLContext(instanceId) {
    const instanceData = this.instances.get(instanceId);
    if (!instanceData?.sceneObjects?.openGLRenderWindow) {
      return null;
    }

    // Get the WebGL context from VTK's OpenGL render window
    const openGLRenderWindow = instanceData.sceneObjects.openGLRenderWindow;
    const canvas = openGLRenderWindow.getCanvas();
    if (!canvas) return null;

    // Try to get existing WebGL2 context or create XR-compatible one
    let gl = canvas.getContext("webgl2", { xrCompatible: true });
    if (!gl) {
      gl = canvas.getContext("webgl", { xrCompatible: true });
    }

    return gl;
  }

  /**
   * Enter VR mode for this instance
   *
   * Sets up stereo rendering and controller visualization for WebXR
   *
   * @param {Object} instanceData - The instance data object
   * @param {XRSession} xrSession - The active XR session from VRManager
   * @returns {Object} VR context data
   */
  async enterInstanceVR(instanceData, xrSession) {
    const { instanceId, sceneObjects } = instanceData;
    log.info(`Entering VR for VTK instance ${instanceId}`);

    if (!sceneObjects) {
      throw new Error("Cannot enter VR: instance not initialized");
    }

    const { renderer, renderWindow, openGLRenderWindow, camera } = sceneObjects;

    // Store original camera state for restoration
    const originalCameraState = {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
      parallelScale: camera.getParallelScale(),
      clippingRange: camera.getClippingRange(),
      viewAngle: camera.getViewAngle(),
    };

    // Get WebGL context
    const canvas = openGLRenderWindow.getCanvas();
    const gl =
      canvas.getContext("webgl2", { xrCompatible: true }) ||
      canvas.getContext("webgl", { xrCompatible: true });

    if (!gl) {
      throw new Error("Could not get WebGL context for VR");
    }

    // Make context XR compatible
    await gl.makeXRCompatible();

    // Create XR WebGL layer
    const xrLayer = new XRWebGLLayer(xrSession, gl);

    // Update session render state
    await xrSession.updateRenderState({
      baseLayer: xrLayer,
    });

    // Get reference space
    const referenceSpace = vrManager.getReferenceSpace();

    // Create VR data context
    const vrData = {
      xrSession,
      xrLayer,
      gl,
      referenceSpace,
      originalCameraState,
      isActive: true,
      frameHandler: null,
      scaleMultiplier: 1.0, // Adjust if scene units != meters
    };

    // Calculate scene scale (VTK units to meters)
    // If your data is in millimeters, set scaleMultiplier = 0.001
    const bounds = renderer.computeVisiblePropBounds();
    const diagonal = Math.sqrt(
      Math.pow(bounds[1] - bounds[0], 2) +
        Math.pow(bounds[3] - bounds[2], 2) +
        Math.pow(bounds[5] - bounds[4], 2)
    );

    // Auto-scale: try to make the model about 1 meter in VR
    if (diagonal > 0) {
      vrData.scaleMultiplier = 1.0 / diagonal;
      log.debug(
        `VR scale multiplier: ${vrData.scaleMultiplier} (diagonal: ${diagonal})`
      );
    }

    // Initialize controllers for this instance
    vrControllers.initialize(instanceId, sceneObjects, xrSession);

    // Store VR data on instance
    instanceData.vrData = vrData;

    // Subscribe to VRManager frame events
    vrData.frameHandler = (frameData) => {
      this._renderVRFrame(instanceData, vrData, frameData);
    };
    vrManager.on("frame", vrData.frameHandler);

    log.info(`VR initialized for instance ${instanceId}`);
    return vrData;
  }

  /**
   * Render a VR frame (called ~90 times per second)
   *
   * Handles stereo rendering by rendering the scene twice,
   * once for each eye with appropriate camera transforms.
   *
   * @private
   */
  _renderVRFrame(instanceData, vrData, frameData) {
    if (!vrData.isActive) return;

    const { frame, viewerPose, referenceSpace } = frameData;
    const { xrSession, xrLayer, gl, scaleMultiplier } = vrData;
    const { renderer, renderWindow, camera } = instanceData.sceneObjects;

    if (!viewerPose) {
      // No tracking - can't render
      return;
    }

    // Bind XR framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, xrLayer.framebuffer);

    // Clear the framebuffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render for each eye (left and right)
    for (const view of viewerPose.views) {
      const viewport = xrLayer.getViewport(view);

      // Set viewport for this eye
      gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

      // Update VTK camera for this XR view
      this._updateCameraForVRView(camera, view, scaleMultiplier);

      // Render the scene
      renderer.render();
    }

    // Update controller visualizations
    vrControllers.updatePoses(instanceData.instanceId, frame, referenceSpace);
  }

  /**
   * Update VTK camera to match an XR view (eye)
   *
   * Extracts position and orientation from the XR view transform
   * and applies it to the VTK camera.
   *
   * @private
   */
  _updateCameraForVRView(camera, xrView, scaleMultiplier = 1.0) {
    // Get the view transform (inverse gives us the camera position/orientation)
    const viewMatrix = xrView.transform.inverse.matrix;

    // Extract position from the 4x4 matrix
    // Column-major order: position is at indices 12, 13, 14
    const position = [
      viewMatrix[12] / scaleMultiplier,
      viewMatrix[13] / scaleMultiplier,
      viewMatrix[14] / scaleMultiplier,
    ];

    // Extract forward direction from the matrix
    // Forward is negative Z in WebXR (-column 2)
    const forward = [-viewMatrix[8], -viewMatrix[9], -viewMatrix[10]];

    // Extract up direction (column 1)
    const up = [viewMatrix[4], viewMatrix[5], viewMatrix[6]];

    // Calculate focal point (position + forward direction)
    const focalDistance = camera.getDistance() || 1.0;
    const focalPoint = [
      position[0] + forward[0] * focalDistance,
      position[1] + forward[1] * focalDistance,
      position[2] + forward[2] * focalDistance,
    ];

    // Apply to VTK camera
    camera.setPosition(...position);
    camera.setFocalPoint(...focalPoint);
    camera.setViewUp(...up);

    // Set projection matrix from XR
    // Note: VTK uses a different matrix format, so we need to convert
    const projMatrix = xrView.projectionMatrix;
    camera.setProjectionMatrix(projMatrix);
  }

  /**
   * Exit VR mode for this instance
   *
   * Restores original camera state and cleans up VR resources
   */
  async exitInstanceVR(instanceData) {
    const { instanceId, vrData, sceneObjects } = instanceData;

    if (!vrData) {
      log.warn(`No VR data to clean up for instance ${instanceId}`);
      return;
    }

    log.info(`Exiting VR for VTK instance ${instanceId}`);

    // Stop frame updates
    vrData.isActive = false;

    // Unsubscribe from VRManager frame events
    if (vrData.frameHandler) {
      vrManager.off("frame", vrData.frameHandler);
      vrData.frameHandler = null;
    }

    // Clean up controllers
    vrControllers.cleanup(instanceId);

    // Restore original camera state
    if (sceneObjects?.camera && vrData.originalCameraState) {
      const camera = sceneObjects.camera;
      const orig = vrData.originalCameraState;

      camera.setPosition(...orig.position);
      camera.setFocalPoint(...orig.focalPoint);
      camera.setViewUp(...orig.viewUp);
      camera.setParallelScale(orig.parallelScale);
      camera.setClippingRange(...orig.clippingRange);
      camera.setViewAngle(orig.viewAngle);

      // Clear the projection matrix so VTK computes it normally
      camera.setProjectionMatrix(null);
    }

    // Re-render to desktop view
    this._requestRender(instanceData, "vr-exit");

    // Clear VR data
    instanceData.vrData = null;

    log.info(`VR exited for instance ${instanceId}`);
  }

  /**
   * Update VR state (called every frame while in VR)
   * Most work is done in _renderVRFrame, but this can be used
   * for additional per-frame updates
   */
  async updateInstanceVR(instanceData, vrData, frame) {
    // Additional per-frame updates can go here
    // The main rendering is handled by _renderVRFrame
  }

  /**
   * Called when application enters VR mode
   * Prepares instance for VR context (optimize rendering, etc.)
   */
  async onApplicationVREnter(instanceData, vrContext) {
    log.debug(`Application VR enter for instance ${instanceData.instanceId}`);
    // Could add optimizations here like:
    // - Reduce polygon count
    // - Disable expensive effects
    // - Adjust LOD settings
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

    log.debug(
      `Initializing VTK rendering pipeline for ${instanceData.instanceId}`
    );

    // ✅ Remove placeholder safely instead of using innerHTML
    // React is managing this container, so we need to be surgical
    if (instanceData.placeholder) {
      try {
        if (instanceData.placeholder.parentNode === container) {
          container.removeChild(instanceData.placeholder);
        }
      } catch (e) {
        // Ignore if already removed
        log.warn("Placeholder already removed or not in DOM");
      }
      instanceData.placeholder = null;
    }

    // =========================================================================
    // PHASE 1: Create the rendering core (renderer + render window)
    // =========================================================================

    // Create the renderer (manages the 3D scene)
    const renderer = vtkRenderer.newInstance();
    renderer.setBackground(0.04, 0.04, 0.04);
    // 0.0 = Pure black
    // 0.04 = Very dark gray (current)
    // 0.1 = Medium dark gray
    // 0.5 = Medium gray
    // 1.0 = White

    // Create the abstract render window (manages renderers and views)
    const renderWindow = vtkRenderWindow.newInstance();
    renderWindow.addRenderer(renderer);

    // =========================================================================
    // PHASE 2: Create and connect the OpenGL view (WebGL rendering context)
    // THIS MUST HAPPEN BEFORE INTERACTOR INITIALIZATION
    // =========================================================================

    // Create the OpenGL render window (creates WebGL context)
    // IMPORTANT: preserveDrawingBuffer is required for thumbnail capture
    // Without it, WebGL clears the canvas after each frame and screenshots show black
    const openGLRenderWindow = vtkOpenGLRenderWindow.newInstance({
      preserveDrawingBuffer: true, // Required for screenshots/thumbnails
    });
    openGLRenderWindow.setContainer(container);

    // CRITICAL: Connect the OpenGL window to the render window
    // This must happen BEFORE we create/initialize the interactor
    renderWindow.addView(openGLRenderWindow);

    // Set the size based on container dimensions
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 800; // Fallback to reasonable default
    const height = Math.floor(rect.height) || 600;
    if (width > 0 && height > 0) {
      openGLRenderWindow.setSize(width, height);
    } else {
      log.warn("Container has no size, using defaults");
      openGLRenderWindow.setSize(800, 600);
    }

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
      try {
        // Skip camera sync when instance is paused (performance optimization)
        if (instanceData.isPaused) {
          return;
        }

        if (!this._isApplyingRemoteState && instanceData.viewConfigId) {
          const cameraState = {
            position: camera.getPosition(),
            focalPoint: camera.getFocalPoint(),
            viewUp: camera.getViewUp(),
            parallelScale: camera.getParallelScale(),
            clippingRange: camera.getClippingRange(),
            viewAngle: camera.getViewAngle(),
          };

          // REAL-TIME: Sync to Y.js for immediate updates to other users
          const userId = getUserId();
          if (userId) {
            syncCameraToYjs(instanceData.viewConfigId, userId, cameraState);
          }

          // PERSISTENCE: Sync to server via ViewConfigurationManager (throttled)
          getViewConfigurationManager()?.updateCamera(
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
        }
      } catch (error) {
        // Silently catch camera update errors to prevent error spam
        // These can happen during rapid camera movements or cleanup
        if (error) {
          log.trace("Camera update error (non-critical):", error.message);
        }
      }
    });

    // When user stops interacting, publish the final state
    const publishStateAfterInteraction = () => {
      try {
        // CRITICAL: Add the same defensive checks here
        if (!this._isApplyingRemoteState && instanceData.stateAdapter) {
          // Get complete state and publish it
          const state = this._getCurrentVTKState(instanceData);
          instanceData.stateAdapter.updateState(state, "local");
        }
      } catch (error) {
        // Silently catch interaction state errors
        if (error) {
          log.trace(
            "Interaction state update error (non-critical):",
            error.message
          );
        }
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
    renderer.addActor(actor);

    // src/core/instances/types/vtk/VTKInstanceHandler.js
    // SNIPPET: Fixed resize handling to recenter camera

    // =========================================================================
    // PHASE 5: Set up responsive resizing
    // =========================================================================

    // Handle container resize events with debouncing to prevent loops
    let lastWidth = width;
    let lastHeight = height;
    let resizeTimeout = null;

    // ✅ FIX: Track if we have data loaded so we know when to reset camera
    let hasDataLoaded = false;

    const resizeObserver = new ResizeObserver((entries) => {
      // Cancel any pending resize
      if (resizeTimeout) {
        cancelAnimationFrame(resizeTimeout);
      }

      // Schedule resize for next animation frame
      resizeTimeout = requestAnimationFrame(() => {
        // Safety check: only resize if objects still exist and aren't deleted
        if (openGLRenderWindow && !openGLRenderWindow.isDeleted()) {
          for (const entry of entries) {
            const newWidth = Math.floor(entry.contentRect.width);
            const newHeight = Math.floor(entry.contentRect.height);

            // Only update if size actually changed by a meaningful amount
            if (
              newWidth > 0 &&
              newHeight > 0 &&
              (Math.abs(newWidth - lastWidth) > 2 ||
                Math.abs(newHeight - lastHeight) > 2)
            ) {
              lastWidth = newWidth;
              lastHeight = newHeight;

              // Update the canvas size (always, so dimensions are correct on resume)
              openGLRenderWindow.setSize(newWidth, newHeight);

              // PERFORMANCE: Skip resetCamera and render when instance is PAUSED
              // This prevents GPU spikes from resize storms during pan/zoom in thumbnail modes
              // The size is still set above so dimensions are correct when resumed
              if (instanceData.isPaused) {
                // Mark that we need to re-render on resume (camera reset + render)
                instanceData.needsRenderOnResume = true;
                if (window.__CIA_DEBUG_RENDER) {
                  log.trace(
                    `[SKIP RESIZE RENDER] ${instanceData.instanceId} (paused)`
                  );
                }
                return;
              }

              // Reset camera to recenter the view ONLY if we have data loaded
              // This prevents parts of the visualization from becoming inaccessible
              if (hasDataLoaded && renderer) {
                renderer.resetCamera();
                log.trace(
                  `Canvas resized and camera recentered for ${instanceData.instanceId}`
                );
              }

              // Render the scene via gated method
              // Note: We can't call this._requestRender here because 'this' isn't
              // available in the closure. Instead we do the render directly since
              // we already checked isPaused above.
              renderWindow.render();

              // Track for instrumentation (inline since we can't access handler)
              if (
                process.env.NODE_ENV === "development" &&
                window.__CIA_DEBUG_RENDER
              ) {
                log.trace(`[RENDER] ${instanceData.instanceId} - resize`);
              }
            }
          }
        }
        resizeTimeout = null;
      });
    });

    resizeObserver.observe(container);

    // Store resizeObserver so it can be cleaned up later
    instanceData.resizeObserver = resizeObserver;

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

    // Also add a helper function to mark when data is loaded
    // This will be called from the loadData method after successfully loading
    instanceData.markDataLoaded = () => {
      hasDataLoaded = true;
    };

    // =========================================================================
    // PHASE 6: Set up 3D cursor broadcasting via raycasting
    // =========================================================================

    // Throttle configuration (~30fps)
    const CURSOR_UPDATE_INTERVAL = 33; // ms
    let lastCursorUpdate = 0;
    let cursorUpdatePending = false;

    // Mouse move handler for raycasting
    const handleMouseMove = (event) => {
      const now = Date.now();

      // Throttle updates
      if (now - lastCursorUpdate < CURSOR_UPDATE_INTERVAL) {
        // Schedule a final update if not already pending
        if (!cursorUpdatePending) {
          cursorUpdatePending = true;
          setTimeout(() => {
            cursorUpdatePending = false;
            handleMouseMove(event);
          }, CURSOR_UPDATE_INTERVAL - (now - lastCursorUpdate));
        }
        return;
      }

      lastCursorUpdate = now;

      // Set this instance as active for cursor tracking (include viewConfigId for collaboration)
      setActiveInstance(instanceData.instanceId, instanceData.viewConfigId);

      // Only raycast if we have data loaded
      if (!hasDataLoaded) {
        return;
      }

      // Perform raycasting
      try {
        const result = raycastFromScreen(
          sceneObjects,
          event.clientX,
          event.clientY,
          container,
          { instanceId: instanceData.instanceId }
        );

        if (result.hit && result.worldPosition) {
          // Update cursor with 3D world position
          updateCursorWorldPosition(
            {
              x: result.worldPosition[0],
              y: result.worldPosition[1],
              z: result.worldPosition[2],
            },
            result.normal
              ? {
                  x: result.normal[0],
                  y: result.normal[1],
                  z: result.normal[2],
                }
              : null
          );
        } else {
          // No hit - clear world position (will fall back to screen coords)
          clearCursorWorldPosition();
        }
      } catch (error) {
        log.trace("Cursor raycasting error (non-critical):", error.message);
      }
    };

    // Mouse leave handler - clear world position when leaving container
    const handleMouseLeave = () => {
      clearCursorWorldPosition();
      lastRaycastResult = null;
    };

    // Mouse enter handler - set active instance
    const handleMouseEnter = () => {
      setActiveInstance(instanceData.instanceId, instanceData.viewConfigId);
    };

    // Track last raycast result for click-to-annotate
    let lastRaycastResult = null;

    // Enhanced mouse move to store raycast result
    const handleMouseMoveWithRaycast = (event) => {
      handleMouseMove(event);

      // Store last raycast result for annotation clicks
      // Use raycastFromScreenWithFallback for better hit detection
      if (hasDataLoaded) {
        try {
          const result = raycastFromScreenWithFallback(
            sceneObjects,
            event.clientX,
            event.clientY,
            container,
            { instanceId: instanceData.instanceId }
          );
          if (result.hit) {
            lastRaycastResult = {
              position: {
                x: result.worldPosition[0],
                y: result.worldPosition[1],
                z: result.worldPosition[2],
              },
              normal: result.normal
                ? {
                    x: result.normal[0],
                    y: result.normal[1],
                    z: result.normal[2],
                  }
                : null,
              screenX: event.clientX,
              screenY: event.clientY,
            };
          } else {
            lastRaycastResult = null;
          }
        } catch (e) {
          // Ignore raycast errors
        }
      }
    };

    // Click handler for annotation mode
    // Uses capture phase to fire before VTK's interactor consumes the event
    const handleClick = (event) => {
      log.info(
        `Click detected on instance ${instanceData.instanceId}, annotationMode=${instanceData.annotationMode}, hasDataLoaded=${hasDataLoaded}`
      );

      // Check if annotation mode is enabled for this instance
      if (!instanceData.annotationMode) {
        return;
      }

      log.info("Annotation mode active, performing raycast...");

      // Use stored raycast result or perform new raycast
      let result = lastRaycastResult;
      log.info(`lastRaycastResult: ${result ? "exists" : "null"}`);

      if (!result && hasDataLoaded) {
        try {
          log.info(
            `Performing fresh raycast at (${event.clientX}, ${event.clientY})`
          );
          // Use raycastFromScreenWithFallback for better hit detection
          const rayResult = raycastFromScreenWithFallback(
            sceneObjects,
            event.clientX,
            event.clientY,
            container,
            { instanceId: instanceData.instanceId }
          );
          log.info(
            `Raycast result: hit=${rayResult.hit}, onViewRay=${
              rayResult.onViewRay || false
            }`
          );
          if (rayResult.hit) {
            result = {
              position: {
                x: rayResult.worldPosition[0],
                y: rayResult.worldPosition[1],
                z: rayResult.worldPosition[2],
              },
              normal: rayResult.normal
                ? {
                    x: rayResult.normal[0],
                    y: rayResult.normal[1],
                    z: rayResult.normal[2],
                  }
                : null,
              screenX: event.clientX,
              screenY: event.clientY,
            };
          }
        } catch (e) {
          log.warn("Annotation click raycast failed:", e);
        }
      }

      if (result) {
        // Emit annotation click event
        log.info(
          `Emitting cia:annotation-click event at (${result.position.x.toFixed(
            2
          )}, ${result.position.y.toFixed(2)}, ${result.position.z.toFixed(2)})`
        );
        window.dispatchEvent(
          new CustomEvent("cia:annotation-click", {
            detail: {
              instanceId: instanceData.instanceId,
              position: result.position,
              normal: result.normal,
              screenX: result.screenX,
              screenY: result.screenY,
            },
          })
        );
      } else {
        log.info("Annotation click: no surface hit (result is null)");
      }
    };

    // Find the nearest annotation to a screen position
    // Returns the annotation data if found within threshold, null otherwise
    const findNearestAnnotation = (screenX, screenY, threshold = 30) => {
      if (!instanceData.annotations || instanceData.annotations.size === 0) {
        return null;
      }

      let nearest = null;
      let minDistance = Infinity;

      instanceData.annotations.forEach((entry) => {
        const { data } = entry;
        if (!data || !data.position) return;

        // Get screen position of the annotation
        const position = data.position;
        const worldPos = Array.isArray(position)
          ? position
          : [position.x, position.y, position.z];

        const screenPos = worldToScreen(sceneObjects, worldPos, container);
        if (!screenPos) return;

        // Calculate distance from click to annotation
        const dx = screenX - screenPos.x;
        const dy = screenY - screenPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < threshold && distance < minDistance) {
          minDistance = distance;
          nearest = data;
        }
      });

      return nearest;
    };

    // Context menu (right-click) handler for annotations
    const handleContextMenu = (event) => {
      // Find if we clicked near an annotation
      const annotation = findNearestAnnotation(event.clientX, event.clientY);

      if (annotation) {
        // Prevent default context menu
        event.preventDefault();
        event.stopPropagation();

        log.info(`Annotation right-clicked: ${annotation.id}`);

        // Emit annotation context menu event
        window.dispatchEvent(
          new CustomEvent("cia:annotation-context-menu", {
            detail: {
              instanceId: instanceData.instanceId,
              annotation: annotation,
              screenX: event.clientX,
              screenY: event.clientY,
            },
          })
        );
      }
    };

    // Attach event listeners
    // Use capture phase for click to ensure we get the event before VTK's interactor
    container.addEventListener("mousemove", handleMouseMoveWithRaycast);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("click", handleClick, { capture: true });
    container.addEventListener("contextmenu", handleContextMenu);

    // Store handlers for cleanup
    instanceData._cursorHandlers = {
      handleMouseMove: handleMouseMoveWithRaycast,
      handleMouseLeave,
      handleMouseEnter,
      handleClick,
      handleContextMenu,
    };

    // Update VTKInstanceCursors with scene objects for 3D rendering
    vtkInstanceCursors.setSceneObjects(
      instanceData.instanceId,
      sceneObjects,
      instanceData.viewConfigId
    );

    log.info(`VTK pipeline initialized for ${instanceData.instanceId}`);
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
   * Create an annotation actor based on annotation type
   * @param {Object} annotation - Annotation data with type, position, text, etc.
   * @param {number} markerSize - Size of the marker relative to data bounds
   * @returns {vtkActor} VTK actor for the annotation marker
   */
  _createAnnotationActor(annotation, markerSize = 0.5) {
    // Type-to-shape mapping
    const ANNOTATION_SHAPES = {
      point: "sphere",
      note: "sphere",
      warning: "cone",
      info: "cube",
      measurement: "cylinder",
      region: "sphere",
      text: "sphere",
    };

    // Type-to-color mapping (RGB 0-1)
    const ANNOTATION_COLORS = {
      point: [0.298, 0.686, 0.314], // Green (#4CAF50)
      note: [0.298, 0.686, 0.314], // Green
      warning: [1.0, 0.655, 0.149], // Orange (#FFA726)
      info: [0.129, 0.588, 0.953], // Blue (#2196F3)
      measurement: [0.612, 0.153, 0.69], // Purple (#9C27B0)
      region: [0.0, 0.737, 0.831], // Cyan (#00BCD4)
      text: [0.914, 0.118, 0.388], // Pink (#E91E63)
    };

    const shape = ANNOTATION_SHAPES[annotation.type] || "sphere";
    const color = ANNOTATION_COLORS[annotation.type] || [0.298, 0.686, 0.314];

    // Get position from annotation (handle array or object format)
    const position = Array.isArray(annotation.position)
      ? annotation.position
      : [
          annotation.position?.x || 0,
          annotation.position?.y || 0,
          annotation.position?.z || 0,
        ];

    // Create source based on shape type
    let source;

    switch (shape) {
      case "cone":
        source = vtkConeSource.newInstance({
          height: markerSize * 2,
          radius: markerSize,
          resolution: 32,
          center: position,
          direction: [0, 1, 0], // Point up
        });
        break;
      case "cube":
        source = vtkCubeSource.newInstance({
          xLength: markerSize,
          yLength: markerSize,
          zLength: markerSize,
          center: position,
        });
        break;
      case "cylinder":
        source = vtkCylinderSource.newInstance({
          height: markerSize * 2,
          radius: markerSize * 0.5,
          resolution: 32,
          center: position,
        });
        break;
      case "sphere":
      default:
        source = vtkSphereSource.newInstance({
          radius: markerSize,
          thetaResolution: 32,
          phiResolution: 32,
          center: position,
        });
        break;
    }

    // Create mapper
    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(source.getOutputPort());

    // Create actor
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    // Set color and properties
    const property = actor.getProperty();
    property.setColor(...color);
    property.setOpacity(0.9);
    property.setAmbient(0.3);
    property.setDiffuse(0.7);
    property.setSpecular(0.2);

    // Note: VTK actors are frozen, so we cannot store annotation data on the actor
    // The annotation data is stored in the annotations Map alongside the actor

    return actor;
  }

  // ===========================================================================
  // CAMERA CONTROLS (Called via workspaceManager delegation)
  // ===========================================================================

  /**
   * Reset camera to fit all data in view
   * @param {Object} instanceData - Instance data object
   */
  resetCamera(instanceData) {
    if (!instanceData?.sceneObjects) {
      log.warn("Cannot reset camera: VTK not initialized");
      return;
    }
    instanceTools.resetCamera(instanceData.instanceId);
  }

  /**
   * Set camera to a standard view
   * @param {Object} instanceData - Instance data object
   * @param {string} viewName - View name ('front', 'back', 'top', 'bottom', 'left', 'right', 'isometric')
   */
  setCameraView(instanceData, viewName) {
    if (!instanceData?.sceneObjects) {
      log.warn("Cannot set camera view: VTK not initialized");
      return;
    }
    instanceTools.setCameraView(instanceData.instanceId, viewName);
  }

  /**
   * Apply zoom to camera
   * @param {Object} instanceData - Instance data object
   * @param {number} factor - Zoom factor (> 1 = zoom in, < 1 = zoom out)
   */
  zoom(instanceData, factor) {
    if (!instanceData?.sceneObjects?.camera) {
      log.warn("Cannot zoom: VTK camera not initialized");
      return;
    }

    const { camera, renderer } = instanceData.sceneObjects;

    // VTK zoom: dolly the camera (move closer/farther from focal point)
    camera.dolly(factor);
    renderer.resetCameraClippingRange();
    this._requestRender(instanceData, "zoom");

    log.trace(
      `Zoomed by factor ${factor} for instance ${instanceData.instanceId}`
    );
  }

  /**
   * Get current camera state
   * @param {Object} instanceData - Instance data object
   * @returns {Object|null} Camera state
   */
  getCameraState(instanceData) {
    if (!instanceData?.sceneObjects?.camera) {
      return null;
    }
    return instanceTools.getCameraState(instanceData.instanceId);
  }

  /**
   * Register a callback for camera changes on an instance
   * Used to sync zoom percentage display with actual camera state
   * Zoom is relative to initial fit view: 100% = data fits in viewport
   * @param {Object} instanceData - Instance data object
   * @param {Function} callback - Callback receiving { zoomLevel, parallelScale, distance }
   * @returns {Function} Unsubscribe function
   */
  onCameraChange(instanceData, callback) {
    if (!instanceData?.sceneObjects?.camera) {
      log.warn("Cannot subscribe to camera changes: VTK not initialized");
      return () => {};
    }

    const { camera } = instanceData.sceneObjects;

    // Store the initial camera state as baseline for zoom calculation (100%)
    // This is set after resetCamera/fitView is called, representing the "fit" state
    if (!instanceData._baselineCameraState) {
      instanceData._baselineCameraState = {
        parallelScale: camera.getParallelScale(),
        distance: camera.getDistance(),
      };
    }

    // Create the observer function
    const observer = () => {
      const baseline = instanceData._baselineCameraState;
      const currentParallelScale = camera.getParallelScale();
      const currentDistance = camera.getDistance();

      // Calculate zoom level relative to baseline (100% = fit view)
      // For parallel projection: zoom = baseline / current (larger parallelScale = zoomed out)
      // For perspective projection: zoom = baseline / current (larger distance = zoomed out)
      let zoomLevel;
      if (camera.getParallelProjection()) {
        zoomLevel = (baseline.parallelScale / currentParallelScale) * 100;
      } else {
        zoomLevel = (baseline.distance / currentDistance) * 100;
      }

      // No clamping - allow whatever zoom VTK supports
      callback({
        zoomLevel,
        parallelScale: currentParallelScale,
        distance: currentDistance,
      });
    };

    // Subscribe to camera modifications
    const subscription = camera.onModified(observer);

    // Return unsubscribe function
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }

  /**
   * Reset the baseline camera state for zoom calculation
   * Called when fit/reset is triggered to establish new 100% baseline
   * @param {Object} instanceData - Instance data object
   */
  resetZoomBaseline(instanceData) {
    if (!instanceData?.sceneObjects?.camera) {
      return;
    }

    const { camera } = instanceData.sceneObjects;
    instanceData._baselineCameraState = {
      parallelScale: camera.getParallelScale(),
      distance: camera.getDistance(),
    };

    log.debug(`Zoom baseline reset for instance ${instanceData.instanceId}`);
  }
}

// Create and export singleton instance
export const vtkInstanceHandler = new VTKInstanceHandler();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.vtkInstanceHandler = vtkInstanceHandler;
}
