// src/core/instances/types/vtk/widgets/orientation/VTKOrientationWidget.js
// Orientation marker widget showing XYZ axes in corner
// Each instance gets its own orientation widget that tracks that instance's camera

import { render as log } from "@Utils/logger.js";
import vtkOrientationMarkerWidget from "@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget";
import vtkAnnotatedCubeActor from "@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor";

/**
 * VTKOrientationWidget
 *
 * Provides a 3D orientation marker (cube with labeled faces) in the corner
 * of the viewport. The cube rotates with the camera to show current orientation.
 *
 * CONTRIBUTOR PATTERN:
 * - Each instance has its own widget (no global state)
 * - Widget lifecycle tied to instance lifecycle
 * - Configuration passed at creation time
 * - Clean separation: widget logic, UI config, sync (not needed here)
 */
export class VTKOrientationWidget {
  constructor() {
    // Per-instance widget storage
    // Maps instanceId → { widget, actor, config }
    this.instances = new Map();
  }

  /**
   * Initialize widget for a specific instance
   *
   * This is called by VTKInstanceHandler when the instance is created
   * or when the user enables the orientation widget.
   *
   * @param {string} instanceId - Unique instance identifier
   * @param {Object} sceneObjects - VTK scene components from the instance
   * @param {Object} config - Widget configuration options
   */
  initialize(instanceId, sceneObjects, config = {}) {
    // Don't recreate if already exists for this instance
    if (this.instances.has(instanceId)) {
      log.warn(`Orientation widget already exists for ${instanceId}`);
      return;
    }

    log.debug(`Initializing orientation widget for ${instanceId}`);

    const { interactor } = sceneObjects;

    if (!interactor) {
      log.error(`No interactor available for instance ${instanceId}`);
      return;
    }

    // Create the cube actor with labeled faces
    const cubeActor = this._createCubeActor(config);

    // Create the orientation marker widget
    const widget = vtkOrientationMarkerWidget.newInstance({
      actor: cubeActor,
      interactor: interactor,
    });

    // Apply configuration
    // Use smaller sizes to scale proportionally with viewport
    const cfg = {
      enabled: true,
      corner: config.corner || "BOTTOM_RIGHT",
      viewportSize: config.viewportSize || 0.12, // 12% of viewport
      minPixelSize: config.minPixelSize || 40, // Smaller min for tight layouts
      maxPixelSize: config.maxPixelSize || 100, // Cap max to avoid being too large
      ...config,
    };

    widget.setEnabled(cfg.enabled);
    widget.setViewportCorner(vtkOrientationMarkerWidget.Corners[cfg.corner]);
    widget.setViewportSize(cfg.viewportSize);
    widget.setMinPixelSize(cfg.minPixelSize);
    widget.setMaxPixelSize(cfg.maxPixelSize);

    // Store widget data for this instance
    this.instances.set(instanceId, {
      widget,
      actor: cubeActor,
      config: cfg,
      interactor,
    });

    log.debug(`Orientation widget created for ${instanceId}`);
  }

  /**
   * Create and configure the cube actor
   *
   * @param {Object} config - Face styling configuration
   * @returns {vtkAnnotatedCubeActor} Configured cube actor
   */
  _createCubeActor(config) {
    const cube = vtkAnnotatedCubeActor.newInstance();

    // Default style applied to all faces
    cube.setDefaultStyle({
      text: "+X",
      fontStyle: "bold",
      fontFamily: "Arial",
      fontColor: "black",
      fontSizeScale: (res) => res / 2,
      faceColor: "#0096FF", // Bright blue
      faceRotation: 0,
      edgeThickness: 0.1,
      edgeColor: "black",
      resolution: 400,
    });

    // Customize individual faces
    // +X (right) - Blue
    cube.setXPlusFaceProperty({
      text: "+X",
      faceColor: config.xPlusColor || "#0096FF",
    });

    // -X (left) - Yellow
    cube.setXMinusFaceProperty({
      text: "-X",
      faceColor: config.xMinusColor || "#FFD700",
      faceRotation: 90,
      fontStyle: "italic",
    });

    // +Y (top) - Green
    cube.setYPlusFaceProperty({
      text: "+Y",
      faceColor: config.yPlusColor || "#00FF00",
      fontSizeScale: (res) => res / 4,
    });

    // -Y (bottom) - Cyan
    cube.setYMinusFaceProperty({
      text: "-Y",
      faceColor: config.yMinusColor || "#00FFFF",
      fontColor: "white",
    });

    // +Z (front) - Red
    cube.setZPlusFaceProperty({
      text: "+Z",
      faceColor: config.zPlusColor || "#FF0000",
      edgeColor: "yellow",
    });

    // -Z (back) - Magenta
    cube.setZMinusFaceProperty({
      text: "-Z",
      faceColor: config.zMinusColor || "#FF00FF",
      faceRotation: 45,
      edgeThickness: 0,
    });

    return cube;
  }

  /**
   * Toggle widget visibility for an instance
   *
   * @param {string} instanceId - Instance to toggle
   * @param {boolean} visible - True to show, false to hide
   */
  setVisible(instanceId, visible) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      log.warn(`No orientation widget found for ${instanceId}`);
      return;
    }

    widgetData.widget.setEnabled(visible);
    widgetData.config.enabled = visible;

    log.debug(
      `Orientation widget ${visible ? "enabled" : "disabled"} for ${instanceId}`
    );
  }

  /**
   * Update widget configuration
   *
   * @param {string} instanceId - Instance to update
   * @param {Object} newConfig - Configuration changes
   */
  updateConfig(instanceId, newConfig) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      log.warn(`No orientation widget found for ${instanceId}`);
      return;
    }

    const { widget, config } = widgetData;

    // Update corner position if changed
    if (newConfig.corner && newConfig.corner !== config.corner) {
      widget.setViewportCorner(
        vtkOrientationMarkerWidget.Corners[newConfig.corner]
      );
      config.corner = newConfig.corner;
    }

    // Update size if changed
    if (newConfig.viewportSize !== undefined) {
      widget.setViewportSize(newConfig.viewportSize);
      config.viewportSize = newConfig.viewportSize;
    }

    if (newConfig.minPixelSize !== undefined) {
      widget.setMinPixelSize(newConfig.minPixelSize);
      config.minPixelSize = newConfig.minPixelSize;
    }

    if (newConfig.maxPixelSize !== undefined) {
      widget.setMaxPixelSize(newConfig.maxPixelSize);
      config.maxPixelSize = newConfig.maxPixelSize;
    }

    log.debug(`Orientation widget config updated for ${instanceId}`);
  }

  /**
   * Get current widget configuration
   *
   * @param {string} instanceId - Instance to query
   * @returns {Object|null} Current configuration or null if not found
   */
  getConfig(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? { ...widgetData.config } : null;
  }

  /**
   * Check if widget is enabled for an instance
   *
   * @param {string} instanceId - Instance to check
   * @returns {boolean} True if enabled
   */
  isEnabled(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? widgetData.config.enabled : false;
  }

  /**
   * Clean up widget for a specific instance
   *
   * This is called by VTKInstanceHandler when the instance is destroyed
   *
   * @param {string} instanceId - Instance to clean up
   */
  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      return; // Already cleaned up or never created
    }

    log.debug(`Cleaning up orientation widget for ${instanceId}`);

    const { widget, actor } = widgetData;

    // Disable and delete the widget
    if (widget) {
      widget.setEnabled(false);
      widget.delete();
    }

    // Delete the actor
    if (actor) {
      actor.delete();
    }

    // Remove from storage
    this.instances.delete(instanceId);

    log.debug(`Orientation widget cleaned up for ${instanceId}`);
  }

  /**
   * Clean up all widgets (app shutdown)
   */
  destroy() {
    log.debug(`Destroying all orientation widgets`);

    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });

    this.instances.clear();

    log.debug(`All orientation widgets destroyed`);
  }
}

// Export singleton instance for use by VTKInstanceHandler
export const vtkOrientationWidget = new VTKOrientationWidget();

// Make available for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.vtkOrientationWidget = vtkOrientationWidget;
}
