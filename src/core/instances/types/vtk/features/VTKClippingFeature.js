// src/core/instances/types/vtk/features/VTKClippingFeature.js

/**
 * VTK Clipping Plane Feature
 *
 * Provides interactive clipping planes for cutting through geometry.
 * Wraps the VTKPlaneWidget with the FeatureInterface pattern.
 *
 * Provides:
 * - Interactive clipping plane manipulation
 * - Preset orientations (X, Y, Z axis-aligned)
 * - Plane visibility toggle
 * - Invert clipping direction
 *
 * @see https://kitware.github.io/vtk-js/examples/ImplicitPlaneWidget.html
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";
import { vtkPlaneWidget } from "../widgets/plane/VTKPlaneWidget.js";

// VTK.js imports
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Preset plane orientations
 */
const PLANE_PRESETS = {
  x: { name: 'X-Axis (YZ Plane)', normal: [1, 0, 0] },
  y: { name: 'Y-Axis (XZ Plane)', normal: [0, 1, 0] },
  z: { name: 'Z-Axis (XY Plane)', normal: [0, 0, 1] },
  diagonal: { name: 'Diagonal', normal: [0.577, 0.577, 0.577] },
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  enabled: false,
  widgetVisible: true,
  inverted: false,
  planePreset: 'x',
};

/**
 * Normalize a declarative clipping config (from Y.js / ViewConfiguration
 * sync) so malformed or missing fields never throw. The plane itself
 * (origin/normal) is optional — when absent, the preset/inverted fields
 * alone are enough to reproduce the plane locally via setPlanePreset().
 */
export function normalizeClippingConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const planePreset = PLANE_PRESETS[source.planePreset] ? source.planePreset : DEFAULT_SETTINGS.planePreset;

  const plane = source.plane && typeof source.plane === 'object'
    && Array.isArray(source.plane.origin) && source.plane.origin.length === 3
    && Array.isArray(source.plane.normal) && source.plane.normal.length === 3
    ? { origin: [...source.plane.origin], normal: [...source.plane.normal] }
    : null;

  return {
    enabled: source.enabled === true,
    inverted: source.inverted === true,
    planePreset,
    plane,
  };
}

// =============================================================================
// VTK CLIPPING FEATURE
// =============================================================================

export class VTKClippingFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Get feature metadata
   */
  getMetadata() {
    return {
      id: 'VTKClippingFeature',
      name: 'Clipping Plane',
      description: 'Interactive clipping plane for cutting through data',
      version: '1.0.0',
      author: 'CIA Team',
    };
  }

  /**
   * Check if this feature is available
   */
  isAvailable(instanceId, instanceData) {
    // Available for any VTK instance with geometry
    return instanceData?.sceneObjects?.mapper != null;
  }

  /**
   * Initialize clipping feature
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    if (!sceneObjects) {
      log.warn(`Cannot initialize clipping: no sceneObjects for ${instanceId}`);
      return;
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      widgetManager: instanceData.widgetManager,
      bounds: null,
      center: null,
      // Manual clipping plane (when widget not visible)
      manualClipPlane: null,
    };

    this.instanceStates.set(instanceId, state);
    log.debug(`Clipping feature initialized for instance: ${instanceId}`);
  }

  /**
   * Clean up clipping resources
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    // Clean up widget if active
    if (state.enabled) {
      this._disableClipping(instanceId, state);
    }

    this.instanceStates.delete(instanceId);
    log.debug(`Clipping feature cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get current state
   */
  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    const plane = this._isManual(state)
      ? this.getManualPlane(instanceId)
      : vtkPlaneWidget.getPlane(instanceId);

    return {
      enabled: state.enabled,
      widgetVisible: state.widgetVisible,
      inverted: state.inverted,
      planePreset: state.planePreset,
      plane: plane,
    };
  }

  // ===========================================================================
  // CLIPPING CONTROLS
  // ===========================================================================

  /**
   * Returns true when this instance is using the widget-free manual clip
   * plane path (a `vtkPlane` we own directly) instead of the interactive
   * `vtkImplicitPlaneWidget`.
   */
  _isManual(state) {
    return !!state?.manualClipPlane;
  }

  /**
   * Create the manual (widget-free) clip plane, if it doesn't already exist.
   * This is the path VR always uses: `vtkWidgetManager` needs a mouse
   * interactor and would add widget actors into the shared VR renderer
   * (contaminating desktop bounds), so VR drives a plain `vtkPlane` directly
   * off controller pose instead of an interactive widget.
   */
  enableManualClipping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (!state.manualClipPlane) {
      state.manualClipPlane = vtkPlane.newInstance();
    }
  }

  /**
   * Set the manual clip plane's origin/normal and (re)apply it to the
   * mapper. Mirrors the apply sequence used by VTKPlaneWidget.setPlane() /
   * VTKImplicitPlaneFeature._applyClipping(): removeAllClippingPlanes() →
   * addClippingPlane() → render().
   */
  setManualPlane(instanceId, { origin, normal } = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.manualClipPlane) return;

    const { mapper, renderWindow } = state.sceneObjects || {};
    if (!mapper) return;

    if (normal) state.manualClipPlane.setNormal(normal);
    if (origin) state.manualClipPlane.setOrigin(origin);

    mapper.removeAllClippingPlanes();
    mapper.addClippingPlane(state.manualClipPlane);
    renderWindow?.render();
  }

  /**
   * Read the manual clip plane back out as plain { origin, normal } — the
   * same shape vtkPlaneWidget.getPlane() returns, so callers don't need to
   * know which path is live.
   */
  getManualPlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.manualClipPlane) return null;

    return {
      origin: state.manualClipPlane.getOrigin(),
      normal: state.manualClipPlane.getNormal(),
    };
  }

  /**
   * Enable clipping.
   *
   * `{ manual: true }` (or no widgetManager at all) uses a plain `vtkPlane`
   * applied directly to the mapper instead of the interactive
   * `vtkImplicitPlaneWidget`. VR MUST always pass `{ manual: true }`:
   * `vtkWidgetManager` needs a mouse interactor and would add widget actors
   * into the shared VR renderer, contaminating desktop bounds (see
   * VTKInstanceHandler.js:4689-4702 for the documented symptom).
   */
  enableClipping(instanceId, { manual = false } = {}) {
    const state = this.instanceStates.get(instanceId);
    if (!state || state.enabled) return;

    const { sceneObjects, widgetManager } = state;
    const { mapper } = sceneObjects;

    if (!mapper) {
      log.warn('Cannot enable clipping: missing mapper');
      return;
    }

    // Get data bounds for plane placement
    const inputData = mapper.getInputData();
    if (inputData) {
      const bounds = inputData.getBounds();
      state.bounds = bounds;
      state.center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
      ];
    }

    const useManual = manual || !widgetManager;

    if (useManual) {
      this.enableManualClipping(instanceId);

      state.enabled = true;
      state.widgetVisible = false;

      // Apply preset orientation (routes through the manual path since
      // state.manualClipPlane is now set)
      this.setPlanePreset(instanceId, state.planePreset);

      log.debug(`Clipping enabled (manual) for instance: ${instanceId}`);
      return;
    }

    // Initialize the plane widget
    try {
      vtkPlaneWidget.initialize(instanceId, {
        widgetManager,
        sceneObjects,
        placeFactor: 1.25,
      });

      state.enabled = true;
      state.widgetVisible = true;

      // Apply preset orientation
      this.setPlanePreset(instanceId, state.planePreset);

      log.debug(`Clipping enabled for instance: ${instanceId}`);
    } catch (error) {
      log.error(`Failed to enable clipping: ${error.message}`);
    }
  }

  /**
   * Disable clipping
   */
  disableClipping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    this._disableClipping(instanceId, state);
    log.debug(`Clipping disabled for instance: ${instanceId}`);
  }

  /**
   * Internal disable helper
   */
  _disableClipping(instanceId, state) {
    // Clean up widget
    vtkPlaneWidget.cleanup(instanceId);

    // Remove any manual clipping planes
    if (state.manualClipPlane) {
      state.sceneObjects.mapper?.removeAllClippingPlanes();
      state.manualClipPlane = null;
    }

    state.enabled = false;
    state.widgetVisible = false;

    state.sceneObjects.renderWindow?.render();
  }

  /**
   * Toggle clipping on/off
   */
  toggleClipping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.enabled) {
      this.disableClipping(instanceId);
    } else {
      this.enableClipping(instanceId);
    }
  }

  /**
   * Set plane to a preset orientation
   */
  setPlanePreset(instanceId, presetName) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    const preset = PLANE_PRESETS[presetName];
    if (!preset) {
      log.warn(`Unknown plane preset: ${presetName}`);
      return;
    }

    state.planePreset = presetName;

    // Get center of data
    const origin = state.center || [0, 0, 0];
    let normal = [...preset.normal];

    // Apply inversion if needed
    if (state.inverted) {
      normal = normal.map(n => -n);
    }

    if (this._isManual(state)) {
      this.setManualPlane(instanceId, { origin, normal });
    } else {
      // Update plane widget
      vtkPlaneWidget.setPlane(instanceId, {
        origin,
        normal,
      });
    }

    log.debug(`Plane preset set to: ${presetName}`);
  }

  /**
   * Invert clipping direction
   */
  invertClipping(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    state.inverted = !state.inverted;

    const isManual = this._isManual(state);

    // Get current plane and invert normal
    const currentPlane = isManual
      ? this.getManualPlane(instanceId)
      : vtkPlaneWidget.getPlane(instanceId);

    if (currentPlane && currentPlane.normal) {
      const invertedNormal = currentPlane.normal.map(n => -n);
      const planeData = {
        origin: currentPlane.origin,
        normal: invertedNormal,
      };

      if (isManual) {
        this.setManualPlane(instanceId, planeData);
      } else {
        vtkPlaneWidget.setPlane(instanceId, planeData);
      }
    }

    log.debug(`Clipping inverted: ${state.inverted}`);
  }

  /**
   * Reset plane to center of data
   */
  resetPlane(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    // Reset to default preset at center
    state.inverted = false;
    this.setPlanePreset(instanceId, state.planePreset);

    log.debug(`Clipping plane reset`);
  }

  /**
   * Get plane data for synchronization
   */
  getPlaneData(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (state && this._isManual(state)) {
      return this.getManualPlane(instanceId);
    }
    return vtkPlaneWidget.getPlane(instanceId);
  }

  /**
   * Set plane data from synchronization
   */
  setPlaneData(instanceId, planeData) {
    const state = this.instanceStates.get(instanceId);
    if (!state || !state.enabled) return;

    if (this._isManual(state)) {
      this.setManualPlane(instanceId, planeData);
      return;
    }

    vtkPlaneWidget.setPlane(instanceId, planeData);
  }

  // ===========================================================================
  // COLLABORATIVE SYNC
  // ===========================================================================

  /**
   * Declarative config for collaborative sync — parameters only, never the
   * live widget/mapper. Includes the concrete plane (origin/normal) so a
   * manually-dragged plane (not just a preset) round-trips to peers too.
   */
  getConfigForSync(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return normalizeClippingConfig({});

    const plane = state.enabled
      ? (this._isManual(state) ? this.getManualPlane(instanceId) : vtkPlaneWidget.getPlane(instanceId))
      : null;

    return normalizeClippingConfig({
      enabled: state.enabled,
      inverted: state.inverted,
      planePreset: state.planePreset,
      plane,
    });
  }

  /**
   * Apply an incoming (remote/collaborative) declarative clipping config.
   * Reuses the existing setters so local rendering stays consistent, and
   * normalizes first so malformed fields never throw.
   */
  applyRemoteConfig(instanceId, rawConfig) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    const config = normalizeClippingConfig(rawConfig);

    if (!config.enabled) {
      if (state.enabled) this.disableClipping(instanceId);
      return;
    }

    if (!state.enabled) {
      this.enableClipping(instanceId);
    }

    if (config.inverted !== state.inverted) {
      this.invertClipping(instanceId);
    }

    if (config.plane) {
      // Exact plane wins over the preset when both are present — it reflects
      // the peer's actual (possibly hand-dragged) widget position.
      this.setPlaneData(instanceId, config.plane);
      state.planePreset = config.planePreset;
    } else if (config.planePreset !== state.planePreset) {
      this.setPlanePreset(instanceId, config.planePreset);
    }
  }

  // ===========================================================================
  // TOOLS INTERFACE
  // ===========================================================================

  /**
   * Get tools for the toolbar
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return [];

    // Main toggle tool
    const tools = [
      {
        id: 'clipping-toggle',
        icon: state.enabled ? 'scissors' : 'box',
        label: state.enabled ? 'Clipping On' : 'Clipping Off',
        description: 'Toggle clipping plane',
        type: 'toggle',
        active: state.enabled,
        onClick: () => this.toggleClipping(instanceId),
      },
    ];

    // Additional tools when clipping is enabled
    if (state.enabled) {
      tools.push(
        // Plane orientation presets
        {
          id: 'clipping-preset',
          icon: 'layers',
          label: 'Orientation',
          description: 'Set plane orientation',
          type: 'menu',
          options: Object.entries(PLANE_PRESETS).map(([id, preset]) => ({
            id: `preset-${id}`,
            label: preset.name,
            active: state.planePreset === id,
            onClick: () => this.setPlanePreset(instanceId, id),
          })),
        },
        // Invert direction
        {
          id: 'clipping-invert',
          icon: 'refresh-cw',
          label: state.inverted ? 'Normal' : 'Inverted',
          description: 'Invert clipping direction',
          type: 'toggle',
          active: state.inverted,
          onClick: () => this.invertClipping(instanceId),
        },
        // Reset
        {
          id: 'clipping-reset',
          icon: 'rotate-ccw',
          label: 'Reset',
          description: 'Reset plane to center',
          type: 'action',
          onClick: () => this.resetPlane(instanceId),
        }
      );
    }

    return tools;
  }
}

// Export singleton instance
export const vtkClippingFeature = new VTKClippingFeature();
export default vtkClippingFeature;
