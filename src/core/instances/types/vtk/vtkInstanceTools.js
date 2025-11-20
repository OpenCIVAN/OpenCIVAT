// src/core/instances/types/vtk/vtkInstanceTools.js
// REFACTORED: Thin coordination layer - No widget creation duplication!

import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager";

// Import widget modules (already created!)
import { vtkPlaneWidget } from "@VTK/widgets/plane/VTKPlaneWidget.js";
import { vtkLineWidget } from "@VTK/widgets/line/VTKLineWidget.js";
import { vtkAngleWidget } from "@VTK/widgets/angle/VTKAngleWidget.js";
import { vtkOrientationWidget } from "@VTK/widgets/orientation/VTKOrientationWidget.js";

/**
 * InstanceToolsManager
 *
 * RESPONSIBILITIES:
 * - Basic rendering properties (opacity, representation, etc.)
 * - Widget coordination (thin wrappers that delegate to widget modules)
 * - State queries (convenience methods)
 *
 * NOT RESPONSIBLE FOR:
 * - VTK widget creation (that's in widget files!)
 * - Widget lifecycle details (that's in widget files!)
 */
class InstanceToolsManager {
  constructor() {
    this.instanceTools = new Map(); // instanceId -> tools
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

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
      measurements: [],
      clipPosition: 50, // For slider
      colorMap: null,
      opacityFunction: null,
    };

    // Create widget manager (shared by all widgets)
    tools.widgetManager = vtkWidgetManager.newInstance();
    tools.widgetManager.setRenderer(sceneObjects.renderer);

    this.instanceTools.set(instanceId, tools);
    console.log(`✅ Tools initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up tools for an instance
   */
  cleanupTools(instanceId) {
    console.log(`🧹 Cleaning up tools for instance: ${instanceId}`);

    // Clean up all widgets first
    vtkPlaneWidget.cleanup(instanceId);
    vtkLineWidget.cleanup(instanceId);
    vtkAngleWidget.cleanup(instanceId);
    vtkOrientationWidget.cleanup(instanceId);

    // Clean up tools
    this.instanceTools.delete(instanceId);

    console.log(`✅ Tools cleaned up for instance: ${instanceId}`);
  }

  // ==========================================================================
  // BASIC RENDERING PROPERTIES (Not widgets - just VTK actor properties)
  // ==========================================================================

  /**
   * Set opacity (0.0 = transparent, 1.0 = opaque)
   */
  setOpacity(instanceId, opacity) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    tools.sceneObjects.actor.getProperty().setOpacity(opacity);
    tools.sceneObjects.renderWindow.render();

    console.log(`👁️ Opacity set to ${opacity} for instance: ${instanceId}`);
  }

  /**
   * Get current opacity
   */
  getOpacity(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return 1.0;

    return tools.sceneObjects.actor.getProperty().getOpacity();
  }

  /**
   * Set representation mode (surface, wireframe, or points)
   */
  setRepresentation(instanceId, mode) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const modeMap = {
      surface: 2,
      wireframe: 1,
      points: 0,
    };

    const representation = modeMap[mode];
    if (representation === undefined) {
      console.warn(`Unknown representation mode: ${mode}`);
      return;
    }

    const property = tools.sceneObjects.actor.getProperty();
    property.setRepresentation(representation);

    // Auto-adjust point size for points mode
    if (mode === "points") {
      property.setPointSize(5);
    }

    tools.sceneObjects.renderWindow.render();

    console.log(`🎨 Representation set to ${mode} for instance: ${instanceId}`);
  }

  /**
   * Get current representation mode
   */
  getRepresentation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return "surface";

    const rep = tools.sceneObjects.actor.getProperty().getRepresentation();
    const modeMap = { 0: "points", 1: "wireframe", 2: "surface" };

    return modeMap[rep] || "surface";
  }

  /**
   * Set point size
   */
  setPointSize(instanceId, size) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    tools.sceneObjects.actor.getProperty().setPointSize(size);
    tools.sceneObjects.renderWindow.render();

    console.log(`⚫ Point size set to ${size} for instance: ${instanceId}`);
  }

  /**
   * Get current point size
   */
  getPointSize(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return 5;

    return tools.sceneObjects.actor.getProperty().getPointSize();
  }

  /**
   * Set line width
   */
  setLineWidth(instanceId, width) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    tools.sceneObjects.actor.getProperty().setLineWidth(width);
    tools.sceneObjects.renderWindow.render();

    console.log(`━ Line width set to ${width} for instance: ${instanceId}`);
  }

  /**
   * Get current line width
   */
  getLineWidth(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return 2;

    return tools.sceneObjects.actor.getProperty().getLineWidth();
  }

  /**
   * Set color map
   */
  setColorMap(instanceId, preset) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const { actor, renderWindow } = tools.sceneObjects;
    const ctf = vtkColorTransferFunction.newInstance();

    // Define presets
    const presets = {
      rainbow: [
        [0.0, 0, 0, 1],
        [0.33, 0, 1, 1],
        [0.66, 1, 1, 0],
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
   * Force a render
   */
  forceRender(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (tools?.sceneObjects?.renderWindow) {
      tools.sceneObjects.renderWindow.render();
    }
  }

  // ==========================================================================
  // WIDGET COORDINATION (Thin wrappers that delegate to widget modules)
  // ==========================================================================

  /**
   * Toggle clipping plane widget
   * THIN WRAPPER - Delegates to VTKPlaneWidget module
   */
  toggleClippingPlane(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkPlaneWidget.isEnabled(instanceId);

    if (isActive) {
      // Disable
      vtkPlaneWidget.cleanup(instanceId);
      console.log(`✂️ Clipping plane disabled for instance: ${instanceId}`);
    } else {
      // Enable
      vtkPlaneWidget.initialize(instanceId, {
        widgetManager: tools.widgetManager,
        sceneObjects: tools.sceneObjects,
        placeFactor: 1.25,
      });
      console.log(`✂️ Clipping plane enabled for instance: ${instanceId}`);
    }
  }

  /**
   * Toggle ruler measurement widget
   * THIN WRAPPER - Delegates to VTKLineWidget module
   */
  toggleRulerMeasurement(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkLineWidget.isEnabled(instanceId);

    if (isActive) {
      // Disable
      vtkLineWidget.cleanup(instanceId);
      console.log(`📏 Ruler measurement disabled for instance: ${instanceId}`);
    } else {
      // Enable
      vtkLineWidget.initialize(instanceId, {
        widgetManager: tools.widgetManager,
        sceneObjects: tools.sceneObjects,
        onMeasurement: (measurement) => {
          tools.measurements.push(measurement);
          console.log(`📏 Distance measured: ${measurement.value.toFixed(2)}`);
        },
      });
      console.log(`📏 Ruler measurement enabled for instance: ${instanceId}`);
    }
  }

  /**
   * Toggle angle measurement widget
   * THIN WRAPPER - Delegates to VTKAngleWidget module
   */
  toggleAngleMeasurement(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkAngleWidget.isEnabled(instanceId);

    if (isActive) {
      // Disable
      vtkAngleWidget.cleanup(instanceId);
      console.log(`📐 Angle measurement disabled for instance: ${instanceId}`);
    } else {
      // Enable
      vtkAngleWidget.initialize(instanceId, {
        widgetManager: tools.widgetManager,
        sceneObjects: tools.sceneObjects,
        onMeasurement: (measurement) => {
          tools.measurements.push(measurement);
          console.log(`📐 Angle measured: ${measurement.value.toFixed(2)}°`);
        },
      });
      console.log(`📐 Angle measurement enabled for instance: ${instanceId}`);
    }
  }

  /**
   * Toggle orientation widget
   * THIN WRAPPER - Delegates to VTKOrientationWidget module
   */
  toggleOrientation(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    const isActive = vtkOrientationWidget.isEnabled(instanceId);
    vtkOrientationWidget.setVisible(instanceId, !isActive);

    // ✅ CRITICAL: Force render to update display immediately
    tools.sceneObjects.renderWindow.render();

    console.log(
      `🧭 Orientation ${
        !isActive ? "enabled" : "disabled"
      } for instance: ${instanceId}`
    );
  }

  /**
   * Initialize orientation widget tracking
   * Called by VTKInstanceHandler after orientation widget is created
   */
  initializeOrientationWidget(instanceId) {
    // Just for tracking - actual widget managed by vtkOrientationWidget module
    console.log(`🧭 Orientation widget tracked for instance: ${instanceId}`);
  }

  // ==========================================================================
  // CLIPPING STATE HELPERS (For slider support)
  // ==========================================================================

  /**
   * Get clipping state for UI
   */
  getClipState(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return { active: false, position: 50 };

    return {
      active: vtkPlaneWidget.isEnabled(instanceId),
      position: tools.clipPosition || 50,
    };
  }

  /**
   * Set clipping plane position (0-100%)
   * Delegates to VTKPlaneWidget
   */
  setClipPosition(instanceId, percentage) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Store position
    tools.clipPosition = percentage;

    // Delegate to widget if active
    if (vtkPlaneWidget.isEnabled(instanceId)) {
      vtkPlaneWidget.setPosition(instanceId, percentage);
      console.log(
        `✂️ Clip position set to ${percentage}% for instance: ${instanceId}`
      );
    }
  }

  /**
   * Reset clipping
   */
  resetClipping(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    if (!tools) return;

    // Clean up widget
    vtkPlaneWidget.cleanup(instanceId);

    // Reset position
    tools.clipPosition = 50;

    // Remove any clipping from mapper
    tools.sceneObjects.mapper.removeAllClippingPlanes();
    tools.sceneObjects.renderWindow.render();

    console.log(`✂️ Clipping reset for instance: ${instanceId}`);
  }

  // ==========================================================================
  // STATE QUERIES (Convenience methods)
  // ==========================================================================

  /**
   * Check if a specific widget is active
   */
  isWidgetActive(instanceId, widgetType) {
    switch (widgetType) {
      case "plane":
        return vtkPlaneWidget.isEnabled(instanceId);
      case "line":
        return vtkLineWidget.isEnabled(instanceId);
      case "angle":
        return vtkAngleWidget.isEnabled(instanceId);
      case "orientation":
        return vtkOrientationWidget.isEnabled(instanceId);
      default:
        return false;
    }
  }

  /**
   * Check if any measurement widgets are active
   */
  hasActiveWidgets(instanceId) {
    return (
      vtkLineWidget.isEnabled(instanceId) ||
      vtkAngleWidget.isEnabled(instanceId) ||
      vtkPlaneWidget.isEnabled(instanceId)
    );
  }

  /**
   * Get all measurements for an instance
   */
  getMeasurements(instanceId) {
    const tools = this.instanceTools.get(instanceId);
    return tools?.measurements || [];
  }

  /**
   * Disable all measurement tools
   */
  disableMeasurementTools(instanceId) {
    vtkLineWidget.cleanup(instanceId);
    vtkAngleWidget.cleanup(instanceId);
    vtkPlaneWidget.cleanup(instanceId);

    const tools = this.instanceTools.get(instanceId);
    if (tools) {
      tools.measurements = [];
    }

    console.log(
      `🧹 All measurement tools disabled for instance: ${instanceId}`
    );
  }

  /**
   * Disable all tools
   */
  disableAllTools(instanceId) {
    this.disableMeasurementTools(instanceId);
    vtkOrientationWidget.setVisible(instanceId, false);

    console.log(`🧹 All tools disabled for instance: ${instanceId}`);
  }
}

// Export singleton
export const instanceTools = new InstanceToolsManager();
