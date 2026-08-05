// src/core/vr/tools/VRProbeTool.js
// Data probe tool for VR - inspect data values at positions
//
// SCOPE: intentionally session-local. Probing is transient inspection — probe
// results are neither persisted nor broadcast to collaborators (unlike
// annotations/measurements, which persist, or clip boxes, which sync).

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
// The probe readout used vtkVectorText, which renders NOTHING in this codebase:
// it requires an opentype.js-parsed font via setFont() that nothing ever
// supplies (opentype.js isn't even a dependency), so it silently produced empty
// geometry — the whole point of the probe tool was invisible.
import { VRTextBillboard } from '@Core/vr/ui/VRTextBillboard.js';

const MARKER_APPARENT_RADIUS_M = 0.012;
const LABEL_APPARENT_HEIGHT_M = 0.02;
const MARKER_COLOR = [0.2, 0.9, 0.4];
// Light text on a dark plate reads against both pale and dark datasets; the old
// near-black vtkVectorText color assumed a light background.
const LABEL_TEXT_COLOR = '#f3f5ff';
const LABEL_BACKGROUND = 'rgba(16,18,28,0.82)';

export class VRProbeTool extends VRToolInterface {
  constructor() {
    super({
      id: 'probe',
      name: 'Probe',
      icon: 'crosshair',
      category: 'analysis',
    });

    this._probeHistory = [];
    this._currentProbe = null;
    this._continuousMode = false;
    this._maxHistorySize = 50;

    // In-headset visuals (created lazily in render()).
    this._renderer = null;
    this._markerActor = null;
    this._markerSource = null;
    // Canvas-texture billboard; owns its own dirty-checking and disposal.
    this._label = null;
  }

  async activate(context) {
    await super.activate(context);
    log.debug('Probe tool activated');
  }

  async deactivate() {
    await super.deactivate();
    this._currentProbe = null;
    this._clearVisuals();
  }

  /**
   * Draw a marker sphere at the current probe point plus a canvas-texture
   * billboard showing the probed value(s). Hidden when there is no current
   * probe.
   * @param {Object} renderer - VTK VR scene renderer
   */
  render(renderer) {
    if (!renderer) return;
    this._renderer = renderer;

    const probe = this._currentProbe;
    const pos = probe?.position;
    if (!probe || !pos) {
      this._setVisible(false);
      return;
    }

    this._ensureActors(renderer);

    const ms = this._apparentScale(MARKER_APPARENT_RADIUS_M);
    if (this._markerActor) {
      this._markerActor.setPosition(pos.x, pos.y, pos.z);
      this._markerActor.setScale(ms, ms, ms);
      this._markerActor.setVisibility(true);
    }

    if (this._label) {
      // setText is dirty-checked internally, so this is cheap per frame.
      this._label.setText(this._formatProbeText(probe.data));
      // Float the label slightly above the marker.
      const lift = MARKER_APPARENT_RADIUS_M / this._getVrScale();
      this._label
        .setPosition(pos.x, pos.y + lift, pos.z)
        .setScale(this._apparentScale(LABEL_APPARENT_HEIGHT_M))
        .faceCamera(renderer)
        .setVisible(true);
    }
  }

  /**
   * Build a short one-line summary of the probe data for the 3D label.
   * @private
   */
  _formatProbeText(data) {
    if (!data) return 'no data';
    if (data.values && typeof data.values === 'object') {
      const parts = Object.entries(data.values).map(([name, v]) => {
        const val = Array.isArray(v)
          ? v.map((n) => (typeof n === 'number' ? n.toFixed(2) : n)).join(', ')
          : typeof v === 'number'
          ? v.toFixed(3)
          : v;
        return `${name}: ${val}`;
      });
      if (parts.length) return parts.join('  ');
    }
    if (data.value !== null && data.value !== undefined) {
      const name = data.arrayName || 'value';
      const val =
        typeof data.value === 'number' ? data.value.toFixed(3) : data.value;
      return `${name}: ${val}`;
    }
    return 'no data';
  }

  /** @private Lazily build the marker + label actors once. */
  _ensureActors(renderer) {
    if (!this._markerSource) {
      this._markerSource = vtkSphereSource.newInstance({
        radius: 1.0,
        phiResolution: 12,
        thetaResolution: 12,
      });
      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(this._markerSource.getOutputPort());
      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(...MARKER_COLOR);
      actor.getProperty().setLighting(false);
      actor.setPickable(false);
      actor.setVisibility(false);
      this._markerActor = actor;
      renderer.addActor(actor);
    }
    if (!this._label) {
      this._label = new VRTextBillboard({
        worldHeight: LABEL_APPARENT_HEIGHT_M,
        color: LABEL_TEXT_COLOR,
        background: LABEL_BACKGROUND,
      }).attach(renderer);
    }
  }

  /** @private */
  _setVisible(visible) {
    this._markerActor?.setVisibility(visible);
    this._label?.setVisible(visible);
  }

  /** @private Remove all visual actors from the renderer they were added to. */
  _clearVisuals() {
    const r = this._renderer;
    if (r && this._markerActor) {
      r.removeActor(this._markerActor);
      this._markerActor.delete?.();
    }
    this._label?.dispose();
    this._markerActor = this._markerSource = null;
    this._label = null;
    this._renderer = null;
  }

  handleInput(inputState, frame) {
    const { controllers } = inputState;
    const rightCtrl = controllers.right;

    // Continuous probing while trigger held
    if (rightCtrl && this._continuousMode && rightCtrl.triggerValue > 0.5) {
      const hit = this._performRaycast(rightCtrl, frame);
      if (hit) {
        const probeData = this._probeAtPosition(hit.position);
        this._currentProbe = {
          position: { ...hit.position },
          data: probeData,
          timestamp: Date.now(),
        };

        return {
          type: 'probe-continuous',
          data: this._currentProbe
        };
      }
    }

    // Single probe on trigger press. Rising-edge detection: update
    // _lastTriggerState unconditionally BEFORE acting on it — the old
    // placement below returns early on success, so updating this after the
    // if-block never ran and re-armed itself every frame the trigger
    // stayed down (same bug fixed in VRAnnotationTool/VRMeasureTool).
    //
    // Read via optional chaining and update the latch even when rightCtrl is
    // absent — a gripless/transient-pointer source (Vision Pro) only exists
    // in inputState while a pinch is physically held, so it vanishes on
    // every release. Bailing out before this update left the latch stuck at
    // `true` from the last pinch that reached it, so no later pinch could
    // ever read as a fresh rising edge again.
    const triggerPressed = !!rightCtrl?.triggerPressed;
    const triggerRisingEdge = triggerPressed && !this._lastTriggerState;
    this._lastTriggerState = triggerPressed;

    if (!rightCtrl) return null;

    if (triggerRisingEdge) {
      const hit = this._performRaycast(rightCtrl, frame);

      if (hit) {
        const probeData = this._probeAtPosition(hit.position);

        const probe = {
          id: `probe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position: { ...hit.position },
          normal: hit.normal ? { ...hit.normal } : null,
          data: probeData,
          timestamp: Date.now(),
        };

        this._currentProbe = probe;
        this._addToHistory(probe);

        return {
          type: 'probe-created',
          data: probe
        };
      }
    }

    // A button to toggle continuous mode
    if (rightCtrl.buttons?.a && !this._lastAButtonState) {
      this._continuousMode = !this._continuousMode;
      this._lastAButtonState = true;

      return {
        type: 'probe-mode-changed',
        data: { continuous: this._continuousMode }
      };
    }
    this._lastAButtonState = rightCtrl.buttons?.a || false;

    // B button to clear history
    if (rightCtrl.buttons?.b && !this._lastBButtonState) {
      this._probeHistory = [];
      this._currentProbe = null;
      this._lastBButtonState = true;

      return { type: 'probe-history-cleared' };
    }
    this._lastBButtonState = rightCtrl.buttons?.b || false;

    // Thumbstick to navigate history
    const thumbstickY = rightCtrl.thumbstick?.y || 0;
    if (Math.abs(thumbstickY) > 0.8 && !this._lastThumbstickState && this._probeHistory.length > 0) {
      const currentIndex = this._currentProbe
        ? this._probeHistory.findIndex(p => p.id === this._currentProbe.id)
        : -1;

      let newIndex;
      if (thumbstickY > 0) {
        newIndex = currentIndex < this._probeHistory.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : this._probeHistory.length - 1;
      }

      this._currentProbe = this._probeHistory[newIndex];
      this._lastThumbstickState = true;

      return {
        type: 'probe-history-navigated',
        data: this._currentProbe
      };
    }
    if (Math.abs(thumbstickY) < 0.3) {
      this._lastThumbstickState = false;
    }

    return null;
  }

  getControllerHints() {
    return {
      left: {},
      right: {
        trigger: this._continuousMode ? 'Probe (hold)' : 'Probe',
        thumbstick: 'Navigate history',
        a: this._continuousMode ? 'Single mode' : 'Continuous mode',
        b: 'Clear history',
      },
    };
  }

  _probeAtPosition(position) {
    // Delegate to handler to get actual data values
    const probeResult = this._context.handler.probeDataVR?.(
      this._context.vrContext,
      position
    );

    if (probeResult) {
      return probeResult;
    }

    // Fallback data
    return {
      position: { ...position },
      value: null,
      arrayName: null,
      pointId: null,
      cellId: null,
    };
  }

  _performRaycast(controller, frame) {
    if (!controller?.targetRay) return null;

    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }

  _addToHistory(probe) {
    this._probeHistory.push(probe);

    // Trim history if too long
    if (this._probeHistory.length > this._maxHistorySize) {
      this._probeHistory.shift();
    }
  }

  /**
   * Get current probe
   */
  getCurrentProbe() {
    return this._currentProbe;
  }

  /**
   * Get probe history
   */
  getProbeHistory() {
    return this._probeHistory;
  }

  /**
   * Check if in continuous mode
   */
  isContinuousMode() {
    return this._continuousMode;
  }

  /**
   * Set continuous mode
   */
  setContinuousMode(enabled) {
    this._continuousMode = enabled;
  }

  /**
   * Clear probe history
   */
  clearHistory() {
    this._probeHistory = [];
    this._currentProbe = null;
  }

  /**
   * Drop the most recent probe sample. Implements the optional `undoLast` hook
   * that VRExplorationManager.undoLastToolAction() calls, so the menu's global
   * Undo button does something real while the probe tool is active (it used to
   * be a silent no-op here — only the annotate and measure tools implemented
   * it). The readout falls back to the previous sample, or clears if none.
   *
   * Returns an ACTION object (not a boolean) because
   * VRExplorationManager.undoLastToolAction() treats the return value as a tool
   * action and routes it through _handleToolAction. Probe results are
   * intentionally session-local, so the action carries no persistence payload.
   *
   * @returns {{type:string,data:object}|null} probe-updated action, or null if
   *   there was nothing left to undo.
   */
  undoLast() {
    if (!this._probeHistory.length) {
      // Nothing recorded, but a live single-shot readout may still be showing.
      if (this._currentProbe) {
        this._currentProbe = null;
        this._clearVisuals();
        return { type: 'probe-updated', data: { remaining: 0 } };
      }
      return null;
    }

    this._probeHistory.pop();
    this._currentProbe = this._probeHistory[this._probeHistory.length - 1] || null;
    if (!this._currentProbe) this._clearVisuals();
    return { type: 'probe-updated', data: { remaining: this._probeHistory.length } };
  }

  /**
   * Export probe history for analysis
   */
  exportHistory() {
    return this._probeHistory.map(probe => ({
      id: probe.id,
      position: probe.position,
      data: probe.data,
      timestamp: probe.timestamp,
    }));
  }
}

export default VRProbeTool;
