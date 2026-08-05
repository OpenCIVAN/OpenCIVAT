// src/core/vr/tools/VRToolManager.js
// Manages VR tool lifecycle and input routing

import { vr as log } from '@Utils/logger.js';
import { VRMeasureTool } from './VRMeasureTool.js';
import { VRAnnotationTool } from './VRAnnotationTool.js';
import { VRClipBoxTool } from './VRClipBoxTool.js';
import { VRProbeTool } from './VRProbeTool.js';

export class VRToolManager {
  /**
   * @param {object} handler - the owning VTK instance handler
   * @param {object} vrContext
   * @param {object} [options]
   * @param {(label: string) => boolean} [options.canManipulate] - permission
   *   predicate injected by VRExplorationManager (the data-manipulation
   *   token, see VRManipulationLock). Injected rather than imported because
   *   VRExplorationManager already imports this module — importing it back
   *   would be a cycle. Absent => everything is permitted, which is what keeps
   *   a bare `new VRToolManager(handler, ctx)` behaving as it always did.
   */
  constructor(handler, vrContext, options = {}) {
    this._handler = handler;
    this._vrContext = vrContext;
    this._activeTool = null;
    this._canManipulate = typeof options.canManipulate === 'function'
      ? options.canManipulate
      : null;

    // Register available tools
    this._tools = new Map([
      ['measure', new VRMeasureTool()],
      ['annotate', new VRAnnotationTool()],
      ['clip', new VRClipBoxTool()],
      ['probe', new VRProbeTool()],
    ]);

    // Context passed to tools. `renderer` is exposed as a live getter (the
    // VR scene renderer lives at vrContext.sceneObjects.renderer and may not
    // exist yet at construction time) so tools can add actors lazily.
    //
    // `canManipulate` follows the same live-getter discipline: tools call it
    // at COMMIT time, never cache it, so a token handed over mid-session takes
    // effect on the very next placement.
    const canManipulate = this._canManipulate;
    this._toolContext = {
      handler: this._handler,
      vrContext: this._vrContext,
      manager: this,
      get renderer() {
        return this.vrContext?.sceneObjects?.renderer || null;
      },
      /**
       * @param {string} label - what is being attempted, for the refusal notice
       * @returns {boolean} true when this user may commit shared changes
       */
      canManipulate(label) {
        return canManipulate ? canManipulate(label) !== false : true;
      },
    };
  }

  /**
   * Activate a tool
   */
  async activateTool(toolId) {
    // Deactivate current tool
    if (this._activeTool) {
      await this._activeTool.deactivate();
    }

    // Activate new tool
    const tool = this._tools.get(toolId);
    if (!tool) {
      log.warn(`Unknown tool: ${toolId}`);
      return;
    }

    await tool.activate(this._toolContext);
    this._activeTool = tool;

    log.debug(`Activated tool: ${toolId}`);
  }

  /**
   * Deactivate current tool
   */
  async deactivateTool() {
    if (this._activeTool) {
      await this._activeTool.deactivate();
      this._activeTool = null;
    }
  }

  /**
   * Get active tool
   */
  getActiveTool() {
    return this._activeTool;
  }

  /**
   * Get active tool ID
   */
  getActiveToolId() {
    if (!this._activeTool) return null;
    return this._activeTool.id;
  }

  /**
   * Update - called every frame
   */
  update(inputState, frame) {
    if (!this._activeTool) return null;

    // Let active tool handle input
    const action = this._activeTool.handleInput(inputState, frame);

    // Render tool visuals. The VR scene renderer lives at
    // vrContext.sceneObjects.renderer (NOT vrContext.renderer — that was
    // always undefined, so tools rendered nothing). Only call render when it's
    // actually available.
    const renderer = this._vrContext?.sceneObjects?.renderer;
    if (renderer) {
      this._activeTool.render(renderer);
    }

    return action;
  }

  /**
   * Get controller hints for UI
   */
  getControllerHints() {
    if (!this._activeTool) {
      return {
        left: {},
        right: { trigger: 'Select tool' },
      };
    }
    return this._activeTool.getControllerHints();
  }

  /**
   * Get available tools
   */
  getAvailableTools() {
    return Array.from(this._tools.entries()).map(([id, tool]) => ({
      id,
      name: tool.name,
      icon: tool.icon,
      category: tool.category,
    }));
  }

  /**
   * Register a custom tool
   */
  registerTool(toolId, tool) {
    this._tools.set(toolId, tool);
    log.debug(`Registered custom tool: ${toolId}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId) {
    if (this._activeTool?.id === toolId) {
      this.deactivateTool();
    }
    this._tools.delete(toolId);
  }

  /**
   * Cleanup
   */
  async cleanup() {
    await this.deactivateTool();
    this._tools.clear();
  }
}

export default VRToolManager;
