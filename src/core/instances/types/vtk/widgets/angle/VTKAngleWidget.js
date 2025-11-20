// src/core/instances/types/vtk/widgets/angle/VTKAngleWidget.js
// Angle measurement widget following the plugin pattern

import VtkJsAngleWidget from "@kitware/vtk.js/Widgets/Widgets3D/AngleWidget";

/**
 * VTKAngleWidget
 *
 * Provides angle measurement between three points.
 *
 * CONTRIBUTOR PATTERN:
 * - Each instance has its own widget (no global state)
 * - Widget lifecycle tied to instance lifecycle
 * - Clean separation from core architecture
 * - Measurements passed via callback
 */
export class VTKAngleWidget {
  constructor() {
    // Per-instance widget storage
    // Maps instanceId → { widget, handle, config }
    this.instances = new Map();
  }

  /**
   * Initialize widget for a specific instance
   *
   * @param {string} instanceId - Unique instance identifier
   * @param {Object} config - Configuration
   * @param {Object} config.widgetManager - VTK widget manager
   * @param {Object} config.sceneObjects - VTK scene components
   * @param {Function} config.onMeasurement - Callback for measurements
   */
  initialize(instanceId, config) {
    if (this.instances.has(instanceId)) {
      console.warn(`⚠️ Angle widget already exists for ${instanceId}`);
      return;
    }

    console.log(`📐 Initializing angle measurement for ${instanceId}`);

    const { widgetManager, sceneObjects, onMeasurement } = config;

    try {
      // Create VTK.js widget
      const widget = VtkJsAngleWidget.newInstance();

      // Add to widget manager and get handle
      const handle = widgetManager.addWidget(widget);

      // Get widget state from handle
      const widgetState = handle.getWidgetState();

      // Configure handle appearance
      const handle1 = widgetState.getHandle1();
      const handle2 = widgetState.getHandle2();
      const handle3 = widgetState.getHandle3();

      if (handle1 && handle1.setScale1) handle1.setScale1(5);
      if (handle2 && handle2.setScale1) handle2.setScale1(5);
      if (handle3 && handle3.setScale1) handle3.setScale1(5);

      // Enable the widget
      handle.setEnabled(true);

      // Listen for measurements
      handle.onEndInteractionEvent(() => {
        const angle = widget.getAngle();

        const measurement = {
          type: "angle",
          value: angle,
          timestamp: Date.now(),
        };

        if (onMeasurement) {
          onMeasurement(measurement);
        }

        sceneObjects.renderWindow.render();
      });

      // Store widget data
      this.instances.set(instanceId, {
        widget,
        handle,
        widgetManager,
        sceneObjects,
        config,
      });

      console.log(`✅ Angle widget created for ${instanceId}`);
    } catch (error) {
      console.error(`❌ Error initializing angle widget:`, error);
    }
  }

  /**
   * Check if widget is enabled for an instance
   */
  isEnabled(instanceId) {
    return this.instances.has(instanceId);
  }

  /**
   * Get widget configuration
   */
  getConfig(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? { ...widgetData.config } : null;
  }

  /**
   * Clean up widget for a specific instance
   */
  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      return;
    }

    console.log(`🧹 Cleaning up angle widget for ${instanceId}`);

    const { widget, handle, widgetManager } = widgetData;

    if (handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    this.instances.delete(instanceId);

    console.log(`✅ Angle widget cleaned up for ${instanceId}`);
  }

  /**
   * Clean up all widgets (app shutdown)
   */
  destroy() {
    console.log(`🧹 Destroying all angle widgets`);

    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });

    this.instances.clear();

    console.log(`✅ All angle widgets destroyed`);
  }
}

// Export singleton instance
export const vtkAngleWidget = new VTKAngleWidget();
