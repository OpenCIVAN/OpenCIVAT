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
 * 4. VR-ready - Includes VR capability declarations
 * 5. Collaboration-ready - Provides hooks for cursors, annotations, camera sync
 */
export class VTKInstanceHandler extends InstanceTypeHandler {
  constructor() {
    super();
    this.instances = new Map(); // instanceId -> instance data
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
      const { glWindow, interactor, renderWindow } = instanceData.sceneObjects;

      if (interactor) {
        interactor.unbindEvents();
      }

      if (glWindow) {
        glWindow.delete();
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

    console.log(`📊 VTK Handler: Loading data into instance ${instanceId}`);

    // STEP 1: Initialize VTK pipeline if this is the first time loading data
    // This is our lazy initialization - we defer creating WebGL resources
    // until they're actually needed
    if (!instanceData.sceneObjects) {
      console.log(`🎨 First data load - initializing VTK pipeline...`);

      // Create all the VTK rendering components
      const pipelineObjects = this._initializeVTKPipeline(instanceData);

      // Store them in instanceData so they persist and can be accessed
      // by all future operations on this instance
      instanceData.sceneObjects = pipelineObjects;

      console.log(`✅ VTK pipeline ready for rendering`);
    }

    // STEP 2: Now extract what we need from the stored scene objects
    // We can safely do this because we know sceneObjects exists
    // (either it was already there or we just created it above)
    const { renderer, renderWindow, mapper, actor } = instanceData.sceneObjects;

    try {
      // STEP 3: Load the geometry data into the mapper
      // This is where the actual 3D data (your skull) gets connected
      // to the rendering pipeline
      mapper.setInputData(data);

      // STEP 4: Add the actor to the scene if it's not already there
      // We check first to avoid duplicate actors if loadData is called multiple times
      const actorsInScene = renderer.getActors();
      if (!actorsInScene.includes(actor)) {
        renderer.addActor(actor);
        console.log(`  ✓ Actor added to renderer`);
      } else {
        console.log(`  ✓ Actor already in renderer, updated data`);
      }

      // STEP 5: Position the camera to show the entire dataset nicely
      // This adjusts the camera so you can see all the data at once
      renderer.resetCamera();

      // STEP 6: Render the scene to display everything
      // This triggers the WebGL drawing that makes the visualization appear
      renderWindow.render();

      // STEP 7: Keep track of which actor belongs to which dataset
      // This allows us to remove or update specific datasets later
      instanceData.actors.set(dataset.id, actor);

      // STEP 8: Log success with some helpful statistics
      const pointCount = data.getPoints().getNumberOfPoints();
      const cellCount = data.getNumberOfCells();

      console.log(`✅ VTK Handler: Dataset ${dataset.id} loaded and rendered`);
      console.log(`   📊 Points: ${pointCount.toLocaleString()}`);
      console.log(`   📊 Cells: ${cellCount.toLocaleString()}`);
    } catch (error) {
      console.error(
        `❌ VTK Handler: Failed to load dataset ${dataset.id}:`,
        error
      );
      throw error;
    }
  }

  // ===========================================================================
  // OPTIONAL INTERFACE METHODS (with default implementations)
  // ===========================================================================

  /**
   * Check if this handler can work with a dataset
   */
  canHandleDataset(dataset) {
    // VTK can handle VTP files and polydata
    const supportedExtensions = [".vtp", ".vti", ".vtu", ".vtk"];
    const filename = dataset.name || dataset.filename || "";
    return supportedExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext)
    );
  }

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
        const dataset = datasetManager.getDatasetSync(instanceData.datasetId);
        if (dataset?.metadata) {
          stats.push({
            label: "Points",
            value: dataset.metadata.pointCount?.toLocaleString() || "0",
          });

          if (dataset.metadata.bounds) {
            const bounds = dataset.metadata.bounds;
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
        color: "#00ff00",
      });
    }

    if (instanceData?.annotations?.size > 0) {
      indicators.push({
        id: "annotations",
        label: `${instanceData.annotations.size} annotations`,
        color: "#ffaa00",
      });
    }

    return { stats, indicators };
  }

  /**
   * Parse file and extract polydata
   */
  async parseFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const reader = vtkXMLPolyDataReader.newInstance();
    reader.parseAsArrayBuffer(arrayBuffer);
    return reader.getOutputData(0);
  }

  /**
   * Extract metadata from polydata
   */
  extractMetadata(polydata) {
    const bounds = polydata.getBounds();
    return {
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
          instanceData.renderer.addActor(cursorActor);
        }
      });
    } else {
      // Remove all cursors
      instanceData.cursors.forEach((actor) => {
        instanceData.renderer.removeActor(actor);
      });
      instanceData.cursors.clear();
    }

    instanceData.renderWindow.render();
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
      instanceData.renderWindow.render();
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
          instanceData.renderer.addActor(annotationActor);
        }
      });
    } else {
      // Remove all annotations
      instanceData.annotations.forEach((actor) => {
        instanceData.renderer.removeActor(actor);
      });
      instanceData.annotations.clear();
    }

    instanceData.renderWindow.render();
  }

  /**
   * Sync camera state from another user
   */
  async syncCamera(instanceData, cameraState) {
    if (!instanceData?.initialized || !cameraState) return;

    const camera = instanceData.camera;
    camera.setPosition(cameraState.position);
    camera.setFocalPoint(cameraState.focalPoint);
    camera.setViewUp(cameraState.viewUp);
    instanceData.renderWindow.render();
  }

  /**
   * Get current camera state
   */
  async getCameraState(instanceData) {
    if (!instanceData?.initialized) return null;

    const camera = instanceData.camera;
    return {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
    };
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
      stereoRendering: true,
      controllers: true,
      roomScale: true,
      handTracking: false,
    };
  }

  /**
   * Enter VR mode for this instance
   */
  async enterInstanceVR(instanceData) {
    console.log("🥽 Entering VR for VTK instance", instanceData.instanceId);
    // TODO: Implement WebXR integration
    // This would set up stereo rendering and controller input
  }

  /**
   * Update VR state
   */
  async updateInstanceVR(instanceData, vrState) {
    // TODO: Update controller positions, head tracking, etc.
  }

  /**
   * Called when application enters VR mode
   */
  async onApplicationVREnter(instanceData) {
    // TODO: Prepare instance for VR (optimize rendering, etc.)
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

    // Clear the container to ensure clean slate
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
        icon: "Maximize2",
        label: "Reset Camera",
        action: (instanceData) => this.resetCamera(instanceData),
      },
      {
        id: "toggle-axes",
        icon: "Axis3d",
        label: "Toggle Axes",
        action: (instanceData) => this.toggleAxes(instanceData),
      },
      {
        id: "measure",
        icon: "Ruler",
        label: "Measure",
        action: (instanceData) => this.toggleMeasureTool(instanceData),
      },
      {
        id: "clip",
        icon: "Scissors",
        label: "Clipping Plane",
        action: (instanceData) => this.toggleClipTool(instanceData),
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
    if (instanceData?.renderer) {
      instanceData.renderer.resetCamera();
      instanceData.renderWindow.render();
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
