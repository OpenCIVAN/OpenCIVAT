// src/core/instances/types/vtk/widgets/plane/VTKPlaneWidget.js
// Clipping plane widget following the plugin pattern

import vtkImplicitPlaneWidget from "@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget";

/**
 * VTKPlaneWidget
 *
 * Provides interactive clipping plane for cutting through data.
 *
 * CONTRIBUTOR PATTERN:
 * - Each instance has its own widget (no global state)
 * - Widget lifecycle tied to instance lifecycle
 * - Clean separation from core architecture
 * - Automatically applies clipping when plane moves
 */
export class VTKPlaneWidget {
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
   * @param {number} config.placeFactor - Size multiplier (default 1.25)
   */
  initialize(instanceId, config) {
    if (this.instances.has(instanceId)) {
      console.warn(`⚠️ Plane widget already exists for ${instanceId}`);
      return;
    }

    console.log(`✂️ Initializing clipping plane for ${instanceId}`);

    const { widgetManager, sceneObjects, placeFactor = 1.25 } = config;

    try {
      // Create VTK.js widget
      const widget = vtkImplicitPlaneWidget.newInstance();
      widget.setPlaceFactor(placeFactor);

      // Get bounds for initial placement
      const inputData = sceneObjects.mapper.getInputData();
      if (inputData) {
        widget.placeWidget(inputData.getBounds());
      }

      // Add to widget manager and get handle
      const handle = widgetManager.addWidget(widget);
      handle.setEnabled(true);

      // FIX: Apply clipping when plane moves
      handle.onInteractionEvent(() => {
        // Get the widget state which contains the plane
        const widgetState = widget.getWidgetState();
        const planes = widgetState.getPlanes(); // ← CORRECT METHOD

        if (planes && planes.length > 0) {
          const plane = planes[0]; // Get first plane
          sceneObjects.mapper.removeAllClippingPlanes();
          sceneObjects.mapper.addClippingPlane(plane);
          sceneObjects.renderWindow.render();
        }
      });

      // Apply initial clipping
      const widgetState = widget.getWidgetState();
      const planes = widgetState.getPlanes();
      if (planes && planes.length > 0) {
        sceneObjects.mapper.addClippingPlane(planes[0]);
      }

      // Store widget data
      this.instances.set(instanceId, {
        widget,
        handle,
        widgetManager,
        sceneObjects,
        config,
      });

      console.log(`✅ Clipping plane created for ${instanceId}`);
    } catch (error) {
      console.error(`❌ Error initializing clipping plane:`, error);
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
   * Get current plane (for sync or export)
   */
  getPlane(instanceId) {
    const widgetData = this.instances.get(instanceId);
    if (!widgetData) return null;

    return widgetData.widget.getPlane();
  }

  /**
   * Set plane position (for sync or import)
   */
  setPlane(instanceId, planeData) {
    const widgetData = this.instances.get(instanceId);
    if (!widgetData) return;

    const { widget, sceneObjects } = widgetData;

    // Update widget plane
    widget.setPlane(planeData);

    // Apply clipping
    const plane = widget.getPlane();
    sceneObjects.mapper.removeAllClippingPlanes();
    sceneObjects.mapper.addClippingPlane(plane);
    sceneObjects.renderWindow.render();
  }

  /**
   * Clean up widget for a specific instance
   */
  cleanup(instanceId) {
    const widgetData = this.instances.get(instanceId);

    if (!widgetData) {
      return;
    }

    console.log(`🧹 Cleaning up clipping plane for ${instanceId}`);

    const { widget, handle, widgetManager, sceneObjects } = widgetData;

    // Remove clipping
    sceneObjects.mapper.removeAllClippingPlanes();

    // Disable and remove widget
    if (handle) {
      handle.setEnabled(false);
      widgetManager.removeWidget(widget);
    }

    // Render to show changes
    sceneObjects.renderWindow.render();

    // Remove from storage
    this.instances.delete(instanceId);

    console.log(`✅ Clipping plane cleaned up for ${instanceId}`);
  }

  /**
   * Clean up all widgets (app shutdown)
   */
  destroy() {
    console.log(`🧹 Destroying all clipping planes`);

    this.instances.forEach((widgetData, instanceId) => {
      this.cleanup(instanceId);
    });

    this.instances.clear();

    console.log(`✅ All clipping planes destroyed`);
  }
}

// Export singleton instance
export const vtkPlaneWidget = new VTKPlaneWidget();
