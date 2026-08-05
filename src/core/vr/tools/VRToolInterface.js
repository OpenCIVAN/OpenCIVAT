// src/core/vr/tools/VRToolInterface.js
// Base interface for VR tools

import { vr as log } from '@Utils/logger.js';

/**
 * Base class for VR tools
 *
 * All VR tools should extend this class and implement:
 * - activate(context) - Called when tool is selected
 * - deactivate() - Called when tool is deselected
 * - handleInput(inputState, frame) - Called each frame to handle controller input
 * - getControllerHints() - Returns UI hints for controller buttons
 */
export class VRToolInterface {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon;
    this.category = config.category || 'general';

    this._isActive = false;
    this._context = null;
  }

  /**
   * Get tool metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      category: this.category,
    };
  }

  /**
   * Check if tool is currently active
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Activate the tool
   * @param {Object} context - Tool context from VRToolManager
   */
  async activate(context) {
    this._context = context;
    this._isActive = true;
    log.debug(`Tool activated: ${this.name}`);
  }

  /**
   * Deactivate the tool
   */
  async deactivate() {
    this._isActive = false;
    this._context = null;
    log.debug(`Tool deactivated: ${this.name}`);
  }

  /**
   * Handle controller input
   * @param {Object} inputState - Current controller state
   * @param {XRFrame} frame - XR frame
   * @returns {Object|null} Action to be processed, or null
   */
  handleInput(inputState, frame) {
    // Override in subclass
    return null;
  }

  /**
   * Render tool visuals into the VR scene.
   *
   * Called once per XR frame by VRToolManager.update with the live VR scene
   * renderer (vrContext.sceneObjects.renderer). Contract for subclasses:
   *  - Create vtk actors LAZILY (on first need) and add them via
   *    renderer.addActor(actor); mark them setPickable(false) so they never
   *    intercept teleport/tool raycasts, and setLighting(false) for flat,
   *    predictable color (mirrors VRControllerRenderer._ensureReticle).
   *  - Positions coming from raycastVR / annotation data are already in
   *    data/scene space — place actors there directly, no vr→scene transform.
   *  - For constant apparent size as the user scales the world, scale actors
   *    by `this._apparentScale(baseMeters)` each frame (see helper below).
   *  - Keep a reference to `renderer` so deactivate()/reset can remove the
   *    actors it added (deactivate has no renderer argument).
   *  - Dirty-check (e.g. on item count) so geometry is rebuilt only when the
   *    underlying set changes, not every frame.
   *
   * @param {Object} renderer - VTK renderer (truthy; manager guards null)
   */
  render(renderer) {
    // Override in subclass
  }

  /**
   * Current VR world scale from the tool context (1.0 when unavailable).
   * @protected
   * @returns {number}
   */
  _getVrScale() {
    const s = this._context?.vrContext?.vrScale;
    return typeof s === "number" && s > 0 ? s : 1.0;
  }

  /**
   * Data-space scale factor that keeps an actor at a constant APPARENT size
   * regardless of world zoom. Because dataDisplacement maps to
   * xrDisplacement × vrScale (see VTKInstanceHandler._updateCameraFromVRPose),
   * an apparent size of `apparentMeters` needs a data-space size of
   * apparentMeters / vrScale — the same relation VRControllerRenderer uses for
   * its gaze reticle (0.01 / vrScale ≈ 1cm).
   *
   * @protected
   * @param {number} apparentMeters - desired on-screen size in metres
   * @param {number} [min=1e-4] - clamp floor on the returned scale
   * @param {number} [max=1e3] - clamp ceiling on the returned scale
   * @returns {number}
   */
  _apparentScale(apparentMeters, min = 1e-4, max = 1e3) {
    const s = apparentMeters / this._getVrScale();
    return Math.min(max, Math.max(min, s));
  }

  /**
   * Undo the tool's most recent placement (marker, measurement, …).
   *
   * Menu-driven undo routes through here so it does the same thing the
   * controller's A-button does, keeping a single undo path. Returns a tool
   * action object (e.g. { type: 'annotation-removed', data }) for the manager
   * to process, or null if there is nothing to undo.
   *
   * @returns {Object|null}
   */
  undoLast() {
    // Override in subclass
    return null;
  }

  /**
   * Get controller button hints for UI
   * @returns {Object} Hints for left and right controllers
   */
  getControllerHints() {
    return {
      left: {},
      right: {},
    };
  }

  /**
   * Get tool settings panel definition
   * @returns {Object|null} Settings panel config
   */
  getSettingsPanel() {
    return null;
  }

  /**
   * Update tool settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    // Override in subclass
  }
}

export default VRToolInterface;
