// src/core/instances/instanceTools.js
// Tools and utilities for VTK instances

import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";
import vtkAngleWidget from "@kitware/vtk.js/Widgets/Widgets3D/AngleWidget";
import vtkPlaneWidget from "@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget";
import vtkLineWidget from '@kitware/vtk.js/Widgets/Widgets3D/LineWidget';


/**
 * InstanceToolsManager
 *
 * Provides tools for manipulating and analyzing data in VTK instances
 */
class InstanceToolsManager {
  constructor() {
    this.instanceTools = new Map(); // instanceId -> tools
    this.activeTools = new Map(); // instanceId -> active tool name
  }

  /**
   * Initialize tools for an instance
   */
  initializeTools(instanceId, sceneObjects) {
    if (this.instanceTools.has(instanceId)) {
      console.warn(`⚠️ Tools already initialized for instance: ${instanceId}`);
      return;
    }

    console.log(`🛠️ Initializing tools for instance: ${instanceId}`);

    const tools = {
      instanceId,
      sceneObjects,
      widgetManager: null,
      widgets: new Map(),
      colorMap: null,
      opacityFunction: null,
      clippingPlane: null,
      measurements: [],
    };

    // Create widget manager
    tools.widgetManager = vtkWidgetManager.newInstance();
    tools.widgetManager.setRenderer(sceneObjects.renderer);

    // Store tools
    this.instanceTools.set(instanceId, tools);

    console.log(`✅ Tools initialized for instance: ${instanceId}`);
  }

  /**
   * CAMERA TOOLS
   */

  /**
   * Reset camera to fit all data
   */
  resetCamera(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { renderer, renderWindow } = tools.sceneObjects;
    renderer.resetCamera();
    renderWindow.render();

    console.log(`📷 Camera reset for instance: ${instanceId}`);
  }

  /**
   * Set camera to a specific view
   */
  setCameraView(instanceId, view) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { camera, renderer, renderWindow } = tools.sceneObjects;

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

      console.log(`📷 Camera view set to ${view} for instance: ${instanceId}`);
    }
  }

  /**
   * Get current camera state
   */
  getCameraState(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return null;

    const { camera } = tools.sceneObjects;

    return {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
      viewAngle: camera.getViewAngle(),
      parallelScale: camera.getParallelScale(),
    };
  }

  /**
   * Set camera state
   */
  setCameraState(instanceId, state) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { camera, renderWindow } = tools.sceneObjects;

    if (state.position) camera.setPosition(...state.position);
    if (state.focalPoint) camera.setFocalPoint(...state.focalPoint);
    if (state.viewUp) camera.setViewUp(...state.viewUp);
    if (state.viewAngle) camera.setViewAngle(state.viewAngle);
    if (state.parallelScale) camera.setParallelScale(state.parallelScale);

    renderWindow.render();
  }

  /**
   * VISUALIZATION TOOLS
   */

  /**
   * Set color mapping
   */
  setColorMap(instanceId, preset = "rainbow") {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { actor, renderWindow } = tools.sceneObjects;

    // Create color transfer function
    const ctf = vtkColorTransferFunction.newInstance();

    const presets = {
      rainbow: [
        [0.0, 0, 0, 1], // Blue
        [0.25, 0, 1, 1], // Cyan
        [0.5, 0, 1, 0], // Green
        [0.75, 1, 1, 0], // Yellow
        [1.0, 1, 0, 0], // Red
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

    // Get data range
    const mapper = actor.getMapper();
    const dataRange = mapper
      .getInputData()
      .getPointData()
      .getScalars()
      .getRange();

    // Apply color map
    colors.forEach(([pos, r, g, b]) => {
      const value = dataRange[0] + pos * (dataRange[1] - dataRange[0]);
      ctf.addRGBPoint(value, r, g, b);
    });

    mapper.setLookupTable(ctf);
    tools.colorMap = ctf;

    renderWindow.render();
    console.log(`🎨 Color map set to ${preset} for instance: ${instanceId}`);
  }

  /**
   * Set opacity
   */
  setOpacity(instanceId, opacity) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { actor, renderWindow } = tools.sceneObjects;
    actor.getProperty().setOpacity(opacity);
    renderWindow.render();

    console.log(`👁️ Opacity set to ${opacity} for instance: ${instanceId}`);
  }

  /**
   * Set point size
   */
  setPointSize(instanceId, size) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { actor, renderWindow } = tools.sceneObjects;
    actor.getProperty().setPointSize(size);
    renderWindow.render();

    console.log(`⚫ Point size set to ${size} for instance: ${instanceId}`);
  }

  /**
   * Toggle wireframe mode
   */
  toggleWireframe(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { actor, renderWindow } = tools.sceneObjects;
    const property = actor.getProperty();

    const currentRep = property.getRepresentation();
    const newRep = currentRep === 2 ? 1 : 2; // Toggle between wireframe (1) and surface (2)

    property.setRepresentation(newRep);
    renderWindow.render();

    console.log(
      `🔲 Wireframe ${
        newRep === 1 ? "enabled" : "disabled"
      } for instance: ${instanceId}`
    );
  }

  /**
   * MEASUREMENT TOOLS
   */

  /**
   * Enable distance measurement
   */
  enableDistanceMeasurement(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Disable other tools first
    this.disableAllTools(instanceId);

    // Create distance widget
    const widget = vtkLineWidget.newInstance();
    const widgetRep = widget.getWidgetRepresentation();
    widgetRep.setGlyphScale(5);

    // Add to widget manager
    const handle = tools.widgetManager.addWidget(widget);
    handle.setEnabled(true);

    // Store widget
    tools.widgets.set("distance", { widget, handle });
    this.activeTools.set(instanceId, "distance");

    // Listen for measurements
    widget.onEndInteractionEvent(() => {
      const distance = widgetRep.getDistance();
      console.log(`📏 Distance measured: ${distance.toFixed(2)} units`);

      // Store measurement
      tools.measurements.push({
        type: "distance",
        value: distance,
        timestamp: Date.now(),
      });
    });

    console.log(`📏 Distance measurement enabled for instance: ${instanceId}`);
  }

  /**
   * Enable angle measurement
   */
  enableAngleMeasurement(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Disable other tools first
    this.disableAllTools(instanceId);

    // Create angle widget
    const widget = vtkAngleWidget.newInstance();
    const widgetRep = widget.getWidgetRepresentation();
    widgetRep.setGlyphScale(5);

    // Add to widget manager
    const handle = tools.widgetManager.addWidget(widget);
    handle.setEnabled(true);

    // Store widget
    tools.widgets.set("angle", { widget, handle });
    this.activeTools.set(instanceId, "angle");

    // Listen for measurements
    widget.onEndInteractionEvent(() => {
      const angle = widgetRep.getAngle();
      console.log(`📐 Angle measured: ${angle.toFixed(2)}°`);

      // Store measurement
      tools.measurements.push({
        type: "angle",
        value: angle,
        timestamp: Date.now(),
      });
    });

    console.log(`📐 Angle measurement enabled for instance: ${instanceId}`);
  }

  /**
   * CLIPPING TOOLS
   */

  /**
   * Enable clipping plane
   */
  enableClippingPlane(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Disable other tools first
    this.disableAllTools(instanceId);

    const { mapper, renderer, renderWindow } = tools.sceneObjects;

    // Create plane widget
    const widget = vtkPlaneWidget.newInstance();
    widget.setPlaceFactor(1.25);
    widget.setPlaceWidget(mapper.getInputData().getBounds());

    // Add to widget manager
    const handle = tools.widgetManager.addWidget(widget);
    handle.setEnabled(true);
    handle.setHandleVisibility(true);

    // Store widget
    tools.widgets.set("plane", { widget, handle });
    tools.clippingPlane = widget;
    this.activeTools.set(instanceId, "plane");

    // Apply clipping
    widget.onInteractionEvent(() => {
      const plane = widget.getPlane();
      mapper.addClippingPlane(plane);
      renderWindow.render();
    });

    console.log(`✂️ Clipping plane enabled for instance: ${instanceId}`);
  }

  /**
   * Reset clipping planes
   */
  resetClipping(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { mapper, renderWindow } = tools.sceneObjects;
    mapper.removeAllClippingPlanes();

    // Disable plane widget if active
    const planeWidget = tools.widgets.get("plane");
    if (planeWidget) {
      planeWidget.handle.setEnabled(false);
      tools.widgets.delete("plane");
    }

    renderWindow.render();
    console.log(`✂️ Clipping reset for instance: ${instanceId}`);
  }

  /**
   * UTILITY FUNCTIONS
   */

  /**
   * Disable all active tools
   */
  disableAllTools(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Disable all widgets
    tools.widgets.forEach((widget, name) => {
      widget.handle.setEnabled(false);
    });
    tools.widgets.clear();

    this.activeTools.delete(instanceId);
    console.log(`🛠️ All tools disabled for instance: ${instanceId}`);
  }

  /**
   * Get active tool
   */
  getActiveTool(instanceId) {
    return this.activeTools.get(instanceId) || null;
  }

  /**
   * Get measurements
   */
  getMeasurements(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.measurements || [];
  }

  /**
   * Clear measurements
   */
  clearMeasurements(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (tools) {
      tools.measurements = [];
      console.log(`📏 Measurements cleared for instance: ${instanceId}`);
    }
  }

  /**
   * Export instance state
   */
  exportInstanceState(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return null;

    return {
      camera: this.getCameraState(instanceId),
      measurements: this.getMeasurements(instanceId),
      activeTool: this.getActiveTool(instanceId),
      timestamp: Date.now(),
    };
  }

  /**
   * Import instance state
   */
  importInstanceState(instanceId, state) {
    if (state.camera) {
      this.setCameraState(instanceId, state.camera);
    }

    if (state.measurements) {
      const tools = this.instanceTools.get(instanceId);
      if (tools) {
        tools.measurements = state.measurements;
      }
    }

    console.log(`📥 State imported for instance: ${instanceId}`);
  }

  /**
   * Clean up tools for an instance
   */
  cleanupTools(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    console.log(`🧹 Cleaning up tools for instance: ${instanceId}`);

    // Disable all tools
    this.disableAllTools(instanceId);

    // Remove widget manager
    if (tools.widgetManager) {
      tools.widgetManager.delete();
    }

    // Remove from maps
    this.instanceTools.delete(instanceId);
    this.activeTools.delete(instanceId);

    console.log(`✅ Tools cleaned up for instance: ${instanceId}`);
  }
}

// Create and export singleton
export const instanceTools = new InstanceToolsManager();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.instanceTools = instanceTools;
}
