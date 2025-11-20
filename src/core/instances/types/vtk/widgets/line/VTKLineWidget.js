// src/core/instances/types/vtk/widgets/line/VTKLineWidget.js
// Line measurement widget following the plugin pattern

import VtkJsLineWidget from "@kitware/vtk.js/Widgets/Widgets3D/LineWidget";

/**
 * VTKLineWidget
 *
 * Provides distance measurement between two points.
 *
 * CONTRIBUTOR PATTERN:
 * - Each instance has its own widget (no global state)
 * - Widget lifecycle tied to instance lifecycle
 * - Clean separation from core architecture
 * - Measurements passed via callback
 */
export class VTKLineWidget {
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
    // Don't recreate if already exists
    if (this.instances.has(instanceId)) {
      console.warn(`⚠️ Line widget already exists for ${instanceId}`);
      return;
    }

    console.log(`📏 Initializing line measurement for ${instanceId}`);

    const { widgetManager, sceneObjects, onMeasurement } = config;

    try {
      // Create VTK.js widget
      const widget = VtkJsLineWidget.newInstance();

      // Add to widget manager and get handle
      const handle = widgetManager.addWidget(widget);

      // Get widget state from handle
      const widgetState = handle.getWidgetState();

      // Configure handle appearance
      const handle1 = widgetState.getHandle1();
      const handle2 = widgetState.getHandle2();

      if (handle1 && handle1.setScale1) {
        handle1.setScale1(5);
      }
      if (handle2 && handle2.setScale1) {
        handle2.setScale1(5);
      }

      // Enable the widget
      handle.setEnabled(true);

      // Listen for measurements
      handle.onEndInteractionEvent(() => {
        const distance = widget.getDistance();

        const measurement = {
          type: "distance",
          value: distance,
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

      console.log(`✅ Line widget created for ${instanceId}`);
    } catch (error) {
      console.error(`❌ Error initializing line widget:`, error);
    }
  }

  /**
   * Check if widget is enabled for an instance
   *
   * @param {string} instanceId - Instance to check
   * @returns {boolean} True if enabled
   */
  isEnabled(instanceId) {
    return this.instances.has(instanceId);
  }

  /**
   * Get widget configuration
   *
   * @param {string} instanceId - Instance to query
   * @returns {Object|null} Configuration or null
   */
  getConfig(instanceId) {
    const widgetData = this.instances.get(instanceId);
    return widgetData ? { ...widgetData.config } : null;
  }

  /**
   * Clean up widget for a specific instance
   *
   * @param {string} instanceId - Instance to clean up
   */
  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      return; // Already cleaned up or never created
    }

    console.log(`🧹 Cleaning up line widget for ${instanceId}`);

    const { widget, handle, widgetManager } = widgetData;

    // Disable and remove widget
    if (handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    // Remove from storage
    this.instances.delete(instanceId);

    console.log(`✅ Line widget cleaned up for ${instanceId}`);
  }

  /**
   * Clean up all widgets (app shutdown)
   */
  destroy() {
    console.log(`🧹 Destroying all line widgets`);

    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });

    this.instances.clear();

    console.log(`✅ All line widgets destroyed`);
  }
}

// Export singleton instance
export const vtkLineWidget = new VTKLineWidget();
