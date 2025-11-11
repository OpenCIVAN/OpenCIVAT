// src/core/instances/types/vtk/VTKInstanceHandler.js
// Reference implementation of InstanceTypeHandler for VTK.js
// This serves as the blueprint for contributors adding new instance types

import { InstanceTypeHandler } from "@Core/instances/types/InstanceTypeInterface.js";
import { initializeScene } from "@Core/scene/sceneManager.js";

/**
 * VTKInstanceHandler
 *
 * This is the REFERENCE IMPLEMENTATION that demonstrates how to create
 * a plugin for the instance type system. Other contributors will look
 * at this file to understand the pattern.
 *
 * Key principles demonstrated here:
 * 1. Extend InstanceTypeHandler base class
 * 2. Implement all required methods
 * 3. Return type-specific data from initialize()
 * 4. Use that data in all subsequent operations
 * 5. Handle cleanup properly to prevent memory leaks
 *
 * This handler wraps existing VTK functionality (sceneManager) rather than
 * reimplementing it. The goal is to integrate existing code into the plugin
 * architecture, not to rewrite working systems.
 */
export class VTKInstanceHandler extends InstanceTypeHandler {
  constructor() {
    super();

    // VTK-specific state that's private to this handler
    // The core system never sees or touches this
    this.activeWidgets = new Map(); // instanceId → widget instances
    this.cursorActors = new Map(); // instanceId → userId → actor
    this.annotationActors = new Map(); // instanceId → annotationId → actor

    console.log("🎨 VTKInstanceHandler: Created");
  }

  // ===========================================================================
  // REQUIRED INTERFACE METHODS
  // These MUST be implemented for the handler to work
  // ===========================================================================

  /**
   * Get unique type identifier
   * This is how the system distinguishes VTK from Plotly, Three.js, etc.
   */
  getType() {
    return "vtk";
  }

  /**
   * Get human-readable display name
   * This appears in UI elements like instance type selectors
   */
  getDisplayName() {
    return "VTK 3D View";
  }

  /**
   * Initialize a new VTK instance
   *
   * This is where we set up the VTK rendering pipeline. We leverage the
   * existing sceneManager to create the VTK objects, then return them
   * as instance data. The core system stores this data and passes it
   * back to us in all future operations on this instance.
   *
   * IMPORTANT: The data returned here becomes the instanceData parameter
   * in all other methods. This is how the handler maintains state per instance.
   */
  async initialize(containerElement, options) {
    const { instanceId } = options;

    console.log(`🎨 VTK Handler: Initializing instance ${instanceId}`);

    // Use existing sceneManager to create VTK pipeline
    // This demonstrates wrapping existing code rather than rewriting
    const sceneObjects = initializeScene(containerElement);

    if (!sceneObjects) {
      throw new Error("Failed to initialize VTK scene");
    }

    // VTK-specific setup that the core doesn't need to know about
    // For example, configure interaction style, set background color, etc.
    const { renderer } = sceneObjects;
    renderer.setBackground(0.1, 0.1, 0.1); // Dark background

    // Return instance data - this gets stored and passed back to us
    // The structure here is VTK-specific; other handlers return different structures
    return {
      instanceId,
      sceneObjects,
      // VTK-specific metadata
      actors: new Map(), // datasetId → actor
      filters: new Map(), // filterId → filter object
      widgets: new Map(), // widgetId → widget instance
      lastCameraState: null, // For syncing camera positions
    };
  }

  /**
   * Clean up VTK resources
   *
   * Called when instance is deleted. Must properly dispose of all VTK
   * objects to prevent memory leaks. This is critical in long-running
   * collaborative sessions.
   */
  async cleanup(instanceData) {
    const { instanceId, sceneObjects, actors, widgets } = instanceData;

    console.log(`🧹 VTK Handler: Cleaning up instance ${instanceId}`);

    // Clean up VTK widgets
    if (widgets && widgets.size > 0) {
      widgets.forEach((widget, widgetId) => {
        console.log(`  Disposing widget: ${widgetId}`);
        if (widget.delete) widget.delete();
      });
      widgets.clear();
    }

    // Clean up VTK actors
    if (actors && actors.size > 0) {
      actors.forEach((actor, datasetId) => {
        console.log(`  Removing actor for dataset: ${datasetId}`);
        if (sceneObjects && sceneObjects.renderer) {
          sceneObjects.renderer.removeActor(actor);
        }
        if (actor.delete) actor.delete();
      });
      actors.clear();
    }

    // Clean up renderer and render window
    if (sceneObjects) {
      const { renderer, renderWindow, interactor } = sceneObjects;

      if (interactor) {
        interactor.unbindEvents();
        if (interactor.delete) interactor.delete();
      }

      if (renderer && renderer.delete) {
        renderer.delete();
      }

      if (renderWindow && renderWindow.delete) {
        renderWindow.delete();
      }
    }

    // Clean up handler-specific tracking
    this.activeWidgets.delete(instanceId);
    this.cursorActors.delete(instanceId);
    this.annotationActors.delete(instanceId);

    console.log(`✅ VTK Handler: Instance ${instanceId} cleaned up`);
  }

  // In VTKInstanceHandler.js, replace the loadData method:

  /**
   * Load data into this VTK instance
   *
   * This is where we integrate your existing VTK data loading logic.
   * The handler receives polydata and needs to create a mapper and actor,
   * add the actor to the scene, and render the result.
   */
  async loadData(instanceData, dataset, data) {
    const { instanceId, sceneObjects, actors } = instanceData;

    console.log(
      `📦 VTK Handler: Loading dataset ${dataset.id} into instance ${instanceId}`
    );

    // Defensive check - make sure we have the necessary scene objects
    if (!sceneObjects || !sceneObjects.renderer || !sceneObjects.renderWindow) {
      console.error(
        "❌ Cannot load data: scene objects not properly initialized"
      );
      return;
    }

    const { renderer, renderWindow, mapper, actor } = sceneObjects;

    try {
      // This is the critical VTK operation: set the polydata as the mapper's input
      // Your existing code likely does exactly this somewhere
      mapper.setInputData(data);

      // Check if the actor is already in the renderer
      // This prevents duplicate actors if loadData is called multiple times
      const actorsInScene = renderer.getActors();
      if (!actorsInScene.includes(actor)) {
        renderer.addActor(actor);
        console.log("  ✓ Actor added to renderer");
      } else {
        console.log("  ✓ Actor already in renderer, updated data");
      }

      // Reset the camera to frame the data nicely
      // This ensures the entire dataset is visible
      renderer.resetCamera();

      // Trigger a render to display the data
      renderWindow.render();

      // Store the actor reference for this dataset
      // This allows us to remove it later if needed
      actors.set(dataset.id, actor);

      console.log(`✅ VTK Handler: Dataset ${dataset.id} loaded and rendered`);
      console.log(`   Points: ${data.getPoints().getNumberOfPoints()}`);
      console.log(`   Cells: ${data.getNumberOfCells()}`);
    } catch (error) {
      console.error(
        `❌ VTK Handler: Failed to load dataset ${dataset.id}:`,
        error
      );
      throw error;
    }
  }

  // ===========================================================================
  // OPTIONAL FEATURES - Tools and UI
  // These enhance functionality but aren't required
  // ===========================================================================

  /**
   * Get tools available for VTK instances
   *
   * This defines what buttons appear in the instance toolbar.
   * Each tool includes an icon, label, and callback.
   *
   * Contributors adding VTK widgets would add entries here.
   */
  getTools(instanceData) {
    return [
      {
        id: "reset-camera",
        label: "Reset Camera",
        icon: "camera",
        onClick: () => this._resetCamera(instanceData),
      },
      {
        id: "clip",
        label: "Clip Plane",
        icon: "scissors",
        onClick: () => this._activateClipWidget(instanceData),
      },
      {
        id: "measure",
        label: "Measure Distance",
        icon: "ruler",
        onClick: () => this._activateMeasureWidget(instanceData),
      },
      // Contributors: Add more tools here!
      // Each tool is isolated - adding one doesn't affect others
    ];
  }

  /**
   * Get header information to display
   *
   * Returns stats and indicators to show in the instance viewport header.
   * This gives users context about what they're viewing.
   */
  getHeaderInfo(instanceData) {
    const actors = instanceData?.actors;
    const sceneObjects = instanceData?.sceneObjects;

    const stats = [];

    // Always show dataset count
    stats.push({
      label: "Datasets",
      value: actors ? actors.size.toString() : "0",
    });

    // If we have scene objects, we can extract detailed VTK statistics
    if (sceneObjects && sceneObjects.mapper) {
      const mapper = sceneObjects.mapper;
      const input = mapper.getInputData();

      if (input) {
        // Get point count from the actual VTK data
        const points = input.getPoints();
        if (points) {
          const pointCount = points.getNumberOfPoints();
          stats.push({
            label: "Points",
            value: pointCount.toLocaleString(), // Formats with commas: 541,199
          });
        }

        // Get cell/polygon count
        const cellCount = input.getNumberOfCells();
        if (cellCount > 0) {
          stats.push({
            label: "Cells",
            value: cellCount.toLocaleString(),
          });
        }
      }
    }

    return {
      stats,
      indicators: [{ icon: "cube", label: "3D View", color: "#4CAF50" }],
    };
  }

  // ===========================================================================
  // COLLABORATIVE FEATURES
  // These handle multi-user functionality
  // ===========================================================================

  /**
   * Show/hide collaborative cursors in this VTK instance
   *
   * The core tells us "show cursors for these users", and we handle
   * the VTK-specific rendering. Other instance types might render
   * cursors completely differently.
   */
  async setCursorVisibility(instanceData, visible, users = []) {
    const instanceId = instanceData?.instanceId;

    console.log(
      `👆 VTK Handler: Setting cursor visibility for instance ${instanceId}: ${visible}`
    );

    // TODO: Implement cursor rendering using VTK actors
    // This would integrate with your existing cursor system
    // from src/collaboration/presence/cursors.js

    // Example pattern:
    // if (visible) {
    //   users.forEach(user => {
    //     const cursorActor = createCursorActor(user.color);
    //     this.cursorActors.set(instanceId + user.id, cursorActor);
    //   });
    // } else {
    //   this.cursorActors.forEach(actor => renderer.removeActor(actor));
    //   this.cursorActors.clear();
    // }
  }

  /**
   * Update cursor position for a remote user
   */
  async updateCursor(instanceData, userId, cursorData) {
    // TODO: Update VTK cursor actor position
    // This would project 2D cursor position into 3D space
  }

  /**
   * Show/hide annotations in this VTK instance
   */
  async setAnnotationVisibility(instanceData, visible, annotations = []) {
    const instanceId = instanceData?.instanceId;

    console.log(
      `📍 VTK Handler: Setting annotation visibility for instance ${instanceId}: ${visible}`
    );

    // TODO: Implement annotation rendering
    // This would integrate with your existing annotation renderer
    // from src/collaboration/annotations/annotationRenderer.js
  }

  /**
   * Synchronize camera from another user
   *
   * When users are in "follow mode", we receive camera state and apply it
   */
  async syncCamera(instanceData, cameraState) {
    const sceneObjects = instanceData?.sceneObjects;

    if (!cameraState || !sceneObjects) return;

    // TODO: Implement camera state synchronization
    // This would use your existing camera sync logic
    // from src/collaboration/sync/cameraSync.js

    // Example pattern:
    // const { camera } = sceneObjects;
    // camera.setPosition(cameraState.position);
    // camera.setFocalPoint(cameraState.focalPoint);
    // camera.setViewUp(cameraState.viewUp);
    // sceneObjects.renderWindow.render();
  }

  /**
   * Get current camera state for syncing to other users
   */
  async getCameraState(instanceData) {
    const sceneObjects = instanceData?.sceneObjects;

    if (!sceneObjects) return null;

    const { camera } = sceneObjects;

    return {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
      // Add any other camera properties you need to sync
    };
  }

  // ===========================================================================
  // VR CAPABILITIES
  // Declare what VR features this type supports
  // ===========================================================================

  /**
   * VTK supports instance-level VR (send one viewport to VR)
   */
  supportsInstanceVR() {
    return true;
  }

  /**
   * VTK can adapt when the whole app is in VR mode
   */
  supportsApplicationVR() {
    return true;
  }

  /**
   * Enter VR mode for this specific instance
   *
   * Called when user clicks "Send to VR" for this viewport
   */
  async enterInstanceVR(instanceData, xrSession) {
    console.log(
      `🥽 VTK Handler: Entering VR for instance ${instanceData?.instanceId}`
    );

    // TODO: Implement VR setup
    // This would integrate with your existing VR systems
    // from src/vr/vrModeManager.js

    // Return VR-specific data that gets passed to updateInstanceVR
    return {
      xrSession,
      // Add any VR-specific state you need
    };
  }

  /**
   * Update VR rendering every frame
   */
  async updateInstanceVR(instanceData, vrData, frame) {
    // TODO: Implement VR frame update
    // This renders stereo views for left and right eyes
  }

  // ===========================================================================
  // HELPER METHODS (Private to this handler)
  // ===========================================================================

  _resetCamera(instanceData) {
    const sceneObjects = instanceData?.sceneObjects;

    if (sceneObjects && sceneObjects.renderer) {
      sceneObjects.renderer.resetCamera();
      sceneObjects.renderWindow.render();
      console.log("🎥 Camera reset");
    }
  }

  _activateClipWidget(instanceData) {
    console.log("🔧 VTK: Activating clip plane widget");

    // TODO: Implement clip widget
    // This would be a separate widget module under vtk/widgets/ClipWidget.js
    // Following the pattern of modular, isolated features
  }

  _activateMeasureWidget(instanceData) {
    console.log("🔧 VTK: Activating measure widget");

    // TODO: Implement measure widget
    // This would be under vtk/widgets/MeasureWidget.js
  }

  // ===========================================================================
  // DATASET COMPATIBILITY
  // ===========================================================================

  /**
   * Check if this handler can display a dataset
   *
   * VTK handler accepts .vtp, .vti, .vtk files
   */
  canHandleDataset(dataset) {
    if (!dataset || !dataset.name) return false;

    const vtpExtensions = [".vtp", ".vti", ".vtk", ".obj", ".stl"];
    const extension = dataset.name.toLowerCase().match(/\.[^.]+$/)?.[0];

    return vtpExtensions.includes(extension);
  }
}

// Export singleton instance
// The core system will import and register this
export const vtkInstanceHandler = new VTKInstanceHandler();

// Export for testing
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.vtkInstanceHandler = vtkInstanceHandler;
}
