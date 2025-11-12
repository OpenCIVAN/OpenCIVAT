// src/core/instances/types/vtk/VTKInstanceHandler.js
// Reference implementation of InstanceTypeHandler for VTK.js
// This serves as the blueprint for contributors adding new instance types

import vtkPlaneWidget from "@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget";
import vtkLineWidget from "@kitware/vtk.js/Widgets/Widgets3D/LineWidget";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";

import { InstanceTypeHandler } from "@Core/instances/types/InstanceTypeInterface.js";
import { initializeScene } from "@VTK/scene/sceneManager.js";
import { VTKReductionFeature } from "@VTK/features/VTKReductionFeature.js";

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

    // Features - each is independent and self-contained
    this.reductionFeature = new VTKReductionFeature();
    // this.annotationFeature = new VTKAnnotationFeature(); // TODO
    // this.vrFeature = new VTKVRFeature(); // TODO

    // Widget tracking
    this.widgetManagers = new Map();
    this.activeWidgets = new Map();

    // Placeholders for future features
    this.cursorActors = new Map();
    this.annotationActors = new Map();

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

    // Create VTK scene
    const sceneObjects = initializeScene(containerElement);

    // Create widget manager for this instance
    const widgetManager = vtkWidgetManager.newInstance();
    widgetManager.setRenderer(sceneObjects.renderer);
    this.widgetManagers.set(instanceId, widgetManager);

    const instanceData = {
      instanceId,
      sceneObjects,
      widgetManager,
      features: {},
      actors: new Map(), // Track actors for each dataset
    };

    // Initialize features
    await this.reductionFeature.initialize(instanceId, instanceData);
    instanceData.features.reduction = this.reductionFeature;

    // TODO: Initialize other features as needed
    // await this.annotationFeature.initialize(instanceId, instanceData);
    // await this.vrFeature.initialize(instanceId, instanceData);

    return instanceData;
  }

  /**
   * Clean up VTK resources
   *
   * Called when instance is deleted. Must properly dispose of all VTK
   * objects to prevent memory leaks. This is critical in long-running
   * collaborative sessions.
   *
   * CRITICAL: Cleanup order matters! Disconnect observers BEFORE deleting
   * the objects they reference, or you'll get callbacks firing on deleted objects.
   */
  async cleanup(instanceData) {
    const { instanceId, sceneObjects, actors, widgets } = instanceData;

    console.log(`🧹 VTK Handler: Cleaning up instance ${instanceId}`);

    // Cleanup features
    await this.reductionFeature.cleanup(instanceId);
    // await this.annotationFeature.cleanup(instanceId);
    // await this.vrFeature.cleanup(instanceId);

    // Cleanup widgets
    this._disableAllWidgets(instanceId);
    this.widgetManagers.delete(instanceId);
    this.activeWidgets.delete(instanceId);

    // STEP 1: Disconnect observers FIRST, before touching any VTK objects
    // This prevents callbacks from firing during or after cleanup
    if (sceneObjects?.resizeObserver) {
      try {
        sceneObjects.resizeObserver.disconnect();
        console.log("  ✓ ResizeObserver disconnected");
      } catch (error) {
        console.warn("  ⚠️  Error disconnecting ResizeObserver:", error);
      }
    }

    // STEP 2: Clean up VTK widgets
    // Widgets often have their own internal state and event listeners
    if (widgets && widgets.size > 0) {
      widgets.forEach((widget, widgetId) => {
        console.log(`  Disposing widget: ${widgetId}`);
        try {
          if (widget.delete) widget.delete();
        } catch (error) {
          console.warn(`  ⚠️  Error deleting widget ${widgetId}:`, error);
        }
      });
      widgets.clear();
    }

    // STEP 3: Clean up VTK actors
    // Remove actors from the renderer before deleting them
    if (actors && actors.size > 0) {
      actors.forEach((actor, datasetId) => {
        console.log(`  Removing actor for dataset: ${datasetId}`);
        try {
          // Remove from renderer first, then delete
          if (sceneObjects?.renderer) {
            sceneObjects.renderer.removeActor(actor);
          }
          if (actor.delete) actor.delete();
        } catch (error) {
          console.warn(
            `  ⚠️  Error cleaning up actor for ${datasetId}:`,
            error
          );
        }
      });
      actors.clear();
    }

    // STEP 4: Clean up core VTK rendering objects
    // These must be deleted in a specific order: interactor, then renderer, then renderWindow
    if (sceneObjects) {
      const { renderer, renderWindow, interactor, openGLRenderWindow } =
        sceneObjects;

      // Disconnect interactor from events
      if (interactor) {
        try {
          interactor.unbindEvents();
          console.log("  ✓ Interactor events unbound");
          if (interactor.delete) interactor.delete();
        } catch (error) {
          console.warn("  ⚠️  Error cleaning up interactor:", error);
        }
      }

      // Delete OpenGL render window if it exists
      if (openGLRenderWindow) {
        try {
          if (openGLRenderWindow.delete) openGLRenderWindow.delete();
          console.log("  ✓ OpenGL render window deleted");
        } catch (error) {
          console.warn("  ⚠️  Error deleting OpenGL render window:", error);
        }
      }

      // Delete renderer
      if (renderer) {
        try {
          if (renderer.delete) renderer.delete();
          console.log("  ✓ Renderer deleted");
        } catch (error) {
          console.warn("  ⚠️  Error deleting renderer:", error);
        }
      }

      // Delete render window last
      if (renderWindow) {
        try {
          if (renderWindow.delete) renderWindow.delete();
          console.log("  ✓ Render window deleted");
        } catch (error) {
          console.warn("  ⚠️  Error deleting render window:", error);
        }
      }
    }

    // STEP 5: Clean up handler-specific tracking
    this.activeWidgets.delete(instanceId);
    this.cursorActors.delete(instanceId);
    this.annotationActors.delete(instanceId);

    await this.reductionFeature.cleanup(instanceData.instanceId);

    console.log(`✅ VTK Handler: Instance ${instanceId} cleaned up`);
  }

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
  // FILE PARSING - VTK-SPECIFIC
  // This is where VTP file parsing belongs, not in DatasetManager
  // ===========================================================================

  /**
   * Parse a VTP file and return polydata
   *
   * This is VTK-specific logic that was previously in datasetManager.
   * By moving it here, we properly compartmentalize type-specific code.
   *
   * Other instance types will have their own parseFile methods:
   * - PlotlyHandler.parseFile() might parse CSV → JSON
   * - ImageHandler.parseFile() might parse DICOM → pixel data
   * - etc.
   *
   * @param {File} file - The VTP file to parse
   * @returns {Promise<Object>} VTK polydata object
   */
  async parseFile(file) {
    console.log(`🎨 VTK Handler: Parsing VTP file "${file.name}"`);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Create VTK XML reader
      // Dynamically import to avoid loading VTK.js unless needed
      const vtkXMLPolyDataReader = await import(
        "@kitware/vtk.js/IO/XML/XMLPolyDataReader"
      ).then((m) => m.default);

      const reader = vtkXMLPolyDataReader.newInstance();

      // Parse the VTP data
      reader.parseAsArrayBuffer(arrayBuffer);
      const polydata = reader.getOutputData();

      if (!polydata) {
        throw new Error("Failed to parse VTP file - reader returned null");
      }

      // Extract statistics for logging
      const points = polydata.getPoints();
      const pointCount = points ? points.getNumberOfPoints() : 0;
      const cellCount = polydata.getNumberOfCells();

      console.log(`✅ VTK Handler: VTP parsed successfully`);
      console.log(`   Points: ${pointCount.toLocaleString()}`);
      console.log(`   Cells: ${cellCount.toLocaleString()}`);

      return polydata;
    } catch (error) {
      console.error(
        `❌ VTK Handler: Failed to parse VTP file "${file.name}":`,
        error
      );
      throw error;
    }
  }

  /**
   * Parse VTP data from an ArrayBuffer
   *
   * This variant is used when loading from cache, where we already have
   * the ArrayBuffer instead of a File object.
   *
   * @param {ArrayBuffer} arrayBuffer - The VTP data
   * @param {string} filename - Original filename (for logging)
   * @returns {Promise<Object>} VTK polydata object
   */
  async parseArrayBuffer(arrayBuffer, filename = "unknown") {
    console.log(
      `🎨 VTK Handler: Parsing VTP data from ArrayBuffer (${filename})`
    );

    try {
      // Dynamically import VTK reader
      const vtkXMLPolyDataReader = await import(
        "@kitware/vtk.js/IO/XML/XMLPolyDataReader"
      ).then((m) => m.default);

      const reader = vtkXMLPolyDataReader.newInstance();
      reader.parseAsArrayBuffer(arrayBuffer);
      const polydata = reader.getOutputData();

      if (!polydata) {
        throw new Error("Failed to parse VTP data - reader returned null");
      }

      const points = polydata.getPoints();
      const pointCount = points ? points.getNumberOfPoints() : 0;

      console.log(
        `✅ VTK Handler: VTP data parsed (${pointCount.toLocaleString()} points)`
      );

      return polydata;
    } catch (error) {
      console.error(`❌ VTK Handler: Failed to parse VTP data:`, error);
      throw error;
    }
  }

  /**
   * Extract spatial metadata from polydata
   *
   * This pulls out bounds, point counts, and other metadata that
   * the DatasetManager needs for the Dataset object.
   *
   * @param {Object} polydata - VTK polydata object
   * @returns {Object} Spatial metadata
   */
  extractMetadata(polydata) {
    const points = polydata.getPoints();
    const pointCount = points ? points.getNumberOfPoints() : 0;
    const cellCount = polydata.getNumberOfCells();
    const bounds = polydata.getBounds();

    return {
      pointCount,
      cellCount,
      bounds: {
        xMin: bounds[0],
        xMax: bounds[1],
        yMin: bounds[2],
        yMax: bounds[3],
        zMin: bounds[4],
        zMax: bounds[5],
      },
      // Mark that this has been analyzed
      analyzed: true,
    };
  }

  // ===========================================================================
  // OPTIONAL FEATURES - Tools and UI
  // These enhance functionality but aren't required
  // ===========================================================================

  // =========================================================================
  // TOOLS - THIS IS WHERE ALL VTK-SPECIFIC UI COMES FROM
  // React calls this method and renders whatever we return
  // =========================================================================

  getTools(instanceData) {
    const { instanceId } = instanceData;
    const tools = [];

    // =======================================================================
    // CAMERA CONTROLS
    // =======================================================================

    tools.push({
      id: "reset-camera",
      label: "Reset Camera",
      icon: "📷",
      description: "Reset camera to fit all data",
      onClick: () => this._resetCamera(instanceData),
    });

    tools.push({
      id: "view-preset",
      label: "View",
      type: "menu",
      description: "Set camera to predefined views",
      options: [
        {
          id: "front",
          label: "Front View",
          onClick: () => this._setView(instanceData, "front"),
        },
        {
          id: "back",
          label: "Back View",
          onClick: () => this._setView(instanceData, "back"),
        },
        {
          id: "left",
          label: "Left View",
          onClick: () => this._setView(instanceData, "left"),
        },
        {
          id: "right",
          label: "Right View",
          onClick: () => this._setView(instanceData, "right"),
        },
        {
          id: "top",
          label: "Top View",
          onClick: () => this._setView(instanceData, "top"),
        },
        {
          id: "bottom",
          label: "Bottom View",
          onClick: () => this._setView(instanceData, "bottom"),
        },
      ],
    });

    tools.push({ type: "separator" });

    // =======================================================================
    // VISUALIZATION CONTROLS
    // These are VTK-specific - other handlers would provide different controls
    // =======================================================================

    tools.push({
      id: "wireframe",
      label: "Wireframe",
      icon: "🔲",
      description: "Toggle wireframe mode",
      onClick: () => this._toggleWireframe(instanceData),
    });

    tools.push({
      id: "colormap",
      label: "Colors",
      type: "menu",
      description: "Change color mapping",
      options: [
        {
          id: "rainbow",
          label: "Rainbow",
          onClick: () => this._setColorMap(instanceData, "rainbow"),
        },
        {
          id: "grayscale",
          label: "Grayscale",
          onClick: () => this._setColorMap(instanceData, "grayscale"),
        },
        {
          id: "hot",
          label: "Hot",
          onClick: () => this._setColorMap(instanceData, "hot"),
        },
        {
          id: "cool",
          label: "Cool",
          onClick: () => this._setColorMap(instanceData, "cool"),
        },
      ],
    });

    tools.push({ type: "separator" });

    // =======================================================================
    // WIDGET TOOLS
    // =======================================================================

    const activeWidget = this.activeWidgets.get(instanceId);

    tools.push({
      id: "clip",
      label: "Clip Plane",
      icon: "✂️",
      description: "Add clipping plane",
      active: activeWidget?.clip !== undefined,
      onClick: () => this._toggleClipWidget(instanceData),
    });

    tools.push({
      id: "measure",
      label: "Measure",
      icon: "📏",
      description: "Measure distance",
      active: activeWidget?.measure !== undefined,
      onClick: () => this._toggleMeasureWidget(instanceData),
    });

    tools.push({ type: "separator" });

    // =======================================================================
    // FEATURE TOOLS
    // Features provide their own tools through their getTools() method
    // =======================================================================

    const reductionTools = this.reductionFeature.getTools(instanceId);
    tools.push(...reductionTools);

    return tools;
  }

  // =========================================================================
  // TOOL IMPLEMENTATIONS
  // These are private methods that implement the actual functionality
  // React never calls these directly - they're called by the onClick callbacks
  // =========================================================================

  _resetCamera(instanceData) {
    const { renderer, renderWindow } = instanceData.sceneObjects;
    renderer.resetCamera();
    renderWindow.render();
    console.log("📷 Camera reset");
  }

  _setView(instanceData, view) {
    const { camera, renderer, renderWindow } = instanceData.sceneObjects;

    const views = {
      front: { position: [0, -1, 0], up: [0, 0, 1] },
      back: { position: [0, 1, 0], up: [0, 0, 1] },
      left: { position: [-1, 0, 0], up: [0, 0, 1] },
      right: { position: [1, 0, 0], up: [0, 0, 1] },
      top: { position: [0, 0, 1], up: [0, 1, 0] },
      bottom: { position: [0, 0, -1], up: [0, 1, 0] },
    };

    if (views[view]) {
      const bounds = renderer.computeVisiblePropBounds();
      const center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
      ];

      const distance =
        Math.max(
          bounds[1] - bounds[0],
          bounds[3] - bounds[2],
          bounds[5] - bounds[4]
        ) * 2;

      const pos = views[view].position;
      camera.setPosition(
        center[0] + pos[0] * distance,
        center[1] + pos[1] * distance,
        center[2] + pos[2] * distance
      );
      camera.setFocalPoint(...center);
      camera.setViewUp(...views[view].up);

      renderer.resetCameraClippingRange();
      renderWindow.render();

      console.log(`📷 Camera set to ${view} view`);
    }
  }

  _toggleWireframe(instanceData) {
    const { actor, renderWindow } = instanceData.sceneObjects;
    const property = actor.getProperty();

    const currentRep = property.getRepresentation();
    const newRep = currentRep === 2 ? 1 : 2;

    property.setRepresentation(newRep);
    renderWindow.render();

    console.log(`🔲 Wireframe ${newRep === 1 ? "enabled" : "disabled"}`);
  }

  _setColorMap(instanceData, preset) {
    const { actor, renderWindow } = instanceData.sceneObjects;
    const mapper = actor.getMapper();
    const input = mapper.getInputData();

    // CRITICAL FIX: Check if the data has scalars
    const pointData = input.getPointData();
    const scalars = pointData.getScalars();

    if (!scalars) {
      console.warn(`⚠️ Cannot set color map: data has no scalar values`);
      console.log(
        `   Tip: VTP files need scalar data (colors per point) for color mapping`
      );
      return;
    }

    const vtkColorTransferFunction =
      require("@kitware/vtk.js/Rendering/Core/ColorTransferFunction").default;

    const ctf = vtkColorTransferFunction.newInstance();

    const presets = {
      rainbow: [
        [0.0, 0, 0, 1],
        [0.25, 0, 1, 1],
        [0.5, 0, 1, 0],
        [0.75, 1, 1, 0],
        [1.0, 1, 0, 0],
      ],
      grayscale: [
        [0.0, 0, 0, 0],
        [1.0, 1, 1, 1],
      ],
      hot: [
        [0.0, 0, 0, 0],
        [0.33, 1, 0, 0],
        [0.66, 1, 1, 0],
        [1.0, 1, 1, 1],
      ],
      cool: [
        [0.0, 0, 0, 1],
        [0.5, 0, 1, 1],
        [1.0, 0, 1, 0],
      ],
    };

    const colors = presets[preset] || presets.rainbow;
    const dataRange = scalars.getRange(); // Now safe to call

    colors.forEach(([pos, r, g, b]) => {
      const value = dataRange[0] + pos * (dataRange[1] - dataRange[0]);
      ctf.addRGBPoint(value, r, g, b);
    });

    mapper.setLookupTable(ctf);
    renderWindow.render();

    console.log(`🎨 Color map set to ${preset}`);
  }

  _toggleClipWidget(instanceData) {
    const { instanceId, sceneObjects, widgetManager } = instanceData;
    const { mapper, renderWindow } = sceneObjects;

    const activeWidget = this.activeWidgets.get(instanceId);

    if (activeWidget?.clip) {
      this._disableAllWidgets(instanceId);
      mapper.removeAllClippingPlanes();
      renderWindow.render();
      console.log(`✂️ Clip widget disabled`);
      return;
    }

    this._disableAllWidgets(instanceId);

    const vtkImplicitPlaneWidget =
      require("@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget").default;

    const widget = vtkImplicitPlaneWidget.newInstance();

    // FIXED: Use placeWidget() not setPlaceWidget()
    const bounds = mapper.getInputData().getBounds();
    widget.placeWidget(bounds); // Correct API
    widget.setPlaceFactor(1.25);

    const handle = widgetManager.addWidget(widget);
    widgetManager.grabFocus(widget);

    widget.onInteractionEvent(() => {
      const plane = widget.getPlane();
      mapper.removeAllClippingPlanes();
      mapper.addClippingPlane(plane);
      renderWindow.render();
    });

    if (!this.activeWidgets.has(instanceId)) {
      this.activeWidgets.set(instanceId, {});
    }
    this.activeWidgets.get(instanceId).clip = { widget, handle };

    console.log(`✂️ Clip widget activated`);
  }

  _toggleMeasureWidget(instanceData) {
    const { instanceId, sceneObjects, widgetManager } = instanceData;
    const { renderWindow } = sceneObjects;

    const activeWidget = this.activeWidgets.get(instanceId);

    if (activeWidget?.measure) {
      this._disableAllWidgets(instanceId);
      return;
    }

    this._disableAllWidgets(instanceId);

    const widget = vtkLineWidget.newInstance();
    const widgetRep = widget.getWidgetRepresentation();
    widgetRep.setGlyphScale(5);

    const handle = widgetManager.addWidget(widget);
    handle.setEnabled(true);

    widget.onEndInteractionEvent(() => {
      const distance = widgetRep.getDistance();
      console.log(`📏 Distance measured: ${distance.toFixed(2)} units`);
      renderWindow.render();
    });

    if (!this.activeWidgets.has(instanceId)) {
      this.activeWidgets.set(instanceId, {});
    }
    this.activeWidgets.get(instanceId).measure = { widget, handle };

    console.log(`📏 Measure widget activated`);
  }

  _disableAllWidgets(instanceId) {
    const activeWidget = this.activeWidgets.get(instanceId);
    if (!activeWidget) return;

    const widgetManager = this.widgetManagers.get(instanceId);
    if (!widgetManager) return;

    Object.values(activeWidget).forEach(({ widget, handle }) => {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    });

    this.activeWidgets.delete(instanceId);
  }

  // =========================================================================
  // HEADER INFO
  // =========================================================================

  /**
   * Get header information to display
   *
   * Returns stats about the currently loaded data.
   *
   * NOTE: We don't show "number of datasets" because in the new architecture,
   * an instance displays ONE dataset at a time (not multiple simultaneously).
   * The stat would always be either 0 or 1, which isn't useful information.
   *
   * Instead, we show meaningful stats about the DATA itself (points, cells).
   */
  getHeaderInfo(instanceData) {
    const sceneObjects = instanceData?.sceneObjects;
    const stats = [];

    // Only show stats if we have data loaded
    if (sceneObjects && sceneObjects.mapper) {
      const mapper = sceneObjects.mapper;
      const input = mapper.getInputData();

      if (input) {
        // Show point count
        const points = input.getPoints();
        if (points) {
          stats.push({
            label: "Points",
            value: points.getNumberOfPoints().toLocaleString(),
          });
        }

        // Show cell count
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
      indicators: [{ icon: "🎲", label: "3D View", color: "#4CAF50" }],
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
